# Validación de efemérides / Ephemeris validation

Comparación de SeleneSight (Astronomy Engine, modelo de rotación IAU) con **JPL Horizons** (DE441, marco MOON_ME de alta precisión, sin atmósfera), consultado el 14/11/2026.
SeleneSight (Astronomy Engine, IAU rotation model) vs **JPL Horizons** (DE441, high-precision MOON_ME frame, airless), queried 2026-11-14.

| Caso / Case | Sitio / Site | Fechas / Dates (UTC) | Máx. |ΔAz| | Máx. |ΔEl| |
|---|---|---|---|---|
| Sol / Sun | 89,6875°S 162,5594°O, 1,729 km | 2027-10-14 00:00 → 10-15 00:00 (cada 6 h) | 0,14′ | 0,08′ |
| Tierra (con paralaje) / Earth (with parallax) | 85,972°S 2,11°O, 4,977 km (Malapert) | 2029-06-26 01:00 → 06:00 (cada 1 h, eclipse total) | 0,03′ | 0,02′ |
| Sol / Sun (fin del ciclo) | 89,6875°S 162,5594°O | 2044-12-01 00:00 → 12-02 00:00 (cada 12 h) | 0,16′ | 0,04′ |

′ = minuto de arco / arcminute. El disco solar mide ~32′; el error es más de 100 veces menor que su radio.
The solar disk is ~32′ wide; the error is over 100 times smaller than its radius.

Consulta de ejemplo / Sample query:
`https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND=10&CENTER=coord@301&COORD_TYPE=GEODETIC&SITE_COORD='197.4406,-89.6875,1.729'&START_TIME=2027-10-14&STOP_TIME=2027-10-15&STEP_SIZE=6h&QUANTITIES=4`
