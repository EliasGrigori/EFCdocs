/* Vértice Docs — v0.6.24.1 (estabilização, relatório do Grok de 18/11): DL01, V01, V02, V05 e DL02 na tela.
   Uso: node scripts/testar-estabilizacao.mjs <endereço>. Dados inventados. */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-qualidade.xlsx', import.meta.url));
let ok = 0, falhas = 0;
const erros = [];
const certo = (c, m) => { if (!c) throw new Error(m); };
async function caso(nome, f) { try { await f(); ok++; console.log('  ok   ' + nome); } catch (e) { falhas++; console.log('  FALHA ' + nome + ' — ' + String(e.message || e).split('\n')[0].slice(0, 300)); } }
const nav = await chromium.launch({ executablePath: CHROME });
async function pagina(o = {}) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce', ...o });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
  return { ctx, p };
}
async function novaPlanilha(p) { await p.goto(BASE + '#/planilha'); await p.waitForSelector('[data-novo=planilha]'); await p.click('[data-novo=planilha]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(250); }
async function celula(p, ref) { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(60); }
const lerCelula = async (p, ref) => { await celula(p, ref); return (await p.locator('.pl-cap').getAttribute('aria-label')).replace(/^Célula [A-Z]+\d+: /, '').replace(/^vazia$/, ''); };
async function digitar(p, ref, linhas) { await celula(p, ref); for (const t of linhas) { await p.keyboard.type(t); await p.keyboard.press('Enter'); } await p.waitForTimeout(80); }
async function graficoComMeta(p) {
  await p.goto(BASE + '#/'); await p.waitForSelector('[data-abrir-excel]'); await p.click('[data-abrir-excel]');
  await p.setInputFiles('[data-excel-arquivo]', AMOSTRA); await p.waitForSelector('[data-excel-abrir]', { timeout: 30000 });
  await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(300);
  await celula(p, 'B1:C10');
  await p.click('.tabs .tab:has-text("Inserir")'); await p.locator('[data-cmd="inserir.grafico"]').first().click(); await p.waitForSelector('[data-grafico-janela]');
  await p.click('[data-gr-aplicar]'); await p.waitForSelector('.pl-obj-gr'); await p.waitForTimeout(300);
  await p.locator('[data-cmd="grafico.editar"]').first().click(); await p.waitForSelector('[data-grafico-janela]'); await p.waitForTimeout(300);
  /* como uma pessoa: clica no campo e digita (é isso que rola o corpo do editor) */
  await p.locator('[data-ge-aba="tipo"]').click(); await p.locator('[data-ge="meta"]').click(); await p.keyboard.type('0,6'); await p.waitForTimeout(400);
}
const metaValor = async (p) => Number((await p.locator('[data-ge="meta"]').inputValue()).replace(',', '.'));

await caso('DL01: fórmula com erro + caixa de nome não trava a planilha (Esc e digitar funcionam depois)', async () => {
  const { ctx, p } = await pagina();
  await novaPlanilha(p);
  await celula(p, 'A1'); await p.keyboard.type('=SOMA('); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill('B5'); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(300);
  await p.keyboard.press('Escape'); await p.waitForTimeout(200); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  await digitar(p, 'C3', ['tudo certo']);
  certo((await lerCelula(p, 'C3')) === 'tudo certo', 'a planilha travou: C3 = ' + await lerCelula(p, 'C3'));
  await ctx.close();
});

await caso('V01: em tela de 768 px de altura, ao digitar a meta a prévia continua visível e a linha da meta pega o clique', async () => {
  const { ctx, p } = await pagina({ viewport: { width: 1366, height: 768 } });
  await graficoComMeta(p);
  const r = await p.evaluate(() => {
    const t = document.querySelector('[data-gr-previa] [data-meta-arrastar]'), b = t.getBoundingClientRect();
    const corpo = document.querySelector('[data-grafico-janela] .ge-corpo') || document.querySelector('[data-grafico-janela]');
    const el = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    const pv = document.querySelector('[data-gr-previa]').getBoundingClientRect();
    return { previaTopo: Math.round(pv.top), corpoTopo: Math.round(corpo.getBoundingClientRect().top), pega: !!(el && el.closest && el.closest('[data-gr-previa]') && (el.closest('[data-meta-arrastar]') || el.closest('[data-parte="meta"]'))) };
  });
  certo(r.pega && r.previaTopo >= r.corpoTopo - 1, 'a prévia saiu do topo do editor: ' + JSON.stringify(r));
  await ctx.close();
});

await caso('D-63: 10 tentativas seguidas a 1366×768, com a linha da meta perto do topo, todas sobem a meta', async () => {
  const { ctx, p } = await pagina({ viewport: { width: 1366, height: 768 } });
  await graficoComMeta(p);
  const erradas = [];
  for (let i = 0; i < 10; i++) {
    const alvo = (0.85 + (i % 3) * 0.04).toFixed(2).replace('.', ',');
    await p.locator('[data-ge="meta"]').click({ clickCount: 3 }); await p.keyboard.type(alvo); await p.waitForTimeout(250);
    const v0 = await metaValor(p);
    const box = await p.locator('[data-gr-previa] [data-meta-arrastar]').boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x, y - 15, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(200);
    const v1 = await metaValor(p);
    if (!(v1 > v0)) erradas.push(`${i + 1}: ${v0} -> ${v1}`);
  }
  certo(!erradas.length, 'falhou em ' + erradas.length + ' de 10: ' + erradas.join('; '));
  await ctx.close();
});

await caso('V02: arrastar a meta com o dedo muda a meta e não rola a janela', async () => {
  /* computador com tela de toque (como o do Elias) e tablet deitado */
  const { ctx, p } = await pagina({ viewport: { width: 1024, height: 768 }, hasTouch: true });
  await graficoComMeta(p);
  const box = await p.locator('[data-gr-previa] [data-meta-arrastar]').boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * 5 }] }); await p.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(300);
  const v = await metaValor(p);
  certo(v > 0.65, 'o dedo não mexeu na meta: ' + v);
  await ctx.close();
});

await caso('V05: no Quadro, Ctrl+N põe negrito e Ctrl+B salva (igual à planilha)', async () => {
  const { ctx, p } = await pagina();
  await p.goto(BASE + '#/postits'); await p.waitForSelector('[data-novo=postits]'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
  await p.click('.tabs .tab:has-text("Inserir")'); await p.locator('[data-cmd="inserir.postit"]').first().click();
  const ta = p.locator('textarea.qd-edita'); await ta.waitFor(); await ta.fill('Lote 7'); await ta.press('Control+Enter'); await p.waitForTimeout(150);
  await p.keyboard.press('Escape'); await p.locator('.qi-postit').first().click(); await p.waitForTimeout(150);
  const negrito = async () => { await p.click('.tabs .tab:has-text("Página Inicial")'); return p.locator('.ribbon [data-cmd="formatar.negrito"]').getAttribute('aria-pressed'); };
  certo((await negrito()) !== 'true', 'já começou em negrito');
  await p.locator('.qi-postit').first().click(); await p.keyboard.press('Control+n'); await p.waitForTimeout(200);
  certo((await negrito()) === 'true', 'Ctrl+N não pôs negrito');
  await p.locator('.qi-postit').first().click(); await p.keyboard.press('Control+b'); await p.waitForTimeout(300);
  certo((await negrito()) === 'true', 'Ctrl+B mexeu no negrito');
  certo((await p.locator('.toast').allInnerTexts()).join(' ').includes('Salvo'), 'Ctrl+B não salvou');
  await ctx.close();
});

await caso('DL02: escolher só uma coluna com dados ao lado e A→Z pergunta "Expandir a seleção" (e expandir mantém as linhas juntas)', async () => {
  const { ctx, p } = await pagina();
  await novaPlanilha(p);
  await digitar(p, 'A1', ['Nome', 'Arroz', 'Feijão', 'Leite', 'Café']); await digitar(p, 'B1', ['Qtd', '3', '1', '2', '9']);
  await celula(p, 'B1:B5');
  await p.click('.tabs .tab:has-text("Dados")'); await p.locator('[data-cmd="dados.az"]').first().click(); await p.waitForTimeout(300);
  certo(await p.locator('[data-expandir-ordem-janela]').count() === 1, 'não perguntou se expande a seleção');
  certo(await p.locator('[data-expandir-ordem="expandir"]').isChecked(), 'expandir devia vir marcado (o recomendado)');
  await p.click('[data-expandir-ok]'); await p.waitForTimeout(300);
  const nomes = []; for (const r of ['A2', 'A3', 'A4', 'A5']) nomes.push(await lerCelula(p, r));
  certo(nomes.join(',') === 'Feijão,Leite,Arroz,Café', 'linhas misturadas: ' + nomes);
  await ctx.close();
});

console.log(erros.length ? 'Console com erro: ' + erros.slice(0, 3).join(' | ') : 'Console sem erros.');
console.log(`${ok} de ${ok + falhas} conferências da estabilização passaram.`);
await nav.close();
process.exit(falhas || erros.length ? 1 : 0);
