// SeleneSight — evaluación de sitios en el polo sur lunar (Sol / Tierra / horizonte real)
import * as THREE from 'three';
import { OrbitControls } from './lib/OrbitControls.js';
import { T } from './i18n.js';

const $ = (id) => document.getElementById(id);
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const S = { lang: 'en', showRF: true, showReg: true, showComm: false, comm: null, layer: 'month', mode: 'sun', hour: 0, month: 0, mSun: 0, mRadio: 0, view: '2d', exag: 1 /* exageración vertical de la vista 3D, solo visual */, skyWide: true,
            level: null, sel: null, pins: [], sugg: null, suggList: [] };
let META, EPH, NH, M, L = {}, FINE, RF = null;      // datos
const hzCache = new Map(), serCache = new Map();
let TIMER = null; const playing = () => !!TIMER;
function announce(msg) { const a = $('announce'); a.textContent = ''; setTimeout(() => { a.textContent = msg; }, 50); }

// ---------- i18n ----------
function t(k, vars) { let s = (T[S.lang] && T[S.lang][k]) ?? T.es[k] ?? k; if (vars) for (const v in vars) s = s.replace('{' + v + '}', vars[v]); return s; }
function setLoading(txt) { // texto + tres puntos animados (decorativos; el lector de pantalla oye solo el texto)
  $('loading').innerHTML = '<span></span><span class="dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>';
  $('loading').firstChild.textContent = txt.replace(/(…|\.\.\.)$/, '');
}
function applyI18n() {
  document.documentElement.lang = S.lang;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  $('play').setAttribute('aria-label', playing() ? t('ariaPause') : t('ariaPlay'));
  document.title = t('docTitle'); setLoading(t('loading'));
  $('viewBtn').textContent = S.view === '2d' ? t('view3d') : t('view2d'); exagNote();
  $('skyZoom').textContent = S.skyWide ? t('sky90') : t('sky360');
  $('infoBody').innerHTML = t('infoHtml');
  buildSiteList(); renderEclipses(); renderStories(); renderGlossList(); if (tourI >= 0) tourShow(tourI); $('maxNightV').textContent = $('maxNight').value + ' ' + t('d'); updateLegend(); updateTimeLabel(); refreshSite(); renderCompare(); renderSuggest(); if (S.level) checkLevel();
}

// ---------- carga ----------
async function bin(url, Type) { const r = await fetch(url); if (!r.ok) throw new Error(url); return new Type(await r.arrayBuffer()); }
let EDGE = -85;   // latitud del borde de la topografía (se calcula con META.extent)
async function load() {
  META = await (await fetch('data/meta.json')).json(); EDGE = mapToLatLon(META.extent, 0).lat;
  EPH = await bin('data/eph.bin', Float32Array); NH = META.nh; M = META.months.length;
  for (const lv of META.levels) {
    const pts = await bin(`data/${lv.tag}_pts.bin`, Float32Array);
    const vis = await bin(`data/${lv.tag}_vis.bin`, Uint8Array);
    const lng = await bin(`data/${lv.tag}_long.bin`, Uint16Array);
    L[lv.tag] = { ...lv, pts, vis, lng, row: 2 * M };
  }
  const tags = META.levels.map(l => l.tag);
  FINE = L[tags[tags.length - 1]];
  if (FINE.extent && FINE.extent < META.extent - 1) FINE = mergeBand(FINE, L[tags[tags.length - 2]]);
  if (META.refined) {   // puntos refinados a 40 m (picos con noches más cortas)
    const r = META.refined;
    RF = { ...r, pts: await bin(`data/${r.tag}_pts.bin`, Float32Array), vis: await bin(`data/${r.tag}_vis.bin`, Uint8Array), lng: await bin(`data/${r.tag}_long.bin`, Uint16Array), row: 2 * M };
  }
  precomputePsrDist(FINE);
}
// Nivel principal: hexágonos de 2 km hasta 85°S + los de 5 km de la franja 80–85°S (para buscar, sugerir y seleccionar)
function mergeBand(F, C) {
  const idx = []; for (let i = 0; i < C.n; i++) if (Math.hypot(C.pts[i*6], C.pts[i*6+1]) > F.extent + F.diam/2) idx.push(i);
  const n = F.n + idx.length, pts = new Float32Array(n*6), vis = new Uint8Array(n*F.row), lng = new Uint16Array(n*7);
  pts.set(F.pts); vis.set(F.vis); lng.set(F.lng);
  idx.forEach((j, k) => { const i = F.n + k; pts.set(C.pts.subarray(j*6, j*6 + 6), i*6); vis.set(C.vis.subarray(j*C.row, (j + 1)*C.row), i*F.row); lng.set(C.lng.subarray(j*7, j*7 + 7), i*7); });
  return { ...F, n, pts, vis, lng, n0: F.n, src: Int32Array.from(idx), srcLv: C, merged: true };
}
const diamOf = (lv, i) => lv.src && i >= lv.n0 ? lv.srcLv.diam : lv.diam;
const P = (lv, i) => ({ x: lv.pts[i*6], y: lv.pts[i*6+1], lat: lv.pts[i*6+2], lon: lv.pts[i*6+3], h: lv.pts[i*6+4], slope: lv.pts[i*6+5] });
// m >= 0: mes sinódico de la ventana 2027–2030 · m = -1: largo plazo 18,6 años · m = -2: promedio 2027–2030
function detAvg(lv, off) { const k = '_det' + off; if (!lv[k]) { lv[k] = new Uint8Array(lv.n); for (let i = 0; i < lv.n; i++) { let s = 0; for (let m = 0; m < M; m++) s += lv.vis[i*lv.row + off + m]; lv[k][i] = Math.round(s/M); } } return lv[k]; }
const vSun = (lv, i, m) => lv.virt ? (m < 0 ? lv.lng[i*7] : lv.vis ? lv.vis[i*2*M + m] : 0) : m === -1 ? lv.lng[i*7] : m === -2 ? detAvg(lv, 0)[i] : lv.vis[i*lv.row + m];
const vEarth = (lv, i, m) => lv.virt ? (m < 0 ? lv.lng[i*7 + 1] : lv.vis ? lv.vis[i*2*M + M + m] : 0) : m === -1 ? lv.lng[i*7 + 1] : m === -2 ? detAvg(lv, M)[i] : lv.vis[i*lv.row + M + m];
const isPsr = (lv, i) => lv.lng[i*7 + 2] === 1;
const nightH = (lv, i) => lv.lng[i*7 + 3], blackH = (lv, i) => lv.lng[i*7 + 4];
const worstS = (lv, i) => lv.lng[i*7 + 5], worstE = (lv, i) => lv.lng[i*7 + 6];
const days = (h) => h >= 65535 ? '∞' : (S.lang === 'es' ? (h/24).toFixed(1).replace('.', ',') : (h/24).toFixed(1)) + ' ' + t('d');

// Sitios fuera del área de topografía (al norte de 80°S): horizonte liso, cálculo en el navegador sobre 2027–2030
const VIRT = { tag: 'V', virt: true, n: 0, pts: new Float32Array(6*64), lng: new Uint16Array(7*64), names: [] };
function addVirt(lat, lon, name) {
  for (let i = 0; i < VIRT.n; i++) if (Math.abs(VIRT.pts[i*6+2] - lat) < 1e-4 && Math.abs(VIRT.pts[i*6+3] - lon) < 1e-4) return i;
  const i = VIRT.n++, q = latLonToMap(lat, lon);
  VIRT.pts.set([q.x, q.y, lat, lon, 0, NaN], i*6); VIRT.names[i] = name || ''; return i;
}
function fillVirt(r) {   // estadísticas del sitio virtual a partir de su serie horaria
  const lv = r.lv, i = r.i, mo = META.months; if (!lv.vis) lv.vis = new Uint8Array(64*2*M);
  let wS = 100, wE = 100;
  mo.forEach((m, k) => { let s = 0, e = 0; for (let h = m.h0; h <= m.h1; h++) { s += r.sF[h]; e += r.eV[h]; } const n = m.h1 - m.h0 + 1;
    lv.vis[i*2*M + k] = Math.round(100*s/n); lv.vis[i*2*M + M + k] = Math.round(100*e/n); wS = Math.min(wS, Math.round(100*s/n)); wE = Math.min(wE, Math.round(100*e/n)); });
  let ts = 0, te = 0, run = 0, mx = 0, brun = 0, bmx = 0, smax = 0;
  for (let h = 0; h < NH; h++) { ts += r.sF[h]; te += r.eV[h]; smax = Math.max(smax, r.sF[h]);
    if (r.sF[h] < 0.01) { run++; mx = Math.max(mx, run); } else run = 0; if (!r.eV[h]) { brun++; bmx = Math.max(bmx, brun); } else brun = 0; }
  lv.lng.set([Math.round(100*ts/NH), Math.round(100*te/NH), smax === 0 ? 1 : 0, Math.min(65535, mx), Math.min(65535, bmx), wS, wE], i*7);
}
async function horizon(lv, i) {
  if (lv.virt) return new Float32Array(META.naz);
  if (lv.src && i >= lv.n0) return horizon(lv.srcLv, lv.src[i - lv.n0]);
  const ti = Math.floor(i / lv.tile), key = lv.tag + '_' + ti;
  if (!hzCache.has(key)) hzCache.set(key, bin(`data/hz/${key}.bin`, Int16Array));
  const arr = await hzCache.get(key), o = (i - ti * lv.tile) * META.naz;
  const h = new Float32Array(META.naz); for (let k = 0; k < META.naz; k++) h[k] = arr[o + k] / 100; return h;
}

// ---------- geometría ----------
function basis(lat, lon) {
  const a = lat*D2R, b = lon*D2R, cl = Math.cos(a), sl = Math.sin(a), co = Math.cos(b), so = Math.sin(b);
  return { u: [cl*co, cl*so, sl], e: [-so, co, 0], n: [-sl*co, -sl*so, cl] };
}
const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
function mapToLatLon(x, y) { const r = Math.hypot(x, y); return { lat: -(90 - 2*Math.atan(r/(2*META.R))*R2D), lon: Math.atan2(x, y)*R2D }; }
function latLonToMap(lat, lon) { const r = 2*META.R*Math.tan((90 + lat)/2*D2R); return { x: r*Math.sin(lon*D2R), y: r*Math.cos(lon*D2R) }; }
function hzAt(h, az) { const n = h.length, f = ((az % 360) + 360) % 360 / 360 * n, i = Math.floor(f) % n, j = (i+1) % n, w = f - Math.floor(f); return h[i]*(1-w) + h[j]*w; }
function offsetMap(p, az, dist) { // punto a 'dist' m en azimut 'az' sobre la esfera, en coords de mapa
  const B = basis(p.lat, p.lon), th = dist / META.R, c = Math.cos(th), s = Math.sin(th), A = az*D2R;
  const q = [0,1,2].map(k => c*B.u[k] + s*(Math.cos(A)*B.n[k] + Math.sin(A)*B.e[k]));
  const k2 = 2*META.R/(1 - q[2]); return { x: k2*q[1], y: k2*q[0] };
}

function overlap(r1, r2, d) { // fracción del disco solar (r1) cubierta por la Tierra (r2)
  if (d >= r1 + r2) return 0; if (d <= Math.abs(r2 - r1)) return r2 >= r1 ? 1 : (r2/r1)**2;
  const a = r1*r1*Math.acos(Math.max(-1, Math.min(1, (d*d + r1*r1 - r2*r2)/(2*d*r1)))), b = r2*r2*Math.acos(Math.max(-1, Math.min(1, (d*d + r2*r2 - r1*r1)/(2*d*r2))));
  return (a + b - 0.5*Math.sqrt(Math.max(0, (-d + r1 + r2)*(d + r1 - r2)*(d - r1 + r2)*(d + r1 + r2))))/(Math.PI*r1*r1);
}
// series horarias Sol/Tierra de un punto (mismo modelo que el precálculo)
async function series(lv, i) {
  const key = (lv.src && i >= lv.n0) ? lv.srcLv.tag + lv.src[i - lv.n0] : lv.tag + i; if (serCache.has(key)) return serCache.get(key);
  const p = P(lv, i), hz = await horizon(lv, i), B = basis(p.lat, p.lon);
  const ro = (META.R + p.h + META.obsH) / 1000;
  const sF = new Float32Array(NH), sEl = new Float32Array(NH), sAz = new Float32Array(NH);
  const eV = new Uint8Array(NH), eEl = new Float32Array(NH), eAz = new Float32Array(NH), eR = new Float32Array(NH), ecl = new Float32Array(NH);
  for (let k = 0; k < NH; k++) {
    const o = k*8, s = [EPH[o], EPH[o+1], EPH[o+2]], rad = EPH[o+3];
    const el = Math.asin(Math.max(-1, Math.min(1, dot(s, B.u))))*R2D, az = (Math.atan2(dot(s, B.e), dot(s, B.n))*R2D + 360) % 360;
    const x = Math.max(-1, Math.min(1, (el - hzAt(hz, az)) / rad));
    sF[k] = 1 - (Math.acos(x) - x*Math.sqrt(1 - x*x)) / Math.PI; sEl[k] = el; sAz[k] = az;
    const v = [EPH[o+4] - B.u[0]*ro, EPH[o+5] - B.u[1]*ro, EPH[o+6] - B.u[2]*ro], d = Math.hypot(...v);
    const ee = Math.asin(dot(v, B.u)/d)*R2D, ea = (Math.atan2(dot(v, B.e), dot(v, B.n))*R2D + 360) % 360;
    eEl[k] = ee; eAz[k] = ea; eV[k] = ee > hzAt(hz, ea) ? 1 : 0; eR[k] = Math.asin(6371/d)*R2D;
    if (sF[k] > 0) { const sep = Math.acos(Math.max(-1, Math.min(1, dot(s, v)/d)))*R2D, ov = overlap(rad, eR[k], sep); if (ov > 0) { ecl[k] = ov; sF[k] *= 1 - ov; } }
  }
  const r = { p, hz, sF, sEl, sAz, eV, eEl, eAz, eR, ecl, lv, i }; serCache.set(key, r); if (lv.virt) fillVirt(r); return r;
}

// ---------- colores ----------
// 5 clases fijas: 0–20 % rojo · 21–40 % naranja · 41–60 % amarillo · 61–80 % verde pálido · 81–100 % verde pleno
const CLASSES = [[20, '#D7301F'], [40, '#F28E2B'], [60, '#F5D23C'], [80, '#A6D96A'], [100, '#1A9850']];
function color(p) {
  p = Math.round(Math.max(0, Math.min(100, p)));
  for (const [top, c] of CLASSES) if (p <= top) return c;
  return CLASSES[CLASSES.length - 1][1];
}
const margin = () => S.layer === 'night' ? 0 : S.mode === 'sun' ? S.mSun : S.mRadio;
const NIGHT_STOPS = [[0, 100], [336, 100], [432, 60], [528, 40], [720, 0]];   // horas → %: con las 5 clases, ≤16 d verde pleno, 16–18 d verde pálido, 18–22 d amarillo, 22–26 d naranja, >26 d rojo
function nightPct(h) { if (h >= 720) return 0; for (let k = 1; k < NIGHT_STOPS.length; k++) if (h <= NIGHT_STOPS[k][0]) { const [a, pa] = NIGHT_STOPS[k-1], [b, pb] = NIGHT_STOPS[k]; return pa + (pb - pa)*(h - a)/(b - a); } return 0; }
function pctOf(lv, i, m) {
  if (S.layer === 'night') return nightPct(S.mode === 'sun' ? nightH(lv, i) : blackH(lv, i));
  if (S.layer === 'long') m = -1;
  return S.mode === 'sun' ? vSun(lv, i, m) : vEarth(lv, i, m);
}

// ---------- escena 3D ----------
let renderer, scene, camO, camP, cam, controls, terrain, overlayCanvas, overlayCtx, hexCanvas, overlayTex, reliefImg, TER, EXT, marks;
async function initScene() {
  const el = $('map');
  renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  el.appendChild(renderer.domElement);
  scene = new THREE.Scene(); scene.background = new THREE.Color(0x05070d);
  EXT = META.extent / 1000;
  camO = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 5000); camO.position.set(0, 1000, 0); camO.up.set(0, 0, -1); camO.lookAt(0, 0, 0);
  camP = new THREE.PerspectiveCamera(45, 1, 0.5, 5000); camP.position.set(0, 220, 230);
  cam = camO;
  TER = await bin('data/terrain512.bin', Int16Array); T1K = await bin(`data/terrain${META.terrainN || 1024}.bin`, Int16Array);
  reliefImg = await new Promise((ok, ko) => { const im = new Image(); im.onload = () => ok(im); im.onerror = ko; im.src = 'data/relief.png'; });
  const Smax = Math.min(4096, renderer.capabilities.maxTextureSize, innerWidth < 900 ? 2048 : 4096);
  overlayCanvas = document.createElement('canvas'); overlayCanvas.width = overlayCanvas.height = Smax; overlayCtx = overlayCanvas.getContext('2d');
  hexCanvas = document.createElement('canvas'); hexCanvas.width = hexCanvas.height = Smax;
  overlayTex = new THREE.CanvasTexture(overlayCanvas); overlayTex.colorSpace = THREE.SRGBColorSpace; overlayTex.anisotropy = 8;
  const g = new THREE.PlaneGeometry(2*EXT, 2*EXT, 511, 511); g.rotateX(-Math.PI/2);
  terrain = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: overlayTex })); scene.add(terrain);
  setExag(1);
  marks = new THREE.Group(); scene.add(marks);
  setView('2d');
  addEventListener('resize', resize); resize();
  let down = null;
  renderer.domElement.addEventListener('pointerdown', e => down = [e.clientX, e.clientY]);
  renderer.domElement.addEventListener('pointerup', e => { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5) pick(e); down = null; });
  (function loop() {
    requestAnimationFrame(loop); controls.update();
    const k = cam === camO ? (camO.top - camO.bottom)/camO.zoom*0.04 : 0.045;
    marks.children.forEach(o => { if (o.isSprite) o.scale.set(k*o.userData.ar, k, 1); else if (o.userData.dot) o.scale.setScalar(cam === camO ? k/4 : 1); });
    renderer.render(scene, cam);
  })();
}
function setExag(ex) {
  const pos = terrain.geometry.attributes.position;
  for (let k = 0; k < pos.count; k++) pos.setY(k, TER[k]/1000*ex);
  pos.needsUpdate = true; terrain.geometry.computeBoundingSphere();
}
function terrH(x, y) { // km en coordenadas de escena, según exageración actual
  const c = Math.round((x/1000 + EXT)/(2*EXT)*511), r = Math.round((EXT - y/1000)/(2*EXT)*511);
  if (c < 0 || r < 0 || c > 511 || r > 511) return 0; return TER[r*512 + c]/1000*(S.view === '3d' ? S.exag : 1);
}
function setView(v) {
  S.view = v; const ex = v === '3d' ? S.exag : 1; setExag(ex); $('exagBox').hidden = v !== '3d'; exagNote();
  if (controls) controls.dispose();
  if (v === '2d') { camO.up.set(0, 0, -1); camO.position.set(0, 1000, 0); }
  else { camP.up.set(0, 1, 0); camP.position.set(0, 180, 200); }
  cam = v === '2d' ? camO : camP;
  controls = new OrbitControls(cam, renderer.domElement); controls.addEventListener('change', checkLevel);
  if (v === '2d') { controls.enableRotate = false; camO.position.set(0, 1000, 0); camO.up.set(0, 0, -1); controls.target.set(0, 0, 0); camO.zoom = 1; camO.updateProjectionMatrix(); }
  else { controls.enableRotate = true; camP.position.set(0, 180, 200); camP.up.set(0, 1, 0); controls.target.set(0, 0, 0); controls.maxPolarAngle = Math.PI*0.47; }
  controls.screenSpacePanning = true; controls.update();
  $('viewBtn').textContent = v === '2d' ? t('view3d') : t('view2d');
  resize(); drawMarks(); checkLevel();
}
function exagNote() { $('exagNote').textContent = S.exag === 1 ? t('exagReal') : t('exagNote').replace('{x}', S.exag); }
function setExagLevel(x) { S.exag = x; if (S.view === '3d') { setExag(x); drawMarks(); } exagNote(); }
function zoomBy(f) { // botones + / − (alternativa a rueda, pellizco o arrastre)
  if (!controls) return;
  if (cam === camO) { camO.zoom = Math.max(0.8, Math.min(80, camO.zoom*f)); camO.updateProjectionMatrix(); }
  else { const v = camP.position.clone().sub(controls.target), d = Math.max(4, Math.min(900, v.length()/f)); camP.position.copy(controls.target).add(v.setLength(d)); }
  controls.update(); checkLevel();
}
function bindToggle(btn, body) { btn.onclick = () => { const ex = btn.getAttribute('aria-expanded') !== 'true'; btn.setAttribute('aria-expanded', ex); $(body).hidden = !ex; }; }
function resize() {
  const el = $('map'), w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
  renderer.setSize(w, h); const a = w/h, hh = EXT*1.05;
  camO.left = -hh*a; camO.right = hh*a; camO.top = hh; camO.bottom = -hh; camO.updateProjectionMatrix();
  camP.aspect = a; camP.updateProjectionMatrix(); drawSky(); drawStrip();
}
function visibleKm() {
  if (cam === camO) return Math.min(camO.top - camO.bottom, camO.right - camO.left)/camO.zoom;   // lado menor: en celular vertical manda el ancho
  return cam.position.distanceTo(controls.target) * 0.9;
}
function checkLevel() {
  const v = visibleKm(), tags = META.levels.map(l => l.tag);
  let tag = tags[0];
  if (v < 110 && tags[1]) tag = tags[1];
  if (v < 45 && tags[2]) tag = tags[2];
  if (tag !== S.level) { S.level = tag; drawOverlay(); }
  $('hud').textContent = `${t('level')}: ${L[S.level].diam/1000} km · ${L[S.level].n} ${t('hex')}`;
}
function pick(e) {
  const r = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(((e.clientX - r.left)/r.width)*2 - 1, -((e.clientY - r.top)/r.height)*2 + 1);
  const rc = new THREE.Raycaster(); rc.setFromCamera(ndc, cam);
  const hit = rc.intersectObject(terrain)[0]; if (!hit) return;
  const x = (hit.uv.x*2 - 1)*META.extent, y = (hit.uv.y*2 - 1)*META.extent;
  if (Math.hypot(x, y) > META.extent) return;
  selectXY(x, y);
}
function nearest(lv, x, y) { let b = -1, bd = 1e18; for (let i = 0; i < lv.n; i++) { const dx = lv.pts[i*6] - x, dy = lv.pts[i*6+1] - y, d = dx*dx + dy*dy; if (d < bd) { bd = d; b = i; } } return { i: b, d: Math.sqrt(bd) }; }
async function selectXY(x, y, req) {
  setTimeout(() => { if (S.sel) { const p = P(S.sel.lv, S.sel.i); announce(t('annSel', { lat: p.lat.toFixed(3), lon: p.lon.toFixed(2), s: vSun(S.sel.lv, S.sel.i, -1), n: days(nightH(S.sel.lv, S.sel.i)), e: vEarth(S.sel.lv, S.sel.i, -1) })); } }, 400);
  let n = nearest(FINE, x, y); S.sel = { lv: FINE, i: n.i, req, d: n.d };
  if (RF && S.showRF) { const r = nearest(RF, x, y); if (r.d < Math.max(250, visibleKm()*1000*0.012)) S.sel = { lv: RF, i: r.i, req, d: r.d }; }
  await refreshSite(); drawMarks();
}
function cxy(x, y) { const s = overlayCanvas.width; return [(x/1000 + EXT)/(2*EXT)*s, (EXT - y/1000)/(2*EXT)*s]; }

function drawOverlay() {
  if (!overlayCtx) return;
  const s = overlayCanvas.width, ctx = overlayCtx, hc = hexCanvas.getContext('2d'), lv = L[S.level];
  ctx.fillStyle = '#05070d'; ctx.fillRect(0, 0, s, s);
  ctx.save(); ctx.beginPath(); ctx.arc(s/2, s/2, s/2, 0, 2*Math.PI); ctx.clip(); ctx.drawImage(reliefImg, 0, 0, s, s); ctx.restore();
  hc.clearRect(0, 0, s, s);
  const m = S.month, mg = margin();
  const hexes = (q, keep) => { const rpx = q.diam/2/1000/(2*EXT)*s*1.002;
    for (let i = 0; i < q.n; i++) { if (keep && !keep(i)) continue;
      const [cx, cy] = cxy(q.pts[i*6], q.pts[i*6+1]);
      hc.fillStyle = color(pctOf(q, i, m) + mg); hc.beginPath();
      for (let k = 0; k < 6; k++) { const a = k*Math.PI/3; hc.lineTo(cx + rpx*Math.cos(a), cy + rpx*Math.sin(a)); }
      hc.fill(); } };
  const bare = S.layer === 'relief';   // capa «solo relieve»: sin hexágonos de color
  if (!bare && lv.extent && lv.extent < META.extent - 1) {   // fuera del alcance de este nivel se dibuja el anterior (más grueso)
    const tags = META.levels.map(l => l.tag), C = L[tags[tags.indexOf(lv.tag) - 1]];
    hexes(C, i => Math.hypot(C.pts[i*6], C.pts[i*6+1]) > lv.extent + lv.diam/2);
  }
  if (!bare) { hexes(lv);
  ctx.save(); ctx.beginPath(); ctx.arc(s/2, s/2, s/2, 0, 2*Math.PI); ctx.clip();
  ctx.globalAlpha = 0.5; ctx.drawImage(hexCanvas, 0, 0); ctx.restore(); }
  ctx.strokeStyle = '#ffffff55'; ctx.lineWidth = s/1500; ctx.beginPath(); ctx.arc(s/2, s/2, s/2 - ctx.lineWidth, 0, 2*Math.PI); ctx.stroke();
  if (RF && S.showRF) {   // puntos refinados (40 m): rombos con borde blanco, color según la capa
    const r = s/700; ctx.lineWidth = s/1800; ctx.strokeStyle = '#ffffff';
    for (let i = 0; i < RF.n; i++) { const [cx, cy] = cxy(RF.pts[i*6], RF.pts[i*6+1]); ctx.fillStyle = bare ? '#ffffff' : color(pctOf(RF, i, m) + mg);
      ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  }
  if (S.showReg && META.regions) {   // contornos de las 9 regiones candidatas de Artemis III (USGS)
    ctx.save(); ctx.strokeStyle = '#ffffffcc'; ctx.lineWidth = s/1400; ctx.setLineDash([s/300, s/400]); ctx.fillStyle = '#ffffffdd'; ctx.font = `600 ${s/95}px system-ui`;
    for (const g of META.regions.regions) { ctx.beginPath(); g.hull.forEach(([la, lo], k) => { const q = latLonToMap(la, lo), [cx, cy] = cxy(q.x, q.y); k ? ctx.lineTo(cx, cy) : ctx.moveTo(cx, cy); }); ctx.closePath(); ctx.stroke();
      const c = latLonToMap(...g.centre), [cx, cy] = cxy(c.x, c.y), ys = g.hull.map(([la, lo]) => cxy(latLonToMap(la, lo).x, latLonToMap(la, lo).y)[1]);
      ctx.fillText(g.name, cx - ctx.measureText(g.name).width/2, Math.min(...ys) - s/250); }
    ctx.restore();
  }
  // retícula de latitudes 81–89°S y meridianos cada 30°
  ctx.strokeStyle = '#ffffff22'; ctx.fillStyle = '#ffffff88'; ctx.font = `${s/110}px system-ui`;
  for (const la of [-81, -82, -83, -84, -85, -86, -87, -88, -89]) { const r = 2*META.R*Math.tan((90 + la)/2*D2R)/1000/(2*EXT)*s; ctx.beginPath(); ctx.arc(s/2, s/2, r, 0, 2*Math.PI); ctx.stroke(); ctx.fillText(`${-la}°S`, s/2 + 4, s/2 - r - 4); }
  for (let lo = 0; lo < 360; lo += 30) { const p = latLonToMap(EDGE + 0.2, lo), [cx, cy] = cxy(p.x, p.y); ctx.beginPath(); ctx.moveTo(s/2, s/2); ctx.lineTo(cx, cy); ctx.stroke();
    const q = latLonToMap(EDGE + 0.45, lo), [qx, qy] = cxy(q.x, q.y); ctx.fillText(lo <= 180 ? `${lo}°E` : `${360 - lo}°${t('west')}`, qx - s/120, qy); }
  drawComm(ctx, s);
  overlayTex.needsUpdate = true; updateLegend();
}
function updateLegend() {
  if (!META || !S.level) return;
  const night = S.layer === 'night';
  if (S.layer === 'relief') { $('lgTitle').textContent = t('lgRelief'); $('lgClasses').innerHTML = ''; $('lgClasses').hidden = true; $('lgNote').textContent = t('lgReliefNote'); return; }
  $('lgClasses').hidden = false;
  $('lgTitle').textContent = night ? (S.mode === 'sun' ? t('lgNight') : t('lgBlack')) : S.layer === 'long' ? (S.mode === 'sun' ? t('lgSunLong') : t('lgEarthLong')) : (S.mode === 'sun' ? t('lgSun') : t('lgEarth'));
  const d = t('d'), pc = S.lang === 'es' ? ' %' : '%', lab = night ? [`> 26 ${d}`, `22–26 ${d}`, `18–22 ${d}`, `16–18 ${d}`, `≤ 16 ${d}`] : ['0–20', '21–40', '41–60', '61–80', '81–100'].map(r => r + pc);
  $('lgClasses').innerHTML = CLASSES.map(([, c], k) => `<li><span class="sw" style="background:${c}"></span>${lab[k]}</li>`).join('');
  $('lgNote').textContent = t('lgNote', { d: L[S.level].diam/1000, m: margin() });
}

// marcadores 3D (no dependen de la textura → se actualizan rápido)
function sprite(text, bg) {
  const c = document.createElement('canvas'), x = c.getContext('2d'); x.font = 'bold 40px system-ui';
  const w = Math.ceil(x.measureText(text).width) + 28; c.width = w; c.height = 60;
  x.font = 'bold 40px system-ui'; x.fillStyle = bg; x.beginPath(); x.roundRect(0, 0, w, 60, 18); x.fill();
  x.fillStyle = '#fff'; x.textBaseline = 'middle'; x.fillText(text, 14, 32);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, sizeAttenuation: false }));
  sp.userData.ar = w/60; sp.scale.set(0.045*w/60, 0.045, 1); sp.center.set(0.5, -0.15); sp.renderOrder = 10; return sp;
}
function v3(x, y, lift = 0.3) { return new THREE.Vector3(x/1000, terrH(x, y) + lift, -y/1000); }
function line(pts, col, dashed) {
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const m = dashed ? new THREE.LineDashedMaterial({ color: col, dashSize: 1.2, gapSize: 0.8, depthTest: false }) : new THREE.LineBasicMaterial({ color: col, depthTest: false });
  const l = new THREE.Line(g, m); if (dashed) l.computeLineDistances(); l.renderOrder = 9; return l;
}
function dotMesh(x, y, col) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.7, 20).rotateX(-Math.PI/2), new THREE.MeshBasicMaterial({ color: col, depthTest: false })); m.position.copy(v3(x, y, 0.4)); m.renderOrder = 9; m.userData.dot = true; return m; }
function drawMarks() {
  if (!marks) return; marks.clear();
  S.pins.forEach((pn, k) => { const p = P(pn.lv, pn.i); marks.add(dotMesh(p.x, p.y, 0xffffff)); const sp = sprite(`${k+1}`, '#444c70'); sp.position.copy(v3(p.x, p.y)); marks.add(sp); });
  if (S.sugg) {
    const c = S.sugg, N = [c.p, c.r, c.h, c.w].map(q => P(q.lv, q.i)), COL = [0xffc531, 0x4fa3ff, 0xc9b6ff, 0x5ce1e6];
    for (const l of c.links || []) marks.add(line([v3(N[l.a].x, N[l.a].y), v3(N[l.b].x, N[l.b].y)], l.maxSlope > +$('maxRoute').value ? 0xff5c5c : 0xffffff, l.maxSlope > +$('maxRoute').value));
    const [Pp, Rr, H, Ww] = N;
    [[Pp, '☀', '#a77d00'], [Rr, '📡', '#1d5fa8'], [H, '⌂', '#6a42d8'], [Ww, '💧', '#0e7c86']].forEach(([q, s, b]) => { marks.add(dotMesh(q.x, q.y, 0xffffff)); const sp = sprite(s, b); sp.position.copy(v3(q.x, q.y)); marks.add(sp); });
  }
  if (S.sel && !S.sel.lv.virt) {
    const p = P(S.sel.lv, S.sel.i); marks.add(dotMesh(p.x, p.y, 0xff3df2));
    const ser = serCache.get(S.sel.lv.tag + S.sel.i);
    if (ser) {
      const h = S.hour, L1 = 25000;
      const a = offsetMap(p, ser.sAz[h], L1), b = offsetMap(p, ser.eAz[h], L1);
      marks.add(line([v3(p.x, p.y), v3(a.x, a.y)], 0xffc531, ser.sF[h] === 0));
      marks.add(line([v3(p.x, p.y), v3(b.x, b.y)], 0x4fa3ff, !ser.eV[h]));
      const sa = sprite('☀', ser.sF[h] > 0 ? '#a77d00' : '#555'); sa.position.copy(v3(a.x, a.y)); marks.add(sa);
      const sb = sprite('🜨', ser.eV[h] ? '#1d5fa8' : '#555'); sb.position.copy(v3(b.x, b.y)); marks.add(sb);
    }
  }
}

// ---------- tiempo ----------
function hourToDate(h) { return new Date(Date.parse('2027-01-01T00:00:00Z') + h*3600e3); }
function fmtUTC(d) { return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC'; }
function monthOf(h) { let best = 0, bd = 1e9; META.months.forEach((m, k) => { const d = h < m.h0 ? m.h0 - h : h > m.h1 ? h - m.h1 : 0; if (d < bd) { bd = d; best = k; } }); return best; }
function updateTimeLabel() {
  if (!META) return; const d = hourToDate(S.hour), mo = META.months[S.month];
  $('tUTC').textContent = fmtUTC(d); $('time').setAttribute('aria-valuetext', fmtUTC(d));
  $('tMonth').textContent = `${t('month')} ${S.month + 1} ${t('of')} ${M}: ${mo.start.slice(0, 10)} → ${mo.end.slice(0, 10)}`;
  $('tInput').value = d.toISOString().slice(0, 16);
}
function setHour(h, exact) {
  S.hour = Math.max(0, Math.min(NH - 1, exact ? Math.round(h) : Math.round(h/6)*6)); $('time').value = Math.round(S.hour/6);
  const m = monthOf(S.hour); if (m !== S.month) { S.month = m; drawOverlay(); if ($('period').value === 'month' && S.suggList.length) runSuggest(); }
  updateTimeLabel(); refreshSite(false); drawMarks(); renderCompare();
}

// ---------- cielo ----------
function yOf(e, H) { // escala no lineal: -5..0 (15%), 0..10 (55%), 10..30 (27%)
  if (e < 0) return H*(0.85 + 0.15*Math.min(1, -e/5));
  if (e < 10) return H*(0.85 - 0.55*e/10);
  return H*(0.30 - 0.27*Math.min(1, (e - 10)/20));
}
function drawSky() {
  const c = $('sky'), dpr = devicePixelRatio || 1, W = c.clientWidth, H = 230;
  c.width = W*dpr; c.height = H*dpr; const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#02030a'); gr.addColorStop(1, '#0c1226'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
  x.font = '10px system-ui'; x.fillStyle = '#8f9bb8'; x.strokeStyle = '#ffffff14';
  for (const e of [-5, 0, 2, 4, 6, 8, 10, 20, 30]) { const y = yOf(e, H); x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); x.fillText(e + '°', 3, y - 2); }
  const ser = S.sel && serCache.get(S.sel.lv.tag + S.sel.i);
  if (!ser) { c.setAttribute('aria-label', t('clickMap')); x.fillText(t('clickMap'), W/2 - 80, H/2); return; }
  { const h = S.hour, f = ser.sF[h]; c.setAttribute('aria-label', t('ariaSky', { se: ser.sEl[h].toFixed(2), sa: ser.sAz[h].toFixed(0), sf: Math.round(f*100), ee: ser.eEl[h].toFixed(2), ev: ser.eV[h] ? t('visible') : t('hidden') })); }
  const h = S.hour, span = S.skyWide ? 360 : 90;
  const cAz = S.mode === 'sun' ? ser.sAz[h] : ser.eAz[h];
  const X = (az) => W/2 + ((((az - cAz) % 360) + 540) % 360 - 180)*(W/span);
  // marcas de azimut
  const step = S.skyWide ? 30 : 10;
  for (let a = 0; a < 360; a += step) { const xx = X(a); if (xx < 0 || xx > W) continue; x.fillStyle = '#8f9bb8'; x.fillText(({0: 'N', 90: 'E', 180: 'S', 270: t('west')})[a] || a + '°', xx - 6, H - 3); }
  // trayectorias del mes
  const mo = META.months[S.month];
  const path = (az, el, col) => { x.fillStyle = col; for (let k = mo.h0; k <= mo.h1; k += 2) { const xx = X(az[k]); if (xx >= 0 && xx <= W) x.fillRect(xx, yOf(el[k], H), 1.5, 1.5); } };
  path(ser.sAz, ser.sEl, '#ffc53166'); path(ser.eAz, ser.eEl, '#4fa3ff66');
  // discos
  const disk = (az, el, rdeg, fill) => { el = Math.min(el, 29); const xx = X(az), y1 = yOf(el + rdeg, H), y2 = yOf(el - rdeg, H), r = Math.max(2.5, (y2 - y1)/2); x.fillStyle = fill; x.beginPath(); x.arc(xx, (y1 + y2)/2, r, 0, 2*Math.PI); x.fill(); return [xx, (y1 + y2)/2, r]; };
  const sd = disk(ser.sAz[h], ser.sEl[h], EPH[h*8 + 3], '#ffd54a');
  const ed = disk(ser.eAz[h], ser.eEl[h], ser.eR[h], '#4fa3ff');
  // terreno
  x.fillStyle = '#596173'; x.beginPath(); x.moveTo(0, H);
  for (let px = 0; px <= W; px += 1) { const az = cAz + (px - W/2)*(span/W); x.lineTo(px, yOf(hzAt(ser.hz, az), H)); }
  x.lineTo(W, H); x.closePath(); x.fill();
  x.strokeStyle = '#aab3c7'; x.lineWidth = 1; x.beginPath();
  for (let px = 0; px <= W; px += 1) { const az = cAz + (px - W/2)*(span/W), y = yOf(hzAt(ser.hz, az), H); px ? x.lineTo(px, y) : x.moveTo(px, y); } x.stroke();
  // contornos (visibles aunque estén ocultos)
  x.setLineDash([3, 3]); x.lineWidth = 1.2;
  x.strokeStyle = '#ffd54a'; x.beginPath(); x.arc(sd[0], sd[1], sd[2] + 2, 0, 2*Math.PI); x.stroke();
  x.strokeStyle = '#4fa3ff'; x.beginPath(); x.arc(ed[0], ed[1], ed[2] + 2, 0, 2*Math.PI); x.stroke(); x.setLineDash([]);
  x.font = 'bold 11px system-ui';
  x.fillStyle = '#ffd54a'; x.fillText(`☀ ${ser.sEl[h].toFixed(2)}°${ser.sEl[h] > 30 ? ' ↑ ' + t('offScale') : ''}`, sd[0] + sd[2] + 4, sd[1] + (ser.sEl[h] > 30 ? 12 : -4));
  x.fillStyle = '#7fbfff'; x.fillText(`🜨 ${ser.eEl[h].toFixed(2)}°${ser.eEl[h] > 30 ? ' ↑ ' + t('offScale') : ''}`, ed[0] + ed[2] + 4, ed[1] + 12);
}
function drawStrip() {
  const c = $('strip'), dpr = devicePixelRatio || 1, W = c.clientWidth, H = 70; c.width = W*dpr; c.height = H*dpr;
  const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.fillStyle = '#05070d'; x.fillRect(0, 0, W, H);
  const ser = S.sel && serCache.get(S.sel.lv.tag + S.sel.i); if (!ser) { c.setAttribute('aria-label', t('ariaStripEmpty')); return; }
  const mo = META.months[S.month], n = mo.h1 - mo.h0 + 1, X = (k) => (k - mo.h0)/n*W;
  c.setAttribute('aria-label', t('ariaStrip', { s: vSun(S.sel.lv, S.sel.i, S.month), e: vEarth(S.sel.lv, S.sel.i, S.month), a: mo.start.slice(0, 10), b: mo.end.slice(0, 10) }));
  for (let k = mo.h0; k <= mo.h1; k++) {
    const w = Math.max(1, W/n + 0.5);
    x.fillStyle = '#ffc531'; x.fillRect(X(k), 32 - 28*ser.sF[k], w, 28*ser.sF[k]);
    if (ser.eV[k]) { x.fillStyle = '#4fa3ff'; x.fillRect(X(k), 38, w, 22); }
  }
  for (let k = mo.h0; k <= mo.h1; k++) if (ser.ecl[k] > 0) { x.fillStyle = '#ff5c5c'; x.fillRect(X(k) - 1, 0, 3, 8); }
  x.fillStyle = '#8f9bb8'; x.font = '10px system-ui';
  for (let d = 0; d < n/24; d += 5) { x.fillRect(X(mo.h0 + d*24), 60, 1, 6); x.fillText(`+${d}d`, X(mo.h0 + d*24) + 2, 69); }
  if (S.hour >= mo.h0 && S.hour <= mo.h1) { x.fillStyle = '#ff3df2'; x.fillRect(X(S.hour) - 1, 0, 2, H); }
}

// ---------- ficha del sitio ----------
function dur(hh) { const d = Math.floor(hh/24), h = Math.round(hh - d*24); return d ? `${d} d ${h} h` : `${h} h`; }
function nextChange(arr, h, on) { for (let k = h + 1; k < NH; k++) if ((arr[k] > 0) !== on) return k - h; return null; }
async function refreshSite(full = true) {
  if (!S.sel) { drawSky(); return; }
  const ser = await series(S.sel.lv, S.sel.i), p = ser.p, h = S.hour, lv = S.sel.lv, i = S.sel.i, m = S.month;
  const sOn = ser.sF[h] > 0, eOn = ser.eV[h] > 0;
  const ns = nextChange(ser.sF, h, sOn), ne = nextChange(ser.eV, h, eOn);
  const hzS = hzAt(ser.hz, ser.sAz[h]), hzE = hzAt(ser.hz, ser.eAz[h]);
  const eclTag = ser.ecl[h] > 0 ? ` <span class="tag no">${t('eclNow')} ${(ser.ecl[h]*100).toFixed(0)}%</span>` : '';
  const tag = (f) => f >= 1 ? `<span class="tag ok">${t('visible')}</span>` : f > 0 ? `<span class="tag part">${t('partial')} ${(f*100).toFixed(0)}%</span>` : `<span class="tag no">${t('hidden')}</span>`;
  const plain = [];
  if (isPsr(lv, i)) plain.push(['s', t('plainPsr')]);
  else {
    if (ser.ecl[h] > 0) plain.push(['s', t('plainEcl')]);
    else if (ser.sF[h] >= 1) plain.push(['s', t('plainSunUp', { a: fmtN(ser.sEl[h] - hzS, 1), d: ns == null ? t('never') : durPlain(ns) })]);
    else if (ser.sF[h] > 0) plain.push(['s', t('plainSunPart', { p: Math.round(ser.sF[h]*100) })]);
    else plain.push(['s', t('plainSunDown', { d: ns == null ? t('never') : durPlain(ns) })]);
    plain.push(['s', t(lv.virt ? 'plainNightDet' : 'plainNight', { d: fmtN(nightH(lv, i)/24, 1) })]);
  }
  if (blackH(lv, i) === 0) plain.push(['e', t('plainEarthAlways')]);
  else if (eOn) plain.push(['e', t('plainEarthUp', { d: ne == null ? t('never') : durPlain(ne) })]);
  else plain.push(['e', t('plainEarthDown', { d: ne == null ? t('never') : durPlain(ne) })]);
  const pv = Math.round(100*ser.sF[h]*Math.cos(ser.sEl[h]*D2R)), ph = Math.round(100*ser.sF[h]*Math.max(0, Math.sin(ser.sEl[h]*D2R)));
  const virtNote = lv.virt ? `<p class="virt">${t('virtNote', { n: lv.names[i] || '' })}</p>` : '';
  $('siteInfo').innerHTML = `${virtNote}
  <ul class="plain">${plain.map(([c, x]) => `<li class="${c}">${x}</li>`).join('')}</ul>
  <div class="big"><div class="s"><small>${term('elevation', t('sunEl'))}</small><b>${ser.sEl[h].toFixed(2)}°</b><small>${(ser.sEl[h] - hzS >= 0 ? '+' : '') + (ser.sEl[h] - hzS).toFixed(2)}° ${t('sunAbove')} · ${tag(ser.sF[h])}${eclTag}</small></div>
  <div class="e"><small>${term('elevation', t('earthEl'))}</small><b>${ser.eEl[h].toFixed(2)}°</b><small>${(ser.eEl[h] - hzE >= 0 ? '+' : '') + (ser.eEl[h] - hzE).toFixed(2)}° ${t('sunAbove')} · ${tag(eOn ? 1 : 0)}</small></div></div>
  <div class="kv">
   <span>☀ ${sOn ? t('sunset') : t('sunrise')}</span><span><b>${ns == null ? t('never') : dur(ns)}</b></span>
   <span>🜨 ${eOn ? t('earthset') : t('earthrise')}</span><span><b>${ne == null ? t('never') : dur(ne)}</b></span>
   <span>☀ %</span><span><b>${vSun(lv, i, m)}%</b> ${term('synodic', t('monthPct'))} ${lv.virt ? '' : ` · ${vSun(lv, i, -2)}% ${t('detPct')}`} · ${vSun(lv, i, -1)}% ${lv.virt ? t('detPct') : t('longPct')}</span>
   <span>🜨 %</span><span><b>${vEarth(lv, i, m)}%</b> ${t('monthPct')} ${lv.virt ? '' : ` · ${vEarth(lv, i, -2)}% ${t('detPct')}`} · ${vEarth(lv, i, -1)}% ${lv.virt ? t('detPct') : t('longPct')}</span>
   <span>☀ ${term('longestNight', lv.virt ? t('nightLdet') : t('nightL'))}</span><span><b>${days(nightH(lv, i))}</b> · ${t('worstMonth')} ${worstS(lv, i)}%</span>
   <span>🜨 ${term('blackout', lv.virt ? t('blackLdet') : t('blackL'))}</span><span><b>${days(blackH(lv, i))}</b> · ${t('worstMonth')} ${worstE(lv, i)}%</span>
   <span>${term('panel', t('power'))}</span><span><b>${pv}%</b> ${t('panelV')} · ${ph}% ${t('panelH')}</span>
   <span>${t('lat')} / ${t('lon')}</span><span>${p.lat.toFixed(4)}° / ${p.lon.toFixed(4)}°</span>
   <span>${t('elev')}</span><span>${lv.virt ? '—' : Math.round(p.h) + ' m'}</span>
   <span>${t('slope')}</span><span>${lv.virt ? '—' : p.slope.toFixed(1) + '°'}</span>
   <span>${term('azimuth', t('az'))} ☀ / 🜨</span><span>${ser.sAz[h].toFixed(1)}° / ${ser.eAz[h].toFixed(1)}°</span>
   <span>${term('psr', t('psr'))}</span><span>${isPsr(lv, i) ? t('yes') : t('no')}</span>
   ${lv === RF ? `<span>${t('refinedPt')}</span><span>${t('yes')}</span>` : ''}
   ${S.sel.req && !lv.virt ? `<span>${t('nearest')}</span><span>${resLabel(lv)} · ${t('dist')} ${(S.sel.d/1000).toFixed(2)} km</span>` : ''}
  </div>`;
  drawSky(); drawStrip(); renderWindows(ser);
}

// ---------- ventanas de aterrizaje: fechas alternativas para el mismo sitio ----------
function renderWindows(ser) {
  const box = $('winOut'); if (!box) return;
  if (!ser) { box.innerHTML = `<p class="small muted">${t('clickMap')}</p>`; return; }
  const minH = +$('winMin').value*24, both = $('winCrit').value === 'both', runs = [];
  let st = -1;
  for (let k = 0; k <= NH; k++) {
    const ok = k < NH && ser.sF[k] >= 0.5 && (!both || ser.eV[k]);
    if (ok && st < 0) st = k; if (!ok && st >= 0) { if (k - st >= minH) runs.push([st, k - st]); st = -1; }
  }
  const next = runs.find(r => r[0] + r[1] > S.hour);
  box.innerHTML = `<p class="small">${t('winCount', { n: runs.length, d: fmtN(minH/24, 1) })}${next ? ' ' + t('winNext', { a: fmtUTC(hourToDate(Math.max(next[0], S.hour))) }) : ''}</p>` +
    `<ul class="win-list">${runs.slice(0, 12).map(([a, n]) => `<li><button type="button" class="win" data-h="${a}"><span>${fmtUTC(hourToDate(a))}</span><b>${fmtN(n/24, 1)} ${t('d')}</b></button></li>`).join('')}</ul>` +
    (runs.length > 12 ? `<p class="small muted">${t('winMore', { n: runs.length - 12 })}</p>` : '');
  box.querySelectorAll('.win').forEach(b => b.onclick = () => { setHour(+b.dataset.h, true); announce(t('annWin', { a: b.querySelector('span').textContent })); });
}

// ---------- sitios ----------
// Sitios notables con fuente (lat, lon en grados; E positivo)
const CURATED = [
  ['Haworth · HW01 (Artemis III)', -86.768, -20.514, 'Wueller et al. 2026'],
  ['Malapert Massif (Artemis III)', -85.972, -2.110, 'LOLA'],
  ['Mons Mouton · IM-2 Athena (Artemis III, CLPS)', -84.78, 29.13, 'LROC 2025'],
  ['Nobile Rim 2 (Artemis III)', -84.20156, 60.69989, 'Acta Astronautica 2024'],
  ["Chang'e-7 · Shackleton SE ridge (CNSA, planned)", -88.8, 123.4, 'CNSA via Wikipedia'],
  ['Griffin-1 (Astrobotic, CLPS, planned) · Nobile region, crater centre (IAU)', -85.28, 53.27, 'NASA / IAU Gazetteer'],
  ['IM-1 Odysseus (CLPS, 2024)', -80.13, 1.44, 'NASA LRO 2024'],
  ['Chandrayaan-3 · Statio Shiv Shakti (ISRO, 2023)', -69.373, 32.319, 'IAU'],
  ['Apollo 17 (1972)', 20.188, 30.775, 'NSSDC'],
  ['Apollo 11 (1969)', 0.67416, 23.47314, 'NSSDC / LROC']];
const IAU = [ // centros de cráteres (IAU/USGS Gazetteer), referencia de navegación
  ['Shackleton', -89.67, 129.78], ['Shoemaker', -88.14, 44.91], ['Faustini', -87.18, 84.31], ['Haworth', -87.45, -4.98],
  ['de Gerlache', -88.50, -87.08], ['Sverdrup', -88.50, -152.0], ['Nobile', -85.28, 53.27]];
function buildSiteList() {
  if (!FINE) return; const sel = $('sites'); sel.innerHTML = `<option value="">${t('sitesPh')}</option>`;
  const og1 = document.createElement('optgroup'); og1.label = t('iauGroup');
  IAU.forEach(([n, la, lo]) => og1.append(new Option(`${n} (${la}°, ${lo}°)`, `${la},${lo}`)));
  const top = (f) => [...Array(FINE.n).keys()].sort((a, b) => f(b) - f(a)).slice(0, 5);
  const og2 = document.createElement('optgroup'); og2.label = t('bestSun');
  top(i => vSun(FINE, i, -1)).forEach(i => { const p = P(FINE, i); og2.append(new Option(`☀ ${vSun(FINE, i, -1)}% · ${p.lat.toFixed(3)}°, ${p.lon.toFixed(2)}°`, `${p.lat},${p.lon}`)); });
  const og3 = document.createElement('optgroup'); og3.label = t('bestEarth');
  top(i => vEarth(FINE, i, -1) + vSun(FINE, i, -1)/1000).forEach(i => { const p = P(FINE, i); og3.append(new Option(`🜨 ${vEarth(FINE, i, -1)}% · ${p.lat.toFixed(3)}°, ${p.lon.toFixed(2)}°`, `${p.lat},${p.lon}`)); });
  const og0 = document.createElement('optgroup'); og0.label = t('curatedGroup');
  CURATED.forEach(([n, la, lo, src]) => og0.append(new Option(`${n} · ${la}°, ${lo}°${la > EDGE ? ' · ' + t('flatTag') : ''}`, `${la},${lo},${n}`)));
  sel.append(og0, og1, og2, og3);
  if (RF && RF.zones) {   // regiones Artemis III (USGS): mejor punto a 40 m de cada una (noche más corta, pendiente ≤ 8°)
    const og5 = document.createElement('optgroup'); og5.label = t('artemisGroup'); let off = 0;
    RF.zones.forEach(z => { const n = z.n || 6;
      if (z.kind === 'artemis') { let b = off; for (let i = off; i < off + n; i++) if (nightH(RF, i) < nightH(RF, b) || (nightH(RF, i) === nightH(RF, b) && vSun(RF, i, -1) > vSun(RF, b, -1))) b = i;
        const p = P(RF, b); og5.append(new Option(`${z.name} · ◆ ${days(nightH(RF, b))} · ☀${vSun(RF, b, -1)}% · 🜨${vEarth(RF, b, -1)}% · ${p.slope.toFixed(1)}°`, `${p.lat},${p.lon},${z.name}`)); }
      off += n; });
    if (og5.children.length) sel.append(og5);
  }
  if (RF) { const og4 = document.createElement('optgroup'); og4.label = t('refinedGroup');
    [...Array(RF.n).keys()].sort((a, b) => nightH(RF, a) - nightH(RF, b) || vSun(RF, b, -1) - vSun(RF, a, -1)).slice(0, 8)
      .forEach(i => { const p = P(RF, i); og4.append(new Option(`◆ ${days(nightH(RF, i))} · ☀${vSun(RF, i, -1)}% · ${p.lat.toFixed(4)}°, ${p.lon.toFixed(3)}°`, `${p.lat},${p.lon},R`)); });
    sel.append(og4); }
}
function goTo(lat, lon, name) {
  if (!(lat >= -90 && lat <= 90) || isNaN(lon)) { alert(t('latErr')); return; }
  if (lat > EDGE) {   // fuera del área de topografía: sitio con horizonte liso
    const i = addVirt(lat, lon, name || t('customSite')); S.sel = { lv: VIRT, i, req: false, d: 0 };
    refreshSite().then(() => { drawMarks(); announce(t('annSel', { lat: lat.toFixed(3), lon: lon.toFixed(2), s: vSun(VIRT, i, -1), n: days(nightH(VIRT, i)), e: vEarth(VIRT, i, -1) })); });
    return;
  }
  const q = latLonToMap(lat, lon); selectXY(q.x, q.y, true);
  if (S.view === '2d') { controls.target.set(q.x/1000, 0, -q.y/1000); camO.position.set(q.x/1000, 1000, -q.y/1000); camO.zoom = Math.max(camO.zoom, 3); camO.updateProjectionMatrix(); controls.update(); }
}

// ---------- sugeridor ----------
let psrDist;
function precomputePsrDist(lv) {
  const cell = 5000, grid = new Map(), key = (a, b) => a + ',' + b;
  for (let i = 0; i < lv.n; i++) if (isPsr(lv, i)) { const k = key(Math.floor(lv.pts[i*6]/cell), Math.floor(lv.pts[i*6+1]/cell)); (grid.get(k) || grid.set(k, []).get(k)).push(i); }
  psrDist = new Float32Array(lv.n).fill(1e9);
  for (let i = 0; i < lv.n; i++) {
    const x = lv.pts[i*6], y = lv.pts[i*6+1], cx = Math.floor(x/cell), cy = Math.floor(y/cell);
    for (let dx = -9; dx <= 9; dx++) for (let dy = -9; dy <= 9; dy++) { const g = grid.get(key(cx + dx, cy + dy)); if (g) for (const j of g) { const d = Math.hypot(lv.pts[j*6] - x, lv.pts[j*6+1] - y); if (d < psrDist[i]) psrDist[i] = d; } }
  }
}
function fitTo(pts) {   // encuadra el mapa polar sobre un conjunto de puntos
  if (S.view !== '2d') return;
  const xs = pts.map(p => p.x/1000), ys = pts.map(p => p.y/1000), cx = (Math.min(...xs) + Math.max(...xs))/2, cy = (Math.min(...ys) + Math.max(...ys))/2;
  const span = Math.max(4, Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))*1.6;
  controls.target.set(cx, 0, -cy); camO.position.set(cx, 1000, -cy); camO.zoom = Math.min(60, (camO.top - camO.bottom)/span); camO.updateProjectionMatrix(); controls.update(); checkLevel();
}
// ---------- sugeridor: red de 4 nodos ----------
// ☀ energía (paneles) · 📡 antena con vista a la Tierra · ⌂ hábitat · 💧 extracción de agua (hielo en sombra permanente)
// Costo = longitud del árbol de expansión mínima que conecta los 4 sitios (cables, caminos y ductos a construir).
let T1K = null;
function hGrid(x, y) {   // altura (m) en la grilla de terreno (2048², ~297 m), interpolación bilineal
  const n = META.terrainN || 1024, c = (x/1000 + EXT)/(2*EXT)*(n - 1), r = (EXT - y/1000)/(2*EXT)*(n - 1);
  const i = Math.max(0, Math.min(n - 2, Math.floor(r))), j = Math.max(0, Math.min(n - 2, Math.floor(c))), fr = r - i, fc = c - j;
  return T1K[i*n + j]*(1 - fr)*(1 - fc) + T1K[i*n + j + 1]*(1 - fr)*fc + T1K[(i + 1)*n + j]*fr*(1 - fc) + T1K[(i + 1)*n + j + 1]*fr*fc;
}
function routeProfile(a, b) {   // tramo recto a→b: pendiente máxima (°), subida y bajada acumuladas (m)
  const L = Math.hypot(b.x - a.x, b.y - a.y), step = 300, n = Math.max(1, Math.round(L/step));
  let prev = hGrid(a.x, a.y), mx = 0, up = 0, dn = 0;
  for (let k = 1; k <= n; k++) { const f = k/n, h = hGrid(a.x + (b.x - a.x)*f, a.y + (b.y - a.y)*f), dh = h - prev;
    mx = Math.max(mx, Math.atan(Math.abs(dh)/(L/n))*R2D); if (dh > 0) up += dh; else dn -= dh; prev = h; }
  return { len: L, maxSlope: L > 0 ? mx : 0, up, dn };
}
function mst(nodes) {   // Prim para 4 nodos
  const inT = [0], edges = []; let total = 0;
  while (inT.length < nodes.length) { let best = null;
    for (const a of inT) for (let b = 0; b < nodes.length; b++) if (!inT.includes(b)) { const d = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y); if (!best || d < best.d) best = { a, b, d }; }
    inT.push(best.b); edges.push(best); total += best.d; }
  return { total, edges };
}
function kNear(list, x, y, k) { const out = []; for (const c of list) { const d = (c.x - x)**2 + (c.y - y)**2; if (out.length < k || d < out[out.length - 1].d) { out.push({ c, d }); out.sort((a, b) => a.d - b.d); if (out.length > k) out.pop(); } } return out.map(o => o.c); }
function runSuggest() {
  if (!T1K) return;
  const per = $('period').value, m = per === 'long' ? -1 : per === 'det' ? -2 : S.month;
  const maxN = +$('maxNight').value*24, maxRoute = +$('maxRoute').value;
  const thrS = 100 - S.mSun, thrE = 100 - S.mRadio, maxSlope = +$('maxSlope').value, maxIce = +$('psrDist').value*1000, habSun = +$('habSun').value;
  const pool = []; for (const lv of [FINE, RF].filter(Boolean)) for (let i = 0; i < lv.n; i++) pool.push({ lv, i, x: lv.pts[i*6], y: lv.pts[i*6+1] });
  const sun = c => vSun(c.lv, c.i, m), ear = c => vEarth(c.lv, c.i, m), nig = c => nightH(c.lv, c.i);
  const topN = Math.max(20, Math.round(FINE.n*0.01)), warn = [];
  let Pc = pool.filter(c => sun(c) >= thrS && nig(c) <= maxN), Rc = pool.filter(c => ear(c) >= thrE);
  if (!Pc.length) {
    const okN = pool.filter(c => nig(c) <= maxN);
    if (okN.length) { Pc = okN.sort((a, b) => sun(b) - sun(a)).slice(0, topN); warn.push('☀ ' + t('noCand', { m: S.mSun })); }
    else { Pc = pool.slice().sort((a, b) => nig(a) - nig(b)).slice(0, topN); warn.push('☀ ' + t('noNight', { d: (maxN/24).toFixed(1), b: (nig(Pc[0])/24).toFixed(1) })); }
  }
  if (!Rc.length) { Rc = pool.slice().sort((a, b) => ear(b) - ear(a)).slice(0, topN); warn.push('🜨 ' + t('noCand', { m: S.mRadio })); }
  const lv = FINE, Wc = [], Hc = [];
  for (let i = 0; i < lv.n; i++) {
    const c = { lv, i, x: lv.pts[i*6], y: lv.pts[i*6+1] };
    if (isPsr(lv, i)) Wc.push(c);
    else if (lv.pts[i*6+5] <= maxSlope && psrDist[i] <= maxIce && vSun(lv, i, m) >= habSun) Hc.push(c);
  }
  const wNearP = new Map(), res = [];
  for (const h of Hc) {
    const Ps = kNear(Pc, h.x, h.y, 4), Rs = kNear(Rc, h.x, h.y, 3), Ws = new Set(kNear(Wc, h.x, h.y, 3));
    for (const p of Ps) { if (!wNearP.has(p)) wNearP.set(p, kNear(Wc, p.x, p.y, 2)); wNearP.get(p).forEach(w => Ws.add(w)); }
    let best = null;
    for (const p of Ps) for (const r of Rs) for (const w of Ws) {
      if (Math.hypot(w.x - h.x, w.y - h.y) > maxIce) continue;
      const T = mst([p, r, h, w]); const cost = T.total/1000 - 0.01*(sun(p) + ear(r)) + 0.002*nig(p);
      if (!best || cost < best.cost) best = { p, r, h, w, mstLen: T.total, edges: T.edges, cost, m };
    }
    if (best) res.push(best);
  }
  res.sort((a, b) => a.cost - b.cost);
  // pendientes de los tramos para los mejores, y diversidad (hábitats separados ≥ 4 km)
  const out = [], over = [];
  for (const c of res.slice(0, 400)) {
    if (![...out, ...over].every(o => Math.hypot(o.h.x - c.h.x, o.h.y - c.h.y) > 4000)) continue;
    const N = [c.p, c.r, c.h, c.w]; c.links = c.edges.map(e => ({ a: e.a, b: e.b, ...routeProfile(N[e.a], N[e.b]) }));
    c.routeMax = Math.max(0, ...c.links.map(l => l.maxSlope));
    (c.routeMax <= maxRoute ? out : over).push(c);
    if (out.length >= 6) break;
  }
  if (out.length < 6) { if (over.length) warn.push(t('routeWarn', { s: maxRoute })); out.push(...over.slice(0, 6 - out.length)); }
  warn.push(t('candCount4', { p: Pc.length, r: Rc.length, h: Hc.length, w: Wc.length }));
  S.suggList = out; S.suggWarn = warn; S.suggEmpty = !Hc.length || !res.length; renderSuggest();
}
const resLabel = (lv, i) => lv.tag === 'R40' ? '40 m' : diamOf(lv, i)/1000 + ' km';
const NODE = ['☀', '📡', '⌂', '💧'];
function renderSuggest() {
  const o = $('suggestOut'); if (!S.suggList) return;
  let html = (S.suggWarn || []).map(w => `<div class="small warn">${w}</div>`).join('');
  if (S.suggEmpty) html += `<div class="small warn">${t('noHab')}</div>`;
  const ecl = (META.eclipses || []).slice().sort((a, b) => b.partial_min - a.partial_min)[0];
  if (ecl && S.suggList.length) html += `<div class="small muted" style="margin-top:6px">⚠ ${t('eclReserve', { d: ecl.peak.slice(0, 10), p: ecl.partial_min, t: ecl.total_min })}</div>`;
  html += S.suggList.map((c, k) => { const H = P(c.h.lv, c.h.i), W = P(c.w.lv, c.w.i), m = c.m;
    const links = c.links.map(l => `<li class="${l.maxSlope > +$('maxRoute').value ? 'bad' : ''}">${NODE[l.a]}–${NODE[l.b]} ${(l.len/1000).toFixed(1)} km · ${t('slopeMax')} ${l.maxSlope.toFixed(0)}° · ↑${Math.round(l.up)} m ↓${Math.round(l.dn)} m</li>`).join('');
    return `<div class="sg ${S.sugg === c ? 'sel' : ''}" data-k="${k}" role="button" tabindex="0"><b>#${k+1}</b> · ${t('network')} <b>${(c.mstLen/1000).toFixed(1)} km</b> · ${t('slopeMax')} <b>${c.routeMax.toFixed(0)}°</b><br>
    ☀ ${t('panels')} (${resLabel(c.p.lv, c.p.i)}): ${vSun(c.p.lv, c.p.i, m)}% · ${t('nightS')} ${days(nightH(c.p.lv, c.p.i))}<br>
    📡 ${t('radio')} (${resLabel(c.r.lv, c.r.i)}): ${vEarth(c.r.lv, c.r.i, m)}% · ${t('blackS')} ${days(blackH(c.r.lv, c.r.i))}<br>
    ⌂ ${t('habitat')}: ${H.lat.toFixed(3)}°, ${H.lon.toFixed(2)}° · ${t('slope')} ${H.slope.toFixed(1)}° · ☀${vSun(c.h.lv, c.h.i, m)}%<br>
    💧 ${t('water')}: ${W.lat.toFixed(3)}°, ${W.lon.toFixed(2)}° · ${t('psr')}<ul class="links">${links}</ul></div>`; }).join('');
  o.innerHTML = html;
  const pickS = (d) => { S.sugg = S.suggList[+d.dataset.k]; const H = P(S.sugg.h.lv, S.sugg.h.i); selectXY(H.x, H.y); fitTo([S.sugg.p, S.sugg.r, S.sugg.h, S.sugg.w].map(q => P(q.lv, q.i))); renderSuggest(); drawMarks(); };
  o.querySelectorAll('.sg').forEach(d => { d.onclick = () => pickS(d); d.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickS(d); } }; });
}

// ---------- comparación ----------
async function renderCompare() {
  const card = $('cmpCard'); card.hidden = !S.pins.length; if (!S.pins.length) return;
  const sers = await Promise.all(S.pins.map(p => series(p.lv, p.i))), h = S.hour, m = S.month;
  const rows = [
    [t('lat') + ' / ' + t('lon'), s => `${s.p.lat.toFixed(3)}, ${s.p.lon.toFixed(2)}`],
    [t('sunEl'), s => s.sEl[h].toFixed(2) + '°'], ['☀ ' + t('disk'), s => (s.sF[h]*100).toFixed(0) + '%'],
    ['🜨 ' + t('visible'), s => s.eV[h] ? t('yes') : t('no')],
    ['☀ % ' + t('monthPct'), s => vSun(s.lv, s.i, m) + '%'], ['☀ % ' + t('detPct'), s => vSun(s.lv, s.i, -2) + '%'],
    ['🜨 % ' + t('monthPct'), s => vEarth(s.lv, s.i, m) + '%'], ['🜨 % ' + t('detPct'), s => vEarth(s.lv, s.i, -2) + '%'],
    ['☀ % ' + t('longPct'), s => vSun(s.lv, s.i, -1) + '%'], ['🜨 % ' + t('longPct'), s => vEarth(s.lv, s.i, -1) + '%'],
    ['☀ ' + t('nightL'), s => days(nightH(s.lv, s.i))], ['🜨 ' + t('blackL'), s => days(blackH(s.lv, s.i))],
    [t('slope'), s => s.p.slope.toFixed(1) + '°'], [t('elev'), s => Math.round(s.p.h) + ' m']];
  $('cmp').innerHTML = `<table><tr><th>${t('cmpMetric')}</th>${sers.map((_, k) => `<th>${k+1}</th>`).join('')}</tr>` +
    rows.map(([n, f]) => `<tr><td>${n}</td>${sers.map(s => `<td>${f(s)}</td>`).join('')}</tr>`).join('') + '</table>';
}

// ---------- offline ----------
async function saveOffline() {
  if (!('caches' in window)) return;
  const urls = []; META.levels.forEach(lv => { for (let k = 0; k < Math.ceil(lv.n/lv.tile); k++) urls.push(`data/hz/${lv.tag}_${k}.bin`); });
  const c = await caches.open('selenesight-data-v2'); let n = 0;
  for (const u of urls) { if (!(await c.match(u))) await c.add(u); n++; if (n % 3 === 0) $('offlineMsg').textContent = t('offlineBusy', { n, t: urls.length }); }
  $('offlineMsg').textContent = t('offlineDone', { n: urls.length });
}

function renderEclipses() {
  if (!META.eclipses) return;
  $('eclList').innerHTML = META.eclipses.map((e, k) => `<li><button type="button" class="ecl" data-k="${k}"><span>${e.peak.replace('T', ' ').replace('Z', ' UTC')}</span>
    <span class="k ${e.kind}">${t('ecl_' + e.kind)}</span><span class="muted">${e.total_min ? e.total_min + ' min ' + t('totality') : e.partial_min ? e.partial_min + ' min' : e.penum_min + ' min ' + t('penum')}</span></button></li>`).join('');
  $('eclList').querySelectorAll('.ecl').forEach(d => {
    const go = () => { const e = META.eclipses[+d.dataset.k]; setHour(e.h, true); announce(t('annEcl', { d: e.peak.replace('T', ' ').replace('Z', ' UTC') })); };
    d.onclick = go;
  });
}
// ---------- público general: modo Explorar, glosario, historias, recorrido ----------
const fmtN = (x, d) => S.lang === 'es' ? x.toFixed(d).replace('.', ',') : x.toFixed(d);
function durPlain(hh) { const d = Math.floor(hh/24), h = Math.round(hh - d*24);
  return d ? t('durDH', { d, h, ds: d === 1 ? t('day1') : t('dayN'), hs: h === 1 ? t('hour1') : t('hourN') }) : t('durH', { h, hs: h === 1 ? t('hour1') : t('hourN') }); }
const GLOSS = ['horizon', 'elevation', 'azimuth', 'panel', 'synodic', 'libration', 'psr', 'longestNight', 'blackout', 'eclipse', 'margin', 'hexagon', 'refined', 'utc'];
const term = (k, label) => `<button type="button" class="term" data-term="${k}">${label}</button>`;
function setUi(m) {
  S.ui = m; document.body.classList.toggle('mode-explore', m === 'explore'); document.body.classList.toggle('mode-plan', m === 'plan');
  $('uiExplore').setAttribute('aria-pressed', m === 'explore'); $('uiPlan').setAttribute('aria-pressed', m === 'plan');
  try { localStorage.setItem('selenesight-ui', m); } catch {}
}
let glossFrom = null;
function openGloss(btn) {
  const k = btn.dataset.term, g = $('gloss'); glossFrom = btn;
  $('glossTerm').textContent = t('g_' + k + '_t'); $('glossText').textContent = t('g_' + k);
  g.hidden = false; const r = btn.getBoundingClientRect(), w = g.offsetWidth, hgt = g.offsetHeight;
  g.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left)) + 'px';
  g.style.top = (r.bottom + hgt + 8 < innerHeight ? r.bottom + 6 : Math.max(8, r.top - hgt - 6)) + 'px';
  $('glossClose').focus();
}
function closeGloss() { $('gloss').hidden = true; if (glossFrom) glossFrom.focus(); glossFrom = null; }
function renderGlossList() { $('glossList').innerHTML = GLOSS.map(k => `<dt>${t('g_' + k + '_t')}</dt><dd>${t('g_' + k)}</dd>`).join(''); }

function storyDefs() {
  const best = RF ? [...Array(RF.n).keys()].sort((a, b) => nightH(RF, a) - nightH(RF, b) || vSun(RF, b, -1) - vSun(RF, a, -1))[0] : null;
  const bp = best != null ? P(RF, best) : { lat: -89.6875, lon: -162.5594 };
  const ecl = (META.eclipses || []).find(e => e.peak.startsWith('2029-06-26')) || (META.eclipses || [])[0];
  return [
    { k: 'st1', lat: bp.lat, lon: bp.lon, hour: 6888, mode: 'sun', layer: 'night' },
    { k: 'st2', lat: -85.972, lon: -2.11, hour: ecl ? ecl.h : 21771, exact: true, mode: 'sun', layer: 'month' },
    { k: 'st3', lat: -89.67, lon: 129.78, mode: 'sun', layer: 'long' },
    { k: 'st4', lat: -85.910, lon: 3.466, mode: 'earth', layer: 'long' },
  ];
}
function renderStories() {
  if (!META) return; const list = storyDefs();
  $('stories').innerHTML = list.map((st, n) => `<li><button type="button" class="story" data-n="${n}"><b>${t(st.k + '_t')}</b><span>${t(st.k)}</span></button></li>`).join('');
  $('stories').querySelectorAll('.story').forEach(b => b.onclick = () => runStory(list[+b.dataset.n]));
}
function runStory(st) {
  setMode(st.mode); S.layer = st.layer; $('layer').value = st.layer;
  if (st.hour != null) setHour(st.hour, st.exact);
  goTo(st.lat, st.lon); drawOverlay();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(() => $('sky').closest('.card').scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' }), 300);
  announce(t(st.k + '_t'));
}

const TOUR = [
  { sel: '#mapWrap', k: 'tour1', at: 'inside' }, { sel: '#mapWrap', k: 'tour2', at: 'inside' },
  { sel: '#sky', k: 'tour3', at: 'left' }, { sel: '#timebar', k: 'tour4', at: 'above' },
  { sel: '#modeSun', k: 'tour5', at: 'below' }, { sel: '#storyCard', k: 'tour6', at: 'left' }];
let tourI = -1, tourEl = null;
function tourShow(i) {
  if (tourEl) tourEl.classList.remove('tour-hl');
  if (i < 0 || i >= TOUR.length) return tourEnd();
  tourI = i; const st = TOUR[i], el = document.querySelector(st.sel), box = $('tour');
  if (st.sel === '#storyCard') setUi('explore');
  el.scrollIntoView({ block: 'nearest' }); tourEl = el; el.classList.add('tour-hl');
  $('tourStep').textContent = t('tourStepN', { i: i + 1, n: TOUR.length });
  $('tourTitle').textContent = t(st.k + '_t'); $('tourText').textContent = t(st.k);
  $('tourPrev').disabled = i === 0; $('tourNext').textContent = i === TOUR.length - 1 ? t('tourDone') : t('tourNext');
  box.hidden = false;
  const r = el.getBoundingClientRect(), w = box.offsetWidth, hgt = box.offsetHeight; let x, y;
  if (st.at === 'inside') { x = r.left + 16; y = r.top + 70; }
  else if (st.at === 'left') { x = r.left - w - 16; y = r.top; if (x < 8) { x = r.left; y = r.bottom + 10; } }
  else if (st.at === 'above') { x = r.left + 16; y = r.top - hgt - 12; }
  else { x = r.left; y = r.bottom + 10; }
  box.style.left = Math.max(8, Math.min(innerWidth - w - 8, x)) + 'px'; box.style.top = Math.max(8, Math.min(innerHeight - hgt - 8, y)) + 'px';
  $('tourTitle').focus();
}
function tourEnd() { if (tourEl) tourEl.classList.remove('tour-hl'); tourEl = null; tourI = -1; $('tour').hidden = true; try { localStorage.setItem('selenesight-tour', '1'); } catch {} }
function bindPublic() {
  $('uiExplore').onclick = () => setUi('explore'); $('uiPlan').onclick = () => setUi('plan');
  document.addEventListener('click', (e) => { const b = e.target.closest('.term'); if (b) { e.preventDefault(); openGloss(b); } else if (!e.target.closest('#gloss') && !$('gloss').hidden) closeGloss(); });
  $('glossClose').onclick = closeGloss;
  $('tourTitle').tabIndex = -1;
  $('tourNext').onclick = () => tourShow(tourI + 1); $('tourPrev').onclick = () => tourShow(tourI - 1); $('tourSkip').onclick = tourEnd;
  $('tourAgain').onclick = () => { $('info').close(); tourShow(0); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!$('gloss').hidden) closeGloss(); else if (!$('tour').hidden) tourEnd(); } });
  addEventListener('resize', () => { if (tourI >= 0) tourShow(tourI); });
}
// ---------- UI ----------
function setMode(m) {
  S.mode = m; $('modeSun').setAttribute('aria-pressed', m === 'sun'); $('modeEarth').setAttribute('aria-pressed', m === 'earth');
  drawOverlay(); drawSky();
}
function bindUI() {
  $('modeSun').onclick = () => setMode('sun'); $('modeEarth').onclick = () => setMode('earth');
  $('viewBtn').onclick = () => setView(S.view === '2d' ? '3d' : '2d');
  document.querySelectorAll('input[name=exag]').forEach(r => r.onchange = () => setExagLevel(+r.value));
  $('zIn').onclick = () => zoomBy(1.5); $('zOut').onclick = () => zoomBy(1/1.5); $('zReset').onclick = () => setView(S.view);
  bindToggle($('layerTog'), 'layerBody'); bindToggle($('lgTog'), 'lgMore');
  if (matchMedia('(max-width: 700px), (max-height: 520px)').matches) { $('layerTog').click(); $('lgTog').click(); } // pantallas chicas: paneles plegados
  $('skyZoom').onclick = () => { S.skyWide = !S.skyWide; $('skyZoom').textContent = S.skyWide ? t('sky90') : t('sky360'); drawSky(); };
  $('lang').onchange = (e) => { S.lang = e.target.value; try { localStorage.setItem('selenesight-lang', S.lang); } catch {} applyI18n(); };
  $('infoBtn').onclick = () => $('info').showModal();
  $('time').max = Math.floor((NH - 1)/6);
  $('time').oninput = (e) => setHour(+e.target.value*6);
  $('tInput').onchange = (e) => { const ms = Date.parse(e.target.value + ':00Z'); if (!isNaN(ms)) setHour((ms - Date.parse('2027-01-01T00:00:00Z'))/3600e3); };
  $('play').onclick = () => {
    if (TIMER) { clearInterval(TIMER); TIMER = null; $('play').textContent = '▶'; $('play').setAttribute('aria-label', t('ariaPlay')); }
    else { $('play').textContent = '⏸'; $('play').setAttribute('aria-label', t('ariaPause')); TIMER = setInterval(() => setHour(S.hour + 6 >= NH ? 0 : S.hour + 6), 180); }
  };
  let mt;
  const mg = (id, key) => $(id).oninput = (e) => { S[key] = +e.target.value; $(id + 'V').textContent = S[key] + '%'; clearTimeout(mt); mt = setTimeout(() => { drawOverlay(); if (S.suggList.length) runSuggest(); }, 60); };
  mg('mSun', 'mSun'); mg('mRadio', 'mRadio');
  [['maxSlope', 'slopeV', '°'], ['psrDist', 'psrV', ' km'], ['habSun', 'habSunV', '%']].forEach(([a, b, u]) => $(a).oninput = (e) => { $(b).textContent = e.target.value + u; });
  $('layer').onchange = (e) => { S.layer = e.target.value; drawOverlay(); };
  $('maxRoute').oninput = (e) => { $('maxRouteV').textContent = e.target.value + '°'; };
  $('maxNight').oninput = (e) => { $('maxNightV').textContent = e.target.value + ' ' + t('d'); };
  $('suggestBtn').onclick = () => { $('suggestOut').innerHTML = `<div class="small muted" role="status">${t('computing')}</div>`; setTimeout(runSuggest, 30); }; $('period').onchange = () => S.suggList.length && runSuggest();
  $('goBtn').onclick = () => goTo(+$('inLat').value, +$('inLon').value);
  $('sites').onchange = (e) => { if (!e.target.value) return; const parts = e.target.value.split(','), la = +parts[0], lo = +parts[1], nm = parts.slice(2).join(','); $('inLat').value = la; $('inLon').value = lo; goTo(la, lo, nm && nm !== 'R' ? nm : ''); };
  $('winMin').oninput = (e) => { $('winMinV').textContent = fmtN(+e.target.value, 1) + ' ' + t('d'); refreshSite(false); };
  $('winCrit').onchange = () => refreshSite(false);
  $('showRF').onchange = (e) => { S.showRF = e.target.checked; drawOverlay(); };
  $('showReg').onchange = (e) => { S.showReg = e.target.checked; drawOverlay(); };
  $('showComm').onchange = (e) => { S.showComm = e.target.checked; drawOverlay(); };
  $('commBtn').onclick = () => { $('commOut').innerHTML = `<div class="small muted" role="status">${t('computing')}</div>`; setTimeout(runComm, 30); };
  $('pinBtn').onclick = () => { if (S.sel && S.pins.length < 4 && !S.pins.some(p => p.i === S.sel.i && p.lv === S.sel.lv)) { S.pins.push({ lv: S.sel.lv, i: S.sel.i }); renderCompare(); drawMarks(); } };
  $('cmpClear').onclick = () => { S.pins = []; renderCompare(); drawMarks(); };
  $('offlineBtn').onclick = saveOffline;
}

(async function main() {
  S.lang = 'en';   // inglés por defecto (jurado internacional); se recuerda la elección
  try { S.lang = localStorage.getItem('selenesight-lang') === 'es' ? 'es' : 'en'; } catch {}
  $('lang').value = S.lang; setLoading(t('loading'));
  let ui = 'explore'; try { ui = localStorage.getItem('selenesight-ui') || 'explore'; } catch {}
  const qs = new URLSearchParams(location.search), qm = (qs.get('modo') || qs.get('mode') || '').toLowerCase();
  const forced = ['planificar', 'plan'].includes(qm) ? 'plan' : ['explorar', 'explore'].includes(qm) ? 'explore' : null;
  if (forced) ui = forced;
  setUi(ui);
  await load(); bindUI(); bindPublic(); await initScene();
  // fecha inicial: hoy si está en rango, si no 2027-02-06 (eclipse anular / luna nueva)
  const now = (Date.now() - Date.parse('2027-01-01T00:00:00Z'))/3600e3;
  S.month = -1; setHour(now > 0 && now < NH ? now : 36*24);
  applyI18n(); $('loading').hidden = true;
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  let done = false; try { done = localStorage.getItem('selenesight-tour') === '1'; } catch {}
  const hq = qs.get('historia') || qs.get('story'), hs = hq && storyDefs().find(x => x.k === hq);
  if (hs) { try { localStorage.setItem('selenesight-tour', '1'); } catch {} runStory(hs); return; }   // enlace directo a una historia (desde la landing)
  if (!done && S.ui === 'explore') setTimeout(() => tourShow(0), 600);
})().catch(e => { $('loading').textContent = t('error') + ': ' + e.message; console.error(e); });

// ---------- red de comunicaciones: base → repetidoras → zona sin apagones de Tierra ----------
// Línea de visión sobre la grilla de terreno (~297 m) con la curvatura lunar; mástiles de 10 m en cada nodo.
let MAST = 10; const SAFE = 30;   // margen recomendado sobre el relieve (m), por la resolución de la grilla
function vec3(lat, lon, h) { const a = lat*D2R, b = lon*D2R, r = META.R + h; return [r*Math.cos(a)*Math.cos(b), r*Math.cos(a)*Math.sin(b), r*Math.sin(a)]; }
function losMargin(pa, pb, n) {   // margen mínimo (m) del rayo sobre el terreno; < 0 = bloqueado
  const A = vec3(pa.lat, pa.lon, pa.h + MAST), B = vec3(pb.lat, pb.lon, pb.h + MAST); let m = 1e9;
  n = n || Math.max(60, Math.min(500, Math.round(Math.hypot(pa.x - pb.x, pa.y - pb.y)/300)));
  const L = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]), e = Math.min(0.25, 600/L);   // se ignoran 600 m junto a cada antena: ahí manda el mástil, no la grilla de ~300 m
  for (let k = 1; k < n; k++) {
    const t = k/n; if (t < e || t > 1 - e) continue;
    const x = A[0] + (B[0] - A[0])*t, y = A[1] + (B[1] - A[1])*t, z = A[2] + (B[2] - A[2])*t, r = Math.hypot(x, y, z);
    const k2 = 2*META.R/(1 - z/r), mx = k2*y/r, my = k2*x/r;
    if (Math.hypot(mx, my) > META.extent) continue;
    const d = r - (META.R + hGrid(mx, my)); if (d < m) m = d;
  }
  return m;
}
function noBlackout() {   // puntos que no pierden la Tierra en 18,6 años
  const out = []; for (const lv of [FINE, RF].filter(Boolean)) for (let i = 0; i < lv.n; i++) if (blackH(lv, i) === 0) out.push({ lv, i, ...P(lv, i) });
  return out;
}
function runComm() {
  MAST = 10; let res = commSearch();
  if (res && res.type !== 'none' && !res.paths.some(p => p.m >= SAFE)) { MAST = 30; const r2 = commSearch(); if (r2 && r2.type !== 'none' && r2.paths.some(p => p.m >= SAFE)) res = r2; else MAST = 10; }
  if (res === null) return;
  commShow(res);
}
function commSearch() {
  const o = $('commOut');
  if (!S.sel) { o.innerHTML = `<p class="small warn">${t('commNoSel')}</p>`; return null; }
  if (S.sel.lv.virt) { o.innerHTML = `<p class="small warn">${t('commVirt')}</p>`; return null; }
  if (!T1K) return null;
  const base = { lv: S.sel.lv, i: S.sel.i, ...P(S.sel.lv, S.sel.i) };
  S.showComm = true; $('showComm').checked = true;
  const Z = noBlackout();
  if (blackH(base.lv, base.i) === 0) { S.comm = { base, paths: [] }; o.innerHTML = `<p class="small">${t('commHasEarth')}</p>`; drawOverlay(); return null; }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // destinos: los más cercanos de la zona sin apagones, separados entre sí al menos 2 km
  const targets = []; for (const z of Z.slice().sort((a, b) => dist(a, base) - dist(b, base))) { if (targets.every(q => dist(q, z) > 1500)) targets.push(z); if (targets.length >= 16) break; }
  const direct = targets.map(z => ({ z, m: losMargin(base, z) })).filter(q => q.m > 0).sort((a, b) => (b.m >= SAFE) - (a.m >= SAFE) || dist(a.z, base) - dist(b.z, base));
  let res;
  if (direct.length && direct[0].m >= SAFE) res = { type: 'direct', paths: direct.filter(q => q.m >= SAFE).slice(0, 2).map(q => ({ rep: null, tgt: q.z, m: q.m })) };
  else {
    // repetidoras: puntos del corredor que ven a la base y a algún destino
    const T0 = targets[0], vx = T0.x - base.x, vy = T0.y - base.y, Lg = Math.hypot(vx, vy), cand = [];
    for (let i = 0; i < FINE.n; i++) {
      const q = P(FINE, i), along = ((q.x - base.x)*vx + (q.y - base.y)*vy)/Lg, off = Math.abs(((q.x - base.x)*vy - (q.y - base.y)*vx)/Lg);
      if (along > 3000 && along < Lg - 3000 && off < 30000 && q.slope <= 20) cand.push({ lv: FINE, i, ...q });
    }
    cand.sort((a, b) => (b.h - a.h));   // las más altas primero
    const found = [];
    for (const c of cand.slice(0, 1500)) {
      const m1 = losMargin(base, c, 160); if (m1 <= 0) continue;
      let best = null; for (const z of targets) { const m2 = losMargin(c, z, 220); if (m2 > 0 && (!best || (Math.min(m1, m2) >= SAFE) > (best.mm >= SAFE) || ((Math.min(m1, m2) >= SAFE) === (best.mm >= SAFE) && dist(c, z) < dist(c, best.z)))) best = { z, m: m2, mm: Math.min(m1, m2) }; }
      if (best) found.push({ rep: c, tgt: best.z, m: Math.min(m1, best.m), len: dist(base, c) + dist(c, best.z) });
    }
    found.sort((a, b) => (b.m >= SAFE) - (a.m >= SAFE) || a.len - b.len);   // primero los de margen seguro; luego el camino más corto
    const pick = []; for (const f of found) { if (pick.every(p => dist(p.rep, f.rep) > 3000)) pick.push(f); if (pick.length >= 2) break; }
    res = pick.length ? { type: 'relay', paths: pick } : direct.length ? { type: 'direct', paths: direct.slice(0, 2).map(q => ({ rep: null, tgt: q.z, m: q.m })) } : { type: 'none', paths: [] };
  }
  return { base, ...res };
}
function commShow(res) {
  const base = res.base, dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), o = $('commOut');
  S.comm = res;
  const km = (a, b) => (dist(a, b)/1000).toFixed(1).replace('.', S.lang === 'es' ? ',' : '.'), ll = q => `${q.lat.toFixed(3)}°, ${q.lon.toFixed(2)}°`;
  let html = '';
  if (res.type === 'none') html = `<p class="small warn">${t('commNone')}</p>`;
  else {
    html = `<p class="small">${t(res.type === 'direct' ? 'commDirect' : 'commRelay')}</p><ol class="comm-list">` + res.paths.map((p, k) => `<li><b>${t('commPath', { n: k + 1 })}</b><br>` +
      (p.rep ? `📡 ${t('commRep')}: ${ll(p.rep)} · ${Math.round(p.rep.h)} m · ${t('slope')} ${p.rep.slope.toFixed(1)}° · ${km(base, p.rep)} km<br>` : '') +
      `🜨 ${t('commTgt')}: ${ll(p.tgt)} · ${km(p.rep || base, p.tgt)} km · ${t('commMargin')} ${Math.round(p.m)} m${p.m < SAFE ? ' ⚠ ' + t('commTight') : ''}</li>`).join('') + '</ol>';
  }
  if (MAST > 10 && res.type !== 'none') html += `<p class="small">${t('commMast', { m: MAST })}</p>`;
  html += `<p class="small muted">${t('commNote')}</p>`;
  o.innerHTML = html; drawOverlay();
  announce(res.type === 'none' ? t('commNone') : t(res.type === 'direct' ? 'commDirect' : 'commRelay'));
}
function drawComm(ctx, s) {
  if (!S.showComm) return;
  const Z = noBlackout(), r = s/600;
  ctx.save(); ctx.strokeStyle = '#7FB2FF'; ctx.lineWidth = s/1300;
  for (const z of Z) { const [cx, cy] = cxy(z.x, z.y); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2*Math.PI); ctx.stroke(); }
  const c = S.comm; if (c && c.paths) {
    ctx.lineWidth = s/650; ctx.strokeStyle = '#7FB2FF'; ctx.fillStyle = '#7FB2FF';
    for (const p of c.paths) { const pts = [c.base, p.rep, p.tgt].filter(Boolean).map(q => cxy(q.x, q.y));
      ctx.beginPath(); pts.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
      pts.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, r*1.6, 0, 2*Math.PI); ctx.fill(); }); }
  }
  ctx.restore();
}
