const express = require("express")
const http = require("http")
const cors = require("cors")
const setupWebSocket = require("./config/websocket")

const app = express()
app.use(cors({
  origin: "https://sayan.superfastmind.com",
  credentials: true
}))

const server = http.createServer(app)
setupWebSocket(server)

server.listen(5000, "0.0.0.0", () => {
  console.log("Server running on http://localhost:5000")
})