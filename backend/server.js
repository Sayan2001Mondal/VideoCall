require("dotenv").config();   

const express = require("express");
const http = require("http");
const cors = require("cors");
const setupWebSocket = require("./config/websocket");
const { getWorker } = require("./config/mediasoupWorker");
const { createGeneratedRoom } = require("./socket/roomManager");

const app = express();
app.use(express.json());

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://sayan.superfastmind.com",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/rooms", async (_req, res) => {
  try {
    const roomId = await createGeneratedRoom();
    res.status(201).json({ roomId });
  } catch (error) {
    console.error("[rooms] Failed to create room", { error: error.message });
    res.status(500).json({ error: "Failed to create room" });
  }
});

const server = http.createServer(app);

async function start() {
  await getWorker(); // warm up mediasoup worker before accepting connections
  setupWebSocket(server);
  server.listen(5000, "0.0.0.0", () => {
    console.log("Server running on port 5000");
  });
}

start();
