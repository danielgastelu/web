# SeleneSight · Polo Sur Lunar / Lunar South Pole

**ES** — PWA para el NASA Space Apps Challenge (*Lunar South Pole Landing Site Evaluation*). Permite evaluar en minutos la iluminación solar (energía para paneles) y la visibilidad de la Tierra (comunicaciones directas) en el polo sur lunar, con horizontes reales calculados a partir de la topografía LOLA.

**EN** — PWA for the NASA Space Apps Challenge (*Lunar South Pole Landing Site Evaluation*). It lets you evaluate solar illumination (power for panels) and Earth visibility (direct-to-Earth communications) at the lunar south pole in minutes, using true horizons computed from LOLA topography.

## Funciones / Features

| ES | EN |
|---|---|
| Mapa estereográfico polar (80°S–polo) y vista 3D con relieve exagerado (selector 1× · 2× · 4×, por defecto 4×; solo visual) | Polar stereographic map (80°S–pole) and 3D view with vertical exaggeration (1× · 2× · 4× selector, 4× by default; visual only) |
| Botones + / − / restablecer vista (sin depender de rueda ni pellizco), capa «Solo relieve» sin colores, paneles de capas y leyenda plegables en pantallas chicas | + / − / reset-view buttons (no need for wheel or pinch), "Relief only" layer without colours, collapsible layers and legend panels on small screens |
| Hexágonos semitransparentes de 10 y 5 km (hasta 80°S) y 2 km (hasta 85°S) según el zoom, en 5 clases del % del mes sinódico: 0–20 % rojo, 21–40 % naranja, 41–60 % amarillo, 61–80 % verde pálido y 81–100 % verde pleno (referencia en la leyenda del mapa) | Semi-transparent 10 and 5 km (to 80°S) and 2 km (to 85°S) hexagons depending on zoom, in 5 classes of the synodic month %: 0–20% red, 21–40% orange, 41–60% yellow, 61–80% pale green and 81–100% full green (key in the map legend) |
| Interruptor Sol / Tierra | Sun / Earth switch |
| Horizonte y cielo de 0 a 30° (escala ampliada en 0–10°) con las trayectorias del mes | Horizon & sky 0–30° (expanded 0–10° scale) with monthly paths |
| Deslizador de tiempo cada 6 h en UTC (2027–2030), con reproducción | 6-hour UTC time slider (2027–2030) with playback |
| Capas de largo plazo (2027–2045, ciclo nodal de 18,6 años): % de tiempo y noche continua / apagón de Tierra más largo | Long-term layers (2027–2045, 18.6-year nodal cycle): % of time and longest continuous night / Earth blackout |
| Eclipses (la Tierra tapa al Sol) incluidos en el cálculo, con lista y salto al máximo | Eclipses (Earth blocks the Sun) included in the computation, with a list and jump-to-peak |
| Tiempo hasta la puesta del Sol y la ocultación de la Tierra | Time to sunset and Earthset |
| Márgenes de sombra solar y de radio (empiezan en 0 %) | Solar and radio shadow margins (start at 0%) |
| Sugeridor de tríos paneles–radio–hábitat que minimiza distancias (hábitat: pendiente baja, cerca del hielo y con buena iluminación), con un límite de noche continua máxima para los paneles | Panel–radio–habitat triad suggester that minimises distances (habitat: low slope, near ice, well lit), with a maximum continuous night limit for panels |
| Sugeridor de red de 4 nodos: energía, antena, hábitat y extracción de agua (hielo en sombra permanente). Minimiza la longitud de cables, caminos y ductos (árbol de expansión mínima) e informa la pendiente máxima y el desnivel de cada tramo | 4-node network suggester: power, antenna, habitat and water extraction (ice in permanent shadow). Minimises cable/road/pipe length (minimum spanning tree) and reports each link's maximum slope and elevation change |
| Puntos refinados a 40 m (◆) en las zonas con noches más cortas: hasta 2,8 días de noche máxima frente a 13 días a 2 km | Refined 40 m points (◆) in the shortest-night zones: down to 2.8-day longest night versus 13 days at 2 km |
| Modo **Explorar** para el público general: recorrido guiado, 4 historias (pico con noche corta, eclipse, cráter sin Sol, Tierra siempre visible), glosario y frases en lenguaje llano. Modo **Planificar** con todas las herramientas | **Explore** mode for the general public: guided tour, 4 stories (short-night peak, eclipse, crater without Sun, Earth always in view), glossary and plain-language sentences. **Plan** mode with every tool |
| Comparación de hasta 4 sitios, coordenadas propias, uso sin conexión, ES/EN | Compare up to 4 sites, custom coordinates, offline use, ES/EN |

## Método / Method

- **Topografía / Topography:** LOLA LDEM_80S_40M (40 m/px, 80°S–polo) + LDEM_60S_240M (240 m/px) para el horizonte lejano / for the far horizon. Los hexágonos de 2 km (hasta 85°S) se calcularon antes con LDEM_85S_40M + LDEM_75S_240M, el mismo producto LOLA / The 2 km hexagons (to 85°S) were computed earlier with LDEM_85S_40M + LDEM_75S_240M, the same LOLA product.
- **Horizonte / Horizon:** 720 azimuts (0,5°), rayos de hasta 400 km con curvatura lunar, observador a 2 m / 720 azimuths (0.5°), rays out to 400 km with lunar curvature, observer at 2 m.
- **Efemérides / Ephemerides:** Astronomy Engine, modelo IAU de rotación lunar con libraciones, cada 1 h: ventana detallada 2027–2030 y estadísticas 2027–2045 / IAU lunar rotation model with librations, hourly: detailed window 2027–2030 and statistics 2027–2045. Validado contra JPL Horizons (DE441, MOON_ME): ≤ 0,16′ / validated against JPL Horizons (DE441, MOON_ME): ≤ 0.16′.
- **Sol / Sun:** fracción del disco visible / visible disk fraction. **Tierra / Earth:** centro del disco con paralaje topocéntrico / disk centre with topocentric parallax.
- **Eclipses:** se descuenta del Sol la fracción tapada por el disco terrestre, sin refracción / the fraction of the Sun covered by Earth's disk is subtracted, without refraction.
- **Noche más larga / Longest night:** horas seguidas con < 1 % del disco solar visible / consecutive hours with < 1% of the solar disk visible.
- **Validación / Validation:** los fondos de Shackleton y Shoemaker salen en sombra permanente; el macizo Malapert y el "Peak near Shackleton" aparecen entre los sitios más iluminados / Shackleton and Shoemaker floors come out permanently shadowed; Malapert Massif and "Peak near Shackleton" rank among the most illuminated sites.

## Sitio / Site
`index.html` (raíz) es la landing page bilingüe del proyecto, con enlace a la PWA en `app/`. Publica la **raíz** del repositorio en GitHub Pages / `index.html` (root) is the bilingual landing page, linking to the PWA in `app/`. Publish the repository **root** on GitHub Pages.

Páginas aparte / Separate pages: `shackleton.html` (El caso Shackleton / The Shackleton case) y `aprende.html` (glosario, sopa de letras y trivia con certificado / glossary, word search and quiz with certificate), `comunicaciones.html` (enlaces con la Tierra / links with Earth), ambas con botón «Inicio» para volver a la landing / both with a Home button back to the landing page.

Enlaces directos / Direct links: `app/?modo=explorar` · `app/?historia=st1` (abre la historia del punto de Shackleton / opens the Shackleton point story) (público general, con recorrido guiado / general public, with guided tour) · `app/?modo=planificar` (evaluación técnica / technical evaluation). También / Also: `?mode=explore` · `?mode=plan`.

Idioma por defecto: **inglés** (para el jurado internacional). La elección de idioma se recuerda y la comparten la landing y la app / Default language: **English** (for the international jury). The language choice is remembered and shared by the landing page and the app.

## Cumplimiento del desafío / Challenge compliance

| Objetivo del desafío / Challenge objective | Cómo lo resuelve SeleneSight / How SeleneSight addresses it | Estado / Status |
|---|---|---|
| Selección y comparación de sitios / Site selection and comparison | Lista con fuentes: regiones Artemis III (Haworth, Malapert, Mons Mouton, Nobile Rim 2), CLPS (IM-1, IM-2), Chandrayaan-3, Apolo 11 y 17 · coordenadas propias en cualquier punto de la Luna · comparación de hasta 4 sitios / Sourced list: Artemis III regions, CLPS (IM-1, IM-2), Chandrayaan-3, Apollo 11 & 17 · custom coordinates anywhere · compare up to 4 sites | Supera / Exceeds |
| Flexibilidad de fechas / Date and time flexibility | Deslizador de 6 h en UTC (2027–2030), fecha exacta, meses sinódicos, estadísticas de 18,6 años y **ventanas de aterrizaje** (fechas alternativas para el mismo sitio) / 6-hour UTC slider, exact date, synodic months, 18.6-year statistics and **landing windows** (alternative dates for the same site) | Supera / Exceeds |
| Sol y Tierra respecto del horizonte / Sun and Earth vs horizon | Panel de horizonte real y cielo (0–30°), tiempo hasta la puesta del Sol y la ocultación de la Tierra / True-horizon & sky panel, time to sunset and Earthset | Cumple / Meets |
| Energía y comunicación / Power and communication | Elevación solar, potencia relativa (panel vertical/horizontal), % de Sol, noche más larga, % de Tierra visible, apagón más largo, eclipses / Solar elevation, relative power, % sunlight, longest night, % Earth visible, longest blackout, eclipses | Supera / Exceeds |
| Varias visualizaciones / Multiple visualizations | Mapa polar 2D, relieve 3D, cielo, franja mensual / 2D polar map, 3D relief, sky, monthly strip | Cumple / Meets |
| Dinámica temporal / Temporal dynamics | Animación, trayectorias del mes, franja de Sol/Tierra/eclipses / Animation, monthly paths, Sun/Earth/eclipse strip | Cumple / Meets |
| Distintos niveles / Skill levels | Modos Explorar y Planificar, recorrido guiado, historias, glosario, frases en lenguaje llano, ES/EN, WCAG 2.2 AA / Explore & Plan modes, guided tour, stories, glossary, plain language, ES/EN, WCAG 2.2 AA | Supera / Exceeds |
| Efemérides / Ephemerides | Precalculadas (Astronomy Engine) y **validadas contra JPL Horizons** (≤ 0,16′) / Precomputed and **validated against JPL Horizons** (≤ 0.16′) | Supera / Exceeds |
| Topografía LOLA, sin atmósfera / LOLA topography, airless | Horizonte de 720 direcciones hasta 400 km con curvatura; sin refracción / 720-direction horizon to 400 km with curvature; no refraction | Cumple / Meets |
| Libración y variaciones orbitales / Libration and orbital variations | Incluidas; ciclo nodal completo de 18,6 años / Included; full 18.6-year nodal cycle | Supera / Exceeds |
| Pendientes y cráteres profundos / Slopes and deep craters | Sombra permanente, pendiente del hábitat y de cada tramo de la red / Permanent shadow, habitat slope and slope of each network link | Supera / Exceeds |
| Por qué pequeños cambios importan / Why small changes matter | Hexágonos de 2 km frente a puntos de 40 m: noche máxima de 13,1 días frente a 2,8 días / 2 km hexagons vs 40 m points: 13.1-day vs 2.8-day longest night | Supera / Exceeds |

Limitación declarada / Stated limitation: la topografía de alta resolución cubre 80°–90° S; fuera de esa zona SeleneSight usa un horizonte liso y lo indica / high-resolution topography covers 80°–90° S; elsewhere SeleneSight uses a smooth horizon and says so.

## Cómo elegir dónde instalar una base / How to choose where to build a base

**ES** — Una estación en el polo sur necesita tres cosas cerca: energía, comunicación con la Tierra y agua. El problema es que no están en el mismo lugar: la luz está en las alturas y el hielo en la oscuridad. SeleneSight busca el mejor compromiso.

- **Energía.** En el polo el Sol da vueltas rozando el horizonte, así que los paneles van verticales y giran siguiéndolo: un panel acostado recibiría la luz de canto. Para una base permanente importa menos el porcentaje de tiempo con luz que la noche continua más larga, porque define cuántas baterías hacen falta. Las crestas y picos ven más allá de las montañas y tienen noches más cortas: en el borde de Shackleton, un punto refinado a 40 m tiene una noche máxima de 2,8 días en 18,6 años.
- **Eclipses, una falta de luz previsible.** Cuando en la Tierra vemos un eclipse de Luna, desde la Luna la Tierra tapa al Sol. Oscurece toda la región a la vez, así que ningún sitio lo evita. SeleneSight los calcula y los lista: el más largo de 2027–2030, el 26 de junio de 2029, deja 220 minutos de Sol tapado. Hay que guardar energía para ese momento.
- **Comunicación.** La Tierra casi no se mueve en el cielo lunar: sube y baja unos 7° cada mes por la libración. Una antena necesita verla por encima del relieve. Los lugares altos y las laderas que miran hacia la cara visible (cerca de 0° de longitud) la ven más tiempo; en algunos puntos del macizo Malapert está siempre a la vista.
- **Agua.** El hielo está en las sombras permanentes, los fondos de cráteres donde nunca llega el Sol. Son trampas frías: en algunas regiones de Artemis III la temperatura máxima del verano ronda los 93 K (−180 °C). El hábitat no puede estar ahí, pero conviene que quede cerca.
- **La red más corta.** Como no se puede tener todo en un solo punto, SeleneSight elige cuatro sitios (energía, antena, hábitat y extracción de agua) y calcula la red más corta que los une: un árbol de expansión mínima. Menos kilómetros de cables, caminos y ductos significa menos material traído desde la Tierra, menos puntos que pueden fallar y reparaciones más rápidas. Por eso la extracción de agua queda cerca de la energía: derretir y procesar hielo consume mucha electricidad, y un cable corto pierde menos y se repara antes.
- **Pendientes.** Cada tramo de la red se mide sobre la topografía: pendiente máxima, subida y bajada. Las pendientes fuertes complican la circulación de vehículos y el tendido de cables, y el hábitat necesita terreno casi plano (10° como máximo por defecto). Los límites se pueden ajustar.
- **Fechas.** Un retraso en el lanzamiento cambia todo. Para cada sitio, SeleneSight lista las ventanas de aterrizaje de 2027 a 2030: períodos continuos con Sol y Tierra a la vista. La NASA eligió las regiones de Artemis III buscando Sol continuo durante 6,5 días, y ese es el valor inicial.

**EN** — A station at the south pole needs three things close together: power, communication with Earth and water. The catch is that they are not in the same place: light is on the heights and ice is in the dark. SeleneSight looks for the best compromise.

- **Power.** At the pole the Sun circles just above the horizon, so solar panels stand vertical and turn to follow it: a flat panel would catch the light edge-on. For a permanent base, the share of time in sunlight matters less than the longest continuous night, because it sets how many batteries are needed. Ridges and peaks see past the mountains and have shorter nights: on the rim of Shackleton, a point refined to 40 m has a longest night of 2.8 days over 18.6 years.
- **Eclipses, a predictable loss of light.** When we see a lunar eclipse on Earth, from the Moon Earth is blocking the Sun. It darkens the whole region at once, so no site escapes it. SeleneSight computes and lists them: the longest in 2027–2030, on 26 June 2029, blocks the Sun for 220 minutes. Energy must be stored for that moment.
- **Communication.** Earth barely moves in the lunar sky: it rises and sinks about 7° each month because of libration. An antenna must see it above the terrain. High ground and slopes facing the near side (close to 0° longitude) see it longer; at some points on Malapert Massif it is always in view.
- **Water.** Ice lies in permanent shadows, crater floors that sunlight never reaches. They are cold traps: in some Artemis III regions the maximum summer temperature is about 93 K (−180 °C). The habitat cannot sit there, but it should be close.
- **The shortest network.** Since everything cannot fit in one spot, SeleneSight picks four sites (power, antenna, habitat and water extraction) and computes the shortest network joining them: a minimum spanning tree. Fewer kilometres of cables, roads and pipes means less material brought from Earth, fewer points that can fail and faster repairs. That is why water extraction ends up near power: melting and processing ice uses a lot of electricity, and a short cable loses less and is quicker to fix.
- **Slopes.** Every link of the network is measured on the topography: maximum slope, climb and descent. Steep slopes make driving and laying cables harder, and the habitat needs nearly flat ground (10° maximum by default). The limits can be adjusted.
- **Dates.** A launch delay changes everything. For each site, SeleneSight lists the landing windows from 2027 to 2030: continuous periods with the Sun and Earth in view. NASA chose the Artemis III regions seeking continuous sunlight for 6.5 days, and that is the starting value.

## Precisión y validación / Accuracy and validation

Las posiciones del Sol y de la Tierra se compararon con JPL Horizons, el sistema de efemérides de la NASA (DE441, marco lunar MOON_ME de alta precisión), para sitios y fechas reales. / Sun and Earth positions were compared with JPL Horizons, NASA's ephemeris system (DE441, high-precision MOON_ME lunar frame), for real sites and dates.

| | Máx. / Max |
|---|---|
| Sol desde el borde de Shackleton, octubre de 2027 / Sun from the rim of Shackleton, October 2027 | 0,14′ en azimut · 0,08′ en elevación |
| Tierra desde Malapert durante el eclipse del 26/06/2029 (con paralaje) / Earth from Malapert during the 26 Jun 2029 eclipse (with parallax) | 0,03′ · 0,02′ |
| Sol desde el mismo punto en diciembre de 2044 / Sun from the same point in December 2044 | 0,16′ · 0,04′ |

Un minuto de arco (′) es 1/60 de grado; el disco del Sol mide unos 32′. El error de posición es más de 100 veces menor que su radio. Las principales fuentes de incertidumbre están en otro lado: la resolución del terreno (40 m), el paso horario del cálculo (las salidas y puestas se conocen con ±1 h), la altura fija del observador (2 m), que cada hexágono usa el valor de su centro y que el modelo no incluye la refracción de la atmósfera terrestre durante los eclipses.

Detalle / Details: [`pipeline/VALIDATION.md`](pipeline/VALIDATION.md)

## Uso / Usage

```bash
cd app && python3 -m http.server 8000   # → http://localhost:8000
```
Publicable tal cual en GitHub Pages o Vercel desde la raíz / Deployable as-is to GitHub Pages or Vercel from the root.

### Regenerar datos / Regenerate data
Descargar en `data/` / Download into `data/`:
- https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/LDEM_80S_40M.IMG
- https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/LDEM_60S_240M.IMG
- (2 km, hasta 85°S / to 85°S) https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/LDEM_85S_40M.IMG + LDEM_75S_240M.IMG

```bash
pip install numpy numba pillow astronomy-engine
cd pipeline
python3 eph.py                                    # efemérides 2027–2045 + eclipses / ephemerides + eclipses
# 1) 2 km hasta 85°S (DEM de 85°S) / 2 km down to 85°S (85°S DEM)
SELENE_EXTENT=151680 SELENE_LEVELS=10000,5000,2000 SELENE_WORK=work python3 stages.py hz ../data/LDEM_85S_40M.IMG ../data/LDEM_75S_240M.IMG 600   # repetir / repeat
SELENE_EXTENT=151680 SELENE_WORK=work SELENE_LT=L10,L5,L2 python3 longterm.py run 600                                                         # repetir / repeat
python3 refine.py zones && python3 refine.py run 600                                                                                          # repetir / repeat
# 2) 10 y 5 km hasta 80°S (reutiliza los puntos ya calculados dentro de 85°S) / 10 and 5 km to 80°S (reuses points already done inside 85°S)
python3 stages.py hz ../data/LDEM_80S_40M.IMG ../data/LDEM_60S_240M.IMG 600                  # repetir hasta HZ_COMPLETO / repeat until HZ_COMPLETO
for T in L10 L5; do python3 stages.py fin ../data/LDEM_80S_40M.IMG ../data/LDEM_60S_240M.IMG $T; done
SELENE_EXTENT=151680 SELENE_LEVELS=2000 SELENE_WORK=work python3 stages.py fin ../data/LDEM_85S_40M.IMG ../data/LDEM_75S_240M.IMG L2
python3 longterm.py run 600 && python3 longterm.py fin                                        # repetir run hasta LT_COMPLETO / repeat run until LT_COMPLETO
SELENE_WORK=work SELENE_LT=L2 python3 longterm.py fin
python3 stages.py meta
# 3) 40 m: regiones de Artemis III (USGS) y sitios CLPS / Artemis III regions (USGS) and CLPS sites
python3 refine.py arun 600                         # repetir hasta RA_COMPLETO / repeat until RA_COMPLETO
python3 refine.py fin
python3 -c "import horizons as H; H.export_terrain('../data/LDEM_80S_40M.IMG', f=5)"
```

## Limitaciones / Limitations
- **ES:** el valor de cada hexágono es el de su centro, y la luz cambia en distancias de cientos de metros. El DEM tiene errores locales en zonas de sombra. La altura del observador está fija en 2 m. A 2 km de resolución, ningún centro de hexágono tiene noches de menos de 13 días: los picos con noches más cortas miden cientos de metros.
- **EN:** each hexagon's value is taken at its centre, and light varies over hundreds of metres. The DEM has local errors in shadowed areas. Observer height is fixed at 2 m. At 2 km resolution no hexagon centre has nights shorter than 13 days: peaks with shorter nights are hundreds of metres wide.

## Acerca de / About

**ES** — **El nombre.** Selene es la Luna en la mitología griega, y SeleneSight quiere decir “visión de Selene”. El nombre combina esa referencia clásica con la idea de line of sight (línea de visión), un concepto técnico fundamental en el polo: un panel solo genera energía si tiene línea de visión con el Sol, y una antena solo se comunica directamente con la Tierra si la ve por encima del relieve.

**EN** — **The name.** Selene is the Moon in Greek mythology, and SeleneSight means “Selene’s sight”. The name combines that classical reference with the idea of line of sight, a core technical concept at the pole: a panel only generates power if it has a line of sight to the Sun, and an antenna only talks directly with Earth if it sees it above the terrain.

**ES** — Daniel Gastelu (Uruguay). Maestro de Educación Media de Uruguay (ANEP-DGES) en las áreas de Astronomía e Informática. Proyecto para el NASA Space Apps Challenge 2026, sede global. Desarrollado con la asistencia de Gemini y Claude Code en la codificación y el testing.

**EN** — Daniel Gastelu (Uruguay). Secondary education teacher in Uruguay (ANEP-DGES) in Astronomy and Computer Science. Project for the NASA Space Apps Challenge 2026, global location. Built with the assistance of Gemini and Claude Code for coding and testing.

**ES** — Este proyecto participa en el NASA Space Apps Challenge 2026 y se rige por todos los términos y condiciones de las bases de participación: [2026 NASA Space Apps Participant Terms and Conditions](https://www.spaceappschallenge.org/legal/).

**EN** — This project takes part in the NASA Space Apps Challenge 2026 and is subject to all the terms and conditions of the participation rules: [2026 NASA Space Apps Participant Terms and Conditions](https://www.spaceappschallenge.org/legal/).

## Privacidad y protección de datos / Privacy and data protection

**ES** — SeleneSight no requiere registro, cuenta ni datos personales, y no usa cookies de seguimiento, publicidad ni analítica. En el propio navegador solo guarda preferencias de uso (idioma, modo Explorar o Planificar y si ya se vio el recorrido guiado), que nunca salen del dispositivo. El nombre que se escribe para el certificado de la trivia se usa únicamente para dibujar el PDF en el propio dispositivo: no se envía a ningún servidor ni se guarda. Como cualquier sitio web, el servicio que aloja las páginas puede registrar datos técnicos de acceso; SeleneSight no los usa. Por eso se puede usar en clase sin pedir datos a estudiantes.

**EN** — SeleneSight requires no sign-up, account or personal data, and uses no tracking cookies, advertising or analytics. The browser only stores usage preferences (language, Explore or Plan mode and whether the guided tour was seen), which never leave the device. The name typed for the quiz certificate is used only to draw the PDF on the device itself: it is not sent to any server or stored. As with any website, the service hosting the pages may log technical access data; SeleneSight does not use it. That is why it can be used in class without asking students for any data.

## Nota ética sobre el uso de IA / AI ethics note

**Nota ética sobre el uso de inteligencia artificial**

Este proyecto se hizo con la asistencia de herramientas de inteligencia artificial (IA), que participaron como coautoras y como soporte técnico. Queremos decirlo de forma clara.

*Qué hizo la IA*
- Ayudó a redactar textos y a traducirlos al inglés.
- Ayudó a escribir y probar el código de la aplicación.
- Propuso opciones de diseño y de organización de la interfaz.

*Qué hicieron las personas*
- Definieron la idea, el objetivo y el enfoque didáctico.
- Revisaron y aprobaron todos los textos y el comportamiento de la aplicación.
- Deciden qué se publica y asumen la responsabilidad de lo publicado.

La IA no tomó decisiones por su cuenta. Ante cualquier error o algo que no se entienda, la responsabilidad es del equipo humano y agradecemos que se nos avise.

---

**Ethics note on the use of artificial intelligence**

This project was made with the assistance of artificial intelligence (AI) tools, which took part as co-authors and as technical support. We want to say so clearly.

*What the AI did*
- Helped write texts and translate them into English.
- Helped write and test the application code.
- Proposed design and interface layout options.

*What the people did*
- Defined the idea, the goal and the teaching approach.
- Reviewed and approved all texts and the application's behaviour.
- Decide what is published and take responsibility for what is published.

The AI made no decisions on its own. For any error or anything unclear, responsibility lies with the human team, and we are grateful to be told.

## Créditos y referencias / Credits and references

Uso de los recursos del desafío: la topografía LOLA es la misma que muestran Quickmap y Moon Trek, que conviene usar para ver las imágenes del LRO de cada sitio; JPL Horizons se usó para validar las posiciones del Sol y la Tierra; la página de la CSA da contexto sobre la participación internacional en Artemis.

How the challenge resources were used: the LOLA topography is the same shown by Quickmap and Moon Trek, which are worth using to view LRO imagery of each site; JPL Horizons was used to validate Sun and Earth positions; the CSA page gives context on international participation in Artemis.

### Datos de topografía / Topography data

- Smith, D. E., et al. (2010). The Lunar Orbiter Laser Altimeter investigation on the Lunar Reconnaissance Orbiter mission. *Space Science Reviews*, 150, 209–241. doi:10.1007/s11214-009-9512-y
- Smith, D. E., et al. (2010). Initial observations from the Lunar Orbiter Laser Altimeter (LOLA). *Geophysical Research Letters*, 37(18). doi:10.1029/2010GL043751
- LOLA Gridded Data Records, polar stereographic LDEM_80S_40M, LDEM_60S_240M, LDEM_85S_40M and LDEM_75S_240M. NASA Planetary Data System, Geosciences Node / LOLA PDS Data Node (imbrium.mit.edu).

### Iluminación polar (métodos y comparación) / Polar illumination (methods and comparison)

- Mazarico, E., et al. (2011). Illumination conditions of the lunar polar regions using LOLA topography. *Icarus*, 211, 1066–1081. doi:10.1016/j.icarus.2010.10.030
- Bussey, D. B. J., et al. (2010). Illumination conditions of the south pole of the Moon derived using Kaguya topography. *Icarus*, 208, 558–564. doi:10.1016/j.icarus.2010.03.028
- Speyerer, E. J., & Robinson, M. S. (2013). Persistently illuminated regions at the lunar poles: Ideal sites for future exploration. *Icarus*, 222(1), 122–136. doi:10.1016/j.icarus.2012.10.010
- Gläser, P., et al. (2018). Illumination conditions at the lunar poles: Implications for future exploration. *Planetary and Space Science*, 162, 170–178.
- Barker, M. K., et al. Improved LOLA elevation maps for south pole landing sites: Error estimates and their impact on illumination conditions. *Planetary and Space Science*. doi:10.1016/j.pss.2020.105119
- Dynamic secondary illumination in permanent shadows within Artemis III candidate landing regions. *The Planetary Science Journal* (2024). doi:10.3847/PSJ/ad1b50

### Efemérides y marcos de referencia / Ephemerides and reference frames

- Cross, D. *Astronomy Engine* (MIT License), based on VSOP87 and NOVAS C 3.1, accurate to ±1 arcminute. github.com/cosinekitty/astronomy
- Archinal, B. A., et al. (2018). Report of the IAU Working Group on Cartographic Coordinates and Rotational Elements: 2015. *Celestial Mechanics and Dynamical Astronomy*, 130, 22. doi:10.1007/s10569-017-9805-5
- NASA/JPL Horizons System (DE441, MOON_ME frame), ssd.jpl.nasa.gov/horizons

### Sitios, misiones y regiones / Sites, missions and regions

- NASA (2024). NASA Provides Update on Artemis III Moon Landing Regions. News release, 28 Oct 2024.
- NASA NTRS 20250011660. Artemis III Site Selection Update: Downselection from thirteen to nine candidate regions (LPSC 2026).
- Wueller et al. (2026). Assessing potential landing sites with favorable illumination and accessible, potentially volatile-rich permanently shadowed regions within Artemis candidate landing regions. *JGR Planets*. doi:10.1029/2025JE009434 [Haworth HW01]
- Evaluating potential landing sites for the Artemis III mission using a multi-criteria decision making approach. *Acta Astronautica* (2024) [Nobile Rim 2]
- Robinson, M. (2025). IM-2 Landing Region. LROC, lroc.asu.edu/images/1401
- NASA (2024). NASA's LRO images Intuitive Machines' Odysseus lander
- IAU / USGS Gazetteer of Planetary Nomenclature: Statio Shiv Shakti (Chandrayaan-3).
- McClernan, M. (2024). Down-selected Artemis III candidate landing site navigational grids. USGS data release. doi:10.5066/P1MEQ6UK (contornos de las 9 regiones / outlines of the 9 regions; convex hull extracted by the open LunaNav project, MIT)
- Chang’e-7 planned site (88.8° S, 123.4° E), CNSA as cited on Wikipedia.
- Imagen del borde de Shackleton / Shackleton rim image: LROC, NASA/GSFC/Arizona State University.
- NASA NSSDC: Apollo Landing Site Coordinates (from LRO images; Wagner et al., *Icarus* 283, 2017).

### Recursos del desafío NASA Space Apps / NASA Space Apps challenge resources

- NASA Quickmap — quickmap.lroc.asu.edu
- NASA Moon Trek — trek.nasa.gov/moon
- NASA/JPL Horizons System — ssd.jpl.nasa.gov/horizons
- Canadian Space Agency (CSA), Moon exploration — asc-csa.gc.ca/eng/astronomy/moon-exploration/

### Software / Software

- three.js (MIT) · NumPy · Numba · Pillow · Playwright and axe-core (automated testing and accessibility checks).

## Para saber más / Learn more

- [NASA: Moon Base / NASA: Moon Base](https://www.nasa.gov/reference/moonbase-about/) — El plan actual de la NASA para una base permanente en el polo sur lunar, anunciado en 2026. / NASA's current plan for a permanent base at the lunar south pole, announced in 2026.
- [NASA: Lunar Living, el concepto Artemis Base Camp / NASA: Lunar Living, the Artemis Base Camp concept](https://www.nasa.gov/blogs/artemis/2020/10/28/lunar-living-nasas-artemis-base-camp-concept/) — El primer concepto de campamento base de 2020: hábitat, vehículos, energía y uso del hielo lunar. / The first base camp concept from 2020: habitat, vehicles, power and use of lunar ice.
- [NASA: regiones de alunizaje de Artemis III / NASA: Artemis III landing regions](https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/) — Las nueve regiones candidatas cerca del polo sur y cómo se eligieron. / The nine candidate regions near the south pole and how they were chosen.
