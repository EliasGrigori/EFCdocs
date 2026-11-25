/* Vértice Docs — varredura da estabilização (24/11/2026): tenta reproduzir D-69 a D-75 com a amostra inventada
   testes/amostras/amostra-varredura.xlsx e mede. Não muda nada; só observa, tira prints e escreve números.
   Uso: node scripts/varredura-estabilizacao.mjs <endereço> <pasta-dos-prints> */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const BASE = process.argv[2] || 'http://localhost:8731/';
const PASTA = process.argv[3] || '/tmp/varredura';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-varredura.xlsx', import.meta.url));
mkdirSync(PASTA, { recursive: true });
const achados = [];
const anotar = (id, txt) => { achados.push(`${id}: ${txt}`); console.log(`${id}: ${txt}`); };
const nav = await chromium.launch({ executablePath: CHROME, env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce' });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
const erros = []; p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
const ir = async (ref) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(200); };
const aba = async (nome) => { await p.locator('.pl-aba', { hasText: nome }).first().click(); await p.waitForTimeout(400); };
await p.goto(BASE + '#/'); await p.waitForSelector('[data-abrir-excel]'); await p.click('[data-abrir-excel]');
await p.setInputFiles('[data-excel-arquivo]', AMOSTRA); await p.waitForSelector('[data-excel-abrir]', { timeout: 60000 });
await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv', { timeout: 60000 }); await p.waitForTimeout(1200);
const cv = await p.locator('.pl-cv').boundingBox();

/* D-71: abas ocultas */
{ const abas = await p.locator('.pl-aba').allInnerTexts();
  anotar('D-71', `abas visíveis: ${abas.map((x) => x.trim()).join(' | ')}`);
  await p.locator('.pl-aba.on').click({ button: 'right' }).catch(() => {}); await p.waitForTimeout(300);
  const menu = await p.locator('[role="menu"], .menu-ctx, .pl-menu').allInnerTexts().catch(() => []);
  anotar('D-71', `menu da aba: ${(menu.join(' / ').match(/Reexibir[^\n/]*/g) || ['sem "Reexibir"']).join('; ')}`);
  await p.screenshot({ path: `${PASTA}/D71-menu-aba.png` }); await p.keyboard.press('Escape'); await p.waitForTimeout(200); }

/* D-69: cursor no cabeçalho de coluna (no meio da letra e na borda) */
{ const meio = { x: cv.x + 46 + 32, y: cv.y + 10 }, borda = { x: cv.x + 46 + 64, y: cv.y + 10 };
  const cur = async (pt) => { await p.mouse.move(pt.x, pt.y); await p.waitForTimeout(150); return p.evaluate(({ x, y }) => { const e = document.elementFromPoint(x, y); return e ? getComputedStyle(e).cursor + ' (' + e.className + ')' : '?'; }, pt); };
  anotar('D-69', `cursor no meio do cabeçalho da coluna: ${await cur(meio)}; na borda: ${await cur(borda)}; no número da linha: ${await cur({ x: cv.x + 20, y: cv.y + 60 })}`); }

/* D-73: célula mesclada B10:F10: clicar com o mouse no meio dela (D10) */
{ await ir('A1'); const x = cv.x + 46 + 64 * 3 + 30, y = cv.y + 22 + 20 * 9 + 10; await p.mouse.click(x, y); await p.waitForTimeout(300);
  const nome = await p.locator('.pl-nome').inputValue();
  await p.screenshot({ path: `${PASTA}/D73-mesclada.png`, clip: { x: cv.x, y: cv.y, width: 900, height: 420 } }); anotar('D-73', `clique em D10 (dentro da mescla B10:F10): caixa de nome = ${nome}`); }

/* D-74: escolher a célula, clicar no fx (barra de fórmulas) e rolar */
{ await ir('B30'); await p.locator('.pl-fx-campo').click(); await p.waitForTimeout(300);
  const antes = await p.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => { const s = getComputedStyle(e); return /ed|edit/i.test(e.className) && e.getBoundingClientRect().height > 10 && s.visibility !== 'hidden'; }).map((e) => e.className + ' ' + JSON.stringify(e.getBoundingClientRect().toJSON ? (({ x, y, width, height }) => ({ x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height) }))(e.getBoundingClientRect()) : {})).slice(0, 8));
  await p.mouse.move(cv.x + 400, cv.y + 300); await p.mouse.wheel(0, 500); await p.waitForTimeout(300); await p.mouse.wheel(0, -800); await p.waitForTimeout(400);
  const depois = await p.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => /ed|edit/i.test(e.className) && e.getBoundingClientRect().height > 10).map((e) => { const r = e.getBoundingClientRect(); return e.className + ' ' + JSON.stringify({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }); }).slice(0, 8));
  anotar('D-74', `ao clicar no fx: ${antes.join(' ; ')} || depois de rolar: ${depois.join(' ; ')} (topo da grade y=${Math.round(cv.y)})`);
  await p.screenshot({ path: `${PASTA}/D74-fx-rolar.png` }); await p.keyboard.press('Escape'); await p.waitForTimeout(200); }

/* D-72: lista suspensa em C12, depois rolar */
{ await ir('C12'); await p.keyboard.press('Alt+ArrowDown'); await p.waitForTimeout(400);
  const lista0 = await p.locator('.pl-lista, .dd-lista, [role="listbox"]').first().boundingBox().catch(() => null);
  await p.mouse.move(cv.x + 700, cv.y + 400); await p.mouse.wheel(0, 300); await p.waitForTimeout(400);
  const lista1 = await p.locator('.pl-lista, .dd-lista, [role="listbox"]').first().boundingBox().catch(() => null);
  anotar('D-72', `lista aberta: ${JSON.stringify(lista0)}; depois de rolar: ${JSON.stringify(lista1)}; linhas congeladas terminam perto de y=${Math.round(cv.y + 22 * 5)}`);
  await p.screenshot({ path: `${PASTA}/D72-lista-rolar.png` }); await p.keyboard.press('Escape'); await p.waitForTimeout(200); }

/* D-75: imagem passando pela linha congelada */
{ await ir('A1'); await p.mouse.move(cv.x + 700, cv.y + 400);
  for (const d of [200, 120, 80]) { await p.mouse.wheel(0, d); await p.waitForTimeout(300); await p.screenshot({ path: `${PASTA}/D75-imagem-${d}.png`, clip: { x: cv.x, y: cv.y, width: 900, height: 500 } }); }
  const img = await p.locator('.pl-obj-img').first().boundingBox().catch(() => null);
  anotar('D-75', `imagem: ${JSON.stringify(img)}`); }

/* D-70: ocultar muitas linhas e colunas na aba Grande e medir */
{ await aba('Grande');
  const medir = async (nome, f) => { const t0 = Date.now(); await f(); await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); return `${nome} ${Date.now() - t0} ms`; };
  const cmd = async (id) => { await p.evaluate((x) => { const b = document.querySelector(`[data-cmd="${x}"]`); if (b) b.click(); else throw new Error('sem botão ' + x); }, id).catch(async () => { await p.keyboard.press('Alt+q'); await p.keyboard.type(id === 'planilha.ocultarLinha' ? 'Ocultar linhas' : 'Ocultar colunas'); await p.waitForTimeout(300); await p.keyboard.press('Enter'); }); };
  const r = [];
  await ir('A5:A2900'); r.push(await medir('ocultar 2896 linhas', async () => { await p.keyboard.press('Control+9'); await p.waitForTimeout(50); }));
  await ir('C1:AL1'); r.push(await medir('ocultar 36 colunas', async () => { await p.keyboard.press('Control+0'); await p.waitForTimeout(50); }));
  r.push(await medir('rolar 10 vezes', async () => { for (let i = 0; i < 10; i++) { await p.mouse.wheel(0, 200); await p.waitForTimeout(16); } }));
  r.push(await medir('digitar numa célula', async () => { await ir('B2902'); await p.keyboard.type('7'); await p.keyboard.press('Enter'); }));
  r.push(await medir('desfazer', async () => { await p.keyboard.press('Control+z'); }));
  /* o jeito comum: esconder tudo o que sobra até o fim (colunas até XFD, linhas até 1048576) */
  await aba('Ficha');
  await ir('J1:XFD1'); r.push(await medir('Ficha: ocultar J até XFD', async () => { await p.keyboard.press('Control+0'); await p.waitForTimeout(50); }));
  await ir('A130:A1048576'); r.push(await medir('Ficha: ocultar 130 até 1048576', async () => { await p.keyboard.press('Control+9'); await p.waitForTimeout(50); }));
  r.push(await medir('Ficha: rolar 10 vezes', async () => { for (let i = 0; i < 10; i++) { await p.mouse.wheel(0, 200); await p.waitForTimeout(16); } }));
  r.push(await medir('Ficha: digitar', async () => { await ir('B15'); await p.keyboard.type('7'); await p.keyboard.press('Enter'); }));
  r.push(await medir('Ficha: setas 20 vezes', async () => { for (let i = 0; i < 20; i++) await p.keyboard.press('ArrowRight'); }));
  anotar('D-70', r.join('; '));
  await p.screenshot({ path: `${PASTA}/D70-ocultas.png` }); }
anotar('console', erros.length ? erros.slice(0, 3).join(' | ') : 'sem erro');
await nav.close();
