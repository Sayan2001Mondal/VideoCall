"use client";

import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  SwitchCamera,
  ScreenShare,
  ScreenShareOff,
  MessageSquare,
  Users,
  PhoneOff,
} from "lucide-react";
import { IconButton } from "./ui/icon-button";
import { Button } from "./ui/button";
import { Tooltip } from "./ui/tooltip";

/**
 * ControlBar — bottom floating bar with all call controls.
 */
export default function ControlBar({
  micOn,
  camOn,
  screenShareOn,
  toggleMic,
  toggleCam,
  onToggleScreenShare,
  onToggleChat,
  onToggleParticipants,
  onLeave,
  chatOpen,
  participantsOpen,
  unreadCount = 0,
  switchCamera,
}) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex items-center justify-center
                  py-6 px-4 z-30"
    >
      <div
        className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 px-6 sm:px-8 py-4 rounded-3xl
                    bg-surface-200/60 backdrop-blur-2xl border border-white/10
                    shadow-2xl shadow-black/50 max-w-full"
      >
        {/* Mic */}
        <Tooltip content={micOn ? "Mute mic (Alt+M)" : "Unmute mic (Alt+M)"}>
          <IconButton
            onClick={toggleMic}
            danger={!micOn}
            aria-label={micOn ? "Mute mic" : "Unmute mic"}
          >
            {micOn ? <Mic size={18} /> : <MicOff size={18} />}
          </IconButton>
        </Tooltip>

        {/* Camera */}
        <Tooltip content={camOn ? "Turn off camera (Alt+V)" : "Turn on camera (Alt+V)"}>
          <IconButton
            onClick={toggleCam}
            danger={!camOn}
            aria-label={camOn ? "Turn off camera" : "Turn on camera"}
          >
            {camOn ? <Video size={18} /> : <VideoOff size={18} />}
          </IconButton>
        </Tooltip>

        {/* Switch Camera (only visible on mobile / touch devices) */}
        <div className="lg:hidden"> 
          <Tooltip content="Switch camera">
          <IconButton
            onClick={switchCamera}
            aria-label="Switch camera"
          >
            <SwitchCamera size={18} />
          </IconButton>
        </Tooltip>
        </div>
        

        {/* Screen Share */}
        <div className="hidden lg:block">
          <Tooltip content={screenShareOn ? "Stop sharing" : "Share screen"}>
          <IconButton
          
            onClick={onToggleScreenShare}
            highlight={screenShareOn}
            aria-label={screenShareOn ? "Stop sharing" : "Share screen"}
          >
            {screenShareOn ? <ScreenShareOff size={18} /> : <ScreenShare size={18} />}
          </IconButton>
        </Tooltip>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-border mx-1 hidden sm:block" />

        {/* Chat */}
        <Tooltip content="Chat">
          <IconButton
            onClick={onToggleChat}
            highlight={chatOpen}
            badge={unreadCount}
            aria-label="Toggle chat"
          >
            <MessageSquare size={18} />
          </IconButton>
        </Tooltip>

        {/* Participants */}
        <Tooltip content="Participants">
          <IconButton
            onClick={onToggleParticipants}
            highlight={participantsOpen}
            aria-label="Toggle participants"
          >
            <Users size={18} />
          </IconButton>
        </Tooltip>

        {/* Divider */}
        <div className="w-px h-8 bg-border mx-1 hidden sm:block" />

        {/* Leave call */}
        <Tooltip content="Leave call">
          <Button
            variant="destructive"
            size="icon"
            onClick={onLeave}
            className="w-14 h-11 rounded-full"
            aria-label="Leave call"
          >
            <PhoneOff size={20} />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
