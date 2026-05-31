import { useState, useEffect, useRef, useCallback } from 'react';
import useSocket from '../hooks/useSocket';
import sounds from '../utils/sounds';

const COLORS_PAL = ['#000000','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#ffffff','#6b7280'];
const SIZES = [3, 6, 12, 20];

const WORDS = ['apple','banana','guitar','elephant','bicycle','rainbow','castle','dragon','rocket','pizza',
  'umbrella','telescope','butterfly','volcano','lighthouse','submarine','dinosaur','cactus','penguin','windmill'];

const DrawAndGuess = ({ room, roomCode, isHost, onGameEnd }) => {
  const { emit, on } = useSocket();
  const canvasRef    = useRef(null);
  const ctxRef       = useRef(null);
  const drawing      = useRef(false);
  const lastPos      = useRef(null);

  const [color, setColor]         = useState('#000000');
  const [size, setSize]           = useState(6);
  const [myTurn, setMyTurn]       = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [hint, setHint]           = useState('');
  const [guess, setGuess]         = useState('');
  const [messages, setMessages]   = useState([]);
  const [round, setRound]         = useState(1);
  const [scores, setScores]       = useState({});
  const [turnPlayer, setTurnPlayer] = useState('');
  const [timeLeft, setTimeLeft]   = useState(60);
  const [status, setStatus]       = useState('waiting'); // waiting|drawing|guessing|roundEnd
  const [wordChoices, setWordChoices] = useState([]);
  const timerRef = useRef(null);

  const totalRounds = room.players.length * 2;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;
  }, []);

  // ── Socket listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    const off = on('game_event', ({ event, data }) => {

      if (event === 'start_turn') {
        const isMine = data.drawerUsername === room.players.find((_,i) => isHost ? i===0 : i!==0)?.username;
        setMyTurn(isMine);
        setTurnPlayer(data.drawerUsername);
        setHint(data.hint);
        setTimeLeft(60);
        setStatus('drawing');
        setMessages([]);
        clearCanvas();
        if (isMine) {
          setCurrentWord(data.word);
          setHint(data.hint);
        } else {
          setCurrentWord('');
        }
      }

      if (event === 'draw_stroke') {
        const ctx = ctxRef.current;
        if (!ctx) return;
        ctx.strokeStyle = data.color;
        ctx.lineWidth   = data.size;
        ctx.beginPath();
        ctx.moveTo(data.x0, data.y0);
        ctx.lineTo(data.x1, data.y1);
        ctx.stroke();
      }

      if (event === 'clear_canvas') { clearCanvas(); }

      if (event === 'guess_message') {
        sounds.click();
        setMessages(m => [...m.slice(-30), { username: data.username, text: data.text, correct: data.correct }]);
        if (data.correct) {
          sounds.win();
          const u = data.username;
          setScores(s => ({ ...s, [u]: (s[u] || 0) + data.points }));
        }
      }

      if (event === 'round_end') {
        setStatus('roundEnd');
        setCurrentWord(data.word);
        setScores(data.scores);
        setRound(r => r + 1);
      }

      if (event === 'game_over') {
        setStatus('done');
        onGameEnd(data.scores[room.players[0]?.username] || 0, 0);
      }

      if (event === 'tick') { setTimeLeft(data.t); }
    });
    return off;
  }, [on, room, isHost, onGameEnd]);

  // Host drives the game loop
  useEffect(() => {
    if (!isHost || status !== 'waiting') return;
    startNextTurn(1);
  }, [isHost]);

  const startNextTurn = (r) => {
    if (r > totalRounds) {
      emit('game_event', { roomCode, event: 'game_over', data: { scores } });
      return;
    }
    const drawerIdx = (r - 1) % room.players.length;
    const drawer = room.players[drawerIdx];
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    const hint = word.split('').map((c,i) => i===0||i===word.length-1 ? c : '_').join(' ');
    emit('game_event', { roomCode, event: 'start_turn', data: {
      drawerUsername: drawer.username, word, hint, round: r
    }});
    setRound(r);
    // Timer
    let t = 60;
    timerRef.current = setInterval(() => {
      t--;
      emit('game_event', { roomCode, event: 'tick', data: { t } });
      if (t <= 0) {
        clearInterval(timerRef.current);
        const sc = { ...scores };
        emit('game_event', { roomCode, event: 'round_end', data: { word, scores: sc } });
        setTimeout(() => startNextTurn(r + 1), 3000);
      }
    }, 1000);
  };

  const clearCanvas = () => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  // Drawing handlers
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * (canvas.width / rect.width), y: (src.clientY - rect.top) * (canvas.height / rect.height) };
  };

  const startDraw = (e) => {
    if (!myTurn) return;
    drawing.current = true;
    lastPos.current = getPos(e, canvasRef.current);
  };

  const doDraw = (e) => {
    if (!drawing.current || !myTurn) return;
    e.preventDefault();
    const pos = getPos(e, canvasRef.current);
    const ctx = ctxRef.current;
    ctx.strokeStyle = color;
    ctx.lineWidth   = size;
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    emit('game_event', { roomCode, event: 'draw_stroke', data: {
      x0: lastPos.current.x, y0: lastPos.current.y, x1: pos.x, y1: pos.y, color, size,
    }});
    lastPos.current = pos;
  };

  const endDraw = () => { drawing.current = false; };

  const handleClear = () => {
    clearCanvas();
    emit('game_event', { roomCode, event: 'clear_canvas', data: {} });
  };

  const sendGuess = () => {
    if (!guess.trim() || myTurn) return;
    const correct = guess.trim().toLowerCase() === currentWord.toLowerCase();
    const points  = correct ? Math.max(10, timeLeft * 2) : 0;
    sounds[correct ? 'correct' : 'click']();
    emit('game_event', { roomCode, event: 'guess_message', data: {
      username: room.players[0]?.username || 'You', text: guess, correct, points,
    }});
    setGuess('');
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Round {round}/{totalRounds}</span>
          <span className={`text-sm font-medium ${myTurn ? 'text-indigo-400' : 'text-gray-300'}`}>
            {myTurn ? `✏️ You're drawing — "${currentWord}"` : `👁 ${turnPlayer} is drawing`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-lg font-bold font-mono ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* Hint */}
      {!myTurn && hint && (
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-1">Hint</p>
          <p className="text-2xl font-mono tracking-widest text-white">{hint}</p>
        </div>
      )}

      <div className="flex gap-3">
        {/* Canvas */}
        <div className="flex-1">
          <canvas
            ref={canvasRef}
            className="w-full rounded-2xl border-2 border-gray-700 bg-white touch-none"
            style={{ height: 320, cursor: myTurn ? 'crosshair' : 'default' }}
            onMouseDown={startDraw} onMouseMove={doDraw} onMouseUp={endDraw} onMouseLeave={endDraw}
            onTouchStart={startDraw} onTouchMove={doDraw} onTouchEnd={endDraw}
          />
          {/* Tools */}
          {myTurn && (
            <div className="flex flex-wrap gap-2 mt-2 items-center">
              <div className="flex gap-1">
                {COLORS_PAL.map(c => (
                  <button key={c} onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c ? 'scale-125 border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="flex gap-1">
                {SIZES.map(s => (
                  <button key={s} onClick={() => setSize(s)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${size === s ? 'bg-indigo-500' : 'bg-gray-800'}`}>
                    <div className="rounded-full bg-white" style={{ width: Math.min(s, 16), height: Math.min(s, 16) }} />
                  </button>
                ))}
              </div>
              <button onClick={handleClear} className="btn-secondary text-xs py-1 px-3">🗑 Clear</button>
            </div>
          )}
        </div>

        {/* Scores + chat */}
        <div className="w-48 flex flex-col gap-2">
          <div className="card p-3 flex-shrink-0">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Scores</p>
            {room.players.map((p, i) => (
              <div key={i} className="flex justify-between text-sm py-0.5">
                <span className="text-gray-300 truncate">{p.username}</span>
                <span className="text-indigo-400 font-bold">{scores[p.username] || 0}</span>
              </div>
            ))}
          </div>
          <div className="card p-3 flex-1 flex flex-col">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Guesses</p>
            <div className="flex-1 overflow-y-auto space-y-1 mb-2" style={{ maxHeight: 160 }}>
              {messages.map((m, i) => (
                <div key={i} className={`text-xs rounded-lg px-2 py-1 ${m.correct ? 'bg-green-500/20 text-green-300' : 'bg-gray-800 text-gray-300'}`}>
                  <span className="text-gray-400">{m.username}: </span>{m.text}
                  {m.correct && ' ✅'}
                </div>
              ))}
            </div>
            {!myTurn && (
              <div className="flex gap-1">
                <input value={guess} onChange={e => setGuess(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendGuess()}
                  placeholder="Your guess..." className="input-field flex-1 py-1.5 text-xs" />
                <button onClick={sendGuess} className="btn-primary px-2 py-1.5 text-xs">→</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {status === 'roundEnd' && (
        <div className="card text-center py-4">
          <p className="text-white font-semibold">The word was: <span className="text-indigo-400 text-xl">{currentWord}</span></p>
        </div>
      )}
    </div>
  );
};

export default DrawAndGuess;