# 🎮 MiniGames Platform

A full-stack multiplayer mini-games platform with 16 playable games, real-time duo/multi modes, global leaderboards, and user profiles.

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express + Socket.io |
| Database | PostgreSQL |
| Auth | JWT + bcryptjs |
| Deployment | Vercel (frontend) + Railway (backend) + Supabase (DB) |

---

## Games (16 playable)

| Game | Category | Modes |
|---|---|---|
| 🐍 Snake | Arcade | Solo |
| 🐦 Flappy Bird | Arcade | Solo |
| 🧱 Breakout | Arcade | Solo |
| 🐹 Whack-a-Mole | Arcade | Solo |
| ⚡ Reaction Time | Arcade | Solo |
| 🧠 Memory | Puzzle | Solo, Duo |
| 🎯 2048 | Puzzle | Solo |
| 🔢 Sudoku | Puzzle | Solo |
| 🔷 15 Puzzle | Puzzle | Solo |
| 🟢 Simon Says | Puzzle | Solo |
| 🔤 Word Scramble | Brain | Solo |
| 🧮 Math Blaster | Brain | Solo |
| 🌈 Colour Match | Brain | Solo |
| ❓ Trivia | Card | Solo, Duo, Multi |
| ❌ Tic Tac Toe | Card | Solo (vs AI) |
| ✊ Rock Paper Scissors | Card | Solo (vs AI) |

---

## Local setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Git

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/minigames-platform.git
cd minigames-platform

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Set up PostgreSQL

```bash
# Create database
psql -U postgres -c "CREATE DATABASE minigames_db;"

# Run schema
psql -U postgres -d minigames_db -f server/db/schema.sql
```

### 3. Configure environment

```bash
# Copy and edit server env
cp server/.env.production server/.env
# Edit server/.env: set DB_PASSWORD and JWT_SECRET

# Client env is already set for local dev (localhost:5000)
```

### 4. Run development servers

Open two terminals:

```bash
# Terminal 1 — backend
cd server && npm run dev
# → Server running on http://localhost:5000

# Terminal 2 — frontend
cd client && npm run dev
# → App running on http://localhost:5173
```

---

## Deployment (free)

### Step 1 — Database: Supabase

1. Go to [supabase.com](https://supabase.com) → New project
2. SQL Editor → paste `server/db/schema.sql` → Run
3. Project Settings → Database → copy **Connection string (URI)**

### Step 2 — Backend: Railway

1. Go to [railway.app](https://railway.app) → New project → Deploy from GitHub
2. Select the `server/` folder as root
3. Add environment variables from `server/.env.production` (use your Supabase DB string)
4. Copy your Railway public URL (e.g. `https://minigames.up.railway.app`)

### Step 3 — Frontend: Vercel

1. Go to [vercel.com](https://vercel.com) → Import from GitHub
2. Select the `client/` folder as root
3. Add environment variables:
   - `VITE_API_URL` = `https://your-railway-url.up.railway.app/api`
   - `VITE_SOCKET_URL` = `https://your-railway-url.up.railway.app`
4. Deploy → copy your Vercel URL

### Step 4 — Update CORS

In Railway dashboard → Environment Variables:
```
CLIENT_URL=https://your-app.vercel.app
```

---

## Project structure

```
minigames-platform/
├── client/                    ← React + Vite frontend
│   ├── src/
│   │   ├── api/axios.js       ← Configured Axios instance
│   │   ├── components/        ← Navbar, GameWrapper, Room components
│   │   ├── context/           ← AuthContext (global user state)
│   │   ├── games/             ← 16 game components
│   │   ├── hooks/useSocket.js ← Socket.io singleton hook
│   │   ├── pages/             ← Home, Login, Signup, Lobby, Leaderboard, Profile
│   │   └── utils/sounds.js    ← Web Audio API sound engine
│   └── vercel.json
│
└── server/                    ← Node.js + Express backend
    ├── db/
    │   ├── pool.js            ← PostgreSQL connection pool
    │   └── schema.sql         ← DB tables: users, scores, rooms
    ├── middleware/
    │   └── authMiddleware.js  ← JWT verification
    ├── routes/
    │   ├── auth.js            ← POST /signup, /login, GET /me
    │   ├── scores.js          ← POST /, GET /leaderboard, GET /me
    │   └── rooms.js           ← Room history API
    ├── socket/
    │   └── roomManager.js     ← Socket.io: rooms, ready, game events, chat
    └── index.js               ← Server entry point
```

---

## Adding a new game

1. Create `client/src/games/YourGame.jsx` — must accept `onBack` prop
2. Add to `GAME_MAP` in `GameWrapper.jsx`
3. Add to `GAMES` array in `GameLobby.jsx`
4. Add to `GAME_META` in `Profile.jsx`
5. Add to `GAMES` array in `Leaderboard.jsx`
6. Save scores: `api.post('/scores', { gameName: 'yourgame', score, mode: 'single' })`

---

## License

MIT — build on it, share it, make it yours.
