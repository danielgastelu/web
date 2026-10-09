/*
 * Service worker: guarda toda la app en caché para que funcione sin conexión y al instante.
 * La versión viene de js/version.js; al cambiarla el navegador detecta una actualización
 * y la página muestra el aviso "Nueva versión".
 */
// Los scripts importados también se comparan byte a byte: editar cromos.js ya dispara una actualización.
importScripts('js/version.js', 'js/cromos.js', 'js/i18n.js');

const CACHE = 'asteruy-' + self.APP_VERSION;

const ASSETS = [
    './',
    'index.html',
    'manifest.webmanifest',
    'css/styles.css',
    'js/version.js',
    'js/cromos.js',
    'js/i18n.js',
    'js/space.js',
    'js/confetti.js',
    'js/app.js',
    'fonts/fredoka-latin.woff2',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/maskable-192.png',
    'icons/maskable-512.png',
    'icons/apple-touch-icon.png',
    'icons/favicon-48.png',
    ...CROMOS.map(f => `img/p${f.id}.webp`)
];

self.addEventListener('install', event => {
    // 'reload' evita que se guarden copias viejas del caché HTTP del navegador
    event.waitUntil(
        caches.open(CACHE).then(cache =>
            cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' }))))
    );
    // No hacemos skipWaiting aquí: esperamos a que la persona toque "Actualizar".
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys
            .filter(key => key.startsWith('asteruy-') && key !== CACHE)
            .map(key => caches.delete(key)));
        await self.clients.claim();
    })());
});

self.addEventListener('message', event => {
    if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
    if (event.data?.type === 'GET_VERSION') {
        event.ports[0]?.postMessage({ version: self.APP_VERSION, notes: self.APP_NOTES });
    }
});

// Cache-first: la app responde al instante y sin internet.
self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;

    event.respondWith((async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });
        if (cached) return cached;
        try {
            const response = await fetch(request);
            if (response.ok) cache.put(request, response.clone());
            return response;
        } catch (err) {
            if (request.mode === 'navigate') return cache.match('index.html');
            throw err;
        }
    })());
});
