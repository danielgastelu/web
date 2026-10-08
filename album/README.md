# Álbum de cromos — Feria de Ciencias (PWA)

Álbum virtual instalable que funciona sin conexión. Los visitantes ingresan los códigos de 4 letras
que encuentran en los stands para desbloquear cromos.

## Estructura
- `index.html` — página única
- `css/styles.css` — estilos y paleta
- `js/cromos.js` — catálogo (códigos, textos, créditos de las fotos)
- `js/version.js` — versión y novedades (única fuente de verdad)
- `js/app.js` — lógica · `js/confetti.js` — papel picado
- `sw.js` — service worker (caché offline + detección de versiones)
- `img/p<id>.webp` — retratos 320×320 de Wikimedia Commons
- `icons/`, `fonts/`, `manifest.webmanifest`

## Publicar una versión nueva (p. ej. más cromos)
1. Agrega el cromo en `js/cromos.js` con un **id nuevo** y su imagen en `img/p<id>.webp`.
2. Sube `APP_VERSION` en `js/version.js` y describe el cambio en `APP_NOTES`.
3. Publica. Quienes tengan el álbum abierto verán “¡Nueva versión!” con un botón **Actualizar**;
   su progreso se conserva.

## Pruebas
- Debe servirse por `https://` o `http://localhost` (el service worker no funciona con `file://`).
  Ejemplo: `python -m http.server 8765`
- Agrega `?test` a la URL para ver el botón “Reiniciar álbum”.
