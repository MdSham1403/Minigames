import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';

const genQuestion = (level) => {
  const ops = level < 3 ? ['+', '-'] : level < 6 ? ['+', '-', '×'] : ['+', '-', '×', '÷'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  const max = 10 + level * 8;
  let a, b, ans;
  switch (op) {
    case '+': a = Math.floor(Math.random()*max)+1; b = Math.floor(Math.random()*max)+1; ans = a+b; break;
    case '-': a = Math.floor(Math.random()*max)+5; b = Math.floor(Math.random()*a)+1; ans = a-b; break;
    case '×': a = Math.floor(Math.random()*12)+1; b = Math.floor(Math.random()*12)+1; ans = a*b; break;
    case '÷': b = Math.floor(Math.random()*11)+2; ans = Math.floor(Math.random()*11)+1; a = b*ans; break;
    default: a=1;b=1;ans=2;
  }
  // Generate wrong options
  const options = new Set([ans]);
  while (options.size < 4) {
    const delta = Math.floor(Math.random() * (level+3)*2) + 1;
    options.add(Math.random() > 0.5 ? ans + delta : Math.max(0, ans - delta));
  }
  return { question: `${a} ${op} ${b}`, answer: ans, options: [...options].sort(() => Math.random()-0.5) };
};

const TOTAL = 15;
const BASE_TIME = 10; // seconds per question, decreasing with level

const MathBlaster = ({ onBack }) => {
  const [status, setStatus]   = useState('idle');
  const [qNum, setQNum]       = useState(0);
  const [q, setQ]             = useState(null);
  const [score, setScore]     = useState(0);
  const [streak, setStreak]   = useState(0);
  const [timeLeft, setTimeLeft] = useState(BASE_TIME);
  const [chosen, setChosen]   = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [level, setLevel]     = useState(1);
  const [saving, setSaving]   = useState(false);
  const timerRef = useRef(null);
  const answeredRef = useRef(false);

  const nextQ = useCallback((num, currentScore, currentStreak, currentLevel) => {
    clearInterval(timerRef.current);
    if (num >= TOTAL) {
      setStatus('done');
      setSaving(true);
      api.post('/scores', { gameName: 'mathblaster', score: currentScore, mode: 'single' })
        .catch(() => {}).finally(() => setSaving(false));
      return;
    }
    const newLevel = Math.floor(num / 3) + 1;
    const question = genQuestion(newLevel);
    setQ(question);
    setQNum(num + 1);
    setLevel(newLevel);
    setChosen(null);
    setFeedback(null);
    answeredRef.current = false;
    const t = Math.max(4, BASE_TIME - newLevel);
    setTimeLeft(t);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!answeredRef.current) {
            answeredRef.current = true;
            setFeedback('timeout');
            setStreak(0);
            setTimeout(() => nextQ(num + 1, currentScore, 0, newLevel), 1000);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleAnswer = useCallback((opt) => {
    if (answeredRef.current || !q) return;
    answeredRef.current = true;
    clearInterval(timerRef.current);
    setChosen(opt);

    if (opt === q.answer) {
      const newStreak = streak + 1;
      const bonus = timeLeft * 5 + (newStreak > 1 ? newStreak * 10 : 0);
      const gained = 100 + bonus;
      setStreak(newStreak);
      setFeedback('correct');
      setScore(s => {
        const ns = s + gained;
        setTimeout(() => nextQ(qNum, ns, newStreak, level), 900);
        return ns;
      });
    } else {
      setFeedback('wrong');
      setStreak(0);
      setTimeout(() => nextQ(qNum, score, 0, level), 1200);
    }
  }, [q, timeLeft, streak, qNum, level, score, nextQ]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const timerPct = q ? (timeLeft / Math.max(4, BASE_TIME - level + 1)) * 100 : 100;

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-sm mx-auto">
      <div className="flex gap-5 text-center">
        <div><p className="text-xs text-gray-500">Q</p><p className="text-xl font-bold text-white">{qNum}/{TOTAL}</p></div>
        <div><p className="text-xs text-gray-500">Score</p><p className="text-xl font-bold text-indigo-400">{score}</p></div>
        <div><p className="text-xs text-gray-500">Streak</p><p className="text-xl font-bold text-orange-400">{streak > 1 ? `🔥${streak}` : streak}</p></div>
        <div><p className="text-xs text-gray-500">Level</p><p className="text-xl font-bold text-purple-400">{level}</p></div>
      </div>

      {status === 'playing' && q && (
        <>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${timerPct}%`, backgroundColor: timeLeft > 5 ? '#22c55e' : '#ef4444' }} />
          </div>

          <div className="card w-full text-center py-8">
            <p className="text-xs text-gray-500 mb-3">Solve it fast!</p>
            <p className="text-5xl font-black text-white font-mono">{q.question} = ?</p>
            {feedback === 'timeout' && <p className="text-gray-400 mt-3">Answer: <span className="text-white font-bold">{q.answer}</span></p>}
          </div>

          <div className="grid grid-cols-2 gap-3 w-full">
            {q.options.map((opt, i) => {
              let style = 'bg-gray-800 border-2 border-gray-700 hover:border-indigo-500 text-white cursor-pointer';
              if (chosen !== null) {
                if (opt === q.answer) style = 'bg-green-500/20 border-2 border-green-500 text-green-300 cursor-default';
                else if (opt === chosen) style = 'bg-red-500/20 border-2 border-red-500 text-red-300 cursor-default';
                else style = 'bg-gray-800 border-2 border-gray-700 text-gray-500 cursor-default';
              }
              return (
                <button key={i} onClick={() => chosen === null && handleAnswer(opt)}
                  disabled={chosen !== null}
                  className={`py-5 rounded-2xl text-3xl font-bold transition-all active:scale-95 ${style}`}>
                  {opt}
                </button>
              );
            })}
          </div>
        </>
      )}

      {(status === 'idle' || status === 'done') && (
        <div className="card w-full text-center py-10">
          <p className="text-5xl mb-4">{status === 'done' ? '🧮' : '⚡'}</p>
          <h2 className="text-2xl font-bold text-white mb-2">{status === 'done' ? 'Blasted!' : 'Math Blaster'}</h2>
          {status === 'done' && <p className="text-2xl font-bold text-indigo-400 mb-2">{score} pts</p>}
          {status === 'idle' && <p className="text-gray-400 text-sm mb-4">Answer {TOTAL} math questions — fast!</p>}
          {saving && <p className="text-xs text-gray-500 mb-4">Saving...</p>}
          <button onClick={() => { setScore(0); setStreak(0); setStatus('playing'); nextQ(0,0,0,1); }}
            className="btn-primary px-10 py-3 text-lg">
            {status === 'done' ? '🔄 Again' : '⚡ Start'}
          </button>
        </div>
      )}

      <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Back to lobby</button>
    </div>
  );
};

export default MathBlaster;