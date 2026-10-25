/* EFCdocs — prints de antes (v0.3.1 em /v031/) e depois (v0.3.2) para a página de aprovação. */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.argv[2], OUT = process.argv[3];
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const PC = { viewport: { width: 1366, height: 800 } };
const espera = (p, ms = 900) => p.waitForTimeout(ms);
async function escrever(p, t) { const ta = p.locator('textarea.qd-edita'); await ta.fill(t); await ta.press('Control+Enter'); await espera(p, 150); }
const LONGO = 'Resultado: ' + 'Palavragigantesemespaco'.repeat(3) + ' e depois um texto comprido que não cabe na caixa do post-it ' + 'linha longa '.repeat(12);

for (const [nome, url] of [['antes', BASE + 'v031/'], ['depois', BASE]]) {
  const ctx = await b.newContext({ ...PC, acceptDownloads: true }); const p = await ctx.newPage();
  await p.goto(url); await espera(p, 900); await p.click('[data-novo=postits]'); await espera(p, 600);
  /* fluxo pequeno + 62 linhas coladas */
  await p.locator('.qd-vazio .chipb:has-text("Fluxograma")').click(); await escrever(p, 'Início da coleta');
  await p.locator('[data-ponto=b]').click(); await escrever(p, 'Medir o cloro livre');
  await p.keyboard.press('Escape');
  const texto = Array.from({ length: 62 }, (_, i) => 'Teste ' + (i + 1)).join('\n');
  await p.evaluate((t) => { const dt = new DataTransfer(); dt.setData('text/plain', t); document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, texto);
  await espera(p, 500);
  await p.keyboard.press('Escape');
  await p.locator('.qd-zoom [aria-label="Ajustar à tela"]').click(); await espera(p, 400);
  await p.screenshot({ path: `${OUT}/${nome}-colar.png` });
  await p.close(); await ctx.close();

  const ctx2 = await b.newContext({ ...PC, acceptDownloads: true }); const q = await ctx2.newPage();
  await q.goto(url); await espera(q, 900); await q.click('[data-novo=postits]'); await espera(q, 600);
  await q.locator('.qd-vazio .chipb:has-text("Post-it")').click(); await escrever(q, LONGO);
  await q.keyboard.press('Escape');
  await q.locator('.qd-zoom [aria-label="Ajustar à tela"]').click(); await espera(q, 400);
  await q.screenshot({ path: `${OUT}/${nome}-longo.png`, clip: { x: 300, y: 200, width: 800, height: 560 } });
  await q.click('.tab:has-text("Arquivo")');
  const [dl] = await Promise.all([q.waitForEvent('download'), q.locator('[data-cmd="arquivo.exportarPNG"], [data-cmd="arquivo.exportarImagem"]').first().click()]);
  await dl.saveAs(`${OUT}/${nome}-longo-export.png`);
  await ctx2.close();
}
await b.close();
console.log('prints prontos');
