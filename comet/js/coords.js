// coords.js — matemática de coordenadas y métricas auxiliares (velocidad, rectitud, elongación)
import { IMAGE_SIZE, SOLAR_RADIUS_ARCSEC, CAMERA_INFO } from "./helioviewer.js";

/** Convierte un pixel (x,y) de la imagen (origen sup. izq., y hacia abajo) a coords físicas
 *  respecto del centro solar (que coincide con el centro de la imagen, ya que pedimos x0=y0=0). */
export function pixelToPhysical(x, y, camera) {
  const scale = CAMERA_INFO[camera].imageScale; // arcsec / px
  const dxPx = x - IMAGE_SIZE / 2;
  const dyPx = IMAGE_SIZE / 2 - y; // invertido: y de imagen crece hacia abajo, queremos "arriba = +"
  const dxArc = dxPx * scale;
  const dyArc = dyPx * scale;
  const elongArc = Math.hypot(dxArc, dyArc);
  const elongRsun = elongArc / SOLAR_RADIUS_ARCSEC;
  // ángulo medido desde el norte (arriba), sentido horario — aproximado
  let angleDeg = (Math.atan2(dxArc, dyArc) * 180) / Math.PI;
  if (angleDeg < 0) angleDeg += 360;
  return { dxArc, dyArc, elongArc, elongRsun, angleDeg };
}

/** Dado un array de marcas ordenadas por tiempo [{tISO,x,y}], calcula métricas de movimiento. */
export function trackMetrics(marks, camera) {
  const sorted = [...marks].sort((a, b) => a.tISO.localeCompare(b.tISO));
  const segments = [];
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1], b = sorted[i];
    const dtMin = (new Date(b.tISO) - new Date(a.tISO)) / 60000;
    const dPx = Math.hypot(b.x - a.x, b.y - a.y);
    const speedPxH = dtMin > 0 ? (dPx / dtMin) * 60 : null;
    segments.push({ from: a, to: b, dtMin, dPx, speedPxH });
  }

  const speeds = segments.map((s) => s.speedPxH).filter((v) => v != null);
  const avgSpeed = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null;
  const maxSpeed = speeds.length ? Math.max(...speeds) : null;
  const minSpeed = speeds.length ? Math.min(...speeds) : null;

  // variación de velocidad entre segmentos consecutivos (indicador de rectitud/constancia)
  let speedJumpMax = 0;
  for (let i = 1; i < speeds.length; i++) {
    speedJumpMax = Math.max(speedJumpMax, Math.abs(speeds[i] - speeds[i - 1]));
  }

  // desvío respecto de la recta ajustada por mínimos cuadrados (x=a+b·t, y=c+d·t)
  let maxResidualPx = null;
  if (sorted.length >= 3) {
    const t0 = new Date(sorted[0].tISO).getTime();
    const ts = sorted.map((p) => (new Date(p.tISO).getTime() - t0) / 60000);
    const xs = sorted.map((p) => p.x);
    const ys = sorted.map((p) => p.y);
    const fit = linreg(ts, xs);
    const fitY = linreg(ts, ys);
    maxResidualPx = 0;
    for (let i = 0; i < ts.length; i++) {
      const predX = fit.a + fit.b * ts[i];
      const predY = fitY.a + fitY.b * ts[i];
      const res = Math.hypot(xs[i] - predX, ys[i] - predY);
      maxResidualPx = Math.max(maxResidualPx, res);
    }
  }

  const info = CAMERA_INFO[camera];
  const flags = [];
  if (sorted.length < 5) flags.push(`Sólo ${sorted.length} cuadro(s) marcado(s) — se recomiendan 5 o más consecutivos.`);
  if (maxSpeed != null && maxSpeed > info.speedWarnPxH * 2.2) {
    flags.push(`Velocidad máxima (${maxSpeed.toFixed(1)} px/h) muy por encima de lo típico para ${camera} (~${info.speedWarnPxH} px/h) — revisar si es un cometa.`);
  }
  if (maxResidualPx != null && maxResidualPx > 12) {
    flags.push(`El trazado se aleja hasta ${maxResidualPx.toFixed(1)} px de una línea recta ajustada — verificar que no sea ruido o confusión entre objetos.`);
  }

  return { sorted, segments, avgSpeed, maxSpeed, minSpeed, speedJumpMax, maxResidualPx, flags };
}

function linreg(xs, ys) {
  const n = xs.length;
  const sx = xs.reduce((a, b) => a + b, 0);
  const sy = ys.reduce((a, b) => a + b, 0);
  const sxx = xs.reduce((a, b) => a + b * b, 0);
  const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const denom = n * sxx - sx * sx;
  if (Math.abs(denom) < 1e-9) return { a: sy / n, b: 0 };
  const b = (n * sxy - sx * sy) / denom;
  const a = (sy - b * sx) / n;
  return { a, b };
}
