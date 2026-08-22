const CACHE_NAME = 'glass-converter-cache-v1';
const OFFLINE_URL = '/index.html';

// Basic core assets to cache instantly during installation
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/src/main.tsx',
  '/src/index.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // We only intercept GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Exclude Firebase Auth, database connections, and backend API routes from service worker interception
  if (url.pathname.startsWith('/api/') || url.origin.includes('firestore.googleapis.com') || url.pathname.includes('identitytoolkit')) {
    return;
  }

  // Handle SPA routing navigation requests (e.g. /pdf_converter, /image_converter, etc.)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(OFFLINE_URL) || caches.match('/');
        })
    );
    return;
  }

  // Dynamic Stale-While-Revalidate or Network-First caching strategy for resources
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // If response is valid, clone and cache it for future offline usage
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Silent fallback on network failures
          return null;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
