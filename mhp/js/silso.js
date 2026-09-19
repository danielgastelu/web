// Registro histórico de referencia: número de manchas solares suavizado en 13 meses (SILSO, versión 2.0).
// Fuente: SILSO, Real Observatorio de Bélgica, Bruselas, https://www.sidc.be/silso/  (licencia CC BY-NC 4.0).
// Valores mensuales transcriptos sin modificaciones de la tabla «Smoothed Sunspot Number» del Bureau of Meteorology de Australia
// (Australian Space Weather Forecasting Centre, https://www.sws.bom.gov.au/Solar/1/6), que la arma a partir de SILSO.
// Edición del 1 de septiembre de 2026. Cubre de enero de 2008 a febrero de 2026 (valores observados, sin estimaciones).
// Para actualizarlo con el archivo oficial usá tools/silso_to_js.js.
export const SILSO = {
  startYear: 2008,
  startMonth: 1,
  values: [6.6, 5.6, 5.1, 5.1, 5.3, 4.8, 4, 3.8, 3.2, 2.4, 2.3, 2.2, 2.5, 2.7, 2.9, 3.3, 3.5, 4.1, 5.5, 7.4, 9.5, 10.9, 11.7, 12.7, 14, 16.1, 18.5, 20.8, 23.1, 24.6, 25.2, 26.4, 29.5, 34.5, 39.1, 42.5, 45.7, 48.8, 53.8, 61.1, 69.3, 77.2, 83.6, 86.3, 86.6, 87.4, 89.4, 92.5, 95.5, 98.2, 98.3, 95.1, 90.9, 86.6, 84.5, 85.1, 85.3, 85.8, 87.7, 88.1, 86.8, 86.1, 84.4, 84.3, 87, 90.9, 94.6, 99, 104.7, 107, 106.9, 107.6, 109.3, 110.5, 114.3, 116.4, 115, 114.1, 112.6, 108.3, 101.9, 97.3, 94.7, 92.2, 89.3, 86.1, 82.2, 78.9, 76.1, 72.1, 68.3, 66.4, 65.9, 64.3, 61.2, 57.8, 54.4, 52.5, 50.4, 47.8, 44.8, 41.5, 38.5, 36, 33.2, 31.5, 29.9, 28.5, 27.8, 26.5, 25.7, 24.8, 23.3, 22.2, 21, 19.6, 18.3, 16.7, 15.4, 15, 14.2, 12.6, 9.9, 7.8, 7.5, 7.2, 7, 6.7, 6.5, 6.8, 6.7, 6, 5.4, 5, 4.5, 4.3, 3.9, 3.7, 3.5, 3.4, 3.1, 2.6, 2, 1.8, 2.2, 2.7, 3, 3.6, 5.6, 7.9, 9, 9.5, 10.5, 11.9, 13.6, 15.3, 17.2, 19, 21.7, 24.8, 25.8, 27.6, 31.4, 35.4, 40.2, 45.2, 50.8, 55.9, 60.1, 64.7, 68.7, 73, 77.4, 81.1, 86.7, 92.6, 96.5, 99, 101.2, 106.7, 113.3, 117.8, 121.1, 122.9, 124.2, 125.3, 124.6, 124.3, 124, 124.8, 127.9, 129.5, 131.1, 136.9, 141.4, 144.4, 149.1, 152.8, 155, 156.8, 159.4, 160.9, 157.2, 151.2, 146.2, 139.8, 135.9, 133.3, 128.6, 124.7, 122.5, 118.4, 113.1, 108.5, 106.9, 107, 104.2, 99.8]
};

const MID = 15; // cada valor se ubica a mitad de mes
const pointAt = i => {
  const m0 = SILSO.startMonth - 1 + i;
  return { t: Date.UTC(SILSO.startYear + Math.floor(m0 / 12), m0 % 12, MID), v: SILSO.values[i] };
};

export const SILSO_POINTS = SILSO.values.map((_, i) => pointAt(i));
export const SILSO_FIRST = SILSO_POINTS[0].t;
export const SILSO_LAST = SILSO_POINTS[SILSO_POINTS.length - 1].t;

/** Valor de referencia para una fecha (ms UTC), con interpolación lineal entre meses. Devuelve null fuera de rango. */
export function referenceAt(ms) {
  if (ms < SILSO_FIRST || ms > SILSO_LAST) return null;
  let lo = 0, hi = SILSO_POINTS.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (SILSO_POINTS[mid].t <= ms) lo = mid; else hi = mid;
  }
  const a = SILSO_POINTS[lo], b = SILSO_POINTS[hi];
  const f = (ms - a.t) / (b.t - a.t);
  return a.v + (b.v - a.v) * f;
}
