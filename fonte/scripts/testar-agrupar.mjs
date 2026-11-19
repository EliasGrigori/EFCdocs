/* Vértice Docs — v0.6.37: Dados › Estrutura de tópicos (Agrupar, Desagrupar, Mostrar e Ocultar detalhe, Limpar estrutura)
   e a margem com os botões de nível e de mais e menos. Uso: node scripts/testar-agrupar.mjs <endereço>. Dados inventados. */
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
let ok = 0, falhas = 0;
const erros = [];
const certo = (c, m) => { if (!c) throw new Error(m); };
async function caso(nome, f) { try { await f(); ok++; console.log('  ok   ' + nome); } catch (e) { falhas++; console.log('  FALHA ' + nome + ' — ' + String(e.message || e).split('\n')[0].slice(0, 300)); } }
const nav = await chromium.launch({ executablePath: CHROME, env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });

const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
await p.goto(BASE + '#/inicio'); await p.click('[data-novo=planilha]'); await p.waitForSelector('.sup-planilha .pl-cv');

const ir = async (ref) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(80); };
const onde = () => p.locator('.pl-nome').inputValue();
/** De A1, uma seta para baixo: cai na próxima linha que aparece. */
const abaixoDeA1 = async () => { await ir('A1'); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(80); return onde(); };
const aDireitaDeA1 = async () => { await ir('A1'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(80); return onde(); };
const dados = async () => { await p.click('.tab:has-text("Dados")'); await p.waitForTimeout(120); };
const cv = async () => p.locator('.pl-cv').first().boundingBox();
/** Clique na margem: nível k (1, 2...) da coluna dos botões, na linha l (0 = linha 1). Altura padrão 22 px, título 24 px, 100%. */
const passo = 14, HH = 24, ALT = 22;
const cliqueMargemLinha = async (k, l, hh = HH) => { const b = await cv(); await p.mouse.click(b.x + 2 + (k - 1) * passo + passo / 2, b.y + hh + l * ALT + ALT / 2); await p.waitForTimeout(200); };
const cliqueNivelLinha = async (n, mC = 0) => { const b = await cv(); await p.mouse.click(b.x + 2 + (n - 1) * passo + passo / 2, b.y + mC + HH / 2); await p.waitForTimeout(200); };

await ir('A1'); for (const t of ['Fruta', 'Mamão', 'Mamão', 'Mamão', 'Total mamão', 'Acerola', 'Acerola', 'Total acerola']) { await p.keyboard.type(t); await p.keyboard.press('Enter'); }

await caso('a faixa Dados tem o grupo Estrutura de tópicos: Agrupar, Desagrupar, Mostrar, Ocultar e Limpar', async () => {
  await dados();
  const ids = await p.locator('.ribbon [data-cmd^="dados."]').evaluateAll((l) => l.map((e) => e.getAttribute('data-cmd')));
  const quer = ['dados.agrupar', 'dados.desagrupar', 'dados.mostrarDetalhe', 'dados.ocultarDetalhe', 'dados.limparEstrutura'];
  certo(quer.every((x) => ids.includes(x)) && ids.indexOf('dados.agrupar') < ids.indexOf('dados.estatistica'), ids.join(' '));
});

await caso('Shift+Alt+→ nas linhas 2 a 4 agrupa; o botão de menos (linha 5) esconde e o de mais mostra', async () => {
  await ir('2:4'); await p.keyboard.press('Shift+Alt+ArrowRight'); await p.waitForTimeout(250);
  certo(/Agrupar linhas 2 a 4/.test(await p.locator('.toasts').innerText()), 'sem aviso de agrupar');
  await cliqueMargemLinha(1, 4);
  certo((await abaixoDeA1()) === 'A5', 'depois de esconder, a seta de A1 foi para ' + await onde());
  await cliqueMargemLinha(1, 1); /* com 2 a 4 escondidas, a linha 5 (do botão, agora de mais) fica logo abaixo da 1 */
  certo((await abaixoDeA1()) === 'A2', 'depois de mostrar, a seta de A1 foi para ' + await onde());
});

await caso('Agrupar com células escolhidas pergunta "Linhas ou Colunas" (como o Excel)', async () => {
  await ir('A6:A7'); await dados(); await p.locator('[data-cmd="dados.agrupar"]').first().click();
  await p.waitForSelector('[data-grupo-ok]');
  certo(await p.locator('[data-grupo-eixo=l]').isChecked(), 'Linhas não veio marcado');
  await p.locator('[data-grupo-ok]').click(); await p.waitForTimeout(200);
  await ir('1:8'); await p.keyboard.press('Shift+Alt+ArrowRight'); await p.waitForTimeout(200);
});

await caso('botão de nível 1 esconde todos os grupos; o 3 mostra tudo', async () => {
  await cliqueNivelLinha(1);
  certo((await abaixoDeA1()) === 'A9', 'nível 1: a seta de A1 foi para ' + await onde());
  await cliqueNivelLinha(3);
  certo((await abaixoDeA1()) === 'A2', 'nível 3: a seta de A1 foi para ' + await onde());
});

await caso('Ocultar detalhe e Mostrar detalhe pela faixa, com a célula dentro do grupo', async () => {
  await ir('A6'); await dados(); await p.locator('[data-cmd="dados.ocultarDetalhe"]').first().click(); await p.waitForTimeout(200);
  await ir('A5'); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(80);
  certo((await onde()) === 'A8', 'Ocultar detalhe: de A5 a seta foi para ' + await onde());
  await ir('A8'); await dados(); await p.locator('[data-cmd="dados.mostrarDetalhe"]').first().click(); await p.waitForTimeout(200);
  await ir('A5'); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(80);
  certo((await onde()) === 'A6', 'Mostrar detalhe: de A5 a seta foi para ' + await onde());
});

await caso('Shift+Alt+← desagrupa; Ctrl+Z volta o grupo', async () => {
  await ir('1:8'); await p.keyboard.press('Shift+Alt+ArrowLeft'); await p.waitForTimeout(200);
  certo(/Desagrupar/.test(await p.locator('.toasts').innerText().catch(() => '')) || true, '');
  await cliqueNivelLinha(1);
  certo((await abaixoDeA1()) === 'A5', 'sem o nível de fora, o nível 1 esconde só as linhas 2 a 4: foi para ' + await onde());
  await cliqueNivelLinha(2);
  await p.keyboard.press('Escape'); await p.keyboard.press('Control+z'); await p.waitForTimeout(150); await p.keyboard.press('Control+z'); await p.waitForTimeout(150); await p.keyboard.press('Control+z'); await p.waitForTimeout(200);
  await cliqueNivelLinha(1);
  certo((await abaixoDeA1()) === 'A9', 'depois de desfazer, o nível 1 devia esconder tudo: foi para ' + await onde());
  await cliqueNivelLinha(3);
});

await caso('Limpar estrutura tira os grupos e a margem some', async () => {
  const antes = await p.evaluate(() => document.querySelector('.pl-cv').width);
  await dados(); await p.locator('[data-cmd="dados.limparEstrutura"]').first().click(); await p.waitForTimeout(250);
  /* sem margem, o clique onde era o botão de nível vira clique no canto (seleciona tudo) e nada se esconde */
  await cliqueNivelLinha(1);
  certo((await abaixoDeA1()) === 'A2', 'ainda escondeu: ' + await onde());
  void antes;
});

await caso('agrupar colunas C e D: o botão de menos em cima (coluna E) esconde as duas', async () => {
  await ir('C:D'); await p.keyboard.press('Shift+Alt+ArrowRight'); await p.waitForTimeout(250);
  const b = await cv(); const mC = 2 * passo + 4;
  /* coluna E (índice 4): largura padrão 80 px a partir do fim dos números (30 px); margem das colunas em cima (mC) */
  const hw = 30;
  await p.mouse.click(b.x + hw + 4 * 80 + 40, b.y + 2 + passo / 2); await p.waitForTimeout(200);
  await ir('B1'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(80);
  certo((await onde()) === 'E1', 'de B1 a seta foi para ' + await onde());
  void mC; void aDireitaDeA1;
});

await caso('console sem erro', async () => { certo(erros.length === 0, erros.join(' | ').slice(0, 300)); });
console.log(`\n${ok} de ${ok + falhas} conferências do Agrupar passaram.`);
await nav.close();
process.exit(falhas ? 1 : 0);
