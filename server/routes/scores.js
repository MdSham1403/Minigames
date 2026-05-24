const express = require('express');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// ─── POST /api/scores  — save a game score (protected) ───────────────────────
router.post('/', authMiddleware, async (req, res) => {
  const { gameName, score, mode = 'single' } = req.body;

  if (!gameName || score === undefined) {
    return res.status(400).json({ message: 'gameName and score are required.' });
  }

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

// ─── GET /api/scores/leaderboard?game=snake  — top 10 per game ───────────────
router.get('/leaderboard', async (req, res) => {
  const { game } = req.query;

  try {
    let query, params;

    if (game) {
      query = `
        SELECT u.username, u.avatar_color, MAX(s.score) as best_score, s.game_name
        FROM scores s
        JOIN users u ON s.user_id = u.id
        WHERE s.game_name = $1
        GROUP BY u.username, u.avatar_color, s.game_name
        ORDER BY best_score DESC
        LIMIT 10
      `;
      params = [game];
    } else {
      // Overall leaderboard — sum of best scores across all games
      query = `
        SELECT u.username, u.avatar_color, SUM(sub.best) as total_score
        FROM (
          SELECT user_id, game_name, MAX(score) as best
          FROM scores GROUP BY user_id, game_name
        ) sub
        JOIN users u ON sub.user_id = u.id
        GROUP BY u.username, u.avatar_color
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
      `SELECT game_name, MAX(score) as best_score, COUNT(*) as games_played
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

module.exports = router;
