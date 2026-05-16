const {WebSocketServer} = require("ws")
const socketHandler = require("../socket/socketHandler")


function setupWebSocket(server){
    const wss = new WebSocketServer({server, path: "/ws/test"})

    wss.on("connection", (ws) => {
        console.log("[socket] Client connected to /ws/test");

        socketHandler(ws)
    })

    
}
module.exports = setupWebSocket
