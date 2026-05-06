import { COLOR_HEX } from './game-types.js';
import type { GameState } from './game-types.js';

interface Props {
  state: GameState;
  selfId: string | null;
}

export function Scoreboard({ state, selfId }: Props) {
  const cfg = state.config;
  const hasTimer = cfg.roundDuration > 0;
  const isDM = cfg.gameMode === 'deathmatch';
  const multiRound = cfg.totalRounds > 1;

  const sorted = [...state.players].sort((a, b) => {
    if (a.alive !== b.alive) return a.alive ? -1 : 1;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.itTime - b.itTime;
  });

  return (
    <div style={{ background: 'rgba(15,10,40,.92)', border: '1px solid #a86bff', borderRadius: 12, padding: '14px 18px', color: '#fff', minWidth: 240, boxShadow: '0 0 24px rgba(168,107,255,.35)', fontFamily: '"Segoe UI",sans-serif', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {multiRound && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, opacity: .65, letterSpacing: 1 }}>ROUND</span>
          <span style={{ fontWeight: 900, fontSize: 18 }}>{state.currentRound} / {cfg.totalRounds}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, opacity: .65, letterSpacing: 1 }}>{hasTimer ? 'TIME' : isDM ? 'DEATHMATCH' : 'NO TIMER'}</span>
        {hasTimer ? (
          <span style={{ fontWeight: 900, fontSize: 30, color: state.timeRemaining <= 10 ? '#ff3b6b' : '#7df9ff', textShadow: '0 0 12px currentColor' }}>
            {state.status === 'playing' ? `${state.timeRemaining}s` : state.status === 'ended' ? 'OVER' : '—'}
          </span>
        ) : (
          <span style={{ fontWeight: 800, fontSize: 20, color: state.status === 'ended' ? '#ff3b6b' : '#a86bff' }}>
            {state.status === 'ended' ? 'OVER' : state.status === 'playing' ? '∞' : '—'}
          </span>
        )}
      </div>

      <div style={{ fontSize: 11, opacity: .5, marginBottom: 10 }}>{cfg.mapId?.toUpperCase()} · {cfg.numIt} IT · {isDM ? '💀 Deathmatch' : '🏷 Tag'}</div>

      <div style={{ display: 'flex', fontSize: 11, opacity: .6, letterSpacing: 1, marginBottom: 4, borderBottom: '1px solid rgba(255,255,255,.08)', paddingBottom: 4 }}>
        <div style={{ flex: 1 }}>PLAYER</div>
        {multiRound && <div style={{ width: 36, textAlign: 'center' }}>WINS</div>}
        <div style={{ width: 44, textAlign: 'right' }}>IT-TIME</div>
      </div>

      {sorted.map((p, idx) => {
        const isLoser = state.status === 'ended' && p.id === state.loserId;
        const isLeader = multiRound && idx === 0 && p.wins > 0;
        const dead = !p.alive;
        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,.06)', opacity: dead ? 0.45 : 1 }}>
            <div style={{ width: 11, height: 11, borderRadius: '50%', flexShrink: 0, background: COLOR_HEX[p.color], boxShadow: `0 0 7px ${COLOR_HEX[p.color]}`, marginRight: 8 }} />
            <div style={{ flex: 1, fontWeight: 600, fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isLeader ? '🥇 ' : ''}{p.name}{p.id === selfId ? ' (you)' : ''}{p.isIt && p.alive ? ' 👑' : ''}{dead ? ' 💀' : ''}{isLoser ? ' ❌' : ''}
            </div>
            {multiRound && <div style={{ width: 36, textAlign: 'center', fontWeight: 800, color: p.wins > 0 ? '#ffe53b' : 'rgba(255,255,255,.4)', fontSize: 14 }}>{p.wins}</div>}
            <div style={{ width: 44, textAlign: 'right', fontVariantNumeric: 'tabular-nums', opacity: .8, fontSize: 12 }}>{(p.itTime / 1000).toFixed(1)}s</div>
          </div>
        );
      })}
    </div>
  );
}
