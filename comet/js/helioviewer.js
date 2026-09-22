// helioviewer.js — construcción de URLs de imagen y generación de secuencias
// Usa la API pública de Helioviewer (https://api.helioviewer.org/) sobre datos SOHO/LASCO.
// takeScreenshot con display=true devuelve directamente un PNG binario: sirve tal cual
// como src de <img>, sin problemas de CORS (los <img> no requieren cabeceras CORS para
// mostrarse, sólo harían falta para leer píxeles vía canvas, cosa que esta app no hace).

export const CAMERA_INFO = {
  C2: {
    label: "LASCO C2",
    imageScale: 11.9,           // arcsec/pixel, escala nativa de C2
    layers: "[SOHO,LASCO,C2,white-light,1,100]",
    defaultIntervalMin: 12,     // cadencia típica aproximada
    speedWarnPxH: 70,           // referencia orientativa (grupo Kreutz en C2)
  },
  C3: {
    label: "LASCO C3",
    imageScale: 56.0,           // arcsec/pixel, escala nativa de C3
    layers: "[SOHO,LASCO,C3,white-light,1,100]",
    defaultIntervalMin: 20,
    speedWarnPxH: 10,           // referencia orientativa (grupo Kreutz en C3)
  },
};

export const IMAGE_SIZE = 1024; // ancho y alto en píxeles de las imágenes que pedimos
export const SOLAR_RADIUS_ARCSEC = 959.63; // valor medio aprox., usado sólo para métricas auxiliares

const SCREENSHOT_BASE = "https://api.helioviewer.org/v2/takeScreenshot/";

/** Arma la URL de imagen (PNG) más cercana a la fecha/hora UTC indicada. */
export function frameImageUrl(dateUTC, camera) {
  const info = CAMERA_INFO[camera];
  const params = new URLSearchParams({
    date: dateUTC.toISOString().replace(/\.\d+Z$/, "Z"),
    imageScale: String(info.imageScale),
    layers: info.layers,
    width: String(IMAGE_SIZE),
    height: String(IMAGE_SIZE),
    x0: "0",
    y0: "0",
    display: "true",
    watermark: "false",
  });
  return `${SCREENSHOT_BASE}?${params.toString()}`;
}

/**
 * Genera la lista de instantes (UTC) de un set, dado un día, hora de inicio/fin (UTC, "HH:MM")
 * y un intervalo en minutos. Si "fin" <= "inicio" se asume que cruza medianoche.
 */
export function buildTimeline(dateStr, startHHMM, endHHMM, intervalMin) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [sh, sm] = startHHMM.split(":").map(Number);
  const [eh, em] = endHHMM.split(":").map(Number);

  let start = Date.UTC(y, m - 1, d, sh, sm, 0);
  let end = Date.UTC(y, m - 1, d, eh, em, 0);
  if (end <= start) end += 24 * 3600 * 1000; // cruza medianoche

  const step = Math.max(1, Number(intervalMin)) * 60 * 1000;
  const times = [];
  for (let t = start; t <= end; t += step) {
    times.push(new Date(t));
  }
  // límite de seguridad para no generar sets gigantes por error de datos
  return times.slice(0, 400);
}

/** Construye un objeto "frame" listo para usar en la app a partir de un instante y cámara. */
export function makeFrame(dateUTC, camera) {
  return {
    id: dateUTC.toISOString(),
    tISO: dateUTC.toISOString(),
    url: frameImageUrl(dateUTC, camera),
  };
}
