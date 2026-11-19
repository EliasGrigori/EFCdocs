/* Vértice Docs — v0.6.40 (T2): um filtro por tabela. Abre no app uma planilha do Excel com duas tabelas com setas (Pomar filtrada,
   Estoque sem critério), uma tabela sem setas (Lotes) e um filtro da aba fora das tabelas; filtra, liga e tira setas e salva como Excel.
   Uso: node scripts/testar-filtros-tabela.mjs <endereço>. Amostra inventada (testes/amostras/amostra-v0640.xlsx). */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lerZip } from '../src/planilha/xlsx/zip.js';
const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-v0640.xlsx', import.meta.url));
let ok = 0, falhas = 0;
const erros = [];
const certo = (c, m) => { if (!c) throw new Error(m); };
async function caso(nome, f) { try { await f(); ok++; console.log('  ok   ' + nome); } catch (e) { falhas++; console.log('  FALHA ' + nome + ' — ' + String(e.message || e).split('\n')[0].slice(0, 300)); } }
const nav = await chromium.launch({ executablePath: CHROME, env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });

const ir = async (ref) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(120); };
const setas = (k) => p.locator(k === undefined ? '[data-seta-filtro]' : k === null ? '[data-seta-filtro]:not([data-seta-tabela])' : `[data-seta-tabela="${k}"]`).count();
/* salva como Excel e devolve { ocultas: [linhas do Excel], tab: { nome: xml } } */
const salvar = async () => {
  await p.click('.tab:has-text("Arquivo")'); await p.waitForTimeout(150);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('[data-cmd="arquivo.exportarExcel"]').first().click()]);
  const z = lerZip(new Uint8Array(readFileSync(await dl.path()))), txt = async (n) => new TextDecoder().decode(await z.bytes(n));
  const aba = await txt(z.nomes.find((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)));
  const ocultas = [...aba.matchAll(/<row r="(\d+)"[^>]*hidden="1"/g)].map((m) => +m[1]);
  const tab = {};
  for (const n of z.nomes) if (/^xl\/tables\/.*\.xml$/.test(n)) { const x = await txt(n); tab[/displayName="([^"]+)"/.exec(x)[1]] = x; }
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  return { ocultas, tab, aba };
};
const aparecem = async () => { const t = (await p.locator('.toast').allInnerTexts()).reverse().find((x) => /linhas aparecem/.test(x)) || ''; return t; };

await p.goto(BASE + '#/'); await p.waitForSelector('[data-abrir-excel]'); await p.click('[data-abrir-excel]');
await p.setInputFiles('[data-excel-arquivo]', AMOSTRA); await p.waitForSelector('[data-excel-abrir]', { timeout: 30000 });
await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(900);

await caso('ao abrir: cada tabela com setas mostra as dela, e o filtro da aba também (antes só o da aba)', async () => {
  certo(await setas('pomar') === 3, 'Pomar: ' + await setas('pomar'));
  certo(await setas('estoque') === 2, 'Estoque: ' + await setas('estoque'));
  certo(await setas('lotes') === 0, 'Lotes não tem setas');
  certo(await setas(null) === 2, 'filtro da aba: ' + await setas(null));
  certo(await p.locator('[data-seta-tabela="pomar"][data-seta-filtro="1"].on').count() === 1, 'a Fruta da Pomar aparece filtrada');
});

await caso('filtrar a Estoque pela seta dela: as linhas da Pomar e do filtro da aba continuam escondidas', async () => {
  await p.locator('[data-seta-tabela="estoque"][data-seta-filtro="0"]').dispatchEvent('pointerdown'); await p.waitForSelector('[data-filtro-menu]');
  certo((await p.locator('[data-filtro-menu] .col-t b').innerText()) === 'Item', 'o menu não é da coluna Item');
  await p.locator('[data-filtro-tudo]').uncheck(); await p.locator('[data-filtro-v="Caixa"]').check(); await p.click('[data-filtro-ok]'); await p.waitForTimeout(300);
  certo(/1 de 3 linhas aparecem/.test(await aparecem()), 'aviso: ' + await aparecem());
  const r = await salvar();
  certo(JSON.stringify(r.ocultas) === JSON.stringify([3, 5, 11, 12, 22, 24, 25]), 'linhas escondidas no arquivo: ' + r.ocultas);
  certo(/<autoFilter ref="A9:B12"><filterColumn colId="0"><filters><filter val="Caixa"\/>/.test(r.tab.Estoque), 'filtro da Estoque no arquivo: ' + r.tab.Estoque.slice(0, 260));
  certo(/<autoFilter ref="A1:C6"><filterColumn colId="1"/.test(r.tab.Pomar), 'filtro da Pomar saiu do arquivo');
  certo(/<autoFilter ref="A20:B25">/.test(r.aba), 'filtro da aba saiu do arquivo');
});

await caso('Design da Tabela › Botão de filtro na Lotes liga as setas dela sem tirar as outras', async () => {
  await ir('A16'); await p.click('.tab:has-text("Design da Tabela")'); await p.waitForTimeout(150);
  await p.locator('[data-cmd="tabela.filtro"]').first().click(); await p.waitForTimeout(300);
  certo(await setas('lotes') === 2, 'Lotes: ' + await setas('lotes'));
  certo(await setas('pomar') === 3 && await setas('estoque') === 2 && await setas(null) === 2, 'as outras setas sumiram: ' + await setas());
});

await caso('Ctrl+Shift+L na Pomar tira só as setas dela e mostra as linhas que ela escondia; Ctrl+Z volta', async () => {
  await ir('B3'); await p.keyboard.press('Control+Shift+L'); await p.waitForTimeout(300);
  certo(await setas('pomar') === 0, 'Pomar ainda com setas');
  certo(await setas('estoque') === 2 && await setas('lotes') === 2 && await setas(null) === 2, 'mexeu nas outras: ' + await setas());
  const r = await salvar();
  certo(JSON.stringify(r.ocultas) === JSON.stringify([11, 12, 22, 24, 25]), 'linhas escondidas no arquivo: ' + r.ocultas);
  certo(!/<autoFilter/.test(r.tab.Pomar), 'a Pomar saiu com setas');
  await ir('B3'); await p.keyboard.press('Control+z'); await p.waitForTimeout(300);
  certo(await setas('pomar') === 3, 'Ctrl+Z não devolveu as setas da Pomar');
});

await caso('Dados › Limpar dentro da Estoque limpa só o filtro dela', async () => {
  await ir('A10'); await p.click('.tab:has-text("Dados")'); await p.waitForTimeout(150);
  await p.locator('[data-cmd="dados.limparFiltro"]').first().click(); await p.waitForTimeout(300);
  certo(await p.locator('[data-seta-tabela="estoque"].on').count() === 0, 'a Estoque continua filtrada');
  certo(await p.locator('[data-seta-tabela="pomar"].on').count() === 1 && await p.locator('[data-seta-filtro]:not([data-seta-tabela]).on').count() === 1, 'limpou outro filtro');
});

await caso('sem erro no console', async () => { certo(!erros.length, erros.join(' | ').slice(0, 300)); });
console.log(`\n${ok} ok, ${falhas} falha(s)`);
await nav.close();
process.exit(falhas ? 1 : 0);
