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

## Versión 1.5–1.6 (octubre de 2026)
- Sonido: vista previa «Escuchar el eclipse en 1 minuto», campanitas en el anillo de fuego, notas melódicas con rango reducido (±2 semitonos) u opción de tono continuo, vibración en los cambios de fase (Android) y aviso sonoro al apoyar o levantar el teléfono.
- Botón «¿Cómo va el eclipse?»: estado a pedido. El relato automático solo anuncia fases y 25 %, 50 % y 75 % de cobertura.
- Sensor de luz: se desactiva (en gris, con el motivo) en PC/laptop y en navegadores sin acceso al sensor.
- Secciones «¿Qué es la sonificación?» y «Un antecedente: LightSound» (Técnica) y referencias en Créditos.

## Rendimiento y Lighthouse
Resultado medido (servidor con compresión, como GitHub Pages): celular 99 de rendimiento y 100 en
accesibilidad, buenas prácticas y SEO; computadora 100 en todo.
- **Textos en el HTML:** `index.html` ya trae los textos en español, así la página se ve completa antes
  de que cargue el script. Las traducciones «oficiales» siguen en `js/i18n.js`: si se cambia un texto en
  español allí, conviene cambiarlo también en `index.html` (si no, se ve el anterior por un instante).
- Si el idioma no es español, un script breve en el `<head>` oculta la página hasta traducirla (máx. 3 s),
  para que no «salte».
- Fuente de respaldo con el mismo ancho que Source Sans 3 y precarga de las variantes 400 y 700.
- Las portadas de los videos se cargan al abrir la pestaña Simulación; los logotipos de Créditos, al verlos.
- El aviso «Instalar la app» flota sobre la barra inferior y no desplaza el contenido.
- Pendientes que dependen del alojamiento y no del código: tiempos de caché del servidor (GitHub Pages usa
  10 minutos; el service worker ya guarda todo en el teléfono) y minificar los scripts (se dejaron legibles
  a propósito para poder editarlos).

## Estadísticas de uso
- GoatCounter (`danielgastelu.goatcounter.com`): cuenta visitas sin cookies y sin guardar IP ni datos
  personales. Lo informa el apartado «Privacidad» de Créditos. Si se quita el script, actualizar ese texto.
- Los bloqueadores de anuncios pueden impedir el conteo: las cifras son una estimación mínima.
