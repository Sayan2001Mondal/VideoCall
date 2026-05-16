import { useEffect, useRef, useState, useCallback } from "react";
import * as mediasoupClient from "mediasoup-client";

export default function useMediaSoup(ws, roomId, peerId, name, existingStreamRef, wsConnected) {
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  const producersRef = useRef({});
  const dataProducerRef = useRef(null);
  const consumersRef = useRef({});
  const dataConsumersRef = useRef({});
  const localStreamRef = useRef(null);

  const localVideoRef = useRef(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [localStream, setLocalStream] = useState(null);
  const [peersData, setPeersData] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenShareOn, setScreenShareOn] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const sessionInitializedRef = useRef(false);
  // Tracks whether we have connected at least once — used to distinguish
  // initial connect from reconnects so we can show the reconnecting banner
  const hasConnectedBefore = useRef(false);

  // ── helpers ────────────────────────────────────────────────────
  function send(data) {
    if (ws.current?.readyState === WebSocket.OPEN)
      ws.current.send(JSON.stringify(data));
  }

  function waitForSocketMessage(match, timeoutMs = 10000) {
    const socket = ws.current;
    if (!socket) return Promise.reject(new Error("WebSocket is not connected"));

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.removeEventListener("message", handleMessage);
        reject(new Error("Timed out waiting for socket response"));
      }, timeoutMs);

      const handleMessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (!match(msg)) return;
          clearTimeout(timer);
          socket.removeEventListener("message", handleMessage);
          resolve(msg);
        } catch (err) {
          clearTimeout(timer);
          socket.removeEventListener("message", handleMessage);
          reject(err);
        }
      };

      socket.addEventListener("message", handleMessage);
    });
  }

  async function requestPeerResume() {
    send({ type: "resumePeer", roomId, peerId, name });
    const msg = await waitForSocketMessage(
      (payload) =>
        payload.type === "peerResumed" ||
        payload.type === "resumeFailed"
    );

    if (msg.type === "resumeFailed") {
      throw new Error(msg.reason || "resume-failed");
    }

    return msg;
  }

  function resetRemoteState() {
    setRemoteStreams({});
    setPeersData({});
    consumersRef.current = {};
    dataConsumersRef.current = {};
  }

  function teardownSession({ preserveLocalStream = true } = {}) {
    sendTransportRef.current?.close();
    recvTransportRef.current?.close();
    dataProducerRef.current?.close?.();
    Object.values(consumersRef.current).forEach((consumer) => consumer.close?.());
    Object.values(dataConsumersRef.current).forEach((consumer) => consumer.close?.());

    sendTransportRef.current = null;
    recvTransportRef.current = null;
    dataProducerRef.current = null;
    producersRef.current = {};
    consumersRef.current = {};
    dataConsumersRef.current = {};
    deviceRef.current = null;
    setScreenShareOn(false);
    setScreenStream(null);
    resetRemoteState();

    if (!preserveLocalStream) {
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
  }

  function requestTransportIceRestart(transport) {
    if (!transport) return;
    send({ type: "restartIce", roomId, peerId, transportId: transport.id });
  }

  async function createTransport(direction) {
    send({ type: "createTransport", roomId, peerId, direction });

    return new Promise((resolve) => {
      const handler = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "transportCreated" && msg.direction === direction) {
          ws.current.removeEventListener("message", handler);
          resolve(msg.transportOptions);
        }
      };
      ws.current.addEventListener("message", handler);
    });
  }

  async function loadDevice(rtpCapabilities) {
    const device = new mediasoupClient.Device();
    await device.load({ routerRtpCapabilities: rtpCapabilities });
    deviceRef.current = device;
    return device;
  }

  async function setupSendTransport(device, transportOptions) {
    const transport = device.createSendTransport({ ...transportOptions, iceTransportPolicy: "all" });

    transport.on("connect", ({ dtlsParameters }, cb, eb) => {
      send({ type: "connectTransport", roomId, peerId, transportId: transport.id, dtlsParameters });
      const h = (e) => {
        const m = JSON.parse(e.data);
        if (m.type === "transportConnected" && m.transportId === transport.id) {
          ws.current.removeEventListener("message", h);
          cb();
        }
      };
      ws.current.addEventListener("message", h);
    });

    transport.on("connectionstatechange", (state) => {
      if (state === "disconnected" || state === "failed") {
        console.log("Send transport connection state changed to", state, "Restarting ICE...");
        send({ type: "restartIce", roomId, peerId, transportId: transport.id });
      }
    });

    transport.on("produce", ({ kind, rtpParameters, appData }, cb, eb) => {
      send({
        type: "produce",
        roomId,
        peerId,
        transportId: transport.id,
        kind,
        rtpParameters,
        isScreenShare: appData?.isScreenShare || false,
      });
      const h = (e) => {
        const m = JSON.parse(e.data);
        if (m.type === "produced") {
          ws.current.removeEventListener("message", h);
          cb({ id: m.producerId });
        }
      };
      ws.current.addEventListener("message", h);
    });

    transport.on("producedata", ({ sctpStreamParameters, label, protocol }, cb, eb) => {
      send({
        type: "produceData",
        roomId,
        peerId,
        transportId: transport.id,
        sctpStreamParameters,
        label,
        protocol,
      });
      const h = (e) => {
        const m = JSON.parse(e.data);
        if (m.type === "dataProduced") {
          ws.current.removeEventListener("message", h);
          cb({ id: m.dataProducerId });
        }
      };
      ws.current.addEventListener("message", h);
    });

    sendTransportRef.current = transport;
  }

  async function setupRecvTransport(device, transportOptions) {
    const transport = device.createRecvTransport({ ...transportOptions, iceTransportPolicy: "all" });

    transport.on("connect", ({ dtlsParameters }, cb, eb) => {
      send({ type: "connectTransport", roomId, peerId, transportId: transport.id, dtlsParameters });
      const h = (e) => {
        const m = JSON.parse(e.data);
        if (m.type === "transportConnected" && m.transportId === transport.id) {
          ws.current.removeEventListener("message", h);
          cb();
        }
      };
      ws.current.addEventListener("message", h);
    });

    transport.on("connectionstatechange", (state) => {
      if (state === "disconnected" || state === "failed") {
        console.log("Recv transport connection state changed to", state, "Restarting ICE...");
        send({ type: "restartIce", roomId, peerId, transportId: transport.id });
      }
    });

    recvTransportRef.current = transport;
  }

  async function consumeProducer(producerId, sourcePeerId, isScreenShare = false) {
    if (!deviceRef.current || !recvTransportRef.current) {
      console.log("Device or recv transport missing");
      return;
    }

    console.log("Requesting consume for producer:", producerId, "screenShare:", isScreenShare);

    send({
      type: "consume",
      roomId,
      peerId,
      producerId,
      rtpCapabilities: deviceRef.current.rtpCapabilities,
    });

    return new Promise((resolve) => {
      const h = async (e) => {
        const m = JSON.parse(e.data);

        if (m.type === "consumed" && m.producerId === producerId) {
          ws.current.removeEventListener("message", h);

          try {
            const consumer = await recvTransportRef.current.consume({
              id: m.consumerId,
              producerId: m.producerId,
              kind: m.kind,
              rtpParameters: m.rtpParameters,
            });

            consumersRef.current[consumer.id] = consumer;
            await consumer.resume?.();

            const streamKey = isScreenShare ? `${sourcePeerId}-screen` : sourcePeerId;

            setRemoteStreams((prev) => {
              const existing = prev[streamKey] || new MediaStream();
              const newStream = new MediaStream(existing.getTracks());

              const alreadyExists = newStream.getTracks().some((t) => t.id === consumer.track.id);
              if (!alreadyExists) {
                newStream.addTrack(consumer.track);
              }

              return { ...prev, [streamKey]: newStream };
            });

            resolve(consumer);
          } catch (err) {
            console.error("Consume error:", err);
          }
        }
      };

      ws.current.addEventListener("message", h);
    });
  }

  async function consumeDataProducer(dataProducerId, sourcePeerId, sourceName) {
    if (!recvTransportRef.current) {
      console.log("Recv transport missing for data consume");
      return;
    }

    send({
      type: "consumeData",
      roomId,
      peerId,
      dataProducerId,
    });

    return new Promise((resolve) => {
      const h = async (e) => {
        const m = JSON.parse(e.data);

        if (m.type === "dataConsumed" && m.dataProducerId === dataProducerId) {
          ws.current.removeEventListener("message", h);

          try {
            const dataConsumer = await recvTransportRef.current.consumeData({
              id: m.dataConsumerId,
              dataProducerId: m.dataProducerId,
              sctpStreamParameters: m.sctpStreamParameters,
              label: m.label,
              protocol: m.protocol,
            });

            dataConsumersRef.current[dataConsumer.id] = dataConsumer;

            dataConsumer.on("message", (message) => {
              try {
                const parsed = JSON.parse(message);
                setChatMessages((prev) => [
                  ...prev,
                  {
                    sender: parsed.sender || sourceName || peersData[sourcePeerId]?.name || "Participant",
                    message: parsed.message ?? "",
                    timestamp: parsed.timestamp || Date.now(),
                  },
                ]);
              } catch {
                setChatMessages((prev) => [
                  ...prev,
                  {
                    sender: sourceName || peersData[sourcePeerId]?.name || "Participant",
                    message: String(message),
                    timestamp: Date.now(),
                  },
                ]);
              }
            });

            resolve(dataConsumer);
          } catch (err) {
            console.error("Consume data error:", err);
          }
        }
      };

      ws.current.addEventListener("message", h);
    });
  }

  // ── SESSION LIFECYCLE: Local Media & Room Presence ──────────────────
  useEffect(() => {
    if (!roomId || !peerId) return;
    const hasExistingStream = Boolean(existingStreamRef?.current);

    async function setupLocalMedia() {
      let stream;
      if (existingStreamRef?.current) {
        stream = existingStreamRef.current;
      } else {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
        } catch (err) {
          console.warn("Could not get user media:", err);
          stream = new MediaStream();
        }
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];
      setMicOn(!!audioTrack);
      setCamOn(!!videoTrack);
    }

    setupLocalMedia();

    return () => {
      send({ type: "leave", roomId, peerId });
      teardownSession({ preserveLocalStream: hasExistingStream });
      if (!hasExistingStream) {
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
      }
      sessionInitializedRef.current = false;
      hasConnectedBefore.current = false;
      setIsReconnecting(false);
    };
  }, [roomId, peerId]);

  // ── CONNECTION LIFECYCLE: MediaSoup Signaling & Transports ────────────
  useEffect(() => {
    if (!wsConnected || !ws.current || !roomId || !peerId) return;

    let cleanedUp = false;
    const socket = ws.current;

    async function init() {
      send({ type: "join", roomId, peerId, name });
      const capabilitiesMessage = await waitForSocketMessage(
        (message) => message.type === "routerRtpCapabilities"
      );
      const rtpCapabilities = capabilitiesMessage.rtpCapabilities;

      if (cleanedUp) return;

      const device = await loadDevice(rtpCapabilities);

      const [sendOpts, recvOpts] = await Promise.all([
        createTransport("send"),
        createTransport("recv"),
      ]);

      await setupSendTransport(device, sendOpts);
      await setupRecvTransport(device, recvOpts);

      const stream = localStreamRef.current || new MediaStream();
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];

      if (audioTrack) {
        const audioProducer = await sendTransportRef.current.produce({ track: audioTrack });
        producersRef.current.audio = audioProducer;
      }

      if (videoTrack) {
        const videoProducer = await sendTransportRef.current.produce({ track: videoTrack });
        producersRef.current.video = videoProducer;
      }

      try {
        const dataProducer = await sendTransportRef.current.produceData({
          ordered: true,
          label: "chat",
          protocol: "json",
        });
        dataProducerRef.current = dataProducer;
      } catch (err) {
        console.error("Failed to create data producer:", err);
      }

      sessionInitializedRef.current = true;
    }

    const messageHandler = async (e) => {
      try {
        const msg = JSON.parse(e.data);

        if (msg.type === "iceRestarted") {
          const transport = sendTransportRef.current?.id === msg.transportId
            ? sendTransportRef.current
            : recvTransportRef.current?.id === msg.transportId
              ? recvTransportRef.current
              : null;
          if (transport) {
            console.log("Applying new ICE parameters for transport", transport.id);
            await transport.restartIce({ iceParameters: msg.iceParameters });
          }
        }

        if (msg.type === "newProducer") {
          setPeersData((prev) => ({ ...prev, [msg.peerId]: { name: msg.name, camOn: true, micOn: true } }));
          await consumeProducer(msg.producerId, msg.peerId, msg.isScreenShare);
        }

        if (msg.type === "existingProducers") {
          for (const { producerId, peerId: sourcePeerId, name: sourceName, isScreenShare } of msg.producers) {
            setPeersData((prev) => ({ ...prev, [sourcePeerId]: { name: sourceName, camOn: true, micOn: true } }));
            await consumeProducer(producerId, sourcePeerId, isScreenShare);
          }
        }

        if (msg.type === "newDataProducer") {
          setPeersData((prev) => ({ ...prev, [msg.peerId]: { name: msg.name, camOn: true, micOn: true } }));
          await consumeDataProducer(msg.dataProducerId, msg.peerId, msg.name);
        }

        if (msg.type === "existingDataProducers") {
          for (const { dataProducerId, peerId: sourcePeerId, name: sourceName } of msg.dataProducers) {
            setPeersData((prev) => ({ ...prev, [sourcePeerId]: { name: sourceName, camOn: true, micOn: true } }));
            await consumeDataProducer(dataProducerId, sourcePeerId, sourceName);
          }
        }

        if (msg.type === "peerLeft") {
          setRemoteStreams((prev) => {
            const updated = { ...prev };
            delete updated[msg.peerId];
            delete updated[`${msg.peerId}-screen`];
            return updated;
          });
          setPeersData((prev) => {
            const updated = { ...prev };
            delete updated[msg.peerId];
            return updated;
          });
        }

        if (msg.type === "peerJoined") {
          setPeersData((prev) => ({ ...prev, [msg.peerId]: { name: msg.name, camOn: true, micOn: true } }));
        }

        if (msg.type === "mediaToggled") {
          setPeersData((prev) => ({
            ...prev,
            [msg.peerId]: {
              ...prev[msg.peerId],
              [msg.kind === "video" ? "camOn" : "micOn"]: msg.enabled,
            },
          }));
        }

        if (msg.type === "screenShareStopped") {
          setRemoteStreams((prev) => {
            const updated = { ...prev };
            delete updated[`${msg.peerId}-screen`];
            return updated;
          });
        }
      } catch (err) {
        console.error("Error in useMediaSoup message handler:", err);
      }
    };

    async function connectSession() {
      socket.addEventListener("message", messageHandler);

      try {
        if (
          hasConnectedBefore.current &&
          sessionInitializedRef.current &&
          sendTransportRef.current &&
          recvTransportRef.current
        ) {
          setIsReconnecting(true);
          await requestPeerResume();
          if (cleanedUp) return;

          requestTransportIceRestart(sendTransportRef.current);
          requestTransportIceRestart(recvTransportRef.current);
          setIsReconnecting(false);
          return;
        }

        await init();
        if (cleanedUp) return;
        hasConnectedBefore.current = true;
        setIsReconnecting(false);
        send({ type: "getProducers", roomId, peerId });
      } catch (err) {
        console.warn("Session resume failed, falling back to full rejoin:", err);
        teardownSession({ preserveLocalStream: true });
        await init();
        if (cleanedUp) return;
        hasConnectedBefore.current = true;
        setIsReconnecting(false);
        send({ type: "getProducers", roomId, peerId });
      }
    }

    connectSession().catch(console.error);

    return () => {
      cleanedUp = true;
      socket.removeEventListener("message", messageHandler);
    };
  }, [wsConnected, roomId, peerId]);

  // ── toggles ────────────────────────────────────────────────────
    const toggleMic = useCallback(() => {
      const producer = producersRef.current.audio;
      if (!producer) return;
      if (micOn) producer.pause(); else producer.resume();
      localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !micOn));
      setMicOn((v) => {
        const newState = !v;
        send({ type: "mediaToggled", roomId, peerId, kind: "audio", enabled: newState });
        return newState;
      });
    }, [micOn, roomId, peerId]);

    const toggleCam = useCallback(() => {
      const producer = producersRef.current.video;
      if (!producer) return;
      if (camOn) producer.pause(); else producer.resume();
      localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !camOn));
      setCamOn((v) => {
        const newState = !v;
        send({ type: "mediaToggled", roomId, peerId, kind: "video", enabled: newState });
        return newState;
      });
    }, [camOn, roomId, peerId]);

  const switchCamera = useCallback(async () => {
    const producer = producersRef.current.video;
    if (!producer || !localStreamRef.current) return;

    const currentTrack = localStreamRef.current.getVideoTracks()[0];
    const currentFacing = currentTrack?.getSettings().facingMode || "user";
    const newFacing = currentFacing === "user" ? "environment" : "user";

    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: newFacing },
      audio: false,
    });

    const newTrack = newStream.getVideoTracks()[0];
    await producer.replaceTrack({ track: newTrack });
    currentTrack.stop();

    localStreamRef.current.removeTrack(currentTrack);
    localStreamRef.current.addTrack(newTrack);

    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    setLocalStream(localStreamRef.current);
  }, []);

  // ── screen sharing ────────────────────────────────────────────

  // ✅ stopScreenShare declared first so startScreenShare can reference it
  const stopScreenShare = useCallback(() => {
    const producer = producersRef.current.screen;
    if (producer) {
      producer.close();
      delete producersRef.current.screen;
    }

    setScreenShareOn(false);
    setScreenStream(null);

    send({ type: "screenShareStopped", roomId, peerId });
  }, [roomId, peerId]);

  const startScreenShare = useCallback(async () => {
    if (!sendTransportRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      const screenTrack = stream.getVideoTracks()[0];

      const screenProducer = await sendTransportRef.current.produce({
        track: screenTrack,
        appData: { isScreenShare: true },
      });

      producersRef.current.screen = screenProducer;
      setScreenShareOn(true);
      setScreenStream(stream);

      screenTrack.onended = () => {
        stopScreenShare(); // ✅ in scope now
      };
    } catch (err) {
      console.log("Screen share cancelled or error:", err);
    }
  }, [stopScreenShare]); // ✅ stopScreenShare in deps

  const toggleScreenShare = useCallback(() => {
    if (screenShareOn) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  }, [screenShareOn, startScreenShare, stopScreenShare]);

  const sendChatMessage = useCallback((text) => {
    if (!dataProducerRef.current) {
      console.error("Data producer not initialized");
      return;
    }
    const payload = {
      sender: name,
      message: text,
      timestamp: Date.now(),
    };
    dataProducerRef.current.send(JSON.stringify(payload));
    setChatMessages((prev) => [...prev, payload]);
  }, [name]);

  return {
    localVideoRef,
    localStreamRef,
    localStream,
    remoteStreams,
    peersData,
    micOn,
    camOn,
    screenShareOn,
    screenStream,
    toggleMic,
    toggleCam,
    switchCamera,
    toggleScreenShare,
    chatMessages,
    sendChatMessage,
    isReconnecting,
  };
}           
