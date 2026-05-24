-- Run this file in psql or pgAdmin to set up your database
-- Command: psql -U postgres -d minigames_db -f schema.sql

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_color VARCHAR(20) DEFAULT '#6366f1',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Scores table — one row per game session
CREATE TABLE IF NOT EXISTS scores (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  game_name VARCHAR(50) NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  mode VARCHAR(20) DEFAULT 'single',   -- single | duo | multi
  played_at TIMESTAMP DEFAULT NOW()
);

-- Rooms table — for duo and multiplayer sessions
CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  room_code VARCHAR(10) UNIQUE NOT NULL,
  game_name VARCHAR(50) NOT NULL,
  mode VARCHAR(20) DEFAULT 'duo',
  host_id INTEGER REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'waiting', -- waiting | playing | finished
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast leaderboard queries
CREATE INDEX IF NOT EXISTS idx_scores_game ON scores(game_name);
CREATE INDEX IF NOT EXISTS idx_scores_user ON scores(user_id);
