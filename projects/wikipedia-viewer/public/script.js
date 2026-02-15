/* ╔══════════════════════════════════════════════════════════╗
   ║  SEEK — Wikipedia Search · script.js                   ║
   ╚══════════════════════════════════════════════════════════╝ */
'use strict';

(function () {

  /* ── CONFIG ─────────────────────────────────────────────── */
  const API_URL  = 'https://en.wikipedia.org/w/api.php';
  const REST_URL = 'https://en.wikipedia.org/api/rest_v1';
  const WIKI_URL = 'https://en.wikipedia.org/wiki/';
  const LIMIT    = 12;
  const DEBOUNCE = 400; // ms

  /* ── DOM ────────────────────────────────────────────────── */
  const $input        = document.getElementById('search-input');
  const $clearBtn     = document.getElementById('clear-btn');
  const $progress     = document.getElementById('progress');

  const $welcome      = document.getElementById('welcome');
  const $resultsWrap  = document.getElementById('results-wrap');
  const $resultsMeta  = document.getElementById('results-meta');
  const $resultsClear = document.getElementById('results-clear');
  const $results      = document.getElementById('results');
  const $noResults    = document.getElementById('no-results');
  const $noResultsTxt = document.getElementById('no-results-text');
  const $errorState   = document.getElementById('error-state');
  const $errorText    = document.getElementById('error-text');
  const $errorRetry   = document.getElementById('error-retry');

  const $suggestions    = document.getElementById('suggestions');
  const $discoverLoad   = document.getElementById('discover-loading');
  const $featured       = document.getElementById('featured');
  const $mostreadHead   = document.getElementById('mostread-head');
  const $mostreadGrid   = document.getElementById('mostread-grid');
  const $onthisdayHead  = document.getElementById('onthisday-head');
  const $onthisday      = document.getElementById('onthisday');

  /* ── STATE ──────────────────────────────────────────────── */
  let debounceTimer  = null;
  let lastQuery      = '';
  let abortCtrl      = null;

  /* ── VIEWS ──────────────────────────────────────────────── */
  const sections = [$welcome, $resultsWrap, $noResults, $errorState];

  function showSection(el) {
    sections.forEach(s => s.classList.remove('active'));
    if (el) el.classList.add('active');
  }

  function showWelcome()  { showSection($welcome); }
  function showResults()  { showSection($resultsWrap); }
  function showNoResults(query) {
    $noResultsTxt.textContent = `No articles found for "${query}".`;
    showSection($noResults);
  }
  function showError(msg) {
    $errorText.textContent = msg || 'Something went wrong. Please try again.';
    showSection($errorState);
  }

  function setLoading(on) {
    $progress.classList.toggle('active', on);
  }

  function updateClearBtn() {
    $clearBtn.classList.toggle('visible', $input.value.length > 0);
  }

  /* ── SEARCH ─────────────────────────────────────────────── */
  async function search(query) {
    query = query.trim();
    if (!query || query.length < 2) return;
    if (query === lastQuery) return;

    lastQuery = query;

    // abort previous
    if (abortCtrl) abortCtrl.abort();
    abortCtrl = new AbortController();

    setLoading(true);

    const params = new URLSearchParams({
      action:   'query',
      list:     'search',
      srsearch: query,
      srlimit:  LIMIT,
      srnamespace: 0,
      utf8:     '1',
      format:   'json',
      origin:   '*',
    });

    try {
      const res  = await fetch(`${API_URL}?${params}`, { signal: abortCtrl.signal });
      const data = await res.json();

      setLoading(false);

      if (!data.query || !data.query.search) {
        showError('Unexpected API response.');
        return;
      }

      const items = data.query.search;
      const total = data.query.searchinfo ? data.query.searchinfo.totalhits : items.length;

      if (items.length === 0) {
        showNoResults(query);
        return;
      }

      renderResults(items, query, total);
    } catch (err) {
      if (err.name === 'AbortError') return; // intentional cancel
      setLoading(false);
      showError('Network error — check your connection.');
      console.error('SEEK: fetch error', err);
    }
  }

  /* ── RENDER RESULTS ─────────────────────────────────────── */
  function renderResults(items, query, total) {
    $results.innerHTML = '';

    const formattedTotal = Number(total).toLocaleString();
    $resultsMeta.innerHTML = `<strong>${formattedTotal}</strong> results for "<strong>${escText(query)}</strong>"`;

    items.forEach(item => {
      const link = document.createElement('a');
      link.className = 'result';
      link.href   = WIKI_URL + encodeURIComponent(item.title.replace(/ /g, '_'));
      link.target = '_blank';
      link.rel    = 'noopener noreferrer';

      // format word count
      const words = formatWords(item.wordcount);

      // breadcrumb-style URL
      const urlPath = 'en.wikipedia.org › wiki › ' + item.title.replace(/ /g, '_');

      // safe snippet
      const snippetFrag = renderSnippet(item.snippet);

      link.innerHTML = `
        <div class="result-head">
          <span class="result-title">${escText(item.title)}</span>
          <span class="result-words">${words}</span>
        </div>
        <span class="result-url">${escText(urlPath)}</span>
        <p class="result-snippet"></p>
      `;

      // insert safe snippet
      link.querySelector('.result-snippet').appendChild(snippetFrag);

      $results.appendChild(link);
    });

    showResults();
  }

  /* ── SNIPPET SANITIZER ──────────────────────────────────── */
  function renderSnippet(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const frag = document.createDocumentFragment();

    doc.body.childNodes.forEach(function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        frag.appendChild(document.createTextNode(node.textContent));
      } else if (
        node.nodeType === Node.ELEMENT_NODE &&
        node.tagName === 'SPAN' &&
        node.classList.contains('searchmatch')
      ) {
        const mark = document.createElement('mark');
        mark.textContent = node.textContent;
        frag.appendChild(mark);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // recursively extract text from other elements
        node.childNodes.forEach(walk);
      }
    });

    // add ellipsis
    frag.appendChild(document.createTextNode('...'));

    return frag;
  }

  /* ── HELPERS ────────────────────────────────────────────── */
  function escText(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function formatWords(count) {
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K words';
    }
    return count + ' words';
  }

  function clearSearch() {
    $input.value = '';
    lastQuery = '';
    updateClearBtn();
    setLoading(false);
    showWelcome();
    $input.focus();
    if (debounceTimer) clearTimeout(debounceTimer);
    if (abortCtrl) abortCtrl.abort();
  }

  /* ── EVENTS ─────────────────────────────────────────────── */

  // debounced input
  $input.addEventListener('input', () => {
    updateClearBtn();

    if (debounceTimer) clearTimeout(debounceTimer);

    const q = $input.value.trim();
    if (q.length < 2) {
      if (q.length === 0) {
        lastQuery = '';
        showWelcome();
      }
      return;
    }

    debounceTimer = setTimeout(() => search(q), DEBOUNCE);
  });

  // enter key — immediate search
  $input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (debounceTimer) clearTimeout(debounceTimer);
      const q = $input.value.trim();
      if (q.length >= 2) {
        lastQuery = ''; // force re-search
        search(q);
      }
    }

    if (e.key === 'Escape') {
      clearSearch();
    }
  });

  // clear button
  $clearBtn.addEventListener('click', clearSearch);

  // results clear
  $resultsClear.addEventListener('click', clearSearch);

  // suggestion pills
  $suggestions.addEventListener('click', e => {
    const pill = e.target.closest('.pill');
    if (!pill) return;

    const q = pill.dataset.q;
    $input.value = q;
    updateClearBtn();
    lastQuery = '';
    search(q);
  });

  // "/" shortcut to focus search
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== $input) {
      e.preventDefault();
      $input.focus();
      $input.select();
    }
  });

  // error retry
  $errorRetry.addEventListener('click', () => {
    const q = $input.value.trim();
    if (q.length >= 2) {
      lastQuery = '';
      search(q);
    } else {
      showWelcome();
    }
  });

  /* ── DISCOVER FEED ────────────────────────────────────────── */
  async function loadDiscoverFeed() {
    const now   = new Date();
    const yyyy  = now.getFullYear();
    const mm    = String(now.getMonth() + 1).padStart(2, '0');
    const dd    = String(now.getDate()).padStart(2, '0');

    try {
      const res  = await fetch(`${REST_URL}/feed/featured/${yyyy}/${mm}/${dd}`);
      const data = await res.json();

      // hide skeleton
      $discoverLoad.style.display = 'none';

      // ── Featured article of the day ──
      if (data.tfa) {
        renderFeatured(data.tfa);
      }

      // ── Most-read articles ──
      if (data.mostread && data.mostread.articles) {
        renderMostRead(data.mostread.articles);
      }

      // ── On this day ──
      if (data.onthisday && data.onthisday.length > 0) {
        renderOnThisDay(data.onthisday);
      }

    } catch (err) {
      console.warn('SEEK: discover feed unavailable', err);
      $discoverLoad.style.display = 'none';
      // Silently fail — welcome pills still work
    }
  }

  function renderFeatured(article) {
    const title   = article.normalizedtitle || article.title || '';
    const excerpt = article.extract || '';
    const url     = article.content_urls && article.content_urls.desktop
      ? article.content_urls.desktop.page
      : WIKI_URL + encodeURIComponent(title.replace(/ /g, '_'));

    const thumb = article.thumbnail ? article.thumbnail.source : null;

    let imgHtml;
    if (thumb) {
      imgHtml = '<img class="featured-img" src="' + escText(thumb) + '" alt="' + escText(title) + '" loading="lazy">';
    } else {
      imgHtml = '<div class="featured-img-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/></svg></div>';
    }

    const truncatedExcerpt = excerpt.length > 220 ? excerpt.slice(0, 220) + '...' : excerpt;

    $featured.innerHTML =
      '<a class="featured-card" href="' + escText(url) + '" target="_blank" rel="noopener noreferrer">' +
        imgHtml +
        '<div class="featured-body">' +
          '<span class="featured-badge"><span class="featured-badge-dot"></span>Featured today</span>' +
          '<h2 class="featured-title">' + escText(title) + '</h2>' +
          '<p class="featured-excerpt">' + escText(truncatedExcerpt) + '</p>' +
          '<span class="featured-meta">en.wikipedia.org › wiki › ' + escText(title.replace(/ /g, '_')) + '</span>' +
        '</div>' +
      '</a>';

    $featured.style.display = '';
  }

  function renderMostRead(articles) {
    // filter out "Main Page" and special pages, limit to 4
    const filtered = articles
      .filter(a => a.title !== 'Main Page' && !a.title.startsWith('Special:'))
      .slice(0, 4);

    if (filtered.length === 0) return;

    $mostreadGrid.innerHTML = '';

    filtered.forEach(function (article, i) {
      const title  = article.normalizedtitle || article.title;
      const url    = article.content_urls && article.content_urls.desktop
        ? article.content_urls.desktop.page
        : WIKI_URL + encodeURIComponent(title.replace(/ /g, '_'));
      const views  = article.views ? Number(article.views).toLocaleString() : '';
      const thumb  = article.thumbnail ? article.thumbnail.source : null;

      let thumbHtml;
      if (thumb) {
        thumbHtml = '<img class="mr-thumb" src="' + escText(thumb) + '" alt="" loading="lazy">';
      } else {
        const initial = title.charAt(0).toUpperCase();
        thumbHtml = '<div class="mr-thumb-empty">' + initial + '</div>';
      }

      const card = document.createElement('a');
      card.className = 'mr-card';
      card.href   = url;
      card.target = '_blank';
      card.rel    = 'noopener noreferrer';

      card.innerHTML =
        '<span class="mr-rank">' + (i + 1) + '</span>' +
        thumbHtml +
        '<div class="mr-info">' +
          '<span class="mr-title">' + escText(title) + '</span>' +
          (views ? '<span class="mr-views">' + views + ' views today</span>' : '') +
        '</div>';

      $mostreadGrid.appendChild(card);
    });

    $mostreadHead.style.display = '';
    $mostreadGrid.style.display = '';
  }

  function renderOnThisDay(events) {
    // pick up to 5 events that have "selected" type or just take first 5
    const picked = events
      .filter(e => e.text && e.year)
      .sort((a, b) => b.year - a.year)
      .slice(0, 5);

    if (picked.length === 0) return;

    $onthisday.innerHTML = '';

    picked.forEach(function (evt) {
      const year = evt.year > 0 ? evt.year : Math.abs(evt.year) + ' BC';
      const text = evt.text;

      // link to first related page if available
      let url = '#';
      if (evt.pages && evt.pages.length > 0 && evt.pages[0].content_urls) {
        url = evt.pages[0].content_urls.desktop.page;
      }

      const item = document.createElement('a');
      item.className  = 'otd-item';
      item.href       = url;
      item.target     = '_blank';
      item.rel        = 'noopener noreferrer';

      item.innerHTML =
        '<span class="otd-year">' + escText(String(year)) + '</span>' +
        '<div class="otd-body"><p class="otd-text">' + escText(text) + '</p></div>';

      $onthisday.appendChild(item);
    });

    $onthisdayHead.style.display = '';
    $onthisday.style.display     = '';
  }

  /* ── INIT ───────────────────────────────────────────────── */
  showWelcome();
  updateClearBtn();
  loadDiscoverFeed();

})();
