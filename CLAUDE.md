# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend
- **Run in development mode**: `cd backend && npm run dev` (uses `nodemon`)
- **Start production server**: `cd backend && npm start`

### Frontend
- **Run development server**: `cd frontend && npm run dev`
- **Build for production**: `cd frontend && npm run build`
- **Lint code**: `cd frontend && npm run lint`

## Architecture Overview

The project is a Video Call and Chat application using a decoupled frontend and backend.

### Backend (Node.js + Mediasoup)
- **Core**: Express server with WebSocket integration for real-time signaling.
- **Media Engine**: Uses `mediasoup` for Selective Forwarding Unit (SFU) capabilities, handling WebRTC media streams.
- **Signaling**: 
    - `backend/server.js`: Entry point, initializes Mediasoup worker and WebSocket server.
    - `backend/config/websocket.js`: Sets up the WebSocket server on `/ws/test`.
    - `backend/socket/socketHandler.js`: Main signaling logic. Handles events like `join`, `createTransport`, `produce`, `consume`, and `chat`.
    - `backend/socket/roomManager.js`: Manages the state of rooms, peers, and their associated Mediasoup objects (routers, transports, producers, consumers).
- **Database**: Integrated with Prisma (found in `backend/prisma`) for user and message persistence.

### Frontend (Next.js + React)
- **Framework**: Next.js 16 with App Router.
- **Styling**: Tailwind CSS 4.
- **WebRTC Client**: Uses `mediasoup-client` to interact with the backend SFU.
- **UI Components**: Built with Radix UI and Lucide React.
- **Real-time**: Connects to the backend via WebSockets for signaling and media negotiation.

## Key Workflows

### Media Flow (SFU)
1. **Join**: Client joins a room via WebSocket $\rightarrow$ Backend sends `routerRtpCapabilities`.
2. **Transport Creation**: Client requests a transport (`createTransport`) $\rightarrow$ Backend creates a `WebRtcTransport` $\rightarrow$ Sends ICE/DTLS parameters back.
3. **Producing**: Client produces media (`produce`) $\rightarrow$ Backend attaches producer to transport $\rightarrow$ Broadcasts `newProducer` to other peers.
4. **Consuming**: Other peers request to consume the producer (`consume`) $\rightarrow$ Backend creates a `Consumer` on their receiving transport $\rightarrow$ Sends RTP parameters back.
