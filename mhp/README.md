# Misión Helios (PWA)

Aplicación web educativa: leer el contexto, marcar manchas y grupos solares en imágenes reales del Sol, calcular el número de Wolf y compararlo con el registro histórico (SILSO). Sin servidor, sin cuentas, sin dependencias externas: todo el código, las tipografías y las traducciones (es, en, fr, it, pt, de) están dentro de esta carpeta.

## Antes de publicar
1. Completá `ABOUT` en `js/config.js` (siteUrl, institution, contact). Mientras estén vacíos, «Acerca de» muestra «Por completar por el equipo».
2. Corré `node tools/stamp_sw.js` desde esta carpeta. Escribe la versión y la lista de archivos en `sw.js`. Repetilo después de **cada** cambio: así las personas reciben el aviso «Actualizar».
3. Subí la carpeta completa a cualquier hosting estático con **HTTPS** (GitHub Pages, Netlify, servidor del liceo, etc.). El service worker y la instalación como app requieren HTTPS.

## Probar en local
`python3 -m http.server 8123` y abrir `http://localhost:8123/` (localhost también permite service worker).

## Estructura
- `index.html`: las 4 vistas (Misión, Observar, Datos, Acerca de).
- `js/strings.js`: todos los textos en los 6 idiomas. Para editar uno, buscá su clave dentro del idioma.
- `js/config.js`: parámetros (R mínimo para k, aumentos de la lupa, rango de fechas, datos de «Acerca de»).
- `js/silso.js`: serie histórica; `tools/silso_to_js.js` la regenera.
- `sw.js`, `manifest.webmanifest`, `icons/`: PWA. Las imágenes del Sol (NASA) nunca se guardan en caché.

## Datos y licencias
- Imágenes: SOHO/HMI (NASA/ESA), pedidas directamente al archivo público.
- Serie histórica: SILSO, Real Observatorio de Bélgica (CC BY-NC 4.0); valores tomados de la tabla del Bureau of Meteorology de Australia, que la redistribuye.
- Tipografías: Fraunces y Atkinson Hyperlegible (SIL OFL), autoalojadas en `fonts/`.
- Los datos de ejemplo del laboratorio son simulados y están rotulados como tales.
