/* Vértice Docs — prints da página de aprovação da v0.6.44 (S3: a segmentação feita no app vai para o Excel).
   Para cada lado: cria a segmentação Kg, filtra em 98, salva como Excel (print do aviso), abre o arquivo salvo (print).
   Uso: node scripts/prints-aprovacao-v0644.mjs <endereço ANTES> <endereço DEPOIS> <pasta>. Amostra inventada. */
import { chromium } from 'playwright';
import { mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const [ANTES, DEPOIS, PASTA] = process.argv.slice(2);
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-v0641.xlsx', import.meta.url));
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: CHROME, env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
for (const [lado, base] of [['antes', ANTES], ['depois', DEPOIS]]) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce', acceptDownloads: true, deviceScaleFactor: 1.5 });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  const abrir = async (arq) => {
    await p.goto(base + '#/'); await p.waitForSelector('[data-abrir-excel]'); await p.click('[data-abrir-excel]');
    await p.setInputFiles('[data-excel-arquivo]', arq); await p.waitForSelector('[data-excel-abrir]', { timeout: 30000 });
    await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(900);
  };
  await abrir(AMOSTRA);
  await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill('C3'); await p.locator('.pl-nome').press('Enter');
  await p.click('.tab:has-text("Inserir")'); await p.waitForTimeout(150);
  await p.locator('[data-cmd="inserir.segmentacao"]').first().click(); await p.waitForSelector('[data-segi-col="Kg"]');
  await p.check('[data-segi-col="Kg"]'); await p.click('[data-segi-ok]'); await p.waitForTimeout(400);
  await p.locator('[data-seg="Kg"] [data-seg-item="98"]').click(); await p.waitForTimeout(300);
  await p.screenshot({ path: `${PASTA}/1-no-app-${lado}.png` });
  await p.click('.tab:has-text("Arquivo")'); await p.waitForTimeout(150);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('[data-cmd="arquivo.exportarExcel"]').first().click()]);
  const arq = `/tmp/efc-print-${lado}.xlsx`; copyFileSync(await dl.path(), arq); await p.waitForTimeout(700);
  await p.screenshot({ path: `${PASTA}/2-salvar-${lado}.png` });
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  await abrir(arq);
  await p.screenshot({ path: `${PASTA}/3-reaberto-${lado}.png` });
  await ctx.close();
}
await nav.close();
console.log('prints em ' + PASTA);
