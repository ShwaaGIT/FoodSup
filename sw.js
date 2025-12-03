const CACHE_NAME = 'gabba-cache-v1';
const APP_SHELL = [
  './',
  './index.html',
  './sw.js',
  './manifest.webmanifest',
  // Local fallback for XLSX (include the file in your repo for full offline import)
  './xlsx.full.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Navigation fallback: always serve cached index.html when offline navigations occur
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(async () => {
        const indexUrl = new URL('./index.html', self.location);
        const cached = await caches.match(indexUrl.pathname, { ignoreSearch: true }) || await caches.match(indexUrl.href, { ignoreSearch: true });
        return cached || Response.error();
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        // Optionally cache same-origin GETs
        try {
          const url = new URL(req.url);
          const sameOrigin = url.origin === self.location.origin;
          if (sameOrigin && req.method === 'GET') {
            const respClone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, respClone)).catch(() => {});
          }
        } catch (_) {}
        return resp;
      }).catch(() => cached || Response.error());
    })
  );
});
