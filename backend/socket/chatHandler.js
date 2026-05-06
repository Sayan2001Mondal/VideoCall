const {WebSocket} = require("ws")

const rooms = require("./roomManager")



function handleChat(data){
    const {roomId, message, sender} = data

    const clients = rooms.getRoomClients(roomId)


    clients.forEach((client) => {
       if(client.readyState === WebSocket.OPEN){
        client.send(JSON.stringify({
            type: "chat",
            message,
            sender
        }))
       }
    })
}

module.exports = handleChat