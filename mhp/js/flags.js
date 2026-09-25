// Banderas en SVG propio: se ven igual en Windows, Android, iOS y ChromeOS
// (los emoji de banderas no se muestran en Windows) y funcionan sin conexión.
const wrap = body => `<svg class="flag" viewBox="0 0 30 20" width="24" height="16" aria-hidden="true" focusable="false">${body}</svg>`;

const stripes = (colors, h = 20 / colors.length) =>
  colors.map((c, i) => `<rect y="${(i * h).toFixed(3)}" width="30" height="${(h + 0.02).toFixed(3)}" fill="${c}"/>`).join('');

const usStars = (() => {
  let s = '';
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) s += `<circle cx="${1.6 + c * 2.1 + (r % 2 ? 1 : 0)}" cy="${1.5 + r * 2.4}" r=".55" fill="#fff"/>`;
  return s;
})();

export const FLAGS = {
  uy: wrap(`${stripes(['#fff', '#0038a8', '#fff', '#0038a8', '#fff', '#0038a8', '#fff', '#0038a8', '#fff'])}
    <rect width="12.6" height="8.9" fill="#fff"/>
    <circle cx="6.3" cy="4.45" r="2" fill="#fcd116"/>
    <circle cx="6.3" cy="4.45" r="3.3" fill="none" stroke="#fcd116" stroke-width="1.1" stroke-dasharray=".55 .7"/>`),
  us: wrap(`${stripes(['#b22234', '#fff', '#b22234', '#fff', '#b22234', '#fff', '#b22234', '#fff', '#b22234', '#fff', '#b22234', '#fff', '#b22234'])}
    <rect width="12" height="10.77" fill="#3c3b6e"/>${usStars}`),
  fr: wrap(`<rect width="10.02" height="20" fill="#0055a4"/><rect x="10" width="10.02" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ef4135"/>`),
  it: wrap(`<rect width="10.02" height="20" fill="#009246"/><rect x="10" width="10.02" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ce2b37"/>`),
  br: wrap(`<rect width="30" height="20" fill="#009c3b"/><path d="M15 2 27.3 10 15 18 2.7 10Z" fill="#ffdf00"/>
    <circle cx="15" cy="10" r="4.2" fill="#002776"/><path d="M10.9 9.2c2.7-.9 6.1-.6 8.3 1.4" fill="none" stroke="#fff" stroke-width=".8"/>`),
  de: wrap(`${stripes(['#000', '#dd0000', '#ffce00'])}`)
};
