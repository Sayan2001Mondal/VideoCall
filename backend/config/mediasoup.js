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
        announcedIp: "192.168.0.166", 
      },
      {
        ip: "127.0.0.1",
      }
    ],
    maxIncomingBitrate: 1500000,
    initialAvailableOutgoingBitrate: 1000000,
  },
}