const CACHE_NAME = 'brain-games-v54';
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
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
