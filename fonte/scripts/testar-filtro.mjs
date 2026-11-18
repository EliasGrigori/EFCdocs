/* Vértice Docs — v0.6.24 parte 2: filtro da coluna da planilha no padrão do EFCwork, com os filtros do Excel.
   Uso: node scripts/testar-filtro.mjs <endereço>. Dados inventados. */
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
const cel = async (r) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(r); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(60); };
const dig = async (r, l) => { await cel(r); for (const t of l) { await p.keyboard.type(t); await p.keyboard.press('Enter'); } await p.waitForTimeout(60); };
const visiveis = () => p.evaluate(() => document.querySelector('.pl-cap') && true).then(async () => {
  const n = []; for (const r of ['A2', 'A3', 'A4', 'A5', 'A6']) n.push(r); return n;
});
const abreMenu = async (col) => { await p.locator(`[data-seta-filtro="${col}"]`).dispatchEvent('pointerdown'); await p.waitForSelector('[data-filtro-menu]'); await p.waitForTimeout(80); };
const condicoes = async () => { if ((await p.locator('[data-filtro-condicoes]').getAttribute('aria-expanded')) !== 'true') await p.click('[data-filtro-condicoes]'); await p.waitForTimeout(80); };
/* linhas escondidas, lidas do contador do aviso "N de M linhas aparecem" */
const aparecem = async () => { const t = (await p.locator('.toast').allInnerTexts()).reverse().find((x) => /linhas aparecem/.test(x)) || ''; const m = /(\d+) de (\d+)/.exec(t); return m ? +m[1] : -1; };
const limpar = async (col) => { await abreMenu(col); await p.click('[data-filtro-limpar]'); await p.waitForTimeout(200); };

const hoje = new Date(), dia = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
const antigo = new Date(hoje.getFullYear() - 1, 0, 15);
await p.goto(BASE + '#/planilha'); await p.waitForSelector('[data-novo=planilha]'); await p.click('[data-novo=planilha]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(300);
await dig('A1', ['Ponto de coleta da rede de água', 'Rede 1', 'Rede 2', 'Poço', 'Caixa', 'Bebedouro']);
await dig('B1', ['Cloro (mg/L)', '0,4', '1,2', '0,8', '2,5', '3']);
await dig('C1', ['Data da coleta', dia(hoje), dia(ontem), dia(antigo), dia(hoje), dia(antigo)]);
await cel('A1'); await p.click('.tabs .tab:has-text("Dados")'); await p.locator('[data-cmd="dados.filtrar"]').first().click(); await p.waitForTimeout(300);

/* alfa do fundo: rgba(r, g, b, a) ou color(srgb r g b / a); sem alfa = 1 */
const alfa = (c) => { const m = /\/\s*([\d.]+)\)/.exec(c) || /rgba\([^)]*,\s*([\d.]+)\)/.exec(c); return m ? parseFloat(m[1]) : (/transparent/.test(c) ? 0 : 1); };
const visual = () => p.locator('[data-seta-filtro="0"]').evaluate((b) => { const c = getComputedStyle(b); return { fundo: c.backgroundColor, borda: c.borderTopWidth, raio: parseFloat(c.borderTopLeftRadius), w: b.getBoundingClientRect().width, svg: b.querySelector('svg').innerHTML }; });
let alfaParado = 0, largParada = 0;
await caso('no título: a seta de sempre num quadrado pequeno e bem transparente, sem contorno e de canto quase reto', async () => {
  const r = await visual(); alfaParado = alfa(r.fundo); largParada = r.w;
  certo(r.svg.includes('M6 9l6 6 6-6'), 'não é a seta de sempre: ' + r.svg);
  certo(alfaParado > 0.05 && alfaParado <= 0.3, 'fundo não é bem transparente: ' + JSON.stringify(r));
  certo(r.borda === '0px' && r.raio <= 3 && r.w <= 15, 'contorno, canto ou tamanho: ' + JSON.stringify(r));
});

await caso('com o mouse em cima o quadrado cresce e fica mais opaco (sem contorno)', async () => {
  await p.locator('[data-seta-filtro="0"]').hover(); await p.waitForTimeout(300);
  const r = await visual();
  certo(alfa(r.fundo) > alfaParado + 0.3 && r.borda === '0px', 'opacidade: ' + JSON.stringify(r) + ' parado ' + alfaParado);
  certo(r.w > largParada + 2, 'não cresceu: ' + r.w + ' parado ' + largParada);
  await p.mouse.move(900, 600); await p.waitForTimeout(300);
});

await caso('menu no padrão do EFCwork: nome do título, linhas e valores, ordem e "Filtros de número" na coluna de número', async () => {
  await abreMenu(1);
  certo((await p.locator('[data-filtro-menu] .col-t b').innerText()) === 'Cloro (mg/L)', 'título');
  certo(/5 linhas · 5 valores/.test(await p.locator('[data-filtro-menu] .col-t small').innerText()), 'contagem: ' + await p.locator('[data-filtro-menu] .col-t small').innerText());
  certo((await p.locator('[data-filtro-condicoes]').innerText()).includes('Filtros de número'), 'tipo da coluna');
  certo(await p.locator('[data-filtro-az], [data-filtro-za]').count() === 0, 'ainda tem dois botões de ordem');
  certo((await p.locator('[data-filtro-ordem]').innerText()).includes('Ordem padrão'), 'botão único: ' + await p.locator('[data-filtro-ordem]').innerText());
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
});

await caso('ordem num botão só, igual ao EFCwork: menor para o maior, maior para o menor e volta à ordem padrão', async () => {
  const coluna = async () => { const v = []; for (let l = 2; l <= 6; l++) { await cel('B' + l); v.push((await p.locator('.pl-fx-campo').innerText()).trim()); } return v.join('|'); };
  const original = await coluna();
  await abreMenu(1); await p.click('[data-filtro-ordem]'); await p.waitForTimeout(250);
  const asc = await coluna(); certo(asc === '0,4|0,8|1,2|2,5|3', 'crescente: ' + asc);
  await abreMenu(1); certo((await p.locator('[data-filtro-ordem]').getAttribute('data-filtro-ordem')) === 'asc' && (await p.locator('[data-filtro-ordem]').innerText()).includes('Menor para o maior'), 'estado crescente');
  await p.click('[data-filtro-ordem]'); await p.waitForTimeout(250);
  const desc = await coluna(); certo(desc === '3|2,5|1,2|0,8|0,4', 'decrescente: ' + desc);
  await abreMenu(1); await p.click('[data-filtro-ordem]'); await p.waitForTimeout(250);
  const volta = await coluna(); certo(volta === original, 'não voltou: ' + volta + ' / ' + original);
  await abreMenu(1); certo((await p.locator('[data-filtro-ordem]').getAttribute('data-filtro-ordem')) === 'padrao', 'estado padrão');
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
});

await caso('número: "É maior que 1" deixa 3 de 5 linhas; o botão fica dourado e o menu mostra o critério', async () => {
  await abreMenu(1); await condicoes();
  await p.selectOption('[data-filtro-op]', '>'); await p.fill('[data-filtro-cond="a"]', '1'); await p.click('[data-filtro-cond-ok]'); await p.waitForTimeout(250);
  certo(await aparecem() === 3, 'aparecem ' + await aparecem());
  certo(await p.locator('[data-seta-filtro="1"].on').count() === 1, 'botão sem marca');
  const f = await p.locator('[data-seta-filtro="1"]').evaluate((b) => ({ fundo: getComputedStyle(b).backgroundColor, w: b.getBoundingClientRect().width, svg: b.querySelector('svg').innerHTML }));
  certo(alfa(f.fundo) === 0 && f.w <= 15 && f.svg.includes('M3 5h18'), 'filtrada: funil pequeno sem quadrado: ' + JSON.stringify(f));
  await abreMenu(1); certo((await p.locator('[data-filtro-atual]').innerText()).includes('É maior que 1'), 'sem o critério no menu');
  await p.keyboard.press('Escape'); await limpar(1);
});

await caso('número: "Está entre 0,5 e 2" e "Acima da média"', async () => {
  await abreMenu(1); await condicoes();
  await p.selectOption('[data-filtro-op]', 'entre'); await p.fill('[data-filtro-cond="a"]', '0,5'); await p.fill('[data-filtro-cond="b"]', '2'); await p.click('[data-filtro-cond-ok]'); await p.waitForTimeout(250);
  certo(await aparecem() === 2, 'entre: ' + await aparecem());
  await abreMenu(1); await condicoes(); await p.selectOption('[data-filtro-op]', 'acima'); await p.click('[data-filtro-cond-ok]'); await p.waitForTimeout(250);
  certo(await aparecem() === 2, 'acima da média (1,58): ' + await aparecem());
  await limpar(1);
});

await caso('10 maiores, 10 menores e média ficam na lista de Filtros de número, sem botões à parte (com menos de 10 linhas, ficam todas)', async () => {
  await abreMenu(1); await condicoes();
  certo(await p.locator('.pl-frapido, [data-filtro-top], [data-filtro-acima]').count() === 0, 'ainda tem os botões à parte');
  const ops = await p.locator('[data-filtro-op] option').allInnerTexts();
  certo(['10 maiores', '10 menores', 'Acima da média', 'Abaixo da média'].every((t) => ops.includes(t)), 'opções: ' + ops.join(', '));
  await p.selectOption('[data-filtro-op]', 'top10'); await p.waitForTimeout(80);
  certo(await p.locator('[data-filtro-cond]').count() === 0, '10 maiores não pede valor');
  await p.click('[data-filtro-cond-ok]'); await p.waitForTimeout(250);
  certo(await aparecem() === 5, '10 maiores: ' + await aparecem());
  await abreMenu(1); certo((await p.locator('[data-filtro-op]').inputValue()) === 'top10', 'menu reabre com 10 maiores escolhido'); await p.keyboard.press('Escape');
  await limpar(1);
});

await caso('texto: "Contém rede" deixa as 2 redes', async () => {
  await abreMenu(0); certo((await p.locator('[data-filtro-condicoes]').innerText()).includes('Filtros de texto'), 'tipo texto'); await condicoes();
  await p.selectOption('[data-filtro-op]', 'contem'); await p.fill('[data-filtro-cond="a"]', 'rede'); await p.click('[data-filtro-cond-ok]'); await p.waitForTimeout(250);
  certo(await aparecem() === 2, 'contém: ' + await aparecem());
  await limpar(0);
});

await caso('data: a coluna é reconhecida; "Hoje" deixa 2 e "Ano passado" deixa 2', async () => {
  await abreMenu(2); certo((await p.locator('[data-filtro-condicoes]').innerText()).includes('Filtros de data'), 'tipo data'); await condicoes();
  await p.selectOption('[data-filtro-op]', 'hoje'); await p.click('[data-filtro-cond-ok]'); await p.waitForTimeout(250);
  certo(await aparecem() === 2, 'hoje: ' + await aparecem());
  await abreMenu(2); await condicoes(); await p.selectOption('[data-filtro-op]', 'anoPassado'); await p.click('[data-filtro-cond-ok]'); await p.waitForTimeout(250);
  certo(await aparecem() === 2, 'ano passado: ' + await aparecem());
  await limpar(2);
});

await caso('lista de valores continua: marcar só "Poço" e OK', async () => {
  await abreMenu(0); await p.locator('[data-filtro-tudo]').uncheck(); await p.locator('[data-filtro-v="Poço"]').check(); await p.click('[data-filtro-ok]'); await p.waitForTimeout(250);
  certo(await aparecem() === 1, 'lista: ' + await aparecem());
  await limpar(0);
});

await caso('Ctrl+Z desfaz o filtro de condição', async () => {
  await abreMenu(1); await condicoes(); await p.selectOption('[data-filtro-op]', '<'); await p.fill('[data-filtro-cond="a"]', '1'); await p.click('[data-filtro-cond-ok]'); await p.waitForTimeout(250);
  certo(await p.locator('[data-seta-filtro="1"].on').count() === 1, 'não filtrou');
  await p.keyboard.press('Control+z'); await p.waitForTimeout(250);
  certo(await p.locator('[data-seta-filtro="1"].on').count() === 0, 'Ctrl+Z não desfez');
});

await caso('tabela (Inserir › Tabela) com título escuro: a setinha fica clara', async () => {
  await cel('E1'); await dig('E1', ['SAVIO', '3', '1']); await dig('F1', ['EVERTON', '2', '5']);
  await cel('E1:F3'); await p.click('.tabs .tab:has-text("Inserir")'); await p.locator('[data-cmd="inserir.tabela"]').first().click(); await p.waitForTimeout(400);
  const okb = p.locator('.janela .btn.primary'); if (await okb.count()) { await okb.first().click(); await p.waitForTimeout(400); }
  await cel('H9'); await p.waitForTimeout(200);
  const n = await p.locator('[data-seta-filtro].em-escuro').count();
  certo(n >= 2, 'setas claras no título escuro: ' + n);
});

console.log(erros.length ? 'Console com erro: ' + erros.slice(0, 3).join(' | ') : 'Console sem erros.');
console.log(`${ok} de ${ok + falhas} conferências do filtro passaram.`);
await nav.close();
process.exit(falhas || erros.length ? 1 : 0);
