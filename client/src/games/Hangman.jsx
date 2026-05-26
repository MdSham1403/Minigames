import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import sounds from '../utils/sounds';

const WORD_BANK = {
  Animals:    ['ELEPHANT','GIRAFFE','PENGUIN','DOLPHIN','CROCODILE','KANGAROO','CHEETAH','GORILLA','FLAMINGO','PLATYPUS'],
  Countries:  ['BRAZIL','AUSTRALIA','CANADA','GERMANY','THAILAND','ARGENTINA','PORTUGAL','ETHIOPIA','CAMBODIA','ICELAND'],
  Sports:     ['BASKETBALL','CRICKET','VOLLEYBALL','SWIMMING','BADMINTON','WRESTLING','GYMNASTICS','ARCHERY','FENCING','SURFING'],
  Technology: ['JAVASCRIPT','DATABASE','ALGORITHM','KEYBOARD','MONITOR','BLUETOOTH','PROCESSOR','COMPILER','FRAMEWORK','INTERFACE'],
  Food:       ['SPAGHETTI','CROISSANT','AVOCADO','BURRITO','DUMPLING','LASAGNA','TIRAMISU','SUSHI','BIRYANI','PANCAKE'],
};

const MAX_WRONG = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const Hangman = ({ onBack }) => {
  const [category, setCategory] = useState('Animals');
  const [word, setWord]         = useState('');
  const [guessed, setGuessed]   = useState(new Set());
  const [status, setStatus]     = useState('idle');
  const [score, setScore]       = useState(0);
  const [streak, setStreak]     = useState(0);
  const [saving, setSaving]     = useState(false);

  const wrong   = [...guessed].filter(l => !word.includes(l));
  const correct = [...guessed].filter(l => word.includes(l));
  const wrongCount = wrong.length;
  const revealed = word ? word.split('').every(l => guessed.has(l)) : false;

  const startGame = useCallback(() => {
    const words = WORD_BANK[category];
    const w = words[Math.floor(Math.random() * words.length)];
    setWord(w);
    setGuessed(new Set());
    setStatus('playing');
  }, [category]);

  const guess = useCallback((letter) => {
    if (status !== 'playing' || guessed.has(letter)) return;
    const newGuessed = new Set([...guessed, letter]);
    setGuessed(newGuessed);

    if (!word.includes(letter)) {
      sounds.wrong();
      if (wrongCount + 1 >= MAX_WRONG) {
        sounds.gameOver();
        setStatus('dead');
        setStreak(0);
        api.post('/scores', { gameName: 'hangman', score, mode: 'single' }).catch(() => {});
      }
    } else {
      sounds.correct();
      const allRevealed = word.split('').every(l => newGuessed.has(l));
      if (allRevealed) {
        sounds.win();
        const newStreak = streak + 1;
        const gained = 100 + (MAX_WRONG - wrongCount - 1) * 30 + newStreak * 20;
        const newScore = score + gained;
        setScore(newScore);
        setStreak(newStreak);
        setStatus('won');
        setSaving(true);
        api.post('/scores', { gameName: 'hangman', score: newScore, mode: 'single' })
          .catch(() => {}).finally(() => setSaving(false));
      }
    }
  }, [status, guessed, word, wrongCount, score, streak]);

  useEffect(() => {
    const handler = (e) => {
      const l = e.key.toUpperCase();
      if (ALPHABET.includes(l)) guess(l);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [guess]);

  // SVG Hangman drawing
  const HangmanSVG = ({ wrong }) => (
    <svg viewBox="0 0 120 150" width="120" height="150" className="mx-auto">
      {/* Gallows */}
      <line x1="10" y1="145" x2="110" y2="145" stroke="#6b7280" strokeWidth="3" strokeLinecap="round"/>
      <line x1="30" y1="145" x2="30" y2="10"  stroke="#6b7280" strokeWidth="3" strokeLinecap="round"/>
      <line x1="30" y1="10"  x2="80" y2="10"  stroke="#6b7280" strokeWidth="3" strokeLinecap="round"/>
      <line x1="80" y1="10"  x2="80" y2="30"  stroke="#6b7280" strokeWidth="3" strokeLinecap="round"/>
      {/* Head */}
      {wrong >= 1 && <circle cx="80" cy="42" r="12" stroke="#ef4444" strokeWidth="2" fill="none"/>}
      {/* Body */}
      {wrong >= 2 && <line x1="80" y1="54" x2="80" y2="95" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>}
      {/* Left arm */}
      {wrong >= 3 && <line x1="80" y1="65" x2="60" y2="82" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>}
      {/* Right arm */}
      {wrong >= 4 && <line x1="80" y1="65" x2="100" y2="82" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>}
      {/* Left leg */}
      {wrong >= 5 && <line x1="80" y1="95" x2="62" y2="118" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>}
      {/* Right leg */}
      {wrong >= 6 && <line x1="80" y1="95" x2="98" y2="118" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>}
    </svg>
  );

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-md mx-auto">
      {/* Stats */}
      <div className="flex gap-5 text-center">
        <div><p className="text-xs text-gray-500">Score</p><p className="text-xl font-bold text-indigo-400">{score}</p></div>
        <div><p className="text-xs text-gray-500">Streak</p><p className="text-xl font-bold text-orange-400">{streak > 1 ? `🔥${streak}` : streak}</p></div>
        <div><p className="text-xs text-gray-500">Wrong</p><p className="text-xl font-bold text-red-400">{wrongCount}/{MAX_WRONG}</p></div>
      </div>

      {status === 'playing' && (
        <>
          <HangmanSVG wrong={wrongCount} />

          {/* Word display */}
          <div className="flex gap-2 flex-wrap justify-center">
            {word.split('').map((letter, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className={`text-2xl font-bold w-8 text-center transition-all ${
                  guessed.has(letter) ? 'text-white' : 'text-transparent'
                }`}>{letter}</span>
                <div className="h-0.5 w-8 bg-gray-500 rounded-full"/>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-500">Category: <span className="text-indigo-400">{category}</span></p>

          {/* Keyboard */}
          <div className="flex flex-wrap gap-1.5 justify-center max-w-xs">
            {ALPHABET.map(l => {
              const hit = guessed.has(l);
              const isCorrect = hit && word.includes(l);
              const isWrong   = hit && !word.includes(l);
              return (
                <button key={l} onClick={() => guess(l)} disabled={hit}
                  className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                    isCorrect ? 'bg-green-500/20 border border-green-500/50 text-green-400 cursor-default' :
                    isWrong   ? 'bg-red-500/10 border border-red-500/20 text-red-500/40 cursor-default' :
                    'bg-gray-800 border border-gray-700 text-white hover:bg-indigo-500/20 hover:border-indigo-500/50 active:scale-90'
                  }`}>
                  {l}
                </button>
              );
            })}
          </div>
        </>
      )}

      {(status === 'idle' || status === 'won' || status === 'dead') && (
        <div className="card w-full text-center py-8">
          {status === 'idle' && (
            <>
              <p className="text-5xl mb-3">🪢</p>
              <h2 className="text-2xl font-bold text-white mb-4">Hangman</h2>
              <p className="text-gray-400 text-sm mb-5">Guess the word letter by letter. 6 wrong guesses and it's over.</p>
              <div className="flex gap-2 justify-center flex-wrap mb-5">
                {Object.keys(WORD_BANK).map(cat => (
                  <button key={cat} onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${category === cat ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </>
          )}
          {status === 'won' && (
            <>
              <HangmanSVG wrong={wrongCount} />
              <p className="text-xl font-bold text-green-400 mt-3 mb-1">🎉 Correct! The word was:</p>
              <p className="text-3xl font-black text-white mb-2">{word}</p>
              {saving && <p className="text-xs text-gray-500 mb-3">Saving...</p>}
            </>
          )}
          {status === 'dead' && (
            <>
              <HangmanSVG wrong={MAX_WRONG} />
              <p className="text-xl font-bold text-red-400 mt-3 mb-1">😔 The word was:</p>
              <p className="text-3xl font-black text-white mb-2">{word}</p>
            </>
          )}
          <button onClick={startGame} className="btn-primary px-10 py-3 w-full">
            {status === 'idle' ? '▶ Start game' : '🔄 Next word'}
          </button>
        </div>
      )}

      <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Back to lobby</button>
    </div>
  );
};

export default Hangman;
