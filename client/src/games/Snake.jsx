import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../api/axios';

const GRID = 20;        // number of cells
const CELL = 22;        // px per cell
const SIZE = GRID * CELL;
const TICK = 120;       // ms per frame

const DIR = {
  UP:    { x: 0,  y: -1 },
  DOWN:  { x: 0,  y:  1 },
  LEFT:  { x: -1, y:  0 },
  RIGHT: { x: 1,  y:  0 },
};

const randomCell = (snake = []) => {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * GRID),
    };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  return pos;
};

const Snake = ({ onBack }) => {
  const canvasRef = useRef(null);
  const stateRef  = useRef(null); // mutable game state (avoids stale closures)
  const tickRef   = useRef(null);

  const [status, setStatus]     = useState('idle');   // idle | playing | dead
  const [score, setScore]       = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [saving, setSaving]     = useState(false);

  // ── Init / reset game state ────────────────────────────────────────────────
  const initState = () => {
    const snake = [{ x: 10, y: 10 }];
    stateRef.current = {
      snake,
      dir: DIR.RIGHT,
      nextDir: DIR.RIGHT,
      food: randomCell(snake),
      score: 0,
    };
  };

  // ── Draw one frame ─────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stateRef.current) return;
    const ctx = canvas.getContext('2d');
    const { snake, food } = stateRef.current;

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Grid dots
    ctx.fillStyle = '#1e293b';
    for (let x = 0; x < GRID; x++)
      for (let y = 0; y < GRID; y++)
        ctx.fillRect(x * CELL + CELL / 2 - 1, y * CELL + CELL / 2 - 1, 2, 2);

    // Food — glowing red circle
    const fx = food.x * CELL + CELL / 2;
    const fy = food.y * CELL + CELL / 2;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ef4444';
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(fx, fy, CELL / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Snake body
    snake.forEach((seg, i) => {
      const alpha = 1 - (i / snake.length) * 0.5;
      ctx.fillStyle = i === 0 ? '#6366f1' : `rgba(99,102,241,${alpha})`;
      const pad = i === 0 ? 1 : 3;
      const r = i === 0 ? 6 : 4;
      roundRect(ctx, seg.x * CELL + pad, seg.y * CELL + pad, CELL - pad * 2, CELL - pad * 2, r);
    });

    // Eyes on head
    const head = snake[0];
    ctx.fillStyle = '#fff';
    const ex = head.x * CELL, ey = head.y * CELL;
    ctx.beginPath(); ctx.arc(ex + 7, ey + 7, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + 15, ey + 7, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath(); ctx.arc(ex + 8, ey + 8, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + 16, ey + 8, 1.5, 0, Math.PI * 2); ctx.fill();
  }, []);

  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  };

  // ── Game tick ──────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;

    s.dir = s.nextDir;
    const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };

    // Wall collision
    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
      endGame(); return;
    }
    // Self collision
    if (s.snake.some(seg => seg.x === head.x && seg.y === head.y)) {
      endGame(); return;
    }

    s.snake.unshift(head);

    if (head.x === s.food.x && head.y === s.food.y) {
      s.score += 10;
      s.food = randomCell(s.snake);
      setScore(s.score);
      setHighScore(prev => Math.max(prev, s.score));
    } else {
      s.snake.pop();
    }

    draw();
  }, [draw]);

  const endGame = useCallback(async () => {
    clearInterval(tickRef.current);
    setStatus('dead');
    const finalScore = stateRef.current?.score || 0;

    // Save score to backend
    setSaving(true);
    try {
      await api.post('/scores', { gameName: 'snake', score: finalScore, mode: 'single' });
    } catch (e) { /* ignore if not logged in */ }
    setSaving(false);
  }, []);

  // ── Start game ─────────────────────────────────────────────────────────────
  const startGame = () => {
    clearInterval(tickRef.current);
    initState();
    setScore(0);
    setStatus('playing');
    draw();
    tickRef.current = setInterval(tick, TICK);
  };

  // ── Keyboard controls ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (!stateRef.current) return;
      const cur = stateRef.current.dir;
      const map = {
        ArrowUp:    DIR.UP,    w: DIR.UP,
        ArrowDown:  DIR.DOWN,  s: DIR.DOWN,
        ArrowLeft:  DIR.LEFT,  a: DIR.LEFT,
        ArrowRight: DIR.RIGHT, d: DIR.RIGHT,
      };
      const next = map[e.key];
      if (!next) return;
      // Prevent reversing
      if (next.x === -cur.x && next.y === -cur.y) return;
      stateRef.current.nextDir = next;
      e.preventDefault();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Draw idle screen on mount
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, SIZE, SIZE);
    }
    return () => clearInterval(tickRef.current);
  }, []);

  // ── Mobile swipe controls ──────────────────────────────────────────────────
  const touchStart = useRef(null);
  const handleTouchStart = (e) => { touchStart.current = e.touches[0]; };
  const handleTouchEnd = (e) => {
    if (!touchStart.current || !stateRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.clientX;
    const dy = e.changedTouches[0].clientY - touchStart.current.clientY;
    const cur = stateRef.current.dir;
    if (Math.abs(dx) > Math.abs(dy)) {
      const next = dx > 0 ? DIR.RIGHT : DIR.LEFT;
      if (next.x !== -cur.x) stateRef.current.nextDir = next;
    } else {
      const next = dy > 0 ? DIR.DOWN : DIR.UP;
      if (next.y !== -cur.y) stateRef.current.nextDir = next;
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Score bar */}
      <div className="flex gap-8 text-center">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Score</p>
          <p className="text-3xl font-bold text-indigo-400">{score}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Best</p>
          <p className="text-3xl font-bold text-yellow-400">{highScore}</p>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="rounded-2xl border border-gray-800"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Overlay for idle / dead */}
        {status !== 'playing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/80 rounded-2xl gap-4">
            {status === 'dead' && (
              <>
                <p className="text-5xl">💀</p>
                <p className="text-2xl font-bold text-white">Game Over!</p>
                <p className="text-gray-400">Score: <span className="text-indigo-400 font-bold">{score}</span></p>
                {saving && <p className="text-xs text-gray-500">Saving score...</p>}
              </>
            )}
            {status === 'idle' && (
              <>
                <p className="text-5xl">🐍</p>
                <p className="text-xl font-bold text-white">Snake</p>
                <p className="text-sm text-gray-400">Use arrow keys or WASD</p>
              </>
            )}
            <button onClick={startGame} className="btn-primary px-8 py-3 text-lg mt-2">
              {status === 'dead' ? '🔄 Play again' : '▶ Start game'}
            </button>
          </div>
        )}
      </div>

      {/* Mobile D-pad */}
      <div className="grid grid-cols-3 gap-2 md:hidden">
        {[['', '⬆', ''],['⬅', '', '➡'],['', '⬇', '']].map((row, ri) =>
          row.map((btn, ci) => btn ? (
            <button key={`${ri}-${ci}`} onClick={() => {
              if (!stateRef.current) return;
              const dirs = { '⬆': DIR.UP, '⬇': DIR.DOWN, '⬅': DIR.LEFT, '➡': DIR.RIGHT };
              const next = dirs[btn];
              const cur = stateRef.current.dir;
              if (next.x !== -cur.x || next.y !== -cur.y) stateRef.current.nextDir = next;
            }} className="btn-secondary w-12 h-12 flex items-center justify-center text-xl">
              {btn}
            </button>
          ) : <div key={`${ri}-${ci}`} />)
        )}
      </div>

      <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
        ← Back to lobby
      </button>
    </div>
  );
};

export default Snake;
