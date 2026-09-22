// report.js — genera el texto del reporte (formato alineado a los campos del formulario
// oficial de Sungrazer: https://sungrazer.nrl.navy.mil/form_instructions) y los exports
// (.txt, .json, .zip con recortes de evidencia cuando es posible).

import { trackMetrics, pixelToPhysical } from "./coords.js";
import { CAMERA_INFO, IMAGE_SIZE } from "./helioviewer.js";
import { makeZip } from "./zip.js";

function fmtUT(iso) {
  const d = new Date(iso);
  return d.toISOString().slice(0, 16).replace("T", " ") + " UT";
}

export function buildReportText({ profile, session, candidate, group, comments }) {
  const marks = Object.entries(candidate.marks).map(([frameId, m]) => ({
    tISO: frameId,
    x: m.x,
    y: m.y,
  }));
  const metrics = trackMetrics(marks, session.camera);
  const info = CAMERA_INFO[session.camera];
  const first = metrics.sorted[0];

  const lines = [];
  lines.push("REPORTE DE CANDIDATO A COMETA SUNGRAZER (generado localmente, no enviado)");
  lines.push(`Generado: ${new Date().toISOString()}`);
  lines.push("Herramienta: Sungrazer Hunter PWA (no oficial / no afiliada al NRL)");
  lines.push("");
  lines.push(`Observador: ${profile.name || "(sin nombre — completar en Perfil)"}`);
  if (profile.notes) lines.push(`Afiliación / notas: ${profile.notes}`);
  lines.push(`Fecha de la primera imagen: ${first ? first.tISO.slice(0, 10) : session.date}`);
  lines.push(`Cámara: ${info.label}`);
  lines.push(`Tamaño de imagen: ${IMAGE_SIZE} x ${IMAGE_SIZE}`);
  lines.push("Esquina de referencia (0,0): superior izquierda — X crece a la derecha, Y crece hacia abajo");
  lines.push(`Grupo de cometa (si se conoce): ${group || "Desconocido"}`);
  lines.push("");
  lines.push(`Candidato: ${candidate.label}`);
  lines.push("Observaciones (hora UT, x, y):");
  metrics.sorted.forEach((m, i) => {
    lines.push(`  ${String(i + 1).padStart(2, "0")}) ${fmtUT(m.tISO)}   x=${Math.round(m.x)}   y=${Math.round(m.y)}`);
  });
  lines.push("");
  lines.push("Notas automáticas (auxiliares — no son campos del formulario oficial):");
  if (metrics.avgSpeed != null) {
    lines.push(`  - Velocidad promedio: ${metrics.avgSpeed.toFixed(1)} px/h (mín ${metrics.minSpeed.toFixed(1)}, máx ${metrics.maxSpeed.toFixed(1)})`);
  }
  if (metrics.maxResidualPx != null) {
    lines.push(`  - Desvío máx. respecto de una trayectoria rectilínea ajustada: ${metrics.maxResidualPx.toFixed(1)} px`);
  }
  if (first) {
    const last = metrics.sorted[metrics.sorted.length - 1];
    const phys = pixelToPhysical(last.x, last.y, session.camera);
    lines.push(`  - Elongación aprox. en el último cuadro: ${phys.elongRsun.toFixed(2)} R☉ (${phys.elongArc.toFixed(0)}")`);
    lines.push(`  - Ángulo aprox. desde el norte solar (sentido horario): ${phys.angleDeg.toFixed(0)}°`);
  }
  if (metrics.flags.length) {
    lines.push("  Alertas:");
    metrics.flags.forEach((f) => lines.push(`   ⚠ ${f}`));
  } else {
    lines.push("  Sin alertas automáticas de consistencia de movimiento.");
  }
  lines.push("");
  lines.push("Comentarios del observador:");
  lines.push(comments && comments.trim() ? comments.trim() : "(ninguno)");
  lines.push("");
  lines.push("-----");
  lines.push("IMPORTANTE: este reporte NO fue enviado a la Marina de EE.UU. / NRL.");
  lines.push("Para reportarlo oficialmente, volcá estos datos en:");
  lines.push("  https://sungrazer.nrl.navy.mil/report");
  lines.push("(instrucciones de cada campo: https://sungrazer.nrl.navy.mil/form_instructions)");
  return lines.join("\n");
}

export function buildReportJson({ profile, session, candidate, group, comments }) {
  const marks = Object.entries(candidate.marks).map(([frameId, m]) => ({ tISO: frameId, x: m.x, y: m.y }));
  const metrics = trackMetrics(marks, session.camera);
  return {
    generatedAt: new Date().toISOString(),
    tool: "Sungrazer Hunter PWA (no oficial)",
    observer: profile,
    camera: session.camera,
    imageSize: IMAGE_SIZE,
    originCorner: "top-left",
    cometGroup: group || null,
    candidateLabel: candidate.label,
    comments: comments || "",
    observations: metrics.sorted,
    autoMetrics: {
      avgSpeedPxH: metrics.avgSpeed,
      minSpeedPxH: metrics.minSpeed,
      maxSpeedPxH: metrics.maxSpeed,
      maxResidualPx: metrics.maxResidualPx,
      flags: metrics.flags,
    },
  };
}

/** Intenta recortar una región de una imagen ya cargada en <img> alrededor de (x,y).
 *  Puede fallar por restricciones CORS (canvas "tainted"); en ese caso devuelve null. */
function tryCropDataUrl(imgEl, x, y, size = 160) {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(
      imgEl,
      x - size / 2, y - size / 2, size, size,
      0, 0, size, size
    );
    return canvas.toDataURL("image/png");
  } catch (e) {
    return null;
  }
}

function dataUrlToBytes(dataUrl) {
  const b64 = dataUrl.split(",")[1];
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Genera el .zip con reporte.txt + reporte.json + recortes de cada cuadro marcado
 *  (si el navegador puede leerlos; si no, se omiten y se avisa en notas.txt). */
export async function buildReportZip({ profile, session, candidate, group, comments, frameImages }) {
  const txt = buildReportText({ profile, session, candidate, group, comments });
  const json = buildReportJson({ profile, session, candidate, group, comments });
  const files = [
    { name: "reporte.txt", data: txt },
    { name: "reporte.json", data: JSON.stringify(json, null, 2) },
  ];

  let cropsOk = 0, cropsFailed = 0;
  for (const [frameId, mark] of Object.entries(candidate.marks)) {
    const imgEl = frameImages.get(frameId);
    if (!imgEl) continue;
    const dataUrl = tryCropDataUrl(imgEl, mark.x, mark.y);
    if (dataUrl) {
      const safeName = frameId.replace(/[:.]/g, "-");
      files.push({ name: `recortes/${safeName}.png`, data: dataUrlToBytes(dataUrl) });
      cropsOk++;
    } else {
      cropsFailed++;
    }
  }

  if (cropsFailed > 0 && cropsOk === 0) {
    files.push({
      name: "recortes/AVISO.txt",
      data:
        "No se pudieron generar recortes de imagen: el navegador bloqueó la lectura de las " +
        "imágenes por política de origen cruzado (CORS) desde la API de Helioviewer. " +
        "El reporte de texto y JSON sí se generaron correctamente.",
    });
  }

  return makeZip(files);
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
