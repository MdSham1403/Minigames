import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import sounds from '../utils/sounds';

const HOLES = 9;
const GAME_TIME = 30;

const WhackAMole = ({ onBack }) => {
  const [status, setStatus]   = useState('idle');
  const [score, setScore]     = useState(0);
  const [misses, setMisses]   = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [moles, setMoles]     = useState(Array(HOLES).fill(false));
  const [whacked, setWhacked] = useState(Array(HOLES).fill(false)); // flash animation
  const [best, setBest]       = useState(0);
  const [saving, setSaving]   = useState(false);
  const [level, setLevel]     = useState(1);

  const moleTimers   = useRef([]);
  const gameTimer    = useRef(null);
  const frameRef     = useRef(null);
  const scoreRef     = useRef(0);

  const clearAllTimers = () => {
    moleTimers.current.forEach(t => clearTimeout(t));
    moleTimers.current = [];
    clearInterval(gameTimer.current);
  };

  const popMole = useCallback(() => {
    const hole = Math.floor(Math.random() * HOLES);
    const duration = Math.max(600, 1200 - level * 80);
    setMoles(prev => { const n=[...prev]; n[hole]=true; return n; });
    const t = setTimeout(() => {
      setMoles(prev => { const n=[...prev]; if(n[hole]) setMisses(m=>m+1); n[hole]=false; return n; });
    }, duration);
    moleTimers.current.push(t);
  }, [level]);

  const scheduleMoles = useCallback(() => {
    const interval = Math.max(400, 900 - level * 60);
    const t = setTimeout(() => {
      if (frameRef.current) { popMole(); scheduleMoles(); }
    }, interval);
    moleTimers.current.push(t);
  }, [level, popMole]);

  const endGame = useCallback(async () => {
    clearAllTimers();
    frameRef.current = false;
    const final = scoreRef.current;
    setStatus('done');
    setBest(b => Math.max(b, final));
    setSaving(true);
    try { await api.post('/scores', { gameName: 'whackamole', score: final, mode: 'single' }); } catch {}
    setSaving(false);
  }, []);

  const startGame = () => {
    clearAllTimers();
    frameRef.current = true;
    scoreRef.current = 0;
    setScore(0); setMisses(0); setTimeLeft(GAME_TIME); setLevel(1);
    setMoles(Array(HOLES).fill(false));
    setStatus('playing');

    // Timer
    let t = GAME_TIME;
    gameTimer.current = setInterval(() => {
      t--;
      setTimeLeft(t);
      setLevel(Math.floor((GAME_TIME - t) / 6) + 1);
      if (t <= 0) endGame();
    }, 1000);

    scheduleMoles();
  };

  useEffect(() => () => clearAllTimers(), []);

  const handleWhack = useCallback((i) => {
    if (!moles[i] || status !== 'playing') return;
    setMoles(prev => { const n=[...prev]; n[i]=false; return n; });
    setWhacked(prev => { const n=[...prev]; n[i]=true; return n; });
    setTimeout(() => setWhacked(prev => { const n=[...prev]; n[i]=false; return n; }), 200);
    scoreRef.current += 10;
    setScore(scoreRef.current);
  }, [moles, status]);

  const timerPct = (timeLeft / GAME_TIME) * 100;

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-sm mx-auto">
      <div className="flex gap-5 text-center">
        <div><p className="text-xs text-gray-500">Score</p><p className="text-2xl font-bold text-indigo-400">{score}</p></div>
        <div><p className="text-xs text-gray-500">Time</p><p className="text-2xl font-bold text-white">{timeLeft}s</p></div>
        <div><p className="text-xs text-gray-500">Misses</p><p className="text-2xl font-bold text-red-400">{misses}</p></div>
        <div><p className="text-xs text-gray-500">Best</p><p className="text-2xl font-bold text-yellow-400">{best}</p></div>
      </div>

      {status === 'playing' && (
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
            style={{ width: `${timerPct}%` }} />
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 w-full">
        {moles.map((up, i) => (
          <button key={i} onClick={() => handleWhack(i)}
            className={`aspect-square rounded-2xl border-2 flex items-center justify-center text-4xl transition-all duration-150 select-none
              ${whacked[i] ? 'bg-yellow-500/30 border-yellow-500 scale-90' :
                up ? 'bg-amber-800/40 border-amber-600 cursor-pointer hover:scale-105 active:scale-90 scale-105' :
                'bg-gray-800/50 border-gray-700 cursor-default'}
            `}>
            {whacked[i] ? '💥' : up ? '🐹' : '🕳️'}
          </button>
        ))}
      </div>

      {(status === 'idle' || status === 'done') && (
        <div className="card w-full text-center py-8">
          <p className="text-5xl mb-3">{status === 'done' ? '🔨' : '🐹'}</p>
          <h2 className="text-2xl font-bold text-white mb-2">{status === 'done' ? 'Time\'s up!' : 'Whack-a-Mole'}</h2>
          {status === 'done' && (
            <><p className="text-2xl font-bold text-indigo-400 mb-1">{score} pts</p>
            <p className="text-gray-400 text-sm mb-4">Misses: {misses}</p></>
          )}
          {status === 'idle' && <p className="text-gray-400 text-sm mb-4">Whack the moles before they hide! 30 seconds.</p>}
          {saving && <p className="text-xs text-gray-500 mb-4">Saving...</p>}
          <button onClick={startGame} className="btn-primary px-10 py-3 text-lg">
            {status === 'done' ? '🔄 Again' : '▶ Start'}
          </button>
        </div>
      )}

      <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Back to lobby</button>
    </div>
  );
};

export default WhackAMole;