import { useState, useCallback } from 'react';
import api from '../api/axios';
import sounds from '../utils/sounds';

const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

const checkWinner = (board) => {
  for (const [a,b,c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c])
      return { winner: board[a], line: [a,b,c] };
  }
  if (board.every(Boolean)) return { winner: 'draw', line: [] };
  return null;
};

// Minimax AI
const minimax = (board, isMax) => {
  const result = checkWinner(board);
  if (result?.winner === 'O') return 10;
  if (result?.winner === 'X') return -10;
  if (result?.winner === 'draw') return 0;

  const scores = [];
  board.forEach((cell, i) => {
    if (!cell) {
      board[i] = isMax ? 'O' : 'X';
      scores.push(minimax(board, !isMax));
      board[i] = null;
    }
  });
  return isMax ? Math.max(...scores) : Math.min(...scores);
};

const getBestMove = (board) => {
  let best = -Infinity, move = -1;
  board.forEach((cell, i) => {
    if (!cell) {
      board[i] = 'O';
      const score = minimax(board, false);
      board[i] = null;
      if (score > best) { best = score; move = i; }
    }
  });
  return move;
};

const TicTacToe = ({ onBack }) => {
  const [board, setBoard]     = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [status, setStatus]   = useState('idle'); // idle | playing | done
  const [result, setResult]   = useState(null);   // { winner, line }
  const [mode, setMode]       = useState('ai');   // ai | pvp
  const [score, setScore]     = useState({ X: 0, O: 0, draw: 0 });
  const [saving, setSaving]   = useState(false);

  const startGame = () => {
    setBoard(Array(9).fill(null));
    setXIsNext(true);
    setResult(null);
    setStatus('playing');
  };

  const saveScore = async (pts) => {
    setSaving(true);
    try { await api.post('/scores', { gameName: 'tictactoe', score: pts, mode: 'single' }); } catch {}
    setSaving(false);
  };

  const handleClick = useCallback(async (idx) => {
    if (status !== 'playing' || board[idx] || result) return;
    if (mode === 'ai' && !xIsNext) return; // wait for AI

    const newBoard = [...board];
    newBoard[idx] = xIsNext ? 'X' : 'O';
    const res = checkWinner(newBoard);
    sounds.click();

    setBoard(newBoard);
    setXIsNext(!xIsNext);

    if (res) {
      setResult(res);
      setStatus('done');
      setScore(s => ({ ...s, [res.winner]: (s[res.winner] || 0) + 1 }));
      saveScore(res.winner === 'X' ? 100 : res.winner === 'draw' ? 50 : 0);
      if (res.winner === 'X') sounds.win();
      else if (res.winner === 'draw') sounds.beep();
      else sounds.gameOver();
      return;
    }

    // AI move
    if (mode === 'ai' && xIsNext) {
      setTimeout(() => {
        const aiBoard = [...newBoard];
        const aiMove = getBestMove(aiBoard);
        if (aiMove === -1) return;
        aiBoard[aiMove] = 'O';
        const aiRes = checkWinner(aiBoard);
        setBoard(aiBoard);
        setXIsNext(true);
        if (aiRes) {
          setResult(aiRes);
          setStatus('done');
          setScore(s => ({ ...s, [aiRes.winner]: (s[aiRes.winner] || 0) + 1 }));
          saveScore(aiRes.winner === 'X' ? 100 : aiRes.winner === 'draw' ? 50 : 0);
          if (aiRes.winner === 'X') sounds.win(); else sounds.gameOver();
        }
      }, 400);
    }
  }, [board, xIsNext, status, result, mode]);

  const cellStyle = (idx) => {
    const base = 'w-24 h-24 md:w-28 md:h-28 text-4xl font-bold rounded-2xl border-2 flex items-center justify-center transition-all duration-150 ';
    const isWin = result?.line?.includes(idx);
    if (isWin) return base + 'border-yellow-400 bg-yellow-400/20 scale-105';
    if (!board[idx] && status === 'playing') return base + 'border-gray-700 bg-gray-800 hover:border-indigo-500 hover:bg-gray-700 cursor-pointer active:scale-95';
    return base + 'border-gray-700 bg-gray-800 cursor-default';
  };

  const playerLabel = mode === 'ai'
    ? (xIsNext ? 'Your turn (X)' : 'AI thinking...')
    : (xIsNext ? 'Player X turn' : 'Player O turn');

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Score */}
      <div className="flex gap-4 text-center">
        {['X','draw','O'].map(k => (
          <div key={k} className="bg-gray-800 rounded-xl px-5 py-2">
            <p className="text-xs text-gray-400">{k === 'draw' ? 'Draw' : k === 'X' ? (mode === 'ai' ? 'You' : 'X') : (mode === 'ai' ? 'AI' : 'O')}</p>
            <p className="text-2xl font-bold text-white">{score[k] || 0}</p>
          </div>
        ))}
      </div>

      {/* Board */}
      <div className="relative">
        <div className="grid grid-cols-3 gap-2">
          {board.map((cell, idx) => (
            <button key={idx} onClick={() => handleClick(idx)} className={cellStyle(idx)}>
              <span className={cell === 'X' ? 'text-indigo-400' : 'text-pink-400'}>{cell}</span>
            </button>
          ))}
        </div>

        {/* Overlay */}
        {status !== 'playing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/80 rounded-2xl gap-4">
            {status === 'idle' && (
              <>
                <p className="text-4xl">❌⭕</p>
                <p className="text-xl font-bold text-white">Tic Tac Toe</p>
                <div className="flex gap-2">
                  {['ai','pvp'].map(m => (
                    <button key={m} onClick={() => setMode(m)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${mode === m ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                      {m === 'ai' ? '🤖 vs AI' : '👥 2 Players'}
                    </button>
                  ))}
                </div>
              </>
            )}
            {status === 'done' && (
              <>
                <p className="text-4xl">{result?.winner === 'draw' ? '🤝' : '🏆'}</p>
                <p className="text-xl font-bold text-white">
                  {result?.winner === 'draw' ? "It's a draw!" : `${result?.winner === 'X' ? (mode === 'ai' ? 'You' : 'X') : (mode === 'ai' ? 'AI' : 'O')} wins!`}
                </p>
                {saving && <p className="text-xs text-gray-500">Saving...</p>}
              </>
            )}
            <button onClick={startGame} className="btn-primary px-8 py-3">
              {status === 'idle' ? '▶ Start game' : '🔄 Play again'}
            </button>
          </div>
        )}
      </div>

      {status === 'playing' && (
        <p className="text-gray-400 text-sm">{playerLabel}</p>
      )}

      <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Back to lobby</button>
    </div>
  );
};

export default TicTacToe;
