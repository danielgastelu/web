// Ajustes editables del proyecto. No hace falta tocar el resto del código para cambiarlos.

export const APP = {
  version: '1.0.0',
  year: 2026
};

// Datos de la sección «Acerca de». Los campos vacíos se muestran como «por completar».
export const ABOUT = {
  siteUrl: '',       // Dirección pública de la app, p. ej. 'https://…'
  institution: '',   // Institución donde trabajan las personas del equipo
  contact: ''        // Correo o enlace de contacto (opcional)
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

// Enlaces de los créditos
export const LINKS = {
  silso: 'https://www.sidc.be/SILSO/',
  soho: 'https://soho.nascom.nasa.gov/',
  sdo: 'https://sdo.gsfc.nasa.gov/'
};

export const imageUrl = (ymd, year, time) =>
  `https://soho.nascom.nasa.gov/data/REPROCESSING/Completed/${year}/hmiigr/${ymd}/${ymd}_${time}_hmiigr_1024.jpg`;
