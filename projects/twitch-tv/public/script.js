/* ╔══════════════════════════════════════════════════════════╗
   ║  SIGNAL — Twitch Status Board · script.js              ║
   ╚══════════════════════════════════════════════════════════╝ */
'use strict';

(function () {

  /* ── CONFIG ─────────────────────────────────────────────── */
  const API_BASE = 'https://twitch-proxy.freecodecamp.rocks/twitch-api';
  const CHANNELS = [
    'ESL_SC2',
    'OgamingSC2',
    'cretetion',
    'freecodecamp',
    'storbeck',
    'habathcx',
    'RobotCaleb',
    'noobs2ninjas'
  ];

  /* ── DOM ────────────────────────────────────────────────── */
  const $board      = document.getElementById('channels');
  const $skeleton   = document.getElementById('skeleton');
  const $empty      = document.getElementById('empty-state');
  const $countAll   = document.getElementById('count-all');
  const $countLive  = document.getElementById('count-live');
  const $countOff   = document.getElementById('count-offline');
  const $updated    = document.getElementById('last-updated');
  const $refreshBtn = document.getElementById('refresh-btn');
  const $globalDot  = document.getElementById('global-dot');

  let channelData   = [];       // { name, isLive, isAccount, logo, game, status, viewers, url }
  let activeFilter  = 'all';    // 'all' | 'online' | 'offline'

  /* ── FETCH ──────────────────────────────────────────────── */
  async function fetchChannel(name) {
    const [streamRes, channelRes] = await Promise.all([
      fetch(`${API_BASE}/streams/${name}`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/channels/${name}`).then(r => r.json()).catch(() => null)
    ]);

    const info = {
      name,
      isLive: false,
      isAccount: true,   // assume account exists unless 422/404
      logo: null,
      game: null,
      status: null,
      viewers: 0,
      url: `https://www.twitch.tv/${name}`
    };

    // channel info
    if (channelRes && channelRes.display_name) {
      info.name   = channelRes.display_name || name;
      info.logo   = channelRes.logo;
      info.url    = channelRes.url || info.url;
    }

    // check for closed / nonexistent accounts
    if (channelRes && (channelRes.error || channelRes.status === 422)) {
      info.isAccount = false;
    }

    // stream info
    if (streamRes && streamRes.stream) {
      info.isLive  = true;
      info.game    = streamRes.stream.game || null;
      info.status  = streamRes.stream.channel
        ? streamRes.stream.channel.status
        : null;
      info.viewers = streamRes.stream.viewers || 0;

      // prefer stream logo if available
      if (streamRes.stream.channel && streamRes.stream.channel.logo) {
        info.logo = streamRes.stream.channel.logo;
      }
    }

    return info;
  }

  async function fetchAll() {
    $skeleton.style.display = '';
    $board.style.display = 'none';
    $refreshBtn.classList.add('spinning');

    try {
      channelData = await Promise.all(CHANNELS.map(fetchChannel));

      // sort: live first, then alphabetical
      channelData.sort((a, b) => {
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });

      render();
      updateCounts();
      updateTimestamp();
      updateGlobalDot();
    } catch (err) {
      console.error('Signal: fetch error', err);
    } finally {
      $skeleton.style.display = 'none';
      $board.style.display = '';
      $refreshBtn.classList.remove('spinning');
    }
  }

  /* ── RENDER ─────────────────────────────────────────────── */
  function render() {
    $board.innerHTML = '';

    channelData.forEach(ch => {
      const row = document.createElement('a');
      row.href = ch.url;
      row.target = '_blank';
      row.rel = 'noopener noreferrer';
      row.className = 'channel-row';

      if (ch.isLive) {
        row.classList.add('is-live');
      } else {
        row.classList.add('is-offline');
      }

      // --- status badge ---
      const badgeCls = ch.isLive
        ? 'badge badge--live'
        : (!ch.isAccount ? 'badge badge--closed' : 'badge badge--offline');
      const badgeTxt = ch.isLive
        ? 'LIVE'
        : (!ch.isAccount ? 'CLOSED' : 'OFFLINE');

      // --- avatar ---
      let avatarHtml;
      if (ch.logo) {
        avatarHtml = `<img class="ch-avatar" src="${ch.logo}" alt="${ch.name}" loading="lazy">`;
      } else {
        const initial = ch.name.charAt(0).toUpperCase();
        avatarHtml = `<div class="ch-avatar-placeholder">${initial}</div>`;
      }

      // --- game / sub-line ---
      const gameLine = ch.isLive && ch.game
        ? `<span class="ch-game">${escHtml(ch.game)}</span>`
        : (!ch.isAccount
          ? `<span class="ch-game">Account closed</span>`
          : '');

      // --- stream detail ---
      let streamHtml;
      if (ch.isLive) {
        const viewers = ch.viewers.toLocaleString();
        const statusTxt = ch.status ? escHtml(ch.status) : 'Streaming';
        streamHtml = `
          <span class="stream-detail">${statusTxt}</span>
          <span class="stream-viewers"><span class="viewers-dot"></span>${viewers}</span>
        `;
      } else {
        streamHtml = `<span class="stream-off">${ch.isAccount ? 'Currently offline' : 'Account not found'}</span>`;
      }

      row.innerHTML = `
        <div class="cell-status"><span class="${badgeCls}">${badgeTxt}</span></div>
        <div class="cell-channel">
          ${avatarHtml}
          <div class="ch-info">
            <span class="ch-name">${escHtml(ch.name)}</span>
            ${gameLine}
          </div>
        </div>
        <div class="cell-stream">${streamHtml}</div>
      `;

      $board.appendChild(row);
    });

    applyFilter();
  }

  /* ── FILTERS ────────────────────────────────────────────── */
  function applyFilter() {
    const rows = $board.querySelectorAll('.channel-row');
    let visible = 0;

    rows.forEach(row => {
      const isLive = row.classList.contains('is-live');
      let show = true;

      if (activeFilter === 'online')  show = isLive;
      if (activeFilter === 'offline') show = !isLive;

      row.classList.toggle('hidden', !show);
      if (show) visible++;
    });

    $empty.style.display = visible === 0 ? '' : 'none';
  }

  function updateCounts() {
    const live = channelData.filter(c => c.isLive).length;
    $countAll.textContent  = channelData.length;
    $countLive.textContent = live;
    $countOff.textContent  = channelData.length - live;
  }

  function updateTimestamp() {
    const now = new Date();
    const h   = String(now.getHours()).padStart(2, '0');
    const m   = String(now.getMinutes()).padStart(2, '0');
    const s   = String(now.getSeconds()).padStart(2, '0');
    $updated.textContent = `${h}:${m}:${s}`;
  }

  function updateGlobalDot() {
    const anyLive = channelData.some(c => c.isLive);
    $globalDot.style.background = anyLive ? '#e8493f' : '#3a3f4d';
    $globalDot.style.animation  = anyLive ? '' : 'none';
  }

  /* ── EVENTS ─────────────────────────────────────────────── */
  // filter tabs
  document.querySelector('.filters').addEventListener('click', e => {
    const btn = e.target.closest('.filter');
    if (!btn) return;

    document.querySelectorAll('.filter').forEach(f => f.classList.remove('active'));
    btn.classList.add('active');

    activeFilter = btn.dataset.filter;
    applyFilter();
  });

  // refresh
  $refreshBtn.addEventListener('click', () => fetchAll());

  /* ── HELPERS ────────────────────────────────────────────── */
  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ── INIT ───────────────────────────────────────────────── */
  fetchAll();

})();
