# Sonificación Eclipse 2027 (PWA)

Aplicación web instalable (PWA) sobre el eclipse solar anular del 6 de febrero de 2027.

## Estructura
- `index.html`: la aplicación (secciones: Sonido, Simulación, Técnica, Seguridad, Créditos).
- `css/styles.css`: estilos (modo estándar y alto contraste).
- `js/i18n.js`: textos en español, portugués, inglés, francés, italiano y alemán.
- `js/app.js`: lógica (idiomas, sonificación, simulación, instalación).
- `sw.js`: service worker (funcionamiento sin conexión).
- `manifest.webmanifest`, `icons/`: datos e íconos de la app instalada.
- `assets/`: animación global de Espenak & Zeiler en MP4 y WebM (mismo contenido que el GIF original, sin alteraciones; ~4 MB cada uno, el navegador descarga solo uno) y la imagen de portada.
- `img/logos/`: logotipo ANEP · Educación Secundaria · Espacio de Educación y TIC (archivo oficial del sitio de EDyTIC, versión en blanco para fondo oscuro) y logotipo de EDyTIC con contraste ajustado (oscuro para fondo claro y claro para alto contraste).
- `img/fotos/` y `assets/timelapse-anular-2019.*`: fotografías y time-lapse de Wikimedia Commons (créditos y licencias en la sección Créditos de la app). El time-lapse (CC BY-SA 4.0) está recortado alrededor del Sol y recodificado, y se distribuye con la misma licencia.
- `fonts/`: tipografía Source Sans 3 (licencia SIL OFL, `fonts/OFL.txt`), indicada por el manual de identidad de ANEP.
- `eclipse2027.html`: redirige a `index.html` (el archivo anterior quedó en `legacy/`).

## Publicación
- Debe servirse por **HTTPS** (por ejemplo, GitHub Pages). Abriendo el archivo con doble clic (`file://`) no se instala ni funciona sin conexión.
- Cada vez que se modifique algún archivo, cambiar `CACHE_VERSION` en `sw.js` (por ejemplo `eclipse2027-v2`) para que los celulares reciban la actualización.
- El GIF original (`2027_02_06_ASE_800px.gif`, 86 MB) ya no es necesario para la app y conviene no subirlo al repositorio.

## Simulación
La animación tiene 364 cuadros, uno por minuto, desde las 12:58 UT hasta las 19:01 UT
(09:58 a 16:01, hora de Uruguay, GMT−3). La app muestra la fecha y la hora en GMT−3 de cada cuadro.

## Accesibilidad (versión 1.1)
- Enlace «Saltar al contenido», regiones y títulos para cada sección; al cambiar de sección el foco pasa al título.
- Los emojis decorativos están ocultos para los lectores de pantalla.
- Avisos hablados (región `status`): cambios de fase y cobertura cuando el relato por voz está desactivado, y hora y fase en Punta del Este al moverse por la simulación.
- Simulación: descripción textual de la animación, lista de «Momentos clave» y atajos de teclado limitados al reproductor.
- Enlaces externos avisan que se abren en otra pestaña. Contrastes verificados con axe-core (WCAG 2.2 AA) en modo estándar y alto contraste.
