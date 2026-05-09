"use client";

/**
 * ControlBar — bottom floating bar with all call controls.
 *
 * Props:
 *  - micOn, camOn, screenShareOn          boolean states
 *  - toggleMic, toggleCam                 toggle functions
 *  - onToggleScreenShare                  starts/stops screen share
 *  - onToggleChat                         opens/closes chat panel
 *  - onToggleParticipants                 opens/closes participants panel
 *  - onLeave                              leave the call
 *  - chatOpen, participantsOpen           panel states
 *  - unreadCount                          number of unread chat messages
 *  - switchCamera                         switch front/back camera (mobile)
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
                  py-4 px-4 z-30"
    >
      <div
        className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 rounded-2xl
                    bg-surface-300/90 backdrop-blur-xl border border-surface-100/30
                    shadow-2xl shadow-black/40 max-w-full"
      >
        {/* Mic */}
        <ControlButton
          active={micOn}
          onClick={toggleMic}
          title={micOn ? "Mute mic (Alt+M)" : "Unmute mic (Alt+M)"}
          danger={!micOn}
        >
          {micOn ? <MicIcon /> : <MicOffIcon />}
        </ControlButton>

        {/* Camera */}
        <ControlButton
          active={camOn}
          onClick={toggleCam}
          title={camOn ? "Turn off camera (Alt+V)" : "Turn on camera (Alt+V)"}
          danger={!camOn}
        >
          {camOn ? <CamIcon /> : <CamOffIcon />}
        </ControlButton>

        {/* Switch Camera (only visible on mobile / touch devices) */}
        <ControlButton
          active={true}
          onClick={switchCamera}
          title="Switch camera"
          className="sm:hidden"
        >
          <SwitchCamIcon />
        </ControlButton>

        {/* Screen Share */}
        <ControlButton
          active={!screenShareOn}
          onClick={onToggleScreenShare}
          title={screenShareOn ? "Stop sharing" : "Share screen"}
          highlight={screenShareOn}
        >
          <ScreenShareIcon />
        </ControlButton>

        {/* Divider */}
        <div className="w-px h-8 bg-surface-100/50 mx-1 hidden sm:block" />

        {/* Chat */}
        <ControlButton
          active={!chatOpen}
          onClick={onToggleChat}
          title="Chat"
          highlight={chatOpen}
          badge={unreadCount}
        >
          <ChatIcon />
        </ControlButton>

        {/* Participants */}
        <ControlButton
          active={!participantsOpen}
          onClick={onToggleParticipants}
          title="Participants"
          highlight={participantsOpen}
        >
          <ParticipantsIcon />
        </ControlButton>

        {/* Divider */}
        <div className="w-px h-8 bg-surface-100/50 mx-1 hidden sm:block" />

        {/* Leave call */}
        <button
          onClick={onLeave}
          className="w-14 h-11 rounded-full bg-danger hover:bg-danger-hover
                     flex items-center justify-center text-white transition-all duration-200
                     cursor-pointer hover:scale-105 active:scale-95"
          title="Leave call"
        >
          <LeaveIcon />
        </button>
      </div>
    </div>
  );
}

/* ── Reusable control button ─────────────────────────────────── */
function ControlButton({
  children,
  active,
  onClick,
  title,
  danger = false,
  highlight = false,
  badge = 0,
  className = "",
}) {
  let bgClass;
  if (danger) {
    bgClass = "bg-danger hover:bg-danger-hover";
  } else if (highlight) {
    bgClass = "bg-primary-600 hover:bg-primary-500";
  } else {
    bgClass = "bg-surface-100 hover:bg-surface-200";
  }

  return (
    <button
      onClick={onClick}
      title={title}
      className={`relative w-11 h-11 rounded-full flex items-center justify-center
                  text-white transition-all duration-200 cursor-pointer
                  hover:scale-105 active:scale-95
                  ${bgClass} ${className}`}
    >
      {children}

      {/* Unread badge */}
      {badge > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full
                      bg-primary-500 text-white text-[10px] font-bold
                      flex items-center justify-center px-1"
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────
   ICONS
   ──────────────────────────────────────────────────────────────── */
function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function CamIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function CamOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34" />
    </svg>
  );
}

function SwitchCamIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      <path d="M15 3l2 2-2 2" />
    </svg>
  );
}

function ScreenShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <polyline points="17 8 21 4 17 0" />
      <line x1="21" y1="4" x2="14" y2="4" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ParticipantsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function LeaveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.35 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
