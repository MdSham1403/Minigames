import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const GAME_META = {
  snake:        { emoji: '🐍', label: 'Snake' },
  memory:       { emoji: '🧠', label: 'Memory' },
  '2048':       { emoji: '🎯', label: '2048' },
  trivia:       { emoji: '❓', label: 'Trivia' },
  tictactoe:    { emoji: '❌', label: 'Tic Tac Toe' },
  sudoku:       { emoji: '🔢', label: 'Sudoku' },
  flappy:       { emoji: '🐦', label: 'Flappy Bird' },
  breakout:     { emoji: '🧱', label: 'Breakout' },
  wordscramble: { emoji: '🔤', label: 'Word Scramble' },
  mathblaster:  { emoji: '🧮', label: 'Math Blaster' },
  colormatch:   { emoji: '🌈', label: 'Colour Match' },
  whackamole:   { emoji: '🐹', label: 'Whack-a-Mole' },
  rps:          { emoji: '✊', label: 'Rock Paper Scissors' },
  simon:        { emoji: '🟢', label: 'Simon Says' },
  reaction:     { emoji: '⚡', label: 'Reaction Time' },
  numberpuzzle: { emoji: '🔷', label: '15 Puzzle' },
};

const ACHIEVEMENTS = [
  { icon: '🎮', label: 'First game',      desc: 'Play your first game',          check: (s,t) => t >= 1 },
  { icon: '🔟', label: '10 games played', desc: 'Play 10 games total',           check: (s,t) => t >= 10 },
  { icon: '💯', label: '50 games played', desc: 'Play 50 games total',           check: (s,t) => t >= 50 },
  { icon: '🧠', label: 'Memory master',   desc: 'Score 800+ in Memory',          check: (s) => s.some(r => r.game_name==='memory'  && r.best_score >= 800) },
  { icon: '🐍', label: 'Snake charmer',   desc: 'Score 150+ in Snake',           check: (s) => s.some(r => r.game_name==='snake'    && r.best_score >= 150) },
  { icon: '🎯', label: '2048 legend',     desc: 'Reach the 1024 tile',           check: (s) => s.some(r => r.game_name==='2048'     && r.best_score >= 1024) },
  { icon: '❓', label: 'Trivia ace',      desc: 'Score 700+ in Trivia',          check: (s) => s.some(r => r.game_name==='trivia'   && r.best_score >= 700) },
  { icon: '🔢', label: 'Sudoku solver',   desc: 'Complete a Sudoku puzzle',      check: (s) => s.some(r => r.game_name==='sudoku'   && r.best_score >= 1) },
  { icon: '⚡', label: 'Lightning fast',  desc: 'Average reaction < 200ms',     check: (s) => s.some(r => r.game_name==='reaction' && r.best_score >= 800) },
  { icon: '🎭', label: 'Variety pack',    desc: 'Play 5 different games',        check: (s) => s.length >= 5 },
  { icon: '🏆', label: 'High scorer',     desc: 'Total best points over 2000',   check: (s) => s.reduce((a,r)=>a+Number(r.best_score),0) >= 2000 },
  { icon: '🌈', label: 'Colourblind',     desc: 'Score 500+ in Colour Match',    check: (s) => s.some(r => r.game_name==='colormatch' && r.best_score >= 500) },
];

const Profile = () => {
  const { user, logout } = useAuth();
  const [stats, setStats]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/scores/me')
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalGames    = stats.reduce((s, r) => s + Number(r.games_played), 0);
  const totalBest     = stats.reduce((s, r) => s + Number(r.best_score), 0);
  const topGame       = [...stats].sort((a,b) => b.games_played - a.games_played)[0];
  const gamesUnlocked = stats.length;

  const joinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { year:'numeric', month:'long', day:'numeric' })
    : '—';

  const earnedCount = ACHIEVEMENTS.filter(a => a.check(stats, totalGames)).length;

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-10">
      <div className="max-w-xl mx-auto space-y-5">

        {/* Avatar card */}
        <div className="card flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-bold text-white flex-shrink-0"
            style={{ backgroundColor: user?.avatarColor || '#6366f1' }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-white truncate">{user?.username}</h1>
            <p className="text-gray-400 text-sm truncate">{user?.email}</p>
            <p className="text-gray-600 text-xs mt-1">Joined {joinDate}</p>
          </div>
          <button onClick={logout}
            className="flex-shrink-0 text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-400/40 px-3 py-1.5 rounded-xl transition-all hover:bg-red-500/10">
            Logout
          </button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Games played',   value: totalGames,                    icon: '🎮' },
            { label: 'Total best pts', value: totalBest.toLocaleString(),    icon: '⭐' },
            { label: 'Games tried',    value: `${gamesUnlocked}/16`,         icon: '🗺️' },
            { label: 'Achievements',   value: `${earnedCount}/${ACHIEVEMENTS.length}`, icon: '🏅' },
          ].map(s => (
            <div key={s.label} className="card text-center p-4">
              <p className="text-2xl mb-1">{s.icon}</p>
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Per-game stats */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Game stats</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : stats.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-3">🎲</p>
              <p className="text-gray-400">No games played yet. Head to the lobby!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.map((row, i) => {
                const meta = GAME_META[row.game_name] || { emoji: '🎮', label: row.game_name };
                const maxScore = { snake:500,memory:2000,'2048':2048,trivia:1500,tictactoe:300,sudoku:2000,flappy:300,breakout:2000,wordscramble:2000,mathblaster:3000,colormatch:2000,whackamole:300,rps:500,simon:1000,reaction:1000,numberpuzzle:2000 };
                const pct = Math.min(100, (Number(row.best_score) / (maxScore[row.game_name] || 1000)) * 100);
                return (
                  <div key={i} className="bg-gray-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{meta.emoji}</span>
                        <span className="font-medium text-white">{meta.label}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-indigo-400 font-bold">{Number(row.best_score).toLocaleString()}</span>
                        <span className="text-gray-500 text-xs ml-1">best</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-500">{row.games_played} games played</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Achievements */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Achievements <span className="text-indigo-400">{earnedCount}/{ACHIEVEMENTS.length}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ACHIEVEMENTS.map(a => {
              const earned = a.check(stats, totalGames);
              return (
                <div key={a.label}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    earned ? 'border-indigo-500/40 bg-indigo-500/10' : 'border-gray-700 bg-gray-800/40 opacity-40'
                  }`}>
                  <span className="text-2xl">{a.icon}</span>
                  <div>
                    <p className={`text-sm font-medium ${earned ? 'text-white' : 'text-gray-400'}`}>{a.label}</p>
                    <p className="text-xs text-gray-500">{earned ? '✅ Earned' : a.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
