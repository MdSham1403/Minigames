import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';

const WaitingRoom = ({ roomCode, room: initialRoom, onGameStart, onLeave }) => {
  const { user } = useAuth();
  const { emit, on } = useSocket();

  const [room, setRoom]           = useState(initialRoom);
  const [countdown, setCountdown] = useState(null);
  const [messages, setMessages]   = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied]       = useState(false);
  const chatEndRef = useRef(null);

  const me = room.players.find(p => p.username === user.username);
  const isHost = room.host === me?.id;

  // ── Socket listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    const offs = [
      on('room_updated', ({ room: r }) => setRoom(r)),

      on('countdown', ({ count }) => setCountdown(count)),

      on('game_start', ({ room: r }) => {
        setCountdown(null);
        setRoom(r);
        onGameStart(r);
      }),

      on('chat_message', (msg) => {
        setMessages(prev => [...prev.slice(-49), msg]); // keep last 50
      }),

      on('player_disconnected', () => {
        setMessages(prev => [...prev, { username: '⚠ System', message: 'A player disconnected.', time: '' }]);
      }),
    ];
    return () => offs.forEach(off => off());
  }, [on, onGameStart]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleReady = () => emit('player_ready', { roomCode });

  const sendChat = () => {
    if (!chatInput.trim()) return;
    emit('chat_message', { roomCode, username: user.username, message: chatInput });
    setChatInput('');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    emit('leave_room', { roomCode });
    onLeave();
  };

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div className="card">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">
                  {room.gameName === 'trivia' ? '❓' : '🧠'}
                </span>
                <h2 className="text-xl font-bold text-white capitalize">
                  {room.gameName} — {room.mode}
                </h2>
              </div>
              <p className="text-gray-400 text-sm">
                {room.players.length}/{room.maxPlayers} players • Waiting for all to ready up
              </p>
            </div>

            {/* Room code */}
            <button
              onClick={copyCode}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 rounded-xl px-4 py-2 transition-colors group"
              title="Click to copy"
            >
              <span className="font-mono text-xl font-bold text-indigo-400 tracking-widest">
                {roomCode}
              </span>
              <span className="text-gray-400 group-hover:text-white text-sm">
                {copied ? '✅' : '📋'}
              </span>
            </button>
          </div>

          {copied && (
            <p className="text-xs text-green-400 mt-2">Room code copied! Share it with a friend.</p>
          )}
        </div>

        {/* Countdown overlay */}
        {countdown !== null && (
          <div className="card text-center py-8 border-indigo-500/50">
            <p className="text-gray-400 mb-2">Game starting in</p>
            <p className="text-8xl font-bold text-indigo-400 animate-pulse">{countdown}</p>
          </div>
        )}

        {/* Players list */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Players
          </h3>
          <div className="space-y-3">
            {room.players.map((p, i) => (
              <div
                key={p.id || i}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  p.ready ? 'bg-green-500/10 border border-green-500/20' : 'bg-gray-800'
                }`}
              >
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: '#6366f1' }}
                >
                  {p.username[0].toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white truncate">{p.username}</span>
                    {p.id === room.host && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">Host</span>
                    )}
                    {p.username === user.username && (
                      <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">You</span>
                    )}
                  </div>
                </div>

                <span className={`text-sm font-medium ${p.ready ? 'text-green-400' : 'text-gray-500'}`}>
                  {p.ready ? '✅ Ready' : '⏳ Waiting'}
                </span>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: room.maxPlayers - room.players.length }).map((_, i) => (
              <div key={`empty-${i}`} className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/40 border border-dashed border-gray-700">
                <div className="w-9 h-9 rounded-full bg-gray-700/50 flex items-center justify-center text-gray-600">?</div>
                <span className="text-gray-600 text-sm">Waiting for player...</span>
              </div>
            ))}
          </div>

          {/* Ready button */}
          <button
            onClick={toggleReady}
            disabled={countdown !== null}
            className={`w-full mt-5 py-3 rounded-xl font-semibold text-lg transition-all active:scale-95 disabled:opacity-50 ${
              me?.ready
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-green-500 hover:bg-green-400 text-white'
            }`}
          >
            {me?.ready ? '⏸ Unready' : '✅ Ready!'}
          </button>

          {room.players.length < 2 && (
            <p className="text-center text-gray-500 text-sm mt-3">
              Share the code above — need at least 2 players to start
            </p>
          )}
        </div>

        {/* Chat box */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            💬 Room chat
          </h3>
          <div className="h-40 overflow-y-auto space-y-1 mb-3 pr-1">
            {messages.length === 0 && (
              <p className="text-gray-600 text-sm text-center pt-8">No messages yet. Say hi!</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className="text-sm">
                <span className="text-indigo-400 font-medium">{m.username}</span>
                {m.time && <span className="text-gray-600 text-xs ml-1">{m.time}</span>}
                <span className="text-gray-300 ml-1">{m.message}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendChat()}
              placeholder="Type a message..."
              maxLength={200}
              className="input-field flex-1 py-2 text-sm"
            />
            <button onClick={sendChat} className="btn-primary px-4 py-2 text-sm">Send</button>
          </div>
        </div>

        {/* Leave */}
        <button
          onClick={handleLeave}
          className="w-full text-gray-500 hover:text-red-400 text-sm py-2 transition-colors"
        >
          🚪 Leave room
        </button>
      </div>
    </div>
  );
};

export default WaitingRoom;
