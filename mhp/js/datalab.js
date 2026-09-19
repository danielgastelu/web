// Laboratorio de datos: las observaciones llegan solas desde el observatorio (mismo almacenamiento local).
import { LAB } from './config.js';
import { t, tn, getLang, fmtNum, fmtK, fmtDate, onLangChange } from './i18n.js';
import {
  getState, subscribe, wolf, dateMs, deleteObservation, kPending, getPref, setPref,
  addSeries, removeSeries, setProfile, clearAll, makeSample
} from './store.js';
import { createChart } from './chart.js';
import { toCSV, readObservations } from './csv.js';
import { $, $$, esc, toast, confirmDialog } from './dom.js';
import { openKDialog } from './kdialog.js';
import { bindKInput, syncKInput } from './kinput.js';

const VARS = { r: 'lbl_wolf', g: 'lbl_groups', s: 'lbl_spots' };

export function initDataLab() {
  const statObs = $('#stat-obs'), statAvg = $('#stat-avg'), kInput = $('#k-input-data');
  const pendingBtn = $('#k-pending-data');
  const chartHost = $('#chart'), emptyBox = $('#chart-empty'), panel = $('#chart-panel');
  const varSel = $('#var-select'), refToggle = $('#toggle-ref'), refNote = $('#ref-note');
  const rangeBtns = $$('[data-range]'), legend = $('#legend');
  const tbody = $('#obs-body'), tableWrap = $('#obs-table');
  const school = $('#profile-school'), pname = $('#profile-name');
  const fileIn = $('#file-import'), seriesList = $('#series-list');

  let varKey = getPref('var', 'r');
  let showRef = !!getPref('ref', false);
  let range = getPref('range', 'mine');
  if (!VARS[varKey]) varKey = 'r';

  bindKInput(kInput);
  pendingBtn.addEventListener('click', openKDialog);

  // ---------- gráfica ----------
  const chart = createChart(chartHost, {
    ariaLabel: () => t('chart_aria', { var: t(VARS[varKey]) }),
    renderTip: p => {
      const row = (label, value) => `<div><dt>${esc(label)}</dt><dd>${value}</dd></div>`;
      const extra = p.mine
        ? `<div class="tip-calc">${esc(t('tip_calc'))}: ${fmtK(p.k)} × (10 × ${fmtNum(p.g)} + ${fmtNum(p.s)})</div>`
        : `<div class="tip-calc">${p.sim ? '' : `${esc(t('tip_file'))}: `}${esc(p.file)}</div>`;
      return `<dl>${row(t('tip_date'), esc(fmtDate(p.date)))}${row(t('lbl_spots'), fmtNum(p.s))}${row(t('lbl_groups'), fmtNum(p.g))}</dl>`
        + extra
        + `<div class="tip-r">${esc(t('lbl_wolf'))} = <strong>${fmtNum(p.r)}</strong></div>`;
    }
  });

  function buildPoints(st) {
    const pts = st.obs.map(o => ({ mine: true, id: o.id, date: o.date, ms: dateMs(o.date), g: o.g, s: o.s, k: st.k, r: wolf(st.k, o.g, o.s) }));
    st.series.forEach((se, i) => se.rows.forEach(r => pts.push({
      mine: false, date: r.date, ms: dateMs(r.date), g: r.g, s: r.s, r: r.r, colorIdx: i, file: se.name, sim: se.sim
    })));
    return pts;
  }

  // ---------- controles ----------
  varSel.replaceChildren(...Object.entries(VARS).map(([v, key]) => {
    const o = document.createElement('option'); o.value = v; o.dataset.key = key; return o;
  }));
  varSel.value = varKey;
  varSel.addEventListener('change', () => { varKey = varSel.value; setPref('var', varKey); render(); });
  refToggle.checked = showRef;
  refToggle.addEventListener('change', () => { showRef = refToggle.checked; setPref('ref', showRef); render(); });
  rangeBtns.forEach(b => b.addEventListener('click', () => { range = b.dataset.range; setPref('range', range); render(); }));

  // ---------- render ----------
  function render() {
    const st = getState();
    const pts = buildPoints(st);
    const mine = st.obs;

    statObs.textContent = fmtNum(mine.length);
    statAvg.textContent = mine.length ? fmtNum(mine.reduce((a, o) => a + wolf(st.k, o.g, o.s), 0) / mine.length, { maximumFractionDigits: 1 }) : '–';
    syncKInput(kInput);
    pendingBtn.hidden = !kPending();

    // controles
    $$('option', varSel).forEach(o => { o.textContent = t(o.dataset.key); });
    varSel.value = varKey;
    refToggle.checked = showRef;
    refNote.hidden = !(showRef && varKey === 'r');
    rangeBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.range === range)));

    // gráfica o estado vacío
    const empty = pts.length === 0;
    emptyBox.hidden = !empty;
    chartHost.hidden = empty;
    $('#chart-controls').hidden = empty;
    if (!empty) chart.update({ points: pts, reference: showRef, varKey, domain: range === 'mine' && mine.length ? 'mine' : 'all', yTitle: t(VARS[varKey]) });

    // leyenda
    const items = [];
    if (mine.length) items.push(`<li><i style="background:var(--ink)"></i>${esc(t('legend_mine'))}</li>`);
    st.series.forEach((se, i) => items.push(`<li><i style="background:var(--series-${i % 5})"></i>${esc(se.name)}</li>`));
    if (showRef && varKey === 'r') items.push(`<li><i class="ln"></i>${esc(t('legend_ref'))}</li>`);
    legend.innerHTML = items.join('');

    // tabla de observaciones propias
    tableWrap.hidden = mine.length === 0;
    tbody.innerHTML = mine.map(o => `
      <tr>
        <td>${esc(fmtDate(o.date))}</td>
        <td class="num">${fmtNum(o.g)}</td>
        <td class="num">${fmtNum(o.s)}</td>
        <td class="num"><strong>${fmtNum(wolf(st.k, o.g, o.s))}</strong></td>
        <td class="act"><button type="button" class="btn btn-quiet btn-small" data-del="${esc(o.id)}" aria-label="${esc(t('delete_aria', { date: fmtDate(o.date) }))}">${esc(t('btn_delete'))}</button></td>
      </tr>`).join('');

    // series sumadas
    seriesList.innerHTML = st.series.map((se, i) => `
      <li>
        <i style="background:var(--series-${i % 5})"></i>
        <span class="grow">${esc(se.name)}<br><span class="small muted">${esc(tn('series_count', se.rows.length))}</span></span>
        <button type="button" class="btn btn-quiet btn-small" data-rm="${esc(se.id)}">${esc(t('btn_remove'))}</button>
      </li>`).join('');

    // perfil (para el CSV)
    if (document.activeElement !== school) school.value = st.profile.school || '';
    if (document.activeElement !== pname) pname.value = st.profile.name || '';
  }

  tbody.addEventListener('click', e => {
    const b = e.target.closest('[data-del]');
    if (!b) return;
    deleteObservation(b.dataset.del);
    toast(t('toast_deleted'));
  });
  seriesList.addEventListener('click', e => {
    const b = e.target.closest('[data-rm]');
    if (b) removeSeries(b.dataset.rm);
  });

  // ---------- herramientas para docentes ----------
  school.addEventListener('change', () => setProfile({ school: school.value.trim() }));
  pname.addEventListener('change', () => setProfile({ name: pname.value.trim() }));

  $('#btn-export').addEventListener('click', () => {
    const st = getState();
    if (!st.obs.length) { toast(t('export_none'), { kind: 'warn' }); return; }
    const rows = st.obs.map(o => ({ date: o.date, g: o.g, s: o.s, k: st.k, wolf: wolf(st.k, o.g, o.s), school: st.profile.school, name: st.profile.name }));
    const blob = new Blob([toCSV(rows, getLang())], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mision-helios_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  });

  fileIn.addEventListener('change', async () => {
    for (const file of [...fileIn.files]) {
      try {
        const rows = readObservations(await file.text());
        if (!rows.length) throw new Error('empty');
        addSeries({ name: file.name.replace(/\.csv$/i, ''), rows });
        toast(t('import_ok', { n: fmtNum(rows.length), file: file.name }), { kind: 'ok' });
      } catch (err) {
        toast(t('import_err', { file: file.name }), { kind: 'err', ms: 6000 });
      }
    }
    fileIn.value = '';
  });

  $('#btn-sample').addEventListener('click', () => {
    const old = getState().series.find(s => s.sim);
    if (old) removeSeries(old.id);
    const rows = makeSample();
    addSeries({ name: t('sample_name'), sim: true, rows });
    toast(t('sample_loaded', { n: fmtNum(rows.length) }), { kind: 'ok' });
  });

  $('#btn-clear-all').addEventListener('click', async () => {
    const yes = await confirmDialog({ title: t('btn_clear_all'), message: t('confirm_clear'), confirmLabel: t('btn_clear_all'), danger: true });
    if (yes) { clearAll(); toast(t('cleared')); }
  });

  subscribe(render);
  onLangChange(render);
  render();
}
