/*
 * Service worker for the school site (works from the root of a domain or from a sub-folder).
 * - Installs the app shell (page, manifest and icons) so the site opens offline too.
 * - Pages: network first (newest version when online), cached copy when offline.
 * - Other same-origin files: cache first, then network.
 * - Other origins (CDNs, Firebase, APIs): always the network, never cached here.
 */
const CACHE = 'nakhapara-shell-v4';
const BASE = new URL('./', self.location.href).href;
const PAGE = new URL('./index.html', self.location.href).href;
const SHELL = [
  BASE,
  PAGE,
  new URL('./manifest.json', self.location.href).href,
  new URL('./icon-192.png', self.location.href).href,
  new URL('./icon-512.png', self.location.href).href,
  new URL('./icon-maskable-512.png', self.location.href).href
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(PAGE, copy));
          return res;
        })
        .catch(() => caches.match(PAGE))
    );
    return;
  }

  event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
