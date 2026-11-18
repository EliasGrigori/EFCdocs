/* Vértice Docs — teste automático das regras de layout da família (docs/REGRAS-DE-LAYOUT.md).
   Cada caso é o "Como conferir" de uma regra. v0.6.20, parte 1: R1 a R5, R10 e R11 nas telas de lista;
   parte 2: R6 situação com ponto, R7 sem tarja colorida, R8 gaveta, R9 histórico com a gota.
   Uso: node scripts/testar-layout.mjs <endereço do dist/>   (ex.: http://localhost:8731/) */
import { chromium } from 'playwright';
import { montarKanban } from './layout/kanban-semente.mjs';
import { abrirSemeado, espera, ATRASAR_BANCO } from './layout/semente.mjs';

const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const nav = await chromium.launch({ executablePath: CHROME, env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const resultados = [];
const certo = (v, msg) => { if (!v) throw new Error(msg || 'esperado verdadeiro'); };
const perto = (a, b, folga, msg) => { if (Math.abs(a - b) > folga) throw new Error(`${msg || ''} esperado ${b} (±${folga}), veio ${a}`); };
async function caso(nome, fn) {
  try { await fn(); resultados.push({ nome, ok: true }); console.log('  ok   ' + nome); }
  catch (e) { resultados.push({ nome, ok: false }); console.log('  FALHA ' + nome + ' — ' + e.message.split('\n')[0]); }
}
const limpo = async (loc) => (await loc.innerText()).replace(/\s+/g, ' ').trim();
const ir = async (p, rota) => { await p.goto(BASE + '#/' + rota); await p.waitForSelector('.pg-cab'); await espera(250); };
const LISTAS = ['', 'planilha', 'docx', 'postits', 'internos', 'lixeira'];
const AMOSTRA = new URL('../testes/amostras/amostra-qualidade.xlsx', import.meta.url).pathname;

/* ---------- PC, 1280 × 800, com 230 planilhas a mais ---------- */
const pc = await abrirSemeado(nav, BASE, { muitos: 230, reduzido: true });
const p = pc.page;

await caso('R1 · tela parada: a página não rola e a tabela desce até 16 px do fundo (6 telas)', async () => {
  for (const r of LISTAS) {
    await ir(p, r);
    const m = await p.evaluate(() => { const pg = document.querySelector('.pagina'), t = document.querySelector('.efl-tabela-rola').getBoundingClientRect(); return { sobra: pg.scrollHeight - pg.clientHeight, doc: document.documentElement.scrollHeight - innerHeight, classe: document.documentElement.classList.contains('efl-tela-parada'), fundo: innerHeight - t.bottom }; });
    certo(m.classe, `#/${r}: sem a classe efl-tela-parada`);
    certo(m.sobra === 0 && m.doc === 0, `#/${r}: a página ainda rola (${m.sobra}, ${m.doc})`);
    perto(m.fundo, 16, 1, `#/${r}: fundo da tabela`);
  }
});
await caso('R1 · a rodinha em cima do título não move a página; o cabeçalho da tabela fica parado', async () => {
  await ir(p, 'planilha');
  const b = await p.locator('.pg-tit').boundingBox();
  await p.mouse.move(b.x + 20, b.y + 10); await p.mouse.wheel(0, 600); await espera(150);
  const m = await p.evaluate(() => ({ y: scrollY, pg: document.querySelector('.pagina').scrollTop }));
  certo(m.y === 0 && m.pg === 0, 'a página andou: ' + JSON.stringify(m));
  const antes = await p.evaluate(() => document.querySelector('.tb-arq thead th').getBoundingClientRect().top);
  await p.evaluate(() => { document.querySelector('.efl-tabela-rola').scrollTop = 500; }); await espera(120);
  const d = await p.evaluate(() => ({ th: document.querySelector('.tb-arq thead th').getBoundingClientRect().top, rola: document.querySelector('.efl-tabela-rola').scrollTop }));
  certo(d.rola > 0, 'a tabela não rolou'); perto(d.th, antes, 1, 'cabeçalho da tabela');
});
await caso('R2 · sem "Mostrando X de Y" e sem o rodapé do app nas telas de lista', async () => {
  for (const r of LISTAS) {
    await ir(p, r);
    const m = await p.evaluate(() => ({ txt: document.body.innerText, foot: !!document.querySelector('.foot') }));
    certo(!/Mostrando/.test(m.txt), `#/${r}: tem "Mostrando"`); certo(!/\d+ de \d+/.test(m.txt), `#/${r}: tem "X de Y"`);
    certo(!m.foot, `#/${r}: o rodapé do app continua`);
  }
});
await caso('R2 · 100 linhas; no fim chegam mais 100 sozinhas e a tabela não volta ao topo', async () => {
  await ir(p, 'planilha');
  const n = () => p.locator('.tb-arq tr.arq').count();
  certo(await n() === 100, 'começou com ' + await n());
  certo(await p.locator('.efl-fim').count() === 1, 'sem o "Carregando mais…"');
  certo(await p.locator('button:has-text("Mostrar mais")').count() === 0, 'tem botão Mostrar mais');
  await p.evaluate(() => { const w = document.querySelector('.efl-tabela-rola'); w.scrollTop = w.scrollHeight; }); await espera(500);
  certo(await n() === 200, 'depois de rolar ficou com ' + await n());
  certo(await p.evaluate(() => document.querySelector('.efl-tabela-rola').scrollTop) > 3000, 'a tabela voltou ao topo');
});
await caso('R3 · o total fica no selo do cabeçalho; com filtro vira "· total filtrado"', async () => {
  await ir(p, 'docx');
  const selo = p.locator('.efl-meta .efl-selo-total');
  certo(await limpo(selo) === '6 documentos', await limpo(selo));
  certo(!(await selo.getAttribute('class')).includes('efl-filtrado'), 'sem filtro e já dourado');
  certo(await p.locator('.secao .cont').count() === 0, 'o contador antigo continua');
  await p.click('[data-col-menu=nome]'); await p.fill('[data-col-busca]', 'reuni'); await espera(200);
  certo(await limpo(selo) === '1 documento · total filtrado', await limpo(selo));
  certo((await selo.getAttribute('class')).includes('efl-filtrado'), 'filtrado sem o dourado suave');
  certo(await p.locator('.tb-arq tr.arq').count() === 1, 'a tabela não seguiu o filtro');
  await p.keyboard.press('Escape'); await p.click('[data-limpar-filtros]');
});
await caso('R4 · as ferramentas ficam na linha das abas (Documentos internos)', async () => {
  await ir(p, 'internos');
  /* v0.6.24: o botão Filtro saiu; com filtro nas colunas, "Limpar filtros" aparece nesse lugar */
  await p.click('[data-col-menu=nome]'); await p.fill('[data-col-busca]', 'a'); await p.keyboard.press('Escape'); await espera(200);
  const m = await p.evaluate(() => { const a = document.querySelector('.efl-abas-linha').getBoundingClientRect(), f = document.querySelector('.efl-ferramentas [data-limpar-filtros]').getBoundingClientRect(), t = document.querySelector('.int-abas').getBoundingClientRect(); return { a: [a.top, a.bottom], f: [f.top, f.bottom, f.right], t: [t.top, t.bottom], dir: a.right }; });
  await p.click('[data-limpar-filtros]');
  certo(m.f[0] >= m.a[0] - 2 && m.f[1] <= m.a[1] + 2, 'ferramentas fora da faixa das abas: ' + JSON.stringify(m));
  perto(m.f[2], m.dir, 2, 'ferramentas à direita');
});
await caso('R5 · cabeçalho com a mesma medida em todas as telas (66 px) e a tabela na mesma altura', async () => {
  const cab = [], topo = [];
  for (const r of LISTAS) {
    await ir(p, r);
    const m = await p.evaluate(() => { const c = document.querySelector('.pg-cab:not(.sub)').getBoundingClientRect(), a = document.querySelector('.efl-abas-linha'), t = document.querySelector('.efl-tabela-rola').getBoundingClientRect(); return { h: c.height, y: c.top, meta: document.querySelector('.pg-cab:not(.sub) .efl-meta').getBoundingClientRect().height, prox: a ? a.getBoundingClientRect().top : t.top }; });
    cab.push(m.h); certo(m.meta >= 24, `#/${r}: linha de pílulas com ${m.meta} px`);
    if (r) topo.push(m.prox);
  }
  certo(Math.max(...cab) - Math.min(...cab) <= 1, 'alturas do cabeçalho: ' + cab.join(', '));
  certo(Math.min(...cab) >= 66, 'cabeçalho menor que 66 px: ' + cab.join(', '));
  certo(Math.max(...topo) - Math.min(...topo) <= 1, 'abas ou tabela em alturas diferentes: ' + topo.join(', '));
});
await caso('R11 · botão dourado com sombra curta e nítida (sem brilho borrado)', async () => {
  await ir(p, 'planilha');
  const s = await p.evaluate(() => getComputedStyle(document.querySelector('.novo-drive-b')).boxShadow);
  const borroes = s.split(/,(?![^(]*\))/).map((x) => parseFloat((x.replace(/rgba?\([^)]*\)/, '').trim().split(/\s+/)[2]) || '0'));
  certo(Math.max(...borroes) <= 4, 'sombra borrada: ' + s);
  certo(await p.evaluate(() => document.querySelector('.novo-drive-b').classList.contains('efl-bt-ouro')), 'sem a peça efl-bt-ouro');
});
/* ---------- parte 2: R6, R7, R8 e R9 ---------- */
/* envio ao Cwork inventado (guardado no aparelho, como o app guarda): o 1º documento interno recebido, o 2º na caixa */
const ENVIO = async (pg) => {
  await pg.evaluate(async () => {
    const db = await new Promise((ok) => { const r = indexedDB.open('efcdocs', 1); r.onsuccess = () => ok(r.result); });
    const todos = await new Promise((ok) => { const r = db.transaction('arquivos').objectStore('arquivos').getAll(); r.onsuccess = () => ok(r.result); });
    db.close();
    const ints = todos.filter((r) => r.ficha.pastaNome && r.ficha.pastaNome === 'Etiquetas').sort((a, b) => a.ficha.codigo.localeCompare(b.ficha.codigo)).map((r) => r.id);
    localStorage.setItem('efcdocs:ponte', JSON.stringify({ [ints[0]]: { rev: 2, pid: 'p-teste', em: '2026-11-14T15:10:00Z', estado: 'recebido' }, [ints[1]]: { rev: 1, em: '2026-11-14T16:02:00Z', estado: 'caixa' } }));
  });
  await pg.reload(); await pg.waitForSelector('.wk-main'); await espera(300);
};
await ENVIO(p);
const pilulas = (pg, sel) => pg.evaluate((sel) => [...document.querySelectorAll(sel)].map((el) => {
  const c = getComputedStyle(el), a = getComputedStyle(el, '::before');
  return { txt: el.textContent.trim(), cr: el.classList.contains('cr'), fundo: c.backgroundColor, ponto: a.content !== 'none' && a.display !== 'none' && parseFloat(a.width) === 8 };
}), sel);
const SEM_FUNDO = (f) => f === 'rgba(0, 0, 0, 0)' || f === 'transparent';
await caso('R6 · situação nas tabelas: ponto de 8 px e texto, sem caixa (Documentos internos)', async () => {
  await ir(p, 'internos');
  const l = await pilulas(p, '.tb-arq .c-situacao .efl-pilula');
  certo(l.length === 2, 'esperava 2 situações, veio ' + l.length);
  for (const x of l) { certo(!x.cr && SEM_FUNDO(x.fundo), `"${x.txt}" ficou com caixa (${x.fundo})`); certo(x.ponto, `"${x.txt}" sem o ponto`); }
  certo(l[0].txt.startsWith('Recebido pelo Cwork') && l[1].txt.startsWith('Na caixa do Cwork'), JSON.stringify(l.map((x) => x.txt)));
  certo(await p.locator('.int-estado, .tb-arq .selo').count() === 0, 'sobrou situação no formato antigo (caixa)');
});
await caso('R6 · só o vermelho ganha caixa (peça da família no app)', async () => {
  const m = await p.evaluate(() => { const s = document.createElement('span'); s.className = 'efl-pilula cr'; s.textContent = 'Vencido'; document.querySelector('.pg-cab').appendChild(s);
    const c = getComputedStyle(s), a = getComputedStyle(s, '::before'); const r = { fundo: c.backgroundColor, ponto: a.display !== 'none', raio: c.borderTopLeftRadius }; s.remove(); return r; });
  certo(!SEM_FUNDO(m.fundo) && !m.ponto, 'a caixa vermelha não apareceu: ' + JSON.stringify(m)); certo(m.raio === '4px', 'canto da caixa vermelha: ' + m.raio);
});
/* R7: nenhuma caixa com borda esquerda mais grossa que as outras nem com "sombra de dentro" fazendo tarja do lado */
const TARJAS = (pg) => pg.evaluate(() => [...document.querySelectorAll('body *')].filter((el) => el.offsetParent || el.getClientRects().length).map((el) => {
  const c = getComputedStyle(el), esq = parseFloat(c.borderLeftWidth), cima = parseFloat(c.borderTopWidth), dir = parseFloat(c.borderRightWidth);
  const sombra = /inset\s+([2-9]|\d\d)px\s+0px/.test(c.boxShadow) || /([2-9]|\d\d)px\s+0px\s+0px\s+0px[^,]*inset/.test(c.boxShadow) || /rgb[^)]*\)\s+([2-9]|\d\d)px\s+0px\s+0px\s+0px\s+inset/.test(c.boxShadow);
  return (esq >= 2 && esq > cima + 0.5 && esq > dir + 0.5) || sombra ? (el.className && el.className.baseVal === undefined ? el.className : el.tagName) + ' ' + c.borderLeftWidth + ' ' + c.boxShadow.slice(0, 40) : null;
}).filter(Boolean));
await caso('R7 · sem tarja colorida na lateral: listas, Pastas, Documentos externos e o relatório do Excel', async () => {
  for (const r of [...LISTAS, 'pastas', 'externos']) { await p.goto(BASE + '#/' + r); await espera(300); const t = await TARJAS(p); certo(t.length === 0, `#/${r}: ` + t.slice(0, 3).join(' | ')); }
  await p.goto(BASE + '#/'); await p.click('[data-abrir-excel]'); await p.setInputFiles('[data-excel-arquivo]', AMOSTRA); await p.waitForSelector('[data-excel-abrir]', { timeout: 30000 }); await espera(300);
  const t = await TARJAS(p); certo(t.length === 0, 'relatório do Excel: ' + t.slice(0, 3).join(' | '));
  await p.keyboard.press('Escape'); await espera(200);
});
await caso('R8 · gaveta: texto pequeno, setas e X na linha de cima; o título embaixo, numa linha só; o X é o último botão', async () => {
  await ir(p, 'planilha');
  await p.locator('.tb-arq tr.arq').nth(1).locator('[data-detalhes]').click(); await p.waitForSelector('[data-gaveta]');
  const m = await p.evaluate(() => { const g = document.querySelector('[data-gaveta]'), x = g.querySelector('.efl-gv-acoes > button:last-child'), h = g.querySelector('[data-gv-titulo]');
    const bs = [...g.querySelectorAll('.efl-gv-acoes button')]; const r = (e) => e.getBoundingClientRect();
    return { xBaixo: r(x).bottom, hCima: r(h).top, hAlto: r(h).height, ultimo: bs[bs.length - 1].getAttribute('aria-label'), n: bs.length, sub: g.querySelector('[data-gv-sub]').textContent,
      parada: document.documentElement.classList.contains('efl-tela-parada'), sel: document.querySelectorAll('tr.arq.na-gaveta').length, foco: g.contains(document.activeElement) }; });
  certo(m.xBaixo <= m.hCima + 0.5, `o X não fica acima do título (${m.xBaixo} > ${m.hCima})`); certo(m.hAlto < 34, 'título com ' + m.hAlto + ' px');
  certo(m.ultimo === 'Fechar os detalhes' && m.n === 3, 'botões da linha de cima: ' + m.n + ', último ' + m.ultimo);
  certo(m.sub === 'Planilha', 'texto pequeno: ' + m.sub); certo(m.parada, 'a tela deixou de ficar parada com a gaveta'); certo(m.sel === 1, 'a linha aberta não ficou marcada'); certo(m.foco, 'o teclado não entrou na gaveta');
});
await caso('R8 · Alt + seta para baixo/cima e as setas trocam o registro sem fechar; Esc fecha só a gaveta', async () => {
  const nomes = await p.locator('.tb-arq tr.arq .abre b').allInnerTexts();
  const tit = () => p.locator('[data-gv-titulo]').innerText();
  certo((await tit()) === nomes[1], 'abriu ' + (await tit()));
  await p.keyboard.press('Alt+ArrowDown'); await espera(150); certo((await tit()) === nomes[2], 'Alt+↓ foi para ' + (await tit()));
  await p.keyboard.press('Alt+ArrowUp'); await p.keyboard.press('Alt+ArrowUp'); await espera(150); certo((await tit()) === nomes[0], 'Alt+↑ foi para ' + (await tit()));
  certo(await p.locator('[data-gaveta] button[data-d="-1"]').isDisabled(), 'no primeiro, a seta para cima devia ficar apagada');
  await p.locator('[data-gaveta] button[data-d="1"]').click(); await espera(150); certo((await tit()) === nomes[1], 'a seta ↓ foi para ' + (await tit()));
  await p.keyboard.press('Escape'); await espera(200);
  certo(await p.locator('[data-gaveta]').count() === 0, 'o Esc não fechou a gaveta');
  certo(p.url().endsWith('#/planilha'), 'o Esc saiu da tela: ' + p.url());
  certo(await p.evaluate(() => document.activeElement && document.activeElement.hasAttribute('data-detalhes')), 'o teclado não voltou para o botão Detalhes');
});
await caso('R8 · a gaveta segue a linha nas 200 carregadas: o próximo além das 100 primeiras desenha mais linhas', async () => {
  await ir(p, 'planilha');
  await p.locator('.tb-arq tr.arq').nth(99).locator('[data-detalhes]').click(); await p.waitForSelector('[data-gaveta]');
  await p.keyboard.press('Alt+ArrowDown'); await espera(300);
  const m = await p.evaluate(() => ({ linhas: document.querySelectorAll('.tb-arq tr.arq').length, sel: document.querySelector('tr.arq.na-gaveta') && [...document.querySelectorAll('.tb-arq tr.arq')].indexOf(document.querySelector('tr.arq.na-gaveta')) }));
  certo(m.linhas >= 200 && m.sel === 100, JSON.stringify(m));
  await p.keyboard.press('Escape');
});
await caso('R8 · os botões das ações cabem todos na coluna (nenhum cortado) nas seis listas', async () => {
  for (const r of LISTAS) {
    await ir(p, r);
    const fora = await p.evaluate(() => [...document.querySelectorAll('.tb-arq td.c-acoes')].slice(0, 5).flatMap((td) => { const c = td.getBoundingClientRect(); return [...td.querySelectorAll('button')].filter((b) => { const q = b.getBoundingClientRect(); return q.left < c.left - 0.5 || q.right > c.right + 0.5 || q.width < 20; }).map((b) => b.getAttribute('aria-label') || b.textContent); }));
    certo(fora.length === 0, `#/${r}: botão cortado: ` + fora.slice(0, 3).join(' | '));
  }
});
await caso('R9 · histórico na gaveta: do mais antigo para o mais novo, com a gota; a etapa que falta fica como "próxima"', async () => {
  await ir(p, 'internos');
  await p.locator('[data-detalhes]').nth(1).click(); await p.waitForSelector('[data-gaveta] [data-efl-tl]');
  const m = await p.evaluate(() => [...document.querySelectorAll('[data-gaveta] .efl-tl > li')].map((li) => li.className.trim() + ':' + li.querySelector('b').firstChild.textContent.trim()));
  certo(JSON.stringify(m) === JSON.stringify(['ok:Criado', 'ok:Mandado para o Cwork', 'at:Recebido pelo Cwork']), JSON.stringify(m));
  const sit = await p.locator('[data-gaveta] [data-gv-sit] .efl-pilula').allInnerTexts();
  certo(sit.length === 2 && sit[1].startsWith('Na caixa do Cwork'), 'situações na gaveta: ' + JSON.stringify(sit));
  await p.keyboard.press('Escape');
});
await caso('R8/R9 · painel do arquivo aberto: mesmo cabeçalho da gaveta, situação com ponto e histórico', async () => {
  await ir(p, 'internos'); await p.locator('.tb-arq tr.arq .abre').first().click(); await p.waitForSelector('.pl-cv');
  if (!(await p.locator('.side').count())) { await p.evaluate(() => { const x = JSON.parse(localStorage.getItem('efcdocs:prefs') || '{}'); x.painel = true; localStorage.setItem('efcdocs:prefs', JSON.stringify(x)); }); await p.reload(); }
  await p.waitForSelector('.side [data-efl-tl]');
  const m = await p.evaluate(() => { const s = document.querySelector('.side'), x = s.querySelector('[aria-label="Fechar o painel"]'), h = s.querySelector('[data-gv-titulo]');
    return { acima: x.getBoundingClientRect().bottom <= h.getBoundingClientRect().top + 0.5, tit: h.textContent, sub: s.querySelector('[data-gv-sub]').textContent, etapas: s.querySelectorAll('.efl-tl > li').length, selo: s.querySelectorAll('.selo').length }; });
  certo(m.acima && m.sub.startsWith('Detalhes · Planilha · ETQ-'), JSON.stringify(m)); certo(m.etapas === 3 && m.selo === 0, JSON.stringify(m));
  await p.evaluate(() => { const x = JSON.parse(localStorage.getItem('efcdocs:prefs') || '{}'); x.painel = false; localStorage.setItem('efcdocs:prefs', JSON.stringify(x)); });
});
/* ---------- parte 4: visual novo do Kanban, das páginas que vão chegar, do relatório do Excel, do balão e do Explicar ---------- */
await caso('Kanban novo · o cartão é o post-it (papel da cor escolhida), sem faixa de lado; andamento em cima; vencido em caixa vermelha', async () => {
  await montarKanban(p, BASE);
  const t = await TARJAS(p); certo(t.length === 0, 'tarja no Kanban: ' + t.slice(0, 3).join(' | '));
  const m = await p.evaluate(() => { const cs = [...document.querySelectorAll('.kb-card')].map((k) => { const c = getComputedStyle(k); return { fundo: c.backgroundColor, esq: c.borderLeftWidth, cima: c.borderTopWidth }; });
    return { cs, and: document.querySelector('[data-kb-andamento]').innerText.replace(/\s+/g, ' '), venc: document.querySelectorAll('[data-kb-vencidos]').length, caixa: [...document.querySelectorAll('.kb-card .efl-pilula.cr')].map((x) => getComputedStyle(x).backgroundColor), pontos: document.querySelectorAll('.kb-card .efl-pilula:not(.cr)').length, ini: [...document.querySelectorAll('.kb-resp:not(.sem) i')].map((x) => x.textContent) }; });
  certo(m.cs.length === 6 && new Set(m.cs.map((x) => x.fundo)).size === 6, 'cada cartão devia ter o papel da sua cor: ' + JSON.stringify(m.cs.map((x) => x.fundo)));
  certo(m.cs.every((x) => x.esq === x.cima), 'borda esquerda diferente das outras'); certo(!m.cs.some((x) => x.fundo === 'rgb(255, 255, 255)'), 'cartão branco');
  certo(m.and.includes('6 post-its') && m.and.includes('1 de 6') && m.and.includes('17%'), 'andamento: ' + m.and); certo(m.venc === 1, 'selo de vencidos');
  certo(m.caixa.length === 1 && m.caixa[0] !== 'rgba(0, 0, 0, 0)', 'o vencido devia estar em caixa: ' + m.caixa); certo(m.pontos >= 2, 'prazos com ponto: ' + m.pontos);
  certo(m.ini.includes('AL') && m.ini.includes('BS'), 'iniciais: ' + m.ini);
});
await caso('Kanban novo · ao mover um cartão de coluna, os cartões deslizam até o lugar (250 ms) e o andamento muda', async () => {
  const ctxM = await abrirSemeado(nav, BASE, {}); const q = ctxM.page;
  await montarKanban(q, BASE);
  const de = await q.locator('.kb-col').nth(0).locator('.kb-card').nth(1).boundingBox(), para = await q.locator('.kb-col').nth(2).locator('.kb-lista').boundingBox();
  await q.mouse.move(de.x + 40, de.y + 30); await q.mouse.down(); for (let i = 1; i <= 10; i++) { await q.mouse.move(de.x + 40 + (para.x + 60 - de.x - 40) * i / 10, de.y + 30 + (para.y + 20 - de.y - 30) * i / 10); await espera(20); }
  certo(await q.locator('.kb-vaga').count() === 1, 'sem a vaga do tamanho do cartão'); certo((await q.locator('.kb-vaga').boundingBox()).height >= 40, 'vaga fina demais');
  await q.mouse.up(); await espera(50);
  const an = await q.evaluate(() => [...document.querySelectorAll('.kb-card')].flatMap((k) => k.getAnimations().map((a) => a.id + ':' + Math.round(a.effect.getTiming().duration))));
  certo(an.includes('kb-desliza:250'), 'os cartões não deslizaram: ' + JSON.stringify(an));
  await espera(500); certo((await q.locator('[data-kb-andamento]').innerText()).includes('2 de 6'), 'andamento não mudou');
  certo(ctxM.erros.length === 0, ctxM.erros.join(' | ')); await ctxM.ctx.close();
});
await caso('Páginas que vão chegar · cabeçalho da família (R5), trilha em cima e o plano em linhas, sem caixa de aviso', async () => {
  for (const [r, nome] of [['pastas', 'Pastas'], ['externos', 'Documentos externos']]) {
    await p.goto(BASE + '#/' + r); await espera(400);
    const m = await p.evaluate(() => ({ cab: document.querySelector('.pg-cab').getBoundingClientRect().height, tit: document.querySelector('.pg-tit').textContent, trilha: (document.querySelector('[data-trilha]') || {}).textContent, linhas: document.querySelectorAll('.plano-l').length, cartoes: document.querySelectorAll('.card.plano').length, selo: document.querySelector('.aviso-breve').textContent }));
    certo(m.cab >= 66 && m.tit === nome, JSON.stringify(m)); certo(m.trilha === 'Organizar / ' + nome, 'trilha: ' + m.trilha); certo(m.linhas >= 4 && m.cartoes === 0, JSON.stringify(m)); certo(m.selo.includes('v0.8.0'), m.selo);
  }
});
await caso('Relatório do Excel novo · régua do que veio, situações com ponto, caixa só no que ficou de fora; Explicar: a frase vem antes da conta; balão com as iniciais', async () => {
  await p.goto(BASE + '#/'); await p.click('[data-abrir-excel]'); await p.setInputFiles('[data-excel-arquivo]', AMOSTRA); await p.waitForSelector('[data-excel-abrir]', { timeout: 30000 }); await espera(300);
  const m = await p.evaluate(() => ({ regua: document.querySelectorAll('[data-rel-regua] .rel-regua-b i').length, leg: [...document.querySelectorAll('[data-rel-regua] .efl-pilula')].map((x) => x.textContent), caixas: [...document.querySelectorAll('.rel-caixa')].map((c) => c.className.replace('rel-caixa ', '') + ':' + getComputedStyle(c).borderTopWidth) }));
  certo(m.regua === 2 && m.leg[0] === 'Veio 7' && m.leg[1] === 'Bom saber 2', JSON.stringify(m)); certo(m.caixas.every((c) => c.startsWith('vermelho') || c.endsWith(':0px')), 'caixa onde não devia: ' + m.caixas);
  await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv'); await espera(700);
  const pos = await p.evaluate(() => { const c = document.querySelector('.pl-cv').getBoundingClientRect(); return { x: c.left, y: c.top }; });
  for (let dx = 60; dx < 520; dx += 12) { await p.mouse.move(pos.x + dx, pos.y + 75); await espera(40); if (await p.locator('[data-balao=com]').count()) break; }
  certo(await p.locator('[data-balao=com] .pl-balao-q i').count() === 1, 'balão sem as iniciais'); certo((await TARJAS(p)).length === 0, 'tarja no balão');
  await p.mouse.move(5, 400);
  await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill('E2'); await p.locator('.pl-nome').press('Enter');
  await p.click('.tabs .tab:has-text("Fórmulas")'); await espera(300); await p.locator('[data-cmd="formula.explicar"]').first().click(); await p.waitForSelector('.pl-frase');
  const o = await p.evaluate(() => ({ frase: document.querySelector('.pl-frase').getBoundingClientRect().top, conta: document.querySelector('.pl-linhas').getBoundingClientRect().top, letra: parseFloat(getComputedStyle(document.querySelector('.pl-frase')).fontSize) }));
  certo(o.frase < o.conta && o.letra >= 18, JSON.stringify(o)); certo((await TARJAS(p)).length === 0, 'tarja no Explicar');
  await p.keyboard.press('Escape'); await espera(200);
});
await caso('Sem erro no console no PC', async () => { certo(pc.erros.length === 0, pc.erros.slice(0, 3).join(' | ')); });
await pc.ctx.close();

/* ---------- R10 · banco lento: esqueleto no lugar de "nada ainda" ---------- */
await caso('R10 · enquanto os arquivos não chegam: 6 linhas cinzas e "Carregando…"; depois somem', async () => {
  const a = await abrirSemeado(nav, BASE, {});
  await a.ctx.addInitScript(ATRASAR_BANCO(1500));
  const q = await a.ctx.newPage();
  await q.goto(BASE + '#/planilha'); await q.waitForSelector('[data-esqueleto]', { timeout: 1400 });
  const m = await q.evaluate(() => ({ linhas: document.querySelectorAll('[data-esqueleto] tr').length, cont: document.querySelector('[data-cont]').textContent, vazio: !!document.querySelector('.vazio-lista'), selo: !!document.querySelector('.efl-selo-total'), anim: getComputedStyle(document.querySelector('[data-esqueleto] i')).animationName }));
  certo(m.linhas === 6, 'linhas do esqueleto: ' + m.linhas); certo(m.cont === 'Carregando…', m.cont);
  certo(!m.vazio, 'mostrou "nada ainda" antes de os arquivos chegarem'); certo(!m.selo, 'mostrou total antes de os arquivos chegarem');
  certo(m.anim === 'eflPulsa', 'o esqueleto não pulsa: ' + m.anim);
  await q.waitForSelector('.tb-arq tr.arq', { timeout: 5000 });
  certo(await q.locator('[data-esqueleto]').count() === 0, 'o esqueleto ficou'); certo((await limpo(q.locator('[data-cont]'))).includes('20 planilhas'), await limpo(q.locator('[data-cont]')));
  await a.ctx.close();
});
await caso('R10 · com o banco rápido o esqueleto não pisca', async () => {
  const a = await abrirSemeado(nav, BASE, {});
  await a.page.addInitScript(() => { window.__viuEsqueleto = false; new MutationObserver(() => { if (document.querySelector('[data-esqueleto]')) window.__viuEsqueleto = true; }).observe(document, { childList: true, subtree: true }); });
  await a.page.goto(BASE + '#/planilha'); await a.page.reload(); await a.page.waitForSelector('.tb-arq tr.arq'); await espera(300);
  certo(!(await a.page.evaluate(() => window.__viuEsqueleto)), 'o esqueleto apareceu numa leitura rápida');
  await a.ctx.close();
});

/* ---------- R9 · a gota corre uma vez só até o que ainda não foi visto (com movimento ligado) ---------- */
await caso('R9 · a gota corre ao abrir e, na segunda vez, o histórico já aparece cheio', async () => {
  const g = await abrirSemeado(nav, BASE, {});
  await ENVIO(g.page);
  await g.page.goto(BASE + '#/internos'); await g.page.waitForSelector('[data-detalhes]');
  await g.page.locator('[data-detalhes]').first().click(); await g.page.waitForSelector('[data-gaveta] [data-efl-tl]');
  const cedo = await g.page.locator('[data-gaveta] .efl-tl > li.esp').count();
  await espera(3600);
  const depois = await g.page.locator('[data-gaveta] .efl-tl > li.esp').count();
  const guardado = await g.page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('efl-gota-')).length);
  await g.page.keyboard.press('Escape'); await espera(200);
  await g.page.locator('[data-detalhes]').first().click(); await g.page.waitForSelector('[data-gaveta] [data-efl-tl]');
  const denovo = await g.page.locator('[data-gaveta] .efl-tl > li.esp').count();
  certo(cedo === 2, 'ao abrir, esperava 2 etapas esperando a gota, veio ' + cedo); certo(depois === 0, 'a gota não chegou ao fim: ' + depois);
  certo(guardado >= 1, 'o "até onde viu" não ficou guardado'); certo(denovo === 0, 'a gota correu de novo: ' + denovo);
  certo(g.erros.length === 0, g.erros.slice(0, 3).join(' | '));
  await g.ctx.close();
});

/* ---------- celular, 390 × 844: a página rola normalmente, nada trava ---------- */
const ce = await abrirSemeado(nav, BASE, { w: 390, h: 844, toque: true, muitos: 40, reduzido: true });
await caso('R1 · no celular nada trava: a página rola e não há rolagem de lado', async () => {
  for (const r of LISTAS) {
    await ce.page.goto(BASE + '#/' + r); await ce.page.waitForSelector('.pg-cab'); await espera(250);
    const m = await ce.page.evaluate(() => ({ classe: document.documentElement.classList.contains('efl-tela-parada'), lado: document.documentElement.scrollWidth > innerWidth, pg: (() => { const x = document.querySelector('.pagina'); return x.scrollWidth > x.clientWidth + 1; })() }));
    certo(!m.classe, `#/${r}: travou no celular`); certo(!m.lado && !m.pg, `#/${r}: rolagem de lado`);
  }
  await ce.page.goto(BASE + '#/planilha'); await espera(300);
  certo(await ce.page.evaluate(() => { const x = document.querySelector('.pagina'); return x.scrollHeight > x.clientHeight; }), 'a página não rola no celular');
});
await caso('Celular · botões das listas com 44 px e sem erro no console', async () => {
  for (const r of ['planilha', 'internos', 'lixeira', 'gaveta']) {
    if (r === 'gaveta') { await ce.page.goto(BASE + '#/planilha'); await espera(300); await ce.page.locator('[data-detalhes]').first().click(); await ce.page.waitForSelector('[data-gaveta]'); await espera(300); }
    else { await ce.page.goto(BASE + '#/' + r); await espera(300); }
    const pequenos = await ce.page.evaluate(() => [...document.querySelectorAll('.pagina button, [data-gaveta] button')].filter((b) => b.offsetParent && !b.closest('.cartao-novo')).map((b) => { const q = b.getBoundingClientRect(); return [b.getAttribute('aria-label') || b.textContent.trim().slice(0, 24), Math.round(q.width), Math.round(q.height)]; }).filter((x) => x[2] < 44 || x[1] < 44));
    certo(pequenos.length === 0, `#/${r}: ` + JSON.stringify(pequenos.slice(0, 4)));
  }
  certo(ce.erros.length === 0, ce.erros.slice(0, 3).join(' | '));
});
await ce.ctx.close();
await nav.close();
const falhas = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - falhas.length} de ${resultados.length} conferências passaram.`);
process.exit(falhas.length ? 1 : 0);
