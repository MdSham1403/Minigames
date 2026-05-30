-- ─────────────────────────────────────────────────────────────────────────────
-- Admin system migration
-- Run this in Supabase SQL editor or: psql -U postgres -d minigames_db -f admin_migration.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add role column to users (user | admin)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';

-- 2. Add status column to users (active | inactive)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

-- 3. Create games_config table — one row per game, controls enabled/disabled
CREATE TABLE IF NOT EXISTS games_config (
  game_id     VARCHAR(50) PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- 4. Seed all 24 games as enabled (safe to re-run — ON CONFLICT does nothing)
INSERT INTO games_config (game_id, name) VALUES
  ('snake',        'Snake'),
  ('flappy',       'Flappy Bird'),
  ('breakout',     'Breakout'),
  ('whackamole',   'Whack-a-Mole'),
  ('reaction',     'Reaction Time'),
  ('tetris',       'Tetris'),
  ('memory',       'Memory'),
  ('2048',         '2048'),
  ('sudoku',       'Sudoku'),
  ('numberpuzzle', '15 Puzzle'),
  ('simon',        'Simon Says'),
  ('minesweeper',  'Minesweeper'),
  ('wordscramble', 'Word Scramble'),
  ('mathblaster',  'Math Blaster'),
  ('colormatch',   'Colour Match'),
  ('hangman',      'Hangman'),
  ('trivia',       'Trivia'),
  ('tictactoe',    'Tic Tac Toe'),
  ('rps',          'Rock Paper Scissors'),
  ('connect4',     'Connect Four'),
  ('chess',        'Chess'),
  ('ludo',         'Ludo'),
  ('uno',          'UNO'),
  ('battleship',   'Battleship')
ON CONFLICT (game_id) DO NOTHING;

-- 5. Make yourself admin — replace with your actual email
-- UPDATE users SET role = 'admin' WHERE email = 'your@email.com';

-- ─── Additional migration (leaderboard privacy) ───────────────────────────────
-- Add leaderboard_visible to users (true = show username, false = show as Anonymous)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS leaderboard_visible BOOLEAN NOT NULL DEFAULT true;
