// Minimal service worker -- required by Chrome/Android for a site to be
// installable as a PWA. Deliberately does NOT cache the dashboard's data
// (that would show stale bot7 status when reopened) -- it only exists to
// satisfy the installability requirement.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
});

// Pass-through fetch handler -- required for Chrome to consider this a
// valid service worker, but intentionally does no caching of its own.
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
