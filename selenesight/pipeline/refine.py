"""Refinamiento a 40 m alrededor de los mejores candidatos para paneles (noche continua más corta).
  python3 refine.py zones            -> elige zonas (work/R_zones.npy) a partir del nivel L2
  python3 refine.py run [segundos]   -> procesa zonas pendientes (reanudable): grilla 200 m → 3 mejores → grilla 40 m
  python3 refine.py arun [segundos]  -> regiones Artemis III (USGS) y sitios CLPS: grilla gruesa → 4 mejores → 40 m (reanudable)
  python3 refine.py fin              -> exporta el nivel R40 (zonas de mejor luz + regiones Artemis III) para la app"""
import numpy as np, json, os, sys, time, math
import horizons as H, longterm as LT
WORK = 'work'; OUT = '../app/data'; NEAR = '../data/LDEM_85S_40M.IMG'; FAR = '../data/LDEM_75S_240M.IMG'
AWORK = 'work80'; ANEAR = '../data/LDEM_80S_40M.IMG'; AFAR = '../data/LDEM_60S_240M.IMG'
MAXSLOPE = 8.0     # °, pendiente máxima aceptada para un sitio de alunizaje (preferencia; si no hay, se relaja)
ACH = 250          # puntos por tanda en las regiones
NZ = 60            # zonas a refinar
ZONE_R = 1500.0    # m, radio de la zona (grilla gruesa de 200 m)
FINE_R = 300.0     # m, radio de cada parche fino (40 m)
KEEP = 6           # puntos finales por zona


def load_l2():
    p = np.fromfile(f'{OUT}/L2_pts.bin', '<f4').reshape(-1, 6); a = np.fromfile(f'{OUT}/L2_long.bin', '<u2').reshape(-1, 7)
    return p, a

def zones():
    p, a = load_l2(); night = a[:, 3].astype(float); sun = a[:, 0].astype(float)
    X, Y = p[:, 0].astype(float), p[:, 1].astype(float)
    ok = (night < 65535) & (np.hypot(X, Y) < H.EXTENT - ZONE_R)
    # puntaje: noche más corta primero; desempate por % de Sol
    score = night - sun*0.5
    order = [i for i in np.argsort(score) if ok[i]]
    chosen = []
    for i in order:   # mínimos locales separados al menos 5 km
        if all(math.hypot(X[i]-X[j], Y[i]-Y[j]) > 5000 for j in chosen): chosen.append(i)
        if len(chosen) >= NZ: break
    z = np.array([[X[i], Y[i], night[i], sun[i]] for i in chosen]); np.save(f'{WORK}/R_zones.npy', z)
    print(len(z), 'zonas · noche (d) de', round(z[:, 2].min()/24, 1), 'a', round(z[:, 2].max()/24, 1))
    return z

def disk_grid(cx, cy, r, step):
    g = np.arange(-r, r + 1e-6, step); gx, gy = np.meshgrid(g, g); m = gx**2 + gy**2 <= r*r
    return np.column_stack([cx + gx[m], cy + gy[m]])

def evaluate(XY, dem, eph, midx, nm, D):
    near, nn, nres, far, fn, fres = dem
    XY = XY[np.hypot(XY[:, 0], XY[:, 1]) < H.EXTENT - 50]
    lat, lon = H.stereo_to_latlon(XY[:, 0], XY[:, 1])
    h0 = np.array([H.dem_h(x, y, near, nn, nres, far, fn, fres) for x, y in XY])
    hz = H.horizons(lat, lon, h0, D, near, nn, nres, far, fn, fres)
    st = LT.stats(lat, lon, h0, hz, eph, midx, nm)
    return XY, lat, lon, h0, hz, st

def pick(XY, night, sun, k, sep):
    order = np.lexsort((-sun, night)); out = []
    for i in order:
        if all(math.hypot(*(XY[i] - XY[j])) >= sep for j in out): out.append(i)
        if len(out) >= k: break
    return out

def run(budget):
    t0 = time.time(); z = np.load(f'{WORK}/R_zones.npy')
    near, nn, nres = H.load_dem(NEAR, 40.0); far, fn, fres = H.load_dem(FAR, 240.0); dem = (near, nn, nres, far, fn, fres)
    eph, meta, midx, cnt = LT.prep(); nm = len(cnt)
    d = [20.0]
    while d[-1] < 400000: d.append(d[-1] + max(20.0, d[-1]*0.005))
    D = np.array(d)
    for k, (cx, cy, n2, s2) in enumerate(z):
        f = f'{WORK}/R_{k}.npz'
        if os.path.exists(f): continue
        if time.time() - t0 > budget: print('PAUSA'); return
        XY, lat, lon, h0, hz, st = evaluate(disk_grid(cx, cy, ZONE_R, 200.0), dem, eph, midx, nm, D)
        best = pick(XY, st[4], st[2], 3, 400.0)
        fine = np.unique(np.round(np.vstack([disk_grid(*XY[i], FINE_R, 40.0) for i in best]) / 40) * 40, axis=0)
        XY2, lat2, lon2, h02, hz2, st2 = evaluate(fine, dem, eph, midx, nm, D)
        keep = pick(XY2, st2[4], st2[2], KEEP, 120.0)
        np.savez(f, xy=XY2[keep], lat=lat2[keep], lon=lon2[keep], h0=h02[keep], hz=hz2[keep],
                 msun=st2[0][keep], mear=st2[1][keep], tsun=st2[2][keep], tear=st2[3][keep], night=st2[4][keep], black=st2[5][keep], smax=st2[6][keep],
                 coarse_best=st[4].min(), fine_n=len(XY2))
        print(f'zona {k}: noche 2 km {n2/24:.1f} d → 200 m {st[4].min()/24:.1f} d → 40 m {st2[4][keep].min()/24:.1f} d · Sol {st2[2][keep].max()*100:.0f}% · {len(XY)}+{len(XY2)} pts · {time.time()-t0:.0f}s', flush=True)
    print('R_COMPLETO')

def stereo(la, lo):
    r = 2*H.R*math.tan(math.radians(90 + la)/2); return r*math.sin(math.radians(lo)), r*math.cos(math.radians(lo))

def in_hull(XY, Hh):   # polígono convexo antihorario
    ok = np.ones(len(XY), bool)
    for k in range(len(Hh)):
        a = Hh[k]; b = Hh[(k + 1) % len(Hh)]
        ok &= (b[0]-a[0])*(XY[:, 1]-a[1]) - (b[1]-a[1])*(XY[:, 0]-a[0]) >= 0
    return ok

def areas():
    A = json.load(open('artemis_regions.json')); out = []
    for g in A['regions']:
        Hh = np.array([stereo(*p) for p in g['hull']]); step = float(np.clip(math.sqrt(g['area_km2']*1e6/900), 300, 2500))
        lo, hi = Hh.min(0), Hh.max(0); gx, gy = np.meshgrid(np.arange(lo[0], hi[0], step), np.arange(lo[1], hi[1], step))
        XY = np.column_stack([gx.ravel(), gy.ravel()]); XY = XY[in_hull(XY, Hh)]
        out.append(dict(name=g['name'], kind='artemis', xy=XY, step=step, exact=None, centre=g['centre']))
    for g in A['sites']:
        cx, cy = stereo(*g['centre']); XY = np.vstack([[cx, cy], disk_grid(cx, cy, g['r_m'], 200.0)])
        out.append(dict(name=g['name'], kind='site', xy=XY, step=200.0, exact=(cx, cy), centre=g['centre']))
    return out

def chunked(name, XY, dem, eph, midx, nm, D, near_nres, t0, budget, keep_hz):
    """Evalúa XY por tandas de ACH guardando cada una; devuelve None si se agotó el tiempo."""
    parts = []
    for j in range(0, len(XY), ACH):
        f = f'{AWORK}/{name}_{j}.npz'
        if not os.path.exists(f):
            if time.time() - t0 > budget: return None
            xy, lat, lon, h0, hz, st = evaluate(XY[j:j+ACH], dem, eph, midx, nm, D)
            sl = H.slope_at(xy[:, 0], xy[:, 1], *near_nres)
            d = dict(xy=xy, lat=lat, lon=lon, h0=h0, slope=sl, msun=st[0], mear=st[1], tsun=st[2], tear=st[3], night=st[4], black=st[5], smax=st[6])
            if keep_hz: d['hz'] = hz
            np.savez(f, **d)
        parts.append(np.load(f))
    return {k: np.concatenate([p[k] for p in parts]) for k in parts[0].files}

def pick_slope(q, k, sep):
    idx = np.where(q['slope'] <= MAXSLOPE)[0]
    if len(idx) < k: idx = np.arange(len(q['night']))
    sub = pick(q['xy'][idx], q['night'][idx], q['tsun'][idx], k, sep)
    return [int(idx[i]) for i in sub]

def arun(budget):
    t0 = time.time(); os.makedirs(AWORK, exist_ok=True)
    near, nn, nres = H.load_dem(ANEAR, 40.0); far, fn, fres = H.load_dem(AFAR, 240.0); dem = (near, nn, nres, far, fn, fres)
    eph, meta, midx, cnt = LT.prep(); nm = len(cnt)
    d = [20.0]
    while d[-1] < 400000: d.append(d[-1] + max(20.0, d[-1]*0.005))
    D = np.array(d)
    for k, g in enumerate(areas()):
        f = f'{AWORK}/RA_{k}.npz'
        if os.path.exists(f): continue
        c = chunked(f'RA{k}c', g['xy'], dem, eph, midx, nm, D, (near, nres), t0, budget, False)
        if c is None: print('PAUSA'); return
        best = pick_slope(c, 4, max(1500.0, 2*g['step']))
        fine = np.vstack([disk_grid(*c['xy'][i], 400.0, 40.0) for i in best])
        fine = np.unique(np.round(fine/40)*40, axis=0)
        if g['exact'] is not None: fine = np.vstack([g['exact'], fine])
        q = chunked(f'RA{k}f', fine, dem, eph, midx, nm, D, (near, nres), t0, budget, True)
        if q is None: print('PAUSA'); return
        keep = pick_slope(q, KEEP, 120.0)
        if g['exact'] is not None and 0 not in keep: keep = [0] + keep[:KEEP-1]   # el sitio real siempre se conserva
        np.savez(f, **{key: q[key][keep] for key in q}, coarse_n=len(c['night']), fine_n=len(q['night']),
                 coarse_night=c['night'].min(), coarse_sun=c['tsun'].max())
        b = q['night'][keep].argmin()
        print(f"{g['name']}: {len(c['night'])}+{len(q['night'])} pts · mejor noche {q['night'][keep][b]/24:.1f} d · Sol {q['tsun'][keep].max()*100:.0f}% · pend {q['slope'][keep][b]:.1f}° · {time.time()-t0:.0f}s", flush=True)
    print('RA_COMPLETO')

def fin():
    z = np.load(f'{WORK}/R_zones.npy'); eph, meta, midx, cnt = LT.prep(); Md = len(meta['months'])
    near, nn, nres = H.load_dem(NEAR, 40.0)
    done = [k for k in range(len(z)) if os.path.exists(f'{WORK}/R_{k}.npz')]   # admite refinamiento parcial
    z = z[done]; parts = [np.load(f'{WORK}/R_{k}.npz') for k in done]
    g = lambda key: np.concatenate([q[key] for q in parts])
    xy = g('xy'); lat = g('lat'); lon = g('lon'); h0 = g('h0'); hz = g('hz')
    msun = g('msun'); mear = g('mear'); tsun = g('tsun'); tear = g('tear'); night = g('night'); black = g('black'); smax = g('smax')
    slope = H.slope_at(xy[:, 0], xy[:, 1], near, nres)
    zinfo = [{"x": float(a), "y": float(b), "night2km": float(c), "night40m": float(q['night'].min()), "kind": "light", "n": int(len(q['lat']))} for (a, b, c, _), q in zip(z, parts)]
    if os.path.exists(f'{AWORK}/RA_0.npz'):   # regiones Artemis III y sitios CLPS (DEM de 80°S)
        G = areas(); ad = [k for k in range(len(G)) if os.path.exists(f'{AWORK}/RA_{k}.npz')]; aq = [np.load(f'{AWORK}/RA_{k}.npz') for k in ad]
        cat = lambda key, base: np.concatenate([base] + [q[key] for q in aq])
        xy = cat('xy', xy); lat = cat('lat', lat); lon = cat('lon', lon); h0 = cat('h0', h0); hz = cat('hz', hz); slope = cat('slope', slope)
        msun = cat('msun', msun); mear = cat('mear', mear); tsun = cat('tsun', tsun); tear = cat('tear', tear); night = cat('night', night); black = cat('black', black); smax = cat('smax', smax)
        for k, q in zip(ad, aq):
            g = G[k]; zinfo.append({"name": g['name'], "kind": g['kind'], "lat": g['centre'][0], "lon": g['centre'][1], "n": int(len(q['lat'])),
                                    "night40m": float(q['night'].min()), "coarseN": int(q['coarse_n']), "fineN": int(q['fine_n']), "exact": g['exact'] is not None})
    np.column_stack([xy[:, 0], xy[:, 1], np.degrees(lat), np.degrees(lon), h0, slope]).astype('<f4').tofile(f'{OUT}/R40_pts.bin')
    ms = msun/cnt*100; me = mear/cnt*100
    np.column_stack([ms[:, :Md], me[:, :Md]]).round().astype(np.uint8).tofile(f'{OUT}/R40_vis.bin')
    np.column_stack([np.round(tsun*100), np.round(tear*100), smax == 0, np.minimum(night, 65535), np.minimum(black, 65535),
                     np.round(ms.min(1)), np.round(me.min(1))]).astype('<u2').tofile(f'{OUT}/R40_long.bin')
    np.round(hz*100).astype('<i2').tofile(f'{OUT}/hz/R40_0.bin')
    m = json.load(open(f'{OUT}/meta.json'))
    m['refined'] = {"tag": "R40", "diam": 40, "n": int(len(lat)), "tile": 100000,
                    "zones": zinfo}
    m['regions'] = json.load(open('artemis_regions.json'))
    json.dump(m, open(f'{OUT}/meta.json', 'w'), indent=1)
    print(f'zonas {len(done)}', 'R40', len(lat), 'puntos · noche mín', round(night.min()/24, 1), 'd · mediana', round(np.median(night)/24, 1), 'd · Sol máx', round(tsun.max()*100), '%')

if __name__ == '__main__':
    m = sys.argv[1]
    if m == 'zones': zones()
    elif m == 'run': run(float(sys.argv[2]) if len(sys.argv) > 2 else 140)
    elif m == 'arun': arun(float(sys.argv[2]) if len(sys.argv) > 2 else 140)
    elif m == 'fin': fin()
