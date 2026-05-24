// ─────────────────────────────────────────────────────────────────────────────
// Room Manager — handles all Socket.io room & game events
// Supports: create room, join, ready-up, game events, chat, disconnect
// ─────────────────────────────────────────────────────────────────────────────

const rooms = {}; // roomCode → room object

// ── Helpers ──────────────────────────────────────────────────────────────────
const genCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

const safeRoom = (roomCode) => rooms[roomCode] || null;

const removePlayer = (socketId) => {
  for (const code of Object.keys(rooms)) {
    const room = rooms[code];
    const idx = room.players.findIndex(p => p.id === socketId);
    if (idx === -1) continue;

    room.players.splice(idx, 1);

    if (room.players.length === 0) {
      delete rooms[code];
      console.log(`🗑  Room ${code} deleted (empty)`);
    } else {
      if (room.host === socketId) room.host = room.players[0].id;
      room.status = 'waiting'; // reset if game was in progress
    }
    return { code, room: rooms[code] || null };
  }
  return null;
};

// ── Setup ─────────────────────────────────────────────────────────────────────
const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Connected: ${socket.id}`);

    // ── CREATE ROOM ──────────────────────────────────────────────────────────
    socket.on('create_room', ({ gameName, mode, username }) => {
      const roomCode = genCode();
      rooms[roomCode] = {
        code: roomCode,
        gameName,
        mode,                         // 'duo' | 'multi'
        host: socket.id,
        maxPlayers: mode === 'duo' ? 2 : 6,
        players: [{ id: socket.id, username, ready: false, score: 0 }],
        status: 'waiting',            // waiting | countdown | playing | finished
        gameState: {},                // game-specific shared state
        createdAt: Date.now(),
      };
      socket.join(roomCode);
      socket.emit('room_created', { roomCode, room: rooms[roomCode] });
      console.log(`🏠 Room ${roomCode} created by ${username} [${gameName} / ${mode}]`);
    });

    // ── JOIN ROOM ────────────────────────────────────────────────────────────
    socket.on('join_room', ({ roomCode, username }) => {
      const room = safeRoom(roomCode);
      if (!room)                            { socket.emit('room_error', { message: 'Room not found. Check the code and try again.' }); return; }
      if (room.status !== 'waiting')        { socket.emit('room_error', { message: 'This game has already started.' }); return; }
      if (room.players.length >= room.maxPlayers) { socket.emit('room_error', { message: 'Room is full.' }); return; }
      if (room.players.some(p => p.id === socket.id)) return; // already in

      room.players.push({ id: socket.id, username, ready: false, score: 0 });
      socket.join(roomCode);

      socket.emit('room_joined', { room });
      io.to(roomCode).emit('room_updated', { room });
      console.log(`👤 ${username} joined room ${roomCode}`);
    });

    // ── PLAYER READY ─────────────────────────────────────────────────────────
    socket.on('player_ready', ({ roomCode }) => {
      const room = safeRoom(roomCode);
      if (!room) return;

      const player = room.players.find(p => p.id === socket.id);
      if (player) player.ready = !player.ready; // toggle

      io.to(roomCode).emit('room_updated', { room });

      // All ready? Trigger countdown
      const allReady = room.players.length >= 2 && room.players.every(p => p.ready);
      if (allReady && room.status === 'waiting') {
        room.status = 'countdown';
        io.to(roomCode).emit('room_updated', { room });

        let count = 3;
        const cd = setInterval(() => {
          io.to(roomCode).emit('countdown', { count });
          count--;
          if (count < 0) {
            clearInterval(cd);
            room.status = 'playing';
            room.gameState = { startedAt: Date.now() };
            io.to(roomCode).emit('game_start', { room });
            console.log(`🎮 Game started in room ${roomCode}`);
          }
        }, 1000);
      }
    });

    // ── GENERIC GAME EVENT RELAY (duo/multi game logic) ───────────────────────
    // Games emit { roomCode, event, data } — server relays to rest of room
    socket.on('game_event', ({ roomCode, event, data }) => {
      socket.to(roomCode).emit('game_event', { event, data, from: socket.id });
    });

    // ── SUBMIT SCORE (end of round) ───────────────────────────────────────────
    socket.on('submit_score', ({ roomCode, score }) => {
      const room = safeRoom(roomCode);
      if (!room) return;

      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.score = score;
        player.finished = true;
      }

      io.to(roomCode).emit('score_updated', { room });

      // All finished?
      const allDone = room.players.every(p => p.finished);
      if (allDone) {
        room.status = 'finished';
        const sorted = [...room.players].sort((a, b) => b.score - a.score);
        io.to(roomCode).emit('game_over', { room, rankings: sorted });
        console.log(`🏁 Game over in room ${roomCode}`);
      }
    });

    // ── CHAT MESSAGE ──────────────────────────────────────────────────────────
    socket.on('chat_message', ({ roomCode, username, message }) => {
      if (!message?.trim() || message.length > 200) return;
      io.to(roomCode).emit('chat_message', {
        username,
        message: message.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    });

    // ── LEAVE ROOM ────────────────────────────────────────────────────────────
    socket.on('leave_room', ({ roomCode }) => {
      const result = removePlayer(socket.id);
      socket.leave(roomCode);
      if (result?.room) io.to(roomCode).emit('room_updated', { room: result.room });
      socket.emit('left_room');
    });

    // ── DISCONNECT ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const result = removePlayer(socket.id);
      if (result?.code && result?.room) {
        io.to(result.code).emit('room_updated', { room: result.room });
        io.to(result.code).emit('player_disconnected', { socketId: socket.id });
      }
      console.log(`❌ Disconnected: ${socket.id}`);
    });
  });
};

module.exports = setupSocket;
