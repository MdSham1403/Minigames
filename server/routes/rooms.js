const express = require('express');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// ─── GET /api/rooms/active — list currently active rooms (public) ─────────────
// Note: rooms are in-memory in roomManager.js; this returns DB-based history
router.get('/active', async (req, res) => {
  try {
    // Return rooms created in the last 2 hours that are still open
    const result = await pool.query(`
      SELECT id, room_code, game_name, mode, status, created_at
      FROM rooms
      WHERE status IN ('waiting','playing')
        AND created_at > NOW() - INTERVAL '2 hours'
      ORDER BY created_at DESC
      LIMIT 20
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Active rooms error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ─── GET /api/rooms/:code — get a specific room ───────────────────────────────
router.get('/:code', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM rooms WHERE room_code = $1',
      [req.params.code.toUpperCase()]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Room not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get room error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ─── POST /api/rooms — create room record in DB (called by socket server) ────
router.post('/', authMiddleware, async (req, res) => {
  const { roomCode, gameName, mode } = req.body;
  if (!roomCode || !gameName || !mode) {
    return res.status(400).json({ message: 'roomCode, gameName, and mode required.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO rooms (room_code, game_name, mode, host_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (room_code) DO NOTHING
       RETURNING *`,
      [roomCode, gameName, mode, req.user.id]
    );
    res.status(201).json(result.rows[0] || { message: 'Room already exists.' });
  } catch (err) {
    console.error('Create room error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ─── PATCH /api/rooms/:code/status — update room status ──────────────────────
router.patch('/:code/status', authMiddleware, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['waiting', 'playing', 'finished'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }
  try {
    await pool.query(
      'UPDATE rooms SET status=$1 WHERE room_code=$2',
      [status, req.params.code.toUpperCase()]
    );
    res.json({ message: 'Status updated.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
