import { useState, useEffect } from 'react';
import api from '../api/axios';

const GAMES = [
  { id:'',            label:'🌍 Overall',          desc:'Sum of best scores across all games' },
  { id:'snake',       label:'🐍 Snake',             desc:'Highest single session score' },
  { id:'memory',      label:'🧠 Memory',            desc:'Best score with time & move bonuses' },
  { id:'2048',        label:'🎯 2048',              desc:'Highest score reached' },
  { id:'trivia',      label:'❓ Trivia',            desc:'Best quiz score out of 1500+' },
  { id:'tictactoe',   label:'❌ Tic Tac Toe',       desc:'Win streaks vs AI' },
  { id:'sudoku',      label:'🔢 Sudoku',            desc:'Fastest solve with fewest mistakes' },
  { id:'flappy',      label:'🐦 Flappy Bird',       desc:'Most pipes passed in one run' },
  { id:'breakout',    label:'🧱 Breakout',          desc:'Highest brick-clearing score' },
  { id:'wordscramble',label:'🔤 Word Scramble',     desc:'Speed + streak bonus points' },
  { id:'mathblaster', label:'🧮 Math Blaster',      desc:'Speed × correctness score' },
  { id:'colormatch',  label:'🌈 Colour Match',      desc:'Reaction bonus score' },
  { id:'whackamole',  label:'🐹 Whack-a-Mole',     desc:'Moles whacked in 30 seconds' },
  { id:'rps',         label:'✊ Rock Paper Scissors',desc:'Match wins × 100' },
  { id:'simon',       label:'🟢 Simon Says',        desc:'Longest pattern memorised' },
  { id:'reaction',    label:'⚡ Reaction Time',     desc:'Fastest average reaction (inverted)' },
  { id:'numberpuzzle',label:'🔷 15 Puzzle',         desc:'Fewest moves, fastest time' },
];

const MEDALS = ['🥇','🥈','🥉'];
const RANK_BG = ['bg-yellow-500/10 border-l-yellow-400','bg-gray-500/10 border-l-gray-400','bg-orange-600/10 border-l-orange-400'];

const Leaderboard = () => {
  const [selected, setSelected]   = useState('');
  const [scores, setScores]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchLeaderboard = async (game='') => {
    setLoading(true);
    try {
      const res = await api.get(game ? `/scores/leaderboard?game=${game}` : '/scores/leaderboard');
      setScores(res.data);
      setLastUpdated(new Date());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchLeaderboard(selected); }, [selected]);

  const currentGame = GAMES.find(g => g.id === selected);

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-10">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🏆 Leaderboard</h1>
          <p className="text-gray-400 text-sm">{currentGame?.desc}</p>
          {lastUpdated && (
            <p className="text-gray-600 text-xs mt-2">
              Updated {lastUpdated.toLocaleTimeString()}
              <button onClick={() => fetchLeaderboard(selected)}
                className="ml-2 text-indigo-500 hover:text-indigo-400 transition-colors">↻ Refresh</button>
            </p>
          )}
        </div>

        {/* Scrollable game filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {GAMES.map(g => (
            <button key={g.id} onClick={() => setSelected(g.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                selected === g.id
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}>
              {g.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : scores.length === 0 ? (
            <div className="text-center py-16 px-6">
              <p className="text-5xl mb-4">📭</p>
              <p className="text-white font-semibold mb-1">No scores yet</p>
              <p className="text-gray-400 text-sm">Be the first to play and set a record!</p>
            </div>
          ) : (
            <div>
              {/* Top 3 podium — only when 3+ scores */}
              {scores.length >= 3 && (
                <div className="flex items-end justify-center gap-3 bg-gray-900 px-6 pt-8 pb-4 border-b border-gray-800">
                  {[1,0,2].map(rank => {
                    const row = scores[rank];
                    const heights = [14, 20, 10];
                    const ht = heights[rank === 0 ? 1 : rank === 1 ? 0 : 2];
                    return (
                      <div key={rank} className="flex flex-col items-center gap-2">
                        <div className={`rounded-full flex items-center justify-center font-bold text-white ${rank===0?'w-14 h-14 ring-2 ring-yellow-400':'w-12 h-12'}`}
                          style={{ fontSize: rank===0?'1.2rem':'1rem', backgroundColor: row?.avatar_color||'#6366f1', marginBottom: rank===0?0:2 }}>
                          {row?.username?.[0]?.toUpperCase()}
                        </div>
                        <p className="text-xs text-gray-300 font-medium max-w-[70px] truncate text-center">{row?.username}</p>
                        <p className={`font-bold ${rank===0?'text-yellow-400 text-base':'text-gray-300 text-sm'}`}>
                          {Number(row?.best_score||row?.total_score||0).toLocaleString()}
                        </p>
                        <div className={`rounded-t-xl flex items-end justify-center pb-2 text-2xl`}
                          style={{ width: rank===0?80:64, height: ht*4, background: rank===0?'rgba(234,179,8,0.2)':rank===1?'rgba(156,163,175,0.2)':'rgba(194,119,73,0.2)' }}>
                          {MEDALS[rank]}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Full list */}
              <div className="divide-y divide-gray-800">
                {scores.map((row, i) => (
                  <div key={i}
                    className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-800/40 transition-colors ${
                      i < 3 ? `border-l-2 ${RANK_BG[i]}` : ''
                    }`}>
                    <span className="text-xl w-8 text-center flex-shrink-0">
                      {i < 3 ? MEDALS[i] : <span className="text-gray-500 text-sm font-mono">#{i+1}</span>}
                    </span>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: row.avatar_color||'#6366f1' }}>
                      {row.username?.[0]?.toUpperCase()}
                    </div>
                    <span className="font-medium text-white flex-1 truncate">{row.username}</span>
                    {row.game_name && (
                      <span className="text-xs text-gray-500 capitalize hidden sm:block">
                        {GAMES.find(g=>g.id===row.game_name)?.label?.split(' ').slice(1).join(' ') || row.game_name}
                      </span>
                    )}
                    <div className="text-right flex-shrink-0">
                      <span className="text-indigo-400 font-bold">
                        {Number(row.best_score||row.total_score||0).toLocaleString()}
                      </span>
                      <span className="text-gray-500 text-xs ml-1">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <p className="text-center text-gray-700 text-xs mt-6">Scores update live after every game</p>
      </div>
    </div>
  );
};

export default Leaderboard;
