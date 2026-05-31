import { useState, useEffect, useRef, useCallback } from 'react';
import useSocket from '../hooks/useSocket';
import sounds from '../utils/sounds';

const STARTER_WORDS = ['apple','orange','elephant','tiger','rabbit','guitar','planet','night','table','river'];

const WordChain = ({ room, roomCode, isHost, onGameEnd }) => {
  const { emit, on } = useSocket();

  const [chain, setChain]       = useState([]);
  const [myTurn, setMyTurn]     = useState(false);
  const [input, setInput]       = useState('');
  const [timeLeft, setTimeLeft] = useState(15);
  const [status, setStatus]     = useState('playing');
  const [turnIdx, setTurnIdx]   = useState(0);
  const [scores, setScores]     = useState({});
  const [error, setError]       = useState('');
  const [elimd, setElimd]       = useState([]);
  const timerRef = useRef(null);
  const chainRef = useRef([]);

  const myUsername = room.players[0]?.username;

  const startTurn = useCallback((idx, currentChain) => {
    const player = room.players[idx % room.players.length];
    const isMine = player?.username === myUsername;
    setMyTurn(isMine);
    setTurnIdx(idx);
    setTimeLeft(15);
    setError('');
    setInput('');

    if (isHost) {
      let t = 15;
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        t--;
        emit('game_event', { roomCode, event: 'tick', data: { t } });
        if (t <= 0) {
          clearInterval(timerRef.current);
          // Eliminate current player
          emit('game_event', { roomCode, event: 'eliminate', data: {
            username: player.username, nextIdx: idx + 1, chain: currentChain
          }});
        }
      }, 1000);
    }
  }, [room, myUsername, isHost, emit, roomCode]);

  useEffect(() => {
    const starter = STARTER_WORDS[Math.floor(Math.random() * STARTER_WORDS.length)];
    const initialChain = [{ word: starter, username: 'Game' }];
    chainRef.current = initialChain;
    setChain(initialChain);
    if (isHost) {
      emit('game_event', { roomCode, event: 'chain_update', data: { chain: initialChain } });
      startTurn(0, initialChain);
    }
  }, []);

  useEffect(() => {
    const off = on('game_event', ({ event, data }) => {
      if (event === 'chain_update') { chainRef.current = data.chain; setChain(data.chain); }
      if (event === 'tick')         { setTimeLeft(data.t); }
      if (event === 'word_accepted') {
        sounds.correct();
        chainRef.current = data.chain;
        setChain(data.chain);
        setScores(data.scores);
        startTurn(data.nextIdx, data.chain);
      }
      if (event === 'word_rejected') { sounds.wrong(); setError(data.reason); }
      if (event === 'eliminate') {
        sounds.gameOver();
        setElimd(e => [...e, data.username]);
        chainRef.current = data.chain;
        const remaining = room.players.filter(p => ![...elimd, data.username].includes(p.username));
        if (remaining.length <= 1) {
          emit('game_event', { roomCode, event: 'game_over', data: { scores, winner: remaining[0]?.username } });
          setStatus('done');
        } else {
          startTurn(data.nextIdx, data.chain);
        }
      }
      if (event === 'game_over') { setStatus('done'); onGameEnd(scores[myUsername] || 0, 0); }
    });
    return off;
  }, [on, scores, elimd, room, myUsername, startTurn, onGameEnd]);

  const submitWord = () => {
    const word = input.trim().toLowerCase();
    const lastWord = chainRef.current[chainRef.current.length - 1]?.word || '';
    const lastChar = lastWord[lastWord.length - 1];

    if (!word) return;
    if (word[0] !== lastChar) { setError(`Must start with "${lastChar.toUpperCase()}"`); return; }
    if (word.length < 2)      { setError('Word too short.'); return; }
    if (chainRef.current.some(w => w.word === word)) { setError('Already used!'); return; }

    const newChain = [...chainRef.current, { word, username: myUsername }];
    const newScores = { ...scores, [myUsername]: (scores[myUsername] || 0) + word.length * 5 };
    emit('game_event', { roomCode, event: 'word_accepted', data: {
      chain: newChain, scores: newScores, nextIdx: turnIdx + 1
    }});
    setInput('');
    setError('');
  };

  const currentPlayer = room.players[turnIdx % room.players.length];
  const lastWord = chain[chain.length - 1];

  return (
    <div className="flex flex-col gap-4 w-full max-w-lg mx-auto">
      {/* Status */}
      <div className="flex justify-between items-center">
        <span className={`text-sm font-medium ${myTurn ? 'text-indigo-400' : 'text-gray-400'}`}>
          {myTurn ? '✏️ Your turn!' : `⏳ ${currentPlayer?.username}'s turn`}
        </span>
        <span className={`text-xl font-bold font-mono ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
          {timeLeft}s
        </span>
      </div>

      {/* Timer bar */}
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
          style={{ width: `${(timeLeft / 15) * 100}%` }} />
      </div>

      {/* Last word prompt */}
      {lastWord && (
        <div className="card text-center py-5">
          <p className="text-xs text-gray-500 mb-1">Last word</p>
          <p className="text-4xl font-black text-white">{lastWord.word}</p>
          <p className="text-indigo-400 mt-2 text-sm">
            Next word must start with <span className="font-bold text-xl">{lastWord.word[lastWord.word.length-1].toUpperCase()}</span>
          </p>
        </div>
      )}

      {/* Input */}
      {myTurn && status === 'playing' && !elimd.includes(myUsername) && (
        <div className={`flex gap-2 border-2 rounded-2xl overflow-hidden transition-colors ${error ? 'border-red-500' : 'border-gray-700'}`}>
          <input value={input} onChange={e => { setInput(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && submitWord()}
            placeholder={`Type a word starting with "${(lastWord?.word || 'a').slice(-1).toUpperCase()}"...`}
            className="flex-1 bg-gray-800 px-4 py-3 text-white outline-none" autoFocus />
          <button onClick={submitWord} className="bg-indigo-500 hover:bg-indigo-600 px-5 text-white font-semibold transition-colors">→</button>
        </div>
      )}
      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      {/* Chain history */}
      <div className="card">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Word chain ({chain.length})</p>
        <div className="flex flex-wrap gap-2">
          {chain.map((w, i) => (
            <span key={i} className={`px-3 py-1 rounded-full text-sm border ${w.username === 'Game' ? 'border-gray-600 text-gray-400' : 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'}`}>
              {w.word}
            </span>
          ))}
        </div>
      </div>

      {/* Scores */}
      <div className="card">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Scores</p>
        {room.players.map((p, i) => (
          <div key={i} className={`flex justify-between text-sm py-1.5 ${elimd.includes(p.username) ? 'opacity-40 line-through' : ''}`}>
            <span className="text-gray-300">{p.username} {elimd.includes(p.username) ? '❌' : ''}</span>
            <span className="text-indigo-400 font-bold">{scores[p.username] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WordChain;