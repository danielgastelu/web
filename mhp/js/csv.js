// CSV mínimo: exporta y lee archivos de observaciones. Sin librerías externas.

const HEADERS = ['date', 'groups', 'spots', 'k', 'wolf', 'school', 'name'];

/** Español, francés, italiano, portugués y alemán usan coma decimal: en esos idiomas
 *  el CSV va con «;» y coma decimal para que Excel lo abra en columnas. En inglés, coma y punto. */
export function toCSV(rows, lang) {
  const semi = lang !== 'en';
  const d = semi ? ';' : ',';
  const num = x => semi ? String(x).replace('.', ',') : String(x);
  const esc = v => {
    const s = String(v ?? '');
    return /[";,\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [HEADERS.join(d)];
  for (const r of rows) lines.push([r.date, r.g, r.s, num(r.k), r.wolf, esc(r.school), esc(r.name)].join(d));
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}

export function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '');
  const firstLine = text.split(/\r?\n/).find(l => l.trim() && !/^sep=/i.test(l)) || '';
  const counts = { ';': 0, ',': 0, '\t': 0 };
  let inQ = false;
  for (const ch of firstLine) { if (ch === '"') inQ = !inQ; else if (!inQ && ch in counts) counts[ch]++; }
  const delim = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

  const rows = [];
  let row = [], cell = '', q = false;
  const pushCell = () => { row.push(cell); cell = ''; };
  const pushRow = () => { pushCell(); if (row.some(c => c.trim() !== '')) rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) pushCell();
    else if (ch === '\n') pushRow();
    else if (ch !== '\r') cell += ch;
  }
  if (cell !== '' || row.length) pushRow();
  return rows.filter(r => !(r.length === 1 && /^sep=/i.test(r[0])));
}

export function toNumber(v) {
  if (v == null) return NaN;
  const s = String(v).trim().replace(/\s/g, '');
  if (!s) return NaN;
  // «1.234,5» → 1234.5 ; «1,25» → 1.25 ; «1.25» → 1.25
  const n = /,/.test(s) ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function toISODate(v) {
  const s = String(v ?? '').trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  let y, mo, d;
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/))) { d = +m[1]; mo = +m[2]; y = +m[3]; }
  else return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

const ALIASES = {
  date: /^(fecha|date|data|datum|jour)$/i,
  g: /^(g|grupos?|groups?|groupes?|gruppi|gruppen|grupo)$/i,
  s: /^(s|manchas?|spots?|taches?|macchie|flecken|sunspots?)$/i,
  k: /^(k|factor|coef\w*|koeffizient|coefficient)$/i,
  wolf: /^(r|wolf|wolf\s*\(r\)|n[uú]mero de wolf|wolf number|nombre de wolf|numero di wolf|wolf-zahl|wolfzahl)$/i
};

/** Lee filas de observaciones de un CSV exportado por esta app (o por el laboratorio anterior). */
export function readObservations(text) {
  const table = parseCSV(text);
  if (!table.length) return [];
  const head = table[0].map(h => h.trim());
  const idx = {};
  let hasHeader = false;
  head.forEach((h, i) => {
    for (const key of Object.keys(ALIASES)) if (!(key in idx) && ALIASES[key].test(h)) { idx[key] = i; hasHeader = true; }
  });
  let body = table;
  if (hasHeader) body = table.slice(1);
  else Object.assign(idx, { date: 0, g: 1, s: 2, k: 3, wolf: 4 });
  if (!('date' in idx) || !('g' in idx) || !('s' in idx)) return [];

  const out = [];
  for (const r of body) {
    const date = toISODate(r[idx.date]);
    const g = toNumber(r[idx.g]), s = toNumber(r[idx.s]);
    if (!date || !(g >= 0) || !(s >= 0)) continue;
    const k = 'k' in idx ? toNumber(r[idx.k]) : NaN;
    let R = 'wolf' in idx ? toNumber(r[idx.wolf]) : NaN;
    if (!Number.isFinite(R)) R = Math.round((Number.isFinite(k) ? k : 1) * (10 * g + s));
    out.push({ date, g: Math.round(g), s: Math.round(s), r: Math.round(R) });
  }
  return out;
}
