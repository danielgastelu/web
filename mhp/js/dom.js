// Utilidades de interfaz compartidas: selectores, escape de HTML, avisos y diálogo modal.
import { t } from './i18n.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isCoarsePointer = () => window.matchMedia('(pointer: coarse)').matches;

// ---------- avisos breves ----------
export function toast(message, { kind = 'info', ms = 4200 } = {}) {
  const host = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.dataset.kind = kind;
  el.textContent = message;
  host.appendChild(el);
  while (host.children.length > 3) host.firstElementChild.remove();
  setTimeout(() => el.remove(), ms);
}

// ---------- diálogo modal ----------
let dlg, lastFocus;

function ensureDialog() {
  if (dlg) return dlg;
  dlg = $('#dlg');
  $('.dlg-x', dlg).addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });   // clic en el fondo
  dlg.addEventListener('close', () => {
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    if (dlg._onClose) { const f = dlg._onClose; dlg._onClose = null; f(); }
  });
  return dlg;
}

/**
 * openDialog({ title, body (HTML), actions: [{ label, kind, onClick }], onClose })
 * Cada acción cierra el diálogo salvo que onClick devuelva false.
 */
export function openDialog({ title, body, actions = [], onClose }) {
  const d = ensureDialog();
  if (d.open) d.close();
  lastFocus = document.activeElement;
  $('.dlg-title', d).textContent = title;
  $('.dlg-body', d).innerHTML = body || '';
  $('.dlg-x', d).setAttribute('aria-label', t('close'));
  const box = $('.dlg-actions', d);
  box.replaceChildren();
  for (const a of actions) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + (a.kind === 'primary' ? 'btn-primary' : a.kind === 'danger' ? 'btn-secondary btn-danger' : 'btn-secondary');
    b.textContent = a.label;
    b.addEventListener('click', () => { const r = a.onClick ? a.onClick() : undefined; if (r !== false) d.close(); });
    box.appendChild(b);
  }
  d._onClose = onClose || null;
  d.showModal();
  return d;
}

export function closeDialog() { if (dlg && dlg.open) dlg.close(); }

export function confirmDialog({ title, message, confirmLabel, danger = false }) {
  return new Promise(resolve => {
    let answered = false;
    openDialog({
      title,
      body: `<p>${esc(message)}</p>`,
      actions: [
        { label: confirmLabel, kind: danger ? 'danger' : 'primary', onClick: () => { answered = true; resolve(true); } },
        { label: t('cancel'), kind: 'secondary', onClick: () => { answered = true; resolve(false); } }
      ],
      onClose: () => { if (!answered) resolve(false); }
    });
  });
}
