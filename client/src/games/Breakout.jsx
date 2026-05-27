import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../api/axios';
import sounds from '../utils/sounds';

const W = 400, H = 480;
const PAD_W = 80, PAD_H = 12, BALL_R = 8;
const COLS = 8, ROWS = 5, BRICK_W = 42, BRICK_H = 18, BRICK_PAD = 4;
const BRICK_START_Y = 50;
const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#6366f1','#8b5cf6','#ec4899'];

const Breakout = ({ onBack }) => {
  const canvasRef = useRef(null);
  const state     = useRef(null);
  const rafRef    = useRef(null);
  const keysRef   = useRef({ left: false, right: false });
  const [status, setStatus]   = useState('idle');
  const [score, setScore]     = useState(0);
  const [lives, setLives]     = useState(3);
  const [best, setBest]       = useState(0);
  const [saving, setSaving]   = useState(false);

  const buildBricks = () =>
    Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => ({
        x: c * (BRICK_W + BRICK_PAD) + 24,
        y: r * (BRICK_H + BRICK_PAD) + BRICK_START_Y,
        color: COLORS[(r * COLS + c) % COLORS.length],
        alive: true,
        points: (ROWS - r) * 10,
      }))
    ).flat();

  const initState = (livesLeft = 3) => {
    const angle = (Math.random() * 60 + 60) * (Math.PI / 180);
    return {
      pad: { x: W / 2 - PAD_W / 2, y: H - 40 },
      ball: { x: W / 2, y: H - 60, vx: Math.cos(angle) * 4.5, vy: -Math.sin(angle) * 4.5 },
      bricks: buildBricks(),
      score: 0,
      lives: livesLeft,
      speed: 1,
    };
  };

  const endGame = useCallback(async (finalScore, won = false) => {
    cancelAnimationFrame(rafRef.current);
    setStatus(won ? 'won' : 'dead');
    setBest(b => Math.max(b, finalScore));
    if (won) sounds.win(); else sounds.gameOver();
    setSaving(true);
    try { await api.post('/scores', { gameName: 'breakout', score: finalScore, mode: 'single' }); } catch {}
    setSaving(false);
  }, []);

  const loop = useCallback(() => {
    const s = state.current;
    const canvas = canvasRef.current;
    if (!s || !canvas) return;
    const ctx = canvas.getContext('2d');

    // Move paddle
    const speed = 7;
    if (keysRef.current.left  && s.pad.x > 0)          s.pad.x -= speed;
    if (keysRef.current.right && s.pad.x < W - PAD_W)  s.pad.x += speed;

    // Move ball
    s.ball.x += s.ball.vx;
    s.ball.y += s.ball.vy;

    // Wall collisions
    if (s.ball.x - BALL_R < 0 || s.ball.x + BALL_R > W) s.ball.vx *= -1;
    if (s.ball.y - BALL_R < 0) s.ball.vy *= -1;

    // Paddle collision
    if (s.ball.y + BALL_R >= s.pad.y &&
        s.ball.y - BALL_R <= s.pad.y + PAD_H &&
        s.ball.x >= s.pad.x && s.ball.x <= s.pad.x + PAD_W) {
      const rel = (s.ball.x - (s.pad.x + PAD_W / 2)) / (PAD_W / 2);
      const angle = rel * 60 * (Math.PI / 180);
      const spd = Math.sqrt(s.ball.vx**2 + s.ball.vy**2);
      s.ball.vx = Math.sin(angle) * spd;
      s.ball.vy = -Math.abs(Math.cos(angle) * spd);
    }

    // Brick collisions
    for (const b of s.bricks) {
      if (!b.alive) continue;
      if (s.ball.x + BALL_R > b.x && s.ball.x - BALL_R < b.x + BRICK_W &&
          s.ball.y + BALL_R > b.y && s.ball.y - BALL_R < b.y + BRICK_H) {
        b.alive = false;
        s.ball.vy *= -1;
        s.score += b.points;
        setScore(s.score);
        sounds.eat();
        break;
      }
    }

    // Ball lost
    if (s.ball.y > H + 20) {
      s.lives--;
      setLives(s.lives);
      if (s.lives <= 0) { endGame(s.score); return; }
      // Reset ball
      const angle = (Math.random() * 60 + 60) * (Math.PI / 180);
      s.ball = { x: W/2, y: H-60, vx: Math.cos(angle)*4.5, vy: -Math.sin(angle)*4.5 };
    }

    // Win check
    if (s.bricks.every(b => !b.alive)) { endGame(s.score, true); return; }

    // Draw
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

    // Bricks
    s.bricks.forEach(b => {
      if (!b.alive) return;
      ctx.fillStyle = b.color;
      roundRect(ctx, b.x, b.y, BRICK_W, BRICK_H, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(b.x + 2, b.y + 2, BRICK_W - 4, 4);
    });

    // Paddle
    const grad = ctx.createLinearGradient(s.pad.x, 0, s.pad.x + PAD_W, 0);
    grad.addColorStop(0, '#6366f1'); grad.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = grad;
    roundRect(ctx, s.pad.x, s.pad.y, PAD_W, PAD_H, 6);

    // Ball glow
    ctx.shadowBlur = 12; ctx.shadowColor = '#a5b4fc';
    ctx.fillStyle = '#a5b4fc';
    ctx.beginPath(); ctx.arc(s.ball.x, s.ball.y, BALL_R, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // HUD
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '14px Inter,sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`Score: ${s.score}`, 8, 20);
    ctx.textAlign = 'right';
    ctx.fillText('❤️'.repeat(s.lives), W - 8, 20);

    rafRef.current = requestAnimationFrame(loop);
  }, [endGame]);

  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y);
    ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath(); ctx.fill();
  };

  const startGame = () => {
    cancelAnimationFrame(rafRef.current);
    state.current = initState();
    setScore(0); setLives(3); setStatus('playing');
    rafRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a')  keysRef.current.left  = e.type === 'keydown';
      if (e.key === 'ArrowRight' || e.key === 'd') keysRef.current.right = e.type === 'keydown';
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); cancelAnimationFrame(rafRef.current); };
  }, []);

  // Mouse/touch paddle
  const handleMouseMove = (e) => {
    if (!state.current || status !== 'playing') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = W / rect.width;
    const x = (e.clientX - rect.left) * scaleX;
    state.current.pad.x = Math.max(0, Math.min(W - PAD_W, x - PAD_W / 2));
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-6 text-center">
        <div><p className="text-xs text-gray-500">Score</p><p className="text-2xl font-bold text-indigo-400">{score}</p></div>
        <div><p className="text-xs text-gray-500">Lives</p><p className="text-2xl">{'❤️'.repeat(lives)}</p></div>
        <div><p className="text-xs text-gray-500">Best</p><p className="text-2xl font-bold text-yellow-400">{best}</p></div>
      </div>

      <div className="relative" onMouseMove={handleMouseMove}>
        <canvas ref={canvasRef} width={W} height={H}
          className="rounded-2xl border border-gray-800 cursor-none" style={{ maxWidth: '100%' }} />
        {status !== 'playing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/80 rounded-2xl gap-4">
            <p className="text-5xl">{status === 'won' ? '🏆' : status === 'dead' ? '💔' : '🧱'}</p>
            <h2 className="text-2xl font-bold text-white">{status === 'won' ? 'You cleared it!' : status === 'dead' ? 'Game Over' : 'Breakout'}</h2>
            {status !== 'idle' && <p className="text-gray-400">Score: <span className="text-indigo-400 font-bold">{score}</span></p>}
            {status === 'idle' && <p className="text-gray-400 text-sm">Move mouse or use ← → keys</p>}
            {saving && <p className="text-xs text-gray-500">Saving...</p>}
            <button onClick={startGame} className="btn-primary px-8 py-3">{status === 'idle' ? '▶ Start' : '🔄 Play again'}</button>
          </div>
        )}
      </div>
      <p className="text-gray-600 text-xs">Mouse to move paddle · ← → keys</p>
      <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Back to lobby</button>
    </div>
  );
};

export default Breakout;
