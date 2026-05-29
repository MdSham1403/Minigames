import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import sounds from '../utils/sounds';

const PADS = [
  { color: '#22c55e', lit: '#86efac', label: '🟢' },
  { color: '#ef4444', lit: '#fca5a5', label: '🔴' },
  { color: '#eab308', lit: '#fde047', label: '🟡' },
  { color: '#3b82f6', lit: '#93c5fd', label: '🔵' },
];

const Simonsays = ({ onBack }) => {
  const [sequence, setSequence]   = useState([]);
  const [playerSeq, setPlayerSeq] = useState([]);
  const [active, setActive]       = useState(null);
  const [status, setStatus]       = useState('idle');   // idle | showing | input | fail | win
  const [round, setRound]         = useState(0);
  const [speed, setSpeed]         = useState(600);
  const [best, setBest]           = useState(0);
  const [saving, setSaving]       = useState(false);

  const showSequence = useCallback((seq, spd) => {
    setStatus('showing');
    let i = 0;
    const show = () => {
      if (i >= seq.length) { setActive(null); setStatus('input'); return; }
      setActive(seq[i]); sounds.pad(seq[i]);
      i++;
      setTimeout(() => { setActive(null); setTimeout(show, spd * 0.4); }, spd * 0.6);
    };
    setTimeout(show, 500);
  }, []);

  const startGame = () => {
    const first = Math.floor(Math.random() * 4);
    setSequence([first]);
    setPlayerSeq([]);
    setRound(1);
    setSpeed(600);
    showSequence([first], 600);
  };

  const handlePad = useCallback((idx) => {
    if (status !== 'input') return;
    const newPlayerSeq = [...playerSeq, idx];
    setPlayerSeq(newPlayerSeq);
    setActive(idx);
    setTimeout(() => setActive(null), 200);

    const pos = newPlayerSeq.length - 1;
    if (newPlayerSeq[pos] !== sequence[pos]) {
      // Wrong!
      sounds.gameOver(); setStatus('fail');
      setBest(b => Math.max(b, round - 1));
      setSaving(true);
      api.post('/scores', { gameName: 'simon', score: (round-1)*50, mode: 'single' })
        .catch(()=>{}).finally(() => setSaving(false));
      return;
    }

    if (newPlayerSeq.length === sequence.length) {
      // Round complete
      const newRound = round + 1;
      const newSeq = [...sequence, Math.floor(Math.random() * 4)];
      const newSpeed = Math.max(250, 600 - newRound * 20);
      setRound(newRound);
      setSequence(newSeq);
      setPlayerSeq([]);
      setSpeed(newSpeed);
      setTimeout(() => showSequence(newSeq, newSpeed), 600);
    }
  }, [status, playerSeq, sequence, round, showSequence]);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto">
      <div className="flex gap-6 text-center">
        <div><p className="text-xs text-gray-500">Round</p><p className="text-2xl font-bold text-indigo-400">{round}</p></div>
        <div><p className="text-xs text-gray-500">Best</p><p className="text-2xl font-bold text-yellow-400">{best}</p></div>
      </div>

      {/* Status */}
      <div className="h-8 flex items-center">
        {status === 'showing' && <p className="text-gray-400 text-sm animate-pulse">Watch the pattern...</p>}
        {status === 'input'   && <p className="text-indigo-400 text-sm font-medium">Your turn! Repeat the pattern</p>}
        {status === 'fail'    && <p className="text-red-400 text-sm font-medium">Wrong! You reached round {round-1}</p>}
        {status === 'idle'    && <p className="text-gray-400 text-sm">Watch and repeat the pattern!</p>}
      </div>

      {/* Pads */}
      <div className="grid grid-cols-2 gap-4 w-full">
        {PADS.map((pad, i) => (
          <button key={i} onClick={() => handlePad(i)}
            disabled={status !== 'input'}
            className="aspect-square rounded-3xl transition-all duration-100 active:scale-95 disabled:cursor-not-allowed select-none text-4xl flex items-center justify-center"
            style={{
              backgroundColor: active === i ? pad.lit : pad.color,
              boxShadow: active === i ? `0 0 30px ${pad.lit}` : 'none',
              opacity: status === 'input' ? 1 : 0.7,
              transform: active === i ? 'scale(1.05)' : 'scale(1)',
            }}>
            {pad.label}
          </button>
        ))}
      </div>

      {(status === 'idle' || status === 'fail') && (
        <div className="w-full text-center">
          {saving && <p className="text-xs text-gray-500 mb-3">Saving score...</p>}
          <button onClick={startGame} className="btn-primary px-10 py-3 text-lg w-full">
            {status === 'fail' ? '🔄 Try again' : '▶ Start Simon Says'}
          </button>
        </div>
      )}

      <p className="text-gray-600 text-xs">The sequence gets longer and faster each round</p>
      <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Back to lobby</button>
    </div>
  );
};

export default Simonsays;
