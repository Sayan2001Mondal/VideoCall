# Reconnection Flow

This document explains how reconnection is currently handled in the project after the seamless-recovery update.

Relevant files:

- [frontend/src/hooks/useSocket.js](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/frontend/src/hooks/useSocket.js:1)
- [frontend/src/hooks/useMediaSoup.js](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/frontend/src/hooks/useMediaSoup.js:1)
- [backend/socket/socketHandler.js](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/backend/socket/socketHandler.js:1)
- [backend/socket/roomManager.js](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/backend/socket/roomManager.js:1)

## Goal

The goal is to recover from short network interruptions without treating the user like a brand-new participant.

Instead of immediately removing the peer from the room when the socket drops, the backend now keeps that peer alive for a short grace period. During that window, the frontend can reconnect and resume the same peer session.

## High-Level Flow

1. The WebSocket disconnects.
2. The backend marks the peer as temporarily disconnected instead of removing them immediately.
3. The frontend reconnects the WebSocket automatically.
4. The frontend sends `resumePeer` with the same `roomId` and `peerId`.
5. The backend rebinds the new socket to the existing peer state.
6. The frontend requests ICE restart on the existing send and receive transports.
7. If resume fails, the frontend falls back to a full `join` and transport recreation.

## Frontend Responsibilities

### `useSocket`

`useSocket` handles WebSocket-level reconnect attempts.

In [frontend/src/hooks/useSocket.js](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/frontend/src/hooks/useSocket.js:25):

- it opens the socket connection
- retries automatically on disconnect
- uses exponential backoff
- reconnects immediately when the browser comes back online

This hook only restores the WebSocket connection itself. It does not rebuild or resume the mediasoup session directly.

### `useMediaSoup`

`useMediaSoup` handles session-level recovery.

In [frontend/src/hooks/useMediaSoup.js](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/frontend/src/hooks/useMediaSoup.js:32), the hook now includes helpers for:

- waiting for a specific socket response
- sending `resumePeer`
- tearing down a mediasoup session when full recovery is needed
- requesting ICE restart for existing transports

Important pieces:

#### `requestPeerResume()`

This sends:

```json
{ "type": "resumePeer", "roomId": "...", "peerId": "...", "name": "..." }
```

The frontend then waits for one of:

- `peerResumed`
- `resumeFailed`

#### `connectSession()`

This is the main decision point in the connection lifecycle effect.

If the app already had a session before, and the existing send/recv transports are still present, it:

- shows reconnecting state
- calls `requestPeerResume()`
- requests ICE restart for both transports

If that works, the user stays in the same logical peer session.

If resume fails, it:

- tears down the old mediasoup session
- falls back to a fresh `join`
- recreates transports and producers
- fetches producers again

#### `requestTransportIceRestart(transport)`

This sends:

```json
{ "type": "restartIce", "roomId": "...", "peerId": "...", "transportId": "..." }
```

This is used after successful resume so existing transports can recover connectivity without recreating the whole peer session.

#### Transport `connectionstatechange`

Both send and receive transports listen for:

- `disconnected`
- `failed`

When that happens, the frontend asks the backend to restart ICE for the affected transport.

## Backend Responsibilities

### Room State Preservation

In [backend/socket/roomManager.js](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/backend/socket/roomManager.js:5), peers now store:

- `disconnectedAt`
- `cleanupTimer`

This lets the backend preserve the peer for a limited time after socket loss.

### Grace Period

The reconnect grace window is:

```js
const RECONNECT_GRACE_MS = 15000;
```

That means the peer has 15 seconds to reconnect before the backend removes them completely.

### `markPeerDisconnected(roomId, peerId, onExpire)`

When the socket closes, this function:

- marks the peer as disconnected
- starts a cleanup timer
- delays actual peer removal until the grace timer expires

If the timer expires:

- the backend broadcasts `peerLeft`
- the peer is fully removed

### `resumePeer(roomId, peerId, ws)`

When a new WebSocket reconnects and the frontend sends `resumePeer`, this function:

- finds the existing peer
- clears the cleanup timer
- replaces the old `ws` reference with the new one
- marks the peer as connected again

This is the backend step that preserves identity across reconnect.

## Backend Socket Handler Flow

### On `close`

In [backend/socket/socketHandler.js](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/backend/socket/socketHandler.js:364), when a socket closes:

- the backend checks whether that socket still belongs to the active peer
- if yes, it does not immediately remove the peer
- instead it calls `markPeerDisconnected(...)`
- it waits for a reconnect during the grace period

If the peer reconnects in time, cleanup is canceled.

If not, cleanup expires and `peerLeft` is broadcast.

### On `resumePeer`

In [backend/socket/socketHandler.js](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/backend/socket/socketHandler.js:84), when `resumePeer` arrives:

- the backend checks whether the room exists
- checks whether the peer still exists
- reattaches the new socket to that peer
- returns `peerResumed`

If it cannot find the room or peer, it returns `resumeFailed`.

### On `restartIce`

In [backend/socket/socketHandler.js](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/backend/socket/socketHandler.js:214), the backend:

- finds the transport
- calls `transport.restartIce()`
- sends the new `iceParameters` back as `iceRestarted`

The frontend then applies those ICE parameters to the matching transport.

## Recovery Modes

There are now two recovery paths.

### 1. Seamless Resume

Used when:

- the socket reconnects quickly
- the peer still exists on the backend
- the transports still exist on the frontend

Flow:

- reconnect socket
- `resumePeer`
- `peerResumed`
- restart ICE

Result:

- same `peerId`
- no immediate `peerLeft`
- no full room rejoin

### 2. Full Rejoin Fallback

Used when:

- the grace period expired
- the room was deleted
- the peer no longer exists
- the resume attempt fails for any reason

Flow:

- frontend tears down current mediasoup session
- sends `join`
- recreates device and transports
- re-produces local media
- fetches room producers again

Result:

- recovery still happens, but not as smoothly as a true resume

## What Makes This “More Seamless”

Before this change:

- socket close caused immediate peer removal
- reconnect looked like leave + rejoin
- transports were destroyed right away

After this change:

- peer state is preserved briefly
- reconnect can reuse the same peer identity
- ICE restart is attempted before full rejoin

## Current Limitations

This is a first-pass recovery system, not perfect session persistence.

Things that can still force fallback:

- reconnect takes longer than 15 seconds
- browser destroys transport state
- mediasoup transport becomes unusable
- page reload or tab close
- room gets deleted because no peer survived long enough

## Practical Summary

Simple mental model:

- `useSocket` restores the WebSocket
- `useMediaSoup` tries to resume the mediasoup session
- backend keeps the peer alive briefly
- ICE restart repairs transport connectivity
- full rejoin is the safety net if resume is not possible
