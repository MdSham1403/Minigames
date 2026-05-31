import { useState, useEffect, useRef, useCallback } from 'react';
import useSocket from '../hooks/useSocket';
import sounds from '../utils/sounds';
import api from '../api/axios';

const PASSAGES = [
  "The quick brown fox jumps over the lazy dog near the riverbank.",
  "React makes it painless to create interactive user interfaces for web applications.",
  "Every great developer you know got there by solving problems they were unqualified to solve.",
  "The best way to predict the future is to invent it yourself one line at a time.",
  "Clean code always looks like it was written by someone who cares deeply about their craft.",
  "Simple can be harder than complex but it is worth it in the end to get there.",
  "Programs must be written for people to read and only incidentally for machines to execute.",
  "The most important property of a program is whether it accomplishes the intention of its user.",
];

const TypeRace = ({ room, roomCode, isHost, onGameEnd }) => {
  const { emit, on } = useSocket();

  const [passage, setPassage]       = useState('');
  const [typed, setTyped]           = useState('');
  const [started, setStarted]       = useState(false);
  const [finished, setFinished]     = useState(false);
  const [progress, setProgress]     = useState({});  // username → percent
  const [results, setResults]       = useState([]);
  const [countdown, setCountdown]   = useState(null);
  const [timeLeft, setTimeLeft]     = useState(60);
  const [status, setStatus]         = useState('waiting');
  const [myWpm, setMyWpm]           = useState(0);
  const startTime = useRef(null);
  const timerRef  = useRef(null);
  const inputRef  = useRef(null);
  const myUsername = room.players[0]?.username;

  useEffect(() => {
    const off = on('game_event', ({ event, data }) => {
      if (event === 'race_start') {
        setPassage(data.passage);
        setStatus('countdown');
        let c = 3;
        setCountdown(c);
        const cd = setInterval(() => {
          c--;
          setCountdown(c);
          if (c <= 0) {
            clearInterval(cd);
            setCountdown(null);
            setStatus('racing');
            setStarted(true);
            startTime.current = Date.now();
            inputRef.current?.focus();
            sounds.go();
            // host runs server timer
            if (isHost) {
              let t = 60;
              timerRef.current = setInterval(() => {
                t--;
                emit('game_event', { roomCode, event: 'tick', data: { t } });
                if (t <= 0) {
                  clearInterval(timerRef.current);
                  emit('game_event', { roomCode, event: 'race_end', data: { results: [] } });
                }
              }, 1000);
            }
          }
        }, 1000);
      }

      if (event === 'tick') { setTimeLeft(data.t); }

      if (event === 'progress_update') {
        setProgress(p => ({ ...p, [data.username]: data.percent }));
      }

      if (event === 'player_finished') {
        sounds.match();
        setResults(r => {
          const exists = r.some(x => x.username === data.username);
          return exists ? r : [...r, { username: data.username, wpm: data.wpm, rank: r.length + 1 }];
        });
      }

      if (event === 'race_end') {
        setStatus('done');
        clearInterval(timerRef.current);
        const myResult = results.find(r => r.username === myUsername);
        onGameEnd(myResult?.wpm ? myResult.wpm * 10 : 0, 0);
        api.post('/scores', { gameName: 'typerace', score: myResult?.wpm ? myResult.wpm * 10 : 0, mode: 'multi' }).catch(() => {});
      }
    });
    return off;
  }, [on, results, myUsername, isHost, onGameEnd, emit, roomCode]);

  useEffect(() => {
    if (isHost) {
      const p = PASSAGES[Math.floor(Math.random() * PASSAGES.length)];
      emit('game_event', { roomCode, event: 'race_start', data: { passage: p } });
    }
  }, []);

  const handleInput = (e) => {
    if (!started || finished) return;
    const val = e.target.value;
    setTyped(val);

    const pct = Math.min(100, Math.round((val.length / passage.length) * 100));
    emit('game_event', { roomCode, event: 'progress_update', data: { username: myUsername, percent: pct } });

    // Check WPM
    if (startTime.current) {
      const elapsed = (Date.now() - startTime.current) / 1000 / 60;
      const words = val.trim().split(' ').length;
      setMyWpm(Math.round(words / elapsed));
    }

    // Finished?
    if (val === passage) {
      setFinished(true);
      const elapsed = (Date.now() - startTime.current) / 1000 / 60;
      const wpm = Math.round((passage.split(' ').length) / elapsed);
      sounds.win();
      setMyWpm(wpm);
      emit('game_event', { roomCode, event: 'player_finished', data: { username: myUsername, wpm } });
    }
  };

  const correctCount = typed.split('').filter((c, i) => c === passage[i]).length;
  const accuracy     = typed.length ? Math.round((correctCount / typed.length) * 100) : 100;

  return (
    <div className="flex flex-col gap-4 w-full max-w-lg mx-auto">
      {/* Countdown */}
      {countdown !== null && (
        <div className="card text-center py-8">
          <p className="text-7xl font-black text-indigo-400 animate-pulse">{countdown || 'GO!'}</p>
        </div>
      )}

      {status === 'racing' && passage && (
        <>
          {/* Timer + WPM */}
          <div className="flex justify-between text-sm">
            <span className={`font-mono font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>{timeLeft}s</span>
            <span className="text-gray-400">{myWpm} WPM · {accuracy}% accuracy</span>
          </div>

          {/* Passage display */}
          <div className="card font-mono text-sm leading-relaxed p-4 select-none">
            {passage.split('').map((char, i) => {
              let cls = 'text-gray-500';
              if (i < typed.length) cls = typed[i] === char ? 'text-green-400' : 'bg-red-500/30 text-red-300';
              else if (i === typed.length) cls = 'bg-indigo-500/40 text-white';
              return <span key={i} className={cls}>{char}</span>;
            })}
          </div>

          {/* Input */}
          <textarea
            ref={inputRef}
            value={typed}
            onChange={handleInput}
            disabled={finished}
            rows={2}
            placeholder="Start typing..."
            className="input-field font-mono text-sm resize-none"
          />

          {/* Progress bars */}
          <div className="card space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Race progress</p>
            {room.players.map((p, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-300">{p.username}</span>
                  <span className="text-gray-500">{progress[p.username] || 0}%</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress[p.username] || 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Finished</p>
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5">
              <span className="text-lg">{['🥇','🥈','🥉'][i] || `${i+1}.`}</span>
              <span className="text-white flex-1">{r.username}</span>
              <span className="text-indigo-400 font-bold">{r.wpm} WPM</span>
            </div>
          ))}
        </div>
      )}

      {status === 'done' && (
        <div className="card text-center py-4">
          <p className="text-xl font-bold text-white mb-1">Race over!</p>
          <p className="text-gray-400">Your speed: <span className="text-indigo-400 font-bold">{myWpm} WPM</span></p>
        </div>
      )}
    </div>
  );
};

export default TypeRace;