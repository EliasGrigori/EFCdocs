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
const FILTRO = process.env.FILTRO || '';
async function caso(nome, fn) {
  if (FILTRO && !nome.includes(FILTRO)) return;
  atual = nome;
  try {
    await fn();
    resultados.push({ nome, ok: true });
    console.log('  ok   ' + nome);
  } catch (e) {
    resultados.push({ nome, ok: false, erro: e.message.split('\n').slice(0, 4).join(' | ') });
    if (PRINTS && paginaAtual) { try { await paginaAtual.screenshot({ path: `${PRINTS}/falha-${resultados.length}.png`, timeout: 5000 }); } catch { /* sem print */ } }
    console.log('  FALHA ' + nome + ' — ' + e.message.split('\n').slice(0, 4).join(' | '));
  }
}
const certo = (v, msg) => { if (!v) throw new Error(msg || 'esperado verdadeiro'); };
const igual = (a, b, msg) => { if (a !== b) throw new Error(`${msg || ''} esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)}`); };

/* UTF-8 para os nomes de arquivo com acento (ex.: "Quadro sem título.pdf") saírem certos */
const navegador = await chromium.launch({ executablePath: CHROME, env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const errosConsole = [];
let paginaAtual = null;
async function novaPagina(opcoes = {}) {
  const ctx = await navegador.newContext({ viewport: { width: 1366, height: 800 }, acceptDownloads: true, ...opcoes });
  const p = await ctx.newPage();
  paginaAtual = p;
  p.on('console', (m) => { if (m.type() === 'error') errosConsole.push(`[${atual}] ${m.text()}`); });
  p.on('pageerror', (e) => errosConsole.push(`[${atual}] erro de página: ${e.message}`));
  return { ctx, p };
}
/* v0.4.4: Opções em sanfona: abre a seção se estiver fechada */
const abrirSecao = async (p, id) => { if (!(await p.locator(`.op-sec[data-sec=${id}].aberta`).count())) await p.locator(`.op-sec[data-sec=${id}] .op-cab`).click(); };
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
await caso('abre sem erro, rodapé mostra v0.4.4', async () => {
  await p.goto(BASE);
  await p.waitForSelector('.foot');
  certo((await p.locator('.foot').innerText()).includes('v0.4.4'), 'rodapé sem v0.4.4');
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
  await p.waitForSelector('[data-novo]');
  igual(await p.locator('[data-novo]').count(), 3);
  await print(p, '02-inicio');
});
await caso('planilha: aviso do PDF diz de qual módulo é', async () => {
  await p.click('[data-novo=planilha]');
  await p.waitForSelector('.sup-planilha .pl-cv');
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
  await abrirSecao(p, 'perfil');
  await p.locator('.opcoes .chipb:has-text("Leitor")').click();
  await p.keyboard.press('Escape');
  certo(await p.locator('.qd-modo.leitura').isVisible(), 'sem aviso de leitura');
  await p.click('.tab:has-text("Inserir")');
  certo(await p.locator('[data-cmd="inserir.postit"]').isDisabled(), 'botão não travou');
  await p.locator('.topbar [aria-label="Opções"]').click();
  await abrirSecao(p, 'perfil');
  await p.locator('.opcoes .chipb:has-text("Admin")').click();
  await p.keyboard.press('Escape');
});
await caso('17 temas sem erro (16 do EFClaudian + Petróleo)', async () => {
  await p.locator('.topbar [aria-label="Opções"]').click();
  await abrirSecao(p, 'tema');
  const temas = await p.locator('.tema-b').count();
  igual(temas, 17);
  for (let i = 0; i < temas; i++) await p.locator('.tema-b').nth(i).click();
  await p.locator('.tema-b[data-tema=petroleo]').click();
  await p.keyboard.press('Escape');
  await print(p, '11-tema-petroleo');
  await p.locator('.topbar [aria-label="Opções"]').click();
  await abrirSecao(p, 'tema');
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

/* ---------- v0.4.0: Planilha ---------- */
async function novaPlanilha(p) {
  await p.goto(BASE + '#/planilha');
  await p.waitForSelector('[data-novo=planilha]');
  await p.click('[data-novo=planilha]');
  await p.waitForSelector('.pl-cv');
  await p.waitForTimeout(250);
}
/** Vai até a célula pela caixa de nome e devolve o que ela mostra (lido do campo que recebe o teclado). */
async function celula(p, ref) {
  await p.locator('.pl-nome').click();
  await p.locator('.pl-nome').fill(ref);
  await p.locator('.pl-nome').press('Enter');
  await p.waitForTimeout(60);
  const r = await p.locator('.pl-cap').getAttribute('aria-label');
  return r.replace(/^Célula [A-Z]+\d+: /, '').replace(/^vazia$/, '');
}
async function digitarEm(p, ref, linhas) {
  await celula(p, ref);
  for (const t of linhas) { await p.keyboard.type(t); await p.keyboard.press('Enter'); }
  await p.waitForTimeout(80);
}
const fxTexto = (p) => p.locator('.pl-fx-campo').innerText();
async function colarTexto(p, texto, html) {
  await p.evaluate(([t, h]) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', t);
    if (h) dt.setData('text/html', h);
    document.querySelector('.pl-cap').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, [texto, html || '']);
  await p.waitForTimeout(150);
}
/** Ponto na tela do meio de uma célula (usa a geometria da grade a 100%). */
async function pontoCelula(p, ref) {
  const cv = await p.locator('.pl-cv').boundingBox();
  const m = /^([A-Z])(\d+)$/.exec(ref);
  const c = m[1].charCodeAt(0) - 65, l = +m[2] - 1;
  return { x: cv.x + 46 + c * 80 + 40, y: cv.y + 24 + l * 22 + 11 };
}

({ ctx, p } = await novaPagina());
await caso('v0.4.0: planilha abre com grade, barra de fórmula e abas; digitar e fórmula SE em pt-BR', async () => {
  await novaPlanilha(p);
  certo(await p.locator('.pl-fx .pl-nome').isVisible(), 'sem caixa de nome');
  igual(await p.locator('.pl-aba').count(), 1);
  await digitarEm(p, 'A1', ['Lote', 'L-012', 'L-013', 'L-014']);
  await digitarEm(p, 'B1', ['Cloro livre', '1,2', '0,3', '2,5']);
  await digitarEm(p, 'C1', ['Situação']);
  await p.keyboard.type('=SE(E(B2>=0,5;B2<=2);"OK";"Ajustar")');
  await p.waitForTimeout(150);
  const ajuda = await p.locator('.pl-ajuda').innerText();
  certo(ajuda.includes('‹Cloro livre›'), 'sem o nome da coluna: ' + ajuda);
  certo(ajuda.includes('Prévia: OK'), 'sem prévia: ' + ajuda);
  await print(p, '30-planilha-formula-ajuda');
  await p.keyboard.press('Enter');
  igual(await celula(p, 'C2'), 'OK');
  igual(await fxTexto(p), '=SE(E(B2‹Cloro livre›>=0,5;B2‹Cloro livre›<=2);"OK";"Ajustar")');
});
await caso('v0.4.0: alça de preenchimento leva a fórmula e continua códigos (L-015...)', async () => {
  await celula(p, 'C2');
  const a = await pontoCelula(p, 'C2');
  const b = await pontoCelula(p, 'C4');
  await arrastar(p, { x: a.x + 39, y: a.y + 10 }, { x: b.x + 10, y: b.y + 5 });
  igual(await celula(p, 'C3'), 'Ajustar');
  igual(await celula(p, 'C4'), 'Ajustar');
  igual(await fxTexto(p), '=SE(E(B4‹Cloro livre›>=0,5;B4‹Cloro livre›<=2);"OK";"Ajustar")');
  await celula(p, 'A4');
  const c = await pontoCelula(p, 'A4');
  const d = await pontoCelula(p, 'A6');
  await arrastar(p, { x: c.x + 39, y: c.y + 10 }, { x: d.x, y: d.y });
  igual(await celula(p, 'A6'), 'L-016');
});
await caso('v0.4.0: barra de status com Soma, Média e Contagem; "Pôr a conta embaixo" escreve =SOMA', async () => {
  await celula(p, 'B2');
  await p.keyboard.press('Shift+ArrowDown');
  await p.keyboard.press('Shift+ArrowDown');
  await p.waitForTimeout(100);
  const st = await p.locator('.foot').innerText();
  certo(st.includes('Soma: 4') && st.includes('Média: 1,333333333') && st.includes('Contagem: 3'), 'status: ' + st);
  await p.locator('.pl-st[data-est=soma]').click();
  await p.locator('.pl-menu button:has-text("Pôr a conta embaixo")').click();
  await p.waitForTimeout(150);
  igual(await celula(p, 'B5'), '4');
  igual(await fxTexto(p), '=SOMA(B2:B4)');
  await print(p, '31-planilha-status');
});
await caso('v0.4.0: erro avisado antes do Enter e "Corrigir os dois"', async () => {
  await celula(p, 'D2');
  await p.keyboard.type('=SE(B2>=0,5;"OK","Ajustar"');
  await p.waitForTimeout(120);
  const ajuda = await p.locator('.pl-ajuda').innerText();
  certo(ajuda.includes('vai ponto e vírgula') && ajuda.includes('Falta fechar o parêntese do SE'), 'ajuda: ' + ajuda);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(100);
  certo(await p.locator('.pl-edcel').isVisible(), 'deixou gravar fórmula com erro');
  await print(p, '32-planilha-erro-antes');
  await p.locator('.pl-ajuda button:has-text("Corrigir os dois")').click();
  await p.keyboard.press('Enter');
  igual(await celula(p, 'D2'), 'OK');
});
await caso('v0.4.0: VLOOKUP vira PROCV, autocompletar completa com Tab, F4 põe o $', async () => {
  await celula(p, 'E2');
  await p.keyboard.type('=VLOOKUP("L-013";A2:B4;2;0)');
  await p.waitForTimeout(100);
  certo((await p.locator('.pl-ajuda').innerText()).includes('Em português é PROCV'));
  await p.keyboard.press('Enter');
  igual(await celula(p, 'E2'), '0,3');
  igual(await fxTexto(p), '=PROCV("L-013";A2:B4;2;0)');
  await celula(p, 'E3');
  await p.keyboard.type('=SO');
  await p.waitForTimeout(100);
  certo((await p.locator('.pl-sug').innerText()).includes('SOMA'), 'sem sugestão SOMA');
  await p.keyboard.press('Tab');
  await p.keyboard.type('B2');
  await p.keyboard.press('F4');
  await p.keyboard.type(':B4)');
  await p.keyboard.press('Enter');
  await celula(p, 'E3');
  igual(await fxTexto(p), '=SOMA($B$2:B4)');
});
await caso('v0.4.0: clicar nas células durante a fórmula insere a referência (modo apontar)', async () => {
  await celula(p, 'F2');
  await p.keyboard.type('=');
  await p.mouse.click(...Object.values(await pontoCelula(p, 'B2')));
  await p.keyboard.type('*2');
  await p.keyboard.press('Enter');
  igual(await celula(p, 'F2'), '2,4');
  igual(await fxTexto(p), '=B2‹Cloro livre›*2');
});
await caso('v0.4.0: ao digitar texto, sugere o que já existe na coluna (Enter aceita)', async () => {
  await celula(p, 'C10');
  await p.keyboard.type('aju');
  await p.waitForTimeout(80);
  igual(await p.locator('.pl-edcel .ef-fantasma').innerText(), 'star');
  await p.keyboard.press('Enter');
  igual(await celula(p, 'C10'), 'ajustar');
  await p.keyboard.press('Delete');
});
await caso('v0.4.0: inserir e excluir linha ajusta as fórmulas; desfazer volta', async () => {
  await celula(p, 'A3');
  await p.click('.tab:has-text("Página Inicial")');
  await cmd(p, 'planilha.inserirLinha');
  await p.waitForTimeout(150);
  igual(await celula(p, 'C4'), 'Ajustar');
  igual(await fxTexto(p), '=SE(E(B4‹Cloro livre›>=0,5;B4‹Cloro livre›<=2);"OK";"Ajustar")');
  await celula(p, 'B6');
  igual(await fxTexto(p), '=SOMA(B2:B5)');
  await celula(p, 'A3');
  await cmd(p, 'planilha.excluirLinha');
  await p.waitForTimeout(150);
  await celula(p, 'B5');
  igual(await fxTexto(p), '=SOMA(B2:B4)');
  await p.keyboard.press('Control+z');
  await p.keyboard.press('Control+z');
  await p.waitForTimeout(150);
  await celula(p, 'B5');
  igual(await fxTexto(p), '=SOMA(B2:B4)');
});
await caso('v0.4.0: formatos do Excel (R$, %, data com a letra O corrigida) e casas decimais', async () => {
  await digitarEm(p, 'G1', ['R$ 10,5', '12,5%', '1O/1O/2026', '31/02/2026']);
  await p.waitForTimeout(100);
  igual(await celula(p, 'G1'), 'R$ 10,50');
  igual(await celula(p, 'G2'), '12,50%');
  igual(await celula(p, 'G3'), '10/10/2026');
  igual(await celula(p, 'G4'), '31/02/2026');
  await celula(p, 'G1');
  await cmd(p, 'formatar.maisCasas');
  igual(await celula(p, 'G1'), 'R$ 10,500');
  await p.keyboard.press('Control+1');
  await p.waitForSelector('.pl-jform');
  certo((await p.locator('.pl-jform input').inputValue()).includes('#.##0,000'), 'código em pt-BR');
  await p.keyboard.press('Escape');
});
await caso('v0.4.0: abas: nova, renomear (a fórmula acompanha) e referência entre abas', async () => {
  await p.locator('.pl-aba-nova').click();
  await p.waitForTimeout(150);
  igual(await p.locator('.pl-aba').count(), 2);
  await digitarEm(p, 'A1', ['=Planilha1!B2*10']);
  igual(await celula(p, 'A1'), '12');
  await p.locator('.pl-aba.on').dblclick();
  await p.locator('.janela input').fill('Resumo');
  await p.locator('.janela .btn.primary').click();
  await p.locator('.pl-aba:has-text("Planilha1")').click();
  await p.locator('.pl-aba:has-text("Planilha1")').dblclick();
  await p.locator('.janela input').fill('Lotes 2026');
  await p.locator('.janela .btn.primary').click();
  await p.locator('.pl-aba:has-text("Resumo")').click();
  await celula(p, 'A1');
  igual(await fxTexto(p), "='Lotes 2026'!B2*10");
  await print(p, '33-planilha-abas');
  await p.locator('.pl-aba:has-text("Lotes 2026")').click();
});
await caso('v0.4.0: nome fácil (Meta_Cloro) e Ctrl+K acha célula, nome e coluna', async () => {
  await digitarEm(p, 'J1', ['0,5']);
  await celula(p, 'J1');
  await p.locator('.pl-nome').click();
  await p.locator('.pl-nome').fill('Meta_Cloro');
  await p.locator('.pl-nome').press('Enter');
  await p.waitForTimeout(100);
  await digitarEm(p, 'H2', ['=SE(B2>=Meta_Cloro;"OK";"Baixo")']);
  igual(await celula(p, 'H2'), 'OK');
  await p.keyboard.press('Control+k');
  await p.keyboard.type('cloro');
  await p.waitForTimeout(100);
  const lista = await p.locator('.paleta').innerText();
  certo(lista.includes('Meta_Cloro') && lista.includes('Coluna Cloro livre (B)'), 'Ctrl+K: ' + lista);
  await p.locator('.paleta button:has-text("Coluna Cloro livre")').click();
  await p.waitForTimeout(150);
  igual(await p.locator('.pl-nome').inputValue(), 'B2');
  await p.keyboard.press('Control+k');
  await p.keyboard.type('H2');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(150);
  igual(await p.locator('.pl-nome').inputValue(), 'H2');
});
await caso('v0.4.0: "De onde vem / quem usa" lista as fórmulas de todas as abas', async () => {
  await celula(p, 'B2');
  await p.click('.tab:has-text("Fórmulas")');
  await cmd(p, 'formula.origem');
  const t = await p.locator('.pl-origem').innerText();
  certo(t.includes('Resumo!A1') && t.includes('C2') && t.includes('H2'), 'quem usa: ' + t);
  await print(p, '34-planilha-quem-usa');
  await p.keyboard.press('Escape');
});
await caso('v0.4.0: colar do Excel (texto com tabulação) e copiar com fórmula para o Excel', async () => {
  await celula(p, 'A20');
  await colarTexto(p, 'Lote\tCloro\r\nL-100\t1,1\r\nL-101\t1O/1O/2026\r\n');
  igual(await celula(p, 'B21'), '1,1');
  igual(await celula(p, 'B22'), '10/10/2026');
  certo((await p.locator('.toast').last().innerText()).includes('letra O'), 'sem aviso da letra O');
  await celula(p, 'C2');
  const dados = await p.evaluate(() => {
    const dt = new DataTransfer();
    document.querySelector('.pl-cap').dispatchEvent(new ClipboardEvent('copy', { clipboardData: dt, bubbles: true, cancelable: true }));
    return { t: dt.getData('text/plain'), h: dt.getData('text/html') };
  });
  igual(dados.t, 'OK\r\n');
  certo(dados.h.includes('x:fmla="=IF(AND(B2&gt;=0.5,B2&lt;=2),&quot;OK&quot;,&quot;Ajustar&quot;)"'), 'html sem fórmula: ' + dados.h);
});
await caso('v0.4.0: congelar a linha de cima e Folha clara', async () => {
  await p.click('.tab:has-text("Exibir")');
  await cmd(p, 'exibir.congelar');
  await p.locator('.pl-opcao:has-text("Congelar a linha de cima")').click();
  await p.waitForTimeout(100);
  certo(await p.locator('[data-cmd="exibir.congelar"][aria-pressed=true]').count(), 'congelar não ligou');
  await p.locator('.pl-rol').evaluate((e) => { e.scrollTop = 600; });
  await p.waitForTimeout(150);
  await print(p, '35-planilha-congelada');
  await cmd(p, 'exibir.folhaClara');
  await p.waitForTimeout(150);
  const px = await p.locator('.pl-cv').evaluate((cv) => { const d = cv.getContext('2d').getImageData(cv.width - 20, cv.height - 20, 1, 1).data; return [d[0], d[1], d[2]]; });
  igual(px.join(','), '255,255,255', 'folha clara não ficou branca');
  await cmd(p, 'exibir.folhaClara');
  await p.locator('.pl-rol').evaluate((e) => { e.scrollTop = 0; });
});
await caso('v0.4.0: linha do tempo do desfazer volta vários passos de uma vez', async () => {
  await p.locator('.topbar-row [data-cmd="editar.historico"]').click();
  await p.waitForSelector('.lt-lista');
  const itens = await p.locator('.lt-lista li:not(.agora):not(.inicio) button').count();
  certo(itens >= 10, 'poucos passos: ' + itens);
  certo((await p.locator('.lt-lista').innerText()).includes('Digitar em'), 'passos sem nome');
  await print(p, '36-linha-do-tempo');
  await p.locator('.lt-lista li:not(.agora):not(.inicio) button').nth(2).click();
  await p.waitForTimeout(150);
  certo((await p.locator('.toast').last().innerText()).includes('Voltou 3 passos'));
  await p.keyboard.press('Control+y');
  await p.keyboard.press('Control+y');
  await p.keyboard.press('Control+y');
});
await caso('v0.4.0: Ctrl+setas pulam até o fim dos dados; Ctrl+; põe a data de hoje', async () => {
  await celula(p, 'A1');
  await p.keyboard.press('Control+ArrowDown');
  igual(await p.locator('.pl-nome').inputValue(), 'A6');
  await p.keyboard.press('Control+ArrowRight');
  igual(await p.locator('.pl-nome').inputValue(), 'XFD6', 'linha vazia vai até a última coluna (como o Excel)');
  await celula(p, 'A2');
  await p.keyboard.press('Control+ArrowRight');
  igual(await p.locator('.pl-nome').inputValue(), 'H2');
  await celula(p, 'K1');
  await p.keyboard.press('Control+;');
  await p.waitForTimeout(100);
  const hoje = new Date();
  igual(await celula(p, 'K1'), `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`);
});
await caso('v0.4.0: perfil Leitor só vê a planilha', async () => {
  await p.locator('.topbar [aria-label="Opções"]').click();
  await abrirSecao(p, 'perfil');
  await p.locator('.opcoes .chipb:has-text("Leitor")').click();
  await p.keyboard.press('Escape');
  certo(await p.locator('.pl-leitura').isVisible(), 'sem aviso de leitura');
  await celula(p, 'A1');
  await p.keyboard.type('x');
  await p.waitForTimeout(100);
  igual(await p.locator('.pl-edcel').count(), 0, 'Leitor conseguiu editar');
  /* v0.4.1: o Leitor vê o aviso ao tentar digitar */
  certo((await p.locator('.toasts').innerText()).includes('Só leitura'), 'sem aviso Só leitura ao digitar');
  await p.locator('.topbar [aria-label="Opções"]').click();
  await abrirSecao(p, 'perfil');
  await p.locator('.opcoes .chipb:has-text("Admin")').click();
  await p.keyboard.press('Escape');
});
await caso('v0.4.0: 10 mil linhas coladas: abre, rola até o fim e soma rápido', async () => {
  await novaPlanilha(p);
  const linhas = [];
  for (let i = 1; i <= 10000; i++) linhas.push(`L-${i}\t${(i % 25) / 10}`.replace('.', ','));
  const t0 = Date.now();
  await colarTexto(p, linhas.join('\r\n'));
  await digitarEm(p, 'C1', ['=CONT.SE(B:B;">2")', '=SOMA(B1:B10000)']);
  const tempo = Date.now() - t0;
  igual(await celula(p, 'C1'), '1600');
  igual(await celula(p, 'C2'), '12000');
  await celula(p, 'A1');
  await p.keyboard.press('Control+ArrowDown');
  igual(await p.locator('.pl-nome').inputValue(), 'A10000');
  certo(tempo < 8000, 'demorou ' + tempo + ' ms');
  await print(p, '37-planilha-10mil');
});
await ctx.close();

({ ctx, p } = await novaPagina());
await caso('v0.4.0: planilha criada na v0.2.0 abre e edita', async () => {
  await p.goto(BASE + 'v020/');
  await p.waitForSelector('[data-novo=planilha]');
  await p.click('[data-novo=planilha]');
  await p.waitForSelector('.sup-planilha');
  await p.waitForTimeout(400);
  await p.goto(BASE);
  await p.waitForSelector('.arq');
  await p.locator('.arq .abre').first().click();
  await p.waitForSelector('.pl-cv');
  await digitarEm(p, 'A1', ['5', '=A1*2']);
  igual(await celula(p, 'A2'), '10');
});
await ctx.close();

({ ctx, p } = await novaPagina({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }));
await caso('v0.4.0 celular: faixa de edição embaixo com ; ( ) e funções; próxima vazia', async () => {
  await p.goto(BASE + '#/planilha');
  await p.waitForSelector('[data-novo=planilha]');
  await p.locator('[data-novo=planilha]').tap();
  await p.waitForSelector('.pl-cv');
  await p.waitForTimeout(300);
  const cv = await p.locator('.pl-cv').boundingBox();
  /* a faixa e as abas de cima saem de cena ao editar, então a grade muda de lugar: toca até a faixa aparecer */
  for (let i = 0; i < 4 && !(await p.locator('.pl-banda').count()); i++) {
    await p.touchscreen.tap(cv.x + 46 + 40, cv.y + 24 + 11);
    await p.waitForTimeout(120);
  }
  await p.waitForSelector('.pl-banda');
  igual(await p.locator('.pl-alca-cel').count(), 0, 'alças durante a edição');
  await p.locator('.pl-banda textarea').fill('7');
  await p.locator('.pl-banda button:has-text("Próxima vazia")').tap();
  await p.waitForTimeout(150);
  await p.locator('.pl-banda textarea').fill('=');
  await p.waitForTimeout(80);
  certo(await p.locator('.pl-simbolos').isVisible(), 'sem barra de símbolos');
  await p.locator('.pl-simbolos button:has-text("SOMA")').tap();
  await p.locator('.pl-banda textarea').type('A1');
  await p.locator('.pl-simbolos button:has-text(")")').tap();
  await print(p, '38-celular-planilha');
  await p.locator('.pl-banda button:has-text("OK")').tap();
  await p.waitForTimeout(150);
  igual(await celula(p, 'A2'), '7');
  const larg = await p.evaluate(() => document.documentElement.scrollWidth);
  certo(larg <= 390, 'rolagem lateral: ' + larg);
});
await ctx.close();

({ ctx, p } = await novaPagina({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }));
await caso('v0.4.3.1 celular: com o teclado aberto a célula digitada continua à vista e a página não sobe', async () => {
  await p.goto(BASE + '#/planilha');
  await p.waitForSelector('[data-novo=planilha]');
  await p.locator('[data-novo=planilha]').tap();
  await p.waitForSelector('.pl-cv');
  await p.waitForTimeout(300);
  await celula(p, 'B30');
  await p.locator('.pl-fx-campo').click();
  await p.waitForSelector('.pl-banda');
  await p.setViewportSize({ width: 390, height: 520 }); // o teclado ocupa o resto da tela
  await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    const rol = document.querySelector('.pl-rol');
    return { y: window.scrollY, topo: document.querySelector('.app').getBoundingClientRect().top, st: rol.scrollTop, ch: rol.clientHeight, banda: document.querySelector('.pl-banda').getBoundingClientRect().bottom, ih: innerHeight };
  });
  igual(r.y, 0, 'a página subiu');
  igual(await p.locator('.app .ribbon').isVisible(), false, 'a faixa devia sair de cena enquanto digita');
  certo(r.ch > 140, 'a grade ficou pequena demais: ' + r.ch);
  certo(r.topo >= 0, 'topo do app fora da tela: ' + r.topo);
  certo(r.banda <= r.ih + 1, 'a faixa de edição ficou atrás do teclado');
  certo(r.st <= 29 * 22 && 30 * 22 <= r.st + r.ch - 22, `B30 fora da área visível (rolagem ${r.st}, altura ${r.ch})`);
});
await caso('v0.4.3.1 celular: "Ir para" de Problemas fecha a lista e deixa a célula no meio da grade, longe das abas', async () => {
  await p.setViewportSize({ width: 390, height: 844 });
  await p.goto(BASE + '#/planilha');
  await p.waitForSelector('[data-novo=planilha]');
  await p.locator('[data-novo=planilha]').tap();
  await p.waitForSelector('.pl-cv');
  await p.waitForTimeout(300);
  await digitarEm(p, 'C60', ['=C61', '=C60']);
  await celula(p, 'A1');
  await p.locator('.pl-lamp').tap();
  await p.waitForSelector('.pl-problemas');
  await p.locator('.pl-problemas button:has-text("Ir")').first().tap();
  await p.waitForTimeout(500);
  igual(await p.locator('.pl-problemas').count(), 0, 'a lista devia fechar no celular');
  const r = await p.evaluate(() => { const rol = document.querySelector('.pl-rol'); return { st: rol.scrollTop, ch: rol.clientHeight }; });
  const topo = 59 * 22 - r.st, base = topo + 22;
  certo(topo > 22 * 2 && base < r.ch - 22 * 2, `C60 colada na borda (topo ${topo}, base ${base}, altura ${r.ch})`);
});
await ctx.close();

/* ---------- v0.4.1: correções da aprovação ---------- */
({ ctx, p } = await novaPagina());
await caso('v0.4.1: datas na fórmula saem como data; 25:00 fica 25:00; número grande inteiro na barra', async () => {
  await novaPlanilha(p);
  await digitarEm(p, 'A1', ['01/03/2024', '=A1+1', '=DATA(2024;2;29)', '25:00', '123456789012345', '=A1-A1', '=AGORA()']);
  igual(await celula(p, 'A2'), '02/03/2024', '=A1+1');
  igual(await celula(p, 'A3'), '29/02/2024', '=DATA');
  igual(await celula(p, 'A4'), '25:00', '25:00');
  await celula(p, 'A5');
  igual((await fxTexto(p)).trim(), '123456789012345', 'barra de fórmulas');
  igual(await celula(p, 'A6'), '0', 'data - data é número');
  certo(/^\d\d\/\d\d\/\d{4} \d\d:\d\d$/.test(await celula(p, 'A7')), 'AGORA com data e hora');
  await celula(p, 'A4');
  igual((await fxTexto(p)).trim(), '25:00', 'barra mostra 25:00');
});
await caso('v0.4.1: dica do SE continua com o cursor no fim da fórmula; mensagens mais claras', async () => {
  await celula(p, 'C1');
  await p.keyboard.type('=SE(A1>1;"OK";"Não")');
  await p.waitForTimeout(120);
  certo(await p.locator('.pl-sig').isVisible(), 'sem dica no fim');
  certo((await p.locator('.pl-sig').innerText()).includes('SE'), 'dica não é do SE');
  await p.keyboard.press('Escape');
  await celula(p, 'C2');
  await p.keyboard.type('=SOMA(A1,A2');
  await p.waitForTimeout(120);
  const t = await p.locator('.pl-ajuda').innerText();
  certo(t.includes('vírgula é só para casas decimais'), 'mensagem da vírgula: ' + t);
  await p.keyboard.press('Escape');
});
await caso('v0.4.1: cabeçalho congelado não se sobrepõe ao número das linhas roladas', async () => {
  await celula(p, 'A1');
  await p.click('.tab:has-text("Exibir")');
  await cmd(p, 'exibir.congelar');
  await p.locator('.pl-opcao:has-text("Congelar a linha de cima")').click();
  await p.waitForTimeout(150);
  /* conta os pixels de "tinta" no cabeçalho da linha 1 (congelada): rolando, tem que continuar igual */
  const tinta = () => p.evaluate(() => {
    const cv = document.querySelector('.pl-cv');
    const g = cv.getContext('2d');
    const d = window.devicePixelRatio || 1;
    const img = g.getImageData(Math.round(4 * d), Math.round(26 * d), Math.round(36 * d), Math.round(18 * d)).data;
    const f = [img[0], img[1], img[2]];
    let n = 0; for (let i = 0; i < img.length; i += 4) if (Math.abs(img[i] - f[0]) + Math.abs(img[i + 1] - f[1]) + Math.abs(img[i + 2] - f[2]) > 90) n++;
    return n;
  });
  const n0 = await tinta();
  for (const y of [300, 611, 1237]) {
    await p.locator('.pl-rol').evaluate((el, v) => { el.scrollTop = v; }, y);
    await p.waitForTimeout(150);
    const n1 = await tinta();
    certo(Math.abs(n1 - n0) <= Math.max(6, n0 * 0.15), `cabeçalho da linha 1 mudou ao rolar ${y}: ${n0} → ${n1}`);
  }
  await print(p, '41-congelado-rolado');
  await p.locator('.pl-rol').evaluate((el) => { el.scrollTop = 0; });
});
await ctx.close();

/* o mesmo arquivo em duas abas do navegador */
({ ctx, p } = await novaPagina());
await caso('v0.4.1: mesmo arquivo em duas abas: a segunda fica só para ver, recebe o que a primeira grava e pode assumir', async () => {
  await novaPlanilha(p);
  await digitarEm(p, 'A1', ['10']);
  const url = p.url();
  const p2 = await ctx.newPage();
  p2.on('pageerror', (e) => errosConsole.push(`[${atual}] erro de página (aba 2): ${e.message}`));
  await p2.goto(url);
  await p2.waitForSelector('.pl-cv');
  await p2.waitForSelector('.faixa-aviso.trava', { timeout: 3000 });
  certo((await p2.locator('.faixa-aviso.trava').innerText()).includes('aberto em outra aba'), 'aba 2 sem aviso');
  igual(await p.locator('.faixa-aviso.trava').count(), 0, 'aba 1 travou');
  /* a aba 2 tenta digitar: nada muda e aparece o aviso */
  await celula(p2, 'A2');
  await p2.keyboard.type('99');
  await p2.waitForTimeout(150);
  igual(await p2.locator('.pl-edcel').count(), 0, 'aba 2 conseguiu editar');
  certo((await p2.locator('.toasts').innerText()).includes('outra aba'), 'sem aviso ao digitar na aba 2');
  /* a aba 1 grava: a aba 2 recebe */
  await p.bringToFront();
  await digitarEm(p, 'B1', ['20']);
  await p2.waitForTimeout(700);
  igual(await celula(p2, 'B1'), '20', 'aba 2 não recebeu');
  /* a aba 2 assume */
  await p2.bringToFront();
  await p2.locator('.faixa-aviso.trava button:has-text("Editar aqui")').click();
  await p2.waitForTimeout(900);
  igual(await p2.locator('.faixa-aviso.trava').count(), 0, 'aba 2 continua travada');
  await p.waitForSelector('.faixa-aviso.trava', { timeout: 3000 });
  await digitarEm(p2, 'C1', ['30']);
  await p.waitForTimeout(700);
  igual(await celula(p, 'C1'), '30', 'aba 1 não recebeu da aba 2');
  igual(await celula(p, 'A1'), '10');
  await print(p, '42-duas-abas');
  /* fechar a aba 2: a aba 1 volta a editar */
  await p2.close();
  await p.waitForTimeout(800);
  igual(await p.locator('.faixa-aviso.trava').count(), 0, 'aba 1 não destravou ao fechar a outra');
});
await caso('v0.4.1: quadro de post-its em duas abas também fica protegido', async () => {
  await p.goto(BASE + '#/postits');
  await p.waitForSelector('[data-novo=postits]');
  await p.click('[data-novo=postits]');
  await p.waitForTimeout(500);
  const p2 = await ctx.newPage();
  await p2.goto(p.url());
  await p2.waitForSelector('.faixa-aviso.trava', { timeout: 3000 });
  certo((await p2.locator('.qd-modo.leitura').innerText()).includes('outra aba'), 'quadro da aba 2 não ficou só para ver');
  await p2.close();
  await p.waitForTimeout(500);
  await novaPlanilha(p);
  await digitarEm(p, 'D1', ['1']);
});
await caso('v0.4.1: gravação de outro lugar no meio da edição: avisa e não perde nada', async () => {
  /* simula outra aba gravando sem avisar (marca nova direto no aparelho) */
  await p.evaluate(() => new Promise((ok) => {
    const id = location.hash.split('/').pop();
    const r = indexedDB.open('efcdocs');
    r.onsuccess = () => {
      const t = r.result.transaction('arquivos', 'readwrite');
      const s = t.objectStore('arquivos');
      const g = s.get(id);
      g.onsuccess = () => { s.put({ ...g.result, marca: 'outra' }); };
      t.oncomplete = () => ok();
    };
  }));
  await digitarEm(p, 'D1', ['40']);
  await p.waitForSelector('.faixa-aviso.trava', { timeout: 3000 });
  const t = await p.locator('.faixa-aviso.trava').innerText();
  certo(t.includes('ainda não foi gravada'), 'sem aviso de conflito: ' + t);
  await print(p, '43-conflito');
  await p.locator('.faixa-aviso.trava button:has-text("Gravar a minha por cima")').click();
  await p.waitForTimeout(500);
  igual(await p.locator('.faixa-aviso.trava').count(), 0, 'continua travado');
  await p.reload();
  await p.waitForSelector('.pl-cv');
  await p.waitForTimeout(300);
  igual(await celula(p, 'D1'), '40', 'a mudança se perdeu');
});
await ctx.close();

/* celular: dois toques e digitar */
({ ctx, p } = await novaPagina({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }));
await caso('v0.4.1 celular: dois toques na célula e o primeiro número digitado não se perde', async () => {
  await p.goto(BASE + '#/planilha');
  await p.waitForSelector('[data-novo=planilha]');
  await p.locator('[data-novo=planilha]').tap();
  await p.waitForSelector('.pl-cv');
  await p.waitForTimeout(300);
  const cv = await p.locator('.pl-cv').boundingBox();
  await p.touchscreen.tap(cv.x + 46 + 40, cv.y + 24 + 11);
  await p.waitForTimeout(120);
  await p.touchscreen.tap(cv.x + 46 + 40, cv.y + 24 + 11);
  await p.waitForTimeout(150);
  await p.keyboard.type('123');
  await p.waitForTimeout(80);
  igual(await p.locator('.pl-banda textarea').inputValue(), '123', 'o primeiro dígito sumiu');
});
await ctx.close();

/* ---------- v0.4.2: função desconhecida, faixa compacta e dicas ---------- */
({ ctx, p } = await novaPagina());
await caso('v0.4.2: função que parece outra não troca nem apaga: grava com #NOME?; só erro de digitação pede troca', async () => {
  await novaPlanilha(p);
  await digitarEm(p, 'A1', ['1', '2', '3']);
  for (const [ref, f] of [['C1', '=CORREL(A1:A3;A1:A3)'], ['C2', '=MODO(A1:A3)'], ['C3', '=TETO(A1;5)'], ['C4', '=NÃOD(A1)']]) {
    await celula(p, ref);
    await p.keyboard.type(f);
    await p.waitForTimeout(100);
    const ajuda = await p.locator('.pl-ajuda').innerText();
    certo(!/Usar [A-Z]/.test(ajuda), 'sugeriu troca para ' + f + ': ' + ajuda);
    await p.keyboard.press('Enter');
    await p.waitForTimeout(100);
    await celula(p, ref);
    igual((await fxTexto(p)).trim(), f, 'a fórmula sumiu: ' + f);
    igual(await celula(p, ref), '#NOME?', 'esperava #NOME? em ' + f);
    certo((await p.evaluate(() => document.querySelector('.pl-edcel')) === null), 'ficou editando ' + f);
  }
  /* erro de digitação continua pedindo a troca e segura o Enter */
  await celula(p, 'D1');
  await p.keyboard.type('=SOMAA(A1:A3)');
  await p.waitForTimeout(100);
  certo((await p.locator('.pl-ajuda').innerText()).includes('Usar SOMA'), 'sem sugestão SOMA');
  await p.locator('.pl-ajuda button:has-text("Usar SOMA")').click();
  await p.keyboard.press('Enter');
  await p.waitForTimeout(100);
  await celula(p, 'D1');
  igual((await fxTexto(p)).trim(), '=SOMA(A1:A3)');
  igual(await celula(p, 'D1'), '6');
});
await caso('v0.4.2: sem prévia de #VALOR! enquanto faltam partes na função', async () => {
  await celula(p, 'E1');
  await p.keyboard.type('=PROCV(A1)');
  await p.waitForTimeout(150);
  igual(await p.locator('.pl-previa').count(), 0, 'prévia apareceu com a função incompleta');
  await p.keyboard.press('Escape');
  await celula(p, 'E2');
  await p.keyboard.type('=SOMA(A1:A3)');
  await p.waitForTimeout(150);
  certo((await p.locator('.pl-previa').innerText()).includes('6'), 'prévia sumiu na conta completa');
  await p.keyboard.press('Escape');
});
await caso('v0.4.2: faixa não passa da tela em 1366 px, Copiar/Colar/Recortar só com ícone, Reexibir colunas', async () => {
  for (const aba of ['Página Inicial', 'Inserir', 'Fórmulas', 'Dados', 'Revisão', 'Exibir']) {
    await p.click(`.tabs .tab:has-text("${aba}")`);
    await p.waitForTimeout(120);
    const m = await p.evaluate(() => { const e = document.querySelector('.ribbon'); return [e.scrollWidth, e.clientWidth, !!document.querySelector('.rb-mais')]; });
    certo(m[0] <= m[1] + 1 && !m[2], `faixa ${aba}: ${m}`);
  }
  await p.click('.tabs .tab:has-text("Página Inicial")');
  for (const id of ['editar.colar', 'editar.copiar', 'editar.recortar']) {
    const b = p.locator(`.ribbon [data-cmd="${id}"]`);
    igual((await b.innerText()).trim(), '', 'texto no botão ' + id);
    certo(!!(await b.getAttribute('aria-label')), 'sem aria-label ' + id);
  }
  /* ocultar a coluna B e reexibir pela faixa */
  const vizinha = async () => { await celula(p, 'A1'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(80); return p.locator('.pl-nome').inputValue(); };
  await celula(p, 'B1');
  await p.click('.tabs .tab:has-text("Exibir")');
  await cmd(p, 'planilha.ocultarColuna');
  await p.waitForTimeout(200);
  igual(await vizinha(), 'C1', 'a coluna B não ficou oculta');
  await celula(p, 'A1');
  await p.keyboard.press('Shift+ArrowRight'); await p.keyboard.press('Shift+ArrowRight');
  await cmd(p, 'planilha.reexibirColuna');
  await p.waitForTimeout(200);
  igual(await vizinha(), 'B1', 'a coluna B não voltou');
});
await caso('v0.4.2: dica ao parar o mouse: nome, o que faz e atalho', async () => {
  await p.click('.tabs .tab:has-text("Página Inicial")');
  await p.hover('.ribbon [data-cmd="formatar.negrito"]');
  await p.waitForSelector('.dica-cmd', { timeout: 2000 });
  const t = await p.locator('.dica-cmd').innerText();
  certo(t.includes('Negrito') && t.includes('Ctrl+B') && t.includes('Letra em negrito'), 'dica: ' + t);
  await print(p, '44-dica-botao');
  await p.mouse.move(600, 400);
  await p.waitForTimeout(150);
  igual(await p.locator('.dica-cmd').count(), 0, 'dica não sumiu');
  await p.hover('.ribbon [data-cmd="editar.copiar"]');
  await p.waitForSelector('.dica-cmd', { timeout: 2000 });
  certo((await p.locator('.dica-cmd').innerText()).includes('Ctrl+C'), 'sem atalho no copiar');
  await p.mouse.move(600, 400);
});
await caso('v0.4.2: tela estreita: o que não cabe vai para "Mais" e abre', async () => {
  await p.setViewportSize({ width: 1000, height: 700 });
  await p.waitForTimeout(300);
  await p.click('.tabs .tab:has-text("Página Inicial")');
  await p.waitForSelector('.rb-mais');
  const m = await p.evaluate(() => { const e = document.querySelector('.ribbon'); return [e.scrollWidth, e.clientWidth]; });
  certo(m[0] <= m[1] + 1, 'faixa passa da tela: ' + m);
  await p.click('.rb-mais');
  await p.waitForSelector('.rb-mais-painel');
  certo(await p.locator('.rb-mais-painel [data-cmd="formula.autosoma"]').isVisible(), 'AutoSoma não está no Mais');
  await print(p, '45-faixa-mais');
  await p.keyboard.press('Escape');
  igual(await p.locator('.rb-mais-painel').count(), 0, 'Mais não fechou');
  await p.setViewportSize({ width: 1366, height: 800 });
  await p.waitForTimeout(300);
  igual(await p.locator('.rb-mais').count(), 0, 'Mais não sumiu ao alargar');
});
await caso('v0.4.2: faixa do quadro de post-its também com dicas e sem passar da tela', async () => {
  await p.goto(BASE + '#/postits');
  await p.waitForSelector('[data-novo=postits]');
  await p.click('[data-novo=postits]');
  await p.waitForSelector('.qd-vazio');
  for (const aba of ['Página Inicial', 'Inserir', 'Organizar', 'Revisão', 'Exibir']) {
    await p.click(`.tabs .tab:has-text("${aba}")`);
    await p.waitForTimeout(120);
    const m = await p.evaluate(() => { const e = document.querySelector('.ribbon'); return [e.scrollWidth, e.clientWidth]; });
    certo(m[0] <= m[1] + 1, `faixa do quadro ${aba}: ${m}`);
  }
  await p.click('.tabs .tab:has-text("Inserir")');
  await p.hover('.ribbon [data-cmd="inserir.postit"]');
  await p.waitForSelector('.dica-cmd', { timeout: 2000 });
  certo((await p.locator('.dica-cmd').innerText()).includes('Cria um post-it'), 'dica do post-it');
  await p.mouse.move(600, 500);
});
await caso('v0.4.2: a tela Início não diz mais que a planilha chega na v0.4.0', async () => {
  await p.goto(BASE + '#/');
  await p.waitForSelector('.pagina [data-novo]');
  const t = await p.locator('.pagina').innerText();
  certo(!t.includes('v0.4.0'), t);
});
await ctx.close();

/* ---------- v0.4.3: entender a conta, menu do cabeçalho e achados do Grok ---------- */
({ ctx, p } = await novaPagina());
const montarExemplo = async (p) => {
  await novaPlanilha(p);
  await digitarEm(p, 'A1', ['Lote', 'L-012', 'L-013', 'L-014', 'L-015']);
  await digitarEm(p, 'B1', ['Cloro livre', '1,2', '0,3', "'1,4", '2']);
  await digitarEm(p, 'C1', ['Situação', '=SE(E(B2>=0,5;B2<=2);"OK";"Ajustar")', '=SE(E(B3>=0,5;B3<=2);"OK";"Ajustar")', '=SE(E(B4>=0,5;B4<=2);"OK";"Ajustar")', '=SE(E(B5>=0,5;B5<=2);"OK";"Ajustar")']);
  await digitarEm(p, 'D1', ['Qtd. amostras', '10', '', '5', '4']);
  await digitarEm(p, 'E1', ['Conformes', '9', '4', '5', '4']);
  await digitarEm(p, 'F1', ['% conformes', '=E2/D2', '=E3/D3', '=E4/D4', '=E5/D5']);
  await digitarEm(p, 'G1', ['Meta', '=F2*1,15', '=F3*1,15']);
  await digitarEm(p, 'H1', ['Total', '=SOMA(F2:F5)']);
};
await caso('v0.4.3: LAMBDA grava e mostra #NOME?; CORREL na prévia diz "pode gravar sem medo"; PROVC sugere PROCV', async () => {
  await novaPlanilha(p);
  await celula(p, 'A1');
  await p.keyboard.type('=LAMBDA(x;x*2)(4)');
  await p.waitForTimeout(120);
  certo(!/Não sei o que é/.test(await p.locator('.pl-ajuda').innerText().catch(() => '')), 'x tratado como erro');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(120);
  await celula(p, 'A1');
  igual((await fxTexto(p)).trim(), '=LAMBDA(x;x*2)(4)');
  igual(await celula(p, 'A1'), '#NOME?');
  await celula(p, 'B1');
  await p.keyboard.type('=CORREL(A1:A3;A1:A3)');
  await p.waitForTimeout(150);
  const pr = await p.locator('.pl-previa').innerText();
  certo(/Pode gravar sem medo/.test(pr) && !/grafia/.test(pr), 'prévia: ' + pr);
  await p.keyboard.press('Escape');
  await celula(p, 'C1');
  await p.keyboard.type('=PROVC(A1;A1:B3;2;0)');
  await p.waitForTimeout(150);
  certo((await p.locator('.pl-ajuda').innerText()).includes('Usar PROCV'), 'sem sugestão PROCV');
  await p.keyboard.press('Escape');
});
await caso('v0.4.3: PL11 Explicar esta conta: linhas numeradas, valor de cada pedaço e a frase com o nome da coluna', async () => {
  await montarExemplo(p);
  await celula(p, 'C2');
  await p.click('.tabs .tab:has-text("Fórmulas")');
  await cmd(p, 'formula.explicar');
  await p.waitForSelector('.pl-jexp');
  igual(await p.locator('.pl-linhas li').count(), 5);
  certo((await p.locator('.pl-linhas li').nth(1).innerText()).includes('VERDADEIRO'), 'sem o valor do E(...)');
  certo((await p.locator('.pl-linhas').innerText()).includes('Cloro livre'), 'sem o nome da coluna');
  certo((await p.locator('.pl-frase').innerText()).includes('estiver entre 0,5 e 2, mostra "OK"'), 'frase');
  await print(p, '46-explicar-conta');
  /* editar em linhas e aplicar: muda a conta e volta a uma linha só */
  await p.click('.pl-jexp button:has-text("Editar em linhas")');
  const ed = p.locator('.pl-linhas-ed');
  const t = await ed.inputValue();
  await ed.fill(t.replace('"Ajustar"', '"Ajustar já"'));
  await p.click('.pl-jexp button:has-text("Aplicar")');
  await p.waitForTimeout(200);
  await celula(p, 'C3');
  igual(await celula(p, 'C3'), 'Ajustar', 'C3 não mudou');
  await celula(p, 'C2');
  certo((await fxTexto(p)).includes('"Ajustar já"') && !(await fxTexto(p)).includes('\n'), 'não aplicou: ' + await fxTexto(p));
  await p.keyboard.press('Control+z');
  await p.waitForTimeout(150);
});
await caso('v0.4.3: PL12 Por que deu erro: segue até F3, explica D3 vazio e o SEERRO conserta', async () => {
  await celula(p, 'H2');
  await cmd(p, 'formula.explicar');
  await p.waitForSelector('.pl-porque');
  const t = await p.locator('.pl-porque').innerText();
  certo(/O erro começa em F3/.test(t) && /D3 ‹Qtd\. amostras› está vazio/.test(t), t);
  await print(p, '47-por-que-erro');
  await p.click('.pl-porque button:has-text("Usar SEERRO em F3")');
  await p.waitForTimeout(250);
  igual(await celula(p, 'F3'), '', 'F3 deveria ficar vazio');
  await celula(p, 'F3');
  igual((await fxTexto(p)).replace(/‹[^›]*›/g, '').trim(), '=SEERRO(E3/D3;"")');
  await p.keyboard.press('Control+z');
  await p.waitForTimeout(150);
  igual(await celula(p, 'F3'), '#DIV/0!');
});
await caso('v0.4.3: PL13 lâmpada Problemas: conta, lista e converte o número guardado como texto', async () => {
  await p.waitForTimeout(400);
  const n = Number(await p.locator('.pl-lamp em').innerText());
  certo(n >= 3, 'esperava 3 ou mais problemas, veio ' + n);
  await p.click('.pl-lamp');
  await p.waitForSelector('.pl-problemas');
  const t = await p.locator('.pl-problemas').innerText();
  certo(/F3/.test(t) && /Número guardado como texto/.test(t) && /Número fixo na conta/.test(t), t);
  await print(p, '48-problemas');
  await p.locator('.pl-problemas li', { hasText: 'Número guardado como texto' }).locator('button:has-text("Converter")').click();
  await p.waitForTimeout(500);
  igual(await celula(p, 'B4'), '1,4');
  igual(await p.locator('.pl-problemas li', { hasText: 'Número guardado como texto' }).count(), 0, 'o aviso não saiu da lista');
  /* número fixo: vira um nome, e mudar o nome muda todas as contas */
  await p.locator('.pl-problemas li', { hasText: 'Número fixo na conta' }).locator('button:has-text("Dar nome ao número")').click();
  await p.locator('.janela input').fill('Fator_Meta');
  await p.click('.janela button:has-text("Dar nome")');
  await p.waitForTimeout(400);
  await celula(p, 'G2');
  igual((await fxTexto(p)).replace(/‹[^›]*›/g, '').trim(), '=F2*Fator_Meta');
  igual(await celula(p, 'G2'), '1,035');
  await p.click('.tabs .tab:has-text("Fórmulas")');
  await cmd(p, 'formula.nomes');
  await p.click('[aria-label="Mudar Fator_Meta"]');
  await p.locator('.janela input').last().fill('2');
  await p.click('.janela button:has-text("Mudar")');
  await p.waitForTimeout(300);
  await p.keyboard.press('Escape');
  igual(await celula(p, 'G2'), '1,8');
  await p.click('.pl-lamp');
});
await caso('v0.4.3: PL15 a conta desenhada e "Mandar para um quadro novo"', async () => {
  await celula(p, 'H2');
  await cmd(p, 'formula.fluxo');
  await p.waitForSelector('.pl-fluxo svg');
  const n = await p.locator('.pl-fluxo-no').count();
  certo(n >= 4, 'poucas caixas: ' + n);
  certo(await p.locator('.pl-fluxo-no[aria-label^="F3"]').count() === 1, 'F3 (onde está o erro) não aparece');
  await print(p, '49-conta-desenhada');
  await p.click('.pl-jfluxo button:has-text("Mandar para um quadro novo")');
  await p.waitForSelector('.qi', { timeout: 4000 });
  certo(await p.locator('.qi').count() >= n, 'o quadro não recebeu as caixas');
  certo(await p.locator('.qd-seta, .qd-setas path, svg path').count() > 0, 'sem setas');
  await print(p, '50-conta-no-quadro');
  await p.goBack();
  await p.waitForSelector('.pl-cv');
});
await caso('v0.4.3: PL18 Montar a conta: Contar quantos "Ajustar" na Situação', async () => {
  await celula(p, 'J2');
  await p.click('.tabs .tab:has-text("Fórmulas")');
  await cmd(p, 'formula.montar');
  await p.waitForSelector('.pl-jmontar');
  certo(await p.locator('.pl-jmontar button.primary').isDisabled(), 'sem valor deveria ficar desligado');
  await p.locator('.pl-jmontar select').first().selectOption({ label: 'Situação (C)' });
  await p.locator('.pl-jmontar input').first().fill('Ajustar');
  await p.waitForTimeout(120);
  const r = await p.locator('.pl-montar-r').innerText();
  /* B4 virou número no teste dos problemas: só C3 fica "Ajustar" */
  certo(r.includes('=CONT.SE(C2:C1048576;"Ajustar")') && /Resultado agora: 1/.test(r), r);
  await print(p, '51-montar-conta');
  await p.click('.pl-jmontar button.primary');
  await p.waitForTimeout(200);
  igual(await celula(p, 'J2'), '1');
});
await caso('v0.4.3: N04 botão direito no cabeçalho seleciona a coluna e insere depois dela', async () => {
  const cv = await p.locator('.pl-cv').boundingBox();
  await p.mouse.click(cv.x + 46 + 80 * 2 + 40, cv.y + 10, { button: 'right' });
  await p.waitForSelector('.pl-menu');
  const t = await p.locator('.pl-menu').innerText();
  certo(/Inserir coluna antes/.test(t) && /Inserir coluna depois/.test(t) && /Excluir coluna C/.test(t) && /Largura da coluna/.test(t) && /Ajustar à largura/.test(t), t);
  await print(p, '52-menu-cabecalho');
  await p.click('.pl-menu button:has-text("Inserir coluna depois")');
  await p.waitForTimeout(200);
  igual(await celula(p, 'C1'), 'Situação');
  igual(await celula(p, 'D1'), '', 'a coluna nova devia entrar em D');
  igual(await celula(p, 'E1'), 'Qtd. amostras');
  /* linha: inserir antes */
  await p.mouse.click(cv.x + 20, cv.y + 24 + 22 * 2 + 10, { button: 'right' });
  await p.waitForSelector('.pl-menu');
  await p.click('.pl-menu button:has-text("Inserir linha antes")');
  await p.waitForTimeout(200);
  igual(await celula(p, 'A3'), '', 'a linha nova devia entrar na 3');
  igual(await celula(p, 'A4'), 'L-013');
});
await caso('v0.4.3: Ctrl+B põe negrito; dica mostra Ctrl+B; Início e "chega depois da v1.0.0"', async () => {
  await celula(p, 'A2');
  await p.keyboard.press('Control+b');
  await p.waitForTimeout(150);
  await p.click('.tabs .tab:has-text("Página Inicial")');
  igual(await p.locator('.ribbon [data-cmd="formatar.negrito"]').getAttribute('aria-pressed'), 'true');
  await p.hover('.ribbon [data-cmd="formatar.negrito"]');
  await p.waitForSelector('.dica-cmd');
  certo((await p.locator('.dica-cmd').innerText()).includes('Ctrl+B'), 'dica sem Ctrl+B');
  await p.mouse.wheel(0, 120);
  await p.waitForTimeout(150);
  igual(await p.locator('.dica-cmd').count(), 0, 'a dica não sumiu com a roda do mouse');
  await p.mouse.move(600, 500);
  await p.click('.tabs .tab:has-text("Dados")');
  igual(await p.locator('.ribbon [data-cmd="dados.dinamica"]').getAttribute('data-nota'), 'Chega depois da v1.0.0.');
  await p.goto(BASE + '#/');
  await p.waitForSelector('.pagina');
  certo((await p.locator('[data-novo=planilha]').getAttribute('data-dica')).includes('Abrir e salvar Excel chega na v0.5.0'), 'dica do Início');
});
await ctx.close();

({ ctx, p } = await novaPagina());
await caso('v0.4.3: quadro: dica do Colar fala de post-it, Ctrl+B põe negrito no post-it, faixa compacta', async () => {
  await p.goto(BASE + '#/postits');
  await p.waitForSelector('[data-novo=postits]');
  await p.click('[data-novo=postits]');
  await p.waitForSelector('.qd-vazio');
  await p.click('.tabs .tab:has-text("Página Inicial")');
  await p.hover('.ribbon [data-cmd="editar.colar"]');
  await p.waitForSelector('.dica-cmd');
  const d = await p.locator('.dica-cmd').innerText();
  certo(/post-it/.test(d) && !/Excel|fórmula/.test(d), d);
  await p.mouse.move(600, 500);
  igual(await p.locator('.ribbon .rbb').count(), 0, 'o quadro ainda tem botões grandes na Página Inicial');
  await p.click('.tabs .tab:has-text("Inserir")');
  await cmd(p, 'inserir.postit');
  await p.waitForSelector('.qi-postit');
  await escolher(p, '.qi-postit');
  await p.keyboard.press('Control+b');
  await p.waitForTimeout(150);
  await p.click('.tabs .tab:has-text("Página Inicial")');
  igual(await p.locator('.ribbon [data-cmd="formatar.negrito"]').getAttribute('aria-pressed'), 'true');
});
await ctx.close();

({ ctx, p } = await novaPagina({ viewport: { width: 800, height: 700 } }));
await caso('v0.4.3: em 800 px a faixa mostra a seta "tem mais" e rola com ela', async () => {
  await novaPlanilha(p);
  await p.waitForSelector('.rb-rolar.dir');
  const antes = await p.evaluate(() => document.querySelector('.ribbon').scrollLeft);
  await p.click('.rb-rolar.dir');
  await p.waitForTimeout(600);
  const depois = await p.evaluate(() => document.querySelector('.ribbon').scrollLeft);
  certo(depois > antes, 'não rolou');
  certo(await p.locator('.rb-rolar.esq').count() === 1, 'sem a seta de voltar');
  await print(p, '53-faixa-800');
});
await ctx.close();

/* ---------- v0.4.3.1: correções da aprovação da v0.4.3 ---------- */
({ ctx, p } = await novaPagina());
async function frasesDe(p, ref) {
  await celula(p, ref);
  await p.click('.tabs .tab:has-text("Fórmulas")');
  await cmd(p, 'formula.explicar');
  await p.waitForSelector('.pl-jexp');
  const t = await p.locator('.pl-frase').innerText();
  await p.keyboard.press('Escape');
  await p.waitForTimeout(80);
  return t;
}
await caso('v0.4.3.1: Explicar com português certo (pelo, da, é igual a, está entre, datas, SE dentro de SE, aba, sem parêntese dentro de parêntese)', async () => {
  await novaPlanilha(p);
  await digitarEm(p, 'A1', ['Lote', 'L-012', 'L-013']);
  await digitarEm(p, 'B1', ['Cloro livre', '1,2', '3']);
  await digitarEm(p, 'C1', ['Qtd', '10', '5']);
  await digitarEm(p, 'D1', ['Conformes', '9', '5']);
  await digitarEm(p, 'E1', ['Data', '01/10/2026', '02/10/2026']);
  await digitarEm(p, 'F2', ['=D2/C2']);
  await digitarEm(p, 'G2', ['=MÉDIA(B2:B3)']);
  await digitarEm(p, 'H2', ['=SE(E(B2>=0,5;B2<=2);"OK";"Ajustar")']);
  await digitarEm(p, 'I2', ['=SE(B2>2;"Alto";SE(B2>1;"Médio";"OK"))']);
  await digitarEm(p, 'J2', ['=HOJE()-E2']);
  await digitarEm(p, 'K2', ['=CONT.SE(A2:A3;"L-012")']);
  await digitarEm(p, 'L2', ['=SOMASE(A2:A3;"L-012";C2:C3)']);
  await digitarEm(p, 'M2', ['=SEQUÊNCIA(3)']);
  await digitarEm(p, 'N2', ['=E(B2>1;C2<20)']);
  const f = {};
  for (const r of ['F2', 'G2', 'H2', 'I2', 'J2', 'K2', 'L2', 'M2', 'N2']) f[r] = await frasesDe(p, r);
  certo(/Divide a coluna Conformes \(D2 = 9\) pela coluna Qtd \(C2 = 10\)/.test(f.F2), f.F2);
  certo(/média da coluna Cloro livre \(B2:B3\)/.test(f.G2) && !/de a coluna/.test(f.G2), f.G2);
  certo(/estiver entre 0,5 e 2/.test(f.H2), f.H2);
  certo(/se não, olha de novo: se a coluna Cloro livre \(B2 = 1,2\) for maior que 1, mostra "Médio"; se não, mostra "OK"/.test(f.I2), f.I2);
  certo(/Conta os dias de 01\/10\/2026 \(E2\) até hoje/.test(f.J2) && !/46\d\d\d/.test(f.J2), f.J2);
  certo(/células da coluna Lote \(A2:A3\) são iguais a "L-012"/.test(f.K2), f.K2);
  certo(/nas linhas em que a coluna Lote \(A2:A3\) é igual a "L-012"/.test(f.L2), f.L2);
  certo(!/\([^()]*\([^()]*\)[^()]*\)/.test(f.M2), 'parêntese dentro de parêntese: ' + f.M2);
  certo(/Confere se .* é maior que 1 e .* é menor que 20/.test(f.N2) && !/for maior/.test(f.N2), f.N2);
});
await caso('v0.4.3.1: conta circular: um aviso só, no Explicar e no Problemas; Esc fecha a lista', async () => {
  await digitarEm(p, 'P3', ['=P4+1', '=P3+1']);
  await p.waitForTimeout(500);
  await celula(p, 'P3');
  await p.click('.tabs .tab:has-text("Fórmulas")');
  await cmd(p, 'formula.explicar');
  await p.waitForSelector('.pl-porque');
  const t = await p.locator('.pl-porque').innerText();
  certo(t.includes('P3 e P4 dependem uma da outra, então as duas ficam 0. Apague uma das contas.'), t);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(100);
  await p.click('.pl-lamp');
  await p.waitForSelector('.pl-problemas');
  const itens = await p.locator('.pl-problemas li').allInnerTexts();
  const circ = itens.filter((x) => /dependem uma da outra/.test(x));
  igual(circ.length, 1, 'um aviso só para as duas células: ' + itens.join(' | '));
  await p.keyboard.press('Escape');
  await p.waitForTimeout(150);
  igual(await p.locator('.pl-problemas').count(), 0, 'o Esc não fechou a lista de Problemas');
});
await caso('v0.4.3.1: R1=R2 e R2=R1, e três células em círculo, não deixam a tela em branco nem dão #CALC!', async () => {
  const erros0 = errosConsole.length;
  await digitarEm(p, 'R1', ['=R2', '=R1']);
  await digitarEm(p, 'T10', ['=T11', '=T12', '=T10']);
  await p.waitForTimeout(600);
  certo(await p.locator('.pl-cv').isVisible(), 'a planilha sumiu (tela em branco)');
  igual(await celula(p, 'R1'), '0');
  igual(await celula(p, 'T10'), '0');
  igual(await celula(p, 'T11'), '0');
  igual(await celula(p, 'T12'), '0');
  igual(errosConsole.length, erros0, 'erro no console: ' + errosConsole.slice(erros0).join(' | '));
  await p.click('.pl-lamp');
  await p.waitForSelector('.pl-problemas');
  const itens = (await p.locator('.pl-problemas li').allInnerTexts()).join(' | ');
  certo(itens.includes('R1 e R2 dependem uma da outra'), itens);
  certo(itens.includes('T10, T11 e T12 dependem umas das outras'), itens);
  certo(!/depende dela mesma/.test(itens), 'ainda diz "depende dela mesma": ' + itens);
  await p.keyboard.press('Escape');
  await celula(p, 'T11');
  await p.click('.tabs .tab:has-text("Fórmulas")');
  await cmd(p, 'formula.explicar');
  await p.waitForSelector('.pl-porque');
  certo((await p.locator('.pl-porque').innerText()).includes('T10, T11 e T12 dependem umas das outras, então todas ficam 0'), await p.locator('.pl-porque').innerText());
  await p.keyboard.press('Escape');
});
await caso('v0.4.3.1: a caixa de nome mostra C:C com a coluna inteira e 3:3 com a linha inteira; digitar C:C seleciona a coluna', async () => {
  await p.locator('.pl-nome').click();
  await p.locator('.pl-nome').fill('C:C');
  await p.locator('.pl-nome').press('Enter');
  await p.waitForTimeout(150);
  igual(await p.locator('.pl-nome').inputValue(), 'C:C');
  const cv = await p.locator('.pl-cv').boundingBox();
  await p.mouse.click(cv.x + 20, cv.y + 24 + 22 * 2 + 10);
  await p.waitForTimeout(120);
  igual(await p.locator('.pl-nome').inputValue(), '3:3');
  await p.locator('.pl-nome').click();
  await p.locator('.pl-nome').fill('B:D');
  await p.locator('.pl-nome').press('Enter');
  await p.waitForTimeout(150);
  igual(await p.locator('.pl-nome').inputValue(), 'B:D');
});
await ctx.close();

({ ctx, p } = await novaPagina());
await caso('v0.4.3.1: Montar a conta começa vazio, com exemplos da planilha, prévia com 4 casas e as receitas novas', async () => {
  await novaPlanilha(p);
  await digitarEm(p, 'A1', ['Lote', 'L-001', 'L-002', 'L-003']);
  await digitarEm(p, 'B1', ['Situação', 'OK', 'Ajustar', 'OK']);
  await digitarEm(p, 'C1', ['Valor', '1', '2', '2']);
  await digitarEm(p, 'D1', ['Data', '01/10/2026', '15/10/2026', '30/10/2026']);
  await celula(p, 'F1');
  await p.click('.tabs .tab:has-text("Fórmulas")');
  await cmd(p, 'formula.montar');
  await p.waitForSelector('.pl-jmontar');
  igual(await p.locator('.pl-jmontar select').first().inputValue(), '', 'a coluna devia começar vazia');
  certo((await p.locator('.pl-jmontar select').first().innerText()).includes('Escolha a coluna'), 'sem "Escolha a coluna"');
  certo((await p.locator('.pl-montar-d .qd-dica').first().innerText()).includes('Quantas linhas de Situação estão como "OK"'), await p.locator('.pl-montar-d .qd-dica').first().innerText());
  igual(await p.locator('.pl-montar-r').count(), 0, 'não devia mostrar conta antes de escolher');
  /* média: 5/3 com no máximo 4 casas */
  await p.click('.pl-montar-l button:has-text("Média de")');
  await p.locator('.pl-jmontar select').first().selectOption({ label: 'Valor (C)' });
  await p.waitForTimeout(120);
  const r = await p.locator('.pl-montar-r').innerText();
  certo(/Resultado agora: 1,6667\b/.test(r), r);
  /* dias: começa vazio, avisa da célula vazia, nunca mostra 46320 */
  await p.click('.pl-montar-l button:has-text("Dias entre")');
  igual(await p.locator('.pl-jmontar input').first().inputValue(), '', 'a célula devia começar vazia');
  certo((await p.locator('.pl-jmontar input').first().getAttribute('placeholder')).includes('Escolha a célula da data'), 'placeholder');
  igual(await p.locator('.pl-montar-r').count(), 0);
  await p.locator('.pl-jmontar input').first().fill('H1');
  await p.waitForTimeout(100);
  const dm = await p.locator('.pl-montar-d').innerText();
  certo(dm.includes('A célula H1 está vazia') && dm.includes('Escolha uma célula que tenha uma data'), dm);
  certo(!/46\d{3}|Resultado agora/.test(dm), 'não devia mostrar resultado (46320): ' + dm);
  igual(await p.locator('.pl-jmontar .btn.primary').isDisabled(), true, 'o botão Pôr devia ficar desligado');
  /* contar entre duas datas */
  await p.click('.pl-montar-l button:has-text("Contar entre duas datas")');
  await p.locator('.pl-jmontar select').first().selectOption({ label: 'Data (D)' });
  const ins = p.locator('.pl-jmontar input');
  await ins.nth(0).fill('01/10/2026');
  await ins.nth(1).fill('20/10/2026');
  await p.waitForTimeout(120);
  const r2 = await p.locator('.pl-montar-r').innerText();
  certo(/CONT\.SES\(D2:D1048576;">="&DATA\(2026;10;1\);D2:D1048576;"<="&DATA\(2026;10;20\)\)/.test(r2) && /Resultado agora: 2/.test(r2), r2);
  /* desvio padrão */
  await p.click('.pl-montar-l button:has-text("Desvio padrão")');
  await p.locator('.pl-jmontar select').first().selectOption({ label: 'Valor (C)' });
  await p.waitForTimeout(120);
  const r3 = await p.locator('.pl-montar-r').innerText();
  certo(/DESVPAD\.A\(C2:C1048576\)/.test(r3) && /Resultado agora: 0,5774/.test(r3), r3);
  await print(p, '54-montar-vazio');
  await p.keyboard.press('Escape');
});
await ctx.close();

({ ctx, p } = await novaPagina());
await caso('v0.4.3.1: código com zero na frente: pergunta, lembra a escolha da coluna e vale também na colagem', async () => {
  await novaPlanilha(p);
  await celula(p, 'A2');
  await p.keyboard.type('001');
  await p.keyboard.press('Enter');
  await p.waitForSelector('.pl-jzeros');
  certo((await p.locator('.pl-jzeros').innerText()).includes('001'), 'a janela não cita o código');
  await print(p, '55-zero-pergunta');
  await p.click('.pl-jzeros button:has-text("Manter como texto")');
  await p.waitForTimeout(150);
  igual(await celula(p, 'A2'), '001');
  /* a coluna lembra: sem pergunta */
  await digitarEm(p, 'A3', ['002']);
  igual(await p.locator('.pl-jzeros').count(), 0, 'perguntou de novo');
  igual(await celula(p, 'A3'), '002');
  igual(await celula(p, 'A4'), '', 'o Enter devia ter descido uma linha');
  /* outra coluna: pergunta; Virar número */
  await celula(p, 'B2');
  await p.keyboard.type('007');
  await p.keyboard.press('Enter');
  await p.waitForSelector('.pl-jzeros');
  await p.click('.pl-jzeros button:has-text("Virar número")');
  await p.waitForTimeout(150);
  igual(await celula(p, 'B2'), '7');
  /* cancelar: continua editando e não grava */
  await celula(p, 'C2');
  await p.keyboard.type('003');
  await p.keyboard.press('Enter');
  await p.waitForSelector('.pl-jzeros');
  await p.click('.pl-jzeros button:has-text("Cancelar")');
  await p.waitForTimeout(150);
  igual(await p.locator('.pl-jzeros').count(), 0);
  await p.keyboard.press('Escape');
  igual(await celula(p, 'C2'), '', 'cancelar não devia gravar');
  /* 0, 00 e 000 não perguntam (não é código com zero na frente) */
  await celula(p, 'E2');
  await p.keyboard.type('000');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(150);
  igual(await p.locator('.pl-jzeros').count(), 0, 'perguntou para 000');
  igual(await celula(p, 'E2'), '0');
  /* colagem */
  await celula(p, 'D1');
  await colarTexto(p, '001\n002\n0,5');
  await p.waitForSelector('.pl-jzeros');
  certo((await p.locator('.pl-jzeros').innerText()).includes('2 códigos'), await p.locator('.pl-jzeros').innerText());
  await p.click('.pl-jzeros button:has-text("Manter como texto")');
  await p.waitForTimeout(200);
  igual(await celula(p, 'D1'), '001');
  igual(await celula(p, 'D2'), '002');
  igual(await celula(p, 'D3'), '0,5');
  /* o menu do cabeçalho deixa desfazer a escolha da coluna */
  const cv = await p.locator('.pl-cv').boundingBox();
  await p.mouse.click(cv.x + 46 + 40, cv.y + 10, { button: 'right' });
  await p.waitForSelector('.pl-menu');
  certo((await p.locator('.pl-menu').innerText()).includes('Zeros à esquerda: perguntar de novo (hoje: texto)'), await p.locator('.pl-menu').innerText());
  await p.click('.pl-menu button:has-text("Zeros à esquerda")');
  await p.waitForTimeout(150);
  await digitarEm(p, 'A6', ['004']);
  await p.waitForSelector('.pl-jzeros');
  await p.keyboard.press('Escape');
});
await ctx.close();

/* ---------- v0.4.4: revisão de layout ---------- */
({ ctx, p } = await novaPagina());
await caso('v0.4.4: Início sem título repetido nem parágrafo; Novo compacto; filtro único recolhível acha pelo nome, tipo e ordem', async () => {
  await p.goto(BASE + '#/');
  await p.waitForSelector('[data-novo]');
  igual(await p.locator('.pagina > h2').count(), 0, 'título repetido');
  igual(await p.locator('.pagina > p.sub').count(), 0, 'parágrafo de texto');
  /* cria uma planilha "Cloro" e um quadro */
  await p.click('[data-novo=planilha]');
  await p.waitForSelector('.pl-cv');
  await p.goto(BASE + '#/');
  await p.click('[data-novo=postits]');
  await p.waitForSelector('.qd-vazio');
  await p.goto(BASE + '#/');
  await p.waitForSelector('.arq');
  igual(await p.locator('.arq').count(), 2);
  const altNovo = (await p.locator('[data-novo=planilha]').boundingBox()).height;
  certo(altNovo <= 52, 'botão Novo alto demais: ' + altNovo);
  igual(await p.locator('.filtro-p').count(), 0, 'o painel do filtro devia começar fechado');
  certo((await p.locator('.filtro-b').innerText()).includes('Mais recentes'), await p.locator('.filtro-b').innerText());
  await p.click('.filtro-b');
  await p.waitForSelector('.filtro-p');
  await p.locator('.filtro-p select').first().selectOption('postits');
  await p.waitForTimeout(100);
  igual(await p.locator('.arq').count(), 1);
  certo((await p.locator('.secao .cont').innerText()).includes('1 de 2'), await p.locator('.secao .cont').innerText());
  certo((await p.locator('.filtro-b').innerText()).includes('Post-its'), 'resumo sem o tipo: ' + await p.locator('.filtro-b').innerText());
  await p.locator('.filtro-p input').fill('nada disso');
  await p.waitForTimeout(100);
  igual(await p.locator('.arq').count(), 0);
  certo((await p.locator('.vazio-lista').innerText()).includes('Nenhum arquivo com esse filtro'));
  await p.click('.filtro-p button:has-text("Limpar")');
  await p.waitForTimeout(100);
  igual(await p.locator('.arq').count(), 2);
  await p.locator('.filtro-p select').nth(1).selectOption('nome');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(100);
  igual(await p.locator('.filtro-p').count(), 0, 'Esc devia fechar o painel do filtro');
  /* o filtro continua igual ao voltar para a página */
  await p.click('.rail a[href="#/planilha"]');
  await p.click('.rail a[href="#/"]');
  await p.waitForSelector('.filtro-b');
  certo((await p.locator('.filtro-b').innerText()).includes('Nome (A a Z)'), await p.locator('.filtro-b').innerText());
  await print(p, '60-inicio-compacto');
});
await caso('v0.4.4: lista de Planilhas com um botão Nova planilha e o filtro; Documentos com o aviso numa linha só', async () => {
  await p.click('.rail a[href="#/planilha"]');
  await p.waitForSelector('[data-novo=planilha]');
  igual(await p.locator('[data-novo]').count(), 1);
  certo((await p.locator('[data-novo=planilha]').innerText()).includes('Nova planilha'));
  igual(await p.locator('.arq').count(), 1);
  await p.click('.rail a[href="#/docx"]');
  await p.waitForSelector('[data-novo=docx]');
  const t = await p.locator('.pagina').innerText();
  igual((t.match(/v0\.7\.0/g) || []).length, 2, 'a versão do editor aparece demais: ' + t); // aviso + selo do botão
});
await caso('v0.4.4: Opções em seções que abrem e fecham; cabeçalho mostra o que está escolhido; "Tema" abre direto na seção', async () => {
  await p.goto(BASE + '#/');
  await p.locator('.topbar [aria-label="Opções"]').click();
  await p.waitForSelector('.opcoes');
  for (const id of ['tema', 'tela', 'perfil', 'sobre']) if (await p.locator(`.op-sec[data-sec=${id}].aberta`).count()) await p.locator(`.op-sec[data-sec=${id}] .op-cab`).click();
  igual(await p.locator('.tema-b').count(), 0, 'os temas deviam ficar escondidos');
  const alt = (await p.locator('.opcoes').boundingBox()).height;
  certo(alt < 320, 'Opções alta demais fechada: ' + alt);
  certo((await p.locator('.op-sec[data-sec=tema] .res').innerText()).length > 2, 'sem o tema no cabeçalho');
  certo((await p.locator('.op-sec[data-sec=sobre] .res').innerText()).includes('v0.4.4'));
  await p.locator('.op-sec[data-sec=tema] .op-cab').click();
  igual(await p.locator('.tema-b').count(), 17);
  await p.locator('.tema-b[data-tema=campo]').click();
  certo((await p.locator('.op-sec[data-sec=tema] .res').innerText()).includes('Campo'));
  await p.locator('.tema-b[data-tema=petroleo]').click();
  await p.locator('.op-sec[data-sec=tema] .op-cab').click();
  igual(await p.locator('.tema-b').count(), 0);
  await p.keyboard.press('Escape');
  await p.keyboard.press('Control+k');
  await p.keyboard.type('tema');
  await p.keyboard.press('Enter');
  await p.waitForSelector('.opcoes');
  igual(await p.locator('.tema-b').count(), 17, 'o comando Tema devia abrir já na seção Tema');
  await print(p, '61-opcoes-sanfona');
  await p.keyboard.press('Escape');
});
await caso('v0.4.4: abas da faixa sem pílula (cantos retos), a ativa sublinhada', async () => {
  await p.goto(BASE + '#/planilha');
  await p.click('[data-novo=planilha]');
  await p.waitForSelector('.tab.active');
  const r = await p.locator('.tab.active').evaluate((el) => { const c = getComputedStyle(el); return { raio: c.borderTopLeftRadius, borda: c.borderBottomWidth, fundo: c.backgroundColor }; });
  igual(r.raio, '0px');
  igual(r.borda, '2px');
  const raioBtn = await p.locator('.topbar .iconbtn').first().evaluate((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius));
  certo(raioBtn <= 4, 'botão arredondado: ' + raioBtn);
});
await ctx.close();
({ ctx, p } = await novaPagina({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }));
await caso('v0.4.4 celular: Novo em três botões numa linha; planilha sem a barra "Planilha" embaixo (só aparece com Soma/Média)', async () => {
  await p.goto(BASE + '#/');
  await p.waitForSelector('[data-novo]');
  const ys = [];
  for (const t of ['planilha', 'docx', 'postits']) ys.push(Math.round((await p.locator(`[data-novo=${t}]`).boundingBox()).y));
  certo(ys[0] === ys[1] && ys[1] === ys[2], 'os três botões deviam ficar na mesma linha: ' + ys);
  await print(p, '62-celular-inicio');
  await p.locator('[data-novo=planilha]').tap();
  await p.waitForSelector('.pl-cv');
  await p.waitForTimeout(300);
  igual(await p.locator('.foot').isVisible(), false, 'a barra de baixo devia sumir sem conta');
  await digitarEm(p, 'A1', ['1', '2']);
  await celula(p, 'A1');
  await p.locator('.pl-nome').click();
  await p.locator('.pl-nome').fill('A1:A2');
  await p.locator('.pl-nome').press('Enter');
  await p.waitForTimeout(300);
  certo(await p.locator('.foot').isVisible(), 'com A1:A2 selecionado a barra devia mostrar a Soma');
  certo((await p.locator('.foot').innerText()).includes('3'), await p.locator('.foot').innerText());
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
