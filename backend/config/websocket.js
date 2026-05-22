const {WebSocketServer} = require("ws")
const socketHandler = require("../socket/socketHandler")


function setupWebSocket(server){
    //
    const wss = new WebSocketServer({server, path: "/ws/test",
           verifyClient: ({ origin }, cb) => {
  console.log("[WS] origin:", origin); // ← add this
  const allowed = [
    "https://sayan.superfastmind.com",
    "http://localhost:3000",
    "https://sayanexpress.superfastmind.com",
  ];
  cb(allowed.includes(origin), 403, "Forbidden");
}
    })

    wss.on("connection", (ws) => {
        console.log("[socket] Client connected to /ws/test");

        socketHandler(ws)
    })

    
}
module.exports = setupWebSocket
