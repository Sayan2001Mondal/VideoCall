const {
  getOrCreateRoom,
  addPeer,
  removePeer,
  getPeer,
  getRoom,
  getOtherPeers,
} = require("./roomManager");
const config = require("../config/mediasoup");

function send(ws, data) {
  if (ws.readyState === 1) ws.send(JSON.stringify(data));
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

          const room = await getOrCreateRoom(roomId);
          addPeer(roomId, peerId, ws);
          room.peers[peerId].name = name;

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

        // ─── GET PRODUCERS ──────────────────────────────────────
        case "getProducers": {
          const { roomId, peerId } = data;
          const room = getRoom(roomId);
          if (!room) return;
          
          const existingProducers = [];
          Object.entries(room.peers).forEach(([id, peer]) => {
            if (id !== peerId) {
              Object.values(peer.producers).forEach((producer) => {
                existingProducers.push({ producerId: producer.id, peerId: id, name: peer.name });
              });
            }
          });

          if (existingProducers.length > 0) {
            send(ws, { type: "existingProducers", producers: existingProducers });
          }
          break;
        }

        // ─── CREATE TRANSPORT ───────────────────────────────────
        case "createTransport": {
          const { roomId, peerId, direction } = data;
          const room = getRoom(roomId);
          if (!room) return;

          const transport = await room.router.createWebRtcTransport({
            ...config.webRtcTransport,
            appData: { direction }
          });
          
          const peer = getPeer(roomId, peerId);
          peer.transports[transport.id] = transport;

          send(ws, {
            type: "transportCreated",
            direction,
            transportOptions: {
              id: transport.id,
              iceParameters: transport.iceParameters,
              iceCandidates: transport.iceCandidates,
              dtlsParameters: transport.dtlsParameters,
            },
          });
          break;
        }

        // ─── CONNECT TRANSPORT ──────────────────────────────────
        case "connectTransport": {
          const { roomId, peerId, transportId, dtlsParameters } = data;
          const peer = getPeer(roomId, peerId);
          const transport = peer?.transports[transportId];
          if (!transport) return;

          await transport.connect({ dtlsParameters });
          send(ws, { type: "transportConnected", transportId });
          break;
        }

        // ─── PRODUCE ────────────────────────────────────────────
        case "produce": {
          const { roomId, peerId, transportId, kind, rtpParameters } = data;
          const peer = getPeer(roomId, peerId);
          const transport = peer?.transports[transportId];
          if (!transport) return;

          const producer = await transport.produce({ kind, rtpParameters });
          peer.producers[producer.id] = producer;

          send(ws, { type: "produced", producerId: producer.id, kind });

          // Notify others so they can consume
          broadcast(roomId, peerId, {
            type: "newProducer",
            producerId: producer.id,
            peerId,
            name: peer.name,
            kind,
          });
          break;
        }

        // ─── CONSUME ────────────────────────────────────────────
        case "consume": {
  const { roomId, peerId, producerId, rtpCapabilities } = data;

  const room = getRoom(roomId);

  if (!room) {
    console.log("Room not found");
    return;
  }

  const peer = getPeer(roomId, peerId);

  if (!peer) {
    console.log("Peer not found");
    return;
  }

  console.log(
  "ALL TRANSPORTS:",
  Object.values(peer.transports).map((t) => ({
    id: t.id,
    appData: t.appData,
  }))
);
  // Find recv transport
  const recvTransport = Object.values(peer.transports).find(
    (t) => t.appData && t.appData.direction === "recv"
  );

  if (!recvTransport) {
    console.log("Recv transport not found");
    return;
  }

  // Check consume capability
  if (
    !room.router.canConsume({
      producerId,
      rtpCapabilities,
    })
  ) {
    console.log("Cannot consume producer:", producerId);
    return;
  }

  console.log("Creating consumer for producer:", producerId);

  // Create consumer PAUSED first
  const consumer = await recvTransport.consume({
    producerId,
    rtpCapabilities,
    paused: true,
  });

  // Save consumer
  peer.consumers[consumer.id] = consumer;

  // Send consumer params to client
  send(ws, {
    type: "consumed",
    consumerId: consumer.id,
    producerId,
    kind: consumer.kind,
    rtpParameters: consumer.rtpParameters,
  });

  console.log("Consumer created:", consumer.id);

  // Resume after sending to client
  await consumer.resume();

  console.log("Consumer resumed:", consumer.id);

  break;
}

        // ─── CHAT ───────────────────────────────────────────────
        case "chat": {
          const { roomId, peerId, message, sender } = data;
          const room = getRoom(roomId);
          if (!room) return;
          Object.values(room.peers).forEach((peer) => {
            send(peer.ws, { type: "chat", message, sender });
          });
          break;
        }

        // ─── LEAVE ──────────────────────────────────────────────
        case "leave": {
          if (myRoomId && myPeerId) {
            broadcast(myRoomId, myPeerId, { type: "peerLeft", peerId: myPeerId });
            removePeer(myRoomId, myPeerId);
          }
          break;
        }
      }
    } catch (err) {
      console.error(`Error handling [${data.type}]:`, err);
    }
  });

  ws.on("close", () => {
    if (myRoomId && myPeerId) {
      broadcast(myRoomId, myPeerId, { type: "peerLeft", peerId: myPeerId });
      removePeer(myRoomId, myPeerId);
    }
    console.log("Peer disconnected");
  });
}

module.exports = socketHandler;