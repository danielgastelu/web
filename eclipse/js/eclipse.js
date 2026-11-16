/* =========================================================================
   Eclipse sonoro 2027 — circunstancias locales del eclipse
   -------------------------------------------------------------------------
   Calcula, para cualquier lugar de la Tierra, las horas de los contactos, el
   máximo y la parte del Sol cubierta en cada instante, a partir de los
   elementos besselianos del eclipse anular del 6 de febrero de 2027.

   Fuente de los elementos: «Eclipse Predictions by Fred Espenak,
   www.EclipseWise.com» y NASA Eclipse Web Site (mismos elementos; las filas
   n = 0 y 1 con más decimales en NASA, las filas 2 y 3 con 5 decimales en
   EclipseWise). Método: J. Meeus, «Elements of Solar Eclipses 1951–2200».

   Todo el cálculo se hace en el dispositivo; no se envía nada a ningún sitio.
   ========================================================================= */
const EclipseCalc = (function () {
    'use strict';

    const RAD = Math.PI / 180;

    /* Elementos besselianos polinómicos. t en horas desde T0 (Tiempo Dinámico). */
    const EL = {
        t0: Date.UTC(2027, 1, 6, 16, 0, 0),   // 2027 feb 06, 16:00:00 TD
        deltaT: 72.6,                         // TD − UT en segundos (valor previsto por EclipseWise)
        x:  [0.1116760, 0.4664952, -0.00003, -0.00001],
        y:  [-0.2732930, 0.2031856, 0.00010, 0],
        d:  [-15.5479402, 0.0123830, 0],
        l1: [0.5719280, -0.0000653, -0.00001],
        l2: [0.0256620, -0.0000650, -0.00001],
        mu: [56.493069, 15.000510],
        tanF1: 0.0047426,
        tanF2: 0.0047190
    };

    const poly = (c, t) => c.reduce((acc, k, i) => acc + k * Math.pow(t, i), 0);
    const dpoly = (c, t) => c.reduce((acc, k, i) => (i ? acc + i * k * Math.pow(t, i - 1) : acc), 0);

    /** Horas desde T0 (en TD) para un instante dado en milisegundos UT. */
    const hoursFromMs = (ms) => (ms + EL.deltaT * 1000 - EL.t0) / 3600000;
    const msFromHours = (t) => EL.t0 + t * 3600000 - EL.deltaT * 1000;

    /** Constantes geocéntricas del observador (elipsoide terrestre, a nivel del mar). */
    function observer(latDeg, lonDeg) {
        const phi = latDeg * RAD;
        const u1 = Math.atan(0.99664719 * Math.tan(phi));
        return { lat: latDeg, lon: lonDeg, phi, rhoSin: 0.99664719 * Math.sin(u1), rhoCos: Math.cos(u1) };
    }

    /** Geometría del eclipse para un observador en el instante t (horas desde T0). */
    function geometry(obs, t) {
        const X = poly(EL.x, t), Y = poly(EL.y, t);
        const d = poly(EL.d, t) * RAD;
        const H = (poly(EL.mu, t) + obs.lon - 0.00417807 * EL.deltaT) * RAD;   // longitud este positiva
        const L1 = poly(EL.l1, t), L2 = poly(EL.l2, t);
        const sinH = Math.sin(H), cosH = Math.cos(H), sinD = Math.sin(d), cosD = Math.cos(d);
        const xi = obs.rhoCos * sinH;
        const eta = obs.rhoSin * cosD - obs.rhoCos * cosH * sinD;
        const zeta = obs.rhoSin * sinD + obs.rhoCos * cosH * cosD;
        const dXi = RAD * EL.mu[1] * obs.rhoCos * cosH;
        const dEta = RAD * (EL.mu[1] * xi * sinD - zeta * EL.d[1]);
        const u = X - xi, v = Y - eta;
        const a = dpoly(EL.x, t) - dXi, b = dpoly(EL.y, t) - dEta;
        const l1 = L1 - zeta * EL.tanF1;      // radio de la penumbra a la altura del observador
        const l2 = L2 - zeta * EL.tanF2;      // radio de la antumbra (positivo en un eclipse anular)
        return { t, u, v, a, b, m: Math.hypot(u, v), l1, l2, H, d, zeta };
    }

    /** Área común de dos círculos de radios r1 y r2 con centros a distancia s. */
    function lensArea(r1, r2, s) {
        if (s >= r1 + r2) return 0;
        if (s <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
        const a1 = Math.acos((s * s + r1 * r1 - r2 * r2) / (2 * s * r1));
        const a2 = Math.acos((s * s + r2 * r2 - r1 * r1) / (2 * s * r2));
        return r1 * r1 * (a1 - Math.sin(2 * a1) / 2) + r2 * r2 * (a2 - Math.sin(2 * a2) / 2);
    }

    /**
     * Aspecto del Sol y la Luna para un observador en un instante (ms UT):
     * - obscuration: fracción del área del disco solar cubierta (0 a 1)
     * - ratio: diámetro aparente de la Luna / diámetro del Sol
     * - east, north: posición del centro de la Luna respecto del centro del Sol,
     *   en radios solares, hacia el este y el norte celestes
     * - alt: altura del Sol sobre el horizonte (grados); q: ángulo paraláctico (grados)
     */
    function view(obs, ms) {
        const g = geometry(obs, hoursFromMs(ms));
        const rs = (g.l1 + g.l2) / 2, rm = (g.l1 - g.l2) / 2;
        const q = Math.atan2(Math.sin(g.H), Math.tan(obs.phi) * Math.cos(g.d) - Math.sin(g.d) * Math.cos(g.H));
        return {
            obscuration: lensArea(rs, rm, g.m) / (Math.PI * rs * rs),
            ratio: rm / rs,
            east: g.u / rs,
            north: g.v / rs,
            alt: Math.asin(Math.max(-1, Math.min(1, g.zeta))) / RAD,
            q: q / RAD
        };
    }

    /** Raíz de f entre lo y hi por bisección (f cambia de signo en el intervalo). */
    function bisect(f, lo, hi) {
        let flo = f(lo);
        for (let i = 0; i < 60; i++) {
            const mid = (lo + hi) / 2, fm = f(mid);
            if ((fm > 0) === (flo > 0)) { lo = mid; flo = fm; } else hi = mid;
        }
        return (lo + hi) / 2;
    }

    /**
     * Circunstancias locales para una latitud y longitud (grados; sur y oeste negativos).
     * Devuelve { type: 'annular' | 'partial' | 'none', c1, c2, max, c3, c4 (ms UT o null),
     *            magnitude, obscuration (en el máximo), below: {c1, max, c4} (Sol bajo el horizonte) }.
     */
    function local(latDeg, lonDeg) {
        const obs = observer(latDeg, lonDeg);
        const none = { type: 'none', c1: null, c2: null, max: null, c3: null, c4: null, magnitude: 0, obscuration: 0, below: {}, obs };

        // Instante de máxima aproximación al eje de la sombra
        let t = 0;
        for (let i = 0; i < 30; i++) {
            const g = geometry(obs, t);
            const dt = -(g.u * g.a + g.v * g.b) / (g.a * g.a + g.b * g.b);
            t += dt;
            if (Math.abs(dt) < 1e-7) break;
        }
        const gm = geometry(obs, t);
        if (Math.abs(t) > 6 || gm.m >= gm.l1) return none;   // la penumbra no pasa por este lugar

        const outer = (tt) => { const g = geometry(obs, tt); return g.m - g.l1; };
        const inner = (tt) => { const g = geometry(obs, tt); return g.m - Math.abs(g.l2); };
        const span = 4;
        if (outer(t - span) <= 0 || outer(t + span) <= 0) return none;
        const c1 = bisect(outer, t - span, t), c4 = bisect(outer, t + span, t);
        let c2 = null, c3 = null;
        const central = gm.m < Math.abs(gm.l2);
        if (central) { c2 = bisect(inner, t - 0.5, t); c3 = bisect(inner, t + 0.5, t); }

        const altAt = (tt) => view(obs, msFromHours(tt)).alt;
        const below = { c1: altAt(c1) < 0, max: altAt(t) < 0, c4: altAt(c4) < 0 };
        if (below.c1 && below.max && below.c4) return none;  // ocurre con el Sol bajo el horizonte

        const vmax = view(obs, msFromHours(t));
        return {
            type: central && !below.max ? 'annular' : 'partial',
            c1: msFromHours(c1), c2: central ? msFromHours(c2) : null, max: msFromHours(t),
            c3: central ? msFromHours(c3) : null, c4: msFromHours(c4),
            // Magnitud: en la fase anular, cociente de diámetros Luna/Sol; si no, fracción del diámetro cubierta
            magnitude: central ? (gm.l1 - gm.l2) / (gm.l1 + gm.l2) : (gm.l1 - gm.m) / (gm.l1 + gm.l2),
            obscuration: vmax.obscuration,
            below, obs
        };
    }

    return { local, view, observer, elements: EL };
})();

if (typeof module !== 'undefined') module.exports = EclipseCalc;
