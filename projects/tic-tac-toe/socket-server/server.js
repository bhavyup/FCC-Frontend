/* ╔══════════════════════════════════════════════════════════╗
   ║  DUEL — Socket.io Server (Render deployment)           ║
   ║  Handles online PvP rooms for Tic Tac Toe              ║
   ╚══════════════════════════════════════════════════════════╝ */
'use strict';

const { createServer } = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 4000;

/* ── Allowed origins (GitHub Pages + local dev) ─────────── */
const ALLOWED_ORIGINS = [
  'https://bhavyup.github.io',
  'https://bhavyupreti.me',         // ← change to your GitHub Pages URL
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

const httpServer = createServer((req, res) => {
  // health-check endpoint for Render
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', game: 'duel' }));
});

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST']
  }
});

/* ── ROOM MANAGEMENT ─────────────────────────────────────── */
const rooms = new Map();

function genCode() {
  const c = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += c[Math.floor(Math.random() * c.length)];
  return code;
}

io.on('connection', socket => {
  console.log(`[+] ${socket.id}`);

  socket.on('create-room', cb => {
    let code;
    do { code = genCode(); } while (rooms.has(code));
    socket.join(code);
    socket.data = { room: code, num: 1 };
    rooms.set(code, { count: 1 });
    cb({ code });
  });

  socket.on('join-room', (code, cb) => {
    code = (code || '').toUpperCase().trim();
    const room = rooms.get(code);
    if (!room || room.count >= 2) {
      cb({ error: room ? 'Room is full' : 'Room not found' });
      return;
    }
    socket.join(code);
    socket.data = { room: code, num: 2 };
    room.count = 2;
    io.to(code).emit('game-start');
    cb({ ok: true });
  });

  socket.on('move', data => {
    const rc = socket.data?.room;
    if (rc) socket.to(rc).emit('move', data);
  });

  socket.on('req-rematch', () => {
    const rc = socket.data?.room;
    if (rc) socket.to(rc).emit('req-rematch');
  });

  socket.on('leave-room', () => cleanup(socket));
  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id}`);
    cleanup(socket);
  });
});

function cleanup(socket) {
  const rc = socket.data?.room;
  if (!rc) return;
  socket.to(rc).emit('opponent-left');
  socket.leave(rc);
  const room = rooms.get(rc);
  if (room) {
    room.count--;
    if (room.count <= 0) rooms.delete(rc);
  }
  socket.data = {};
}

httpServer.listen(PORT, () => {
  console.log(`DUEL socket server running on port ${PORT}`);
});
