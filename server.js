const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

const projects = [
  'random-quote-machine',
  'markdown-previewer',
  'drum-machine',
  'javascript-calculator',
  'pomodoro-clock',
  'local-weather',
  'twitch-tv',
  'wikipedia-viewer',
  'tic-tac-toe'
];

projects.forEach(project => {
  app.use(`/${project}`, express.static(path.join(__dirname, 'projects', project, 'public')));
});

app.use(express.static(path.join(__dirname, 'dashboard', 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard', 'public', 'index.html'));
});

/* ── SOCKET.IO — Tic Tac Toe Rooms ──────────────────────── */
const rooms = new Map();

function genCode() {
  const c = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += c[Math.floor(Math.random() * c.length)];
  return code;
}

io.on('connection', socket => {

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
  socket.on('disconnect', () => cleanup(socket));
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

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});