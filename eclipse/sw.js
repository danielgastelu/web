/* Service worker — Sonificación Eclipse 2027
   Cambiar CACHE_VERSION cada vez que se publiquen cambios en los archivos. */
const CACHE_VERSION = 'eclipse2027-v7';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/i18n.js',
  './js/app.js',
  './img/cc-by-nd.svg',
  './img/flags/uy.svg', './img/flags/br.svg', './img/flags/gb.svg',
  './img/flags/fr.svg', './img/flags/it.svg', './img/flags/de.svg',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon-48.png',
  './assets/poster.jpg',
  './img/fotos/anillo-hinode-2011.jpg', './img/fotos/observadores-lentes-2023.jpg', './img/fotos/timelapse-poster.jpg', './img/fotos/anillo-edzna-2023.jpg',
  './img/logos/anep-dges-edytic.png', './img/logos/edytic-claro.png', './img/logos/edytic-oscuro.png',
  './fonts/source-sans-3-latin-400-normal.woff2', './fonts/source-sans-3-latin-400-italic.woff2',
  './fonts/source-sans-3-latin-600-normal.woff2', './fonts/source-sans-3-latin-700-normal.woff2'
];
/* Los videos (MP4 o WebM, ≈4 MB) no se precargan aquí: la página pide el formato
   que el navegador puede reproducir y el service worker lo guarda al primer uso. */

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await cache.addAll(SHELL);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

const pendingVideos = new Map();

/* Responde peticiones con rango (Range) desde la caché: Safari las exige para reproducir video. */
async function rangeResponse(request, response) {
  const blob = await response.blob();
  const size = blob.size;
  const m = /bytes=(\d*)-(\d*)/.exec(request.headers.get('range') || '');
  let start = m && m[1] ? parseInt(m[1], 10) : 0;
  let end = m && m[2] ? parseInt(m[2], 10) : size - 1;
  if (m && !m[1] && m[2]) { start = Math.max(0, size - parseInt(m[2], 10)); end = size - 1; }
  end = Math.min(end, size - 1);
  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'video/mp4',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes'
    }
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // recursos externos: red normal

  // Video: caché primero, con soporte de rangos
  if (/\.(mp4|webm)$/.test(url.pathname)) {
    // Siempre se responde desde la caché (con rangos). Mezclar respuestas de red y de caché
    // en una misma reproducción hace fallar el video en Chrome, por eso, si aún no está
    // guardado, primero se descarga completo (una sola vez) y luego se sirve desde la caché.
    const key = url.origin + url.pathname;
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      let cached = await cache.match(key);
      if (!cached) {
        if (!pendingVideos.has(key)) {
          pendingVideos.set(key, (async () => {
            try {
              const full = await fetch(key);
              if (full.ok && full.status === 200) await cache.put(key, full);
            } finally { pendingVideos.delete(key); }
          })());
        }
        try { await pendingVideos.get(key); } catch (e) { /* sin conexión */ }
        cached = await cache.match(key);
      }
      if (!cached) return fetch(req);
      return req.headers.has('range') ? rangeResponse(req, cached) : cached;
    })());
    return;
  }

  // Navegación: red primero (para recibir actualizaciones), caché como respaldo
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_VERSION);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (e) {
        return (await caches.match('./index.html')) || (await caches.match('./'));
      }
    })());
    return;
  }

  // Resto: caché primero, actualizando en segundo plano
  event.respondWith((async () => {
    const cached = await caches.match(req);
    const network = fetch(req).then(async (res) => {
      if (res && res.ok && res.status === 200) {
        const cache = await caches.open(CACHE_VERSION);
        cache.put(req, res.clone());
      }
      return res;
    }).catch(() => null);
    return cached || (await network) || Response.error();
  })());
});
