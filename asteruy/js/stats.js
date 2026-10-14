/*
 * Estadísticas anónimas con GoatCounter (https://danielgastelu.goatcounter.com/).
 * Sin cookies ni datos personales: solo se cuentan visitas y eventos (instalaciones,
 * cromos descubiertos, álbumes completos, etc.).
 *
 * Funciona sin conexión: los eventos se guardan en el dispositivo y se envían
 * cuando vuelve internet. No se cuenta nada en localhost ni con ?test en la dirección,
 * para que las pruebas no ensucien los números.
 */
const Stats = (() => {
    const ENDPOINT = 'https://danielgastelu.goatcounter.com/count';
    const QUEUE_KEY = 'asteruyStatsQueue';
    const ONCE_KEY = 'asteruyStatsOnce';
    const MAX_QUEUE = 300;

    const host = location.hostname;
    const enabled = location.protocol === 'https:' &&
        !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(host) && !host.endsWith('.localhost') && !host.endsWith('.test') &&
        !new URLSearchParams(location.search).has('test');

    const read = (key, fallback) => {
        try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    };
    const write = (key, value) => {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* modo privado */ }
    };

    let sending = false;

    function urlFor(item) {
        const q = new URLSearchParams({
            p: item.p,
            t: item.t || item.p,
            r: item.r || '',
            s: `${screen.width},${screen.height},${Math.round(devicePixelRatio || 1)}`,
            rnd: Math.random().toString(36).slice(2)
        });
        if (item.e) q.set('e', 'true');
        return `${ENDPOINT}?${q}`;
    }

    async function flush() {
        if (!enabled || sending || !navigator.onLine) return;
        sending = true;
        try {
            let queue = read(QUEUE_KEY, []);
            while (queue.length && navigator.onLine) {
                const item = queue[0];
                try {
                    await fetch(urlFor(item), { mode: 'no-cors', keepalive: true, cache: 'no-store', credentials: 'omit' });
                } catch {
                    break;   // sin red: se reintenta más tarde
                }
                queue = read(QUEUE_KEY, []).slice(1);
                write(QUEUE_KEY, queue);
            }
        } finally {
            sending = false;
        }
    }

    function push(item) {
        if (!enabled) return;
        const queue = read(QUEUE_KEY, []);
        queue.push(item);
        write(QUEUE_KEY, queue.slice(-MAX_QUEUE));
        flush();
    }

    /** Visita de página. */
    function pageview(path, title) {
        push({ p: path, t: title, r: document.referrer || '' });
    }

    /** Evento con nombre (no empieza con "/"). */
    function event(name, title) {
        push({ p: name, t: title || name, e: true });
    }

    /** Evento que se cuenta una sola vez por dispositivo. */
    function once(name, title) {
        const done = read(ONCE_KEY, []);
        if (done.includes(name)) return;
        done.push(name);
        write(ONCE_KEY, done);
        event(name, title);
    }

    window.addEventListener('online', flush);
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && flush());

    return { enabled, pageview, event, once, flush };
})();
