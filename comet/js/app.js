// app.js — controlador principal de la PWA Sungrazer Hunter
import { CAMERA_INFO, IMAGE_SIZE, buildTimeline, makeFrame, resolveActualDate } from "./helioviewer.js";
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
  resolveFrameDates(session);
}

// ---------- verificación de fechas reales de imagen (detecta cuadros "duplicados") ----------
// takeScreenshot devuelve la imagen real más cercana al instante pedido. Si el intervalo
// elegido es menor que la cadencia real de datos disponibles (o hay un hueco de cobertura),
// varios cuadros pedidos pueden coincidir con la MISMA imagen real: la animación avanza en
// el reloj pero se ve siempre la misma foto. Esto lo verifica en segundo plano y avisa.
async function resolveFrameDates(sess) {
  const CONC = 4;
  let i = 0;
  async function worker() {
    while (i < sess.frames.length) {
      const idx = i++;
      const f = sess.frames[idx];
      const real = await resolveActualDate(new Date(f.tISO), sess.camera);
      if (real) f.actualISO = real;
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  if (session !== sess) return; // el usuario ya generó/cargó otra sesión mientras tanto
  let dupCount = 0;
  for (let idx = 1; idx < sess.frames.length; idx++) {
    const prev = sess.frames[idx - 1];
    const cur = sess.frames[idx];
    if (prev.actualISO && cur.actualISO && prev.actualISO === cur.actualISO) {
      cur.duplicateOf = prev.actualISO;
      dupCount++;
    }
  }
  if (dupCount > 0) {
    $("#setStatus").textContent =
      `Set generado: ${sess.frames.length} cuadro(s) de ${CAMERA_INFO[sess.camera].label}. ` +
      `Aviso: ${dupCount} de esos cuadros corresponden a la MISMA imagen real (Helioviewer no tiene ` +
      `datos nuevos en ese tramo con esta cadencia) — probá un intervalo mayor o revisá otro rango horario.`;
  }
  renderFilmstrip();
  loadFrame(frameIndex);
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
  resolveFrameDates(session);
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
  const realNote = f.actualISO && f.actualISO !== f.tISO ? ` (imagen real: ${fmtUTShort(f.actualISO)})` : "";
  const dupNote = f.duplicateOf ? " ⚠ imagen repetida, sin dato nuevo" : "";
  $("#frameLabel").textContent =
    `Cuadro ${idx + 1} / ${session.frames.length} — ${fmtUTShort(f.tISO)} · ${fmtLocal(f.tISO)}${realNote}${dupNote}`;
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
    div.className = "thumb" + (f.duplicateOf ? " dup" : "");
    div.dataset.idx = i;
    div.title = f.duplicateOf
      ? `${fmtUTShort(f.tISO)} — imagen repetida (sin dato nuevo)`
      : fmtUTShort(f.tISO);
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

// ---------- zoom / pan & touch interaction ----------
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

// ---------- pointer events (unifying mouse and multi-touch / pinch-zoom / loupe) ----------
const activePointers = new Map();
let initialPinchDist = null;
let initialZoom = 1;
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let panX0 = 0, panY0 = 0;

stageWrap.addEventListener("pointerdown", (e) => {
  if (!session) return;
  stageWrap.setPointerCapture(e.pointerId);
  activePointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

  if (activePointers.size === 1) {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    panX0 = panX;
    panY0 = panY;

    if (activeDevice === "mobile" && mobileTouchMode === "touch") {
      showLoupe(e.clientX, e.clientY);
    }
  } else if (activePointers.size === 2) {
    hideLoupe();
    const pts = Array.from(activePointers.values());
    initialPinchDist = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
    initialZoom = zoom;
  }
});

stageWrap.addEventListener("pointermove", (e) => {
  if (!activePointers.has(e.pointerId)) return;
  activePointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

  if (activePointers.size === 2 && initialPinchDist) {
    const pts = Array.from(activePointers.values());
    const dist = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
    const factor = dist / initialPinchDist;
    zoom = Math.min(8, Math.max(1, initialZoom * factor));
    if (zoom === 1) { panX = 0; panY = 0; }
    applyTransform();
    return;
  }

  if (!isDragging) return;

  const dx = e.clientX - dragStartX;
  const dy = e.clientY - dragStartY;

  if (activeDevice === "mobile" && mobileTouchMode === "touch") {
    showLoupe(e.clientX, e.clientY);
  } else {
    // Pan view
    panX = panX0 + dx;
    panY = panY0 + dy;
    applyTransform();
  }
});

stageWrap.addEventListener("pointerup", (e) => handlePointerRelease(e));
stageWrap.addEventListener("pointercancel", (e) => handlePointerRelease(e));

function handlePointerRelease(e) {
  activePointers.delete(e.pointerId);
  if (activePointers.size < 2) initialPinchDist = null;

  if (activePointers.size === 0) {
    if (isDragging) {
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      const moved = Math.hypot(dx, dy) > 4;

      if (activeDevice === "desktop") {
        if (!moved) handleMarkClick(e.clientX, e.clientY);
      } else if (activeDevice === "mobile") {
        if (mobileTouchMode === "touch") {
          const { x, y } = clientToImagePixel(e.clientX, e.clientY);
          placeMarkAt(x, y);
          hideLoupe();
        }
      }
    }
    isDragging = false;
    hideLoupe();
  }
}

function clientToImagePixel(clientX, clientY) {
  const rect = frameImg.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * IMAGE_SIZE;
  const y = ((clientY - rect.top) / rect.height) * IMAGE_SIZE;
  return { x, y };
}

function handleMarkClick(clientX, clientY) {
  if (isPlaying()) { stopPlayback(); return; }
  const { x, y } = clientToImagePixel(clientX, clientY);
  placeMarkAt(x, y);
}

function placeMarkAt(x, y) {
  if (x < 0 || y < 0 || x > IMAGE_SIZE || y > IMAGE_SIZE) return;
  if (!session) return;
  if (!activeCandidateId) {
    if (session.candidates.length > 0) {
      activeCandidateId = session.candidates[0].id;
    } else {
      addCandidate();
    }
  }
  const cand = session.candidates.find((c) => c.id === activeCandidateId);
  if (!cand) return;
  const frameId = session.frames[frameIndex].id;
  cand.marks[frameId] = { x, y };
  navigator.vibrate?.(30);
  renderOverlay();
  renderCandidates();
  renderQuickCandidates();
  renderFilmstripDots();
  updateMicroAdjustBar();
  persistSession();
}

// Botón "Marcar en la mira" para modo móvil crosshair
$("#btnMarkCenter").addEventListener("click", () => {
  if (!session) return;
  if (isPlaying()) { stopPlayback(); return; }
  const rect = stageWrap.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const { x, y } = clientToImagePixel(centerX, centerY);
  placeMarkAt(x, y);
});

// Lupa flotante para modo táctil directo
const loupeEl = $("#magnifierLoupe");
const loupeCanvas = $("#loupeCanvas");
const loupeCtx = loupeCanvas ? loupeCanvas.getContext("2d") : null;
const loupeCoords = $("#loupeCoords");

function showLoupe(clientX, clientY) {
  if (!loupeEl || !frameImg.complete || frameImg.naturalWidth === 0) return;
  loupeEl.hidden = false;
  const stageRect = stageWrap.getBoundingClientRect();
  const left = clientX - stageRect.left;
  const top = clientY - stageRect.top;
  loupeEl.style.left = `${left}px`;
  loupeEl.style.top = `${top}px`;

  const { x, y } = clientToImagePixel(clientX, clientY);
  if (loupeCoords) loupeCoords.textContent = `x:${Math.round(x)}, y:${Math.round(y)}`;

  if (loupeCtx && loupeCanvas) {
    loupeCtx.imageSmoothingEnabled = false;
    loupeCtx.clearRect(0, 0, loupeCanvas.width, loupeCanvas.height);
    const imgRect = frameImg.getBoundingClientRect();
    const scale = IMAGE_SIZE / imgRect.width;
    const sourceX = (clientX - imgRect.left) * scale;
    const sourceY = (clientY - imgRect.top) * scale;
    const sampleSize = 90;
    loupeCtx.drawImage(
      frameImg,
      sourceX - sampleSize / 2, sourceY - sampleSize / 2, sampleSize, sampleSize,
      0, 0, loupeCanvas.width, loupeCanvas.height
    );
  }
}

function hideLoupe() {
  if (loupeEl) loupeEl.hidden = true;
}

// Micro-ajuste D-Pad
function updateMicroAdjustBar() {
  const bar = $("#microAdjustBar");
  if (!bar) return;
  if (activeDevice !== "mobile" || !session || !activeCandidateId) {
    bar.hidden = true;
    return;
  }
  const cand = session.candidates.find((c) => c.id === activeCandidateId);
  const frameId = session.frames[frameIndex]?.id;
  if (!cand || !frameId || !cand.marks[frameId]) {
    bar.hidden = true;
    return;
  }
  bar.hidden = false;
  const m = cand.marks[frameId];
  const coordsEl = $("#microCoords");
  if (coordsEl) coordsEl.textContent = `x: ${Math.round(m.x)}, y: ${Math.round(m.y)}`;
}

function nudgeMark(dx, dy) {
  if (!session || !activeCandidateId) return;
  const cand = session.candidates.find((c) => c.id === activeCandidateId);
  const frameId = session.frames[frameIndex]?.id;
  if (!cand || !frameId || !cand.marks[frameId]) return;
  const m = cand.marks[frameId];
  m.x = Math.max(0, Math.min(IMAGE_SIZE, m.x + dx));
  m.y = Math.max(0, Math.min(IMAGE_SIZE, m.y + dy));
  navigator.vibrate?.(20);
  renderOverlay();
  renderCandidates();
  renderQuickCandidates();
  renderFilmstripDots();
  updateMicroAdjustBar();
  persistSession();
}

$("#btnNudgeLeft").addEventListener("click", () => nudgeMark(-1, 0));
$("#btnNudgeRight").addEventListener("click", () => nudgeMark(1, 0));
$("#btnNudgeUp").addEventListener("click", () => nudgeMark(0, -1));
$("#btnNudgeDown").addEventListener("click", () => nudgeMark(0, 1));
$("#btnMicroDelete").addEventListener("click", () => {
  $("#btnBorrarMarca").click();
  updateMicroAdjustBar();
});

// Selector rápido de candidatos
function renderQuickCandidates() {
  const list = $("#quickCandidateList");
  if (!list) return;
  if (!session || session.candidates.length === 0) {
    list.innerHTML = `<span class="hint" style="font-size:0.8rem;">Sin candidatos</span>`;
    return;
  }
  list.innerHTML = "";
  session.candidates.forEach((c) => {
    const chip = document.createElement("button");
    chip.className = "candidate-chip" + (c.id === activeCandidateId ? " active" : "");
    const swatch = document.createElement("span");
    swatch.className = "candidate-chip-swatch";
    swatch.style.background = c.color;
    const label = document.createElement("span");
    const count = Object.keys(c.marks).length;
    label.textContent = `${c.label} (${count})`;
    chip.append(swatch, label);
    chip.addEventListener("click", () => {
      activeCandidateId = c.id;
      renderCandidates();
      renderQuickCandidates();
      renderOverlay();
      updateMicroAdjustBar();
    });
    list.appendChild(chip);
  });
}

$("#btnQuickNuevoCandidato").addEventListener("click", () => {
  addCandidate();
  renderQuickCandidates();
});

// Modos táctiles móviles y detección de dispositivo
let deviceMode = localStorage.getItem("sg_device_override") || "auto";
let activeDevice = "desktop";
let mobileTouchMode = "crosshair";

function getEffectiveDevice() {
  if (deviceMode === "mobile") return "mobile";
  if (deviceMode === "desktop") return "desktop";
  const isCoarse = window.matchMedia("(pointer: coarse)").matches;
  const hasTouch = (navigator.maxTouchPoints > 0) || ("ontouchstart" in window);
  const isSmallScreen = window.innerWidth <= 860;
  const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  if ((isCoarse && hasTouch) || (hasTouch && isSmallScreen) || isMobileUA) {
    return "mobile";
  }
  return "desktop";
}

function refreshDeviceUI() {
  activeDevice = getEffectiveDevice();
  const isMobile = (activeDevice === "mobile");
  document.body.classList.toggle("device-mobile", isMobile);
  document.body.classList.toggle("device-desktop", !isMobile);

  const iconEl = $("#deviceIcon");
  const textEl = $("#deviceText");
  if (iconEl && textEl) {
    if (isMobile) {
      iconEl.textContent = "📱";
      textEl.textContent = "Celular";
    } else {
      iconEl.textContent = "💻";
      textEl.textContent = "Laptop";
    }
  }

  const crosshairEl = $("#crosshairOverlay");
  const mobileActionEl = $("#mobileActionBar");
  const mobileModesEl = $("#mobileModesBar");
  if (crosshairEl) crosshairEl.hidden = !(isMobile && mobileTouchMode === "crosshair");
  if (mobileActionEl) mobileActionEl.style.display = (isMobile && mobileTouchMode === "crosshair") ? "block" : "none";
  if (mobileModesEl) mobileModesEl.style.display = isMobile ? "flex" : "none";

  updateViewerHint();
  updateMicroAdjustBar();
}

$("#btnDeviceToggle").addEventListener("click", () => {
  const current = getEffectiveDevice();
  deviceMode = (current === "mobile") ? "desktop" : "mobile";
  localStorage.setItem("sg_device_override", deviceMode);
  refreshDeviceUI();
});

$$(".mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".mode-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    mobileTouchMode = btn.dataset.mode;
    refreshDeviceUI();
  });
});

function updateViewerHint() {
  const hint = $("#viewerHint");
  if (!hint) return;
  if (activeDevice === "mobile") {
    if (mobileTouchMode === "crosshair") {
      hint.textContent = "Modo Mira fija: Arrastrá la imagen para centrar el objeto en la cruz y tocá 'Marcar objeto en la mira'. Pellizcá para zoom.";
    } else if (mobileTouchMode === "touch") {
      hint.textContent = "Modo Toque directo: Deslizá el dedo sobre el cometa; la lupa flotante te mostrará el aumento exacto. Soltá para marcar.";
    } else {
      hint.textContent = "Modo Navegar: Desplazá y hacé zoom libremente con tus dedos sin riesgo de marcar.";
    }
  } else {
    hint.textContent = "Clic = marcar candidato activo · Arrastrar = desplazar vista · Rueda = zoom · Atajos: Espacio, ←/→, +/-, Supr, 1-9.";
  }
}

refreshDeviceUI();
window.addEventListener("resize", () => refreshDeviceUI());

$("#btnBorrarMarca").addEventListener("click", () => {
  if (!session || !activeCandidateId) return;
  const cand = session.candidates.find((c) => c.id === activeCandidateId);
  const frameId = session.frames[frameIndex]?.id;
  if (cand && frameId && cand.marks[frameId]) {
    delete cand.marks[frameId];
    renderOverlay(); renderCandidates(); renderQuickCandidates(); renderFilmstripDots(); updateMicroAdjustBar(); persistSession();
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
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("sw.js");
      reg.update().catch(() => {}); // fuerza a chequear si hay una versión más nueva ahora mismo
    } catch (err) {
      console.warn("SW no registrado:", err);
    }
  });

  // Cuando una versión nueva del service worker toma control, avisamos para recargar
  // (los datos guardados en localStorage no se pierden con la recarga).
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SG_HUNTER_UPDATED") showUpdateBanner();
  });
}

function showUpdateBanner() {
  if ($("#updateBanner")) return; // ya se está mostrando
  const bar = document.createElement("div");
  bar.id = "updateBanner";
  bar.className = "update-banner";
  bar.innerHTML = `Hay una versión nueva de la app disponible. <button class="btn btn-accent" id="btnReloadUpdate">Recargar</button>`;
  document.body.prepend(bar);
  $("#btnReloadUpdate").addEventListener("click", () => location.reload());
}
