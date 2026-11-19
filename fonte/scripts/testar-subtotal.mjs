/* Vértice Docs — v0.6.38: Dados › Subtotal (janela, linhas de total, total geral, grupos na margem, desfazer, Remover todos).
   Uso: node scripts/testar-subtotal.mjs <endereço>. Dados inventados. */
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
let ok = 0, falhas = 0;
const erros = [];
const certo = (c, m) => { if (!c) throw new Error(m); };
async function caso(nome, f) { try { await f(); ok++; console.log('  ok   ' + nome); } catch (e) { falhas++; console.log('  FALHA ' + nome + ' — ' + String(e.message || e).split('\n')[0].slice(0, 300)); } }
const nav = await chromium.launch({ executablePath: CHROME, env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });

const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
await p.goto(BASE + '#/inicio'); await p.click('[data-novo=planilha]'); await p.waitForSelector('.sup-planilha .pl-cv');
const ir = async (ref) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(80); };
const texto = async (ref) => { await ir(ref); const r = await p.locator('.pl-cap').getAttribute('aria-label'); return r.replace(/^Célula [A-Z]+\d+: /, '').replace(/^vazia$/, ''); };
const onde = () => p.locator('.pl-nome').inputValue();
const dig = async (ref, ls) => { await ir(ref); for (const t of ls) { await p.keyboard.type(t); await p.keyboard.press('Enter'); } await p.waitForTimeout(80); };
const dados = async () => { await p.click('.tab:has-text("Dados")'); await p.waitForTimeout(120); };
const abrir = async () => { await dados(); await p.locator('[data-cmd="dados.subtotal"]').first().click(); await p.waitForSelector('[data-sub-ok]'); };

await dig('A1', ['Fruta', 'Mamão', 'Mamão', 'Acerola', 'Acerola', 'Acerola', 'Goiaba']);
await dig('B1', ['Kg', '10', '12', '5', '7', '8', '4']);

await caso('a faixa Dados tem Subtotal em Estrutura de tópicos, depois de Desagrupar', async () => {
  await dados();
  const ids = await p.locator('.ribbon [data-cmd^="dados."]').evaluateAll((l) => l.map((e) => e.getAttribute('data-cmd')));
  certo(ids.indexOf('dados.subtotal') === ids.indexOf('dados.desagrupar') + 1, ids.join(' '));
});

await caso('a janela vem com a primeira coluna, Soma e a última coluna marcada; OK faz os totais e o geral', async () => {
  await ir('A2'); await abrir();
  certo(await p.locator('[data-sub-col] option:checked').innerText() === 'Fruta', 'coluna: ' + await p.locator('[data-sub-col] option:checked').innerText());
  certo(await p.locator('[data-sub-fn] option:checked').innerText() === 'Soma', 'função');
  certo(await p.locator('[data-sub-alvo="1"]').isChecked() && !(await p.locator('[data-sub-alvo="0"]').isChecked()), 'colunas marcadas');
  certo(await p.locator('[data-sub-remover]').isDisabled(), 'Remover todos devia estar desligado');
  await p.locator('[data-sub-ok]').click(); await p.waitForTimeout(400);
  certo((await texto('A4')) === 'Mamão Total', 'A4: ' + await texto('A4'));
  certo((await texto('B4')) === '22', 'B4: ' + await texto('B4'));
  certo((await texto('A8')) === 'Acerola Total' && (await texto('B8')) === '20', 'A8/B8: ' + await texto('A8') + ' ' + await texto('B8'));
  certo((await texto('A11')) === 'Total Geral' && (await texto('B11')) === '46', 'A11/B11: ' + await texto('A11') + ' ' + await texto('B11'));
});

await caso('a margem ganha os níveis 1, 2 e 3; o 2 deixa só os totais', async () => {
  const b = await p.locator('.pl-cv').first().boundingBox();
  await p.mouse.click(b.x + 2 + 14 + 7, b.y + 12); await p.waitForTimeout(250);
  await ir('A1'); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(80);
  certo((await onde()) === 'A4', 'nível 2: de A1 a seta foi para ' + await onde());
  await p.mouse.click(b.x + 2 + 28 + 7, b.y + 12); await p.waitForTimeout(250);
  await ir('A1'); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(80);
  certo((await onde()) === 'A2', 'nível 3: de A1 a seta foi para ' + await onde());
});

await caso('fazer de novo com Máx substitui (não duplica); Ctrl+Z volta para a Soma', async () => {
  await ir('A2'); await abrir();
  await p.locator('[data-sub-fn]').selectOption('4'); await p.locator('[data-sub-ok]').click(); await p.waitForTimeout(400);
  certo((await texto('A4')) === 'Mamão Máx' && (await texto('B4')) === '12', 'A4/B4: ' + await texto('A4') + ' ' + await texto('B4'));
  certo((await texto('A11')) === 'Máx Geral' && (await texto('A12')) === '', 'A11/A12: ' + await texto('A11') + ' / ' + await texto('A12'));
  await p.keyboard.press('Escape'); await p.keyboard.press('Control+z'); await p.waitForTimeout(300);
  certo((await texto('A4')) === 'Mamão Total', 'depois de desfazer, A4: ' + await texto('A4'));
});

await caso('Remover todos volta à tabela original e tira a margem', async () => {
  await ir('A2'); await abrir();
  await p.locator('[data-sub-remover]').click(); await p.waitForTimeout(400);
  certo((await texto('A4')) === 'Acerola' && (await texto('A7')) === 'Goiaba' && (await texto('A8')) === '', 'A4/A7/A8: ' + [await texto('A4'), await texto('A7'), await texto('A8')].join(' / '));
});

await caso('coluna fora de ordem: a janela avisa', async () => {
  await dig('A7', ['Mamão']); await ir('A2'); await abrir(); /* Mamão, Mamão, Acerola x3, Mamão: o Mamão em dois pedaços */
  certo(await p.locator('[data-sub-ordem]').count() === 1, 'sem aviso de ordem');
  await p.locator('.janela button:has-text("Cancelar")').click(); await p.waitForTimeout(150);
});

await caso('console sem erro', async () => { certo(erros.length === 0, erros.join(' | ').slice(0, 300)); });
await ctx.close();

/* celular: a janela com alvos de 44 px */
{
  const c2 = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' }); await c2.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const q = await c2.newPage(); q.on('pageerror', (e) => erros.push(String(e)));
  await q.goto(BASE + '#/inicio'); await q.click('[data-novo=planilha]'); await q.waitForSelector('.pl-cv');
  const ir2 = async (r) => { await q.locator('.pl-nome').click(); await q.locator('.pl-nome').fill(r); await q.locator('.pl-nome').press('Enter'); await q.waitForTimeout(100); };
  for (const [r, t] of [['A1', 'Fruta'], ['A2', 'Mamão'], ['B1', 'Kg'], ['B2', '3']]) { await ir2(r); await q.locator('.pl-fx-campo').click(); await q.keyboard.type(t); await q.keyboard.press('Enter'); }
  await ir2('A2');
  await caso('celular: a janela do Subtotal tem botões e campos de 44 px', async () => {
    await q.locator('.topbar button:has-text("Abas")').first().tap(); await q.waitForTimeout(300);
    await q.locator('.tab:has-text("Dados")').tap(); await q.waitForTimeout(300);
    await q.locator('[data-cmd="dados.subtotal"]').first().tap(); await q.waitForSelector('[data-sub-ok]');
    const peq = await q.evaluate(() => [...document.querySelectorAll('.pl-jsub button, .pl-jsub select')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height < 43.5; }).map((e) => (e.textContent || e.tagName).trim().slice(0, 20) + ' ' + Math.round(e.getBoundingClientRect().height)));
    certo(peq.length === 0, peq.join(' | '));
  });
  await c2.close();
}

console.log(`\n${ok} de ${ok + falhas} conferências do Subtotal passaram.`);
await nav.close();
process.exit(falhas ? 1 : 0);
