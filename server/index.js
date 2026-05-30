require('dotenv').config();
const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const cors    = require('cors');

const authRoutes   = require('./routes/auth');
const scoresRoutes = require('./routes/scores');
const roomsRoutes  = require('./routes/rooms');
const adminRoutes  = require('./routes/admin');
const gamesRoutes  = require('./routes/games');
const setupSocket  = require('./socket/roomManager');

const app        = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', methods: ['GET','POST'] },
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/auth',   authRoutes);
app.use('/api/scores', scoresRoutes);
app.use('/api/rooms',  roomsRoutes);
app.use('/api/admin',  adminRoutes);   // all protected by adminMiddleware inside
app.use('/api/games',  gamesRoutes);   // public games config

app.get('/api/health', (req, res) => res.json({ status:'ok', message:'🎮 MiniGames server running!' }));

setupSocket(io);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`🚀 Server → http://localhost:${PORT}`));
