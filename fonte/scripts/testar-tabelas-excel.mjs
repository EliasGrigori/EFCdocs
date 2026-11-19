/* Vértice Docs — v0.6.39 (T0): abrir no app uma planilha do Excel com tabela (totais por coluna, coluna calculada, ordenação),
   mexer e salvar como Excel: o que a tabela tem a mais volta. Uso: node scripts/testar-tabelas-excel.mjs <endereço>. Amostra inventada. */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lerZip } from '../src/planilha/xlsx/zip.js';
const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-v0639.xlsx', import.meta.url));
let ok = 0, falhas = 0;
const erros = [];
const certo = (c, m) => { if (!c) throw new Error(m); };
async function caso(nome, f) { try { await f(); ok++; console.log('  ok   ' + nome); } catch (e) { falhas++; console.log('  FALHA ' + nome + ' — ' + String(e.message || e).split('\n')[0].slice(0, 300)); } }
const nav = await chromium.launch({ executablePath: CHROME, env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce', acceptDownloads: true });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });

const NA_LISTA = { 'arquivo.exportarExcel': null };
void NA_LISTA;
const tabelaDoDownload = async () => {
  await p.click('.tab:has-text("Arquivo")'); await p.waitForTimeout(150);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('[data-cmd="arquivo.exportarExcel"]').first().click()]);
  const b = new Uint8Array(readFileSync(await dl.path()));
  const z = lerZip(b); return new TextDecoder().decode(await z.bytes(z.nomes.find((n) => /^xl\/tables\//.test(n))));
};
const ir = async (ref) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(80); };

await p.goto(BASE + '#/'); await p.waitForSelector('[data-abrir-excel]'); await p.click('[data-abrir-excel]');
await p.setInputFiles('[data-excel-arquivo]', AMOSTRA); await p.waitForSelector('[data-excel-abrir]', { timeout: 30000 });
await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(800);

await caso('abrir e salvar como Excel: rótulo e função dos totais, coluna calculada e ordenação voltam', async () => {
  const x = await tabelaDoDownload();
  certo(/name="Talhão" totalsRowLabel="Total"/.test(x), 'sem o rótulo Total');
  certo(/name="Kg" totalsRowFunction="sum"/.test(x) && /name="Caixas" totalsRowFunction="average"/.test(x), 'sem as funções dos totais');
  certo(/<calculatedColumnFormula>Colheita\[\[#This Row\],\[Kg\]\]\/20<\/calculatedColumnFormula>/.test(x), 'sem a coluna calculada');
  certo(/<sortState ref="A2:D5">/.test(x), 'sem a ordenação');
});

await caso('mudar o total do Kg para Máximo (Design da Tabela) muda a função no Excel', async () => {
  await ir('C6');
  await p.locator('.pl-fx-campo').click(); await p.keyboard.press('Control+a'); await p.keyboard.type('=SUBTOTAL(104;C2:C5)'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  const x = await tabelaDoDownload();
  certo(/name="Kg" totalsRowFunction="max"/.test(x), 'a função não virou max');
});

await caso('trocar o rótulo "Total" por "Soma" troca o rótulo no Excel', async () => {
  await ir('A6'); await p.keyboard.type('Soma'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  const x = await tabelaDoDownload();
  certo(/name="Talhão" totalsRowLabel="Soma"/.test(x), 'o rótulo não mudou');
});

await caso('console sem erro', async () => { certo(erros.length === 0, erros.join(' | ').slice(0, 300)); });
console.log(`\n${ok} de ${ok + falhas} conferências das tabelas do Excel passaram.`);
await nav.close();
process.exit(falhas ? 1 : 0);
