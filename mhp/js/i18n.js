import { STRINGS } from './strings.js';

export const LANGS = [
  { code: 'es', tag: 'es-UY', label: 'Español',      flag: 'uy' },
  { code: 'en', tag: 'en-US', label: 'English (US)', flag: 'us' },
  { code: 'fr', tag: 'fr-FR', label: 'Français',     flag: 'fr' },
  { code: 'it', tag: 'it-IT', label: 'Italiano',     flag: 'it' },
  { code: 'pt', tag: 'pt-BR', label: 'Português',    flag: 'br' },
  { code: 'de', tag: 'de-DE', label: 'Deutsch',      flag: 'de' }
];

const LS_KEY = 'helios.lang';
const listeners = new Set();
let current = 'es';

const byCode = code => LANGS.find(l => l.code === code);

export function detectLang() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved && byCode(saved)) return saved;
  } catch (e) { /* almacenamiento no disponible */ }
  for (const tag of navigator.languages || [navigator.language || 'es']) {
    const base = String(tag).toLowerCase().split('-')[0];
    if (byCode(base)) return base;
  }
  return 'es';
}

export const getLang = () => current;
export const getLangInfo = () => byCode(current);
export const onLangChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };

export function t(key, params) {
  let s = (STRINGS[current] && STRINGS[current][key]) ?? STRINGS.es[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(v);
  return s;
}

/** Plural: busca key_one / key_other según el idioma actual. */
export function tn(key, n, params = {}) {
  let cat = new Intl.PluralRules(getLangInfo().tag).select(n);
  if (cat !== 'one') cat = 'other';
  return t(`${key}_${cat}`, { n: fmtNum(n), ...params });
}

export const fmtNum = (n, opts) => new Intl.NumberFormat(getLangInfo().tag, opts).format(n);
export const fmtK = k => fmtNum(k, { minimumFractionDigits: 2, maximumFractionDigits: 3 });
export function fmtDate(iso, style = 'medium') {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Intl.DateTimeFormat(getLangInfo().tag, { dateStyle: style, timeZone: 'UTC' }).format(Date.UTC(y, m - 1, d));
}

export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  root.querySelectorAll('[data-i18n-attr]').forEach(el => {
    el.dataset.i18nAttr.split(';').forEach(pair => {
      const [attr, key] = pair.split(':').map(x => x.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    });
  });
}

export function setLang(code, { persist = true } = {}) {
  if (!byCode(code)) code = 'es';
  current = code;
  if (persist) { try { localStorage.setItem(LS_KEY, code); } catch (e) { /* ok */ } }
  const info = byCode(code);
  document.documentElement.lang = info.tag;
  document.title = t('doc_title');
  applyI18n();
  listeners.forEach(fn => fn(code));
}
