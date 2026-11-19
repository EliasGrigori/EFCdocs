/* Vértice Docs — v0.6.36: Dados › Texto para colunas e o "Salvo" do celular deitado pequeno.
   Uso: node scripts/testar-textocolunas.mjs <endereço>. Dados inventados. */
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
let ok = 0, falhas = 0;
const erros = [];
const certo = (c, m) => { if (!c) throw new Error(m); };
async function caso(nome, f) { try { await f(); ok++; console.log('  ok   ' + nome); } catch (e) { falhas++; console.log('  FALHA ' + nome + ' — ' + String(e.message || e).split('\n')[0].slice(0, 300)); } }
const nav = await chromium.launch({ executablePath: CHROME, env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });

async function celula(p, ref) {
  await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(60);
  const r = await p.locator('.pl-cap').getAttribute('aria-label');
  return r.replace(/^Célula [A-Z]+\d+: /, '').replace(/^vazia$/, '');
}
async function digitarEm(p, ref, linhas) { await celula(p, ref); for (const t of linhas) { await p.keyboard.type(t); await p.keyboard.press('Enter'); } await p.waitForTimeout(100); }
const abrirDados = async (p) => { await p.click('.tab:has-text("Dados")'); await p.waitForTimeout(150); };

/* ---------- computador ---------- */
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
  await p.goto(BASE + '#/inicio'); await p.click('[data-novo=planilha]'); await p.waitForSelector('.sup-planilha .pl-cv');

  await caso('a faixa Dados tem "Texto para colunas" em Ferramentas de dados, antes de Remover duplicatas', async () => {
    await abrirDados(p);
    const ids = await p.locator('.ribbon [data-cmd]').evaluateAll((l) => l.map((e) => e.getAttribute('data-cmd')));
    const i = ids.indexOf('dados.textoColunas'), j = ids.indexOf('dados.duplicados');
    certo(i >= 0 && j > i, 'ordem: ' + ids.filter((x) => x.startsWith('dados.')).join(' '));
  });

  await caso('separa "Silva;Maria;32" em três colunas, com o separador adivinhado; número vira número', async () => {
    await digitarEm(p, 'A1', ['Silva;Maria;32', 'Lima;Ana;1,5', 'Rocha;Pedro;7']);
    await celula(p, 'A1'); await abrirDados(p);
    await p.locator('[data-cmd="dados.textoColunas"]').first().click();
    await p.waitForSelector('[data-tc-previa]');
    certo(await p.locator('[data-tc-sep=pv]').isChecked(), 'o ponto e vírgula não veio marcado');
    certo(/3 colunas/.test(await p.locator('[data-tc-aplicar]').innerText()), 'botão: ' + await p.locator('[data-tc-aplicar]').innerText());
    await p.locator('[data-tc-aplicar]').click(); await p.waitForTimeout(250);
    certo((await celula(p, 'A1')) === 'Silva', 'A1: ' + await celula(p, 'A1'));
    certo((await celula(p, 'B2')) === 'Ana', 'B2: ' + await celula(p, 'B2'));
    const c2 = await celula(p, 'C2'); certo(/1,5/.test(c2), 'C2: ' + c2);
    const fx = await p.locator('.pl-fx-campo').innerText(); certo(/^1,5$/.test(fx.trim()), 'na barra da fórmula: ' + fx);
  });

  await caso('Ctrl+Z desfaz a separação inteira de uma vez', async () => {
    await p.keyboard.press('Escape'); await p.keyboard.press('Control+z'); await p.waitForTimeout(250);
    certo((await celula(p, 'A1')) === 'Silva;Maria;32' && (await celula(p, 'B1')) === '', 'A1: ' + await celula(p, 'A1') + ' · B1: ' + await celula(p, 'B1'));
  });

  await caso('formato Texto mantém 001; Pular não escreve a coluna; aviso de célula que será substituída', async () => {
    await digitarEm(p, 'E1', ['001|Mamão|5']); await digitarEm(p, 'F1', ['velho']);
    await celula(p, 'E1'); await abrirDados(p); await p.locator('[data-cmd="dados.textoColunas"]').first().click(); await p.waitForSelector('[data-tc-previa]');
    for (const s of ['pv', 'virgula', 'tab', 'espaco']) if (await p.locator(`[data-tc-sep=${s}]`).isChecked()) await p.locator(`[data-tc-sep=${s}]`).uncheck();
    await p.locator('[data-tc-outro]').fill('|'); await p.waitForTimeout(100);
    certo(await p.locator('[data-tc-aviso]').count() === 1, 'não avisou que F1 será substituída');
    await p.locator('[data-tc-formato="0"]').selectOption('texto'); await p.locator('[data-tc-formato="1"]').selectOption('pular'); await p.waitForTimeout(80);
    certo(/2 colunas/.test(await p.locator('[data-tc-aplicar]').innerText()), 'botão: ' + await p.locator('[data-tc-aplicar]').innerText());
    await p.locator('[data-tc-aplicar]').click(); await p.waitForTimeout(250);
    certo((await celula(p, 'E1')) === '001', 'E1: ' + await celula(p, 'E1'));
    certo((await celula(p, 'F1')) === '5', 'F1: ' + await celula(p, 'F1'));
    certo((await celula(p, 'G1')) === '', 'G1: ' + await celula(p, 'G1'));
  });

  await caso('largura fixa com destino em outra coluna: a origem fica', async () => {
    await digitarEm(p, 'A10', ['AB  12', 'CD  34']);
    await celula(p, 'A10'); await abrirDados(p); await p.locator('[data-cmd="dados.textoColunas"]').first().click(); await p.waitForSelector('[data-tc-previa]');
    await p.locator('[data-tc-modo=fixo]').click(); await p.locator('[data-tc-cortes]').fill('4');
    await p.locator('[data-tc-destino]').fill('C10'); await p.locator('[data-tc-aplicar]').click(); await p.waitForTimeout(250);
    certo((await celula(p, 'A10')) === 'AB  12', 'A10: ' + await celula(p, 'A10'));
    certo((await celula(p, 'C10')) === 'AB' && (await celula(p, 'D11')) === '34', 'C10: ' + await celula(p, 'C10') + ' · D11: ' + await celula(p, 'D11'));
  });

  await caso('duas colunas escolhidas: avisa que é uma coluna só', async () => {
    await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill('A1:B2'); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(80);
    await abrirDados(p); await p.locator('[data-cmd="dados.textoColunas"]').first().click(); await p.waitForTimeout(200);
    certo(await p.locator('[data-tc-previa]').count() === 0, 'a janela abriu com duas colunas');
    certo(/coluna só/.test(await p.locator('.toasts').innerText()), 'sem aviso');
  });

  await caso('a busca "O que você quer fazer?" acha "separar colunas"', async () => {
    await p.keyboard.press('Escape'); await p.keyboard.press('Alt+q'); await p.waitForTimeout(200);
    await p.keyboard.type('separar colunas'); await p.waitForTimeout(250);
    certo(/Texto para colunas/.test(await p.locator('.paleta, [role=dialog]').first().innerText()), 'a busca não achou');
    await p.keyboard.press('Escape');
  });
  await ctx.close();
}

/* ---------- celular deitado pequeno: o "Salvo" com a bolinha em cima ---------- */
{
  const ctx = await nav.newContext({ viewport: { width: 667, height: 375 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage(); p.on('pageerror', (e) => erros.push(String(e)));
  await p.goto(BASE + '#/inicio'); await p.click('[data-novo=planilha]'); await p.waitForSelector('.sup'); await p.waitForTimeout(500);
  await caso('celular: a janela do Texto para colunas tem botões e campos de 44 px', async () => {
    await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill('A1'); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(100);
    await p.locator('.pl-fx-campo').click(); await p.keyboard.type('a;b;c'); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
    await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill('A1'); await p.locator('.pl-nome').press('Enter');
    await p.locator('.topbar button:has-text("Abas")').first().tap(); await p.waitForTimeout(300);
    await p.locator('.tab:has-text("Dados")').tap(); await p.waitForTimeout(300);
    await p.locator('[data-cmd="dados.textoColunas"]').first().tap(); await p.waitForSelector('[data-tc-previa]');
    const peq = await p.evaluate(() => [...document.querySelectorAll('.pl-jtc button, .pl-jtc select, .pl-jtc input')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height < 43.5 && e.type !== 'checkbox'; }).map((e) => (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 20) + ' ' + Math.round(e.getBoundingClientRect().height)));
    certo(peq.length === 0, peq.join(' | '));
    await p.keyboard.press('Escape'); await p.locator('.topbar button:has-text("Abas")').first().tap(); await p.waitForTimeout(200);
  });
  await caso('deitado pequeno: só "Salvo" e a hora, com a bolinha verde em cima e no meio do texto', async () => {
    const r = await p.evaluate(() => { const s = document.querySelector('.tb-tit .salvo'); const i = s.querySelector('i').getBoundingClientRect(); const t = document.createRange(); t.selectNodeContents(s.lastChild); const tx = t.getBoundingClientRect(); return { i: i.toJSON(), tx: tx.toJSON(), texto: s.textContent }; });
    certo(/^Salvo \d{2}:\d{2}$/.test(r.texto.trim()), 'texto: ' + r.texto);
    certo(r.i.bottom <= r.tx.top + 1, `a bolinha não está em cima: bolinha até ${Math.round(r.i.bottom)}, texto desde ${Math.round(r.tx.top)}`);
    const mi = r.i.left + r.i.width / 2, mt = r.tx.left + r.tx.width / 2; certo(Math.abs(mi - mt) <= 2, `fora do meio: bolinha em ${mi.toFixed(1)}, texto em ${mt.toFixed(1)}`);
  });
  await ctx.close();
}

await caso('console sem erro', async () => { certo(erros.length === 0, erros.join(' | ').slice(0, 300)); });
console.log(`\n${ok} de ${ok + falhas} conferências do Texto para colunas passaram.`);
await nav.close();
process.exit(falhas ? 1 : 0);
