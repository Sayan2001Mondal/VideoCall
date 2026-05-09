"use client";

import { useRef, useEffect } from "react";

/**
 * VideoTile — a single participant's video + overlay badges.
 *
 * Props:
 *  - stream       MediaStream | null
 *  - name         string
 *  - isLocal      boolean
 *  - isMuted      boolean     (mic is off)
 *  - isCameraOff  boolean
 *  - isSpeaking   boolean     (optional glow effect)
 *  - isScreenShare boolean    (renders differently for screen shares)
 *  - className    extra classes for the outer wrapper
 */
export default function VideoTile({
  stream,
  name = "",
  isLocal = false,
  isMuted = false,
  isCameraOff = false,
  isSpeaking = false,
  isScreenShare = false,
  className = "",
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current || !stream) return;
    videoRef.current.srcObject = stream;

    const playVideo = async () => {
      try {
        await videoRef.current?.play();
      } catch (err) {
        // Autoplay might be blocked; that's OK
      }
    };

    videoRef.current.onloadedmetadata = playVideo;
    playVideo();
  }, [stream]);

  const initial = name ? name.charAt(0).toUpperCase() : "?";

  // Generate a deterministic color from the name for the avatar
  const hue = name
    ? name.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 360
    : 260;

  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-surface-400
        ${isSpeaking ? "ring-2 ring-primary-400 animate-[speaking-glow_1.5s_ease-in-out_infinite]" : ""}
        ${className}`}
    >
      {/* Video element (always rendered for stream continuity) */}
      {stream && !isCameraOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${isLocal && !isScreenShare ? "scale-x-[-1]" : ""} ${isScreenShare ? "object-contain bg-black" : ""}`}
        />
      ) : (
        /* Camera off → avatar */
        <div className="absolute inset-0 flex items-center justify-center bg-surface-400">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center
                        text-2xl sm:text-3xl font-bold text-white"
            style={{ backgroundColor: `hsl(${hue}, 60%, 45%)` }}
          >
            {initial}
          </div>
        </div>
      )}

      {/* Name label — bottom left */}
      <div
        className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full
                    bg-black/60 backdrop-blur-sm text-xs text-white"
      >
        {isMuted && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" />
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
          </svg>
        )}
        <span className="truncate max-w-[120px]">
          {isLocal ? "You" : name || "Participant"}
        </span>
      </div>
    </div>
  );
}
