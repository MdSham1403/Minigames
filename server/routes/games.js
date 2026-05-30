const express = require('express');
const pool    = require('../db/pool');
const router  = express.Router();

// GET /api/games/config — public, no auth needed
// Returns a map of { gameId: boolean } so GameLobby knows what's enabled
router.get('/config', async (req, res) => {
  try {
    const result = await pool.query('SELECT game_id, enabled FROM games_config');
    const config = {};
    result.rows.forEach(r => { config[r.game_id] = r.enabled; });
    res.json(config);
  } catch (err) {
    // If table doesn't exist yet (pre-migration), return empty so lobby works normally
    console.error('Games config error:', err.message);
    res.json({});
  }
});

module.exports = router;
