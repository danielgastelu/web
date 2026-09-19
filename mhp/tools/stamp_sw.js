#!/usr/bin/env node
// Escribe en sw.js la lista de archivos de la app y una versión que cambia con cualquier modificación.
// Uso (desde la carpeta del proyecto):  node tools/stamp_sw.js
// Ejecutalo cada vez que cambies un archivo, antes de publicar: así las personas reciben el aviso «Actualizar».
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const SKIP = new Set(['sw.js', 'README.md']);
const SKIP_DIRS = new Set(['tools', 'node_modules', '.git']);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    const rel = path.relative(root, full).split(path.sep).join('/');
    if (fs.statSync(full).isDirectory()) { if (!SKIP_DIRS.has(name)) walk(full, out); }
    else if (!SKIP.has(rel)) out.push(rel);
  }
  return out;
}

const files = walk(root);
const hash = crypto.createHash('sha256');
for (const f of files) { hash.update(f); hash.update(fs.readFileSync(path.join(root, f))); }
const version = 'helios-' + hash.digest('hex').slice(0, 10);
const shell = ['./', ...files];

let sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
sw = sw.replace(/\/\*VERSION\*\/.*?\/\*END_VERSION\*\//s, `/*VERSION*/'${version}'/*END_VERSION*/`);
sw = sw.replace(/\/\*SHELL\*\/.*?\/\*END_SHELL\*\//s, `/*SHELL*/${JSON.stringify(shell, null, 2)}/*END_SHELL*/`);
fs.writeFileSync(path.join(root, 'sw.js'), sw);
console.log(`sw.js actualizado: ${version}, ${shell.length} archivos`);
