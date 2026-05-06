import { useEffect, useRef } from 'react';
import { COLOR_HEX } from './game-types.js';
import type { BoosterType, GameState } from './game-types.js';

interface Props {
  state: GameState | null;
  selfId: string | null;
  flashes: { x: number; y: number; color: string; born: number }[];
  canvasRefOut?: React.MutableRefObject<HTMLCanvasElement | null>;
  aimLine?: { x1: number; y1: number; x2: number; y2: number } | null;
  dashAiming?: boolean;
}

const PLAYER_RADIUS = 22;
const MAP_COLORS = {
  classic: { bg0: '#0b0d24', bg1: '#1a0a2e', grid: 'rgba(255,255,255,0.04)' },
  bounce: { bg0: '#0a1a1e', bg1: '#031220', grid: 'rgba(0,200,255,0.05)' },
  maze: { bg0: '#140a0a', bg1: '#1e0510', grid: 'rgba(255,80,0,0.04)' },
};

export function GameCanvas({ state, selfId, flashes, canvasRefOut, aimLine, dashAiming }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (canvasRefOut && canvasRef.current) canvasRefOut.current = canvasRef.current;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const cur = state;
      if (!cur) { rafRef.current = requestAnimationFrame(draw); return; }

      const W = cur.arenaWidth, H = cur.arenaHeight;
      canvas.width = W; canvas.height = H;
      if (canvasRefOut) canvasRefOut.current = canvas;
      const theme = MAP_COLORS[cur.config?.mapId ?? 'classic'];

      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, theme.bg0); bg.addColorStop(1, theme.bg1);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = theme.grid; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

      ctx.fillStyle = '#2a1a4a'; ctx.strokeStyle = '#8855cc'; ctx.lineWidth = 2;
      for (const wall of cur.walls) { ctx.fillRect(wall.x, wall.y, wall.w, wall.h); ctx.strokeRect(wall.x, wall.y, wall.w, wall.h); }

      for (const b of cur.bouncers) {
        const pulse = 1 + 0.1 * Math.sin(performance.now() / 250 + b.x);
        const r = b.r * pulse;
        const grad = ctx.createRadialGradient(b.x, b.y, r * 0.2, b.x, b.y, r);
        grad.addColorStop(0, 'rgba(59,255,143,0.65)');
        grad.addColorStop(0.5, 'rgba(59,255,143,0.2)');
        grad.addColorStop(1, 'rgba(59,255,143,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.shadowColor = '#3bff8f'; ctx.shadowBlur = 20; ctx.strokeStyle = '#3bff8f'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.6, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }

      for (const b of cur.boosters) drawBooster(ctx, b.x, b.y, b.type);

      for (const p of cur.players) {
        const ix = p.x, iy = p.y;
        if (!p.alive && cur.config?.gameMode === 'deathmatch') {
          ctx.globalAlpha = 0.22; ctx.fillStyle = COLOR_HEX[p.color]; ctx.beginPath(); ctx.arc(ix, iy, PLAYER_RADIUS * 0.8, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
          ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('💀', ix, iy - PLAYER_RADIUS);
          continue;
        }

        if (p.isIt) {
          ctx.save(); ctx.shadowColor = '#fff'; ctx.shadowBlur = 30; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(ix, iy, PLAYER_RADIUS + 8, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        }

        ctx.save(); ctx.shadowColor = COLOR_HEX[p.color]; ctx.shadowBlur = 18; ctx.fillStyle = COLOR_HEX[p.color];
        ctx.beginPath(); ctx.arc(ix, iy, PLAYER_RADIUS, 0, Math.PI * 2); ctx.fill(); ctx.restore();

        ctx.fillStyle = 'rgba(255,255,255,.3)';
        ctx.beginPath(); ctx.arc(ix - 6, iy - 7, PLAYER_RADIUS * 0.35, 0, Math.PI * 2); ctx.fill();

        if (p.id === selfId) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(ix, iy, PLAYER_RADIUS + 4, 0, Math.PI * 2); ctx.stroke(); }
        if (p.shield) { ctx.strokeStyle = '#7df9ff'; ctx.lineWidth = 3; ctx.setLineDash([5,4]); ctx.beginPath(); ctx.arc(ix, iy, PLAYER_RADIUS + 9, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
        if (p.frozen) { ctx.fillStyle = 'rgba(125,249,255,.35)'; ctx.beginPath(); ctx.arc(ix, iy, PLAYER_RADIUS, 0, Math.PI * 2); ctx.fill(); }
        if (p.speedBoost) { ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⚡', ix, iy + 2); }

        const label = p.name + (p.isIt ? ' 👑' : '');
        ctx.font = 'bold 12px "Segoe UI",sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)';
        ctx.strokeText(label, ix, iy - PLAYER_RADIUS - 5);
        ctx.fillStyle = '#fff'; ctx.fillText(label, ix, iy - PLAYER_RADIUS - 5);
      }

      if (aimLine && dashAiming) {
        const { x1, y1, x2, y2 } = aimLine;
        ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.setLineDash([8, 5]); ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
      }

      const now = performance.now();
      for (const f of flashes) {
        const age = now - f.born;
        if (age > 600) continue;
        const fr = (age / 600) * 65;
        ctx.strokeStyle = `rgba(255,255,255,${1 - age / 600})`; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(f.x, f.y, fr, 0, Math.PI * 2); ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [state, selfId, flashes, canvasRefOut, aimLine, dashAiming]);

  return <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 12, boxShadow: '0 0 40px rgba(168,107,255,.5)', background: '#0b0d24', maxWidth: '100%', maxHeight: 'calc(100vh - 120px)', height: 'auto', width: 'auto', cursor: 'none' }} />;
}

function drawBooster(ctx: CanvasRenderingContext2D, x: number, y: number, type: BoosterType) {
  const colors: Record<BoosterType, string> = { speed: '#ffe53b', shield: '#7df9ff', dash: '#ff8c3b', freeze: '#a86bff' };
  const symbols: Record<BoosterType, string> = { speed: '⚡', shield: '🛡', dash: '➤', freeze: '❄' };
  const wobble = Math.sin(performance.now() / 200 + x) * 3;
  ctx.save(); ctx.shadowColor = colors[type]; ctx.shadowBlur = 15; ctx.fillStyle = colors[type]; ctx.beginPath(); ctx.arc(x, y + wobble, 14, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#0b0d24'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(symbols[type], x, y + wobble + 1);
}
