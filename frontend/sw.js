const CACHE_NAME = 'my-site-cache-v1';

// Add all the URLs you want to cache for offline use
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/api/home',
  '/api/movies/trending',
  '/api/movies/now-playing',
  '/api/movies/popular',
  '/api/movies/top-rated',
  '/api/movies/upcoming',
  '/api/tv/popular',
  '/api/tv/top-rated'

  // Add your images, fonts, other pages, etc.
  // '/logo.png',
  // '/about.html',
];

// ─── INSTALL: Pre-cache core assets ───
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching core assets');
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting(); // Activate immediately
});

// ─── ACTIVATE: Clean up old caches ───
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim(); // Take control of all pages immediately
});

// ─── FETCH: Serve from cache, fall back to network ───
// Strategy: "Stale While Revalidate"
//   → Serve cached version instantly (fast!)
//   → Fetch fresh version in background and update cache
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Start a network fetch in the background to update the cache
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          // Only cache valid responses
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Network failed — if we don't have a cached version either,
          // return a custom offline page (optional)
          if (!cachedResponse) {
            return caches.match('/offline.html');
          }
        });

      // Return cached version immediately, or wait for network
      return cachedResponse || networkFetch;
    })
  );
});