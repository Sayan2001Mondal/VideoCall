const { getWorker } = require("../config/mediasoupWorker");
const config = require("../config/mediasoup");

// rooms[roomId] = { router, peers: { peerId: { ws, transports, producers, consumers, dataProducers, dataConsumers } } }
const rooms = {};
const RECONNECT_GRACE_MS = 15000;

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
      disconnectedAt: null,
      cleanupTimer: null,
    };
  }
}

function clearPeerCleanup(peer) {
  if (!peer?.cleanupTimer) return;
  clearTimeout(peer.cleanupTimer);
  peer.cleanupTimer = null;
}

function markPeerDisconnected(roomId, peerId, onExpire) {
  const peer = rooms[roomId]?.peers[peerId];
  if (!peer) return null;

  peer.disconnectedAt = Date.now();
  clearPeerCleanup(peer);
  peer.cleanupTimer = setTimeout(() => {
    const latestPeer = rooms[roomId]?.peers[peerId];
    if (!latestPeer || !latestPeer.disconnectedAt) return;
    if (typeof onExpire === "function") onExpire(roomId, peerId, latestPeer);
    removePeer(roomId, peerId);
  }, RECONNECT_GRACE_MS);

  return peer;
}

function resumePeer(roomId, peerId, ws) {
  const peer = rooms[roomId]?.peers[peerId];
  if (!peer) return null;

  clearPeerCleanup(peer);
  peer.ws = ws;
  peer.disconnectedAt = null;
  return peer;
}

function removePeer(roomId, peerId) {
  const room = rooms[roomId];
  if (!room) return;

  const peer = room.peers[peerId];
  if (!peer) return;

  clearPeerCleanup(peer);
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

module.exports = {
  getOrCreateRoom,
  addPeer,
  markPeerDisconnected,
  removePeer,
  resumePeer,
  getPeer,
  getRoom,
  getOtherPeers,
  RECONNECT_GRACE_MS,
};
