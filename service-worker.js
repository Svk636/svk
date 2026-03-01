/* =============================================================================
   SVK Blueprint — Service Worker v2.5.0
   =============================================================================
   DEPLOYMENT: Commit this file alongside index.html in your GitHub repo.
   Both files must be at the same directory level.

   TO UPDATE: bump SW_VERSION to match APP_VERSION in index.html, then
   commit both files. Or use the ⬇ sw.js button in the app (SYSTEM tab).
   ============================================================================= */

const SW_VERSION = '2.5.0';
const CACHE_NAME = 'svk-blueprint-v' + SW_VERSION;

// INSTALL: cache app shell. Do NOT skipWaiting — page controls activation timing.
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            cache.addAll(['./index.html', './', './manifest.json']).catch(() => {})
        )
    );
});

// ACTIVATE: purge old caches, claim clients, notify all tabs.
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
            .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
            .then(clients => clients.forEach(c =>
                c.postMessage({ type: 'SW_ACTIVATED', version: SW_VERSION })
            ))
    );
});

// FETCH: Never cache sw.js (must always be fresh for update detection).
// Network-first for HTML navigation. Cache-first for all other assets.
self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;
    const url = new URL(e.request.url);

    // CRITICAL: Never serve sw.js from cache — browser must fetch it fresh
    // every time so it can detect byte changes and trigger update flow.
    if (url.pathname.endsWith('sw.js')) {
        e.respondWith(fetch(e.request));
        return;
    }

    // Network-first for page navigation (always serve fresh index.html)
    if (e.request.mode === 'navigate') {
        e.respondWith(
            fetch(e.request).catch(() => caches.match('./index.html'))
        );
        return;
    }

    // Cache-first for all other assets
    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;
            return fetch(e.request).then(response => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
                }
                return response;
            }).catch(() => caches.match('./index.html'));
        })
    );
});

// MESSAGE: page sends { type: 'SKIP_WAITING' } when user clicks "Reload Now".
// skipWaiting → controllerchange fires on page → page reloads with new version.
self.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
