// Observatorio: trae la imagen del Sol, permite marcar manchas y grupos con una lupa fija en una
// esquina del disco, calcula el número de Wolf y guarda la observación.
import { LAB, imageUrl } from './config.js';
import { t, tn, fmtNum, fmtK, onLangChange } from './i18n.js';
import { getState, subscribe, saveObservation, wolf, kPending, getPref, setPref } from './store.js';
import { $, $$, toast, isCoarsePointer } from './dom.js';
import { openKDialog } from './kdialog.js';
import { bindKInput, syncKInput } from './kinput.js';

const round = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const pad2 = n => String(n).padStart(2, '0');
const isoOf = d => `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;

export function initObservatory() {
  const stage = $('#stage'), img = $('#sun-img'), markersEl = $('#markers'), msg = $('#stage-msg');
  const lens = $('#lens'), lensView = $('#lens-view'), lensMarks = $('#lens-marks'), lensZoom = $('#lens-zoom');
  const kbdCursor = $('#kbd-cursor'), srcLine = $('#img-source');
  const dateInput = $('#obs-date'), form = $('#datebar');
  const outG = $('#out-g'), outS = $('#out-s'), outR = $('#out-r'), outCalc = $('#out-calc');
  const kInput = $('#k-input'), warnEl = $('#warn'), btnSave = $('#btn-save');
  const btnUndo = $('#btn-undo'), btnClear = $('#btn-clear'), live = $('#marks-live');
  const savedCount = $('#saved-count'), pendingBtn = $('#k-pending-obs');

  let cur = { date: null, time: null, src: null };
  let marks = [];
  const marksByDate = new Map();
  let tool = 'spot';
  let zoom = Number(getPref('zoom', 4));
  if (!LAB.ZOOMS.includes(zoom)) zoom = LAB.ZOOMS.includes(4) ? 4 : LAB.ZOOMS[0];
  let stageState = 'empty';
  let loadToken = 0;
  let lensSide = 'left';
  let aim = null;
  let kbdPos = null;
  let triedAuto = false;
  let raf = 0;

  // ---------- fecha ----------
  const yesterday = () => { const d = new Date(); d.setUTCDate(d.getUTCDate() - 1); return isoOf(d); };
  dateInput.min = LAB.DATE_MIN;
  dateInput.max = yesterday();

  function randomIso() {
    const a = Date.UTC(...LAB.RANDOM_FROM), b = Date.UTC(...LAB.RANDOM_TO);
    return isoOf(new Date(a + Math.random() * (b - a)));
  }

  // ---------- estado del escenario ----------
  function setStageState(state) {
    stageState = state;
    stage.dataset.state = state;
    stage.setAttribute('aria-busy', String(state === 'loading'));
    renderStageMsg();
    if (state !== 'ready') { hideLens(); img.hidden = true; markersEl.replaceChildren(); }
    updateCalc();
  }
  function renderStageMsg() {
    const key = { empty: 'img_empty', loading: 'img_loading', error: 'img_error', offline: 'img_offline' }[stageState];
    msg.textContent = key ? t(key) : '';
  }
  function renderSource() {
    srcLine.textContent = cur.time && stageState === 'ready'
      ? t('img_source', { time: `${cur.time.slice(0, 2)}:${cur.time.slice(2)}` }) : '';
  }

  // ---------- carga de la imagen (prueba varios horarios) ----------
  const probe = (url, ms) => new Promise(resolve => {
    const im = new Image();
    const timer = setTimeout(() => { im.onload = im.onerror = null; im.src = ''; resolve(false); }, ms);
    im.onload = () => { clearTimeout(timer); resolve(true); };
    im.onerror = () => { clearTimeout(timer); resolve(false); };
    im.src = url;
  });

  async function loadDate(iso) {
    const token = ++loadToken;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || iso < LAB.DATE_MIN || iso > dateInput.max) { setStageState('error'); return false; }
    if (!navigator.onLine) { setStageState('offline'); return false; }
    setStageState('loading');
    const [y, m, d] = iso.split('-');
    for (const time of LAB.IMG_TIMES) {
      const url = imageUrl(y + m + d, y, time);
      const ok = await probe(url, LAB.IMG_TIMEOUT_MS);
      if (token !== loadToken) return false;
      if (ok) {
        cur = { date: iso, time, src: url };
        img.src = url;
        lensView.style.backgroundImage = `url("${url}")`;
        marks = marksByDate.get(iso) || [];
        marksByDate.set(iso, marks);
        img.hidden = false;
        setStageState('ready');
        renderMarks();
        renderSource();
        return true;
      }
    }
    if (token === loadToken) setStageState(navigator.onLine ? 'error' : 'offline');
    return false;
  }

  async function loadRandom() {
    for (let i = 0; i < LAB.RANDOM_TRIES; i++) {
      const iso = randomIso();
      dateInput.value = iso;
      if (await loadDate(iso)) return true;
      if (stageState === 'offline') return false;
    }
    return false;
  }

  form.addEventListener('submit', e => { e.preventDefault(); if (dateInput.value) loadDate(dateInput.value); });
  $('#btn-random').addEventListener('click', loadRandom);

  // ---------- marcas ----------
  const counts = () => ({ s: marks.filter(m => m.type === 'spot').length, g: marks.filter(m => m.type === 'group').length });

  function markNode(m, x, y, unit) {
    const n = document.createElement('span');
    n.className = 'mk ' + (m.type === 'group' ? 'mk-group' : 'mk-spot');
    n.style.left = x + unit; n.style.top = y + unit;
    return n;
  }
  function renderMarks() {
    markersEl.replaceChildren(...marks.map(m => markNode(m, m.x, m.y, '%')));
    updateCalc();
    live.textContent = t('marks_live', counts());
  }

  // Solo se descartan los repetidos accidentales: el mismo punto exacto (< 0,5 px de pantalla) o un
  // segundo toque casi idéntico (< 2 px) dentro de 450 ms. Dos poros o manchas distintos, por cercanos
  // que estén, siempre se pueden marcar: la lupa es la que permite apuntarles por separado.
  let lastMark = null;
  function isAccidentalRepeat(px, py) {
    const S = stage.clientWidth, now = performance.now();
    const samePoint = marks.some(m => m.type === tool && Math.hypot(m.x / 100 * S - px, m.y / 100 * S - py) < 0.5);
    const quickRetap = lastMark && lastMark.type === tool && now - lastMark.t < 450 && Math.hypot(lastMark.px - px, lastMark.py - py) < 2;
    return samePoint || !!quickRetap;
  }

  function addMark(px, py) {
    if (isAccidentalRepeat(px, py)) return;
    const S = stage.clientWidth;
    marks.push({ type: tool, x: round(px / S * 100, 3), y: round(py / S * 100, 3) });
    lastMark = { type: tool, px, py, t: performance.now() };
    marksByDate.set(cur.date, marks);
    renderMarks();
    try { navigator.vibrate && navigator.vibrate(10); } catch (e) { /* sin vibración */ }
  }
  btnUndo.addEventListener('click', () => { marks.pop(); lastMark = null; renderMarks(); });
  btnClear.addEventListener('click', () => { marks.length = 0; lastMark = null; renderMarks(); });

  // ---------- lupa ----------
  function updateLens(px, py) {
    const S = stage.clientWidth;
    lens.hidden = false;
    const Lo = lens.offsetWidth, Li = lens.clientWidth, m = 10, gap = 14;
    const left = lensSide === 'left' ? m : S - m - Lo;
    if (px > left - gap && px < left + Lo + gap && py < m + Lo + gap) {       // el puntero entra en la lupa: pasa a la otra esquina
      lensSide = lensSide === 'left' ? 'right' : 'left';
      lens.dataset.side = lensSide;
    }
    lensView.style.backgroundSize = `${S * zoom}px ${S * zoom}px`;
    lensView.style.backgroundPosition = `${Li / 2 - px * zoom}px ${Li / 2 - py * zoom}px`;
    const nodes = [];
    for (const mk of marks) {
      const lx = (mk.x / 100 * S - px) * zoom + Li / 2, ly = (mk.y / 100 * S - py) * zoom + Li / 2;
      if (lx > -20 && lx < Li + 20 && ly > -20 && ly < Li + 20) nodes.push(markNode(mk, round(lx, 1), round(ly, 1), 'px'));
    }
    lensMarks.replaceChildren(...nodes);
    lensZoom.textContent = `${zoom}×`;
  }
  function hideLens() { lens.hidden = true; kbdCursor.hidden = true; }

  // ---------- puntero (ratón, dedo o lápiz) ----------
  function pointOf(e) {
    const r = stage.getBoundingClientRect();
    return { px: clamp(e.clientX - r.left, 0, r.width), py: clamp(e.clientY - r.top, 0, r.height), S: r.width };
  }
  const insideDisc = ({ px, py, S }) => Math.hypot(px - S / 2, py - S / 2) <= S / 2;
  const schedule = fn => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fn); };

  stage.addEventListener('pointerdown', e => {
    if (stageState !== 'ready' || (e.pointerType === 'mouse' && e.button !== 0)) return;
    kbdCursor.hidden = true;
    aim = { id: e.pointerId, type: e.pointerType };
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
    const p = pointOf(e);
    schedule(() => updateLens(p.px, p.py));
    if (e.pointerType !== 'mouse') e.preventDefault();
  });
  stage.addEventListener('pointermove', e => {
    if (stageState !== 'ready') return;
    if (e.pointerType === 'mouse' || (aim && aim.id === e.pointerId)) {
      const p = pointOf(e);
      schedule(() => updateLens(p.px, p.py));
    }
  });
  stage.addEventListener('pointerup', e => {
    if (!aim || aim.id !== e.pointerId) return;
    const p = pointOf(e), wasTouch = aim.type !== 'mouse';
    const r = stage.getBoundingClientRect();
    const within = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    aim = null;
    cancelAnimationFrame(raf);
    if (within && insideDisc(p)) { addMark(p.px, p.py); if (!wasTouch) updateLens(p.px, p.py); }
    if (wasTouch) hideLens();
  });
  stage.addEventListener('pointercancel', () => { aim = null; hideLens(); });
  stage.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !aim) hideLens(); });

  // ---------- teclado ----------
  function kbdShow() {
    if (!kbdPos) kbdPos = { x: 50, y: 50 };
    const S = stage.clientWidth, px = kbdPos.x / 100 * S, py = kbdPos.y / 100 * S;
    kbdCursor.hidden = false;
    kbdCursor.style.left = kbdPos.x + '%'; kbdCursor.style.top = kbdPos.y + '%';
    updateLens(px, py);
  }
  stage.addEventListener('focus', () => { if (stageState === 'ready' && stage.matches(':focus-visible')) kbdShow(); });
  stage.addEventListener('blur', () => { if (!aim) hideLens(); });
  stage.addEventListener('keydown', e => {
    if (stageState !== 'ready') return;
    // El paso del cursor de teclado se achica con el aumento (2 %, 1 %, 0,5 % del disco ÷ zoom/2); con Shift, cinco veces más fino.
    const step = (e.shiftKey ? 0.2 : 1) * 2 / zoom;
    const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (move) {
      e.preventDefault();
      kbdPos = kbdPos || { x: 50, y: 50 };
      kbdPos = { x: clamp(kbdPos.x + move[0], 0, 100), y: clamp(kbdPos.y + move[1], 0, 100) };
      kbdShow();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      kbdShow();
      const S = stage.clientWidth, p = { px: kbdPos.x / 100 * S, py: kbdPos.y / 100 * S, S };
      if (insideDisc(p)) { addMark(p.px, p.py); kbdShow(); }
    } else if (e.key === 'Escape') hideLens();
  });

  // ---------- herramientas ----------
  $$('[data-tool]').forEach(b => b.addEventListener('click', () => {
    tool = b.dataset.tool;
    $$('[data-tool]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  }));

  const zoomBox = $('#zoom-seg');
  zoomBox.replaceChildren(...LAB.ZOOMS.map(z => {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.zoom = z; b.textContent = `${z}×`;
    b.setAttribute('aria-pressed', String(z === zoom));
    b.addEventListener('click', () => {
      zoom = z; setPref('zoom', z);
      $$('[data-zoom]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      if (!lens.hidden && kbdPos && !kbdCursor.hidden) kbdShow();
      lensZoom.textContent = `${z}×`;
    });
    return b;
  }));

  // ---------- cálculo ----------
  function updateCalc() {
    const { s, g } = counts();
    const k = getState().k, r = wolf(k, g, s);
    outG.textContent = fmtNum(g); outS.textContent = fmtNum(s); outR.textContent = fmtNum(r);
    outCalc.textContent = `= ${fmtK(k)} × (10 × ${fmtNum(g)} + ${fmtNum(s)})`;
    const problem = s > 0 && g === 0 ? 'warn_group' : g > s ? 'warn_spots' : null;
    warnEl.hidden = !problem;
    if (problem) warnEl.textContent = t(problem);
    const blocked = !!problem || stageState !== 'ready';
    btnSave.setAttribute('aria-disabled', String(blocked));
    btnUndo.disabled = btnClear.disabled = marks.length === 0;
  }

  btnSave.addEventListener('click', () => {
    if (stageState !== 'ready' || !cur.date) { toast(t('need_image'), { kind: 'warn' }); return; }
    if (btnSave.getAttribute('aria-disabled') === 'true') { if (!warnEl.hidden) toast(warnEl.textContent, { kind: 'warn' }); return; }
    const { s, g } = counts();
    const res = saveObservation({ date: cur.date, g, s, time: cur.time });
    toast(t(res.replaced ? 'toast_replaced' : 'toast_saved', { r: fmtNum(res.r) }), { kind: 'ok' });
    if (res.kDue) setTimeout(openKDialog, 800);
  });

  bindKInput(kInput);
  pendingBtn.addEventListener('click', openKDialog);

  function refreshStore() {
    const st = getState();
    syncKInput(kInput);
    savedCount.textContent = tn('saved_count', st.obs.length);
    pendingBtn.hidden = !kPending();
    updateCalc();
  }
  subscribe(refreshStore);

  // ---------- textos que dependen del idioma ----------
  function refreshText() {
    $('#hint').textContent = t(isCoarsePointer() ? 'hint_touch' : 'hint_mouse');
    renderStageMsg(); renderSource();
    live.textContent = t('marks_live', counts());
    refreshStore();
  }
  onLangChange(refreshText);

  // ---------- primera visita: trae una fecha al azar para que se vea el Sol enseguida ----------
  window.addEventListener('helios:view', e => {
    if (e.detail !== 'observar' || triedAuto) return;
    triedAuto = true;
    if (stageState === 'empty') { if (navigator.onLine) loadRandom(); else setStageState('offline'); }
  });
  window.addEventListener('online', () => { if (stageState === 'offline') { if (dateInput.value) loadDate(dateInput.value); else loadRandom(); } });

  setStageState('empty');
  refreshText();
}
