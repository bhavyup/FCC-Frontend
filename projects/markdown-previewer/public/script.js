(() => {
  'use strict';

  // ─── Elements ─────────────────────────────────────────
  const $ = (s) => document.querySelector(s);
  const editor      = $('#editor');
  const preview     = $('#preview');
  const syncDot     = $('#sync-dot');
  const docName     = $('#doc-name');
  const wordStat    = $('#word-stat');
  const charStat    = $('#char-stat');
  const lineStat    = $('#line-stat');
  const clearBtn    = $('#clear-btn');
  const copyBtn     = $('#copy-btn');
  const downloadBtn = $('#download-btn');
  const testBtn     = $('#load-tests');
  const toastEl     = $('#toast');

  // ─── State ────────────────────────────────────────────
  let toastTimer  = null;
  let fccLoaded   = false;
  let fccVisible  = false;
  let keyBuffer   = [];
  let keyTimer    = null;

  // ─── Default Markdown ─────────────────────────────────
  const defaultMarkdown = `# The Art of Writing

## Every word carries weight

Good writing isn't about complexity — it's about **clarity**. The best sentences feel inevitable, as if no other arrangement of words could say the same thing.

> "Easy reading is damn hard writing."
> — Nathaniel Hawthorne

Here's a [link to freeCodeCamp](https://www.freecodecamp.org), where millions learn to code for free.

### The writer's toolkit

- **Brevity** — say more with less
- *Rhythm* — vary your sentence length
- Honesty — write what's true
- Revision — the real writing happens here

Inline code looks like this: \`const draft = refine(thoughts)\`.

\`\`\`javascript
function write(ideas) {
  return ideas
    .filter(idea => idea.resonates)
    .map(idea => idea.articulate())
    .join('\\n\\n');
}
\`\`\`

### Comparing approaches

| Approach | Strength |
|----------|----------|
| Show | Engages imagination |
| Tell | Delivers facts fast |
| Ask | Invites reflection |

1. Start with a blank page
2. Fill it with words
3. Remove the unnecessary ones

Here's an image for inspiration:

![freeCodeCamp Logo](https://cdn.freecodecamp.org/testable-projects-fcc/images/fcc_secondary.svg)

---

*Start writing.* ✦
`;

  // ─── Marked config ────────────────────────────────────
  marked.use({ breaks: true, gfm: true });

  // ─── Utilities ────────────────────────────────────────
  function debounce(fn, ms) {
    let id;
    return (...args) => { clearTimeout(id); id = setTimeout(() => fn(...args), ms); };
  }

  function pluralize(n, word) {
    return `${n} ${word}${n !== 1 ? 's' : ''}`;
  }

  // ─── Core ─────────────────────────────────────────────
  function render() {
    preview.innerHTML = marked.parse(editor.value);
    updateStats();
    updateDocName();
    pulseSyncDot();
    save();
  }

  const debouncedRender = debounce(render, 60);

  function updateStats() {
    const text = editor.value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    wordStat.textContent = pluralize(words, 'word');
    charStat.textContent = pluralize(text.length, 'char');
    lineStat.textContent = pluralize(text.split('\n').length, 'line');
  }

  function updateDocName() {
    const match = editor.value.match(/^#\s+(.+)$/m);
    if (match) {
      const name = match[1].trim().replace(/[^\w\s-]/g, '').trim();
      docName.textContent = (name.substring(0, 28) || 'untitled') + '.md';
    } else {
      docName.textContent = 'untitled.md';
    }
  }

  function pulseSyncDot() {
    syncDot.classList.remove('pulse');
    void syncDot.offsetWidth;
    syncDot.classList.add('pulse');
  }

  function save() {
    localStorage.setItem('folio_content', editor.value);
  }

  function load() {
    const saved = localStorage.getItem('folio_content');
    editor.value = saved !== null ? saved : defaultMarkdown;
    render();
  }

  // ─── Toast ────────────────────────────────────────────
  function showToast(msg) {
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.classList.add('visible');
    toastTimer = setTimeout(() => toastEl.classList.remove('visible'), 2000);
  }

  // ─── Actions ──────────────────────────────────────────
  function clearEditor() {
    if (!editor.value.trim()) return;
    editor.value = '';
    render();
    showToast('Cleared');
  }

  function copyMarkdown() {
    if (!editor.value.trim()) return showToast('Nothing to copy');
    navigator.clipboard.writeText(editor.value)
      .then(() => showToast('Copied to clipboard'))
      .catch(() => showToast('Copy failed'));
  }

  function downloadMarkdown() {
    if (!editor.value.trim()) return showToast('Nothing to download');
    const blob = new Blob([editor.value], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), {
      href: url,
      download: docName.textContent || 'document.md',
    }).click();
    URL.revokeObjectURL(url);
    showToast('Downloaded');
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

  // ─── Event Listeners ─────────────────────────────────
  editor.addEventListener('input', debouncedRender);
  editor.addEventListener('keyup', render);  // FCC tests dispatch keyup after programmatic .value changes
  clearBtn.addEventListener('click', clearEditor);
  copyBtn.addEventListener('click', copyMarkdown);
  downloadBtn.addEventListener('click', downloadMarkdown);
  testBtn.addEventListener('click', toggleFCCSuite);

  // Tab key inserts 2 spaces instead of switching focus
  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = editor.selectionStart;
      const end   = editor.selectionEnd;
      editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
      editor.selectionStart = editor.selectionEnd = start + 2;
      debouncedRender();
    }
  });

  // Global shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl+S save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      save();
      showToast('Saved');
      return;
    }

    // "fcc" keyboard sequence (only outside textarea)
    if (e.target === editor) return;
    const key = e.key.toLowerCase();
    if (key.length !== 1) return;

    clearTimeout(keyTimer);
    keyBuffer.push(key);
    keyTimer = setTimeout(() => { keyBuffer = []; }, 1000);

    if (keyBuffer.join('').includes('fcc')) {
      keyBuffer = [];
      toggleFCCSuite();
    }
  });

  // ─── Init ─────────────────────────────────────────────
  load();
})();