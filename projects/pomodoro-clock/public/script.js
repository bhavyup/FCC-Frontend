(() => {
  'use strict';

  // ─── Constants ────────────────────────────────────────
  const CIRCUMFERENCE = 2 * Math.PI * 120; // ~753.98

  // ─── Elements ─────────────────────────────────────────
  const app          = document.getElementById('app');
  const displayEl    = document.getElementById('time-left');
  const labelEl      = document.getElementById('timer-label');
  const ringFill     = document.getElementById('ring-fill');
  const progressFill = document.getElementById('progress-fill');
  const statusDot    = document.getElementById('status-dot');
  const streakWrap   = document.getElementById('streak-wrap');

  const startStopBtn = document.getElementById('start_stop');
  const resetBtn     = document.getElementById('reset');

  const breakLenEl   = document.getElementById('break-length');
  const sessionLenEl = document.getElementById('session-length');
  const breakDecBtn  = document.getElementById('break-decrement');
  const breakIncBtn  = document.getElementById('break-increment');
  const sessionDecBtn = document.getElementById('session-decrement');
  const sessionIncBtn = document.getElementById('session-increment');

  const sessionCountEl = document.getElementById('session-count');
  const totalFocusEl   = document.getElementById('total-focus');

  const beepEl  = document.getElementById('beep');
  const testBtn = document.getElementById('load-tests');
  const toastEl = document.getElementById('toast');

  // ─── State ────────────────────────────────────────────
  let breakLen      = 5;
  let sessionLen    = 25;
  let timeLeft      = 25 * 60;
  let totalTime     = 25 * 60;
  let isSession     = true;
  let isRunning     = false;
  let timerStarted  = false;
  let interval      = null;

  // Stats
  let sessions     = 0;
  let focusSecs    = 0;

  // FCC
  let fccLoaded  = false;
  let fccVisible = false;
  let keyBuf     = [];
  let keyTimer   = null;
  let toastTimer = null;

  // ─── Formatting ───────────────────────────────────────

  function fmt(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function fmtFocus(s) {
    const m = Math.floor(s / 60);
    if (m < 60) return m + 'm';
    return Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
  }

  // ─── Render ───────────────────────────────────────────

  function render() {
    displayEl.textContent = fmt(timeLeft);

    // Ring
    const progress = totalTime > 0 ? timeLeft / totalTime : 1;
    ringFill.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);

    // Top bar
    progressFill.style.transform = 'scaleX(' + progress + ')';

    // Phase
    labelEl.textContent = isSession ? 'Session' : 'Break';

    // Mode color
    app.classList.toggle('break-mode', !isSession);

    // Urgency
    const urgent = timeLeft <= 10 && timeLeft > 0 && isRunning;
    displayEl.classList.toggle('urgent', urgent);
    ringFill.classList.toggle('urgent', urgent);

    // Status dot
    statusDot.classList.toggle('active', isRunning);

    // Play icon
    startStopBtn.classList.toggle('running', isRunning);

    // Stats
    sessionCountEl.textContent = sessions;
    totalFocusEl.textContent = fmtFocus(focusSecs);

    // Length displays
    breakLenEl.textContent = breakLen;
    sessionLenEl.textContent = sessionLen;
  }

  function flashTime() {
    displayEl.classList.remove('flash');
    void displayEl.offsetWidth;
    displayEl.classList.add('flash');
  }

  // ─── Streak dots ──────────────────────────────────────

  function renderStreak() {
    // Show up to 8 dots, filled for completed sessions
    const total = Math.min(sessions + 1, 8);
    let html = '';
    for (let i = 0; i < total; i++) {
      const filled = i < sessions ? 'filled' : '';
      html += '<span class="streak-dot ' + filled + '"></span>';
    }
    streakWrap.innerHTML = html;
  }

  // ─── Timer Engine ─────────────────────────────────────

  function tick() {
    if (isSession) focusSecs++;

    timeLeft--;

    if (timeLeft < 0) {
      switchMode();
      return;
    }

    render();

    if (timeLeft === 0) {
      beepEl.currentTime = 0;
      beepEl.play().catch(() => {});
      if (isSession) {
        sessions++;
        renderStreak();
      }
    }
  }

  function switchMode() {
    isSession = !isSession;
    totalTime = (isSession ? sessionLen : breakLen) * 60;
    timeLeft = totalTime;
    flashTime();
    render();
  }

  function startStop() {
    if (isRunning) {
      clearInterval(interval);
      interval = null;
      isRunning = false;
    } else {
      timerStarted = true;
      isRunning = true;
      interval = setInterval(tick, 1000);
    }
    render();
  }

  function reset() {
    clearInterval(interval);
    interval = null;
    isRunning = false;
    timerStarted = false;

    breakLen   = 5;
    sessionLen = 25;
    timeLeft   = 25 * 60;
    totalTime  = 25 * 60;
    isSession  = true;

    beepEl.pause();
    beepEl.currentTime = 0;

    sessions = 0;
    focusSecs = 0;
    renderStreak();
    render();
  }

  // ─── Length Controls ──────────────────────────────────

  function adjustLen(type, delta) {
    if (isRunning) return;

    if (type === 'break') {
      const n = breakLen + delta;
      if (n < 1 || n > 60) return;
      breakLen = n;
    } else {
      const n = sessionLen + delta;
      if (n < 1 || n > 60) return;
      sessionLen = n;
    }

    if (!timerStarted && isSession) {
      timeLeft  = sessionLen * 60;
      totalTime = sessionLen * 60;
    }

    render();
  }

  // ─── Events ───────────────────────────────────────────

  startStopBtn.addEventListener('click', startStop);
  resetBtn.addEventListener('click', reset);
  breakDecBtn.addEventListener('click',   () => adjustLen('break', -1));
  breakIncBtn.addEventListener('click',   () => adjustLen('break',  1));
  sessionDecBtn.addEventListener('click', () => adjustLen('session', -1));
  sessionIncBtn.addEventListener('click', () => adjustLen('session',  1));

  // ─── Keyboard ─────────────────────────────────────────

  document.addEventListener('keydown', (e) => {
    const key = e.key;

    if (key === ' ' && e.target.tagName !== 'BUTTON') {
      e.preventDefault();
      startStop();
      return;
    }

    if ((key === 'r' || key === 'R') && e.target.tagName !== 'INPUT') {
      e.preventDefault();
      reset();
      return;
    }

    // fcc shortcut
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const lk = key.toLowerCase();
    if (lk.length !== 1) return;
    clearTimeout(keyTimer);
    keyBuf.push(lk);
    keyTimer = setTimeout(() => { keyBuf = []; }, 1000);
    if (keyBuf.join('').includes('fcc')) {
      keyBuf = [];
      toggleFCC();
    }
  });

  // ─── Toast ────────────────────────────────────────────

  function showToast(msg) {
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.classList.add('visible');
    toastTimer = setTimeout(() => toastEl.classList.remove('visible'), 2000);
  }

  // ─── FCC Test Suite ───────────────────────────────────

  function toggleFCC() {
    if (!fccLoaded) {
      fccLoaded = true;
      showToast('Loading FCC tests\u2026');
      const s   = document.createElement('script');
      s.src     = 'https://cdn.freecodecamp.org/testable-projects-fcc/v1/bundle.js';
      s.onload  = () => {
        document.dispatchEvent(new Event('DOMContentLoaded'));
        fccVisible = true;
        testBtn.textContent = 'Hide Tests';
        showToast('FCC tests ready');
      };
      s.onerror = () => { fccLoaded = false; showToast('Failed to load tests'); };
      document.head.appendChild(s);
      return;
    }
    const w = document.getElementById('fcc_test_suite_wrapper');
    if (!w) return;
    fccVisible = !fccVisible;
    w.style.display = fccVisible ? '' : 'none';
    testBtn.textContent = fccVisible ? 'Hide Tests' : 'FCC Tests';
    showToast(fccVisible ? 'Tests visible' : 'Tests hidden');
  }

  testBtn.addEventListener('click', toggleFCC);

  // ─── Init ─────────────────────────────────────────────
  ringFill.style.strokeDasharray = CIRCUMFERENCE;
  renderStreak();
  render();
})();
