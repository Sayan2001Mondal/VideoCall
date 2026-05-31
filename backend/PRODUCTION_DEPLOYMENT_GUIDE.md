# Production Deployment Guide: WebSockets & Video Calls (MediaSoup)

This guide provides a comprehensive walkthrough for deploying the backend service and configuring both the backend and frontend to ensure secure, high-performance WebSockets and WebRTC video calls in a production environment.

---

## 📂 Core Files to Manage

To run the backend successfully in production, you must manage and configure the following files on your server:

1. **`.env`**
   * Stores all secret credentials, database connection strings, and WebRTC fallback TURN server configurations.
   * **Crucial Rule:** Never commit this file to Git.
2. **`config/mediasoup.js`**
   * Configures IP addresses, WebRTC transport ports, and codecs.
   * **Crucial Rule:** Needs to announce the server's public IP address rather than local or hardcoded development IPs.
3. **`server.js`**
   * Regulates CORS allowed origins and server initialization settings.
4. **`config/websocket.js` / `config/websocket-with-token.js`**
   * Controls incoming WebSocket client connections, validates origins, and authenticates peer sessions.
5. **Prisma Schema (`prisma/schema.prisma`)**
   * Manages database structure and handles authToken queries for WebSocket handshakes.

---

## 🔐 Environment Variables to Manage (`.env`)

You need to establish the following environment variables in your production server's `.env` file:

```env
# Server Port (defaults to 5000 if not set, but good practice to specify)
PORT=5000

# Node Environment
NODE_ENV=production

# Database Connection (must point to your production PostgreSQL database)
DATABASE_URL="postgresql://<db_user>:<db_password>@<db_host>:<db_port>/<db_name>?schema=public"

# JSON Web Token Secret (if using token-based JWT auth)
JWT_SECRET="generate-a-secure-random-64-character-string"

# TURN Server Fallback configuration (Essential for bypassing strict firewalls)
TURN_URL="turn:your-turn-server.com:3478?transport=tcp"
TURN_USERNAME="production-turn-username"
TURN_CREDENTIAL="production-turn-password"

# Allowed CORS Origins (Comma-separated list of frontends accessing this backend)
ALLOWED_ORIGINS="https://sayan.superfastmind.com,https://sumit.superfastmind.com,https://osm.yourdomain.com"

# Production Public IP (for Mediasoup dynamic IP announcement)
MEDIASOUP_ANNOUNCED_IP="YOUR_SERVER_PUBLIC_IPV4_ADDRESS"
```

---

## 🛠️ Required Production Changes (Step-by-Step)

### 1. WebRTC Public IP Announcement (`config/mediasoup.js`)

In development, WebRTC transport relies on your local machine's IP (e.g., `192.168.x.x`). In production, **external clients cannot connect to a local IP**. The server must announce its **Public IPv4 Address** so that external WebRTC peers can establish peer-to-peer media streams.

#### 🔧 Modification needed in `config/mediasoup.js`:
Modify the `webRtcTransport.listenIps` array to dynamically read from the `MEDIASOUP_ANNOUNCED_IP` environment variable, falling back to localhost or standard IPs if not provided:

```javascript
// config/mediasoup.js
module.exports = {
  worker: {
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
    logLevel: "warn"
  },
  router: {
    mediaCodecs: [
      // ... (your mediaCodecs configuration remains unchanged)
    ],
  },
  webRtcTransport: {
    listenIps: [
      {
        ip: "0.0.0.0", // Listen on all network interfaces
        announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || "72.60.220.252", // Production Public IP
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
```

---

### 2. Configure Allowed CORS Origins dynamically (`server.js`)

In `server.js`, instead of hardcoding front-end domains, dynamically parse them from `.env` so that adding new domains doesn't require modifying application code:

```diff
-const allowedOrigins = [
-  "http://localhost:3000",
-  "http://127.0.0.1:3000",
-  "http://192.168.0.161:3000",
-  "https://sayan.superfastmind.com",
-  "https://sumit.superfastmind.com"
-];
+const allowedOrigins = process.env.ALLOWED_ORIGINS
+  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
+  : ["http://localhost:3000", "https://sayan.superfastmind.com"];
```

---

### 3. Adjust WebSocket Verification (`config/websocket.js`)

Do the same for the WebSocket configuration file to prevent connection rejections in production:

```diff
-      const allowed = [
-        "http://localhost:3000",
-        "http://127.0.0.1:3000",
-        "https://sayan.superfastmind.com",
-        "https://sayanexpress.superfastmind.com",
-        "http://192.168.0.161:3000",
-        "https://sumit.superfastmind.com"
-      ];
+      const allowed = process.env.ALLOWED_ORIGINS
+        ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
+        : ["http://localhost:3000", "https://sayan.superfastmind.com"];
```

---

### 4. Fix Frontend Hardcoded Socket Token (`useSocket.js`)

In the frontend repository at `src/hooks/videoCall/useSocket.js`, the socket URL currently contains a **hardcoded auth token**:

```javascript
// src/hooks/videoCall/useSocket.js (Line 40)
const socketUrl = `${getVideoWebSocketUrl()}?token=${encodeURIComponent("7f45693705ade53593b46af74f6d3cd5a7cb1dbb")}`;
```

#### 🔧 Production Correction:
Change this line to dynamically use the authenticated user's token obtained from the `getAuthToken()` utility:

```javascript
const authHeader = getAuthToken();
const token = authHeader ? authHeader.replace(/^Token\s+/i, "").trim() : "";

if (!token) {
  throw new Error("No authorization token found");
}

const socketUrl = `${getVideoWebSocketUrl()}?token=${encodeURIComponent(token)}`;
```

---

## 🔒 Firewall & Security Group Rules (Network Setup)

WebRTC and MediaSoup handle real-time audio/video streams over direct socket connections. Because of this, standard HTTP ports are insufficient. You **MUST** open the following ports on your hosting provider (e.g., AWS EC2, DigitalOcean, Linode) and local system firewall (`ufw`):

| Protocol | Port / Range | Description | Direction |
| :--- | :--- | :--- | :--- |
| **TCP** | `80` | HTTP traffic (Nginx ACME / Let's Encrypt validation) | Inbound |
| **TCP** | `443` | Secure HTTPS & WSS (WebSocket) requests | Inbound |
| **TCP / UDP**| `3478` | TURN/STUN service (if hosting your own TURN) | Inbound |
| **UDP** | `10000 - 10100` | WebRTC Media Streams (Audio & Video tracks) | Inbound |
| **TCP** | `10000 - 10100` | WebRTC Active Transport Fallbacks | Inbound |

> [!IMPORTANT]
> If you do not open the UDP/TCP port range **10000 to 10100** in your server's security group/firewall, the WebRTC connections will stay in the `connecting` state forever and fail. Media elements will show blank screens/no audio.

### Linux UFW Commands:
Run these commands on your Ubuntu/Debian production server to open the ports:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 10000:10100/udp
sudo ufw allow 10000:10100/tcp
sudo ufw reload
```

---

## 🚀 SSL Certificate & Nginx Reverse Proxy Setup

Modern web browsers **prohibit** video and microphone access on insecure connections (HTTP). You **must** serve your application over HTTPS, and your WebSockets over WSS (`wss://`).

Instead of writing SSL configuration directly inside Node.js (which runs as a non-root user for security), use **Nginx** as a reverse proxy to manage SSL certificates (via Let's Encrypt) and forward traffic to your Node server.

### 📝 Production Nginx Config Template

Create a configuration file (e.g., `/etc/nginx/sites-available/sayanexpress.superfastmind.com`) and paste the following setup:

```nginx
server {
    listen 80;
    server_name sayanexpress.superfastmind.com;

    # Let's Encrypt / Certbot Challenge validation directory
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all plain HTTP traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name sayanexpress.superfastmind.com;

    # SSL Certificates (managed automatically by Let's Encrypt Certbot)
    ssl_certificate /etc/letsencrypt/live/sayanexpress.superfastmind.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sayanexpress.superfastmind.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 1. Forward REST API requests to Express Backend
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 2. Forward WebSocket connections to Express
    location /ws/test {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;

        # These headers are CRITICAL for WebSocket handshakes!
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Prevent premature socket timeouts during long silence
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

To enable this configuration, symlink it to `sites-enabled` and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/sayanexpress.superfastmind.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🗄️ Database & Prisma Sync Commands

Since your production database runs separately, you must synchronize the database tables and prepare the Prisma client before starting the service.

Run the following commands in the backend folder on your production server:

```bash
# 1. Sync the PostgreSQL schema to match your Prisma definitions
npx prisma db push

# 2. Generate the optimized JS Prisma client code inside the node_modules
npx prisma generate
```

---

## 📈 Running the Server in Production (Process Management)

Do not run the server using `nodemon` or `node server.js` directly, as the process will exit if you close your terminal or if an unhandled exception occurs.

Use a process manager like **PM2** to run the backend in the background, load environment variables properly, monitor health, and restart the process automatically if it crashes.

### PM2 Deployment Commands:
```bash
# Install PM2 globally
sudo npm install pm2 -g

# Start the application
pm2 start server.js --name "osm-backend" --env production

# Ensure PM2 starts automatically on server reboot
pm2 startup
pm2 save
```

### PM2 Monitoring Commands:
```bash
pm2 logs osm-backend   # Check server output logs in real-time
pm2 status            # Verify CPU and memory utilization
pm2 restart osm-backend # Safely restart the server
```
