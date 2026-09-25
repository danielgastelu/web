// Service worker de Misión Helios: guarda la app para usarla sin conexión.
// Las imágenes del Sol (NASA) y cualquier otro origen NO se guardan: siempre van a la red.
// La lista de archivos y la versión las escribe tools/stamp_sw.js; no las edites a mano.
const VERSION = /*VERSION*/'helios-f59d9f3d91'/*END_VERSION*/;
const SHELL = /*SHELL*/[
  "./",
  "css/app.css",
  "fonts/atkinson-hyperlegible-latin-400-italic.woff2",
  "fonts/atkinson-hyperlegible-latin-400-normal.woff2",
  "fonts/atkinson-hyperlegible-latin-700-normal.woff2",
  "fonts/fraunces-latin-wght-italic.woff2",
  "fonts/fraunces-latin-wght-normal.woff2",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/icon.svg",
  "index.html",
  "js/app.js",
  "js/chart.js",
  "js/config.js",
  "js/csv.js",
  "js/datalab.js",
  "js/dom.js",
  "js/flags.js",
  "js/i18n.js",
  "js/kdialog.js",
  "js/kinput.js",
  "js/observatory.js",
  "js/silso.js",
  "js/store.js",
  "js/strings.js",
  "js/sun.js",
  "manifest.webmanifest"
]/*END_SHELL*/;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)));
  // No se llama a skipWaiting() acá: la versión nueva espera a que la persona toque «Actualizar».
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('helios-') && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('index.html').then(hit => hit || fetch(req))
    );
    return;
  }
  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
