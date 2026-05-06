import { useEffect, useRef, useState } from "react";

export default function useWebRTC(ws, roomId) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const currentFacingMode = useRef("user")
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  useEffect(() => {
    if (!ws.current) return;

    peerConnection.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localStream.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        stream.getTracks().forEach((track) =>
          peerConnection.current.addTrack(track, stream)
        );
      })
      .catch((err) => console.error("Media Error:", err));

    peerConnection.current.ontrack = (event) => {
      if (remoteVideoRef.current)
        remoteVideoRef.current.srcObject = event.streams[0];
    };

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        ws.current.send(JSON.stringify({ type: "candidate", roomId, candidate: event.candidate }));
      }
    };

    const handleMessage = async (event) => {
      const data = JSON.parse(event.data);
      try {
        if (data.type === "offer") {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await peerConnection.current.createAnswer();
          await peerConnection.current.setLocalDescription(answer);
          ws.current.send(JSON.stringify({ type: "answer", roomId, answer }));
        }
        if (data.type === "answer") {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
        if (data.type === "candidate") {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (err) {
        console.error("WebRTC Error:", err);
      }
    };

    ws.current.addEventListener("message", handleMessage);

    return () => {
      ws.current?.removeEventListener("message", handleMessage);
      peerConnection.current?.close();
      localStream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [ws, roomId]);

  const startCall = async () => {
    try {
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      ws.current.send(JSON.stringify({ type: "offer", roomId, offer }));
    } catch (err) {
      console.error("Start Call Error:", err);
    }
  };

  const toggleMic = () => {
    if (!localStream.current) return;
    localStream.current.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMicOn((prev) => !prev);
  };

  const toggleCam = () => {
    if (!localStream.current) return;
    localStream.current.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setCamOn((prev) => !prev);
  };

  const switchCamera = async () => {
  if (!localStream.current || !peerConnection.current) return;

  // Toggle facing mode
  currentFacingMode.current =
    currentFacingMode.current === "user" ? "environment" : "user";

  // Stop old video track
  localStream.current.getVideoTracks().forEach((t) => t.stop());

  try {
    // Get new stream with switched camera
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: currentFacingMode.current },
      audio: true,
    });

    const newVideoTrack = newStream.getVideoTracks()[0];

    // Replace track in peer connection (so remote sees the switch)
    const sender = peerConnection.current
      .getSenders()
      .find((s) => s.track?.kind === "video");

    if (sender) await sender.replaceTrack(newVideoTrack);

    // Update local stream and preview
    const audioTrack = localStream.current.getAudioTracks()[0];
    localStream.current = new MediaStream([newVideoTrack, audioTrack]);

    if (localVideoRef.current)
      localVideoRef.current.srcObject = localStream.current;
  } catch (err) {
    console.error("Switch Camera Error:", err);
  }
};

return { localVideoRef, remoteVideoRef, startCall, toggleMic, toggleCam, micOn, camOn, switchCamera };}