const CACHE_NAME = 'media-gallery-cache-v1';

// Install Event: Activates the worker immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate Event: Cleans up old caches if you change the CACHE_NAME
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Fetch Event: Intercepts all network requests
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // STRATEGY A: Network First, fallback to cache (For API routes)
  // Ensures you see new uploads/folders when online, but keeps the old list if offline.
  if (
    url.pathname.includes('/storage') ||
    url.pathname.includes('/folders') ||
    url.pathname.includes('/files')
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If network succeeds, save a copy to cache
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          // If network fails (offline), return the cached API response
          // ignoreSearch ignores your pagination queries so it still matches
          return caches.match(request, { ignoreSearch: true });
        })
    );
    return;
  }

  // STRATEGY B: Cache First, fallback to network (For HTML, CSS, JS, Images, Videos)
  // If it's already downloaded, serve it instantly. Otherwise, fetch and cache.
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse; // Return offline saved file
        }

        // If not in cache, go to the network
        return fetch(request).then((networkResponse) => {
          // Only cache successful requests
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== 'basic'
          ) {
            return networkResponse;
          }

          // Save to cache for next time
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return networkResponse;
        });
      })
    );
  }
});
