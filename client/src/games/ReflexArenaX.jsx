import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import sounds from '../utils/sounds';

const GAME_DURATION = 45;
const TARGET_SIZE = 70;

const randomPosition = () => ({
  x: Math.random() * 75 + 5,
  y: Math.random() * 70 + 5,
});

const targetTypes = [
  {
    type: 'good',
    emoji: '🎯',
    color: '#22c55e',
    points: 100
  },
  {
    type: 'bomb',
    emoji: '💣',
    color: '#ef4444',
    points: -150
  },
  {
    type: 'bonus',
    emoji: '⚡',
    color: '#eab308',
    points: 250
  }
];

const ReflexArenaX = ({ onBack }) => {
  const [status, setStatus] = useState('idle');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [target, setTarget] = useState(null);
  const [hits, setHits] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [saving, setSaving] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [difficulty, setDifficulty] = useState(1);
  const [message, setMessage] = useState('');

  const timerRef = useRef(null);
  const spawnRef = useRef(null);
  const gameAreaRef = useRef(null);

  // ─────────────────────────────────────
  // TARGET GENERATOR
  // ─────────────────────────────────────

  const spawnTarget = useCallback(() => {
    const rand = Math.random();

    let selected;

    if (rand < 0.7) {
      selected = targetTypes[0];
    } else if (rand < 0.9) {
      selected = targetTypes[1];
    } else {
      selected = targetTypes[2];
    }

    setTarget({
      ...selected,
      ...randomPosition(),
      id: Date.now()
    });
  }, []);

  // ─────────────────────────────────────
  // START GAME
  // ─────────────────────────────────────

  const startGame = useCallback(() => {
    setStatus('playing');
    setScore(0);
    setCombo(0);
    setMisses(0);
    setHits(0);
    setTimeLeft(GAME_DURATION);
    setDifficulty(1);
    setMessage('');

    spawnTarget();

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          clearInterval(spawnRef.current);
          finishGame();
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    spawnRef.current = setInterval(() => {
      spawnTarget();

      setDifficulty(d => Math.min(10, d + 0.2));
    }, 1200);

  }, [spawnTarget]);

  // ─────────────────────────────────────
  // FINISH GAME
  // ─────────────────────────────────────

  const finishGame = useCallback(async () => {
    setStatus('done');

    setSaving(true);

    try {
      await api.post('/scores', {
        gameName: 'reflexarenax',
        score,
        mode: 'single'
      });
    } catch (e) {}

    setSaving(false);

    setHighScore(prev => Math.max(prev, score));

  }, [score]);

  // ─────────────────────────────────────
  // CLICK TARGET
  // ─────────────────────────────────────

  const clickTarget = (t) => {
    if (status !== 'playing') return;

    let gained = t.points;

    if (t.type === 'good') {
      const newCombo = combo + 1;

      gained += newCombo * 10;

      setCombo(newCombo);

      if (newCombo >= 5) {
        setMessage(`🔥 ${newCombo} HIT COMBO!`);
      }

      setHits(h => h + 1);

    } else if (t.type === 'bomb') {
      setCombo(0);
      setMisses(m => m + 1);
      setMessage('💥 BOMB HIT');

    } else if (t.type === 'bonus') {
      gained += 100;
      setMessage('⚡ BONUS!');
    }

    setScore(s => Math.max(0, s + gained));

    spawnTarget();
  };

  // ─────────────────────────────────────
  // MISS CLICK
  // ─────────────────────────────────────

  const missClick = (e) => {
    if (e.target !== gameAreaRef.current) return;

    if (status !== 'playing') return;

    setMisses(m => m + 1);
    setCombo(0);
    setMessage('❌ MISS');
  };

  // ─────────────────────────────────────
  // ACCURACY
  // ─────────────────────────────────────

  useEffect(() => {
    const total = hits + misses;

    if (total === 0) {
      setAccuracy(100);
    } else {
      setAccuracy(
        Math.round((hits / total) * 100)
      );
    }
  }, [hits, misses]);

  // ─────────────────────────────────────
  // CLEANUP
  // ─────────────────────────────────────

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearInterval(spawnRef.current);
    };
  }, []);

  // ─────────────────────────────────────
  // UI
  // ─────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-3xl mx-auto">

      {/* HEADER */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 w-full">

        <div className="card text-center">
          <p className="text-xs text-gray-500">Score</p>
          <p className="text-2xl font-bold text-green-400">
            {score}
          </p>
        </div>

        <div className="card text-center">
          <p className="text-xs text-gray-500">Combo</p>
          <p className="text-2xl font-bold text-orange-400">
            {combo}
          </p>
        </div>

        <div className="card text-center">
          <p className="text-xs text-gray-500">Hits</p>
          <p className="text-2xl font-bold text-cyan-400">
            {hits}
          </p>
        </div>

        <div className="card text-center">
          <p className="text-xs text-gray-500">Accuracy</p>
          <p className="text-2xl font-bold text-indigo-400">
            {accuracy}%
          </p>
        </div>

        <div className="card text-center">
          <p className="text-xs text-gray-500">Time</p>
          <p className="text-2xl font-bold text-red-400">
            {timeLeft}s
          </p>
        </div>

        <div className="card text-center">
          <p className="text-xs text-gray-500">Best</p>
          <p className="text-2xl font-bold text-yellow-400">
            {highScore}
          </p>
        </div>

      </div>

      {/* GAME AREA */}

      <div
        ref={gameAreaRef}
        onClick={missClick}
        className="relative w-full h-[500px] bg-gray-950 border border-gray-800 rounded-3xl overflow-hidden"
      >

        {/* GRID EFFECT */}

        <div className="absolute inset-0 opacity-10">
          <div className="grid grid-cols-10 h-full">
            {Array.from({ length: 100 }).map((_, i) => (
              <div
                key={i}
                className="border border-gray-700"
              />
            ))}
          </div>
        </div>

        {/* TARGET */}

        {status === 'playing' && target && (

          <button
            key={target.id}
            onClick={() => clickTarget(target)}
            className="absolute rounded-full flex items-center justify-center text-3xl font-bold transition-transform hover:scale-110 active:scale-95 shadow-2xl"
            style={{
              width: TARGET_SIZE,
              height: TARGET_SIZE,
              left: `${target.x}%`,
              top: `${target.y}%`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: target.color,
              boxShadow: `0 0 25px ${target.color}`
            }}
          >
            {target.emoji}
          </button>

        )}

        {/* CENTER MESSAGE */}

        {message && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <div className="bg-black/70 px-4 py-2 rounded-xl text-white font-bold">
              {message}
            </div>
          </div>
        )}

        {/* IDLE */}

        {status === 'idle' && (

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">

            <p className="text-7xl mb-4">
              ⚡
            </p>

            <h2 className="text-4xl font-black text-white mb-3">
              Reflex Arena X
            </h2>

            <p className="text-gray-400 max-w-md mb-6">
              Hit targets fast, avoid bombs, build combos,
              and climb the leaderboard.
            </p>

            <button
              onClick={startGame}
              className="btn-primary px-10 py-4 text-xl"
            >
              ▶ START GAME
            </button>

          </div>

        )}

        {/* DONE */}

        {status === 'done' && (

          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">

            <p className="text-6xl mb-4">
              🏆
            </p>

            <h2 className="text-4xl font-black text-white">
              Match Complete
            </h2>

            <p className="text-2xl text-green-400 font-bold mt-3">
              {score} pts
            </p>

            <div className="flex gap-5 mt-5">

              <div className="text-center">
                <p className="text-gray-500 text-xs">Accuracy</p>
                <p className="text-xl text-white font-bold">
                  {accuracy}%
                </p>
              </div>

              <div className="text-center">
                <p className="text-gray-500 text-xs">Hits</p>
                <p className="text-xl text-white font-bold">
                  {hits}
                </p>
              </div>

              <div className="text-center">
                <p className="text-gray-500 text-xs">Misses</p>
                <p className="text-xl text-white font-bold">
                  {misses}
                </p>
              </div>

            </div>

            {saving && (
              <p className="text-gray-500 mt-4 text-sm">
                Saving score...
              </p>
            )}

            <button
              onClick={startGame}
              className="btn-primary mt-8 px-8 py-3 text-lg"
            >
              🔄 Play Again
            </button>

          </div>

        )}

      </div>

      {/* BACK */}

      <button
        onClick={onBack}
        className="text-gray-500 hover:text-white transition-colors"
      >
        ← Back to Lobby
      </button>

    </div>
  );
};

export default ReflexArenaX;