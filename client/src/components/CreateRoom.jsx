import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';

const GAME_LIST = [
  { id: 'memory', emoji: '🧠', name: 'Memory', modes: ['duo', 'multi'] },
  { id: 'trivia', emoji: '❓', name: 'Trivia', modes: ['duo', 'multi'] },
];

const CreateRoom = ({ onRoomCreated, onCancel }) => {
  const { user } = useAuth();
  const { emit, on } = useSocket();
  const [gameId, setGameId]   = useState('trivia');
  const [mode, setMode]       = useState('duo');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    const offCreated = on('room_created', ({ roomCode, room }) => {
      setLoading(false);
      onRoomCreated({ roomCode, room });
    });
    const offError = on('room_error', ({ message }) => {
      setLoading(false);
      setError(message);
    });
    return () => { offCreated(); offError(); };
  }, [on, onRoomCreated]);

  const handleCreate = () => {
    setError('');
    setLoading(true);
    emit('create_room', {
      gameName: gameId,
      mode,
      username: user.username,
    });
  };

  const availableModes = GAME_LIST.find(g => g.id === gameId)?.modes || ['duo'];

  return (
    <div className="card w-full max-w-md mx-auto">
      <h2 className="text-xl font-bold text-white mb-6">🏠 Create a room</h2>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Game selector */}
      <div className="mb-5">
        <label className="block text-sm text-gray-400 mb-2">Choose game</label>
        <div className="grid grid-cols-2 gap-3">
          {GAME_LIST.map(g => (
            <button
              key={g.id}
              onClick={() => {
                setGameId(g.id);
                setMode(g.modes[0]);
              }}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                gameId === g.id
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
            >
              <span className="text-2xl">{g.emoji}</span>
              <span className="font-medium text-white">{g.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mode selector */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-2">Mode</label>
        <div className="flex gap-2">
          {availableModes.map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                mode === m ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {m === 'duo' ? '👥 Duo (2 players)' : '🌐 Multi (up to 6)'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onCancel} className="btn-secondary flex-1 py-3">Cancel</button>
        <button onClick={handleCreate} disabled={loading} className="btn-primary flex-1 py-3">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating...
            </span>
          ) : '🚀 Create room'}
        </button>
      </div>
    </div>
  );
};

export default CreateRoom;
