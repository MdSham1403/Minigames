import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../api/axios';
import sounds from '../utils/sounds';

const COLS = 10, ROWS = 20, CELL = 28;
const W = COLS * CELL, H = ROWS * CELL;

const PIECES = [
  { shape: [[1,1,1,1]], color: '#06b6d4' },           // I
  { shape: [[1,1],[1,1]], color: '#eab308' },          // O
  { shape: [[0,1,0],[1,1,1]], color: '#a855f7' },      // T
  { shape: [[0,1,1],[1,1,0]], color: '#22c55e' },      // S
  { shape: [[1,1,0],[0,1,1]], color: '#ef4444' },      // Z
  { shape: [[1,0,0],[1,1,1]], color: '#3b82f6' },      // J
  { shape: [[0,0,1],[1,1,1]], color: '#f97316' },      // L
];

const rotate = mat => mat[0].map((_, i) => mat.map(r => r[i]).reverse());

const emptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));

const fits = (board, shape, r, c) => {
  for (let dr = 0; dr < shape.length; dr++)
    for (let dc = 0; dc < shape[0].length; dc++)
      if (shape[dr][dc]) {
        const nr = r + dr, nc = c + dc;
        if (nr >= ROWS || nc < 0 || nc >= COLS) return false;
        if (nr >= 0 && board[nr][nc]) return false;
      }
  return true;
};

const Tetris = ({ onBack }) => {
  const canvasRef  = useRef(null);
  const stateRef   = useRef(null);
  const tickRef    = useRef(null);
  const keysRef    = useRef({});

  const [status, setStatus]   = useState('idle');
  const [score, setScore]     = useState(0);
  const [lines, setLines]     = useState(0);
  const [level, setLevel]     = useState(1);
  const [best, setBest]       = useState(0);
  const [saving, setSaving]   = useState(false);
  const [nextPiece, setNextPiece] = useState(null);

  const randPiece = () => {
    const p = PIECES[Math.floor(Math.random() * PIECES.length)];
    return { shape: p.shape, color: p.color, r: -1, c: Math.floor((COLS - p.shape[0].length) / 2) };
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stateRef.current) return;
    const ctx = canvas.getContext('2d');
    const { board, cur } = stateRef.current;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let r = 0; r < ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL); ctx.stroke(); }
    for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, H); ctx.stroke(); }

    // Board cells
    board.forEach((row, r) => row.forEach((color, c) => {
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, 4);
    }));

    if (!cur) return;

    // Ghost piece
    let ghostR = cur.r;
    while (fits(board, cur.shape, ghostR + 1, cur.c)) ghostR++;
    cur.shape.forEach((row, dr) => row.forEach((v, dc) => {
      if (!v) return;
      const gr = ghostR + dr, gc = cur.c + dc;
      if (gr >= 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(gc * CELL + 1, gr * CELL + 1, CELL - 2, CELL - 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.strokeRect(gc * CELL + 1, gr * CELL + 1, CELL - 2, CELL - 2);
      }
    }));

    // Current piece
    cur.shape.forEach((row, dr) => row.forEach((v, dc) => {
      if (!v) return;
      const pr = cur.r + dr, pc = cur.c + dc;
      if (pr >= 0) {
        ctx.fillStyle = cur.color;
        ctx.fillRect(pc * CELL + 1, pr * CELL + 1, CELL - 2, CELL - 2);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(pc * CELL + 1, pr * CELL + 1, CELL - 2, 4);
      }
    }));
  }, []);

  const lockAndNext = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;

    // Lock piece
    s.cur.shape.forEach((row, dr) => row.forEach((v, dc) => {
      if (v && s.cur.r + dr >= 0) s.board[s.cur.r + dr][s.cur.c + dc] = s.cur.color;
    }));

    // Clear lines
    const kept = s.board.filter(row => row.some(c => !c));
    const cleared = ROWS - kept.length;
    if (cleared > 0) {
      sounds.merge();
      const newBoard = [...Array(cleared).fill(null).map(() => Array(COLS).fill(null)), ...kept];
      s.board = newBoard;
      const pts = [0, 100, 300, 500, 800][cleared] * s.level;
      s.score += pts;
      s.lines += cleared;
      s.level = Math.floor(s.lines / 10) + 1;
      setScore(s.score);
      setLines(s.lines);
      setLevel(s.level);
    }

    // Next piece
    s.cur = s.next;
    s.next = randPiece();
    setNextPiece(s.next);

    // Game over
    if (!fits(s.board, s.cur.shape, s.cur.r, s.cur.c)) {
      clearInterval(tickRef.current);
      sounds.gameOver();
      setStatus('dead');
      setBest(b => Math.max(b, s.score));
      setSaving(true);
      api.post('/scores', { gameName: 'tetris', score: s.score, mode: 'single' })
        .catch(() => {}).finally(() => setSaving(false));
    }
  }, []);

  const tick = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;
    if (fits(s.board, s.cur.shape, s.cur.r + 1, s.cur.c)) {
      s.cur.r++;
    } else {
      lockAndNext();
    }
    draw();
  }, [lockAndNext, draw]);

  const startGame = () => {
    clearInterval(tickRef.current);
    const first = randPiece(), next = randPiece();
    stateRef.current = { board: emptyBoard(), cur: first, next, score: 0, lines: 0, level: 1 };
    setScore(0); setLines(0); setLevel(1); setNextPiece(next); setStatus('playing');
    tickRef.current = setInterval(tick, 500);
  };

  // Speed up on level change
  useEffect(() => {
    if (status !== 'playing') return;
    clearInterval(tickRef.current);
    tickRef.current = setInterval(tick, Math.max(80, 500 - (level - 1) * 40));
  }, [level, tick, status]);

  useEffect(() => {
    const handler = (e) => {
      if (status !== 'playing') return;
      const s = stateRef.current;
      if (!s) return;
      if (e.key === 'ArrowLeft'  && fits(s.board, s.cur.shape, s.cur.r, s.cur.c - 1)) { s.cur.c--; sounds.slide?.(); draw(); }
      if (e.key === 'ArrowRight' && fits(s.board, s.cur.shape, s.cur.r, s.cur.c + 1)) { s.cur.c++; sounds.slide?.(); draw(); }
      if (e.key === 'ArrowDown') { if (fits(s.board, s.cur.shape, s.cur.r + 1, s.cur.c)) s.cur.r++; else lockAndNext(); draw(); }
      if (e.key === 'ArrowUp' || e.key === 'x') {
        const rot = rotate(s.cur.shape);
        if (fits(s.board, rot, s.cur.r, s.cur.c)) { s.cur.shape = rot; sounds.click(); draw(); }
      }
      if (e.key === ' ') {
        e.preventDefault();
        while (fits(s.board, s.cur.shape, s.cur.r + 1, s.cur.c)) s.cur.r++;
        sounds.place();
        lockAndNext(); draw();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [status, draw, lockAndNext]);

  useEffect(() => () => clearInterval(tickRef.current), []);

  return (
    <div className="flex gap-5 items-start justify-center">
      {/* Board */}
      <div className="flex flex-col items-center gap-3">
        <canvas ref={canvasRef} width={W} height={H}
          className="rounded-2xl border border-gray-800" style={{ imageRendering: 'pixelated' }} />
        {(status === 'idle' || status === 'dead') && (
          <div className="absolute flex flex-col items-center gap-3" style={{ marginTop: `${H / 2 - 80}px` }}>
            <div className="bg-gray-950/90 rounded-2xl px-8 py-6 text-center border border-gray-700">
              <p className="text-4xl mb-2">{status === 'dead' ? '💔' : '🟦'}</p>
              <p className="text-xl font-bold text-white mb-1">{status === 'dead' ? 'Game Over!' : 'Tetris'}</p>
              {status === 'dead' && <p className="text-gray-400 text-sm mb-3">Score: {score}</p>}
              {status === 'idle' && <p className="text-gray-400 text-xs mb-3">← → move · ↑ rotate · Space drop</p>}
              {saving && <p className="text-xs text-gray-500 mb-2">Saving...</p>}
              <button onClick={startGame} className="btn-primary px-6 py-2">
                {status === 'dead' ? '🔄 Again' : '▶ Start'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Side panel */}
      <div className="flex flex-col gap-4 min-w-[100px]">
        <div className="card p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Score</p>
          <p className="text-xl font-bold text-indigo-400">{score}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Best</p>
          <p className="text-xl font-bold text-yellow-400">{best}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Level</p>
          <p className="text-xl font-bold text-white">{level}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Lines</p>
          <p className="text-xl font-bold text-white">{lines}</p>
        </div>
        {nextPiece && (
          <div className="card p-3 text-center">
            <p className="text-xs text-gray-500 mb-2">Next</p>
            <div className="flex flex-col items-center gap-0.5">
              {nextPiece.shape.map((row, r) => (
                <div key={r} className="flex gap-0.5">
                  {row.map((v, c) => (
                    <div key={c} className="w-4 h-4 rounded-sm"
                      style={{ backgroundColor: v ? nextPiece.color : 'transparent' }} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
        <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-xs transition-colors text-center">← Back</button>
      </div>
    </div>
  );
};

export default Tetris;
