"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import useSocket from "../hooks/useSocket";
import useDevicePreview from "../hooks/useDevicePreview";
import JoinRoom from "../components/JoinRoom";
import VideoCall from "../components/VideoCall";

function PageClient() {
  // ── State ──────────────────────────────────────────────────────
  const [name, setName] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("meetup_name") || "";
    return "";
  });
  const [roomId, setRoomId] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("meetup_roomId") || "";
    return "";
  });
  const [joined, setJoined] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("meetup_joined") === "true";
    return false;
  });
  const [peerId] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("meetup_peerId");
      if (stored) return stored;
      const newId = uuidv4();
      sessionStorage.setItem("meetup_peerId", newId);
      return newId;
    }
    return uuidv4();
  });
  const [messages, setMessages] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("meetup_messages");
      if (stored) return JSON.parse(stored);
    }
    return [];
  });
  const [wsConnected, setWsConnected] = useState(false);

  // Persist messages whenever they update
  useEffect(() => {
    if (messages.length > 0 && typeof window !== "undefined") {
      sessionStorage.setItem("meetup_messages", JSON.stringify(messages));
    }
  }, [messages]);

  // ── WebSocket ──────────────────────────────────────────────────
  const ws = useSocket((data) => {
    if (data.type === "chat" || data.type === "system") {
      setMessages((prev) => {
        // Deduplicate: if the last message is exactly the same and from the same sender, ignore it
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.sender === data.sender && lastMsg.message === data.message) {
          return prev;
        }
        return [...prev, { ...data, timestamp: Date.now() }];
      });
    }
  }, setWsConnected);

  const sendMessage = (msg) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;
    ws.current.send(JSON.stringify({ type: "chat", roomId, peerId, message: msg, sender: name }));
  };

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
  } = useDevicePreview(!joined);

  // ── Join handler ───────────────────────────────────────────────
  const handleJoin = () => {
    if (!name.trim() || !roomId.trim()) return;
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;
    
    if (typeof window !== "undefined") {
      sessionStorage.setItem("meetup_name", name);
      sessionStorage.setItem("meetup_roomId", roomId);
      sessionStorage.setItem("meetup_joined", "true");
    }
    
    cleanupPreview();
    setJoined(true);
  };

    // Clean up audio monitoring but keep the stream
    

  // ── Leave handler ──────────────────────────────────────────────
  const handleLeave = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("meetup_joined");
      sessionStorage.removeItem("meetup_messages");
    }
    setJoined(false);
    window.location.reload();
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
      wsConnected={wsConnected}
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
