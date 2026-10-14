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
- `img/p<id>.webp` — retratos 320×320 (Wikimedia Commons, imagen institucional e ilustración propia del cromo de bienvenida)
- `icons/`, `fonts/`, `manifest.webmanifest`

## Publicar una versión nueva (p. ej. más cromos)
1. Agrega el cromo en `js/cromos.js` con un **id nuevo** y su imagen en `img/p<id>.webp`.
2. Sube `APP_VERSION` en `js/version.js` y describe el cambio en `APP_NOTES`.
3. Publica. Quienes tengan el álbum abierto verán “¡Nueva versión!” con un botón **Actualizar**;
   su progreso se conserva.

## Cromo de bienvenida
- Es el primero del álbum (#01) y tiene `gift: true`: se regala solo la primera vez que alguien abre el álbum
  (también a quienes ya lo tenían, al actualizar). No tiene código.
- El número visible de cada cromo sale de su lugar en la lista de `js/cromos.js`; el `id` no cambia nunca.

## Estadísticas (GoatCounter)
Panel: https://danielgastelu.goatcounter.com/ — sin cookies. Se registra, con el prefijo `/album-feria/`:
- `abierto-app` / `abierto-navegador` — visitas (desde la app instalada o desde el navegador)
- `instalacion` — evento al instalar (Android y Chrome/Edge de escritorio; iPhone no avisa)
- `cromo-01` … `cromo-18` — evento al desbloquear cada cromo · `album-completo`
No cuenta en `localhost` ni con `?test`. Sin internet, ese conteo se pierde.

## Pruebas
- Debe servirse por `https://` o `http://localhost` (el service worker no funciona con `file://`).
  Ejemplo: `python -m http.server 8765`
- Agrega `?test` a la URL para ver el botón “Reiniciar álbum”.
