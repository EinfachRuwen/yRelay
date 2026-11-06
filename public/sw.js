const CACHE_NAME = 'yrelay-cache-v4';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/css/style.css',
  '/js/app.js',
  '/js/api.js',
  '/js/ui.js',
  '/js/views/admin.js',
  '/js/views/dashboard.js',
  '/js/views/einladung.js',
  '/js/views/login.js',
  '/js/views/reset.js',
  '/js/views/schuldashboard.js',
  '/js/views/games.js',
  '/img/logo.png',
  '/img/logo.svg',
  '/img/icons.svg',
  '/fonts/schild-regular.woff2',
  '/fonts/schild-bold.woff2',
  '/fonts/schild-italic.woff2',
  '/fonts/schild-condensed-bold.woff2',
  '/sounds/doorbell.mp3',
  '/sounds/sos.mp3',
  '/sounds/deadline.mp3',
  '/sounds/wakeup.mp3',
  '/sounds/radar.mp3'
];

// Installieren und Assets cachen
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.log('Fehler beim Cachen:', err));
    })
  );
  self.skipWaiting();
});

// Aktivieren und alte Caches löschen
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch-Event: Stale-While-Revalidate für statische Assets, Network-First für API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // API Calls nicht cachen
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Statische Assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {});

      return cachedResponse || fetchPromise;
    })
  );
});
