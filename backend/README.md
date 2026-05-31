# Backend Setup Guide

This backend serves:

- HTTP API over Express
- WebSocket signaling on `/ws/test`
- mediasoup WebRTC transports
- PostgreSQL via Prisma

## Runtime ports

The backend currently uses these ports:

- `5000` TCP: Express + WebSocket server in [server.js](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/backend/server.js:54)
- `5432` TCP: PostgreSQL from [docker-compose.yml](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/docker-compose.yml:11)
- `10000-10100` UDP/TCP: mediasoup worker RTP/RTCP/WebRTC ports from [config/mediasoup.js](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/backend/config/mediasoup.js:3)

For production, open at least:

- `443` TCP on your public domain at the reverse proxy or load balancer
- `5000` TCP between the reverse proxy and this Node server
- `10000-10100` UDP on the public server that runs mediasoup
- `10000-10100` TCP if your clients may fall back to TCP WebRTC transport
- `5432` only if PostgreSQL is remote and must be reached over the network

## Required environment file

Create `backend/.env`.

Example:

```env
DATABASE_URL="postgresql://chat_video_USER:password@12@127.0.0.1:5432/chat_video_db?schema=public"

TURN_URL="turn:turn.yourdomain.com:3478"
TURN_USERNAME="your-turn-username"
TURN_CREDENTIAL="your-turn-password"

JWT_SECRET="replace-this-if-you-switch-to-jwt-websocket-auth"
```

Notes:

- `DATABASE_URL` is required by Prisma in [prisma/schema.prisma](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/backend/prisma/schema.prisma:10) and [prisma.config.ts](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/backend/prisma.config.ts:10)
- `TURN_*` values are read by mediasoup config in [config/mediasoup.js](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/backend/config/mediasoup.js:57)
- `JWT_SECRET` is only used by the alternate file [config/websocket-with-token.js](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/backend/config/websocket-with-token.js:44). The active server currently uses [config/websocket.js](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/backend/config/websocket.js:1), which validates tokens from the database instead of JWTs.

## Local database setup

From the repository root:

```bash
docker compose up -d
```

This starts PostgreSQL with:

- host: `127.0.0.1`
- port: `5432`
- database: `chat_video_db`
- user: `chat_video_USER`
- password: `password@12`

Then from `backend/`:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
```

For local development, `npx prisma migrate dev` is also fine if you are actively changing the schema.

## WebSocket token requirement

The active WebSocket server in [config/websocket.js](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/backend/config/websocket.js:12) requires a `token` query parameter on the WebSocket URL.

Example:

```txt
wss://your-backend-domain/ws/test?token=YOUR_TOKEN
```

That token must exist in the `AuthToken` table.

You can seed a token from `backend/` with:

```bash
node insert_token.js YOUR_TOKEN
```

## Production domains

This codebase currently hardcodes these browser origins:

### HTTP CORS allowlist

Defined in [server.js](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/backend/server.js:13):

- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `http://192.168.0.161:3000`
- `https://sayan.superfastmind.com`
- `https://sumit.superfastmind.com`

This list controls browser access to normal HTTP endpoints such as:

- `GET /health`
- `POST /rooms`

### WebSocket allowed origins

Defined in [config/websocket.js](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/backend/config/websocket.js:15):

- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `https://sayan.superfastmind.com`
- `https://sayanexpress.superfastmind.com`
- `http://192.168.0.161:3000`
- `https://sumit.superfastmind.com`

This list controls which frontend page origins may open a WebSocket connection to:

- `wss://your-backend-domain/ws/test`

Important:

- These two lists are separate on purpose
- Express CORS does not protect WebSocket upgrades
- If you add a new frontend domain, you usually need to add it to both lists

## Current production networking assumption

The current frontend connects to:

- `wss://sayanexpress.superfastmind.com/ws/test`

The mediasoup transport config currently announces:

- public IP: `72.60.220.252`
- LAN IP: `192.168.0.166`

Those values are hardcoded in [config/mediasoup.js](/home/dcsdev4/Desktop/Video%20Call%20and%20Chat%20App/backend/config/mediasoup.js:35).

For production, set `announcedIp` to the real public IP of the mediasoup host. If clients on the same private LAN must connect directly, keep the LAN IP entry only if that network path is valid in your environment.

## Recommended production checklist

- Point your public backend domain to the server running Node and mediasoup
- Terminate TLS on `443`
- Proxy `/health`, `/rooms`, and `/ws/test` to the Node server on `127.0.0.1:5000`
- Open `10000-10100` UDP on the mediasoup host
- Open `10000-10100` TCP if TCP fallback is required
- Set `DATABASE_URL` to your production Postgres instance
- Set `TURN_URL`, `TURN_USERNAME`, and `TURN_CREDENTIAL` to a real TURN service
- Add every real frontend origin to both allowlists
- Insert at least one valid token into the `AuthToken` table before connecting clients

## Start commands

From `backend/`:

```bash
npm run dev
```

or:

```bash
npm start
```

## Important limitation in the current code

The allowlisted origins and mediasoup announced IPs are hardcoded in source files, not loaded from environment variables. That means every new production domain or IP change currently requires a code edit and redeploy.
