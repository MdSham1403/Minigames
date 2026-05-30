const express        = require('express');
const pool           = require('../db/pool');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// ─── POST /api/scores  — save a game score (protected) ───────────────────────
router.post('/', authMiddleware, async (req, res) => {
  const { gameName, score, mode = 'single' } = req.body;
  if (!gameName || score === undefined)
    return res.status(400).json({ message: 'gameName and score are required.' });

  try {
    const result = await pool.query(
      `INSERT INTO scores (user_id, game_name, score, mode)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, gameName, score, mode]
    );
    res.status(201).json({ message: 'Score saved!', score: result.rows[0] });
  } catch (err) {
    console.error('Save score error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ─── GET /api/scores/leaderboard?game=snake — top 10 per game ─────────────────
// Respects leaderboard_visible: hidden users show as "Anonymous"
router.get('/leaderboard', async (req, res) => {
  const { game } = req.query;

  try {
    let query, params;

    if (game) {
      query = `
        SELECT
          CASE WHEN u.leaderboard_visible = false THEN 'Anonymous'
               ELSE u.username END                                  AS username,
          CASE WHEN u.leaderboard_visible = false THEN '#888888'
               ELSE u.avatar_color END                              AS avatar_color,
          u.leaderboard_visible,
          MAX(s.score)                                              AS best_score,
          s.game_name
        FROM scores s
        JOIN users u ON s.user_id = u.id
        WHERE s.game_name = $1
        GROUP BY u.username, u.avatar_color, u.leaderboard_visible, s.game_name
        ORDER BY best_score DESC
        LIMIT 10
      `;
      params = [game];
    } else {
      query = `
        SELECT
          CASE WHEN u.leaderboard_visible = false THEN 'Anonymous'
               ELSE u.username END                                  AS username,
          CASE WHEN u.leaderboard_visible = false THEN '#888888'
               ELSE u.avatar_color END                              AS avatar_color,
          u.leaderboard_visible,
          SUM(sub.best)                                              AS total_score
        FROM (
          SELECT user_id, game_name, MAX(score) AS best
          FROM scores GROUP BY user_id, game_name
        ) sub
        JOIN users u ON sub.user_id = u.id
        GROUP BY u.username, u.avatar_color, u.leaderboard_visible
        ORDER BY total_score DESC
        LIMIT 10
      `;
      params = [];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Leaderboard error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ─── GET /api/scores/me  — current user's scores (protected) ─────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT game_name, MAX(score) AS best_score, COUNT(*) AS games_played
       FROM scores WHERE user_id = $1
       GROUP BY game_name ORDER BY best_score DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('My scores error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ─── PATCH /api/scores/privacy — toggle leaderboard visibility (protected) ───
router.patch('/privacy', authMiddleware, async (req, res) => {
  // 🆕 Fix: Accept camelCase (leaderboardVisible) OR snake_case (leaderboard_visible)
  const leaderboardVisible = req.body.leaderboardVisible !== undefined 
    ? req.body.leaderboardVisible 
    : req.body.leaderboard_visible;

  if (typeof leaderboardVisible !== 'boolean')
    return res.status(400).json({ message: 'leaderboardVisible must be true or false.' });

  try {
    await pool.query(
      'UPDATE users SET leaderboard_visible = $1 WHERE id = $2',
      [leaderboardVisible, req.user.id]
    );
    res.json({
      success: true, // Added explicit true indicator for frontend checks
      message: leaderboardVisible
        ? 'Your username will now show on leaderboards.'
        : 'You will appear as Anonymous on leaderboards.',
      leaderboardVisible,
      leaderboard_visible: leaderboardVisible // Return both forms for frontend fallback
    });
  } catch (err) {
    console.error('Privacy update error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;