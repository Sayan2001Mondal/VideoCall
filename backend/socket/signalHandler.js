const {WebSocket} = require("ws")
const rooms = require("./roomManager")



function handleSignaling(data,ws){
    const {roomId} = data

    const clients = rooms.getRoomClients(roomId)

    clients.forEach((client) => {
        if(client !== ws && client.readyState === WebSocket.OPEN){
            client.send(JSON.stringify(data))
        }
    })
}

module.exports = handleSignaling