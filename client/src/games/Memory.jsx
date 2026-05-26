import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import sounds from '../utils/sounds';

const EMOJI_POOL = ['🐶','🐱','🦊','🐸','🦁','🐯','🐼','🐨','🦄','🐙','🦋','🌺','🍕','🚀','⚡','🎸'];

const buildDeck = (pairs = 8) => {
  const chosen = EMOJI_POOL.slice(0, pairs);
  const cards = [...chosen, ...chosen].map((emoji, id) => ({
    id,
    emoji,
    flipped: false,
    matched: false,
  }));
  // Fisher-Yates shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
};

const Memory = ({ onBack }) => {
  const [cards, setCards]         = useState([]);
  const [flipped, setFlipped]     = useState([]);   // indices of currently face-up unmatched
  const [matched, setMatched]     = useState(0);
  const [moves, setMoves]         = useState(0);
  const [status, setStatus]       = useState('idle'); // idle | playing | won
  const [timeLeft, setTimeLeft]   = useState(60);
  const [score, setScore]         = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [pairs, setPairs]         = useState(8);
  const [saving, setSaving]       = useState(false);
  const [locked, setLocked]       = useState(false); // prevent rapid clicks during check

  const timerRef = useRef(null);

  // ── Start game ─────────────────────────────────────────────────────────────
  const startGame = useCallback((numPairs = pairs) => {
    clearInterval(timerRef.current);
    setCards(buildDeck(numPairs));
    setFlipped([]);
    setMatched(0);
    setMoves(0);
    setScore(0);
    setTimeLeft(numPairs * 8); // more pairs = more time
    setStatus('playing');
    setLocked(false);
  }, [pairs]);

  // ── Timer countdown ────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); endGame(0); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [status]);

  const endGame = useCallback(async (finalScore) => {
    clearInterval(timerRef.current);
    setStatus('won');
    setScore(finalScore);
    setBestScore(prev => Math.max(prev, finalScore));
    setSaving(true);
    try {
      await api.post('/scores', { gameName: 'memory', score: finalScore, mode: 'single' });
    } catch (e) {}
    setSaving(false);
  }, []);

  // ── Card click ─────────────────────────────────────────────────────────────
  const handleClick = useCallback((idx) => {
    if (locked || status !== 'playing') return;
    if (cards[idx].matched || cards[idx].flipped) return;
    if (flipped.length === 2) return;

    const newFlipped = [...flipped, idx];
    setCards(prev => prev.map((c, i) => i === idx ? { ...c, flipped: true } : c));
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      setLocked(true);

      const [a, b] = newFlipped;
      if (cards[a].emoji === cards[b].emoji) {
        // Match!
        setTimeout(() => {
          setCards(prev => prev.map((c, i) =>
            i === a || i === b ? { ...c, matched: true, flipped: true } : c
          ));
          const newMatched = matched + 1;
          setMatched(newMatched);
          setFlipped([]);
          setLocked(false);

          if (newMatched === pairs) {
            // All matched — calculate score
            const bonus = timeLeft * 5;
            const movePenalty = Math.max(0, (moves + 1 - pairs) * 3);
            const finalScore = Math.max(0, 1000 + bonus - movePenalty);
            endGame(finalScore);
          }
        }, 400);
      } else {
        // No match — flip back
        setTimeout(() => {
          setCards(prev => prev.map((c, i) =>
            i === a || i === b ? { ...c, flipped: false } : c
          ));
          setFlipped([]);
          setLocked(false);
        }, 900);
      }
    }
  }, [locked, status, cards, flipped, matched, pairs, timeLeft, moves, endGame]);

  // Cleanup on unmount
  useEffect(() => () => clearInterval(timerRef.current), []);

  const timerColor = timeLeft > 20 ? 'text-green-400' : timeLeft > 10 ? 'text-yellow-400' : 'text-red-400';
  const cols = pairs <= 6 ? 3 : pairs <= 8 ? 4 : 4;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">

      {/* Stats bar */}
      <div className="flex gap-6 text-center w-full justify-center">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Pairs</p>
          <p className="text-2xl font-bold text-indigo-400">{matched}/{pairs}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Moves</p>
          <p className="text-2xl font-bold text-white">{moves}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Time</p>
          <p className={`text-2xl font-bold ${timerColor}`}>{timeLeft}s</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Best</p>
          <p className="text-2xl font-bold text-yellow-400">{bestScore}</p>
        </div>
      </div>

      {/* Game board */}
      {status === 'playing' && (
        <div
          className="grid gap-3 w-full"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {cards.map((card, idx) => (
            <button
              key={card.id}
              onClick={() => handleClick(idx)}
              disabled={card.matched || card.flipped && flipped.length === 2}
              className={`
                aspect-square rounded-2xl text-3xl flex items-center justify-center
                transition-all duration-300 border-2 font-bold select-none
                ${card.matched
                  ? 'bg-green-500/20 border-green-500/50 scale-95 cursor-default'
                  : card.flipped
                  ? 'bg-indigo-500/20 border-indigo-500/60 scale-105'
                  : 'bg-gray-800 border-gray-700 hover:border-indigo-500/50 hover:bg-gray-750 active:scale-95 cursor-pointer'
                }
              `}
            >
              {card.flipped || card.matched ? card.emoji : '❓'}
            </button>
          ))}
        </div>
      )}

      {/* Idle / Win overlay */}
      {status !== 'playing' && (
        <div className="card w-full text-center py-10 px-6">
          {status === 'idle' && (
            <>
              <p className="text-5xl mb-4">🧠</p>
              <h2 className="text-2xl font-bold text-white mb-2">Memory Match</h2>
              <p className="text-gray-400 mb-6">Flip cards and find all matching pairs before time runs out!</p>
              <div className="flex gap-2 justify-center mb-6 flex-wrap">
                {[6, 8, 12, 16].map(n => (
                  <button
                    key={n}
                    onClick={() => setPairs(n)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      pairs === n ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {n} pairs
                  </button>
                ))}
              </div>
            </>
          )}
          {status === 'won' && (
            <>
              <p className="text-5xl mb-4">{matched === pairs ? '🎉' : '⏰'}</p>
              <h2 className="text-2xl font-bold text-white mb-2">
                {matched === pairs ? 'You won!' : 'Time\'s up!'}
              </h2>
              <p className="text-gray-400 mb-1">Pairs found: {matched}/{pairs}</p>
              <p className="text-gray-400 mb-1">Moves: {moves}</p>
              <p className="text-2xl font-bold text-indigo-400 mb-4">Score: {score}</p>
              {saving && <p className="text-xs text-gray-500 mb-4">Saving score...</p>}
            </>
          )}
          <button onClick={() => startGame(pairs)} className="btn-primary px-10 py-3 text-lg">
            {status === 'won' ? '🔄 Play again' : '▶ Start game'}
          </button>
        </div>
      )}

      <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
        ← Back to lobby
      </button>
    </div>
  );
};

export default Memory;
