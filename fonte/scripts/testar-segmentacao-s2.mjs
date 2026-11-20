/* Vértice Docs — v0.6.42 (S2): criar, mover, mudar o tamanho, configurar e apagar a segmentação; o arquivo do Excel leva o que mudou.
   Uso: node scripts/testar-segmentacao-s2.mjs <endereço>. Amostra inventada (testes/amostras/amostra-v0641.xlsx). */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lerZip } from '../src/planilha/xlsx/zip.js';
const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-v0641.xlsx', import.meta.url));
let ok = 0, falhas = 0;
const erros = [];
const certo = (c, m) => { if (!c) throw new Error(m); };
async function caso(nome, f) { try { await f(); ok++; console.log('  ok   ' + nome); } catch (e) { falhas++; console.log('  FALHA ' + nome + ' — ' + String(e.message || e).split('\n')[0].slice(0, 300)); } }
const nav = await chromium.launch({ executablePath: CHROME, env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce', acceptDownloads: true });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });

const caixa = (nome) => p.locator(`[data-seg="${nome}"]`).boundingBox();
const ir = async (ref) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(150); };
const arrastar = async (de, dx, dy) => { await p.mouse.move(de.x, de.y); await p.mouse.down(); await p.mouse.move(de.x + dx / 2, de.y + dy / 2, { steps: 4 }); await p.mouse.move(de.x + dx, de.y + dy, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(300); };
const salvar = async () => {
  await p.click('.tab:has-text("Arquivo")'); await p.waitForTimeout(150);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('[data-cmd="arquivo.exportarExcel"]').first().click()]);
  const z = lerZip(new Uint8Array(readFileSync(await dl.path()))), txt = async (n) => new TextDecoder().decode(await z.bytes(n));
  const out = { nomes: z.nomes, slicer1: await txt('xl/slicers/slicer1.xml'), desenhos: await Promise.all(z.nomes.filter((n) => /^xl\/drawings\/drawing\d+\.xml$/.test(n)).map(txt)) };
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  return out;
};

await p.goto(BASE + '#/'); await p.waitForSelector('[data-abrir-excel]'); await p.click('[data-abrir-excel]');
await p.setInputFiles('[data-excel-arquivo]', AMOSTRA); await p.waitForSelector('[data-excel-abrir]', { timeout: 30000 });
await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(900);

await caso('tocar no título escolhe a segmentação: contorno, alça e a barra com Configurações e lixeira (antes nada)', async () => {
  const b = await caixa('Fruta');
  await p.mouse.click(b.x + 30, b.y + 18); await p.waitForTimeout(200);
  certo(await p.locator('[data-seg="Fruta"].escolhida').count() === 1, 'não ficou escolhida');
  certo(await p.locator('[data-seg-barra] [data-seg-apagar]').count() === 1 && await p.locator('[data-seg-barra] [data-seg-config]').count() === 1, 'sem a barra');
  certo(await p.locator('[data-seg="Fruta"] [data-alca="seg"]').count() === 1, 'sem a alça');
  await p.locator('.pl-cv').click({ position: { x: 60, y: 420 } }); await p.waitForTimeout(150);
  certo(await p.locator('.pl-seg.escolhida').count() === 0, 'tocar fora devia tirar a escolha');
});

await caso('arrastar o título move; a alça muda o tamanho; Ctrl+Z desfaz', async () => {
  const b0 = await caixa('Fruta');
  await arrastar({ x: b0.x + 30, y: b0.y + 18 }, 0, 140);
  const b1 = await caixa('Fruta');
  certo(Math.abs(b1.y - b0.y - 140) < 22 && Math.abs(b1.x - b0.x) < 66, 'não moveu: ' + JSON.stringify([b0, b1]));
  const al = await p.locator('[data-seg="Fruta"] [data-alca="seg"]').boundingBox();
  await arrastar({ x: al.x + al.width / 2, y: al.y + al.height / 2 }, 80, -40);
  const b2 = await caixa('Fruta');
  certo(Math.abs(b2.width - b1.width - 80) < 3 && Math.abs(b2.height - b1.height + 40) < 3, 'tamanho: ' + JSON.stringify([b1, b2]));
  await p.keyboard.press('Control+z'); await p.waitForTimeout(250);
  const b3 = await caixa('Fruta');
  certo(Math.abs(b3.width - b1.width) < 2, 'Ctrl+Z não voltou o tamanho');
});

await caso('dois cliques no título abrem as configurações: título e colunas de botões mudam', async () => {
  const b = await caixa('Fruta');
  await p.mouse.click(b.x + 30, b.y + 18); await p.mouse.click(b.x + 30, b.y + 18); await p.waitForSelector('[data-segc-titulo]');
  await p.fill('[data-segc-titulo]', 'Frutas colhidas'); await p.fill('[data-segc-cols]', '3'); await p.click('[data-segc-ok]'); await p.waitForTimeout(300);
  certo((await p.locator('[data-seg="Fruta"] .seg-cab b').innerText()) === 'Frutas colhidas', 'título');
  const cols = await p.locator('[data-seg="Fruta"] .seg-itens').evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(' ').length);
  certo(cols === 3, 'colunas: ' + cols);
});

await caso('Inserir › Segmentação de dados com a célula na tabela: escolher Kg cria a segmentação ao lado, e ela filtra', async () => {
  await ir('C3'); await p.click('.tab:has-text("Inserir")'); await p.waitForTimeout(150);
  await p.locator('[data-cmd="inserir.segmentacao"]').first().click(); await p.waitForSelector('[data-segi-col="Kg"]');
  certo(await p.locator('[data-segi-ok]').isDisabled(), 'OK devia esperar uma coluna');
  await p.check('[data-segi-col="Kg"]'); await p.click('[data-segi-ok]'); await p.waitForTimeout(400);
  certo(await p.locator('[data-seg="Kg"]').count() === 1, 'a segmentação Kg não apareceu');
  await p.locator('[data-seg="Kg"] [data-seg-item="98"]').click(); await p.waitForTimeout(300);
  certo((await p.locator('[data-seg="Kg"] [aria-pressed="true"]').allInnerTexts()).join() === '98', 'Kg não filtrou');
});

await caso('fora da tabela, Inserir › Segmentação avisa para clicar numa tabela', async () => {
  await ir('M20'); await p.click('.tab:has-text("Inserir")'); await p.waitForTimeout(150);
  await p.locator('[data-cmd="inserir.segmentacao"]').first().click(); await p.waitForTimeout(300);
  certo(await p.locator('[data-segi-ok]').count() === 0, 'a janela não devia abrir');
  certo((await p.locator('.toast').allInnerTexts()).some((t) => /célula de uma tabela/.test(t)), 'sem aviso');
});

await caso('escolher o Talhão e apertar Delete apaga a segmentação', async () => {
  const b = await caixa('Talhão');
  await p.mouse.click(b.x + 30, b.y + 18); await p.waitForTimeout(150);
  await p.keyboard.press('Delete'); await p.waitForTimeout(300);
  certo(await p.locator('[data-seg="Talhão"]').count() === 0, 'não apagou');
});

await caso('salvar como Excel: a Fruta vai com o lugar, o título e as colunas novos; o Talhão não vai', async () => {
  const r = await salvar();
  certo(/<slicer name="Fruta"[^>]*caption="Frutas colhidas"[^>]*columnCount="3"/.test(r.slicer1), 'parte da segmentação: ' + r.slicer1.slice(0, 400));
  certo(!/name="Talhão"/.test(r.slicer1) && !r.desenhos.some((d) => /name="Talhão"/.test(d)), 'o Talhão voltou');
  const d = r.desenhos.find((x) => /<sle:slicer [^>]*name="Fruta"/.test(x)) || '';
  const lin = +(/<xdr:from><xdr:col>\d+<\/xdr:col><xdr:colOff>\d+<\/xdr:colOff><xdr:row>(\d+)<\/xdr:row>/.exec(d) || [])[1];
  certo(lin >= 6, 'a Fruta devia descer (linha de cima ' + lin + ')');
});

await caso('sem erro no console', async () => { certo(!erros.length, erros.join(' | ').slice(0, 300)); });
console.log(`\n${ok} ok, ${falhas} falha(s)`);
await nav.close();
process.exit(falhas ? 1 : 0);
