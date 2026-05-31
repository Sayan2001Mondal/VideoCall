const { WebSocketServer } = require("ws");
const { PrismaClient } = require("../generated/prisma");

const prisma = new PrismaClient();
const socketHandler = require("../socket/socketHandler");

function setupWebSocket(server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws/test",

    verifyClient: async ({ origin, req }, cb) => {
      console.log("[WS] origin:", origin);

      const allowed = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://sayan.superfastmind.com",
        "https://sayanexpress.superfastmind.com",
        "http://192.168.0.161:3000",
        "https://sumit.superfastmind.com"
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

       
        const dbToken = await prisma.authToken.findUnique({
          where: { token },
        });

        if (!dbToken) {
          console.warn("[WS] Invalid token");

          cb(false, 401, "Invalid token");
          return;
        }

        // Attach authenticated user/session context
        req.user = {
          tokenId: dbToken.id,
          token: dbToken.token
        };

        console.log("[WS] Authenticated:", req.user);

        cb(true);

      } catch (err) {
        console.error("[WS] Auth execution error:", err);

        cb(false, 500, "Internal Server Error");
      }
    },
  });

  wss.on("connection", (ws, req) => {
    console.log("[socket] Client connected to /ws/test");

    ws.user = req.user;

    socketHandler(ws, req);
  });
}

module.exports = setupWebSocket;
