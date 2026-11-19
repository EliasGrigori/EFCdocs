/* Vértice Docs — v0.6.31: ícones no estilo E escolhido pelo Elias em 19/11 (traço fino de 1,3 px, sem fundo, linha de destaque
   na cor da família do botão). Uso: node scripts/testar-icones.mjs <endereço>. */
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

await p.goto(BASE + '#/planilha'); await p.click('[data-novo=planilha]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(300);
const aba = async (n) => { await p.click(`.tabs .tab:has-text("${n}")`); await p.waitForTimeout(150); };
/* traço do ícone e cor da parte de destaque (.t) de um botão da faixa */
const ler = (cmd) => p.locator(`.ribbon [data-cmd="${cmd}"] svg.ic-novo`).first().evaluate((s) => {
  const t = s.querySelector('.t'); const cs = t && getComputedStyle(t);
  return { traco: getComputedStyle(s).strokeWidth, cor: cs && cs.stroke, fundo: cs && cs.fill, tinta: getComputedStyle(s).color };
});
const FAM = { azul: 'rgb(47, 111, 179)', verde: 'rgb(46, 125, 79)', laranja: 'rgb(192, 100, 26)', petroleo: 'rgb(31, 127, 134)', roxo: 'rgb(115, 72, 173)', cinza: 'rgb(74, 101, 120)' };

await caso('todo ícone da faixa tem traço fino de 1,3 px', async () => {
  const tracos = await p.locator('.ribbon svg.ic-novo').evaluateAll((l) => [...new Set(l.map((s) => getComputedStyle(s).strokeWidth))]);
  certo(tracos.length === 1 && tracos[0] === '1.3px', 'traços: ' + tracos.join(', '));
});

await caso('a parte de destaque fica sem fundo e na cor da família (Copiar azul, Formatação condicional roxa)', async () => {
  const c = await ler('editar.copiar');
  certo(c.fundo === 'none' && c.cor === FAM.azul, 'Copiar: ' + JSON.stringify(c));
  const f = await ler('formatar.condicional');
  certo(f.fundo === 'none' && f.cor === FAM.roxo, 'Condicional: ' + JSON.stringify(f));
});

await caso('cada família tem a sua cor: Fórmulas verde, Inserir laranja, Dados azul-petróleo, Exibir cinza-azulado', async () => {
  await aba('Fórmulas'); const s = await ler('formula.nome'); certo(s.cor === FAM.verde, 'Nome: ' + s.cor);
  await aba('Inserir'); const g = await ler('inserir.tabela'); certo(g.cor === FAM.laranja, 'Tabela: ' + g.cor);
  await aba('Dados'); const d = await ler('dados.estatistica'); certo(d.cor === FAM.petroleo, 'Estatística: ' + d.cor);
  await aba('Exibir'); const e = await ler('exibir.zoom'); certo(e.cor === FAM.cinza, 'Zoom: ' + e.cor);
});

await caso('botões de galeria e divididos também pegam a cor (Gráfico de colunas e de pizza em laranja)', async () => {
  await aba('Inserir'); const g = await ler('inserir.grafico|colunas'); certo(g.cor === FAM.laranja, 'Colunas: ' + g.cor);
  const z = await ler('inserir.grafico|pizza'); certo(z.cor === FAM.laranja, 'Pizza: ' + z.cor);
});

await caso('botão com lista e itens da lista aberta também pegam a cor (Classificar e filtrar azul-petróleo)', async () => {
  await aba('Página Inicial');
  const cor = () => p.locator('.ribbon [data-menu-faixa="classificarFiltrar"] svg.ic-novo .t').first().evaluate((t) => getComputedStyle(t).stroke);
  certo(await cor() === FAM.petroleo, 'botão: ' + await cor());
  await p.locator('.ribbon [data-menu-faixa="classificarFiltrar"]').first().click(); await p.waitForTimeout(200);
  const itens = await p.locator('[role=menu] [data-fam=dados] svg.ic-novo .t').evaluateAll((l) => [...new Set(l.map((t) => getComputedStyle(t).stroke))]);
  await p.keyboard.press('Escape');
  certo(itens.length === 1 && itens[0] === FAM.petroleo, 'itens: ' + itens.join(', '));
});

await caso('no botão principal (fundo da cor do tema) o destaque acompanha a letra, para continuar legível', async () => {
  await aba('Página Inicial');
  const prim = await p.locator('.ribbon [data-prim] svg.ic-novo').first().evaluate((s) => { const t = s.querySelector('.t'); return { tinta: getComputedStyle(s).color, cor: t ? getComputedStyle(t).stroke : null }; });
  certo(prim.cor === null || prim.cor === prim.tinta, JSON.stringify(prim));
});

await caso('no tema escuro as cores das famílias ficam mais claras', async () => {
  await p.evaluate(() => { document.body.dataset.theme = 'dark'; }); await p.waitForTimeout(100);
  const c = await ler('editar.copiar');
  certo(c.cor === 'rgb(106, 162, 224)', 'Copiar no escuro: ' + c.cor);
  await p.evaluate(() => { document.body.dataset.theme = 'papel'; });
});

await caso('os outros ícones do app (menu lateral, janelas) também ficam mais finos: 1,5 px', async () => {
  const tracos = await p.locator('svg:not(.ic-novo)[viewBox="0 0 24 24"]').evaluateAll((l) => [...new Set(l.map((s) => s.getAttribute('stroke-width')).filter(Boolean))]);
  certo(tracos.length >= 1 && tracos.every((t) => t === '1.5'), 'traços: ' + tracos.join(', '));
});

await caso('console sem erro', async () => { certo(erros.length === 0, erros.join(' | ').slice(0, 300)); });
console.log(`\nícones: ${ok} ok, ${falhas} falha(s)`);
await nav.close();
process.exit(falhas ? 1 : 0);
