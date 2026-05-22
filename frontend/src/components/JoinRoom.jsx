"use client";

import { useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  User,
  Hash,
  Sparkles,
} from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { IconButton } from "./ui/icon-button";
import { Avatar } from "./ui/avatar";
import { StatusDot } from "./ui/status-dot";
import { Tooltip } from "./ui/tooltip";
import LabeledInput from "./LabeledInput";
import useKeySubmit from "../hooks/useKeySubmit";

/**
 * JoinRoom — Google Meet-style lobby with camera preview
 */
export default function JoinRoom({
  name,
  setName,
  roomId,
  setRoomId,
  onJoin,
  previewVideoRef,
  micOn,
  camOn,
  toggleMic,
  toggleCam,
  audioLevel,
  hasPermission,
  statusMessage,
  wsConnected,
}) {
  // Generate a random short room ID
  function generateRoomId() {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    const segments = [];
    for (let s = 0; s < 3; s++) {
      let seg = "";
      for (let i = 0; i < 4; i++) {
        seg += chars[Math.floor(Math.random() * chars.length)];
      }
      segments.push(seg);
    }
    setRoomId(segments.join("-"));
  }

  const canJoin = name.trim() && roomId.trim() && wsConnected;

  // Audio level bars (0-4 bars based on level)
  const activeBars = Math.min(4, Math.floor(audioLevel * 5));

  // Enter to join
  const handleKeyDown = useKeySubmit(() => {
    if (canJoin) onJoin();
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-surface-100 via-surface-100 to-primary-900/20">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-100/40 rounded-full blur-3xl" />
      </div>

      {/* Main card */}
      <Card
        className="relative w-full max-w-4xl overflow-hidden animate-[fadeIn_0.4s_ease-out]
                    border-border/50 shadow-2xl shadow-primary-500/5"
      >
        <div className="flex flex-col md:flex-row">
          {/* ── LEFT: Camera Preview ──────────────────────── */}
          <div className="md:w-1/2 p-6 flex flex-col items-center justify-center gap-4 bg-black/20">
            {/* Video preview container */}
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-surface-300 shadow-inner ring-1 ring-white/10">
              {hasPermission === true && camOn ? (
                <video
                  ref={previewVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-surface-200 to-surface-300">
                  <Avatar name={name} size="xl" />
                  <p className="text-sm text-text-muted">{statusMessage}</p>
                </div>
              )}
            </div>

            {/* Device control buttons */}
            <div className="flex items-center gap-3">
              {/* Mic button */}
              <Tooltip content={micOn ? "Mute microphone" : "Unmute microphone"}>
                <IconButton
                  onClick={toggleMic}
                  disabled={!hasPermission}
                  danger={!micOn}
                  aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
                >
                  {micOn ? <Mic size={18} /> : <MicOff size={18} />}
                </IconButton>
              </Tooltip>

              {/* Audio level indicator */}
              <div className="flex items-end gap-0.5 h-6">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-150
                      ${i < activeBars ? "bg-success" : "bg-surface-300"}`}
                    style={{ height: `${(i + 1) * 25}%` }}
                  />
                ))}
              </div>

              {/* Camera button */}
              <Tooltip content={camOn ? "Turn off camera" : "Turn on camera"}>
                <IconButton
                  onClick={toggleCam}
                  disabled={!hasPermission}
                  danger={!camOn}
                  aria-label={camOn ? "Turn off camera" : "Turn on camera"}
                >
                  {camOn ? <Video size={18} /> : <VideoOff size={18} />}
                </IconButton>
              </Tooltip>
            </div>
          </div>

          {/* ── RIGHT: Join Form ──────────────────────────── */}
          <div className="md:w-1/2 p-8 flex flex-col justify-center gap-5">
            {/* Logo / Title */}
            <div className="text-center">
              <h1 className="text-3xl font-bold">
                <span className="text-primary-500">Meet</span>
                <span className="text-text-primary">Up</span>
              </h1>
              <p className="text-sm text-text-muted mt-1">
                Video calls made simple
              </p>
            </div>

            {/* Name input */}
            <LabeledInput
              id="join-name"
              icon={<User size={16} />}
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            {/* Room ID input + generate */}
            <div className="flex gap-2">
              <div className="flex-1">
                <LabeledInput
                  id="join-room"
                  icon={<Hash size={16} />}
                  placeholder="Room ID"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <Button
                variant="secondary"
                onClick={generateRoomId}
                className="mt-0 self-end h-10 shrink-0"
              >
                <Sparkles size={14} />
                Generate
              </Button>
            </div>

            {/* Join button */}
            <Button
              onClick={onJoin}
              disabled={!canJoin}
              size="lg"
              className="w-full text-base font-bold shadow-lg shadow-primary-500/20"
            >
              {canJoin ? "Join Now" : "Fill in details to join"}
            </Button>

            {/* Connection status */}
            <div className="flex justify-center">
              <StatusDot
                status={wsConnected ? "connected" : "connecting"}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
