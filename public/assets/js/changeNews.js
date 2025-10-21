(function () {
  const SELECTORS = { NEWS_CONTAINER: '.geosense-main-component' };
  const KEYS = { LEFT: 'ArrowLeft', RIGHT: 'ArrowRight' };
  const SWIPE_DISTANCE_PX = 50;          // min horizontal distance to trigger navigation
  const HORIZONTAL_LOCK_DISTANCE_PX = 10;// distance to decide horizontal intent

  const getRefresh = () => (window.GeoNews && window.GeoNews.refreshNews) || null;

  // Keyboard: Ctrl + ArrowLeft/Right
  document.addEventListener('keydown', (e) => {
    if (!e.ctrlKey) return;
    const refreshNews = getRefresh();
    if (!refreshNews) return;
    if (e.key === KEYS.RIGHT) {
      e.preventDefault();
      refreshNews(1);
    } else if (e.key === KEYS.LEFT) {
      e.preventDefault();
      refreshNews(-1);
    }
  });

  // Touch helpers
  const getTouch = (evt) => evt.changedTouches && evt.changedTouches[0];
  const container = document.querySelector(SELECTORS.NEWS_CONTAINER);
  if (!container) return;

  let startTouchX = 0;
  let startTouchY = 0;
  let gestureActive = false;
  let lastDeltaX = 0;
  let lastDeltaY = 0;

  container.addEventListener(
    'touchstart',
    (e) => {
      const t = getTouch(e);
      if (!t) return;
      startTouchX = t.clientX;
      startTouchY = t.clientY;
      gestureActive = true;
      lastDeltaX = 0;
      lastDeltaY = 0;
    },
    { passive: true }
  );

  container.addEventListener(
    'touchmove',
    (e) => {
      if (!gestureActive) return;
      const t = getTouch(e);
      if (!t) return;
      const dx = t.clientX - startTouchX;
      const dy = t.clientY - startTouchY;
      lastDeltaX = dx;
      lastDeltaY = dy;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > HORIZONTAL_LOCK_DISTANCE_PX) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  container.addEventListener(
    'touchcancel',
    () => {
      gestureActive = false;
      lastDeltaX = 0;
      lastDeltaY = 0;
    },
    { passive: true }
  );

  // Suppress accidental click after a swipe
  container.addEventListener(
    'click',
    (e) => {
      if (Math.abs(lastDeltaX) > Math.abs(lastDeltaY) && Math.abs(lastDeltaX) > SWIPE_DISTANCE_PX) {
        e.preventDefault();
        e.stopPropagation();
        lastDeltaX = 0;
        lastDeltaY = 0;
      }
    },
    true
  );

  container.addEventListener(
    'touchend',
    (e) => {
      if (!gestureActive) return;
      gestureActive = false;
      const t = getTouch(e);
      if (!t) return;
      const dx = t.clientX - startTouchX;
      const dy = t.clientY - startTouchY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_DISTANCE_PX) {
        const refreshNews = getRefresh();
        if (!refreshNews) return;
        refreshNews(dx < 0 ? 1 : -1);
      }
    },
    { passive: true }
  );
})();