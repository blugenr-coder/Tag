import { useState } from 'react';
import { MAP_INFO } from './game-types.js';
import type { GameMode, MapId, RoomMode, RoomSummary } from './game-types.js';

interface CreateOpts {
  roomName: string; mode: RoomMode; gameMode: GameMode; maxPlayers: number; isPrivate: boolean;
  roundDuration: number; numIt: number; mapId: MapId; totalRounds: number;
}
interface Props {
  playerName: string; rooms: RoomSummary[]; error: string | null; onRefresh: () => void; onChangeName: () => void;
  onJoinRoom: (roomId: string) => void; onJoinByCode: (code: string) => void; onCreateRoom: (opts: CreateOpts) => void;
}

export function LobbyScreen({ playerName, rooms, error, onRefresh, onChangeName, onJoinRoom, onJoinByCode, onCreateRoom }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeErr, setCodeErr] = useState('');

  const quickPlay = () => onCreateRoom({ roomName: `${playerName}'s Room`, mode: 'standard', gameMode: 'tag', maxPlayers: 4, isPrivate: false, roundDuration: 75, numIt: 1, mapId: 'classic', totalRounds: 1 });

  const handleCode = (e: React.FormEvent) => {
    e.preventDefault();
    const c = codeInput.trim().toUpperCase();
    if (c.length < 4) { setCodeErr('Must be 4 characters'); return; }
    setCodeErr(''); onJoinByCode(c);
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#fff', fontFamily: FONT, padding: 30 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <h1 style={{ fontSize: 36, margin: 0, fontWeight: 900, letterSpacing: 2, background: 'linear-gradient(90deg,#ff3b6b,#ffe53b,#3bff8f,#3bc6ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>COLOR TAG</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ opacity: .8 }}>Hi, <b>{playerName}</b></span>
            <button onClick={onChangeName} style={chipBtn}>Change</button>
          </div>
        </div>

        {error && <Err msg={error} />}

        <div style={{ background: 'rgba(168,107,255,.1)', border: '1px solid rgba(168,107,255,.35)', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>🔒 Have a private code?</div>
          <form onSubmit={handleCode} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase().slice(0, 4))} placeholder="XXXX" maxLength={4} style={{ ...inputSt, width: 90, fontSize: 20, textAlign: 'center', fontWeight: 800, letterSpacing: 4 }} />
            <button type="submit" style={primaryBtn}>Join →</button>
            {codeErr && <span style={{ color: '#ff3b6b', fontSize: 13 }}>{codeErr}</span>}
          </form>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Rooms <button onClick={onRefresh} style={chipBtn}>↻</button></h2>
          <button onClick={() => setShowCreate(true)} style={primaryBtn}>+ Create Room</button>
        </div>

        {rooms.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', border: '1px dashed rgba(168,107,255,.5)', borderRadius: 12 }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>Nobody's playing right now.</div>
            <div style={{ opacity: .7, marginBottom: 20, fontSize: 14 }}>Create a room and invite friends.</div>
            <button onClick={quickPlay} style={primaryBtn}>⚡ Quick Play</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rooms.map((r) => <RoomRow key={r.id} room={r} onJoin={() => onJoinRoom(r.id)} />)}
          </div>
        )}
      </div>
      {showCreate && <CreateRoomDialog playerName={playerName} onCancel={() => setShowCreate(false)} onCreate={(opts) => { setShowCreate(false); onCreateRoom(opts); }} />}
    </div>
  );
}

function Err({ msg }: { msg: string }) {
  return <div style={{ background: 'rgba(255,59,107,.15)', border: '1px solid rgba(255,59,107,.6)', padding: '10px 14px', borderRadius: 8, marginBottom: 14 }}>⚠ {msg}</div>;
}
function RoomRow({ room, onJoin }: { room: RoomSummary; onJoin: () => void }) {
  const full = room.players >= room.maxPlayers;
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', background: 'rgba(15,10,40,.7)', border: '1px solid rgba(168,107,255,.3)', borderRadius: 10 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{room.name}{room.mode === 'custom' && <span style={tag('#ffe53b')}>🌟 CUSTOM</span>}</div>
        <div style={{ fontSize: 12, opacity: .7, marginTop: 3 }}>{room.players}/{room.maxPlayers} players · {room.status}</div>
      </div>
      <button onClick={onJoin} disabled={full} style={{ ...primaryBtn, background: full ? 'rgba(255,255,255,.1)' : primaryBtn.background, cursor: full ? 'not-allowed' : 'pointer' }}>{full ? 'Full' : 'Join →'}</button>
    </div>
  );
}

function CreateRoomDialog({ playerName, onCancel, onCreate }: { playerName: string; onCancel: () => void; onCreate: (opts: CreateOpts) => void; }) {
  const [roomName, setRoomName] = useState(`${playerName}'s Room`);
  const [mode, setMode] = useState<RoomMode>('standard');
  const [gameMode, setGameMode] = useState<GameMode>('tag');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isPrivate, setIsPrivate] = useState(false);
  const [roundDuration, setRoundDuration] = useState(75);
  const [numIt, setNumIt] = useState(1);
  const [mapId, setMapId] = useState<MapId>('classic');
  const [totalRounds, setTotalRounds] = useState(1);
  const cap = mode === 'custom' ? 8 : 4;
  const safeMax = Math.min(cap, maxPlayers);

  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#0f0a28', border: '1px solid #a86bff', borderRadius: 16, padding: 28, width: 'min(560px,92vw)', color: '#fff', boxShadow: '0 0 50px rgba(168,107,255,.55)', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ margin: '0 0 16px' }}>Create Room</h2>
        <Field label="Room Name"><input value={roomName} onChange={(e) => setRoomName(e.target.value)} maxLength={24} style={inputSt} /></Field>
        <Field label="Mode"><div style={{ display: 'flex', gap: 8 }}><Pill active={mode === 'standard'} onClick={() => { setMode('standard'); if (maxPlayers > 4) setMaxPlayers(4); }} title="Standard" sub="4 players" /><Pill active={mode === 'custom'} onClick={() => setMode('custom')} title="🌟 Custom" sub="up to 8 players" /></div></Field>
        <Field label="Visibility"><div style={{ display: 'flex', gap: 8 }}><Pill active={!isPrivate} onClick={() => setIsPrivate(false)} title="🌐 Public" sub="Room list" /><Pill active={isPrivate} onClick={() => setIsPrivate(true)} title="🔒 Private" sub="Code only" /></div></Field>
        <Field label={`Max Players: ${safeMax}`}><input type="range" min={2} max={cap} value={safeMax} onChange={(e) => setMaxPlayers(+e.target.value)} style={{ width: '100%' }} /></Field>
        <Field label="Game Mode"><div style={{ display: 'flex', gap: 8 }}><Pill active={gameMode === 'tag'} onClick={() => setGameMode('tag')} title="🏷 Classic Tag" sub="Most IT-time loses" /><Pill active={gameMode === 'deathmatch'} onClick={() => setGameMode('deathmatch')} title="💀 Deathmatch" sub="Tagged = eliminated" /></div></Field>
        <Field label={`Round Timer: ${roundDuration}s`}><input type="range" min={30} max={300} step={15} value={roundDuration} onChange={(e) => setRoundDuration(+e.target.value)} style={{ width: '100%' }} /></Field>
        <Field label={`Number of IT players: ${numIt}`}><input type="range" min={1} max={Math.max(1, Math.floor(safeMax / 2))} value={numIt} onChange={(e) => setNumIt(+e.target.value)} style={{ width: '100%' }} /></Field>
        <Field label={`Rounds: ${totalRounds}`}><input type="range" min={1} max={10} value={totalRounds} onChange={(e) => setTotalRounds(+e.target.value)} style={{ width: '100%' }} /></Field>
        <Field label="Map"><div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{(Object.entries(MAP_INFO) as [MapId, { label: string; desc: string }][]).map(([id, info]) => <button key={id} onClick={() => setMapId(id)} style={{ textAlign: 'left', padding: '10px 14px', borderRadius: 8, border: mapId === id ? '2px solid #a86bff' : '1px solid rgba(255,255,255,.2)', background: mapId === id ? 'rgba(168,107,255,.2)' : 'rgba(0,0,0,.3)', color: '#fff', cursor: 'pointer' }}><div style={{ fontWeight: 700 }}>{info.label}</div><div style={{ fontSize: 12, opacity: .7 }}>{info.desc}</div></button>)}</div></Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}><button onClick={onCancel} style={chipBtn}>Cancel</button><button onClick={() => onCreate({ roomName, mode, gameMode, maxPlayers: safeMax, isPrivate, roundDuration, numIt, mapId, totalRounds })} style={primaryBtn}>Create & Join</button></div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div style={{ marginBottom: 16 }}><div style={{ fontSize: 13, opacity: .75, marginBottom: 6 }}>{label}</div>{children}</div>; }
function Pill({ active, onClick, title, sub }: { active: boolean; onClick: () => void; title: string; sub: string }) { return <button onClick={onClick} style={{ flex: 1, padding: '10px 12px', textAlign: 'left', borderRadius: 8, border: active ? '1px solid #a86bff' : '1px solid rgba(255,255,255,.2)', background: active ? 'rgba(168,107,255,.2)' : 'rgba(0,0,0,.3)', color: '#fff', cursor: 'pointer' }}><div style={{ fontWeight: 700 }}>{title}</div><div style={{ fontSize: 11, opacity: .7 }}>{sub}</div></button>; }
function tag(color: string): React.CSSProperties { return { fontSize: 11, padding: '2px 8px', borderRadius: 4, background: `${color}22`, border: `1px solid ${color}88`, marginLeft: 8 }; }

const BG = 'radial-gradient(circle at 30% 20%, #2a0a4e 0%, #0b0d24 60%, #000 100%)';
const FONT = '"Segoe UI", sans-serif';
const inputSt: React.CSSProperties = { width: '100%', padding: '10px 12px', fontSize: 15, borderRadius: 6, border: '1px solid #a86bff', background: 'rgba(0,0,0,.4)', color: '#fff', outline: 'none', boxSizing: 'border-box' };
const primaryBtn: React.CSSProperties = { padding: '10px 20px', fontWeight: 800, borderRadius: 8, border: 'none', background: 'linear-gradient(90deg,#ff3b6b,#a86bff)', color: '#fff', cursor: 'pointer', boxShadow: '0 0 16px rgba(168,107,255,.5)' };
const chipBtn: React.CSSProperties = { padding: '7px 14px', fontWeight: 600, borderRadius: 6, border: '1px solid rgba(168,107,255,.5)', background: 'rgba(0,0,0,.3)', color: '#fff', cursor: 'pointer' };
