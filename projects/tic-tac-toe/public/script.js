/* ╔══════════════════════════════════════════════════════════╗
   ║  DUEL — Tic Tac Toe · script.js                       ║
   ║  3 modes: CPU / Local / Online (Socket.io)             ║
   ║  Minimax AI · SVG draw animations · dual accent        ║
   ╚══════════════════════════════════════════════════════════╝ */
'use strict';

(function () {

  /* ── CONSTANTS ──────────────────────────────────────────── */
  const WIN_COMBOS = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6]
  ];

  const WIN_LINES = {
    '0,1,2': [8, 16.6, 92, 16.6],
    '3,4,5': [8, 50,   92, 50],
    '6,7,8': [8, 83.3, 92, 83.3],
    '0,3,6': [16.6, 8, 16.6, 92],
    '1,4,7': [50,   8, 50,   92],
    '2,5,8': [83.3, 8, 83.3, 92],
    '0,4,8': [8,  8,  92, 92],
    '2,4,6': [92, 8,  8,  92]
  };

  const POS_NAMES = ['TL','TC','TR','ML','MC','MR','BL','BC','BR'];
  const AUTO_RESET_MS = 2200;

  /* ── DOM REFS ───────────────────────────────────────────── */
  const $ = id => document.getElementById(id);

  const $app        = $('app');
  const $status     = $('status-text');
  const $winStroke  = $('win-stroke');

  // sidebar
  const $modeBtns   = $('mode-btns');
  const $roomPanel  = $('room-panel');
  const $roomActs   = $('room-actions');
  const $roomActive = $('room-active');
  const $createBtn  = $('create-room-btn');
  const $joinBtn    = $('join-room-btn');
  const $codeInput  = $('room-code-input');
  const $codeVal    = $('room-code-val');
  const $copyBtn    = $('copy-code-btn');
  const $roomStatus = $('room-status');
  const $leaveBtn   = $('leave-room-btn');

  const $p1Name  = $('p1-name');
  const $p1Mark  = $('p1-mark');
  const $p1Score = $('p1-score');
  const $p2Name  = $('p2-name');
  const $p2Mark  = $('p2-mark');
  const $p2Score = $('p2-score');
  const $drawsV  = $('draws-val');

  const $moveLog  = $('move-log');
  const $logEmpty = $('log-empty');

  // arena
  const $pickScr  = $('pick-screen');
  const $pickX    = $('pick-x');
  const $pickO    = $('pick-o');
  const $boardWrap= $('board-wrap');
  const $board    = $('board');
  const $newGame  = $('new-game-btn');
  const $resetBtn = $('reset-btn');

  const cells = Array.from(document.querySelectorAll('.cell'));

  /* ── STATE ──────────────────────────────────────────────── */
  let mode       = null;   // 'cpu' | 'local' | 'online'
  let myMark     = 'X';
  let oppMark    = 'O';
  let board      = Array(9).fill(null);
  let turn       = 'X';
  let gameOver   = false;
  let locked     = false;
  let moveCount  = 0;
  let scores     = { p1: 0, p2: 0, draws: 0 };
  let resetTimer = null;

  // online
  let socket     = null;
  let roomCode   = null;
  let isHost     = false;

  /* ══════════════════════════════════════════════════════════
     MODE SWITCHING
     ══════════════════════════════════════════════════════════ */
  function setMode(m) {
    if (mode === m) return;

    // clean up previous mode
    if (mode === 'online') leaveRoom();
    if (resetTimer) clearTimeout(resetTimer);

    mode = m;
    $app.dataset.mode = m;

    // sidebar: highlight active btn
    $modeBtns.querySelectorAll('.mode-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === m);
    });

    // room panel visibility
    $roomPanel.style.display = m === 'online' ? '' : 'none';

    // reset scores
    resetScores();
    clearLog();
    resetBoard();

    // configure arena per mode
    switch (m) {
      case 'cpu':
        $pickScr.style.display  = '';
        $boardWrap.style.display = 'none';
        $p1Name.textContent = 'You';
        $p2Name.textContent = 'CPU';
        setStatus('Choose your mark', '');
        break;

      case 'local':
        $pickScr.style.display  = 'none';
        $boardWrap.style.display = '';
        myMark  = 'X';
        oppMark = 'O';
        updateMarkLabels();
        $p1Name.textContent = 'Player 1';
        $p2Name.textContent = 'Player 2';
        startLocalGame();
        break;

      case 'online':
        $pickScr.style.display  = 'none';
        $boardWrap.style.display = 'none';
        $p1Name.textContent = 'You';
        $p2Name.textContent = 'Opponent';
        connectSocket();
        setStatus('Create or join a room', '');
        break;
    }
  }

  $modeBtns.addEventListener('click', e => {
    const btn = e.target.closest('.mode-btn');
    if (btn) setMode(btn.dataset.mode);
  });

  /* ══════════════════════════════════════════════════════════
     CPU MODE
     ══════════════════════════════════════════════════════════ */
  $pickX.addEventListener('click', () => startCPUGame('X'));
  $pickO.addEventListener('click', () => startCPUGame('O'));

  function startCPUGame(mark) {
    myMark  = mark;
    oppMark = mark === 'X' ? 'O' : 'X';
    updateMarkLabels();

    $pickScr.style.display  = 'none';
    $boardWrap.style.display = '';

    resetBoard();
    clearLog();
    setStatus('Your turn', mark === 'X' ? 'x-turn' : '');

    if (myMark === 'O') {
      locked = true;
      setStatus('CPU is thinking...', '');
      setTimeout(() => aiMove(), 450);
    }
  }

  function aiMove() {
    if (gameOver) { locked = false; return; }

    const idx = bestMove();
    if (idx === -1) { locked = false; return; }

    makeMove(idx, oppMark);
    locked = false;

    if (!gameOver) {
      setStatus('Your turn', turn === 'X' ? 'x-turn' : 'o-turn');
    }
  }

  function bestMove() {
    const empty = [];
    for (let i = 0; i < 9; i++) { if (!board[i]) empty.push(i); }
    if (!empty.length) return -1;

    let best = -Infinity;
    let move = empty[0];

    for (const i of empty) {
      board[i] = oppMark;
      const s = minimax(0, false, -Infinity, Infinity);
      board[i] = null;
      if (s > best) { best = s; move = i; }
    }
    return move;
  }

  function minimax(depth, isMax, alpha, beta) {
    if (hasWin(oppMark)) return 10 - depth;
    if (hasWin(myMark))  return depth - 10;
    if (board.every(c => c !== null)) return 0;

    if (isMax) {
      let best = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i]) continue;
        board[i] = oppMark;
        best = Math.max(best, minimax(depth + 1, false, alpha, beta));
        board[i] = null;
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i]) continue;
        board[i] = myMark;
        best = Math.min(best, minimax(depth + 1, true, alpha, beta));
        board[i] = null;
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
      return best;
    }
  }

  /* ══════════════════════════════════════════════════════════
     LOCAL MODE
     ══════════════════════════════════════════════════════════ */
  function startLocalGame() {
    resetBoard();
    clearLog();
    gameOver = false;
    locked   = false;
    setStatus('Player 1 — X\'s turn', 'x-turn');
  }

  /* ══════════════════════════════════════════════════════════
     ONLINE MODE (Socket.io)
     ══════════════════════════════════════════════════════════ */

  // Local dev → same origin; GitHub Pages → Render server
  const SOCKET_URL = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? undefined                                              // same-origin (local Express)
    : 'https://YOUR_APP_NAME.onrender.com';                  // ← replace after Render deploy

  function connectSocket() {
    if (socket) return;

    if (typeof io === 'undefined') {
      setStatus('Online mode requires a server', '');
      return;
    }

    if (SOCKET_URL && SOCKET_URL.includes('YOUR_APP_NAME')) {
      setStatus('Online server not configured yet', '');
      return;
    }

    try { socket = io(SOCKET_URL || undefined); } catch (_) {
      setStatus('Could not connect to server', '');
      return;
    }

    socket.on('game-start', () => {
      $roomStatus.textContent = 'Opponent connected!';
      $roomStatus.classList.add('connected');
      $boardWrap.style.display = '';

      resetBoard();
      clearLog();
      gameOver = false;

      myMark  = isHost ? 'X' : 'O';
      oppMark = isHost ? 'O' : 'X';
      updateMarkLabels();

      if (isHost) {
        locked = false;
        setStatus('Your turn — X', 'x-turn');
      } else {
        locked = true;
        setStatus('Opponent\'s turn — X', 'x-turn');
      }
    });

    socket.on('move', ({ index }) => {
      if (gameOver) return;
      makeMove(index, oppMark);

      if (!gameOver) {
        locked = false;
        setStatus('Your turn — ' + myMark, myMark === 'X' ? 'x-turn' : 'o-turn');
      }
    });

    socket.on('req-rematch', () => {
      // opponent wants rematch — auto-accept
      resetBoard();
      clearLog();
      gameOver = false;

      // swap who goes first? keep same: host=X, joiner=O
      if (isHost) {
        locked = false;
        setStatus('Your turn — X', 'x-turn');
      } else {
        locked = true;
        setStatus('Opponent\'s turn — X', 'x-turn');
      }
    });

    socket.on('opponent-left', () => {
      setStatus('Opponent left the room', '');
      locked = true;
      gameOver = true;
      $boardWrap.style.display = 'none';
      showRoomActions();
      roomCode = null;
    });
  }

  // create room
  $createBtn.addEventListener('click', () => {
    if (!socket) connectSocket();

    socket.emit('create-room', (res) => {
      if (res.code) {
        roomCode = res.code;
        isHost   = true;
        showRoomActive(res.code);
        setStatus('Waiting for opponent...', '');
      }
    });
  });

  // join room
  $joinBtn.addEventListener('click', () => {
    const code = $codeInput.value.trim().toUpperCase();
    if (!code || code.length < 3) return;
    if (!socket) connectSocket();

    socket.emit('join-room', code, (res) => {
      if (res.error) {
        $codeInput.style.borderColor = '#e8493f';
        setTimeout(() => { $codeInput.style.borderColor = ''; }, 1500);
        return;
      }
      roomCode = code;
      isHost   = false;
      showRoomActive(code);
      setStatus('Joining room...', '');
    });
  });

  $codeInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') $joinBtn.click();
  });

  // copy room code
  $copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(roomCode || '').then(() => {
      $copyBtn.classList.add('copied');
      setTimeout(() => $copyBtn.classList.remove('copied'), 1200);
    });
  });

  // leave room
  $leaveBtn.addEventListener('click', leaveRoom);

  function leaveRoom() {
    if (socket && roomCode) {
      socket.emit('leave-room');
    }
    roomCode = null;
    isHost   = false;
    gameOver = true;
    locked   = true;
    $boardWrap.style.display = 'none';
    showRoomActions();
    setStatus('Create or join a room', '');
  }

  function showRoomActive(code) {
    $roomActs.style.display   = 'none';
    $roomActive.style.display = '';
    $codeVal.textContent      = code;
    $roomStatus.textContent   = 'Waiting for opponent...';
    $roomStatus.classList.remove('connected');
  }

  function showRoomActions() {
    $roomActs.style.display   = '';
    $roomActive.style.display = 'none';
    $codeInput.value          = '';
    $roomStatus.classList.remove('connected');
  }

  /* ══════════════════════════════════════════════════════════
     BOARD CLICK (shared across modes)
     ══════════════════════════════════════════════════════════ */
  $board.addEventListener('click', e => {
    if (gameOver || locked) return;

    const cell = e.target.closest('.cell');
    if (!cell || cell.classList.contains('taken')) return;

    const idx = Number(cell.dataset.i);

    switch (mode) {
      case 'cpu':
        makeMove(idx, myMark);
        if (!gameOver) {
          locked = true;
          setStatus('CPU is thinking...', '');
          setTimeout(() => aiMove(), 380);
        }
        break;

      case 'local':
        makeMove(idx, turn);
        if (!gameOver) {
          const who = turn === 'X' ? 'Player 1' : 'Player 2';
          setStatus(who + ' — ' + turn + '\'s turn', turn === 'X' ? 'x-turn' : 'o-turn');
        }
        break;

      case 'online':
        if (turn !== myMark) return; // not your turn
        makeMove(idx, myMark);
        socket.emit('move', { index: idx });
        if (!gameOver) {
          locked = true;
          setStatus('Opponent\'s turn — ' + oppMark, oppMark === 'X' ? 'x-turn' : 'o-turn');
        }
        break;
    }
  });

  /* ══════════════════════════════════════════════════════════
     CORE ENGINE
     ══════════════════════════════════════════════════════════ */
  function makeMove(idx, mark) {
    board[idx] = mark;
    moveCount++;
    turn = mark === 'X' ? 'O' : 'X';
    $app.dataset.turn = turn;

    const cell = cells[idx];
    cell.classList.add('taken');
    drawMark(cell, mark);

    // move log
    addLogEntry(moveCount, mark, idx);

    // check outcome
    const winCombo = checkWin(mark);
    if (winCombo) {
      endGame(mark, winCombo);
      return;
    }
    if (board.every(c => c !== null)) {
      endGame(null, null);
    }
  }

  function drawMark(cell, mark) {
    const inner = cell.querySelector('.cell-inner');
    if (mark === 'X') {
      inner.innerHTML = `
        <svg class="mark-x" viewBox="0 0 60 60">
          <line x1="14" y1="14" x2="46" y2="46"/>
          <line x1="46" y1="14" x2="14" y2="46"/>
        </svg>`;
    } else {
      inner.innerHTML = `
        <svg class="mark-o" viewBox="0 0 60 60">
          <circle cx="30" cy="30" r="18"/>
        </svg>`;
    }
  }

  function checkWin(mark) {
    for (const c of WIN_COMBOS) {
      if (c.every(i => board[i] === mark)) return c;
    }
    return null;
  }

  function hasWin(mark) {
    return WIN_COMBOS.some(c => c.every(i => board[i] === mark));
  }

  /* ── END GAME ───────────────────────────────────────────── */
  function endGame(winner, combo) {
    gameOver = true;
    locked   = true;

    if (winner) {
      const cls = winner === 'X' ? 'win-x' : 'win-o';
      combo.forEach(i => cells[i].classList.add('win-cell', cls));
      drawWinLine(combo, winner);

      const isP1Win = (mode === 'cpu' && winner === myMark) ||
                      (mode === 'local' && winner === 'X') ||
                      (mode === 'online' && winner === myMark);

      if (isP1Win) {
        scores.p1++;
        $p1Score.textContent = scores.p1;
      } else {
        scores.p2++;
        $p2Score.textContent = scores.p2;
      }

      // status text
      if (mode === 'cpu') {
        setStatus(winner === myMark ? 'You win!' : 'CPU wins', winner === 'X' ? 'x-win' : 'o-win');
      } else if (mode === 'local') {
        const who = winner === 'X' ? 'Player 1' : 'Player 2';
        setStatus(who + ' wins!', winner === 'X' ? 'x-win' : 'o-win');
      } else {
        setStatus(winner === myMark ? 'You win!' : 'You lose', winner === 'X' ? 'x-win' : 'o-win');
      }
    } else {
      scores.draws++;
      $drawsV.textContent = scores.draws;
      setStatus('Draw', '');
    }

    // auto-restart after delay
    resetTimer = setTimeout(() => autoRestart(), AUTO_RESET_MS);
  }

  function autoRestart() {
    if (mode === 'cpu') {
      resetBoard();
      clearLog();
      gameOver = false;
      locked   = false;
      turn     = 'X';
      $app.dataset.turn = turn;

      if (myMark === 'O') {
        locked = true;
        setStatus('CPU is thinking...', '');
        setTimeout(() => aiMove(), 450);
      } else {
        setStatus('Your turn', 'x-turn');
      }
    } else if (mode === 'local') {
      startLocalGame();
    } else if (mode === 'online' && roomCode) {
      socket.emit('req-rematch');
      resetBoard();
      clearLog();
      gameOver = false;

      if (isHost) {
        locked = false;
        setStatus('Your turn — X', 'x-turn');
      } else {
        locked = true;
        setStatus('Opponent\'s turn — X', 'x-turn');
      }
    }
  }

  /* ── WIN LINE ANIMATION ─────────────────────────────────── */
  function drawWinLine(combo, winner) {
    const ep = WIN_LINES[combo.join(',')];
    if (!ep) return;

    $winStroke.setAttribute('x1', (ep[0] / 100) * 300);
    $winStroke.setAttribute('y1', (ep[1] / 100) * 300);
    $winStroke.setAttribute('x2', (ep[2] / 100) * 300);
    $winStroke.setAttribute('y2', (ep[3] / 100) * 300);

    const root = getComputedStyle(document.documentElement);
    $winStroke.style.stroke = winner === 'X'
      ? root.getPropertyValue('--x').trim()
      : root.getPropertyValue('--o').trim();

    $winStroke.classList.remove('animate');
    void $winStroke.offsetWidth;
    $winStroke.classList.add('animate');
  }

  /* ── RESET BOARD ────────────────────────────────────────── */
  function resetBoard() {
    board     = Array(9).fill(null);
    turn      = 'X';
    moveCount = 0;
    gameOver  = false;
    locked    = false;

    cells.forEach(c => {
      c.classList.remove('taken', 'win-cell', 'win-x', 'win-o');
      c.querySelector('.cell-inner').innerHTML = '';
    });

    $winStroke.classList.remove('animate');
    $winStroke.setAttribute('opacity', '0');
    setTimeout(() => $winStroke.setAttribute('opacity', '1'), 50);

    $app.dataset.turn = turn;
  }

  /* ── SCOREBOARD HELPERS ─────────────────────────────────── */
  function updateMarkLabels() {
    const p1m = (mode === 'local') ? 'X' : myMark;
    const p2m = (mode === 'local') ? 'O' : oppMark;
    $p1Mark.textContent = p1m;
    $p2Mark.textContent = p2m;
    $p1Mark.className = 'sc-mark sc-mark-' + p1m.toLowerCase();
    $p2Mark.className = 'sc-mark sc-mark-' + p2m.toLowerCase();
  }

  function resetScores() {
    scores = { p1: 0, p2: 0, draws: 0 };
    $p1Score.textContent = '0';
    $p2Score.textContent = '0';
    $drawsV.textContent  = '0';
  }

  /* ── MOVE LOG ───────────────────────────────────────────── */
  function addLogEntry(num, mark, idx) {
    if ($logEmpty) $logEmpty.style.display = 'none';

    const el = document.createElement('div');
    el.className = 'log-entry';
    el.innerHTML =
      '<span class="log-num">' + num + '</span>' +
      '<span class="log-mark log-mark-' + mark.toLowerCase() + '">' + mark + '</span>' +
      '<span class="log-pos">' + POS_NAMES[idx] + '</span>';

    $moveLog.appendChild(el);
    $moveLog.scrollTop = $moveLog.scrollHeight;
  }

  function clearLog() {
    $moveLog.querySelectorAll('.log-entry').forEach(e => e.remove());
    if ($logEmpty) $logEmpty.style.display = '';
  }

  /* ── STATUS HELPER ──────────────────────────────────────── */
  function setStatus(text, cls) {
    $status.textContent = text;
    $status.className   = 'status-text' + (cls ? ' ' + cls : '');
  }

  /* ── CONTROLS ───────────────────────────────────────────── */
  $newGame.addEventListener('click', () => {
    if (resetTimer) clearTimeout(resetTimer);

    if (mode === 'cpu') {
      // back to pick screen
      $boardWrap.style.display = 'none';
      $pickScr.style.display   = '';
      resetBoard();
      clearLog();
      setStatus('Choose your mark', '');
    } else if (mode === 'local') {
      startLocalGame();
    } else if (mode === 'online' && roomCode) {
      socket.emit('req-rematch');
      resetBoard();
      clearLog();
      gameOver = false;

      if (isHost) {
        locked = false;
        setStatus('Your turn — X', 'x-turn');
      } else {
        locked = true;
        setStatus('Opponent\'s turn — X', 'x-turn');
      }
    }
  });

  $resetBtn.addEventListener('click', () => {
    resetScores();
  });

  /* ── INIT ───────────────────────────────────────────────── */
  setMode('cpu');

})();
