// SeleneSight — trivia de 7 preguntas y certificado en PDF generado en el propio dispositivo.
// No se guarda ni se envía ningún dato: el nombre solo se usa para dibujar el PDF y se descarta.
const Q = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'];   // en i18n: qN (pregunta), qN_a (correcta), qN_b..d (incorrectas), qN_x (explicación)
const PASS = 6;
let ctx = null, order = [], picks = [], step = 0;

export function initQuiz(c) {   // c = { t, lang(), ridge() → Promise<Float32Array|null> }
  ctx = c;
  const dlg = document.getElementById('quiz');
  document.getElementById('quizBtn').onclick = () => { start(); dlg.showModal(); };
  dlg.addEventListener('close', () => { const n = document.getElementById('qzName'); if (n) n.value = ''; });
}
export function openQuiz() { start(); document.getElementById('quiz').showModal(); }

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function start() {
  order = Q.map(k => ({ k, opts: shuffle(['a', 'b', 'c', 'd']) })); picks = []; step = 0; render();
}
const $ = (id) => document.getElementById(id);
function render() {
  const t = ctx.t, body = $('qzBody');
  if (step < order.length) {
    const q = order[step], ans = picks[step];
    body.innerHTML = `<p class="qz-step">${t('qzStep', { n: step + 1, m: order.length })}</p>
      <fieldset class="qz-q"><legend id="qzLegend">${t(q.k)}</legend>
      ${q.opts.map((o, i) => `<label class="qz-opt${ans != null ? (o === 'a' ? ' ok' : o === ans ? ' bad' : '') : ''}"><input type="radio" name="qz" value="${o}"${ans === o ? ' checked' : ''}${ans != null ? ' disabled' : ''}> <span>${t(q.k + '_' + o)}</span></label>`).join('')}
      </fieldset>
      <p class="qz-fb" role="status" aria-live="polite">${ans != null ? `<b>${ans === 'a' ? t('qzRight') : t('qzWrong')}</b> ${t(q.k + '_x')}` : ''}</p>
      <div class="dlg-actions">${ans == null ? `<button type="button" class="btn primary" id="qzCheck" disabled>${t('qzCheck')}</button>` : `<button type="button" class="btn primary" id="qzNext">${step + 1 < order.length ? t('qzNext') : t('qzSee')}</button>`}</div>`;
    body.querySelectorAll('input[name=qz]').forEach(r => r.onchange = () => { const b = $('qzCheck'); if (b) b.disabled = false; });
    if ($('qzCheck')) $('qzCheck').onclick = () => { const r = body.querySelector('input[name=qz]:checked'); if (!r) return; picks[step] = r.value; render(); $('qzNext').focus(); };
    if ($('qzNext')) $('qzNext').onclick = () => { step++; render(); const f = body.querySelector('input, button'); if (f) f.focus(); };
    return;
  }
  const score = picks.filter(p => p === 'a').length, ok = score >= PASS;
  body.innerHTML = `<p class="qz-score"><b>${t('qzScore', { n: score, m: order.length })}</b></p>
    <p>${ok ? t('qzPass') : t('qzFail', { p: PASS })}</p>
    ${ok ? `<label class="qz-name" for="qzName">${t('qzNameL')}</label>
      <input id="qzName" type="text" maxlength="60" autocomplete="off" spellcheck="false" aria-describedby="qzPriv">
      <p id="qzPriv" class="small muted">${t('qzPriv')}</p>
      <p class="qz-err small" id="qzErr" role="alert"></p>` : ''}
    <div class="dlg-actions">${ok ? `<button type="button" class="btn primary" id="qzPdf">${t('qzPdf')}</button>` : ''}<button type="button" class="btn" id="qzAgain">${t('qzAgain')}</button></div>`;
  $('qzAgain').onclick = () => { start(); const f = $('qzBody').querySelector('input'); if (f) f.focus(); };
  if (ok) {
    $('qzName').focus();
    $('qzPdf').onclick = async () => {
      const name = $('qzName').value.replace(/\s+/g, ' ').trim();
      if (!name) { $('qzErr').textContent = t('qzNameErr'); $('qzName').focus(); return; }
      $('qzErr').textContent = '';
      const blob = await certificate(name, score);
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = t('qzFile') + '.pdf'; document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    };
  }
}

// ---------- certificado: lienzo A4 apaisado → JPEG → PDF mínimo (una página, sin bibliotecas) ----------
async function certificate(name, score) {
  const t = ctx.t, W = 2339, H = 1654;   // A4 apaisado a 200 ppp
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  try { await document.fonts.load('600 80px "Barlow Condensed"'); await document.fonts.load('500 40px "Barlow Condensed"'); } catch {}
  const F = (w, px) => `${w} ${px}px "Barlow Condensed", system-ui, sans-serif`, T = (w, px) => `${w} ${px}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  g.fillStyle = '#E8EAEC'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#18202B'; g.lineWidth = 6; g.strokeRect(70, 70, W - 140, H - 140); g.lineWidth = 2; g.strokeRect(92, 92, W - 184, H - 184);
  // horizonte real del mejor punto del borde de Shackleton, con el Sol rozándolo
  const ridge = await ctx.ridge().catch(() => null), y0 = H - 300, k = 22;
  g.save(); g.beginPath(); g.rect(94, 94, W - 188, H - 188); g.clip();
  g.fillStyle = '#05070D'; g.fillRect(94, 94, W - 188, 520);
  g.fillStyle = '#4A5566'; g.beginPath(); g.moveTo(94, 614);
  for (let i = 0; i <= 720; i++) { const x = 94 + (W - 188)*i/720, h = ridge ? ridge[i % 720] : 0.4*Math.sin(i/37) + 0.2*Math.sin(i/9); g.lineTo(x, 470 - h*k*3); }
  g.lineTo(W - 94, 614); g.closePath(); g.fill();
  g.fillStyle = '#F2C14E'; g.beginPath(); g.arc(W*0.72, 470 - 1.2*k*3, 26, 0, 2*Math.PI); g.fill();
  g.fillStyle = '#8FB3E8'; g.beginPath(); g.arc(W*0.24, 470 - 3.4*k*3, 20, 0, 2*Math.PI); g.fill();
  g.restore();
  g.fillStyle = '#18202B'; g.textAlign = 'center';
  g.font = F(600, 64); g.fillText('SeleneSight', W/2, 720);
  g.font = F(600, 112); g.fillText(t('certTitle'), W/2, 850);
  g.font = T(400, 40); g.fillStyle = '#4A5566'; g.fillText(t('certTo'), W/2, 950);
  let px = 120; g.font = F(600, px); while (g.measureText(name).width > W - 420 && px > 48) { px -= 4; g.font = F(600, px); }
  g.fillStyle = '#18202B'; g.fillText(name, W/2, 1090);
  g.strokeStyle = '#7A8494'; g.lineWidth = 2; g.beginPath(); g.moveTo(W/2 - 620, 1125); g.lineTo(W/2 + 620, 1125); g.stroke();
  g.font = T(400, 38); g.fillStyle = '#18202B';
  wrap(g, t('certBody', { n: score, m: Q.length }), W/2, 1205, W - 520, 52);
  const d = new Date(), date = d.toLocaleDateString(ctx.lang() === 'es' ? 'es-UY' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  g.font = T(500, 34); g.textAlign = 'left'; g.fillText(t('certIssuer'), 180, H - 200); g.font = T(400, 30); g.fillStyle = '#4A5566'; g.fillText(date, 180, H - 155);
  g.textAlign = 'right'; g.font = T(400, 26); wrapRight(g, t('certNote'), W - 180, H - 200, 900, 36);
  const jpg = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
  return pdfFromJpeg(new Uint8Array(await jpg.arrayBuffer()), W, H);
}
function wrap(g, text, x, y, max, lh) {
  const words = text.split(' '); let line = '', yy = y;
  for (const w of words) { const tl = line ? line + ' ' + w : w; if (g.measureText(tl).width > max && line) { g.fillText(line, x, yy); line = w; yy += lh; } else line = tl; }
  if (line) g.fillText(line, x, yy);
}
function wrapRight(g, text, x, y, max, lh) {
  const words = text.split(' '), lines = []; let line = '';
  for (const w of words) { const tl = line ? line + ' ' + w : w; if (g.measureText(tl).width > max && line) { lines.push(line); line = w; } else line = tl; }
  if (line) lines.push(line); lines.forEach((l, i) => g.fillText(l, x, y + i*lh));
}
function pdfFromJpeg(jpg, w, h) {
  const PW = 841.89, PH = 595.28, enc = new TextEncoder(), parts = [], offs = []; let len = 0;
  const add = (b) => { const u = typeof b === 'string' ? enc.encode(b) : b; parts.push(u); len += u.length; };
  const obj = (n, body) => { offs[n] = len; add(`${n} 0 obj\n`); body(); add('\nendobj\n'); };
  add('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, () => add('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => add('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'));
  obj(3, () => add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`));
  obj(4, () => { add(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`); add(jpg); add('\nendstream'); });
  const cs = `q ${PW} 0 0 ${PH} 0 0 cm /Im0 Do Q`;
  obj(5, () => add(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`));
  obj(6, () => add('<< /Producer (SeleneSight) /Title (SeleneSight certificate) >>'));
  const x = len; let xr = 'xref\n0 7\n0000000000 65535 f \n'; for (let n = 1; n <= 6; n++) xr += String(offs[n]).padStart(10, '0') + ' 00000 n \n';
  add(xr + `trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${x}\n%%EOF\n`);
  return new Blob(parts, { type: 'application/pdf' });
}
