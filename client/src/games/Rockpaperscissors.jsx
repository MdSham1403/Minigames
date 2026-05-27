import { useState, useCallback } from 'react';
import api from '../api/axios';
import sounds from '../utils/sounds';

const CHOICES = ['✊', '✋', '✌️'];
const NAMES   = ['Rock', 'Paper', 'Scissors'];
const WIN_MAP = { 0: 2, 1: 0, 2: 1 }; // index that beats each

const RockPaperScissors = ({ onBack }) => {
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore]         = useState(0);
  const [round, setRound]             = useState(0);
  const [result, setResult]           = useState(null);
  const [playerChoice, setPlayerChoice] = useState(null);
  const [aiChoice, setAiChoice]       = useState(null);
  const [status, setStatus]           = useState('playing'); // playing | done
  const [saving, setSaving]           = useState(false);
  const MAX_ROUNDS = 5;

  const handleChoice = useCallback(async (idx) => {
    if (status !== 'playing') return;
    sounds.click();
    const ai = Math.floor(Math.random() * 3);
    setPlayerChoice(idx);
    setAiChoice(ai);

    let res;
    sounds.card();
    if (idx === ai)          res = 'draw';
    else if (WIN_MAP[idx] === ai) res = 'win';
    else                     res = 'lose';
    setResult(res);

    const newRound = round + 1;
    setRound(newRound);
    const newPS = res === 'win'  ? playerScore + 1 : playerScore;
    const newAS = res === 'lose' ? aiScore + 1     : aiScore;
    if (res === 'win') sounds.correct(); if (res === 'lose') sounds.wrong(); if (res === 'win')  setPlayerScore(newPS);
    if (res === 'lose') setAiScore(newAS);

    if (newRound >= MAX_ROUNDS) {
      sounds.win(); setStatus('done');
      const finalScore = newPS * 100 + (res === 'win' ? 50 : 0);
      setSaving(true);
      try { await api.post('/scores', { gameName: 'rps', score: finalScore, mode: 'single' }); } catch {}
      setSaving(false);
    }
  }, [status, round, playerScore, aiScore]);

  const reset = () => {
    setPlayerScore(0); setAiScore(0); setRound(0);
    setResult(null); setPlayerChoice(null); setAiChoice(null);
    setStatus('playing');
  };

  const resultMsg = result === 'win' ? '🎉 You win!' : result === 'lose' ? '😔 AI wins!' : '🤝 Draw!';
  const finalMsg  = playerScore > aiScore ? '🏆 You won the match!' : playerScore < aiScore ? '🤖 AI won!' : '🤝 It\'s a tie!';

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto">
      {/* Score */}
      <div className="flex gap-0 w-full rounded-2xl overflow-hidden border border-gray-700">
        <div className="flex-1 bg-indigo-500/10 text-center py-3">
          <p className="text-xs text-gray-400">You</p>
          <p className="text-3xl font-black text-indigo-400">{playerScore}</p>
        </div>
        <div className="bg-gray-700 w-px" />
        <div className="flex-1 text-center py-3">
          <p className="text-xs text-gray-400">Round</p>
          <p className="text-3xl font-black text-white">{round}/{MAX_ROUNDS}</p>
        </div>
        <div className="bg-gray-700 w-px" />
        <div className="flex-1 bg-red-500/10 text-center py-3">
          <p className="text-xs text-gray-400">AI</p>
          <p className="text-3xl font-black text-red-400">{aiScore}</p>
        </div>
      </div>

      {/* Arena */}
      <div className="card w-full text-center py-6">
        {playerChoice !== null ? (
          <>
            <div className="flex items-center justify-around mb-4">
              <div className="text-center">
                <p className="text-6xl">{CHOICES[playerChoice]}</p>
                <p className="text-xs text-gray-400 mt-2">You</p>
                <p className="text-sm text-gray-300">{NAMES[playerChoice]}</p>
              </div>
              <p className="text-2xl text-gray-500">vs</p>
              <div className="text-center">
                <p className="text-6xl">{CHOICES[aiChoice]}</p>
                <p className="text-xs text-gray-400 mt-2">AI</p>
                <p className="text-sm text-gray-300">{NAMES[aiChoice]}</p>
              </div>
            </div>
            <p className={`text-xl font-bold ${result === 'win' ? 'text-green-400' : result === 'lose' ? 'text-red-400' : 'text-gray-300'}`}>
              {resultMsg}
            </p>
          </>
        ) : (
          <p className="text-gray-400">Choose your move below</p>
        )}
      </div>

      {/* Choices */}
      {status === 'playing' && (
        <div className="flex gap-4 w-full">
          {CHOICES.map((c, i) => (
            <button key={i} onClick={() => handleChoice(i)}
              className="flex-1 aspect-square rounded-2xl bg-gray-800 border-2 border-gray-700 hover:border-indigo-500 hover:bg-gray-700 flex flex-col items-center justify-center gap-2 transition-all active:scale-90 text-4xl">
              {c}
              <span className="text-xs text-gray-400 font-medium">{NAMES[i]}</span>
            </button>
          ))}
        </div>
      )}

      {status === 'done' && (
        <div className="card w-full text-center">
          <p className="text-3xl mb-2">{playerScore > aiScore ? '🏆' : playerScore < aiScore ? '🤖' : '🤝'}</p>
          <p className="text-xl font-bold text-white mb-1">{finalMsg}</p>
          <p className="text-gray-400 text-sm mb-4">{playerScore} — {aiScore}</p>
          {saving && <p className="text-xs text-gray-500 mb-3">Saving...</p>}
          <button onClick={reset} className="btn-primary px-8 py-3">🔄 Play again</button>
        </div>
      )}

      <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Back to lobby</button>
    </div>
  );
};

export default RockPaperScissors;
