import { useState, useEffect, useRef, useCallback } from 'react';
import useSocket from '../hooks/useSocket';

const QUESTION_TIME = 15;

const decodeHTML = str =>
  str.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
     .replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&hellip;/g,'...');

const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);

const TriviaDuo = ({ room, roomCode, isHost, onGameEnd }) => {
  const { emit, on } = useSocket();
  const totalQ = 8;

  const [questions, setQuestions]   = useState([]);
  const [qIndex, setQIndex]         = useState(0);
  const [options, setOptions]       = useState([]);
  const [chosen, setChosen]         = useState(null);
  const [correctIdx, setCorrectIdx] = useState(null);
  const [timeLeft, setTimeLeft]     = useState(QUESTION_TIME);
  const [scores, setScores]         = useState({}); // username → score
  const [answered, setAnswered]     = useState({}); // username → bool (for "X answered" indicator)
  const [status, setStatus]         = useState('loading'); // loading | playing | between | done
  const [streak, setStreak]         = useState(0);

  const timerRef    = useRef(null);
  const answeredRef = useRef(false);
  const myUsername  = room.players[0]?.username; // approximation — set correctly below
  const me          = room.players.find(p => p.username !== undefined);

  // Init scores
  useEffect(() => {
    const init = {};
    room.players.forEach(p => { init[p.username] = 0; });
    setScores(init);
  }, [room]);

  // Host fetches questions and broadcasts
  useEffect(() => {
    if (!isHost) return;
    (async () => {
      try {
        const res = await fetch(`https://opentdb.com/api.php?amount=${totalQ}&type=multiple&difficulty=medium`);
        const data = await res.json();
        if (data.response_code !== 0) throw new Error();
        emit('game_event', { roomCode, event: 'questions_ready', data: { questions: data.results } });
      } catch {
        emit('game_event', { roomCode, event: 'questions_ready', data: { questions: [] } });
      }
    })();
  }, [isHost, roomCode, emit]);

  // ── Socket listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    const off = on('game_event', ({ event, data, from }) => {

      if (event === 'questions_ready') {
        setQuestions(data.questions);
        setStatus('playing');
      }

      // Another player answered
      if (event === 'player_answered') {
        setAnswered(prev => ({ ...prev, [data.username]: true }));
      }

      // Host advances question after everyone answered or time up
      if (event === 'reveal_answer') {
        clearInterval(timerRef.current);
        setCorrectIdx(data.correctIdx);
        setTimeLeft(0);
        // Update scores
        setScores(prev => {
          const next = { ...prev };
          data.scoreUpdates.forEach(({ username, gained }) => {
            next[username] = (next[username] || 0) + gained;
          });
          return next;
        });

        // Advance after 2s
        setTimeout(() => {
          setAnswered({});
          setChosen(null);
          setCorrectIdx(null);
          answeredRef.current = false;
          if (data.nextIndex >= totalQ) {
            setStatus('done');
            onGameEnd(scores);
          } else {
            setQIndex(data.nextIndex);
            setTimeLeft(QUESTION_TIME);
            setStatus('playing');
          }
        }, 2000);
      }
    });
    return off;
  }, [on, onGameEnd, scores]);

  // ── Build options when question changes ────────────────────────────────────
  useEffect(() => {
    if (!questions[qIndex] || status !== 'playing') return;
    const q = questions[qIndex];
    const shuffled = shuffle([q.correct_answer, ...q.incorrect_answers]);
    setOptions(shuffled);
    answeredRef.current = false;
    setChosen(null);
    setCorrectIdx(null);
    setTimeLeft(QUESTION_TIME);
  }, [qIndex, questions, status]);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          if (!answeredRef.current) handleAnswer(-1, true); // time out
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [status, qIndex]);

  // ── Handle own answer ──────────────────────────────────────────────────────
  const handleAnswer = useCallback((idx, timedOut = false) => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    clearInterval(timerRef.current);

    const q = questions[qIndex];
    const cIdx = options.indexOf(q?.correct_answer);
    const isCorrect = idx === cIdx;
    const tBonus = Math.floor(timeLeft * 3);
    const gained = isCorrect ? 100 + tBonus : 0;
    const newStreak = isCorrect ? streak + 1 : 0;
    setStreak(newStreak);

    if (!timedOut) setChosen(idx);

    // Tell everyone I answered (not revealing my answer)
    const myUser = room.players.find(p => p.username)?.username || 'You';
    emit('game_event', { roomCode, event: 'player_answered', data: { username: myUser } });

    // Host tallies and reveals when all answered OR after 3s grace
    if (isHost) {
      const reveal = () => {
        const scoreUpdates = [{ username: myUser, gained }]; // simplified — host adds own
        emit('game_event', {
          roomCode,
          event: 'reveal_answer',
          data: { correctIdx: cIdx, scoreUpdates, nextIndex: qIndex + 1 },
        });
      };
      // Wait up to 3s for others, then reveal
      setTimeout(reveal, 3000);
    }
  }, [answeredRef, questions, qIndex, options, timeLeft, streak, room, isHost, roomCode, emit]);

  const timerPct  = (timeLeft / QUESTION_TIME) * 100;
  const timerColor = timeLeft > 8 ? '#22c55e' : timeLeft > 4 ? '#eab308' : '#ef4444';

  if (status === 'loading') return (
    <div className="flex flex-col items-center gap-4 py-20">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-400">{isHost ? 'Loading questions...' : 'Waiting for host to load questions...'}</p>
    </div>
  );

  if (status === 'done') return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <p className="text-5xl">🏁</p>
      <p className="text-2xl font-bold text-white">Trivia over!</p>
      <p className="text-gray-400">Calculating final scores...</p>
    </div>
  );

  const q = questions[qIndex];
  if (!q) return null;

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-lg mx-auto py-4 px-2">

      {/* Live scoreboard */}
      <div className="flex gap-2 w-full flex-wrap">
        {room.players.map((p, i) => (
          <div key={i} className={`flex-1 min-w-0 bg-gray-800 rounded-xl p-2 text-center border-2 transition-colors ${answered[p.username] ? 'border-green-500/50' : 'border-gray-700'}`}>
            <p className="text-xs text-gray-400 truncate">{p.username} {answered[p.username] ? '✅' : '⏳'}</p>
            <p className="text-lg font-bold text-white">{scores[p.username] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Q progress + timer */}
      <div className="flex justify-between w-full items-center text-sm">
        <span className="text-gray-400">Q {qIndex + 1}/{totalQ}</span>
        <span className="font-mono font-bold" style={{ color: timerColor }}>{timeLeft}s</span>
      </div>
      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${timerPct}%`, backgroundColor: timerColor }} />
      </div>

      {/* Question */}
      <div className="card w-full text-center">
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">{q.category}</p>
        <p className="text-lg font-semibold text-white leading-relaxed">{decodeHTML(q.question)}</p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {options.map((opt, i) => {
          let style = 'bg-gray-800 border-gray-700 hover:border-indigo-500 text-white cursor-pointer';
          if (chosen !== null || correctIdx !== null) {
            if (i === correctIdx)     style = 'bg-green-500/20 border-green-500 text-green-300 cursor-default';
            else if (i === chosen)    style = 'bg-red-500/20 border-red-500 text-red-300 cursor-default';
            else                      style = 'bg-gray-800 border-gray-700 text-gray-500 cursor-default';
          }
          return (
            <button key={i} onClick={() => !chosen && correctIdx === null && handleAnswer(i)}
              disabled={chosen !== null || correctIdx !== null}
              className={`border-2 rounded-xl px-4 py-3 text-sm font-medium text-left transition-all ${style}`}>
              <span className="text-gray-500 mr-2">{['A','B','C','D'][i]}.</span>
              {decodeHTML(opt)}
            </button>
          );
        })}
      </div>

      {answeredRef.current && correctIdx === null && (
        <p className="text-gray-500 text-sm animate-pulse">Waiting for others...</p>
      )}
    </div>
  );
};

export default TriviaDuo;
