/* Vértice Docs v0.6.63 — achados pequenos (relatório do Grok de 25/11, relatório de outro testador de 25/11 13:08) e J1 (D-86).
   Falha na v0.6.62 e passa na v0.6.63. Os achados que já tinham teste no projeto continuam nos testes deles:
   V56-04 e PL06 em testar-quadro-cel.mjs, ordem do Inserir em testar-faixa.mjs, durações e propriedades em testar-fluidez.mjs.
   Uso: node scripts/testar-v0663.mjs <endereço> [pasta-dos-prints] */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
const BASE = process.argv[2] || 'http://localhost:8731/';
const PRINTS = process.argv[3] || '';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-v0641.xlsx', import.meta.url));
const nav = await chromium.launch({ executablePath: CHROME });
const erros = [];
let falhas = 0, ok = 0;
const caso = async (nome, f) => { try { const info = await f(); ok++; console.log(`  ok    ${nome}${info ? ' — ' + info : ''}`); } catch (e) { falhas++; console.log(`  FALHA ${nome} — ${String(e.message || e).split('\n')[0].slice(0, 300)}`); } };
const certo = (c, m) => { if (!c) throw new Error(m); };
async function pagina(opc = {}, fixo = true) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce', ...opc });
  if (fixo) await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
  return { ctx, p };
}
/* opacidade com que a camada nasce: congela as animações no começo e lê */
/* opacidade de verdade: a da camada vezes a de todos os pais (a janela fica dentro do fundo, que também anima) */
const opacidadeAoNascer = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; for (const a of document.getAnimations()) { a.pause(); a.currentTime = 0; } let o = 1; for (let n = e; n && n.nodeType === 1; n = n.parentElement) o *= +getComputedStyle(n).opacity; return Math.round(o * 100) / 100; }, sel);
const nomeContemTexto = (p, sel) => p.evaluate((s) => [...document.querySelectorAll(s)].map((e) => {
  const n = (t) => String(t || '').replace(/\s+/g, '').toLowerCase(); /* como o axe, sem contar os espaços entre as partes */
  const nome = n(e.getAttribute('aria-label') || e.textContent), vis = n(e.innerText);
  return { vis, nome, ok: !vis || nome.includes(vis) };
}), sel);

/* ---------- J1 (D-86): janela e menu nascem quase opacos ---------- */
{
  const { ctx, p } = await pagina({ reducedMotion: 'no-preference' });
  await p.goto(BASE + '#/'); await p.waitForSelector('[data-novo=planilha]');
  await caso('J1: o menu Novo nasce com opacidade de pelo menos 0,85 (era 0: via-se a tela através dele)', async () => {
    await p.locator('.novo-drive-b').click();
    await p.waitForSelector('.novo-drive-m');
    const o = await opacidadeAoNascer(p, '.novo-drive-m'); certo(o >= 0.85, 'opacidade ao nascer: ' + o); await p.keyboard.press('Escape'); return 'opacidade ' + o;
  });
  await p.click('[data-novo=planilha]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(400);
  await caso('J1: a janela Formatar como tabela nasce com opacidade de pelo menos 0,85', async () => {
    for (const t of ['Item', 'Caixa', 'Bomba']) { await p.keyboard.type(t); await p.keyboard.press('Enter'); }
    await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowUp');
    await p.click('.tabs .tab:has-text("Inserir")'); await p.waitForTimeout(500); await p.locator('.ribbon [data-cmd="inserir.tabela"]:visible').first().click();
    await p.waitForSelector('.pl-jtab');
    const o = await opacidadeAoNascer(p, '.pl-jtab'); certo(o >= 0.85, 'opacidade ao nascer: ' + o);
    if (PRINTS) await p.screenshot({ path: `${PRINTS}/j1-janela-ao-nascer.png` });
    await p.keyboard.press('Escape'); return 'opacidade ' + o;
  });
  await ctx.close();
}

/* ---------- Início, Documento, Planilha e Quadro ---------- */
{
  const { ctx, p } = await pagina();
  await p.goto(BASE + '#/'); await p.waitForSelector('[data-novo=docx]'); await p.waitForTimeout(600);
  await caso('Início: a frase do cartão do Documento aparece inteira (quebra em até duas linhas; antes cortava antes do selo)', async () => {
    const r = await p.locator('[data-novo=docx] .cn-tx > span').evaluate((e) => ({ sh: e.scrollHeight, ch: e.clientHeight, sw: e.scrollWidth, cw: e.clientWidth, lh: parseFloat(getComputedStyle(e).lineHeight) }));
    certo(r.sw <= r.cw + 1 && r.sh <= r.ch + 1, `cortada: ${JSON.stringify(r)}`); certo(r.ch <= r.lh * 2 + 1, 'mais de duas linhas');
  });
  await caso('Início: o caminho "Início" no alto não aparece cortado', async () => {
    const r = await p.locator('[data-trilha]').evaluate((e) => [e.scrollWidth, e.clientWidth]); certo(r[0] <= r[1], 'cortado: ' + r);
  });
  const atalho = () => p.locator('.topbar kbd').first().innerText();
  await caso('A busca mostra o mesmo atalho (Alt Q) no Início', async () => { const t = await atalho(); certo(t === 'Alt Q', t); });
  await caso('V42-02: o nome lido de "Esconder menu" e do cartão "Planilha em branco" começa pelo texto que se vê', async () => {
    const l = await nomeContemTexto(p, '.oculta-menu, [data-novo=planilha].cartao-novo, [data-novo=docx].cartao-novo, [data-novo=postits].cartao-novo');
    certo(l.length >= 2 && l.every((x) => x.ok), JSON.stringify(l.filter((x) => !x.ok)));
  });
  await p.click('[data-novo=docx]'); await p.waitForTimeout(900);
  await caso('Documento: a busca mostra Alt Q', async () => { const t = await atalho(); certo(t === 'Alt Q', t); });
  await caso('Documento: o ponto dourado de "Recortar" fica dentro do botão e não encosta no rótulo', async () => {
    const r = await p.locator('.ribbon [data-cmd="editar.recortar"]').first().evaluate((b) => {
      const br = b.getBoundingClientRect(), rot = b.querySelector('.rot').getBoundingClientRect(), af = getComputedStyle(b, '::after');
      const dir = br.right - parseFloat(af.right), esq = dir - parseFloat(af.width);
      return { folga: Math.round(esq - rot.right), dentro: dir <= br.right + 0.5 };
    });
    certo(r.dentro && r.folga >= 3, JSON.stringify(r)); return `folga ${r.folga} px`;
  });
  if (PRINTS) await p.locator('.ribbon').screenshot({ path: `${PRINTS}/doc-faixa.png` });
  await p.goto(BASE + '#/'); await p.waitForTimeout(500); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
  await caso('Quadro: a busca mostra Alt Q', async () => { const t = await atalho(); certo(t === 'Alt Q', t); });
  /* pergunta ao Elias (25/11 16:05): "deve estar por baixo da letra" — a mancha de café é o fundo do próprio post-it */
  await caso('Café: a mancha fica por baixo das letras (fundo do post-it; nenhuma camada com a mancha por cima do texto)', async () => {
    await p.locator('[data-cmd="inserir.postit"]').first().click(); const ta = p.locator('textarea.qd-edita'); await ta.waitFor();
    await ta.fill('Conferir o lacre e a temperatura das amostras na chegada'); await ta.press('Control+Enter'); await p.waitForTimeout(150);
    await p.keyboard.press('Escape'); await p.click('.tab:has-text("Página Inicial")'); await p.waitForTimeout(200);
    await p.locator('.qi', { hasText: 'Conferir o lacre' }).first().click(); await p.waitForTimeout(150);
    await p.click('[data-menu-faixa=texturaQ]'); await p.locator('.rb-lista [data-cmd="formatar.textura|cafe"]').click(); await p.waitForTimeout(200);
    const r = await p.locator('.qi', { hasText: 'Conferir o lacre' }).first().evaluate((e) => ({ fundo: /cafe/.test(getComputedStyle(e).backgroundImage), porCima: [...e.querySelectorAll('*')].filter((x) => /cafe/.test(getComputedStyle(x).backgroundImage) || /cafe/.test(getComputedStyle(x, '::after').backgroundImage)).length }));
    if (PRINTS) { await p.keyboard.press('Escape'); await p.waitForTimeout(150); await p.locator('.qi', { hasText: 'Conferir o lacre' }).first().screenshot({ path: `${PRINTS}/cafe-por-baixo.png` }); }
    certo(r.fundo && r.porCima === 0, JSON.stringify(r));
  });
  await ctx.close();
}

/* ---------- Documento em tela média: o menu lateral se esconde como na Planilha e no Quadro ---------- */
{
  const { ctx, p } = await pagina({}, false);
  await p.goto(BASE + '#/'); await p.waitForSelector('[data-novo=docx]');
  await caso('Documento em branco (1366 px): o menu lateral se esconde sozinho, como na Planilha e no Quadro', async () => {
    await p.click('[data-novo=docx]'); await p.waitForTimeout(900);
    const a = await p.evaluate(() => [document.querySelector('.app').getAttribute('data-menu'), !!document.querySelector('.rail')]);
    certo(a[0] === 'oculto' && !a[1], 'menu: ' + a);
  });
  if (PRINTS) await p.screenshot({ path: `${PRINTS}/doc-1366.png` });
  await ctx.close();
}

/* ---------- Documentos internos com 1040 px exatos: o Tipo fica (a regra diz "abaixo de 1040") ---------- */
for (const [w, quer] of [[1040, true], [1039, false]]) {
  const { ctx, p } = await pagina({ viewport: { width: w, height: 768 } });
  await p.goto(BASE + '#/internos'); await p.waitForSelector('.internos .tb-arq'); await p.waitForTimeout(300);
  await caso(`Documentos internos com ${w} px: a coluna Tipo ${quer ? 'aparece' : 'sai'}`, async () => {
    const vis = await p.locator('.internos .tb-arq th.c-tipo, .internos .tb-arq .c-tipo').first().isVisible().catch(() => false);
    certo(vis === quer, 'Tipo visível: ' + vis);
  });
  await ctx.close();
}

/* ---------- Segmentação no celular (390 px): a escolhida vem para dentro da tela ---------- */
{
  const { ctx, p } = await pagina({ viewport: { width: 390, height: 790 }, hasTouch: true, isMobile: true });
  await p.goto(BASE + '#/'); await p.waitForSelector('[data-abrir-excel]'); await p.click('[data-abrir-excel]');
  await p.setInputFiles('[data-excel-arquivo]', AMOSTRA); await p.waitForSelector('[data-excel-abrir]', { timeout: 30000 });
  await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(900);
  await caso('Segmentação no celular: tocar no título traz a segmentação, a barra e a alça para dentro da tela (antes passavam da borda)', async () => {
    const b = await p.locator('[data-seg]').first().boundingBox();
    await p.touchscreen.tap(b.x + 30, b.y + 14); await p.waitForTimeout(500);
    const r = await p.evaluate(() => { const box = (s) => { const e = document.querySelector(s); if (!e) return null; const k = e.getBoundingClientRect(); return { l: Math.round(k.left), r: Math.round(k.right) }; }; return { vw: innerWidth, seg: box('[data-seg]'), barra: box('[data-seg-barra]'), alca: box('.pl-seg.escolhida .pl-obj-alca') }; });
    certo(r.seg && r.barra && r.alca, 'faltou peça: ' + JSON.stringify(r));
    certo(r.seg.r <= r.vw && r.barra.r <= r.vw && r.alca.r <= r.vw && r.barra.l >= 0, JSON.stringify(r));
    certo(await p.locator('.janela').count() === 0, 'o toque abriu as Configurações sozinho (o clique caiu na engrenagem depois de rolar)');
    if (PRINTS) await p.screenshot({ path: `${PRINTS}/seg-celular.png` });
    return `segmentação até ${r.seg.r}, barra até ${r.barra.r}, tela ${r.vw}`;
  });
  await ctx.close();
}

await caso('sem erro na página', async () => { certo(erros.length === 0, erros.join(' | ')); });
await nav.close();
console.log(`\n${ok} de ${ok + falhas} conferências da v0.6.63 passaram.`);
process.exit(falhas ? 1 : 0);
