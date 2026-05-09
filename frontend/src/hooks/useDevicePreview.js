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

  // ── init on mount ────────────────────────────────────────────
  // ✅ Async logic inlined directly — no useCallback wrapper,
  //    so React Compiler doesn't treat setState calls as synchronous-in-effect
  useEffect(() => {
    async function startMedia() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          console.warn("MediaDevices API not available (requires HTTPS)");
          setHasPermission(false);
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        const allDevices = await navigator.mediaDevices.enumerateDevices();

        // ✅ All state updates after awaits — React 18 auto-batches these
        setHasPermission(true);
        setDevices({
          video: allDevices.filter((d) => d.kind === "videoinput"),
          audio: allDevices.filter((d) => d.kind === "audioinput"),
        });

        setupAudioMonitor(stream);
      } catch (err) {
        console.error("Device preview error:", err);
        setHasPermission(false);
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
    toggleMic,
    toggleCam,
    cleanup,
    stopAllTracks,
  };
}