/* Lluvia de papel picado en un <canvas> a pantalla completa, sin dependencias. */
const Confetti = (() => {
    const COLORS = ['#FF3D8B', '#FFC93C', '#22D3EE', '#7B2FF7', '#A3E635', '#F2671F', '#2F6BFF'];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let canvas, ctx, pieces = [], frame = null, dpr = 1;

    function setup() {
        if (canvas) return;
        canvas = document.createElement('canvas');
        canvas.className = 'confetti-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        // Como popover vive en la capa superior: queda por encima de los <dialog> modales
        if (canvas.showPopover) canvas.popover = 'manual';
        document.body.appendChild(canvas);
        ctx = canvas.getContext('2d');
        resize();
        window.addEventListener('resize', resize);
    }

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = innerWidth * dpr;
        canvas.height = innerHeight * dpr;
    }

    function rand(min, max) { return min + Math.random() * (max - min); }

    function spawn(count, fromTop) {
        for (let i = 0; i < count; i++) {
            pieces.push({
                x: fromTop ? rand(0, innerWidth) : innerWidth / 2 + rand(-60, 60),
                y: fromTop ? rand(-innerHeight * 0.6, -10) : innerHeight * 0.45,
                vx: fromTop ? rand(-1.2, 1.2) : rand(-9, 9),
                vy: fromTop ? rand(1.5, 4) : rand(-14, -5),
                w: rand(7, 13), h: rand(10, 18),
                rot: rand(0, Math.PI * 2), vr: rand(-0.25, 0.25),
                tilt: rand(0, Math.PI * 2), vt: rand(0.05, 0.15),
                color: COLORS[(Math.random() * COLORS.length) | 0],
                round: Math.random() < 0.25,
                life: 0
            });
        }
    }

    function tick() {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        pieces = pieces.filter(p => p.y < innerHeight + 40 && p.life < 600);
        for (const p of pieces) {
            p.life++;
            p.vy = Math.min(p.vy + 0.18, 5.5);   // gravedad con velocidad terminal
            p.vx *= 0.985;                        // resistencia del aire
            p.x += p.vx + Math.sin(p.tilt) * 0.8; // vaivén
            p.y += p.vy;
            p.rot += p.vr;
            p.tilt += p.vt;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.scale(1, Math.cos(p.tilt));       // giro 3D aparente
            ctx.fillStyle = p.color;
            if (p.round) {
                ctx.beginPath();
                ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            }
            ctx.restore();
        }
        frame = pieces.length ? requestAnimationFrame(tick) : (ctx.clearRect(0, 0, innerWidth, innerHeight), null);
    }

    /** big = true para el festejo de álbum completo */
    function fire(big = false) {
        if (reduceMotion.matches) return;
        setup();
        spawn(big ? 140 : 90, false);
        spawn(big ? 220 : 120, true);
        start();
        if (big) setTimeout(() => { spawn(160, true); start(); }, 900);
    }

    function start() {
        if (canvas.showPopover) {
            // reabrirlo lo vuelve a poner encima del último diálogo abierto
            if (canvas.matches(':popover-open')) canvas.hidePopover();
            canvas.showPopover();
        }
        if (!frame) frame = requestAnimationFrame(tick);
    }

    return { fire };
})();
