/* Vértice Docs — prints da v0.6.23.1 (D-63: arrastar a meta do gráfico quando a prévia é redesenhada no meio do arrasto).
   Planilha de amostra inventada (testes/amostras/amostra-qualidade.xlsx).
   Uso: node scripts/prints-aprovacao-v06231.mjs <endereço HOJE> <endereço PROPOSTA> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const [HOJE, PROP, PASTA] = process.argv.slice(2);
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-qualidade.xlsx', import.meta.url));
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: process.env.CHROME });
const resumo = {};
for (const [lado, base] of [['hoje', HOJE], ['prop', PROP]]) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
  await p.goto(base + '#/'); await p.waitForSelector('[data-abrir-excel]'); await p.click('[data-abrir-excel]');
  await p.setInputFiles('[data-excel-arquivo]', AMOSTRA); await p.waitForSelector('[data-excel-abrir]', { timeout: 30000 });
  await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(300);
  await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill('B1:C10'); await p.locator('.pl-nome').press('Enter');
  await p.click('.tabs .tab:has-text("Inserir")'); await p.locator('[data-cmd="inserir.grafico"]').first().click(); await p.waitForSelector('[data-grafico-janela]');
  await p.click('[data-gr-aplicar]'); await p.waitForSelector('.pl-obj-gr'); await p.waitForTimeout(400);
  await p.locator('[data-cmd="grafico.editar"]').first().click(); await p.waitForSelector('[data-grafico-janela]'); await p.waitForTimeout(300);
  await p.locator('[data-ge-aba="tipo"]').click(); await p.locator('[data-ge="meta"]').fill('0,6'); await p.waitForTimeout(400);
  const box = await p.locator('[data-gr-previa] [data-meta-arrastar]').boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x, y - 10, { steps: 2 });
  /* a prévia é redesenhada no meio do arrasto (o mesmo que o app faz quando outra mudança chega nessa hora) */
  await p.evaluate(() => { const pv = document.querySelector('[data-gr-previa]'); pv.innerHTML = pv.innerHTML; });
  await p.mouse.move(x, y - 40, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(400);
  resumo[lado] = await p.locator('[data-ge="meta"]').inputValue();
  await p.evaluate(([mx, my]) => { const d = document.createElement('div'); d.style.cssText = `position:fixed;left:${mx - 7}px;top:${my - 7}px;width:14px;height:14px;border-radius:50%;background:#d22;box-shadow:0 0 0 3px #fff;z-index:99999;pointer-events:none`; document.body.appendChild(d); }, [x, y - 40]);
  const pv = await p.locator('[data-gr-previa]').boundingBox(); const campo = await p.locator('[data-ge="meta"]').boundingBox();
  const topo = Math.min(pv.y, campo.y) - 12, baixo = Math.max(pv.y + pv.height, campo.y + campo.height) + 12;
  const esq = Math.min(pv.x, campo.x) - 12, dir = Math.max(pv.x + pv.width, campo.x + campo.width) + 12;
  await p.screenshot({ path: `${PASTA}/meta-${lado}.png`, clip: { x: esq, y: topo, width: dir - esq, height: baixo - topo } });
  console.log(lado, 'meta', resumo[lado], erros.slice(0, 2)); await ctx.close();
}
writeFileSync(`${PASTA}/meta.json`, JSON.stringify(resumo));
await nav.close();
