const handleChat = require("./chatHandler")
const handleSignaling = require("./signalHandler")
const rooms = require("./roomManager")


function socketHandler(ws){
    ws.on("message", (message) => {
        const data = JSON.parse(message)
   

    //join room
    if(data.type === "join"){
        const {roomId} = data;

        rooms.joinRoom(roomId,ws)

        console.log(`User Joined room ${roomId}`);
    }

    //ChatBox
    if(data.type === "chat"){
        handleChat(data,ws)
    }

    // Signalling
    if(["offer", "answer", "candidate"].includes(data.type)){
        handleSignaling(data,ws)
    }
     })

    ws.on("close", () => {
        rooms.leaveRoom(ws)
        console.log("User Disconnected")
    }) 
}

module.exports = socketHandler