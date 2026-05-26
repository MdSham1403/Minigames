import { useState, useCallback, useEffect } from 'react';
import api from '../api/axios';
import sounds from '../utils/sounds';

const LEVELS = {
  easy:   { rows: 9,  cols: 9,  mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard:   { rows: 16, cols: 30, mines: 99 },
};

const buildGrid = (rows, cols) =>
  Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      mine: false, revealed: false, flagged: false, adjacent: 0,
    }))
  );

const placeMines = (grid, rows, cols, mines, safeR, safeC) => {
  const g = grid.map(r => r.map(c => ({ ...c })));
  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (!g[r][c].mine && !(r === safeR && c === safeC)) {
      g[r][c].mine = true;
      placed++;
    }
  }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (g[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && g[nr][nc].mine) count++;
        }
      g[r][c].adjacent = count;
    }
  return g;
};

const floodReveal = (grid, rows, cols, r, c) => {
  const g = grid.map(row => row.map(cell => ({ ...cell })));
  const queue = [[r, c]];
  while (queue.length) {
    const [cr, cc] = queue.shift();
    if (cr < 0 || cr >= rows || cc < 0 || cc >= cols) continue;
    const cell = g[cr][cc];
    if (cell.revealed || cell.flagged || cell.mine) continue;
    cell.revealed = true;
    if (cell.adjacent === 0)
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++)
          queue.push([cr + dr, cc + dc]);
  }
  return g;
};

const NUM_COLORS = ['','#3b82f6','#22c55e','#ef4444','#7c3aed','#dc2626','#0891b2','#111827','#6b7280'];

const Minesweeper = ({ onBack }) => {
  const [level, setLevel]     = useState('easy');
  const [grid, setGrid]       = useState(null);
  const [status, setStatus]   = useState('idle');
  const [flagMode, setFlagMode] = useState(false);
  const [minesLeft, setMinesLeft] = useState(0);
  const [time, setTime]       = useState(0);
  const [firstClick, setFirstClick] = useState(true);
  const [saving, setSaving]   = useState(false);

  const { rows, cols, mines } = LEVELS[level];

  useEffect(() => {
    if (status !== 'playing') return;
    const t = setInterval(() => setTime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  const startGame = () => {
    setGrid(buildGrid(rows, cols));
    setMinesLeft(mines);
    setTime(0);
    setFirstClick(true);
    setStatus('playing');
    setFlagMode(false);
  };

  const reveal = useCallback((r, c) => {
    if (status !== 'playing') return;
    setGrid(prev => {
      if (!prev) return prev;
      let g = prev.map(row => row.map(cell => ({ ...cell })));
      if (g[r][c].flagged || g[r][c].revealed) return prev;

      // First click — place mines avoiding this cell
      if (firstClick) {
        g = placeMines(g, rows, cols, mines, r, c);
        setFirstClick(false);
      }

      if (g[r][c].mine) {
        // Reveal all mines
        g = g.map(row => row.map(cell => ({
          ...cell, revealed: cell.mine ? true : cell.revealed
        })));
        sounds.gameOver();
        setStatus('dead');
        api.post('/scores', { gameName: 'minesweeper', score: 0, mode: 'single' }).catch(() => {});
        return g;
      }

      sounds.click();
      g = floodReveal(g, rows, cols, r, c);

      // Win check — all non-mine cells revealed
      const won = g.every(row => row.every(cell => cell.mine || cell.revealed));
      if (won) {
        sounds.win();
        setStatus('won');
        const score = Math.max(0, 1000 - time * 2 + (level === 'hard' ? 500 : level === 'medium' ? 200 : 0));
        setSaving(true);
        api.post('/scores', { gameName: 'minesweeper', score, mode: 'single' })
          .catch(() => {}).finally(() => setSaving(false));
      }
      return g;
    });
  }, [status, firstClick, rows, cols, mines, time, level]);

  const flag = useCallback((e, r, c) => {
    e.preventDefault();
    if (status !== 'playing' || !grid) return;
    if (grid[r][c].revealed) return;
    sounds.click();
    setGrid(prev => {
      const g = prev.map(row => row.map(cell => ({ ...cell })));
      g[r][c].flagged = !g[r][c].flagged;
      setMinesLeft(m => g[r][c].flagged ? m - 1 : m + 1);
      return g;
    });
  }, [status, grid]);

  const handleClick = (r, c) => flagMode ? flag({ preventDefault: () => {} }, r, c) : reveal(r, c);

  const cellSize = level === 'easy' ? 'w-9 h-9 text-sm' : level === 'medium' ? 'w-7 h-7 text-xs' : 'w-6 h-6 text-xs';

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Top bar */}
      <div className="flex gap-6 text-center">
        <div><p className="text-xs text-gray-500">💣</p><p className="text-xl font-bold text-white">{minesLeft}</p></div>
        <div><p className="text-xs text-gray-500">⏱</p><p className="text-xl font-bold text-white font-mono">{time}s</p></div>
        <div><p className="text-xs text-gray-500">Level</p><p className="text-xl font-bold text-indigo-400 capitalize">{level}</p></div>
      </div>

      {status === 'playing' && (
        <button onClick={() => setFlagMode(f => !f)}
          className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-colors ${
            flagMode ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
          }`}>
          {flagMode ? '🚩 Flag mode ON' : '🖱 Reveal mode'}
        </button>
      )}

      {/* Board */}
      {grid && (
        <div className="overflow-auto max-w-full">
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 2 }}>
            {grid.map((row, r) => row.map((cell, c) => (
              <button key={`${r}-${c}`}
                onClick={() => handleClick(r, c)}
                onContextMenu={e => flag(e, r, c)}
                className={`${cellSize} rounded flex items-center justify-center font-bold transition-colors select-none ${
                  cell.revealed
                    ? cell.mine ? 'bg-red-500' : 'bg-gray-700'
                    : 'bg-gray-600 hover:bg-gray-500 active:bg-gray-700'
                }`}
                style={{ color: cell.revealed && !cell.mine ? NUM_COLORS[cell.adjacent] : undefined }}>
                {cell.revealed
                  ? cell.mine ? '💣' : cell.adjacent > 0 ? cell.adjacent : ''
                  : cell.flagged ? '🚩' : ''}
              </button>
            )))}
          </div>
        </div>
      )}

      {(status === 'idle' || status === 'won' || status === 'dead') && (
        <div className="card w-full max-w-sm text-center py-8">
          {status === 'idle' && <>
            <p className="text-5xl mb-3">💣</p>
            <h2 className="text-2xl font-bold text-white mb-4">Minesweeper</h2>
            <div className="flex gap-2 justify-center mb-5">
              {Object.keys(LEVELS).map(l => (
                <button key={l} onClick={() => setLevel(l)}
                  className={`px-4 py-2 rounded-xl text-sm capitalize transition-colors ${level === l ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                  {l}
                </button>
              ))}
            </div>
          </>}
          {status === 'won' && <>
            <p className="text-5xl mb-3">🎉</p>
            <p className="text-2xl font-bold text-white mb-1">You cleared it!</p>
            <p className="text-gray-400 mb-3">{time}s · {level}</p>
            {saving && <p className="text-xs text-gray-500 mb-3">Saving...</p>}
          </>}
          {status === 'dead' && <>
            <p className="text-5xl mb-3">💥</p>
            <p className="text-2xl font-bold text-white mb-1">Boom!</p>
            <p className="text-gray-400 mb-3">Better luck next time.</p>
          </>}
          <button onClick={startGame} className="btn-primary px-10 py-3 w-full">
            {status === 'idle' ? '▶ Start' : '🔄 Play again'}
          </button>
        </div>
      )}

      <p className="text-gray-600 text-xs">Right-click or flag mode to place flags</p>
      <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Back to lobby</button>
    </div>
  );
};

export default Minesweeper;
