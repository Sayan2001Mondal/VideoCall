import { useEffect, useRef } from "react";

export default function useSocket(onMessage) {
  const ws = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket("wss://sayanexpress.superfastmind.com/ws/test");

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