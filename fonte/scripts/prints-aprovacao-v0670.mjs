/* Vértice Docs v0.6.69 e v0.6.70 — prints de antes (v0.6.68) e depois: gaveta do cartão e PNG do Kanban e do quadro. Dados inventados.
   Uso: node scripts/prints-aprovacao-v0670.mjs <endereço> <pasta> <prefixo> */
import { chromium } from 'playwright';
const [BASE, PASTA, PRE] = [process.argv[2], process.argv[3], process.argv[4] || 'x'];
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce', acceptDownloads: true });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; try { localStorage.setItem('efcdocs:quadro-prefs', JSON.stringify({ v: 2, ferramentas: true })); localStorage.setItem('efcdocs.autor', 'Pessoa A'); } catch { /* */ } });
const p = await ctx.newPage(); p.setDefaultTimeout(5000);
const ta = () => p.locator('textarea.qd-edita');
const card = (t) => p.locator('.kb-card[data-item]', { hasText: t }).first();
const arrastar = async (t, i) => { const a = await card(t).boundingBox(); const k = await p.locator('.kb-col').nth(i).boundingBox();
  await p.mouse.move(a.x + a.width / 2, a.y + 14); await p.mouse.down(); await p.mouse.move(k.x + k.width / 2, k.y + 70, { steps: 14 }); await p.waitForTimeout(150); await p.mouse.up(); await p.waitForTimeout(450); };
const png = async (nome) => { await p.click('.tabs .tab:has-text("Arquivo")'); const [d] = await Promise.all([p.waitForEvent('download'), p.locator('[data-cmd="arquivo.exportarImagem"]').first().click()]); await d.saveAs(`${PASTA}/${PRE}-${nome}.png`); };
await p.goto(BASE + '#/postits'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-ferr');
for (const t of ['Coletar amostra', 'Analisar no laboratório', 'Registrar resultado']) { await p.keyboard.press('Escape'); await p.locator('.qd-ferr [data-ferr="inserir.processo"]').click(); await ta().waitFor(); await ta().fill(t); await ta().press('Control+Enter'); await p.waitForTimeout(100); await p.keyboard.press('Escape'); }
await p.click('.tabs .tab:has-text("Arquivo")'); await p.locator('[data-cmd="arquivo.compartilharCwork"]').first().click(); await p.waitForSelector('[data-int-salvar]');
await p.selectOption('[data-int-subaba]', { index: 0 }); await p.fill('[data-int-codigo]', 'HST-01'); await p.click('[data-int-salvar]'); await p.waitForTimeout(6500);
await p.click('.tab:has-text("Organizar")'); await p.locator('[data-cmd="organizar.kanban"]').first().click(); await p.waitForSelector('.kb-col'); await p.waitForTimeout(400);
await p.locator('[data-kb-fluxo]').click(); await p.waitForTimeout(400);
await arrastar('Coletar amostra', 1); await arrastar('Coletar amostra', 2); await arrastar('Analisar no laboratório', 1);
await card('Analisar no laboratório').dblclick({ position: { x: 40, y: 30 } }); const ed = p.locator('textarea.kb-edita'); await ed.fill('Analisar no laboratório (pH e Brix)'); await ed.press('Control+Enter'); await p.waitForTimeout(250);
await card('Coletar amostra').click({ position: { x: 30, y: 20 } }); await card('Coletar amostra').locator('[data-kb-comentar], [data-kb-coments]').first().click(); await p.waitForSelector('[data-kb-gaveta]');
if (await p.locator('[data-kb-aba="hist"]').count()) await p.locator('[data-kb-aba="hist"]').click();
await p.waitForTimeout(300); await p.screenshot({ path: `${PASTA}/${PRE}-gaveta.png` });
await p.keyboard.press('Escape'); await p.mouse.click(1300, 760);
await png('kanban');
await p.locator('.qd-vistas button:has-text("Quadro")').click(); await p.waitForTimeout(400); await p.mouse.click(1300, 760);
await png('quadro');
await nav.close();
