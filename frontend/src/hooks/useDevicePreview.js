"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export default function useDevicePreview() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasPermission, setHasPermission] = useState(null);
  const [devices, setDevices] = useState({ video: [], audio: [] });
  const [statusMessage, setStatusMessage] = useState("Requesting access...");

  // ── audio level monitor ──────────────────────────────────────
  const setupAudioMonitor = useCallback((stream) => {
    try {
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = { audioCtx, analyser };

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      function tick() {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < 10; i++) sum += dataArray[i];
        setAudioLevel(sum / 10 / 255);
        animFrameRef.current = requestAnimationFrame(tick);
      }

      tick();
    } catch (err) {
      console.warn("Audio monitoring unavailable:", err);
    }
  }, []);

  // ── cleanup ──────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (analyserRef.current?.audioCtx) {
      analyserRef.current.audioCtx.close().catch(() => {});
    }
  }, []);

  const stopAllTracks = useCallback(() => {
    cleanup();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, [cleanup]);

  // ── toggles ──────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setMicOn((v) => !v);
  }, []);

  const toggleCam = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setCamOn((v) => !v);
  }, []);

  // ── synchronize stream to video element ──────────────────────────
  useEffect(() => {
    if (hasPermission && camOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [hasPermission, camOn]);

  // ── init on mount ────────────────────────────────────────────
  // ✅ Async logic inlined directly — no useCallback wrapper,
  //    so React Compiler doesn't treat setState calls as synchronous-in-effect
  useEffect(() => {
    async function startMedia() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          console.warn("MediaDevices API not available (requires HTTPS)");
          setHasPermission(false);
          setStatusMessage("Camera requires HTTPS");
          return;
        }

        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter((d) => d.kind === "videoinput");
        const audioDevices = allDevices.filter((d) => d.kind === "audioinput");

        const constraints = {
          video: videoDevices.length > 0,
          audio: audioDevices.length > 0,
        };

        if (!constraints.video && !constraints.audio) {
          setHasPermission(false);
          setDevices({ video: videoDevices, audio: audioDevices });
          setStatusMessage("No camera or microphone found");
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        streamRef.current = stream;
        // ✅ All state updates after awaits — React 18 auto-batches these
        setHasPermission(true);
        setDevices({
          video: videoDevices,
          audio: audioDevices,
        });
        setCamOn(stream.getVideoTracks().length > 0);
        setMicOn(stream.getAudioTracks().length > 0);
        setStatusMessage(
          stream.getVideoTracks().length > 0
            ? "Camera ready"
            : "Camera not found"
        );

        setupAudioMonitor(stream);
      } catch (err) {
        console.error("Device preview error:", err);
        setHasPermission(false);
        if (err?.name === "NotAllowedError") {
          setStatusMessage("Camera access denied");
        } else if (err?.name === "NotFoundError") {
          setStatusMessage("Requested camera or microphone not found");
        } else {
          setStatusMessage("Could not access camera or microphone");
        }
      }
    }

    startMedia();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (analyserRef.current?.audioCtx) {
        analyserRef.current.audioCtx.close().catch(() => {});
      }
    };
  }, [setupAudioMonitor]);

  return {
    videoRef,
    streamRef,
    micOn,
    camOn,
    audioLevel,
    hasPermission,
    devices,
    statusMessage,
    toggleMic,
    toggleCam,
    cleanup,
    stopAllTracks,
  };
}
