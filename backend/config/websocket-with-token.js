const { WebSocketServer } = require("ws");
const jwt = require("jsonwebtoken");

const socketHandler = require("../socket/socketHandler");

function setupWebSocket(server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws/test",

    verifyClient: ({ origin, req }, cb) => {
      console.log("[WS] origin:", origin);

      const allowed = [
        "https://sayan.superfastmind.com",
        "http://localhost:3000",
        "https://sayanexpress.superfastmind.com",
      ];

      // Origin validation
      if (!allowed.includes(origin)) {
        console.warn("[WS] Blocked origin:", origin);

        cb(false, 403, "Forbidden");
        return;
      }

      try {
        // Parse token from websocket URL
        const url = new URL(req.url, "http://localhost");

        const token = url.searchParams.get("token");

        if (!token) {
          console.warn("[WS] Missing token");

          cb(false, 401, "Missing token");
          return;
        }

        // Verify JWT
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET
        );

        // Attach user data to request
        req.user = decoded;

        console.log("[WS] Authenticated:", decoded);

        cb(true);

      } catch (err) {
        console.error("[WS] Invalid token:", err.message);

        cb(false, 401, "Invalid token");
      }
    },
  });

  wss.on("connection", (ws, req) => {
    console.log("[socket] Client connected to /ws/test");

    // Attach authenticated user
    ws.user = req.user;

    socketHandler(ws, req);
  });
}

module.exports = setupWebSocket;