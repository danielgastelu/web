// Ilustración de portada: el Sol con su retícula (como en las hojas de observación clásicas)
// y grupos de manchas que se desplazan de este a oeste por la rotación solar.
// Se anima unos segundos y se detiene; un toque sobre el Sol lo vuelve a mover.
import { t, onLangChange } from './i18n.js';
import { prefersReducedMotion } from './dom.js';

const NS = 'http://www.w3.org/2000/svg';
const C = 200, R = 172;
const B0 = 6 * Math.PI / 180;           // inclinación del eje solar respecto de la visual
const SWEEP = 96;                        // grados que avanza cada vez
const DURATION = 26000;                  // ms

// [latitud, longitud inicial, manchas: [dLat, dLon, radio en px]]
const GROUPS = [
  { lat: 15,  lon: -52, spots: [[0, 0, 9], [-2.5, 5.5, 4.6], [3.2, -4.6, 4], [0.8, 9.5, 3]] },
  { lat: -10, lon: 6,   spots: [[0, 0, 7], [2.2, -6, 3.6], [-3, 6, 4.2]] },
  { lat: 22,  lon: 63,  spots: [[0, 0, 5.5], [-2, 4.5, 3]] },
  { lat: -18, lon: -148, spots: [[0, 0, 8.5], [2.6, 6, 4], [-3, -5, 3.4]] },
  { lat: 9,   lon: -106, spots: [[0, 0, 6], [-2.4, 4.6, 3.4]] }
];

const rad = d => d * Math.PI / 180;
const el = (name, attrs = {}, parent) => {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
};

function project(latDeg, lonDeg) {
  const p = rad(latDeg), l = rad(lonDeg);
  const x = R * Math.cos(p) * Math.sin(l);
  const y = R * (Math.sin(p) * Math.cos(B0) - Math.cos(p) * Math.cos(l) * Math.sin(B0));
  const z = Math.sin(p) * Math.sin(B0) + Math.cos(p) * Math.cos(l) * Math.cos(B0);
  return { x: C + x, y: C - y, z };
}

const wrap180 = d => ((d + 540) % 360) - 180;
const easeInOut = x => 0.5 - 0.5 * Math.cos(Math.PI * x);

export function initSun(host) {
  const svg = el('svg', { viewBox: '0 0 400 400', role: 'img' });
  const defs = el('defs', {}, svg);
  const disc = el('radialGradient', { id: 'sun-disc', cx: '0.5', cy: '0.5', r: '0.5' }, defs);
  [['0', '#fff3c9'], ['0.55', '#ffd56e'], ['0.86', '#f6a63b'], ['1', '#d9701a']].forEach(([o, c]) => el('stop', { offset: o, 'stop-color': c }, disc));
  const halo = el('radialGradient', { id: 'sun-halo', cx: '0.5', cy: '0.5', r: '0.5' }, defs);
  [['0.8', '#ffb627', '0.35'], ['1', '#ffb627', '0']].forEach(([o, c, a]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, halo));
  const umbraG = el('radialGradient', { id: 'sun-umbra' }, defs);
  [['0', '#120803'], ['1', '#2a1408']].forEach(([o, c]) => el('stop', { offset: o, 'stop-color': c }, umbraG));
  const clip = el('clipPath', { id: 'sun-clip' }, defs);
  el('circle', { cx: C, cy: C, r: R }, clip);

  el('circle', { cx: C, cy: C, r: R + 26, fill: 'url(#sun-halo)' }, svg);
  el('circle', { cx: C, cy: C, r: R, fill: 'url(#sun-disc)' }, svg);

  // retícula tipo Stonyhurst: paralelos y meridianos cada 30°
  const grid = el('g', { fill: 'none', stroke: '#14264b', 'stroke-opacity': '0.3', 'stroke-width': '1', 'clip-path': 'url(#sun-clip)' }, svg);
  const line = (pts) => {
    let d = '', pen = false;
    for (const q of pts) {
      if (q.z > 0) { d += `${pen ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`; pen = true; } else pen = false;
    }
    if (d) el('path', { d }, grid);
  };
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts = []; for (let lon = -90; lon <= 90; lon += 3) pts.push(project(lat, lon)); line(pts);
  }
  for (let lon = -90; lon <= 90; lon += 30) {
    const pts = []; for (let lat = -90; lat <= 90; lat += 3) pts.push(project(lat, lon)); line(pts);
  }
  el('circle', { cx: C, cy: C, r: R, fill: 'none', stroke: '#14264b', 'stroke-opacity': '0.45', 'stroke-width': '1.2' }, svg);

  // manchas
  const layer = el('g', { 'clip-path': 'url(#sun-clip)' }, svg);
  const items = [];
  for (const g of GROUPS) for (const [dLat, dLon, r] of g.spots) {
    const pen = el('ellipse', { fill: '#7a3f14', 'fill-opacity': '0.92' }, layer);
    const umb = el('ellipse', { fill: 'url(#sun-umbra)' }, layer);
    items.push({ g, dLat, dLon, r, pen, umb });
  }

  function draw(offset) {
    for (const it of items) {
      const p = project(it.g.lat + it.dLat, wrap180(it.g.lon + it.dLon + offset));
      if (p.z < 0.06) { it.pen.setAttribute('display', 'none'); it.umb.setAttribute('display', 'none'); continue; }
      const mu = p.z, ang = Math.atan2(p.y - C, p.x - C) * 180 / Math.PI;
      const op = Math.min(1, (mu - 0.06) * 5);
      const tr = `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${ang.toFixed(1)})`;
      it.pen.setAttribute('display', ''); it.umb.setAttribute('display', '');
      it.pen.setAttribute('transform', tr); it.umb.setAttribute('transform', tr);
      it.pen.setAttribute('rx', (it.r * 2.05 * mu).toFixed(2)); it.pen.setAttribute('ry', (it.r * 2.05).toFixed(2));
      it.umb.setAttribute('rx', (it.r * 0.9 * mu).toFixed(2)); it.umb.setAttribute('ry', (it.r * 0.9).toFixed(2));
      it.pen.setAttribute('opacity', op.toFixed(2)); it.umb.setAttribute('opacity', op.toFixed(2));
    }
  }

  host.replaceChildren(svg);
  const label = () => svg.setAttribute('aria-label', t('hero_art'));
  label();
  onLangChange(label);

  let base = 0, raf = 0, start = 0;
  draw(0);

  function step(now) {
    if (!start) start = now;
    const k = Math.min(1, (now - start) / DURATION);
    draw(base + SWEEP * easeInOut(k));
    if (k < 1 && !document.hidden) raf = requestAnimationFrame(step);
    else { base += SWEEP * easeInOut(k); raf = 0; }
  }
  function play() {
    if (prefersReducedMotion()) { base += SWEEP; draw(base); return; }   // sin animación: salta al siguiente cuadro
    if (raf) return;
    start = 0; raf = requestAnimationFrame(step);
  }

  host.addEventListener('click', play);
  host.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); } });
  if (!prefersReducedMotion()) setTimeout(play, 500);
}
