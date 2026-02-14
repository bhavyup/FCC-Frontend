const fallbackQuotes = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
  { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
  { text: "The only thing we have to fear is fear itself.", author: "Franklin D. Roosevelt" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "Imagination is more important than knowledge.", author: "Albert Einstein" },
  { text: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "The mind is everything. What you think you become.", author: "Buddha" },
  { text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
  { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" }
];

// --- Persisted state via localStorage ---
let quoteCount = parseInt(localStorage.getItem('qv_quoteCount')) || 0;
let favorites = JSON.parse(localStorage.getItem('qv_favorites')) || [];
let totalAvailableQuotes = 1454;
let fccTestsLoaded = false;
let fccSuiteVisible = false;
let fccKeyBuffer = [];
let fccKeyTimer = null;
let currentQuote = null;

const quoteText = document.getElementById('text');
const authorText = document.getElementById('author');
const newQuoteBtn = document.getElementById('new-quote');
const tweetQuoteBtn = document.getElementById('tweet-quote');
const copyQuoteBtn = document.getElementById('copy-quote');
const favoriteQuoteBtn = document.getElementById('favorite-quote');
const quoteContent = document.querySelector('.quote-content');
const quoteCountEl = document.getElementById('quote-count');
const collectionCountEl = document.getElementById('collection-count');
const favoritesCountEl = document.getElementById('favorites-count');
const toast = document.getElementById('toast');
const loadTestsBtn = document.getElementById('load-tests');
const favoritesPanel = document.getElementById('favorites-panel');
const favoritesList = document.getElementById('favorites-list');
const favoritesToggleBtn = document.getElementById('favorites-toggle');
const favoritesCloseBtn = document.getElementById('favorites-close');
const favoritesEmpty = document.getElementById('favorites-empty');

function saveState() {
  localStorage.setItem('qv_quoteCount', quoteCount);
  localStorage.setItem('qv_favorites', JSON.stringify(favorites));
}

function updateStats() {
  quoteCountEl.textContent = quoteCount;
  collectionCountEl.textContent = totalAvailableQuotes;
  favoritesCountEl.textContent = favorites.length;
}

function quoteKey(q) {
  return `${q.text}|||${q.author}`;
}

function isCurrentFavorited() {
  if (!currentQuote) return false;
  return favorites.some(q => quoteKey(q) === quoteKey(currentQuote));
}

// Fetch total quote count from API
async function fetchTotalQuotes() {
  try {
    const res = await fetch('https://dummyjson.com/quotes?limit=1');
    if (!res.ok) throw new Error();
    const data = await res.json();
    totalAvailableQuotes = data.total || 1454;
    updateStats();
  } catch { /* keep default */ }
}

function renderFavorites() {
  favoritesList.innerHTML = '';
  if (favorites.length === 0) {
    favoritesEmpty.style.display = 'block';
    return;
  }
  favoritesEmpty.style.display = 'none';
  favorites.forEach((fav, idx) => {
    const item = document.createElement('div');
    item.className = 'fav-item';
    item.innerHTML = `
      <div class="fav-text">"${fav.text}"</div>
      <div class="fav-bottom">
        <span class="fav-author">— ${fav.author}</span>
        <button class="fav-remove" data-idx="${idx}" title="Remove">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;
    favoritesList.appendChild(item);
  });

  favoritesList.querySelectorAll('.fav-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(btn.dataset.idx);
      favorites.splice(idx, 1);
      saveState();
      updateStats();
      renderFavorites();
      // Update heart if current quote was removed
      if (isCurrentFavorited()) {
        favoriteQuoteBtn.classList.add('active');
      } else {
        favoriteQuoteBtn.classList.remove('active');
      }
      showToast('Removed from favorites');
    });
  });
}

function toggleFavoritesPanel() {
  favoritesPanel.classList.toggle('open');
  if (favoritesPanel.classList.contains('open')) {
    renderFavorites();
  }
}

function getRandomFallback() {
  return fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
}

async function fetchRandomQuote() {
  try {
    const res = await fetch('https://dummyjson.com/quotes/random');
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    return { text: data.quote, author: data.author };
  } catch {
    return getRandomFallback();
  }
}

function updateTweetLink(quote) {
  const tweetText = encodeURIComponent(`"${quote.text}" — ${quote.author}`);
  tweetQuoteBtn.href = `https://twitter.com/intent/tweet?text=${tweetText}`;
}

function showToast(message) {
  const toastMessage = toast.querySelector('.toast-message');
  toastMessage.textContent = message;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

function displayNewQuote() {
  quoteContent.classList.remove('fade-in');
  quoteContent.classList.add('fade-out');

  setTimeout(async () => {
    const quote = await fetchRandomQuote();
    currentQuote = quote;

    quoteText.textContent = quote.text;
    authorText.textContent = `${quote.author}`;
    updateTweetLink(quote);

    // Update favorite button state for this quote
    if (isCurrentFavorited()) {
      favoriteQuoteBtn.classList.add('active');
    } else {
      favoriteQuoteBtn.classList.remove('active');
    }

    quoteContent.classList.remove('fade-out');
    quoteContent.classList.add('fade-in');

    quoteCount++;
    saveState();
    updateStats();
  }, 400);
}

function copyToClipboard() {
  const quote = `"${quoteText.textContent}" — ${authorText.textContent.replace('— ', '')}`;
  navigator.clipboard.writeText(quote).then(() => {
    showToast('Copied to clipboard!');
  });
}

function toggleFavorite() {
  if (!currentQuote) return;
  const key = quoteKey(currentQuote);

  if (isCurrentFavorited()) {
    favorites = favorites.filter(q => quoteKey(q) !== key);
    favoriteQuoteBtn.classList.remove('active');
    showToast('Removed from favorites');
  } else {
    favorites.push({ ...currentQuote });
    favoriteQuoteBtn.classList.add('active');
    showToast('Added to favorites!');
  }
  saveState();
  updateStats();
  // Re-render if panel is open
  if (favoritesPanel.classList.contains('open')) {
    renderFavorites();
  }
}

newQuoteBtn.addEventListener('click', displayNewQuote);
copyQuoteBtn.addEventListener('click', copyToClipboard);
favoriteQuoteBtn.addEventListener('click', toggleFavorite);
favoritesToggleBtn.addEventListener('click', toggleFavoritesPanel);
favoritesCloseBtn.addEventListener('click', toggleFavoritesPanel);

function toggleFCCSuite() {
  if (!fccTestsLoaded) {
    // First time: load the script
    fccTestsLoaded = true;
    showToast('Loading FCC Tests...');

    const script = document.createElement('script');
    script.src = 'https://cdn.freecodecamp.org/testable-projects-fcc/v1/bundle.js';
    script.async = true;

    script.onload = function () {
      document.dispatchEvent(new Event('DOMContentLoaded'));
      fccSuiteVisible = true;
      loadTestsBtn.textContent = 'Close FCC Tests';
      showToast('FCC Tests loaded!');
    };

    script.onerror = function () {
      fccTestsLoaded = false;
      showToast('Failed to load tests. Try again.');
    };

    document.head.appendChild(script);
    return;
  }

  // Toggle visibility of the test suite wrapper
  const wrapper = document.getElementById('fcc_test_suite_wrapper');
  if (!wrapper) return;

  if (fccSuiteVisible) {
    wrapper.style.display = 'none';
    fccSuiteVisible = false;
    loadTestsBtn.textContent = 'Run FCC Tests';
    showToast('FCC Tests hidden');
  } else {
    wrapper.style.display = '';
    fccSuiteVisible = true;
    loadTestsBtn.textContent = 'Close FCC Tests';
    showToast('FCC Tests shown');
  }
}

document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea')) return;

  if (e.code === 'Space') {
    e.preventDefault();
    displayNewQuote();
  }

  // Detect typing "fcc" to load the test suite
  const key = e.key.toLowerCase();
  if (key.length === 1) {
    clearTimeout(fccKeyTimer);
    fccKeyBuffer.push(key);
    fccKeyTimer = setTimeout(() => { fccKeyBuffer = []; }, 1000);
    if (fccKeyBuffer.join('').includes('fcc')) {
      fccKeyBuffer = [];
      toggleFCCSuite();
    }
  }
});

loadTestsBtn.addEventListener('click', toggleFCCSuite);

// Initialize stats on load
fetchTotalQuotes();
updateStats();
displayNewQuote();