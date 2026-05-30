import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

// ── Small reusable bits ───────────────────────────────────────────────────────
const Badge = ({ children, color = 'gray' }) => {
  const colors = {
    green:  'bg-green-500/15 text-green-400 border-green-500/30',
    red:    'bg-red-500/15   text-red-400   border-red-500/30',
    indigo: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    gray:   'bg-gray-700     text-gray-300   border-gray-600',
    yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[color]}`}>
      {children}
    </span>
  );
};

const StatCard = ({ label, value, icon, sub }) => (
  <div className="bg-gray-800/60 rounded-2xl p-5 border border-gray-700/50">
    <div className="flex items-start justify-between mb-3">
      <span className="text-2xl">{icon}</span>
    </div>
    <p className="text-3xl font-bold text-white">{value}</p>
    <p className="text-sm text-gray-400 mt-1">{label}</p>
    {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
  </div>
);

const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
    <div className="card max-w-sm w-full text-center py-8 px-6">
      <p className="text-3xl mb-4">⚠️</p>
      <p className="text-white font-semibold mb-2">Are you sure?</p>
      <p className="text-gray-400 text-sm mb-6">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 btn-secondary py-2">Cancel</button>
        <button onClick={onConfirm} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-xl transition-colors">
          Confirm
        </button>
      </div>
    </div>
  </div>
);

const Toast = ({ msg, type }) => (
  <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl border ${
    type === 'error'
      ? 'bg-red-500/20 border-red-500/40 text-red-300'
      : 'bg-green-500/20 border-green-500/40 text-green-300'
  }`}>
    {type === 'error' ? '❌' : '✅'} {msg}
  </div>
);

// ── Reset password modal ──────────────────────────────────────────────────────
const ResetPasswordModal = ({ user, onClose, onToast }) => {
  const [pw, setPw]       = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (pw.length < 6) { onToast('Password must be at least 6 characters.', 'error'); return; }
    setLoading(true);
    try {
      await api.post(`/admin/users/${user.id}/reset-password`, { newPassword: pw });
      onToast(`Password reset for ${user.username}.`, 'success');
      onClose();
    } catch (e) {
      onToast(e.response?.data?.message || 'Failed.', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="card max-w-sm w-full py-8 px-6">
        <h3 className="text-lg font-bold text-white mb-1">Reset password</h3>
        <p className="text-gray-400 text-sm mb-5">Set a new password for <span className="text-white">{user.username}</span></p>
        <input
          type="password"
          placeholder="New password (min 6 chars)"
          value={pw}
          onChange={e => setPw(e.target.value)}
          className="input-field mb-4"
          autoFocus
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary py-2">Cancel</button>
          <button onClick={submit} disabled={loading} className="flex-1 btn-primary py-2 disabled:opacity-50">
            {loading ? 'Saving...' : 'Reset password'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ADMIN PANEL
// ─────────────────────────────────────────────────────────────────────────────
const AdminPanel = () => {
  const [tab, setTab]         = useState('dashboard');
  const [stats, setStats]     = useState(null);
  const [users, setUsers]     = useState([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage]   = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [games, setGames]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState(null);
  const [confirm, setConfirm] = useState(null); // { message, action }
  const [resetUser, setResetUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Data fetchers ───────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (e) { showToast('Failed to load stats.', 'error'); }
  }, []);

  const fetchUsers = useCallback(async (page = 1, search = '') => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/users?page=${page}&limit=15&search=${encodeURIComponent(search)}`);
      setUsers(res.data.users);
      setUserTotal(res.data.total);
    } catch (e) { showToast('Failed to load users.', 'error'); }
    setLoading(false);
  }, []);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/games');
      setGames(res.data);
    } catch (e) { showToast('Failed to load games.', 'error'); }
    setLoading(false);
  }, []);

  const fetchUserDetail = async (id) => {
    try {
      const res = await api.get(`/admin/users/${id}`);
      setSelectedUser(res.data);
    } catch (e) { showToast('Failed to load user.', 'error'); }
  };

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { if (tab === 'users')  fetchUsers(userPage, userSearch); }, [tab, userPage, fetchUsers]);
  useEffect(() => { if (tab === 'games')  fetchGames(); }, [tab, fetchGames]);

  // ── User actions ────────────────────────────────────────────────────────────
  const setStatus = (userId, status, username) => {
    setConfirm({
      message: `${status === 'inactive' ? 'Deactivate' : 'Activate'} account for "${username}"? ${status === 'inactive' ? 'They will not be able to log in.' : ''}`,
      action: async () => {
        try {
          await api.patch(`/admin/users/${userId}/status`, { status });
          showToast(`${username} ${status === 'active' ? 'activated' : 'deactivated'}.`);
          fetchUsers(userPage, userSearch);
          if (selectedUser?.id === userId) fetchUserDetail(userId);
        } catch (e) { showToast(e.response?.data?.message || 'Failed.', 'error'); }
        setConfirm(null);
      },
    });
  };

  const setRole = (userId, role, username) => {
    setConfirm({
      message: `Change "${username}" role to ${role}?`,
      action: async () => {
        try {
          await api.patch(`/admin/users/${userId}/role`, { role });
          showToast(`${username} is now ${role}.`);
          fetchUsers(userPage, userSearch);
          if (selectedUser?.id === userId) fetchUserDetail(userId);
        } catch (e) { showToast(e.response?.data?.message || 'Failed.', 'error'); }
        setConfirm(null);
      },
    });
  };

  const deleteUser = (userId, username) => {
    setConfirm({
      message: `Permanently delete "${username}"? All their scores will also be deleted. This cannot be undone.`,
      action: async () => {
        try {
          await api.delete(`/admin/users/${userId}`);
          showToast(`"${username}" deleted.`);
          fetchUsers(userPage, userSearch);
          setSelectedUser(null);
        } catch (e) { showToast(e.response?.data?.message || 'Failed.', 'error'); }
        setConfirm(null);
      },
    });
  };

  // ── Game actions ────────────────────────────────────────────────────────────
  const toggleGame = async (gameId, enabled, name) => {
    try {
      await api.patch(`/admin/games/${gameId}`, { enabled: !enabled });
      showToast(`${name} ${!enabled ? 'enabled' : 'disabled'}.`);
      fetchGames();
    } catch (e) { showToast('Failed.', 'error'); }
  };

  const clearScores = (gameId, name) => {
    setConfirm({
      message: `Clear ALL scores for "${name}"? This cannot be undone.`,
      action: async () => {
        try {
          const res = await api.delete(`/admin/games/${gameId}/scores`);
          showToast(res.data.message);
          fetchGames();
        } catch (e) { showToast('Failed.', 'error'); }
        setConfirm(null);
      },
    });
  };

  const totalPages = Math.ceil(userTotal / 15);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 px-4 md:px-6 py-8">
      {toast   && <Toast {...toast} />}
      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.action} onCancel={() => setConfirm(null)} />}
      {resetUser && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} onToast={showToast} />}

      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <span className="text-3xl">⚙️</span>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin panel</h1>
            <p className="text-gray-400 text-sm">Manage users, games, and platform settings</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-800 pb-2 flex-wrap">
          {['dashboard','users','games'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                tab === t ? 'bg-indigo-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}>
              {t === 'dashboard' ? '📊 Dashboard' : t === 'users' ? '👥 Users' : '🎮 Games'}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <div>
            {stats ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <StatCard icon="👥" label="Total users"     value={stats.totalUsers}   sub={`${stats.newUsersWeek} new this week`} />
                  <StatCard icon="✅" label="Active accounts" value={stats.activeUsers}  sub={`${stats.totalUsers - stats.activeUsers} inactive`} />
                  <StatCard icon="🎮" label="Games played"    value={stats.totalScores.toLocaleString()} sub={`${stats.playsToday} today`} />
                  <StatCard icon="🟢" label="Games enabled"   value={stats.enabledGames} sub="of 24 total" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="card col-span-2">
                    <h3 className="font-semibold text-white mb-4">Quick actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setTab('users')} className="btn-secondary py-3 text-sm text-left px-4 flex items-center gap-2">
                        <span>👥</span> Manage users
                      </button>
                      <button onClick={() => setTab('games')} className="btn-secondary py-3 text-sm text-left px-4 flex items-center gap-2">
                        <span>🎮</span> Manage games
                      </button>
                      <button onClick={() => { setTab('users'); }} className="btn-secondary py-3 text-sm text-left px-4 flex items-center gap-2">
                        <span>🔑</span> Reset a password
                      </button>
                      <button onClick={() => { setTab('users'); }} className="btn-secondary py-3 text-sm text-left px-4 flex items-center gap-2">
                        <span>🚫</span> Deactivate account
                      </button>
                    </div>
                  </div>
                  <div className="card">
                    <h3 className="font-semibold text-white mb-4">Platform highlights</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Most played game</span>
                        <span className="text-white capitalize font-medium">{stats.topGame}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Inactive users</span>
                        <span className="text-red-400 font-medium">{stats.totalUsers - stats.activeUsers}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Games disabled</span>
                        <span className="text-yellow-400 font-medium">{24 - stats.enabledGames}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">New users (7d)</span>
                        <span className="text-green-400 font-medium">+{stats.newUsersWeek}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        )}

        {/* ── USERS ── */}
        {tab === 'users' && (
          <div className="flex gap-6">
            {/* Users list */}
            <div className={`flex-1 min-w-0 ${selectedUser ? 'hidden md:block' : ''}`}>
              {/* Search */}
              <div className="flex gap-3 mb-5">
                <input type="text" placeholder="Search by name or email..."
                  value={userSearch}
                  onChange={e => { setUserSearch(e.target.value); setUserPage(1); }}
                  onKeyDown={e => e.key === 'Enter' && fetchUsers(1, userSearch)}
                  className="input-field flex-1 py-2 text-sm" />
                <button onClick={() => fetchUsers(1, userSearch)} className="btn-primary px-5 py-2 text-sm">Search</button>
                {userSearch && (
                  <button onClick={() => { setUserSearch(''); fetchUsers(1, ''); }}
                    className="btn-secondary px-4 py-2 text-sm">Clear</button>
                )}
              </div>

              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mb-3">{userTotal} users total</p>
                  <div className="space-y-2">
                    {users.map(u => (
                      <div key={u.id}
                        onClick={() => fetchUserDetail(u.id)}
                        className={`card cursor-pointer hover:border-gray-600 transition-all py-4 ${selectedUser?.id === u.id ? 'border-indigo-500/50' : ''}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: u.avatar_color || '#6366f1' }}>
                            {u.username[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-white text-sm">{u.username}</span>
                              {u.role === 'admin' && <Badge color="indigo">Admin</Badge>}
                              <Badge color={u.status === 'active' ? 'green' : 'red'}>
                                {u.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs text-gray-400">{u.games_played} games</p>
                            <p className="text-xs text-gray-500">{new Date(u.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-6">
                      <button onClick={() => { setUserPage(p => Math.max(1, p-1)); fetchUsers(userPage-1, userSearch); }}
                        disabled={userPage === 1}
                        className="btn-secondary px-4 py-2 text-sm disabled:opacity-40">← Prev</button>
                      <span className="text-gray-400 text-sm">{userPage} / {totalPages}</span>
                      <button onClick={() => { setUserPage(p => Math.min(totalPages, p+1)); fetchUsers(userPage+1, userSearch); }}
                        disabled={userPage === totalPages}
                        className="btn-secondary px-4 py-2 text-sm disabled:opacity-40">Next →</button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* User detail sidebar */}
            {selectedUser && (
              <div className="w-full md:w-80 flex-shrink-0">
                <div className="card sticky top-6">
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold text-white"
                        style={{ backgroundColor: selectedUser.avatar_color || '#6366f1' }}>
                        {selectedUser.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-white">{selectedUser.username}</p>
                        <p className="text-xs text-gray-400">{selectedUser.email}</p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedUser(null)} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
                  </div>

                  {/* Info */}
                  <div className="space-y-2 mb-5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status</span>
                      <Badge color={selectedUser.status === 'active' ? 'green' : 'red'}>{selectedUser.status}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Role</span>
                      <Badge color={selectedUser.role === 'admin' ? 'indigo' : 'gray'}>{selectedUser.role}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Joined</span>
                      <span className="text-white">{new Date(selectedUser.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Games played</span>
                      <span className="text-white">{selectedUser.gameStats?.reduce((s,g) => s + Number(g.plays), 0) || 0}</span>
                    </div>
                  </div>

                  {/* Game stats mini */}
                  {selectedUser.gameStats?.length > 0 && (
                    <div className="mb-5">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Top games</p>
                      <div className="space-y-1.5">
                        {selectedUser.gameStats.slice(0,5).map(g => (
                          <div key={g.game_name} className="flex justify-between text-xs">
                            <span className="text-gray-400 capitalize">{g.game_name}</span>
                            <span className="text-white font-medium">{Number(g.best).toLocaleString()} pts</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2 border-t border-gray-700 pt-4">
                    <button
                      onClick={() => setStatus(selectedUser.id, selectedUser.status === 'active' ? 'inactive' : 'active', selectedUser.username)}
                      className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        selectedUser.status === 'active'
                          ? 'bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 border border-yellow-500/30'
                          : 'bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/30'
                      }`}>
                      {selectedUser.status === 'active' ? '🚫 Deactivate account' : '✅ Activate account'}
                    </button>

                    <button onClick={() => setResetUser(selectedUser)}
                      className="w-full py-2.5 rounded-xl text-sm font-medium bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/30 transition-colors">
                      🔑 Reset password
                    </button>

                    <button
                      onClick={() => setRole(selectedUser.id, selectedUser.role === 'admin' ? 'user' : 'admin', selectedUser.username)}
                      className="w-full py-2.5 rounded-xl text-sm font-medium bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 border border-purple-500/30 transition-colors">
                      {selectedUser.role === 'admin' ? '👤 Remove admin role' : '⭐ Make admin'}
                    </button>

                    <button onClick={() => deleteUser(selectedUser.id, selectedUser.username)}
                      className="w-full py-2.5 rounded-xl text-sm font-medium bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 transition-colors">
                      🗑 Delete account permanently
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── GAMES ── */}
        {tab === 'games' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm text-gray-400">
                  {games.filter(g => g.enabled).length} enabled · {games.filter(g => !g.enabled).length} disabled
                </p>
              </div>
              <button onClick={fetchGames} className="btn-secondary text-sm py-2 px-4">↻ Refresh</button>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {games.map(game => (
                  <div key={game.game_id} className={`card transition-all ${!game.enabled ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-white">{game.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{game.game_id}</p>
                      </div>
                      <Badge color={game.enabled ? 'green' : 'red'}>
                        {game.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>

                    <div className="flex gap-4 text-xs text-gray-400 mb-4">
                      <span>🎮 {Number(game.total_plays).toLocaleString()} plays</span>
                      <span>🏆 {Number(game.top_score).toLocaleString()} top score</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleGame(game.game_id, game.enabled, game.name)}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                          game.enabled
                            ? 'bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 border border-yellow-500/30'
                            : 'bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/30'
                        }`}>
                        {game.enabled ? '🚫 Disable' : '✅ Enable'}
                      </button>
                      <button
                        onClick={() => clearScores(game.game_id, game.name)}
                        disabled={Number(game.total_plays) === 0}
                        className="flex-1 py-2 rounded-xl text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        🗑 Clear scores
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
