/* =============================================================================
   SVK Blueprint — Service Worker v2.5.0
   =============================================================================
   DEPLOYMENT: Commit this file alongside index.html in your GitHub repository.
   Both files must be at the same directory level.

   HOW IT WORKS:
   - index.html registers this file as the service worker (same-origin = all browsers)
   - On version bump: update SW_VERSION below to match APP_VERSION in index.html
   - The browser detects the byte change, installs the new worker
   - The update banner in the app shows "Reload Now"
   - User clicks Reload Now → skipWaiting → controllerchange → page reloads
   ============================================================================= */

const SW_VERSION = '2.5.0';
const CACHE_NAME = 'svk-blueprint-v' + SW_VERSION;

// INSTALL: cache the app shell. Do NOT call skipWaiting here —
// the page controls when the new SW activates so it can show the update banner.
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            cache.addAll(['./index.html', './']).catch(() => {})
        )
    );
    // Intentionally NOT calling self.skipWaiting()
});

// ACTIVATE: delete old caches, claim all clients, then notify every open tab.
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then(keys =>
                Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
            )
            .then(() => self.clients.claim())
            .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
            .then(clients =>
                clients.forEach(c => c.postMessage({ type: 'SW_ACTIVATED', version: SW_VERSION }))
            )
    );
});

// FETCH: network-first for HTML navigation (always serve fresh app shell),
// cache-first for all other assets (JS, CSS, images, fonts).
self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;

    // Navigation: always try network first so the user gets the latest index.html
    if (e.request.mode === 'navigate') {
        e.respondWith(
            fetch(e.request).catch(() => caches.match('./index.html'))
        );
        return;
    }

    // Assets: serve from cache, update in background
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

// MESSAGE: the page sends { type: 'SKIP_WAITING' } when the user clicks "Reload Now".
// skipWaiting → this SW becomes active → controllerchange fires on the page → reload.
self.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
