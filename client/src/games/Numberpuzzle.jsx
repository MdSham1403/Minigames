import { useState, useCallback, useEffect } from 'react';
import api from '../api/axios';

const SIZE = 4;
const TOTAL = SIZE * SIZE;

const isSolvable = (tiles) => {
  let inv = 0;
  const flat = tiles.filter(t => t !== 0);
  for (let i = 0; i < flat.length; i++)
    for (let j = i+1; j < flat.length; j++)
      if (flat[i] > flat[j]) inv++;
  const blankRow = Math.floor(tiles.indexOf(0) / SIZE);
  return (SIZE % 2 === 1) ? inv % 2 === 0 : (blankRow % 2 === 0) ? inv % 2 === 1 : inv % 2 === 0;
};

const generate = () => {
  let tiles;
  do {
    tiles = [...Array(TOTAL).keys()].sort(() => Math.random()-0.5);
  } while (!isSolvable(tiles) || isSolved(tiles));
  return tiles;
};

const isSolved = (tiles) => tiles.every((t,i) => t === (i+1) % TOTAL);

const NumberPuzzle = ({ onBack }) => {
  const [tiles, setTiles]   = useState(Array.from({length:TOTAL},(_,i)=>(i+1)%TOTAL));
  const [moves, setMoves]   = useState(0);
  const [status, setStatus] = useState('idle');
  const [time, setTime]     = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status !== 'playing') return;
    const t = setInterval(() => setTime(s=>s+1), 1000);
    return () => clearInterval(t);
  }, [status]);

  const startGame = () => {
    setTiles(generate());
    setMoves(0); setTime(0); setStatus('playing');
  };

  const handleClick = useCallback((idx) => {
    if (status !== 'playing') return;
    const blank = tiles.indexOf(0);
    const row = Math.floor(idx/SIZE), col = idx%SIZE;
    const br  = Math.floor(blank/SIZE), bc  = blank%SIZE;
    const adjacent = (Math.abs(row-br) + Math.abs(col-bc)) === 1;
    if (!adjacent) return;

    const newTiles = [...tiles];
    [newTiles[idx], newTiles[blank]] = [newTiles[blank], newTiles[idx]];
    setTiles(newTiles);
    setMoves(m => m+1);

    if (isSolved(newTiles)) {
      setStatus('done');
      const score = Math.max(0, 2000 - moves * 5 - time * 2);
      setSaving(true);
      api.post('/scores', { gameName: 'numberpuzzle', score, mode: 'single' })
        .catch(()=>{}).finally(()=>setSaving(false));
    }
  }, [tiles, status, moves, time]);

  useEffect(() => {
    const handler = (e) => {
      if (status !== 'playing') return;
      const blank = tiles.indexOf(0);
      const br = Math.floor(blank/SIZE), bc = blank%SIZE;
      let target = -1;
      if (e.key === 'ArrowLeft'  && bc < SIZE-1) target = blank+1;
      if (e.key === 'ArrowRight' && bc > 0)      target = blank-1;
      if (e.key === 'ArrowUp'    && br < SIZE-1) target = blank+SIZE;
      if (e.key === 'ArrowDown'  && br > 0)      target = blank-SIZE;
      if (target !== -1) { e.preventDefault(); handleClick(target); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [tiles, status, handleClick]);

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex gap-6 text-center">
        <div><p className="text-xs text-gray-500">Moves</p><p className="text-2xl font-bold text-white">{moves}</p></div>
        <div><p className="text-xs text-gray-500">Time</p><p className="text-2xl font-bold text-indigo-400 font-mono">{fmt(time)}</p></div>
      </div>

      <div className="bg-gray-800 p-3 rounded-2xl border border-gray-700 relative">
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}>
          {tiles.map((t, idx) => (
            <button key={idx} onClick={() => handleClick(idx)}
              className={`w-16 h-16 md:w-18 md:h-18 rounded-xl text-xl font-bold transition-all duration-150 ${
                t === 0 ? 'bg-gray-900 border border-gray-700 cursor-default' :
                'bg-indigo-500/20 border-2 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/30 hover:border-indigo-400 cursor-pointer active:scale-95'
              }`}
              style={{ width: '4rem', height: '4rem' }}>
              {t !== 0 ? t : ''}
            </button>
          ))}
        </div>

        {(status === 'idle' || status === 'done') && (
          <div className="absolute inset-0 bg-gray-900/90 rounded-2xl flex flex-col items-center justify-center gap-4">
            <p className="text-4xl">{status === 'done' ? '🎉' : '🔢'}</p>
            <h2 className="text-xl font-bold text-white">{status === 'done' ? 'Puzzle solved!' : '15 Puzzle'}</h2>
            {status === 'done' && <p className="text-gray-400">{moves} moves · {fmt(time)}</p>}
            {status === 'idle' && <p className="text-gray-400 text-sm text-center px-4">Slide tiles to arrange 1–15 in order</p>}
            {saving && <p className="text-xs text-gray-500">Saving...</p>}
            <button onClick={startGame} className="btn-primary px-8 py-3">{status === 'done' ? '🔄 New puzzle' : '▶ Start'}</button>
          </div>
        )}
      </div>

      <p className="text-gray-600 text-xs">Click adjacent tiles · Arrow keys move blank</p>
      <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Back to lobby</button>
    </div>
  );
};

export default NumberPuzzle;