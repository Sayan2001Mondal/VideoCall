import { useEffect, useRef, useState, useCallback } from "react";
import * as mediasoupClient from "mediasoup-client";

export default function useMediaSoup(ws, roomId, peerId, name, existingStreamRef) {
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

  // ── helpers ────────────────────────────────────────────────────
  function send(data) {
    if (ws.current?.readyState === WebSocket.OPEN)
      ws.current.send(JSON.stringify(data));
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

  // ── main init ──────────────────────────────────────────────────
  useEffect(() => {
    if (!ws.current || !roomId || !peerId) return;

    let cleanedUp = false;

    async function init() {
      const rtpCapabilities = await new Promise((resolve) => {
        const h = (e) => {
          const m = JSON.parse(e.data);
          if (m.type === "routerRtpCapabilities") {
            ws.current.removeEventListener("message", h);
            resolve(m.rtpCapabilities);
          }
        };
        ws.current.addEventListener("message", h);
        send({ type: "join", roomId, peerId, name });
      });

      if (cleanedUp) return;

      const device = await loadDevice(rtpCapabilities);

      const [sendOpts, recvOpts] = await Promise.all([
        createTransport("send"),
        createTransport("recv"),
      ]);

      await setupSendTransport(device, sendOpts);
      await setupRecvTransport(device, recvOpts);

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
        console.log("Frontend: Data producer created successfully!");
      } catch (err) {
        console.error("Failed to create data producer:", err);
      }
    }

    const messageHandler = async (e) => {
      const msg = JSON.parse(e.data);

      if (msg.type === "newProducer") {
        setPeersData((prev) => ({ ...prev, [msg.peerId]: { name: msg.name } }));
        await consumeProducer(msg.producerId, msg.peerId, msg.isScreenShare);
      }

      if (msg.type === "existingProducers") {
        for (const { producerId, peerId: sourcePeerId, name: sourceName, isScreenShare } of msg.producers) {
          setPeersData((prev) => ({ ...prev, [sourcePeerId]: { name: sourceName } }));
          await consumeProducer(producerId, sourcePeerId, isScreenShare);
        }
      }

      if (msg.type === "newDataProducer") {
        setPeersData((prev) => ({ ...prev, [msg.peerId]: { name: msg.name } }));
        await consumeDataProducer(msg.dataProducerId, msg.peerId, msg.name);
      }

      if (msg.type === "existingDataProducers") {
        for (const { dataProducerId, peerId: sourcePeerId, name: sourceName } of msg.dataProducers) {
          setPeersData((prev) => ({ ...prev, [sourcePeerId]: { name: sourceName } }));
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
        setPeersData((prev) => ({ ...prev, [msg.peerId]: { name: msg.name } }));
      }

      if (msg.type === "screenShareStopped") {
        setRemoteStreams((prev) => {
          const updated = { ...prev };
          delete updated[`${msg.peerId}-screen`];
          return updated;
        });
      }
    };

    async function initAndListen() {
      await init();
      if (cleanedUp) return;
      ws.current.addEventListener("message", messageHandler);
      send({ type: "getProducers", roomId, peerId });
    }

    initAndListen().catch(console.error);

    return () => {
      cleanedUp = true;
      ws.current?.removeEventListener("message", messageHandler);
      sendTransportRef.current?.close();
      recvTransportRef.current?.close();
      dataProducerRef.current?.close?.();
      Object.values(dataConsumersRef.current).forEach((consumer) => consumer.close?.());
      if (!existingStreamRef?.current) {
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
      }
      send({ type: "leave", roomId, peerId });
    };
  }, [roomId, peerId]);

  // ── toggles ────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    const producer = producersRef.current.audio;
    if (!producer) return;
    if (micOn) producer.pause(); else producer.resume();
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !micOn));
    setMicOn((v) => !v);
  }, [micOn]);

  const toggleCam = useCallback(() => {
    const producer = producersRef.current.video;
    if (!producer) return;
    if (camOn) producer.pause(); else producer.resume();
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !camOn));
    setCamOn((v) => !v);
  }, [camOn]);

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
  };
}
