/* Vértice Docs — a faixa nos lugares do Excel, conferida no app de verdade (v0.6.21, R25, parte 1: Página Inicial; parte 2: Inserir e Fórmulas; parte 3: Layout da Página, Dados, Revisão e Exibir).
   Uso: node scripts/testar-faixa.mjs <endereço> */
import { chromium } from 'playwright';
import { abrirSemeado, espera } from './layout/semente.mjs';
const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
let ok = 0, falhas = 0;
const certo = (c, m) => { if (!c) throw new Error(m); };
async function caso(nome, f) { try { await f(); ok++; console.log('  ok   ' + nome); } catch (e) { falhas++; console.log('  FALHA ' + nome + ' — ' + String(e.message || e).slice(0, 300)); } }
const nav = await chromium.launch({ executablePath: CHROME });
const abrir = async (op) => { const a = await abrirSemeado(nav, BASE, op); await a.page.goto(BASE + '#/planilha'); await a.page.locator('.tb-arq tr.arq .abre').first().click(); await a.page.waitForSelector('.pl-cv'); await espera(600); return a; };
const celula = async (p, ref) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await espera(120); };
const caixa = (p, k) => p.locator(`[data-cx=${k}] .rb-cx-v`).innerText();
const topo = (p, sel) => p.locator(sel).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) }; });

const pc = await abrir({ reduzido: true });
const p = pc.page;
await caso('Grupos na ordem do Excel: Área de transferência, Fonte, Alinhamento, Número, Estilos, Células, Edição', async () => {
  const g = await p.evaluate(() => [...document.querySelectorAll('.ribbon > .rb-g')].map((x) => x.getAttribute('aria-label')));
  certo(g.join('|') === 'Área de transferência|Fonte|Alinhamento|Número|Estilos|Células|Edição', g.join('|'));
});
await caso('Em 1280 com o menu aberto cabe tudo: nenhum grupo vai para o "Mais" e o último não passa da tela', async () => {
  const m = await p.evaluate(() => { const r = document.querySelector('.ribbon'), gs = r.querySelectorAll(':scope > .rb-g'); return { mais: !!r.querySelector('.rb-mais'), fim: gs[gs.length - 1].getBoundingClientRect().right, dir: r.getBoundingClientRect().right, rola: r.scrollWidth - r.clientWidth }; });
  certo(!m.mais && m.fim <= m.dir && m.rola <= 0, JSON.stringify(m));
});
await caso('Fonte como no Excel: em cima a letra, o tamanho e A maior/A menor; embaixo N, I, S, bordas, preenchimento e cor', async () => {
  const cima = [await topo(p, '[data-cx=fonte]'), await topo(p, '[data-cx=tamanho]'), await topo(p, '[data-cmd="formatar.aumentarFonte"]'), await topo(p, '[data-cmd="formatar.diminuirFonte"]')];
  const baixo = []; for (const c of ['negrito', 'italico', 'sublinhado', 'bordas', 'preenchimento', 'corFonte']) baixo.push(await topo(p, `.ribbon [data-cmd="formatar.${c}"]`));
  certo(cima.every((c) => Math.abs(c.y - cima[0].y) <= 2) && baixo.every((c) => Math.abs(c.y - baixo[0].y) <= 2) && baixo[0].y > cima[0].y + 20, JSON.stringify({ cima, baixo }));
  certo(cima.every((c, i) => !i || c.x > cima[i - 1].x) && baixo.every((c, i) => !i || c.x > baixo[i - 1].x), 'ordem da esquerda para a direita');
});
await caso('Alinhamento como no Excel: em cima / meio / embaixo na linha de cima; esquerda / centro / direita na de baixo; Quebrar e Mesclar à direita', async () => {
  const a = {}; for (const c of ['cima', 'meio', 'baixo', 'quebrar', 'esquerda', 'centro', 'direita', 'mesclar']) a[c] = await topo(p, `.ribbon [data-cmd="formatar.${c}"]`);
  certo(Math.abs(a.cima.y - a.baixo.y) <= 2 && Math.abs(a.cima.y - a.quebrar.y) <= 2 && Math.abs(a.esquerda.y - a.mesclar.y) <= 2 && a.esquerda.y > a.cima.y + 20, JSON.stringify(a));
  certo(a.cima.x < a.meio.x && a.meio.x < a.baixo.x && a.baixo.x < a.quebrar.x && a.esquerda.x < a.centro.x && a.centro.x < a.direita.x && a.direita.x < a.mesclar.x, JSON.stringify(a));
});
await caso('Número como no Excel: a caixa do formato em cima; moeda, %, milhar e casas embaixo', async () => {
  const cx = await topo(p, '[data-cx=numero]'), moeda = await topo(p, '.ribbon [data-cmd="formatar.moeda"]'), casas = await topo(p, '.ribbon [data-cmd="formatar.menosCasas"]');
  certo(moeda.y > cx.y + 20 && Math.abs(moeda.y - casas.y) <= 2 && moeda.x < casas.x, JSON.stringify({ cx, moeda, casas }));
});
await caso('A caixa da letra mostra a letra da célula; escolher Arial muda só aquela célula e a caixa acompanha a seleção', async () => {
  await celula(p, 'A1'); certo(await caixa(p, 'fonte') === 'Padrão', await caixa(p, 'fonte'));
  await p.click('[data-cx=fonte]'); await p.waitForSelector('.rb-lista');
  certo(await p.locator('.rb-lista [aria-checked=true]').innerText() === 'Padrão', 'marcada');
  await p.click('.rb-lista [data-valor="formatar.fonte|f:Arial"]'); await espera(200);
  certo(await p.locator('.rb-lista:not([data-fz-fant])').count() === 0, 'a lista fecha ao escolher');
  certo(await caixa(p, 'fonte') === 'Arial', await caixa(p, 'fonte'));
  await celula(p, 'B2'); certo(await caixa(p, 'fonte') === 'Padrão', 'B2: ' + await caixa(p, 'fonte'));
  await celula(p, 'A1'); certo(await caixa(p, 'fonte') === 'Arial', 'A1 de volta');
});
await caso('Tamanho: a caixa troca o tamanho; A maior e A menor andam um degrau', async () => {
  await celula(p, 'A1'); certo(await caixa(p, 'tamanho') === '11', await caixa(p, 'tamanho'));
  await p.click('[data-cx=tamanho]'); await p.click('.rb-lista [data-valor="formatar.fonte|t:16"]'); await espera(150); certo(await caixa(p, 'tamanho') === '16', await caixa(p, 'tamanho'));
  await p.click('.ribbon [data-cmd="formatar.aumentarFonte"]'); await espera(150); certo(await caixa(p, 'tamanho') === '18', 'maior: ' + await caixa(p, 'tamanho'));
  await p.click('.ribbon [data-cmd="formatar.diminuirFonte"]'); await p.click('.ribbon [data-cmd="formatar.diminuirFonte"]'); await espera(150); certo(await caixa(p, 'tamanho') === '14', 'menor: ' + await caixa(p, 'tamanho'));
});
await caso('Formato do número: a caixa começa em Geral, troca para Data e acompanha os botões de moeda e de %', async () => {
  await celula(p, 'C3'); certo(await caixa(p, 'numero') === 'Geral', await caixa(p, 'numero'));
  await p.click('[data-cx=numero]'); await p.click('.rb-lista [data-valor="formatar.formatoNumero|data"]'); await espera(150); certo(await caixa(p, 'numero') === 'Data', await caixa(p, 'numero'));
  await p.click('.ribbon [data-cmd="formatar.porcentagem"]'); await espera(150); certo(/Porcentagem/.test(await caixa(p, 'numero')), await caixa(p, 'numero'));
  await p.click('.ribbon [data-cmd="formatar.moeda"]'); await espera(150); certo(/Moeda|Contábil/.test(await caixa(p, 'numero')), await caixa(p, 'numero'));
});
await caso('Alinhar em cima, no meio e embaixo: um de cada vez fica marcado', async () => {
  await celula(p, 'D4');
  const marc = () => p.evaluate(() => ['cima', 'meio', 'baixo'].map((c) => document.querySelector(`.ribbon [data-cmd="formatar.${c}"]`).getAttribute('aria-pressed')).join(','));
  certo(await marc() === 'false,false,true', 'começo: ' + await marc());
  await p.click('.ribbon [data-cmd="formatar.cima"]'); await espera(150); certo(await marc() === 'true,false,false', 'cima: ' + await marc());
  await p.click('.ribbon [data-cmd="formatar.meio"]'); await espera(150); certo(await marc() === 'false,true,false', 'meio: ' + await marc());
  await p.click('.ribbon [data-cmd="formatar.baixo"]'); await espera(150); certo(await marc() === 'false,false,true', 'baixo: ' + await marc());
});
await caso('Desfazer volta uma escolha da caixa de uma vez só (Ctrl+Z)', async () => {
  await celula(p, 'E5'); await p.click('[data-cx=fonte]'); await p.click('.rb-lista [data-valor="formatar.fonte|f:Verdana"]'); await espera(150); certo(await caixa(p, 'fonte') === 'Verdana', 'aplicou');
  await p.locator('.pl-cv').click({ position: { x: 400, y: 300 } }); await celula(p, 'E5'); await p.keyboard.press('Escape'); await p.locator('.pl-grade, .pl-cv').first().focus().catch(() => {});
  await p.keyboard.press('Control+z'); await espera(250); await celula(p, 'E5'); certo(await caixa(p, 'fonte') === 'Padrão', 'depois do Ctrl+Z: ' + await caixa(p, 'fonte'));
});
await caso('Células: Inserir, Excluir e Formatar abrem a lista embaixo do botão; Esc fecha só a lista e o foco volta ao botão', async () => {
  for (const k of ['inserir', 'excluir', 'formatar']) {
    await p.click(`[data-menu-faixa=${k}]`); await p.waitForSelector('.rb-lista:not([data-fz-fant])');
    const m = await p.evaluate((k) => { const b = document.querySelector(`[data-menu-faixa=${k}]`).getBoundingClientRect(), l = document.querySelector('.rb-lista:not([data-fz-fant])').getBoundingClientRect(); return { colado: l.top - b.bottom, dentro: l.right <= innerWidth && l.left >= 0, n: document.querySelectorAll('.rb-lista:not([data-fz-fant]) [role=menuitem]').length }; }, k);
    certo(m.colado >= 0 && m.colado <= 8 && m.dentro && m.n >= 2, k + ' ' + JSON.stringify(m));
    await p.keyboard.press('Escape'); await espera(120);
    certo(await p.locator('.rb-lista:not([data-fz-fant])').count() === 0, k + ': fechou');
    certo(await p.evaluate((k) => document.activeElement === document.querySelector(`[data-menu-faixa=${k}]`), k), k + ': foco no botão');
    certo(await p.locator('.pl-cv').count() === 1, 'a planilha continua aberta');
  }
});
await caso('Lista: as setas do teclado andam pelos itens e clicar fora fecha', async () => {
  await p.click('[data-cx=numero]'); await p.waitForSelector('.rb-lista:not([data-fz-fant])');
  const antes = await p.evaluate(() => document.activeElement.textContent); await p.keyboard.press('ArrowDown'); const depois = await p.evaluate(() => document.activeElement.textContent);
  certo(antes !== depois && await p.evaluate(() => !!document.activeElement.closest('.rb-lista')), antes + ' → ' + depois);
  await p.mouse.click(700, 500); await espera(150); certo(await p.locator('.rb-lista:not([data-fz-fant])').count() === 0, 'fechou ao clicar fora');
});
await caso('Inserir › Inserir linha acima funciona pelo menu; Edição tem AutoSoma, Preencher e Limpar em coluna', async () => {
  await celula(p, 'A2'); await p.keyboard.type('fica'); await p.keyboard.press('Enter'); await celula(p, 'A2');
  await p.click('[data-menu-faixa=inserir]'); await p.click('.rb-lista [data-cmd="planilha.inserirLinha"]'); await espera(250);
  await celula(p, 'A3'); certo((await p.locator('.pl-fx input, .pl-fx textarea, .pl-formula').first().inputValue().catch(() => '')) === 'fica' || (await p.locator('.pl-fx').innerText().catch(() => '')).includes('fica'), 'a linha desceu');
  const e = [await topo(p, '.ribbon [data-cmd="formula.autosoma"]'), await topo(p, '[data-menu-faixa=preencher]'), await topo(p, '[data-menu-faixa=limpar]')];
  certo(e[0].y < e[1].y && e[1].y < e[2].y && Math.abs(e[0].x - e[1].x) <= 2, JSON.stringify(e));
});
await caso('Todo botão da Página Inicial tem 28 px ou mais de altura e nome para leitor de tela', async () => {
  const ruins = await p.evaluate(() => [...document.querySelectorAll('.ribbon > .rb-g button')].filter((b) => { const r = b.getBoundingClientRect(); return r.height < 28 || !((b.getAttribute('aria-label') || b.textContent || '').trim()); }).map((b) => b.dataset.cmd || b.dataset.cx || b.dataset.menuFaixa));
  certo(ruins.length === 0, ruins.join(', '));
});
await caso('Sem erro no console (PC, tema claro)', async () => { certo(pc.erros.length === 0, pc.erros.slice(0, 3).join(' | ')); });
await pc.ctx.close();

const larga = await abrir({ w: 1920, h: 900, reduzido: true });
await caso('Em tela larga (1920) os nomes aparecem: Recortar, Copiar, Pincel, Quebrar texto, Mesclar', async () => {
  const v = await larga.page.evaluate(() => ({ aperto: document.querySelector('.ribbon').dataset.aperto || '', nomes: ['editar.recortar', 'editar.copiar', 'editar.pincel', 'formatar.quebrar', 'formatar.mesclar'].map((c) => { const r = document.querySelector(`.ribbon [data-cmd="${c}"] .rot`); return r && r.getBoundingClientRect().width > 20 ? r.textContent : ''; }) }));
  certo(!v.aperto && v.nomes.join('|') === 'Recortar|Copiar|Pincel|Quebrar texto|Mesclar', JSON.stringify(v));
});
await larga.ctx.close();

const esc = await abrir({ tema: 'escuro', reduzido: true });
await caso('Tema escuro: caixa e lista com o fundo do tema (nada branco)', async () => {
  await esc.page.click('[data-cx=fonte]'); await esc.page.waitForSelector('.rb-lista');
  const c = await esc.page.evaluate(() => [getComputedStyle(document.querySelector('[data-cx=fonte]')).backgroundColor, getComputedStyle(document.querySelector('.rb-lista')).backgroundColor]);
  const claro = (s) => { const m = s.match(/\d+/g).map(Number); return (m[0] + m[1] + m[2]) / 3 > 140; };
  certo(!claro(c[0]) && !claro(c[1]), c.join(' · ')); certo(esc.erros.length === 0, esc.erros.slice(0, 2).join(' | '));
});
await esc.ctx.close();

const viva = await abrir({});
await caso('Fluidez: a lista nasce do botão (250 ms) e fecha encolhendo (150 ms); os itens entram em sequência', async () => {
  const q = viva.page;
  await q.click('[data-cx=numero]'); await q.waitForSelector('.rb-lista');
  const ent = await q.evaluate(() => { const l = document.querySelector('.rb-lista'); const a = l.getAnimations()[0]; return { dur: a ? a.effect.getComputedTiming().duration : 0, origem: getComputedStyle(l).transformOrigin, seq: l.querySelectorAll('.fz-li').length }; });
  certo(ent.dur === 250 && ent.seq >= 3, JSON.stringify(ent));
  await espera(450); await q.keyboard.press('Escape'); await espera(40);
  const sai = await q.evaluate(() => { const l = document.querySelector('.rb-lista[data-fz-fant]'); const a = l && l.getAnimations()[0]; return l ? { dur: a ? a.effect.getComputedTiming().duration : 0 } : null; });
  certo(sai && sai.dur === 150, JSON.stringify(sai));
  await espera(300); certo(await q.locator('.rb-lista').count() === 0, 'some depois de fechar');
});
await viva.ctx.close();

/* ---------- parte 2 (v0.6.21): abas Inserir e Fórmulas nos lugares do Excel; Formatar › altura e largura (D2); nomes do Excel em Estilos (D1) ---------- */
const p2 = await abrir({ reduzido: true });
const q = p2.page;
const limpar = async () => { for (let i = 0; i < 3 && await q.locator('.janela, .rb-lista:not([data-fz-fant])').count(); i++) { await q.keyboard.press('Escape'); await espera(250); } };
const aba = async (nome) => { await limpar(); await q.click(`.tabs .tab:has-text("${nome}")`); await espera(350); };
const grupos = () => q.evaluate(() => [...document.querySelectorAll('.ribbon > .rb-g')].map((x) => x.getAttribute('aria-label')).join('|'));
const cabeTudo = () => q.evaluate(() => { const r = document.querySelector('.ribbon'), gs = r.querySelectorAll(':scope > .rb-g'); return { mais: !!r.querySelector('.rb-mais'), fim: Math.round(gs[gs.length - 1].getBoundingClientRect().right), dir: Math.round(r.getBoundingClientRect().right), rola: r.scrollWidth - r.clientWidth }; });
const listaAberta = '.rb-lista:not([data-fz-fant])';
const editando = () => q.evaluate(() => { const e = document.querySelector('textarea.ef-campo'); return e ? e.value : ''; });
const naBarra = () => q.evaluate(() => [...document.querySelectorAll('.pl-fx [class^="tk-"]')].map((x) => x.textContent).join(''));
for (const [r, v] of [['A1', 'Item'], ['B1', 'Valor'], ['A2', 'a'], ['B2', '10'], ['A3', 'b'], ['B3', '20'], ['A4', 'c'], ['B4', '30']]) { await celula(q, r); await q.keyboard.type(v); await q.keyboard.press('Enter'); }

await caso('Inserir: grupos na ordem do Excel (Tabelas, Ilustrações, Gráficos, Filtros, Links, Comentários, Texto) e, no fim, Do Vértice', async () => {
  await aba('Inserir'); const g = await grupos();
  certo(g === 'Tabelas|Ilustrações|Gráficos|Filtros|Links|Comentários|Texto|Do Vértice', g); /* v0.6.63: Filtros (v0.6.42) depois de Gráficos, como no Excel */
  const ordem = []; for (const c of ['dados.dinamica', 'inserir.tabela', 'inserir.imagem', 'inserir.formas', 'inserir.grafico', 'inserir.segmentacao', 'inserir.link', 'editar.comentar', 'inserir.assinatura', 'inserir.painel']) ordem.push((await topo(q, `.ribbon [data-cmd="${c}"]`)).x);
  certo(ordem.every((x, i) => !i || x > ordem[i - 1]), 'da esquerda para a direita: ' + ordem.join(','));
});
await caso('Inserir e Fórmulas cabem inteiras em 1280 com o menu aberto (nenhum grupo vai para o "Mais")', async () => {
  for (const n of ['Inserir', 'Fórmulas', 'Página Inicial']) { await aba(n); const m = await cabeTudo(); certo(!m.mais && m.fim <= m.dir && m.rola <= 0, n + ' ' + JSON.stringify(m)); }
});
await caso('Gráficos: ao lado do botão Gráfico, oito ícones em duas linhas (colunas, linha, pizza, rosca / barras, área, dispersão, outros)', async () => {
  await aba('Inserir');
  const cima = [], baixo = [];
  for (const t of ['colunas', 'linha', 'pizza', 'rosca']) cima.push(await topo(q, `.ribbon [data-cmd="inserir.grafico|${t}"]`));
  for (const t of ['barras', 'area', 'dispersao']) baixo.push(await topo(q, `.ribbon [data-cmd="inserir.grafico|${t}"]`)); baixo.push(await topo(q, '[data-menu-faixa=outrosGraficos]'));
  certo(cima.every((c) => Math.abs(c.y - cima[0].y) <= 2) && baixo.every((c) => Math.abs(c.y - baixo[0].y) <= 2) && baixo[0].y > cima[0].y + 20, JSON.stringify({ cima, baixo }));
  certo(cima.every((c, i) => Math.abs(c.x - baixo[i].x) <= 2), 'em colunas alinhadas');
  certo((await topo(q, '.ribbon [data-cmd="inserir.grafico"]')).x < cima[0].x, 'o botão grande vem antes');
});
await caso('Gráfico pelo tipo: clicar em Pizza abre "Inserir gráfico" já em Pizza, com os dados ao redor da célula; Inserir põe o gráfico', async () => {
  await celula(q, 'A1'); await aba('Inserir'); await q.click('.ribbon [data-cmd="inserir.grafico|pizza"]'); await q.waitForSelector('.janela.gr-jan');
  const j = await q.evaluate(() => ({ t: document.querySelector('.janela.gr-jan h2, .janela.gr-jan h3, .janela.gr-jan .janela-t').textContent, tipo: [...document.querySelectorAll('.janela.gr-jan .gr-tipo.on')].map((x) => x.dataset.grTipo).join(','), botao: document.querySelector('.janela.gr-jan [data-gr-aplicar]').textContent }));
  certo(/Inserir gráfico/.test(j.t) && j.tipo === 'pizza' && j.botao === 'Inserir' && /A1:B4/.test(j.t), JSON.stringify(j));
  await q.click('.janela.gr-jan [data-gr-aplicar]'); await espera(500);
  certo(await q.locator('.janela.gr-jan').count() === 0 && await q.locator('.pl-objs [data-obj]').count() >= 1, 'gráfico na planilha: ' + await q.locator('.pl-objs [data-obj]').count());
  await q.keyboard.press('Escape'); await q.keyboard.press('Control+z'); await espera(300);
});
await caso('Outros gráficos: a lista traz os tipos que não têm ícone e "Escolher pelos dados…"; Pareto abre a janela em Pareto', async () => {
  await celula(q, 'A1'); await aba('Inserir'); await q.click('[data-menu-faixa=outrosGraficos]'); await q.waitForSelector(listaAberta);
  const it = await q.evaluate((s) => [...document.querySelectorAll(s + ' [role=menuitem]')].map((b) => b.dataset.cmd).join(','), listaAberta);
  certo(it === 'inserir.grafico|combinado,inserir.grafico|pareto,inserir.grafico|controle,inserir.grafico|histograma,inserir.grafico|velocimetro,inserir.grafico', it);
  await q.click(listaAberta + ' [data-cmd="inserir.grafico|pareto"]'); await q.waitForSelector('.janela.gr-jan');
  certo(await q.evaluate(() => [...document.querySelectorAll('.janela.gr-jan .gr-tipo.on')].map((x) => x.dataset.grTipo).join(',')) === 'pareto', 'tipo');
  await q.keyboard.press('Escape'); await espera(300); if (await q.locator('.janela.gr-jan').count()) { await q.keyboard.press('Escape'); await espera(300); }
  certo(await q.locator('.janela.gr-jan').count() === 0, 'a janela fecha com Esc');
});
await caso('Nada se perdeu do Inserir antigo: Nova aba, Inserir linha e Inserir coluna estão em Página Inicial › Células › Inserir; o resto continua na aba', async () => {
  await aba('Inserir');
  const falta = await q.evaluate(() => ['inserir.tabela', 'inserir.status', 'inserir.foto', 'inserir.imagem', 'inserir.formas', 'inserir.grafico', 'inserir.assinatura', 'inserir.link', 'inserir.tirarLink', 'inserir.botao', 'editar.comentar', 'inserir.painel'].filter((c) => !document.querySelector(`.ribbon [data-cmd="${c}"]`)));
  certo(falta.length === 0, 'faltou na aba: ' + falta.join(', '));
  await aba('Página Inicial'); await q.click('[data-menu-faixa=inserir]'); await q.waitForSelector(listaAberta);
  const it = await q.evaluate((s) => [...document.querySelectorAll(s + ' [role=menuitem]')].map((b) => b.dataset.cmd).join(','), listaAberta);
  certo(it === 'planilha.inserirLinha,planilha.inserirColuna,planilha.novaAba', it); await q.keyboard.press('Escape'); await espera(150);
});
await caso('Fórmulas: grupos na ordem do Excel (Biblioteca de funções, Nomes definidos, Auditoria de fórmulas) e, no fim, Do Vértice', async () => {
  await aba('Fórmulas'); const g = await grupos();
  certo(g === 'Biblioteca de funções|Nomes definidos|Auditoria de fórmulas|Do Vértice', g);
  const falta = await q.evaluate(() => ['formula.inserir', 'formula.autosoma', 'formula.nome', 'formula.nomes', 'planilha.cabecalho', 'formula.explicar', 'formula.origem', 'formula.fluxo', 'formula.problemas', 'formula.montar'].filter((c) => !document.querySelector(`.ribbon [data-cmd="${c}"]`)));
  certo(falta.length === 0, 'faltou na aba: ' + falta.join(', '));
});
await caso('Biblioteca de funções: Inserir função grande; AutoSoma, Lógica, Texto / Data e hora, Pesquisa, Matemática / Estatística, Mais funções em três colunas', async () => {
  await aba('Fórmulas');
  const t = {}; for (const k of ['autosoma', 'fnLogica', 'fnTexto', 'fnData', 'fnBusca', 'fnMat', 'fnEst', 'fnMais']) t[k] = await topo(q, `[data-menu-faixa=${k}]`);
  const soma = await topo(q, '.ribbon [data-cmd="formula.autosoma"]'), fx = await topo(q, '.ribbon [data-cmd="formula.inserir"]');
  certo(fx.x < soma.x && fx.h > 50, 'Inserir função é o botão grande da esquerda ' + JSON.stringify(fx));
  certo(Math.abs(soma.y - t.fnData.y) <= 2 && Math.abs(t.fnData.y - t.fnEst.y) <= 2 && Math.abs(t.fnLogica.y - t.fnBusca.y) <= 2 && Math.abs(t.fnBusca.y - t.fnMais.y) <= 2 && Math.abs(t.fnTexto.y - t.fnMat.y) <= 2, 'linhas ' + JSON.stringify(t));
  certo(soma.y < t.fnLogica.y && t.fnLogica.y < t.fnTexto.y && soma.x < t.fnData.x && t.fnData.x < t.fnEst.x, 'ordem ' + JSON.stringify(t));
});
await caso('AutoSoma: o botão soma os números de cima; a seta abre Soma, Média, Contar números, Máximo, Mínimo e Mais funções…', async () => {
  await aba('Fórmulas'); await celula(q, 'B5'); await q.click('.ribbon [data-cmd="formula.autosoma"]'); await espera(250);
  certo(await editando() === '=SOMA(B2:B4)', 'soma: ' + await editando()); await q.keyboard.press('Escape'); await espera(150);
  await celula(q, 'B5'); await q.click('[data-menu-faixa=autosoma]'); await q.waitForSelector(listaAberta);
  const it = await q.evaluate((s) => [...document.querySelectorAll(s + ' [role=menuitem] span')].map((b) => b.textContent).join('|'), listaAberta);
  certo(it === 'Soma|Média|Contar números|Máximo|Mínimo|Mais funções…', it);
  await q.click(listaAberta + ' [data-cmd="formula.autosoma|MÉDIA"]'); await espera(250);
  certo(await editando() === '=MÉDIA(B2:B4)', 'média: ' + await editando());
  await q.keyboard.press('Enter'); await espera(250); await celula(q, 'B5'); certo(await naBarra() === '=MÉDIA(B2:B4)', 'na barra: ' + await naBarra());
  await q.locator('.pl-cv').click({ position: { x: 600, y: 300 } }); await q.keyboard.press('Control+z'); await espera(250); await celula(q, 'B5'); certo(await naBarra() === '', 'Ctrl+Z desfaz em um passo: ' + await naBarra());
});
await caso('Lógica: a lista traz as funções em ordem alfabética; escolher SE começa =SE( na célula; Esc cancela sem mudar a célula', async () => {
  await aba('Fórmulas'); await celula(q, 'D2'); await q.click('[data-menu-faixa=fnLogica]'); await q.waitForSelector(listaAberta);
  const nomes = await q.evaluate((s) => [...document.querySelectorAll(s + ' .rb-lista-it.fn:not(.fim) span')].map((b) => b.textContent), listaAberta);
  certo(nomes.includes('SE') && nomes.includes('SEERRO') && nomes.join() === [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR')).join(), nomes.join(','));
  await q.click(listaAberta + ' [data-cmd="formula.inserir|IF"]'); await espera(250);
  certo(await editando() === '=SE(', await editando()); await q.keyboard.press('Escape'); await espera(150); await celula(q, 'D2'); certo(await naBarra() === '', 'D2 continua vazia');
});
await caso('Matemática tem título em cada parte (Somar e contar, Números); "Procurar nesta lista…" abre Inserir função já na gaveta', async () => {
  await aba('Fórmulas'); await q.click('[data-menu-faixa=fnMat]'); await q.waitForSelector(listaAberta);
  const cab = await q.evaluate((s) => [...document.querySelectorAll(s + ' .rb-lista-cab')].map((b) => b.textContent).join('|'), listaAberta);
  certo(cab === 'Somar e contar|Números', cab);
  const dentro = await q.evaluate((s) => { const l = document.querySelector(s).getBoundingClientRect(); return l.bottom <= innerHeight && l.right <= innerWidth; }, listaAberta); certo(dentro, 'a lista comprida não sai da tela (rola por dentro)');
  await q.click(listaAberta + ' .fim'); await q.waitForSelector('.janela.pl-jfun');
  certo(await q.evaluate(() => [...document.querySelectorAll('.janela.pl-jfun .chipb.on')].map((x) => x.textContent).join()) === 'Somar e contar', 'gaveta marcada');
  await q.keyboard.press('Escape'); await espera(300); certo(await q.locator('.janela.pl-jfun').count() === 0, 'fechou');
});
await caso('Nomes definidos e Auditoria: Gerenciador de nomes grande com Definir nome ao lado; três botões em coluna e Explicar conta grande à direita', async () => {
  await aba('Fórmulas');
  const n = { ger: await topo(q, '.ribbon [data-cmd="formula.nomes"]'), def: await topo(q, '.ribbon [data-cmd="formula.nome"]'), ori: await topo(q, '.ribbon [data-cmd="formula.origem"]'), flu: await topo(q, '.ribbon [data-cmd="formula.fluxo"]'), ver: await topo(q, '.ribbon [data-cmd="formula.problemas"]'), exp: await topo(q, '.ribbon [data-cmd="formula.explicar"]') };
  certo(n.ger.h > 50 && n.ger.x < n.def.x && n.exp.h > 50 && n.ori.x < n.exp.x && Math.abs(n.ori.x - n.flu.x) <= 2 && n.ori.y < n.flu.y && n.flu.y < n.ver.y, JSON.stringify(n));
  const rot = await q.evaluate(() => ['formula.nomes', 'formula.nome', 'formula.problemas'].map((c) => document.querySelector(`.ribbon [data-cmd="${c}"] .rot`).textContent).join('|'));
  certo(rot === 'Gerenciador de nomes|Definir nome|Verificação de erros', rot);
});
await caso('Estilos com os nomes do Excel (D1): Formatação condicional e Formatar como tabela; na aba Inserir o botão continua "Tabela"', async () => {
  await aba('Página Inicial');
  const r = await q.evaluate(() => [...document.querySelectorAll('.ribbon .rb-g[aria-label="Estilos"] .rbb .rot')].map((x) => x.textContent).join('|')); certo(r === 'Formatação condicional|Formatar como tabela', r);
  await aba('Inserir'); certo(await q.locator('.ribbon [data-cmd="inserir.tabela"] .rot').innerText() === 'Tabela', 'Inserir › Tabela');
});
await caso('Formatar (D2): a lista segue o Excel (altura, ajustar altura, largura, ajustar largura, depois ocultar e reexibir)', async () => {
  await aba('Página Inicial'); await celula(q, 'B2'); await q.click('[data-menu-faixa=formatar]'); await q.waitForSelector(listaAberta);
  const it = await q.evaluate((s) => [...document.querySelectorAll(s + ' [role=menuitem]')].map((b) => b.dataset.cmd.replace('planilha.', '')).join(','), listaAberta);
  certo(it === 'alturaLinha,ajustarLinha,larguraColuna,ajustarColuna,ocultarLinha,ocultarColuna,reexibir,reexibirColuna', it); await q.keyboard.press('Escape'); await espera(150);
});
const formatar = async (cmd) => { await aba('Página Inicial'); await q.click('[data-menu-faixa=formatar]'); await q.waitForSelector(listaAberta); await q.click(`${listaAberta} [data-cmd="planilha.${cmd}"]`); await espera(350); };
const pergunta = () => q.evaluate(() => { const j = document.querySelector('.janela'); return j ? { t: j.textContent, v: (j.querySelector('input') || {}).value } : null; });
const larguraB = () => q.evaluate(() => { const cv = document.querySelector('.pl-cv'); return cv ? cv.width : 0; });
await caso('Largura da coluna: pergunta com o valor de hoje (80), recusa número fora de 4 a 600, aplica 150 e a pergunta seguinte já mostra 150; Ctrl+Z volta', async () => {
  await celula(q, 'B2'); await formatar('larguraColuna'); let j = await pergunta();
  certo(j && /Largura da coluna B/.test(j.t) && j.v === '80', JSON.stringify(j));
  await q.fill('.janela input', '900'); await q.click('.janela .btn.primary'); await espera(200); certo(/4 a 600/.test((await pergunta()).t), 'recusa 900');
  await q.fill('.janela input', '150'); await q.click('.janela .btn.primary'); await espera(300); certo(await pergunta() === null, 'fechou');
  await celula(q, 'B2'); await formatar('larguraColuna'); j = await pergunta(); certo(j.v === '150', 'depois: ' + j.v); await q.keyboard.press('Escape'); await espera(200);
  await q.locator('.pl-cv').click({ position: { x: 700, y: 300 } }); await q.keyboard.press('Control+z'); await espera(300);
  await celula(q, 'B2'); await formatar('larguraColuna'); j = await pergunta(); certo(j.v === '80', 'Ctrl+Z: ' + j.v); await q.keyboard.press('Escape'); await espera(200);
});
await caso('Ajustar a largura: a coluna fica do tamanho do maior texto (um texto comprido alarga; a pergunta mostra o número novo)', async () => {
  await celula(q, 'F1'); await q.keyboard.type('Um título bem comprido para a coluna caber sozinha'); await q.keyboard.press('Enter');
  await celula(q, 'F1'); await formatar('ajustarColuna');
  await celula(q, 'F1'); await formatar('larguraColuna'); const j = await pergunta(); certo(+j.v > 200 && +j.v <= 600, 'largura: ' + j.v); await q.keyboard.press('Escape'); await espera(200);
});
await caso('Altura da linha: aplica 40 em três linhas escolhidas de uma vez; Ajustar a altura volta para 22', async () => {
  await celula(q, 'A2'); await q.keyboard.down('Shift'); await q.keyboard.press('ArrowDown'); await q.keyboard.press('ArrowDown'); await q.keyboard.up('Shift');
  await formatar('alturaLinha'); let j = await pergunta(); certo(/Altura da 3 linhas/.test(j.t) && j.v === '22', JSON.stringify(j));
  await q.fill('.janela input', '40'); await q.click('.janela .btn.primary'); await espera(300);
  await celula(q, 'A4'); await formatar('alturaLinha'); j = await pergunta(); certo(/Altura da linha 4/.test(j.t) && j.v === '40', 'linha 4: ' + JSON.stringify(j)); await q.keyboard.press('Escape'); await espera(200);
  await celula(q, 'A4'); await formatar('ajustarLinha'); await celula(q, 'A4'); await formatar('alturaLinha'); j = await pergunta(); certo(j.v === '22', 'ajustada: ' + j.v); await q.keyboard.press('Escape'); await espera(200);
});
await caso('Todo botão das abas Inserir e Fórmulas tem 28 px ou mais de altura e nome para leitor de tela; ícones de gráfico com 28 px de largura', async () => {
  for (const n of ['Inserir', 'Fórmulas']) {
    await aba(n);
    const ruins = await q.evaluate(() => [...document.querySelectorAll('.ribbon > .rb-g button')].filter((b) => { const r = b.getBoundingClientRect(); return r.height < 28 || !((b.getAttribute('aria-label') || b.textContent || '').trim()); }).map((b) => b.dataset.cmd || b.dataset.menuFaixa));
    certo(ruins.length === 0, n + ': ' + ruins.join(', '));
  }
  await aba('Inserir'); certo((await topo(q, '.ribbon [data-cmd="inserir.grafico|colunas"]')).w >= 28, 'largura do ícone');
});
await caso('A dica de um item de lista aparece ao lado da lista (não cobre os itens de baixo)', async () => {
  await aba('Fórmulas'); await q.click('[data-menu-faixa=fnLogica]'); await q.waitForSelector(listaAberta);
  await q.hover(listaAberta + ' [data-cmd="formula.inserir|IF"]'); await q.waitForSelector('.dica-cmd', { timeout: 3000 });
  const m = await q.evaluate((s) => { const d = document.querySelector('.dica-cmd').getBoundingClientRect(), l = document.querySelector(s).getBoundingClientRect(); return { dica: Math.round(d.left), lista: Math.round(l.right), texto: document.querySelector('.dica-cmd').textContent }; }, listaAberta);
  certo(m.dica >= m.lista && /^SE/.test(m.texto), JSON.stringify(m)); await q.keyboard.press('Escape'); await espera(150);
});
await caso('Sem erro no console nas abas Inserir e Fórmulas (PC, tema claro)', async () => { certo(p2.erros.length === 0, p2.erros.slice(0, 3).join(' | ')); });
await p2.ctx.close();

const larga2 = await abrir({ w: 1920, h: 900, reduzido: true });
await caso('Tela larga (1920): sem aperto; os nomes das gavetas e a seta aparecem', async () => {
  await larga2.page.click('.tabs .tab:has-text("Fórmulas")'); await espera(350);
  const v = await larga2.page.evaluate(() => ({ aperto: document.querySelector('.ribbon').dataset.aperto || '', nomes: [...document.querySelectorAll('.ribbon [data-menu-faixa] .rot')].map((r) => (r.getBoundingClientRect().width > 20 ? r.textContent : '')).join('|') }));
  certo(!v.aperto && v.nomes === 'Lógica|Texto|Data e hora|Pesquisa|Matemática|Estatística|Mais funções', JSON.stringify(v));
});
await larga2.ctx.close();

const estreita = await abrir({ w: 1024, h: 768, reduzido: true });
await caso('Tela estreita (1024): antes do "Mais" os botões de coluna ficam só com o ícone, e continuam com nome para leitor de tela', async () => {
  const e = estreita.page;
  /* v0.6.22 (D3): em tela média o menu se esconde sozinho com a planilha aberta; para ver o aperto, mostra o menu pela alça */
  certo(await e.locator('nav.rail').count() === 0, 'o menu se escondeu sozinho'); await e.click('[data-menu-alca]'); await espera(400);
  await e.click('.tabs .tab:has-text("Fórmulas")'); await espera(450);
  const v = await e.evaluate(() => { const r = document.querySelector('.ribbon'); return { aperto: r.dataset.aperto || '', mais: !!r.querySelector('.rb-mais'), rola: r.scrollWidth - r.clientWidth, semNome: [...r.querySelectorAll(':scope > .rb-g button')].filter((b) => !((b.getAttribute('aria-label') || b.textContent || '').trim())).length }; });
  certo(v.aperto && v.rola <= 0 && v.semNome === 0, JSON.stringify(v));
});
await estreita.ctx.close();

const esc2 = await abrir({ tema: 'escuro', reduzido: true });
await caso('Tema escuro: lista das funções e botões das abas novas com o fundo do tema (nada branco)', async () => {
  const e = esc2.page; await e.click('.tabs .tab:has-text("Fórmulas")'); await espera(350); await e.click('[data-menu-faixa=fnTexto]'); await e.waitForSelector('.rb-lista');
  const c = await e.evaluate(() => [getComputedStyle(document.querySelector('.rb-lista')).backgroundColor, getComputedStyle(document.querySelector('.ribbon')).backgroundColor]);
  const claro = (s) => { const f = /color\(srgb/.test(s) ? 255 : 1; const m = s.replace(/^[^(]*\(\s*(srgb\s*)?/, '').match(/[\d.]+/g).map(Number); return (m[0] + m[1] + m[2]) * f / 3 > 140; };
  certo(!claro(c[0]) && !claro(c[1]), c.join(' · ')); certo(esc2.erros.length === 0, esc2.erros.slice(0, 2).join(' | '));
});
await esc2.ctx.close();

/* ---------- parte 3 (v0.6.21): Layout da Página, Dados, Revisão e Exibir nos lugares do Excel ---------- */
const p3 = await abrir({ reduzido: true });
const r3 = p3.page;
const LST = '.rb-lista:not([data-fz-fant])';
const limpa3 = async () => { for (let i = 0; i < 3 && await r3.locator('.janela, ' + LST).count(); i++) { await r3.keyboard.press('Escape'); await espera(250); } };
const aba3 = async (nome) => { await limpa3(); await r3.click(`.tabs .tab:has-text("${nome}")`); await espera(350); };
const grupos3 = () => r3.evaluate(() => [...document.querySelectorAll('.ribbon > .rb-g')].map((x) => x.getAttribute('aria-label')).join('|'));
const abreLista = async (k) => { await r3.click(`[data-menu-faixa=${k}]`); await r3.waitForSelector(LST); await espera(120); };
const marcado = () => r3.evaluate((s) => [...document.querySelectorAll(s + ' [aria-checked=true]')].map((b) => b.dataset.cmd).join(','), LST);
const escolhe = async (k, cmd) => { await abreLista(k); await r3.click(`${LST} [data-cmd="${cmd}"]`); await espera(300); };
const fx3 = () => r3.locator('.pl-fx-campo').innerText();
const desfaz = async () => { await r3.locator('.pl-cv').click({ position: { x: 700, y: 320 } }); await r3.keyboard.press('Control+z'); await espera(300); };
for (const [ref, v] of [['A1', 'Fruta'], ['B1', 'Caixas'], ['A2', 'Mamão'], ['B2', '30'], ['A3', 'Acerola'], ['B3', '12'], ['A4', 'Banana'], ['B4', '45']]) { await celula(r3, ref); await r3.keyboard.type(v); await r3.keyboard.press('Enter'); }

await caso('Layout da Página: grupos na ordem do Excel (Configurar página, Dimensionar para ajustar, Opções de planilha) e, no fim, Do Vértice', async () => {
  await aba3('Layout da Página'); const g = await grupos3();
  certo(g === 'Configurar página|Dimensionar para ajustar|Opções de planilha|Do Vértice', g);
  const x = []; for (const k of ['margens', 'orientacao', 'papel', 'areaImp', 'quebras']) x.push((await topo(r3, `[data-menu-faixa=${k}]`)).x);
  x.push((await topo(r3, '.ribbon [data-cmd="impressao.titulos"]')).x);
  certo(x.every((v, i) => !i || v > x[i - 1]), 'Margens, Orientação, Tamanho, Área de impressão, Quebras, Imprimir títulos: ' + x.join(','));
  certo((await topo(r3, '[data-menu-faixa=margens]')).h > 50, 'botões grandes');
});
await caso('Margens: a lista marca a de hoje (Normal); escolher Estreita marca Estreita; Ctrl+Z volta para Normal', async () => {
  await aba3('Layout da Página'); await abreLista('margens');
  const it = await r3.evaluate((s) => [...document.querySelectorAll(s + ' [role^=menuitem] span')].map((b) => b.textContent).join('|'), LST);
  certo(it === 'Normal|Estreita|Larga|Margens personalizadas…', it); certo(await marcado() === 'impressao.margens|normal', 'marcada: ' + await marcado());
  await r3.click(`${LST} [data-cmd="impressao.margens|estreita"]`); await espera(300);
  await abreLista('margens'); certo(await marcado() === 'impressao.margens|estreita', 'depois: ' + await marcado()); await r3.keyboard.press('Escape'); await espera(200);
  await desfaz(); await aba3('Layout da Página'); await abreLista('margens'); certo(await marcado() === 'impressao.margens|normal', 'Ctrl+Z: ' + await marcado()); await r3.keyboard.press('Escape');
});
await caso('Orientação, Tamanho e Ajustar à página: cada lista marca a escolha e a janela Configurar página mostra a mesma coisa', async () => {
  await aba3('Layout da Página');
  await escolhe('orientacao', 'impressao.orientacao|paisagem'); await escolhe('papel', 'impressao.papel|carta'); await escolhe('ajustarPag', 'impressao.ajustar|colunas');
  await abreLista('orientacao'); const o = await marcado(); await r3.keyboard.press('Escape'); await espera(150);
  await abreLista('papel'); const pa = await marcado(); await r3.keyboard.press('Escape'); await espera(150);
  await abreLista('ajustarPag'); const aj = await marcado(); await r3.keyboard.press('Escape'); await espera(150);
  certo(o === 'impressao.orientacao|paisagem' && pa === 'impressao.papel|carta' && aj === 'impressao.ajustar|colunas', [o, pa, aj].join(' · '));
  await r3.click('.ribbon [data-cmd="impressao.configurar"]'); await r3.waitForSelector('.janela'); await espera(400);
  const j = await r3.evaluate(() => document.querySelector('.janela').textContent);
  certo(/Carta/.test(j) && /[Pp]aisagem/.test(j), 'a janela mostra Carta e paisagem');
  await limpa3();
});
await caso('Opções de planilha: Imprimir a grade e Imprimir A B C e 1 2 3 ligam e desligam, e a janela de impressão marca as mesmas caixas', async () => {
  await aba3('Layout da Página');
  const pres = (c) => r3.locator(`.ribbon [data-cmd="${c}"]`).getAttribute('aria-pressed');
  certo(await pres('impressao.grade') === 'false' && await pres('impressao.titulosLC') === 'false', 'começam desligados');
  await r3.click('.ribbon [data-cmd="impressao.grade"]'); await espera(250); await r3.click('.ribbon [data-cmd="impressao.titulosLC"]'); await espera(250);
  certo(await pres('impressao.grade') === 'true' && await pres('impressao.titulosLC') === 'true', 'ligaram');
  await r3.click('.ribbon [data-cmd="impressao.configurar"]'); await r3.waitForSelector('[data-imp-grade]'); await espera(300);
  certo(await r3.locator('[data-imp-grade]').isChecked(), 'a caixa "Linhas de grade" da janela ficou marcada'); await limpa3();
  certo(await pres('exibir.grade') === 'true', 'Exibir a grade continua ligada (é outra coisa)');
});
await caso('Área de impressão e Quebras: listas com Definir/Limpar e Inserir/Remover; quebra na A1 avisa e não muda nada', async () => {
  await aba3('Layout da Página'); await abreLista('areaImp');
  const a = await r3.evaluate((s) => [...document.querySelectorAll(s + ' [role=menuitem]')].map((b) => b.dataset.cmd).join(','), LST);
  certo(a === 'impressao.area,impressao.limparArea', a); await r3.keyboard.press('Escape'); await espera(150);
  await abreLista('quebras'); const q = await r3.evaluate((s) => [...document.querySelectorAll(s + ' [role=menuitem]')].map((b) => b.dataset.cmd).join(','), LST);
  certo(q === 'impressao.quebra,impressao.semQuebras', q); await r3.keyboard.press('Escape'); await espera(150);
  await celula(r3, 'A1'); await escolhe('quebras', 'impressao.quebra');
  certo(/não pode ser a A1/.test(await r3.locator('body').innerText()), 'avisa');
});
await caso('Dados: grupos na ordem do Excel (Classificar e filtrar, Ferramentas de dados, Estrutura de tópicos, Análise); A a Z e Z a A em coluna à esquerda de Classificar', async () => {
  await aba3('Dados'); const g = await grupos3(); certo(g === 'Classificar e filtrar|Ferramentas de dados|Estrutura de tópicos|Análise', g); /* v0.6.25: Análise depois de Ferramentas de dados, como no Excel; v0.6.37: Estrutura de tópicos entre os dois, como no Excel */
  const az = await topo(r3, '.ribbon [data-cmd="dados.az"]'), za = await topo(r3, '.ribbon [data-cmd="dados.za"]'), cl = await topo(r3, '.ribbon [data-cmd="dados.classificar"]'), fi = await topo(r3, '.ribbon [data-cmd="dados.filtrar"]'), li = await topo(r3, '.ribbon [data-cmd="dados.limparFiltro"]');
  certo(Math.abs(az.x - za.x) <= 2 && az.y < za.y && az.x < cl.x && cl.x < fi.x && fi.x < li.x, JSON.stringify({ az, za, cl, fi, li }));
  const rot = await r3.evaluate(() => ['dados.filtrar', 'dados.duplicados', 'dados.validacao', 'dados.limparFiltro'].map((c) => document.querySelector(`.ribbon [data-cmd="${c}"] .rot`).textContent).join('|'));
  certo(rot === 'Filtro|Remover duplicatas|Validação de dados|Limpar', rot);
});
await caso('Classificar de A a Z pela coluna da célula: Acerola, Banana, Mamão (o cabeçalho fica); Z a A inverte; Ctrl+Z desfaz', async () => {
  await celula(r3, 'A2'); await aba3('Dados'); await r3.click('.ribbon [data-cmd="dados.az"]'); await espera(400);
  const col = async () => { const v = []; for (const r of ['A1', 'A2', 'A3', 'A4']) { await celula(r3, r); v.push(await fx3()); } return v.join(','); };
  certo(await col() === 'Fruta,Acerola,Banana,Mamão', 'A a Z: ' + await col());
  await celula(r3, 'B3'); await r3.click('.ribbon [data-cmd="dados.za"]'); await espera(400);
  const b = []; for (const r of ['B2', 'B3', 'B4']) { await celula(r3, r); b.push(await fx3()); }
  certo(b.join(',') === '45,30,12', 'Z a A pela coluna B: ' + b.join(','));
  await desfaz(); await celula(r3, 'A2'); certo(await fx3() === 'Acerola', 'Ctrl+Z volta um passo: ' + await fx3());
});
await caso('Limpar sem filtro com critério avisa e não muda nada', async () => {
  await aba3('Dados'); await r3.click('.ribbon [data-cmd="dados.limparFiltro"]'); await espera(300);
  certo(/não tem critério/.test(await r3.locator('body').innerText()), 'avisa'); /* o texto do aviso mudou ("Este filtro não tem critério."); o que vale é avisar */
});
await caso('Revisão: grupos do Excel (Revisão de texto, Comentários, Proteger, Alterações) com os nomes do Excel', async () => {
  await aba3('Revisão'); const g = await grupos3(); certo(g === 'Revisão de texto|Comentários|Proteger|Alterações', g);
  const rot = await r3.evaluate(() => ['revisao.ortografia', 'editar.comentar', 'revisao.comentarios', 'revisao.travar', 'arquivo.versoes'].map((c) => document.querySelector(`.ribbon [data-cmd="${c}"] .rot`).textContent).join('|'));
  certo(rot === 'Ortografia|Novo comentário|Mostrar comentários|Proteger planilha|Versões e revisões', rot);
});
await caso('Exibir: Mostrar, Zoom e Janela na ordem do Excel; o que é só do Vértice depois', async () => {
  await aba3('Exibir'); const g = await grupos3();
  certo(g === 'Mostrar|Zoom|Janela|Do Vértice', g); /* v0.6.30 (D7): os quatro grupos do Vértice viraram um só */
});
await caso('D7: Exibir › Do Vértice com quatro listas (barra de cima, menu lateral, layout, aparência) e Tela cheia; a lista marca o que está ligado', async () => {
  await aba3('Exibir');
  for (const k of ['vtBarra', 'vtMenu', 'vtLayout', 'vtAparencia']) certo(await r3.locator(`[data-menu-faixa=${k}]`).count() === 1, 'falta a lista ' + k);
  certo(await r3.locator('.ribbon [data-cmd="exibir.telaCheia"]').count() === 1, 'falta Tela cheia');
  await abreLista('vtMenu');
  const m = await marcado();
  certo(/exibir\.menu(Completo|Icones|Oculto)/.test(m) && m.split(',').length === 1, 'a lista do menu lateral marca um só: ' + m);
  await r3.keyboard.press('Escape'); await espera(150);
  await abreLista('vtBarra');
  const it = await r3.evaluate((s) => [...document.querySelectorAll(s + ' .rb-lista-cab')].map((b) => b.textContent).join('|'), LST);
  certo(it === 'Barra de cima|Faixa', 'seções da lista: ' + it);
  await r3.keyboard.press('Escape'); await espera(150);
});
await caso('D4: Página Inicial › Edição › Classificar e filtrar abre a lista do Excel; com o filtro ligado, Filtro fica marcado', async () => {
  await aba3('Página Inicial');
  certo(await r3.locator('.ribbon [data-menu-faixa=classificarFiltrar]').count() === 1, 'sem Classificar e filtrar');
  certo(await r3.locator('.ribbon > .rb-g[aria-label="Edição"] [data-cmd="dados.filtrar"]').count() === 0, 'o botão Filtrar solto continua');
  await abreLista('classificarFiltrar');
  const ids = await r3.evaluate((s) => [...document.querySelectorAll(s + ' [data-cmd]')].map((b) => b.dataset.cmd).join(','), LST);
  certo(ids === 'dados.az,dados.za,dados.classificar,dados.filtrar,dados.limparFiltro,dados.reaplicar', ids);
  await r3.click(`${LST} [data-cmd="dados.filtrar"]`); await espera(300);
  await abreLista('classificarFiltrar');
  certo((await marcado()).includes('dados.filtrar'), 'Filtro não ficou marcado: ' + await marcado());
  await r3.click(`${LST} [data-cmd="dados.filtrar"]`); await espera(300);
});
await caso('D8: Revisão › Proteger planilha (antes Travar modelo): botão, janela e avisos com o nome do Excel', async () => {
  await aba3('Revisão');
  certo((await r3.locator('.ribbon [data-cmd="revisao.travar"]').innerText()).includes('Proteger planilha'), 'nome do botão');
  await r3.click('.ribbon [data-cmd="revisao.travar"]'); await r3.waitForSelector('.pl-jdados');
  const t = await r3.locator('.pl-jdados').innerText();
  certo(/Proteger planilha/.test(t) && /Proteger a aba/.test(t) && !/Travar/.test(t), 'janela: ' + t.slice(0, 160));
  await r3.keyboard.press('Escape'); await espera(150);
});
await caso('Congelar painéis: a lista do Excel; Congelar linha superior fica marcada; Descongelar tira a marca; Ctrl+Z volta', async () => {
  await aba3('Exibir'); await abreLista('congelar');
  const it = await r3.evaluate((s) => [...document.querySelectorAll(s + ' [role^=menuitem] span')].map((b) => b.textContent).join('|'), LST);
  certo(it === 'Congelar painéis|Congelar linha superior|Congelar primeira coluna|Descongelar painéis', it); certo(await marcado() === '', 'nada marcado: ' + await marcado());
  await r3.click(`${LST} [data-cmd="exibir.congelar|linha"]`); await espera(300);
  await abreLista('congelar'); certo(await marcado() === 'exibir.congelar|linha', 'marcada: ' + await marcado());
  await r3.click(`${LST} [data-cmd="exibir.congelar|nada"]`); await espera(300);
  await abreLista('congelar'); certo(await marcado() === '', 'descongelou: ' + await marcado()); await r3.keyboard.press('Escape'); await espera(150);
  await desfaz(); await aba3('Exibir'); await abreLista('congelar'); certo(await marcado() === 'exibir.congelar|linha', 'Ctrl+Z: ' + await marcado()); await r3.keyboard.press('Escape');
  await celula(r3, 'A1'); await escolhe('congelar', 'exibir.congelar|ativa'); certo(/não pode ser a A1/.test(await r3.locator('body').innerText()), 'na A1 avisa');
});
await caso('Zoom 100%: depois de aproximar, o botão volta a planilha para 100%', async () => {
  await aba3('Exibir'); await r3.click('[aria-label="Aumentar o zoom"]').catch(() => {}); await r3.click('[aria-label="Aumentar o zoom"]').catch(() => {}); await espera(200);
  const antes = await r3.locator('.pl-zpct').innerText();
  await r3.click('.ribbon [data-cmd="exibir.zoom100"]'); await espera(250);
  certo(antes !== '100%' && await r3.locator('.pl-zpct').innerText() === '100%', antes + ' → ' + await r3.locator('.pl-zpct').innerText());
});
await caso('Em 1280 com o menu aberto, Layout da Página, Dados e Revisão cabem inteiras (sem "Mais"); Exibir não vai para o "Mais"', async () => {
  for (const n of ['Layout da Página', 'Dados', 'Revisão', 'Exibir']) {
    await aba3(n); const m = await r3.evaluate(() => { const r = document.querySelector('.ribbon'); return { mais: !!r.querySelector('.rb-mais'), rola: r.scrollWidth - r.clientWidth }; });
    certo(!m.mais && m.rola <= 0, n + ' ' + JSON.stringify(m));
  }
});
await caso('Nada se perdeu: tudo que estava nas quatro abas continua na faixa (ocultar/reexibir em Formatar; Tabela dinâmica em Inserir)', async () => {
  const achou = new Set();
  for (const n of ['Página Inicial', 'Inserir', 'Layout da Página', 'Fórmulas', 'Dados', 'Revisão', 'Exibir']) {
    await aba3(n);
    (await r3.evaluate(() => [...document.querySelectorAll('.ribbon [data-cmd]')].map((b) => b.dataset.cmd.split('|')[0]))).forEach((c) => achou.add(c));
    for (const k of await r3.evaluate(() => [...document.querySelectorAll('.ribbon [data-menu-faixa]')].map((b) => b.dataset.menuFaixa))) {
      await r3.click(`[data-menu-faixa=${k}]`); await espera(200);
      (await r3.evaluate((s) => [...document.querySelectorAll(s + ' [data-cmd]')].map((b) => b.dataset.cmd.split('|')[0]), LST)).forEach((c) => achou.add(c));
      await r3.keyboard.press('Escape'); await espera(120);
    }
  }
  const antes = ['impressao.margens', 'impressao.orientacao', 'impressao.area', 'impressao.quebra', 'impressao.titulos', 'impressao.limparArea', 'impressao.semQuebras', 'impressao.cabecalho', 'impressao.ajustar', 'impressao.configurar', 'arquivo.exportarPDF',
    'dados.classificar', 'dados.filtrar', 'dados.reaplicar', 'dados.validacao', 'dados.duplicados', 'dados.dinamica', 'revisao.ortografia', 'editar.comentar', 'revisao.comentarios', 'arquivo.versoes', 'revisao.travar',
    'exibir.congelar', 'exibir.grade', 'exibir.folhaClara', 'exibir.barraFormula', 'exibir.abaGrafico', 'exibir.zoom', 'planilha.ocultarLinha', 'planilha.reexibir', 'planilha.ocultarColuna', 'planilha.reexibirColuna'];
  const falta = antes.filter((c) => !achou.has(c)); certo(falta.length === 0, 'faltou: ' + falta.join(', '));
});
await caso('Todo botão das quatro abas tem 28 px ou mais e nome para leitor de tela; sem erro no console', async () => {
  for (const n of ['Layout da Página', 'Dados', 'Revisão', 'Exibir']) {
    await aba3(n);
    const ruins = await r3.evaluate(() => [...document.querySelectorAll('.ribbon > .rb-g button')].filter((b) => { const r = b.getBoundingClientRect(); return r.height < 28 || !((b.getAttribute('aria-label') || b.textContent || '').trim()); }).map((b) => b.dataset.cmd || b.dataset.menuFaixa));
    certo(ruins.length === 0, n + ': ' + ruins.join(', '));
  }
  certo(p3.erros.length === 0, p3.erros.slice(0, 3).join(' | '));
});
await p3.ctx.close();
const esc3 = await abrir({ tema: 'escuro', reduzido: true });
await caso('Tema escuro: a lista das Margens com o fundo do tema e a marca da escolhida', async () => {
  const e = esc3.page; await e.click('.tabs .tab:has-text("Layout da Página")'); await espera(350); await e.click('[data-menu-faixa=margens]'); await e.waitForSelector('.rb-lista');
  const c = await e.evaluate(() => getComputedStyle(document.querySelector('.rb-lista')).backgroundColor);
  const claro = (s) => { const f = /color\(srgb/.test(s) ? 255 : 1; const m = s.replace(/^[^(]*\(\s*(srgb\s*)?/, '').match(/[\d.]+/g).map(Number); return (m[0] + m[1] + m[2]) * f / 3 > 140; };
  certo(!claro(c) && await e.locator('.rb-lista .rb-lista-it.on').count() === 1, c); certo(esc3.erros.length === 0, esc3.erros.slice(0, 2).join(' | '));
});
await esc3.ctx.close();

const ce = await abrir({ w: 390, h: 844, toque: true, reduzido: true });
await caso('Celular: a planilha abre sem erro e sem rolagem de lado na página', async () => {
  const r = await ce.page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  certo(r <= 0 && ce.erros.length === 0, r + ' ' + ce.erros.slice(0, 2).join(' | '));
});
await caso('Celular: abas Inserir, Fórmulas, Layout da Página, Dados, Revisão e Exibir com botões de 44 px ou mais, sem rolagem de lado na página e sem erro', async () => {
  const c = ce.page;
  if (!(await c.locator('.tabs .tab:has-text("Inserir")').isVisible().catch(() => false))) await c.click('.abas-cel');
  for (const n of ['Inserir', 'Fórmulas', 'Layout da Página', 'Dados', 'Revisão', 'Exibir']) {
    await c.click(`.tabs .tab:has-text("${n}")`); await espera(400);
    const m = await c.evaluate(() => ({ rola: document.documentElement.scrollWidth - innerWidth, baixos: [...document.querySelectorAll('.ribbon .rb-g button')].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height < 44; }).map((b) => (b.dataset.cmd || b.dataset.menuFaixa) + ':' + Math.round(b.getBoundingClientRect().height)) }));
    certo(m.rola <= 0 && m.baixos.length === 0, n + ' ' + JSON.stringify(m));
  }
  certo(ce.erros.length === 0, ce.erros.slice(0, 2).join(' | '));
});
await ce.ctx.close();
await nav.close();
console.log(`\n${ok} de ${ok + falhas} conferências da faixa passaram.`);
process.exit(falhas ? 1 : 0);
