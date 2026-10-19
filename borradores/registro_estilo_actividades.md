# Registro de estilo: actividades de `web`

Revisión hecha el 18/10/2026. Sirve de referencia para adaptar materiales nuevos al formato que ya usa el sitio (estudiantes de 14 a 16 años, Portal Uruguay Educa, ANEP-DGES-EDyTIC).

Se revisaron 34 páginas de las carpetas `ec/`, `ec/helios/`, `eclipse/`, `asteruy/`, `album/`, `mhp/`, `comet/`, `nsac2026/`, `iss/`, `drones/`, `ef/`, `cc/`, `pc/`, `binario/`, `dsm/` y de la raíz (`portada.html`, `quizV5.html`, `video_quiz_interactivo.html`, etc.). No se analizó `prim/`, que está pensada para Primaria.

---

## 1. Tres familias de actividades

| Familia | Ejemplos | Cómo está construida |
|---|---|---|
| **A. Módulo de lectura interactivo** (el formato más común para 14-16) | `ec/constelacionesV3`, `ec/movimientogeneraldiario`, `ec/sondas_voyager`, `ec/biia11to16version4`, `ec/astrocelular`, `ec/exoplanetas` | Un solo HTML con Tailwind (CDN), fuente Lexend o Inter, fondo espacial oscuro, secciones de texto con tarjetas, un simulador o recurso visual, preguntas para pensar, un cuestionario con estrellas y «Para saber más». |
| **B. App de misión o laboratorio (PWA)** | `eclipse/`, `mhp/` (Misión Helios), `comet/`, `asteruy/`, `album/` | Carpeta con `index.html`, `css/`, `js/`, `sw.js`, manifiesto e íconos. Funciona sin conexión, está en 6 idiomas (es, en, fr, pt, it, de), con fuentes guardadas en la propia carpeta, alto contraste y README/LEEME. Cuenta visitas con GoatCounter, sin cookies. |
| **C. Juego o herramienta breve** | `binario/`, `pc/jc4`, `juego_de_coordenadas`, `cc/aventura_espacial_de_fracciones`, `dsm/atrapaWebcam`, `quizV5`, `video_quiz_interactivo` | Una sola pantalla con temporizador, puntaje y botones grandes. Muy poco texto. |
| *(Antiguos, hechos con eXeLearning)* | `iss/`, `drones/`, `ef/` | Exportados de eXeLearning, con menú lateral de páginas y preguntas de selección múltiple. Ya no se sigue este estilo. |

**Para adaptar materiales conviene usar la familia A**, y la B solo si el material pide trabajar con datos o una experiencia de varias pantallas.

---

## 2. Tema visual

### Paleta (modo oscuro por defecto)
- **Fondo:** azul noche casi negro: `#030712`, `#050c1e`, `#07111f`, `#0a0f1d` o `#0b0f19`. Muchas veces lleva un degradado radial (`radial-gradient(circle at center, #0b1528 0%, #030712 100%)`).
- **Estrellas de fondo:** puntos blancos o lilas, en SVG o con `radial-gradient` repetido. Llevan `aria-hidden="true"` y desaparecen en modo claro.
- **Superficies o tarjetas:** `#111827`, `#112240`, `#1e293b`, con borde `#334155` y esquinas redondeadas (`rounded-xl` o `rounded-2xl`).
- **Texto:** `#f8fafc` o `slate-100` para el principal y `#cbd5e1` o `slate-300` para el secundario.
- **Colores de acento según el tema:**
  - Constelaciones y cielo: violeta (`purple-500/600`, `#c084fc`)
  - Exoplanetas y tecnología: cian (`#06b6d4`, `#38bdf8`)
  - Sol y Helios: ámbar (`#fbbf24`, `#f59e0b`, `#d97706`)
  - Voyager: naranja (`#fb923c`)
- **Estrellas ganadas y logros:** dorado `#eab308` / `#fbbf24`, con una animación de pulso (`star-pulse`).
- **Respuesta correcta o incorrecta:** verde `#22c55e` / rojo `#ef4444`.

### Modo claro y accesibilidad
- Hay un **interruptor de modo claro/oscuro** en la cabecera (`role="switch"`, `aria-checked`). El fondo claro es gris `#e5e7eb`, no blanco puro.
- Las PWA más nuevas (`eclipse/`) traen **alto contraste**: fondo negro, texto amarillo `#ffff00` y acento cian. Están verificadas con WCAG 2.2 AA.
- Tienen el enlace **«Saltar al contenido principal»**, un `<main id="contenido-principal">` y los emojis decorativos ocultos para los lectores de pantalla.
- `biia11to16version4` agrega el botón **🔊 Leer pantalla**, que lee el texto en voz alta (con pausa y fin), y un índice interactivo.

### Tipografía
- **Lexend** (Google Fonts) es la más usada en los módulos. El código la elige a propósito *«para facilitar la lectura a estudiantes con TDAH y pautas DUA»*.
- Otras: **Inter**, en Helios y Exoplanetas, y **Atkinson Hyperlegible**, en `biia` y `mhp`.
- **Source Sans 3** aparece en `eclipse/`, porque la pide el manual de identidad de ANEP. Si el material va a salir con logo institucional, conviene usar esta.
- Títulos en negrita gruesa (`font-extrabold`), con interlineado ajustado. Los textos de cuerpo van en `text-base`/`text-lg`, `font-light` y `leading-relaxed`.

### Componentes que se repiten
- **Cabecera fija** con logo en un recuadro de color, una línea en mayúsculas pequeñas («ASTRONOMÍA PARA JÓVENES») y el título del módulo debajo.
- **Píldora de introducción** sobre el título principal (por ejemplo, «Mirando el cielo desde hace miles de años»).
- **Tarjetas destacadas** con emoji en el título: 💡 Idea clave, ✍️ Una analogía, 💡 ¿Sabías que...?, 🚀 Un dato sorprendente, Para pensar 💭.
- **Tarjetas de datos** con una cifra grande (por ejemplo, «1992: primer hallazgo», «+5000 confirmados»).
- **Desplegables** (`<details>`/`<summary>`) para las preguntas con respuesta sugerida y para los subtemas.
- **Simulador** en canvas o Three.js (Orión en 3D, fases lunares, tránsitos), con controles debajo y una nota de que el modelo es didáctico y no está a escala.
- **Video** incrustado (iframe de YouTube) y a veces una presentación Prezi.
- **Pie institucional** (`footer_uruguay_educa.html`): logo de Uruguay Educa en blanco y el texto *«Portal Uruguay Educa (ANEP-DGES-EDyTIC) — Contenidistas de Astronomía 2026. Herramienta educativa interactiva de uso libre desarrollada con asistencia de IA.»*, más el script de GoatCounter.

---

## 3. Diseño de los contenidos (estructura del módulo)

Este es el recorrido típico de un módulo de la familia A, de arriba hacia abajo:

1. **Gancho inicial.** Píldora, título grande y un párrafo que arranca desde algo cotidiano o una imagen mental («Antes de que existieran los mapas, los satélites o los teléfonos celulares…», «Imagina que escribes una carta, la guardas dentro de una botella…»). A veces también indica la edad sugerida (*12-16 años*) y el tiempo de lectura (*~8 min*).
2. **Idea clave.** El concepto central en 2 o 3 oraciones, en una tarjeta destacada. Muchas veces la acompaña una **analogía**.
3. **Exploración interactiva.** Un simulador o manipulable con instrucciones breves («Usa el control de abajo…», «📢 Observa: …»).
4. **Desarrollo en bloques cortos.** Entre 4 y 7 subtemas, cada uno con su `h3`. Mezclan ciencia, historia o mitos y **conexión con Uruguay y el hemisferio sur** (constelaciones australes, la Cruz del Sur, el botón «🇺🇾 Sur (Uruguay)», los pueblos originarios).
5. **Dato sorprendente.** Un cierre que asombra («observar el cielo es mirar el pasado»).
6. **Preguntas para pensar en clase.** Tres preguntas abiertas en desplegables, cada una con su respuesta sugerida.
7. **Video y material interactivo.**
8. **Cuestionario.** Cinco preguntas de opción múltiple que se muestran de a una, con el botón «Comprobar respuesta». Cada pregunta tiene una explicación que arranca con un elogio variado. Al final aparecen las **estrellas de oro** y un **certificado o «evidencia para el docente»** con un título temático («Cartógrafo del Firmamento Celeste»), el puntaje y la fecha.
9. **Para saber más.** Entre 3 y 5 recursos con 🌐: Uruguay Educa, NASA Space Place en español, la IAU, Stellarium Web y similares. Cada uno con una línea que explica para qué sirve.
10. **Pie institucional.**

**Gamificación:** todo se plantea como una «misión» (Misión de verificación, Misión astronómica completada, Comenzar misión). Se ganan estrellas, rachas 🔥, XP o insignias, y la persona recibe un rol: piloto, astrofotógrafo, cartógrafo, joven astronauta.

**En las PWA (familia B)** el recorrido se arma por pestañas en lugar de seguir una sola página: *Misión → Observar o Laboratorio → Datos o Análisis → Recursos o Créditos*. Siempre explican de dónde vienen los datos reales (SOHO, SILSO, Helioviewer, NASA/JPL) y su licencia.

---

## 4. Modo de redacción

### Persona y tratamiento
- **Se usa «tú» casi siempre** (*explora, observa, pon a prueba, haz clic, tienes*). El voseo aparece solo en `comet/` y en `ef/` («Explorá», «Marcá»). Si se quiere mantener la coherencia, **lo recomendable es «tú»**.
- **«Nosotros» inclusivo** para explicar («Podemos pensar en las constelaciones como…», «A esas figuras las llamamos…»).
- **«Ustedes»** solo en consignas grupales o de taller (drones).

### Tono
- Cercano, entusiasta y con curiosidad, pero sin infantilizar. Se trata al estudiante como un **investigador o explorador** que tiene una misión.
- Hay preguntas retóricas que abren cada bloque («¿Te has fijado en que…?», «¿Por qué se llaman Voyager?», «¿Alguien encontrará el mensaje?»).
- Se usan exclamaciones con moderación para remarcar el asombro («¡Nunca coinciden en el cielo al mismo tiempo!», «¡sino 13!»).
- El mejor ejemplo de ritmo es `sondas_voyager`: **frases cortas y separadas** («No contiene películas. Ni internet. Ni redes sociales.»), un párrafo por idea, y cierres que invitan a reflexionar («el mensaje fue escrito tanto para los posibles habitantes de otros mundos... como para nosotros mismos»).

### Vocabulario y precisión
- Cada término técnico se define apenas aparece, entre paréntesis o en negrita: *heliopausa (la frontera donde el viento de nuestro Sol se detiene)*, *púlsares (estrellas de neutrones que emiten pulsos extremadamente regulares)*.
- Usa cifras concretas y fechas (1930, 88 constelaciones, 1340 años luz, 17 km/s) y cita las fuentes cuando corresponde («según Wikipedia»).
- Los temas se anclan en lo local: Uruguay, el hemisferio sur, el campo, la feria de ciencias, el liceo.
- Los simuladores aclaran sus límites: *«Las distancias y tamaños tienen fines estrictamente simbólicos y didácticos.»*

### Retroalimentación del cuestionario
- Arranca con un elogio, que **varía en cada pregunta**: ¡Correcto!, ¡Excelente!, ¡Magnífico!, ¡Asombroso!, ¡Muy bien!, ¡Exacto!, ¡Acertado!, ¡Impecable!, ¡Buena memoria!
- Después del elogio va **una oración que explica el porqué** (no alcanza con decir «correcto»).
- Mensajes de cierre según el puntaje: «¡Buen trabajo, joven astronauta!», «¡Sigue intentándolo!», «¡Explorador experto!».

### Formato del texto
- Párrafos de 2 a 4 oraciones, con negrita en el concepto clave de cada uno.
- Emojis como marcadores de sección (💡 ✍️ 🤔 📢 🚀 📚 🌐). Nunca reemplazan palabras.
- Listas cortas cuando hay elementos que enumerar (los 4 planetas gigantes, los 4 pasos clave).

---

## 5. Inconsistencias que conviene no repetir

- **Mayúsculas a la inglesa** en algunos títulos («Dibujos Imaginarios en el Cielo», «Historias grabadas con Luz en el Firmamento»). En español va mayúscula solo en la primera palabra y en los nombres propios. `eclipse/` y la versión más nueva de Helios ya lo corrigieron («Descifra el latido de nuestra estrella»).
- **Vocabulario a veces demasiado elevado para 14-16** («diametralmente opuestas», «distancias abismales de profundidad», «aplacar», «firmamento» repetido). En la versión más simple (`biia v4`) el vocabulario está mejor ajustado.
- **Mezcla de voseo y tuteo** entre actividades.
- **Formas peninsulares** («Has demostrado», «vídeo»). En Uruguay es más natural «Demostraste» y «video».
- **Dependencia de CDN** (Tailwind, Google Fonts). Sin conexión, la página pierde los estilos. Las PWA lo resuelven guardando todo en su propia carpeta.

---

## 6. Lista de control para adaptar un material nuevo

- [ ] Un solo HTML (o una PWA si hace falta), con `lang="es"`, fondo espacial oscuro y modo claro.
- [ ] Lexend (o Source Sans 3 si lleva identidad ANEP) y un acento de color acorde al tema.
- [ ] «Saltar al contenido», `main` identificado, emojis decorativos con `aria-hidden` y contraste AA.
- [ ] Gancho cotidiano → idea clave y analogía → algo interactivo → 4 a 7 bloques cortos → dato sorprendente.
- [ ] Conexión con Uruguay o el hemisferio sur.
- [ ] Tres preguntas para pensar, con respuesta sugerida en desplegable.
- [ ] Cuestionario de 5 preguntas con elogio variado, explicación, estrellas y evidencia para el docente.
- [ ] «Para saber más», con fuentes en español cuando las haya.
- [ ] Pie de Uruguay Educa / EDyTIC con la mención de que se hizo con asistencia de IA.
- [ ] Tuteo y frases cortas, términos definidos, mayúscula solo inicial en los títulos, «video» y no «vídeo».
