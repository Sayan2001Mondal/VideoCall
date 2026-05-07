"use client";

import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import useSocket from "../hooks/useSocket";
import JoinRoom from "../components/JoinRoom";
import ChatBox from "../components/ChatBox";
import MessageInput from "../components/MessageInput";
import VideoCall from "@/components/VideoCall";

export default function Page() {
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState([]);

const [peerId] = useState(() => uuidv4());
  const ws = useSocket((data) => {
    if (data.type === "chat" || data.type === "system") {
      setMessages((prev) => [...prev, data]);
    }
  });

  const [inCall, setInCall] = useState(false);

  const handleJoin = () => {
    if (!name || !roomId) return;

    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      alert("Connecting... please try again in a moment.");
      return;
    }

    setJoined(true);
  };

  const sendMessage = (msg) => {
    ws.current.send(
      JSON.stringify({
        type: "chat",
        roomId,
        message: msg,
        sender: name,
      })
    );
    // Don't add locally — the server echoes the message back to the sender,
    // so the chat handler in useSocket will add it exactly once.
  };

  if (!joined) {
    return (
      <JoinRoom
        name={name}
        setName={setName}
        roomId={roomId}
        setRoomId={setRoomId}
        onJoin={handleJoin}
      />
    );
  }

  return (
  <div className="container">
    <h2>Room: {roomId}</h2>

    <ChatBox messages={messages} currentUser={name} />

    <MessageInput onSend={sendMessage} />
    
    {inCall ? (
      <VideoCall ws={ws} roomId={roomId} peerId={peerId} name={name} />
    ) : (
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <button onClick={() => setInCall(true)} style={{ width: '100%', padding: '14px', fontSize: '16px', background: '#3b82f6', color: 'white', borderRadius: '8px', cursor: 'pointer', border: 'none' }}>
          Join Video Call
        </button>
      </div>
    )}
  </div>
);
}