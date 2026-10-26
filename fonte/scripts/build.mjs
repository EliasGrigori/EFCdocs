/* EFCdocs — monta o app para publicar (pasta dist/).
   node scripts/build.mjs  →  dist/ com index.html, sw.js, manifest, ícones e assets/ com nomes por conteúdo. */
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, copyFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(raiz, 'dist');
const versao = readFileSync(join(raiz, 'src/nucleo/modelo.js'), 'utf8').match(/VERSAO = '(v[\d.]+)'/)[1];

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, 'assets'), { recursive: true });

/* v0.5.0: o leitor de Excel roda num trabalhador; o código dele vai dentro do app (sem arquivo a mais para o cache) */
const trab = await build({
  entryPoints: [join(raiz, 'src/planilha/xlsx/trabalhador.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020', 'chrome90', 'safari15'],
  loader: { '.js': 'jsx' },
  write: false,
  legalComments: 'none',
  logLevel: 'warning',
});
const codigoTrab = trab.outputFiles[0].text;

const r = await build({
  entryPoints: [join(raiz, 'src/main.jsx')],
  bundle: true,
  minify: true,
  format: 'esm',
  target: ['es2020', 'chrome90', 'safari15'],
  jsx: 'automatic',
  loader: { '.js': 'jsx' },
  outdir: join(dist, 'assets'),
  entryNames: 'app-[hash]',
  assetNames: 'app-[hash]',
  metafile: true,
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"', __EFC_TRABALHADOR_XLSX__: JSON.stringify(codigoTrab) },
  logLevel: 'warning',
});

const assets = readdirSync(join(dist, 'assets'));
const js = assets.find((f) => f.endsWith('.js'));
const css = assets.find((f) => f.endsWith('.css'));

for (const f of readdirSync(join(raiz, 'publico'))) copyFileSync(join(raiz, 'publico', f), join(dist, f));

const index = readFileSync(join(raiz, 'scripts/index.modelo.html'), 'utf8')
  .replace('{{CSS}}', './assets/' + css)
  .replace('{{JS}}', './assets/' + js);
writeFileSync(join(dist, 'index.html'), index);

writeFileSync(join(dist, 'manifest.webmanifest'), JSON.stringify({
  name: 'EFCdocs · Planilha, Documento e Post-its',
  short_name: 'EFCdocs',
  description: 'EFCdocs: planilhas, documentos (POP e formulários) e quadros de post-its para a Qualidade.',
  lang: 'pt-BR',
  id: './',
  start_url: './index.html',
  scope: './',
  display: 'standalone',
  orientation: 'any',
  /* mesma cor do meio da tela de abertura: o app instalado não pisca outro tom ao abrir (achado 5 do Grok) */
  background_color: '#143c47',
  theme_color: '#143c47',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2) + '\n');

const arquivos = ['./', ...['apple-touch-icon.png', 'assets/' + css, 'assets/' + js, 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'index.html', 'manifest.webmanifest'].map((f) => './' + f)];
const sw = readFileSync(join(raiz, 'scripts/sw.modelo.js'), 'utf8')
  .replace('{{VERSAO}}', 'efcdocs-' + versao)
  .replace('{{ARQUIVOS}}', JSON.stringify(arquivos, null, 2));
writeFileSync(join(dist, 'sw.js'), sw);
copyFileSync(join(raiz, 'scripts/COMO-PUBLICAR.md'), join(dist, 'COMO-PUBLICAR.md'));

const kb = (f) => (statSync(join(dist, f)).size / 1024).toFixed(1) + ' KB';
console.log(`EFCdocs ${versao} montado em dist/`);
console.log(`  assets/${js}  ${kb('assets/' + js)}`);
console.log(`  assets/${css} ${kb('assets/' + css)}`);
console.log(`  (leitor de Excel no trabalhador: ${(codigoTrab.length / 1024).toFixed(1)} KB dentro do app)`);
void r;
