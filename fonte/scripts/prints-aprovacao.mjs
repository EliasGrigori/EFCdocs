/* EFCdocs — prints de antes (v0.4.9 em /v049/) e depois (v0.5.0) para a página de aprovação.
   Só a amostra inventada (testes/amostras/amostra-qualidade.xlsx): nenhum dado real nos prints.
   Uso: node scripts/prints-aprovacao.mjs <endereço> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const BASE = process.argv[2], OUT = process.argv[3];
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-qualidade.xlsx', import.meta.url));
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const PC = { viewport: { width: 1366, height: 800 }, acceptDownloads: true };
const CEL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const espera = (p, ms = 150) => p.waitForTimeout(ms);
async function nova(raiz, opc = PC) {
  const ctx = await b.newContext(opc);
  const p = await ctx.newPage();
  await p.goto(raiz + '#/'); await espera(p, 700);
  return p;
}
const shot = (p, nome, clip) => p.screenshot({ path: `${OUT}/${nome}.png`, ...(clip ? { clip } : {}) });

/* antes: v0.4.9 */
let p = await nova(BASE + 'v049/');
await shot(p, 'antes-inicio');
await p.click('[data-novo=planilha]'); await p.waitForSelector('.pl-cv'); await espera(p, 400);
await p.click('.tabs .tab:has-text("Arquivo")'); await espera(p, 250);
await shot(p, 'antes-faixa-arquivo', { x: 0, y: 0, width: 1366, height: 190 });
await p.locator('[data-cmd="arquivo.abrir"]').first().click(); await espera(p, 400);
await shot(p, 'antes-abrir');
await p.context().close();

/* depois: v0.5.0 */
p = await nova(BASE);
await shot(p, 'depois-inicio');
await p.click('.novo-drive-b'); await espera(p, 250);
await shot(p, 'depois-novo', { x: 0, y: 0, width: 420, height: 330 });
await p.click('[data-novo-excel]'); await espera(p, 300);
await shot(p, 'depois-escolher');
await p.setInputFiles('[data-excel-arquivo]', AMOSTRA);
await p.waitForSelector('[data-excel-abrir]'); await espera(p, 300);
await shot(p, 'depois-relatorio');
await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv'); await espera(p, 600);
await shot(p, 'depois-planilha');
await p.locator('.pl-aba:has-text("Resumo")').click(); await espera(p, 300);
await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill('B3'); await p.locator('.pl-nome').press('Enter'); await espera(p, 250);
await shot(p, 'depois-resumo');
await p.click('.tabs .tab:has-text("Arquivo")'); await espera(p, 250);
await shot(p, 'depois-faixa-arquivo', { x: 0, y: 0, width: 1366, height: 190 });
const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('[data-cmd="arquivo.exportarExcel"]').first().click()]);
await dl.path(); await espera(p, 600);
await shot(p, 'depois-salvou');
await p.locator('[data-cmd="arquivo.relatorioExcel"]').first().click(); await espera(p, 300);
await shot(p, 'depois-relatorio-de-novo');
await p.context().close();

/* lendo (com a barra de progresso): arquivo grande montado na hora, sem dados reais */
p = await nova(BASE);
await p.click('[data-abrir-excel]');
await p.evaluate(() => {
  /* segura a leitura para fotografar a barra */
  const W = window.Worker;
  window.Worker = function (url) { const w = new W(url); const env = w.postMessage.bind(w); w.postMessage = (d, t) => setTimeout(() => env(d, t), 4000); return w; };
});
await p.setInputFiles('[data-excel-arquivo]', AMOSTRA);
await espera(p, 600);
await shot(p, 'depois-lendo');
await p.context().close();

/* celular */
p = await nova(BASE, CEL);
await shot(p, 'depois-cel-inicio');
await p.locator('[data-abrir-excel]').tap(); await espera(p, 300);
await p.setInputFiles('[data-excel-arquivo]', AMOSTRA);
await p.waitForSelector('[data-excel-abrir]'); await espera(p, 300);
await shot(p, 'depois-cel-relatorio');
await p.locator('[data-excel-abrir]').tap(); await p.waitForSelector('.pl-cv'); await espera(p, 500);
await shot(p, 'depois-cel-planilha');
await b.close();
console.log('prints prontos');
