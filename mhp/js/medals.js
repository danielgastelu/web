// Vista «Medallas»: logros por constancia, medallas conmemorativas y celebración al ganar una.
import { MEDALS, BIRTHDAYS, portraitUrl, wikiUrl, commonsUrl } from './config.js';
import { t, tn, fmtNum, fmtDate, fmtDayMonth, getLang, onLangChange } from './i18n.js';
import { getState, subscribe, medalMetrics, unseenMedalIds, markMedalsSeen, localDay, bdKey } from './store.js';
import { $, esc, openDialog } from './dom.js';

const isBd = md => md.kind === 'bd';

const badge = (md, cls = '') => isBd(md)
  ? `<span class="medal-badge portrait ${cls}" data-tier="3"><img src="${portraitUrl(md.id)}" alt="" width="128" height="128" loading="lazy"></span>`
  : `<span class="medal-badge ${cls}" data-tier="${md.tier}"><span class="medal-emoji" aria-hidden="true">${md.emoji}</span></span>`;

/** Una medalla ganada se muestra completa aunque después se borren observaciones. */
function progressOf(md, metrics, medals) {
  const won = medals[md.id];
  const n = won ? md.goal : Math.min(metrics[md.metric], md.goal);
  return { md, won, n, left: md.goal - n };
}

const title = md => t(isBd(md) ? `bd_${md.id}_t` : `med_${md.id}_t`);
const goal = md => isBd(md) ? t(`bd_${md.id}_p`) : t(`med_${md.id}_g`, { goal: fmtNum(md.goal) });
const leftText = p => tn(`med_left_${p.md.metric}`, p.left);
const lifeSpan = bd => `${bd.circa ? t('bd_circa') + ' ' : ''}${bd.years}`;

/** Días que faltan hasta la próxima vez que llega esa fecha (0 = hoy). */
function daysUntil(md) {
  const now = new Date(), t0 = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const [m, d] = md.split('-').map(Number);
  let t1 = Date.UTC(now.getFullYear(), m - 1, d);
  if (t1 < t0) t1 = Date.UTC(now.getFullYear() + 1, m - 1, d);
  return Math.round((t1 - t0) / 864e5);
}

const chip = (key, fresh) => fresh.has(key) ? ` <span class="medal-chip">${esc(t('med_new_chip'))}</span>` : '';
const lockedNote = won => won ? '' : `<span class="visually-hidden"> (${esc(t('med_locked'))})</span>`;

export function initMedals() {
  const summary = $('#med-summary'), next = $('#med-next'), list = $('#medal-list'), dot = $('#nav-medals-dot');
  const bdList = $('#bd-list'), bdCount = $('#bd-count'), credits = $('#portrait-credits');
  let fresh = new Set();          // medallas que todavía no se habían visto al entrar a la vista: llevan «¡Nueva!»

  function renderGoals(st) {
    const metrics = medalMetrics();
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
          <h3>${esc(title(p.md))}${chip(p.md.id, fresh)}${lockedNote(p.won)}</h3>
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
  }

  function renderBirthdays(st) {
    const lang = getLang();
    const rows = BIRTHDAYS.map(bd => ({ bd: { ...bd, kind: 'bd' }, won: st.medals[bdKey(bd.id)], days: daysUntil(bd.date) }));
    const upcoming = rows.filter(r => !r.won).reduce((a, r) => (!a || r.days < a.days ? r : a), null);
    bdCount.textContent = t('med_summary', { n: fmtNum(rows.filter(r => r.won).length), total: fmtNum(rows.length) });

    bdList.innerHTML = rows.map(r => {
      const { bd, won, days } = r;
      const name = t(`bd_${bd.id}_n`);
      const state = won ? 'won' : days === 0 ? 'today' : r === upcoming ? 'next' : 'locked';
      const status = won ? t('med_earned_on', { date: fmtDate(localDay(won.at)) })
        : days === 0 ? t('bd_today') : tn('bd_in', days);
      const link = won
        ? `<a class="bd-wiki" href="${esc(wikiUrl(lang, bd.wiki[lang] || bd.wiki.en))}" target="_blank" rel="noopener" aria-label="${esc(t('bd_wiki_aria', { name }))}">${esc(t('bd_wiki'))} <span aria-hidden="true">↗</span></a>`
        : `<span class="bd-wiki-off">${esc(t('bd_wiki_locked'))}</span>`;
      return `
      <li class="medal bd" data-state="${state}">
        ${badge(bd, won ? 'is-won' : 'is-locked')}
        <div class="medal-body">
          <h3>${esc(title(bd))}${chip(bdKey(bd.id), fresh)}${lockedNote(won)}</h3>
          <p class="bd-who">${esc(name)} <span class="bd-years">(${esc(lifeSpan(bd))})</span></p>
          <p class="medal-goal">${esc(goal(bd))}</p>
          <p class="bd-when"><span class="bd-date">${esc(won ? fmtDayMonth(bd.date) : t('bd_unlock', { date: fmtDayMonth(bd.date) }))}</span>${bd.memorial ? `<span class="bd-memo">${esc(t('bd_memorial'))}</span>` : ''}</p>
          <p class="medal-status">${esc(status)}</p>
          <p class="bd-link">${link}</p>
        </div>
      </li>`;
    }).join('');

    credits.innerHTML = BIRTHDAYS.map(bd => `
      <li><a href="${esc(commonsUrl(bd.photo.file))}" target="_blank" rel="noopener">${esc(t(`bd_${bd.id}_n`))}</a>:
        ${esc(bd.photo.author || t('portrait_unknown'))}${bd.photo.artistic ? `, ${esc(t('portrait_artistic'))}` : ''}.</li>`).join('');
  }

  function render() {
    const st = getState();
    renderGoals(st);
    renderBirthdays(st);
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
          ${isBd(md) ? `<p class="medal-cel-g"><strong>${esc(t(`bd_${md.id}_n`))}</strong></p>` : ''}
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
