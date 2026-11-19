/* Vértice Docs — v0.6.29: Ctrl+Shift+↓ para no fim da tabela (defeito do Elias em 18/11) e CURT/DISTORÇÃO na planilha e na
   Estatística descritiva (D17). Uso: node scripts/testar-salto.mjs <endereço>. Dados inventados. */
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
let ok = 0, falhas = 0;
const erros = [];
const certo = (c, m) => { if (!c) throw new Error(m); };
async function caso(nome, f) { try { await f(); ok++; console.log('  ok   ' + nome); } catch (e) { falhas++; console.log('  FALHA ' + nome + ' — ' + String(e.message || e).split('\n')[0].slice(0, 300)); } }
const nav = await chromium.launch({ executablePath: CHROME });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce' });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
const cel = async (r) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(r); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(80); };
const dig = async (r, l) => { await cel(r); for (const t of l) { if (t !== '') await p.keyboard.type(t); await p.keyboard.press('Enter'); } };
const nome = async () => (await p.locator('.pl-nome').inputValue()).trim();
const fx = async () => (await p.locator('.pl-fx-campo').innerText()).trim();

await p.goto(BASE + '#/planilha'); await p.click('[data-novo=planilha]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(300);
/* como nos prints do Elias: a coluna D (dias) termina na linha 6; as linhas 7 a 10 da tabela têm só a situação (E) */
await dig('A1', ['Item', 'Balança 1', 'Balança 2', 'Estufa', 'pHmetro', 'Termômetro', 'Bureta', 'Pipeta', 'Proveta', 'Béquer']);
await dig('D1', ['Dias', '152', '153', '119', '29', '28']);
await dig('E1', ['Situação', 'Em dia', 'Em dia', 'Em dia', 'Em dia', 'Em dia', 'Desativada', 'Desativada', 'Desativada', 'Desativada']);
await cel('A1:E10'); await p.click('.tabs .tab:has-text("Inserir")'); await p.locator('[data-cmd="inserir.tabela"]').first().click();
await p.waitForSelector('.pl-jtab'); await p.locator('[data-tab-ok]').click(); await p.waitForTimeout(400);

const somaSel = async () => (/Soma: ([\d.,]+)/.exec(await p.locator('.foot').innerText()) || [])[1];
const rolY = () => p.locator('.pl-rol').evaluate((e) => e.scrollTop);
await caso('na tabela, Ctrl+Shift+↓ partindo do último número (D6, como nos prints) para no fim da tabela (D10), não na linha 1.048.576', async () => {
  await cel('D3'); await p.keyboard.press('Control+Shift+ArrowDown'); await p.waitForTimeout(250);
  certo(await somaSel() === '329', '1º toque devia ir ao fim do bloco (D6): ' + await somaSel());
  await p.keyboard.press('Control+Shift+ArrowDown'); await p.waitForTimeout(250);
  const y = await rolY();
  certo(await somaSel() === '329' && y < 400, '2º toque: soma ' + await somaSel() + ' · rolagem ' + y);
});

await caso('mais um Ctrl+Shift+↓, já na borda da tabela, segue para fora (como no Excel)', async () => {
  await p.keyboard.press('Control+Shift+ArrowDown'); await p.waitForTimeout(300);
  const y = await rolY();
  certo(y > 100000, 'não foi ao fim da planilha: rolagem ' + y);
});

await caso('Ctrl+↓ dentro do bloco de números da tabela continua parando no último número (D6)', async () => {
  await cel('D2'); await p.keyboard.press('Control+ArrowDown'); await p.waitForTimeout(150);
  certo(await nome() === 'D6', 'célula: ' + await nome());
});

await caso('fora de tabela, Ctrl+↓ continua a regra do Excel (vai até a próxima célula cheia ou o fim)', async () => {
  await dig('H1', ['5', '6']);
  await cel('H2'); await p.keyboard.press('Control+ArrowDown'); await p.waitForTimeout(150);
  certo(await nome() === 'H1048576', 'célula: ' + await nome());
});

await caso('CURT e DISTORÇÃO digitadas em português calculam (D17)', async () => {
  await dig('J1', ['3', '4', '5', '2', '3', '4', '5', '6', '4', '7']);
  await cel('K1'); await p.keyboard.type('=CURT(J1:J10)'); await p.keyboard.press('Enter');
  await cel('K2'); await p.keyboard.type('=DISTORÇÃO(J1:J10)'); await p.keyboard.press('Enter');
  await cel('K1'); certo(await fx() === '=CURT(J1:J10)', 'fórmula: ' + await fx());
  await cel('K1:K2'); await p.waitForTimeout(150);
  const st = await p.locator('.foot').innerText();
  certo(/Soma: 0,2077/.test(st), 'soma da curtose (-0,1518) com a assimetria (0,3595): ' + st);
});

await caso('a Estatística descritiva ganhou Curtose e Assimetria depois da Variância', async () => {
  await cel('J1:J10'); await p.click('.tabs .tab:has-text("Dados")'); await p.locator('[data-cmd="dados.estatistica"]').first().click();
  await p.waitForSelector('[data-estat-janela]');
  const cab = p.locator('.dd-cab input'); if (await cab.isChecked()) await cab.uncheck();
  const pv = await p.locator('[data-estat-previa]').innerText();
  certo(/Variância[\s\S]*Curtose\s+-0,152[\s\S]*Assimetria\s+0,360[\s\S]*Coeficiente/.test(pv), 'prévia: ' + pv.replace(/\s+/g, ' ').slice(0, 240));
  await p.keyboard.press('Escape');
});

console.log(erros.length ? 'Console com erro: ' + erros.slice(0, 3).join(' | ') : 'Console sem erros.');
console.log(`${ok} de ${ok + falhas} conferências do salto e da curtose passaram.`);
await nav.close();
process.exit(falhas || erros.length ? 1 : 0);
