# `useMediaSoup` Documentation

This document explains what each part of [`frontend/src/hooks/useMediaSoup.js`](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/frontend/src/hooks/useMediaSoup.js:1) is responsible for.

## What This Hook Does

`useMediaSoup(ws, roomId, peerId, name, existingStreamRef)` is the main call-management hook for the frontend.

It handles:

- joining a room through the signaling socket
- loading the mediasoup client device
- creating send and receive transports
- producing local audio/video
- consuming remote audio/video
- setting up mediasoup data channels for chat
- screen sharing
- basic in-call controls like mic/camera toggles

`ws` is the signaling channel. The actual media does not travel through the WebSocket. The WebSocket is only used to coordinate setup with the backend.

## Hook Inputs

- `ws`: the connected WebSocket ref from `useSocket`
- `roomId`: the room the user is joining
- `peerId`: the unique id for this participant
- `name`: the display name for this participant
- `existingStreamRef`: optional local preview stream created before joining

## Main Refs And State

Important refs:

- `deviceRef`: stores the mediasoup client `Device`
- `sendTransportRef`: stores the transport used to send local media/data
- `recvTransportRef`: stores the transport used to receive remote media/data
- `producersRef`: stores local media producers like audio, video, and screen
- `dataProducerRef`: stores the local chat data producer
- `consumersRef`: stores remote media consumers
- `dataConsumersRef`: stores remote data consumers
- `localStreamRef`: stores the active local media stream
- `localVideoRef`: points to the local video element

Important state:

- `remoteStreams`: remote `MediaStream`s grouped by peer
- `localStream`: local stream for rendering/state
- `peersData`: peer metadata, mainly names
- `chatMessages`: in-call chat messages received through data channels
- `micOn`, `camOn`, `screenShareOn`: call control state
- `screenStream`: active screen share stream

## Function-By-Function

### `send(data)`

Purpose:

- sends a JSON message to the backend through `ws.current`

What it handles:

- all signaling messages needed for mediasoup setup
- checks that the socket is open before sending

Examples of messages sent through it:

- `join`
- `createTransport`
- `connectTransport`
- `produce`
- `consume`
- `getProducers`
- `leave`

This is a signaling helper, not a media transport helper.

### `createTransport(direction)`

Purpose:

- asks the backend to create a mediasoup WebRTC transport

What it handles:

- sends `type: "createTransport"` with `direction` set to `"send"` or `"recv"`
- waits for the backend response `transportCreated`
- resolves with `transportOptions`

Why it exists:

- mediasoup requires separate client/server transport setup before media can be sent or received

### `loadDevice(rtpCapabilities)`

Purpose:

- creates and loads the mediasoup client `Device`

What it handles:

- creates `new mediasoupClient.Device()`
- loads router RTP capabilities received from the backend
- stores the loaded device in `deviceRef`

Why it matters:

- the `Device` tells the client what codecs and media capabilities the mediasoup router supports

### `setupSendTransport(device, transportOptions)`

Purpose:

- creates and configures the transport used to send local media and data

What it handles:

- creates a send transport from the loaded mediasoup device
- listens for the transport `connect` event and signals `connectTransport` to the backend
- listens for the transport `produce` event and signals `produce` to the backend
- listens for the transport `producedata` event and signals `produceData` to the backend
- stores the transport in `sendTransportRef`

Why it matters:

- audio, video, screen share, and mediasoup data-channel chat all depend on this transport

### `setupRecvTransport(device, transportOptions)`

Purpose:

- creates and configures the transport used to receive remote media and data

What it handles:

- creates a receive transport from the loaded mediasoup device
- listens for the transport `connect` event and signals `connectTransport` to the backend
- stores the transport in `recvTransportRef`

Why it matters:

- without this transport, remote producers cannot be consumed

### `consumeProducer(producerId, sourcePeerId, isScreenShare = false)`

Purpose:

- receives a remote audio/video producer from another peer

What it handles:

- asks the backend to create a matching consumer with `type: "consume"`
- waits for the `consumed` response
- creates a mediasoup client consumer on the receive transport
- resumes the consumer
- adds the received track to `remoteStreams`

Special handling:

- if `isScreenShare` is true, the remote stream is stored under `${sourcePeerId}-screen`
- otherwise it is stored under `sourcePeerId`

Why it matters:

- this is what turns another user’s producer into an actual playable remote track on the frontend

### `consumeDataProducer(dataProducerId, sourcePeerId, sourceName)`

Purpose:

- receives a remote mediasoup data producer, mainly for chat

What it handles:

- asks the backend to create a matching data consumer with `type: "consumeData"`
- waits for the `dataConsumed` response
- creates a client-side data consumer
- listens for incoming messages on that data consumer
- pushes parsed messages into `chatMessages`

Why it matters:

- this is your mediasoup data-channel chat path

## Main Initialization Effect

The main `useEffect` starts at [`useMediaSoup.js`](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/frontend/src/hooks/useMediaSoup.js:252).

It only runs when:

- `ws.current` exists
- `roomId` exists
- `peerId` exists

Inside this effect, there are three important internal functions.

### `init()`

Purpose:

- performs the full mediasoup join and setup flow

What it handles step by step:

1. waits for `routerRtpCapabilities`
2. sends `join` to the backend
3. loads the mediasoup device
4. creates send and receive transports
5. sets up both transports
6. gets local media from `existingStreamRef` or `getUserMedia`
7. saves the local stream and attaches it to the local video element
8. produces audio if an audio track exists
9. produces video if a video track exists
10. creates a mediasoup data producer for chat

This is the core startup sequence of the hook.

### `messageHandler(e)`

Purpose:

- reacts to signaling messages sent later by the backend after setup

What it handles:

- `newProducer`: consume a newly announced remote media producer
- `existingProducers`: consume producers already in the room
- `newDataProducer`: consume a newly announced remote data producer
- `existingDataProducers`: consume data producers already in the room
- `peerLeft`: remove a peer’s streams and metadata
- `peerJoined`: add peer metadata
- `screenShareStopped`: remove a peer’s screen-share stream

Why it matters:

- `init()` handles first-time setup
- `messageHandler()` handles room updates after setup

### `initAndListen()`

Purpose:

- runs startup, then starts ongoing room event listening

What it handles:

- waits for `init()` to finish
- attaches `messageHandler`
- sends `getProducers` so the new peer can discover already active producers in the room

## Cleanup In The Effect Return

When the hook unmounts or the user leaves, cleanup does this:

- marks setup as cleaned up
- removes the message handler
- closes send and receive transports
- closes the local data producer
- closes all data consumers
- stops local media tracks if they were not passed in from preview
- sends `leave` to the backend

This is what releases resources and removes the peer from the room.

## In-Call Control Functions

### `toggleMic()`

Purpose:

- pauses or resumes the local audio producer

What it handles:

- pauses/resumes the mediasoup audio producer
- updates the browser audio track `enabled` flag
- updates `micOn`

### `toggleCam()`

Purpose:

- pauses or resumes the local video producer

What it handles:

- pauses/resumes the mediasoup video producer
- updates the browser video track `enabled` flag
- updates `camOn`

### `switchCamera()`

Purpose:

- replaces the current local video track with one from another camera

What it handles:

- gets a new camera stream using the opposite `facingMode`
- replaces the currently produced video track
- stops the old track
- updates the local stream reference and local video element

This is mainly useful on devices with front and back cameras.

## Screen Share Functions

### `stopScreenShare()`

Purpose:

- stops the current screen-share producer

What it handles:

- closes the screen-share producer
- removes it from `producersRef`
- resets screen-share state
- tells the backend to broadcast `screenShareStopped`

### `startScreenShare()`

Purpose:

- starts producing a display capture stream

What it handles:

- gets a display stream with `getDisplayMedia`
- produces the screen video track through the send transport
- marks the producer with `appData: { isScreenShare: true }`
- stores the producer and stream in state
- auto-stops if the browser screen-share track ends

### `toggleScreenShare()`

Purpose:

- switches screen sharing on or off

What it handles:

- calls `stopScreenShare()` if already sharing
- otherwise calls `startScreenShare()`

## Chat Function

### `sendChatMessage(text)`

Purpose:

- sends a chat message over the mediasoup data channel

What it handles:

- checks that `dataProducerRef.current` exists
- creates a payload with `sender`, `message`, and `timestamp`
- sends the payload through the data producer
- immediately appends the message to local `chatMessages`

Important note:

- this is separate from the plain WebSocket chat in [`frontend/src/app/page.js`](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/frontend/src/app/page.js:34)
- right now the project appears to have both WebSocket chat and data-channel chat paths

## What This Hook Returns

The hook returns state and handlers used by the UI:

- `localVideoRef`
- `localStreamRef`
- `localStream`
- `remoteStreams`
- `peersData`
- `micOn`
- `camOn`
- `screenShareOn`
- `screenStream`
- `toggleMic`
- `toggleCam`
- `switchCamera`
- `toggleScreenShare`
- `chatMessages`
- `sendChatMessage`

## Overall Responsibility Split

Simple mental model:

- WebSocket: signaling and coordination with the backend
- mediasoup transports: actual audio/video/data movement
- `useMediaSoup`: the frontend orchestrator that connects those two pieces
