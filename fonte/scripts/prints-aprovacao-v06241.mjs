/* Vértice Docs — prints da v0.6.24.1 (estabilização: DL01, V01, DL02, DL03, DL04). Dados inventados.
   Uso: node scripts/prints-aprovacao-v06241.mjs <endereço HOJE> <endereço PROPOSTA> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const [HOJE, PROP, PASTA] = process.argv.slice(2);
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-qualidade.xlsx', import.meta.url));
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: process.env.CHROME });
async function pagina(o = {}) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce', deviceScaleFactor: 2, ...o });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  return { ctx, p: await ctx.newPage() };
}
async function novaPlanilha(p, base) { await p.goto(base + '#/planilha'); await p.waitForSelector('[data-novo=planilha]'); await p.click('[data-novo=planilha]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(300); }
async function celula(p, ref) { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(80); }
async function digitar(p, ref, linhas) { await celula(p, ref); for (const t of linhas) { await p.keyboard.type(t); await p.keyboard.press('Enter'); } await p.waitForTimeout(120); }
const grade = async (p, nome, alt = 260) => { const fx = await p.locator('.pl-fx').boundingBox(); await p.screenshot({ path: `${PASTA}/${nome}.png`, clip: { x: 0, y: fx.y - 4, width: 760, height: alt } }); };
for (const [lado, base] of [['hoje', HOJE], ['prop', PROP]]) {
  /* DL01 */
  let { ctx, p } = await pagina();
  await novaPlanilha(p, base);
  await celula(p, 'A1'); await p.keyboard.type('=SOMA('); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill('B5'); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(300);
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  await digitar(p, 'C3', ['tudo certo']); await celula(p, 'C3');
  await grade(p, `dl01-${lado}`);
  await ctx.close();
  /* DL03: classificar com a linha de total junto */
  ({ ctx, p } = await pagina());
  await novaPlanilha(p, base);
  await digitar(p, 'A1', ['Nome', 'Zebra', 'Xis', 'Yoga', 'Total']); await digitar(p, 'B1', ['Qtd', '3', '1', '2', '=SOMA(B2:B4)']);
  await celula(p, 'A1:B5'); await p.click('.tabs .tab:has-text("Dados")'); await p.locator('[data-cmd="dados.az"]').first().click(); await p.waitForTimeout(400);
  await celula(p, lado === 'prop' ? 'B5' : 'B2'); await grade(p, `dl03-${lado}`);
  await ctx.close();
  /* DL04: remover duplicados com a SOMA embaixo */
  ({ ctx, p } = await pagina());
  await novaPlanilha(p, base);
  await digitar(p, 'A1', ['Item', 'Caneta', 'Lápis', 'Caneta', 'Soma']); await digitar(p, 'B1', ['Qtd', '2', '3', '2', '=SOMA(B2:B4)']);
  await celula(p, 'A1:B5'); await p.click('.tabs .tab:has-text("Dados")'); await p.locator('[data-cmd="dados.duplicados"]').first().click();
  await p.waitForSelector('.pl-jdados'); await p.locator('.pl-jdados .btn.primary').click(); await p.waitForTimeout(400);
  await celula(p, 'B4'); await grade(p, `dl04-${lado}`);
  await ctx.close();
  /* DL02: uma coluna só */
  ({ ctx, p } = await pagina());
  await novaPlanilha(p, base);
  await digitar(p, 'A1', ['Nome', 'Arroz', 'Feijão', 'Leite', 'Café']); await digitar(p, 'B1', ['Qtd', '3', '1', '2', '9']);
  await celula(p, 'B1:B5'); await p.click('.tabs .tab:has-text("Dados")'); await p.locator('[data-cmd="dados.az"]').first().click(); await p.waitForTimeout(400);
  if (lado === 'prop') { await p.screenshot({ path: `${PASTA}/dl02-janela.png` }); await p.click('[data-expandir-ok]'); await p.waitForTimeout(300); }
  await celula(p, 'A2'); await grade(p, `dl02-${lado}`);
  await ctx.close();
  /* V01: editor de gráfico a 1366×768, depois de digitar a meta */
  ({ ctx, p } = await pagina({ viewport: { width: 1366, height: 768 } }));
  await p.goto(base + '#/'); await p.click('[data-abrir-excel]'); await p.setInputFiles('[data-excel-arquivo]', AMOSTRA); await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(300);
  await celula(p, 'B1:C10'); await p.click('.tabs .tab:has-text("Inserir")'); await p.locator('[data-cmd="inserir.grafico"]').first().click(); await p.click('[data-gr-aplicar]'); await p.waitForTimeout(400);
  await p.locator('[data-cmd="grafico.editar"]').first().click(); await p.waitForTimeout(300); await p.locator('[data-ge-aba="tipo"]').click();
  await p.locator('[data-ge="meta"]').click(); await p.keyboard.type('0,93'); await p.waitForTimeout(400);
  const j = await p.locator('.janela:has([data-grafico-janela])').first().boundingBox().catch(() => null);
  await p.screenshot({ path: `${PASTA}/v01-${lado}.png`, clip: j ? { x: j.x, y: Math.max(0, j.y), width: j.width, height: Math.min(j.height, 768 - Math.max(0, j.y)) } : undefined });
  await ctx.close();
  console.log(lado, 'ok');
}
await nav.close();
