"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import useSocket from "../hooks/useSocket";
import useDevicePreview from "../hooks/useDevicePreview";
import JoinRoom from "../components/JoinRoom";
import VideoCall from "../components/VideoCall";

function PageClient() {
  // ── State ──────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [peerId] = useState(() => uuidv4());
  const [wsConnected, setWsConnected] = useState(false);

  // ── WebSocket ──────────────────────────────────────────────────
  const ws = useSocket((data) => {
    if (data.type === "chat" || data.type === "system") {
      setMessages((prev) => [...prev, { ...data, timestamp: Date.now() }]);
    }
  }, setWsConnected);

  // ── Device preview (used on the join screen) ───────────────────
  const {
    videoRef: previewVideoRef,
    streamRef: previewStreamRef,
    micOn: previewMicOn,
    camOn: previewCamOn,
    audioLevel,
    hasPermission,
    statusMessage,
    toggleMic: previewToggleMic,
    toggleCam: previewToggleCam,
    cleanup: cleanupPreview,
    stopAllTracks,
  } = useDevicePreview();

  // ── Join handler ───────────────────────────────────────────────
  const handleJoin = () => {
  if (!name.trim() || !roomId.trim()) return;
  if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;
  cleanupPreview();
  setJoined(true);
};

    // Clean up audio monitoring but keep the stream
    

  // ── Leave handler ──────────────────────────────────────────────
  const handleLeave = () => {
  setJoined(false);
  window.location.reload();
};

  // ── Send chat message ──────────────────────────────────────────
 const sendMessage = (msg) => {
  if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;
  ws.current.send(JSON.stringify({ type: "chat", roomId, peerId, message: msg, sender: name }));
  setMessages((prev) => [...prev, { type: "chat", sender: name, message: msg, timestamp: Date.now() }]);
};

  // ── RENDER ─────────────────────────────────────────────────────

  // Before joining: show the preview / join screen
  if (!joined) {
    return (
      <JoinRoom
        name={name}
        setName={setName}
        roomId={roomId}
        setRoomId={setRoomId}
        onJoin={handleJoin}
        previewVideoRef={previewVideoRef}
        micOn={previewMicOn}
        camOn={previewCamOn}
        toggleMic={previewToggleMic}
        toggleCam={previewToggleCam}
        audioLevel={audioLevel}
        hasPermission={hasPermission}
        statusMessage={statusMessage}
        wsConnected={wsConnected}
      />
    );
  }

  // After joining: full-screen video call
  return (
    <VideoCall
      ws={ws}
      roomId={roomId}
      peerId={peerId}
      name={name}
      existingStreamRef={previewStreamRef}
      initialMicOn={previewMicOn}
      initialCamOn={previewCamOn}
      messages={messages}
      onSendMessage={sendMessage}
      onLeave={handleLeave}
    />
  );
}

export default dynamic(() => Promise.resolve(PageClient), { ssr: false });
