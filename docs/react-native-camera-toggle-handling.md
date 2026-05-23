# React Native Camera Toggle Handling

## Overview

This document explains how a React Native client should detect when another participant turns their camera off and how that state should be reflected in the UI.

The current backend and web app already support this through the existing WebSocket signaling contract. React Native should follow the same flow.

## What Happens When A User Turns Off Camera

When a participant taps the camera toggle:

1. Their client pauses the local video producer.
2. Their client sends a WebSocket message:

```json
{
  "type": "mediaToggled",
  "roomId": "abcd-efgh-ijkl",
  "peerId": "peer-123",
  "kind": "video",
  "enabled": false
}
```

3. The backend broadcasts that message to the other participants.
4. Each receiving client updates the remote participant state for that `peerId`.
5. The UI stops treating that participant as camera-on and shows a fallback tile instead of live video.

This is already handled by the backend in [`backend/socket/socketHandler.js`](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/backend/socket/socketHandler.js:587).

## Message Contract

For camera state, React Native should listen for:

```json
{
  "type": "mediaToggled",
  "peerId": "peer-123",
  "kind": "video",
  "enabled": false
}
```

Meaning:

- `type`: event name
- `peerId`: which participant changed state
- `kind`: `"video"` for camera, `"audio"` for mic
- `enabled`: `false` means off, `true` means on

## Recommended React Native State

Keep remote participant metadata separate from remote streams.

Example:

```js
const [peers, setPeers] = useState({
  "peer-123": {
    name: "Alex",
    camOn: true,
    micOn: true,
  },
});

const [remoteStreams, setRemoteStreams] = useState({
  "peer-123": remoteMediaStream,
});
```

Why this matters:

- the remote stream may still exist as an object
- camera visibility should be driven by signaling state
- UI decisions should use `camOn`, not only `stream != null`

## React Native WebSocket Handling

When a socket message arrives, handle `mediaToggled` like this:

```js
function handleSocketMessage(event) {
  const msg = JSON.parse(event.data);

  if (msg.type === "mediaToggled") {
    setPeers((prev) => ({
      ...prev,
      [msg.peerId]: {
        ...prev[msg.peerId],
        [msg.kind === "video" ? "camOn" : "micOn"]: msg.enabled,
      },
    }));
  }
}
```

This mirrors the current web implementation in [`frontend/src/hooks/useMediaSoup.js`](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/frontend/src/hooks/useMediaSoup.js:508).

## Rendering Logic In React Native

For each remote participant tile:

- if `camOn === true`, render the live `RTCView`
- if `camOn === false`, hide the live video and show an avatar or placeholder

Example:

```js
import { View, Text } from "react-native";
import { RTCView } from "react-native-webrtc";

function ParticipantTile({ peer, stream }) {
  const streamURL = stream?.toURL?.();

  if (!peer?.camOn || !streamURL) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#20242c",
          borderRadius: 16,
        }}
      >
        <Text style={{ color: "white", fontSize: 18 }}>
          {peer?.name || "Participant"}
        </Text>
        <Text style={{ color: "#94a3b8", marginTop: 6 }}>
          Camera off
        </Text>
      </View>
    );
  }

  return (
    <RTCView
      streamURL={streamURL}
      objectFit="cover"
      style={{ flex: 1, borderRadius: 16 }}
    />
  );
}
```

## Local Camera Toggle In React Native

When the local user turns their own camera off, React Native should do both:

1. pause or disable the outgoing video track / producer
2. send `mediaToggled` with `kind: "video"` and the new `enabled` value

Example:

```js
function sendMessage(socket, data) {
  socket.send(JSON.stringify(data));
}

async function toggleCamera({
  camOn,
  roomId,
  peerId,
  socket,
  videoProducer,
  localStream,
  setCamOn,
}) {
  if (!videoProducer) return;

  if (camOn) {
    videoProducer.pause();
  } else {
    videoProducer.resume();
  }

  localStream?.getVideoTracks?.().forEach((track) => {
    track.enabled = !camOn;
  });

  setCamOn((prev) => {
    const next = !prev;

    sendMessage(socket, {
      type: "mediaToggled",
      roomId,
      peerId,
      kind: "video",
      enabled: next,
    });

    return next;
  });
}
```

This mirrors the current browser behavior in [`frontend/src/hooks/useMediaSoup.js`](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/frontend/src/hooks/useMediaSoup.js:587).

## What The Other User Sees

If there are only two users, `me` and `you`, and `you` turn your camera off:

- your React Native client sends `mediaToggled` with `enabled: false`
- my client receives that message
- my app updates your participant state to `camOn: false`
- your tile on my screen switches from live video to a placeholder or avatar

So the other user knows because the UI is driven by the shared camera state event, not by guessing from the raw stream alone.

## Important Edge Cases

- If a peer joins before their true camera state is known, defaulting to `camOn: true` can briefly show the wrong UI until the first toggle event arrives.
- If the camera stops unexpectedly because of OS permissions, app backgrounding, or hardware failure, React Native should also listen for track end or transport failure and update `camOn` locally.
- If reconnection happens, the app should restore peer media state from the server flow or resynchronize after reconnect.

## Recommendation

For React Native, keep this rule:

- media transport controls whether video is actually sent
- signaling state tells every other client how to represent that participant in the UI

That separation makes camera-off handling predictable across web and mobile clients.
