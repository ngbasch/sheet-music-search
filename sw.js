'use strict';

const CACHE_NAME = 'sheet-music-v1';
const CORE_ASSETS = ['./', 'index.html', 'style.css', 'app.js', 'library/index.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});

// Cache-first for PDFs (so a book you've already opened works offline),
// network-first for everything else so app updates aren't stuck behind a stale cache.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isPdf = url.pathname.endsWith('.PDF') || url.pathname.endsWith('.pdf');

  if (isPdf) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
