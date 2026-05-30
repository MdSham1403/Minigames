import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); setOpen(false); };

  const links = [
    { path: '/',            label: 'Home' },
    { path: '/lobby',       label: 'Play' },
    { path: '/leaderboard', label: 'Leaderboard' },
    ...(user ? [{ path: '/profile', label: 'Profile' }] : []),
    ...(user?.role === 'admin' ? [{ path: '/admin', label: '⚙ Admin' }] : []),
  ];

  const cls = (path) =>
    `block px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
      location.pathname === path
        ? 'bg-indigo-500/20 text-indigo-400'
        : 'text-gray-400 hover:text-white hover:bg-gray-800'
    }`;

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-4 md:px-6 py-3 relative z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0" onClick={() => setOpen(false)}>
          <span className="text-2xl">🎮</span>
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            MiniGames
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(({ path, label }) => (
            <Link key={path} to={path} className={cls(path)}>{label}</Link>
          ))}
        </div>

        {/* Desktop right */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ backgroundColor: user.avatarColor }}>
                  {user.username[0].toUpperCase()}
                </div>
                <span className="text-sm text-gray-300 hidden lg:block">{user.username}</span>
                {user.role === 'admin' && (
                  <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">Admin</span>
                )}
              </Link>
              <button onClick={handleLogout}
                className="text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors">
                Logout
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <Link to="/login"  className="btn-secondary text-sm py-1.5 px-4">Login</Link>
              <Link to="/signup" className="btn-primary  text-sm py-1.5 px-4">Sign up</Link>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen(o => !o)}
          className="flex md:hidden w-9 h-9 items-center justify-center rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors"
          aria-label="Toggle menu">
          <div className="flex flex-col gap-1.5 w-5">
            <span className={`block h-0.5 bg-gray-300 rounded transition-all duration-200 ${open ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block h-0.5 bg-gray-300 rounded transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 bg-gray-300 rounded transition-all duration-200 ${open ? '-rotate-45 -translate-y-2' : ''}`} />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-gray-900 border-b border-gray-800 shadow-xl py-3 px-4 space-y-1">
          {links.map(({ path, label }) => (
            <Link key={path} to={path} onClick={() => setOpen(false)} className={cls(path)}>{label}</Link>
          ))}
          <div className="pt-3 border-t border-gray-800 mt-2">
            {user ? (
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: user.avatarColor }}>
                    {user.username[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-300">{user.username}</span>
                  {user.role === 'admin' && (
                    <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">Admin</span>
                  )}
                </div>
                <button onClick={handleLogout}
                  className="text-sm text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link to="/login"  onClick={() => setOpen(false)} className="flex-1 btn-secondary text-center py-2 text-sm">Login</Link>
                <Link to="/signup" onClick={() => setOpen(false)} className="flex-1 btn-primary  text-center py-2 text-sm">Sign up</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
