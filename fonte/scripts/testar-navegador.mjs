/* EFCdocs — testes no navegador (Chromium sem tela, via Playwright).
   Uso: node scripts/testar-navegador.mjs <endereço> [pasta-dos-prints]
   O endereço precisa servir o dist/ na raiz e o v0.2.0 em /v020/ (mesma origem, para o teste de compatibilidade). */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:8731/';
const PRINTS = process.argv[3] || null;
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
if (PRINTS) mkdirSync(PRINTS, { recursive: true });

const resultados = [];
let atual = '';
async function caso(nome, fn) {
  atual = nome;
  try {
    await fn();
    resultados.push({ nome, ok: true });
    console.log('  ok   ' + nome);
  } catch (e) {
    resultados.push({ nome, ok: false, erro: e.message.split('\n').slice(0, 4).join(' | ') });
    console.log('  FALHA ' + nome + ' — ' + e.message.split('\n').slice(0, 4).join(' | '));
  }
}
const certo = (v, msg) => { if (!v) throw new Error(msg || 'esperado verdadeiro'); };
const igual = (a, b, msg) => { if (a !== b) throw new Error(`${msg || ''} esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)}`); };

/* UTF-8 para os nomes de arquivo com acento (ex.: "Quadro sem título.pdf") saírem certos */
const navegador = await chromium.launch({ executablePath: CHROME, env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const errosConsole = [];
async function novaPagina(opcoes = {}) {
  const ctx = await navegador.newContext({ viewport: { width: 1366, height: 800 }, acceptDownloads: true, ...opcoes });
  const p = await ctx.newPage();
  p.on('console', (m) => { if (m.type() === 'error') errosConsole.push(`[${atual}] ${m.text()}`); });
  p.on('pageerror', (e) => errosConsole.push(`[${atual}] erro de página: ${e.message}`));
  return { ctx, p };
}
const print = async (p, nome) => { if (PRINTS) await p.screenshot({ path: `${PRINTS}/${nome}.png` }); };
const status = (p) => p.locator('[data-status=contagem]').innerText();
const contar = async (p) => {
  const t = await status(p);
  const n = t.match(/(\d+) post-its? · (\d+) formas? · (\d+) setas?/);
  return { postits: +n[1], formas: +n[2], setas: +n[3] };
};
const cmd = (p, id) => p.locator(`[data-cmd="${id}"]`).first().click();
const caixa = async (p, sel) => p.locator(sel).first().boundingBox();
async function escreverNoItem(p, texto) {
  const ta = p.locator('textarea.qd-edita');
  await ta.waitFor();
  await ta.fill(texto);
  await ta.press('Control+Enter');
  await p.waitForTimeout(120);
}
async function arrastar(p, de, para, passos = 12) {
  await p.mouse.move(de.x, de.y);
  await p.mouse.down();
  await p.mouse.move(para.x, para.y, { steps: passos });
  await p.mouse.up();
  await p.waitForTimeout(150);
}
const meio = (b) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
/* solta a seleção (a barra flutuante some) e escolhe o item */
async function escolher(p, sel, toque) {
  await p.keyboard.press('Escape');
  await p.waitForTimeout(80);
  if (toque) await p.locator(sel).first().tap();
  else await p.locator(sel).first().click();
  await p.waitForTimeout(80);
}

console.log('EFCdocs — testes no navegador em ' + BASE);

/* ---------- 1. abertura, menu e quadro ---------- */
let { ctx, p } = await novaPagina();
await caso('abre sem erro, rodapé mostra v0.3.2', async () => {
  await p.goto(BASE);
  await p.waitForSelector('.foot');
  certo((await p.locator('.foot').innerText()).includes('v0.3.2'), 'rodapé sem v0.3.2');
  await p.waitForTimeout(700);
  igual(await p.locator('#abertura').count(), 0, 'tela de abertura não saiu');
});
await caso('menu: Pastas e Documentos externos com "em breve" explicado', async () => {
  const em = p.locator('.rail .rn .em');
  igual(await em.count(), 2);
  igual((await em.first().innerText()).trim(), 'em breve');
  certo((await p.locator('.rail a[href="#/pastas"]').getAttribute('title')).includes('v0.8.0'));
  await p.click('.rail a[href="#/pastas"]');
  certo(await p.locator('.aviso-breve').isVisible(), 'página de pastas sem aviso');
  await print(p, '01-pastas-em-breve');
});
await caso('início com os três botões de novo', async () => {
  await p.click('.rail a[href="#/"]');
  igual(await p.locator('[data-novo]').count(), 3);
  await print(p, '02-inicio');
});
await caso('planilha: aviso do PDF diz de qual módulo é', async () => {
  await p.click('[data-novo=planilha]');
  await p.waitForSelector('.sup-planilha');
  await p.click('.tab:has-text("Arquivo")');
  await cmd(p, 'arquivo.exportarPDF');
  const t = await p.locator('.toast').last().innerText();
  certo(t.includes('da planilha chega na v0.5.0'), 'aviso: ' + t);
  await print(p, '03-aviso-pdf-planilha');
});
await caso('novo quadro abre vazio, na aba Inserir', async () => {
  await p.click('.rail a[href="#/postits"]');
  await p.click('[data-novo=postits]');
  await p.waitForSelector('.qd-vazio');
  certo(await p.locator('.tab.active:has-text("Inserir")').count(), 'aba Inserir não ficou ativa');
  await print(p, '04-quadro-vazio');
});
await caso('post-it pelo botão: escreve e ganha Q-001', async () => {
  await cmd(p, 'inserir.postit');
  await escreverNoItem(p, 'Verificar cloro livre');
  const it = p.locator('.qi-postit').first();
  igual(await it.getAttribute('data-cod'), 'Q-001');
  certo((await it.innerText()).includes('Verificar cloro livre'));
  igual((await contar(p)).postits, 1);
});
await caso('setinha do lado direito cria o próximo passo já ligado', async () => {
  await escolher(p, '.qi-postit');
  await p.locator('[data-ponto=r]').click();
  await escreverNoItem(p, 'Registrar no formulário');
  const n = await contar(p);
  igual(n.postits, 2);
  igual(n.setas, 1);
  igual(await p.locator('.qi-postit').nth(1).getAttribute('data-cod'), 'Q-002');
});
await caso('arrastar o item leva a seta junto (seta presa)', async () => {
  const antes = await p.locator('.qd-seta-linha').first().getAttribute('d');
  const b = await caixa(p, '.qi[data-cod="Q-002"]');
  await arrastar(p, meio(b), { x: meio(b).x, y: meio(b).y + 220 });
  const depois = await p.locator('.qd-seta-linha').first().getAttribute('d');
  certo(antes !== depois, 'a seta não mudou');
  const b2 = await caixa(p, '.qi[data-cod="Q-002"]');
  certo(b2.y > b.y + 150, 'o item não desceu');
  await print(p, '05-seta-presa');
});
await caso('arrastar perto do alinhamento encaixa no centro do outro item', async () => {
  await p.keyboard.press('Escape');
  const a = await caixa(p, '.qi[data-cod="Q-001"]');
  const b = await caixa(p, '.qi[data-cod="Q-002"]');
  /* leva o Q-002 para o lado do Q-001, 4 px fora da linha */
  await arrastar(p, meio(b), { x: a.x + a.width + 160, y: meio(a).y + 4 });
  const b2 = await caixa(p, '.qi[data-cod="Q-002"]');
  certo(Math.abs(meio(b2).y - meio(a).y) < 0.6, 'não encaixou: ' + (meio(b2).y - meio(a).y));
  await p.keyboard.press('Control+z');
  await p.waitForTimeout(150);
});
await caso('Ctrl+Z desfaz o arrasto e Ctrl+Y refaz', async () => {
  const b = await caixa(p, '.qi[data-cod="Q-002"]');
  await p.keyboard.press('Escape');
  await p.keyboard.press('Control+z');
  await p.waitForTimeout(200);
  const b2 = await caixa(p, '.qi[data-cod="Q-002"]');
  certo(b2.y < b.y - 150, 'não voltou');
  await p.keyboard.press('Control+y');
  await p.waitForTimeout(200);
  const b3 = await caixa(p, '.qi[data-cod="Q-002"]');
  certo(Math.abs(b3.y - b.y) < 2, 'não refez');
});
await caso('dois cliques no vazio criam post-it; arrastar a setinha liga os dois', async () => {
  const area = await caixa(p, '.qd-area');
  await p.mouse.dblclick(area.x + area.width - 260, area.y + 200);
  await escreverNoItem(p, 'Avisar o supervisor');
  await escolher(p, '.qi[data-cod="Q-001"]');
  const ponto = await caixa(p, '[data-ponto=r]');
  const alvo = await caixa(p, '.qi[data-cod="Q-003"]');
  await arrastar(p, meio(ponto), meio(alvo), 16);
  igual((await contar(p)).setas, 2);
});
await caso('apagar item apaga as setas presas; desfazer devolve tudo', async () => {
  await escolher(p, '.qi[data-cod="Q-001"]');
  await p.keyboard.press('Delete');
  let n = await contar(p);
  igual(n.postits, 2);
  igual(n.setas, 0);
  await p.keyboard.press('Control+z');
  await p.waitForTimeout(200);
  n = await contar(p);
  igual(n.postits, 3);
  igual(n.setas, 2);
});
await caso('Ctrl+D duplica com código novo', async () => {
  await escolher(p, '.qi[data-cod="Q-003"]');
  await p.keyboard.press('Control+d');
  await p.waitForTimeout(150);
  igual(await p.locator('.qi[data-cod="Q-004"]').count(), 1);
});
await caso('formas do fluxograma, texto na seta e raias atrás', async () => {
  await cmd(p, 'inserir.forma');
  await p.locator('[data-forma=decisao]').click();
  await escreverNoItem(p, 'Cloro dentro do limite?');
  igual(await p.locator('.qi-decisao').count(), 1);
  await escolher(p, '.qi-decisao');
  await p.locator('[data-ponto=b]').click();
  await escreverNoItem(p, 'Liberar a água');
  await p.keyboard.press('Escape');
  await p.locator('.qd-seta-toque').last().dblclick({ force: true });
  const inp = p.locator('input.qd-edita-seta');
  await inp.fill('Sim');
  await inp.press('Enter');
  await p.waitForTimeout(150);
  certo((await p.locator('.qd-rotulo text').evaluateAll((l) => l.map((e) => e.textContent))).includes('Sim'), 'sem texto na seta');
  await p.click('.tab:has-text("Organizar")');
  await cmd(p, 'organizar.raias');
  igual(await p.locator('.qi-raia').count(), 3);
  const zRaia = await p.locator('.qi-raia').first().evaluate((e) => +e.style.zIndex);
  const zPost = await p.locator('.qi-postit').first().evaluate((e) => +e.style.zIndex);
  certo(zRaia < zPost, 'raia na frente');
  await p.click('[data-cmd="exibir.ajustar"]').catch(async () => { await p.click('.tab:has-text("Exibir")'); await cmd(p, 'exibir.ajustar'); });
  await p.locator('.qd-zoom [aria-label="Ajustar à tela"]').click();
  await p.waitForTimeout(200);
  await print(p, '06-fluxograma-raias');
});
await caso('painel lateral mostra o item escolhido (código, cor, coluna)', async () => {
  await escolher(p, '.qi[data-cod="Q-002"]');
  await p.locator('.qd-barra [data-acao=detalhes]').click();
  await p.waitForSelector('.qd-painel');
  certo((await p.locator('.qd-painel').innerText()).includes('Q-002'));
  await p.locator('.qd-cores-mini button[aria-label="Cor Verde"]').click();
  await p.waitForTimeout(150);
  const fundo = await p.locator('.qi[data-cod="Q-002"]').evaluate((e) => getComputedStyle(e).backgroundColor);
  igual(fundo, 'rgb(187, 247, 208)', 'cor');
  await print(p, '07-painel-item');
  await p.locator('.side [aria-label="Fechar o painel"]').click();
});
await caso('Kanban: três colunas e arrastar cartão muda a coluna', async () => {
  await p.locator('.qd-vistas button:has-text("Kanban")').click();
  await p.waitForSelector('.kb-col');
  igual(await p.locator('.kb-col').count(), 3);
  const nA = await p.locator('.kb-col[data-col=c1] .kb-card').count();
  igual(nA, 4);
  const card = await caixa(p, '.kb-col[data-col=c1] .kb-card');
  const destino = await caixa(p, '.kb-col[data-col=c3] .kb-lista');
  await arrastar(p, { x: card.x + 40, y: card.y + 30 }, { x: destino.x + 60, y: destino.y + 20 }, 20);
  igual(await p.locator('.kb-col[data-col=c3] .kb-card').count(), 1);
  igual(await p.locator('.kb-col[data-col=c1] .kb-card').count(), 3);
  await print(p, '08-kanban');
});
await caso('Kanban: nova coluna e post-it pela coluna', async () => {
  await p.locator('.kb-coluna-nova').click();
  await p.locator('.janela input').fill('Bloqueado');
  await p.locator('.janela button.primary').click();
  igual(await p.locator('.kb-col').count(), 4);
  await p.locator('.kb-col').nth(3).locator('.kb-novo').click();
  const ta = p.locator('textarea.kb-edita');
  await ta.fill('Falta reagente DPD');
  await ta.press('Control+Enter');
  await p.waitForTimeout(150);
  igual(await p.locator('.kb-col').nth(3).locator('.kb-card').count(), 1);
});
await caso('exportar PDF paisagem do Kanban', async () => {
  await p.click('.tab:has-text("Arquivo")');
  const [d] = await Promise.all([p.waitForEvent('download'), cmd(p, 'arquivo.exportarPDF')]);
  const bytes = Buffer.concat(await (await d.createReadStream()).toArray());
  igual(bytes.slice(0, 8).toString('latin1'), '%PDF-1.4', 'não é PDF');
  certo(bytes.toString('latin1').includes('/MediaBox [0 0 842 595]'), 'não é paisagem');
  certo(d.suggestedFilename().endsWith('.pdf'), 'nome do arquivo: ' + d.suggestedFilename());
  if (PRINTS) writeFileSync(`${PRINTS}/exemplo-kanban.pdf`, bytes);
});
await caso('exportar PDF e PNG do quadro', async () => {
  await p.locator('.qd-vistas button:has-text("Quadro")').click();
  const [d] = await Promise.all([p.waitForEvent('download'), cmd(p, 'arquivo.exportarPDF')]);
  const bytes = Buffer.concat(await (await d.createReadStream()).toArray());
  certo(bytes.toString('latin1').includes('/MediaBox [0 0 842 595]'));
  if (PRINTS) writeFileSync(`${PRINTS}/exemplo-quadro.pdf`, bytes);
  const [d2] = await Promise.all([p.waitForEvent('download'), cmd(p, 'arquivo.exportarImagem')]);
  const png = Buffer.concat(await (await d2.createReadStream()).toArray());
  igual(png.slice(1, 4).toString(), 'PNG');
  if (PRINTS) writeFileSync(`${PRINTS}/exemplo-quadro.png`, png);
});
await caso('recarregar a página: tudo continua no aparelho', async () => {
  await p.reload();
  await p.waitForSelector('.qi');
  const n = await contar(p);
  igual(n.postits, 5);
  certo(n.setas >= 3);
  igual(await p.locator('.kb-col').count(), 0, 'abriu no Kanban');
});
await caso('busca Ctrl+K acha comando do quadro', async () => {
  await p.keyboard.press('Control+k');
  await p.locator('.paleta input').fill('losango');
  certo(await p.locator('.paleta [data-cmd="inserir.decisao"]').count(), 'não achou');
  await print(p, '09-busca');
  await p.keyboard.press('Escape');
});
await caso('localizar acha pelo texto e pelo código', async () => {
  await p.click('.tab:has-text("Página Inicial")');
  await cmd(p, 'editar.localizar');
  await p.locator('.janela input').first().fill('cloro');
  await p.locator('.janela button.primary').click();
  certo((await p.locator('.janela [role=status]').innerText()).includes('2 itens'), await p.locator('.janela [role=status]').innerText());
  await p.keyboard.press('Escape');
});
await caso('temporizador e minimapa abrem', async () => {
  await p.click('.tab:has-text("Organizar")');
  await cmd(p, 'organizar.temporizador');
  certo(await p.locator('.qd-timer').isVisible());
  await p.locator('.qd-zoom [aria-label=Minimapa]').click();
  certo(await p.locator('.qd-mini').isVisible());
  await print(p, '10-temporizador-minimapa');
  await p.locator('.qd-timer [aria-label="Fechar o temporizador"]').click();
});
await caso('perfil Leitor: quadro só de leitura', async () => {
  await p.locator('.topbar [aria-label="Opções"]').click();
  await p.locator('.opcoes .chipb:has-text("Leitor")').click();
  await p.keyboard.press('Escape');
  certo(await p.locator('.qd-modo.leitura').isVisible(), 'sem aviso de leitura');
  await p.click('.tab:has-text("Inserir")');
  certo(await p.locator('[data-cmd="inserir.postit"]').isDisabled(), 'botão não travou');
  await p.locator('.topbar [aria-label="Opções"]').click();
  await p.locator('.opcoes .chipb:has-text("Admin")').click();
  await p.keyboard.press('Escape');
});
await caso('17 temas sem erro (16 do EFClaudian + Petróleo)', async () => {
  await p.locator('.topbar [aria-label="Opções"]').click();
  const temas = await p.locator('.tema-b').count();
  igual(temas, 17);
  for (let i = 0; i < temas; i++) await p.locator('.tema-b').nth(i).click();
  await p.locator('.tema-b[data-tema=petroleo]').click();
  await p.keyboard.press('Escape');
  await print(p, '11-tema-petroleo');
  await p.locator('.topbar [aria-label="Opções"]').click();
  await p.locator('.tema-b[data-tema=light]').click();
  await p.keyboard.press('Escape');
});
await ctx.close();

/* ---------- 2. compatibilidade com quadro criado na v0.2.0 ---------- */
({ ctx, p } = await novaPagina());
await caso('quadro criado na v0.2.0 abre e edita na v0.3.2', async () => {
  await p.goto(BASE + 'v020/');
  await p.waitForSelector('[data-novo=postits]');
  await p.click('[data-novo=postits]');
  await p.waitForSelector('.sup-postits');
  await p.waitForTimeout(400);
  await p.goto(BASE);
  await p.waitForSelector('.arq');
  await p.locator('.arq .abre').first().click();
  await p.waitForSelector('.qd-vazio');
  await cmd(p, 'inserir.postit');
  await escreverNoItem(p, 'Veio da v0.2.0');
  igual((await contar(p)).postits, 1);
});
await ctx.close();

/* ---------- 3. demonstração ---------- */
({ ctx, p } = await novaPagina());
await caso('demonstração: no máximo 3 arquivos e marca no topo', async () => {
  await p.goto(BASE + '?demo=1');
  await p.waitForSelector('.faixa-aviso.demo');
  for (let i = 0; i < 3; i++) {
    await p.goto(BASE + '?demo=1#/postits');
    await p.click('[data-novo=postits]');
    await p.waitForSelector('.qd');
  }
  await p.goto(BASE + '?demo=1#/postits');
  await p.click('[data-novo=postits]');
  await p.waitForSelector('.toast');
  certo((await p.locator('.toast').last().innerText()).includes('até 3'));
});
await ctx.close();

/* ---------- 4. celular ---------- */
({ ctx, p } = await novaPagina({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }));
await caso('celular: barra de baixo com os módulos', async () => {
  await p.goto(BASE);
  await p.waitForSelector('.navcel');
  await p.waitForTimeout(900);
  igual(await p.locator('.navcel a, .navcel button').count(), 5);
  await print(p, '12-celular-inicio');
  await p.locator('.navcel a:has-text("Post-its")').tap();
  await p.waitForSelector('[data-novo=postits]');
  await print(p, '13-celular-postits');
});
await caso('celular: quadro sem rolagem lateral, toque cria e liga', async () => {
  await p.locator('[data-novo=postits]').tap();
  await p.waitForSelector('.qd-vazio');
  await p.locator('.qd-vazio .chipb:has-text("Fluxograma")').tap();
  await escreverNoItem(p, 'Início');
  await escolher(p, '.qi-inicio', true);
  await p.locator('[data-ponto=b]').tap();
  await escreverNoItem(p, 'Coletar a amostra');
  igual((await contar(p)).setas, 1);
  const larg = await p.evaluate(() => document.documentElement.scrollWidth);
  certo(larg <= 390, 'rolagem lateral: ' + larg);
  await escolher(p, '.qi-processo', true);
  await p.waitForTimeout(150);
  await print(p, '14-celular-quadro');
});
await caso('celular: Kanban com alça de arrastar', async () => {
  await p.locator('.qd-vistas button:has-text("Kanban")').tap();
  await p.waitForSelector('.kb-col');
  await print(p, '15-celular-kanban');
});
await ctx.close();

/* ---------- 5. v0.3.1: ferramentas, tarefa/GUT, modelos, páginas, legenda, assistente ---------- */
({ ctx, p } = await novaPagina());
await caso('v0.3.1: barra de ferramentas vertical cria forma e esconde', async () => {
  await p.goto(BASE);
  await p.waitForSelector('.foot');
  await p.click('.rail a[href="#/postits"]');
  await p.click('[data-novo=postits]');
  await p.waitForSelector('.qd-vazio');
  await p.waitForSelector('.qd-ferr');
  igual(await p.locator('.qd-ferr [data-ferr]').count(), 9);
  await p.locator('.qd-ferr [data-ferr="inserir.processo"]').click();
  await escreverNoItem(p, 'Receber o lote');
  igual((await contar(p)).formas, 1);
  certo((await p.locator('.qi-processo').first().innerText()).includes('Receber o lote'));
  await print(p, '16-ferramentas-vertical');
  await p.locator('.qd-ferr-x').click();
  igual(await p.locator('.qd-ferr').count(), 0, 'barra não escondeu');
  await cmd(p, 'exibir.ferramentas').catch(async () => { await p.click('.tab:has-text("Exibir")'); await cmd(p, 'exibir.ferramentas'); });
  await p.waitForSelector('.qd-ferr');
});
await caso('v0.3.1: post-it de tarefa mostra responsável, prazo vencido e GUT; Assistente avisa', async () => {
  await p.locator('.qd-ferr [data-ferr="inserir.postit"]').click();
  await escreverNoItem(p, 'Trocar o filtro');
  await escolher(p, '.qi-postit');
  await p.locator('.qd-barra [data-acao=detalhes]').click();
  await p.waitForSelector('.qd-tarefa-p');
  const painel = p.locator('.qd-tarefa-p');
  await painel.locator('input[type=text], input:not([type])').first().fill('Ana');
  await painel.locator('input[type=date]').fill('2020-01-15');
  await painel.locator('input[type=date]').blur();
  await painel.locator('select').nth(0).selectOption('5');
  await painel.locator('select').nth(1).selectOption('4');
  await painel.locator('select').nth(2).selectOption('4');
  await p.waitForTimeout(200);
  const rod = await p.locator('.qi-postit .qi-tarefa').innerText();
  certo(rod.includes('Resp.: Ana'), rod);
  certo(rod.includes('15/01/2020') && rod.includes('Vencido'), rod);
  certo(rod.includes('GUT 80'), rod);
  certo((await painel.innerText()).includes('GUT = 80'), 'resumo do painel');
  certo((await p.locator('.qd-lamp').getAttribute('aria-label')).includes('pendência'), 'lâmpada');
  await p.locator('.qd-lamp').click();
  const t = await p.locator('.qd-assist').innerText();
  certo(t.includes('prazo vencido'), t);
  await print(p, '17-tarefa-gut-assistente');
  await p.keyboard.press('Escape');
  await p.locator('.qd-assist li button:has-text("Ir")').click();
  await p.waitForTimeout(250);
  igual(await p.locator('.qi.sel[data-cod="Q-002"]').count(), 1, 'Ir não escolheu o item');
  await p.locator('.qd-assist [aria-label="Fechar o assistente"]').click();
});
await caso('v0.3.1: Kanban mostra a tarefa e Ordenar GUT põe a maior nota no topo', async () => {
  await p.locator('.side [aria-label="Fechar o painel"]').click().catch(() => {});
  await p.locator('.qd-ferr [data-ferr="inserir.postit"]').click();
  await escreverNoItem(p, 'Revisar o POP');
  await p.locator('.qd-barra [data-acao=detalhes]').click();
  await p.waitForSelector('.qd-tarefa-p');
  for (let i = 0; i < 3; i++) await p.locator('.qd-tarefa-p select').nth(i).selectOption('5');
  await p.waitForTimeout(150);
  await p.locator('.qd-vistas button:has-text("Kanban")').click();
  await p.waitForSelector('.kb-col');
  certo((await p.locator('.kb-card .qi-tarefa').first().innerText()).includes('Ana'), 'tarefa no cartão');
  await p.locator('.qd-gut').click();
  await p.waitForTimeout(150);
  const primeiro = await p.locator('.kb-col').first().locator('.kb-card').first().innerText();
  certo(primeiro.includes('Revisar o POP') && primeiro.includes('GUT 125'), 'primeiro cartão: ' + primeiro);
  await print(p, '18-kanban-gut');
  await p.locator('.qd-vistas button:has-text("Quadro")').click();
});
await ctx.close();

({ ctx, p } = await novaPagina({ acceptDownloads: true }));
await caso('v0.3.1: página leva os itens de dentro e dois toques dentro dela criam post-it', async () => {
  await p.goto(BASE);
  await p.click('.rail a[href="#/postits"]');
  await p.click('[data-novo=postits]');
  await p.waitForSelector('.qd-vazio');
  await p.locator('.qd-ferr [data-ferr="inserir.pagina"]').click();
  await escreverNoItem(p, 'Registro');
  await p.keyboard.press('Escape');
  const pg = await caixa(p, '.qi-pagina');
  await p.mouse.dblclick(pg.x + 150, pg.y + 150);
  await escreverNoItem(p, 'Dentro');
  igual((await contar(p)).postits, 1);
  const antes = await caixa(p, '.qi-postit');
  await p.keyboard.press('Escape');
  const h = await caixa(p, '.qi-pg-h');
  await arrastar(p, { x: h.x + 60, y: h.y + 12 }, { x: h.x + 160, y: h.y + 112 });
  const depois = await caixa(p, '.qi-postit');
  certo(Math.abs(depois.x - antes.x - 100) < 3 && Math.abs(depois.y - antes.y - 100) < 3, 'o post-it não acompanhou a página');
  const h2 = await caixa(p, '.qi-pg-h');
  await p.mouse.dblclick(h2.x + 60, h2.y + 12);
  certo(await p.locator('textarea.qd-edita').count() === 1, 'dois toques no título não abrem a escrita');
  await p.keyboard.press('Escape');
});
await caso('v0.3.2: criar e escrever o post-it é um Ctrl+Z só; três páginas seguidas não se empilham; rótulo da barra inteiro', async () => {
  await p.goto(BASE);
  await p.click('.rail a[href="#/postits"]');
  await p.click('[data-novo=postits]');
  await p.waitForSelector('.qd-vazio');
  await p.locator('.qd-ferr [data-ferr="inserir.postit"]').click();
  await escreverNoItem(p, 'Teste de desfazer');
  igual((await contar(p)).postits, 1);
  await p.keyboard.press('Escape');
  await p.keyboard.press('Control+z');
  await p.waitForTimeout(200);
  igual((await contar(p)).postits, 0, 'um Ctrl+Z não desfez criar + escrever');
  for (let i = 0; i < 3; i++) { await p.locator('.qd-ferr [data-ferr="inserir.pagina"]').click(); await p.keyboard.press('Control+Enter'); await p.keyboard.press('Escape'); await p.waitForTimeout(120); }
  const caixas = await p.locator('.qi-pagina').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }));
  igual(caixas.length, 3);
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    const a = caixas[i], b = caixas[j];
    certo(!(a.x < b.x + b.w - 2 && a.x + a.w > b.x + 2 && a.y < b.y + b.h - 2 && a.y + a.h > b.y + 2), 'páginas ' + i + ' e ' + j + ' se sobrepõem');
  }
  const cortado = await p.locator('.qd-ferr-b span').evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent));
  igual(cortado.length, 0, 'rótulo cortado: ' + cortado.join(', '));
});
await caso('v0.3.2: data fora de 2000 a 2100 avisa; sem responsável aparece escrito; 500 letras ficam dentro do post-it', async () => {
  await p.goto(BASE);
  await p.click('.rail a[href="#/postits"]');
  await p.click('[data-novo=postits]');
  await p.waitForSelector('.qd-vazio');
  await p.locator('.qd-ferr [data-ferr="inserir.postit"]').click();
  await escreverNoItem(p, 'A'.repeat(500));
  await p.locator('.qd-barra [data-acao=detalhes]').click();
  await p.waitForSelector('.qd-tarefa-p');
  const dt = p.locator('.qd-tarefa-p input[type=date]');
  await dt.fill('1999-05-05'); await dt.blur();
  certo((await p.locator('.qd-tarefa-p [role=alert]').innerText()).includes('Data não aceita'), 'sem aviso de data');
  await dt.fill('2030-05-05'); await dt.blur(); await p.waitForTimeout(200);
  const rod = await p.locator('.qi-postit .qi-tarefa').innerText();
  certo(rod.includes('Sem responsável'), rod);
  const texto = await p.locator('.qi-postit .qi-clamp').boundingBox();
  const base = await p.locator('.qi-postit .qi-tarefa').boundingBox();
  certo(texto.y + texto.height <= base.y + 1, 'o texto passou por cima do rodapé');
});
await caso('v0.3.2: passou da meia-noite, o prazo de hoje vira vencido na tela sem recarregar', async () => {
  const { ctx: c2, p: q } = await novaPagina();
  await q.clock.install({ time: new Date(2026, 9, 25, 23, 59, 0) });
  await q.goto(BASE);
  await q.click('.rail a[href="#/postits"]');
  await q.click('[data-novo=postits]');
  await q.waitForSelector('.qd-vazio');
  await q.locator('.qd-ferr [data-ferr="inserir.postit"]').click();
  await q.locator('textarea.qd-edita').fill('Prazo de hoje'); await q.locator('textarea.qd-edita').press('Control+Enter');
  await q.locator('.qd-barra [data-acao=detalhes]').click();
  await q.waitForSelector('.qd-tarefa-p');
  const dt = q.locator('.qd-tarefa-p input[type=date]');
  await dt.fill('2026-10-25'); await dt.blur();
  await q.clock.runFor(2000);
  certo(!(await q.locator('.qi-postit .qi-tarefa').innerText()).includes('Vencido'), 'vencido antes da hora');
  await q.clock.runFor(90000);
  await q.waitForTimeout(200);
  certo((await q.locator('.qi-postit .qi-tarefa').innerText()).includes('Vencido'), 'não virou vencido depois da meia-noite');
  await c2.close();
});
await caso('v0.3.2: colar 62 linhas cria 62 post-its abaixo do que já existe, sem cobrir', async () => {
  await p.goto(BASE);
  await p.click('.rail a[href="#/postits"]');
  await p.click('[data-novo=postits]');
  await p.waitForSelector('.qd-vazio');
  await p.locator('.qd-ferr [data-ferr="inserir.decisao"]').click();
  await escreverNoItem(p, 'Cloro ok?');
  await p.keyboard.press('Escape');
  const texto = Array.from({ length: 62 }, (_, i) => 'Teste ' + (i + 1)).join('\n');
  await p.evaluate((t) => { const dt = new DataTransfer(); dt.setData('text/plain', t); document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, texto);
  await p.waitForTimeout(400);
  igual((await contar(p)).postits, 62);
  const dec = await p.evaluate(() => { const e = document.querySelector('.qi-decisao').getBoundingClientRect(); return { y: e.y + e.height }; });
  const topoColados = await p.evaluate(() => Math.min(...[...document.querySelectorAll('.qi-postit')].map((e) => e.getBoundingClientRect().y)));
  certo(topoColados > dec.y, 'os colados cobrem a decisão');
});
await caso('v0.3.2: texto grande termina em reticências e palavra gigante não sai da caixa', async () => {
  await p.goto(BASE);
  await p.click('.rail a[href="#/postits"]');
  await p.click('[data-novo=postits]');
  await p.waitForSelector('.qd-vazio');
  await p.locator('.qd-ferr [data-ferr="inserir.postit"]').click();
  await escreverNoItem(p, 'Palavragigantesemespaco'.repeat(6) + ' ' + 'linha longa '.repeat(30));
  const it = await p.locator('.qi-postit').first().boundingBox();
  const t = await p.locator('.qi-postit .qi-clamp').first().boundingBox();
  certo(t.x >= it.x - 1 && t.x + t.width <= it.x + it.width + 1 && t.y + t.height <= it.y + it.height + 1, 'texto passou da caixa');
  const [d] = await Promise.all([p.waitForEvent('download'), (async () => { await p.click('.tab:has-text("Arquivo")'); await cmd(p, 'arquivo.exportarPDF'); })()]);
  certo((await d.suggestedFilename()).endsWith('.pdf'));
});
await caso('v0.3.2: Seta reta e em cotovelo desenham diferente quando os itens estão desalinhados', async () => {
  await p.goto(BASE);
  await p.click('.rail a[href="#/postits"]');
  await p.click('[data-novo=postits]');
  await p.waitForSelector('.qd-vazio');
  await p.locator('.qd-ferr [data-ferr="inserir.postit"]').click();
  await escreverNoItem(p, 'A');
  await escolher(p, '.qi-postit');
  await p.locator('[data-ponto=r]').click();
  await escreverNoItem(p, 'B');
  await p.keyboard.press('Escape');
  const b = await caixa(p, '.qi[data-cod="Q-002"]');
  await arrastar(p, meio(b), { x: meio(b).x + 40, y: meio(b).y + 160 });
  await p.keyboard.press('Escape');
  const antes = await p.locator('.qd-seta-linha').first().getAttribute('d');
  await p.locator('.qd-seta-toque').first().click({ force: true });
  await p.locator('.qd-barra [aria-label="Seta reta"], .qd-barra [title="Seta reta"]').first().click();
  await p.waitForTimeout(150);
  const depois = await p.locator('.qd-seta-linha').first().getAttribute('d');
  certo(antes !== depois, 'a seta não mudou de desenho');
});
await caso('v0.3.1: modelo RNC entra inteiro, sem erro no Assistente, e Ctrl+Z desfaz tudo', async () => {
  await p.goto(BASE);
  await p.click('.rail a[href="#/postits"]');
  await p.click('[data-novo=postits]');
  await p.waitForSelector('.qd-vazio');
  await p.locator('.qd-vazio .chipb:has-text("Modelos")').click();
  await p.locator('[data-modelo="rnc"]').click();
  await p.waitForSelector('.qi-decisao');
  const n = await contar(p);
  igual(n.formas, 9);
  igual(n.setas, 10);
  certo((await p.locator('.qd-lamp').getAttribute('aria-label')).includes('nenhuma'), 'RNC com pendência');
  await print(p, '19-modelo-rnc');
  await p.keyboard.press('Escape');
  await p.keyboard.press('Control+z');
  await p.waitForTimeout(200);
  igual((await contar(p)).formas, 0, 'desfazer não tirou o modelo inteiro');
  await p.keyboard.press('Control+y');
  await p.waitForTimeout(200);
  igual((await contar(p)).formas, 9);
});
await caso('v0.3.1: páginas e legenda; PDF sai com uma folha por página', async () => {
  await p.click('.tab:has-text("Inserir")');
  await cmd(p, 'inserir.pagina');
  await p.waitForTimeout(200);
  await p.keyboard.press('Escape');
  await cmd(p, 'inserir.legenda');
  await p.waitForSelector('.qi-legenda .qi-leg-l');
  certo((await p.locator('.qi-legenda').innerText()).includes('Decisão'), 'legenda sem Decisão');
  certo((await p.locator('.qi-legenda').innerText()).includes('Atividade'), 'legenda sem Atividade');
  certo((await status(p)).includes('1 página'), await status(p));
  await print(p, '20-pagina-legenda');
  await p.click('.tab:has-text("Arquivo")');
  const [d] = await Promise.all([p.waitForEvent('download'), cmd(p, 'arquivo.exportarPDF')]);
  const bytes = Buffer.concat(await (await d.createReadStream()).toArray());
  const paginas = (bytes.toString('latin1').match(/\/Type \/Page[^s]/g) || []).length;
  certo(paginas >= 2, 'PDF com ' + paginas + ' folha(s); esperado página + fora das páginas');
  if (PRINTS) writeFileSync(`${PRINTS}/exemplo-quadro-paginas.pdf`, bytes);
});
await ctx.close();

({ ctx, p } = await novaPagina({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }));
await caso('v0.3.1 celular: faixa de cores à mão, sem barra vertical, Assistente sem rolagem lateral', async () => {
  await p.goto(BASE);
  await p.waitForSelector('.navcel');
  await p.waitForTimeout(900);
  await p.locator('.navcel a:has-text("Post-its")').tap();
  await p.locator('[data-novo=postits]').tap();
  await p.waitForSelector('.qd-vazio');
  igual(await p.locator('.qd-ferr').count(), 0, 'barra vertical no celular');
  await p.locator('.qd-vazio .chipb:has-text("Fluxograma")').tap();
  await escreverNoItem(p, 'Início');
  await escolher(p, '.qi-inicio', true);
  await p.waitForSelector('.qd-cores-cel');
  await p.locator('.qd-cores-cel [data-cor="verde"]').tap();
  await p.waitForTimeout(150);
  const fundo = await p.locator('.qi-inicio').first().evaluate((e) => { const f = e.querySelector('svg rect, svg polygon'); return f ? getComputedStyle(f).fill : getComputedStyle(e).backgroundColor; });
  igual(fundo, 'rgb(187, 247, 208)', 'cor pelo toque');
  await p.locator('.qd-lamp').tap();
  await p.waitForSelector('.qd-assist');
  const larg = await p.evaluate(() => document.documentElement.scrollWidth);
  certo(larg <= 390, 'rolagem lateral: ' + larg);
  await print(p, '21-celular-cores-assistente');
});
await ctx.close();

await navegador.close();
const ok = resultados.filter((r) => r.ok).length;
console.log(`\n${ok}/${resultados.length} testes no navegador passaram.`);
if (errosConsole.length) {
  console.log('\nErros no console:');
  for (const e of errosConsole) console.log('  ' + e);
} else console.log('Console sem erros.');
writeFileSync(process.env.RESULTADO || '/dev/null', JSON.stringify({ resultados, errosConsole }, null, 2));
process.exit(ok === resultados.length && !errosConsole.length ? 0 : 1);
