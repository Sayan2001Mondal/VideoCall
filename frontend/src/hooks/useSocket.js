import { useEffect, useRef } from "react";

/**
 * useSocket — manages the WebSocket connection.
 *
 * @param {function} onMessage   Called with parsed JSON for each incoming message
 * @param {function} setConnected  Optional state setter for connection status (true/false)
 * @returns {React.RefObject}    ref to the WebSocket instance
 */
export default function useSocket(onMessage, setConnected) {
  const ws = useRef(null);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    ws.current = new WebSocket("wss://sayanexpress.superfastmind.com/ws/test");

    ws.current.onopen = () => {
      console.log("Connected to server");
      setConnected?.(true);
    };

    ws.current.onclose = () => {
      console.log("Disconnected from server");
      setConnected?.(false);
    };

    ws.current.onerror = () => {
      setConnected?.(false);
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (onMessageRef.current) {
        onMessageRef.current(data);
      }
    };

    return () => ws.current.close();
  }, []);

  return ws;
}