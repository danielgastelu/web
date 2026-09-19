// Gráfica de dispersión en SVG propio: fecha en X, una variable en Y, línea de referencia opcional.
// Los puntos se pueden tocar, señalar con el ratón o recorrer con las flechas del teclado.
import { SILSO_POINTS } from './silso.js';
import { getLangInfo, fmtNum } from './i18n.js';

const NS = 'http://www.w3.org/2000/svg';
const M = { top: 26, right: 14, bottom: 30, left: 42 };
export const DOMAIN_ALL = [Date.UTC(2008, 0, 1), Date.UTC(2026, 2, 1)];

const el = (name, attrs = {}, parent) => {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
};

function niceCeil(v) {
  if (v <= 0) return 10;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

function xTicks(d0, d1, maxTicks) {
  const y0 = new Date(d0).getUTCFullYear() - 1, y1 = new Date(d1).getUTCFullYear() + 1;
  for (const step of [1, 3, 6, 12, 24, 36, 60, 120]) {
    const ticks = [];
    for (let y = y0; y <= y1; y++) {
      for (let m = 0; m < 12; m++) {
        if (step < 12 ? m % step !== 0 : (m !== 0 || y % (step / 12) !== 0)) continue;
        const t = Date.UTC(y, m, 1);
        if (t >= d0 && t <= d1) ticks.push({ t, yearOnly: step >= 12 });
      }
    }
    if (ticks.length <= maxTicks) return ticks;
  }
  return [];
}

export function createChart(host, { renderTip, ariaLabel }) {
  host.classList.add('chart');
  const svg = el('svg', { class: 'chart-svg', role: 'application', tabindex: '0', focusable: 'true' });
  const tip = document.createElement('div');
  tip.className = 'chart-tip';
  tip.hidden = true;
  tip.setAttribute('role', 'status');
  host.append(svg, tip);

  let params = null, geom = null, hits = [], activeIdx = -1, kbdOrder = [];

  const fmtDateAxis = (t, yearOnly) => {
    const tag = getLangInfo().tag;
    return yearOnly ? String(new Date(t).getUTCFullYear())
      : new Intl.DateTimeFormat(tag, { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(t);
  };

  function draw() {
    if (!params) return;
    const { points, reference, varKey, domain, yTitle } = params;
    const W = Math.max(280, Math.floor(host.clientWidth || 320));
    const H = Math.round(Math.min(380, Math.max(240, W * 0.62)));
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.setAttribute('aria-label', ariaLabel());
    svg.replaceChildren();

    let [d0, d1] = domain === 'mine' && points.length ? (() => {
      const ts = points.map(p => p.ms), a = Math.min(...ts), b = Math.max(...ts);
      const pad = Math.max((b - a) * 0.08, 45 * 864e5);
      return [a - pad, b + pad];
    })() : DOMAIN_ALL;

    const showRef = reference && varKey === 'r';
    let yMax = 0;
    for (const p of points) if (p.ms >= d0 && p.ms <= d1) yMax = Math.max(yMax, p[varKey]);
    if (showRef) for (const q of SILSO_POINTS) if (q.t >= d0 && q.t <= d1) yMax = Math.max(yMax, q.v);
    yMax = niceCeil(Math.max(yMax * 1.06, varKey === 'r' ? 20 : 5));

    const iw = W - M.left - M.right, ih = H - M.top - M.bottom;
    const X = t => M.left + ((t - d0) / (d1 - d0)) * iw;
    const Y = v => M.top + ih - (v / yMax) * ih;
    geom = { X, Y, W, H };

    const defs = el('defs', {}, svg);
    const clip = el('clipPath', { id: 'plot-clip' }, defs);
    el('rect', { x: M.left, y: M.top - 4, width: iw, height: ih + 8 }, clip);

    // cuadrícula y ejes
    const gy = el('g', { class: 'grid' }, svg);
    const yStep = yMax / 5;
    for (let i = 0; i <= 5; i++) {
      const v = yStep * i, y = Y(v);
      el('line', { x1: M.left, x2: W - M.right, y1: y, y2: y }, gy);
      const tx = el('text', { x: M.left - 7, y: y + 4, 'text-anchor': 'end' }, gy);
      tx.textContent = fmtNum(Math.round(v * 10) / 10);
    }
    const gx = el('g', { class: 'grid' }, svg);
    const maxTicks = Math.max(3, Math.floor(iw / 62));
    for (const tk of xTicks(d0, d1, maxTicks)) {
      const x = X(tk.t);
      el('line', { class: 'tick', x1: x, x2: x, y1: M.top + ih, y2: M.top + ih + 5 }, gx);
      const tx = el('text', { x, y: H - 8, 'text-anchor': 'middle' }, gx);
      tx.textContent = fmtDateAxis(tk.t, tk.yearOnly);
    }
    el('line', { class: 'axis-line', x1: M.left, x2: W - M.right, y1: M.top + ih, y2: M.top + ih }, svg);
    const yt = el('text', { class: 'axis-title', x: 4, y: 13 }, svg);
    yt.textContent = yTitle;

    // referencia histórica
    if (showRef) {
      const seg = SILSO_POINTS.filter(q => q.t >= d0 - 40 * 864e5 && q.t <= d1 + 40 * 864e5);
      if (seg.length > 1) {
        const dPath = seg.map((q, i) => `${i ? 'L' : 'M'}${X(q.t).toFixed(1)} ${Y(q.v).toFixed(1)}`).join('');
        el('path', { class: 'ref-line', d: dPath, 'clip-path': 'url(#plot-clip)' }, svg);
      }
    }

    // puntos: primero las series sumadas, arriba los propios
    hits = [];
    const layer = el('g', { class: 'points', 'clip-path': 'url(#plot-clip)' }, svg);
    const ordered = [...points].sort((a, b) => (a.mine === b.mine ? 0 : a.mine ? 1 : -1));
    for (const p of ordered) {
      if (p.ms < d0 || p.ms > d1) continue;
      const cx = X(p.ms), cy = Y(p[varKey]);
      const c = el('circle', { class: p.mine ? 'pt pt-mine' : 'pt pt-other', cx, cy, r: p.mine ? 5.5 : 4 }, layer);
      if (!p.mine) c.style.fill = `var(--series-${p.colorIdx % 5})`;
      hits.push({ p, cx, cy, node: c });
    }
    const ring = el('circle', { class: 'pt-ring', r: 10, cx: -50, cy: -50 }, svg);
    geom.ring = ring;

    kbdOrder = hits.filter(h => h.p.mine).sort((a, b) => a.p.ms - b.p.ms);
    if (activeIdx >= 0 && hits[activeIdx]) show(activeIdx, false); else hideTip();
  }

  function show(i, focus = true) {
    const h = hits[i];
    if (!h) return hideTip();
    activeIdx = i;
    geom.ring.setAttribute('cx', h.cx); geom.ring.setAttribute('cy', h.cy);
    geom.ring.style.display = '';
    tip.innerHTML = renderTip(h.p);
    tip.hidden = false;
    const w = tip.offsetWidth, th = tip.offsetHeight;
    const hostW = host.clientWidth;
    let left = Math.min(Math.max(h.cx - w / 2, 4), hostW - w - 4);
    let top = h.cy - th - 14;
    if (top < 2) top = h.cy + 16;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }

  function hideTip() {
    activeIdx = -1;
    tip.hidden = true;
    if (geom && geom.ring) geom.ring.style.display = 'none';
  }

  function nearest(evt, radius) {
    const r = svg.getBoundingClientRect();
    const x = (evt.clientX - r.left) * (geom.W / r.width), y = (evt.clientY - r.top) * (geom.H / r.height);
    let best = -1, bd = radius * radius;
    hits.forEach((h, i) => {
      const d = (h.cx - x) ** 2 + (h.cy - y) ** 2;
      const bias = h.p.mine ? 0.8 : 1;                    // ante un empate gana el punto propio
      if (d * bias <= bd) { bd = d * bias; best = i; }
    });
    return best;
  }

  svg.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' || !hits.length) return;
    const i = nearest(e, 16);
    if (i >= 0) show(i); else hideTip();
  });
  svg.addEventListener('pointerdown', e => {
    if (!hits.length) return;
    const i = nearest(e, e.pointerType === 'touch' ? 28 : 16);
    if (i >= 0) show(i); else hideTip();
  });
  svg.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') hideTip(); });
  svg.addEventListener('blur', () => { if (!svg.matches(':hover')) hideTip(); });
  svg.addEventListener('keydown', e => {
    if (!kbdOrder.length) return;
    const cur = kbdOrder.findIndex(h => hits.indexOf(h) === activeIdx);
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = cur < 0 ? 0 : Math.min(kbdOrder.length - 1, cur + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = cur < 0 ? kbdOrder.length - 1 : Math.max(0, cur - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = kbdOrder.length - 1;
    else if (e.key === 'Escape') { hideTip(); return; }
    else return;
    e.preventDefault();
    show(hits.indexOf(kbdOrder[next]));
  });
  document.addEventListener('pointerdown', e => { if (!host.contains(e.target)) hideTip(); });

  new ResizeObserver(() => draw()).observe(host);

  return {
    update(p) { params = p; activeIdx = -1; draw(); },
    redraw: draw
  };
}
