"use client";

import { useRef, useEffect } from "react";
import { MicOff } from "lucide-react";
import { Avatar } from "./ui/avatar";
import { cn } from "@/lib/utils";

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
      try { await videoRef.current?.play(); } catch {}
    };
    videoRef.current.onloadedmetadata = playVideo;
    playVideo();
  }, [stream]);

  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden bg-surface-200 border border-border/50",
        isSpeaking && "ring-2 ring-primary-400 animate-[speaking-glow_1.5s_ease-in-out_infinite]",
        className
      )}
    >
      {stream && !isCameraOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={cn(
            "w-full h-full object-cover",
            isLocal && !isScreenShare && "scale-x-[-1]",
            isScreenShare && "object-contain bg-black"
          )}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-surface-200 to-surface-300">
          <Avatar name={name} size="lg" />
        </div>
      )}

      {/* Name label */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-xs text-white">
        {isMuted && <MicOff size={12} className="text-red-400" />}
        <span className="truncate max-w-[120px]">
          {isLocal ? "You" : name || "Participant"}
        </span>
      </div>
    </div>
  );
}
