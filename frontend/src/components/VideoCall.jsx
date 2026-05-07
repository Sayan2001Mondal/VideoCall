"use client";

import useMediaSoup from "../hooks/useMediaSoup";
import { useRef, useEffect } from "react";

function RemoteVideo({ stream, peerId, name }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current || !stream) return;

    console.log("REMOTE STREAM:", stream);

    console.log(
      "REMOTE TRACKS:",
      stream.getTracks()
    );

    videoRef.current.srcObject = stream;

    const playVideo = async () => {
      try {
        await videoRef.current.play();

        console.log("REMOTE VIDEO PLAYING");
      } catch (err) {
        console.error("VIDEO PLAY ERROR:", err);
      }
    };

    videoRef.current.onloadedmetadata = () => {
      console.log("METADATA LOADED");

      playVideo();
    };

    playVideo();

  }, [stream]);

  return (
    <div style={styles.videoBox}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        controls={false}
        style={styles.video}
      />

      <span style={styles.label}>
        {name || peerId}
      </span>
    </div>
  );
}

export default function VideoCall({ ws, roomId, peerId, name }) {
  const { localVideoRef, remoteStreams, peersData, micOn, camOn, toggleMic, toggleCam, switchCamera } =
    useMediaSoup(ws, roomId, peerId, name);

  return (
    <div style={styles.wrapper}>
      <div style={styles.videoGrid}>
        {/* Local */}
        <div style={styles.videoBox}>
          <video ref={localVideoRef} autoPlay muted playsInline style={styles.video} />
          {!camOn && <div style={styles.camOff}>Camera off</div>}
          <span style={styles.label}>You</span>
        </div>

        {/* Remote peers */}
        {Object.entries(remoteStreams).map(([pid, stream]) => (
          <RemoteVideo key={pid} stream={stream} peerId={pid} name={peersData[pid]?.name} />
        ))}
      </div>

      <div style={styles.controls}>
        <button onClick={toggleMic} style={{ ...styles.ctrlBtn, background: micOn ? "#334155" : "#ef4444" }} aria-label="Toggle mic">
          {micOn ? <MicIcon /> : <MicOffIcon />}
        </button>
        <button onClick={toggleCam} style={{ ...styles.ctrlBtn, background: camOn ? "#334155" : "#ef4444" }} aria-label="Toggle camera">
          {camOn ? <CamIcon /> : <CamOffIcon />}
        </button>
        <button onClick={switchCamera} style={{ ...styles.ctrlBtn, background: "#334155" }} aria-label="Switch camera">
          <SwitchCamIcon />
        </button>
      </div>
    </div>
  );
}

// styles and icons same as before — copy from your existing VideoCall.jsx

const styles = {
  wrapper: {
    marginTop: 16,
    background: "#0f172a",
    borderRadius: 12,
    overflow: "hidden",
  },
  videoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    padding: 8,
  },
  videoBox: {
    background: "#1e293b",
    borderRadius: 10,
    position: "relative",
    overflow: "hidden",
    aspectRatio: "4/3",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  label: {
    position: "absolute",
    bottom: 8,
    left: 8,
    fontSize: 11,
    color: "#e2e8f0",
    background: "rgba(0,0,0,0.5)",
    padding: "2px 8px",
    borderRadius: 20,
  },
  camOff: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#1e293b",
    color: "#64748b",
    fontSize: 13,
  },
  controls: {
    background: "#1e293b",
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderTop: "1px solid #334155",
  },
  ctrlBtn: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    transition: "background 0.15s",
  },
};

const MicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="22"/>
  </svg>
);

const SwitchCamIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 7h-3a2 2 0 0 1-2-2V2"/>
    <path d="M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2Z"/>
    <path d="M3 15v3a2 2 0 0 0 2 2h7"/>
    <path d="m7 19-2-2 2-2"/>
  </svg>
);

const MicOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23"/>
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6"/>
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
    <line x1="12" y1="19" x2="12" y2="22"/>
  </svg>
);

const CamIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"/>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
  </svg>
);

const CamOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23"/>
    <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8"/>
  </svg>
);

const CallIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.35 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);