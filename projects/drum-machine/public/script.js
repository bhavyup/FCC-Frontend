(() => {
  'use strict';

  // ─── Elements ─────────────────────────────────────────
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const display   = $('#display');
  const hitCount  = $('#hit-count');
  const bpmEl     = $('#bpm-display');
  const volSlider = $('#volume');
  const volValue  = $('#vol-value');
  const testBtn   = $('#load-tests');
  const toastEl   = $('#toast');
  const pads      = $$('.drum-pad');

  // ─── State ────────────────────────────────────────────
  let hits       = 0;
  let volume     = 0.75;
  let toastTimer = null;
  let fccLoaded  = false;
  let fccVisible = false;
  let keyBuffer  = [];
  let keyTimer   = null;

  // BPM tracking — rolling window of last timestamps
  const hitTimes = [];
  const BPM_WINDOW = 6;

  // ─── Pad Map ──────────────────────────────────────────
  const PAD_KEYS = new Set(['Q', 'W', 'E', 'A', 'S', 'D', 'Z', 'X', 'C']);

  // ─── Core: Trigger a pad ──────────────────────────────
  function triggerPad(padEl) {
    const audio = padEl.querySelector('audio.clip');
    if (!audio) return;

    // Play
    audio.currentTime = 0;
    audio.volume = volume;
    audio.play().catch(() => {});

    // Display
    const clipName = padEl.dataset.name || padEl.id;
    display.textContent = clipName;
    flashDisplay();

    // Hits
    hits++;
    hitCount.textContent = hits;

    // BPM
    trackBPM();

    // Pad visual
    padEl.classList.add('active');
    setTimeout(() => padEl.classList.remove('active'), 120);
  }

  function flashDisplay() {
    display.classList.remove('flash');
    void display.offsetWidth;
    display.classList.add('flash');
    setTimeout(() => display.classList.remove('flash'), 300);
  }

  function trackBPM() {
    const now = performance.now();
    hitTimes.push(now);
    if (hitTimes.length > BPM_WINDOW) hitTimes.shift();
    if (hitTimes.length < 2) { bpmEl.textContent = '\u2014'; return; }

    const span = hitTimes[hitTimes.length - 1] - hitTimes[0];
    const avg  = span / (hitTimes.length - 1);
    const bpm  = Math.round(60000 / avg);

    bpmEl.textContent = bpm > 0 && bpm < 999 ? bpm : '\u2014';
  }

  // ─── Volume ───────────────────────────────────────────
  function updateVolume() {
    volume = volSlider.value / 100;
    volValue.textContent = volSlider.value;
  }

  // ─── Toast ────────────────────────────────────────────
  function showToast(msg) {
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.classList.add('visible');
    toastTimer = setTimeout(() => toastEl.classList.remove('visible'), 2000);
  }

  // ─── FCC Test Suite ───────────────────────────────────
  function toggleFCCSuite() {
    if (!fccLoaded) {
      fccLoaded = true;
      showToast('Loading FCC tests\u2026');
      const script  = document.createElement('script');
      script.src    = 'https://cdn.freecodecamp.org/testable-projects-fcc/v1/bundle.js';
      script.onload = () => {
        document.dispatchEvent(new Event('DOMContentLoaded'));
        fccVisible = true;
        testBtn.textContent = 'Hide Tests';
        showToast('FCC tests ready');
      };
      script.onerror = () => {
        fccLoaded = false;
        showToast('Failed to load tests');
      };
      document.head.appendChild(script);
      return;
    }

    const wrapper = document.getElementById('fcc_test_suite_wrapper');
    if (!wrapper) return;

    fccVisible = !fccVisible;
    wrapper.style.display = fccVisible ? '' : 'none';
    testBtn.textContent   = fccVisible ? 'Hide Tests' : 'FCC Tests';
    showToast(fccVisible ? 'Tests shown' : 'Tests hidden');
  }

  // ─── Event: Pad clicks ───────────────────────────────
  pads.forEach((pad) => {
    pad.addEventListener('click', () => triggerPad(pad));
  });

  // ─── Event: Keyboard ─────────────────────────────────
  document.addEventListener('keydown', (e) => {
    const key = e.key.toUpperCase();

    if (PAD_KEYS.has(key)) {
      e.preventDefault();
      const audio = document.getElementById(key);
      if (audio) {
        const pad = audio.closest('.drum-pad');
        if (pad) triggerPad(pad);
      }
      return;
    }

    // "fcc" keyboard shortcut
    if (e.target.tagName === 'INPUT') return;
    const lk = e.key.toLowerCase();
    if (lk.length !== 1) return;

    clearTimeout(keyTimer);
    keyBuffer.push(lk);
    keyTimer = setTimeout(() => { keyBuffer = []; }, 1000);

    if (keyBuffer.join('').includes('fcc')) {
      keyBuffer = [];
      toggleFCCSuite();
    }
  });

  // ─── Event: Volume ────────────────────────────────────
  volSlider.addEventListener('input', updateVolume);

  // ─── Event: FCC button ────────────────────────────────
  testBtn.addEventListener('click', toggleFCCSuite);

  // ─── Init ─────────────────────────────────────────────
  updateVolume();
})();
