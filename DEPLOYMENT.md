# 🎮 MiniGames Platform — Deployment Guide

Your app is ready to go live! Here's how to deploy it for free.

---

## 🏗 Architecture

```
Browser → Vercel (React frontend)
              ↕ REST + WebSocket
         Railway (Node.js + Socket.io backend)
              ↕ SQL
         Railway PostgreSQL (managed DB)
```

---

## Step 1 — Deploy the Database (Railway PostgreSQL)

1. Go to https://railway.app → Sign up with GitHub
2. Click **New Project → Provision PostgreSQL**
3. Click the database → **Connect** tab
4. Copy the **DATABASE_URL** (looks like `postgresql://user:pass@host:port/dbname`)
5. Open the **Query** tab and paste + run your `server/db/schema.sql` to create tables

---

## Step 2 — Deploy the Backend (Railway Node.js)

1. In Railway, click **New Service → GitHub Repo**
2. Select your repo → set **Root Directory** to `server`
3. Railway auto-detects Node.js and runs `npm start`
4. Go to **Variables** tab and add these environment variables:

```
PORT                = 5000
JWT_SECRET          = (generate a long random string — use https://generate-secret.vercel.app/64)
DATABASE_URL        = (paste your Railway PostgreSQL URL from Step 1)
CLIENT_URL          = (your Vercel frontend URL — add after Step 3)
NODE_ENV            = production
```

5. Go to **Settings → Networking → Generate Domain** → copy your backend URL (e.g. `https://minigames-server.up.railway.app`)

> **Important:** Update `server/db/pool.js` to use `DATABASE_URL` for production:

```js
// In server/db/pool.js — replace the pool config with:
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : new Pool({ host: process.env.DB_HOST, port: process.env.DB_PORT,
               database: process.env.DB_NAME, user: process.env.DB_USER,
               password: process.env.DB_PASSWORD });
```

---

## Step 3 — Deploy the Frontend (Vercel)

1. Go to https://vercel.com → Sign up with GitHub
2. Click **Add New Project → Import** your repo
3. Set **Root Directory** to `client`
4. Under **Environment Variables** add:

```
VITE_API_URL    = https://your-railway-backend-url.up.railway.app/api
VITE_SOCKET_URL = https://your-railway-backend-url.up.railway.app
```

5. Click **Deploy** → Vercel gives you a URL like `https://minigames-xyz.vercel.app`

6. Go back to Railway → add this Vercel URL as `CLIENT_URL`

---

## Step 4 — Test your live app

1. Open your Vercel URL
2. Sign up for an account
3. Play a game — score should save
4. Open in two browsers → create a room → test live multiplayer

---

## 🔧 Local development (quick reference)

```bash
# Terminal 1 — Backend
cd server
cp .env.example .env     # fill in your local postgres details
npm install
npm run dev              # http://localhost:5000

# Terminal 2 — Frontend
cd client
npm install
npm run dev              # http://localhost:5173
```

---

## 📁 Files to keep private (never commit)

```
server/.env
client/.env
```

Both are already in `.gitignore` ✅

---

## 🔐 Production checklist

- [ ] JWT_SECRET is a long random string (64+ chars)
- [ ] DATABASE_URL is set on Railway
- [ ] CLIENT_URL matches your Vercel domain exactly
- [ ] CORS is restricted to your Vercel domain (already done in `server/index.js`)
- [ ] PostgreSQL SSL is enabled for Railway (pool.js update above)
- [ ] `.env` files are NOT in git

---

## 💰 Cost

| Service  | Plan   | Cost |
|----------|--------|------|
| Vercel   | Hobby  | Free |
| Railway  | Hobby  | $5/month (500 hrs free on trial) |
| OpenTDB  | Public API | Free |

> Railway gives $5 free credit/month on the hobby plan — enough for a small project.

---

## 🚧 What's next (Phase 5+ ideas)

- [ ] Google OAuth login
- [ ] More games: Chess, Breakout, Word game
- [ ] Profile avatars / custom colours
- [ ] Room passwords
- [ ] Spectator mode
- [ ] Weekly tournaments
- [ ] PWA (installable on mobile)
