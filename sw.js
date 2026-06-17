/* ============================================
   SW.JS — Service Worker with versioning
   Update CACHE_VERSION when deploying changes.
   Old caches are auto-deleted on activate.
   ============================================ */

const CACHE_VERSION = 'bni-proposal-v1.4.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './config.json',
  './css/base.css',
  './icons/logo-danantara.png',
  './icons/logo-bni.png',
  './css/deck.css',
  './css/calc.css',
  './js/deck.js',
  './js/config.js',
  './js/calc.js',
  './js/share.js',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_VERSION)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();

  // Notify all open clients that a new version is available
  self.clients.matchAll({ type: 'window' }).then(clients => {
    clients.forEach(client => client.postMessage({ type: 'UPDATE_AVAILABLE', version: CACHE_VERSION }));
  });
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cache successful GET requests
        if (e.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
