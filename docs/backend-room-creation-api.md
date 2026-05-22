# Backend Room Creation API

## Overview

This document defines the backend API for generating a new room ID before a participant joins a call.

The frontend can use this API when the user clicks a `Create room` or `Generate room` action. The backend returns a unique `roomId` and initializes the mediasoup room state immediately, so the room is ready for the normal WebSocket join flow.

This API is additive. The existing socket-based `join` flow still works as before.

## Endpoint

### `POST /rooms`

Creates a new room on the backend and returns its generated ID.

### Request

No request body is required.

Example:

```http
POST /rooms
Content-Type: application/json
```

The backend currently ignores the body, so the frontend may send either:

- no body at all
- an empty JSON object: `{}`

## Success Response

Status:

```http
201 Created
```

Body:

```json
{
  "roomId": "abcd-efgh-ijkl"
}
```

## Response Shape

`roomId`
: Backend-generated unique room identifier.

Current format:

- three lowercase alphabetic segments
- each segment contains four characters
- segments are separated by hyphens

Example values:

- `qwer-tyui-opas`
- `lmno-pqrs-tuvw`

The frontend should treat `roomId` as an opaque string and should not depend on this exact format for correctness.

## Failure Response

Status:

```http
500 Internal Server Error
```

Body:

```json
{
  "error": "Failed to create room"
}
```

## Expected Frontend Flow

### Create Room Flow

1. User clicks `Create room`.
2. Frontend sends `POST /rooms`.
3. Frontend reads `roomId` from the `201` response.
4. Frontend stores that value in local state.
5. Frontend continues with the existing WebSocket join flow using the returned `roomId`.

## Join Flow After Room Creation

After receiving a room ID from `POST /rooms`, the frontend should join exactly as it does today over WebSocket:

```json
{
  "type": "join",
  "roomId": "abcd-efgh-ijkl",
  "peerId": "peer-123",
  "name": "Sayan"
}
```

The backend will then continue the normal mediasoup setup sequence:

- `routerRtpCapabilities`
- transport creation

- transport connection
- media production and consumption

## Frontend Integration Notes

- Use `POST /rooms` only when the frontend wants the backend to generate the room ID.
- If the frontend still supports manual room entry, manually entered IDs can continue using the existing `join` message directly.
- The frontend should show a user-facing error if room creation returns a non-`201` response.
- The frontend should not generate its own fallback room ID when this API fails unless that behavior is intentionally supported by product requirements.

## Example Fetch

```js
async function createRoom() {
  const response = await fetch("http://localhost:5000/rooms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error("Failed to create room");
  }

  const data = await response.json();
  return data.roomId;
}
```

## Health Check

The backend also exposes:

### `GET /health`

Success response:

```json
{
  "ok": true
}
```

This endpoint is optional for frontend use, but it can be helpful for environment checks or local development diagnostics.
