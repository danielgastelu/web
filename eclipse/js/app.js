/* =========================================================================
   Sonificación Eclipse 2027 — lógica de la aplicación (PWA), versión 2.0
   ========================================================================= */
(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const store = {
        get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }
    };
    const session = {
        get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
        set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }
    };

    /* =====================================================================
       1. IDIOMAS
       ===================================================================== */
    let lang = pickInitialLang();

    /** Español por defecto; otro idioma solo si la persona lo eligió antes en la lista. */
    function pickInitialLang() {
        const saved = store.get('eclipse.lang');
        return (saved && I18N[saved]) ? saved : 'es';
    }

    function langInfo() { return LANGS.find(l => l.code === lang) || LANGS[0]; }

    function t(key, vars) {
        let s = (I18N[lang] && I18N[lang][key]) ?? I18N.es[key] ?? key;
        if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
        return s;
    }

    /* Estilo sobrio: los emojis decorativos de los textos no se muestran
       (tampoco los leen los lectores de pantalla). Los textos de i18n.js quedan intactos. */
    const EMOJI_RE = /\s*\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*️?\s*/gu;
    function stripEmojis(el) {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const nodes = [];
        const has = /\p{Extended_Pictographic}/u;
        while (walker.nextNode()) if (has.test(walker.currentNode.nodeValue)) nodes.push(walker.currentNode);
        nodes.forEach(n => {
            const prev = n.previousSibling, next = n.nextSibling;
            let v = n.nodeValue.replace(EMOJI_RE, ' ');
            if (!prev) v = v.replace(/^\s+/, '');
            if (!next) v = v.replace(/\s+$/, '');
            n.nodeValue = v;
        });
    }

    /** Escribe un texto solo si cambió (evita trabajo innecesario del navegador). */
    function setText(el, txt) { if (el.textContent !== txt) el.textContent = txt; }

    /* Formateadores de fecha y hora: se crean una vez por idioma y se reutilizan. */
    const fmtCache = new Map();
    function dtf(opts) {
        const key = lang + JSON.stringify(opts);
        let f = fmtCache.get(key);
        if (!f) { f = new Intl.DateTimeFormat(langInfo().locale, opts); fmtCache.set(key, f); }
        return f;
    }

    function translateEl(el) {
        const key = el.getAttribute('data-i18n');
        if (key) {
            if (key.endsWith('_html')) el.innerHTML = t(key);
            else el.textContent = t(key);
            stripEmojis(el);
        }
        const aria = el.getAttribute('data-i18n-aria');
        if (aria) el.setAttribute('aria-label', t(aria));
        const title = el.getAttribute('data-i18n-title');
        if (title) el.setAttribute('title', t(title));
        const alt = el.getAttribute('data-i18n-alt');
        if (alt) el.setAttribute('alt', t(alt));
    }

    /** Aviso hablado por el lector de pantalla (región «status» oculta). */
    const srStatus = $('sr-status');
    let srTimer = 0;
    function announce(msg) {
        clearTimeout(srTimer);
        srStatus.textContent = '';
        srTimer = setTimeout(() => { srStatus.textContent = msg; }, 60);
    }

    /** Asigna una clave de traducción a un elemento y lo traduce. */
    function setI18n(el, key) {
        el.setAttribute('data-i18n', key);
        translateEl(el);
    }

    function buildLangBar() {
        const bar = $('lang-bar');
        bar.innerHTML = '';
        const label = document.createElement('label');
        label.className = 'visually-hidden';
        label.htmlFor = 'lang-select';
        label.setAttribute('data-i18n', 'lang.label');
        const sel = document.createElement('select');
        sel.id = 'lang-select';
        sel.className = 'header-control';
        sel.setAttribute('autocomplete', 'off');
        LANGS.forEach(l => {
            const o = document.createElement('option');
            o.value = l.code;
            o.lang = l.code;
            o.textContent = l.name;
            sel.appendChild(o);
        });
        sel.value = lang;
        sel.addEventListener('change', () => setLang(sel.value));
        bar.append(label, sel);
    }

    function setLang(code) {
        if (!I18N[code]) return;
        lang = code;
        store.set('eclipse.lang', code);
        applyLang();
    }

    function applyLang() {
        document.documentElement.lang = lang;
        document.querySelectorAll('[data-i18n], [data-i18n-aria], [data-i18n-title], [data-i18n-alt]').forEach(translateEl);
        updateTitle();   // después de traducir: usa el título ya traducido de la sección
        // Los enlaces que abren otra pestaña lo avisan al lector de pantalla
        document.querySelectorAll('a[target="_blank"]').forEach(a => a.setAttribute('aria-describedby', 'sr-newtab'));
        $('app-version').textContent = t('cred.version', { v: APP_VERSION });
        $('lang-select').value = lang;

        $('license-line').innerHTML = LICENSE_LINE_HTML;
        $('attr-animation').textContent = ATTR_ANIMATION;
        updateThemeLabels();
        updateInstallText();
        renderSpeedOptions();
        sim.renderStatic();
        sim.renderClock();
        sim.renderPlayButton();
        sim.renderMoments();
        updateGallery();
        live.lastKey = '';
        renderSonification(isPlaying ? lastEvalTime : Date.now());
        renderLoc();
        eco.renderStatic();
        eco.render(true);
        renderSunCredit();
    }

    /* =====================================================================
       2. INTERFAZ: pestañas y alto contraste
       ===================================================================== */
    const navButtons = document.querySelectorAll('nav.tabbar button');
    const tabContents = document.querySelectorAll('.tab-content');

    /** El título de la pestaña del navegador nombra la sección abierta (WCAG 2.4.2). */
    function updateTitle() {
        const active = document.querySelector('.tab-content.active');
        const h2 = active && active.id !== 'tab-sonificacion' ? active.querySelector('h2') : null;
        document.title = h2 ? h2.textContent + ' — ' + t('app.title') : t('doc.title');
    }

    function showTab(targetId, moveFocus) {
        navButtons.forEach(b => {
            const on = b.getAttribute('data-target') === targetId;
            b.classList.toggle('active', on);
            if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
        });
        tabContents.forEach(c => c.classList.toggle('active', c.id === targetId));
        document.querySelector('main').scrollTop = 0;
        window.scrollTo(0, 0);   // en pantallas bajas o con mucho zoom se desplaza la página entera
        updateTitle();
        // Las portadas de los videos se cargan recién al abrir la pestaña (aliviana el inicio)
        if (targetId === 'tab-simulacion') document.querySelectorAll('video[data-poster]').forEach(v => {
            if (!v.getAttribute('poster')) v.setAttribute('poster', v.dataset.poster);
        });
        if (targetId === 'tab-simulacion') sim.activate(); else sim.pause();
        if (targetId !== 'tab-escuchar' && eco.running) eco.stop(true);
        if (targetId !== 'tab-simulacion') { const tl = $('tl-video'); if (tl && !tl.paused) tl.pause(); }
        // Lleva el foco al título de la sección, para que el lector de pantalla anuncie el cambio
        if (moveFocus) {
            const h = document.querySelector('#' + targetId + ' h2');
            if (h) h.focus({ preventScroll: true });
        }
    }
    navButtons.forEach(btn => btn.addEventListener('click', () => showTab(btn.getAttribute('data-target'), true)));

    /* Apariencia. Dos controles independientes:
       - «Modo noche / Modo claro»: alterna entre el tema claro y el nocturno.
       - «Alto contraste»: tema para baja visión o sol intenso; al desactivarlo
         se vuelve al tema claro o nocturno que estaba elegido.
       El tema se aplica en <html data-theme="light|dark|hc"> (ver el script del <head>). */
    const root = document.documentElement;
    const btnTheme = $('btn-theme');
    const btnContrast = $('btn-contrast');
    const THEME_COLOR = { light: '#0b1730', dark: '#0b1730', hc: '#000000' };
    let themeBase = root.getAttribute('data-theme-base') === 'dark' ? 'dark' : 'light';
    let highContrast = root.getAttribute('data-theme') === 'hc';

    function applyTheme() {
        const theme = highContrast ? 'hc' : themeBase;
        root.setAttribute('data-theme', theme);
        root.setAttribute('data-theme-base', themeBase);
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', THEME_COLOR[theme]);
        updateThemeLabels();
    }
    function updateThemeLabels() {
        // Cada botón nombra lo que hará al pulsarlo
        const toLight = !highContrast && themeBase === 'dark';
        setI18n(btnTheme, toLight ? 'theme.toLight' : 'theme.toDark');
        setI18n(btnContrast, highContrast ? 'contrast.toStd' : 'contrast.toHigh');
    }
    btnTheme.addEventListener('click', () => {
        if (highContrast) { highContrast = false; themeBase = 'dark'; store.set('eclipse.hc', '0'); }
        else themeBase = themeBase === 'dark' ? 'light' : 'dark';
        store.set('eclipse.theme', themeBase);
        applyTheme();
        announce(t(themeBase === 'dark' ? 'theme.nowDark' : 'theme.nowLight'));
    });
    btnContrast.addEventListener('click', () => {
        highContrast = !highContrast;
        store.set('eclipse.hc', highContrast ? '1' : '0');
        applyTheme();
        announce(t(highContrast ? 'theme.nowHc' : (themeBase === 'dark' ? 'theme.nowDark' : 'theme.nowLight')));
    });

    /* =====================================================================
       3. INSTALACIÓN (PWA)
       ===================================================================== */
    const installBar = $('install-bar');
    const btnInstall = $('btn-install');
    const installText = $('install-text');
    let deferredPrompt = null;
    let installMode = null; // 'prompt' | 'ios' | null

    const ua = navigator.userAgent || '';
    const isIOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const isMobile = isIOS || /Android|Mobile|Silk|Kindle|Opera Mini/i.test(ua);
    const isStandalone = () =>
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        navigator.standalone === true;

    function updateInstallText() {
        if (installMode === 'ios') installText.innerHTML = t('install.ios_html');
        else installText.textContent = '';
    }
    function showInstall(mode) {
        if (isStandalone() || session.get('eclipse.installDismissed') === '1') return;
        installMode = mode;
        btnInstall.classList.toggle('hidden', mode !== 'prompt');
        updateInstallText();
        installBar.classList.remove('hidden');
    }
    function hideInstall() { installBar.classList.add('hidden'); installMode = null; }

    window.addEventListener('beforeinstallprompt', (e) => {
        if (!isMobile) return; // en laptops el navegador ofrece su propio botón de instalación
        e.preventDefault();
        deferredPrompt = e;
        showInstall('prompt');
    });
    btnInstall.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        try { await deferredPrompt.userChoice; } catch (e) { /* ignorar */ }
        deferredPrompt = null;
        hideInstall();
    });
    $('btn-install-close').addEventListener('click', () => {
        session.set('eclipse.installDismissed', '1');
        hideInstall();
    });
    window.addEventListener('appinstalled', hideInstall);
    if (isIOS && !isStandalone()) showInstall('ios');

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW:', err));
            // Deja guardado el video de la simulación para usarlo sin conexión
            const warmUp = () => {
                const srcs = ['#sim-video', '#tl-video'].map(pickVideoSrc).filter(Boolean);
                if (srcs.length && navigator.onLine !== false) {
                    const go = async () => {
                        for (const src of srcs) { try { await (await fetch(src)).blob(); } catch (e) { /* se reintentará */ } }
                    };
                    ('requestIdleCallback' in window) ? requestIdleCallback(go, { timeout: 8000 }) : setTimeout(go, 4000);
                }
            };
            // Solo cuando el service worker ya controla la página (así el video queda en caché)
            if (navigator.serviceWorker.controller) warmUp();
            else navigator.serviceWorker.addEventListener('controllerchange', warmUp, { once: true });
        });
    }

    /** Devuelve la URL del video que este navegador puede reproducir. */
    function pickVideoSrc(sel) {
        const v = document.createElement('video');
        const sources = document.querySelectorAll(sel + ' source');
        for (const s of sources) {
            if (v.canPlayType(s.getAttribute('type'))) return s.getAttribute('src');
        }
        return null;
    }

    /* =====================================================================
       4. SONIFICACIÓN
       ===================================================================== */
    const btnStart = $('btn-start');
    const voiceToggle = $('voice-toggle');
    const statusSound = $('status-sound');
    const displayTime = $('display-time');
    const displayCoverage = $('display-coverage');
    const displayPhase = $('display-phase');

    /* Referencia publicada para Punta del Este (EclipseWise), en hora de Uruguay (UTC−3).
       La usa la sección «Simulación» (mapa global), cuyos textos nombran esa ciudad. */
    const baseDate = '2027-02-06T';
    const PDE = {
        c1:  new Date(baseDate + '10:52:56-03:00').getTime(), // inicio parcial
        c2:  new Date(baseDate + '12:36:05-03:00').getTime(), // inicio anular
        max: new Date(baseDate + '12:38:49-03:00').getTime(), // máximo
        c3:  new Date(baseDate + '12:41:34-03:00').getTime(), // fin anular
        c4:  new Date(baseDate + '14:21:14-03:00').getTime()  // fin parcial
    };
    const GMT3 = 'Etc/GMT+3'; // zona fija UTC−3 (hora de Uruguay)
    function pdePhase(ms) {
        if (ms < PDE.c1) return 'phase.before';
        if (ms < PDE.c2) return 'phase.partialIn';
        if (ms <= PDE.c3) return 'phase.annular';
        if (ms <= PDE.c4) return 'phase.partialOut';
        return 'phase.after';
    }

    /* ---------------------------------------------------------------------
       Lugar de observación
       Las secciones «En vivo» y «Escuchar» calculan el eclipse para el lugar
       elegido (js/eclipse.js, elementos besselianos). Se arranca en Punta del
       Este; la persona puede tocar «Usar mi ubicación» o elegir una ciudad.
       Ciudades: nombre local, país (código ISO), latitud, longitud (grados,
       aproximadas al centro de la ciudad) y zona horaria.
       --------------------------------------------------------------------- */
    const CITIES = [
        ['Punta del Este', 'UY', -34.96, -54.95, 'America/Montevideo'],
        ['Maldonado', 'UY', -34.91, -54.96, 'America/Montevideo'],
        ['Montevideo', 'UY', -34.90, -56.19, 'America/Montevideo'],
        ['Canelones', 'UY', -34.52, -56.28, 'America/Montevideo'],
        ['Pando', 'UY', -34.72, -55.96, 'America/Montevideo'],
        ['San José de Mayo', 'UY', -34.34, -56.71, 'America/Montevideo'],
        ['Colonia del Sacramento', 'UY', -34.46, -57.84, 'America/Montevideo'],
        ['Minas', 'UY', -34.37, -55.24, 'America/Montevideo'],
        ['Rocha', 'UY', -34.48, -54.33, 'America/Montevideo'],
        ['Florida', 'UY', -34.10, -56.21, 'America/Montevideo'],
        ['Trinidad', 'UY', -33.52, -56.90, 'America/Montevideo'],
        ['Durazno', 'UY', -33.38, -56.52, 'America/Montevideo'],
        ['Treinta y Tres', 'UY', -33.23, -54.38, 'America/Montevideo'],
        ['Mercedes', 'UY', -33.25, -58.03, 'America/Montevideo'],
        ['Fray Bentos', 'UY', -33.13, -58.30, 'America/Montevideo'],
        ['Melo', 'UY', -32.37, -54.17, 'America/Montevideo'],
        ['Paysandú', 'UY', -32.32, -58.08, 'America/Montevideo'],
        ['Tacuarembó', 'UY', -31.71, -55.98, 'America/Montevideo'],
        ['Salto', 'UY', -31.38, -57.96, 'America/Montevideo'],
        ['Rivera', 'UY', -30.90, -55.55, 'America/Montevideo'],
        ['Artigas', 'UY', -30.40, -56.47, 'America/Montevideo'],
        ['Buenos Aires', 'AR', -34.61, -58.38, 'America/Argentina/Buenos_Aires'],
        ['La Plata', 'AR', -34.92, -57.95, 'America/Argentina/Buenos_Aires'],
        ['Mar del Plata', 'AR', -38.00, -57.56, 'America/Argentina/Buenos_Aires'],
        ['Tandil', 'AR', -37.32, -59.13, 'America/Argentina/Buenos_Aires'],
        ['Azul', 'AR', -36.78, -59.86, 'America/Argentina/Buenos_Aires'],
        ['Olavarría', 'AR', -36.89, -60.32, 'America/Argentina/Buenos_Aires'],
        ['Bahía Blanca', 'AR', -38.72, -62.27, 'America/Argentina/Buenos_Aires'],
        ['Santa Rosa', 'AR', -36.62, -64.29, 'America/Argentina/Buenos_Aires'],
        ['Rosario', 'AR', -32.95, -60.65, 'America/Argentina/Buenos_Aires'],
        ['Córdoba', 'AR', -31.42, -64.18, 'America/Argentina/Buenos_Aires'],
        ['Mendoza', 'AR', -32.89, -68.84, 'America/Argentina/Buenos_Aires'],
        ['Neuquén', 'AR', -38.95, -68.06, 'America/Argentina/Buenos_Aires'],
        ['Viedma', 'AR', -40.81, -63.00, 'America/Argentina/Buenos_Aires'],
        ['San Carlos de Bariloche', 'AR', -41.13, -71.31, 'America/Argentina/Buenos_Aires'],
        ['Comodoro Rivadavia', 'AR', -45.86, -67.48, 'America/Argentina/Buenos_Aires'],
        ['Salta', 'AR', -24.79, -65.41, 'America/Argentina/Buenos_Aires'],
        ['Ushuaia', 'AR', -54.80, -68.30, 'America/Argentina/Buenos_Aires'],
        ['Santiago', 'CL', -33.45, -70.67, 'America/Santiago'],
        ['Valparaíso', 'CL', -33.05, -71.62, 'America/Santiago'],
        ['Concepción', 'CL', -36.83, -73.05, 'America/Santiago'],
        ['Temuco', 'CL', -38.74, -72.59, 'America/Santiago'],
        ['Valdivia', 'CL', -39.81, -73.25, 'America/Santiago'],
        ['Puerto Montt', 'CL', -41.47, -72.94, 'America/Santiago'],
        ['Castro', 'CL', -42.48, -73.76, 'America/Santiago'],
        ['Coyhaique', 'CL', -45.57, -72.07, 'America/Santiago'],
        ['Punta Arenas', 'CL', -53.16, -70.91, 'America/Punta_Arenas'],
        ['Chuí', 'BR', -33.69, -53.46, 'America/Sao_Paulo'],
        ['Rio Grande', 'BR', -32.03, -52.10, 'America/Sao_Paulo'],
        ['Pelotas', 'BR', -31.77, -52.34, 'America/Sao_Paulo'],
        ['Porto Alegre', 'BR', -30.03, -51.23, 'America/Sao_Paulo'],
        ['Florianópolis', 'BR', -27.60, -48.55, 'America/Sao_Paulo'],
        ['Curitiba', 'BR', -25.43, -49.27, 'America/Sao_Paulo'],
        ['São Paulo', 'BR', -23.55, -46.63, 'America/Sao_Paulo'],
        ['Rio de Janeiro', 'BR', -22.91, -43.17, 'America/Sao_Paulo'],
        ['Brasília', 'BR', -15.79, -47.88, 'America/Sao_Paulo'],
        ['Salvador', 'BR', -12.97, -38.50, 'America/Bahia'],
        ['Recife', 'BR', -8.05, -34.88, 'America/Recife'],
        ['Asunción', 'PY', -25.28, -57.63, 'America/Asuncion'],
        ['La Paz', 'BO', -16.50, -68.15, 'America/La_Paz'],
        ['Lima', 'PE', -12.05, -77.04, 'America/Lima'],
        ['Stanley', 'FK', -51.70, -57.85, 'Atlantic/Stanley'],
        ['Dakar', 'SN', 14.69, -17.45, 'Africa/Dakar'],
        ['Freetown', 'SL', 8.48, -13.23, 'Africa/Freetown'],
        ['Monrovia', 'LR', 6.30, -10.80, 'Africa/Monrovia'],
        ['Abidjan', 'CI', 5.35, -4.02, 'Africa/Abidjan'],
        ['Accra', 'GH', 5.56, -0.20, 'Africa/Accra'],
        ['Lomé', 'TG', 6.13, 1.22, 'Africa/Lome'],
        ['Cotonou', 'BJ', 6.37, 2.42, 'Africa/Porto-Novo'],
        ['Lagos', 'NG', 6.45, 3.39, 'Africa/Lagos'],
        ['Kinshasa', 'CD', -4.32, 15.31, 'Africa/Kinshasa'],
        ['Luanda', 'AO', -8.84, 13.23, 'Africa/Luanda'],
        ['Cape Town', 'ZA', -33.92, 18.42, 'Africa/Johannesburg']
    ];
    const cityLabel = (c) => c[0] + ' (' + c[1] + ')';

    let site = null;                       // { kind: 'city' | 'gps', city?, lat, lon, tz, obs }
    let circ = null;                       // circunstancias locales (EclipseCalc.local)
    let tC1, tC2, tMax, tC3, tC4;          // contactos del lugar elegido (ms UT; null si no ocurren)

    /** Calcula el eclipse para un lugar y lo deja como lugar actual (sin tocar la pantalla). */
    function computeSite(next) {
        site = next;
        circ = EclipseCalc.local(site.lat, site.lon);
        site.obs = circ.obs;
        tC1 = circ.c1; tC2 = circ.c2; tMax = circ.max; tC3 = circ.c3; tC4 = circ.c4;
    }
    const siteFromCity = (c) => ({ kind: 'city', city: c, lat: c[2], lon: c[3], tz: c[4] });

    /** Ciudad de la lista más cercana a un punto y su distancia en km. */
    function nearestCity(lat, lon) {
        const rad = Math.PI / 180;
        let best = null, bestKm = Infinity;
        CITIES.forEach(c => {
            const dLat = (c[2] - lat) * rad, dLon = (c[3] - lon) * rad;
            const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat * rad) * Math.cos(c[2] * rad) * Math.sin(dLon / 2) ** 2;
            const km = 12742 * Math.asin(Math.sqrt(h));
            if (km < bestKm) { bestKm = km; best = c; }
        });
        return { city: best, km: bestKm };
    }

    // Lugar guardado de una visita anterior, o Punta del Este
    (function restoreSite() {
        let saved = null;
        try { saved = JSON.parse(store.get('eclipse.site') || 'null'); } catch (e) { /* dato inválido */ }
        if (saved && saved.kind === 'gps' && isFinite(saved.lat) && isFinite(saved.lon)) {
            computeSite({ kind: 'gps', lat: +saved.lat, lon: +saved.lon, tz: undefined });
        } else {
            const c = saved && saved.kind === 'city' && CITIES.find(x => cityLabel(x) === saved.name);
            computeSite(siteFromCity(c || CITIES[0]));
        }
    })();

    /* Vista del Sol: la posición y el tamaño de la Luna salen del mismo cálculo
       (js/eclipse.js) y se dibujan como se ven en el cielo del lugar, con el cenit
       hacia arriba. Fuera de las horas del eclipse solo se dibuja el Sol. */
    const ECLIPSE_T0 = EclipseCalc.elements.t0;

    /* Imagen real del Sol (SDO/HMI, luz visible). Las imágenes de SDO traen el norte
       solar hacia arriba; aquí se giran para mostrarlas como se ve el Sol en el cielo
       del lugar elegido (arriba = cenit): giro = ángulo paraláctico − ángulo P.
       P ≈ −13,6° es la inclinación del eje solar el 6 de febrero (valor aproximado). */
    const SUN_P_ANGLE = -13.6;
    const SUN_LIVE_URL = 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_HMIIC.jpg';
    const SUN_LIVE_RATIO = 0.941;          // radio del disco / mitad del ancho en la imagen de 1024 px (febrero)
    const SUN_BUNDLED_DATE = Date.UTC(2026, 10, 16, 16, 10); // fecha de la imagen incluida en la app
    const sunImage = { live: false };
    function drawDisc(svg, ms) {
        const img = svg.querySelector('.sun-img');
        const moon = svg.querySelector('.moon');
        const during = Math.abs(ms - ECLIPSE_T0) < 5 * 3600000;   // los elementos solo valen cerca del eclipse
        const v = during ? EclipseCalc.view(site.obs, ms) : null;
        const q = v ? v.q : sunAltAz(ms).q;
        if (img) img.setAttribute('transform', 'rotate(' + (q - SUN_P_ANGLE).toFixed(1) + ')');
        if (!v) { moon.setAttribute('cx', '-400'); moon.setAttribute('cy', '0'); return; }
        // Ángulo de posición de la Luna (desde el norte hacia el este) llevado a «cenit arriba»
        const dist = Math.min(4, Math.hypot(v.east, v.north));
        const ang = (Math.atan2(v.east, v.north) * 180 / Math.PI - v.q) * Math.PI / 180;
        moon.setAttribute('r', (100 * v.ratio).toFixed(2));
        moon.setAttribute('cx', (-Math.sin(ang) * dist * 100).toFixed(2));
        moon.setAttribute('cy', (-Math.cos(ang) * dist * 100).toFixed(2));
    }

    /* Altura y acimut del Sol en el lugar elegido (fórmulas de baja precisión del
       Astronomical Almanac, error menor que 0,1°; suficiente para mostrar grados enteros). */
    function sunAltAz(ms) {
        const rad = Math.PI / 180;
        const d = ms / 86400000 - 10957.5;                      // días desde J2000.0
        const g = (357.529 + 0.98560028 * d) * rad;
        const L = (280.459 + 0.98564736 * d + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad;
        const e = (23.439 - 0.00000036 * d) * rad;
        const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
        const dec = Math.asin(Math.sin(e) * Math.sin(L));
        const gmst = (18.697374558 + 24.06570982441908 * d) * 15; // grados
        const ha = (gmst + site.lon) * rad - ra;
        const lat = site.lat * rad;
        const alt = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha));
        const az = Math.atan2(-Math.sin(ha), Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(ha));
        // Ángulo paraláctico: giro del norte celeste respecto de la vertical del lugar
        const q = Math.atan2(Math.sin(ha), Math.tan(lat) * Math.cos(dec) - Math.sin(dec) * Math.cos(ha));
        return { alt: alt / rad, az: ((az / rad) % 360 + 360) % 360, q: q / rad };
    }

    let audioCtx;
    let isPlaying = false;   // la experiencia en vivo está iniciada
    let isPaused = false;    // iniciada, pero con el sonido en pausa
    let lastAnnouncedPercent = -1;
    let lastAnnouncedPhase = '';
    let lastEvalTime = Date.now();

    /** Relato: con la voz activada habla la app; si no, avisa el lector de pantalla. */
    function speak(text) {
        if (!voiceToggle.checked) { announce(text); return; }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = langInfo().voice;
            window.speechSynthesis.speak(u);
        }
    }

    function ensureAudio() {
        if (!audioCtx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AC();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    /* ---------------------------------------------------------------------
       Motor de sonido
       - «Notas melódicas»: una nota breve cada 0,4 s. Las notas varían solo
         ±2 semitonos alrededor del tono base, para que se perciba con claridad
         la tendencia (bajar con la oscuridad, subir con la luz).
       - «Tono continuo»: un único sonido sostenido que se desliza suavemente.
       - Campanita: marca inconfundible del anillo de fuego (anularidad).
       --------------------------------------------------------------------- */
    const NOTE_RATIOS = [0.891, 1, 1.122]; // −2, 0 y +2 semitonos
    const sound = {
        mode: store.get('eclipse.soundMode') === 'tone' ? 'tone' : 'notes',
        lastNote: 0,
        lastChime: 0,
        toneOsc: null,
        toneGain: null,

        /** Llamar en cada cuadro: frecuencia base y si debe sonar en este momento. */
        update(freq, active) {
            if (!audioCtx) return;
            if (this.mode === 'tone') {
                this.ensureTone();
                const now = audioCtx.currentTime;
                this.toneOsc.frequency.setTargetAtTime(freq, now, 0.25);
                this.toneGain.gain.setTargetAtTime(active ? 0.09 : 0, now, active ? 0.15 : 0.08);
            } else {
                this.silenceTone();
                if (active && Date.now() - this.lastNote > 400) {
                    this.note(freq * NOTE_RATIOS[Math.floor(Math.random() * NOTE_RATIOS.length)]);
                    this.lastNote = Date.now();
                }
            }
        },

        note(freq) {
            const t0 = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t0);
            g.gain.setValueAtTime(0, t0);
            g.gain.linearRampToValueAtTime(0.2, t0 + 0.1);
            g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5);
            osc.connect(g); g.connect(audioCtx.destination);
            osc.start(t0); osc.stop(t0 + 0.5);
        },

        ensureTone() {
            if (this.toneOsc) return;
            this.toneOsc = audioCtx.createOscillator();
            this.toneGain = audioCtx.createGain();
            this.toneOsc.type = 'triangle';
            this.toneGain.gain.value = 0;
            this.toneOsc.connect(this.toneGain); this.toneGain.connect(audioCtx.destination);
            this.toneOsc.start();
        },

        silenceTone() {
            if (this.toneGain) this.toneGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.08);
        },

        /** Campanita suave (dos parciales tipo campana con caída lenta). */
        chime() {
            const t0 = audioCtx.currentTime;
            [[1318.5, 0.12], [1975.5, 0.06], [2637, 0.03]].forEach(([f, vol]) => {
                const osc = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, t0);
                g.gain.setValueAtTime(0, t0);
                g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
                g.gain.exponentialRampToValueAtTime(0.0005, t0 + 1.6);
                osc.connect(g); g.connect(audioCtx.destination);
                osc.start(t0); osc.stop(t0 + 1.7);
            });
        },

        /** Dos notas breves: ascendentes al reanudar el sonido, descendentes al pausarlo. */
        earcon(up) {
            if (!audioCtx) return;
            const t0 = audioCtx.currentTime;
            (up ? [523.25, 783.99] : [783.99, 523.25]).forEach((f, i) => {
                const osc = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                const s = t0 + i * 0.12;
                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, s);
                g.gain.setValueAtTime(0, s);
                g.gain.linearRampToValueAtTime(0.15, s + 0.015);
                g.gain.exponentialRampToValueAtTime(0.0005, s + 0.18);
                osc.connect(g); g.connect(audioCtx.destination);
                osc.start(s); osc.stop(s + 0.2);
            });
        },

        /** Durante la anularidad, una campanita cada «every» ms (la primera, de inmediato). */
        annular(isAnnular, active, every) {
            if (!isAnnular || !active) { if (!isAnnular) this.lastChime = 0; return; }
            if (Date.now() - this.lastChime > every) { this.chime(); this.lastChime = Date.now(); }
        }
    };

    /* Vibración en los cambios de fase (Android; los navegadores de iPhone no la permiten).
       El anillo de fuego tiene un patrón propio, más largo, para reconocerlo al tacto. */
    const PHASE_BUZZ = {
        'phase.partialIn':  [200],
        'phase.annular':    [300, 120, 300, 120, 300],
        'phase.partialOut': [200],
        'phase.after':      [200, 120, 200]
    };
    function buzz(pattern) {
        if (!pattern || !('vibrate' in navigator)) return;
        try { navigator.vibrate(pattern); } catch (e) { /* sin vibración */ }
    }
    const COVERAGE_MILESTONES = [25, 50, 75];

    /** Frecuencia base: 110 Hz (grave/oscuro) a 880 Hz (agudo/claro). */
    const freqFromLight = (lightFactor) => 110 + lightFactor * 770;

    function getCountdownText(nowMs, targetMs) {
        const diff = targetMs - nowMs;
        if (diff <= 0) return t('cd.starting');
        let days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const parts = [];
        if (days >= 30) { // meses aproximados a 30 días para lectura fácil
            const months = Math.floor(days / 30);
            days = days % 30;
            parts.push(months + ' ' + t(months > 1 ? 'u.months' : 'u.month'));
        }
        if (days > 0) parts.push(days + ' ' + t(days > 1 ? 'u.days' : 'u.day'));
        if (hours > 0) parts.push(hours + ' ' + t('u.h'));
        if (minutes > 0) parts.push(minutes + ' ' + t('u.min'));
        return t('cd.left', { x: parts.join(', ') });
    }

    /** Fase y porcentaje del área del Sol cubierta, en el lugar elegido. */
    function calculateAstronomicalData(timeMs) {
        if (circ.type === 'none') return { coverage: 0, phaseKey: 'phase.none' };
        if (timeMs < tC1) return { coverage: 0, phaseKey: 'phase.before' };
        if (timeMs > tC4) return { coverage: 0, phaseKey: 'phase.after' };
        const coverage = EclipseCalc.view(site.obs, timeMs).obscuration * 100;
        let phaseKey;
        if (circ.type === 'annular' && timeMs >= tC2 && timeMs <= tC3) phaseKey = 'phase.annular';
        else phaseKey = timeMs < tMax ? 'phase.partialIn' : 'phase.partialOut';
        return { coverage, phaseKey };
    }

    const getEvalTime = () => Date.now();

    /** Línea de crédito bajo la vista del Sol. */
    function renderSunCredit() {
        const txt = sunImage.live
            ? t('sky.credit.live')
            : t('sky.credit', { d: dtf({ day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(SUN_BUNDLED_DATE) });
        document.querySelectorAll('.sun-credit').forEach(el => setText(el, txt));
    }
    // Si la imagen no carga (archivo faltante), se oculta y queda el disco liso
    document.querySelectorAll('.sun-img').forEach(img =>
        img.addEventListener('error', () => { img.style.display = 'none'; }));

    /* El día del eclipse (6 de febrero de 2027, hora de Uruguay), si hay conexión, se
       reemplaza la imagen incluida por la más reciente de SDO y se vuelve a pedir cada
       15 minutos. Si la descarga falla, queda la imagen que ya estaba. */
    const ECLIPSE_DAY_START = Date.UTC(2027, 1, 6, 3, 0, 0);
    const ECLIPSE_DAY_END = ECLIPSE_DAY_START + 86400000;
    function refreshSunImage() {
        const now = Date.now();
        if (now < ECLIPSE_DAY_START || now >= ECLIPSE_DAY_END || navigator.onLine === false) return;
        const url = SUN_LIVE_URL + '?t=' + Math.floor(now / 900000);
        const probe = new Image();
        probe.onload = () => {
            const size = (2 * 100.6 / SUN_LIVE_RATIO).toFixed(1);
            document.querySelectorAll('.sun-img').forEach(img => {
                img.setAttribute('href', url);
                ['width', 'height'].forEach(a => img.setAttribute(a, size));
                ['x', 'y'].forEach(a => img.setAttribute(a, (-size / 2).toFixed(1)));
                img.style.display = '';
            });
            sunImage.live = true;
            renderSunCredit();
        };
        probe.src = url;
    }
    refreshSunImage();
    setInterval(refreshSunImage, 900000);
    window.addEventListener('online', refreshSunImage);

    const live = { disc: $('live-disc'), lastKey: '' };
    const fmtClock = (ms) => dtf({ timeZone: site.tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(ms);
    const fmtHM = (ms, tz) => dtf({ timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(ms);

    /** Dónde está el Sol, en palabras: «Sol: hacia el noreste, a 57° de altura». */
    const COMPASS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
    function sunLine(ms) {
        const sun = sunAltAz(ms);
        if (sun.alt < 0) return t('sky.sun.down');
        return t('sky.sun', { dir: t('dir.' + COMPASS[Math.round(sun.az / 45) % 8]), alt: Math.round(sun.alt) });
    }

    /** Panel «En vivo»: se redibuja como mucho una vez por segundo. */
    function renderSonification(evalTime) {
        const astro = calculateAstronomicalData(evalTime);
        const key = Math.floor(evalTime / 1000) + lang;
        if (key === live.lastKey) return astro;
        live.lastKey = key;
        setText(displayTime, fmtClock(evalTime));
        setText(displayCoverage, Math.round(astro.coverage) + '%');
        drawDisc(live.disc, evalTime);
        setText($('live-sun'), sunLine(evalTime));
        if (circ.type !== 'none' && evalTime < tC1) {
            const cd = getCountdownText(evalTime, tC1);
            const span = displayPhase.querySelector('.countdown-text');
            if (!span || displayPhase.firstChild.nodeValue !== t('phase.before')) {
                displayPhase.textContent = t('phase.before');
                const s = document.createElement('span');
                s.className = 'countdown-text';
                s.textContent = cd;
                displayPhase.appendChild(s);
            } else setText(span, cd);
        } else {
            setText(displayPhase, t(astro.phaseKey));
        }
        return astro;
    }
    // El reloj y la cuenta regresiva se ven siempre, aunque no se haya iniciado el sonido
    setInterval(() => { if (!isPlaying && !document.hidden) renderSonification(Date.now()); }, 1000);

    function updateLoop() {
        if (!isPlaying) return;
        if (eco.busy() && !isPaused) { requestAnimationFrame(updateLoop); return; } // la vista previa usa el sonido
        const evalTime = getEvalTime();
        lastEvalTime = evalTime;
        const astro = renderSonification(evalTime);
        const covRound = Math.round(astro.coverage);

        // En pausa solo se actualiza la pantalla: ni sonido ni relato. Al reanudar,
        // si la fase cambió mientras tanto, se anuncia en ese momento.
        if (!isPaused) {
            // Relato por voz: solo momentos clave (cambios de fase y 25 %, 50 %, 75 % de cobertura).
            // El resto lo pide la persona cuando quiere con el botón «¿Cómo va el eclipse?».
            if (astro.phaseKey !== lastAnnouncedPhase) {
                if (astro.phaseKey === 'phase.none') speak(t('how.none'));
                else if (astro.phaseKey === 'phase.before') speak(t('speak.waiting'));
                else speak(t('speak.phase', { phase: t(astro.phaseKey) }));
                if (lastAnnouncedPhase) buzz(PHASE_BUZZ[astro.phaseKey]);
                lastAnnouncedPhase = astro.phaseKey;
            }
            if (COVERAGE_MILESTONES.includes(covRound) && covRound !== lastAnnouncedPercent) {
                speak(t('speak.coverage', { n: covRound }));
                lastAnnouncedPercent = covRound;
            } else if (lastAnnouncedPercent > 0 && Math.abs(covRound - lastAnnouncedPercent) > 5) {
                lastAnnouncedPercent = -1; // permite anunciar tanto al subir como al bajar
            }
        }
        sound.update(freqFromLight(1 - astro.coverage / 100), !isPaused);
        sound.annular(astro.phaseKey === 'phase.annular', !isPaused, 4000);
        requestAnimationFrame(updateLoop);
    }

    /* Mantiene la pantalla encendida durante la experiencia: si el teléfono se
       bloquea, el navegador detiene el sonido. (Donde no existe la función, no pasa nada.) */
    let wakeLock = null;
    async function keepScreenOn() {
        if (!('wakeLock' in navigator) || wakeLock) return;
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => { wakeLock = null; });
        } catch (e) { /* batería baja o permiso denegado */ }
    }
    document.addEventListener('visibilitychange', () => {
        if (isPlaying && !isPaused && document.visibilityState === 'visible') keepScreenOn();
    });

    /** Refleja el estado en el botón principal y en el indicador. */
    function renderLiveState() {
        setI18n(btnStart, !isPlaying ? 'son.start' : (isPaused ? 'son.resume' : 'son.pause'));
        btnStart.classList.toggle('is-active', isPlaying && !isPaused);
        statusSound.classList.toggle('hidden', !isPlaying);
        setI18n(statusSound, isPaused ? 'son.paused' : 'son.on');
        statusSound.className = 'status-indicator ' + (isPaused ? 'status-bad' : 'status-good') + (isPlaying ? '' : ' hidden');
    }

    /* Un solo botón: inicia la experiencia y, después, pausa o reanuda el sonido.
       El sonido no depende de la posición del teléfono. */
    btnStart.addEventListener('click', () => {
        ensureAudio();
        if (eco.running) eco.stop(false);
        if (!isPlaying) {
            isPlaying = true;
            isPaused = false;
            renderLiveState();
            keepScreenOn();
            speak(t('speak.started'));
            requestAnimationFrame(updateLoop);
            return;
        }
        isPaused = !isPaused;
        renderLiveState();
        if (isPaused) {
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
            sound.silenceTone();
            sound.earcon(false);
            if (wakeLock) wakeLock.release().catch(() => {});
            announce(t('son.paused'));
        } else {
            sound.earcon(true);
            keepScreenOn();
            announce(t('son.on'));
        }
    });

    /* ---------------------------------------------------------------------
       Tipo de sonido: notas melódicas o tono continuo (se recuerda la elección)
       --------------------------------------------------------------------- */
    document.getElementsByName('sound-mode').forEach(radio => {
        radio.checked = radio.value === sound.mode;
        radio.addEventListener('change', (e) => {
            sound.mode = e.target.value;
            store.set('eclipse.soundMode', sound.mode);
        });
    });

    /* ---------------------------------------------------------------------
       Sección «Escuchar»: el eclipse en 1 minuto, con la vista del Sol
       Todo el eclipse comprimido para aprender a reconocer los sonidos antes
       del día real. No exige apoyar el teléfono (sirve también en PC/laptop).
       El tiempo no se comprime de forma uniforme: la anularidad dura 5 minutos
       de un total de casi 3,5 h, así que se le da más tiempo para que se
       escuche la campanita. La línea de tiempo permite además detenerse en
       cualquier momento: al moverla suena y se dibuja ese instante.
       --------------------------------------------------------------------- */
    const btnPreview = $('btn-preview');
    const eco = {
        running: false,
        timers: [],
        // [segundo de la vista previa, instante real del eclipse]; lo arma rebuild()
        map: [],
        pos: 0,          // segundo actual de la vista previa
        t0: 0,
        lastPhase: '',
        scrubUntil: 0,
        scrubTimer: 0,
        range: $('eco-range'),
        disc: $('eco-disc'),
        get end() { return this.map[this.map.length - 1][0]; },

        /** ¿Está usando el sonido? (el bucle «En vivo» espera mientras tanto) */
        busy() { return this.running || performance.now() < this.scrubUntil; },

        eclipseTimeAt(sec) {
            const m = this.map;
            for (let i = 1; i < m.length; i++) {
                if (sec <= m[i][0]) {
                    const f = (sec - m[i - 1][0]) / (m[i][0] - m[i - 1][0]);
                    return m[i - 1][1] + f * (m[i][1] - m[i - 1][1]);
                }
            }
            return m[m.length - 1][1];
        },
        secAt(ms) {
            const m = this.map;
            for (let i = 1; i < m.length; i++) {
                if (ms <= m[i][1]) {
                    const f = (ms - m[i - 1][1]) / (m[i][1] - m[i - 1][1]);
                    return Math.max(0, m[i - 1][0] + f * (m[i][0] - m[i - 1][0]));
                }
            }
            return this.end;
        },

        /** Reparte el minuto según los contactos del lugar elegido. */
        rebuild() {
            const m10 = 10 * 60000;
            if (circ.type === 'annular') {
                this.map = [[0, tC1 - m10], [8, tC1], [28, tC2], [36, tC3], [56, tC4], [62, tC4 + m10]];
            } else if (circ.type === 'partial') {
                this.map = [[0, tC1 - m10], [8, tC1], [32, tMax], [56, tC4], [62, tC4 + m10]];
            } else {  // sin eclipse en este lugar: se recorre igual el horario de referencia
                this.map = [[0, PDE.c1 - m10], [62, PDE.c4 + m10]];
            }
            this.pos = 0;
            this.lastKey = '';
        },

        renderStatic() {
            $('eco-tick-start').textContent = fmtHM(this.map[0][1], site.tz);
            $('eco-tick-end').textContent = fmtHM(this.map[this.map.length - 1][1], site.tz);
        },

        /** Dibuja el instante actual. El Sol se mueve en cada cuadro; los textos, solo si cambian. */
        render() {
            const ms = this.eclipseTimeAt(this.pos);
            const astro = calculateAstronomicalData(ms);
            drawDisc(this.disc, ms);
            const hhmm = fmtHM(ms, site.tz);
            const cov = Math.round(astro.coverage);
            const key = hhmm + cov + astro.phaseKey + lang;
            if (key !== this.lastKey) {
                this.lastKey = key;
                setText($('eco-time'), hhmm);
                setText($('eco-sun'), sunLine(ms));
                setText($('eco-coverage'), cov + '%');
                setText($('eco-phase'), t(astro.phaseKey));
                this.range.setAttribute('aria-valuetext',
                    hhmm + '. ' + t(astro.phaseKey) + '. ' + t('speak.coverage', { n: cov }));
            }
            const v = String(Math.round(this.pos * 10));
            if (this.range.value !== v) this.range.value = v;
            return astro;
        },

        start() {
            ensureAudio();
            clearTimeout(this.scrubTimer);
            if (this.pos >= this.end - 0.05) this.pos = 0;
            this.running = true;
            this.lastPhase = '';
            setI18n(btnPreview, 'prev.stop');
            btnPreview.classList.add('is-running');
            const begin = () => {
                if (!this.running || this.t0) return;
                this.t0 = performance.now() - this.pos * 1000;
                requestAnimationFrame(() => this.loop());
            };
            this.t0 = 0;
            if (this.pos > 0.05) { begin(); return; } // se retoma desde donde estaba, sin introducción
            // Primero la explicación; los sonidos empiezan cuando termina (o a los 9 s como máximo).
            if (voiceToggle.checked && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const u = new SpeechSynthesisUtterance(t('prev.intro'));
                u.lang = langInfo().voice;
                u.onend = () => this.timers.push(setTimeout(begin, 300));
                window.speechSynthesis.speak(u);
                this.timers.push(setTimeout(begin, 9000));
            } else {
                announce(t('prev.intro'));
                this.timers.push(setTimeout(begin, 4500)); // tiempo para que el lector lo lea
            }
        },

        loop() {
            if (!this.running) return;
            const sec = (performance.now() - this.t0) / 1000;
            if (sec >= this.end) {
                this.pos = this.end;
                this.render();
                this.stop(false);
                speak(t('prev.end'));
                return;
            }
            this.pos = sec;
            const astro = this.render();
            if (astro.phaseKey !== this.lastPhase) {
                if (this.lastPhase) { speak(t(astro.phaseKey)); buzz(PHASE_BUZZ[astro.phaseKey]); } // relato breve: solo el nombre de la fase
                this.lastPhase = astro.phaseKey;
            }
            sound.update(freqFromLight(1 - astro.coverage / 100), true);
            sound.annular(astro.phaseKey === 'phase.annular', true, 2000);
            requestAnimationFrame(() => this.loop());
        },

        /** Detiene la vista previa en el punto actual. «byUser»: se avisa que se detuvo. */
        stop(byUser) {
            const was = this.running;
            this.running = false;
            this.t0 = 0;
            this.timers.forEach(clearTimeout); this.timers = [];
            if (audioCtx) sound.silenceTone();
            sound.annular(false, false, 0);
            setI18n(btnPreview, 'prev.btn');
            btnPreview.classList.remove('is-running');
            if (byUser && was) {
                if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                announce(t('prev.stopped'));
            }
        },

        /** Lleva la vista a un segundo dado y hace sonar brevemente ese instante. */
        seek(sec) {
            if (this.running) { this.stop(false); if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }
            this.pos = Math.max(0, Math.min(this.end, sec));
            const astro = this.render();
            ensureAudio();
            this.scrubUntil = performance.now() + 900;
            sound.update(freqFromLight(1 - astro.coverage / 100), true);
            if (astro.phaseKey === 'phase.annular') sound.annular(true, true, 1500);
            else sound.annular(false, false, 0);
            clearTimeout(this.scrubTimer);
            this.scrubTimer = setTimeout(() => { if (!this.running && audioCtx) sound.silenceTone(); }, 700);
            return astro;
        },

        /** Botones «Inicio», «Máximo» y «Fin»: saltan y lo avisan al lector de pantalla. */
        jump(ms) {
            const astro = this.seek(this.secAt(ms));
            announce(fmtHM(ms, site.tz) + '. ' + t(astro.phaseKey) + '. ' + t('speak.coverage', { n: Math.round(astro.coverage) }));
        }
    };
    btnPreview.addEventListener('click', () => {
        if (eco.running) eco.stop(true); else eco.start();
    });
    eco.range.addEventListener('input', () => eco.seek(parseInt(eco.range.value, 10) / 10));
    eco.rebuild();
    $('eco-go-start').addEventListener('click', () => eco.jump(tC1 || PDE.c1));
    $('eco-go-max').addEventListener('click', () => eco.jump(tMax || PDE.max));
    $('eco-go-end').addEventListener('click', () => eco.jump(tC4 || PDE.c4));

    /* ---------------------------------------------------------------------
       «¿Cómo va el eclipse?»: estado actual a pedido (fase, cobertura y
       cuánto falta para el próximo momento clave), según la hora real.
       --------------------------------------------------------------------- */
    function spokenDuration(ms) {
        if (ms < 60000) return t('u.lessMin');
        let min = Math.round(ms / 60000);
        let days = Math.floor(min / 1440); min -= days * 1440;
        const hours = Math.floor(min / 60); min -= hours * 60;
        const parts = [];
        if (days >= 30) {
            const months = Math.floor(days / 30); days %= 30;
            parts.push(months + ' ' + t(months > 1 ? 'u.months' : 'u.month'));
        }
        if (days > 0) parts.push(days + ' ' + t(days > 1 ? 'u.days' : 'u.day'));
        if (days < 1 && hours > 0) parts.push(hours + ' ' + t(hours > 1 ? 'u.hours' : 'u.hour'));
        if (parts.length < 2 && days < 1 && min > 0) parts.push(min + ' ' + t(min > 1 ? 'u.minutes' : 'u.minute'));
        return parts.length > 1 ? parts.slice(0, -1).join(', ') + ' ' + t('u.and') + ' ' + parts[parts.length - 1] : parts[0];
    }

    function statusReport() {
        const now = getEvalTime();
        const astro = calculateAstronomicalData(now);
        const n = Math.round(astro.coverage);
        switch (astro.phaseKey) {
            case 'phase.before':     return t('how.before', { d: spokenDuration(tC1 - now) });
            case 'phase.none':       return t('how.none');
            case 'phase.partialIn':  return circ.type === 'annular'
                ? t('how.partialIn', { n, d: spokenDuration(tC2 - now) })
                : t('how.partialIn.max', { n, d: spokenDuration(tMax - now) });
            case 'phase.annular':    return t('how.annular', { n, d: spokenDuration(tC3 - now) });
            case 'phase.partialOut': return t('how.partialOut', { n, d: spokenDuration(tC4 - now) });
            default:                 return t('how.after');
        }
    }
    $('btn-how').addEventListener('click', () => speak(statusReport()));

    /* ---------------------------------------------------------------------
       Lugar: resumen, horarios, «Usar mi ubicación» y lista de ciudades
       --------------------------------------------------------------------- */
    const locCity = $('loc-city');
    const locMsg = $('loc-msg');

    function siteLabel() {
        if (site.kind === 'city') return cityLabel(site.city);
        const near = nearestCity(site.lat, site.lon);
        return near.km <= 300 ? t('loc.near', { c: cityLabel(near.city) }) : t('loc.mine');
    }
    /** Nombre corto de la zona horaria del lugar (por ejemplo «GMT−3»). */
    function tzName() {
        try {
            const part = dtf({ timeZone: site.tz, hour: '2-digit', timeZoneName: 'short' })
                .formatToParts(tMax || PDE.max).find(x => x.type === 'timeZoneName');
            return part ? part.value : '';
        } catch (e) { return ''; }
    }

    function buildCityList() {
        locCity.innerHTML = '';
        const first = document.createElement('option');
        first.value = '';
        first.setAttribute('data-i18n', 'loc.mine');
        locCity.appendChild(first);
        CITIES.forEach((c, i) => {
            const o = document.createElement('option');
            o.value = String(i);
            o.textContent = cityLabel(c);
            locCity.appendChild(o);
        });
    }

    /** Grados, minutos y segundos con su letra: 34° 36′ 13″ S */
    function dms(value, pos, neg) {
        const abs = Math.abs(value);
        let d = Math.floor(abs), m = Math.floor((abs - d) * 60), sec = Math.round(((abs - d) * 60 - m) * 60);
        if (sec === 60) { sec = 0; m += 1; }
        if (m === 60) { m = 0; d += 1; }
        return d + '° ' + String(m).padStart(2, '0') + '′ ' + String(sec).padStart(2, '0') + '″ ' + (value < 0 ? neg : pos);
    }
    /** Coordenadas de «Mi ubicación». En pantalla, completas; el lector de pantalla
        dice solo los grados enteros, sin minutos ni segundos. */
    function renderCoords() {
        const box = $('loc-coords');
        const gps = site.kind === 'gps';
        box.classList.toggle('hidden', !gps);
        if (!gps) return;
        setText($('loc-coords-v'), t('loc.coords') + ': ' + dms(site.lat, 'N', 'S') + ', ' + dms(site.lon, 'E', 'W'));
        setText($('loc-coords-sr'), t('loc.coords.sr', {
            lat: Math.floor(Math.abs(site.lat)), ns: t(site.lat < 0 ? 'dir.s' : 'dir.n'),
            lon: Math.floor(Math.abs(site.lon)), ew: t(site.lon < 0 ? 'dir.w' : 'dir.e')
        }));
    }

    function renderLoc() {
        renderCoords();
        const label = siteLabel();
        setText($('loc-name'), label);
        setText($('eco-place'), label);
        const n = Math.round(circ.obscuration * 100);
        const hm = (ms) => fmtHM(ms, site.tz);
        setText($('loc-summary'), circ.type === 'none'
            ? t('loc.type.none')
            : t(circ.type === 'annular' ? 'loc.type.annular' : 'loc.type.partial', { t: hm(tMax), n }));

        const dl = $('loc-times');
        dl.innerHTML = '';
        const rows = circ.type === 'none' ? [] : [
            ['loc.ev.c1', tC1, circ.below.c1], ['loc.ev.c2', tC2], ['loc.ev.max', tMax, circ.below.max],
            ['loc.ev.c3', tC3], ['loc.ev.c4', tC4, circ.below.c4]
        ].filter(r => r[1] != null && (circ.type === 'annular' || (r[0] !== 'loc.ev.c2' && r[0] !== 'loc.ev.c3')));
        rows.forEach(([key, ms, below]) => {
            const dt = document.createElement('dt');
            dt.textContent = t(key);
            const dd = document.createElement('dd');
            dd.className = 'num';
            dd.textContent = hm(ms) + (below ? ' (' + t('loc.below') + ')' : '');
            dl.append(dt, dd);
        });
        dl.classList.toggle('hidden', !rows.length);

        const tz = t('loc.tz', { tz: tzName() });
        setText($('loc-tz'), tz);
        setText($('live-tz'), tz);
        setText($('eco-tz'), tz);
        locCity.value = site.kind === 'city' ? String(CITIES.indexOf(site.city)) : '';
    }

    /** Cambia el lugar, recalcula todo y lo avisa. */
    function applySite(next) {
        if (eco.running) eco.stop(false);
        computeSite(next);
        store.set('eclipse.site', JSON.stringify(site.kind === 'gps'
            // En el navegador solo queda guardada con dos decimales (≈ 1 km)
            ? { kind: 'gps', lat: Math.round(site.lat * 100) / 100, lon: Math.round(site.lon * 100) / 100 }
            : { kind: 'city', name: cityLabel(site.city) }));
        eco.rebuild();
        lastAnnouncedPhase = '';
        lastAnnouncedPercent = -1;
        live.lastKey = '';
        renderLoc();
        renderSonification(Date.now());
        eco.renderStatic();
        eco.render();
        announce(siteLabel() + '. ' + $('loc-summary').textContent);
    }

    locCity.addEventListener('change', () => {
        const c = CITIES[parseInt(locCity.value, 10)];
        if (!c) { renderLoc(); return; }           // «Mi ubicación» se elige con el botón
        setText(locMsg, '');
        applySite(siteFromCity(c));
    });

    $('btn-locate').addEventListener('click', () => {
        if (!('geolocation' in navigator)) { setText(locMsg, t('loc.denied')); return; }
        setText(locMsg, t('loc.asking'));
        navigator.geolocation.getCurrentPosition((pos) => {
            setText(locMsg, '');
            // Se calcula y se muestra con la posición recibida; al guardarla se redondea (ver applySite)
            applySite({
                kind: 'gps',
                lat: pos.coords.latitude,
                lon: pos.coords.longitude,
                tz: undefined   // hora del propio dispositivo
            });
        }, () => setText(locMsg, t('loc.denied')), { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
    });

    // Desde «Escuchar»: lleva al panel de lugar de «En vivo»
    $('btn-change-place').addEventListener('click', () => {
        showTab('tab-sonificacion', false);
        const fold = $('loc-fold');
        fold.open = true;
        fold.querySelector('summary').focus();
        fold.scrollIntoView({ block: 'nearest' });
    });

    /* =====================================================================
       5. SIMULACIÓN (animación global de Espenak & Zeiler)
       ---------------------------------------------------------------------
       El GIF original (364 cuadros, 800×800 px) muestra un cuadro por minuto,
       desde las 12:58 UT hasta las 19:01 UT. Para que la app sea liviana se
       distribuye como video MP4 a 10 cuadros por segundo (mismo contenido,
       sin alteraciones): el cuadro n corresponde a 12:58 UT + n minutos.
       ===================================================================== */
    const SIM_FRAMES = 364;
    const SIM_FPS = 10;
    const SIM_START_UT = Date.UTC(2027, 1, 6, 12, 58, 0);
    const SIM_STEP_MS = 60 * 1000;
    // Momentos clave (hora UT exacta de EclipseWise / datos de Punta del Este)
    const ut = (h, m, s) => Date.UTC(2027, 1, 6, h, m, s);
    const MOMENTS = [
        { key: 'm.p1',     at: ut(12, 57, 34) },
        { key: 'm.pde1',   at: PDE.c1 },
        { key: 'm.u1',     at: ut(14, 3, 53) },
        { key: 'm.pdemax', at: PDE.max },
        { key: 'm.max',    at: ut(15, 59, 35) },
        { key: 'm.pde4',   at: PDE.c4 },
        { key: 'm.u4',     at: ut(17, 55, 24) },
        { key: 'm.p4',     at: ut(19, 1, 37) }
    ];

    const sim = (() => {
        const video = $('sim-video');
        const range = $('sim-range');
        const btnPlay = $('sim-play');
        const loading = $('sim-loading');
        let frame = 0;
        let activated = false;
        let failed = false;
        let ready = false;
        let rafId = 0;

        const frameTime = (i) => SIM_START_UT + i * SIM_STEP_MS;
        const fmt = (opts) => dtf(opts);
        const fmtTime = (ms, tz) => fmt({ timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(ms);
        const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

        function renderClock() {
            const ms = frameTime(frame);
            $('sim-date').textContent = cap(fmt({ timeZone: GMT3, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(ms));
            $('sim-time').textContent = fmtTime(ms, GMT3);
            $('sim-ut').textContent = t('sim.ut', { t: fmtTime(ms, 'UTC') });
            range.setAttribute('aria-valuetext', fmtTime(ms, GMT3) + ', ' + t('sim.tz') + '. Punta del Este: ' + t(pdePhase(ms)));
        }

        function renderStatic() {
            $('sim-tick-start').textContent = fmtTime(frameTime(0), GMT3);
            $('sim-tick-end').textContent = fmtTime(frameTime(SIM_FRAMES - 1), GMT3);
            $('sim-ref').textContent = t('sim.ref', {
                c1: fmtTime(PDE.c1, GMT3), max: fmtTime(PDE.max, GMT3), c4: fmtTime(PDE.c4, GMT3)
            });
            if (failed) showMessage(failKey());
        }

        function renderMoments() {
            const ul = $('sim-moments');
            ul.innerHTML = '';
            MOMENTS.forEach(m => {
                const li = document.createElement('li');
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'moment-btn';
                const time = document.createElement('span');
                time.className = 'moment-time';
                const shown = Math.round(m.at / 60000) * 60000; // misma hora que muestra el reloj de la animación
                time.textContent = fmtTime(shown, GMT3);
                const txt = document.createElement('span');
                txt.textContent = t(m.key, { a: fmtTime(PDE.c2, GMT3), b: fmtTime(PDE.c3, GMT3) });
                b.append(time, ' ', txt);
                b.addEventListener('click', () => {
                    pause();
                    setFrame(Math.round((m.at - SIM_START_UT) / SIM_STEP_MS), false, false);
                    announce(fmtTime(shown, GMT3) + ', ' + t('sim.tz') + '. ' + txt.textContent);
                    const stage = $('sim-stage');
                    const r = stage.getBoundingClientRect();
                    if (r.bottom < 0 || r.top > window.innerHeight) stage.scrollIntoView({ block: 'nearest' });
                });
                li.appendChild(b);
                ul.appendChild(li);
            });
        }

        /** Texto para el lector de pantalla: hora y qué ocurre en Punta del Este. */
        function describeFrame() {
            const ms = frameTime(frame);
            return t('sim.announce', { t: fmtTime(ms, GMT3), phase: t(pdePhase(ms)) });
        }

        function isVideoPlaying() { return !video.paused && !video.ended; }

        function renderPlayButton() {
            const playing = isVideoPlaying();
            btnPlay.innerHTML = '<span aria-hidden="true">' + (playing ? '⏸\uFE0E' : '▶\uFE0E') + '</span>';
            btnPlay.setAttribute('aria-label', t(playing ? 'sim.pause' : 'sim.play'));
            btnPlay.title = t(playing ? 'sim.pause' : 'sim.play');
        }

        /* say: true = anunciar la hora al lector de pantalla (pasos con botones o teclado) */
        function setFrame(i, fromVideo, say) {
            i = Math.max(0, Math.min(SIM_FRAMES - 1, i | 0));
            const changed = i !== frame;
            frame = i;
            if (String(range.value) !== String(i)) range.value = i;
            if (changed || !fromVideo) renderClock();
            if (say) announce(describeFrame());
            if (!fromVideo && ready) {
                const target = (i + 0.5) / SIM_FPS;
                video.currentTime = Math.min(target, Math.max(0, (video.duration || target) - 0.001));
            }
        }

        function frameFromVideo() {
            return Math.floor(video.currentTime * SIM_FPS + 1e-3);
        }

        function tick() {
            setFrame(frameFromVideo(), true);
            if (isVideoPlaying()) rafId = requestAnimationFrame(tick);
        }

        function showMessage(key) {
            loading.classList.remove('hidden');
            loading.textContent = t(key);
        }

        function updateLoading() {
            if (ready || failed) return;
            let p = 0;
            try {
                if (video.duration && video.buffered.length) p = video.buffered.end(video.buffered.length - 1) / video.duration;
            } catch (e) { /* ignorar */ }
            showMessage('sim.loading');
            loading.textContent = t('sim.loading', { p: Math.round(p * 100) });
        }

        let retried = false;
        const failKey = () => (navigator.onLine === false ? 'sim.offline' : 'sim.fallback');
        function fallback() {
            if (failed) return;
            // Primer error: se reintenta una vez (p. ej., si el service worker tomó el control
            // a mitad de la carga). Si vuelve a fallar, se muestra la versión en línea.
            if (!retried && navigator.onLine !== false) {
                retried = true;
                const keep = frame, wasPlaying = isVideoPlaying();
                ready = false;
                video.load();
                video.addEventListener('loadedmetadata', () => { setFrame(keep); if (wasPlaying) play(); }, { once: true });
                return;
            }
            // Sin conexión a servicios externos: si el video no carga, se avisa y se
            // mantienen los «Momentos clave» y la descripción textual.
            failed = true;
            ready = false;
            ['sim-prev', 'sim-play', 'sim-next', 'sim-speed', 'sim-range']
                .forEach(id => { $(id).disabled = true; });
            showMessage(failKey());
            announce(t(failKey()));
        }

        function activate() {
            if (activated) return;
            activated = true;
            video.preload = 'auto';
            updateLoading();
            video.load();
        }

        function play() {
            if (!ready) return;
            if (frame >= SIM_FRAMES - 1) setFrame(0);
            video.playbackRate = parseFloat($('sim-speed').value) || 1;
            const p = video.play();
            if (p && p.catch) p.catch(() => renderPlayButton());
        }
        function togglePlay() { isVideoPlaying() ? pause() : play(); }
        function pause() {
            if (!video.paused) video.pause();
        }

        // Eventos del video
        video.addEventListener('loadedmetadata', () => { ready = true; setFrame(frame); });
        video.addEventListener('canplay', () => { ready = true; loading.classList.add('hidden'); });
        video.addEventListener('progress', updateLoading);
        video.addEventListener('play', () => { renderPlayButton(); cancelAnimationFrame(rafId); rafId = requestAnimationFrame(tick); });
        video.addEventListener('pause', () => { renderPlayButton(); setFrame(frameFromVideo(), true); announce(describeFrame()); });
        video.addEventListener('ended', () => { renderPlayButton(); setFrame(SIM_FRAMES - 1, true); });
        video.addEventListener('seeked', () => { if (!isVideoPlaying()) setFrame(frameFromVideo(), true); });
        video.addEventListener('error', fallback); // errores del propio elemento (no de cada <source>)
        // Si ninguna fuente puede reproducirse, el error llega en la última <source>
        const sources = video.querySelectorAll('source');
        if (sources.length) sources[sources.length - 1].addEventListener('error', fallback);
        video.addEventListener('click', togglePlay);

        // Controles
        btnPlay.addEventListener('click', togglePlay);
        $('sim-prev').addEventListener('click', () => { pause(); setFrame(frame - 1, false, true); });
        $('sim-next').addEventListener('click', () => { pause(); setFrame(frame + 1, false, true); });
        range.addEventListener('input', () => { pause(); setFrame(parseInt(range.value, 10)); });
        $('sim-speed').addEventListener('change', (e) => { video.playbackRate = parseFloat(e.target.value) || 1; });

        // Atajos de teclado: solo con el foco dentro del reproductor, para no
        // interferir con la navegación de los lectores de pantalla en el resto de la página.
        $('sim-player').addEventListener('keydown', (e) => {
            if (failed) return;
            const tag = (e.target.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'select') return; // la línea de tiempo usa sus propias flechas
            if (e.key === ' ' && tag !== 'button') { e.preventDefault(); togglePlay(); }
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault(); pause();
                const step = (e.shiftKey ? 10 : 1) * (e.key === 'ArrowLeft' ? -1 : 1);
                setFrame(frame + step, false, true);
            }
        });

        return { activate, pause, renderClock, renderStatic, renderPlayButton, renderMoments };
    })();

    /* Galería de fotos: se muestra cuando el eclipse ya terminó */
    function updateGallery() {
        $('gallery-card').classList.toggle('hidden', Date.now() <= PDE.c4);
    }
    setInterval(updateGallery, 60000);

    function renderSpeedOptions() {
        const nf = new Intl.NumberFormat(langInfo().locale);
        document.querySelectorAll('#sim-speed option').forEach(o => {
            o.textContent = '×' + nf.format(parseFloat(o.value));
        });
    }

    /* =====================================================================
       6. INICIO
       ===================================================================== */
    buildLangBar();
    buildCityList();
    applyTheme();
    applyLang();
    // Textos ya traducidos: se muestra la página (ver el script del <head> en index.html)
    document.documentElement.classList.remove('i18n-wait');
})();
