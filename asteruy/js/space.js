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
     * Modelo 3D de la órbita, a escala en distancias e inclinación:
     * Sol, Tierra (1 UA), Marte (1,52 UA), Júpiter (5,2 UA) y el asteroide (a, e, i).
     * La orientación de la órbita (nodo y perihelio) es ilustrativa: sale de una semilla.
     * orbit() solo deja el lugar marcado; mountOrbits() lo dibuja y lo hace girar con un dedo.
     */
    function orbit(o, seed, color, L = {}) {
        const data = esc(JSON.stringify({ a: o.a, e: o.e, i: o.i, seed: String(seed), color,
            earth: L.earth || 'Tierra', mars: L.mars || 'Marte', jupiter: L.jupiter || 'Júpiter' }));
        return `<div class="orbit3d" data-orbit="${data}">
            <svg class="orbit" viewBox="0 0 300 300" role="img" aria-label="${L.aria || ''}" tabindex="0"></svg>
            <button type="button" class="orbit__reset" aria-label="${L.reset || ''}" title="${L.reset || ''}">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
        </div>`;
    }

    const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

    // ---- Álgebra mínima: matrices 3×3 como arreglos de filas ----
    const mul = (A, B) => A.map(row => [0, 1, 2].map(j => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j]));
    const apply = (R, p) => [0, 1, 2].map(k => R[k][0] * p[0] + R[k][1] * p[1] + R[k][2] * p[2]);
    function axisAngle([x, y, z], t) {
        const c = Math.cos(t), s = Math.sin(t), C = 1 - c;
        return [[c + x * x * C, x * y * C - z * s, x * z * C + y * s],
                [y * x * C + z * s, c + y * y * C, y * z * C - x * s],
                [z * x * C - y * s, z * y * C + x * s, c + z * z * C]];
    }
    function orthonormalize(R) {          // evita que los redondeos deformen el modelo tras muchos giros
        const n = v => { const l = Math.hypot(...v); return v.map(q => q / l); };
        const a = n(R[0]), d = a[0] * R[1][0] + a[1] * R[1][1] + a[2] * R[1][2];
        const b = n(R[1].map((q, k) => q - d * a[k]));
        return [a, b, [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]];
    }
    // Vista inicial: desde arriba (norte de la eclíptica hacia quien mira), inclinada 50° para que se note el relieve.
    // Coordenadas de pantalla: x a la derecha, y hacia abajo, z hacia quien mira.
    const TOP = [[1, 0, 0], [0, -1, 0], [0, 0, 1]];
    const START = mul(axisAngle([1, 0, 0], 50 * Math.PI / 180), TOP);

    function mountOrbits(root) {
        root.querySelectorAll('.orbit3d').forEach(mountOrbit);
    }

    function mountOrbit(box) {
        const d = JSON.parse(box.dataset.orbit);
        const svg = box.querySelector('svg.orbit');
        const S = 300, c = S / 2, k = (S / 2 - 14) / 5.45;     // px por UA (Júpiter cabe en cualquier giro)
        const r = rng('orb' + d.seed);
        const deg = Math.PI / 180;
        const node = r() * 360 * deg, peri = r() * 360 * deg, inc = d.i * deg;

        // Puntos 3D (en UA). Plano de los planetas = plano xy; z = hacia el norte.
        const circle = (R, n = 96) => Array.from({ length: n }, (_, q) => {
            const t = q / n * 2 * Math.PI; return [R * Math.cos(t), R * Math.sin(t), 0];
        });
        const N = 180;
        const astPoint = nu => {
            const rr = d.a * (1 - d.e * d.e) / (1 + d.e * Math.cos(nu)), u = peri + nu;
            return [rr * (Math.cos(node) * Math.cos(u) - Math.sin(node) * Math.sin(u) * Math.cos(inc)),
                    rr * (Math.sin(node) * Math.cos(u) + Math.cos(node) * Math.sin(u) * Math.cos(inc)),
                    rr * Math.sin(u) * Math.sin(inc)];
        };
        const ast = Array.from({ length: N }, (_, q) => astPoint(q / N * 2 * Math.PI));
        // Nodos: donde la órbita cruza el plano de los planetas (u = 0 y u = 180°)
        const nodeAsc = astPoint(-peri), nodeDesc = astPoint(Math.PI - peri);
        const planets = [
            { R: 1, col: '#7DD3FC', label: d.earth, at: 90 },
            { R: 1.524, col: '#FF8A65', label: d.mars, at: 225 },
            { R: 5.2, col: '#E8C39E', label: d.jupiter, at: -45 }
        ].map(p => ({ ...p, pts: circle(p.R) }));
        const disc = circle(5.45, 72);

        let R = START;
        const proj = p => { const v = apply(R, p); return [c + v[0] * k, c + v[1] * k, v[2]]; };
        const f1 = n => n.toFixed(1);
        const path = (pts, close) => pts.map((p, q) => (q ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join('') + (close ? 'Z' : '');

        function draw() {
            // ¿Vemos el plano desde el norte (arriba) o desde el sur?
            const fromNorth = R[2][2] >= 0;
            const P = ast.map(proj);
            // Tramos por encima (z > 0) y por debajo (z < 0) del plano de los planetas
            const above = [], below = [];
            let run = [], sign = ast[0][2] >= 0;
            for (let q = 0; q <= N; q++) {
                const idx = q % N, sg = ast[idx][2] >= 0;
                if (sg !== sign) { (sign ? above : below).push(run); run = [run[run.length - 1]]; sign = sg; }
                run.push(P[idx]);
            }
            (sign ? above : below).push(run);
            const seg = (runs, front) => runs.filter(x => x.length > 1).map(x =>
                front ? `<path d="${path(x)}" fill="none" stroke="${d.color}" stroke-width="2.6" stroke-linejoin="round"/>`
                      : `<path d="${path(x)}" fill="none" stroke="${d.color}" stroke-width="2" stroke-dasharray="4 4" opacity=".55"/>`).join('');
            // Líneas verticales hasta el plano: muestran la altura de la órbita
            let drops = '';
            for (let q = 0; q < N; q += 10) {
                const p = ast[q], a2 = proj(p), b2 = proj([p[0], p[1], 0]);
                drops += `<line x1="${f1(a2[0])}" y1="${f1(a2[1])}" x2="${f1(b2[0])}" y2="${f1(b2[1])}" stroke="${d.color}" stroke-width="1" opacity=".4"/>`;
            }
            const planetsSvg = planets.map(p => {
                const t = p.at * deg, l = proj([(p.R + .32) * Math.cos(t), (p.R + .32) * Math.sin(t), 0]);
                const dx = l[0] - c, dy = l[1] - c, len = Math.hypot(dx, dy) || 1;
                const anchor = dx / len > .3 ? 'start' : dx / len < -.3 ? 'end' : 'middle';
                const yy = l[1] + (dy / len > .3 ? 9 : dy / len < -.3 ? -1 : 4);
                return `<path d="${path(p.pts.map(proj), true)}" fill="none" stroke="${p.col}" stroke-width="1" stroke-dasharray="3 4" opacity=".7"/>` +
                       `<text x="${f1(l[0])}" y="${f1(yy)}" text-anchor="${anchor}" fill="${p.col}" font-size="10">${esc(p.label)}</text>`;
            }).join('');
            const na = proj(nodeAsc), nd = proj(nodeDesc);
            const nodes = `<line x1="${f1(na[0])}" y1="${f1(na[1])}" x2="${f1(nd[0])}" y2="${f1(nd[1])}" stroke="#fff" stroke-width="1" stroke-dasharray="1 3" opacity=".5"/>` +
                [na, nd].map(n => `<circle cx="${f1(n[0])}" cy="${f1(n[1])}" r="2.5" fill="#fff" opacity=".8"/>`).join('');
            const plane = `<path d="${path(disc.map(proj), true)}" fill="#8FA2FF" fill-opacity=".08" stroke="#8FA2FF" stroke-opacity=".25" stroke-width="1"/>`;
            const sun = `<circle cx="${c}" cy="${c}" r="11" fill="#FFD45C" opacity=".25"/><circle cx="${c}" cy="${c}" r="7" fill="#FFD45C"/>`;
            const rock = proj(ast[0]);
            const body = `<circle cx="${f1(rock[0])}" cy="${f1(rock[1])}" r="5" fill="#C9BBA8" stroke="#fff" stroke-width="1"/>`;
            // Lo que queda del otro lado del plano se dibuja primero, "detrás" del plano semitransparente
            const far = fromNorth ? seg(below, false) : seg(above, true);
            const near = fromNorth ? seg(above, true) : seg(below, false);
            svg.innerHTML = far + plane + planetsSvg + drops + nodes + sun + near + body;
        }

        // ---- Girar con un dedo (o el mouse): el modelo rota como un objeto en la mano ----
        let last = null, frame = 0;
        const rotate = (dx, dy) => {
            const len = Math.hypot(dx, dy);
            if (!len) return;
            const scale = 300 / (svg.getBoundingClientRect().width || 300);   // px de pantalla → unidades del dibujo
            R = orthonormalize(mul(axisAngle([-dy / len, dx / len, 0], len * scale * .012), R));
            if (!frame) frame = requestAnimationFrame(() => { frame = 0; draw(); });
        };
        svg.addEventListener('pointerdown', e => {
            if (last) return;                                   // un solo dedo
            last = { id: e.pointerId, x: e.clientX, y: e.clientY };
            svg.setPointerCapture(e.pointerId);
            box.classList.add('is-dragging');
        });
        svg.addEventListener('pointermove', e => {
            if (!last || e.pointerId !== last.id) return;
            rotate(e.clientX - last.x, e.clientY - last.y);
            last.x = e.clientX; last.y = e.clientY;
        });
        const end = e => { if (last && e.pointerId === last.id) { last = null; box.classList.remove('is-dragging'); } };
        svg.addEventListener('pointerup', end);
        svg.addEventListener('pointercancel', end);
        // Teclado: flechas para girar
        svg.addEventListener('keydown', e => {
            const m = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] }[e.key];
            if (m) { e.preventDefault(); rotate(...m); }
        });
        box.querySelector('.orbit__reset').addEventListener('click', () => { R = START; draw(); });
        draw();
    }

    return { sky, asteroid, orbit, mountOrbits, sparkle };
})();
