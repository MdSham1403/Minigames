import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../api/axios';
import sounds from '../utils/sounds';

const W = 360, H = 500;
const GRAVITY = 0.45, JUMP = -8, PIPE_W = 52, GAP = 150, PIPE_SPEED = 2.8;

const FlappyBird = ({ onBack }) => {
  const canvasRef = useRef(null);
  const state     = useRef(null);
  const rafRef    = useRef(null);
  const [status, setStatus]   = useState('idle');
  const [score, setScore]     = useState(0);
  const [best, setBest]       = useState(0);
  const [saving, setSaving]   = useState(false);

  const initState = () => ({
    bird: { x: 80, y: H / 2, vy: 0, r: 16 },
    pipes: [],
    score: 0,
    frame: 0,
    alive: true,
  });

  const jump = useCallback(() => {
    if (state.current && state.current.alive) {
      state.current.bird.vy = JUMP;
    }
  }, []);

  const endGame = useCallback(async (finalScore) => {
    cancelAnimationFrame(rafRef.current);
    setStatus('dead');
    setBest(b => Math.max(b, finalScore));
    setSaving(true);
    try { await api.post('/scores', { gameName: 'flappy', score: finalScore, mode: 'single' }); } catch {}
    setSaving(false);
  }, []);

  const loop = useCallback(() => {
    const s = state.current;
    const canvas = canvasRef.current;
    if (!s || !canvas) return;
    const ctx = canvas.getContext('2d');

    s.frame++;
    // Spawn pipes
    if (s.frame % 90 === 0) {
      const top = 60 + Math.random() * (H - GAP - 120);
      s.pipes.push({ x: W, top, scored: false });
    }

    // Update bird
    s.bird.vy += GRAVITY;
    s.bird.y  += s.bird.vy;

    // Update pipes
    s.pipes.forEach(p => { p.x -= PIPE_SPEED; });
    s.pipes = s.pipes.filter(p => p.x > -PIPE_W);

    // Score
    s.pipes.forEach(p => {
      if (!p.scored && p.x + PIPE_W < s.bird.x) {
        p.scored = true;
        s.score++;
        setScore(s.score);
      }
    });

    // Collision
    const { x, y, r } = s.bird;
    if (y - r < 0 || y + r > H) { endGame(s.score); return; }
    for (const p of s.pipes) {
      if (x + r > p.x && x - r < p.x + PIPE_W) {
        if (y - r < p.top || y + r > p.top + GAP) { endGame(s.score); return; }
      }
    }

    // Draw
    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0f172a'); sky.addColorStop(1, '#1e3a5f');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    // Ground
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(0, H - 20, W, 20);
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(0, H - 24, W, 4);

    // Pipes
    s.pipes.forEach(p => {
      // Top pipe
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(p.x, 0, PIPE_W, p.top);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(p.x - 4, p.top - 24, PIPE_W + 8, 24);
      // Bottom pipe
      const bot = p.top + GAP;
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(p.x, bot, PIPE_W, H - bot);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(p.x - 4, bot, PIPE_W + 8, 24);
    });

    // Bird body
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.min(Math.max(s.bird.vy * 0.06, -0.5), 1));
    ctx.fillStyle = '#facc15';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    // Wing
    ctx.fillStyle = '#fde68a';
    ctx.beginPath(); ctx.ellipse(-4, 4, 10, 6, 0.3, 0, Math.PI * 2); ctx.fill();
    // Eye
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(6, -4, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(8, -4, 2.5, 0, Math.PI * 2); ctx.fill();
    // Beak
    ctx.fillStyle = '#f97316';
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(20, -3); ctx.lineTo(20, 3); ctx.closePath(); ctx.fill();
    ctx.restore();

    // Score HUD
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(W/2-30, 10, 60, 32);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Inter,sans-serif';
    ctx.textAlign = 'center'; ctx.fillText(s.score, W/2, 32);

    rafRef.current = requestAnimationFrame(loop);
  }, [endGame]);

  const startGame = () => {
    cancelAnimationFrame(rafRef.current);
    state.current = initState();
    setScore(0);
    setStatus('playing');
    rafRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    // Keyboard & touch
    const onKey = (e) => { if (e.code === 'Space' || e.key === 'ArrowUp') { e.preventDefault(); jump(); } };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); cancelAnimationFrame(rafRef.current); };
  }, [jump]);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex gap-6 text-center">
        <div><p className="text-xs text-gray-500">Score</p><p className="text-2xl font-bold text-indigo-400">{score}</p></div>
        <div><p className="text-xs text-gray-500">Best</p><p className="text-2xl font-bold text-yellow-400">{best}</p></div>
      </div>

      <div className="relative cursor-pointer" onClick={jump}>
        <canvas ref={canvasRef} width={W} height={H}
          className="rounded-2xl border border-gray-800" style={{ imageRendering: 'pixelated' }} />

        {status !== 'playing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/80 rounded-2xl gap-4">
            <p className="text-5xl">🐦</p>
            <h2 className="text-2xl font-bold text-white">{status === 'dead' ? 'Game Over!' : 'Flappy Bird'}</h2>
            {status === 'dead' && <p className="text-gray-400">Score: <span className="text-indigo-400 font-bold">{score}</span></p>}
            {status === 'idle' && <p className="text-gray-400 text-sm">Tap / Space to flap</p>}
            {saving && <p className="text-xs text-gray-500">Saving...</p>}
            <button onClick={e => { e.stopPropagation(); startGame(); }} className="btn-primary px-8 py-3 text-lg">
              {status === 'dead' ? '🔄 Try again' : '▶ Start'}
            </button>
          </div>
        )}
      </div>
      <p className="text-gray-600 text-sm">Tap canvas · Space · Arrow Up</p>
      <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Back to lobby</button>
    </div>
  );
};

export default FlappyBird;