import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/axios';
import sounds from '../utils/sounds';

const SIZE = 4;

const TILE_COLORS = {
  0:    { bg: '#1e293b', text: '#1e293b' },
  2:    { bg: '#eee4da', text: '#776e65' },
  4:    { bg: '#ede0c8', text: '#776e65' },
  8:    { bg: '#f2b179', text: '#f9f6f2' },
  16:   { bg: '#f59563', text: '#f9f6f2' },
  32:   { bg: '#f67c5f', text: '#f9f6f2' },
  64:   { bg: '#f65e3b', text: '#f9f6f2' },
  128:  { bg: '#edcf72', text: '#f9f6f2' },
  256:  { bg: '#edcc61', text: '#f9f6f2' },
  512:  { bg: '#edc850', text: '#f9f6f2' },
  1024: { bg: '#edc53f', text: '#f9f6f2' },
  2048: { bg: '#edc22e', text: '#f9f6f2' },
};

const emptyGrid = () => Array(SIZE).fill(null).map(() => Array(SIZE).fill(0));

const addRandom = (grid) => {
  const empty = [];
  grid.forEach((row, r) => row.forEach((v, c) => { if (v === 0) empty.push([r, c]); }));
  if (!empty.length) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const next = grid.map(row => [...row]);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
};

const slideRow = (row) => {
  const nums = row.filter(v => v !== 0);
  let score = 0;
  for (let i = 0; i < nums.length - 1; i++) {
    if (nums[i] === nums[i + 1]) {
      nums[i] *= 2;
      score += nums[i];
      nums.splice(i + 1, 1);
    }
  }
  while (nums.length < SIZE) nums.push(0);
  return { row: nums, score };
};

const moveGrid = (grid, dir) => {
  let totalScore = 0;
  let next = grid.map(row => [...row]);

  const slide = (row) => {
    const { row: slid, score } = slideRow(row);
    totalScore += score;
    return slid;
  };

  if (dir === 'left')  next = next.map(slide);
  if (dir === 'right') next = next.map(row => slide([...row].reverse()).reverse());
  if (dir === 'up') {
    for (let c = 0; c < SIZE; c++) {
      const col = next.map(row => row[c]);
      const slid = slide(col);
      slid.forEach((v, r) => { next[r][c] = v; });
    }
  }
  if (dir === 'down') {
    for (let c = 0; c < SIZE; c++) {
      const col = next.map(row => row[c]).reverse();
      const slid = slide(col);
      slid.reverse().forEach((v, r) => { next[r][c] = v; });
    }
  }
  return { grid: next, score: totalScore };
};

const gridsEqual = (a, b) => a.every((row, r) => row.every((v, c) => v === b[r][c]));

const hasMovesLeft = (grid) => {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) return true;
      if (c < SIZE - 1 && grid[r][c] === grid[r][c + 1]) return true;
      if (r < SIZE - 1 && grid[r][c] === grid[r + 1][c]) return true;
    }
  return false;
};

const Game2048 = ({ onBack }) => {
  const [grid, setGrid]       = useState(emptyGrid());
  const [score, setScore]     = useState(0);
  const [best, setBest]       = useState(0);
  const [status, setStatus]   = useState('idle'); // idle | playing | won | dead
  const [saving, setSaving]   = useState(false);
  const touchStart = useRef(null);

  const startGame = () => {
    let g = emptyGrid();
    g = addRandom(g);
    g = addRandom(g);
    setGrid(g);
    setScore(0);
    setStatus('playing');
  };

  const saveScore = async (finalScore) => {
    setSaving(true);
    try {
      await api.post('/scores', { gameName: '2048', score: finalScore, mode: 'single' });
    } catch (e) {}
    setSaving(false);
  };

  const move = useCallback((dir) => {
    if (status !== 'playing') return;
    setGrid(prev => {
      const { grid: next, score: gained } = moveGrid(prev, dir);
      if (gridsEqual(prev, next)) return prev; // no change

      setScore(s => {
        const newScore = s + gained;
        setBest(b => Math.max(b, newScore));
        return newScore;
      });
      if (gained > 0) sounds.merge();

      // Check win
      if (next.some(row => row.some(v => v === 2048))) {
        setStatus('won');
        sounds.win();
        setScore(s => { saveScore(s + gained); return s + gained; });
        return next;
      }

      const withNew = addRandom(next);

      // Check game over
      if (!hasMovesLeft(withNew)) {
        setStatus('dead');
        sounds.gameOver();
        setScore(s => { saveScore(s + gained); return s + gained; });
      }

      return withNew;
    });
  }, [status]);

  // Keyboard
  useEffect(() => {
    const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
                  a: 'left', d: 'right', w: 'up', s: 'down' };
    const handler = (e) => {
      const dir = map[e.key];
      if (dir) { e.preventDefault(); move(dir); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [move]);

  // Touch swipe
  const onTouchStart = (e) => { touchStart.current = e.touches[0]; };
  const onTouchEnd = (e) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.clientX;
    const dy = e.changedTouches[0].clientY - touchStart.current.clientY;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
    else move(dy > 0 ? 'down' : 'up');
  };

  const fontSize = (val) => val >= 1024 ? 'text-lg' : val >= 128 ? 'text-xl' : 'text-2xl';
  const tileColor = (val) => TILE_COLORS[val] || { bg: '#3d3a33', text: '#f9f6f2' };

  return (
    <div className="flex flex-col items-center gap-6 select-none">
      {/* Scores */}
      <div className="flex gap-6 text-center">
        <div className="bg-gray-800 rounded-xl px-5 py-2">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Score</p>
          <p className="text-2xl font-bold text-white">{score}</p>
        </div>
        <div className="bg-gray-800 rounded-xl px-5 py-2">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Best</p>
          <p className="text-2xl font-bold text-yellow-400">{best}</p>
        </div>
      </div>

      {/* Board */}
      <div
        className="bg-gray-800 p-3 rounded-2xl relative"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}>
          {grid.map((row, r) =>
            row.map((val, c) => {
              const { bg, text } = tileColor(val);
              return (
                <div
                  key={`${r}-${c}`}
                  className={`w-16 h-16 md:w-20 md:h-20 rounded-xl flex items-center justify-center font-bold transition-all duration-100 ${fontSize(val)}`}
                  style={{ backgroundColor: bg, color: text }}
                >
                  {val !== 0 ? val : ''}
                </div>
              );
            })
          )}
        </div>

        {/* Status overlay */}
        {(status === 'idle' || status === 'won' || status === 'dead') && (
          <div className="absolute inset-0 bg-gray-900/85 rounded-2xl flex flex-col items-center justify-center gap-4 p-6">
            {status === 'idle' && (
              <>
                <p className="text-5xl">🎯</p>
                <p className="text-2xl font-bold text-white">2048</p>
                <p className="text-gray-400 text-sm text-center">Slide tiles to combine them. Reach 2048!</p>
                <p className="text-gray-500 text-xs">Arrow keys or WASD • Swipe on mobile</p>
              </>
            )}
            {status === 'won' && (
              <>
                <p className="text-5xl">🏆</p>
                <p className="text-2xl font-bold text-yellow-400">You reached 2048!</p>
                <p className="text-gray-300">Score: <span className="text-indigo-400 font-bold">{score}</span></p>
                {saving && <p className="text-xs text-gray-500">Saving...</p>}
              </>
            )}
            {status === 'dead' && (
              <>
                <p className="text-5xl">😵</p>
                <p className="text-2xl font-bold text-white">Game Over</p>
                <p className="text-gray-300">Score: <span className="text-indigo-400 font-bold">{score}</span></p>
                {saving && <p className="text-xs text-gray-500">Saving...</p>}
              </>
            )}
            <button onClick={startGame} className="btn-primary px-8 py-3 text-lg mt-2">
              {status === 'idle' ? '▶ Start game' : '🔄 Play again'}
            </button>
          </div>
        )}
      </div>

      <p className="text-gray-600 text-xs">Arrow keys / WASD / Swipe to move tiles</p>

      <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
        ← Back to lobby
      </button>
    </div>
  );
};

export default Game2048;
