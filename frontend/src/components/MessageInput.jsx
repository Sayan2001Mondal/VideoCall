import { useState } from "react";

export default function MessageInput({ onSend }) {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  return (
    <div style={{ display: "flex", gap: 10 }}>
      <input
        style={{ flex: 1 }}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder="Type message..."
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}