/* Vértice Docs v0.6.62 — gera as imagens das texturas do post-it (aprovadas em 25/11, a partir do catálogo do Elias):
   cafe.png (derramamento, opção C), amassado.png (facetas e vincos, opção B suave: 45% da força do catálogo),
   grao.png (grão do papel liso, ladrilho) e kraft.png (fibras e pintinhas, ladrilho). Fundo transparente: a cor é do post-it.
   A tela e o PDF usam os mesmos arquivos. Uso: node scripts/gerar-texturas.mjs */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
const SAIDA = fileURLToPath(new URL('../src/quadro/texturas/', import.meta.url));
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const O = 0.45; /* força das facetas do amassado (B suave) */
const FACETAS = [['31,1 59,6 88,54 3,54', 0, 0.065], ['59,6 134,4 114,68 88,54', 1, 0.28], ['134,4 170,0 215,35 162,74 114,68', 0, 0.075], ['170,0 218,2 215,35', 1, 0.22], ['3,54 88,54 66,112 7,90', 1, 0.24], ['88,54 114,68 152,154 77,155 66,112', 0, 0.05], ['114,68 162,74 212,101 183,159 152,154', 1, 0.26], ['162,74 215,35 220,66 212,101', 0, 0.085], ['7,90 66,112 40,160 1,126', 0, 0.07], ['183,159 212,101 219,134 213,156', 0, 0.095]];
const AMASSADO = `<svg xmlns='http://www.w3.org/2000/svg' width='440' height='320' viewBox='0 0 220 160' preserveAspectRatio='none'>` + FACETAS.map(([p, b, a]) => `<polygon points='${p}' fill='${b ? '#ffffff' : '#000000'}' fill-opacity='${(a * O).toFixed(3)}'/>`).join('') +
  `<path d='M59,6 L88,54 L66,112 L40,160 M134,4 L114,68 L152,154 M170,0 L162,74 L183,159 M3,54 L88,54 L114,68 L162,74 L212,101 M7,90 L66,112 L152,154' fill='none' stroke='#ffffff' stroke-opacity='${(0.48 * O).toFixed(2)}' stroke-width='1.1'/>` +
  `<path d='M60,7 L89,55 L67,113 L41,160 M135,5 L115,69 L153,154 M171,1 L163,75 L184,159' fill='none' stroke='#5a4618' stroke-opacity='${(0.14 * O).toFixed(2)}' stroke-width='0.9'/></svg>`;
const CAFE = `<svg xmlns='http://www.w3.org/2000/svg' width='440' height='320' viewBox='0 0 220 160' preserveAspectRatio='none'><defs><filter id='cf' x='-20%' y='-20%' width='140%' height='140%'><feTurbulence type='fractalNoise' baseFrequency='0.055' numOctaves='4' seed='11' result='n'/><feDisplacementMap in='SourceGraphic' in2='n' scale='7'/></filter></defs><g filter='url(#cf)' opacity='.8'><path d='M152,-6 C141,10 136,24 144,38 C150,48 141,58 152,68 C163,78 178,74 190,81 C200,87 210,92 224,82 L226,-6 Z' fill='#8c5220' fill-opacity='0.13'/><path d='M157,-4 C146,13 141,25 148,37 C154,48 145,57 156,66 C166,75 180,71 192,78 C202,84 212,88 224,78' fill='none' stroke='#63330f' stroke-width='2.6' stroke-opacity='0.4' stroke-linecap='round'/><path d='M196,96 C193,99 195,104 200,103 C204,102 204,96 199,95 Z' fill='#6e3a13' fill-opacity='0.3'/><path d='M208,108 C207,110 208,112 210,111 C212,110 211,107 208,108 Z' fill='#6e3a13' fill-opacity='0.34'/></g></svg>`;
const GRAO = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='120' height='120' filter='url(#n)' opacity='0.05'/></svg>`;
const KRAFT = `<div style="width:136px;height:136px;background-image:radial-gradient(rgba(92,60,28,.2) .9px, transparent 1px),radial-gradient(rgba(255,255,255,.36) .8px, transparent 1px);background-size:26px 26px,34px 34px;background-position:0 0,12px 14px"></div>`;
const nav = await chromium.launch({ executablePath: CHROME });
const p = await (await nav.newContext({ viewport: { width: 600, height: 400 } })).newPage();
for (const [nome, html, w, h] of [['amassado', AMASSADO, 440, 320], ['cafe', CAFE, 440, 320], ['grao', GRAO, 120, 120], ['kraft', KRAFT, 136, 136]]) {
  await p.setContent(`<html><body style="margin:0;background:transparent">${html}</body></html>`);
  await p.screenshot({ path: SAIDA + nome + '.png', clip: { x: 0, y: 0, width: w, height: h }, omitBackground: true });
}
await nav.close();
console.log('texturas gravadas em', SAIDA);
