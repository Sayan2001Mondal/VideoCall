// rooms stored in ram
const rooms = {}


function joinRoom(roomId,ws){
    if(!rooms[roomId]){
        rooms[roomId] = []
    }
    rooms[roomId].push(ws)
    ws.roomId = roomId
}

function leaveRoom(ws){
    const roomId = ws.roomId
    // if room exists and user is in a room
    if(roomId && rooms[roomId]){
        rooms[roomId] = rooms[roomId].filter((c) => c !== ws)

        // clean empty rooms
        if(rooms[roomId].length === 0){
            delete rooms[roomId]
        }

    }
}


function getRoomClients(roomId){
    return rooms[roomId] || []
}


module.exports = {joinRoom,leaveRoom,getRoomClients}

