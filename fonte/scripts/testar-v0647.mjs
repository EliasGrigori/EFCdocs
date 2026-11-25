/* Vértice Docs v0.6.47 — testes no navegador de D-80 (coluna/linha inteira com Ctrl+Shift+seta), D-73 (contorno na
   célula mesclada) e D-69 (cursor do cabeçalho). Usa a amostra inventada testes/amostras/amostra-varredura.xlsx
   (linhas congeladas, mescla B10:F10). Falha na v0.6.46 e passa na v0.6.47.
   Uso: node scripts/testar-v0647.mjs <endereço> */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-varredura.xlsx', import.meta.url));
const nav = await chromium.launch({ executablePath: CHROME });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce' });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
const erros = [];
p.on('pageerror', (e) => erros.push(String(e)));
/* cada grupo abre a amostra de novo: um caso não depende da rolagem deixada pelo outro */
let cv;
const abrir = async () => {
  await p.goto(BASE + '#/'); await p.reload(); await p.click('[data-abrir-excel]'); await p.setInputFiles('[data-excel-arquivo]', AMOSTRA);
  await p.waitForSelector('[data-excel-abrir]', { timeout: 60000 }); await p.click('[data-excel-abrir]');
  await p.waitForSelector('.pl-cv', { timeout: 60000 }); await p.waitForTimeout(1500);
  cv = await p.locator('.pl-cv').boundingBox();
};
let falhas = 0;
const caso = (nome, ok, info = '') => { console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome}${info ? ' — ' + info : ''}`); if (!ok) falhas++; };
const nome = () => p.locator('.pl-nome').inputValue();
const rol = () => p.evaluate(() => { const r = document.querySelector('.pl-rol'); return { top: r.scrollTop, left: r.scrollLeft }; });
const ir = async (ref) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(300); };
/* cor do pixel na tela (a camada congelada por cima, quando tem algo desenhado ali) */
const px = (x, y) => p.evaluate(({ x, y }) => {
  for (const s of ['.pl-cv-cong', '.pl-cv']) {
    const c = document.querySelector(s); if (!c) continue;
    const r = c.getBoundingClientRect(), k = c.width / r.width;
    const d = c.getContext('2d').getImageData(Math.round((x - r.x) * k), Math.round((y - r.y) * k), 1, 1).data;
    if (s === '.pl-cv-cong' && d[3] === 0) continue;
    return [d[0], d[1], d[2]];
  }
}, { x, y });
/* a cor da seleção segue o tema (saturada); a célula vazia é quase branca; texto e grade são cinza (sem saturação) */
const azul = (c) => c && Math.max(...c) - Math.min(...c) > 35 && Math.max(...c) < 235;
const branco = (c) => c && c[0] > 245 && c[1] > 245 && c[2] > 245;
/* acha as divisas das colunas pelo cursor do cabeçalho (a divisa é onde o cursor vira col-resize) */
const cursorEm = async (x, y) => { await p.mouse.move(x, y); await p.waitForTimeout(40); return p.evaluate(() => getComputedStyle(document.querySelector('.pl-cv')).cursor); };

/* as linhas da amostra têm 20 px e o cabeçalho das letras 24 px (medido); a coluna C fica entre 158 e 222 px do canto */
const CAB = 24, LIN = 20, yLin = (n) => cv.y + CAB + LIN * (n - 1);
/* D-80: clicar na letra da coluna e dar Ctrl+Shift+→ */
{
  await abrir();
  const antes = await rol();
  await p.mouse.click(cv.x + 190, cv.y + 10); await p.waitForTimeout(250);
  const n0 = await nome();
  await p.keyboard.press('Control+Shift+ArrowRight'); await p.waitForTimeout(600);
  const n1 = await nome(), depois = await rol();
  caso('D-80 coluna inteira + Ctrl+Shift+→ continua coluna inteira', /^[A-Z]+:[A-Z]+$/.test(n1) && n1.startsWith(n0.split(':')[0] + ':'), `${n0} → ${n1}`);
  caso('D-80 a tela não rola para baixo', depois.top === antes.top, `rolagem vertical ${antes.top} → ${depois.top}`);
  await p.keyboard.press('Control+Shift+ArrowDown'); await p.waitForTimeout(400);
  caso('D-80 coluna inteira + Ctrl+Shift+↓ não muda', (await nome()) === n1, `${n1} → ${await nome()}`);
}
/* D-80: pela caixa de nome, C:C e Ctrl+Shift+→ (antes virava A:XFD e a rolagem ia ao fim) */
{
  await abrir(); await ir('C:C');
  await p.keyboard.press('Control+Shift+ArrowRight'); await p.waitForTimeout(600);
  const n = await nome(), r = await rol();
  caso('D-80 C:C + Ctrl+Shift+→ começa em C e é coluna inteira', /^C:[A-Z]+$/.test(n), n);
  caso('D-80 a rolagem vertical fica no começo', r.top < 2000, `scrollTop ${r.top}`);
}
/* D-80: linha inteira + Ctrl+Shift+↓ */
{
  await abrir(); await ir('7:7');
  await p.keyboard.press('Control+Shift+ArrowDown'); await p.waitForTimeout(600);
  const n = await nome();
  caso('D-80 linha 7 inteira + Ctrl+Shift+↓ continua linha inteira', /^7:\d+$/.test(n) && n !== '7:7', n);
}
/* D-73: clicar dentro da mescla B10:F10 */
{
  await abrir();
  /* divisas das colunas A|B, B|C e C|D pelo cursor */
  const div = [];
  let ant = '';
  for (let x = Math.round(cv.x + 20); x < cv.x + 420 && div.length < 4; x++) { const c = await cursorEm(x, cv.y + 10); if (c === 'col-resize' && ant !== 'col-resize') div.push(x + 4); ant = c; }
  const [xAB, xBC, xCD] = div;
  const y10 = yLin(10) + 10;
  await p.mouse.click(xCD + 20, y10); await p.waitForTimeout(400);
  const n = await nome();
  caso('D-73 clique na mescla seleciona a mescla (caixa de nome B10)', n === 'B10', n);
  const tracoBC = [await px(xBC - 2, yLin(10) + 4), await px(xBC - 1, yLin(10) + 4), await px(xBC - 2, yLin(10) + 17), await px(xBC - 1, yLin(10) + 17)];
  caso('D-73 sem o traço da célula B10 no meio da mescla', !tracoBC.some(azul), `pixels na divisa B|C: ${JSON.stringify(tracoBC)}`);
  const dentro = await px(xCD + 30, yLin(10) + 3);
  caso('D-73 a mescla selecionada sozinha fica sem a cor de fundo', branco(dentro), `pixel dentro: ${JSON.stringify(dentro)}`);
  const borda = await px(xAB + 1, y10 + 6);
  caso('D-73 a moldura da mescla continua', azul(borda), `pixel na borda esquerda: ${JSON.stringify(borda)}`);
  /* intervalo comum continua com a cor de fundo e o contorno da ativa */
  await ir('B2:C3'); await p.waitForTimeout(200);
  const y3 = yLin(3) + 3;
  const fundo = await px(xBC + 20, y3);
  caso('D-73 intervalo B2:C3 continua com a cor de fundo', fundo && !branco(fundo), JSON.stringify(fundo));
}
/* D-69: cursor do cabeçalho */
{
  await abrir();
  const meioCol = await cursorEm(cv.x + 190, cv.y + 10);
  caso('D-69 no meio da letra da coluna: seta para baixo (desenhada)', /url\(/.test(meioCol) && !/s-resize/.test(meioCol), meioCol.slice(0, 60));
  let divisa = '';
  for (let x = Math.round(cv.x + 100); x < cv.x + 260; x++) { const c = await cursorEm(x, cv.y + 10); if (c === 'col-resize') { divisa = c; break; } }
  caso('D-69 na divisa: seta dupla de largura', divisa === 'col-resize', divisa || 'não achou');
  const meioLin = await cursorEm(cv.x + 15, yLin(5) + 10);
  caso('D-69 no número da linha: seta para a direita (desenhada)', /url\(/.test(meioLin) && !/e-resize/.test(meioLin), meioLin.slice(0, 60));
  const cel = await cursorEm(cv.x + 300, cv.y + 300);
  caso('D-69 na célula continua a cruz', cel === 'cell', cel);
}
caso('sem erro na página', erros.length === 0, erros.join(' | '));
await nav.close();
console.log(falhas ? `FIM: ${falhas} falha(s)` : 'FIM: tudo certo');
process.exit(falhas ? 1 : 0);
