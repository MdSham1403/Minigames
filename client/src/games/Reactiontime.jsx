import { useState, useRef, useCallback } from 'react';
import api from '../api/axios';
import sounds from '../utils/sounds';

const ROUNDS = 5;

const Reactiontime = ({ onBack }) => {
  const [status, setStatus]   = useState('idle');   // idle | waiting | ready | too-early | done
  const [times, setTimes]     = useState([]);
  const [round, setRound]     = useState(0);
  const [current, setCurrent] = useState(null);
  const [saving, setSaving]   = useState(false);
  const startRef = useRef(null);
  const timerRef = useRef(null);

  const avg = times.length ? Math.round(times.reduce((a,b)=>a+b,0)/times.length) : 0;
  const best = times.length ? Math.min(...times) : 0;

  const startRound = useCallback(() => {
    setStatus('waiting');
    setCurrent(null);
    const delay = 1500 + Math.random() * 3000;
    timerRef.current = setTimeout(() => {
      startRef.current = Date.now();
      sounds.go(); setStatus('ready');
    }, delay);
  }, []);

  const handleClick = useCallback(async () => {
    if (status === 'idle' || status === 'done') return;

    if (status === 'waiting') {
      clearTimeout(timerRef.current);
      sounds.wrong(); setStatus('too-early');
      return;
    }

    if (status === 'too-early') {
      startRound();
      return;
    }

    if (status === 'ready') {
      sounds.correct(); const rt = Date.now() - startRef.current;
      setCurrent(rt);
      const newTimes = [...times, rt];
      const newRound = round + 1;
      setTimes(newTimes);
      setRound(newRound);
      setStatus('idle');

      if (newRound >= ROUNDS) {
        const avg = Math.round(newTimes.reduce((a,b)=>a+b,0)/newTimes.length);
        const score = Math.max(0, 1000 - avg);
        sounds.win(); setStatus('done');
        setSaving(true);
        try { await api.post('/scores', { gameName: 'reaction', score, mode: 'single' }); } catch {}
        setSaving(false);
        return;
      }
      setTimeout(startRound, 1200);
    }
  }, [status, times, round, startRound]);

  const rating = (ms) => {
    if (ms < 180) return { label: '⚡ Lightning!', color: 'text-yellow-400' };
    if (ms < 230) return { label: '🏃 Fast!', color: 'text-green-400' };
    if (ms < 280) return { label: '👍 Good', color: 'text-indigo-400' };
    if (ms < 350) return { label: '😐 Average', color: 'text-gray-300' };
    return { label: '🐢 Slow', color: 'text-red-400' };
  };

  const bgColor = status === 'ready' ? '#22c55e' :
    status === 'too-early' ? '#ef4444' :
    status === 'waiting' ? '#1e293b' : '#1e293b';

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-sm mx-auto">
      <div className="flex gap-5 text-center">
        <div><p className="text-xs text-gray-500">Round</p><p className="text-xl font-bold text-white">{round}/{ROUNDS}</p></div>
        <div><p className="text-xs text-gray-500">Avg</p><p className="text-xl font-bold text-indigo-400">{avg ? `${avg}ms` : '—'}</p></div>
        <div><p className="text-xs text-gray-500">Best</p><p className="text-xl font-bold text-yellow-400">{best ? `${best}ms` : '—'}</p></div>
      </div>

      {/* Main tap area */}
      <button
        onClick={handleClick}
        className="w-full h-64 rounded-3xl flex flex-col items-center justify-center gap-3 transition-colors duration-100 select-none active:scale-98 border-2"
        style={{ backgroundColor: bgColor, borderColor: status === 'ready' ? '#16a34a' : '#374151' }}
      >
        {status === 'idle' && round === 0 && (
          <><p className="text-5xl">⚡</p><p className="text-xl font-bold text-white">Tap to start!</p><p className="text-gray-400 text-sm">Wait for green, then tap</p></>
        )}
        {status === 'idle' && round > 0 && (
          <><p className="text-3xl font-black text-white">{current}ms</p>
          <p className={`text-lg font-semibold ${rating(current).color}`}>{rating(current).label}</p>
          <p className="text-gray-400 text-sm mt-2">Tap to continue</p></>
        )}
        {status === 'waiting' && (
          <><p className="text-5xl animate-pulse">🔴</p><p className="text-xl font-bold text-white">Wait...</p><p className="text-gray-400 text-sm">Don't tap yet!</p></>
        )}
        {status === 'ready' && (
          <><p className="text-5xl">🟢</p><p className="text-3xl font-black text-white">TAP NOW!</p></>
        )}
        {status === 'too-early' && (
          <><p className="text-5xl">😬</p><p className="text-xl font-bold text-white">Too early!</p><p className="text-gray-400 text-sm">Tap to try again</p></>
        )}
        {status === 'done' && (
          <><p className="text-5xl">🏁</p><p className="text-xl font-bold text-white">Done!</p></>
        )}
      </button>

      {/* History */}
      {times.length > 0 && (
        <div className="flex gap-2 flex-wrap justify-center">
          {times.map((t, i) => (
            <span key={i} className={`text-sm px-3 py-1 rounded-full bg-gray-800 ${rating(t).color}`}>
              {t}ms
            </span>
          ))}
        </div>
      )}

      {status === 'done' && (
        <div className="card w-full text-center">
          <p className="text-lg font-bold text-white mb-1">Average: {avg}ms</p>
          <p className={`text-base font-semibold mb-3 ${rating(avg).color}`}>{rating(avg).label}</p>
          {saving && <p className="text-xs text-gray-500 mb-3">Saving...</p>}
          <button onClick={() => { setTimes([]); setRound(0); setStatus('idle'); setCurrent(null); }}
            className="btn-primary px-8 py-3">🔄 Try again</button>
        </div>
      )}

      <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Back to lobby</button>
    </div>
  );
};

export default Reactiontime;
