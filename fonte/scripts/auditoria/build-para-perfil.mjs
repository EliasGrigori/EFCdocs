import { build, analyzeMetafile } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
const raiz = process.cwd(), dist = '/tmp/f0/dev';
rmSync(dist, { recursive: true, force: true }); mkdirSync(join(dist, 'assets'), { recursive: true });
const trab = await build({ entryPoints: ['src/planilha/xlsx/trabalhador.js'], bundle: true, minify: true, format: 'iife', loader: { '.js': 'jsx' }, write: false, legalComments: 'none' });
const r = await build({ entryPoints: ['src/main.jsx'], bundle: true, minifyWhitespace: true, minifySyntax: true, minifyIdentifiers: false, format: 'esm', jsx: 'automatic', loader: { '.js': 'jsx' }, outdir: join(dist, 'assets'), entryNames: 'app', metafile: true, legalComments: 'none', define: { 'process.env.NODE_ENV': '"production"', __EFC_TRABALHADOR_XLSX__: JSON.stringify(trab.outputFiles[0].text) } });
for (const f of readdirSync('publico')) copyFileSync(join('publico', f), join(dist, f));
writeFileSync(join(dist, 'index.html'), readFileSync('scripts/index.modelo.html', 'utf8').replace('{{CSS}}', './assets/app.css').replace('{{JS}}', './assets/app.js'));
const m = r.metafile; const tot = {};
for (const [arq, o] of Object.entries(m.outputs)) if (arq.endsWith('.js')) for (const [i, v] of Object.entries(o.inputs)) { const k = i.startsWith('node_modules/') ? 'node_modules/' + i.split('/').slice(1, i.split('/')[1].startsWith('@') ? 3 : 2).join('/') : i.split('/').slice(0, 2).join('/'); tot[k] = (tot[k] || 0) + v.bytesInOutput; }
console.log(Object.entries(tot).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${(v / 1024).toFixed(0).padStart(6)} KB  ${k}`).join('\n'));
