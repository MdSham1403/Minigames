import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import sounds from '../utils/sounds';

const COLORS = [
  { name: 'RED',    hex: '#ef4444' },
  { name: 'BLUE',   hex: '#3b82f6' },
  { name: 'GREEN',  hex: '#22c55e' },
  { name: 'YELLOW', hex: '#eab308' },
  { name: 'PURPLE', hex: '#a855f7' },
  { name: 'ORANGE', hex: '#f97316' },
  { name: 'PINK',   hex: '#ec4899' },
  { name: 'TEAL',   hex: '#14b8a6' },
];

const genRound = () => {
  const textColor = COLORS[Math.floor(Math.random() * COLORS.length)];
  let wordColor;
  do { wordColor = COLORS[Math.floor(Math.random() * COLORS.length)]; } while (wordColor.name === textColor.name);
  // Options: the ink color + 3 others
  const others = COLORS.filter(c => c.name !== textColor.name).sort(() => Math.random()-0.5).slice(0, 3);
  const options = [textColor, ...others].sort(() => Math.random()-0.5);
  return { word: wordColor.name, inkColor: textColor, options, answer: textColor.name };
};

const TOTAL = 20;
const TIME_PER_Q = 4;

const ColorMatch = ({ onBack }) => {
  const [status, setStatus]   = useState('idle');
  const [round, setRound]     = useState(null);
  const [qNum, setQNum]       = useState(0);
  const [score, setScore]     = useState(0);
  const [streak, setStreak]   = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving]   = useState(false);
  const timerRef = useRef(null);
  const answeredRef = useRef(false);

  const nextRound = useCallback((num, currentScore, currentStreak) => {
    clearInterval(timerRef.current);
    if (num >= TOTAL) {
      setStatus('done');
      setSaving(true);
      sounds.win(); api.post('/scores', { gameName: 'colormatch', score: currentScore, mode: 'single' })
        .catch(() => {}).finally(() => setSaving(false));
      return;
    }
    setRound(genRound());
    setQNum(num + 1);
    setFeedback(null);
    setTimeLeft(TIME_PER_Q);
    answeredRef.current = false;

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          if (!answeredRef.current) {
            answeredRef.current = true;
            setFeedback('timeout'); sounds.wrong();
            setStreak(0);
            setTimeout(() => nextRound(num + 1, currentScore, 0), 800);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  const handleAnswer = useCallback((colorName) => {
    if (answeredRef.current || !round) return;
    answeredRef.current = true;
    clearInterval(timerRef.current);

    if (colorName === round.answer) {
      const newStreak = streak + 1;
      const bonus = timeLeft * 20 + (newStreak > 1 ? newStreak * 15 : 0);
      const gained = 50 + bonus;
      setStreak(newStreak);
      setFeedback('correct'); sounds.correct();
      setScore(s => {
        const ns = s + gained;
        setTimeout(() => nextRound(qNum, ns, newStreak), 600);
        return ns;
      });
    } else {
      setFeedback('wrong'); sounds.wrong();
      setStreak(0);
      setTimeout(() => nextRound(qNum, score, 0), 900);
    }
  }, [round, timeLeft, streak, qNum, score, nextRound]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">Colour Match</h2>
        <p className="text-gray-400 text-xs mt-1">Tap the <span className="text-indigo-400 font-medium">INK COLOUR</span>, not the word!</p>
      </div>

      <div className="flex gap-5 text-center">
        <div><p className="text-xs text-gray-500">Q</p><p className="text-xl font-bold text-white">{qNum}/{TOTAL}</p></div>
        <div><p className="text-xs text-gray-500">Score</p><p className="text-xl font-bold text-indigo-400">{score}</p></div>
        <div><p className="text-xs text-gray-500">Streak</p><p className="text-xl font-bold text-orange-400">{streak > 1 ? `🔥${streak}` : streak}</p></div>
      </div>

      {status === 'playing' && round && (
        <>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${(timeLeft/TIME_PER_Q)*100}%`, backgroundColor: timeLeft > 2 ? '#6366f1' : '#ef4444' }} />
          </div>

          <div className={`card w-full text-center py-10 transition-colors ${
            feedback === 'correct' ? 'border-green-500/50' : feedback === 'wrong' ? 'border-red-500/50' : ''
          }`}>
            <p className="text-6xl font-black tracking-wider" style={{ color: round.inkColor.hex }}>
              {round.word}
            </p>
            <p className="text-gray-500 text-xs mt-4">What colour is the INK?</p>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full">
            {round.options.map((c, i) => (
              <button key={i} onClick={() => !feedback && handleAnswer(c.name)}
                className="py-5 rounded-2xl font-bold text-lg text-white border-2 border-transparent hover:border-white/30 transition-all active:scale-95"
                style={{ backgroundColor: c.hex + '33', borderColor: c.hex + '55' }}>
                <span style={{ color: c.hex }}>{c.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {(status === 'idle' || status === 'done') && (
        <div className="card w-full text-center py-10">
          <p className="text-5xl mb-4">{status === 'done' ? '🎨' : '🌈'}</p>
          <h2 className="text-2xl font-bold text-white mb-2">{status === 'done' ? 'Nice reflexes!' : 'Colour Match'}</h2>
          {status === 'done' && <p className="text-2xl font-bold text-indigo-400 mb-2">{score} pts</p>}
          {status === 'idle' && <p className="text-gray-400 text-sm mb-4">Tap the ink color, not the word — tricky!</p>}
          {saving && <p className="text-xs text-gray-500 mb-4">Saving...</p>}
          <button onClick={() => { setScore(0); setStreak(0); setStatus('playing'); nextRound(0,0,0); }}
            className="btn-primary px-10 py-3 text-lg">
            {status === 'done' ? '🔄 Play again' : '▶ Start'}
          </button>
        </div>
      )}

      <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Back to lobby</button>
    </div>
  );
};

export default ColorMatch;
