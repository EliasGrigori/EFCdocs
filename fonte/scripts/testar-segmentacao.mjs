/* Vértice Docs — v0.6.41 (S1): segmentação de dados de tabela vinda do Excel. Abre a amostra, toca nos botões das segmentações,
   confere a tabela, o arquivo salvo e a segmentação de outra aba. Uso: node scripts/testar-segmentacao.mjs <endereço>.
   Amostra inventada (testes/amostras/amostra-v0641.xlsx). */
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

const item = (seg, t) => p.locator(`[data-seg="${seg}"] [data-seg-item="${t}"]`);
const marcados = async (seg) => (await p.locator(`[data-seg="${seg}"] [data-seg-item][aria-pressed="true"]`).evaluateAll((els) => els.map((e) => e.getAttribute('data-seg-item')))).sort().join(',');
const aparecem = async () => (await p.locator('.toast').allInnerTexts()).reverse().find((x) => /linhas aparecem/.test(x)) || '';
const salvar = async () => {
  await p.click('.tab:has-text("Arquivo")'); await p.waitForTimeout(150);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('[data-cmd="arquivo.exportarExcel"]').first().click()]);
  const z = lerZip(new Uint8Array(readFileSync(await dl.path()))), txt = async (n) => new TextDecoder().decode(await z.bytes(n));
  const aba = await txt(z.nomes.find((n) => /^xl\/worksheets\/sheet1\.xml$/.test(n)));
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  return { nomes: z.nomes, ocultas: [...aba.matchAll(/<row r="(\d+)"[^>]*hidden="1"/g)].map((m) => +m[1]), tab: await txt(z.nomes.find((n) => /^xl\/tables\//.test(n))) };
};

await p.goto(BASE + '#/'); await p.waitForSelector('[data-abrir-excel]'); await p.click('[data-abrir-excel]');
await p.setInputFiles('[data-excel-arquivo]', AMOSTRA); await p.waitForSelector('[data-excel-abrir]', { timeout: 30000 });
await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(900);

await caso('ao abrir: as duas segmentações aparecem no lugar delas, com o filtro que veio do Excel (antes não apareciam)', async () => {
  certo(await p.locator('[data-seg]').count() === 2, 'segmentações na aba: ' + await p.locator('[data-seg]').count());
  certo(await marcados('Fruta') === 'Mamão', 'Fruta: ' + await marcados('Fruta'));
  certo(await marcados('Talhão') === 'T1,T2,T3,T4', 'Talhão: ' + await marcados('Talhão'));
  const b = await p.locator('[data-seg="Fruta"]').boundingBox(), e = await p.locator('.pl-cv').boundingBox();
  certo(b && b.x > e.x + 250 && b.width > 150 && b.height > 150, 'lugar ou tamanho: ' + JSON.stringify(b));
});

await caso('tocar em Acerola filtra a tabela só por Acerola; salvar como Excel leva o filtro e devolve as segmentações', async () => {
  await item('Fruta', 'Acerola').click(); await p.waitForTimeout(300);
  certo(await marcados('Fruta') === 'Acerola', 'Fruta: ' + await marcados('Fruta'));
  certo(/2 de 8 linhas aparecem/.test(await aparecem()), 'aviso: ' + await aparecem());
  certo(await p.locator('[data-seg="Talhão"] [data-seg-item].sem').count() === 2, 'T3 e T4 deviam ficar apagados');
  const r = await salvar();
  certo(JSON.stringify(r.ocultas) === JSON.stringify([2, 4, 5, 7, 8, 9]), 'linhas escondidas: ' + r.ocultas);
  certo(/<filterColumn colId="1"><filters><filter val="Acerola"\/>/.test(r.tab), 'filtro da tabela no arquivo');
  certo(['xl/slicers/slicer1.xml', 'xl/slicers/slicer2.xml', 'xl/slicerCaches/slicerCache1.xml'].every((n) => r.nomes.includes(n)), 'segmentações não voltaram');
});

await caso('Ctrl+clique soma Goiaba; o funil com X limpa a coluna', async () => {
  await item('Fruta', 'Goiaba').click({ modifiers: ['Control'] }); await p.waitForTimeout(300);
  certo(await marcados('Fruta') === 'Acerola,Goiaba', 'Fruta: ' + await marcados('Fruta'));
  await p.locator('[data-seg="Fruta"] [data-seg-limpar]').click(); await p.waitForTimeout(300);
  certo(await marcados('Fruta') === 'Acerola,Goiaba,Mamão', 'não limpou: ' + await marcados('Fruta'));
  certo(await p.locator('[data-seg="Fruta"] [data-seg-limpar]').isDisabled(), 'o botão de limpar devia ficar apagado');
});

await caso('seleção múltipla no Talhão: tocar tira um valor; Ctrl+Z volta', async () => {
  await p.locator('[data-seg="Talhão"] [data-seg-multi]').click();
  await item('Talhão', 'T1').click(); await p.waitForTimeout(300);
  certo(await marcados('Talhão') === 'T2,T3,T4', 'Talhão: ' + await marcados('Talhão'));
  await p.keyboard.press('Control+z'); await p.waitForTimeout(300); /* o foco continua na grade depois do toque na segmentação */
  certo(await marcados('Talhão') === 'T1,T2,T3,T4', 'Ctrl+Z: ' + await marcados('Talhão'));
});

await caso('a segmentação da aba Painel filtra a tabela da aba Coletas', async () => {
  await p.click('.pl-abas [data-aba="Painel"]'); await p.waitForTimeout(400);
  certo(await p.locator('[data-seg="Fruta 1"]').count() === 1, 'sem a segmentação no Painel');
  certo((await p.locator('[data-seg="Fruta 1"] .seg-cab b').innerText()) === 'Fruta da colheita', 'título');
  await item('Fruta 1', 'Goiaba').click(); await p.waitForTimeout(300);
  await p.click('.pl-abas [data-aba="Coletas"]'); await p.waitForTimeout(400);
  certo(await marcados('Fruta') === 'Goiaba', 'a Fruta da aba Coletas devia mostrar Goiaba: ' + await marcados('Fruta'));
  certo(await p.locator('[data-seta-tabela="tabcoletas"][data-seta-filtro="1"].on').count() === 1, 'a seta da Fruta devia ficar marcada');
});

await caso('sem erro no console', async () => { certo(!erros.length, erros.join(' | ').slice(0, 300)); });
console.log(`\n${ok} ok, ${falhas} falha(s)`);
await nav.close();
process.exit(falhas ? 1 : 0);
