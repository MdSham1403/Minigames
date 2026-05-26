import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import sounds from '../utils/sounds';

const WORD_BANK = [
  { word: 'REACT', hint: 'Popular JavaScript UI library' },
  { word: 'PYTHON', hint: 'Snake-named programming language' },
  { word: 'CANVAS', hint: 'HTML element for drawing graphics' },
  { word: 'SOCKET', hint: 'Used for real-time communication' },
  { word: 'KEYBOARD', hint: 'You type with this' },
  { word: 'BINARY', hint: 'Base-2 number system' },
  { word: 'ALGORITHM', hint: 'Step-by-step problem-solving method' },
  { word: 'DATABASE', hint: 'Where data is stored' },
  { word: 'FUNCTION', hint: 'Reusable block of code' },
  { word: 'VARIABLE', hint: 'Stores a value in code' },
  { word: 'THUNDER', hint: 'Sound during a storm' },
  { word: 'DOLPHIN', hint: 'Smart ocean mammal' },
  { word: 'JUNGLE', hint: 'Dense tropical forest' },
  { word: 'PYRAMID', hint: 'Ancient Egyptian structure' },
  { word: 'VOLCANO', hint: 'Mountain that erupts' },
  { word: 'COMPASS', hint: 'Navigation tool pointing north' },
  { word: 'BLANKET', hint: 'Keeps you warm in bed' },
  { word: 'LANTERN', hint: 'Portable light source' },
  { word: 'CRYSTAL', hint: 'Clear mineral formation' },
  { word: 'PHANTOM', hint: 'Ghost or apparition' },
];

const scramble = (word) => {
  let arr = word.split('');
  do { arr.sort(() => Math.random() - 0.5); } while (arr.join('') === word);
  return arr.join('');
};

const ROUND_TIME = 30;
const TOTAL_ROUNDS = 10;

const WordScramble = ({ onBack }) => {
  const [status, setStatus]       = useState('idle');
  const [round, setRound]         = useState(0);
  const [current, setCurrent]     = useState(null);
  const [scrambled, setScrambled] = useState('');
  const [input, setInput]         = useState('');
  const [feedback, setFeedback]   = useState(null); // 'correct' | 'wrong'
  const [score, setScore]         = useState(0);
  const [streak, setStreak]       = useState(0);
  const [timeLeft, setTimeLeft]   = useState(ROUND_TIME);
  const [hintUsed, setHintUsed]   = useState(false);
  const [showHint, setShowHint]   = useState(false);
  const [usedIdx, setUsedIdx]     = useState([]);
  const [saving, setSaving]       = useState(false);
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  const pickWord = useCallback((usedIndices) => {
    const avail = WORD_BANK.map((_, i) => i).filter(i => !usedIndices.includes(i));
    if (!avail.length) return null;
    const idx = avail[Math.floor(Math.random() * avail.length)];
    return { ...WORD_BANK[idx], idx };
  }, []);

  const nextRound = useCallback((currentRound, currentScore, currentUsed) => {
    clearInterval(timerRef.current);
    if (currentRound >= TOTAL_ROUNDS) {
      setStatus('done');
      setSaving(true);
      api.post('/scores', { gameName: 'wordscramble', score: currentScore, mode: 'single' })
        .catch(() => {}).finally(() => setSaving(false));
      return;
    }
    const word = pickWord(currentUsed);
    if (!word) { setStatus('done'); return; }

    setCurrent(word);
    setScrambled(scramble(word.word));
    setInput('');
    setFeedback(null);
    setHintUsed(false);
    setShowHint(false);
    setTimeLeft(ROUND_TIME);
    setUsedIdx(prev => [...prev, word.idx]);
    setRound(currentRound + 1);
    inputRef.current?.focus();

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setFeedback('timeout');
          setStreak(0);
          setTimeout(() => nextRound(currentRound + 1, currentScore, [...currentUsed, word.idx]), 1500);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [pickWord]);

  const startGame = () => {
    setScore(0); setStreak(0); setRound(0); setUsedIdx([]);
    setStatus('playing');
    nextRound(0, 0, []);
  };

  const handleGuess = useCallback(() => {
    if (!current || status !== 'playing') return;
    const guess = input.trim().toUpperCase();
    clearInterval(timerRef.current);

    if (guess === current.word) {
      const timeBonus = timeLeft * 3;
      const hintPenalty = hintUsed ? 30 : 0;
      const newStreak = streak + 1;
      const streakBonus = newStreak > 1 ? (newStreak - 1) * 10 : 0;
      const gained = Math.max(0, 100 + timeBonus + streakBonus - hintPenalty);
      setScore(s => {
        const ns = s + gained;
        setTimeout(() => nextRound(round, ns, usedIdx), 1200);
        return ns;
      });
      setStreak(newStreak);
      setFeedback('correct');
    } else {
      setFeedback('wrong');
      setStreak(0);
      setTimeout(() => {
        setFeedback(null);
        setInput('');
        // Restart timer for same word
        setTimeLeft(ROUND_TIME);
        timerRef.current = setInterval(() => {
          setTimeLeft(t => {
            if (t <= 1) {
              clearInterval(timerRef.current);
              setFeedback('timeout');
              setTimeout(() => nextRound(round, score, usedIdx), 1500);
              return 0;
            }
            return t - 1;
          });
        }, 1000);
      }, 700);
    }
  }, [current, input, timeLeft, hintUsed, streak, round, usedIdx, score, nextRound, status]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const timerColor = timeLeft > 15 ? 'text-green-400' : timeLeft > 8 ? 'text-yellow-400' : 'text-red-400';
  const timerPct = (timeLeft / ROUND_TIME) * 100;

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-md mx-auto">
      {/* Stats */}
      <div className="flex gap-5 text-center w-full justify-center">
        <div><p className="text-xs text-gray-500">Round</p><p className="text-xl font-bold text-white">{round}/{TOTAL_ROUNDS}</p></div>
        <div><p className="text-xs text-gray-500">Score</p><p className="text-xl font-bold text-indigo-400">{score}</p></div>
        <div><p className="text-xs text-gray-500">Streak</p><p className="text-xl font-bold text-orange-400">{streak > 1 ? `🔥${streak}` : streak}</p></div>
        <div><p className="text-xs text-gray-500">Time</p><p className={`text-xl font-bold ${timerColor}`}>{timeLeft}s</p></div>
      </div>

      {status === 'playing' && current && (
        <>
          {/* Timer bar */}
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${timerPct}%`, backgroundColor: timeLeft > 15 ? '#22c55e' : timeLeft > 8 ? '#eab308' : '#ef4444' }} />
          </div>

          {/* Scrambled word */}
          <div className="card w-full text-center py-8">
            <p className="text-xs text-gray-500 mb-4 uppercase tracking-wider">Unscramble this word</p>
            <p className="text-5xl font-black tracking-widest text-white font-mono">{scrambled}</p>
            {showHint && (
              <p className="text-sm text-yellow-400 mt-4 italic">💡 {current.hint}</p>
            )}
          </div>

          {/* Input */}
          <div className={`w-full flex gap-2 border-2 rounded-2xl overflow-hidden transition-colors ${
            feedback === 'correct' ? 'border-green-500' : feedback === 'wrong' ? 'border-red-500' : 'border-gray-700'
          }`}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleGuess()}
              placeholder="Type your answer..."
              className="flex-1 bg-gray-800 px-4 py-3 text-white text-lg font-mono tracking-widest outline-none uppercase"
            />
            <button onClick={handleGuess} className="bg-indigo-500 hover:bg-indigo-600 px-5 font-semibold text-white transition-colors">
              ✓
            </button>
          </div>

          {feedback === 'correct' && <p className="text-green-400 font-semibold animate-bounce">✅ Correct! +{Math.max(0, 100 + timeLeft*3 - (hintUsed?30:0))} pts</p>}
          {feedback === 'wrong' && <p className="text-red-400 font-semibold">❌ Try again!</p>}
          {feedback === 'timeout' && <p className="text-gray-400">⏰ Time's up! The word was <span className="text-white font-bold">{current.word}</span></p>}

          {/* Controls */}
          <div className="flex gap-3 w-full">
            <button onClick={() => { setScrambled(scramble(current.word)); setInput(''); }}
              className="flex-1 btn-secondary text-sm py-2">🔀 Reshuffle</button>
            <button onClick={() => { setShowHint(true); setHintUsed(true); }}
              disabled={hintUsed}
              className="flex-1 btn-secondary text-sm py-2 disabled:opacity-40">
              {hintUsed ? '💡 Hint used (-30)' : '💡 Hint'}
            </button>
          </div>
        </>
      )}

      {(status === 'idle' || status === 'done') && (
        <div className="card w-full text-center py-10">
          <p className="text-5xl mb-4">{status === 'done' ? '🏅' : '🔤'}</p>
          <h2 className="text-2xl font-bold text-white mb-2">{status === 'done' ? 'Game Over!' : 'Word Scramble'}</h2>
          {status === 'done' && <p className="text-2xl font-bold text-indigo-400 mb-2">{score} pts</p>}
          {status === 'idle' && <p className="text-gray-400 text-sm mb-4">Unscramble 10 words as fast as you can!</p>}
          {saving && <p className="text-xs text-gray-500 mb-4">Saving score...</p>}
          <button onClick={startGame} className="btn-primary px-10 py-3 text-lg">
            {status === 'done' ? '🔄 Play again' : '▶ Start'}
          </button>
        </div>
      )}

      <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Back to lobby</button>
    </div>
  );
};

export default WordScramble;