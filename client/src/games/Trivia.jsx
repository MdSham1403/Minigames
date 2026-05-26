import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import sounds from '../utils/sounds';

const CATEGORIES = [
  { id: '',   label: '🌍 Any category' },
  { id: '9',  label: '🧠 General Knowledge' },
  { id: '17', label: '🔬 Science & Nature' },
  { id: '21', label: '🏅 Sports' },
  { id: '11', label: '🎬 Movies' },
  { id: '23', label: '📖 History' },
  { id: '15', label: '💻 Video Games' },
];

const DIFFICULTIES = ['easy', 'medium', 'hard'];

const decodeHTML = (str) =>
  str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
     .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&ldquo;/g, '"')
     .replace(/&rdquo;/g, '"').replace(/&hellip;/g, '...');

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

const QUESTION_TIME = 15; // seconds per question

const Trivia = ({ onBack }) => {
  const [status, setStatus]         = useState('setup'); // setup | loading | playing | result
  const [category, setCategory]     = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [questions, setQuestions]   = useState([]);
  const [qIndex, setQIndex]         = useState(0);
  const [options, setOptions]       = useState([]);
  const [chosen, setChosen]         = useState(null);   // index chosen
  const [correct, setCorrect]       = useState(null);   // index of correct answer
  const [score, setScore]           = useState(0);
  const [streak, setStreak]         = useState(0);
  const [timeLeft, setTimeLeft]     = useState(QUESTION_TIME);
  const [results, setResults]       = useState([]);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  const timerRef = useRef(null);
  const answeredRef = useRef(false);

  const totalQ = 10;

  // ── Fetch questions from Open Trivia DB ────────────────────────────────────
  const fetchQuestions = async () => {
    setStatus('loading');
    setError('');
    try {
      let url = `https://opentdb.com/api.php?amount=${totalQ}&type=multiple`;
      if (category)   url += `&category=${category}`;
      if (difficulty) url += `&difficulty=${difficulty}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.response_code !== 0) throw new Error('Failed to fetch questions');

      setQuestions(data.results);
      setQIndex(0);
      setScore(0);
      setStreak(0);
      setResults([]);
      setStatus('playing');
    } catch (e) {
      setError('Could not load questions. Check your internet connection.');
      setStatus('setup');
    }
  };

  // ── Build options for current question ────────────────────────────────────
  useEffect(() => {
    if (status !== 'playing' || !questions[qIndex]) return;
    const q = questions[qIndex];
    const shuffled = shuffle([q.correct_answer, ...q.incorrect_answers]);
    setOptions(shuffled);
    setChosen(null);
    setCorrect(null);
    setTimeLeft(QUESTION_TIME);
    answeredRef.current = false;
  }, [qIndex, status, questions]);

  // ── Timer per question ─────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'playing' || chosen !== null) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleAnswer(-1); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [status, qIndex, chosen]);

  // ── Handle answer ──────────────────────────────────────────────────────────
  const handleAnswer = useCallback((idx) => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    clearInterval(timerRef.current);

    const q = questions[qIndex];
    const correctIdx = options.indexOf(q.correct_answer);
    setChosen(idx);
    setCorrect(correctIdx);

    const isCorrect = idx === correctIdx;
    const timeBonus = Math.floor(timeLeft * 2);
    const diffBonus = { easy: 0, medium: 50, hard: 100 }[q.difficulty] || 0;
    const newStreak = isCorrect ? streak + 1 : 0;
    const streakBonus = newStreak > 1 ? (newStreak - 1) * 20 : 0;
    const gained = isCorrect ? 100 + timeBonus + diffBonus + streakBonus : 0;

    setStreak(newStreak);
    setScore(s => s + gained);
    setResults(r => [...r, { question: q.question, isCorrect, gained }]);

    // Advance after 1.5s
    setTimeout(() => {
      if (qIndex + 1 >= totalQ) {
        finishGame(score + gained);
      } else {
        setQIndex(i => i + 1);
      }
    }, 1500);
  }, [qIndex, questions, options, timeLeft, streak, score]);

  const finishGame = async (finalScore) => {
    setStatus('result');
    setSaving(true);
    try {
      await api.post('/scores', { gameName: 'trivia', score: finalScore, mode: 'single' });
    } catch (e) {}
    setSaving(false);
  };

  const timerPct = (timeLeft / QUESTION_TIME) * 100;
  const timerColor = timeLeft > 8 ? '#22c55e' : timeLeft > 4 ? '#eab308' : '#ef4444';

  // ── Setup screen ───────────────────────────────────────────────────────────
  if (status === 'setup') return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
      <div className="text-center">
        <p className="text-5xl mb-3">❓</p>
        <h2 className="text-2xl font-bold text-white">Trivia Quiz</h2>
        <p className="text-gray-400 mt-1">10 questions • 15 seconds each</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm w-full text-center">
          {error}
        </div>
      )}

      <div className="card w-full space-y-5">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="input-field"
          >
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-2">Difficulty</label>
          <div className="flex gap-2">
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                  difficulty === d ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <button onClick={fetchQuestions} className="btn-primary w-full py-3 text-lg">
          ▶ Start quiz
        </button>
      </div>
      <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
        ← Back to lobby
      </button>
    </div>
  );

  // ── Loading ────────────────────────────────────────────────────────────────
  if (status === 'loading') return (
    <div className="flex flex-col items-center gap-4 py-20">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-400">Loading questions...</p>
    </div>
  );

  // ── Results ────────────────────────────────────────────────────────────────
  if (status === 'result') {
    const correct = results.filter(r => r.isCorrect).length;
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
        <div className="text-center">
          <p className="text-5xl mb-3">{correct >= 7 ? '🏆' : correct >= 4 ? '🎉' : '😅'}</p>
          <h2 className="text-2xl font-bold text-white">Quiz complete!</h2>
          <p className="text-gray-400">{correct}/{totalQ} correct</p>
          <p className="text-3xl font-bold text-indigo-400 mt-2">{score} pts</p>
          {saving && <p className="text-xs text-gray-500 mt-1">Saving score...</p>}
        </div>
        <div className="card w-full space-y-2 max-h-64 overflow-y-auto">
          {results.map((r, i) => (
            <div key={i} className={`flex items-start gap-3 text-sm p-2 rounded-lg ${r.isCorrect ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              <span className="mt-0.5">{r.isCorrect ? '✅' : '❌'}</span>
              <span className="text-gray-300 flex-1 line-clamp-2">{decodeHTML(r.question)}</span>
              {r.isCorrect && <span className="text-green-400 font-medium shrink-0">+{r.gained}</span>}
            </div>
          ))}
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={() => setStatus('setup')} className="btn-secondary flex-1 py-3">Change settings</button>
          <button onClick={fetchQuestions} className="btn-primary flex-1 py-3">🔄 Play again</button>
        </div>
        <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
          ← Back to lobby
        </button>
      </div>
    );
  }

  // ── Playing ────────────────────────────────────────────────────────────────
  const q = questions[qIndex];
  if (!q) return null;

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-lg mx-auto">
      {/* Header */}
      <div className="flex justify-between w-full items-center">
        <span className="text-gray-400 text-sm">Q {qIndex + 1}/{totalQ}</span>
        <span className="text-indigo-400 font-bold">{score} pts</span>
        {streak > 1 && (
          <span className="text-orange-400 text-sm font-medium">🔥 x{streak}</span>
        )}
      </div>

      {/* Timer bar */}
      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${timerPct}%`, backgroundColor: timerColor }}
        />
      </div>
      <p className="text-sm font-mono" style={{ color: timerColor }}>{timeLeft}s</p>

      {/* Question */}
      <div className="card w-full text-center">
        <span className="text-xs text-gray-500 uppercase tracking-wider capitalize">
          {q.category} · {q.difficulty}
        </span>
        <p className="text-lg font-semibold text-white mt-3 leading-relaxed">
          {decodeHTML(q.question)}
        </p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {options.map((opt, i) => {
          let style = 'bg-gray-800 border-gray-700 hover:border-indigo-500 text-white';
          if (chosen !== null) {
            if (i === correct)      style = 'bg-green-500/20 border-green-500 text-green-300';
            else if (i === chosen)  style = 'bg-red-500/20 border-red-500 text-red-300';
            else                    style = 'bg-gray-800 border-gray-700 text-gray-500';
          }
          return (
            <button
              key={i}
              onClick={() => chosen === null && handleAnswer(i)}
              disabled={chosen !== null}
              className={`border-2 rounded-xl px-4 py-3 text-sm font-medium text-left transition-all ${style} ${chosen === null ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span className="text-gray-500 mr-2">{['A','B','C','D'][i]}.</span>
              {decodeHTML(opt)}
            </button>
          );
        })}
      </div>

      <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors mt-2">
        ← Back to lobby
      </button>
    </div>
  );
};

export default Trivia;
