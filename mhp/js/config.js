// Ajustes editables del proyecto. No hace falta tocar el resto del código para cambiarlos.

export const APP = {
  version: '1.0.0',
  year: 2026
};

// Datos de la sección «Acerca de». Los campos vacíos se muestran como «por completar».
// Nombres institucionales: no se traducen, se muestran igual en los 6 idiomas.
export const ABOUT = {
  siteUrl: 'https://edytic.ces.edu.uy/',                    // Dirección pública de la app, p. ej. 'https://…'
  institution: 'DGES - EDyTIC - Contenidistas de Astronomía 2026',  // Institución donde trabajan las personas del equipo
  contact: 'recursosastronomia@uruguayeduca.edu.uy',        // Correo o enlace de contacto (opcional)
  contactSubject: 'App actividad solar'                     // Asunto prellenado del mailto (opcional, solo aplica a un correo)
};

// Reglas del laboratorio
export const LAB = {
  R_MIN: 22,         // Solo cuentan las observaciones con R mayor que este valor
  K_FIRST: 11,       // Primera evaluación de k: «más de 10» observaciones que cuentan
  K_STEP: 10,        // Se reevalúa cada 10 observaciones más que cuenten
  K_MIN: 0.1,
  K_MAX: 5,
  K_CLOSE: 0.02,     // Diferencia bajo la cual el k actual ya se considera ajustado
  ZOOMS: [2, 4, 8],
  // Imágenes SOHO/SDO HMI (intensitygram reprocesado). Se prueba cada horario hasta encontrar una.
  IMG_TIMES: ['0000', '1200', '0600', '1800', '0130', '1330'],
  IMG_TIMEOUT_MS: 9000,
  RANDOM_FROM: [2015, 0, 1],
  RANDOM_TO: [2023, 11, 31],
  RANDOM_TRIES: 4,          // «Al azar» prueba hasta 4 fechas si una no tiene imagen
  DATE_MIN: '2010-05-01'    // Desde que hay imágenes de HMI
};

// Medallas, en orden de dificultad. Textos: claves med_<id>_t (título) y med_<id>_g (meta) en strings.js.
// metric: 'dates' = fechas del Sol distintas registradas; 'days' = días del calendario con al menos un registro.
// tier: color del aro (1 bronce, 2 plata, 3 oro).
export const MEDALS = [
  { id: 'novel',    emoji: '🔭', metric: 'dates', goal: 1,   tier: 1 },
  { id: 'aventura', emoji: '🌅', metric: 'days',  goal: 5,   tier: 1 },
  { id: 'centinela',emoji: '🛡️', metric: 'days',  goal: 30,  tier: 2 },
  { id: 'cronista', emoji: '📜', metric: 'dates', goal: 50,  tier: 2 },
  { id: 'maestria', emoji: '🏆', metric: 'dates', goal: 100, tier: 3 }
];

// Medallas «Conmemorativas» (cumpleaños de personalidades), en orden de calendario. Se ganan al guardar una observación ese día (MM-DD), de cualquier año.
// Textos: bd_<id>_t (título), bd_<id>_n (nombre completo), bd_<id>_p (perfil) en strings.js.
// wiki: título del artículo en cada idioma. photo: archivo en Wikimedia Commons y autoría (dominio público).
export const BIRTHDAYS = [
  { id: 'newton', date: '01-04', years: '1643–1727',
    wiki: { es: 'Isaac Newton', en: 'Isaac Newton', fr: 'Isaac Newton', it: 'Isaac Newton', pt: 'Isaac Newton', de: 'Isaac Newton' },
    photo: { file: 'Portrait_of_Sir_Isaac_Newton,_1689_(brightened).jpg', author: 'Godfrey Kneller (1689)' } },
  { id: 'galileo', date: '02-25', years: '1564–1642',
    wiki: { es: 'Galileo Galilei', en: 'Galileo Galilei', fr: 'Galilée (savant)', it: 'Galileo Galilei', pt: 'Galileu Galilei', de: 'Galileo Galilei' },
    photo: { file: 'Galileo_Galilei_(1564-1642)_RMG_BHC2700.tiff', author: 'Justus Sustermans (1636)' } },
  { id: 'copernico', date: '02-28', years: '1473–1543',
    wiki: { es: 'Nicolás Copérnico', en: 'Nicolaus Copernicus', fr: 'Nicolas Copernic', it: 'Niccolò Copernico', pt: 'Nicolau Copérnico', de: 'Nikolaus Kopernikus' },
    photo: { file: 'Nikolaus_Kopernikus_MOT.jpg', author: '' } },
  { id: 'hipatia', date: '03-15', years: '355/370–415', circa: true, memorial: true,
    wiki: { es: 'Hipatia', en: 'Hypatia', fr: 'Hypatie', it: 'Ipazia', pt: 'Hipátia', de: 'Hypatia' },
    photo: { file: 'Hypatia_portrait.png', author: 'Jules Maurice Gaspard (1908)', artistic: true } },
  { id: 'jackson', date: '04-09', years: '1921–2005',
    wiki: { es: 'Mary Jackson (ingeniera)', en: 'Mary Jackson (engineer)', fr: 'Mary Jackson (mathématicienne)', it: 'Mary Jackson', pt: 'Mary Jackson', de: 'Mary Jackson (Ingenieurin)' },
    photo: { file: 'Mary_Jackson_1979_Portrait_(LRC-1979-B701_P_F002-07086).jpg', author: 'NASA Langley, Bob Nye (1979)' } },
  { id: 'roman', date: '05-16', years: '1925–2018',
    wiki: { es: 'Nancy Roman', en: 'Nancy Grace Roman', fr: 'Nancy Grace Roman', it: 'Nancy Roman', pt: 'Nancy Grace Roman', de: 'Nancy Roman' },
    photo: { file: 'Nancy_Grace_Roman_1969_NASA_Portrait_(41124536895).jpg', author: 'NASA (1969)' } },
  { id: 'wolf', date: '07-07', years: '1816–1893',
    wiki: { es: 'Rudolf Wolf', en: 'Rudolf Wolf', fr: 'Johann Rudolf Wolf', it: 'Johann Rudolf Wolf', pt: 'Rudolf Wolf', de: 'Rudolf Wolf (Astronom)' },
    photo: { file: 'ETH-BIB-Wolf,_Johann_Rudolf_(1816-1893)-Portrait-Portr_12033-RE.tif_(cropped).jpg', author: 'Emil Gassler' } },
  { id: 'johnson', date: '08-26', years: '1918–2020',
    wiki: { es: 'Katherine Johnson', en: 'Katherine Johnson', fr: 'Katherine Johnson', it: 'Katherine Johnson', pt: 'Katherine Johnson', de: 'Katherine Johnson' },
    photo: { file: 'Katherine_Johnson_1983.jpg', author: 'NASA (1983)' } },
  { id: 'vaughan', date: '09-20', years: '1910–2008',
    wiki: { es: 'Dorothy Vaughan', en: 'Dorothy Vaughan', fr: 'Dorothy Vaughan', it: 'Dorothy Vaughan', pt: 'Dorothy Vaughan', de: 'Dorothy Vaughan' },
    photo: { file: 'Dorothy_Vaughan_2.jpg', author: 'NASA' } },
  { id: 'sagan', date: '11-09', years: '1934–1996',
    wiki: { es: 'Carl Sagan', en: 'Carl Sagan', fr: 'Carl Sagan', it: 'Carl Sagan', pt: 'Carl Sagan', de: 'Carl Sagan' },
    photo: { file: 'Carl_Sagan_Planetary_Society.JPG', author: 'NASA/JPL' } }
];
export const portraitUrl = id => `img/${id}.jpg`;
export const wikiUrl = (lang, title) => `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
export const commonsUrl = file => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`;

// Enlaces de los créditos
export const LINKS = {
  silso: 'https://www.sidc.be/SILSO/',
  soho: 'https://soho.nascom.nasa.gov/',
  sdo: 'https://sdo.gsfc.nasa.gov/'
};

export const imageUrl = (ymd, year, time) =>
  `https://soho.nascom.nasa.gov/data/REPROCESSING/Completed/${year}/hmiigr/${ymd}/${ymd}_${time}_hmiigr_1024.jpg`;
