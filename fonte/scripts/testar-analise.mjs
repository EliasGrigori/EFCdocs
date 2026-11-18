/* Vértice Docs — v0.6.25: ideias do Grok aprovadas em 18/11 (I02 circular dados inválidos, I01 estatística descritiva, I04 amostragem).
   Uso: node scripts/testar-analise.mjs <endereço>. Dados inventados. */
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
const cel = async (r) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(r); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(80); };
const dig = async (r, l) => { await cel(r); for (const t of l) { await p.keyboard.type(t); await p.keyboard.press('Enter'); } await p.waitForTimeout(60); };
const dados = async () => { await p.click('.tabs .tab:has-text("Dados")'); await p.waitForTimeout(100); };
const botao = (id) => p.locator(`[data-cmd="${id}"]`).first();
const fx = async () => (await p.locator('.pl-fx-campo').innerText()).trim();
const status = async () => p.locator('.foot').innerText();
const aviso = async () => ((await p.locator('.toast').allInnerTexts()).pop() || '');
/* pixels vermelhos dos círculos no canvas da grade */
const vermelhos = () => p.evaluate(() => {
  const cv = document.querySelector('.pl-cv'); const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i] > 190 && d[i + 1] < 80 && d[i + 2] < 80) n++;
  return n;
});
const abaAtiva = async () => (await p.locator('.pl-aba.on, .pl-aba[aria-selected=true]').first().innerText()).trim();

await p.goto(BASE + '#/planilha'); await p.waitForSelector('[data-novo=planilha]'); await p.click('[data-novo=planilha]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(300);
await dig('A1', ['Ponto', 'Rede 1', 'Rede 2', 'Poço', 'Caixa', 'Bebedouro', 'Torneira']);
await dig('B1', ['Cloro', '0,4', '1,2', '0,8', '2,5', '3', '0,8']);
await dig('C1', ['pH', '7,1', '7,4', '6,9', '7', '7,2', '7,3']);

await caso('aba Dados: Circular inválidos e Limpar círculos em Ferramentas de dados; grupo Análise com Estatística descritiva e Amostragem', async () => {
  await dados();
  for (const id of ['dados.circular', 'dados.limparCirculos', 'dados.estatistica', 'dados.amostra']) certo(await p.locator(`[data-cmd="${id}"]`).first().isVisible(), 'falta ' + id);
  certo(await p.getByText('Análise', { exact: true }).first().isVisible(), 'sem o grupo Análise');
});

await caso('I02: sem validação na aba, Circular avisa e não desenha nada', async () => {
  await cel('B2'); await dados(); await botao('dados.circular').click(); await p.waitForTimeout(200);
  certo(/não tem validação/.test(await aviso()), 'aviso: ' + await aviso());
  certo(await vermelhos() === 0, 'desenhou círculo');
});

await caso('I02: com a regra "decimal de 0 a 2" em B2:B7, circula as 2 células acima de 2 e avisa a contagem', async () => {
  await cel('B2:B7'); await dados(); await botao('dados.validacao').click(); await p.waitForSelector('[data-validacao]');
  await p.selectOption('[data-val-tipo]', 'decimal'); await p.fill('[data-val-f1]', '0'); await p.fill('[data-val-f2]', '2'); await p.click('[data-val-aplicar]'); await p.waitForTimeout(200);
  await cel('E12'); const antes = await vermelhos();
  await dados(); await botao('dados.circular').click(); await p.waitForTimeout(250);
  certo(/2 células fora da validação/.test(await aviso()), 'aviso: ' + await aviso());
  const depois = await vermelhos();
  certo(antes === 0 && depois > 200, `vermelhos antes ${antes}, depois ${depois}`);
});

await caso('I02: corrigir uma célula tira só o círculo dela; Limpar círculos tira o resto', async () => {
  const dois = await vermelhos();
  await cel('B5'); await p.keyboard.type('1,5'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  await cel('E12'); const um = await vermelhos();
  certo(um > 100 && um < dois * 0.75, `dois ${dois}, um ${um}`);
  await dados(); await botao('dados.limparCirculos').click(); await p.waitForTimeout(200);
  certo(await vermelhos() === 0, 'ficou círculo');
});

await caso('I01: janela marca só as colunas com números, mostra a prévia e cria a aba "Estatística" com fórmulas', async () => {
  await cel('A1:C7'); await dados(); await botao('dados.estatistica').click(); await p.waitForSelector('[data-estat-janela]');
  certo(!(await p.locator('[data-estat-col="0"]').isChecked()) && await p.locator('[data-estat-col="1"]').isChecked() && await p.locator('[data-estat-col="2"]').isChecked(), 'colunas marcadas');
  const pv = await p.locator('[data-estat-previa]').innerText();
  certo(/Média\s+1,283\s+7,150/.test(pv), 'prévia: ' + pv.slice(0, 120));
  await p.click('[data-estat-ok]'); await p.waitForTimeout(400);
  certo(/Estatística/.test(await abaAtiva()), 'aba ativa: ' + await abaAtiva());
  await cel('B2'); certo(/^=MÉDIA\(Planilha1!\$B\$2:\$B\$7\)$/.test(await fx()), 'fórmula: ' + await fx());
  await cel('B10:B11'); await p.waitForTimeout(100);
  const st = await status(); certo(st.includes('Soma: 5,6'), 'máximo + amplitude: ' + st);
});

await caso('I01: o resumo acompanha o dado (pH de 7,1 para 10 muda máximo e amplitude) e o Ctrl+Z volta', async () => {
  const pH = async () => { await p.locator('.pl-aba:has-text("Estatística")').click(); await p.waitForTimeout(200); await cel('C10:C11'); await p.waitForTimeout(80); return status(); };
  certo((await pH()).includes('Soma: 7,9'), 'antes (7,4 + 0,5): ' + await status());
  await p.locator('.pl-aba:has-text("Planilha1")').click(); await p.waitForTimeout(200);
  await cel('C2'); await p.keyboard.type('10'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  certo((await pH()).includes('Soma: 13,1'), 'depois (10 + 3,1): ' + await status());
  await p.locator('.pl-aba:has-text("Planilha1")').click(); await p.waitForTimeout(200);
  await p.keyboard.press('Control+z'); await p.waitForTimeout(200);
  certo((await pH()).includes('Soma: 7,9'), 'depois do Ctrl+Z: ' + await status());
});

await caso('I04: Amostragem aleatória de 3 linhas: aba "Amostra" com "Linha", cabeçalho, 3 linhas e a nota do sorteio', async () => {
  await p.locator('.pl-aba:has-text("Planilha1")').click(); await p.waitForTimeout(200);
  await cel('A1:C7'); await dados(); await botao('dados.amostra').click(); await p.waitForSelector('[data-amostra-janela]');
  await p.fill('[data-amostra-n]', '3'); await p.waitForTimeout(80);
  certo(/Vai sortear 3 de 6 linhas, sem repetir/.test(await p.locator('[data-amostra-previa]').innerText()), 'prévia: ' + await p.locator('[data-amostra-previa]').innerText());
  await p.click('[data-amostra-ok]'); await p.waitForTimeout(400);
  certo(/Amostra/.test(await abaAtiva()), 'aba ativa: ' + await abaAtiva());
  await cel('A1'); certo(await fx() === 'Linha', 'A1: ' + await fx());
  await cel('B1'); certo(await fx() === 'Ponto', 'B1: ' + await fx());
  await cel('A2:A4'); certo((await status()).includes('Contagem: 3'), 'linhas: ' + await status());
  await cel('A5'); certo(await fx() === '', 'A5 deveria estar vazia: ' + await fx());
  await cel('A6'); certo(/^Sorteio de \d\d\/\d\d\/\d{4} \d\d:\d\d: 3 de 6 linhas de Planilha1, A2:C7/.test(await fx()), 'nota: ' + await fx());
});

await caso('I04: "Uma a cada 2" sorteia cerca de 3 de 6, sem a coluna Linha quando desmarcada', async () => {
  await p.locator('.pl-aba:has-text("Planilha1")').click(); await p.waitForTimeout(200);
  await cel('A1:C7'); await dados(); await botao('dados.amostra').click(); await p.waitForSelector('[data-amostra-janela]');
  await p.click('[data-amostra-modo="periodico"]'); await p.fill('[data-amostra-n]', '2'); await p.uncheck('[data-amostra-origem]'); await p.waitForTimeout(80);
  certo(/cerca de 3 de 6/.test(await p.locator('[data-amostra-previa]').innerText()), 'prévia: ' + await p.locator('[data-amostra-previa]').innerText());
  await p.click('[data-amostra-ok]'); await p.waitForTimeout(400);
  certo(/Amostra 2/.test(await abaAtiva()), 'aba ativa: ' + await abaAtiva());
  await cel('A1'); certo(await fx() === 'Ponto', 'sem a coluna Linha: ' + await fx());
});

await caso('celular (390 px): as janelas cabem na tela, sem rolagem para o lado', async () => {
  await p.locator('.pl-aba:has-text("Planilha1")').click(); await p.waitForTimeout(200);
  for (const [id, sel] of [['dados.estatistica', '[data-estat-janela]'], ['dados.amostra', '[data-amostra-janela]']]) {
    await p.setViewportSize({ width: 1366, height: 800 }); await p.waitForTimeout(200);
    await cel('A1:C7'); await dados(); await botao(id).click(); await p.waitForSelector(sel);
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
    const r = await p.locator('.janela').first().evaluate((j) => { const b = j.getBoundingClientRect(); return { esq: b.left, dir: b.right, larg: document.documentElement.scrollWidth }; });
    certo(r.esq >= 0 && r.dir <= 390 && r.larg <= 390, id + ': ' + JSON.stringify(r));
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  }
  await p.setViewportSize({ width: 1366, height: 800 });
});

console.log(erros.length ? 'Console com erro: ' + erros.slice(0, 3).join(' | ') : 'Console sem erros.');
console.log(`${ok} de ${ok + falhas} conferências da análise passaram.`);
await nav.close();
process.exit(falhas || erros.length ? 1 : 0);
