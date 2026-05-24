import { useAuth } from '../context/AuthContext';

const MEDALS = ['🥇', '🥈', '🥉'];

const MultiplayerResults = ({ rankings, room, onPlayAgain, onLeave }) => {
  const { user } = useAuth();
  const myRank = rankings.findIndex(p => p.username === user.username) + 1;

  const headline = myRank === 1 ? '🏆 You won!' : myRank === 2 ? '🥈 So close!' : 'Good game!';

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-12">
      <div className="max-w-md mx-auto space-y-6">

        {/* Hero */}
        <div className="text-center">
          <p className="text-6xl mb-3">{myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : '🎮'}</p>
          <h2 className="text-3xl font-bold text-white">{headline}</h2>
          <p className="text-gray-400 mt-1">
            {room.gameName} · {room.mode} · {rankings.length} players
          </p>
        </div>

        {/* Podium rankings */}
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Final standings</h3>
          {rankings.map((p, i) => (
            <div
              key={p.id || i}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                p.username === user.username
                  ? 'bg-indigo-500/15 border border-indigo-500/30'
                  : i === 0
                  ? 'bg-yellow-500/10 border border-yellow-500/20'
                  : 'bg-gray-800'
              }`}
            >
              <span className="text-xl w-8 text-center">{MEDALS[i] || `${i + 1}`}</span>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ backgroundColor: '#6366f1' }}
              >
                {p.username[0].toUpperCase()}
              </div>
              <span className="font-medium text-white flex-1">{p.username}</span>
              {p.username === user.username && (
                <span className="text-xs text-indigo-400">You</span>
              )}
              <span className="text-indigo-400 font-bold">{p.score?.toLocaleString() ?? 0} pts</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button onClick={onPlayAgain} className="btn-primary w-full py-3 text-lg">
            🔄 Play again
          </button>
          <button onClick={onLeave} className="btn-secondary w-full py-3">
            🚪 Leave room
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultiplayerResults;
