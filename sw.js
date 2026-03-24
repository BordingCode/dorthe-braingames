const CACHE_NAME = 'brain-games-v72';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './Jans_fort.jpeg',
  './css/shared.css',
  './css/home.css',
  './css/lightsout.css',
  './css/memory.css',
  './css/minesweeper.css',
  './css/wordsearch.css',
  './css/nback.css',
  './css/solitaire.css',
  './css/sudoku.css',
  './css/stats.css',
  './js/shared.js',
  './js/lightsout.js',
  './js/memory.js',
  './js/minesweeper.js',
  './js/wordsearch.js',
  './js/nback.js',
  './js/solitaire.js',
  './js/sudoku.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Strip query params for cache matching (HTML uses ?v= but cache stores without)
  const url = new URL(e.request.url);
  url.search = '';
  const cleanUrl = url.toString();

  e.respondWith(
    // Bypass Safari's HTTP cache with { cache: 'no-cache' }
    fetch(e.request, { cache: 'no-cache' })
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, clone);
          // Also store under clean URL for fallback matching
          cache.put(cleanUrl, response.clone());
        });
        return response;
      })
      .catch(() =>
        caches.match(e.request)
          .then((r) => r || caches.match(cleanUrl))
      )
  );
});
