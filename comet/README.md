# Sungrazer Hunter — PWA para explorar, marcar y reportar candidatos a cometas rasantes

Aplicación web progresiva (PWA), instalable y usable sin conexión una vez cargada, pensada
para agilizar la caza de cometas rasantes ("sungrazers") siguiendo las pautas del
[Sungrazer Project](https://sungrazer.nrl.navy.mil/) (Naval Research Laboratory).

No es una herramienta oficial ni está afiliada al NRL / a la Marina de EE. UU. El envío
real de un descubrimiento se hace en <https://sungrazer.nrl.navy.mil/report> (formulario
web, no por correo): esta app te ayuda a explorar las imágenes, marcar candidatos con
precisión y dejar el reporte listo para copiar allí.

### Revisión contra la guía oficial (`soho_guide`)

Después de revisar la [guía oficial de caza de cometas SOHO](https://sungrazer.nrl.navy.mil/soho_guide)
punto por punto se corrigieron dos cosas:

- **Bug de lógica**: la guía define dos números distintos para C2/C3 que no hay que confundir
  — la *velocidad típica* de un cometa Kreutz (referencia absoluta) y la *tolerancia de
  variación* de velocidad entre cuadros consecutivos (el test real que usan para descartar
  falsos positivos: "si la velocidad varía más de ~10 px/h en C3 o ~60 px/h en C2, no es un
  cometa"). La primera versión de la app sólo miraba la velocidad absoluta; ahora calcula y
  muestra también la variación entre cuadros consecutivos, que es el criterio que realmente
  describe la guía.
- **Bug de scroll**: al cambiar de cuadro, la miniatura activa del filmstrip podía arrastrar
  un scroll vertical de toda la página (comportamiento por defecto del navegador), corriendo
  el visor bajo el cursor. Se corrigió fijando el scroll sólo al eje horizontal del filmstrip.

También se agregó contenido que faltaba: detección automática de si el candidato entra desde
la mitad inferior de la imagen acercándose al Sol (~84% de los casos reales, según la guía),
y en la pestaña **Guía rápida** se sumaron los penachos/estructuras coronales, las CME, el
disco ocultador y el brazo del ocultador como objetos que *no* hay que reportar, el dato de
que en C3 se ven cientos de estrellas (no sólo 15-40 como en C2), y enlaces directos a la
lista de tránsitos de planetas y a los reportes confirmados del sitio.

### Botón de reproducción automática (flipbook / blink)

Se agregó un botón **▶ Reproducir** en el visor (también con la barra espaciadora) que pasa
la secuencia sola, con velocidad configurable (Lenta/Media/Rápida/Blink) — la técnica clásica
de caza de cometas para detectar a simple vista qué se mueve contra el fondo de estrellas
fijas. Un clic sobre la imagen mientras se reproduce pausa en vez de marcar por accidente.

### Bug de actualización del service worker (PWA con caché vieja)

Si ya habías abierto una versión anterior de la app, el service worker podía quedar sirviendo
`index.html`/`app.js` **viejos desde el caché indefinidamente**, aunque se publicara una
versión nueva en el servidor — por eso el botón de reproducir no aparecía. Es un problema
clásico de PWA: el navegador sólo detecta que hay una versión nueva del service worker si el
archivo `sw.js` cambia de contenido byte a byte. Se corrigió de dos formas:
- Los recursos propios de la app (HTML/CSS/JS) ahora se sirven con estrategia **red primero,
  caché como respaldo** (antes era caché primero), así con conexión siempre se ve lo último
  publicado; el caché sólo entra en juego si no hay red.
- La app ahora muestra un aviso ("Hay una versión nueva — Recargar") cuando el service worker
  detecta una actualización, para no depender silenciosamente de que el usuario recargue por
  su cuenta.

**Importante para quien despliegue actualizaciones futuras**: conviene subir el número de
`CACHE_VERSION` en `sw.js` en cada cambio real que se publique — es lo que garantiza que el
navegador note la actualización incluso si alguien tiene una pestaña vieja abierta.

**Lo que la guía menciona y esta app todavía no ofrece**: sets de imágenes de práctica con
respuestas conocidas para entrenar antes de reportar candidatos reales (la guía los ofrece
para descarga). Es una buena mejora a futuro si te sirve para uso en clase.

### Bug: "las imágenes son todas iguales, del mismo tiempo"

Se detectó y corrigió la causa de este síntoma. La app pide a Helioviewer una imagen para
cada instante de la secuencia (`takeScreenshot`), pero ese servicio siempre devuelve la
imagen real **más cercana** al instante pedido — no genera una imagen nueva por arte de
magia. Si el intervalo elegido es más chico que la cadencia real de datos disponibles en ese
tramo (o hay un hueco de cobertura de un rato), varios cuadros pedidos con horarios distintos
pueden terminar coincidiendo con la **misma imagen real**: el reloj de la app avanza cuadro a
cuadro, pero la foto de fondo es la misma, así que a simple vista (y en la animación) se ven
"todas iguales".

Ahora, después de generar (o extender) un set, la app verifica en segundo plano —consultando
la fecha real de cada imagen vía la API de Helioviewer— si esto está pasando, y si encuentra
cuadros duplicados:
- Lo avisa en el estado del set ("N cuadros corresponden a la MISMA imagen real...").
- Marca esas miniaturas en el filmstrip con un borde punteado.
- Muestra en el cuadro la hora real de la imagen entre paréntesis cuando difiere de la hora
  pedida, y un aviso "⚠ imagen repetida, sin dato nuevo" cuando corresponde.

Si te aparece este aviso, conviene agrandar el intervalo entre cuadros o probar otro rango
horario/fecha con mejor cobertura de datos. Esta verificación es best-effort: si por algún
motivo no se puede consultar (sin conexión, etc.), la app sigue funcionando igual, sólo sin
el aviso.

## Qué hace

1. **Explorar sets de imágenes en vivo**: elegís fecha, cámara (LASCO C2 o C3) y rango
   horario (UT), y la app arma la secuencia de cuadros trayéndolos en vivo desde la
   [API pública de Helioviewer](https://api.helioviewer.org/) (procesada a partir de los
   mismos datos SOHO/LASCO), a 1024×1024 px con el centro solar en el centro de la imagen.
2. **Flipbook / blink automático**: un botón de reproducción (▶, o barra espaciadora) pasa
   la secuencia sola a la velocidad que elijas, para detectar a simple vista qué se mueve
   de forma consistente contra el fondo de estrellas — la técnica clásica de caza de cometas.
3. **Marcar candidatos de forma ágil**: creás uno o más "candidatos" (cada uno con su
   color) y hacés clic sobre el objeto en cada cuadro donde aparece (un clic durante la
   reproducción pausa en vez de marcar). Zoom con rueda del mouse o botones, desplazamiento
   arrastrando, navegación con teclado.
3. **Métricas automáticas**: por cada candidato, la app calcula solo mediante las marcas
   que hiciste la velocidad entre cuadros (px/h), un chequeo de trayectoria rectilínea, y
   valores auxiliares de elongación (en radios solares) y ángulo de posición — con alertas
   cuando algo no encaja con el patrón típico de un cometa.
4. **Reporte listo para usar**: genera el texto con los mismos campos que pide el
   formulario oficial (observador, fecha, cámara, tamaño de imagen, esquina de referencia,
   grupo de cometa, y hora+x+y por cuadro), copiable al portapapeles, descargable como
   `.txt`/`.json`, o como paquete `.zip` con recortes de cada cuadro marcado (cuando el
   navegador puede generarlos — ver limitaciones más abajo) listo para adjuntar a un correo
   o guardarlo con colegas.
5. **Todo se guarda en el dispositivo** (localStorage): perfil del observador, sesiones de
   marcado y candidatos, para retomar el trabajo cuando quieras.

## Cómo desplegarla (necesita HTTPS o localhost para funcionar como PWA)

Es un sitio 100% estático (HTML/CSS/JS, sin backend ni build). Cualquiera de estas
opciones sirve:

**Opción rápida — GitHub Pages**
1. Subí esta carpeta a un repositorio de GitHub.
2. Activá GitHub Pages (Settings → Pages → Deploy from branch → `main` / carpeta raíz).
3. Entrá a la URL que te da GitHub Pages (ya es HTTPS) — el navegador debería ofrecer
   "Instalar aplicación".

**Opción rápida — Netlify / Vercel (arrastrar y soltar)**
1. Entrá a [app.netlify.com/drop](https://app.netlify.com/drop) y arrastrá esta carpeta.
2. Netlify te da una URL HTTPS al instante, ya instalable.

**Servidor propio**
Cualquier servidor de archivos estáticos con HTTPS funciona (Apache, Nginx, Firebase
Hosting, etc.). Sólo asegurate de servir la carpeta completa manteniendo la estructura de
subcarpetas (`css/`, `js/`, `icons/`).

**Probarla en tu computadora antes de publicarla**
```bash
cd pwa-sungrazer
python3 -m http.server 8080
# abrí http://localhost:8080 en el navegador
```
`localhost` cuenta como origen seguro, así que ahí también podés probar la instalación y
el funcionamiento offline sin necesidad de HTTPS.

## Cómo usarla

1. Pestaña **Perfil**: cargá tu nombre una vez (se usa para completar el reporte).
2. Pestaña **Explorar y marcar**: elegí fecha, cámara, rango horario (en UT) e intervalo
   entre cuadros, y tocá **Generar set**. Podés extender el set hacia atrás/adelante sin
   perder lo ya marcado.
3. Usá **Reproducir** (▶, o barra espaciadora) para pasar la secuencia como flipbook/blink
   automático y detectar a simple vista qué se mueve de forma consistente contra el fondo
   de estrellas fijas — la técnica clásica de caza de cometas. Elegí la velocidad
   (Lenta/Media/Rápida/Blink) según lo que te resulte más cómodo.
4. Creá uno o más **candidatos** y, con la secuencia pausada, hacé clic sobre el objeto en
   cada cuadro donde lo veas (se recomiendan 5 o más cuadros consecutivos). Usá zoom para
   marcar con precisión. Si hacés clic mientras se está reproduciendo, sólo pausa en ese
   cuadro — no marca por accidente.
5. Mirá las **métricas automáticas** para descartar estrellas, planetas o rayos cósmicos
   (ver criterios resumidos en la pestaña **Guía rápida**).
6. Generá el **reporte**, copialo o descargalo. Si te convence, llevalo al
   [formulario oficial](https://sungrazer.nrl.navy.mil/report).

### Atajos de teclado (para ir rápido)
- `Espacio`: reproducir / pausar la secuencia (flipbook / blink automático)
- `←` / `→`: cuadro anterior / siguiente (pausa la reproducción si estaba activa)
- `+` / `-`: acercar / alejar zoom, `0`: restablecer zoom
- Clic: marcar candidato activo (o pausar, si se está reproduciendo) · arrastrar: desplazar la vista
- `Supr`: borrar la marca del candidato activo en el cuadro actual
- `N`: nuevo candidato
- `1`–`9`: elegir candidato activo

## Limitaciones importantes (léelas antes de reportar algo real)

- **Fuente de imágenes**: se usan capturas generadas por la API de Helioviewer a partir de
  los datos SOHO/LASCO, no los archivos JPEG/FITS originales de la NASA/NRL. La escala de
  píxeles usada (C2: 11.9"/px, C3: 56.0"/px, imagen 1024×1024 centrada en el Sol) se elige
  para aproximarse a la grilla nativa que espera el formulario oficial, pero puede no
  coincidir exactamente cuadro a cuadro. Para un reporte real, conviene verificar las
  coordenadas contra las imágenes originales en
  [sohowww.nascom.nasa.gov](http://sohowww.nascom.nasa.gov/data/realtime-images.html).
- **Elongación y ángulo de posición**: son valores auxiliares calculados por la app para
  ayudarte a evaluar el candidato; el formulario oficial sólo pide hora + coordenadas x,y
  por cuadro, no estos valores derivados.
- **Envío por correo**: el Sungrazer Project no recibe reportes por email, sólo por su
  formulario web. El paquete `.zip` que genera esta app es para tu propio archivo o para
  compartir con colegas — no reemplaza el formulario oficial.
- **Recortes de imagen en el `.zip`**: dependen de que el navegador pueda leer los píxeles
  de las imágenes de Helioviewer (política CORS del servidor). Si no puede, el `.zip` igual
  se genera con el reporte en texto y JSON, y un aviso explicando por qué faltan los
  recortes.
- **Disponibilidad de imágenes**: para fechas/horas donde SOHO no tuvo observación (o hubo
  interrupciones de datos), algunos cuadros pueden no cargar o repetirse; eso es
  normal — se puede descartar el cuadro simplemente no marcándolo.

## Estructura del proyecto

```
pwa-sungrazer/
├── index.html              # interfaz principal (una sola página)
├── manifest.webmanifest    # metadatos de instalación de la PWA
├── sw.js                   # service worker (funcionamiento offline)
├── css/style.css
├── js/
│   ├── app.js               # controlador principal / interfaz
│   ├── helioviewer.js       # construcción de URLs de imagen y secuencias temporales
│   ├── coords.js            # matemática de coordenadas y métricas (velocidad, rectitud)
│   ├── report.js            # generación de reporte (.txt/.json/.zip)
│   ├── storage.js           # persistencia local (perfil, sesiones)
│   └── zip.js                # generador de .zip minimalista, sin dependencias
├── icons/                   # íconos de la app (incluye gen_icons.py por si querés regenerarlos)
└── README.md
```

Sin dependencias externas de build ni librerías de terceros: HTML/CSS/JS puro, así que se
puede editar directamente con cualquier editor de texto.

## Ideas para seguir mejorando

- Selector visual de fecha con vista previa de disponibilidad de datos (usando
  `getStatus` de la API de Helioviewer).
- Comparar automáticamente dos candidatos para detectar si son el mismo objeto.
- Export directo a PDF del reporte (hoy es `.txt` / `.json` / `.zip`).
- Modo "estudio": cargar sets de práctica con respuestas conocidas, como sugiere la guía
  oficial, para entrenar antes de reportar candidatos reales.
