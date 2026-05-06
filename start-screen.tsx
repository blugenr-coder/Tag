import { useState } from 'react';

interface Props { onJoin: (name: string) => void; }

export function StartScreen({ onJoin }: Props) {
  const [name, setName] = useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (n) onJoin(n);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at 30% 20%, #2a0a4e 0%, #0b0d24 60%, #000 100%)', fontFamily: '"Segoe UI", sans-serif', color: '#fff', padding: 20 }}>
      <form onSubmit={submit} style={{ background: 'rgba(15, 10, 40, 0.85)', border: '1px solid #a86bff', borderRadius: 16, padding: '40px 50px', textAlign: 'center', boxShadow: '0 0 60px rgba(168, 107, 255, 0.5)', maxWidth: 480, width: '100%' }}>
        <h1 style={{ fontSize: 56, margin: 0, fontWeight: 900, letterSpacing: 2, background: 'linear-gradient(90deg, #ff3b6b, #ffe53b, #3bff8f, #3bc6ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>COLOR TAG</h1>
        <p style={{ opacity: 0.8, marginTop: 8, marginBottom: 24, fontSize: 14 }}>Real-time multiplayer tag. Don't be IT when the timer ends.</p>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={16} placeholder="Your name" style={{ width: '100%', padding: '14px 16px', fontSize: 18, borderRadius: 8, border: '2px solid #a86bff', background: 'rgba(0,0,0,0.4)', color: '#fff', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />
        <button type="submit" disabled={!name.trim()} style={{ width: '100%', padding: '14px 16px', fontSize: 18, fontWeight: 800, borderRadius: 8, border: 'none', background: 'linear-gradient(90deg, #ff3b6b, #a86bff)', color: '#fff', cursor: name.trim() ? 'pointer' : 'not-allowed', opacity: name.trim() ? 1 : 0.5, letterSpacing: 1, boxShadow: '0 0 24px rgba(168, 107, 255, 0.6)' }}>JOIN GAME</button>
        <div style={{ marginTop: 24, fontSize: 13, opacity: 0.7, textAlign: 'left', lineHeight: 1.7 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, opacity: 1 }}>HOW TO PLAY</div>
          <div>Mouse / WASD to move</div>
          <div>Click to dash</div>
          <div>If you're IT, chase someone to tag them</div>
          <div>Pick up speed, shield, dash, and freeze boosters</div>
        </div>
      </form>
    </div>
  );
}
