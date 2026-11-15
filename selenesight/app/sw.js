// Service worker: app shell + datos núcleo precacheados; horizontes se guardan al usarse.
const V = 'selenesight-v13', DATA = 'selenesight-data-v2';   // v7: topografía hasta 80°S (horizontes nuevos)
const CORE = ['./', 'index.html', 'styles.css', 'fonts/barlow-condensed-latin-500-normal.woff2', 'fonts/barlow-condensed-latin-600-normal.woff2', 'app.js', 'i18n.js', 'manifest.webmanifest', 'lib/three.module.min.js', 'lib/OrbitControls.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'data/meta.json', 'data/eph.bin', 'data/relief.png', 'data/terrain512.bin', 'data/terrain2048.bin',
  'data/L10_pts.bin', 'data/L10_vis.bin', 'data/L5_pts.bin', 'data/L5_vis.bin', 'data/L2_pts.bin', 'data/L2_vis.bin', 'data/L10_long.bin', 'data/L5_long.bin', 'data/L2_long.bin', 'data/R40_pts.bin', 'data/R40_vis.bin', 'data/R40_long.bin', 'data/hz/R40_0.bin'];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== DATA).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url); if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
    if (r.ok && url.pathname.includes('/data/hz/')) { const cp = r.clone(); caches.open(DATA).then(c => c.put(e.request, cp)); }
    return r;
  })));
});
