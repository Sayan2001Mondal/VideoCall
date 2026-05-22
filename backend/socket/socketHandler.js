const {
  getOrCreateRoom,
  addPeer,
  markPeerDisconnected,
  removePeer,
  resumePeer,
  getPeer,
  getRoom,
  getOtherPeers,
  RECONNECT_GRACE_MS,
} = require("./roomManager");
const config = require("../config/mediasoup");

function send(ws, data) {
  if (ws.readyState === 1) ws.send(JSON.stringify(data));
}

function logInfo(message, meta = {}) {
  console.log(`[socket] ${message}`, meta);
}

function logWarn(message, meta = {}) {
  console.warn(`[socket] ${message}`, meta);
}

function logError(message, meta = {}) {
  console.error(`[socket] ${message}`, meta);
}

function broadcast(roomId, peerId, data) {
  const room = getRoom(roomId);
  if (!room) return;
  Object.entries(room.peers).forEach(([id, peer]) => {
    if (id !== peerId) send(peer.ws, data);
  });
}

function socketHandler(ws) {
  let myRoomId = null;
  let myPeerId = null;

  ws.on("message", async (raw) => {
    const data = JSON.parse(raw);

    try {
      switch (data.type) {

        case "join": {
          const { roomId, peerId, name } = data;
          myRoomId = roomId;
          myPeerId = peerId;

          let room = await getOrCreateRoom(roomId);
          
          // If the peer already exists (e.g. ungraceful disconnect where close didn't fire),
          // clean them up first so other clients drop the frozen tracks.
          if (room.peers[peerId]) {
            logInfo("Peer rejoining, cleaning up old state", { roomId, peerId });
            broadcast(roomId, peerId, { type: "peerLeft", peerId });
            removePeer(roomId, peerId);
            
            // Re-fetch room because removePeer deletes it if it becomes empty!
            room = await getOrCreateRoom(roomId);
          }

          addPeer(roomId, peerId, ws);
          room.peers[peerId].name = name;
          logInfo("Peer joined room", { roomId, peerId, name });

          // Send RTP capabilities so client can create device
          send(ws, {
            type: "routerRtpCapabilities",
            rtpCapabilities: room.router.rtpCapabilities,
          });

          // Tell existing peers a new user joined
          broadcast(roomId, peerId, {
            type: "peerJoined",
            peerId,
            name,
          });

          // Send existing producers to the new peer is now handled by getProducers
          break;
        }

        case "resumePeer": {
          const { roomId, peerId, name } = data;
          myRoomId = roomId;
          myPeerId = peerId;

          const room = getRoom(roomId);
          if (!room) {
            send(ws, { type: "resumeFailed", reason: "room-not-found" });
            logWarn("Peer resume failed: room not found", { roomId, peerId });
            return;
          }

          const peer = resumePeer(roomId, peerId, ws);
          if (!peer) {
            send(ws, { type: "resumeFailed", reason: "peer-not-found" });
            logWarn("Peer resume failed: peer not found", { roomId, peerId });
            return;
          }

          if (name) peer.name = name;
          send(ws, { type: "peerResumed", roomId, peerId });
          logInfo("Peer session resumed", { roomId, peerId, name: peer.name });
          break;
        }

        // ─── GET PRODUCERS ──────────────────────────────────────
        case "getProducers": {
          const { roomId, peerId } = data;
          const room = getRoom(roomId);
          if (!room) {
            logWarn("getProducers failed: room not found", { roomId, peerId });
            return;
          }
          
          const existingProducers = [];
          const existingDataProducers = [];
          Object.entries(room.peers).forEach(([id, peer]) => {
            if (id !== peerId) {
              Object.values(peer.producers).forEach((producer) => {
                existingProducers.push({
                  producerId: producer.id,
                  peerId: id,
                  name: peer.name,
                  isScreenShare: producer.appData?.isScreenShare || false,
                });
              });

              Object.values(peer.dataProducers).forEach((dataProducer) => {
                existingDataProducers.push({
                  dataProducerId: dataProducer.id,
                  peerId: id,
                  name: peer.name,
                  label: dataProducer.label,
                  protocol: dataProducer.protocol,
                });
              });
            }
          });

          if (existingProducers.length > 0) {
            send(ws, { type: "existingProducers", producers: existingProducers });
          }
          if (existingDataProducers.length > 0) {
            send(ws, { type: "existingDataProducers", dataProducers: existingDataProducers });
          }
          logInfo("Sent existing producers", {
            roomId,
            peerId,
            mediaProducers: existingProducers.length,
            dataProducers: existingDataProducers.length,
          });
          break;
        }

        // ─── CREATE TRANSPORT ───────────────────────────────────
        case "createTransport": {
          const { roomId, peerId, direction } = data;
          const room = getRoom(roomId);
          if (!room) {
            logWarn("createTransport failed: room not found", { roomId, peerId, direction });
            return;
          }

          const transport = await room.router.createWebRtcTransport({
            ...config.webRtcTransport,
            appData: { direction }
          });
          
          const peer = getPeer(roomId, peerId);
          if (!peer) {
            logWarn("createTransport failed: peer not found", { roomId, peerId, direction });
            return;
          }
          peer.transports[transport.id] = transport;

          send(ws, {
            type: "transportCreated",
            direction,
            transportOptions: {
              id: transport.id,
              iceParameters: transport.iceParameters,
              iceCandidates: transport.iceCandidates,
              dtlsParameters: transport.dtlsParameters,
              sctpParameters: transport.sctpParameters,
              iceServers: config.turn.iceServers,
            },
          });
          logInfo("Transport created", { roomId, peerId, direction, transportId: transport.id });
          break;
        }

        // ─── CONNECT TRANSPORT ──────────────────────────────────
        case "connectTransport": {
          const { roomId, peerId, transportId, dtlsParameters } = data;
          const peer = getPeer(roomId, peerId);
          const transport = peer?.transports[transportId];
          if (!transport) {
            logWarn("connectTransport failed: transport not found", { roomId, peerId, transportId });
            return;
          }

          await transport.connect({ dtlsParameters });
          send(ws, { type: "transportConnected", transportId });
          logInfo("Transport connected", { roomId, peerId, transportId });
          break;
        }

        // ─── RESTART ICE ────────────────────────────────────────
        case "restartIce": {
          const { roomId, peerId, transportId } = data;
          const peer = getPeer(roomId, peerId);
          const transport = peer?.transports[transportId];
          if (!transport) {
            logWarn("restartIce failed: transport not found", { roomId, peerId, transportId });
            return;
          }

          try {
            const iceParameters = await transport.restartIce();
            send(ws, { type: "iceRestarted", transportId, iceParameters });
            logInfo("ICE restarted", { roomId, peerId, transportId });
          } catch (err) {
            logError("Error restarting ICE", { roomId, peerId, transportId, error: err.message });
          }
          break;
        }

        // ─── PRODUCE ────────────────────────────────────────────
        case "produce": {
          const { roomId, peerId, transportId, kind, rtpParameters, isScreenShare } = data;
          const peer = getPeer(roomId, peerId);
          const transport = peer?.transports[transportId];
          if (!transport) {
            logWarn("produce failed: transport not found", {
              roomId,
              peerId,
              transportId,
              kind,
              isScreenShare: Boolean(isScreenShare),
            });
            return;
          }

          const producer = await transport.produce({
            kind,
            rtpParameters,
            appData: { isScreenShare: isScreenShare || false },
          });
          peer.producers[producer.id] = producer;
          logInfo("Producer created", {
            roomId,
            peerId,
            producerId: producer.id,
            kind,
            isScreenShare: Boolean(isScreenShare),
          });

          send(ws, { type: "produced", producerId: producer.id, kind });

          // Notify others so they can consume
          broadcast(roomId, peerId, {
            type: "newProducer",
            producerId: producer.id,
            peerId,
            name: peer.name,
            kind,
            isScreenShare: isScreenShare || false,
          });
          break;
        }

        // ─── PRODUCE DATA ───────────────────────────────────────
        case "produceData": {
          const {
            roomId,
            peerId,
            transportId,
            sctpStreamParameters,
            label,
            protocol,
          } = data;
          const peer = getPeer(roomId, peerId);
          const transport = peer?.transports[transportId];
          if (!transport) {
            logWarn("produceData failed: transport not found", {
              roomId,
              peerId,
              transportId,
              label,
              protocol,
            });
            return;
          }

          const dataProducer = await transport.produceData({
            sctpStreamParameters,
            label,
            protocol,
          });

          peer.dataProducers[dataProducer.id] = dataProducer;
          logInfo("Data producer created", {
            roomId,
            peerId,
            dataProducerId: dataProducer.id,
            label: dataProducer.label,
            protocol: dataProducer.protocol,
          });

          send(ws, {
            type: "dataProduced",
            dataProducerId: dataProducer.id,
            label: dataProducer.label,
            protocol: dataProducer.protocol,
          });

          broadcast(roomId, peerId, {
            type: "newDataProducer",
            dataProducerId: dataProducer.id,
            peerId,
            name: peer.name,
            label: dataProducer.label,
            protocol: dataProducer.protocol,
          });
          break;
        }

        // ─── CONSUME ────────────────────────────────────────────
        case "consume": {
  const { roomId, peerId, producerId, rtpCapabilities } = data;

  const room = getRoom(roomId);

  if (!room) {
    logWarn("consume failed: room not found", { roomId, peerId, producerId });
    return;
  }

  const peer = getPeer(roomId, peerId);

  if (!peer) {
    logWarn("consume failed: peer not found", { roomId, peerId, producerId });
    return;
  }
  // Find recv transport
  const recvTransport = Object.values(peer.transports).find(
    (t) => t.appData && t.appData.direction === "recv"
  );

  if (!recvTransport) {
    logWarn("consume failed: recv transport not found", { roomId, peerId, producerId });
    return;
  }

  // Check consume capability
  if (
    !room.router.canConsume({
      producerId,
      rtpCapabilities,
    })
  ) {
    logWarn("consume failed: router cannot consume producer", { roomId, peerId, producerId });
    return;
  }

  logInfo("Creating consumer", { roomId, peerId, producerId });

  // Create consumer PAUSED first
  const consumer = await recvTransport.consume({
    producerId,
    rtpCapabilities,
    paused: true,
  });

  // Save consumer
  peer.consumers[consumer.id] = consumer;
  logInfo("Consumer created", {
    roomId,
    peerId,
    producerId,
    consumerId: consumer.id,
    kind: consumer.kind,
  });

  // Send consumer params to client
  send(ws, {
    type: "consumed",
    consumerId: consumer.id,
    producerId,
    kind: consumer.kind,
    rtpParameters: consumer.rtpParameters,
  });

  break;
}

        case "resumeConsumer": {
          const { roomId, peerId, consumerId } = data;
          const peer = getPeer(roomId, peerId);
          const consumer = peer?.consumers[consumerId];
          if (!consumer) {
            logWarn("resumeConsumer failed: consumer not found", { roomId, peerId, consumerId });
            return;
          }

          await consumer.resume();
          send(ws, { type: "consumerResumed", consumerId });
          logInfo("Consumer resumed", {
            roomId,
            peerId,
            producerId: consumer.producerId,
            consumerId,
          });
          break;
        }

        // ─── CONSUME DATA ───────────────────────────────────────
        case "consumeData": {
          const { roomId, peerId, dataProducerId } = data;
          const peer = getPeer(roomId, peerId);
          if (!peer) {
            logWarn("consumeData failed: peer not found", { roomId, peerId, dataProducerId });
            return;
          }

          const recvTransport = Object.values(peer.transports).find(
            (transport) => transport.appData && transport.appData.direction === "recv"
          );

          if (!recvTransport) {
            logWarn("consumeData failed: recv transport not found", { roomId, peerId, dataProducerId });
            return;
          }

          const dataConsumer = await recvTransport.consumeData({ dataProducerId });
          peer.dataConsumers[dataConsumer.id] = dataConsumer;
          logInfo("Data consumer created", {
            roomId,
            peerId,
            dataProducerId,
            dataConsumerId: dataConsumer.id,
            label: dataConsumer.label,
            protocol: dataConsumer.protocol,
          });

          send(ws, {
            type: "dataConsumed",
            dataConsumerId: dataConsumer.id,
            dataProducerId,
            sctpStreamParameters: dataConsumer.sctpStreamParameters,
            label: dataConsumer.label,
            protocol: dataConsumer.protocol,
          });
          break;
        }

        // ─── CHAT MESSAGE ────────────────────────────────────────
        case "chat": {
          const { roomId, message, sender } = data;
          const room = getRoom(roomId);
          if (!room) {
            logWarn("chat failed: room not found", { roomId, sender });
            return;
          }

          broadcast(roomId, undefined, {
            type: "chat",
            message,
            sender,
          });
          logInfo("Chat broadcasted", { roomId, sender, messageLength: String(message || "").length });
          break;
        }

        // ─── SCREEN SHARE STOPPED ────────────────────────────────
        case "screenShareStopped": {
          const { roomId, peerId } = data;
          broadcast(roomId, peerId, {
            type: "screenShareStopped",
            peerId,
          });
          logInfo("Screen share stopped", { roomId, peerId });
          break;
        }

        case "mediaToggled": {
          const { roomId, peerId, kind, enabled } = data;
          broadcast(roomId, peerId, {
            type: "mediaToggled",
            peerId,
            kind,
            enabled,
          });
          logInfo("Media toggled", { roomId, peerId, kind, enabled });
          break;
        }



        // ─── LEAVE ──────────────────────────────────────────────
        case "leave": {
          if (myRoomId && myPeerId) {
            const room = getRoom(myRoomId);
            const peer = room?.peers[myPeerId];
            if (peer && peer.ws === ws) {
              broadcast(myRoomId, myPeerId, { type: "peerLeft", peerId: myPeerId });
              removePeer(myRoomId, myPeerId);
              logInfo("Peer left room", { roomId: myRoomId, peerId: myPeerId });
            }
          } else {
            logWarn("Leave received without active room context");
          }
          break;
        }
      }
    } catch (err) {
      logError(`Error handling [${data.type}]`, {
        roomId: data.roomId,
        peerId: data.peerId,
        error: err.message,
      });
    }
  });

  ws.on("close", () => {
    if (myRoomId && myPeerId) {
      const room = getRoom(myRoomId);
      const peer = room?.peers[myPeerId];
      if (peer && peer.ws === ws) {
        markPeerDisconnected(myRoomId, myPeerId, (roomId, peerId) => {
          broadcast(roomId, peerId, { type: "peerLeft", peerId });
          logInfo("Peer cleanup expired after disconnect", {
            roomId,
            peerId,
            graceMs: RECONNECT_GRACE_MS,
          });
        });
        logInfo("Peer disconnected, waiting for resume", {
          roomId: myRoomId,
          peerId: myPeerId,
          graceMs: RECONNECT_GRACE_MS,
        });
      } else {
        logInfo("Old socket disconnected, skipping cleanup as peer reconnected", { roomId: myRoomId, peerId: myPeerId });
      }
    } else {
      logInfo("Socket disconnected before room join");
    }
  });
}

module.exports = socketHandler;
