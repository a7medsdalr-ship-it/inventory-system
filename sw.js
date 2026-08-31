// sw.js - Enterprise Network-First Service Worker (Auto Cache-Busting)
const CACHE_NAME = 'inventory-app-v' + Date.now();

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(keys.map((k) => caches.delete(k)));
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Always fetch fresh network first
    event.respondWith(
        fetch(event.request).then((response) => {
            return response;
        }).catch(() => {
            return caches.match(event.request);
        })
    );
});
