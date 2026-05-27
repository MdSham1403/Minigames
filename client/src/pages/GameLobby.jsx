import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import GameWrapper from '../components/GameWrapper';
import CreateRoom from '../components/CreateRoom';
import JoinRoom from '../components/JoinRoom';
import MultiplayerGame from '../components/MultiplayerGame';

// ─── MASTER GAME LIST ────────────────────────────────────────────────────────
// To add a new game: add one entry here. ready:true = playable, false = coming soon.
const GAMES = [
  // Arcade
  { id:'snake',       emoji:'🐍', name:'Snake',          cat:'Arcade', modes:['single'],              ready:true,  desc:"Eat, grow, don't crash!" },
  { id:'flappy',      emoji:'🐦', name:'Flappy Bird',    cat:'Arcade', modes:['single'],              ready:true,  desc:'Tap to fly past the pipes.' },
  { id:'breakout',    emoji:'🧱', name:'Breakout',       cat:'Arcade', modes:['single'],              ready:true,  desc:'Smash all bricks with the ball.' },
  { id:'whackamole',  emoji:'🐹', name:'Whack-a-Mole',  cat:'Arcade', modes:['single'],              ready:true,  desc:'Whack moles as fast as you can!' },
  { id:'reaction',    emoji:'⚡', name:'Reaction Time',  cat:'Arcade', modes:['single'],              ready:true,  desc:'How fast are your reflexes?' },
  { id:'tetris',      emoji:'🟦', name:'Tetris',         cat:'Arcade', modes:['single'],              ready:true,  desc:'Classic falling blocks — clear lines!' },
  // Puzzle
  { id:'memory',      emoji:'🧠', name:'Memory',         cat:'Puzzle', modes:['single','duo'],        ready:true,  desc:'Find all matching pairs in time.' },
  { id:'2048',        emoji:'🎯', name:'2048',           cat:'Puzzle', modes:['single'],              ready:true,  desc:'Slide tiles — reach 2048!' },
  { id:'sudoku',      emoji:'🔢', name:'Sudoku',         cat:'Puzzle', modes:['single'],              ready:true,  desc:'Fill the grid. No repeats!' },
  { id:'numberpuzzle',emoji:'🔷', name:'15 Puzzle',      cat:'Puzzle', modes:['single'],              ready:true,  desc:'Slide tiles into order 1–15.' },
  { id:'simon',       emoji:'🟢', name:'Simon Says',     cat:'Puzzle', modes:['single'],              ready:true,  desc:'Repeat the growing colour pattern.' },
  { id:'minesweeper', emoji:'💣', name:'Minesweeper',    cat:'Puzzle', modes:['single'],              ready:true,  desc:'Clear the field without hitting mines.' },
  // Brain
  { id:'wordscramble',emoji:'🔤', name:'Word Scramble',  cat:'Brain',  modes:['single'],              ready:true,  desc:'Unscramble words against the clock!' },
  { id:'mathblaster', emoji:'🧮', name:'Math Blaster',   cat:'Brain',  modes:['single'],              ready:true,  desc:'Rapid-fire mental maths.' },
  { id:'colormatch',  emoji:'🌈', name:'Colour Match',   cat:'Brain',  modes:['single'],              ready:true,  desc:'Tap the ink colour, not the word!' },
  { id:'hangman',     emoji:'🪢', name:'Hangman',        cat:'Brain',  modes:['single'],              ready:true,  desc:'Guess the word before the man falls.' },
  // Card & Board
  { id:'trivia',      emoji:'❓', name:'Trivia',         cat:'Card',   modes:['single','duo','multi'],ready:true,  desc:'10 questions, 15 seconds each.' },
  { id:'tictactoe',   emoji:'❌', name:'Tic Tac Toe',   cat:'Card',   modes:['single'],              ready:true,  desc:'Classic — vs AI or 2 players.' },
  { id:'rps',         emoji:'✊', name:'Rock Paper Scissors', cat:'Card', modes:['single'],          ready:true,  desc:'Best of 5 against the AI.' },
  { id:'connect4',    emoji:'🔴', name:'Connect Four',   cat:'Card',   modes:['single'],              ready:true,  desc:'Four in a row wins.' },
  { id:'chess',       emoji:'♟', name:'Chess',           cat:'Card',   modes:['single'],              ready:true,  desc:'Classic chess vs AI.' },
  { id:'ludo',        emoji:'🎲', name:'Ludo',           cat:'Card',   modes:['single'],              ready:true,  desc:'Race all 4 pieces home first.' },
  { id:'uno',         emoji:'🃏', name:'UNO',            cat:'Card',   modes:['single'],              ready:true,  desc:'Match colors, play specials, win!' },
  { id:'battleship',  emoji:'🚢', name:'Battleship',     cat:'Card',   modes:['single'],              ready:true,  desc:'Place ships, sink the enemy fleet!' },
  // Coming soon — 4 new
  { id:'wordle',      emoji:'🟩', name:'Wordle',         cat:'Brain',  modes:['single'],              ready:false, desc:'Guess the 5-letter word in 6 tries.' },
  { id:'pong',        emoji:'🏓', name:'Pong',           cat:'Arcade', modes:['single','duo'],        ready:false, desc:'Classic arcade table tennis.' },
  { id:'checkers',    emoji:'⚫', name:'Checkers',       cat:'Card',   modes:['single'],              ready:false, desc:'Capture all of the opponent\'s pieces.' },
  { id:'2048x',       emoji:'🎮', name:'2048 Hex',       cat:'Puzzle', modes:['single'],              ready:false, desc:'2048 on a hexagonal grid.' },
];

const CAT_COLORS = {
  Arcade:'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Puzzle:'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Brain: 'bg-teal-500/10   text-teal-400   border-teal-500/20',
  Card:  'bg-pink-500/10   text-pink-400   border-pink-500/20',
};

const GameLobby = () => {
  const { user } = useAuth();
  const [soloGame, setSoloGame] = useState(null);
  const [mpView,   setMpView]   = useState(null);
  const [mpRoom,   setMpRoom]   = useState(null);
  const [filter,   setFilter]   = useState('All');
  const [search,   setSearch]   = useState('');

  const cats = ['All','Arcade','Puzzle','Brain','Card'];
  const filtered = GAMES.filter(g =>
    (filter === 'All' || g.cat === filter) &&
    (!search || g.name.toLowerCase().includes(search.toLowerCase()))
  );
  const ready = filtered.filter(g => g.ready);
  const soon  = filtered.filter(g => !g.ready);

  if (soloGame) return <GameWrapper gameId={soloGame} onBack={() => setSoloGame(null)} />;
  if (mpView === 'create') return (
    <div className="min-h-screen bg-gray-950 px-4 py-16 flex items-center justify-center">
      <CreateRoom onRoomCreated={({ roomCode, room }) => { setMpRoom({ roomCode, room }); setMpView('room'); }} onCancel={() => setMpView(null)} />
    </div>
  );
  if (mpView === 'join') return (
    <div className="min-h-screen bg-gray-950 px-4 py-16 flex items-center justify-center">
      <JoinRoom onRoomJoined={({ roomCode, room }) => { setMpRoom({ roomCode, room }); setMpView('room'); }} onCancel={() => setMpView(null)} />
    </div>
  );
  if (mpView === 'room' && mpRoom) return (
    <MultiplayerGame roomCode={mpRoom.roomCode} room={mpRoom.room} onLeave={() => { setMpView(null); setMpRoom(null); }} />
  );

  return (
    <div className="min-h-screen bg-gray-950 px-4 md:px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Hey <span className="text-indigo-400">{user?.username}</span> 👋</h1>
            <p className="text-gray-400 text-sm">{GAMES.filter(g => g.ready).length} games · {GAMES.filter(g => !g.ready).length} coming soon</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => setMpView('join')} className="btn-secondary text-sm py-2 px-4">🔗 Join room</button>
            <button onClick={() => setMpView('create')} className="btn-primary text-sm py-2 px-4">🚀 Create room</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-8 items-center">
          <input type="text" placeholder="🔍 Search games..." value={search}
            onChange={e => setSearch(e.target.value)} className="input-field max-w-xs py-2 text-sm" />
          <div className="flex gap-2 flex-wrap">
            {cats.map(cat => (
              <button key={cat} onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === cat ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {ready.length > 0 && (
          <>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">{filter === 'All' ? 'All games' : filter} · {ready.length} available</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-10">
              {ready.map(game => (
                <div key={game.id} className="card group hover:border-gray-600 transition-all duration-200 flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-4xl group-hover:scale-110 transition-transform inline-block">{game.emoji}</span>
                    <span className={`text-xs border rounded-full px-2 py-0.5 ${CAT_COLORS[game.cat]}`}>{game.cat}</span>
                  </div>
                  <h3 className="font-semibold text-white mb-1">{game.name}</h3>
                  <p className="text-sm text-gray-500 mb-4 flex-1">{game.desc}</p>
                  <div className="flex gap-2 flex-wrap mt-auto">
                    {game.modes.includes('single') && (
                      <button onClick={() => setSoloGame(game.id)} className="flex-1 btn-primary text-sm py-2">🎮 Solo</button>
                    )}
                    {game.modes.includes('duo') && (
                      <button onClick={() => setMpView('create')} className="flex-1 btn-secondary text-sm py-2">👥 Duo</button>
                    )}
                    {game.modes.includes('multi') && (
                      <button onClick={() => setMpView('create')} className="flex-1 bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 font-semibold py-2 px-3 rounded-xl transition-all text-sm">🌐 Multi</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {soon.length > 0 && (
          <>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">Coming soon</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {soon.map(game => (
                <div key={game.id} className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 opacity-50">
                  <span className="text-3xl">{game.emoji}</span>
                  <p className="font-medium text-gray-400 mt-2 text-sm">{game.name}</p>
                  <p className="text-xs text-gray-600 mt-1">{game.desc}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {ready.length === 0 && soon.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-gray-400">No games match "{search}"</p>
            <button onClick={() => { setSearch(''); setFilter('All'); }} className="btn-secondary mt-4">Clear filters</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameLobby;
