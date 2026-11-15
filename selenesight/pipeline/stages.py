"""Ejecución por tandas (reanudable) del pipeline de horizons.py.
  python3 stages.py hz   NEAR FAR  [segundos]   -> calcula horizontes pendientes hasta agotar el tiempo
  python3 stages.py fin  NEAR FAR  TAG          -> series Sol/Tierra + archivos finales del nivel TAG
  python3 stages.py meta                        -> escribe meta.json
"""
import sys, os, time, json, math, numpy as np
import horizons as H
# Cobertura 80°S (DEM LDEM_80S_40M + LDEM_60S_240M): L10 y L5 hasta 80°S en work80/; L2 se conserva hasta 85°S (work/)
LEVELS = [int(v) for v in os.environ.get('SELENE_LEVELS', '10000,5000').split(',')]; CH = 400
WORK = os.environ.get('SELENE_WORK', 'work80'); ALL = [10000, 5000, 2000]
L2_EXTENT = 151680.0
os.makedirs(WORK, exist_ok=True)
def tag(d): return f'L{d//1000}'
def dists():
    d = [20.0]
    while d[-1] < 400000: d.append(d[-1] + max(20.0, d[-1]*0.005))
    return np.array(d)
def level_pts(diam, near, nn, nres, far, fn, fres):
    f = f'{WORK}/{tag(diam)}_pts.npy'
    if os.path.exists(f): return np.load(f)
    C = H.hex_centers(diam); X, Y = C[:, 0], C[:, 1]; lat, lon = H.stereo_to_latlon(X, Y)
    h0 = np.array([H.dem_h(x, y, near, nn, nres, far, fn, fres) for x, y in zip(X, Y)])
    a = np.column_stack([X, Y, lat, lon, h0]); np.save(f, a); return a
def band_map(T, A):
    """Para cada punto nuevo, índice del mismo punto en la corrida de 85°S (work/) o -1 si es de la franja 80–85°S.
    Dentro de 85°S el DEM de 40 m es el mismo producto LOLA: se reutilizan horizontes y estadísticas ya calculados."""
    f = f'{WORK}/{T}_map.npy'
    if os.path.exists(f): return np.load(f)
    mp = -np.ones(len(A), np.int64); fo = f'work/{T}_pts.npy'
    if os.path.exists(fo):
        O = np.load(fo); key = {(round(x), round(y)): i for i, (x, y) in enumerate(O[:, :2])}
        for i, (x, y) in enumerate(A[:, :2]): mp[i] = key.get((round(x), round(y)), -1)
    np.save(f, mp); return mp
def full_hz(T, A, mp):
    n = len(A); B = np.where(mp < 0)[0]; hz = np.empty((n, H.NAZ), np.float32)
    if len(B): hz[B] = np.concatenate([np.load(f'{WORK}/{T}_bhz_{s}.npy') for s in range(0, len(B), CH)])
    if (mp >= 0).any():
        no = len(np.load(f'work/{T}_pts.npy')); O = np.concatenate([np.load(f'work/{T}_hz_{s}.npy') for s in range(0, no, CH)])
        hz[mp >= 0] = O[mp[mp >= 0]]
    return hz
mode = sys.argv[1]
if mode in ('hz', 'fin'):
    near, nn, nres = H.load_dem(sys.argv[2], 40.0); far, fn, fres = H.load_dem(sys.argv[3], 240.0)
if mode == 'hz':
    budget = float(sys.argv[4]) if len(sys.argv) > 4 else 140; t0 = time.time(); D = dists()
    for diam in LEVELS:
        A = level_pts(diam, near, nn, nres, far, fn, fres); B = np.where(band_map(tag(diam), A) < 0)[0]; n = len(B)
        for s in range(0, n, CH):
            f = f'{WORK}/{tag(diam)}_bhz_{s}.npy'
            if os.path.exists(f): continue
            if time.time() - t0 > budget: print('PAUSA'); sys.exit(0)
            sl = B[s:s+CH]
            np.save(f, H.horizons(A[sl, 2], A[sl, 3], A[sl, 4], D, near, nn, nres, far, fn, fres))
            print(tag(diam), 'franja', s, '/', n, f'(de {len(A)})', f'{time.time()-t0:.0f}s', flush=True)
    print('HZ_COMPLETO')
elif mode == 'fin':
    T = sys.argv[4]; diam = int(T[1:])*1000
    A = level_pts(diam, near, nn, nres, far, fn, fres); n = len(A)
    hz = full_hz(T, A, band_map(T, A))
    X, Y, lat, lon, h0 = A.T   # los porcentajes (vis/long) los escribe longterm.py fin
    slope = H.slope_at(X, Y, near, nres)
    np.column_stack([X, Y, np.degrees(lat), np.degrees(lon), h0, slope]).astype('<f4').tofile(f'{H.OUT}/{T}_pts.bin')
    os.makedirs(f'{H.OUT}/hz', exist_ok=True); hzq = np.round(hz*100).astype('<i2')
    for ti in range(0, n, 1000): hzq[ti:ti+1000].tofile(f'{H.OUT}/hz/{T}_{ti//1000}.bin')
    print(T, n, 'puntos · altura', h0.min().round(), '…', h0.max().round(), 'm · pend. max', slope.max().round(1))
elif mode == 'meta':
    me = json.load(open(f'{H.OUT}/eph_meta.json')); lv = []
    old = json.load(open(f'{H.OUT}/meta.json')) if os.path.exists(f'{H.OUT}/meta.json') else {}
    for d in ALL:
        n = os.path.getsize(f'{H.OUT}/{tag(d)}_pts.bin')//24
        lv.append({"tag": tag(d), "diam": d, "n": n, "tile": 1000, "extent": L2_EXTENT if d == 2000 else H.EXTENT})
    out = {"R": H.R, "obsH": H.OBS_H, "naz": H.NAZ, "extent": H.EXTENT, "terrainN": 2048, "levels": lv, **me}
    for k in ('refined', 'regions'):
        if k in old: out[k] = old[k]
    json.dump(out, open(f'{H.OUT}/meta.json', 'w'), indent=1)
    print('meta ok', lv)
