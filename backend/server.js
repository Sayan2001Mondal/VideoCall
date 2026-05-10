const express = require("express");
const http = require("http");
const cors = require("cors");
const setupWebSocket = require("./config/websocket");
const { getWorker } = require("./config/mediasoupWorker");

const app = express();

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

const server = http.createServer(app);

async function start() {
  await getWorker(); // warm up mediasoup worker before accepting connections
  setupWebSocket(server);
  server.listen(5000, "0.0.0.0", () => {
    console.log("Server running on port 5000");
  });
}

start();
