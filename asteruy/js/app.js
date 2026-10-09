/* Lógica del álbum: idiomas, desbloqueo de cromos, progreso, diálogos, instalación y actualizaciones. */
(() => {
    const STORAGE_KEY = 'asteruyUnlocked';
    const SEEN_KEY = 'asteruySeenVersion';
    const LANG_KEY = 'asteruyLang';
    const INSTALL_ID = 1;
    const LOCALES = { es: 'es', en: 'en', fr: 'fr', pt: 'pt-BR', it: 'it', de: 'de' };
    const $ = sel => document.querySelector(sel);

    let unlocked = loadUnlocked();
    let activeFilter = 'Todos';
    let lang = detectLang();

    // ---------- Estado ----------
    function loadUnlocked() {
        try {
            const ids = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
            return new Set(ids.filter(id => CROMOS.some(f => f.id === id)));
        } catch { return new Set(); }
    }

    function saveUnlocked() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...unlocked])); } catch { /* modo privado */ }
    }

    function detectLang() {
        let saved = null;
        try { saved = localStorage.getItem(LANG_KEY); } catch { /* sin almacenamiento */ }
        if (saved && I18N[saved]) return saved;
        for (const l of navigator.languages || [navigator.language || 'es']) {
            const code = String(l).slice(0, 2).toLowerCase();
            if (I18N[code]) return code;
        }
        return 'es';
    }

    // ---------- Idioma ----------
    const L = () => I18N[lang];
    const locale = () => LOCALES[lang] || lang;
    // Texto de la interfaz, con el español como respaldo
    const t = (key, ...args) => {
        const v = L().ui[key] ?? I18N.es.ui[key];
        return typeof v === 'function' ? v(...args) : v;
    };
    // Texto de un cromo: traducción si existe; si no, el original en español
    const tc = (f, field) => L().cards?.[f.id]?.[field] ?? (field === 'note' ? f.photo?.note : f[field]);
    const catName = c => L().cats[c] || c;

    function datesText(f) {
        const over = lang !== 'es' && L().cards?.[f.id]?.dates;
        if (over) return over;
        let m = /^n\. (\d+)$/.exec(f.dates);
        if (m) return t('born', m[1], f.g);
        m = /^m\. (\d+)$/.exec(f.dates);
        if (m) return t('died', m[1], f.g);
        return f.dates;
    }

    const fmtDate = iso => {
        try {
            return new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
                .format(new Date(iso + 'T00:00:00Z'));
        } catch { return iso; }
    };
    const fmtList = arr => {
        try { return new Intl.ListFormat(locale(), { style: 'long', type: 'conjunction' }).format(arr); }
        catch { return arr.join(', '); }
    };
    const country = cc => {
        try { return new Intl.DisplayNames([locale()], { type: 'region' }).of(cc); } catch { return cc; }
    };
    const num = (n, d = 1) => Number(n).toLocaleString(locale(), { maximumFractionDigits: d });

    function applyStatic() {
        document.documentElement.lang = locale();
        document.title = t('appTitle');
        document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
        document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
        document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
        document.querySelectorAll('[data-i18n-alt]').forEach(el => { el.alt = t(el.dataset.i18nAlt); });
        $('#version-label').textContent = t('version', self.APP_VERSION);
        $('#lang-select').value = lang;
    }

    function setLang(code) {
        if (!I18N[code]) return;
        lang = code;
        try { localStorage.setItem(LANG_KEY, code); } catch { /* sin almacenamiento */ }
        document.querySelectorAll('dialog[open]').forEach(d => d.close());
        applyStatic();
        renderAll();
    }

    // ---------- Utilidades de render ----------
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const icon = (name, extra = '') => `<svg class="icon" ${extra} aria-hidden="true"><use href="#i-${name}"/></svg>`;
    const pad = n => String(n).padStart(2, '0');
    const catOf = f => CATEGORIES[f.category];

    function photoHTML(f) {
        const alt = f.photo ? `${t('imageOf')} ${tc(f, 'honoree')}` : '';
        return `<div class="medal"><img src="img/p${f.id}.webp" alt="${esc(alt)}" width="128" height="128" loading="lazy" decoding="async"></div>`;
    }

    // Ventana espacial del cromo: el asteroide al centro y el homenaje en un medallón
    function spaceHTML(f, { big = false } = {}) {
        if (f.install) return `<div class="space space--art"><img src="img/p1.webp" alt="${esc(t('specialAlt'))}" width="256" height="256"></div>`;
        return `<div class="space">${Space.asteroid(f.num, { size: big ? 190 : 120 })}${photoHTML(f)}</div>`;
    }

    function cardHTML(f, { isNew = false, interactive = true } = {}) {
        const cat = catOf(f);
        const tag = interactive ? 'button' : 'div';
        const name = tc(f, 'name'), hon = tc(f, 'honoree');
        return `
            <${tag} class="card card--unlocked ${f.install ? 'card--special' : ''} ${isNew ? 'card--new' : ''}" style="--cat:${cat.color}"
                ${interactive ? `type="button" data-id="${f.id}" aria-label="${esc(t('detailAria', f.install ? name : `(${f.num}) ${name}`, hon))}"` : ''}>
                <div class="card__band">
                    <span>${icon(cat.icon)} ${esc(catName(f.category))}</span>
                    <span class="card__num">${esc(t('cardNoShort'))} ${pad(f.id)}</span>
                </div>
                ${spaceHTML(f)}
                <p class="card__mpc">${f.install ? esc(t('welcome')) : `${esc(t('asteroid'))} ${esc(f.num)}`}</p>
                <h3 class="card__name">${esc(name)}</h3>
                <p class="card__meta">${esc(hon)}</p>
            </${tag}>`;
    }

    // Un cromo bloqueado es un misterio: no revela nombre, imagen ni categoría
    function lockedHTML(f) {
        if (f.install) {
            return `
                <button type="button" class="card card--locked card--gift" data-install aria-label="${esc(t('giftAria'))}">
                    <div class="mystery" aria-hidden="true">${icon('install')}</div>
                    <h3 class="card__name">${esc(t('cardNo'))} ${pad(f.id)}</h3>
                    <span class="hint">${icon('sparkles')} ${esc(t('installHint'))}</span>
                </button>`;
        }
        return `
            <div class="card card--locked" aria-label="${esc(t('lockedAria', f.id))}">
                <div class="mystery" aria-hidden="true">?</div>
                <h3 class="card__name">${esc(t('cardNo'))} ${pad(f.id)}</h3>
                <span class="hint">${icon('lock')} ${esc(t('mystery'))}</span>
            </div>`;
    }

    // Las categorías aparecen recién cuando hay al menos un cromo de ellas,
    // y solo cuentan los obtenidos: así no se adelanta cuántos hay de cada una.
    function renderFilters() {
        const cats = Object.keys(CATEGORIES).filter(name => CROMOS.some(f => f.category === name && unlocked.has(f.id)));
        if (!cats.includes(activeFilter)) activeFilter = 'Todos';
        const chip = (name, label, count, cat) => `
            <button type="button" class="filter" data-filter="${esc(name)}" aria-pressed="${name === activeFilter}"
                ${cat ? `style="--cat:${cat.color}"` : ''}>
                ${icon(cat ? cat.icon : 'star')} ${esc(label)}
                <span class="count">${count}</span>
            </button>`;
        $('#filters').innerHTML = chip('Todos', t('all'), `${unlocked.size}/${CROMOS.length}`) +
            cats.map(name => chip(name, catName(name), CROMOS.filter(f => f.category === name && unlocked.has(f.id)).length, CATEGORIES[name])).join('');
    }

    function renderGrid(newId = null) {
        const items = activeFilter === 'Todos' ? CROMOS : CROMOS.filter(f => f.category === activeFilter && unlocked.has(f.id));
        $('#grid').innerHTML = items.map(f => unlocked.has(f.id) ? cardHTML(f, { isNew: f.id === newId }) : lockedHTML(f)).join('');
    }

    function renderProgress() {
        const total = CROMOS.length, got = unlocked.size;
        $('#progress-bar').style.width = `${(got / total) * 100}%`;
        $('#progress-text').textContent = `${got}/${total}`;
        const track = $('#progress-track');
        track.setAttribute('aria-valuemax', total);
        track.setAttribute('aria-valuenow', got);
        track.setAttribute('aria-valuetext', `${got}/${total}`);
    }

    function renderAll(newId = null) {
        renderFilters();
        renderGrid(newId);
        renderProgress();
    }

    // ---------- Avisos (toasts) ----------
    function toast(html, { type = 'info', iconName = 'sparkles', duration = 3500, className = '' } = {}) {
        const el = document.createElement('div');
        el.className = `toast toast--${type} ${className}`;
        el.setAttribute('role', type === 'error' ? 'alert' : 'status');
        el.innerHTML = `<span class="toast__icon">${icon(iconName)}</span><div class="toast__text">${html}</div>`;
        $('#toasts').appendChild(el);
        if (duration) setTimeout(() => dismiss(el), duration);
        return el;
    }

    function dismiss(el) {
        if (!el.isConnected) return;
        el.classList.add('is-leaving');
        el.addEventListener('animationend', () => el.remove(), { once: true });
        setTimeout(() => el.remove(), 400);
    }

    // ---------- Diálogos ----------
    function openDialog(id) {
        const dlg = document.getElementById(id);
        if (!dlg.open) dlg.showModal();
        return dlg;
    }

    document.querySelectorAll('dialog').forEach(dlg => {
        dlg.addEventListener('click', e => {
            if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
        });
    });

    function dataGrid(f) {
        const o = f.orbit;
        const items = [
            [t('distance'), `${num(o.a, 2)} ${t('au')}`, t('millionKm', num(o.a * 149.6, 0))],
            [t('period'), t('years', num(o.per / 365.25, 1)), t('days', num(o.per, 0))],
            o.D ? [t('size'), `≈ ${num(o.D, 1)} km`, t('diameter')] : [t('size'), t('noData'), t('notMeasured')],
            [t('incl'), `${num(o.i, 1)}°`, t('ecc', num(o.e, 3))]
        ];
        return `<dl class="facts">${items.map(([k, v, s]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}<small>${esc(s)}</small></dd></div>`).join('')}</dl>`;
    }

    function creditHTML(f) {
        if (!f.photo) return `<p class="credit">${esc(t('image'))}: ${esc(t('avatarCredit'))}.</p>`;
        const note = tc(f, 'note');
        return `<p class="credit">${esc(t('image'))}${note ? ' (' + esc(note) + ')' : ''}: ${esc(f.photo.author)} · ${esc(f.photo.license)} ·
            <a href="${esc(f.photo.url)}" target="_blank" rel="noopener">Wikimedia Commons</a></p>`;
    }

    function showDetail(f) {
        const cat = catOf(f);
        $('#detail-sheet').style.setProperty('--cat', cat.color);
        if (f.install) {
            $('#detail-content').innerHTML = `
                <div class="detail__hero">${spaceHTML(f, { big: true })}</div>
                <div class="sheet__body">
                    <p class="detail__kicker">${icon(cat.icon)} ${esc(t('cardNo'))} ${pad(f.id)} · ${esc(t('special'))}</p>
                    <h2 id="detail-name">${esc(tc(f, 'name'))}</h2>
                    <p class="detail__desc">${esc(tc(f, 'desc'))}</p>
                    <h3 class="detail__h">${esc(t('howto'))}</h3>
                    <ol class="howto">${t('howtoSteps', CROMOS.length).map(s => `<li>${s}</li>`).join('')}</ol>
                </div>`;
            return openDialog('detail-dialog');
        }
        const d = f.disc;
        $('#detail-content').innerHTML = `
            <div class="detail__hero">${spaceHTML(f, { big: true })}</div>
            <div class="sheet__body">
                <p class="detail__kicker">${icon(cat.icon)} ${esc(catName(f.category))} · ${esc(t('cardNo'))} ${pad(f.id)}</p>
                <h2 id="detail-name">${esc(f.name)}</h2>
                <p class="detail__desig">${esc(t('asteroid'))} (${esc(f.num)}) · ${esc(t('provDesig'))} ${esc(f.desig)}</p>
                <div class="detail__honor">
                    <span>${esc(t('honor'))}</span>
                    <strong>${esc(tc(f, 'honoree'))}</strong>
                    <span>${esc(datesText(f))}</span>
                </div>
                <p class="detail__desc">${esc(tc(f, 'desc'))}</p>

                <h3 class="detail__h">${icon('telescope')} ${esc(t('discovery'))}</h3>
                <p class="detail__disc">${esc(fmtDate(d.date))} · ${esc(fmtList(d.by))} · ${esc(d.site)} (${esc(country(d.cc))})</p>

                <h3 class="detail__h">${icon('orbit')} ${esc(t('orbitH'))}</h3>
                <p class="detail__disc">${esc(t('orbitWhere', L().orbit[f.orbit.cls] || I18N.es.orbit[f.orbit.cls]))}</p>
                ${Space.orbit(f.orbit, f.num, cat.color, { earth: t('earth'), mars: t('mars'), jupiter: t('jupiter'), aria: esc(t('orbitAria')) })}
                <p class="orbit__note">${esc(t('orbitNote'))}</p>
                ${dataGrid(f)}

                ${creditHTML(f)}
                <p class="credit">${esc(t('data'))}: NASA/JPL Small-Body Database${f.cite ? ' · ' + esc(f.cite) : ''} ·
                    <a href="https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(f.num)}" target="_blank" rel="noopener">${esc(t('viewRecord'))}</a></p>
            </div>`;
        openDialog('detail-dialog');
    }

    function showCredits() {
        $('#refs-list').innerHTML = REFERENCIAS.map((r, i) =>
            `<li><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(L().refs?.[i] || r.title)}</a></li>`).join('');
        $('#credits-list').innerHTML = CROMOS.filter(f => !f.install).map(f => {
            if (!unlocked.has(f.id)) return `<li>${esc(t('creditLocked', pad(f.id)))}</li>`;
            if (!f.photo) return `<li><strong>${esc(f.name)}</strong>: ${esc(t('creditAvatar'))}.</li>`;
            return `<li><strong>${esc(f.name)}</strong>: ${esc(f.photo.author)} · ${esc(f.photo.license)} · <a href="${esc(f.photo.url)}" target="_blank" rel="noopener">${esc(t('viewFile'))}</a></li>`;
        }).join('');
        openDialog('credits-dialog');
    }

    // ---------- Desbloqueo ----------
    function unlock(f, subtitle) {
        unlocked.add(f.id);
        saveUnlocked();
        if (activeFilter !== 'Todos' && activeFilter !== f.category) activeFilter = 'Todos';
        renderAll(f.id);
        celebrate(f, subtitle);
    }

    function handleSubmit(e) {
        e?.preventDefault();
        const input = $('#code-input');
        const code = input.value.trim().toUpperCase();

        if (code.length !== 4) return fail(t('codeLen'));

        const f = CROMOS.find(x => x.code && x.code === code);
        if (!f) return fail(t('codeBad'));

        input.value = '';
        input.blur();
        if (unlocked.has(f.id)) {
            toast(t('already', esc(f.name)), { iconName: 'star' });
            return;
        }
        unlock(f);
    }

    function fail(message) {
        const input = $('#code-input');
        input.classList.remove('is-error');
        void input.offsetWidth; // reinicia la animación
        input.classList.add('is-error');
        navigator.vibrate?.(120);
        toast(esc(message), { type: 'error', iconName: 'search' });
        input.select();
    }

    function celebrate(f, subtitle) {
        navigator.vibrate?.([40, 60, 40]);
        const left = CROMOS.length - unlocked.size;
        $('#reveal-title').textContent = f.install ? t('revealGift') : t('revealNew');
        $('#reveal-sub').textContent = subtitle || (left ? t('left', left) : t('last'));
        $('#reveal-card').innerHTML = cardHTML(f, { interactive: false });
        const dlg = openDialog('reveal-dialog');
        Confetti.fire();   // después de abrir el diálogo para quedar por encima
        dlg.addEventListener('close', () => {
            document.querySelector(`.card[data-id="${f.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (!left) {
                openDialog('complete-dialog');
                Confetti.fire(true);
            }
        }, { once: true });
    }

    // ---------- Instalación y cromo de regalo ----------
    let deferredInstall = null;
    const isStandalone = () =>
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches ||
        navigator.standalone === true;
    const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    function grantInstallCard() {
        const f = CROMOS.find(x => x.id === INSTALL_ID);
        if (!f || unlocked.has(f.id)) return;
        document.querySelectorAll('dialog[open]').forEach(d => d.close());
        unlock(f, t('thanksInstall'));
    }

    async function promptInstall() {
        if (!deferredInstall) return false;
        deferredInstall.prompt();
        const { outcome } = await deferredInstall.userChoice;
        deferredInstall = null;
        $('#install-btn').hidden = true;
        if (outcome === 'accepted') grantInstallCard();
        return true;
    }

    function showInstallHelp() {
        const list = steps => `<ol class="howto">${steps.map(s => `<li>${s.replace('{share}', icon('share'))}</li>`).join('')}</ol>`;
        let steps;
        if (isStandalone()) {
            steps = `<p>${esc(t('alreadyInstalled'))}</p>`;
        } else if (deferredInstall) {
            steps = `<button class="btn btn--primary" type="button" id="install-now" style="width:100%">${icon('install')} ${esc(t('installNow'))}</button>`;
        } else if (isIOS()) {
            steps = list(t('iosSteps')) + `<p class="muted">${esc(t('iosNote'))}</p>`;
        } else {
            steps = list(t('otherSteps'));
        }
        $('#install-steps').innerHTML = steps;
        $('#install-now')?.addEventListener('click', promptInstall);
        openDialog('install-dialog');
    }

    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        deferredInstall = e;
        $('#install-btn').hidden = isStandalone();
    });
    $('#install-btn').addEventListener('click', promptInstall);
    window.addEventListener('appinstalled', () => {
        $('#install-btn').hidden = true;
        grantInstallCard();
    });

    // ---------- Conexión ----------
    function syncOnline() { document.body.classList.toggle('is-offline', !navigator.onLine); }
    window.addEventListener('online', syncOnline);
    window.addEventListener('offline', syncOnline);

    // ---------- Actualizaciones ----------
    function askVersion(worker) {
        return new Promise(resolve => {
            const channel = new MessageChannel();
            channel.port1.onmessage = e => resolve(e.data);
            worker.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
            setTimeout(() => resolve(null), 1500);
        });
    }

    let updateToast = null;
    async function showUpdate(reg) {
        const worker = reg.waiting;
        if (!worker || updateToast?.worker === worker) return;
        if (updateToast) dismiss(updateToast);   // llegó una versión aún más nueva
        updateToast = { worker };
        const info = await askVersion(worker);
        if (reg.waiting !== worker) return;
        // Las notas de versión están en español: solo se muestran en ese idioma
        const notes = lang === 'es' && info?.notes?.length ? `<ul>${info.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : '';
        const el = toast(`
            <strong>${esc(t('newVersion', info?.version || ''))}</strong>
            <small>${esc(t('updateText'))}</small>${notes}`,
            { iconName: 'sparkles', duration: 0, className: 'update-banner' });
        el.worker = worker;
        updateToast = el;
        const btn = document.createElement('button');
        btn.className = 'btn btn--primary';
        btn.type = 'button';
        btn.innerHTML = `${icon('refresh')} ${esc(t('update'))}`;
        btn.addEventListener('click', () => {
            btn.disabled = true;
            (reg.waiting || worker).postMessage({ type: 'SKIP_WAITING' });
        });
        el.appendChild(btn);
    }

    function registerServiceWorker() {
        if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;

        let reloading = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (reloading) return;
            reloading = true;
            location.reload();
        });

        navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
            const watch = worker => worker.addEventListener('statechange', () => {
                if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate(reg);
            });
            if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg);
            if (reg.installing) watch(reg.installing);
            reg.addEventListener('updatefound', () => watch(reg.installing));

            // Buscar versiones nuevas al volver a la app, al recuperar conexión y cada 30 minutos
            const check = () => navigator.onLine && reg.update().catch(() => {});
            document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
            window.addEventListener('online', check);
            setInterval(check, 30 * 60 * 1000);
        }).catch(err => console.warn('Service worker no registrado:', err));
    }

    function announceWhatsNew() {
        let seen = null;
        try { seen = JSON.parse(localStorage.getItem(SEEN_KEY)); } catch { /* sin almacenamiento */ }
        const now = { version: self.APP_VERSION, total: CROMOS.length };
        try { localStorage.setItem(SEEN_KEY, JSON.stringify(now)); } catch { /* sin almacenamiento */ }
        if (!seen || seen.version === now.version) return;
        const extra = now.total - (seen.total || 0);
        toast(`<strong>${esc(t('updated', now.version))}</strong>${extra > 0 ? `<small>${esc(t('newCards', extra))}</small>` : ''}`,
            { type: 'success', iconName: 'sparkles', duration: 6000 });
    }

    // ---------- Eventos ----------
    const select = $('#lang-select');
    select.innerHTML = Object.entries(I18N).map(([code, d]) => `<option value="${code}" lang="${LOCALES[code]}">${esc(d.label)}</option>`).join('');
    select.addEventListener('change', e => setLang(e.target.value));

    $('#code-form').addEventListener('submit', handleSubmit);
    $('#code-input').addEventListener('input', e => {
        const clean = e.target.value.toUpperCase().replace(/[^A-ZÑ]/g, '').slice(0, 4);
        if (clean !== e.target.value) e.target.value = clean;
        e.target.classList.remove('is-error');
        if (clean.length === 4) handleSubmit();
    });
    $('#filters').addEventListener('click', e => {
        const btn = e.target.closest('[data-filter]');
        if (!btn) return;
        activeFilter = btn.dataset.filter;
        renderFilters();
        renderGrid();
    });
    $('#grid').addEventListener('click', e => {
        if (e.target.closest('[data-install]')) return showInstallHelp();
        const card = e.target.closest('button.card[data-id]');
        if (card) showDetail(CROMOS.find(f => f.id === Number(card.dataset.id)));
    });
    $('#credits-btn').addEventListener('click', showCredits);

    // Los botones de prueba solo aparecen con ?test en la URL (para el equipo organizador)
    const testMode = new URLSearchParams(location.search).has('test');
    $('#reset-btn').hidden = !testMode;
    $('#simulate-btn').hidden = !testMode;
    $('#simulate-btn').addEventListener('click', grantInstallCard);
    $('#reset-btn').addEventListener('click', () => {
        if (!confirm(t('resetConfirm'))) return;
        unlocked.clear();
        saveUnlocked();
        activeFilter = 'Todos';
        renderAll();
        toast(esc(t('resetDone')));
    });

    // ---------- Inicio ----------
    Space.sky($('#sky'));
    applyStatic();
    renderAll();
    syncOnline();
    announceWhatsNew();
    registerServiceWorker();
    // Abierto desde la pantalla de inicio: el álbum está instalado, ¡cromo de regalo!
    if (isStandalone()) setTimeout(grantInstallCard, 500);
})();
