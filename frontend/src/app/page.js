"use client";

import { useState } from "react";
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

  const ws = useSocket((data) => {
    if (data.type === "chat" || data.type === "system") {
      setMessages((prev) => [...prev, data]);
    }
  });

  const handleJoin = () => {
    if (!name || !roomId) return;

    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
    alert("Connecting... please try again in a moment.");
    return;
  }
    ws.current.send(
      JSON.stringify({
        type: "join",
        roomId,
        name,
      })
    );

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
      setMessages((prev) => [...prev, { type: "chat", message: msg, sender: name }]);

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
    <VideoCall ws={ws} roomId={roomId}/>
  </div>
);
}