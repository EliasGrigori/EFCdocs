/* Vértice Docs v0.6.58 — D-30 (forma com foto de fundo aparece cinza e perde a foto ao salvar) e D-17 (estilo de tabela
   próprio do arquivo não é desenhado). Abre a amostra inventada testes/amostras/amostra-v0658.xlsx no app.
   Falha na v0.6.57 e passa na v0.6.58. Uso: node scripts/testar-excel-v0658.mjs <endereço> [pasta-dos-prints] */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
const BASE = process.argv[2] || 'http://localhost:8731/';
const PRINTS = process.argv[3] || '';
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-v0658.xlsx', import.meta.url));
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const nav = await chromium.launch({ executablePath: CHROME });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce' });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
let falhas = 0;
const caso = (nome, ok, info = '') => { console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome}${info ? ' — ' + info : ''}`); if (!ok) falhas++; };
const px = (x, y) => p.evaluate(({ x, y }) => {
  for (const s of ['.pl-cv-cong', '.pl-cv']) {
    const c = document.querySelector(s); if (!c) continue;
    const r = c.getBoundingClientRect(), k = c.width / r.width;
    const d = c.getContext('2d').getImageData(Math.round((x - r.x) * k), Math.round((y - r.y) * k), 1, 1).data;
    if (s === '.pl-cv-cong' && d[3] === 0) continue;
    return [d[0], d[1], d[2]];
  }
}, { x, y });
const perto = (a, hex) => { const b = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); return a && a.every((v, i) => Math.abs(v - b[i]) <= 6); };
await p.goto(BASE + '#/'); await p.waitForSelector('[data-abrir-excel]'); await p.click('[data-abrir-excel]');
await p.setInputFiles('[data-excel-arquivo]', AMOSTRA); await p.waitForSelector('[data-excel-abrir]', { timeout: 60000 });
await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv', { timeout: 60000 }); await p.waitForTimeout(1200);

/* D-30: a forma com foto de fundo (aba Painel) */
const sv = await p.evaluate(() => { const g = [...document.querySelectorAll('svg')].map((s) => s.outerHTML).find((h) => /Foto de fundo/.test(h)) || ''; return { pattern: /<pattern[\s\S]*?<image/.test(g), cinza: /fill="#d9d9d9"/i.test(g) }; });
caso('D-30: a forma com foto de fundo mostra a foto (não um cinza)', sv.pattern && !sv.cinza, JSON.stringify(sv));
if (PRINTS) await p.screenshot({ path: `${PRINTS}/1-formas.png`, clip: { x: 40, y: 150, width: 900, height: 420 } });

/* D-17: aba Tabela com o estilo próprio */
await p.locator('.pl-aba', { hasText: 'Tabela' }).first().click(); await p.waitForTimeout(800);
const cv = await p.locator('.pl-cv').boundingBox();
const X = cv.x + 46 + 60, Y = (lin) => cv.y + 22 + 20 * lin + 4; /* canto direito da célula A, longe do texto */
const cab = await px(X, Y(0)), l2 = await px(X, Y(1)), l3 = await px(X, Y(2));
caso('D-17: título da tabela no azul escuro do estilo do arquivo', perto(cab, '#1f3b4d'), String(cab));
caso('D-17: primeira linha de dados com a listra clara', perto(l2, '#dcebf5'), String(l2));
caso('D-17: segunda linha sem listra (branca)', perto(l3, '#ffffff'), String(l3));
if (PRINTS) await p.screenshot({ path: `${PRINTS}/2-tabela.png`, clip: { x: cv.x, y: cv.y, width: 520, height: 200 } });
caso('sem erro na página', erros.length === 0, erros.join(' | '));
await nav.close();
console.log(falhas ? `FIM: ${falhas} falha(s)` : 'FIM: tudo certo');
process.exit(falhas ? 1 : 0);
