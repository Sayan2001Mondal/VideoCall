"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import useMediaSoup from "../hooks/useMediaSoup";
import VideoTile from "./VideoTile";
import ControlBar from "./ControlBar";
import ChatBox from "./ChatBox";
import MessageInput from "./MessageInput";
import ParticipantsList from "./ParticipantsList";

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
    micOn,
    camOn,
    screenShareOn,
    screenStream,
    toggleMic,
    toggleCam,
    switchCamera,
    toggleScreenShare,
  } = useMediaSoup(ws, roomId, peerId, name, existingStreamRef);

  const [chatOpen, setChatOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [copied, setCopied] = useState(false);
  const prevMsgCount = useRef(messages.length);

  // Track unread messages when chat is closed
  useEffect(() => {
    if (!chatOpen && messages.length > prevMsgCount.current) {
      setUnreadCount((c) => c + (messages.length - prevMsgCount.current));
    }
    prevMsgCount.current = messages.length;
  }, [messages.length, chatOpen]);

  // Meeting timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.altKey && e.key === "m") { e.preventDefault(); toggleMic(); }
      if (e.altKey && e.key === "v") { e.preventDefault(); toggleCam(); }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleMic, toggleCam]);

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
    } catch {
      // Fallback
    }
  }, [roomId]);

  // ✅ Clear unread inline when opening — no effect needed
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

  // ── Build participant tiles ────────────────────────────────────
  const screenShares = {};
  const cameraStreams = {};

  Object.entries(remoteStreams).forEach(([key, stream]) => {
    if (key.endsWith("-screen")) {
      screenShares[key] = stream;
    } else {
      cameraStreams[key] = stream;
    }
  });

  const remoteCount = Object.keys(cameraStreams).length;
  const totalParticipants = remoteCount + 1;
  const hasScreenShare = Object.keys(screenShares).length > 0 || screenShareOn;

  function getGridClass() {
    if (hasScreenShare) return "grid-cols-1";
    if (totalParticipants <= 1) return "grid-cols-1";
    if (totalParticipants <= 2) return "grid-cols-1 md:grid-cols-2";
    if (totalParticipants <= 4) return "grid-cols-2";
    if (totalParticipants <= 6) return "grid-cols-2 md:grid-cols-3";
    return "grid-cols-3 md:grid-cols-4";
  }

  function getRowsClass() {
    if (hasScreenShare) return "grid-rows-1";
    if (totalParticipants === 1) return "grid-rows-1";
    if (totalParticipants === 2) return "grid-rows-2 md:grid-rows-1";
    if (totalParticipants <= 4) return "grid-rows-2";
    if (totalParticipants <= 6) return "grid-rows-3 md:grid-rows-2";
    return "auto-rows-fr";
  }

  const participantsList = Object.entries(peersData).map(([pid, data]) => ({
    peerId: pid,
    name: data.name,
  }));

  const sidePanelOpen = chatOpen || participantsOpen;

  return (
    <div className="fixed inset-0 bg-surface-500 flex flex-col z-40">
      {/* ── TOP BAR ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-400/80 backdrop-blur-sm border-b border-surface-100/20 z-20">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">
            <span className="text-primary-400">Meet</span>
            <span className="text-white">Up</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyRoomId}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-300 hover:bg-surface-200
                       text-sm text-gray-300 hover:text-white transition-colors cursor-pointer"
            title="Copy room ID"
          >
            <span className="font-mono text-xs">{roomId}</span>
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="font-mono">{formatTime(elapsedTime)}</span>
        </div>
      </div>

      {/* ── MAIN CONTENT ───────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video Area */}
        <div className={`flex-1 flex transition-all duration-300 ${sidePanelOpen ? "mr-0" : ""}`}>
          {hasScreenShare ? (
            <div className="flex-1 flex flex-col md:flex-row gap-2 p-2 h-full overflow-hidden">
              <div className="flex-1 min-h-0 bg-surface-600 rounded-2xl overflow-hidden relative">
                {screenShareOn && screenStream ? (
                  <VideoTile
                    stream={screenStream}
                    name="Your screen"
                    isLocal={true}
                    isScreenShare={true}
                    className="absolute inset-0"
                  />
                ) : (
                  Object.entries(screenShares).map(([key, stream]) => {
                    const srcPeerId = key.replace("-screen", "");
                    return (
                      <VideoTile
                        key={key}
                        stream={stream}
                        name={`${peersData[srcPeerId]?.name || "Participant"}'s screen`}
                        isScreenShare={true}
                        className="absolute inset-0"
                      />
                    );
                  })
                )}
              </div>

              <div className="flex flex-row md:flex-col gap-2 md:w-48 h-32 md:h-full overflow-x-auto md:overflow-y-auto shrink-0 pb-2 md:pb-0 pr-2 md:pr-0">
                <VideoTile
                  stream={null}
                  name={name}
                  isLocal={true}
                  isMuted={!micOn}
                  isCameraOff={!camOn}
                  className="h-full aspect-video md:h-auto md:w-full shrink-0"
                  ref={localVideoRef}
                />
                {Object.entries(cameraStreams).map(([pid, stream]) => (
                  <VideoTile
                    key={pid}
                    stream={stream}
                    name={peersData[pid]?.name}
                    className="h-full aspect-video md:h-auto md:w-full shrink-0"
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className={`flex-1 grid ${getGridClass()} ${getRowsClass()} gap-2 p-2 h-full`}>
              <div className="relative rounded-2xl overflow-hidden bg-surface-400">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${camOn ? "scale-x-[-1]" : "hidden"}`}
                />
                {!camOn && (
                  <div className="absolute inset-0 flex items-center justify-center bg-surface-400">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold text-white bg-primary-600">
                      {name ? name.charAt(0).toUpperCase() : "?"}
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs text-white">
                  {!micOn && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="1" y1="1" x2="23" y2="23" />
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" />
                    </svg>
                  )}
                  <span>You</span>
                </div>
              </div>

              {Object.entries(cameraStreams).map(([pid, stream]) => (
                <VideoTile
                  key={pid}
                  stream={stream}
                  name={peersData[pid]?.name}
                  className="w-full h-full aspect-video"
                />
              ))}
            </div>
          )}
        </div>

        {/* ── SIDE PANELS ────────────────────────────────────── */}
        {chatOpen && (
          <div className="absolute right-0 top-0 bottom-0 z-50 w-full sm:w-80 md:relative md:w-80 flex flex-col h-full shrink-0 bg-surface-300/95 backdrop-blur-xl border-l border-surface-100/30 animate-[slideInRight_0.25s_ease-out] shadow-2xl md:shadow-none">
            <ChatBox
              messages={messages}
              currentUser={name}
              onClose={() => setChatOpen(false)}
            />
            <MessageInput onSend={onSendMessage} />
          </div>
        )}

        {participantsOpen && (
          <div className="absolute right-0 top-0 bottom-0 z-50 w-full sm:w-80 md:relative md:w-80 flex flex-col h-full shrink-0 bg-surface-300/95 backdrop-blur-xl border-l border-surface-100/30 animate-[slideInRight_0.25s_ease-out] shadow-2xl md:shadow-none">
            <ParticipantsList
              participants={participantsList}
              localName={name}
              onClose={() => setParticipantsOpen(false)}
            />
          </div>
        )}
      </div>

      {/* ── CONTROL BAR ──────────────────────────────────────── */}
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