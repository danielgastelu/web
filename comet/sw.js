// sw.js — service worker de Sungrazer Hunter.
// Cachea el "app shell" para que la app abra y funcione offline (revisar sesiones y
// reportes ya guardados), y cachea oportunistamente los cuadros de imagen ya vistos
// para poder revisarlos sin conexión. Las imágenes NUEVAS siguen necesitando red.

// IMPORTANTE: subir este número en cada actualización real de la app. Es lo que hace que
// el navegador detecte "este sw.js cambió" y reemplace la versión instalada — sin este
// cambio de contenido, un usuario que ya visitó la app antes puede quedar viendo
// index.html/app.js viejos indefinidamente por más que se suba una versión nueva al servidor.
const CACHE_VERSION = "sg-hunter-v2";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./js/app.js",
  "./js/helioviewer.js",
  "./js/coords.js",
  "./js/storage.js",
  "./js/report.js",
  "./js/zip.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("sg-hunter-") && k !== SHELL_CACHE && k !== IMAGE_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
      // Avisa a las pestañas abiertas que este SW nuevo tomó control, para poder ofrecer
      // recargar y mostrar la versión al día sin que el usuario tenga que enterarse solo.
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) => clients.forEach((c) => c.postMessage({ type: "SG_HUNTER_UPDATED" })))
  );
});

function isHelioviewerImage(url) {
  return url.hostname.endsWith("helioviewer.org") && url.pathname.includes("takeScreenshot");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Imágenes de Helioviewer: cache-first con actualización en segundo plano.
  if (isHelioviewerImage(url)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const networkFetch = fetch(req)
          .then((resp) => {
            if (resp && resp.status === 200) cache.put(req, resp.clone());
            return resp;
          })
          .catch(() => null);
        return cached || (await networkFetch) || new Response("", { status: 504 });
      })
    );
    return;
  }

  // Recursos propios de la app (HTML/CSS/JS): red primero, con el caché como respaldo
  // offline. Así, con conexión, siempre se ve la versión publicada más reciente — el
  // caché sólo entra en juego si no hay red (para poder seguir usando la app offline).
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp && resp.status === 200) {
            const copy = resp.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(req, copy));
          }
          return resp;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }
});
