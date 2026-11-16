# Eclipse sonoro 2027 (PWA)

Aplicación web instalable (PWA) sobre el eclipse solar anular del 6 de febrero de 2027.

## Estructura
- `index.html`: la aplicación (secciones: En vivo, Escuchar, Simulación, Ayuda, Seguridad, Créditos).
- `css/styles.css`: estilos (modo claro, modo noche y alto contraste).
- `js/i18n.js`: textos en español, portugués, inglés, francés, italiano y alemán.
- `js/app.js`: lógica (idiomas, sonificación, simulación, instalación).
- `js/eclipse.js`: cálculo del eclipse para cualquier lugar (elementos besselianos).
- `sw.js`: service worker (funcionamiento sin conexión).
- `manifest.webmanifest`, `icons/`: datos e íconos de la app instalada.
- `assets/`: animación global de Espenak & Zeiler en MP4 y WebM (mismo contenido que el GIF original, sin alteraciones; ~4 MB cada uno, el navegador descarga solo uno) y la imagen de portada.
- `img/logos/`: logotipo ANEP · Educación Secundaria · Espacio de Educación y TIC (archivo oficial del sitio de EDyTIC, versión en blanco para fondo oscuro) y logotipo de EDyTIC con contraste ajustado (oscuro para fondo claro y claro para alto contraste).
- `img/fotos/` y `assets/timelapse-anular-2019.*`: fotografías y time-lapse de Wikimedia Commons (créditos y licencias en la sección Créditos de la app). El time-lapse (CC BY-SA 4.0) está recortado alrededor del Sol y recodificado, y se distribuye con la misma licencia.
- `fonts/`: tipografías Bricolage Grotesque (títulos) y Atkinson Hyperlegible (texto), las mismas del portal «Astronomía para todos»; ambas con licencia SIL OFL (`fonts/OFL-*.txt`). Los archivos `source-sans-3-*` y `OFL.txt` son de la versión anterior y ya no se usan: se pueden borrar.
- `legacy/v1.6/`: copia de la versión 1.6 completa (HTML, CSS y scripts) tal como estaba antes del rediseño.
- `eclipse2027.html`: redirige a `index.html` (el archivo anterior quedó en `legacy/`).

## Versión 2.0 (noviembre de 2026)
- **Diseño:** paleta y tipografías del portal «Astronomía para todos», menos elementos por pantalla, secciones
  plegables en Simulación, Técnica y Créditos, íconos lineales en lugar de emojis (los emojis de `js/i18n.js`
  se quitan al mostrar los textos; no hace falta editarlos).
- **Apariencia:** botón «Modo noche / Modo claro» y botón «Alto contraste» (para baja visión o sol intenso).
  Si no hay nada guardado se respeta la preferencia del sistema (tema oscuro o más contraste).
- **Sección «Escuchar»:** la vista previa «el eclipse en 1 minuto» pasó a una sección propia, con una vista
  del Sol que la Luna va cubriendo, hora, acimut y altura del Sol en Punta del Este, línea de tiempo y botones
  «Inicio», «Máximo» y «Fin». Al mover la línea de tiempo suena y se dibuja ese instante (reemplaza al antiguo
  modo «Simulador» de la pestaña Sonido).
- **Sección «En vivo»:** la misma vista del Sol, reloj y cuenta regresiva visibles desde el inicio; los ajustes
  (tipo de sonido, relato por voz, fuente de datos) quedaron en «Ajustes de sonido». La pantalla se mantiene
  encendida durante la experiencia (Wake Lock, donde el navegador lo permite).
- **Vista del Sol:** es esquemática. La Luna (0,928 diámetros solares) cruza en línea recta de izquierda a
  derecha, ajustada a los contactos C1–C4 de Punta del Este; no representa la inclinación real de la
  trayectoria. Las constantes están en `js/app.js` (`MOON_RATIO`, `moonTrack`, `SITE`).
- **Contacto:** `recursosastronomia@uruguayeduca.edu.uy`, asunto «Eclipse 2027» (constantes `CONTACT_MAIL` y
  `CONTACT_SUBJECT` al final de `js/i18n.js`).
- **Rendimiento:** el panel en vivo se redibuja una vez por segundo (antes, en cada cuadro) y los
  formateadores de fecha y hora se reutilizan.
- **Accesibilidad:** verificado con axe-core (reglas WCAG 2.0, 2.1 y 2.2, niveles A y AA) en las seis secciones
  y los tres temas, sin infracciones; sin desplazamiento horizontal a 320 px. Los estados (opción elegida,
  sección actual, teléfono apoyado) no dependen solo del color. Falta la prueba manual con lector de pantalla
  (TalkBack, VoiceOver, NVDA), que ninguna herramienta automática reemplaza.
- Las cifras de Lighthouse de más abajo son de la versión 1.6 y no se volvieron a medir.

## Versión 2.8 (noviembre de 2026)
- Se agregó Pando (UY) a la lista de ciudades (versión 2.7).
- Con «Usar mi ubicación», el panel «Lugar» muestra en letra pequeña las coordenadas en grados, minutos y segundos
  con N/S y E/W. El lector de pantalla dice solo los grados enteros («latitud 34 grados sur, longitud 58 grados
  oeste»). Al elegir una ciudad, ese texto se oculta.
- El cálculo usa la posición tal como la entrega el dispositivo; en el navegador se guarda redondeada a ≈ 1 km,
  de modo que al volver a abrir la app los segundos mostrados corresponden a ese valor redondeado.

## Versión 2.6 (noviembre de 2026): prueba en computadora
- Probada en Google Chrome 153 y Mozilla Firefox 160 (Linux, sin pantalla) a 1366×768 y 1920×1080: las seis
  secciones, iniciar/pausar/reanudar, cambio de lugar, vista previa con sonido, línea de tiempo con teclado, los
  tres temas y el cambio de idioma, sin errores de JavaScript ni desbordes. No se probó el video del mapa (los
  archivos de video no estaban en el entorno de prueba) ni Windows o macOS.
- Corregido: al cambiar de idioma, el título de la pestaña quedaba con el nombre de la sección en el idioma
  anterior. La barra de desplazamiento sigue ahora los colores del tema (se veía clara en modo noche en Firefox).

## Versión 2.5 (noviembre de 2026)
- **Íconos de la barra inferior:** más grandes (26 px), con sus trazos definidos en el propio ícono (no dependen
  de la hoja de estilos) y un escudo con tilde para «Seguridad» en lugar de los anteojos, que no se distinguían.
- **Actualizaciones sin desajustes:** `index.html` pide los estilos y scripts con un número de versión
  (`styles.css?v=2.8`, etc.). Antes, en la primera visita después de publicar, podía mostrarse la página nueva
  con estilos o scripts viejos guardados en el teléfono. **Al publicar cambios:** subir ese número en
  `index.html` y en la lista `SHELL` de `sw.js` (deben coincidir), además de `CACHE_VERSION`.

## Versión 2.4 (noviembre de 2026): simplificación para personas ciegas y con baja visión
- **Orden de lectura:** la barra de secciones va antes del contenido en el código (en pantalla sigue abajo), de
  modo que el lector de pantalla y el teclado la encuentran al principio; «Saltar al contenido» la evita.
- **Menos repetición para el lector de pantalla:** la vista del Sol es solo un apoyo visual (`aria-hidden`); la
  hora, la cobertura y la fase ya están en texto al lado. Se quitaron las líneas de crédito bajo cada imagen
  (siguen en Créditos).
- **Posición del Sol en palabras** («Sol: hacia el noreste, a 55° de altura») en lugar de acimut y altura en
  grados; sirve para orientarse hacia el Sol.
- **Menos controles:** el reproductor del mapa quedó con anterior, reproducir y siguiente (inicio y fin se
  alcanzan con la línea de tiempo o con «Momentos clave»). La sección «Técnica» se llama ahora «Ayuda».
- **Lectura:** texto base de 18 px; aviso de seguridad sin mayúsculas sostenidas.
- **Zoom de 400 % y pantallas bajas (WCAG 1.4.10):** por debajo de 520 px de alto, el encabezado y la barra de
  secciones dejan de estar fijos y se desplaza la página entera; antes quedaban unos 60 px para leer.
- **Otros criterios:** el título de la pestaña nombra la sección abierta (2.4.2); las atribuciones en inglés
  llevan `lang="en"` (3.1.2); estilos para el modo de colores forzados de Windows; corregido un desborde de
  página en Créditos a 320 px.
- **Verificación:** axe-core (WCAG 2.0, 2.1, 2.2 A y AA, más buenas prácticas) sin infracciones en las seis
  secciones y los tres temas; sin desplazamiento horizontal a 320 px; orden de tabulación revisado. Las
  herramientas automáticas detectan solo una parte de los problemas: falta la prueba con TalkBack, VoiceOver y
  NVDA, y con personas usuarias.

## Versión 2.3 (noviembre de 2026)
- **Horarios según el lugar:** «En vivo» y «Escuchar» calculan el eclipse para el lugar elegido. La app arranca en
  Punta del Este; en el panel «Lugar» se puede tocar «Usar mi ubicación» (pide permiso al navegador) o elegir una
  de las ciudades de la lista (`CITIES` en `js/app.js`: nombre, país, latitud, longitud y zona horaria). Para
  agregar una ciudad basta sumar una línea a esa lista.
- **Cálculo:** `js/eclipse.js` usa los elementos besselianos del eclipse (EclipseWise / NASA) y el método de Meeus.
  Verificado contra EclipseWise: en el punto de eclipse máximo da 15:59:35 UT y 470,8 s de anillo (publicado:
  15:59:35,1 y 470,9 s); en el punto de mayor duración, 15:41:47 UT y 473,4 s (publicado: 15:41:47,8 y 473,5 s).
  Usa ΔT = 72,6 s (previsión de EclipseWise); si el valor real difiere, las horas se corren esos mismos segundos
  (`deltaT` en `js/eclipse.js`).
- **Cobertura real:** el porcentaje es ahora el área del disco solar cubierta en cada instante (antes, una recta
  hasta 93 %, que era la magnitud). En la franja del anillo el máximo ronda el 86 %.
- **Tipo de eclipse por lugar:** dentro de la franja se anuncia el anillo; fuera, «eclipse parcial» con su máximo;
  donde no se ve, se dice. Si el Sol está bajo el horizonte en algún momento, se indica junto a la hora.
- **Vista del Sol:** la Luna se dibuja con su tamaño y trayectoria reales para el lugar, con el cenit arriba.
- **Horas:** se muestran en la hora local del lugar elegido (la del dispositivo si se usa la ubicación).
- **Simulación (mapa global):** sin cambios; sigue con la referencia publicada para Punta del Este (`PDE`). Para las
  coordenadas de Punta del Este de la lista, el cálculo propio da unos 10 s antes que esos valores publicados.
- **Privacidad:** la ubicación no sale del dispositivo; se guarda en el navegador redondeada a ≈ 1 km.

## Versión 2.2 (noviembre de 2026)
- **Una sola forma de vivir el eclipse:** se quitó la opción «Fuente de datos» (sensor de luz). El sensor no está
  disponible en casi ningún navegador y, a pleno día, la lectura superaba el tope previsto, de modo que el tono
  no habría cambiado. El sonido sigue siempre el cálculo por la hora.
- **Pausa con botón:** ya no hace falta apoyar el teléfono. El botón principal inicia la experiencia y después
  pausa o reanuda el sonido (dos notas que bajan al pausar, dos que suben al reanudar). En pausa no hay sonido
  ni relato; el reloj y la vista del Sol siguen actualizándose.
- La app ya no usa sensores (inclinación ni luz); se actualizaron los textos de Técnica y de Privacidad.
- Las claves `son.tilted`, `son.flat`, `son.noTilt`, `son.src.*`, `sensor.*` y `tech.p.motion_html` de
  `js/i18n.js` quedaron sin uso.

## Versión 2.1 (noviembre de 2026)
- **Nombre:** «Eclipse sonoro 2027» (encabezado, título de la página, manifiesto y los seis idiomas). El nombre
  corto del ícono instalado sigue siendo «Eclipse 2027». Antes se llamaba «Sonificación Eclipse 2027».
- **Idioma:** la app abre siempre en español; los demás idiomas se eligen en la lista desplegable del encabezado
  (ya no se usa el idioma del navegador) y la elección queda guardada.
- **Imagen real del Sol:** `img/sol/sdo-hmi-2026-11-16.jpg` es la imagen en luz visible de SDO/HMI (NASA) del
  16 de noviembre de 2026, recortada al disco (512 px). Se ve en «En vivo» y «Escuchar», en modo claro y noche;
  en alto contraste se mantiene el disco liso. Para actualizarla más cerca del eclipse, reemplazar el archivo
  (mismo recorte: disco centrado, 1 % de margen) y la fecha `SUN_BUNDLED_DATE` en `js/app.js`.
- **Día del eclipse:** el 6 de febrero de 2027 (hora de Uruguay), si hay conexión, la app pide la imagen más
  reciente a `sdo.gsfc.nasa.gov` cada 15 minutos (`SUN_LIVE_URL`). Si SDO cambia esa dirección o no responde,
  queda la imagen incluida. La app no puede leer la hora exacta de esa imagen, así que solo indica «de hoy».
- **Orientación:** las imágenes de SDO traen el norte solar arriba; la app las gira según el ángulo paraláctico
  de Punta del Este y el ángulo P del Sol (≈ −13,6° el 6 de febrero, `SUN_P_ANGLE`). Es una aproximación.
- Crédito exigido por SDO en Créditos → Imágenes, y aviso de la descarga en Privacidad.

## Publicación
- Debe servirse por **HTTPS** (por ejemplo, GitHub Pages). Abriendo el archivo con doble clic (`file://`) no se instala ni funciona sin conexión.
- Cada vez que se modifique algún archivo, cambiar `CACHE_VERSION` en `sw.js` (hoy es `eclipse2027-v17`) para que los celulares reciban la actualización.
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
- Precarga de las dos fuentes principales (Atkinson Hyperlegible 400 y Bricolage Grotesque).
- Las portadas de los videos se cargan al abrir la pestaña Simulación; los logotipos de Créditos, al verlos.
- El aviso «Instalar la app» flota sobre la barra inferior y no desplaza el contenido.
- Pendientes que dependen del alojamiento y no del código: tiempos de caché del servidor (GitHub Pages usa
  10 minutos; el service worker ya guarda todo en el teléfono) y minificar los scripts (se dejaron legibles
  a propósito para poder editarlos).

## Estadísticas de uso
- GoatCounter (`danielgastelu.goatcounter.com`): cuenta visitas sin cookies y sin guardar IP ni datos
  personales. Lo informa el apartado «Privacidad» de Créditos. Si se quita el script, actualizar ese texto.
- Los bloqueadores de anuncios pueden impedir el conteo: las cifras son una estimación mínima.
