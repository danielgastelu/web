// Punto de entrada: navegación por vistas, menú de idiomas, instalación y actualización de la PWA.
import { APP, ABOUT } from './config.js';
import { LANGS, detectLang, setLang, getLang, getLangInfo, onLangChange, t } from './i18n.js';
import { FLAGS } from './flags.js';
import { $, $$, esc, toast, prefersReducedMotion } from './dom.js';
import { initSun } from './sun.js';
import { initObservatory } from './observatory.js';
import { initDataLab } from './datalab.js';

// ---------- vistas ----------
const ROUTES = ['mision', 'observar', 'datos', 'acerca'];
let firstRoute = true;
let active = null;

function showRoute() {
  const raw = location.hash.replace(/^#\/?/, '');
  if (raw && !ROUTES.includes(raw) && active) return;          // anclas internas (p. ej. «Saltar al contenido»)
  const name = ROUTES.includes(raw) ? raw : 'mision';
  active = name;
  $$('.view').forEach(v => { v.hidden = v.dataset.view !== name; });
  $$('#nav a').forEach(a => {
    if (a.dataset.route === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  if (!firstRoute) {
    window.scrollTo({ top: 0, behavior: 'auto' });
    $('#main').focus({ preventScroll: true });
  }
  firstRoute = false;
  window.dispatchEvent(new CustomEvent('helios:view', { detail: name }));
}
window.addEventListener('hashchange', showRoute);

// ---------- idioma ----------
function buildLangMenu() {
  const list = $('#lang-list'), btn = $('#lang-btn');
  list.innerHTML = LANGS.map(l => `
    <li><button type="button" data-lang="${l.code}" lang="${l.tag}"><span class="flag">${FLAGS[l.flag]}</span><span>${esc(l.label)}</span></button></li>`).join('');
  const close = () => { list.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', () => {
    const open = list.hidden;
    list.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) (list.querySelector('[aria-current="true"]') || list.querySelector('button')).focus();
  });
  list.addEventListener('click', e => {
    const b = e.target.closest('[data-lang]');
    if (!b) return;
    setLang(b.dataset.lang);
    close(); btn.focus();
  });
  list.addEventListener('keydown', e => {
    const items = $$('button', list), i = items.indexOf(document.activeElement);
    if (e.key === 'Escape') { close(); btn.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
  });
  document.addEventListener('click', e => { if (!list.hidden && !e.target.closest('.langmenu')) close(); });
  document.addEventListener('focusin', e => { if (!list.hidden && !e.target.closest('.langmenu')) close(); });
}
function refreshLangButton() {
  const info = getLangInfo();
  $('#lang-flag').innerHTML = FLAGS[info.flag];
  $('#lang-code').textContent = info.code.toUpperCase();
  $$('#lang-list button').forEach(b => b.setAttribute('aria-current', String(b.dataset.lang === getLang())));
}

// ---------- «Acerca de»: datos de identidad que completa el equipo ----------
function refreshAbout() {
  const fill = v => v ? null : `<span class="pending-value">${esc(t('about_fill'))}</span>`;
  $('#about-web').innerHTML = fill(ABOUT.siteUrl) || `<a href="${esc(ABOUT.siteUrl)}" target="_blank" rel="noopener">${esc(ABOUT.siteUrl)}</a>`;
  $('#about-inst').innerHTML = fill(ABOUT.institution) || esc(ABOUT.institution);
  const c = ABOUT.contact;
  $('#about-contact').innerHTML = fill(c) || (/^[^\s@]+@[^\s@]+$/.test(c) ? `<a href="mailto:${esc(c)}">${esc(c)}</a>` : /^https?:/.test(c) ? `<a href="${esc(c)}" target="_blank" rel="noopener">${esc(c)}</a>` : esc(c));
  $('#about-version').textContent = t('about_version', { v: APP.version }) + ` (${APP.year})`;
}

// ---------- instalación ----------
let deferredInstall = null;
function initInstall() {
  const buttons = [$('#install-btn'), $('#install-btn-about')];
  const setVisible = v => buttons.forEach(b => { b.hidden = !v; });
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; setVisible(true); });
  window.addEventListener('appinstalled', () => { deferredInstall = null; setVisible(false); });
  buttons.forEach(b => b.addEventListener('click', async () => {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    await deferredInstall.userChoice;
    deferredInstall = null; setVisible(false);
  }));
}

// ---------- sin conexión y service worker ----------
function initOffline() {
  const bar = $('#offline-bar');
  const update = () => { bar.hidden = navigator.onLine; };
  window.addEventListener('online', update); window.addEventListener('offline', update);
  update();
}

function initServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(reg => {
    const offerUpdate = worker => {
      $('#update-bar').hidden = false;
      $('#update-btn').onclick = () => worker.postMessage('SKIP_WAITING');
    };
    if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      if (!w) return;
      w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(w);
        else if (w.state === 'activated' && !hadController) toast(t('ready_offline'), { kind: 'ok' });
      });
    });
  }).catch(() => { /* sin service worker la app funciona igual, solo que sin modo sin conexión */ });
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;      // primera instalación: no recargar
    reloading = true; location.reload();
  });
}

// ---------- arranque ----------
buildLangMenu();
initSun($('#hero-sun'));
initObservatory();
initDataLab();
initInstall();
initOffline();
onLangChange(() => { refreshLangButton(); refreshAbout(); });
setLang(detectLang(), { persist: false });
refreshLangButton();
refreshAbout();
showRoute();
initServiceWorker();

$('#hero-start').addEventListener('click', () => {
  $('#fundamentos').scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
});
