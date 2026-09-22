// app.js — controlador principal de la PWA Sungrazer Hunter
import { CAMERA_INFO, IMAGE_SIZE, buildTimeline, makeFrame } from "./helioviewer.js";
import { trackMetrics } from "./coords.js";
import * as storage from "./storage.js";
import { buildReportText, buildReportJson, buildReportZip, downloadBlob } from "./report.js";

const PALETTE = ["#ff6b6b", "#5ac8ff", "#63e6a4", "#ffb03b", "#c792ea", "#f783ac", "#66d9e8", "#eebefa"];
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// ---------- estado ----------
let profile = storage.loadProfile();
let session = null;        // sesión actual (set de imágenes + candidatos)
let frameIndex = 0;
let activeCandidateId = null;
let zoom = 1, panX = 0, panY = 0;

// ---------- helpers de tiempo ----------
function fmtUTShort(iso) {
  return new Date(iso).toISOString().slice(11, 16) + " UT";
}
function fmtLocal(iso) {
  try {
    return new Date(iso).toLocaleString("es-UY", {
      timeZone: "America/Montevideo",
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    }) + " (Montevideo)";
  } catch {
    return "";
  }
}

// ================= TABS =================
$$(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".tab-btn").forEach((b) => { b.classList.remove("active"); b.setAttribute("aria-selected", "false"); });
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    $$(".tab-panel").forEach((p) => p.classList.remove("active"));
    $(`#tab-${btn.dataset.tab}`).classList.add("active");
    if (btn.dataset.tab !== "explorar") stopPlayback();
    if (btn.dataset.tab === "reportes") renderSessionsList();
  });
});

// ================= PERFIL =================
function fillProfileForm() {
  $("#pName").value = profile.name || "";
  $("#pEmail").value = profile.email || "";
  $("#pNotes").value = profile.notes || "";
}
$("#btnGuardarPerfil").addEventListener("click", () => {
  profile = {
    name: $("#pName").value.trim(),
    email: $("#pEmail").value.trim(),
    notes: $("#pNotes").value.trim(),
  };
  storage.saveProfile(profile);
  $("#perfilStatus").textContent = "Perfil guardado ✓";
  setTimeout(() => ($("#perfilStatus").textContent = ""), 2500);
});
fillProfileForm();

// ================= GENERAR SET =================
$("#fDate").value = new Date().toISOString().slice(0, 10);
function updateLocalHint() {
  const date = $("#fDate").value, start = $("#fStart").value, end = $("#fEnd").value;
  if (!date || !start || !end) return;
  const startIso = `${date}T${start}:00Z`;
  $("#localTimeHint").textContent =
    `Inicio en hora local: ${fmtLocal(startIso)}. Los horarios del formulario se registran en UT (tiempo universal).`;
}
["fDate", "fStart", "fEnd"].forEach((id) => $("#" + id).addEventListener("change", updateLocalHint));
$("#fCamera").addEventListener("change", () => {
  const cam = $("#fCamera").value;
  $("#fInterval").value = CAMERA_INFO[cam].defaultIntervalMin;
});
updateLocalHint();

$("#btnGenerar").addEventListener("click", () => generateSet());
$("#btnExtenderAntes").addEventListener("click", () => extendSet(-1));
$("#btnExtenderDespues").addEventListener("click", () => extendSet(1));

function generateSet() {
  stopPlayback();
  const date = $("#fDate").value;
  const camera = $("#fCamera").value;
  const start = $("#fStart").value;
  const end = $("#fEnd").value;
  const interval = Number($("#fInterval").value) || CAMERA_INFO[camera].defaultIntervalMin;

  const times = buildTimeline(date, start, end, interval);
  if (times.length === 0) {
    $("#setStatus").textContent = "No se generaron cuadros: revisá el rango horario.";
    return;
  }
  session = {
    id: storage.newId("sess"),
    createdAt: new Date().toISOString(),
    date, camera, start, end, interval,
    frames: times.map((t) => makeFrame(t, camera)),
    candidates: [],
  };
  frameIndex = 0;
  activeCandidateId = null;
  $("#btnExtenderAntes").disabled = false;
  $("#btnExtenderDespues").disabled = false;
  $("#setStatus").textContent = `Set generado: ${session.frames.length} cuadro(s) de ${CAMERA_INFO[camera].label}.`;
  $("#viewerEmpty").hidden = true;
  $("#zoomLayer").hidden = false;

  renderFilmstrip();
  renderCandidates();
  loadFrame(0);
  resetZoom();
  persistSession();
}

function extendSet(direction) {
  if (!session) return;
  stopPlayback();
  const step = session.interval * 60 * 1000;
  const n = 6; // cuántos cuadros agregar de una
  const newFrames = [];
  if (direction < 0) {
    const firstT = new Date(session.frames[0].tISO).getTime();
    for (let i = n; i >= 1; i--) newFrames.push(makeFrame(new Date(firstT - i * step), session.camera));
    session.frames = [...newFrames, ...session.frames];
    frameIndex += n;
  } else {
    const lastT = new Date(session.frames[session.frames.length - 1].tISO).getTime();
    for (let i = 1; i <= n; i++) newFrames.push(makeFrame(new Date(lastT + i * step), session.camera));
    session.frames = [...session.frames, ...newFrames];
  }
  renderFilmstrip();
  loadFrame(frameIndex);
  persistSession();
}

// ================= VISOR / FRAMES =================
const frameImg = $("#frameImg");
const zoomLayer = $("#zoomLayer");
const overlay = $("#markerOverlay");
const stageWrap = $("#stageWrap");

function loadFrame(idx) {
  if (!session || !session.frames[idx]) return;
  frameIndex = idx;
  const f = session.frames[idx];
  frameImg.src = f.url;
  $("#frameLabel").textContent = `Cuadro ${idx + 1} / ${session.frames.length} — ${fmtUTShort(f.tISO)} · ${fmtLocal(f.tISO)}`;
  $$("#filmstrip .thumb").forEach((t, i) => t.classList.toggle("active", i === idx));
  const activeThumb = $(`#filmstrip .thumb[data-idx="${idx}"]`);
  // "block: nearest" es clave: sin especificarlo, el navegador puede scrollear
  // verticalmente toda la página al cambiar de cuadro, corriendo el visor bajo el cursor.
  if (activeThumb) activeThumb.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
  renderOverlay();
}

$("#btnPrevFrame").addEventListener("click", () => { stopPlayback(); loadFrame(Math.max(0, frameIndex - 1)); });
$("#btnNextFrame").addEventListener("click", () => { stopPlayback(); loadFrame(Math.min(session.frames.length - 1, frameIndex + 1)); });

// ---------- reproducción automática (flipbook / blink) ----------
// Técnica clásica de caza de cometas: reproducir la secuencia en bucle (o alternar
// rápidamente entre dos cuadros, con velocidad "Blink") para que el ojo detecte lo que
// se mueve de forma consistente frente al fondo de estrellas fijas.
let playTimer = null;
const btnPlay = $("#btnPlay");

function isPlaying() { return playTimer !== null; }

function stopPlayback() {
  if (playTimer) { clearInterval(playTimer); playTimer = null; }
  btnPlay.classList.remove("playing");
  btnPlay.innerHTML = "&#9654; Reproducir";
}

function startPlayback() {
  if (!session || session.frames.length < 2) return;
  const speed = Number($("#fPlaySpeed").value) || 350;
  playTimer = setInterval(() => {
    loadFrame((frameIndex + 1) % session.frames.length);
  }, speed);
  btnPlay.classList.add("playing");
  btnPlay.innerHTML = "&#10074;&#10074; Pausar";
}

function togglePlayback() { isPlaying() ? stopPlayback() : startPlayback(); }

btnPlay.addEventListener("click", togglePlayback);
$("#fPlaySpeed").addEventListener("change", () => { if (isPlaying()) { stopPlayback(); startPlayback(); } });

function renderFilmstrip() {
  const el = $("#filmstrip");
  el.innerHTML = "";
  session.frames.forEach((f, i) => {
    const div = document.createElement("div");
    div.className = "thumb";
    div.dataset.idx = i;
    div.title = fmtUTShort(f.tISO);
    const img = document.createElement("img");
    img.src = f.url;
    img.loading = "lazy";
    img.alt = "";
    const time = document.createElement("div");
    time.className = "thumb-time";
    time.textContent = fmtUTShort(f.tISO);
    const dots = document.createElement("div");
    dots.className = "thumb-dots";
    dots.id = `dots-${i}`;
    div.append(img, time, dots);
    div.addEventListener("click", () => { stopPlayback(); loadFrame(i); });
    el.appendChild(div);
  });
  renderFilmstripDots();
}

function renderFilmstripDots() {
  if (!session) return;
  session.frames.forEach((f, i) => {
    const dotsEl = $(`#dots-${i}`);
    if (!dotsEl) return;
    dotsEl.innerHTML = "";
    session.candidates.forEach((c) => {
      if (c.marks[f.id]) {
        const dot = document.createElement("span");
        dot.style.background = c.color;
        dotsEl.appendChild(dot);
      }
    });
  });
}

// ---------- zoom / pan ----------
function applyTransform() {
  zoomLayer.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  $("#zoomLabel").textContent = `${Math.round(zoom * 100)}%`;
}
function resetZoom() { zoom = 1; panX = 0; panY = 0; applyTransform(); }
$("#btnZoomIn").addEventListener("click", () => { zoom = Math.min(8, zoom * 1.4); applyTransform(); });
$("#btnZoomOut").addEventListener("click", () => { zoom = Math.max(1, zoom / 1.4); applyTransform(); });
$("#btnZoomReset").addEventListener("click", resetZoom);

stageWrap.addEventListener("wheel", (e) => {
  if (!session) return;
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  zoom = Math.min(8, Math.max(1, zoom * factor));
  if (zoom === 1) { panX = 0; panY = 0; }
  applyTransform();
}, { passive: false });

// click = marcar, arrastrar = pan
let dragState = null;
zoomLayer.addEventListener("mousedown", (e) => {
  dragState = { startX: e.clientX, startY: e.clientY, panX0: panX, panY0: panY, moved: false };
});
window.addEventListener("mousemove", (e) => {
  if (!dragState) return;
  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;
  if (Math.hypot(dx, dy) > 4) {
    dragState.moved = true;
    panX = dragState.panX0 + dx;
    panY = dragState.panY0 + dy;
    applyTransform();
  }
});
window.addEventListener("mouseup", (e) => {
  if (!dragState) return;
  if (!dragState.moved) handleMarkClick(e);
  dragState = null;
});

function clientToImagePixel(clientX, clientY) {
  const rect = frameImg.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * IMAGE_SIZE;
  const y = ((clientY - rect.top) / rect.height) * IMAGE_SIZE;
  return { x, y };
}

function handleMarkClick(e) {
  if (isPlaying()) { stopPlayback(); return; } // un clic durante la reproducción pausa, no marca
  if (!session || !activeCandidateId) {
    if (session && !activeCandidateId) $("#setStatus").textContent = "Creá o elegí un candidato antes de marcar (botón “+ Nuevo candidato”).";
    return;
  }
  const { x, y } = clientToImagePixel(e.clientX, e.clientY);
  if (x < 0 || y < 0 || x > IMAGE_SIZE || y > IMAGE_SIZE) return;
  const cand = session.candidates.find((c) => c.id === activeCandidateId);
  if (!cand) return;
  const frameId = session.frames[frameIndex].id;
  cand.marks[frameId] = { x, y };
  renderOverlay();
  renderCandidates();
  renderFilmstripDots();
  persistSession();
}

$("#btnBorrarMarca").addEventListener("click", () => {
  if (!session || !activeCandidateId) return;
  const cand = session.candidates.find((c) => c.id === activeCandidateId);
  const frameId = session.frames[frameIndex]?.id;
  if (cand && frameId && cand.marks[frameId]) {
    delete cand.marks[frameId];
    renderOverlay(); renderCandidates(); renderFilmstripDots(); persistSession();
  }
});

function renderOverlay() {
  overlay.innerHTML = "";
  if (!session) return;
  const frameId = session.frames[frameIndex]?.id;
  if (!frameId) return;
  session.candidates.forEach((c) => {
    const m = c.marks[frameId];
    if (!m) return;
    const isActive = c.id === activeCandidateId;
    const ns = "http://www.w3.org/2000/svg";
    const g = document.createElementNS(ns, "g");
    const circle = document.createElementNS(ns, "circle");
    circle.setAttribute("cx", m.x); circle.setAttribute("cy", m.y);
    circle.setAttribute("r", isActive ? 26 : 20);
    circle.setAttribute("fill", c.color);
    circle.setAttribute("stroke", c.color);
    circle.classList.add("marker-dot");
    circle.setAttribute("stroke-width", isActive ? 6 : 4);
    const label = document.createElementNS(ns, "text");
    label.setAttribute("x", m.x + 30); label.setAttribute("y", m.y - 20);
    label.setAttribute("fill", c.color);
    label.classList.add("marker-label");
    label.textContent = c.label;
    g.append(circle, label);
    overlay.appendChild(g);
  });
}

// ================= CANDIDATOS =================
$("#btnNuevoCandidato").addEventListener("click", () => addCandidate());

function addCandidate() {
  if (!session) { $("#setStatus").textContent = "Generá primero un set de imágenes."; return; }
  const n = session.candidates.length;
  const letter = LETTERS[n % LETTERS.length] + (n >= LETTERS.length ? Math.floor(n / LETTERS.length) : "");
  const cand = {
    id: storage.newId("cand"),
    label: `Candidato ${letter}`,
    color: PALETTE[n % PALETTE.length],
    marks: {},
  };
  session.candidates.push(cand);
  activeCandidateId = cand.id;
  renderCandidates();
  renderOverlay();
  persistSession();
}

function renderCandidates() {
  const list = $("#candidateList");
  list.innerHTML = "";
  if (!session) return;
  session.candidates.forEach((c) => {
    const row = document.createElement("div");
    row.className = "candidate-row" + (c.id === activeCandidateId ? " active" : "");
    const swatch = document.createElement("span");
    swatch.className = "candidate-swatch";
    swatch.style.background = c.color;
    const input = document.createElement("input");
    input.type = "text";
    input.value = c.label;
    input.addEventListener("change", () => { c.label = input.value.trim() || c.label; renderOverlay(); persistSession(); updateReportCandidateSelect(); });
    input.addEventListener("click", (e) => e.stopPropagation());
    const count = document.createElement("span");
    count.className = "count";
    count.textContent = `${Object.keys(c.marks).length} marca(s)`;
    const del = document.createElement("button");
    del.textContent = "✕";
    del.title = "Eliminar candidato";
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!confirm(`¿Eliminar "${c.label}" y todas sus marcas?`)) return;
      session.candidates = session.candidates.filter((x) => x.id !== c.id);
      if (activeCandidateId === c.id) activeCandidateId = session.candidates[0]?.id || null;
      renderCandidates(); renderOverlay(); renderFilmstripDots(); persistSession(); updateReportCandidateSelect();
    });
    row.addEventListener("click", () => { activeCandidateId = c.id; renderCandidates(); renderOverlay(); });
    row.append(swatch, input, count, del);
    list.appendChild(row);
  });
  renderCandidateMetrics();
  updateReportCandidateSelect();
}

function renderCandidateMetrics() {
  const el = $("#candidateMetrics");
  el.innerHTML = "";
  if (!session || !activeCandidateId) return;
  const cand = session.candidates.find((c) => c.id === activeCandidateId);
  if (!cand) return;
  const marks = Object.entries(cand.marks).map(([frameId, m]) => ({ tISO: frameId, x: m.x, y: m.y }));
  if (marks.length === 0) { el.innerHTML = `<p class="hint">${cand.label}: sin marcas todavía.</p>`; return; }
  const metrics = trackMetrics(marks, session.camera);

  let html = `<table><thead><tr><th>Hora UT</th><th>x</th><th>y</th><th>Δt (min)</th><th>px/h</th></tr></thead><tbody>`;
  metrics.sorted.forEach((m, i) => {
    const seg = metrics.segments[i - 1];
    html += `<tr><td>${fmtUTShort(m.tISO)}</td><td>${Math.round(m.x)}</td><td>${Math.round(m.y)}</td>` +
      `<td>${seg ? seg.dtMin.toFixed(0) : "—"}</td><td>${seg && seg.speedPxH != null ? seg.speedPxH.toFixed(1) : "—"}</td></tr>`;
  });
  html += `</tbody></table>`;
  if (metrics.directionInfo) {
    const d = metrics.directionInfo;
    html += `<p class="hint">Entra desde la mitad inferior: <strong>${d.entersFromLowerHalf ? "sí" : "no"}</strong> · ` +
      `Se acerca al Sol: <strong>${d.approachingSun ? "sí" : "no"}</strong> ` +
      `(patrón típico en ~84% de los cometas SOHO reales, según la guía oficial — no es un requisito estricto).</p>`;
  }
  if (metrics.flags.length) {
    html += metrics.flags.map((f) => `<p class="flag">⚠ ${f}</p>`).join("");
  } else if (metrics.sorted.length >= 5) {
    html += `<p class="good">✓ Cumple el mínimo de 5 cuadros y no se detectaron alertas automáticas.</p>`;
  }
  el.innerHTML = html;
}

// ================= REPORTE =================
function updateReportCandidateSelect() {
  const sel = $("#reportCandidate");
  const prev = sel.value;
  sel.innerHTML = "";
  if (!session) return;
  session.candidates.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id; opt.textContent = `${c.label} (${Object.keys(c.marks).length} marcas)`;
    sel.appendChild(opt);
  });
  if (prev && session.candidates.some((c) => c.id === prev)) sel.value = prev;
}

let lastReport = null;

$("#btnGenerarReporte").addEventListener("click", () => {
  if (!session || session.candidates.length === 0) { $("#setStatus").textContent = "No hay candidatos para reportar."; return; }
  const candId = $("#reportCandidate").value;
  const cand = session.candidates.find((c) => c.id === candId);
  if (!cand) return;
  const group = $("#reportGroup").value;
  const comments = $("#reportComments").value;
  const text = buildReportText({ profile, session, candidate: cand, group, comments });
  lastReport = { candidate: cand, group, comments, text };
  const pre = $("#reportPreview");
  pre.hidden = false;
  pre.textContent = text;
  $("#btnCopiarReporte").disabled = false;
  $("#btnDescargarTxt").disabled = false;
  $("#btnDescargarZip").disabled = false;
});

$("#btnCopiarReporte").addEventListener("click", async () => {
  if (!lastReport) return;
  try {
    await navigator.clipboard.writeText(lastReport.text);
    $("#btnCopiarReporte").textContent = "Copiado ✓";
    setTimeout(() => ($("#btnCopiarReporte").textContent = "Copiar texto"), 1800);
  } catch {
    alert("No se pudo copiar automáticamente. Seleccioná el texto manualmente.");
  }
});

$("#btnDescargarTxt").addEventListener("click", () => {
  if (!lastReport) return;
  const blob = new Blob([lastReport.text], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, `sungrazer_${session.date}_${session.camera}_${lastReport.candidate.label.replace(/\s+/g, "_")}.txt`);
});

function loadImageForCrop(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = setTimeout(() => resolve(null), 15000);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = url;
  });
}

$("#btnDescargarZip").addEventListener("click", async () => {
  if (!lastReport || !session) return;
  const btn = $("#btnDescargarZip");
  const original = btn.textContent;
  btn.disabled = true; btn.textContent = "Generando paquete...";
  try {
    const frameImages = new Map();
    const frameById = new Map(session.frames.map((f) => [f.id, f]));
    const marks = lastReport.candidate.marks;
    for (const frameId of Object.keys(marks)) {
      const f = frameById.get(frameId);
      if (!f) continue;
      const img = await loadImageForCrop(f.url);
      if (img) frameImages.set(frameId, img);
    }
    const zipBlob = await buildReportZip({
      profile, session, candidate: lastReport.candidate,
      group: lastReport.group, comments: lastReport.comments, frameImages,
    });
    downloadBlob(zipBlob, `sungrazer_${session.date}_${session.camera}_${lastReport.candidate.label.replace(/\s+/g, "_")}.zip`);
  } finally {
    btn.disabled = false; btn.textContent = original;
  }
});

// ================= SESIONES GUARDADAS =================
function persistSession() {
  if (session) storage.upsertSession(session);
}

function renderSessionsList() {
  const el = $("#sessionsList");
  el.innerHTML = "";
  const sessions = storage.loadSessions();
  if (sessions.length === 0) {
    el.innerHTML = `<p class="hint">Todavía no hay sesiones guardadas.</p>`;
    return;
  }
  sessions.forEach((s) => {
    const row = document.createElement("div");
    row.className = "session-row";
    const meta = document.createElement("div");
    meta.innerHTML = `<strong>${s.date} · ${CAMERA_INFO[s.camera].label}</strong>` +
      `<div class="meta">${s.frames.length} cuadros · ${s.candidates.length} candidato(s) · creada ${new Date(s.createdAt).toLocaleString("es-UY")}</div>`;
    const actions = document.createElement("div");
    actions.className = "actions";
    const openBtn = document.createElement("button");
    openBtn.className = "btn"; openBtn.textContent = "Abrir";
    openBtn.addEventListener("click", () => {
      stopPlayback();
      session = s; frameIndex = 0; activeCandidateId = s.candidates[0]?.id || null;
      $('.tab-btn[data-tab="explorar"]').click();
      $("#viewerEmpty").hidden = true; $("#zoomLayer").hidden = false;
      $("#btnExtenderAntes").disabled = false; $("#btnExtenderDespues").disabled = false;
      renderFilmstrip(); renderCandidates(); loadFrame(0); resetZoom();
    });
    const delBtn = document.createElement("button");
    delBtn.className = "btn danger"; delBtn.textContent = "Eliminar";
    delBtn.addEventListener("click", () => {
      if (!confirm("¿Eliminar esta sesión guardada?")) return;
      storage.deleteSession(s.id);
      renderSessionsList();
    });
    actions.append(openBtn, delBtn);
    row.append(meta, actions);
    el.appendChild(row);
  });
}

// ================= ATAJOS DE TECLADO =================
window.addEventListener("keydown", (e) => {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;
  if (!session) return;
  if (e.key === " ") { e.preventDefault(); togglePlayback(); }
  else if (e.key === "ArrowRight") { stopPlayback(); loadFrame(Math.min(session.frames.length - 1, frameIndex + 1)); }
  else if (e.key === "ArrowLeft") { stopPlayback(); loadFrame(Math.max(0, frameIndex - 1)); }
  else if (e.key === "+" || e.key === "=") { zoom = Math.min(8, zoom * 1.4); applyTransform(); }
  else if (e.key === "-" || e.key === "_") { zoom = Math.max(1, zoom / 1.4); applyTransform(); }
  else if (e.key === "0") resetZoom();
  else if (e.key === "Delete" || e.key === "Backspace") $("#btnBorrarMarca").click();
  else if (e.key.toLowerCase() === "n") addCandidate();
  else if (/^[1-9]$/.test(e.key)) {
    const idx = Number(e.key) - 1;
    if (session.candidates[idx]) { activeCandidateId = session.candidates[idx].id; renderCandidates(); renderOverlay(); }
  }
});

// ================= INSTALACIÓN PWA =================
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  $("#installArea").hidden = false;
});
$("#installBtn").addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  $("#installArea").hidden = true;
});
window.addEventListener("appinstalled", () => { $("#installArea").hidden = true; });

// ================= SERVICE WORKER =================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => console.warn("SW no registrado:", err));
  });
}
