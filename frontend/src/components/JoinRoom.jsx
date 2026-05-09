"use client";

import { useState } from "react";

/**
 * JoinRoom — Google Meet-style lobby with camera preview
 *
 * Props:
 *  - name, setName, roomId, setRoomId   – form state from parent
 *  - onJoin()                           – called when user clicks "Join Now"
 *  - previewVideoRef                    – ref for the <video> element (from useDevicePreview)
 *  - micOn, camOn, toggleMic, toggleCam – device toggles
 *  - audioLevel                         – 0-1 mic level
 *  - hasPermission                      – null | true | false
 *  - wsConnected                        – whether WebSocket is connected
 */
export default function JoinRoom({
  name,
  setName,
  roomId,
  setRoomId,
  onJoin,
  previewVideoRef,
  micOn,
  camOn,
  toggleMic,
  toggleCam,
  audioLevel,
  hasPermission,
  wsConnected,
}) {
  const [isHovering, setIsHovering] = useState(false);

  // Generate a random short room ID
  function generateRoomId() {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    const segments = [];
    for (let s = 0; s < 3; s++) {
      let seg = "";
      for (let i = 0; i < 4; i++) {
        seg += chars[Math.floor(Math.random() * chars.length)];
      }
      segments.push(seg);
    }
    setRoomId(segments.join("-"));
  }

  const canJoin = name.trim() && roomId.trim() && wsConnected;

  // Audio level bars (0-4 bars based on level)
  const activeBars = Math.min(4, Math.floor(audioLevel * 5));

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-500">
      {/* Main card */}
      <div
        className="w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl
                    bg-surface-300/80 backdrop-blur-xl border border-primary-800/30
                    animate-[fadeIn_0.4s_ease-out]"
      >
        <div className="flex flex-col md:flex-row">
          {/* ── LEFT: Camera Preview ──────────────────────── */}
          <div className="md:w-1/2 p-6 flex flex-col items-center justify-center gap-4 bg-surface-400/50">
            {/* Video preview container */}
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-surface-600">
              {hasPermission === true && camOn ? (
                <video
                  ref={previewVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  {/* Avatar placeholder */}
                  <div
                    className="w-20 h-20 rounded-full bg-primary-600 flex items-center
                                justify-center text-3xl font-bold text-white uppercase"
                  >
                    {name ? name.charAt(0) : "?"}
                  </div>
                  <p className="text-sm text-gray-400">
                    {hasPermission === false && (typeof navigator !== "undefined" && (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia))
                      ? "Camera requires HTTPS"
                      : hasPermission === false
                        ? "Camera access denied"
                        : hasPermission === null
                        ? "Requesting access..."
                        : "Camera is off"}
                  </p>
                </div>
              )}
            </div>

            {/* Device control buttons */}
            <div className="flex items-center gap-3">
              {/* Mic button */}
              <button
                onClick={toggleMic}
                disabled={!hasPermission}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200
                  ${micOn ? "bg-surface-100 hover:bg-surface-200 text-white" : "bg-danger hover:bg-danger-hover text-white"}
                  disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
                title={micOn ? "Mute microphone" : "Unmute microphone"}
              >
                {micOn ? <MicIcon /> : <MicOffIcon />}
              </button>

              {/* Audio level indicator */}
              <div className="flex items-end gap-0.5 h-6">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-150
                      ${i < activeBars ? "bg-success" : "bg-surface-100"}`}
                    style={{ height: `${(i + 1) * 25}%` }}
                  />
                ))}
              </div>

              {/* Camera button */}
              <button
                onClick={toggleCam}
                disabled={!hasPermission}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200
                  ${camOn ? "bg-surface-100 hover:bg-surface-200 text-white" : "bg-danger hover:bg-danger-hover text-white"}
                  disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
                title={camOn ? "Turn off camera" : "Turn on camera"}
              >
                {camOn ? <CamIcon /> : <CamOffIcon />}
              </button>
            </div>
          </div>

          {/* ── RIGHT: Join Form ──────────────────────────── */}
          <div className="md:w-1/2 p-8 flex flex-col justify-center gap-6">
            {/* Logo / Title */}
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-bold">
                <span className="text-primary-400">Meet</span>
                <span className="text-white">Up</span>
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Video calls made simple
              </p>
            </div>

            {/* Name input */}
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 flex items-center text-gray-400 pointer-events-none">
                <UserIcon />
              </div>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-400 border border-surface-100
                           text-white placeholder-gray-500 outline-none
                           focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50
                           transition-all duration-200"
              />
            </div>

            {/* Room ID input + generate */}
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <div className="absolute left-3 top-0 bottom-0 flex items-center text-gray-400 pointer-events-none">
                  <HashIcon />
                </div>
                <input
                  type="text"
                  placeholder="Room ID"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-400 border border-surface-100
                             text-white placeholder-gray-500 outline-none
                             focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50
                             transition-all duration-200"
                />
              </div>
              <button
                onClick={generateRoomId}
                className="px-4 py-3 rounded-xl bg-surface-100 hover:bg-primary-700 text-white
                           text-sm font-medium transition-all duration-200 whitespace-nowrap cursor-pointer"
                title="Generate random room ID"
              >
                Generate
              </button>
            </div>

            {/* Join button */}
            <button
              onClick={onJoin}
              disabled={!canJoin}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              className={`w-full py-3.5 rounded-xl font-semibold text-white text-lg transition-all duration-300
                ${canJoin
                  ? "bg-gradient-to-r from-primary-600 to-primary-400 hover:from-primary-500 hover:to-primary-300 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 cursor-pointer"
                  : "bg-surface-100 text-gray-500 cursor-not-allowed"
                }`}
            >
              {canJoin ? "Join Now" : "Fill in details to join"}
            </button>

            {/* Connection status */}
            <div className="flex items-center gap-2 justify-center text-xs">
              <div
                className={`w-2 h-2 rounded-full ${wsConnected ? "bg-success" : "bg-warning animate-pulse"}`}
              />
              <span className="text-gray-400">
                {wsConnected ? "Connected" : "Connecting..."}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   ICONS (inline SVG — keeps the component self-contained)
   ──────────────────────────────────────────────────────────────── */
function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function CamIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function CamOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function HashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  );
}