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
    speedTypicalPxH: 70,        // velocidad típica de un cometa Kreutz en C2 (guía oficial)
    speedJumpTolerancePxH: 60,  // tolerancia de variación entre cuadros consecutivos (guía oficial)
  },
  C3: {
    label: "LASCO C3",
    imageScale: 56.0,           // arcsec/pixel, escala nativa de C3
    layers: "[SOHO,LASCO,C3,white-light,1,100]",
    defaultIntervalMin: 20,
    speedTypicalPxH: 10,        // velocidad típica de un cometa Kreutz en C3 (guía oficial)
    speedJumpTolerancePxH: 10,  // tolerancia de variación entre cuadros consecutivos (guía oficial)
  },
};

export const IMAGE_SIZE = 1024; // ancho y alto en píxeles de las imágenes que pedimos
export const SOLAR_RADIUS_ARCSEC = 959.63; // valor medio aprox., usado sólo para métricas auxiliares

const SCREENSHOT_BASE = "https://api.helioviewer.org/v2/takeScreenshot/";
const JP2_BASE = "https://api.helioviewer.org/v2/getJP2Image/";
const SOURCE_ID = { C2: 4, C3: 5 };

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

/**
 * Le pregunta a Helioviewer qué imagen REAL (fecha/hora exacta del dato original) es la que
 * mejor coincide con el instante pedido. Sirve para detectar el caso en que varios cuadros
 * pedidos "caen" sobre la MISMA imagen real (por ejemplo, si el intervalo elegido es más chico
 * que la cadencia real de datos disponible en ese tramo, o hay un hueco de cobertura): en ese
 * caso takeScreenshot puede devolver el mismo PNG para instantes distintos, y la animación
 * "avanza" en el reloj pero se ve siempre la misma imagen. Devuelve null si no se pudo resolver
 * (sin red, CORS, respuesta inesperada) — la app sigue funcionando igual, sólo sin este aviso.
 */
export async function resolveActualDate(dateUTC, camera) {
  const sourceId = SOURCE_ID[camera];
  const params = new URLSearchParams({
    date: dateUTC.toISOString().replace(/\.\d+Z$/, "Z"),
    sourceId: String(sourceId),
    jpip: "true",
    json: "true",
  });
  try {
    const resp = await fetch(`${JP2_BASE}?${params.toString()}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    const uri = data && data.uri;
    if (!uri) return null;
    // .../2026_09_21__09_48_22_585__SOHO_LASCO_C2_white-light.jp2
    const m = uri.match(/(\d{4})_(\d{2})_(\d{2})__(\d{2})_(\d{2})_(\d{2})_(\d{3})/);
    if (!m) return null;
    const [, Y, Mo, D, H, Mi, S, Ms] = m.map(Number);
    return new Date(Date.UTC(Y, Mo - 1, D, H, Mi, S, Ms)).toISOString();
  } catch (e) {
    return null;
  }
}
