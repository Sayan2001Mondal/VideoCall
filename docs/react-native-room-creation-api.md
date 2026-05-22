# React Native Room Creation API

## Overview

This document explains how a React Native app should use the backend room-creation API before joining a call.

The mobile app can call the backend to generate a room ID, store that ID in local state, and then continue with the existing WebSocket join flow.

This API is backend-only and does not change the current socket contract used for joining a room.

## Base URL

Use the backend server base URL for your environment.

Examples:

- local Android emulator: `http://10.0.2.2:5000`
- local iOS simulator: `http://localhost:5000`
- deployed backend: your production API base URL

The examples below use:

```txt
http://10.0.2.2:5000
```

Update that value to match your environment.

## Create Room Endpoint

### `POST /rooms`

Creates a new room and returns a generated `roomId`.

### Request

No request body is required.

Example request:

```http
POST /rooms
Content-Type: application/json
```

The backend accepts:

- no body
- an empty JSON body: `{}`

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

## Room ID Notes

The backend currently returns room IDs in this format:

- lowercase letters only
- three groups
- four characters per group
- hyphen-separated

Example:

```txt
abcd-efgh-ijkl
```

The React Native app should treat `roomId` as an opaque string and should not rely on the exact pattern.

## Expected Mobile Flow

### Create Room

1. User taps `Create room`.
2. React Native app sends `POST /rooms`.
3. App reads `roomId` from the response.
4. App saves that `roomId` in component state, context, or store.
5. App navigates to the pre-join or in-call flow.
6. App uses the returned `roomId` in the existing WebSocket `join` message.

### Join Room Over WebSocket

After room creation, the app should keep using the current join contract:

```json
{
  "type": "join",
  "roomId": "abcd-efgh-ijkl",
  "peerId": "peer-123",
  "name": "Sayan"
}
```

After that, the existing mediasoup signaling flow continues unchanged.

## React Native Fetch Example

```js
const API_BASE_URL = "http://10.0.2.2:5000";

export async function createRoom() {
  const response = await fetch(`${API_BASE_URL}/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Failed to create room");
  }

  return data.roomId;
}
```

## React Native Usage Example

```js
import React, { useState } from "react";
import { Alert, Button, View } from "react-native";
import { createRoom } from "./api/createRoom";

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(false);

  async function handleCreateRoom() {
    try {
      setLoading(true);
      const roomId = await createRoom();

      navigation.navigate("PreJoin", { roomId });
    } catch (error) {
      Alert.alert("Room creation failed", error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      <Button
        title={loading ? "Creating..." : "Create Room"}
        onPress={handleCreateRoom}
        disabled={loading}
      />
    </View>
  );
}
```

## WebSocket Example

Once the app has both `roomId` and `peerId`, it can send:

```js
socket.send(
  JSON.stringify({
    type: "join",
    roomId,
    peerId,
    name,
  })
);
```

## Error Handling Recommendations

- Show a user-facing error when `POST /rooms` fails.
- Disable the create-room button while the request is in progress.
- Retry only when the user explicitly tries again, unless your app already has a standard retry policy.
- Do not silently generate a client-side room ID if backend generation is the intended source of truth.

## Health Check

The backend also exposes:

### `GET /health`

Success response:

```json
{
  "ok": true
}
```

This can be useful for local environment debugging, but it is not required for the normal create-room flow.
