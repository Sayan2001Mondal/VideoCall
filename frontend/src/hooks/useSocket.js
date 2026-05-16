import { useEffect, useRef } from "react";

/**
 * useSocket — manages the WebSocket connection with auto-reconnect.
 *
 * Reconnect strategy:
 *  - Detects network change via window online/offline events → reconnects immediately
 *  - Exponential backoff on repeated failures: 1s → 2s → 4s → 8s (max)
 *
 * @param {function} onMessage     Called with parsed JSON for each incoming message
 * @param {function} setConnected  Optional state setter for connection status (true/false)
 * @returns {React.RefObject}      ref to the WebSocket instance
 */
export default function useSocket(onMessage, setConnected) {
  const ws = useRef(null);
  const onMessageRef = useRef(onMessage);
  const reconnectTimer = useRef(null);
  const retryCount = useRef(0);
  const isManuallyClosed = useRef(false);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    function connect() {
      if (isManuallyClosed.current) return;

      // Tear down existing socket before opening a new one
      if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
        ws.current.onclose = null; // suppress so it doesn't schedule another retry
        ws.current.close();
      }

      console.log(`[WS] Connecting... (attempt ${retryCount.current + 1})`);

      const socket = new WebSocket(
        "wss://sayanexpress.superfastmind.com/ws/test"
      );

      socket.onopen = () => {
        console.log("[WS] Connected");
        retryCount.current = 0;
        setConnected?.(true);
      };

      socket.onclose = () => {
        if (isManuallyClosed.current) return;
        console.log("[WS] Disconnected");
        setConnected?.(false);

        // Exponential backoff: 1s → 2s → 4s → 8s max
        const delay = Math.min(1000 * Math.pow(2, retryCount.current), 8000);
        retryCount.current += 1;
        console.log(`[WS] Reconnecting in ${delay}ms...`);
        reconnectTimer.current = setTimeout(connect, delay);
      };

      socket.onerror = (err) => {
        console.warn("[WS] Error:", err);
        setConnected?.(false);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current?.(data);
        } catch (e) {
          console.error("[WS] Failed to parse message:", e);
        }
      };

      ws.current = socket;
    }

    // When the browser gets network access back, reconnect immediately
    // instead of waiting for the backoff timer
    function handleOnline() {
      console.log("[WS] Network restored — reconnecting immediately");
      retryCount.current = 0;
      clearTimeout(reconnectTimer.current);

      if (ws.current) {
        ws.current.onclose = null;
        ws.current.close();
        setConnected?.(false);
      }

      connect();
    }

    function handleOffline() {
      console.log("[WS] Network lost");
      setConnected?.(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    connect();

    return () => {
      isManuallyClosed.current = true;
      clearTimeout(reconnectTimer.current);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      ws.current?.close();
    };
  }, []);

  return ws;
} 