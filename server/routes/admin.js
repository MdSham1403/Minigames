const express        = require('express');
const bcrypt         = require('bcryptjs');
const pool           = require('../db/pool');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

// All routes in this file are protected by adminMiddleware
router.use(adminMiddleware);

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [users, scores, active, games] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM scores'),
      pool.query("SELECT COUNT(*) FROM users WHERE status = 'active'"),
      pool.query('SELECT COUNT(*) FROM games_config WHERE enabled = true'),
    ]);

    // New users in last 7 days
    const newUsers = await pool.query(
      "SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days'"
    );
    // Games played today
    const today = await pool.query(
      "SELECT COUNT(*) FROM scores WHERE played_at > NOW() - INTERVAL '24 hours'"
    );
    // Most popular game
    const topGame = await pool.query(
      'SELECT game_name, COUNT(*) as plays FROM scores GROUP BY game_name ORDER BY plays DESC LIMIT 1'
    );

    res.json({
      totalUsers:    parseInt(users.rows[0].count),
      totalScores:   parseInt(scores.rows[0].count),
      activeUsers:   parseInt(active.rows[0].count),
      enabledGames:  parseInt(games.rows[0].count),
      newUsersWeek:  parseInt(newUsers.rows[0].count),
      playsToday:    parseInt(today.rows[0].count),
      topGame:       topGame.rows[0]?.game_name || 'none',
    });
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/users?search=&page=1&limit=20
router.get('/users', async (req, res) => {
  const { search = '', page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const where  = search ? `WHERE u.username ILIKE $3 OR u.email ILIKE $3` : '';
    const params = search ? [limit, offset, `%${search}%`] : [limit, offset];

    const result = await pool.query(`
      SELECT
        u.id, u.username, u.email, u.role, u.status,
        u.avatar_color, u.created_at,
        COUNT(s.id) AS games_played,
        COALESCE(SUM(s.score), 0) AS total_score
      FROM users u
      LEFT JOIN scores s ON s.user_id = u.id
      ${where}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2
    `, params);

    const countResult = await pool.query(
      search ? `SELECT COUNT(*) FROM users WHERE username ILIKE $1 OR email ILIKE $1` : 'SELECT COUNT(*) FROM users',
      search ? [`%${search}%`] : []
    );

    res.json({
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
      page:  parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('List users error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/admin/users/:id  — single user detail
router.get('/users/:id', async (req, res) => {
  try {
    const user = await pool.query(
      'SELECT id, username, email, role, status, avatar_color, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (!user.rows.length)
      return res.status(404).json({ message: 'User not found.' });

    const scores = await pool.query(
      'SELECT game_name, MAX(score) as best, COUNT(*) as plays FROM scores WHERE user_id=$1 GROUP BY game_name ORDER BY best DESC',
      [req.params.id]
    );
    res.json({ ...user.rows[0], gameStats: scores.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// PATCH /api/admin/users/:id/status  — activate or deactivate
router.patch('/users/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['active','inactive'].includes(status))
    return res.status(400).json({ message: 'Status must be active or inactive.' });

  // Prevent admin from deactivating themselves
  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ message: 'You cannot change your own account status.' });

  try {
    const result = await pool.query(
      'UPDATE users SET status=$1 WHERE id=$2 RETURNING id, username, status',
      [status, req.params.id]
    );
    if (!result.rows.length)
      return res.status(404).json({ message: 'User not found.' });
    res.json({ message: `User ${status === 'active' ? 'activated' : 'deactivated'} successfully.`, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// PATCH /api/admin/users/:id/role  — promote / demote
router.patch('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!['user','admin'].includes(role))
    return res.status(400).json({ message: 'Role must be user or admin.' });

  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ message: 'You cannot change your own role.' });

  try {
    const result = await pool.query(
      'UPDATE users SET role=$1 WHERE id=$2 RETURNING id, username, role',
      [role, req.params.id]
    );
    if (!result.rows.length)
      return res.status(404).json({ message: 'User not found.' });
    res.json({ message: `User role updated to ${role}.`, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/admin/users/:id/reset-password
router.post('/users/:id/reset-password', async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ message: 'New password must be at least 6 characters.' });

  try {
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(newPassword, salt);
    const result = await pool.query(
      'UPDATE users SET password_hash=$1 WHERE id=$2 RETURNING id, username',
      [hash, req.params.id]
    );
    if (!result.rows.length)
      return res.status(404).json({ message: 'User not found.' });
    res.json({ message: `Password reset for ${result.rows[0].username}.` });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/admin/users/:id  — hard delete (scores cascade)
router.delete('/users/:id', async (req, res) => {
  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ message: 'You cannot delete your own account.' });

  try {
    const result = await pool.query(
      'DELETE FROM users WHERE id=$1 RETURNING id, username',
      [req.params.id]
    );
    if (!result.rows.length)
      return res.status(404).json({ message: 'User not found.' });
    res.json({ message: `User "${result.rows[0].username}" deleted permanently.` });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GAME MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/games
router.get('/games', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT g.game_id, g.name, g.enabled, g.updated_at,
             COUNT(s.id) AS total_plays,
             COALESCE(MAX(s.score), 0) AS top_score
      FROM games_config g
      LEFT JOIN scores s ON s.game_name = g.game_id
      GROUP BY g.game_id, g.name, g.enabled, g.updated_at
      ORDER BY total_plays DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// PATCH /api/admin/games/:gameId  — enable or disable
router.patch('/games/:gameId', async (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean')
    return res.status(400).json({ message: 'enabled must be true or false.' });

  try {
    const result = await pool.query(
      'UPDATE games_config SET enabled=$1, updated_at=NOW() WHERE game_id=$2 RETURNING *',
      [enabled, req.params.gameId]
    );
    if (!result.rows.length)
      return res.status(404).json({ message: 'Game not found.' });
    res.json({ message: `${result.rows[0].name} ${enabled ? 'enabled' : 'disabled'}.`, game: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/admin/games/:gameId/scores  — clear leaderboard for one game
router.delete('/games/:gameId/scores', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM scores WHERE game_name=$1',
      [req.params.gameId]
    );
    res.json({ message: `Cleared ${result.rowCount} scores for ${req.params.gameId}.` });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
