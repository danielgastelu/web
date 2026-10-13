/* Dibujos espaciales sin imágenes: cielo estrellado, asteroides procedurales y esquema de órbitas. */
const Space = (() => {
    // Generador pseudoaleatorio con semilla: el mismo asteroide siempre se dibuja igual
    function rng(seed) {
        let s = 0;
        for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
        s = s || 1;
        return () => {
            s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
            return s / 4294967296;
        };
    }

    const sparkle = (x, y, r) => {
        const w = r * 0.22;
        return `M${x} ${y - r}L${x + w} ${y - w}L${x + r} ${y}L${x + w} ${y + w}L${x} ${y + r}L${x - w} ${y + w}L${x - r} ${y}L${x - w} ${y - w}Z`;
    };

    /** Cielo de fondo: puntos y destellos de fantasía en posiciones al azar (nuevas en cada visita). */
    function sky(el) {
        const W = 1000, H = 1000, rand = Math.random;
        let dots = '', glints = '';
        const area = innerWidth * innerHeight;
        const nDots = Math.round(Math.min(260, Math.max(110, area / 5200)));
        for (let k = 0; k < nDots; k++) {
            const r = rand() < .85 ? .8 + rand() * 1.1 : 1.8 + rand() * 1.2;
            const tw = rand() < .3 ? ` class="tw" style="animation-delay:${(rand() * 6).toFixed(2)}s;animation-duration:${(3 + rand() * 4).toFixed(2)}s"` : '';
            dots += `<circle cx="${(rand() * W).toFixed(1)}" cy="${(rand() * H).toFixed(1)}" r="${r.toFixed(2)}" fill="#fff" opacity="${(.35 + rand() * .6).toFixed(2)}"${tw}/>`;
        }
        const colors = ['#FFFFFF', '#FFE6A3', '#BFD0FF', '#FFC6E0'];
        for (let k = 0; k < 14; k++) {
            const r = 5 + rand() * 9;
            glints += `<path d="${sparkle(rand() * W, rand() * H, r)}" fill="${colors[(rand() * colors.length) | 0]}" opacity="${(.55 + rand() * .4).toFixed(2)}" class="tw" style="animation-delay:${(rand() * 5).toFixed(2)}s;animation-duration:${(4 + rand() * 4).toFixed(2)}s"/>`;
        }
        el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">${dots}${glints}</svg>`;
    }

    /** Asteroide procedural: forma irregular con cráteres, semilla = número del asteroide. */
    function asteroid(seed, { size = 100 } = {}) {
        const r = rng(seed);
        const id = 'a' + String(seed).replace(/\W/g, '') + Math.floor(r() * 1e6);
        const n = 15, c = 50, base = 33 + r() * 6;
        const radii = Array.from({ length: n }, () => base * (.78 + r() * .34));
        const smooth = radii.map((v, k) => (v * 2 + radii[(k + 1) % n] + radii[(k + n - 1) % n]) / 4);
        const squash = .78 + r() * .2, rot = r() * 360;
        const pts = smooth.map((rr, k) => {
            const a = k / n * Math.PI * 2;
            return [c + Math.cos(a) * rr, c + Math.sin(a) * rr * squash];
        });
        // contorno suave con curvas cuadráticas entre puntos medios
        let d = '';
        pts.forEach((p, k) => {
            const q = pts[(k + 1) % n];
            const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
            d += k === 0 ? `M${mx.toFixed(1)} ${my.toFixed(1)}` : `Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
        });
        const p0 = pts[0], q0 = pts[1];
        d += `Q${p0[0].toFixed(1)} ${p0[1].toFixed(1)} ${((p0[0] + q0[0]) / 2).toFixed(1)} ${((p0[1] + q0[1]) / 2).toFixed(1)}Z`;

        const hue = 20 + r() * 25, sat = 8 + r() * 14;
        let craters = '';
        const nc = 4 + Math.floor(r() * 4);
        for (let k = 0; k < nc; k++) {
            const a = r() * Math.PI * 2, dist = r() * base * .55;
            const cx = c + Math.cos(a) * dist, cy = c + Math.sin(a) * dist * squash, cr = 2.5 + r() * 6;
            craters += `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${cr.toFixed(1)}" ry="${(cr * .8).toFixed(1)}" fill="hsl(${hue} ${sat}% 22% / .55)"/>` +
                       `<ellipse cx="${(cx + cr * .25).toFixed(1)}" cy="${(cy + cr * .25).toFixed(1)}" rx="${(cr * .7).toFixed(1)}" ry="${(cr * .55).toFixed(1)}" fill="hsl(${hue} ${sat}% 70% / .18)"/>`;
        }
        return `<svg class="rock" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
            <defs><radialGradient id="${id}" cx="35%" cy="30%" r="80%">
                <stop offset="0" stop-color="hsl(${hue} ${sat}% 68%)"/>
                <stop offset=".55" stop-color="hsl(${hue} ${sat}% 42%)"/>
                <stop offset="1" stop-color="hsl(${hue} ${sat}% 18%)"/>
            </radialGradient></defs>
            <g transform="rotate(${rot.toFixed(0)} 50 50)"><path d="${d}" fill="url(#${id})"/>${craters}</g>
        </svg>`;
    }

    /**
     * Esquema de la órbita vista desde arriba, a escala en distancias:
     * Sol, Tierra (1 UA), Marte (1,52 UA), Júpiter (5,2 UA) y el asteroide (a, e).
     */
    function orbit(o, seed, color, L = { earth: 'Tierra', mars: 'Marte', jupiter: 'Júpiter', aria: '' }) {
        const S = 300, c = S / 2, k = (S / 2 - 12) / 5.4;      // px por UA
        const r = rng('orb' + seed);
        const a = o.a * k, b = o.a * Math.sqrt(1 - o.e * o.e) * k, f = o.a * o.e * k;
        const ang = (r() * 360).toFixed(0);
        // etiqueta ubicada en el ángulo (grados) indicado para que no se superpongan
        const planet = (R, col, label, deg) => {
            const t = deg * Math.PI / 180, x = c + Math.cos(t) * (R * k + 4), y = c + Math.sin(t) * (R * k + 4);
            const anchor = Math.cos(t) > .3 ? 'start' : Math.cos(t) < -.3 ? 'end' : 'middle';
            const dy = Math.sin(t) > .3 ? 10 : Math.sin(t) < -.3 ? -2 : 4;
            return `<circle cx="${c}" cy="${c}" r="${(R * k).toFixed(1)}" fill="none" stroke="${col}" stroke-width="1" stroke-dasharray="3 4" opacity=".7"/>` +
                   `<text x="${x.toFixed(1)}" y="${(y + dy).toFixed(1)}" text-anchor="${anchor}" fill="${col}" font-size="10">${label}</text>`;
        };
        return `<svg class="orbit" viewBox="0 0 ${S} ${S}" role="img" aria-label="${L.aria}">
            ${planet(1, '#7DD3FC', L.earth, 90)}
            ${planet(1.524, '#FF8A65', L.mars, 225)}
            ${planet(5.2, '#E8C39E', L.jupiter, -45)}
            <g transform="rotate(${ang} ${c} ${c})">
                <ellipse cx="${(c - f).toFixed(1)}" cy="${c}" rx="${a.toFixed(1)}" ry="${b.toFixed(1)}" fill="none" stroke="${color}" stroke-width="2.5"/>
                <circle cx="${(c - f + a).toFixed(1)}" cy="${c}" r="5" fill="#C9BBA8" stroke="#fff" stroke-width="1"/>
            </g>
            <circle cx="${c}" cy="${c}" r="7" fill="#FFD45C"/><circle cx="${c}" cy="${c}" r="11" fill="#FFD45C" opacity=".25"/>
        </svg>`;
    }

    return { sky, asteroid, orbit, sparkle };
})();
