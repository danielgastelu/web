// storage.js — persistencia en localStorage (perfil de observador + sesiones/candidatos/marcas)

const KEY_PROFILE = "sg_observer_v1";
const KEY_SESSIONS = "sg_sessions_v1";

export function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem(KEY_PROFILE)) || { name: "", email: "", notes: "" };
  } catch {
    return { name: "", email: "", notes: "" };
  }
}

export function saveProfile(profile) {
  localStorage.setItem(KEY_PROFILE, JSON.stringify(profile));
}

export function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem(KEY_SESSIONS)) || [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions) {
  try {
    localStorage.setItem(KEY_SESSIONS, JSON.stringify(sessions));
    return true;
  } catch (e) {
    console.warn("No se pudo guardar la sesión (localStorage lleno o bloqueado):", e);
    return false;
  }
}

export function upsertSession(session) {
  const sessions = loadSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) sessions[idx] = session;
  else sessions.unshift(session);
  saveSessions(sessions.slice(0, 50)); // límite razonable
}

export function deleteSession(id) {
  saveSessions(loadSessions().filter((s) => s.id !== id));
}

export function newId(prefix = "s") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
