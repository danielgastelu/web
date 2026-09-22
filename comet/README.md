# Sungrazer Hunter — PWA para explorar, marcar y reportar candidatos a cometas rasantes

Aplicación web progresiva (PWA), instalable y usable sin conexión una vez cargada, pensada
para agilizar la caza de cometas rasantes ("sungrazers") siguiendo las pautas del
[Sungrazer Project](https://sungrazer.nrl.navy.mil/) (Naval Research Laboratory).

No es una herramienta oficial ni está afiliada al NRL / a la Marina de EE. UU. El envío
real de un descubrimiento se hace en <https://sungrazer.nrl.navy.mil/report> (formulario
web, no por correo): esta app te ayuda a explorar las imágenes, marcar candidatos con
precisión y dejar el reporte listo para copiar allí.

## Qué hace

1. **Explorar sets de imágenes en vivo**: elegís fecha, cámara (LASCO C2 o C3) y rango
   horario (UT), y la app arma la secuencia de cuadros trayéndolos en vivo desde la
   [API pública de Helioviewer](https://api.helioviewer.org/) (procesada a partir de los
   mismos datos SOHO/LASCO), a 1024×1024 px con el centro solar en el centro de la imagen.
2. **Marcar candidatos de forma ágil**: creás uno o más "candidatos" (cada uno con su
   color) y hacés clic sobre el objeto en cada cuadro donde aparece. Zoom con rueda del
   mouse o botones, desplazamiento arrastrando, navegación con teclado.
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
3. Creá uno o más **candidatos** y hacé clic sobre el objeto en cada cuadro donde lo veas
   (se recomiendan 5 o más cuadros consecutivos). Usá zoom para marcar con precisión.
4. Mirá las **métricas automáticas** para descartar estrellas, planetas o rayos cósmicos
   (ver criterios resumidos en la pestaña **Guía rápida**).
5. Generá el **reporte**, copialo o descargalo. Si te convence, llevalo al
   [formulario oficial](https://sungrazer.nrl.navy.mil/report).

### Atajos de teclado (para ir rápido)
- `←` / `→`: cuadro anterior / siguiente
- `+` / `-`: acercar / alejar zoom, `0`: restablecer zoom
- Clic: marcar candidato activo · arrastrar: desplazar la vista
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
