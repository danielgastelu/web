// Estado de la sesión: observaciones, k, series importadas. Todo queda en el dispositivo (localStorage).
import { LAB } from './config.js';
import { referenceAt } from './silso.js';

const KEY = 'helios.data.v1';
const PREF_KEY = 'helios.prefs.v1';

const fresh = () => ({
  k: 1,
  obs: [],                       // { id, date:'AAAA-MM-DD', g, s, q, time, savedAt }
  series: [],                    // { id, name, sim, rows:[{ date, g, s, r }] }
  kState: { nextAt: LAB.K_FIRST, pending: false },
  profile: { school: '', name: '' }
});

let state = fresh();
const listeners = new Set();
let memoryOnly = false;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (!d || d.v !== 1) return;
    state = { ...fresh(), ...d.state, kState: { ...fresh().kState, ...(d.state && d.state.kState) }, profile: { ...fresh().profile, ...(d.state && d.state.profile) } };
  } catch (e) { memoryOnly = true; }
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify({ v: 1, state })); }
  catch (e) { memoryOnly = true; }
}

function emit(reason) { persist(); listeners.forEach(fn => fn(reason)); }

load();

export const isMemoryOnly = () => memoryOnly;
export const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export const getState = () => state;

// ---------- preferencias de interfaz ----------
export function getPref(name, fallback) {
  try { const p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); return name in p ? p[name] : fallback; }
  catch (e) { return fallback; }
}
export function setPref(name, value) {
  try { const p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); p[name] = value; localStorage.setItem(PREF_KEY, JSON.stringify(p)); }
  catch (e) { /* sin almacenamiento */ }
}

// ---------- cálculo ----------
export const rawCount = (g, s) => 10 * g + s;
export const wolf = (k, g, s) => Math.round(k * rawCount(g, s));
export const clampK = k => Math.min(LAB.K_MAX, Math.max(LAB.K_MIN, k));
export const round2 = x => Math.round(x * 100) / 100;
export const dateMs = iso => Date.parse(iso + 'T12:00:00Z');
export const qualifyingCount = () => state.obs.filter(o => o.q).length;

// ---------- observaciones propias ----------
export function saveObservation({ date, g, s, time }) {
  const q = wolf(state.k, g, s) > LAB.R_MIN;      // «cuenta» según el k vigente al guardar
  const existing = state.obs.findIndex(o => o.date === date);
  const rec = { id: existing >= 0 ? state.obs[existing].id : cryptoId(), date, g, s, q, time: time || '', savedAt: Date.now() };
  if (existing >= 0) state.obs[existing] = rec; else state.obs.push(rec);
  state.obs.sort((a, b) => a.date.localeCompare(b.date));
  if (!state.kState.pending && qualifyingCount() >= state.kState.nextAt) state.kState.pending = true;
  emit('obs');
  return { replaced: existing >= 0, rec, r: wolf(state.k, g, s), kDue: state.kState.pending };
}

export function deleteObservation(id) {
  state.obs = state.obs.filter(o => o.id !== id);
  if (state.kState.pending && qualifyingCount() < state.kState.nextAt) state.kState.pending = false;
  emit('obs');
}

// ---------- k ----------
export function setK(k) {
  state.k = round2(clampK(k));
  emit('k');
}

/** Calcula la sugerencia con las observaciones que cuentan y el registro histórico. */
export function computeKSuggestion() {
  const qs = state.obs.filter(o => o.q);
  let sumRef = 0, sumCount = 0, used = 0;
  for (const o of qs) {
    const ref = referenceAt(dateMs(o.date));
    if (ref == null) continue;
    sumRef += ref; sumCount += rawCount(o.g, o.s); used++;
  }
  if (!used || sumCount <= 0) return { type: 'none', n: qs.length, used: 0 };
  const ks = round2(clampK(sumRef / sumCount));
  if (Math.abs(ks - state.k) <= LAB.K_CLOSE) return { type: 'close', ks, n: qs.length, used };
  return { type: 'suggest', ks, n: qs.length, used };
}

/** Cierra la evaluación vigente: acepta el k sugerido o mantiene el actual; la próxima llega tras otras K_STEP. */
export function resolveK(accepted, ks) {
  if (accepted) state.k = round2(clampK(ks));
  state.kState.pending = false;
  state.kState.nextAt = qualifyingCount() + LAB.K_STEP;
  emit(accepted ? 'k' : 'kstate');
}
export const kPending = () => state.kState.pending && qualifyingCount() >= state.kState.nextAt;

// ---------- series sumadas (CSV de otras personas o datos de ejemplo) ----------
export function addSeries({ name, sim = false, rows }) {
  const id = cryptoId();
  state.series.push({ id, name, sim, rows });
  emit('series');
  return id;
}
export function removeSeries(id) {
  state.series = state.series.filter(s => s.id !== id);
  emit('series');
}

export function setProfile(p) {
  state.profile = { ...state.profile, ...p };
  emit('profile');
}

export function clearAll() {
  state = fresh();
  emit('all');
}

/** Datos inventados para probar la herramienta: siguen la forma del registro histórico con ruido. */
export function makeSample(n = 36) {
  const from = Date.UTC(2010, 5, 1), to = Date.UTC(2025, 11, 31);
  const seen = new Set(), rows = [];
  while (rows.length < n) {
    const ms = from + Math.random() * (to - from);
    const iso = new Date(ms).toISOString().slice(0, 10);
    if (seen.has(iso)) continue;
    seen.add(iso);
    const ref = referenceAt(ms) ?? 40;
    const target = Math.max(0, ref * (0.65 + Math.random() * 0.7));
    const g = Math.max(target < 8 ? 0 : 1, Math.round(target / 15));
    const s = g === 0 ? 0 : Math.max(g, Math.round(target - 10 * g));
    rows.push({ date: iso, g, s, r: 10 * g + s });
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));
  return rows;
}

function cryptoId() {
  return (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)).slice(0, 12);
}
