// Cuadro emergente con la sugerencia del coeficiente k del observador.
import { LAB } from './config.js';
import { t, tn, fmtK, fmtNum } from './i18n.js';
import { getState, computeKSuggestion, resolveK, qualifyingCount } from './store.js';
import { openDialog, esc, toast } from './dom.js';

export function openKDialog() {
  const st = getState();
  const sug = computeKSuggestion();
  const min = fmtNum(LAB.R_MIN);
  const n = qualifyingCount();
  const few = n < LAB.K_FIRST;      // pedido a mano antes de llegar a la primera evaluación automática

  // Sin observaciones que cuenten no hay nada que comparar: solo se informa y no se toca el cronograma.
  if (n === 0) {
    openDialog({
      title: t('kd_title'),
      body: `<p>${esc(t('kd_empty', { min }))}</p>`,
      actions: [{ label: t('kd_ok'), kind: 'primary', onClick: () => {} }]
    });
    return;
  }
  const bodyText = few ? t('kd_body_few') : t('kd_body', { n: fmtNum(n), min });
  const nextLine = `<p class="small${few ? '' : ' muted'}">${esc(few
    ? tn('kd_few', n, { min, first: fmtNum(LAB.K_FIRST) })
    : t('kd_next', { step: fmtNum(LAB.K_STEP), min }))}</p>`;

  if (sug.type === 'suggest') {
    const body = `
      <p>${esc(bodyText)}</p>
      <div class="kcompare">
        <div><span class="lbl">${esc(t('kd_current'))}</span><span class="val">${fmtK(st.k)}</span></div>
        <div><span class="lbl">${esc(t('kd_suggested'))}</span><span class="val">${fmtK(sug.ks)}</span></div>
      </div>
      <p class="small">${esc(t('kd_note'))}</p>
      ${nextLine}
      <details class="how"><summary>${esc(t('kd_how_t'))}</summary><p>${esc(t('kd_how_d'))}</p></details>`;
    openDialog({
      title: t('kd_title'),
      body,
      actions: [
        { label: t('kd_accept', { k: fmtK(sug.ks) }), kind: 'primary', onClick: () => { resolveK(true, sug.ks); toast(t('toast_k', { k: fmtK(sug.ks) }), { kind: 'ok' }); } },
        { label: t('kd_keep'), kind: 'secondary', onClick: () => { resolveK(false); } }
      ]
    });
    return;
  }

  const msg = sug.type === 'close'
    ? t('kd_close', { k: fmtK(st.k), ks: fmtK(sug.ks) })
    : t('kd_none');
  openDialog({
    title: t('kd_title'),
    body: `<p>${esc(msg)}</p>${nextLine}`,
    actions: [{ label: t('kd_ok'), kind: 'primary', onClick: () => { resolveK(false); } }]
  });
}
