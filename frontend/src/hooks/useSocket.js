import { useEffect, useRef } from "react";

export default function useSocket(onMessage) {
  const ws = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket("ws://192.168.0.166:5000/ws/test");

    ws.current.onopen = () => {
      console.log("Connected to server");
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    return () => ws.current.close();
  }, []);

  return ws;
}