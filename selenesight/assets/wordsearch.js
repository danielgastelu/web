// Sopa de letras bilingüe: palabras del glosario, distinta en cada carga.
// Solo direcciones horizontal (→), vertical (↓) y diagonal descendente (↘).
(function () {
  const POOL = {
    es: ['HORIZONTE', 'ELEVACION', 'AZIMUT', 'PANEL', 'SINODICO', 'LIBRACION', 'SOMBRA', 'ECLIPSE', 'CRATER', 'POLO', 'HIELO', 'ANTENA', 'ORBITA', 'SELENE', 'NOCHE', 'TIERRA', 'ESTACION', 'VISION'],
    en: ['HORIZON', 'ELEVATION', 'AZIMUTH', 'PANEL', 'SYNODIC', 'LIBRATION', 'SHADOW', 'ECLIPSE', 'CRATER', 'POLE', 'ICE', 'ANTENNA', 'ORBIT', 'SELENE', 'NIGHT', 'EARTH', 'SEASON', 'SIGHT']
  };
  const TXT = {
    es: { words: 'Palabras para encontrar', found: 'Encontraste {w}. Te faltan {n}.', done: '¡Encontraste las {n} palabras!', miss: 'No hay una palabra ahí. Prueba de nuevo.', start: 'Primera letra marcada: {l}. Ahora marca la última.', cell: 'Fila {r}, columna {c}, letra {l}' },
    en: { words: 'Words to find', found: 'You found {w}. {n} to go.', done: 'You found all {n} words!', miss: 'There is no word there. Try again.', start: 'First letter marked: {l}. Now mark the last one.', cell: 'Row {r}, column {c}, letter {l}' }
  };
  const N = 12, COUNT = 8, DIRS = [[0, 1], [1, 0], [1, 1]];
  const ABC = { es: 'AAABCDEEEFGHIIJLMNNÑOOOPQRSSTUUVXYZ', en: 'AAABCDEEEFGHIIJKLMNNOOOPQRSSTTUUVWXYZ' };
  const grid = document.getElementById('wsGrid'); if (!grid) return;
  const list = document.getElementById('wsWords'), status = document.getElementById('wsStatus');
  let lang = 'en', cells = [], words = [], found = new Set(), first = null, cur = 0;
  const fmt = (s, v) => s.replace(/\{(\w)\}/g, (_, k) => v[k]);
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function build() {
    for (let attempt = 0; attempt < 50; attempt++) {
      const pick = shuffle(POOL[lang].slice()).slice(0, COUNT).sort((a, b) => b.length - a.length);
      const g = Array.from({ length: N }, () => Array(N).fill('')), placed = [];
      let ok = true;
      for (const w of pick) {
        let done = false;
        for (let t = 0; t < 300 && !done; t++) {
          const [dr, dc] = DIRS[Math.floor(Math.random() * DIRS.length)];
          const r0 = Math.floor(Math.random() * (N - dr * (w.length - 1))), c0 = Math.floor(Math.random() * (N - dc * (w.length - 1)));
          let fits = true;
          for (let k = 0; k < w.length; k++) { const ch = g[r0 + dr * k][c0 + dc * k]; if (ch && ch !== w[k]) { fits = false; break; } }
          if (!fits) continue;
          for (let k = 0; k < w.length; k++) g[r0 + dr * k][c0 + dc * k] = w[k];
          placed.push({ w, r0, c0, dr, dc }); done = true;
        }
        if (!done) { ok = false; break; }
      }
      if (!ok) continue;
      const abc = ABC[lang];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!g[r][c]) g[r][c] = abc[Math.floor(Math.random() * abc.length)];
      return { g, placed };
    }
  }
  function render() {
    const T = TXT[lang], { g, placed } = build();
    words = placed; found = new Set(); first = null; cur = 0; cells = [];
    grid.innerHTML = '';
    for (let r = 0; r < N; r++) {
      const row = document.createElement('div'); row.setAttribute('role', 'row'); row.className = 'ws-row';
      for (let c = 0; c < N; c++) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'ws-cell'; b.textContent = g[r][c];
        b.setAttribute('role', 'gridcell'); b.setAttribute('aria-label', fmt(T.cell, { r: r + 1, c: c + 1, l: g[r][c] }));
        b.tabIndex = r === 0 && c === 0 ? 0 : -1; b.dataset.r = r; b.dataset.c = c;
        b.addEventListener('click', () => choose(r, c)); b.addEventListener('keydown', key);
        row.append(b); cells.push(b);
      }
      grid.append(row);
    }
    list.setAttribute('aria-label', T.words);
    list.innerHTML = placed.slice().sort((a, b) => a.w.localeCompare(b.w)).map(p => `<li data-w="${p.w}">${p.w}</li>`).join('');
    status.textContent = '';
  }
  const at = (r, c) => cells[r * N + c];
  function key(e) {
    const r = +e.target.dataset.r, c = +e.target.dataset.c, mv = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] }[e.key];
    if (mv) { e.preventDefault(); const nr = Math.min(N - 1, Math.max(0, r + mv[0])), nc = Math.min(N - 1, Math.max(0, c + mv[1])); focus(nr, nc); }
    else if (e.key === 'Home') { e.preventDefault(); focus(r, 0); } else if (e.key === 'End') { e.preventDefault(); focus(r, N - 1); }
  }
  function focus(r, c) { cells[cur].tabIndex = -1; cur = r * N + c; const b = cells[cur]; b.tabIndex = 0; b.focus(); }
  function choose(r, c) {
    const T = TXT[lang]; cells[cur].tabIndex = -1; cur = r * N + c; cells[cur].tabIndex = 0;
    if (!first) { first = [r, c]; at(r, c).classList.add('sel'); at(r, c).setAttribute('aria-pressed', 'true'); status.textContent = fmt(T.start, { l: at(r, c).textContent }); return; }
    const [r0, c0] = first; at(r0, c0).classList.remove('sel'); at(r0, c0).removeAttribute('aria-pressed'); first = null;
    const hit = words.find(p => !found.has(p.w) && ((p.r0 === r0 && p.c0 === c0 && p.r0 + p.dr * (p.w.length - 1) === r && p.c0 + p.dc * (p.w.length - 1) === c) ||
      (p.r0 === r && p.c0 === c && p.r0 + p.dr * (p.w.length - 1) === r0 && p.c0 + p.dc * (p.w.length - 1) === c0)));
    if (!hit) { status.textContent = T.miss; return; }
    found.add(hit.w);
    for (let k = 0; k < hit.w.length; k++) at(hit.r0 + hit.dr * k, hit.c0 + hit.dc * k).classList.add('hit');
    list.querySelector(`[data-w="${hit.w}"]`).classList.add('done');
    status.textContent = found.size === words.length ? fmt(T.done, { n: words.length }) : fmt(T.found, { w: hit.w, n: words.length - found.size });
  }
  function sync() { const l = document.documentElement.lang === 'es' ? 'es' : 'en'; if (l !== lang || !cells.length) { lang = l; render(); } }
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  document.getElementById('wsNew').addEventListener('click', () => { render(); cells[0].focus(); });
  sync();
})();
