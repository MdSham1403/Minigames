import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';
import WaitingRoom from './WaitingRoom';
import MultiplayerResults from './MultiplayerResults';
import MemoryDuo from '../games/MemoryDuo';
import TriviaDuo from '../games/TriviaDuo';
import api from '../api/axios';

// phase: waiting | playing | results
const MultiplayerGame = ({ roomCode, room: initialRoom, onLeave }) => {
  const { user } = useAuth();
  const { emit } = useSocket();

  const [phase, setPhase]       = useState('waiting');
  const [room, setRoom]         = useState(initialRoom);
  const [rankings, setRankings] = useState([]);
  const [myScore, setMyScore]   = useState(0);

  const isHost = room.host === room.players.find(p => p.username === user.username)?.id
    || room.players[0]?.username === user.username; // fallback: first player is host

  // ── Game starts ────────────────────────────────────────────────────────────
  const handleGameStart = useCallback((startedRoom) => {
    setRoom(startedRoom);
    setPhase('playing');
  }, []);

  // ── Game ends ──────────────────────────────────────────────────────────────
  const handleGameEnd = useCallback(async (score, oppScore) => {
    const finalScore = typeof score === 'number' ? score : 0;
    setMyScore(finalScore);

    // Save to DB
    try {
      await api.post('/scores', { gameName: room.gameName, score: finalScore, mode: room.mode });
    } catch (e) {}

    // Submit to socket for ranking
    emit('submit_score', { roomCode, score: finalScore });

    // Build local rankings (opponent score may be passed)
    const myRank  = { username: user.username, score: finalScore };
    const oppRank = typeof oppScore === 'number'
      ? [{ username: room.players.find(p => p.username !== user.username)?.username || 'Opponent', score: oppScore }]
      : [];

    const sorted = [myRank, ...oppRank].sort((a, b) => b.score - a.score);
    setRankings(sorted);
    setPhase('results');
  }, [room, roomCode, emit, user.username]);

  // ── Play again — go back to waiting room ──────────────────────────────────
  const handlePlayAgain = () => {
    const resetRoom = {
      ...room,
      status: 'waiting',
      players: room.players.map(p => ({ ...p, ready: false, score: 0, finished: false })),
    };
    setRoom(resetRoom);
    setPhase('waiting');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (phase === 'waiting') {
    return (
      <WaitingRoom
        roomCode={roomCode}
        room={room}
        onGameStart={handleGameStart}
        onLeave={onLeave}
      />
    );
  }

  if (phase === 'results') {
    return (
      <MultiplayerResults
        rankings={rankings}
        room={room}
        onPlayAgain={handlePlayAgain}
        onLeave={onLeave}
      />
    );
  }

  // ── Game phase ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 px-4 py-6">
      <div className="max-w-2xl mx-auto">
        {/* Game header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">{room.gameName === 'trivia' ? '❓' : '🧠'}</span>
            <span className="font-semibold text-white capitalize">{room.gameName}</span>
            <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">
              {room.mode}
            </span>
          </div>
          <span className="text-xs text-gray-500 font-mono bg-gray-800 px-3 py-1 rounded-full">
            Room {roomCode}
          </span>
        </div>

        {/* Game component */}
        {room.gameName === 'memory' && (
          <MemoryDuo
            room={room}
            roomCode={roomCode}
            isHost={isHost}
            onGameEnd={handleGameEnd}
          />
        )}
        {room.gameName === 'trivia' && (
          <TriviaDuo
            room={room}
            roomCode={roomCode}
            isHost={isHost}
            onGameEnd={handleGameEnd}
          />
        )}
        {!['memory', 'trivia'].includes(room.gameName) && (
          <div className="card text-center py-12">
            <p className="text-4xl mb-4">🚧</p>
            <p className="text-gray-400">This game doesn't have a multiplayer mode yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiplayerGame;
