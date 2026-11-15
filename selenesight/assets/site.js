// Idioma de la landing: comparte la preferencia con la app (misma clave en localStorage)
(function () {
  const titles = { es: 'SeleneSight · Polo sur lunar', en: 'SeleneSight · Lunar south pole' };
  const btns = document.querySelectorAll('.langs button');
  function set(lang) {
    document.documentElement.lang = lang;
    const h = document.documentElement; document.title = h.dataset['title' + (lang === 'es' ? 'Es' : 'En')] || titles[lang];
    document.querySelector('.langs').setAttribute('aria-label', lang === 'es' ? 'Idioma' : 'Language');
    btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.set === lang)));
    try { localStorage.setItem('selenesight-lang', lang); } catch (e) {}
  }
  let lang = 'en';   // inglés por defecto (jurado internacional); se recuerda la elección
  try { lang = localStorage.getItem('selenesight-lang') || 'en'; } catch (e) {}
  set(lang === 'es' ? 'es' : 'en');
  btns.forEach(b => b.addEventListener('click', () => set(b.dataset.set)));
})();
