"""Pipeline SeleneSight: grilla hexagonal (10/5/2 km) en estereográfica polar sur,
horizontes topográficos (720 azimuts, con curvatura lunar), % de Sol (fracción de
disco) y de Tierra (centro sobre el horizonte) por mes sinódico, pendiente y altura.
Uso: python3 horizons.py NEAR.IMG FAR.IMG"""
import numpy as np, numba as nb, json, math, sys, os, time
R = 1737400.0          # m, radio de referencia LOLA
OBS_H = 2.0            # m, altura del observador/panel/antena sobre el terreno
NAZ = 720              # azimuts (0.5°)
EXTENT = float(os.environ.get('SELENE_EXTENT', 304000.0))   # m, semiancho del área (80°S; antes 151680 = 85°S)
OUT = '../app/data'

def load_dem(path, res):
    n = int(round(math.sqrt(os.path.getsize(path)/2)))
    # se conserva en int16 (DN) para que el DEM de 80°S (15200², 462 MB) entre en memoria; dem_h escala ×0,5
    a = np.fromfile(path, dtype='<i2').reshape(n, n)
    return a, n, res

@nb.njit(cache=True, fastmath=True)
def dem_h(X, Y, near, nn, nres, far, fn, fres):
    # fila 0 = Y máximo; columna crece con X; centros de píxel simétricos
    c = X/nres + (nn-1)/2.0; r = (nn-1)/2.0 - Y/nres
    if c >= 0 and r >= 0 and c < nn-1 and r < nn-1:
        i = int(r); j = int(c); fr = r-i; fc = c-j
        return 0.5*(near[i,j]*(1-fr)*(1-fc) + near[i,j+1]*(1-fr)*fc + near[i+1,j]*fr*(1-fc) + near[i+1,j+1]*fr*fc)
    c = X/fres + (fn-1)/2.0; r = (fn-1)/2.0 - Y/fres
    if c >= 0 and r >= 0 and c < fn-1 and r < fn-1:
        i = int(r); j = int(c); fr = r-i; fc = c-j
        return 0.5*(far[i,j]*(1-fr)*(1-fc) + far[i,j+1]*(1-fr)*fc + far[i+1,j]*fr*(1-fc) + far[i+1,j+1]*fr*fc)
    return 0.0

@nb.njit(cache=True)
def basis(lat, lon):
    cl, sl, co, so = math.cos(lat), math.sin(lat), math.cos(lon), math.sin(lon)
    u = np.array([cl*co, cl*so, sl]); e = np.array([-so, co, 0.0]); n = np.array([-sl*co, -sl*so, cl])
    return u, e, n

@nb.njit(cache=True, parallel=True, fastmath=True)
def horizons(lat, lon, h0, dists, near, nn, nres, far, fn, fres):
    P = lat.shape[0]; out = np.empty((P, NAZ), np.float32)
    for p in nb.prange(P):
        u, e, n = basis(lat[p], lon[p])
        ro = R + h0[p] + OBS_H
        for k in range(NAZ):
            az = 2*math.pi*k/NAZ
            dx = math.cos(az)*n[0] + math.sin(az)*e[0]
            dy = math.cos(az)*n[1] + math.sin(az)*e[1]
            dz = math.cos(az)*n[2] + math.sin(az)*e[2]
            best = -1e9
            for d in dists:
                th = d/R; c = math.cos(th); s = math.sin(th)
                qx = c*u[0]+s*dx; qy = c*u[1]+s*dy; qz = c*u[2]+s*dz
                k2 = 2*R/(1-qz)
                h = dem_h(k2*qy, k2*qx, near, nn, nres, far, fn, fres)
                rq = R + h
                # vector observador->terreno en el plano (u, dir): componentes
                vu = rq*c - ro; vd = rq*s
                t = vu/vd   # tangente de la elevación (vd>0)
                if t > best: best = t
            out[p, k] = math.degrees(math.atan(best))
    return out

def stereo_to_latlon(X, Y):
    r = np.hypot(X, Y)
    lat = -(np.pi/2 - 2*np.arctan(r/(2*R)))
    lon = np.arctan2(X, Y)   # mapX = r sin(lon), mapY = r cos(lon)
    return lat, lon

def hex_centers(diam, extent=None):
    """Hexágonos de vértice superior plano (flat-top); diam = diámetro entre vértices."""
    EXTENT_ = EXTENT if extent is None else extent
    s = diam/2; w = 1.5*s; hgt = math.sqrt(3)*s
    pts = []
    ncol = int(EXTENT_/w)+2; nrow = int(EXTENT_/hgt)+2
    for i in range(-ncol, ncol+1):
        x = i*w; off = hgt/2 if (i % 2) else 0.0
        for j in range(-nrow, nrow+1):
            y = j*hgt + off
            if math.hypot(x, y) <= EXTENT_: pts.append((x, y))
    return np.array(pts)

def sun_earth_series(lat, lon, h0, hz, eph):
    """Devuelve fracción de Sol visible (uint8 0-200 -> 0.5%) y visibilidad de Tierra (bool) por hora."""
    P = lat.shape[0]; NH = eph.shape[0]
    sdir = eph[:, 0:3]; srad = eph[:, 3]; evec = eph[:, 4:7]*1000.0  # m
    sun = np.empty((P, NH), np.float32); earth = np.empty((P, NH), np.bool_)
    for p in range(P):
        cl, sl, co, so = math.cos(lat[p]), math.sin(lat[p]), math.cos(lon[p]), math.sin(lon[p])
        u = np.array([cl*co, cl*so, sl]); e = np.array([-so, co, 0.0]); n = np.array([-sl*co, -sl*so, cl])
        # Sol (sin paralaje, despreciable)
        el = np.degrees(np.arcsin(np.clip(sdir@u, -1, 1)))
        az = np.degrees(np.arctan2(sdir@e, sdir@n)) % 360
        hzs = interp_h(hz[p], az)
        x = np.clip((el - hzs)/srad, -1, 1)
        sun[p] = 1 - (np.arccos(x) - x*np.sqrt(1-x*x))/np.pi
        # Tierra con paralaje topocéntrico
        obs = u*(R + h0[p] + OBS_H)
        v = evec - obs; v /= np.linalg.norm(v, axis=1)[:, None]
        el = np.degrees(np.arcsin(np.clip(v@u, -1, 1)))
        az = np.degrees(np.arctan2(v@e, v@n)) % 360
        earth[p] = el > interp_h(hz[p], az)
    return sun, earth

def interp_h(h, az):
    f = az/360.0*NAZ; i = np.floor(f).astype(int) % NAZ; j = (i+1) % NAZ; w = f - np.floor(f)
    return h[i]*(1-w) + h[j]*w

def slope_at(X, Y, near, nres):
    # pendiente (°) sobre una base de ~120 m (3 píxeles de 40 m) centrada en el punto
    nn = near.shape[0]; out = np.zeros(len(X), np.float32)
    for k in range(len(X)):
        c = int(round(X[k]/nres + (nn-1)/2)); r = int(round((nn-1)/2 - Y[k]/nres))
        if 3 <= c < nn-3 and 3 <= r < nn-3:
            gx = 0.5*(float(near[r, c+3]) - float(near[r, c-3]))/(6*nres); gy = 0.5*(float(near[r-3, c]) - float(near[r+3, c]))/(6*nres)
            out[k] = math.degrees(math.atan(math.hypot(gx, gy)))
    return out

def main(near_path, far_path, levels=(10000, 5000, 2000)):
    near, nn, nres = load_dem(near_path, 40.0)
    far, fn, fres = load_dem(far_path, 240.0)
    print('DEM', nn, near.min(), near.max(), '| far', fn, far.min(), far.max())
    eph = np.load('eph_full.npy'); meta_e = json.load(open(f'{OUT}/eph_meta.json'))
    months = meta_e['months']
    # distancias: paso fino cerca, creciente lejos (hasta 400 km)
    d = [20.0]
    while d[-1] < 400000: d.append(d[-1] + max(20.0, d[-1]*0.005))
    dists = np.array(d)
    print('pasos radiales', len(dists))
    meta = {"R": R, "obsH": OBS_H, "naz": NAZ, "extent": EXTENT, "levels": [], **meta_e}
    os.makedirs(f'{OUT}/hz', exist_ok=True)
    for diam in levels:
        t0 = time.time()
        C = hex_centers(diam); X, Y = C[:, 0], C[:, 1]
        lat, lon = stereo_to_latlon(X, Y)
        h0 = np.array([dem_h(x, y, near, nn, nres, far, fn, fres) for x, y in zip(X, Y)], np.float64)
        hz = horizons(lat, lon, h0, dists, near, nn, nres, far, fn, fres)
        t1 = time.time()
        M = len(months); P = len(X)
        msun = np.zeros((P, M), np.uint8); mear = np.zeros((P, M), np.uint8)
        tsun = np.zeros(P, np.uint8); tear = np.zeros(P, np.uint8); psr = np.zeros(P, bool)
        for c0 in range(0, P, 1500):
            sl_ = slice(c0, c0+1500)
            sun, earth = sun_earth_series(lat[sl_], lon[sl_], h0[sl_], hz[sl_], eph.astype(np.float64))
            for m, mo in enumerate(months):
                msun[sl_, m] = np.round(100*sun[:, mo['h0']:mo['h1']+1].mean(1))
                mear[sl_, m] = np.round(100*earth[:, mo['h0']:mo['h1']+1].mean(1))
            tsun[sl_] = np.round(100*sun.mean(1)); tear[sl_] = np.round(100*earth.mean(1))
            psr[sl_] = sun.max(1) == 0      # sin Sol en 2 años: sombra permanente (aprox.)
            del sun, earth
        slope = slope_at(X, Y, near, nres)
        tag = f'L{int(diam/1000)}'
        # tabla de puntos: float32 x,y,lat,lon,h | uint8 slope*2? -> guardamos float32 para simplicidad
        pts = np.column_stack([X, Y, np.degrees(lat), np.degrees(lon), h0, slope]).astype('<f4')
        pts.tofile(f'{OUT}/{tag}_pts.bin')
        np.column_stack([msun, mear, tsun, tear, psr.astype(np.uint8)]).astype(np.uint8).tofile(f'{OUT}/{tag}_vis.bin')
        TILE = 1000
        hzq = np.round(hz*100).astype('<i2')
        for ti in range(0, len(X), TILE):
            hzq[ti:ti+TILE].tofile(f'{OUT}/hz/{tag}_{ti//TILE}.bin')
        meta['levels'].append({"tag": tag, "diam": diam, "n": int(len(X)), "tile": TILE})
        print(tag, len(X), f'horizontes {t1-t0:.0f}s, series {time.time()-t1:.0f}s',
              'sol% max', tsun.max(), 'tierra% max', tear.max(), 'psr', psr.sum())
    json.dump(meta, open(f'{OUT}/meta.json', 'w'), indent=1)

if __name__ == '__main__':
    lv = tuple(int(v) for v in sys.argv[3].split(',')) if len(sys.argv) > 3 else (10000, 5000, 2000)
    main(sys.argv[1], sys.argv[2], lv)

def export_terrain(near_path, f=5):
    """Malla 3D (512² int16, m), grilla de pendientes de trayectos (2048², ~297 m) y relieve sombreado PNG (40 m × f por píxel)."""
    from PIL import Image
    near, nn, nres = load_dem(near_path, 40.0)
    m = (nn//f)*f
    b = np.empty((m//f, m//f), np.float32)
    for r0 in range(0, m//f, 200):   # por franjas, para no duplicar el DEM en memoria
        r1 = min(m//f, r0+200); b[r0:r1] = near[r0*f:r1*f, :m].reshape(r1-r0, f, m//f, f).mean((1, 3))*0.5
    res = nres*f
    gy, gx = np.gradient(b, res)
    # luz rasante desde arriba-izquierda, similar a mapas LOLA
    az, alt = math.radians(315), math.radians(35)
    slope = np.arctan(np.hypot(gx, gy)); aspect = np.arctan2(-gx, gy)
    sh = np.sin(alt)*np.cos(slope) + np.cos(alt)*np.sin(slope)*np.cos(az - aspect)
    sh = np.clip(sh, 0, 1)
    hn = (b - b.min())/(b.max() - b.min())
    img = np.clip(255*(0.25 + 0.6*sh*(0.65 + 0.35*hn)), 0, 255).astype(np.uint8)
    Image.fromarray(img).save(f'{OUT}/relief.png', optimize=True)
    g = 512; idx = np.linspace(0, b.shape[0]-1, g).round().astype(int)
    b[idx][:, idx].round().astype('<i2').tofile(f'{OUT}/terrain512.bin')
    g2 = 2048; idx2 = np.linspace(0, b.shape[0]-1, g2).round().astype(int)
    b[idx2][:, idx2].round().astype('<i2').tofile(f'{OUT}/terrain2048.bin')   # ~297 m, para pendientes de trayectos
    print('terreno', b.min(), b.max())
