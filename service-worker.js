const CACHE_VERSION = 'svk-blueprint-v2.3';
const CACHE_NAME = `${CACHE_VERSION}-static`;

const STATIC_ASSETS = [
    '/svk/',
    '/svk/index.html',
    '/svk/manifest.json',
    '/svk/styles.css',
    '/svk/app.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames =>
            Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;

    if (request.mode === 'navigate') {
        event.respondWith(
            caches.match('/svk/index.html')
        );
        return;
    }

    event.respondWith(
        caches.match(request)
            .then(response => response || fetch(request)
                .then(networkResponse => {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => cache.put(request, clone));
                    return networkResponse;
                })
            )
    );
});
