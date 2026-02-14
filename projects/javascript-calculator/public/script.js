(() => {
  'use strict';

  // ─── Elements ─────────────────────────────────────────
  const displayEl   = document.getElementById('display');
  const formulaEl   = document.getElementById('formula');
  const keysEl      = document.getElementById('keys');
  const tapeListEl  = document.getElementById('tape-list');
  const tapeEmptyEl = document.getElementById('tape-empty');
  const tapeClearEl = document.getElementById('tape-clear');
  const calcCountEl = document.getElementById('calc-count');
  const topbarCount = document.getElementById('topbar-count');
  const testBtn     = document.getElementById('load-tests');
  const toastEl     = document.getElementById('toast');

  // Mobile drawer
  const tapeToggle  = document.getElementById('tape-toggle');
  const sidebar     = document.getElementById('sidebar');
  const overlay     = document.getElementById('overlay');

  // ─── State ────────────────────────────────────────────
  let current     = '0';
  let formula     = '';
  let awaiting    = false;
  let evaluated   = false;
  let lastFormula = '';
  let activeOpBtn = null;
  let history     = [];

  // FCC
  let fccLoaded  = false;
  let fccVisible = false;
  let keyBuf     = [];
  let keyTimer   = null;
  let toastTimer = null;

  // ─── Display ──────────────────────────────────────────

  function render() {
    displayEl.textContent = current;

    if (evaluated) {
      formulaEl.textContent = prettify(lastFormula) + ' =';
    } else if (awaiting) {
      formulaEl.textContent = prettify(formula);
    } else if (formula) {
      formulaEl.textContent = prettify(formula + current);
    } else {
      formulaEl.textContent = '';
    }
  }

  function prettify(expr) {
    return expr
      .replace(/\*/g, ' × ')
      .replace(/\//g, ' ÷ ')
      .replace(/\+/g, ' + ')
      .replace(/(?<=\d)-/g, ' − ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function flashResult() {
    displayEl.classList.remove('flash');
    void displayEl.offsetWidth;
    displayEl.classList.add('flash');
  }

  function highlightOp(btn) {
    clearOpHighlight();
    if (btn) { btn.classList.add('active-op'); activeOpBtn = btn; }
  }

  function clearOpHighlight() {
    if (activeOpBtn) { activeOpBtn.classList.remove('active-op'); activeOpBtn = null; }
  }

  // ─── Tape / History ───────────────────────────────────

  function pushHistory(expr, result) {
    history.push({ expr, result });
    renderTape();
  }

  function renderTape() {
    const count = history.length;
    calcCountEl.textContent = count;
    if (topbarCount) topbarCount.textContent = count;

    if (count === 0) {
      tapeListEl.innerHTML = '<li class="tape-empty">No calculations yet</li>';
      return;
    }

    tapeListEl.innerHTML = history.map(h =>
      `<li class="tape-entry">` +
        `<span class="tape-expr">${prettify(h.expr)}</span>` +
        `<span class="tape-result">= ${h.result}</span>` +
      `</li>`
    ).join('');

    // scroll to latest
    tapeListEl.scrollTop = tapeListEl.scrollHeight;
  }

  tapeClearEl.addEventListener('click', () => {
    history = [];
    renderTape();
    showToast('History cleared');
  });

  // ─── Core Logic ───────────────────────────────────────

  function inputDigit(digit) {
    if (evaluated) {
      current = digit;
      formula = '';
      evaluated = false;
    } else if (awaiting) {
      current = digit;
      awaiting = false;
    } else if (current === '0') {
      current = digit === '0' ? '0' : digit;
    } else {
      current += digit;
    }
    clearOpHighlight();
    render();
  }

  function inputDecimal() {
    if (evaluated) {
      current = '0.';
      formula = '';
      evaluated = false;
      awaiting = false;
    } else if (awaiting) {
      current = '0.';
      awaiting = false;
    } else if (!current.includes('.')) {
      current += '.';
    }
    clearOpHighlight();
    render();
  }

  function inputOperator(op, btn) {
    if (evaluated) {
      formula = current;
      evaluated = false;
    } else if (!awaiting) {
      formula += current;
    }

    // Consecutive operator handling (FCC Story #13)
    if (awaiting) {
      if (op === '-' && !formula.endsWith('-')) {
        formula += op;
      } else if (op !== '-') {
        formula = formula.replace(/[+\-*/]+$/, '') + op;
      }
    } else {
      formula += op;
    }

    awaiting = true;
    highlightOp(btn);
    render();
  }

  function evaluate() {
    if (evaluated && !formula) return;

    const fullExpr = formula + current;
    lastFormula = fullExpr;

    try {
      let result = Function('"use strict"; return (' + fullExpr + ')')();

      if (typeof result !== 'number' || !isFinite(result)) {
        current = 'Error';
      } else {
        current = parseFloat(result.toPrecision(12)).toString();
      }
    } catch {
      current = 'Error';
    }

    // Push to history tape
    if (current !== 'Error') {
      pushHistory(fullExpr, current);
    }

    formula = '';
    evaluated = true;
    awaiting = false;
    clearOpHighlight();
    flashResult();
    render();
  }

  function clear() {
    current = '0';
    formula = '';
    awaiting = false;
    evaluated = false;
    lastFormula = '';
    clearOpHighlight();
    render();
  }

  // ─── Button Clicks (delegation) ───────────────────────

  keysEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.key');
    if (!btn) return;

    const action = btn.dataset.action;
    switch (action) {
      case 'num':   inputDigit(btn.dataset.num); break;
      case 'dec':   inputDecimal(); break;
      case 'op':    inputOperator(btn.dataset.op, btn); break;
      case 'eval':  evaluate(); break;
      case 'clear': clear(); break;
    }
  });

  // ─── Keyboard ─────────────────────────────────────────

  document.addEventListener('keydown', (e) => {
    const key = e.key;

    if (/^[0-9]$/.test(key)) { e.preventDefault(); inputDigit(key); return; }

    const opMap = { '+': '+', '-': '-', '*': '*', '/': '/', x: '*', X: '*' };
    if (opMap[key]) {
      e.preventDefault();
      const idMap = { '+': 'add', '-': 'subtract', '*': 'multiply', '/': 'divide' };
      const btn = document.getElementById(idMap[opMap[key]]);
      inputOperator(opMap[key], btn);
      return;
    }

    if (key === 'Enter' || key === '=') { e.preventDefault(); evaluate(); return; }
    if (key === '.') { e.preventDefault(); inputDecimal(); return; }
    if (key === 'Escape' || key === 'Delete') { e.preventDefault(); clear(); return; }

    if (key === 'Backspace') {
      e.preventDefault();
      if (!evaluated && !awaiting && current.length > 1) {
        current = current.slice(0, -1);
      } else if (!evaluated && !awaiting) {
        current = '0';
      }
      render();
      return;
    }

    // "fcc" keyboard shortcut
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const lk = key.toLowerCase();
    if (lk.length !== 1) return;
    clearTimeout(keyTimer);
    keyBuf.push(lk);
    keyTimer = setTimeout(() => { keyBuf = []; }, 1000);
    if (keyBuf.join('').includes('fcc')) {
      keyBuf = [];
      toggleFCCSuite();
    }
  });

  // ─── Mobile Drawer ────────────────────────────────────

  if (tapeToggle) {
    tapeToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('visible');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('visible');
    });
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

  testBtn.addEventListener('click', toggleFCCSuite);

  // ─── Init ─────────────────────────────────────────────
  render();
  renderTape();
})();
