/*
 * ÚNICA fuente de la versión del álbum. La usan la página y el service worker.
 * Cada vez que cambies CUALQUIER archivo de la app (cromos, imágenes, estilos...)
 * sube APP_VERSION y agrega una nota: así los visitantes ven el aviso "Nueva versión".
 */
self.APP_VERSION = '1.1.0';
self.APP_NOTES = [
    '¡Cromo de bienvenida de regalo!',
    'Nuevo cromo homenaje. Ahora son 18 cromos para coleccionar.'
];
