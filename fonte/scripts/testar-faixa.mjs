/* Vértice Docs — a faixa nos lugares do Excel, conferida no app de verdade (v0.6.21, R25, parte 1: Página Inicial).
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

const ce = await abrir({ w: 390, h: 844, toque: true, reduzido: true });
await caso('Celular: a planilha abre sem erro e sem rolagem de lado na página', async () => {
  const r = await ce.page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  certo(r <= 0 && ce.erros.length === 0, r + ' ' + ce.erros.slice(0, 2).join(' | '));
});
await ce.ctx.close();
await nav.close();
console.log(`\n${ok} de ${ok + falhas} conferências da faixa passaram.`);
process.exit(falhas ? 1 : 0);
