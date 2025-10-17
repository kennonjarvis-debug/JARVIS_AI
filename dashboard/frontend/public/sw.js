// Minimal service worker to prevent 404 errors
// This can be expanded later for offline support, push notifications, etc.

const CACHE_NAME = 'jarvis-dashboard-v1';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, cache fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip WebSocket connections and SSE streams
  const url = new URL(event.request.url);
  if (url.protocol === 'ws:' || url.protocol === 'wss:' ||
      url.pathname.includes('/stream') ||
      url.pathname.includes('/ws')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful responses
        // Check: response exists, status is 200, and it's a basic/cors response
        if (!response || response.status !== 200) {
          return response;
        }

        // Don't cache opaque responses (cross-origin without CORS)
        if (response.type === 'opaque') {
          return response;
        }

        // Don't try to cache SSE streams or WebSocket upgrades
        const contentType = response.headers.get('content-type');
        if (contentType && (contentType.includes('text/event-stream') || contentType.includes('application/octet-stream'))) {
          return response;
        }

        // Clone the response (do this AFTER all checks to avoid unnecessary cloning)
        const responseToCache = response.clone();

        // Cache static assets only (not API responses to avoid cache.put errors on streaming/SSE)
        if (!url.pathname.startsWith('/api/') && !url.pathname.includes('_next/data')) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch((err) => {
              // Silently ignore caching errors
              console.log('[Service Worker] Cache put failed (expected for some responses):', err.message);
            });
          });
        }

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((response) => {
          return response || new Response('Offline - No cached data available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});

console.log('[Service Worker] Loaded');
