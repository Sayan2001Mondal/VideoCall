export default function JoinRoom({ name, setName, roomId, setRoomId, onJoin }) {
  return (
    <div className="container">
      <h2>Join Chat Room</h2>

      <input
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        placeholder="Room ID"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
      />

      <button onClick={onJoin}>Join</button>
    </div>
  );
}