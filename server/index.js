require('dotenv').config();
const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const cors    = require('cors');

// Route Imports
const authRoutes   = require('./routes/auth');
const scoresRoutes = require('./routes/scores');
const roomsRoutes  = require('./routes/rooms');
const adminRoutes  = require('./routes/admin');
const gamesRoutes  = require('./routes/games');
const setupSocket  = require('./socket/roomManager');

const app        = express();
const httpServer = http.createServer(app);

// ─── Auto-Switching CORS Origin Helper ────────────────────────────────────────
const getCleanOrigin = () => {
  // If CLIENT_URL exists (Production), use it. Otherwise, use localhost (Development).
  const url = process.env.CLIENT_URL || 'http://localhost:5173';
  return url.replace(/\/$/, ''); // Safely strips any accidental trailing slash
};

const allowedOrigin = getCleanOrigin();

// ─── Socket.io Setup ──────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: { 
    origin: allowedOrigin, 
    methods: ['GET', 'POST'],
    credentials: true 
  },
});

// ─── Express Middleware ───────────────────────────────────────────────────────
app.use(cors({ 
  origin: allowedOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

app.use(express.json());

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',   authRoutes);
app.use('/api/scores', scoresRoutes);
app.use('/api/rooms',  roomsRoutes);
app.use('/api/admin',  adminRoutes);   // Protected by adminMiddleware inside
app.use('/api/games',  gamesRoutes);   // Public games configurations

// Health Check Endpoint
app.get('/api/health', (req, res) => res.json({ status: 'ok', message: '🎮 MiniGames server running!' }));

// Initialize WebSockets
setupSocket(io);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} → Origin: ${allowedOrigin}`));