// Trivia en la página "Aprender": usa los textos de la app y el horizonte real del mejor punto de Shackleton para el certificado.
import { T } from '../app/i18n.js';
import { initQuiz, refresh } from './quiz.js';
const lang = () => document.documentElement.lang === 'es' ? 'es' : 'en';
const t = (k, v) => { let s = (T[lang()] && T[lang()][k]) ?? T.es[k] ?? k; if (v) for (const x in v) s = s.replace('{' + x + '}', v[x]); return s; };
async function ridge() {   // horizonte (720 azimuts) del punto refinado con la noche más corta
  const get = async (u, Ty) => new Ty(await (await fetch(u)).arrayBuffer());
  const lng = await get('app/data/R40_long.bin', Uint16Array), hz = await get('app/data/hz/R40_0.bin', Int16Array), n = lng.length/7;
  let b = 0; for (let i = 1; i < n; i++) if (lng[i*7+3] < lng[b*7+3] || (lng[i*7+3] === lng[b*7+3] && lng[i*7] > lng[b*7])) b = i;
  return Float32Array.from(hz.subarray(b*720, b*720 + 720), v => v/100);
}
initQuiz({ t, lang, ridge });
new MutationObserver(refresh).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
