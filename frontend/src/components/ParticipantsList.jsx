"use client";

import { MicOff, VideoOff } from "lucide-react";
import { Avatar } from "./ui/avatar";

export default function ParticipantsList({ participants, localName, onClose }) {
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-1">
      <ParticipantRow name={localName} isYou={true} />
      {participants.map((p) => (
        <ParticipantRow
          key={p.peerId}
          name={p.name || "Participant"}
          isMuted={p.isMuted}
          isCameraOff={p.isCameraOff}
        />
      ))}
    </div>
  );
}

function ParticipantRow({ name, isYou = false, isMuted = false, isCameraOff = false }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-200 transition-colors">
      <Avatar name={name} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary truncate">
          {name}
          {isYou && <span className="text-primary-500 ml-1">(You)</span>}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {isMuted && (
          <span className="text-danger" title="Muted">
            <MicOff size={14} />
          </span>
        )}
        {isCameraOff && (
          <span className="text-danger" title="Camera off">
            <VideoOff size={14} />
          </span>
        )}
      </div>
    </div>
  );
}
