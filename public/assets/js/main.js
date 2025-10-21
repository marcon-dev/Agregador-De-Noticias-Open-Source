const normalizeCity = (name = '') => name.trim().toLowerCase().replace(/\s+/g, '+');

const messageForTemp = (t) => {
  if (t <= -5) return 'Bitterly cold outside';
  if (t <= 5) return 'Very cold today';
  if (t <= 12) return 'Pleasantly cool day';
  if (t <= 20) return 'Mild and comfortable';
  if (t <= 28) return 'Nice warm day';
  if (t <= 35) return 'Hot day—keep cool';
  return 'Scorching heat—extreme temps';
};

const updateUI = (tempC) => {
  const tempEl = document.querySelector('.geosense-location-temperature');
  const msgEl = document.querySelector('.geosense-phrases-status');
  if (typeof tempC === 'number' && !Number.isNaN(tempC)) {
    tempEl && (tempEl.textContent = `${Math.round(tempC)} °C`);
    msgEl && (msgEl.textContent = messageForTemp(tempC));
  }
};

const DEFAULT_CITY = 'Oakland';
const NEWS_RENDER_LIMIT = 4; // number of articles shown per batch
const MAX_FETCH_PAGES = 3;   // max pages to try when fetching fresh news

const loadWeather = async (cityName = DEFAULT_CITY) => {
  try {
    const res = await fetch(`/.netlify/functions/weather?city=${normalizeCity(cityName)}`);
    if (!res.ok) return; // Silent fail
    const data = await res.json();
    const temp = data?.main?.temp;
    if (typeof temp === 'number') updateUI(temp);
  } catch (_) {
  }
};

// ===== News rendering =====
const formatDateDMY = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const renderNews = (articles) => {
  const container = document.querySelector('.geosense-main-component');
  if (!container || !Array.isArray(articles)) return;

  const list = articles
    .filter((a) => a && (a.title || a.description || a.content))
    .slice(0, NEWS_RENDER_LIMIT);

  const html = list
    .map((a) => {
      const { title, author, source, publishedAt, description, content, url } = a || {};
      const safeTitle = title || 'Untitled';
      const by = author || source || 'Unknown';
      const published = formatDateDMY(publishedAt);
      const desc = description || content || '';
      const safeUrl = url || '';
      return `
      <section class="geosense-article" data-url="${escapeAttr(safeUrl)}" tabindex="0" role="link" aria-label="Open article: ${escapeAttr(safeTitle)}">
        <h1 class="geosense-article-title">${escapeHtml(safeTitle)}</h1>
        <span class="geosense-article-extrainfo">
          <span class="geosense-article-author">${escapeHtml(by)}</span>
          ${published ? `, <span class=\"geosense-article-publishedAt\">Published on ${published}</span>` : ''}
        </span>
        <p class="geosense-article-paragraph">${escapeHtml(desc)}</p>
      </section>
    `;
    })
    .join('');

  container.innerHTML = html;

  const items = container.querySelectorAll('.geosense-article');

  // Animations and hover/focus affordances
  window.GeoAnimations?.animateNewsItems?.(items);
  window.GeoAnimations?.attachHoverAffordances?.(items);

  if (!container.dataset.eventsBound) { // Event delegation for click/keyboard activation
    const openArticle = (el) => {
      const { url } = el.dataset;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    };

    container.addEventListener('click', (e) => {
      const article = e.target.closest?.('.geosense-article');
      if (article) openArticle(article);
    });

    container.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const article = e.target.closest?.('.geosense-article');
      if (article) {
        e.preventDefault();
        openArticle(article);
      }
    });

    container.dataset.eventsBound = '1';
  }
};

const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const escapeAttr = (str) => String(str).replace(/["']/g, '');

// ===== News cache helpers =====
const NEWS_TITLES_KEY = 'gs.news.titles';
const NEWS_HISTORY_KEY = 'gs.news.history'; // Array<Batch>, Batch = Array<Article>
const NEWS_HISTORY_INDEX_KEY = 'gs.news.history.idx'; // current index in history
const getCachedTitles = () => {
  try {
    const raw = localStorage.getItem(NEWS_TITLES_KEY);
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  } catch {
    return [];
  }
};

const setCachedTitles = (titles = []) => {
  try {
    localStorage.setItem(NEWS_TITLES_KEY, JSON.stringify(titles.filter(Boolean)));
  } catch {}
};

const normTitle = (t) => String(t || '').trim().toLowerCase();

const getHistory = () => {
  try {
    const raw = localStorage.getItem(NEWS_HISTORY_KEY);
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const setHistory = (history = []) => {
  try {
    localStorage.setItem(NEWS_HISTORY_KEY, JSON.stringify(history));
  } catch {}
};

const getHistoryIndex = () => {
  try {
    const v = parseInt(localStorage.getItem(NEWS_HISTORY_INDEX_KEY) || '0', 10);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  } catch {
    return 0;
  }
};

const setHistoryIndex = (idx = 0) => {
  try {
    localStorage.setItem(NEWS_HISTORY_INDEX_KEY, String(idx));
  } catch {}
};

const fetchNewsRaw = async (excludeTitles = [], page = 1) => {
  try {
    const params = new URLSearchParams();
    if (Array.isArray(excludeTitles) && excludeTitles.length) {
      try {
        params.set('exclude', JSON.stringify(excludeTitles));
      } catch {}
    }
    if (Number.isFinite(page) && page > 1) {
      params.set('page', String(page));
    }
    const qs = params.toString();
    const res = await fetch(`/.netlify/functions/news${qs ? `?${qs}` : ''}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.articles) ? data.articles : [];
  } catch {
    return [];
  }
};

const renderAndCache = (articles) => {
  renderNews(articles);
  const titles = (articles || []).map((a) => a?.title).filter(Boolean);
  if (titles.length) {
    const existing = getCachedTitles();
    const merged = Array.from(new Set([...existing, ...titles]));
    setCachedTitles(merged);
  }
};

const appendToHistory = (batch = []) => {
  const history = getHistory();
  history.push(batch);
  setHistory(history);
  setHistoryIndex(history.length - 1);
};

const showHistoryAt = (idx, direction = 1) => {
  const history = getHistory();
  const clamped = Math.max(0, Math.min(idx, history.length - 1));
  const batch = history[clamped] || [];

  // Animate out current items, then render
  const container = document.querySelector('.geosense-main-component');
  const items = container?.querySelectorAll?.('.geosense-article');
  const proceed = () => {
    renderAndCache(batch);
    setHistoryIndex(clamped);
  };
  if (items && items.length) {
    window.GeoAnimations?.animateNewsOut?.(items, direction, proceed);
  } else {
    proceed();
  }
};

const loadNews = async () => {
  // If we have history from a previous session, show current index
  const history = getHistory();
  if (history.length) {
    showHistoryAt(getHistoryIndex(), 1);
    return;
  }

  // Otherwise fetch initial batch, render, and seed history
  const articles = await fetchNewsRaw([]);
  if (!articles.length) return;
  appendToHistory(articles);
  showHistoryAt(getHistoryIndex(), 1);
};

// ===== GSAP Animations =====
const animateInitial = () => window.GeoAnimations?.animateInitial?.();
const animateNewsItems = (nodeList) => window.GeoAnimations?.animateNewsItems?.(nodeList);

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('geosense-location-select');
  loadWeather(select?.value);
  select?.addEventListener('change', ({ target: { value } }) => loadWeather(value));
  window.GeoAnimations?.animateInitial?.();
  loadNews();

  // ===== Tutorial Modal =====
  const tutorial = document.getElementById('tutorial-modal');
  const tClose = tutorial?.querySelector('[data-close]');
  let lastFocusTut = null;

  const closeTutorial = () => {
    if (!tutorial) return;
    tutorial.classList.remove('is-open');
    tutorial.setAttribute('aria-hidden', 'true');
    lastFocusTut?.focus?.();
    document.removeEventListener('keydown', onTutKeydown);
  };

  const onTutKeydown = (e) => {
    if (e.key === 'Escape') closeTutorial();
  };

  if (tutorial) {
    lastFocusTut = document.activeElement;
    window.GeoAnimations?.openModalWithGsap?.(tutorial);
    (tClose || tutorial)?.focus?.();
    document.addEventListener('keydown', onTutKeydown);
  }

  tutorial?.addEventListener('click', (e) => {
    const target = e.target;
    if (target?.dataset?.close || target === tutorial) {
      closeTutorial();
    }
  });

  // ===== Terms Modal Wiring =====
  const trigger = document.getElementById('terms-of-usage');
  const modal = document.getElementById('terms-modal');
  const dialog = modal?.querySelector('.gs-modal__dialog');
  const closeBtn = modal?.querySelector('[data-close]');
  let lastFocus = null;

  const openModal = () => {
    if (!modal) return;
    lastFocus = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    (closeBtn || dialog)?.focus?.();
    document.addEventListener('keydown', onKeydown);
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    lastFocus?.focus?.();
    document.removeEventListener('keydown', onKeydown);
  };

  const onKeydown = (e) => {
    if (e.key === 'Escape') closeModal();
  };

  trigger?.addEventListener('click', openModal);
  modal?.addEventListener('click', (e) => {
    const target = e.target;
    if (target?.dataset?.close || target === modal) closeModal();
  });

  let isReloadingNews = false;
  const refreshNews = async (direction = 1) => {
    if (isReloadingNews) return;
    isReloadingNews = true;

    const history = getHistory();
    const idx = getHistoryIndex();

    if (direction < 0) {
      // Go to previous batch if available
      if (idx > 0) showHistoryAt(idx - 1, -1);
      isReloadingNews = false;
      return;
    }

    // Going forward: if next batch exists, show it
    if (idx < history.length - 1) {
      showHistoryAt(idx + 1, 1);
      isReloadingNews = false;
      return;
    }

    // Otherwise fetch new batch(s), excluding everything we've already seen
    const seen = getCachedTitles();
    let fresh = [];
    for (let page = 1; page <= MAX_FETCH_PAGES && fresh.length === 0; page += 1) {
      const resp = await fetchNewsRaw(seen, page);
      const seenSet = new Set(seen.map(normTitle));
      fresh = (resp || []).filter((a) => a?.title && !seenSet.has(normTitle(a.title)));
    }

    if (!fresh.length) {
      isReloadingNews = false;
      return;
    }

    appendToHistory(fresh);
    showHistoryAt(getHistoryIndex(), 1);
    isReloadingNews = false;
  };

  window.GeoNews = Object.assign(window.GeoNews || {}, { refreshNews });
});