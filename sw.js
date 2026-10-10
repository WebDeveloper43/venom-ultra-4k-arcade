/* Service Worker for Offline Mobile Play & Play Store PWA */
const CACHE_NAME = 'venom-arcade-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './styles/main.css',
  './styles/hub.css',
  './styles/modal.css',
  './styles/car-game.css',
  './styles/tictactoe.css',
  './styles/carrom.css',
  './styles/pool.css',
  './styles/ludo.css',
  './styles/chess.css',
  './styles/fruit-ninja.css',
  './styles/subway.css',
  './js/audio.js',
  './js/particles.js',
  './js/online.js',
  './js/hub.js',
  './js/games/subway.js',
  './js/games/car.js',
  './js/games/tictactoe.js',
  './js/games/carrom.js',
  './js/games/pool.js',
  './js/games/ludo.js',
  './js/games/chess.js',
  './js/games/fruit-ninja.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
