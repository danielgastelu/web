/* =========================================================================
   Sonificación Eclipse 2027 — lógica de la aplicación (PWA)
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

    function pickInitialLang() {
        const saved = store.get('eclipse.lang');
        if (saved && I18N[saved]) return saved;
        const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'es';
        const code = nav.slice(0, 2).toLowerCase();
        return I18N[code] ? code : 'es';
    }

    function langInfo() { return LANGS.find(l => l.code === lang) || LANGS[0]; }

    function t(key, vars) {
        let s = (I18N[lang] && I18N[lang][key]) ?? I18N.es[key] ?? key;
        if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
        return s;
    }

    /* Los emojis decorativos se ocultan a los lectores de pantalla
       (si no, se leerían como «coche de policía», «marca de verificación», etc.). */
    const EMOJI_RE = /(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*\uFE0F?)/gu;
    const escapeHtml = (s) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    function hideEmojis(el) {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const nodes = [];
        const has = /\p{Extended_Pictographic}/u;
        while (walker.nextNode()) if (has.test(walker.currentNode.nodeValue)) nodes.push(walker.currentNode);
        nodes.forEach(n => {
            EMOJI_RE.lastIndex = 0;
            const span = document.createElement('span');
            span.innerHTML = escapeHtml(n.nodeValue).replace(EMOJI_RE, '<span aria-hidden="true">$1</span>');
            n.replaceWith(...span.childNodes);
        });
        EMOJI_RE.lastIndex = 0;
    }

    function translateEl(el) {
        const key = el.getAttribute('data-i18n');
        if (key) {
            if (key.endsWith('_html')) el.innerHTML = t(key);
            else el.textContent = t(key);
            hideEmojis(el);
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
        LANGS.forEach(l => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'lang-btn';
            b.lang = l.code;
            b.dataset.lang = l.code;
            b.setAttribute('aria-pressed', String(l.code === lang));
            b.setAttribute('aria-label', l.name);
            b.title = l.name;
            b.innerHTML = '<img src="' + l.flag + '" alt="" width="26" height="18"><span>' + l.code.toUpperCase() + '</span>';
            b.addEventListener('click', () => setLang(l.code));
            bar.appendChild(b);
        });
    }

    function setLang(code) {
        if (!I18N[code]) return;
        lang = code;
        store.set('eclipse.lang', code);
        applyLang();
    }

    function applyLang() {
        document.documentElement.lang = lang;
        document.title = t('doc.title');
        document.querySelectorAll('[data-i18n], [data-i18n-aria], [data-i18n-title], [data-i18n-alt]').forEach(translateEl);
        // Los enlaces que abren otra pestaña lo avisan al lector de pantalla
        document.querySelectorAll('a[target="_blank"]').forEach(a => a.setAttribute('aria-describedby', 'sr-newtab'));
        $('app-version').textContent = t('cred.version', { v: APP_VERSION });
        document.querySelectorAll('.lang-btn').forEach(b =>
            b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));

        $('license-line').innerHTML = LICENSE_LINE_HTML;
        $('attr-animation').textContent = ATTR_ANIMATION;
        updateContrastLabel();
        updateInstallText();
        renderSpeedOptions();
        sim.renderStatic();
        sim.renderClock();
        sim.renderPlayButton();
        sim.renderMoments();
        updateGallery();
        if (isPlaying) renderSonification(lastEvalTime);
    }

    /* =====================================================================
       2. INTERFAZ: pestañas y alto contraste
       ===================================================================== */
    const navButtons = document.querySelectorAll('nav.tabbar button');
    const tabContents = document.querySelectorAll('.tab-content');

    function showTab(targetId, moveFocus) {
        navButtons.forEach(b => {
            const on = b.getAttribute('data-target') === targetId;
            b.classList.toggle('active', on);
            if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
        });
        tabContents.forEach(c => c.classList.toggle('active', c.id === targetId));
        document.querySelector('main').scrollTop = 0;
        if (targetId === 'tab-simulacion') sim.activate(); else sim.pause();
        if (targetId !== 'tab-simulacion') { const tl = $('tl-video'); if (tl && !tl.paused) tl.pause(); }
        // Lleva el foco al título de la sección, para que el lector de pantalla anuncie el cambio
        if (moveFocus) {
            const h = document.querySelector('#' + targetId + ' h2');
            if (h) h.focus({ preventScroll: true });
        }
    }
    navButtons.forEach(btn => btn.addEventListener('click', () => showTab(btn.getAttribute('data-target'), true)));

    const btnContrast = $('btn-contrast');
    function updateContrastLabel() {
        const hc = document.body.classList.contains('high-contrast');
        btnContrast.textContent = hc ? t('contrast.toStd') : t('contrast.toHigh');
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', hc ? '#000000' : '#0056b3');
    }
    btnContrast.addEventListener('click', () => {
        document.body.classList.toggle('high-contrast');
        store.set('eclipse.hc', document.body.classList.contains('high-contrast') ? '1' : '0');
        updateContrastLabel();
    });
    if (store.get('eclipse.hc') === '1') document.body.classList.add('high-contrast');

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
    const radioSource = document.getElementsByName('data-source');
    const radioMode = document.getElementsByName('algo-mode');
    const algoControls = $('algo-controls');
    const simContainer = $('sim-container');
    const timeSlider = $('time-slider');
    const sensorMsg = $('sensor-msg');
    const voiceToggle = $('voice-toggle');
    const statusOrientation = $('status-orientation');
    const displayTime = $('display-time');
    const displayCoverage = $('display-coverage');
    const displayPhase = $('display-phase');

    /* Datos astronómicos — Punta del Este, Uruguay — 06/feb/2027 (UYT, UTC−3) */
    const baseDate = '2027-02-06T';
    const tC1  = new Date(baseDate + '10:52:56-03:00').getTime(); // inicio parcial
    const tC2  = new Date(baseDate + '12:36:05-03:00').getTime(); // inicio anular
    const tMax = new Date(baseDate + '12:38:49-03:00').getTime(); // máximo
    const tC3  = new Date(baseDate + '12:41:34-03:00').getTime(); // fin anular
    const tC4  = new Date(baseDate + '14:21:14-03:00').getTime(); // fin parcial
    const maxCoverage = 93; // % aproximado cubierto en el máximo

    let audioCtx;
    let isPlaying = false;
    let isDeviceFlat = false;
    let currentSource = 'algo';
    let currentAlgoMode = 'real';
    let lightSensorInstance = null;
    let sensorLux = null;
    let lastAnnouncedPercent = -1;
    let lastAnnouncedPhase = '';
    let lastEvalTime = Date.now();
    let lastNoteTime = 0;

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

    function playTone(baseFrequency) {
        if (!isPlaying || !isDeviceFlat || !audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = 'triangle';
        const ratios = [1, 1.122, 1.25, 1.5, 1.681]; // escala pentatónica
        const ratio = ratios[Math.floor(Math.random() * ratios.length)];
        osc.frequency.setValueAtTime(baseFrequency * ratio, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    }

    function handleOrientation(event) {
        const beta = event.beta, gamma = event.gamma;
        if (beta !== null && gamma !== null) {
            // ±15° para pasar a «apoyado» y ±20° para volver a «inclinado» (evita avisos repetidos)
            const limit = isDeviceFlat ? 20 : 15;
            const flat = Math.abs(beta) < limit && Math.abs(gamma) < limit;
            if (flat !== isDeviceFlat || !statusOrientation.dataset.init) {
                isDeviceFlat = flat;
                statusOrientation.dataset.init = '1';
                setI18n(statusOrientation, flat ? 'son.flat' : 'son.tilted');
                statusOrientation.className = 'status-indicator ' + (flat ? 'status-good' : 'status-bad');
            }
        }
    }

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

    function calculateAstronomicalData(timeMs) {
        let coverage = 0, phaseKey;
        if (timeMs < tC1) { phaseKey = 'phase.before'; }
        else if (timeMs < tC2) { coverage = ((timeMs - tC1) / (tC2 - tC1)) * maxCoverage; phaseKey = 'phase.partialIn'; }
        else if (timeMs <= tC3) { coverage = maxCoverage; phaseKey = 'phase.annular'; }
        else if (timeMs <= tC4) { coverage = maxCoverage - ((timeMs - tC3) / (tC4 - tC3)) * maxCoverage; phaseKey = 'phase.partialOut'; }
        else { phaseKey = 'phase.after'; }
        return { coverage, phaseKey };
    }

    function getEvalTime() {
        if (currentAlgoMode === 'sim' && currentSource === 'algo') {
            const startTime = tC1 - 30 * 60000; // 30 min antes
            const endTime = tC4 + 30 * 60000;   // 30 min después
            return startTime + (endTime - startTime) * (parseInt(timeSlider.value, 10) / 1000);
        }
        return Date.now();
    }

    function updateSliderText() {
        const startTime = tC1 - 30 * 60000, endTime = tC4 + 30 * 60000;
        const ms = startTime + (endTime - startTime) * (parseInt(timeSlider.value, 10) / 1000);
        const hhmm = new Date(ms).toLocaleTimeString(langInfo().locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
        timeSlider.setAttribute('aria-valuetext', t('son.slider.value', { t: hhmm }) + '. ' + t(calculateAstronomicalData(ms).phaseKey));
    }
    timeSlider.addEventListener('input', updateSliderText);

    function renderSonification(evalTime) {
        const astro = calculateAstronomicalData(evalTime);
        displayTime.textContent = new Date(evalTime).toLocaleTimeString(langInfo().locale,
            { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
        displayCoverage.textContent = Math.round(astro.coverage) + '%';
        if (currentAlgoMode === 'real' && evalTime < tC1) {
            displayPhase.innerHTML = '';
            displayPhase.append(t('phase.before'));
            const span = document.createElement('span');
            span.className = 'countdown-text';
            span.textContent = getCountdownText(evalTime, tC1);
            displayPhase.appendChild(span);
        } else {
            displayPhase.textContent = t(astro.phaseKey);
        }
        return astro;
    }

    function updateLoop() {
        if (!isPlaying) return;
        const evalTime = getEvalTime();
        lastEvalTime = evalTime;
        const astro = renderSonification(evalTime);
        const covRound = Math.round(astro.coverage);

        // Relato por voz (avance e hitos)
        if (astro.phaseKey !== lastAnnouncedPhase) {
            if (astro.phaseKey === 'phase.before') speak(t('speak.waiting'));
            else speak(t('speak.phase', { phase: t(astro.phaseKey) }));
            lastAnnouncedPhase = astro.phaseKey;
        }
        if (covRound % 5 === 0 && covRound !== lastAnnouncedPercent && covRound > 0 && covRound < maxCoverage) {
            speak(t('speak.coverage', { n: covRound }));
            lastAnnouncedPercent = covRound;
        } else if (covRound % 5 !== 0 && Math.abs(covRound - lastAnnouncedPercent) > 2) {
            lastAnnouncedPercent = -1; // permite anunciar tanto al subir como al bajar
        }

        // Frecuencia base: 110 Hz (grave/oscuro) a 880 Hz (agudo/claro)
        let lightFactor;
        if (currentSource === 'sensor' && sensorLux !== null) lightFactor = Math.min(sensorLux / 1000, 1.0);
        else lightFactor = 1 - astro.coverage / 100;
        const baseFrequency = 110 + lightFactor * 770;

        if (Date.now() - lastNoteTime > 400) {
            playTone(baseFrequency);
            lastNoteTime = Date.now();
        }
        requestAnimationFrame(updateLoop);
    }

    btnStart.addEventListener('click', async () => {
        if (!audioCtx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AC();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const wasPlaying = isPlaying;
        isPlaying = true;
        setI18n(btnStart, 'son.active');
        btnStart.classList.add('is-active');
        btnStart.setAttribute('data-i18n-aria', 'son.active.aria');
        translateEl(btnStart);
        displayPhase.removeAttribute('data-i18n');
        if (wasPlaying) return;

        speak(t('speak.started'));

        // Permisos del acelerómetro (iOS y navegadores modernos)
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const perm = await DeviceOrientationEvent.requestPermission();
                if (perm === 'granted') window.addEventListener('deviceorientation', handleOrientation);
            } catch (e) { console.error(e); }
        } else {
            window.addEventListener('deviceorientation', handleOrientation);
        }
        requestAnimationFrame(updateLoop);
    });

    radioSource.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentSource = e.target.value;
            if (currentSource === 'sensor') {
                algoControls.classList.add('hidden');
                sensorMsg.classList.remove('hidden');
                if ('AmbientLightSensor' in window) {
                    try {
                        lightSensorInstance = new AmbientLightSensor();
                        lightSensorInstance.onreading = () => { sensorLux = lightSensorInstance.illuminance; };
                        lightSensorInstance.onerror = () => { setI18n(sensorMsg, 'sensor.blocked'); sensorLux = null; };
                        lightSensorInstance.start();
                        setI18n(sensorMsg, 'sensor.ok');
                    } catch (err) {
                        setI18n(sensorMsg, 'sensor.noBrowser');
                    }
                } else {
                    setI18n(sensorMsg, 'sensor.noDevice');
                }
            } else {
                algoControls.classList.remove('hidden');
                sensorMsg.classList.add('hidden');
                if (lightSensorInstance) { lightSensorInstance.stop(); sensorLux = null; }
            }
        });
    });

    radioMode.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentAlgoMode = e.target.value;
            if (currentAlgoMode === 'sim') {
                simContainer.classList.remove('hidden');
                speak(t('speak.simOn'));
            } else {
                simContainer.classList.add('hidden');
                speak(t('speak.realOn'));
            }
        });
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
    const GMT3 = 'Etc/GMT+3'; // zona fija UTC−3 (hora de Uruguay)
    // Momentos clave (hora UT exacta de EclipseWise / datos de Punta del Este)
    const ut = (h, m, s) => Date.UTC(2027, 1, 6, h, m, s);
    const MOMENTS = [
        { key: 'm.p1',     at: ut(12, 57, 34) },
        { key: 'm.pde1',   at: tC1 },
        { key: 'm.u1',     at: ut(14, 3, 53) },
        { key: 'm.pdemax', at: tMax },
        { key: 'm.max',    at: ut(15, 59, 35) },
        { key: 'm.pde4',   at: tC4 },
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
        const locale = () => langInfo().locale;
        const fmt = (opts) => new Intl.DateTimeFormat(locale(), opts);
        const fmtTime = (ms, tz) => fmt({ timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(ms);
        const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

        function renderClock() {
            const ms = frameTime(frame);
            $('sim-date').textContent = cap(fmt({ timeZone: GMT3, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(ms));
            $('sim-time').textContent = fmtTime(ms, GMT3);
            $('sim-ut').textContent = t('sim.ut', { t: fmtTime(ms, 'UTC') });
            range.setAttribute('aria-valuetext', fmtTime(ms, GMT3) + ', ' + t('sim.tz') + '. Punta del Este: ' + t(calculateAstronomicalData(ms).phaseKey));
        }

        function renderStatic() {
            $('sim-tick-start').textContent = fmtTime(frameTime(0), GMT3);
            $('sim-tick-end').textContent = fmtTime(frameTime(SIM_FRAMES - 1), GMT3);
            $('sim-ref').textContent = t('sim.ref', {
                c1: fmtTime(tC1, GMT3), max: fmtTime(tMax, GMT3), c4: fmtTime(tC4, GMT3)
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
                txt.textContent = t(m.key, { a: fmtTime(tC2, GMT3), b: fmtTime(tC3, GMT3) });
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
            return t('sim.announce', { t: fmtTime(ms, GMT3), phase: t(calculateAstronomicalData(ms).phaseKey) });
        }

        function isVideoPlaying() { return !video.paused && !video.ended; }

        function renderPlayButton() {
            const playing = isVideoPlaying();
            btnPlay.innerHTML = '<span aria-hidden="true">' + (playing ? '⏸' : '▶') + '</span>';
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
            ['sim-first', 'sim-prev', 'sim-play', 'sim-next', 'sim-last', 'sim-speed', 'sim-range']
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
        $('sim-first').addEventListener('click', () => { pause(); setFrame(0, false, true); });
        $('sim-last').addEventListener('click', () => { pause(); setFrame(SIM_FRAMES - 1, false, true); });
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
        $('gallery-card').classList.toggle('hidden', Date.now() <= tC4);
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
    applyLang();
})();
