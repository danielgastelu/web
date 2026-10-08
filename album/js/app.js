/* Lógica del álbum: desbloqueo de cromos, progreso, diálogos, instalación y actualizaciones. */
(() => {
    const STORAGE_KEY = 'scienceFairUnlocked';   // misma clave que la versión anterior: no se pierde el progreso
    const SEEN_KEY = 'scienceFairSeenVersion';
    const $ = sel => document.querySelector(sel);

    let unlocked = loadUnlocked();
    let activeFilter = 'Todos';

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

    // ---------- Utilidades de render ----------
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const icon = (name, extra = '') => `<svg class="icon" ${extra} aria-hidden="true"><use href="#i-${name}"/></svg>`;
    const pad = n => String(n).padStart(2, '0');
    const catOf = f => CATEGORIES[f.category];

    function cardHTML(f, { isNew = false, interactive = true } = {}) {
        const cat = catOf(f);
        const tag = interactive ? 'button' : 'div';
        return `
            <${tag} class="card card--unlocked ${isNew ? 'card--new' : ''}" style="--cat:${cat.color}"
                ${interactive ? `type="button" data-id="${f.id}" aria-label="${esc(f.name)}, ${esc(f.category)}. Ver detalle"` : ''}>
                <div class="card__band">
                    <span>${icon(cat.icon)} ${esc(f.category)}</span>
                    <span class="card__num">#${pad(f.id)}</span>
                </div>
                <div class="portrait"><img src="img/p${f.id}.webp" alt="Retrato de ${esc(f.name)}" width="160" height="160" loading="lazy" decoding="async"></div>
                <h3 class="card__name">${esc(f.name)}</h3>
                <p class="card__meta">${esc(f.dates)}</p>
            </${tag}>`;
    }

    // Un cromo bloqueado es un misterio: no revela nombre, retrato ni categoría
    function lockedHTML(f) {
        return `
            <div class="card card--locked" aria-label="Cromo ${f.id}, bloqueado">
                <div class="portrait" aria-hidden="true">?</div>
                <h3 class="card__name">Cromo #${pad(f.id)}</h3>
                <span class="hint">${icon('lock')} Misterio</span>
            </div>`;
    }

    // Las categorías aparecen recién cuando tienes al menos un cromo de ellas,
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
        $('#filters').innerHTML = chip('Todos', 'Todos', `${unlocked.size}/${CROMOS.length}`) +
            cats.map(name => chip(name, name, CROMOS.filter(f => f.category === name && unlocked.has(f.id)).length, CATEGORIES[name])).join('');
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
        track.setAttribute('aria-valuetext', `${got} de ${total} cromos`);
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

    function showDetail(f) {
        const cat = catOf(f);
        $('#detail-sheet').style.setProperty('--cat', cat.color);
        $('#detail-content').innerHTML = `
            <div class="detail__hero">
                <div class="card__band"><span>${icon(cat.icon)} ${esc(f.category)}</span><span class="card__num">#${pad(f.id)}</span></div>
            </div>
            <div class="sheet__body" style="padding-top:0">
                <div class="portrait"><img src="img/p${f.id}.webp" alt="Retrato de ${esc(f.name)}" width="160" height="160"></div>
                <h2 id="detail-name">${esc(f.name)}</h2>
                <div class="detail__meta">
                    <span class="pill">${icon('calendar')} ${esc(f.dates)}</span>
                    <span class="pill">${icon('globe')} ${esc(f.nationality)}</span>
                </div>
                <p class="detail__desc">${esc(f.desc)}</p>
                <p class="credit">Foto: ${esc(f.photo.author)} · ${esc(f.photo.license)} ·
                    <a href="${esc(f.photo.url)}" target="_blank" rel="noopener">Wikimedia Commons</a></p>
            </div>`;
        openDialog('detail-dialog');
    }

    function showCredits() {
        $('#credits-list').innerHTML = CROMOS.map(f => unlocked.has(f.id)
            ? `<li><strong>${esc(f.name)}</strong>: ${esc(f.photo.author)} · ${esc(f.photo.license)} · <a href="${esc(f.photo.url)}" target="_blank" rel="noopener">ver archivo</a></li>`
            : `<li>Cromo #${pad(f.id)}: ¡desbloquéalo para descubrirlo!</li>`).join('');
        openDialog('credits-dialog');
    }

    // ---------- Desbloqueo ----------
    function handleSubmit(e) {
        e?.preventDefault();
        const input = $('#code-input');
        const code = input.value.trim().toUpperCase();

        if (code.length !== 4) {
            return fail('El código debe tener 4 letras.');
        }

        const f = CROMOS.find(x => x.code === code);
        if (!f) return fail('Código incorrecto. ¡Sigue buscando!');

        input.value = '';
        if (unlocked.has(f.id)) {
            toast(`¡Ya tienes a <strong>${esc(f.name)}</strong>!`, { iconName: 'star' });
            return;
        }

        unlocked.add(f.id);
        saveUnlocked();
        if (activeFilter !== 'Todos' && activeFilter !== f.category) activeFilter = 'Todos';
        renderAll(f.id);
        celebrate(f);
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

    function celebrate(f) {
        navigator.vibrate?.([40, 60, 40]);
        const left = CROMOS.length - unlocked.size;
        $('#reveal-sub').textContent = left
            ? `Te faltan ${left} para completar el álbum.`
            : '¡Era el último que te faltaba!';
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

    // ---------- Instalación ----------
    let deferredInstall = null;
    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        deferredInstall = e;
        $('#install-btn').hidden = false;
    });
    $('#install-btn').addEventListener('click', async () => {
        if (!deferredInstall) return;
        deferredInstall.prompt();
        await deferredInstall.userChoice;
        deferredInstall = null;
        $('#install-btn').hidden = true;
    });
    window.addEventListener('appinstalled', () => {
        $('#install-btn').hidden = true;
        toast('¡Álbum instalado! Ya puedes abrirlo desde tu pantalla de inicio.', { type: 'success', iconName: 'install' });
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
        const notes = info?.notes?.length ? `<ul>${info.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : '';
        const el = toast(`
            <strong>¡Nueva versión${info?.version ? ' ' + esc(info.version) : ''}!</strong>
            <small>Puede traer más cromos. Tu progreso se mantiene.</small>${notes}`,
            { iconName: 'sparkles', duration: 0, className: 'update-banner' });
        el.worker = worker;
        updateToast = el;
        const btn = document.createElement('button');
        btn.className = 'btn btn--primary';
        btn.type = 'button';
        btn.innerHTML = `${icon('refresh')} Actualizar`;
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
        toast(extra > 0
            ? `<strong>¡Actualizado a ${esc(now.version)}!</strong><small>Hay ${extra} cromo${extra > 1 ? 's' : ''} nuevo${extra > 1 ? 's' : ''} por descubrir.</small>`
            : `<strong>¡Actualizado a ${esc(now.version)}!</strong>`,
            { type: 'success', iconName: 'sparkles', duration: 6000 });
    }

    // ---------- Eventos ----------
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
        const card = e.target.closest('button.card[data-id]');
        if (card) showDetail(CROMOS.find(f => f.id === Number(card.dataset.id)));
    });
    $('#credits-btn').addEventListener('click', showCredits);

    // El botón de reinicio solo aparece con ?test en la URL (para el equipo organizador)
    const resetBtn = $('#reset-btn');
    resetBtn.hidden = !new URLSearchParams(location.search).has('test');
    resetBtn.addEventListener('click', () => {
        if (!confirm('¿Reiniciar el álbum? Se perderán todos los cromos.')) return;
        unlocked.clear();
        saveUnlocked();
        activeFilter = 'Todos';
        renderAll();
        toast('Álbum reiniciado para pruebas.');
    });

    // ---------- Inicio ----------
    $('#version-label').textContent = `Versión ${self.APP_VERSION}`;
    renderAll();
    syncOnline();
    announceWhatsNew();
    registerServiceWorker();
})();
