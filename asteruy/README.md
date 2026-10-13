# Uruguayos en el espacio: álbum de asteroides (PWA)

Álbum virtual instalable que funciona sin conexión. Cada cromo es un **asteroide** cuyo nombre
homenajea a una persona, un lugar o un proyecto vinculado al Uruguay. Los visitantes ingresan los
**códigos misterio** de 4 letras que encuentran en la feria para descubrir los cromos.

- **Cromo N.º 01 «Uruguayos en el espacio»**: no tiene código. Se gana al **instalar** el álbum
  (o al abrirlo desde la pantalla de inicio) y explica en qué consiste el álbum.
- **Cromos N.º 02 a 40**: los 39 asteroides, ordenados por número de asteroide.
- **Idiomas**: español, inglés, francés, portugués, italiano y alemán. El álbum elige el idioma del
  dispositivo y se puede cambiar con el menú desplegable de la cabecera; la elección se recuerda.

## Estructura
- `index.html`: página única
- `css/styles.css`: estilos (tema astronómico, fondo azul noche)
- `js/cromos.js`: catálogo en español (códigos, datos del asteroide, homenaje, créditos y fuentes)
- `js/i18n.js`: traducciones de la interfaz y de los cromos (es, en, fr, pt, it, de)
- `js/space.js`: cielo estrellado aleatorio, asteroides dibujados y esquema de órbitas
- `js/version.js`: versión y novedades (única fuente de verdad)
- `js/app.js`: lógica · `js/confetti.js`: lluvia de estrellas
- `sw.js`: service worker (caché offline + detección de versiones)
- `img/p<id>.webp`: imagen 256×256 de cada cromo (fotos de Wikimedia Commons o avatar neutro)
- `icons/`, `fonts/`, `manifest.webmanifest`

## Códigos misterio (para imprimir en la feria)
| N.º | Asteroide | Código | N.º | Asteroide | Código |
|---|---|---|---|---|---|
| 01 | Uruguayos en el espacio | *(al instalar)* | 21 | (17179) Codina | CDWE |
| 02 | (5088) Tancredi | XGQE | 22 | (17410) Zitarrosa | UNHM |
| 03 | (5346) Benedetti | LCGX | 23 | (17897) Gallardo | BCNZ |
| 04 | (5659) Vergara | WTQH | 24 | (17919) Licandro | GHLN |
| 05 | (5996) Julioangel | WBSQ | 25 | (20025) Petronaviera | RNYD |
| 06 | (6252) Montevideo | NGQP | 26 | (20054) Lagrimarios | EBZM |
| 07 | (6380) Gardel | GUSJ | 27 | (20055) Mariaespinola | URFZ |
| 08 | (7593) Cernuschi | WZLT | 28 | (20067) Marthanieves | LXSY |
| 09 | (9478) Caldeyro | QMLG | 29 | (20176) Aliciagoyena | BEWU |
| 10 | (10072) Uruguay | RPCZ | 30 | (20486) Lemos | EMVQ |
| 11 | (10476) Los Molinos | GRTU | 31 | (28051) Bruzzone | UQGS |
| 12 | (10477) Lacumparsita | XMPT | 32 | (30449) Caldas | DASV |
| 13 | (10512) Yamandu | NWDP | 33 | (31418) Sosaoyarzabal | DKXE |
| 14 | (10677) Colucci | ANPS | 34 | (34409) Venturini | YHRN |
| 15 | (10690) Massera | XSGA | 35 | (34808) Bocosur | QVRA |
| 16 | (10691) Sans | SMWT | 36 | (68853) Vaimaca | NBQY |
| 17 | (10700) Juanangelviera | UMCK | 37 | (73342) Guyunusa | ZQHT |
| 18 | (12648) Ibarbourou | ZXFL | 38 | (168039) Eefalcoacosta | BDRX |
| 19 | (12823) Pochintesta | LSXD | 39 | (434325) Lautreamont | RVTC |
| 20 | (16277) Mallada | GKVS | 40 | (598719) Alegalli | QWKG |

## Publicar una versión nueva (p. ej. más cromos)
1. Agrega el cromo en `js/cromos.js` con un **id nuevo** y su imagen en `img/p<id>.webp`.
   Agrega sus traducciones en `js/i18n.js` (si falta alguna, se muestra el texto en español).
2. Sube `APP_VERSION` en `js/version.js` y describe el cambio en `APP_NOTES`.
3. Publica. Quienes tengan el álbum abierto verán «¡Nueva versión!» con un botón **Actualizar**;
   su progreso se conserva.

## Pruebas
- Debe servirse por `https://` o `http://localhost` (el service worker no funciona con `file://`).
  Ejemplo: `python -m http.server 8765`
- Agrega `?test` a la URL para ver los botones «Simular instalación» y «Reiniciar álbum».

## Fuentes
Datos de descubrimiento, órbitas y homenajes: NASA/JPL Small-Body Database (citas oficiales del
MPC / boletines WGSBN de la IAU). Imágenes: Wikimedia Commons (autor y licencia en cada cromo).
La lista completa está en el botón «Fuentes y créditos» de la app.
