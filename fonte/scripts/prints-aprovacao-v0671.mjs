/* Vértice Docs v0.6.71 — prints de antes (v0.6.70) e depois: faixa Inserir e Organizar, irmão no mapa. Dados inventados.
   Uso: node scripts/prints-aprovacao-v0671.mjs <endereço> <pasta> <prefixo> */
import { chromium } from 'playwright';
const [BASE, PASTA, PRE] = [process.argv[2], process.argv[3], process.argv[4] || 'x'];
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce' });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; try { localStorage.setItem('efcdocs:quadro-prefs', JSON.stringify({ v: 2, ferramentas: true })); } catch { /* */ } });
const p = await ctx.newPage(); p.setDefaultTimeout(5000);
const ta = () => p.locator('textarea.qd-edita');
const escrever = async (t) => { await ta().waitFor(); await ta().fill(t); await ta().press('Control+Enter'); await p.waitForTimeout(150); };
const escolher = async (t) => { const b = await p.locator('.qi', { hasText: t }).first().boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + 12); await p.waitForTimeout(150); };
await p.goto(BASE + '#/postits'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
await p.locator('[data-cmd="inserir.postit"]').first().click(); await escrever('Cwork');
await escolher('Cwork'); await p.keyboard.press('Tab'); await escrever('Coletas');
await escolher('Coletas'); await p.keyboard.press('Shift+Enter');
await p.waitForTimeout(200); if (await ta().count()) { if ((await ta().inputValue()) === '') await escrever('Inspeções'); else { await ta().press('Escape'); } } else { await p.keyboard.press('Escape'); }
await p.click('.tabs .tab:has-text("Inserir")'); await p.waitForTimeout(200);
await p.locator('.ribbon').screenshot({ path: `${PASTA}/${PRE}-faixa-inserir.png` });
await escolher('Coletas'); await p.waitForTimeout(250);
await p.screenshot({ path: `${PASTA}/${PRE}-mapa.png` });
await p.click('.tabs .tab:has-text("Organizar")'); await p.waitForTimeout(200);
if (await p.locator('[data-menu-faixa=igualarQ]').count()) { await p.click('[data-menu-faixa=igualarQ]'); await p.waitForTimeout(200); }
await p.screenshot({ path: `${PASTA}/${PRE}-organizar.png`, clip: { x: 200, y: 0, width: 1166, height: 330 } });
await nav.close();
