"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Copy, Check, Clock } from "lucide-react";
import useMediaSoup from "../hooks/useMediaSoup";
import useKeyboardShortcut from "../hooks/useKeyboardShortcut";
import VideoTile from "./VideoTile";
import ControlBar from "./ControlBar";
import ChatBox from "./ChatBox";
import MessageInput from "./MessageInput";
import ParticipantsList from "./ParticipantsList";
import { SidePanel } from "./ui/side-panel";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

export default function VideoCall({
  ws,
  roomId,
  peerId,
  name,
  existingStreamRef,
  initialMicOn = true,
  initialCamOn = true,
  messages = [],
  onSendMessage,
  onLeave,
}) {
  const {
    localVideoRef,
    remoteStreams,
    peersData,
    localStream,
    micOn,
    camOn,
    screenShareOn,
    screenStream,
    toggleMic,
    toggleCam,
    switchCamera,
    toggleScreenShare,
    chatMessages,
    sendChatMessage,
  } = useMediaSoup(ws, roomId, peerId, name, existingStreamRef);

  const activeMessages = messages.length > 0 ? messages : chatMessages;
  const handleSendMessage = onSendMessage || sendChatMessage;

  const [chatOpen, setChatOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [copied, setCopied] = useState(false);
  const [focusedPeerId, setFocusedPeerId] = useState(null);
  const prevMsgCount = useRef(activeMessages.length);

  // Track unread messages when chat is closed
  useEffect(() => {
    if (!chatOpen && activeMessages.length > prevMsgCount.current) {
      setUnreadCount((c) => c + (activeMessages.length - prevMsgCount.current));
    }
    prevMsgCount.current = activeMessages.length;
  }, [activeMessages.length, chatOpen]);

  // Meeting timer
  useEffect(() => {
    const interval = setInterval(() => setElapsedTime((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts via reusable hook
  useKeyboardShortcut([
    { key: "m", modifiers: ["alt"], handler: toggleMic },
    { key: "v", modifiers: ["alt"], handler: toggleCam },
  ]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const copyRoomId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [roomId]);

  const handleToggleChat = useCallback(() => {
    setChatOpen((v) => {
      if (!v) setUnreadCount(0);
      return !v;
    });
    if (!chatOpen) setParticipantsOpen(false);
  }, [chatOpen]);

  const handleToggleParticipants = useCallback(() => {
    setParticipantsOpen((v) => !v);
    if (!participantsOpen) setChatOpen(false);
  }, [participantsOpen]);

  const handleTileClick = (pid) => {
    setFocusedPeerId((prev) => (prev === pid ? null : pid));
  };

  // Build participant lists for layout
  const cameraStreams = {};
  const screenShares = {};
  Object.entries(remoteStreams).forEach(([key, stream]) => {
    if (key.endsWith("-screen")) screenShares[key] = stream;
    else cameraStreams[key] = stream;
  });

  const allParticipants = [
    { pid: "local", stream: localStream, name: name, isLocal: true },
    ...Object.entries(cameraStreams).map(([pid, stream]) => ({
      pid,
      stream,
      name: peersData[pid]?.name,
      isLocal: false,
    })),
  ];

  const allScreenShares = [
    ...Object.entries(screenShares).map(([key, stream]) => ({
      pid: key,
      stream,
      name: `${peersData[key.replace("-screen", "")]?.name || "Participant"}'s screen`,
      isScreenShare: true,
    })),
    ...(screenShareOn && screenStream ? [{
      pid: "local-screen",
      stream: screenStream,
      name: "Your screen",
      isLocal: true,
      isScreenShare: true,
    }] : []),
  ];

  const hasActiveScreenShare = allScreenShares.length > 0;
  const isFocusedMode = focusedPeerId !== null;
  const isScreenShareMode = !isFocusedMode && hasActiveScreenShare;

  function getGridClass() {
    const totalParticipants = allParticipants.length;
    if (hasActiveScreenShare) return "grid-cols-1";
    if (totalParticipants <= 1) return "grid-cols-1";
    if (totalParticipants <= 2) return "grid-cols-1 md:grid-cols-2";
    if (totalParticipants <= 4) return "grid-cols-2";
    if (totalParticipants <= 6) return "grid-cols-2 md:grid-cols-3";
    return "grid-cols-3 md:grid-cols-4";
  }

  function getRowsClass() {
    const totalParticipants = allParticipants.length;
    if (hasActiveScreenShare) return "grid-rows-1";
    if (totalParticipants === 1) return "grid-rows-1";
    if (totalParticipants === 2) return "grid-rows-2 md:grid-rows-1";
    if (totalParticipants <= 4) return "grid-rows-2";
    if (totalParticipants <= 6) return "grid-rows-3 md:grid-rows-2";
    return "auto-rows-fr";
  }


  const renderTile = (p) => (
    <VideoTile
      key={p.pid}
      stream={p.stream}
      name={p.name}
      isLocal={p.isLocal}
      isScreenShare={p.isScreenShare}
      onClick={() => handleTileClick(p.pid)}
      className={cn(
        "w-full h-full aspect-video",
        focusedPeerId === p.pid && "ring-4 ring-primary-500"
      )}
    />
  );

  const renderOthers = (mainPid) => {
    const others = [
      ...allParticipants.filter((p) => p.pid !== mainPid),
      ...allScreenShares.filter((s) => s.pid !== mainPid),
    ];
    return others.map((p) => renderTile(p));
  };

  const participantsList = Object.entries(peersData).map(([pid, data]) => ({
    peerId: pid,
    name: data.name,
  }));

  const sidePanelOpen = chatOpen || participantsOpen;

  return (
    <div className="fixed inset-0 bg-surface-100 flex flex-col z-40">
      {/* ── TOP BAR ──────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/80 backdrop-blur-sm border-b border-border z-20">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">
            <span className="text-primary-500">Meet</span>
            <span className="text-text-primary">Up</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyRoomId}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-200 hover:bg-surface-300
                       text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            title="Copy room ID"
          >
            <span className="font-mono text-xs">{roomId}</span>
            {copied ? (
              <Check size={14} className="text-success" />
            ) : (
              <Copy size={14} />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Clock size={14} />
          <span className="font-mono">{formatTime(elapsedTime)}</span>
        </div>
      </div>

      {/* ── MAIN CONTENT ───────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video Area */}
        <div className="flex-1 flex transition-all duration-300">
          {isFocusedMode ? (
            <div className="flex-1 flex flex-col md:flex-row gap-2 p-2 h-full overflow-hidden">
              {/* Main Focused Tile */}
              <div className="flex-1 bg-surface-200 rounded-2xl overflow-hidden relative border border-border/50">
                {(() => {
                  const main = [...allParticipants, ...allScreenShares].find(p => p.pid === focusedPeerId);
                  return main ? renderTile(main) : null;
                })()}
              </div>
              {/* Side Tiles */}
              <div className="flex flex-row md:flex-col gap-2 md:w-48 h-32 md:h-full overflow-x-auto md:overflow-y-auto shrink-0 pb-2 md:pb-0 pr-2 md:pr-0">
                {renderOthers(focusedPeerId)}
              </div>
            </div>
          ) : isScreenShareMode ? (
            <div className="flex-1 flex flex-col md:flex-row gap-2 p-2 h-full overflow-hidden">
              <div className="flex-1 bg-surface-200 rounded-2xl overflow-hidden relative border border-border/50">
                {renderTile(allScreenShares[0])}
              </div>
              <div className="flex flex-row md:flex-col gap-2 md:w-48 h-32 md:h-full overflow-x-auto md:overflow-y-auto shrink-0 pb-2 md:pb-0 pr-2 md:pr-0">
                {allParticipants.map(p => renderTile(p))}
                {allScreenShares.slice(1).map(s => renderTile(s))}
              </div>
            </div>
          ) : (
            <div className={`flex-1 grid ${getGridClass()} ${getRowsClass()} gap-2 p-2 h-full`}>
              {allParticipants.map(p => renderTile(p))}
              {allScreenShares.map(s => renderTile(s))}
            </div>
          )}
        </div>

        {/* ── SIDE PANELS ──────────────────────────────── */}
        {chatOpen && (
          <div className="absolute right-0 top-0 bottom-0 z-50 w-full sm:w-80 md:relative md:w-80 shrink-0">
            <SidePanel title="In-call messages" onClose={() => setChatOpen(false)}>
              <ChatBox messages={activeMessages} currentUser={name} />
              <MessageInput onSend={handleSendMessage} />
            </SidePanel>
          </div>
        )}

        {participantsOpen && (
          <div className="absolute right-0 top-0 bottom-0 z-50 w-full sm:w-80 md:relative md:w-80 shrink-0">
            <SidePanel title={`Participants (${participantsList.length + 1})`} onClose={() => setParticipantsOpen(false)}>
              <ParticipantsList participants={participantsList} localName={name} />
            </SidePanel>
          </div>
        )}
      </div>

      {/* ── CONTROL BAR ──────────────────────────────────── */}
      <ControlBar
        micOn={micOn}
        camOn={camOn}
        screenShareOn={screenShareOn}
        toggleMic={toggleMic}
        toggleCam={toggleCam}
        onToggleScreenShare={toggleScreenShare}
        onToggleChat={handleToggleChat}
        onToggleParticipants={handleToggleParticipants}
        onLeave={onLeave}
        chatOpen={chatOpen}
        participantsOpen={participantsOpen}
        unreadCount={unreadCount}
        switchCamera={switchCamera}
      />
    </div>
  );
}
