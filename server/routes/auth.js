const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const pool     = require('../db/pool');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// ── Generate JWT — now includes role ─────────────────────────────────────────
const generateToken = (user) =>
  jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role || 'user' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ message: 'All fields are required.' });
  if (password.length < 6)
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  if (username.length < 3)
    return res.status(400).json({ message: 'Username must be at least 3 characters.' });

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    if (existing.rows.length > 0)
      return res.status(409).json({ message: 'Email or username already taken.' });

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    const colors = ['#6366f1','#ec4899','#14b8a6','#f97316','#8b5cf6','#06b6d4'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, avatar_color)
       VALUES ($1,$2,$3,$4) RETURNING id, username, email, avatar_color, role`,
      [username, email, passwordHash, avatarColor]
    );
    const user  = result.rows[0];
    const token = generateToken(user);

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: { id: user.id, username: user.username, email: user.email, avatarColor: user.avatar_color, role: user.role },
    });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password are required.' });

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows.length)
      return res.status(401).json({ message: 'Invalid email or password.' });

    const user    = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid email or password.' });

    // Block deactivated accounts
    if (user.status === 'inactive')
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact support.' });

    const token = generateToken(user);
    res.json({
      message: 'Login successful!',
      token,
      user: { id: user.id, username: user.username, email: user.email, avatarColor: user.avatar_color, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, avatar_color, role, status, leaderboard_visible, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows.length)
      return res.status(404).json({ message: 'User not found.' });
    const u = result.rows[0];
    res.json({ id: u.id, username: u.username, email: u.email, avatarColor: u.avatar_color, role: u.role, status: u.status, leaderboardVisible: u.leaderboard_visible, createdAt: u.created_at });
  } catch (err) {
    console.error('Get user error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── PUT /api/auth/privacy ────────────────────────────────────────────────────
// 🆕 Added: Updates ONLY leaderboard visibility safely
router.put('/privacy', authMiddleware, async (req, res) => {
  const { leaderboardVisible } = req.body;

  if (typeof leaderboardVisible !== 'boolean') {
    return res.status(400).json({ message: 'Invalid visibility value.' });
  }

  try {
    const result = await pool.query(
      'UPDATE users SET leaderboard_visible = $1 WHERE id = $2 RETURNING leaderboard_visible',
      [leaderboardVisible, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({
      message: 'Privacy settings updated successfully!',
      leaderboardVisible: result.rows[0].leaderboard_visible,
    });
  } catch (err) {
    console.error('Privacy update error:', err.message);
    res.status(500).json({ message: 'Server error. Failed to save settings.' });
  }
});

module.exports = router;