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

// Enlaces de los créditos
export const LINKS = {
  silso: 'https://www.sidc.be/SILSO/',
  soho: 'https://soho.nascom.nasa.gov/',
  sdo: 'https://sdo.gsfc.nasa.gov/'
};

export const imageUrl = (ymd, year, time) =>
  `https://soho.nascom.nasa.gov/data/REPROCESSING/Completed/${year}/hmiigr/${ymd}/${ymd}_${time}_hmiigr_1024.jpg`;
