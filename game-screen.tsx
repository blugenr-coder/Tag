import { useEffect, useRef, useState } from 'react';
import { GameCanvas } from './game-canvas.js';
import { Scoreboard } from './scoreboard.js';
import { COLOR_HEX } from './game-types.js';
import type { GameState } from './game-types.js';

interface Props {
  state: GameState | null;
  selfId: string | null;
  flashes: { x: number; y: number; color: string; born: number }[];
  roomName?: string;
  roomCode?: string;
  sendInput: (input: { up: boolean; down: boolean; left: boolean; right: boolean; dash: boolean }) => void;
  onRestart: () => void;
  onLeaveRoom: () => void;
}

export function GameScreen({ state, selfId, flashes, roomName, roomCode, sendInput, onRestart, onLeaveRoom }: Props) {
  const inputRef = useRef({ up: false, down: false, left: false, right: false, dash: false });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dashAiming, setDashAiming] = useState(false);
  const [aimLine, setAimLine] = useState<{ x1:number; y1:number; x2:number; y2:number } | null>(null);
  const dashDirRef = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    const update = () => sendInput({ ...inputRef.current });
    const onMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      const me = state?.players.find((p) => p.id === selfId);
      if (!me) return;
      const dx = mx - me.x;
      const dy = my - me.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 15) {
        if (inputRef.current.up || inputRef.current.down || inputRef.current.left || inputRef.current.right) {
          inputRef.current.up = inputRef.current.down = inputRef.current.left = inputRef.current.right = false;
          update();
        }
        return;
      }
      const nx = dx / dist;
      const ny = dy / dist;
      const newUp = ny < -0.25;
      const newDown = ny > 0.25;
      const newLeft = nx < -0.25;
      const newRight = nx > 0.25;
      if (newUp !== inputRef.current.up || newDown !== inputRef.current.down || newLeft !== inputRef.current.left || newRight !== inputRef.current.right) {
        inputRef.current.up = newUp;
        inputRef.current.down = newDown;
        inputRef.current.left = newLeft;
        inputRef.current.right = newRight;
        update();
      }
      if (dashAiming) {
        dashDirRef.current = { dx: nx, dy: ny };
        setAimLine({ x1: me.x, y1: me.y, x2: me.x + nx * 80, y2: me.y + ny * 80 });
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [selfId, state, dashAiming, sendInput]);

  useEffect(() => {
    const update = () => sendInput({ ...inputRef.current });
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['w','s','a','d',' ','shift'].includes(k)) e.preventDefault();
      let ch = false;
      if (k === 'w' && !inputRef.current.up) { inputRef.current.up = true; ch = true; }
      if (k === 's' && !inputRef.current.down) { inputRef.current.down = true; ch = true; }
      if (k === 'a' && !inputRef.current.left) { inputRef.current.left = true; ch = true; }
      if (k === 'd' && !inputRef.current.right) { inputRef.current.right = true; ch = true; }
      if ((k === ' ' || k === 'shift') && !inputRef.current.dash) { inputRef.current.dash = true; ch = true; }
      if (ch) update();
    };
    const onUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      let ch = false;
      if (k === 'w' && inputRef.current.up) { inputRef.current.up = false; ch = true; }
      if (k === 's' && inputRef.current.down) { inputRef.current.down = false; ch = true; }
      if (k === 'a' && inputRef.current.left) { inputRef.current.left = false; ch = true; }
      if (k === 'd' && inputRef.current.right) { inputRef.current.right = false; ch = true; }
      if ((k === ' ' || k === 'shift') && inputRef.current.dash) { inputRef.current.dash = false; ch = true; }
      if (ch) update();
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, [sendInput]);

  const fireDash = () => {
    setDashAiming(false);
    setAimLine(null);
    const dir = dashDirRef.current;
    if (!dir) return;
    inputRef.current.up = dir.dy < -0.25;
    inputRef.current.down = dir.dy > 0.25;
    inputRef.current.left = dir.dx < -0.25;
    inputRef.current.right = dir.dx > 0.25;
    inputRef.current.dash = true;
    sendInput({ ...inputRef.current });
    setTimeout(() => { inputRef.current.dash = false; sendInput({ ...inputRef.current }); }, 60);
    dashDirRef.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setDashAiming(true);
    const canvas = canvasRef.current;
    const me = state?.players.find((p) => p.id === selfId);
    if (!canvas || !me) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    const dx = mx - me.x, dy = my - me.y;
    const d = Math.hypot(dx, dy) || 1;
    dashDirRef.current = { dx: dx / d, dy: dy / d };
    setAimLine({ x1: me.x, y1: me.y, x2: me.x + (dx / d) * 80, y2: me.y + (dy / d) * 80 });
  };

  const itPlayer = state?.players.find((p) => p.isIt);
  const loserPlayer = state?.players.find((p) => p.id === state?.loserId);
  const me = state?.players.find((p) => p.id === selfId);

  return (
    <div style={{ height: '100vh', overflow: 'hidden', background: 'radial-gradient(circle at 30% 20%, #2a0a4e 0%, #0b0d24 60%, #000 100%)', padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, fontFamily: '"Segoe UI", sans-serif', color: '#fff', boxSizing: 'border-box', cursor: 'none', userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', maxWidth: 1500, flexWrap: 'wrap' }}>
        <button onClick={onLeaveRoom} style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', border: '1px solid rgba(168,107,255,.5)', background: 'rgba(0,0,0,.3)', color: '#fff', fontWeight: 600, fontSize: 13 }}>← Leave</button>
        <h1 style={{ fontSize: 26, margin: 0, fontWeight: 900, letterSpacing: 2, background: 'linear-gradient(90deg,#ff3b6b,#ffe53b,#3bff8f,#3bc6ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>COLOR TAG</h1>
        {roomName && <div style={{ fontSize: 14, opacity: .85 }}><span style={{ opacity: .6 }}>Room:</span> <b>{roomName}</b>{roomCode && <span style={{ marginLeft: 8, padding: '4px 10px', borderRadius: 4, background: 'rgba(168,107,255,.15)', border: '1px solid rgba(168,107,255,.5)', fontSize: 12, letterSpacing: 2, fontWeight: 800, color: '#c49aff' }}>🔒 {roomCode}</span>}</div>}
        {itPlayer && state?.status === 'playing' && <div style={{ padding: '8px 16px', borderRadius: 8, fontWeight: 800, background: COLOR_HEX[itPlayer.color], color: '#000', boxShadow: `0 0 24px ${COLOR_HEX[itPlayer.color]}` }}>👑 IT: {itPlayer.name}</div>}
        {state && state.config.roundDuration > 0 && <div style={{ padding: '6px 18px', borderRadius: 8, background: 'rgba(0,0,0,.45)', border: `1px solid ${state.timeRemaining <= 10 && state.status === 'playing' ? '#ff3b6b' : 'rgba(125,249,255,.4)'}`, fontWeight: 900, fontSize: 22, minWidth: 70, textAlign: 'center', color: state.timeRemaining <= 10 && state.status === 'playing' ? '#ff3b6b' : '#7df9ff', textShadow: '0 0 12px currentColor' }}>{state.status === 'ended' ? 'OVER' : state.status === 'waiting' ? '–' : `${state.timeRemaining}s`}</div>}
        <div style={{ marginLeft: 'auto', fontSize: 12, opacity: .55 }}>Move mouse · click to dash</div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center', flex: 1, minHeight: 0, width: '100%' }}>
        <div style={{ position: 'relative', flex: '1 1 auto', minWidth: 0, minHeight: 0 }} onMouseDown={handleMouseDown} onMouseUp={fireDash}>
          <GameCanvas state={state} selfId={selfId} flashes={flashes} canvasRefOut={canvasRef} aimLine={aimLine} dashAiming={dashAiming} />
          {state?.status === 'ended' && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.75)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <div style={{ fontSize: 48, fontWeight: 900 }}>GAME OVER</div>
              {loserPlayer && <div style={{ fontSize: 24 }}><span style={{ color: COLOR_HEX[loserPlayer.color] }}>{loserPlayer.name}</span> was IT longest 💀</div>}
              <button onClick={onRestart} style={{ padding: '14px 32px', fontSize: 18, fontWeight: 800, borderRadius: 8, border: 'none', background: 'linear-gradient(90deg,#ff3b6b,#a86bff)', color: '#fff', cursor: 'pointer', boxShadow: '0 0 24px rgba(168,107,255,.6)' }}>PLAY AGAIN</button>
            </div>
          )}
          {state?.status === 'waiting' && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, textAlign: 'center', padding: 20, gap: 8 }}>
              Waiting for players...
              <span style={{ fontSize: 14, opacity: .7, fontWeight: 400 }}>Invite someone with the room name or private code</span>
            </div>
          )}
        </div>
        {state && <Scoreboard state={state} selfId={selfId} />}
      </div>

      {state?.status === 'playing' && state.config.gameMode === 'deathmatch' && me && !me.alive && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 80, zIndex: 20 }}>
          <div style={{ background: 'rgba(0,0,0,.75)', border: '1px solid rgba(255,59,107,.5)', borderRadius: 12, padding: '14px 28px', textAlign: 'center', fontFamily: '"Segoe UI",sans-serif', color: '#fff' }}>
            <div style={{ fontSize: 32, marginBottom: 4 }}>💀</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>You were eliminated</div>
            <div style={{ fontSize: 13, opacity: .7 }}>Spectating until round ends...</div>
          </div>
        </div>
      )}
    </div>
  );
}
