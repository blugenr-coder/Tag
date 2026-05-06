import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { StartScreen } from './start-screen.js';
import { LobbyScreen } from './lobby-screen.js';
import { GameScreen } from './game-screen.js';
import { useGameSocket } from './use-game-socket.js';

export function ColorTagApp() {
  return <Routes><Route path="/" element={<ColorTagRoot />} /></Routes>;
}

function ColorTagRoot() {
  const [name, setName] = useState<string | null>(null);
  const conn = useGameSocket(name);

  if (!name) return <StartScreen onJoin={setName} />;

  if (!conn.connected && !conn.state) {
    return <StatusScreen message="Connecting to server..." onBack={() => setName(null)} />;
  }

  if (!conn.joinedRoom) {
    return (
      <LobbyScreen
        playerName={name}
        rooms={conn.rooms}
        error={conn.error}
        onRefresh={conn.refreshRooms}
        onCreateRoom={(opts) => conn.createRoom(opts)}
        onJoinRoom={conn.joinRoom}
        onJoinByCode={conn.joinByCode}
        onChangeName={() => setName(null)}
      />
    );
  }

  return (
    <GameScreen
      state={conn.state}
      selfId={conn.selfId}
      flashes={conn.flashes}
      roomName={conn.joinedRoom.roomName}
      roomCode={conn.joinedRoom.code}
      sendInput={conn.sendInput}
      onRestart={conn.restart}
      onLeaveRoom={conn.leaveRoom}
    />
  );
}

function StatusScreen({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'radial-gradient(circle at 30% 20%, #2a0a4e 0%, #0b0d24 60%, #000 100%)', color: '#fff', fontFamily: '"Segoe UI",sans-serif' }}>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{message}</div>
      <button onClick={onBack} style={{ padding: '12px 24px', background: 'linear-gradient(90deg,#ff3b6b,#a86bff)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>Back</button>
      <div style={{ opacity: 0.7, maxWidth: 520, textAlign: 'center' }}>Run the multiplayer server with <b>npm run server</b>. The Vite preview alone cannot host WebSockets.</div>
    </div>
  );
}
