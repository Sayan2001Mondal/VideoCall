const express = require("express");
const http = require("http");
const cors = require("cors");
const setupWebSocket = require("./config/websocket");
const { getWorker } = require("./config/mediasoupWorker");

const app = express();
app.use(cors({ origin: "https://sayan.superfastmind.com", credentials: true }));

const server = http.createServer(app);

async function start() {
  await getWorker(); // warm up mediasoup worker before accepting connections
  setupWebSocket(server);
  server.listen(5000, "0.0.0.0", () => {
    console.log("Server running on port 5000");
  });
}

start();