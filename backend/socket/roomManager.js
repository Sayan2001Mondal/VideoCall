const { getWorker } = require("../config/mediasoupWorker");
const config = require("../config/mediasoup");

// rooms[roomId] = { router, peers: { peerId: { ws, transports, producers, consumers, dataProducers, dataConsumers } } }
const rooms = {};

async function getOrCreateRoom(roomId) {
  if (!rooms[roomId]) {
    const worker = await getWorker();
    const router = await worker.createRouter({ mediaCodecs: config.router.mediaCodecs });
    rooms[roomId] = { router, peers: {} };
    console.log(`Room created: ${roomId}`);
  }
  return rooms[roomId];
}

function addPeer(roomId, peerId, ws) {
  if (rooms[roomId]) {
    rooms[roomId].peers[peerId] = {
      ws,
      name: null,
      transports: {},
      producers: {},
      consumers: {},
      dataProducers: {},
      dataConsumers: {},
    };
  }
}

function removePeer(roomId, peerId) {
  const room = rooms[roomId];
  if (!room) return;

  const peer = room.peers[peerId];
  if (!peer) return;

  // Close all transports (closes producers/consumers too)
  Object.values(peer.transports).forEach((t) => t.close());
  delete room.peers[peerId];

  if (Object.keys(room.peers).length === 0) {
    room.router.close();
    delete rooms[roomId];
    console.log(`Room deleted: ${roomId}`);
  }
}

function getPeer(roomId, peerId) {
  return rooms[roomId]?.peers[peerId];
}

function getRoom(roomId) {
  return rooms[roomId];
}

function getOtherPeers(roomId, peerId) {
  const room = rooms[roomId];
  if (!room) return [];
  return Object.entries(room.peers)
    .filter(([id]) => id !== peerId)
    .map(([id, peer]) => ({ peerId: id, name: peer.name }));
}

module.exports = { getOrCreateRoom, addPeer, removePeer, getPeer, getRoom, getOtherPeers };
