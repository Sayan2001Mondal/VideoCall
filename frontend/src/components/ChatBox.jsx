export default function ChatBox({ messages, currentUser }) {
  return (
    <div
      style={{
        height: 300,
        overflowY: "auto",
        background: "#020617",
        padding: 10,
        borderRadius: 10,
        marginBottom: 10,
      }}
    >
      {messages.map((m, i) => {
        const isMe = m.sender === currentUser;

        return (
          <div
            key={i}
            style={{
              textAlign: isMe ? "right" : "left",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                display: "inline-block",
                padding: "8px 12px",
                borderRadius: 10,
                background: isMe ? "#3b82f6" : "#334155",
              }}
            >
              <b>{m.sender || "System"}:</b> {m.message}
            </span>
          </div>
        );
      })}
    </div>
  );
}