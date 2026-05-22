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
  onClick,
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current || !stream) return;
    const video = videoRef.current;
    video.srcObject = stream;
    video.muted = isLocal || isMuted;

    const playVideo = async () => {
      try {
        await video.play();
      } catch {
        video.muted = true;
        try { await video.play(); } catch {}
      }
    };
    video.onloadedmetadata = playVideo;
    playVideo();
  }, [stream, isCameraOff, isLocal, isMuted]);

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-2xl overflow-hidden bg-surface-300 border border-white/10 cursor-pointer",
        isSpeaking && "ring-4 ring-primary-500 animate-[speaking-glow_1.5s_ease-in-out_infinite]",
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
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface-200 to-surface-100">
          <Avatar name={name} size="lg" />
        </div>
      )}

      {/* Name label */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-xs text-white border border-white/10">
        {isMuted && <MicOff size={12} className="text-red-400" />}
        <span className="truncate max-w-[120px] font-medium">
          {isLocal ? "You" : name || "Participant"}
        </span>
      </div>
    </div>
  );
}
