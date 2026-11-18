/* Vértice Docs — v0.6.24 parte 1: colunas das listas no padrão do EFCwork (ordem, busca, valores, mover, arrastar, Travar, celular).
   Uso: node scripts/testar-colunas.mjs <endereço>. Arquivos inventados (semente do layout). */
import { chromium } from 'playwright';
import { abrirSemeado, espera } from './layout/semente.mjs';
const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
let ok = 0, falhas = 0;
const certo = (c, m) => { if (!c) throw new Error(m); };
async function caso(nome, f) { try { await f(); ok++; console.log('  ok   ' + nome); } catch (e) { falhas++; console.log('  FALHA ' + nome + ' — ' + String(e.message || e).slice(0, 300)); } }
const nav = await chromium.launch({ executablePath: CHROME });
const erros = [];
const abre = async (o = {}) => { const a = await abrirSemeado(nav, BASE, { w: 1366, h: 900, reduzido: true, ...o }); a.page.on('pageerror', (e) => erros.push(String(e))); a.page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); }); return a; };
const cabecalhos = (p, t = '') => p.locator(`${t} .tb-arq thead th`).evaluateAll((e) => e.map((x) => x.getAttribute('data-col')));
const nomes = (p) => p.locator('.tb-arq tr.arq .c-nome b').allInnerTexts();
const selo = (p) => p.locator('[data-cont]').first().innerText();
const menu = async (p, k) => { await p.click(`[data-col-menu=${k}]`); await p.waitForSelector(`.col-menu[data-col-aberta=${k}]`); await espera(150); };

const a = await abre(); const p = a.page;
await p.goto(BASE + '#/planilha'); await espera(900);
const total = await p.locator('.tb-arq tr.arq').count();

await caso('ordem em ciclo: padrão, A a Z, Z a A, padrão (a seta aparece no título)', async () => {
  const padrao = await nomes(p);
  await menu(p, 'nome');
  await p.click('[data-col-ordem]'); await espera(150);
  const az = await nomes(p), esperado = [...padrao].sort((x, y) => x.localeCompare(y, 'pt-BR', { numeric: true, sensitivity: 'base' }));
  certo(JSON.stringify(az) === JSON.stringify(esperado), 'A a Z: ' + az.slice(0, 3));
  certo(await p.locator('th[data-col=nome][aria-sort=ascending] .col-mo').count() === 1, 'sem a seta no título');
  await p.click('[data-col-ordem]'); await espera(150);
  certo(JSON.stringify(await nomes(p)) === JSON.stringify([...esperado].reverse()), 'Z a A');
  await p.click('[data-col-ordem]'); await espera(150);
  certo(JSON.stringify(await nomes(p)) === JSON.stringify(padrao), 'não voltou ao padrão');
  certo((await p.locator('[data-col-ordem]').getAttribute('data-col-ordem')) === 'padrao', 'botão não diz padrão');
});

await caso('busca e caixas filtram as linhas; contagem por valor; "total filtrado" no selo e o funil no título', async () => {
  await p.fill('[data-col-busca]', 'controle'); await espera(200);
  const n = await p.locator('.tb-arq tr.arq').count();
  certo(n > 0 && n < total, 'busca: ' + n + ' de ' + total);
  certo((await nomes(p)).every((x) => /controle/i.test(x)), 'busca deixou passar outro nome');
  certo((await selo(p)).includes('total filtrado'), 'selo: ' + await selo(p));
  certo(await p.locator('th[data-col=nome] .col-hm.on .col-mf').count() === 1, 'sem o funil no título');
  const vals = await p.locator('[data-col-valor]').count();
  certo(vals === n, 'a lista de valores não seguiu a busca: ' + vals);
  await p.locator('[data-col-valor]').first().uncheck(); await espera(150);
  certo(await p.locator('.tb-arq tr.arq').count() === n - 1, 'desmarcar não tirou a linha');
  certo(await p.locator('[data-limpar-filtros]').count() === 1, '"Limpar filtros" não apareceu no lugar do botão Filtro');
  await p.click('.col-limpa'); await espera(150);
  certo(await p.locator('.tb-arq tr.arq').count() === total, 'Limpar esta coluna não voltou tudo');
  await p.keyboard.press('Escape'); await espera(200);
  certo(await p.locator('.col-menu').count() === 0, 'Esc não fechou o menu');
});

await caso('mover a coluna arrastando; as células acompanham; a ordem fica lembrada depois de recarregar (as setas do menu saíram)', async () => {
  await menu(p, 'nome'); certo(await p.locator('[data-col-mover]').count() === 0, 'as setas de mover voltaram'); await p.keyboard.press('Escape'); await espera(150);
  { const de = await p.locator('th[data-col=nome] .col-thr').boundingBox(), ate = await p.locator('th[data-col=quando]').boundingBox();
    await p.mouse.move(de.x + 10, de.y + de.height / 2); await p.mouse.down(); await p.mouse.move(ate.x + ate.width - 12, ate.y + ate.height / 2, { steps: 8 }); await p.mouse.up(); await espera(200); }
  const cab = await cabecalhos(p);
  certo(JSON.stringify(cab) === JSON.stringify(['quando', 'nome', 'acoes']), 'cabeçalhos: ' + cab);
  const tds = await p.locator('.tb-arq tr.arq').first().locator('td').evaluateAll((e) => e.map((x) => x.className));
  certo(tds[0] === 'c-quando' && tds[1] === 'c-nome', 'células: ' + tds);
  await p.reload(); await espera(900);
  certo(JSON.stringify(await cabecalhos(p)) === JSON.stringify(['quando', 'nome', 'acoes']), 'não lembrou: ' + await cabecalhos(p));
});

await caso('arrastar o título com o mouse muda a coluna de lugar; soltar sem mover abre o menu', async () => {
  const de = await p.locator('th[data-col=nome] .col-thr').boundingBox(), ate = await p.locator('th[data-col=quando]').boundingBox();
  await p.mouse.move(de.x + 10, de.y + de.height / 2); await p.mouse.down();
  await p.mouse.move(ate.x + 12, ate.y + ate.height / 2, { steps: 8 });
  certo(await p.locator('th[data-col=quando][data-col-alvo=antes]').count() === 1, 'sem a marca do lado de entrada');
  await p.mouse.up(); await espera(200);
  certo(JSON.stringify(await cabecalhos(p)) === JSON.stringify(['nome', 'quando', 'acoes']), 'arrastar: ' + await cabecalhos(p));
  certo(await p.locator('.col-menu').count() === 0, 'arrastar abriu o menu');
  await p.locator('th[data-col=nome] .col-thr').click(); await espera(200);
  certo(await p.locator('.col-menu[data-col-aberta=nome]').count() === 1, 'clicar não abriu o menu');
  await p.keyboard.press('Escape'); await espera(150);
});

await caso('Travar guarda o filtro da coluna ao sair do app; o "Limpar" da tela não mexe na travada; destravar solta', async () => {
  await p.goto(BASE + '#/'); await espera(900);
  await menu(p, 'tipo'); await p.locator('[data-col-valor="Documento"]').uncheck(); await espera(100);
  await p.click('[data-col-trava]'); await espera(100);
  certo(await p.locator('.col-av').count() === 1, 'sem o aviso de travada');
  certo(await p.locator('[data-col-valor="Planilha"]').isDisabled(), 'travada continua mudando');
  await p.keyboard.press('Escape'); await espera(150);
  const n = await p.locator('.tb-arq tr.arq').count();
  await p.reload(); await espera(900);
  certo(await p.locator('.tb-arq tr.arq').count() === n, 'o filtro da travada não voltou');
  certo(await p.locator('th[data-col=tipo] .col-mt').count() === 1, 'sem o cadeado no título');
  await p.click('[data-limpar-filtros]').catch(() => {}); await espera(150);
  certo(await p.locator('.tb-arq tr.arq').count() === n, 'o Limpar da tela soltou a travada');
  await p.keyboard.press('Escape'); await espera(100);
  await menu(p, 'tipo'); await p.click('[data-col-trava]'); await p.click('.col-limpa'); await espera(150); await p.keyboard.press('Escape');
  await p.reload(); await espera(900);
  certo(!(await selo(p)).includes('filtrado'), 'destravar e limpar não soltou');
});

await caso('Documentos internos e Lixeira têm o menu em todas as colunas (Código, Situação, Na lixeira desde)', async () => {
  await p.goto(BASE + '#/internos'); await espera(900);
  const cab = await cabecalhos(p);
  for (const k of ['codigo', 'nome', 'tipo', 'quando', 'situacao']) certo(cab.includes(k) && await p.locator(`th[data-col=${k}] [data-col-menu]`).count() === 1, 'internos sem menu em ' + k + ': ' + cab);
  await menu(p, 'situacao'); certo(await p.locator('[data-col-valor]').count() >= 1, 'situação sem valores'); await p.keyboard.press('Escape');
  await p.goto(BASE + '#/lixeira'); await espera(900);
  await menu(p, 'quando'); certo((await p.locator('.col-ci span').innerText()) === 'Ordem padrão', 'lixeira');
  await p.click('[data-col-ordem]'); await espera(150);
  certo((await p.locator('.col-ci span').innerText()) === 'Mais antiga primeiro', 'nome da ordem de data: ' + await p.locator('.col-ci span').innerText());
  await p.keyboard.press('Escape');
});
await a.ctx.close();

await caso('celular: tocar no título abre o menu de baixo para cima, com fundo; Esc e tocar fora fecham', async () => {
  const c = await abre({ w: 390, h: 844, toque: true }); const q = c.page;
  await q.goto(BASE + '#/planilha'); await espera(900);
  await q.locator('[data-col-menu=nome]').tap(); await espera(300);
  certo(await q.locator('.col-menu.col-folha').count() === 1 && await q.locator('.col-fundo').count() === 1, 'não abriu de baixo');
  const b = await q.locator('.col-menu').boundingBox();
  certo(Math.abs(b.y + b.height - 844) < 2 && b.width > 380, 'não está colado embaixo: ' + JSON.stringify(b));
  const alturas = await q.locator('.col-li').evaluateAll((e) => e.map((x) => x.getBoundingClientRect().height));
  certo(alturas.every((h) => h >= 44), 'item menor que 44 px: ' + alturas);
  await q.locator('.col-fundo').tap({ position: { x: 20, y: 20 } }); await espera(300);
  certo(await q.locator('.col-menu').count() === 0, 'tocar fora não fechou');
  certo(await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'rolagem para o lado');
  await c.ctx.close();
});

await caso('escuro: o menu abre sem erro e com o texto legível', async () => {
  const c = await abre({ tema: 'escuro' }); const q = c.page;
  await q.goto(BASE + '#/planilha'); await espera(900); await menu(q, 'nome');
  const [cor, fundo] = await q.evaluate(() => { const m = document.querySelector('.col-menu b'), s = getComputedStyle(m), f = getComputedStyle(document.querySelector('.col-menu')); return [s.color, f.backgroundColor]; });
  certo(cor !== fundo, 'texto da cor do fundo');
  await c.ctx.close();
});

/* ---------- v0.6.24.2: relatório do Grok da parte 1 (V24-01 a V24-07) ---------- */
await caso('V24-01: no tema escuro a coluna filtrada fica dourada (funil, traço e "Limpar filtros")', async () => {
  const c = await abre({ tema: 'escuro' }); const q = c.page;
  await q.goto(BASE + '#/'); await espera(900); await menu(q, 'tipo'); await q.locator('[data-col-valor="Planilha"]').uncheck(); await q.keyboard.press('Escape'); await espera(200);
  const r = await q.evaluate(() => { const ouro = getComputedStyle(document.body).getPropertyValue('--gold').trim(); const th = getComputedStyle(document.querySelector('th[data-col=tipo]')).boxShadow; const lf = getComputedStyle(document.querySelector('[data-limpar-filtros]')).color, tx = getComputedStyle(document.body).color; return { ouro, th, lf, tx }; });
  certo(r.ouro && r.th !== 'none' && r.lf !== r.tx, 'sem dourado no escuro: ' + JSON.stringify(r));
  await c.ctx.close();
});
for (const [rota, nome] of [['#/internos', 'Documentos internos'], ['#/lixeira', 'Lixeira']]) {
  await caso(`V24-02: ${nome} em janela de 1024 px: a coluna Nome tem largura e o menu dela abre`, async () => {
    const c = await abre({ w: 1024, h: 768 }); const q = c.page;
    await q.goto(BASE + rota); await espera(900);
    const w = await q.locator('th[data-col=nome]').evaluate((e) => e.getBoundingClientRect().width);
    certo(w >= 150, 'coluna Nome com ' + Math.round(w) + ' px');
    await q.click('[data-col-menu=nome]'); await espera(200);
    certo(await q.locator('.col-menu[data-col-aberta=nome]').count() === 1, 'o menu do Nome não abriu');
    certo(await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'rolagem para o lado na página');
    await c.ctx.close();
  });
}
await caso('V24-03 (refeito): celular, Documentos internos: barra numa linha que rola para o lado, com a Situação, sem alargar a tabela', async () => {
  const c = await abre({ w: 390, h: 844, toque: true }); const q = c.page;
  await q.goto(BASE + '#/internos'); await espera(900);
  const r = await q.evaluate(() => { const tr = document.querySelector('.tb-arq thead tr'), cart = document.querySelector('.tb-arq').getBoundingClientRect(), s = document.querySelector('th[data-col=situacao] [data-col-menu]'); const ths = [...tr.querySelectorAll('th')].filter((t) => t.getBoundingClientRect().width > 0); const dir = Math.max(...ths.map((t) => t.getBoundingClientRect().right)); return { cabe: tr.scrollWidth <= tr.clientWidth + 1 && dir <= Math.min(cart.right, innerWidth - 12) + 1, sw: tr.scrollWidth, cw: tr.clientWidth, dir: Math.round(dir), cart: Math.round(cart.right), situacao: !!(s && s.getBoundingClientRect().width > 0) }; });
  /* numa linha só (como antes), rolando para o lado dentro do cartão; a tabela não passa da tela (os botões das linhas aparecem) */
  const r2 = await q.evaluate(() => { const tr = document.querySelector('.tb-arq thead tr'), ths = [...tr.querySelectorAll('th')].filter((t) => t.getBoundingClientRect().width > 0); const tops = new Set(ths.map((t) => Math.round(t.getBoundingClientRect().top))); const tb = document.querySelector('.tb-arq').getBoundingClientRect(); const ac = document.querySelector('.tb-arq tr.arq .c-acoes'); return { linhas: tops.size, rola: tr.scrollWidth > tr.clientWidth, tabela: Math.round(tb.right), acoes: ac ? Math.round(ac.getBoundingClientRect().right) : 0, tela: innerWidth }; });
  certo(r.situacao && r2.linhas === 1 && r2.rola && r2.tabela <= r2.tela && r2.acoes <= r2.tela, 'barra: ' + JSON.stringify({ ...r, ...r2 }));
  await q.locator('.tb-arq thead tr').evaluate((e) => { e.scrollLeft = e.scrollWidth; }); await espera(150);
  await q.locator('[data-col-menu=situacao]').tap(); await espera(300);
  certo(await q.locator('.col-menu[data-col-aberta=situacao]').count() === 1, 'o menu da Situação não abriu');
  await c.ctx.close();
});
await caso('V24-04: "Apagar para sempre" da Lixeira com contraste de pelo menos 4,5', async () => {
  const c = await abre(); const q = c.page;
  await q.goto(BASE + '#/lixeira'); await espera(900);
  await q.locator('.tb-arq tr.arq').first().hover(); await espera(200); /* com o mouse na linha o fundo escurece (o Grok mediu assim) */
  const k = await q.locator('.btn.apagar').first().evaluate((b) => {
    /* lê a cor pelo canvas (vale para rgb, rgba e color-mix) e mistura as camadas de fundo semitransparentes */
    const cv = document.createElement('canvas').getContext('2d');
    const rgba = (t) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = '#000'; cv.fillStyle = t; cv.fillRect(0, 0, 1, 1); const d = cv.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
    const camadas = []; let el = b; while (el) { const c = rgba(getComputedStyle(el).backgroundColor); if (getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)') { camadas.push(c); if (c[3] >= 1) break; } el = el.parentElement; }
    let f = [255, 255, 255]; for (const c of camadas.reverse()) f = f.map((v, i) => v * (1 - c[3]) + c[i] * c[3]);
    const t = rgba(getComputedStyle(b).color);
    const lum = ([r, g, bb]) => { const k = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * k(r) + 0.7152 * k(g) + 0.0722 * k(bb); };
    const a = lum(t), z = lum(f); return (Math.max(a, z) + 0.05) / (Math.min(a, z) + 0.05);
  });
  console.log('    contraste do Apagar: ' + k.toFixed(2));
  certo(k >= 4.5, 'contraste ' + k.toFixed(2));
  await c.ctx.close();
});
await caso('V24-05: o título animado não tem aria-label solto (o leitor de tela lê o texto)', async () => {
  const c = await abre({ reduzido: false }); const q = c.page;
  await q.goto(BASE + '#/planilha'); await espera(900); await q.click('.rail a[href="#/internos"], a[href="#/internos"]'); await q.waitForSelector('.fz-tt', { timeout: 3000 });
  const r = await q.evaluate(() => [...document.querySelectorAll('.fz-tt')].map((e) => ({ al: e.getAttribute('aria-label'), role: e.getAttribute('role'), txt: e.textContent })));
  certo(r.length && r.every((x) => !x.al || x.role), 'aria-label sem papel: ' + JSON.stringify(r[0]));
  await c.ctx.close();
});
await caso('V24-06: menu da coluna: o Tab que sai do menu fecha o menu', async () => {
  const c = await abre(); const q = c.page;
  await q.goto(BASE + '#/planilha'); await espera(900); await menu(q, 'nome');
  for (let i = 0; i < 40 && await q.locator('.col-menu').count(); i++) { await q.keyboard.press('Tab'); await espera(30); }
  certo(await q.locator('.col-menu').count() === 0, 'o foco saiu e o menu ficou aberto');
  await c.ctx.close();
});
await caso('V24-07: janela baixa (1280×420): o menu não cobre a barra de cima', async () => {
  const c = await abre({ w: 1280, h: 420 }); const q = c.page;
  await q.goto(BASE + '#/'); await espera(900); await menu(q, 'tipo');
  const r = await q.evaluate(() => ({ m: document.querySelector('.col-menu').getBoundingClientRect().top, b: document.querySelector('.topbar').getBoundingClientRect().bottom }));
  certo(r.m >= r.b, 'menu em ' + Math.round(r.m) + ', barra até ' + Math.round(r.b));
  await c.ctx.close();
});

certo(true, '');
console.log(erros.length ? 'Console com erro: ' + erros.slice(0, 3).join(' | ') : 'Console sem erros.');
console.log(`${ok} de ${ok + falhas} conferências das colunas passaram.`);
await nav.close();
process.exit(falhas || erros.length ? 1 : 0);
