/* Service worker — Eclipse sonoro 2027
   Cambiar CACHE_VERSION cada vez que se publiquen cambios en los archivos.
   El número ?v= de estilos y scripts debe ser el mismo que en index.html. */
const CACHE_VERSION = 'eclipse2027-v20';
/* Imprescindibles: si alguno falla, la instalación se reintenta en la próxima visita. */
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css?v=3.0',
  './js/i18n.js?v=3.0',
  './js/eclipse.js?v=3.0',
  './js/app.js?v=3.0'
];
/* Complementarios (fuentes e imágenes): si alguno falta o falla, la app se instala igual.
   Los íconos de la app no se guardan aquí: el navegador los obtiene del manifiesto al instalar. */
const EXTRAS = [
  './img/cc-by-nd.svg',
  './assets/poster.jpg',
  './img/sol/sdo-hmi-2026-11-16.jpg',
  './img/fotos/anillo-hinode-2011.jpg',
  './img/fotos/observadores-lentes-2023.jpg',
  './img/fotos/timelapse-poster.jpg',
  './img/logos/anep-dges-edytic.png',
  './img/logos/edytic-claro.png',
  './img/logos/edytic-oscuro.png',
  './fonts/atkinson-hyperlegible-latin-400-normal.woff2',
  './fonts/atkinson-hyperlegible-latin-400-italic.woff2',
  './fonts/atkinson-hyperlegible-latin-700-normal.woff2',
  './fonts/bricolage-grotesque-latin-wght-normal.woff2'
];
/* Los videos (MP4 o WebM, ≈4 MB) no se precargan aquí: la página pide el formato
   que el navegador puede reproducir y el service worker lo guarda al primer uso. */

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await cache.addAll(SHELL);
    await Promise.all(EXTRAS.map((url) => cache.add(url).catch(() => null)));
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
