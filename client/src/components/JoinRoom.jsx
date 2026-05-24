import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';

const JoinRoom = ({ onRoomJoined, onCancel }) => {
  const { user } = useAuth();
  const { emit, on } = useSocket();
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    const offJoined = on('room_joined', ({ room }) => {
      setLoading(false);
      onRoomJoined({ roomCode: room.code, room });
    });
    const offError = on('room_error', ({ message }) => {
      setLoading(false);
      setError(message);
    });
    return () => { offJoined(); offError(); };
  }, [on, onRoomJoined]);

  const handleJoin = () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) { setError('Please enter a valid room code.'); return; }
    setError('');
    setLoading(true);
    emit('join_room', { roomCode: trimmed, username: user.username });
  };

  return (
    <div className="card w-full max-w-md mx-auto">
      <h2 className="text-xl font-bold text-white mb-2">🔗 Join a room</h2>
      <p className="text-gray-400 text-sm mb-6">Enter the room code shared by your friend</p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      <input
        type="text"
        placeholder="e.g. AB12CD"
        value={code}
        onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
        onKeyDown={e => e.key === 'Enter' && handleJoin()}
        maxLength={8}
        className="input-field text-center text-2xl font-mono tracking-widest mb-6"
        autoFocus
      />

      <div className="flex gap-3">
        <button onClick={onCancel} className="btn-secondary flex-1 py-3">Cancel</button>
        <button onClick={handleJoin} disabled={loading || !code.trim()} className="btn-primary flex-1 py-3 disabled:opacity-50">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Joining...
            </span>
          ) : '🚪 Join room'}
        </button>
      </div>
    </div>
  );
};

export default JoinRoom;
