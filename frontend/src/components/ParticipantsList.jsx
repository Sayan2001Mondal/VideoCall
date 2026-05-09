"use client";

/**
 * ParticipantsList — side panel showing all connected participants.
 *
 * Props:
 *  - participants  array of { peerId, name, isMuted, isCameraOff }
 *  - localName     string — the current user's name
 *  - onClose       function — close the panel
 */
export default function ParticipantsList({ participants, localName, onClose }) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100/30">
        <h3 className="text-base font-semibold text-white">
          Participants ({participants.length + 1})
        </h3>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full hover:bg-surface-100 flex items-center justify-center
                     text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <CloseIcon />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {/* You (always first) */}
        <ParticipantRow name={localName} isYou={true} />

        {/* Other participants */}
        {participants.map((p) => (
          <ParticipantRow
            key={p.peerId}
            name={p.name || "Participant"}
            isMuted={p.isMuted}
            isCameraOff={p.isCameraOff}
          />
        ))}
      </div>
    </div>
  );
}

function ParticipantRow({ name, isYou = false, isMuted = false, isCameraOff = false }) {
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  const hue = name
    ? name.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 360
    : 260;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-400/50 transition-colors">
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
        style={{ backgroundColor: `hsl(${hue}, 60%, 45%)` }}
      >
        {initial}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">
          {name}
          {isYou && <span className="text-primary-400 ml-1">(You)</span>}
        </p>
      </div>

      {/* Status icons */}
      <div className="flex items-center gap-1.5">
        {isMuted && (
          <span className="text-danger" title="Muted">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" />
            </svg>
          </span>
        )}
        {isCameraOff && (
          <span className="text-danger" title="Camera off">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
