import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GAMES = [
  { emoji: '🐍', name: 'Snake', category: 'Arcade', color: 'from-green-500 to-teal-500' },
  { emoji: '🧠', name: 'Memory', category: 'Puzzle', color: 'from-purple-500 to-indigo-500' },
  { emoji: '🎯', name: '2048', category: 'Puzzle', color: 'from-orange-500 to-amber-500' },
  { emoji: '❓', name: 'Trivia', category: 'Card', color: 'from-pink-500 to-rose-500' },
  { emoji: '🚀', name: 'Shooter', category: 'Arcade', color: 'from-blue-500 to-cyan-500' },
  { emoji: '🃏', name: 'UNO', category: 'Card', color: 'from-red-500 to-orange-500' },
];

const FEATURES = [
  { icon: '⚡', title: 'Live multiplayer', desc: 'Play in real-time with friends or strangers' },
  { icon: '🏆', title: 'Leaderboards', desc: 'Compete globally and track your personal bests' },
  { icon: '🎮', title: '12+ mini games', desc: 'Arcade, puzzle, card games — always growing' },
  { icon: '🔗', title: 'Invite friends', desc: 'Share a room code and jump in together' },
];

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-4 py-1.5 text-indigo-400 text-sm mb-6">
          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
          Live multiplayer • Free to play
        </div>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          Play{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            mini games
          </span>
          <br />with anyone
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          Arcade classics, brain puzzles, and card games — solo, with a friend, or in a full lobby.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to={user ? '/lobby' : '/signup'}
            className="btn-primary text-lg py-4 px-10"
          >
            {user ? '🎮 Go to lobby' : '🚀 Start playing free'}
          </Link>
          {!user && (
            <Link to="/login" className="btn-secondary text-lg py-4 px-10">
              Login
            </Link>
          )}
        </div>
      </section>

      {/* Games grid */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-center mb-10 text-gray-200">Games available</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {GAMES.map((game) => (
            <Link
              key={game.name}
              to={user ? '/lobby' : '/signup'}
              className="card group hover:border-gray-600 transition-all duration-200 hover:-translate-y-1 cursor-pointer"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}>
                {game.emoji}
              </div>
              <h3 className="font-semibold text-white">{game.name}</h3>
              <span className="text-xs text-gray-500 mt-1 block">{game.category}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-900 border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="text-center">
                <span className="text-4xl">{f.icon}</span>
                <h3 className="font-semibold text-white mt-4 mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
