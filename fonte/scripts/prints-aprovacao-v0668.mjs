/* Vértice Docs v0.6.68 — prints de antes (v0.6.67) e depois para a página de aprovação. Dados inventados.
   Uso: node scripts/prints-aprovacao-v0668.mjs <endereço> <pasta> <prefixo> */
import { chromium } from 'playwright';
const [BASE, PASTA, PRE] = [process.argv[2], process.argv[3], process.argv[4] || 'x'];
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce' });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; try { localStorage.setItem('efcdocs:quadro-prefs', JSON.stringify({ v: 2, ferramentas: true })); localStorage.setItem('efcdocs.autor', 'Pessoa A'); } catch { /* */ } });
const p = await ctx.newPage(); p.setDefaultTimeout(5000);
const ta = () => p.locator('textarea.qd-edita');
await p.goto(BASE + '#/postits'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-ferr');
for (const t of ['Coletar amostra', 'Analisar no laboratório', 'Registrar resultado']) { await p.keyboard.press('Escape'); await p.locator('.qd-ferr [data-ferr="inserir.processo"]').click(); await ta().waitFor(); await ta().fill(t); await ta().press('Control+Enter'); await p.waitForTimeout(100); await p.keyboard.press('Escape'); }
await p.locator('[data-cmd="inserir.postit"]').first().click(); await ta().waitFor(); await ta().fill('Lembrete da equipe'); await ta().press('Control+Enter'); await p.keyboard.press('Escape');
await p.click('.tabs .tab:has-text("Arquivo")'); await p.locator('[data-cmd="arquivo.compartilharCwork"]').first().click(); await p.waitForSelector('[data-int-salvar]');
await p.selectOption('[data-int-subaba]', { index: 0 }); await p.fill('[data-int-codigo]', 'FLX-01'); await p.click('[data-int-salvar]'); await p.waitForTimeout(6500);
await p.click('.tab:has-text("Organizar")'); await p.locator('[data-cmd="organizar.kanban"]').first().click(); await p.waitForSelector('.kb-col'); await p.waitForTimeout(500);
await p.screenshot({ path: `${PASTA}/${PRE}-kanban.png` });
if (await p.locator('[data-kb-fluxo]').count()) {
  await p.locator('[data-kb-fluxo]').click(); await p.waitForTimeout(400);
  await p.screenshot({ path: `${PASTA}/${PRE}-ligado.png` });
  const arrastar = async (t, i) => { const c = p.locator('.kb-card[data-item]', { hasText: t }).first(); const a = await c.boundingBox(); const k = await p.locator('.kb-col').nth(i).boundingBox();
    await p.mouse.move(a.x + a.width / 2, a.y + 14); await p.mouse.down(); await p.mouse.move(k.x + k.width / 2, k.y + 70, { steps: 14 }); await p.waitForTimeout(150); await p.mouse.up(); await p.waitForTimeout(450); };
  await arrastar('Coletar amostra', 2); await arrastar('Analisar no laboratório', 1);
  await p.mouse.click(1300, 700); await p.waitForTimeout(300);
  await p.screenshot({ path: `${PASTA}/${PRE}-andamento.png` });
}
await p.locator('.qd-vistas button:has-text("Quadro")').click(); await p.waitForTimeout(500);
await p.mouse.click(1300, 700); await p.waitForTimeout(300);
await p.screenshot({ path: `${PASTA}/${PRE}-fluxo.png` });
await nav.close();
