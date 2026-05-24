import { useState, useCallback, useEffect } from 'react';
import api from '../api/axios';

// ── Sudoku generator ──────────────────────────────────────────────────────────
const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);

const isValid = (board, row, col, num) => {
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num) return false;
    if (board[i][col] === num) return false;
    const br = 3 * Math.floor(row / 3) + Math.floor(i / 3);
    const bc = 3 * Math.floor(col / 3) + (i % 3);
    if (board[br][bc] === num) return false;
  }
  return true;
};

const solve = (board) => {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (!board[r][c]) {
        for (const num of shuffle([1,2,3,4,5,6,7,8,9])) {
          if (isValid(board, r, c, num)) {
            board[r][c] = num;
            if (solve(board)) return true;
            board[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
};

const generatePuzzle = (difficulty) => {
  const board = Array(9).fill(null).map(() => Array(9).fill(0));
  solve(board);
  const solution = board.map(r => [...r]);

  const remove = { easy: 35, medium: 45, hard: 55 }[difficulty] || 45;
  const cells = shuffle([...Array(81).keys()]);
  for (let i = 0; i < remove; i++) {
    const r = Math.floor(cells[i] / 9);
    const c = cells[i] % 9;
    board[r][c] = 0;
  }

  return { puzzle: board, solution };
};

const BOX_COLORS = ['bg-indigo-500/5','bg-pink-500/5','bg-green-500/5','bg-orange-500/5',
  'bg-purple-500/5','bg-teal-500/5','bg-yellow-500/5','bg-blue-500/5','bg-red-500/5'];

const Sudoku = ({ onBack }) => {
  const [puzzle, setPuzzle]       = useState(null);
  const [solution, setSolution]   = useState(null);
  const [board, setBoard]         = useState(null);
  const [selected, setSelected]   = useState(null);
  const [errors, setErrors]       = useState(new Set());
  const [notes, setNotes]         = useState(Array(81).fill(null).map(() => new Set()));
  const [noteMode, setNoteMode]   = useState(false);
  const [status, setStatus]       = useState('idle');
  const [difficulty, setDifficulty] = useState('medium');
  const [mistakes, setMistakes]   = useState(0);
  const [time, setTime]           = useState(0);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (status !== 'playing') return;
    const t = setInterval(() => setTime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  const startGame = () => {
    const { puzzle: p, solution: s } = generatePuzzle(difficulty);
    setPuzzle(p.map(r => [...r]));
    setSolution(s);
    setBoard(p.map(r => [...r]));
    setSelected(null);
    setErrors(new Set());
    setNotes(Array(81).fill(null).map(() => new Set()));
    setMistakes(0);
    setTime(0);
    setStatus('playing');
  };

  const handleInput = useCallback((num) => {
    if (!selected || status !== 'playing') return;
    const [r, c] = selected;
    if (puzzle[r][c] !== 0) return; // original cell

    if (noteMode) {
      setNotes(prev => {
        const next = prev.map(s => new Set(s));
        const idx = r * 9 + c;
        if (next[idx].has(num)) next[idx].delete(num);
        else next[idx].add(num);
        return next;
      });
      return;
    }

    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = num;
    setBoard(newBoard);

    // Clear notes for this cell
    setNotes(prev => { const next = prev.map(s => new Set(s)); next[r*9+c] = new Set(); return next; });

    if (num !== solution[r][c]) {
      setErrors(prev => new Set(prev).add(`${r}-${c}`));
      setMistakes(m => m + 1);
    } else {
      setErrors(prev => { const n = new Set(prev); n.delete(`${r}-${c}`); return n; });
      // Check win
      const solved = newBoard.every((row, ri) => row.every((v, ci) => v === solution[ri][ci]));
      if (solved) {
        setStatus('done');
        const pts = Math.max(0, 1000 - mistakes * 50 - Math.floor(time / 10) * 5);
        setSaving(true);
        api.post('/scores', { gameName: 'sudoku', score: pts, mode: 'single' })
          .catch(() => {}).finally(() => setSaving(false));
      }
    }
  }, [selected, status, puzzle, board, solution, noteMode, mistakes, time]);

  const erase = () => {
    if (!selected || status !== 'playing') return;
    const [r, c] = selected;
    if (puzzle[r][c] !== 0) return;
    const nb = board.map(row => [...row]);
    nb[r][c] = 0;
    setBoard(nb);
    setErrors(prev => { const n = new Set(prev); n.delete(`${r}-${c}`); return n; });
  };

  useEffect(() => {
    const handler = (e) => {
      if (status !== 'playing') return;
      const n = parseInt(e.key);
      if (n >= 1 && n <= 9) handleInput(n);
      if (e.key === 'Backspace' || e.key === 'Delete') erase();
      if (selected) {
        const [r, c] = selected;
        if (e.key === 'ArrowUp'    && r > 0) setSelected([r-1, c]);
        if (e.key === 'ArrowDown'  && r < 8) setSelected([r+1, c]);
        if (e.key === 'ArrowLeft'  && c > 0) setSelected([r, c-1]);
        if (e.key === 'ArrowRight' && c < 8) setSelected([r, c+1]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleInput, selected, status]);

  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const boxIdx = (r,c) => Math.floor(r/3)*3 + Math.floor(c/3);

  const cellStyle = (r, c) => {
    const key = `${r}-${c}`;
    const isSelected = selected?.[0] === r && selected?.[1] === c;
    const isOriginal = puzzle?.[r][c] !== 0;
    const isError = errors.has(key);
    const isSameNum = selected && board && board[r][c] && board[r][c] === board[selected[0]][selected[1]];
    const isRelated = selected && (selected[0]===r || selected[1]===c || (Math.floor(selected[0]/3)===Math.floor(r/3) && Math.floor(selected[1]/3)===Math.floor(c/3)));

    let base = 'w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-sm cursor-pointer select-none transition-colors relative ';
    if (isSelected) return base + 'bg-indigo-500/30 text-white font-bold';
    if (isError) return base + 'bg-red-500/20 text-red-400 font-bold';
    if (isSameNum) return base + 'bg-indigo-500/15 font-bold ' + (isOriginal ? 'text-white' : 'text-indigo-300');
    if (isRelated) return base + 'bg-gray-700/50 ' + (isOriginal ? 'text-gray-200' : 'text-indigo-300');
    return base + 'hover:bg-gray-700 ' + (isOriginal ? 'text-white font-semibold' : 'text-indigo-400');
  };

  return (
    <div className="flex flex-col items-center gap-5 select-none">
      {/* Stats */}
      <div className="flex gap-5 text-center">
        <div><p className="text-xs text-gray-500">Time</p><p className="text-xl font-bold text-white font-mono">{fmt(time)}</p></div>
        <div><p className="text-xs text-gray-500">Mistakes</p><p className="text-xl font-bold text-red-400">{mistakes}</p></div>
        <div><p className="text-xs text-gray-500">Difficulty</p><p className="text-xl font-bold text-indigo-400 capitalize">{difficulty}</p></div>
      </div>

      {/* Board */}
      <div className="bg-gray-800 p-1 rounded-2xl border border-gray-700 relative">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(9,1fr)', gap: 0 }}>
          {board ? board.map((row, r) => row.map((val, c) => {
            const idx = r * 9 + c;
            const noteNums = notes[idx];
            const borderR = (r+1)%3===0&&r!==8 ? 'border-b-2 border-b-gray-500' : 'border-b border-b-gray-700';
            const borderC = (c+1)%3===0&&c!==8 ? 'border-r-2 border-r-gray-500' : 'border-r border-r-gray-700';
            return (
              <div key={`${r}-${c}`} onClick={() => setSelected([r,c])}
                className={`${cellStyle(r,c)} ${borderR} ${borderC}`}>
                {val !== 0
                  ? <span>{val}</span>
                  : noteNums?.size > 0
                  ? <div className="grid grid-cols-3 gap-0 w-full h-full p-0.5">
                      {[1,2,3,4,5,6,7,8,9].map(n => (
                        <span key={n} className="text-[7px] text-gray-500 flex items-center justify-center">
                          {noteNums.has(n) ? n : ''}
                        </span>
                      ))}
                    </div>
                  : null
                }
              </div>
            );
          })) : Array(81).fill(null).map((_,i) => (
            <div key={i} className="w-9 h-9 md:w-10 md:h-10 bg-gray-800" />
          ))}
        </div>

        {/* Overlays */}
        {(status === 'idle' || status === 'done') && (
          <div className="absolute inset-0 bg-gray-900/90 rounded-2xl flex flex-col items-center justify-center gap-4 p-6">
            {status === 'idle' ? (
              <>
                <p className="text-5xl">🔢</p>
                <h2 className="text-2xl font-bold text-white">Sudoku</h2>
                <p className="text-gray-400 text-sm text-center">Fill the grid so every row, column and 3×3 box contains 1–9</p>
                <div className="flex gap-2">
                  {['easy','medium','hard'].map(d => (
                    <button key={d} onClick={() => setDifficulty(d)}
                      className={`px-4 py-2 rounded-xl text-sm capitalize transition-colors ${difficulty===d ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-5xl">🎉</p>
                <h2 className="text-2xl font-bold text-white">Solved!</h2>
                <p className="text-gray-400">Time: {fmt(time)} · Mistakes: {mistakes}</p>
                {saving && <p className="text-xs text-gray-500">Saving...</p>}
              </>
            )}
            <button onClick={startGame} className="btn-primary px-8 py-3">
              {status === 'idle' ? '▶ Start' : '🔄 New puzzle'}
            </button>
          </div>
        )}
      </div>

      {/* Number pad */}
      {status === 'playing' && (
        <div className="flex gap-2 flex-wrap justify-center">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} onClick={() => handleInput(n)}
              className="w-10 h-10 bg-gray-800 hover:bg-indigo-500/30 border border-gray-700 rounded-xl font-bold text-white text-lg transition-colors">
              {n}
            </button>
          ))}
          <button onClick={erase} className="w-10 h-10 bg-gray-800 hover:bg-red-500/20 border border-gray-700 rounded-xl text-gray-400 hover:text-red-400 text-lg transition-colors">⌫</button>
          <button onClick={() => setNoteMode(m => !m)}
            className={`px-3 h-10 rounded-xl text-sm font-medium border transition-colors ${noteMode ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}>
            ✏️ Notes
          </button>
        </div>
      )}

      <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Back to lobby</button>
    </div>
  );
};

export default Sudoku;