/* Vértice Docs v0.6.56 — D-84 (códigos Q-001 pulando depois de excluir), Ctrl+A em dois passos e D-83 (código encostando
   no texto da Atividade de 3 linhas). Quadro novo com itens inventados. Falha na v0.6.55 e passa na v0.6.56.
   Uso: node scripts/testar-quadro-v0656.mjs <endereço> [pasta-dos-prints] */
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:8731/';
const PRINTS = process.argv[3] || '';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const nav = await chromium.launch({ executablePath: CHROME });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce' });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
const erros = [];
p.on('pageerror', (e) => erros.push(String(e)));
let falhas = 0;
const caso = (nome, ok, info = '') => { console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome}${info ? ' — ' + info : ''}`); if (!ok) falhas++; };
const foto = async (nome) => { if (PRINTS) await p.locator('.qd-palco, .qd-area, main').first().screenshot({ path: `${PRINTS}/${nome}.png` }).catch(() => p.screenshot({ path: `${PRINTS}/${nome}.png` })); };
await p.goto(BASE + '#/'); await p.click('.rail a[href="#/postits"]'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
const ta = () => p.locator('textarea.qd-edita');
/* três atividades ligadas (Tab cria o próximo passo já ligado) e uma solta */
await p.locator('[data-cmd="inserir.processo"]').first().click();
await ta().waitFor(); await ta().fill('Receber a fruta');
for (const t of ['Lavar', 'Embalar']) { await ta().press('Tab'); await p.waitForTimeout(150); await ta().waitFor(); await ta().fill(t); }
await ta().press('Control+Enter'); await p.waitForTimeout(150); await p.keyboard.press('Escape');
await p.locator('[data-cmd="inserir.processo"]').first().click();
await ta().waitFor(); await ta().fill('Avulso'); await ta().press('Control+Enter'); await p.waitForTimeout(150); await p.keyboard.press('Escape');
const codDe = (t) => p.locator('.qi', { hasText: t }).first().getAttribute('data-cod');
const codigos = async () => (await p.locator('.qi[data-cod]').evaluateAll((els) => els.map((e) => e.dataset.cod))).sort().join(' ');
caso('começo: quatro códigos em sequência', (await codigos()) === 'Q-001 Q-002 Q-003 Q-004', await codigos());

/* Ctrl+A em dois passos */
await p.keyboard.press('Escape');
await p.locator('.qi', { hasText: 'Lavar' }).first().click(); await p.waitForTimeout(100);
await p.keyboard.press('Control+a'); await p.waitForTimeout(150);
const sel1 = await p.locator('.qi.sel').count();
caso('Ctrl+A com "Lavar" escolhido: escolhe os 3 ligados a ele', sel1 === 3, `${sel1} escolhido(s)`);
await foto('2-ctrl-a-ligados');
await p.keyboard.press('Control+a'); await p.waitForTimeout(150);
const sel2 = await p.locator('.qi.sel').count();
caso('Ctrl+A de novo: escolhe todos do quadro', sel2 === 4, `${sel2} escolhido(s)`);
await p.keyboard.press('Escape'); await p.waitForTimeout(100);
await p.keyboard.press('Control+a'); await p.waitForTimeout(150);
caso('Ctrl+A sem nada escolhido: escolhe todos, como antes', (await p.locator('.qi.sel').count()) === 4);
await p.keyboard.press('Escape');

/* D-84: excluir o do meio fecha o buraco */
await p.locator('.qi', { hasText: 'Lavar' }).first().click(); await p.waitForTimeout(100);
await foto('1-antes-de-excluir');
await p.keyboard.press('Delete'); await p.waitForTimeout(200);
caso('excluir o Q-002: os outros ficam Q-001, Q-002 e Q-003', (await codigos()) === 'Q-001 Q-002 Q-003', await codigos());
caso('"Embalar" passa a ser Q-002 e "Avulso" Q-003', (await codDe('Embalar')) === 'Q-002' && (await codDe('Avulso')) === 'Q-003', `${await codDe('Embalar')} · ${await codDe('Avulso')}`);
await foto('1-depois-de-excluir');
await p.locator('[data-cmd="inserir.processo"]').first().click();
await ta().waitFor(); await ta().fill('Novo'); await ta().press('Control+Enter'); await p.waitForTimeout(150); await p.keyboard.press('Escape');
caso('o próximo item novo pega o Q-004', (await codDe('Novo')) === 'Q-004', await codDe('Novo'));
await p.keyboard.press('Control+z'); await p.waitForTimeout(150); await p.keyboard.press('Control+z'); await p.waitForTimeout(200);
caso('Ctrl+Z traz o "Lavar" de volta como Q-002 e os outros como eram', (await codigos()) === 'Q-001 Q-002 Q-003 Q-004' && (await codDe('Lavar')) === 'Q-002' && (await codDe('Embalar')) === 'Q-003', await codigos());

/* D-83: Atividade e Entrada/Saída com 3 linhas e código */
const longo = 'Conferir a calibração do medidor de pH antes das análises do lote';
for (const tipo of ['processo', 'dados']) {
  await p.keyboard.press('Escape');
  await p.locator(`[data-cmd="inserir.${tipo}"]`).first().click();
  await ta().waitFor(); await ta().fill(longo); await ta().press('Control+Enter'); await p.waitForTimeout(200); await p.keyboard.press('Escape');
  const m = await p.locator(`.qi-${tipo}`, { hasText: 'calibração' }).first().evaluate((e) => {
    const cod = e.querySelector('.qi-cod').getBoundingClientRect(), s = e.querySelector('.qi-clamp'), r = s.getBoundingClientRect(), it = e.getBoundingClientRect();
    return { codFim: cod.bottom, textoIni: r.top, textoFim: r.bottom, itemFim: it.bottom, linhas: Math.round(r.height / parseFloat(getComputedStyle(e.querySelector('.qi-t')).lineHeight)) };
  });
  caso(`${tipo}: o código não encosta no texto de 3 linhas`, m.codFim <= m.textoIni + 0.5, `fim do código ${m.codFim.toFixed(1)} · começo do texto ${m.textoIni.toFixed(1)}`);
  caso(`${tipo}: as 3 linhas continuam aparecendo, dentro da forma`, m.linhas === 3 && m.textoFim <= m.itemFim + 0.5, `${m.linhas} linha(s)`);
}
await foto('3-atividade-3-linhas');
caso('sem erro na página', erros.length === 0, erros.join(' | '));
await nav.close();
console.log(falhas ? `FIM: ${falhas} falha(s)` : 'FIM: tudo certo');
process.exit(falhas ? 1 : 0);
