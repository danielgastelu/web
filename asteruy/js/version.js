/*
 * ÚNICA fuente de la versión del álbum. La usan la página y el service worker.
 * Cada vez que cambies CUALQUIER archivo de la app (cromos, imágenes, estilos...)
 * sube APP_VERSION y agrega una nota: así los visitantes ven el aviso "Nueva versión".
 */
self.APP_VERSION = '1.1.1';
self.APP_NOTES = [
    '¡40 cromos: 39 asteroides con nombres uruguayos y un cromo de regalo!',
    'El cromo N.º 01 se gana al instalar el álbum.',
    'Funciona sin conexión.',
    'Disponible en español, inglés, francés, portugués, italiano y alemán.',
    'Nueva sección «Instituciones» en Fuentes y créditos.'
];
