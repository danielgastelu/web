// Vista «Medallas»: logros por constancia, progreso hacia cada meta y celebración al ganar una.
import { MEDALS } from './config.js';
import { t, tn, fmtNum, fmtDate, onLangChange } from './i18n.js';
import { getState, subscribe, medalMetrics, unseenMedalIds, markMedalsSeen, localDay } from './store.js';
import { $, esc, openDialog } from './dom.js';

const badge = (md, cls = '') =>
  `<span class="medal-badge ${cls}" data-tier="${md.tier}"><span class="medal-emoji" aria-hidden="true">${md.emoji}</span></span>`;

/** Una medalla ganada se muestra completa aunque después se borren observaciones. */
function progressOf(md, metrics, medals) {
  const won = medals[md.id];
  const n = won ? md.goal : Math.min(metrics[md.metric], md.goal);
  return { md, won, n, left: md.goal - n };
}

const title = md => t(`med_${md.id}_t`);
const goal = md => t(`med_${md.id}_g`, { goal: fmtNum(md.goal) });
const leftText = p => tn(`med_left_${p.md.metric}`, p.left);

export function initMedals() {
  const summary = $('#med-summary'), next = $('#med-next'), list = $('#medal-list'), dot = $('#nav-medals-dot');
  let fresh = new Set();          // medallas que todavía no se habían visto al entrar a la vista: llevan «¡Nueva!»

  function render() {
    const st = getState(), metrics = medalMetrics();
    const rows = MEDALS.map(md => progressOf(md, metrics, st.medals));
    const got = rows.filter(p => p.won).length;
    const today = st.activity.includes(localDay());

    summary.innerHTML = `
      <p class="med-count">${esc(t('med_summary', { n: fmtNum(got), total: fmtNum(MEDALS.length) }))}</p>
      <ul class="med-strip" aria-hidden="true">${rows.map(p => `<li>${badge(p.md, p.won ? 'is-won' : 'is-locked')}</li>`).join('')}</ul>
      <p class="med-today" data-done="${today}">${esc(t(today ? 'med_today_yes' : 'med_today_no'))}</p>`;

    const nx = rows.find(p => !p.won);
    next.innerHTML = nx
      ? `<p class="med-next-k">${esc(t('med_next_t'))}</p>
         <p class="med-next-t">${badge(nx.md, 'is-locked small')}<span><strong>${esc(title(nx.md))}</strong><br>${esc(leftText(nx))}</span></p>`
      : `<p class="med-next-t">${badge(MEDALS[MEDALS.length - 1], 'is-won small')}<span><strong>${esc(t('med_all_done'))}</strong></span></p>`;
    next.dataset.done = String(!nx);

    list.innerHTML = rows.map(p => {
      const pct = Math.round(100 * p.n / p.md.goal);
      const status = p.won ? t('med_earned_on', { date: fmtDate(localDay(p.won.at)) }) : leftText(p);
      const state = p.won ? 'won' : p === nx ? 'next' : 'locked';
      return `
      <li class="medal" data-state="${state}">
        ${badge(p.md, p.won ? 'is-won' : 'is-locked')}
        <div class="medal-body">
          <h3>${esc(title(p.md))}${fresh.has(p.md.id) ? ` <span class="medal-chip">${esc(t('med_new_chip'))}</span>` : ''}${p.won ? '' : `<span class="visually-hidden"> (${esc(t('med_locked'))})</span>`}</h3>
          <p class="medal-goal">${esc(goal(p.md))}</p>
          <div class="medal-meter">
            <div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="${p.md.goal}" aria-valuenow="${p.n}"
                 aria-label="${esc(t('med_progress_aria', { n: fmtNum(p.n), goal: fmtNum(p.md.goal) }))}"><span style="width:${pct}%"></span></div>
            <span class="medal-n" aria-hidden="true">${fmtNum(p.n)}/${fmtNum(p.md.goal)}</span>
          </div>
          <p class="medal-status">${esc(status)}</p>
        </div>
      </li>`;
    }).join('');

    dot.hidden = !unseenMedalIds().length;
  }

  window.addEventListener('helios:view', e => {
    if (e.detail === 'medallas') {
      fresh = new Set(unseenMedalIds());
      render();
      markMedalsSeen();            // emite → render(): el punto del menú se apaga y «¡Nueva!» se mantiene
    } else if (fresh.size) { fresh = new Set(); render(); }
  });
  subscribe(render);
  onLangChange(render);
  render();
}

/** Diálogo de festejo al ganar una o más medallas; `then` se ejecuta al cerrarlo. */
export function celebrateMedals(won, then) {
  const body = `
    <div class="medal-celebrate">
      ${won.map(md => `
        <div class="medal-cel">
          ${badge(md, 'is-won big')}
          <p class="medal-cel-t">${esc(title(md))}</p>
          <p class="medal-cel-g">${esc(goal(md))}</p>
        </div>`).join('')}
    </div>`;
  openDialog({
    title: t(won.length === 1 ? 'med_new_one' : 'med_new_other'),
    body,
    actions: [
      { label: t('med_new_see'), kind: 'primary', onClick: () => { location.hash = '#/medallas'; } },
      { label: t('med_new_keep'), kind: 'secondary' }
    ],
    onClose: then
  });
}
