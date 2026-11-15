"""Estadísticas de largo plazo (18,6 años) por hexágono, con eclipses (Tierra tapando al Sol).
  python3 longterm.py run [segundos]   -> procesa tandas pendientes (reanudable)
  python3 longterm.py fin              -> escribe {T}_vis.bin (meses 2027–2030) y {T}_long.bin
Usa los horizontes de work/ (stages.py hz) y eph_long.npy (eph.py)."""
import numpy as np, numba as nb, math, json, os, sys, time
R = 1737400.0; OBS_H = 2.0; NAZ = 720; WORK = os.environ.get('SELENE_WORK', 'work80'); OUT = '../app/data'; CH = 1000
DARK = 0.01   # fracción de disco solar por debajo de la cual se cuenta "noche"
LEVELS = os.environ.get('SELENE_LT', 'L10,L5').split(',')

@nb.njit(cache=True, fastmath=True)
def hz_at(h, az):
    f = az/360.0*NAZ; i = int(math.floor(f)) % NAZ; j = (i+1) % NAZ; w = f - math.floor(f)
    return h[i]*(1-w) + h[j]*w

@nb.njit(cache=True, fastmath=True)
def overlap(r1, r2, d):   # fracción del disco 1 (Sol) cubierta por el disco 2 (Tierra), en grados
    if d >= r1 + r2: return 0.0
    if d <= abs(r2 - r1): return 1.0 if r2 >= r1 else (r2/r1)**2
    a = r1*r1*math.acos(min(1.0, max(-1.0, (d*d + r1*r1 - r2*r2)/(2*d*r1))))
    b = r2*r2*math.acos(min(1.0, max(-1.0, (d*d + r2*r2 - r1*r1)/(2*d*r2))))
    c = 0.5*math.sqrt(max(0.0, (-d+r1+r2)*(d+r1-r2)*(d-r1+r2)*(d+r1+r2)))
    return (a + b - c)/(math.pi*r1*r1)

@nb.njit(cache=True, parallel=True, fastmath=True)
def stats(lat, lon, h0, hz, eph, midx, nm):
    P = lat.shape[0]; N = eph.shape[0]
    msun = np.zeros((P, nm), np.float32); mear = np.zeros((P, nm), np.float32)
    tsun = np.zeros(P); tear = np.zeros(P); night = np.zeros(P, np.int32); black = np.zeros(P, np.int32); smax = np.zeros(P)
    for p in nb.prange(P):
        cl = math.cos(lat[p]); sl = math.sin(lat[p]); co = math.cos(lon[p]); so = math.sin(lon[p])
        ux, uy, uz = cl*co, cl*so, sl; ex, ey = -so, co; nx, ny, nz = -sl*co, -sl*so, cl
        ro = (R + h0[p] + OBS_H)/1000.0
        run = 0; brun = 0; mx = 0; bmx = 0; ss = 0.0; se = 0.0; sm = 0.0
        for k in range(N):
            sx, sy, sz, rs = eph[k, 0], eph[k, 1], eph[k, 2], eph[k, 3]
            el = math.degrees(math.asin(min(1.0, max(-1.0, sx*ux + sy*uy + sz*uz))))
            az = math.degrees(math.atan2(sx*ex + sy*ey, sx*nx + sy*ny + sz*nz)) % 360.0
            x = min(1.0, max(-1.0, (el - hz_at(hz[p], az))/rs))
            f = 1.0 - (math.acos(x) - x*math.sqrt(1.0 - x*x))/math.pi
            vx = eph[k, 4] - ux*ro; vy = eph[k, 5] - uy*ro; vz = eph[k, 6] - uz*ro; d = math.sqrt(vx*vx + vy*vy + vz*vz)
            vx /= d; vy /= d; vz /= d
            eel = math.degrees(math.asin(vx*ux + vy*uy + vz*uz))
            eaz = math.degrees(math.atan2(vx*ex + vy*ey, vx*nx + vy*ny + vz*nz)) % 360.0
            vis = 1.0 if eel > hz_at(hz[p], eaz) else 0.0
            if f > 0.0:   # eclipse: la Tierra tapa parte del Sol
                sep = math.degrees(math.acos(min(1.0, max(-1.0, sx*vx + sy*vy + sz*vz))))
                f *= 1.0 - overlap(rs, math.degrees(math.asin(6371.0/d)), sep)
            ss += f; se += vis
            if f > sm: sm = f
            m = midx[k]
            if m >= 0:
                msun[p, m] += f; mear[p, m] += vis
            if f < DARK:
                run += 1
                if run > mx: mx = run
            else: run = 0
            if vis == 0.0:
                brun += 1
                if brun > bmx: bmx = brun
            else: brun = 0
        tsun[p] = ss/N; tear[p] = se/N; night[p] = mx; black[p] = bmx; smax[p] = sm
    return msun, mear, tsun, tear, night, black, smax

def prep():
    eph = np.load('eph_long.npy'); meta = json.load(open(f'{OUT}/eph_meta.json'))
    ML = meta['monthsLong']; midx = -np.ones(len(eph), np.int32); cnt = np.zeros(len(ML))
    for m, mo in enumerate(ML): midx[mo['h0']:mo['h1']+1] = m; cnt[m] = mo['h1'] - mo['h0'] + 1
    return eph, meta, midx, cnt

if __name__ == '__main__':
    mode = sys.argv[1]; eph, meta, midx, cnt = prep(); nm = len(cnt); _cache = {}
    if mode == 'run':
        budget = float(sys.argv[2]) if len(sys.argv) > 2 else 140; t0 = time.time()
        for T in LEVELS:
            A = np.load(f'{WORK}/{T}_pts.npy'); mp = np.load(f'{WORK}/{T}_map.npy'); B = np.where(mp < 0)[0]; n = len(B)
            for s in range(0, n, CH):
                f = f'{WORK}/{T}_blt_{s}.npz'
                if os.path.exists(f): continue
                if time.time() - t0 > budget: print('PAUSA'); sys.exit(0)
                if T not in _cache:   # horizontes de la franja, en bloques de 400 (stages.py)
                    _cache[T] = np.concatenate([np.load(f'{WORK}/{T}_bhz_{b}.npy') for b in range(0, n, 400)])
                sl = B[s:s+CH]
                r = stats(A[sl, 2], A[sl, 3], A[sl, 4], _cache[T][s:s+CH].astype(np.float32), eph, midx, nm)
                np.savez(f, *r); print(T, 'franja', s, '/', n, f'{time.time()-t0:.0f}s', flush=True)
        print('LT_COMPLETO')
    elif mode == 'fin':
        Md = len(meta['months'])
        for T in LEVELS:
            A = np.load(f'{WORK}/{T}_pts.npy'); mp = np.load(f'{WORK}/{T}_map.npy'); B = np.where(mp < 0)[0]; N = len(A)
            def load(parts): return [np.concatenate([q[f'arr_{k}'] for q in parts]) for k in range(7)]
            nw = load([np.load(f'{WORK}/{T}_blt_{s}.npz') for s in range(0, len(B), CH)]) if len(B) else None
            no = len(np.load(f'work/{T}_pts.npy')) if (mp >= 0).any() else 0
            od = load([np.load(f'work/{T}_lt_{s}.npz') for s in range(0, no, CH)]) if no else None
            cols = []
            for k in range(7):
                ref = (nw or od)[k]; a = np.zeros((N,) + ref.shape[1:], ref.dtype)
                if nw: a[B] = nw[k]
                if od: a[mp >= 0] = od[k][mp[mp >= 0]]
                cols.append(a)
            msun, mear, tsun, tear, night, black, smax = cols
            ms = msun/cnt*100; me = mear/cnt*100
            np.column_stack([ms[:, :Md], me[:, :Md]]).round().astype(np.uint8).tofile(f'{OUT}/{T}_vis.bin')
            lng = np.column_stack([np.round(tsun*100), np.round(tear*100), smax == 0, np.minimum(night, 65535), np.minimum(black, 65535),
                                   np.round(ms.min(1)), np.round(me.min(1))]).astype('<u2')
            lng.tofile(f'{OUT}/{T}_long.bin')
            print(T, N, f'(franja nueva {len(B)})', 'sol% 18.6a max', lng[:, 0].max(), '| noche min (d)', round(night.min()/24, 1), '| apagón Tierra min (d)', round(black.min()/24, 1), '| psr', int((smax == 0).sum()))
