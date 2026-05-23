# React Native Room Join Error Handling

## Overview

This document explains the WebSocket responses a React Native client should expect when a user tries to join with an invalid or unknown room ID.

This is especially important when a user manually enters values like `1,2`, `1234`, or any room ID that does not match the backend format.

## Room ID Rules

The backend accepts room IDs only in this format:

```txt
abcd-efgh-ijkl
```

Rules:

- lowercase letters only
- exactly 3 groups
- exactly 4 letters per group
- groups separated by `-`

Examples:

- valid: `abcd-efgh-ijkl`
- invalid: `1,2`
- invalid: `1234`
- invalid: `room-1`
- invalid: `ABCD-EFGH-IJKL`

## Join Request

React Native joins a room over WebSocket with:

```json
{
  "type": "join",
  "roomId": "abcd-efgh-ijkl",
  "peerId": "peer-123",
  "name": "Sayan"
}
```

## Join Failure Responses

### 1. Invalid Room ID Format

If the user enters something like `1,2`, the backend responds with:

```json
{
  "type": "joinRejected",
  "reason": "invalid-room-id",
  "message": "Invalid field \"roomId\": must match format \"abcd-efgh-ijkl\"",
  "field": "roomId",
  "expectedFormat": "abcd-efgh-ijkl"
}
```

Meaning:

- the room ID format itself is invalid
- React Native should not retry automatically
- the app should ask the user to correct the room ID input

### 2. Room Not Found

If the room ID format is valid but no room exists with that ID, the backend responds with:

```json
{
  "type": "joinRejected",
  "reason": "room-not-found",
  "message": "Room not found",
  "field": "roomId"
}
```

Meaning:

- the format is valid
- but the room does not exist on the backend
- React Native should show a friendly "room not found" message

## Recommended React Native Handling

When the app receives `joinRejected`, branch on `reason`.

Example:

```js
function handleSocketMessage(event) {
  const msg = JSON.parse(event.data);

  if (msg.type === "joinRejected") {
    if (msg.reason === "invalid-room-id") {
      showJoinError("Enter a valid room ID like abcd-efgh-ijkl");
      return;
    }

    if (msg.reason === "room-not-found") {
      showJoinError("Room not found. Check the room ID and try again.");
      return;
    }

    showJoinError(msg.message || "Unable to join room");
  }
}
```

## Recommended UX

- For `invalid-room-id`, show an inline input error immediately after the socket response.
- For `room-not-found`, show a user-friendly alert or inline message.
- Do not silently rewrite the user input.
- Do not keep retrying automatically for either of these cases.

## Suggested User Messages

For `invalid-room-id`:

```txt
Enter a valid room ID like abcd-efgh-ijkl
```

For `room-not-found`:

```txt
Room not found. Check the room ID and try again.
```

## Backend Source

This behavior is implemented in:

- [`backend/socket/socketHandler.js`](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/backend/socket/socketHandler.js:133)

## Notes

- This response applies to manual room entry over WebSocket `join`.
- `POST /rooms` is still the correct way to generate a valid room on the backend.
- React Native should treat the server response as the source of truth instead of trying to validate every edge case locally.
