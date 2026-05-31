import { useState, useEffect, useRef, useCallback } from 'react';
import useSocket from '../hooks/useSocket';
import sounds from '../utils/sounds';
import api from '../api/axios';

const decodeHTML = s => s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&hellip;/g,'...');
const shuffle = a => [...a].sort(() => Math.random() - 0.5);

const CATEGORIES = [
  { id:'', label:'🌍 Mixed' },
  { id:'9', label:'🧠 Knowledge' },
  { id:'17', label:'🔬 Science' },
  { id:'21', label:'🏅 Sports' },
  { id:'11', label:'🎬 Movies' },
  { id:'23', label:'📖 History' },
  { id:'15', label:'💻 Gaming' },
];

const QuizRoom = ({ room, roomCode, isHost, onGameEnd }) => {
  const { emit, on } = useSocket();

  const [questions, setQuestions]   = useState([]);
  const [qIndex, setQIndex]         = useState(0);
  const [options, setOptions]       = useState([]);
  const [chosen, setChosen]         = useState(null);
  const [correctIdx, setCorrectIdx] = useState(null);
  const [timeLeft, setTimeLeft]     = useState(15);
  const [scores, setScores]         = useState({});
  const [answered, setAnswered]     = useState({});
  const [status, setStatus]         = useState('setup');
  const [category, setCategory]     = useState('');
  const [streak, setStreak]         = useState(0);
  const timerRef    = useRef(null);
  const answeredRef = useRef(false);
  const totalQ = 10;
  const myUsername = room.players[0]?.username;

  useEffect(() => {
    const off = on('game_event', ({ event, data }) => {
      if (event === 'questions_ready') {
        setQuestions(data.questions);
        setStatus('playing');
        setQIndex(0);
        const init = {};
        room.players.forEach(p => { init[p.username] = 0; });
        setScores(init);
      }

      if (event === 'tick') { setTimeLeft(data.t); }

      if (event === 'player_answered_room') {
        setAnswered(a => ({ ...a, [data.username]: true }));
      }

      if (event === 'reveal_answer') {
        clearInterval(timerRef.current);
        sounds.beep();
        setCorrectIdx(data.correctIdx);
        setScores(data.scores);
        setTimeout(() => {
          setAnswered({});
          setChosen(null);
          setCorrectIdx(null);
          answeredRef.current = false;
          if (data.nextIndex >= totalQ) {
            setStatus('done');
            const myScore = data.scores[myUsername] || 0;
            onGameEnd(myScore, 0);
            api.post('/scores', { gameName: 'quizroom', score: myScore, mode: 'multi' }).catch(() => {});
          } else {
            setQIndex(data.nextIndex);
            setTimeLeft(15);
          }
        }, 2500);
      }
    });
    return off;
  }, [on, myUsername, onGameEnd, room]);

  // Build options when question changes
  useEffect(() => {
    if (!questions[qIndex] || status !== 'playing') return;
    const q = questions[qIndex];
    const shuffled = shuffle([q.correct_answer, ...q.incorrect_answers]);
    setOptions(shuffled);
    answeredRef.current = false;
    setChosen(null);
    setCorrectIdx(null);
    setTimeLeft(15);
  }, [qIndex, questions, status]);

  // Host timer
  useEffect(() => {
    if (status !== 'playing' || !isHost) return;
    let t = 15;
    timerRef.current = setInterval(() => {
      t--;
      emit('game_event', { roomCode, event: 'tick', data: { t } });
      if (t <= 0) {
        clearInterval(timerRef.current);
        if (!answeredRef.current) handleReveal(-1);
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [qIndex, status, isHost]);

  const handleReveal = useCallback((idx) => {
    if (!isHost || answeredRef.current) return;
    answeredRef.current = true;
    const q = questions[qIndex];
    const cIdx = options.indexOf(q.correct_answer);
    const newScores = { ...scores };
    // Award points for correct answerers
    room.players.forEach(p => {
      if (answered[p.username] && idx === cIdx) {
        newScores[p.username] = (newScores[p.username] || 0) + 100 + timeLeft * 3;
      }
    });
    emit('game_event', { roomCode, event: 'reveal_answer', data: {
      correctIdx: cIdx, scores: newScores, nextIndex: qIndex + 1,
    }});
  }, [isHost, questions, qIndex, options, scores, room, answered, timeLeft, emit, roomCode]);

  const handleAnswer = (idx) => {
    if (answeredRef.current || chosen !== null) return;
    setChosen(idx);
    answeredRef.current = true;
    sounds.click();
    emit('game_event', { roomCode, event: 'player_answered_room', data: { username: myUsername } });
    if (isHost) setTimeout(() => handleReveal(idx), 3000);
  };

  const startGame = async () => {
    if (!isHost) return;
    setStatus('loading');
    try {
      let url = `https://opentdb.com/api.php?amount=${totalQ}&type=multiple`;
      if (category) url += `&category=${category}`;
      const res  = await fetch(url);
      const data = await res.json();
      emit('game_event', { roomCode, event: 'questions_ready', data: { questions: data.results } });
    } catch {
      setStatus('setup');
    }
  };

  const timerPct  = (timeLeft / 15) * 100;
  const timerColor = timeLeft > 8 ? '#22c55e' : timeLeft > 4 ? '#eab308' : '#ef4444';
  const q = questions[qIndex];

  if (status === 'setup') return (
    <div className="flex flex-col items-center gap-5 w-full max-w-md mx-auto">
      <div className="text-center">
        <p className="text-5xl mb-3">🧠</p>
        <h2 className="text-xl font-bold text-white">Quiz Room</h2>
        <p className="text-gray-400 text-sm mt-1">{room.players.length} players · {totalQ} questions</p>
      </div>
      {isHost ? (
        <div className="card w-full space-y-4">
          <label className="block text-sm text-gray-400 mb-1">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="input-field">
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <button onClick={startGame} className="btn-primary w-full py-3 text-lg">🚀 Start quiz</button>
        </div>
      ) : (
        <div className="card w-full text-center py-8">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Waiting for host to start...</p>
        </div>
      )}
    </div>
  );

  if (status === 'loading') return (
    <div className="flex flex-col items-center gap-4 py-12">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-400">Loading questions...</p>
    </div>
  );

  if (status === 'done') return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">
      <p className="text-5xl">🏁</p>
      <p className="text-2xl font-bold text-white">Quiz over!</p>
      <div className="card w-full space-y-2">
        {Object.entries(scores).sort(([,a],[,b]) => b-a).map(([name, score], i) => (
          <div key={name} className="flex items-center gap-3 py-2">
            <span className="text-xl">{['🥇','🥈','🥉'][i] || `${i+1}.`}</span>
            <span className="flex-1 text-white">{name}</span>
            <span className="text-indigo-400 font-bold">{score} pts</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (!q) return null;

  return (
    <div className="flex flex-col gap-4 w-full max-w-lg mx-auto">
      {/* Scoreboard */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {room.players.map((p, i) => (
          <div key={i} className={`flex-shrink-0 rounded-xl p-2 text-center border-2 transition-colors min-w-[80px] ${answered[p.username] ? 'border-green-500/50 bg-green-500/10' : 'border-gray-700 bg-gray-800'}`}>
            <p className="text-xs text-gray-400 truncate">{p.username} {answered[p.username] ? '✅' : '⏳'}</p>
            <p className="text-base font-bold text-white">{scores[p.username] || 0}</p>
          </div>
        ))}
      </div>

      {/* Progress + timer */}
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">Q {qIndex+1}/{totalQ}</span>
        <span className="font-mono font-bold" style={{ color: timerColor }}>{timeLeft}s</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${timerPct}%`, backgroundColor: timerColor }} />
      </div>

      {/* Question */}
      <div className="card text-center">
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">{q.category}</p>
        <p className="text-lg font-semibold text-white leading-relaxed">{decodeHTML(q.question)}</p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt, i) => {
          let cls = 'bg-gray-800 border-gray-700 hover:border-indigo-500 text-white cursor-pointer';
          if (chosen !== null || correctIdx !== null) {
            if (i === correctIdx)   cls = 'bg-green-500/20 border-green-500 text-green-300 cursor-default';
            else if (i === chosen)  cls = 'bg-red-500/20 border-red-500 text-red-300 cursor-default';
            else                    cls = 'bg-gray-800 border-gray-700 text-gray-500 cursor-default';
          }
          return (
            <button key={i} onClick={() => chosen === null && correctIdx === null && handleAnswer(i)}
              disabled={chosen !== null || correctIdx !== null}
              className={`border-2 rounded-xl px-4 py-3 text-sm font-medium text-left transition-all ${cls}`}>
              <span className="text-gray-500 mr-2">{['A','B','C','D'][i]}.</span>
              {decodeHTML(opt)}
            </button>
          );
        })}
      </div>

      {answeredRef.current && correctIdx === null && (
        <p className="text-center text-gray-500 text-sm animate-pulse">Waiting for others...</p>
      )}
    </div>
  );
};

export default QuizRoom;