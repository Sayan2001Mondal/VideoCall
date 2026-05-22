# Frontend Session Reconnection Specification

## Overview

This document defines the signaling contract and expected session behavior for reconnecting a frontend participant after a transient network interruption.

The goal of this flow is to preserve the participant's existing room identity and active call session when the signaling WebSocket disconnects briefly. When recovery succeeds, the participant remains the same logical peer in the room and other participants do not observe an unnecessary leave-and-rejoin cycle.

This specification applies to the frontend signaling layer and mediasoup session recovery flow. All payloads described here are exchanged over the existing WebSocket connection.

## Scope

This specification covers:

- peer session resume after WebSocket reconnection
- ICE restart for existing mediasoup transports
- fallback behavior when session resume is not possible
- observable message contract between frontend and backend

This specification does not redefine the normal room join flow beyond the points needed for reconnection fallback.

## Session Retention Window

After an unintentional socket disconnect, the backend preserves the peer session for a fixed grace period of `15000 ms`.

During that interval:

- the peer remains eligible for session resume
- the peer is not immediately removed from room state
- the backend does not broadcast `peerLeft` unless the grace period expires

If the grace period expires before a successful resume, the peer session is removed and normal join behavior becomes the only valid recovery path.

## Terminology

`Room`
: The logical call space identified by `roomId`.

`Peer`
: The participant identity identified by `peerId`.

`Session Resume`
: Rebinding a newly reconnected WebSocket to an existing backend peer record.

`Transport Recovery`
: Re-establishing media connectivity for existing mediasoup transports by means of ICE restart.

`Full Rejoin`
: Creating a fresh signaling and mediasoup session through the standard join flow.

## Functional Behavior

### Successful Recovery

A successful recovery consists of:

1. WebSocket reconnection
2. peer session resume using the same `roomId` and `peerId`
3. ICE restart on the previously established send and receive transports

When this sequence succeeds:

- the peer retains the same room identity
- the existing backend peer record is reused
- the room does not receive a `peerLeft` event for that interruption

### Recovery Failure

Recovery is considered unsuccessful when the backend can no longer resume the peer session or when transport recovery cannot be completed reliably.

In those cases:

- the existing local mediasoup session is discarded
- the frontend returns to the normal join flow
- the participant re-enters the room as a fresh active session, even if the same `peerId` is reused at application level

## Signaling Contract

## 1. Resume Peer Session

### Request

Sent by the frontend after the WebSocket has reconnected and the client intends to resume the prior peer session.

```json
{
  "type": "resumePeer",
  "roomId": "room-123",
  "peerId": "peer-123",
  "name": "Sayan"
}
```

### Fields

`type`
: Constant value: `resumePeer`

`roomId`
: Identifier of the room containing the existing peer session

`peerId`
: Identifier of the peer session to be resumed

`name`
: Current participant display name. When provided, the backend updates the stored peer name.

### Success Response

```json
{
  "type": "peerResumed",
  "roomId": "room-123",
  "peerId": "peer-123"
}
```

### Failure Response

```json
{
  "type": "resumeFailed",
  "reason": "room-not-found"
}
```

### Failure Reasons

The backend currently emits the following failure reasons:

- `room-not-found`
- `peer-not-found`

### Semantics

On success, the backend associates the newly connected socket with the existing peer record and clears any pending disconnect cleanup for that peer.

On failure, the existing session is no longer resumable and the frontend must recover using a full rejoin flow.

## 2. Restart ICE

### Request

Sent by the frontend to refresh connectivity for an existing mediasoup transport.

```json
{
  "type": "restartIce",
  "roomId": "room-123",
  "peerId": "peer-123",
  "transportId": "transport-abc"
}
```

### Fields

`type`
: Constant value: `restartIce`

`roomId`
: Room identifier

`peerId`
: Peer identifier

`transportId`
: Identifier of the mediasoup transport that requires ICE restart

### Success Response

```json
{
  "type": "iceRestarted",
  "transportId": "transport-abc",
  "iceParameters": {
    "usernameFragment": "...",
    "password": "...",
    "iceLite": true
  }
}
```

### Semantics

The `iceRestarted` response provides replacement ICE parameters for the referenced transport. The frontend applies those parameters to the matching local mediasoup transport instance.

This message is used in two situations:

- immediately after a successful peer resume
- whenever an existing transport enters a degraded connectivity state and requires ICE refresh

## 3. Full Join Fallback

When the prior peer session cannot be resumed, recovery falls back to the standard join flow.

### Join Request

```json
{
  "type": "join",
  "roomId": "room-123",
  "peerId": "peer-123",
  "name": "Sayan"
}
```

The normal mediasoup setup sequence remains unchanged:

- receive `routerRtpCapabilities`
- create send transport
- create receive transport
- connect transports
- produce local media
- create data producer
- request existing producers

## Recovery Lifecycle

### Phase 1. Signaling Disconnection

When the active WebSocket disconnects unexpectedly:

- the backend marks the peer as temporarily disconnected
- peer cleanup is deferred until the grace period expires
- the frontend enters a disconnected or reconnecting UI state

At this stage the peer session remains resumable.

### Phase 2. Socket Reconnection

When the frontend opens a new WebSocket successfully:

- the frontend may attempt peer resume if the previous session context is still valid
- the previous room and peer identity must be preserved for that attempt

### Phase 3. Session Resume

The frontend sends `resumePeer`.

If `peerResumed` is returned:

- the signaling session is restored
- the frontend proceeds to transport recovery

If `resumeFailed` is returned:

- the prior session is considered unrecoverable
- the frontend proceeds to full rejoin

### Phase 4. Transport Recovery

After a successful resume, the frontend performs ICE restart for all active long-lived mediasoup transports required for the call session.

At minimum this includes:

- send transport
- receive transport

Once the backend returns `iceRestarted`, the frontend updates the matching client-side transport with the replacement ICE parameters.

### Phase 5. Recovery Completion

Recovery is complete when:

- the peer session has been resumed successfully
- all required transports have received and applied ICE restart parameters

## Message Ordering

The expected message ordering for resumable recovery is:

1. socket reconnects
2. frontend sends `resumePeer`
3. backend returns `peerResumed`
4. frontend sends `restartIce` for each recoverable transport
5. backend returns `iceRestarted` for each requested transport

If step 3 returns `resumeFailed`, the reconnect flow terminates and full rejoin begins.

## Related Real-Time Events

The frontend should remain capable of processing normal room events during recovery and after reconnection, including:

- `peerJoined`
- `peerLeft`
- `newProducer`
- `existingProducers`
- `newDataProducer`
- `existingDataProducers`
- `mediaToggled`
- `screenShareStopped`
- `iceRestarted`

These events remain part of the active signaling contract and are not suspended by the reconnect flow.

## Behavioral Constraints

### Intentional Leave vs Unintentional Disconnect

The reconnect flow applies only to unintentional disconnections.

If the participant intentionally leaves the room:

- the frontend sends `leave`
- the backend removes the peer immediately
- the session is no longer resumable

If the socket closes without an intentional leave:

- the backend starts the grace-period retention flow
- the peer remains temporarily resumable

### Peer Identity Continuity

Session resume depends on continuity of:

- `roomId`
- `peerId`

If either value changes, the backend treats the client as a different session context and peer resume is not valid.

### Existing Transport Requirement

Transport recovery assumes the frontend still holds valid references to the existing mediasoup transports established before disconnect.

If those transport instances are no longer available locally, full rejoin is required.

## Failure Handling

Recovery should be treated as failed under any of the following conditions:

- the backend returns `resumeFailed`
- the backend no longer holds the room
- the backend no longer holds the peer
- the frontend no longer holds the original send transport
- the frontend no longer holds the original receive transport
- ICE restart cannot be completed for the required transports within the frontend's recovery timeout policy

The current backend implementation does not emit a dedicated `restartIce` failure payload when a transport cannot be found. In that case the backend logs the failure server-side and no success response is returned.

For that reason, frontend recovery should apply a bounded timeout policy around transport recovery rather than waiting indefinitely.

## Backend Guarantees

Within the reconnect grace window, the backend guarantees the following behavior:

- an existing disconnected peer remains resumable by `peerId`
- pending peer cleanup is canceled when `resumePeer` succeeds
- `peerLeft` is not broadcast unless the peer explicitly leaves or the grace timer expires

Outside the reconnect grace window, no resume guarantee exists.

## Compatibility Notes

This specification reflects the current backend behavior implemented in:

- [backend/socket/socketHandler.js](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/backend/socket/socketHandler.js:1)
- [backend/socket/roomManager.js](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/backend/socket/roomManager.js:1)

Known implementation values:

- reconnect grace period: `15000 ms`
- current frontend socket wait timeout for response matching: `10000 ms`

## Summary

The reconnect contract is based on two operations:

- `resumePeer` to restore the signaling association for the existing peer
- `restartIce` to restore media transport connectivity for the existing mediasoup transports

If either peer resume or transport recovery cannot be completed successfully, the recovery path transitions to a standard full join flow.
