import { useEffect, useRef, useState } from "react";
import * as mediasoupClient from "mediasoup-client";

export default function useMediaSoup(ws, roomId, peerId, name) {
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  const producersRef = useRef({});         // local producers
  const consumersRef = useRef({});         // remote consumers
  const localStreamRef = useRef(null);

  const localVideoRef = useRef(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // { peerId: MediaStream }
  const [peersData, setPeersData] = useState({}); // { peerId: { name } }
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

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
    const transport = device.createSendTransport(transportOptions);

    transport.on("connect", ({ dtlsParameters }, cb, eb) => {
      send({ type: "connectTransport", roomId, peerId, transportId: transport.id, dtlsParameters });
      // wait for server ack
      const h = (e) => {
        const m = JSON.parse(e.data);
        if (m.type === "transportConnected" && m.transportId === transport.id) {
          ws.current.removeEventListener("message", h);
          cb();
        }
      };
      ws.current.addEventListener("message", h);
    });

    transport.on("produce", ({ kind, rtpParameters }, cb, eb) => {
      send({ type: "produce", roomId, peerId, transportId: transport.id, kind, rtpParameters });
      const h = (e) => {
        const m = JSON.parse(e.data);
        if (m.type === "produced") {
          ws.current.removeEventListener("message", h);
          cb({ id: m.producerId });
        }
      };
      ws.current.addEventListener("message", h);
    });

    sendTransportRef.current = transport;
  }

  async function setupRecvTransport(device, transportOptions) {
    const transport = device.createRecvTransport(transportOptions);

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

  async function consumeProducer(producerId, sourcePeerId) {
  if (!deviceRef.current || !recvTransportRef.current) {
    console.log("Device or recv transport missing");
    return;
  }

  console.log("Requesting consume for producer:", producerId);

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

      if (
        m.type === "consumed" &&
        m.producerId === producerId
      ) {
        ws.current.removeEventListener("message", h);

        console.log("Consumed event received:", m);

        try {
          const consumer =
            await recvTransportRef.current.consume({
              id: m.consumerId,
              producerId: m.producerId,
              kind: m.kind,
              rtpParameters: m.rtpParameters,
            });

          console.log("Consumer created:", consumer);

          consumersRef.current[consumer.id] = consumer;

          // Resume consumer
          await consumer.resume?.();

          console.log(
            "Consumer track:",
            consumer.track
          );

          setRemoteStreams((prev) => {
            const existing = prev[sourcePeerId] || new MediaStream();
            
            // Create a completely new MediaStream reference to force React to re-render
            const newStream = new MediaStream(existing.getTracks());
            
            // Prevent duplicate tracks
            const alreadyExists = newStream.getTracks().some((t) => t.id === consumer.track.id);
            if (!alreadyExists) {
              newStream.addTrack(consumer.track);
            }

            console.log("UPDATED STREAM TRACKS:", newStream.getTracks());

            return {
              ...prev,
              [sourcePeerId]: newStream,
            };
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

  // ── main init ──────────────────────────────────────────────────
  useEffect(() => {
    if (!ws.current || !roomId || !peerId) return;

    let cleanedUp = false;

    async function init() {
      // Wait for router caps
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

      // Create both transports in parallel
      const [sendOpts, recvOpts] = await Promise.all([
        createTransport("send"),
        createTransport("recv"),
      ]);

      await setupSendTransport(device, sendOpts);
      await setupRecvTransport(device, recvOpts);

      // Get local media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // Produce audio + video
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];

      const audioProducer = await sendTransportRef.current.produce({ track: audioTrack });
      const videoProducer = await sendTransportRef.current.produce({ track: videoTrack });

      producersRef.current.audio = audioProducer;
      producersRef.current.video = videoProducer;

      // getProducers is sent in initAndListen() after messageHandler is
      // registered, so that the response is always processed with a ready
      // recv transport. Do NOT send it here.
    }

    // messageHandler is registered AFTER init() so that recvTransportRef is
    // guaranteed to be set by the time any newProducer / existingProducers
    // message is processed. Previously it was registered before init(), which
    // meant a newProducer arriving mid-setup would hit the early-return guard
    // in consumeProducer and silently drop the remote stream forever.
    const messageHandler = async (e) => {
      const msg = JSON.parse(e.data);

      if (msg.type === "newProducer") {
        setPeersData((prev) => ({ ...prev, [msg.peerId]: { name: msg.name } }));
        await consumeProducer(msg.producerId, msg.peerId);
      }

      if (msg.type === "existingProducers") {
        for (const { producerId, peerId: sourcePeerId, name: sourceName } of msg.producers) {
          setPeersData((prev) => ({ ...prev, [sourcePeerId]: { name: sourceName } }));
          await consumeProducer(producerId, sourcePeerId);
        }
      }

      if (msg.type === "peerLeft") {
        setRemoteStreams((prev) => {
          const updated = { ...prev };
          delete updated[msg.peerId];
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
    };

    async function initAndListen() {
      await init();
      if (cleanedUp) return;
      // Register handler only after transports are ready, then ask for
      // existing producers. Any newProducer that arrives from this point
      // forward will find recvTransportRef already populated.
      ws.current.addEventListener("message", messageHandler);
      send({ type: "getProducers", roomId, peerId });
    }

    initAndListen().catch(console.error);

    return () => {
      cleanedUp = true;
      ws.current?.removeEventListener("message", messageHandler);
      sendTransportRef.current?.close();
      recvTransportRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      send({ type: "leave", roomId, peerId });
    };
  }, [roomId, peerId]);

  // ── toggles ────────────────────────────────────────────────────
  const toggleMic = () => {
    const producer = producersRef.current.audio;
    if (!producer) return;
    if (micOn) producer.pause(); else producer.resume();
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !micOn));
    setMicOn((v) => !v);
  };

  const toggleCam = () => {
    const producer = producersRef.current.video;
    if (!producer) return;
    if (camOn) producer.pause(); else producer.resume();
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !camOn));
    setCamOn((v) => !v);
  };

  const switchCamera = async () => {
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
  };

  return { localVideoRef, remoteStreams, peersData, micOn, camOn, toggleMic, toggleCam, switchCamera };
}