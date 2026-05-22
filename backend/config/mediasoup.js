module.exports = {
    worker: {
        rtcMinPort: 10000,
        rtcMaxPort: 10100,
        logLevel: "warn"
    },
    router: {
        mediaCodecs: [
            {
                kind: "audio",
                mimeType: "audio/opus",
                clockRate: 48000,
                channels: 2,
            },
            {
                kind: "video",
                mimeType: "video/VP8",
                clockRate: 90000,
                parameters: {},
            },
            {
                kind: "video",
                mimeType: "video/H264",
                clockRate: 90000,
                parameters: {
                    "packetization-mode": 1,
                    "profile-level-id": "42e01f",
                    "level-asymmetry-allowed": 1,
                    "x-google-start-bitrate": 1000
                }
            },
        ],
    },
    webRtcTransport: {
    listenIps: [
      {
        ip: "0.0.0.0",
        announcedIp: "72.60.220.252", // REQUIRED for users on different networks!
      },
      {
        ip: "0.0.0.0",
        announcedIp: "192.168.0.166", // REQUIRED for users on the same local network
      },
      {
        ip: "127.0.0.1",
      }
    ],
    enableSctp: true,
    numSctpStreams: { OS: 1024, MIS: 1024 },
    maxSctpMessageSize: 262144,
    maxIncomingBitrate: 1500000,
    initialAvailableOutgoingBitrate: 1000000,
  },
  turn: {                                                                                                                 
         iceServers: [                                                                                                         
           {                                                                                                                   
             urls: process.env.TURN_URL,                                                              
             username: process.env.TURN_USERNAME,                                                                                        
             credential: process.env.TURN_CREDENTIAL,                                                                                      
           },                                                                                                                  
         ],                                                                                                                    
        }, 
}
