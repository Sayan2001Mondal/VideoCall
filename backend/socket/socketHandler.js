const {
  addPeer,
  markPeerDisconnected,
  removePeer,
  resumePeer,
  getPeer,
  getRoom,
  getOtherPeers,
  createGeneratedRoom,
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

function sendJoinRejected(ws, reason, extra = {}) {
  send(ws, {
    type: "joinRejected",
    reason,
    ...extra,
  });
}

function broadcast(roomId, peerId, data) {
  const room = getRoom(roomId);
  if (!room) return;
  Object.entries(room.peers).forEach(([id, peer]) => {
    if (id !== peerId) send(peer.ws, data);
  });
}

// ─── VALIDATION HELPERS ─────────────────────────────────────────────────────

const MAX_MSG_BYTES = 10 * 1024;
const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX_MESSAGES = 20;
const ROOM_ID_REGEX = /^[a-z]{4}-[a-z]{4}-[a-z]{4}$/;


function assertStr(val, field, maxLen = 128) {
  if (typeof val !== "string" || val.trim().length === 0 || val.length > maxLen) {
    throw new ValidationError(`Invalid field "${field}": must be a non-empty string ≤${maxLen} chars`);
  }
}

function assertRoomId(val) {
  assertStr(val, "roomId");
  if (!ROOM_ID_REGEX.test(val)) {
    throw new ValidationError('Invalid field "roomId": must match format "abcd-efgh-ijkl"');
  }
}

function assertEnum(val, field, options) {
  if (!options.includes(val)) {
    throw new ValidationError(`Invalid field "${field}": must be one of [${options.join(", ")}]`);
  }
}

function assertObj(val, field) {
  if (typeof val !== "object" || val === null || Array.isArray(val)) {
    throw new ValidationError(`Invalid field "${field}": must be an object`);
  }
}

function assertBool(val, field) {
  if (typeof val !== "boolean") {
    throw new ValidationError(`Invalid field "${field}": must be a boolean`);
  }
}

class ValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
  }
}

// ─── SOCKET HANDLER ─────────────────────────────────────────────────────────

function socketHandler(ws) {
  let myRoomId = null;
  let myPeerId = null;

  let lastWindowStart = Date.now();
  let messageCount = 0;

  ws.on("message", async (raw) => {
    // Rate limiting
    const now = Date.now();
    if (now - lastWindowStart > RATE_LIMIT_WINDOW_MS) {
      lastWindowStart = now;
      messageCount = 0;
    }
    messageCount++;
    if (messageCount > RATE_LIMIT_MAX_MESSAGES) {
      logWarn("Rate limit exceeded", { peerId: myPeerId });
      return send(ws, { type: "error", message: "Rate limit exceeded. Please slow down." });
    }

    // Reject oversized messages before parsing
    if (Buffer.byteLength(raw) > MAX_MSG_BYTES) {
      logWarn("Message too large, closing connection");
      return ws.close(1009, "Message too large");
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      logWarn("Invalid JSON received, closing connection");
      return ws.close(1007, "Invalid JSON");
    }

    if (typeof data.type !== "string") {
      logWarn("Message missing type field");
      return;
    }

    try {
      switch (data.type) {

        case "join": {
          try {
            assertRoomId(data.roomId);
          } catch (err) {
            if (err instanceof ValidationError) {
              sendJoinRejected(ws, "invalid-room-id", {
                message: err.message,
                field: "roomId",
                expectedFormat: "abcd-efgh-ijkl",
              });
              logWarn("Join rejected: invalid room ID format", {
                roomId: data.roomId,
                peerId: data.peerId,
              });
              return;
            }
            throw err;
          }
          assertStr(data.peerId, "peerId");
          assertStr(data.name, "name", 64);
          const { roomId, peerId, name } = data;
          myRoomId = roomId;
          myPeerId = peerId;

          let room = getRoom(roomId);
          if (!room) {
            sendJoinRejected(ws, "room-not-found", {
              message: "Room not found",
              field: "roomId",
            });
            logWarn("Join rejected: room not found", { roomId, peerId });
            return;
          }

          if (room.peers[peerId]) {
            logInfo("Peer rejoining, cleaning up old state", { roomId, peerId });
            broadcast(roomId, peerId, { type: "peerLeft", peerId });
            removePeer(roomId, peerId);
            room = getRoom(roomId);
            if (!room) {
              sendJoinRejected(ws, "room-not-found", {
                message: "Room not found",
                field: "roomId",
              });
              logWarn("Join rejected after stale peer cleanup", { roomId, peerId });
              return;
            }
          }

          addPeer(roomId, peerId, ws);
          room.peers[peerId].name = name;
          logInfo("Peer joined room", { roomId, peerId, name });

          send(ws, {
            type: "routerRtpCapabilities",
            rtpCapabilities: room.router.rtpCapabilities,
          });

          broadcast(roomId, peerId, {
            type: "peerJoined",
            peerId,
            name,
          });
          break;
        }

        case "resumePeer": {
          assertRoomId(data.roomId);
          assertStr(data.peerId, "peerId");
          if (data.name !== undefined) assertStr(data.name, "name", 64);
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
          assertRoomId(data.roomId);
          assertStr(data.peerId, "peerId");
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
          assertRoomId(data.roomId);
          assertStr(data.peerId, "peerId");
          assertEnum(data.direction, "direction", ["send", "recv"]);
          const { roomId, peerId, direction } = data;
          const room = getRoom(roomId);
          if (!room) {
            logWarn("createTransport failed: room not found", { roomId, peerId, direction });
            return;
          }

          const transport = await room.router.createWebRtcTransport({
            ...config.webRtcTransport,
            appData: { direction },
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
          assertRoomId(data.roomId);
          assertStr(data.peerId, "peerId");
          assertStr(data.transportId, "transportId");
          assertObj(data.dtlsParameters, "dtlsParameters");
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
          assertRoomId(data.roomId);
          assertStr(data.peerId, "peerId");
          assertStr(data.transportId, "transportId");
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
          assertRoomId(data.roomId);
          assertStr(data.peerId, "peerId");
          assertStr(data.transportId, "transportId");
          assertEnum(data.kind, "kind", ["audio", "video"]);
          assertObj(data.rtpParameters, "rtpParameters");
          if (data.isScreenShare !== undefined) assertBool(data.isScreenShare, "isScreenShare");
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
        //Generate-Room
        case "generateRoom": {
          try {
            const roomId = await createGeneratedRoom();

            send(ws, {
              type: "roomGenerated",
              roomId,
            });
          } catch (err) {
            send(ws, {
              type: "error",
              message: "Room generation failed",
            });
          }
          break;
        }



        // ─── PRODUCE DATA ───────────────────────────────────────
        case "produceData": {
          assertRoomId(data.roomId);
          assertStr(data.peerId, "peerId");
          assertStr(data.transportId, "transportId");
          assertObj(data.sctpStreamParameters, "sctpStreamParameters");
          assertStr(data.label, "label", 256);
          if (data.protocol !== undefined) assertStr(data.protocol, "protocol", 64);
          const { roomId, peerId, transportId, sctpStreamParameters, label, protocol } = data;
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
          assertRoomId(data.roomId);
          assertStr(data.peerId, "peerId");
          assertStr(data.producerId, "producerId");
          assertObj(data.rtpCapabilities, "rtpCapabilities");
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

          const recvTransport = Object.values(peer.transports).find(
            (t) => t.appData && t.appData.direction === "recv"
          );
          if (!recvTransport) {
            logWarn("consume failed: recv transport not found", { roomId, peerId, producerId });
            return;
          }

          if (!room.router.canConsume({ producerId, rtpCapabilities })) {
            logWarn("consume failed: router cannot consume producer", { roomId, peerId, producerId });
            return;
          }

          logInfo("Creating consumer", { roomId, peerId, producerId });

          const consumer = await recvTransport.consume({
            producerId,
            rtpCapabilities,
            paused: true,
          });

          peer.consumers[consumer.id] = consumer;
          logInfo("Consumer created", {
            roomId,
            peerId,
            producerId,
            consumerId: consumer.id,
            kind: consumer.kind,
          });

          send(ws, {
            type: "consumed",
            consumerId: consumer.id,
            producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
          });

          await consumer.resume();
          logInfo("Consumer resumed", { roomId, peerId, producerId, consumerId: consumer.id });
          break;
        }

        // ─── CONSUME DATA ───────────────────────────────────────
        case "consumeData": {
          assertRoomId(data.roomId);
          assertStr(data.peerId, "peerId");
          assertStr(data.dataProducerId, "dataProducerId");
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
          assertRoomId(data.roomId);
          assertStr(data.message, "message", 2048);
          assertStr(data.sender, "sender", 64);
          const { roomId, message, sender } = data;
          const room = getRoom(roomId);
          if (!room) {
            logWarn("chat failed: room not found", { roomId, sender });
            return;
          }

          broadcast(roomId, undefined, { type: "chat", message, sender });
          logInfo("Chat broadcasted", { roomId, sender, messageLength: String(message || "").length });
          break;
        }

        // ─── SCREEN SHARE STOPPED ────────────────────────────────
        case "screenShareStopped": {
          assertRoomId(data.roomId);
          assertStr(data.peerId, "peerId");
          const { roomId, peerId } = data;
          broadcast(roomId, peerId, { type: "screenShareStopped", peerId });
          logInfo("Screen share stopped", { roomId, peerId });
          break;
        }

        case "mediaToggled": {
          assertRoomId(data.roomId);
          assertStr(data.peerId, "peerId");
          assertEnum(data.kind, "kind", ["audio", "video"]);
          assertBool(data.enabled, "enabled");
          const { roomId, peerId, kind, enabled } = data;
          broadcast(roomId, peerId, { type: "mediaToggled", peerId, kind, enabled });
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
      if (err instanceof ValidationError) {
        logWarn(`Validation failed [${data.type}]: ${err.message}`, {
          roomId: data.roomId,
          peerId: data.peerId,
        });
        send(ws, { type: "error", message: err.message });
        return;
      }
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
        logInfo("Old socket disconnected, skipping cleanup as peer reconnected", {
          roomId: myRoomId,
          peerId: myPeerId,
        });
      }
    } else {
      logInfo("Socket disconnected before room join");
    }
  });
}

module.exports = socketHandler;
