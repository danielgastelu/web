"""Efemérides horarias del Sol y la Tierra en el marco fijo lunar (modelo IAU, libraciones incluidas)
con Astronomy Engine.
 - eph_long.npy : 2027-01-01 → 2045-08-08 (ciclo nodal de 18,6 años), para estadísticas de largo plazo
 - ../app/data/eph.bin : ventana detallada 2027-01-01 → 2031-01-01 (float32, 8 por hora)
 - ../app/data/eph_meta.json : meses sinódicos (detalle y largo plazo) y eclipses lunares"""
import astronomy as A, numpy as np, json, math, datetime as dt
T0 = dt.datetime(2027, 1, 1); T_DET = dt.datetime(2031, 1, 1); T_LONG = dt.datetime(2045, 8, 8)
NH_DET = int((T_DET - T0).total_seconds()//3600); NH_LONG = int((T_LONG - T0).total_seconds()//3600)
AU = 149597870.7
t0 = A.Time.Make(2027, 1, 1, 0, 0, 0)
def rot(t):
    ax = A.RotationAxis(A.Body.Moon, t); a = math.radians(ax.ra*15); d = math.radians(ax.dec); W = math.radians(ax.spin)
    Rz = lambda th: np.array([[math.cos(th), math.sin(th), 0], [-math.sin(th), math.cos(th), 0], [0, 0, 1]])
    Rx = lambda th: np.array([[1, 0, 0], [0, math.cos(th), math.sin(th)], [0, -math.sin(th), math.cos(th)]])
    return Rz(W) @ Rx(math.pi/2 - d) @ Rz(math.pi/2 + a)
v = lambda q: np.array([q.x, q.y, q.z])
out = np.zeros((NH_LONG, 8))
for i in range(NH_LONG):
    t = t0.AddDays(i/24); R = rot(t); moon = v(A.GeoMoon(t)); sun = v(A.GeoVector(A.Body.Sun, t, True))
    s = R @ (sun - moon); e = R @ (-moon); sd = np.linalg.norm(s)
    out[i, 0:3] = s/sd; out[i, 3] = math.degrees(math.asin(695700/(sd*AU))); out[i, 4:7] = e*AU
np.save('eph_long.npy', out); np.save('eph_full.npy', out[:NH_DET])
out[:NH_DET].astype('<f4').tofile('../app/data/eph.bin')
def months(nh):
    res = []; nm = A.SearchMoonPhase(0, A.Time.Make(2026, 12, 1, 0, 0, 0), 40)
    while True:
        nx = A.SearchMoonPhase(0, nm.AddDays(1), 40); a = (nm.ut - t0.ut)*24; b = (nx.ut - t0.ut)*24
        if b > nh - 1: break
        if a >= 0: res.append({"start": nm.Utc().strftime('%Y-%m-%dT%H:%MZ'), "end": nx.Utc().strftime('%Y-%m-%dT%H:%MZ'), "h0": int(math.ceil(a)), "h1": int(math.floor(b))})
        nm = nx
    return res
ecl = []; e = A.SearchLunarEclipse(t0)
while e.peak.ut < t0.ut + NH_DET/24:
    ecl.append({"peak": e.peak.Utc().strftime('%Y-%m-%dT%H:%MZ'), "h": round((e.peak.ut - t0.ut)*24, 2), "kind": e.kind.name.lower(),
                "partial_min": round(2*e.sd_partial), "total_min": round(2*e.sd_total), "penum_min": round(2*e.sd_penum)})
    e = A.NextLunarEclipse(e.peak)
meta = {"t0": "2027-01-01T00:00Z", "nh": NH_DET, "months": months(NH_DET), "nhLong": NH_LONG, "longEnd": "2045-08-08", "monthsLong": months(NH_LONG), "eclipses": ecl}
json.dump(meta, open('../app/data/eph_meta.json', 'w'), indent=1)
print(NH_DET, NH_LONG, len(meta['months']), len(meta['monthsLong']), len(ecl))
