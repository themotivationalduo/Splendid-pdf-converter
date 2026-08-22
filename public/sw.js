const CACHE_NAME = 'glass-converter-cache-v2';
const OFFLINE_URL = '/index.html';

// Core essential assets for instantaneous boot and offline experience
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/pdf_converter',
  '/data_converter',
  '/image_converter',
  '/system_converter'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('Initial cache preload warning (non-fatal):', err);
      });
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
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Exclude Firebase Auth, Firestore queries, and backend API routes
  if (
    url.pathname.startsWith('/api/') ||
    url.origin.includes('firestore.googleapis.com') ||
    url.origin.includes('identitytoolkit.googleapis.com') ||
    url.origin.includes('securetoken.googleapis.com')
  ) {
    return;
  }

  // Handle SPA routing navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(OFFLINE_URL) || caches.match('/');
        })
    );
    return;
  }

  // Dynamic Stale-While-Revalidate caching pattern
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});
