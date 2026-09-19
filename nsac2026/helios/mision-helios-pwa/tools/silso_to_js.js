#!/usr/bin/env node
// Convierte el archivo oficial SN_ms_tot_V2.0.csv de SILSO (separador ";")
// en el arreglo de valores que usa js/silso.js.
//
// Uso:  node tools/silso_to_js.js SN_ms_tot_V2.0.csv 2008 > valores.txt
// Descarga del archivo: https://www.sidc.be/SILSO/datafiles  (serie "13-month smoothed monthly total sunspot number")
// Después pegá el resultado en `values` y ajustá startYear/startMonth en js/silso.js.
const fs = require('fs');
const [, , file, fromYear = '2008'] = process.argv;
if (!file) { console.error('Falta el archivo CSV.'); process.exit(1); }
const vals = [];
let first = null;
for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
  const c = line.trim().split(/\s*;\s*/);
  if (c.length < 4) continue;
  const y = +c[0], m = +c[1], v = parseFloat(c[3]);
  if (!(y >= +fromYear) || !isFinite(v) || v < 0) continue;   // -1 = sin dato
  if (first === null) first = [y, m];
  vals.push(v);
}
console.error(`Desde ${first[0]}-${first[1]}: ${vals.length} valores`);
console.log(JSON.stringify(vals));
