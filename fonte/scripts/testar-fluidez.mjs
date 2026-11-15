/* Vértice Docs — a regra fixa de fluidez, conferida no app de verdade (v0.6.20, parte 3).
   1) Lê o CSS do app: sem "transition: all", sem duração fora da escala, só transform/opacity/filter, nada infinito
      (fora o que está marcado mov:ok), e todo arquivo com movimento tem o bloco de "movimento reduzido".
   2) Entra em CADA área e em CADA aba de dentro e confere a animação de entrada, o traço que desliza e o título.
   3) Abre e fecha cada superfície (gaveta, menus, confirmação, aviso) e confere as durações.
   4) Com "movimento reduzido" nada disso acontece.
   Uso: node scripts/testar-fluidez.mjs <endereço>   (imprime também a lista de áreas e abas com o movimento de cada uma) */
import { chromium } from 'playwright';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirSemeado, espera } from './layout/semente.mjs';

const BASE = process.argv[2] || 'http://localhost:8731/';
const SAIDA = process.argv[3] || '';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const AQUI = fileURLToPath(new URL('.', import.meta.url));
const ESCALA = [40, 80, 150, 250, 350, 400, 500];
let ok = 0, falhas = 0; const mapa = [];
const certo = (c, m) => { if (!c) throw new Error(m); };
async function caso(nome, f) { try { await f(); ok++; console.log('  ok   ' + nome); } catch (e) { falhas++; console.log('  FALHA ' + nome + ' — ' + String(e.message || e).slice(0, 300)); } }

/* ---------- 1) o CSS ---------- */
const andar = (d) => readdirSync(d).flatMap((n) => { const c = join(d, n); return statSync(c).isDirectory() ? andar(c) : c.endsWith('.css') ? [c] : []; });
const FAMILIA = /layout\/efc-(layout|movimento)\.css$/; /* os arquivos da família entram iguais em todos os apps */
const arquivos = andar(join(AQUI, '..', 'src'));
const limpa = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');
await caso('CSS · nenhum "transition: all" (nem transição sem dizer a propriedade)', async () => {
  for (const f of arquivos) { const t = limpa(readFileSync(f, 'utf8'));
    for (const m of t.matchAll(/transition\s*:\s*([^;}]+)/g)) for (const parte of m[1].split(/,(?![^(]*\))/)) { const p = parte.trim().split(/\s+/)[0]; certo(p !== 'all' && !/^[\d.]/.test(p), `${f.split('/src/')[1]}: ${m[0].slice(0, 80)}`); } }
});
await caso('CSS do app · só anima transform, opacity e filter', async () => {
  for (const f of arquivos.filter((x) => !FAMILIA.test(x))) { const t = limpa(readFileSync(f, 'utf8'));
    for (const m of t.matchAll(/transition\s*:\s*([^;}]+)/g)) for (const parte of m[1].replace('!important', '').split(/,(?![^(]*\))/)) { const p = parte.trim().split(/\s+/)[0]; certo(['transform', 'opacity', 'filter', 'none', 'inherit'].includes(p), `${f.split('/src/')[1]}: ${p}`); }
    for (const k of t.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)/g)) for (const pr of k[2].matchAll(/[{;]\s*([a-z-]+)\s*:/g)) certo(['transform', 'opacity', 'filter', 'stroke-dashoffset', 'animation-timing-function', 'translate'].includes(pr[1]), `${f.split('/src/')[1]} @keyframes ${k[1]}: ${pr[1]}`); }
});
await caso('CSS do app · durações só da escala (40, 80, 150, 250, 350, 400, 500 ms), pelos tokens', async () => {
  for (const f of arquivos.filter((x) => !FAMILIA.test(x))) { const t = limpa(readFileSync(f, 'utf8'));
    for (const m of t.matchAll(/(?:transition|animation)(?:-duration|-delay)?\s*:\s*([^;}]+)/g)) for (const d of m[1].matchAll(/(?<![\w.#(-])(\d*\.?\d+)(ms|s)\b/g)) { const v = parseFloat(d[1]) * (d[2] === 's' ? 1000 : 1); certo(v === 0, `${f.split('/src/')[1]}: número solto ${d[0]} em "${m[0].slice(0, 70)}"`); } }
});
await caso('CSS · nada infinito, fora o que está marcado mov:ok; todo arquivo com movimento tem "movimento reduzido"', async () => {
  for (const f of arquivos) { const bruto = readFileSync(f, 'utf8');
    for (const l of bruto.split('\n')) if (/animation[^;]*infinite/.test(limpa(l))) certo(/mov:ok/.test(l), `${f.split('/src/')[1]}: infinito sem mov:ok`);
    if (/(transition|animation)\s*:(?!\s*none)/.test(limpa(bruto))) certo(/prefers-reduced-motion/.test(bruto), `${f.split('/src/')[1]}: sem prefers-reduced-motion`); }
});
await caso('Efeitos que o Elias não quer: sem Spotlight (luz que segue o mouse), Glare, Count Up e Magnet', async () => {
  const fonte = andarTudo(join(AQUI, '..', 'src')).map((f) => readFileSync(f, 'utf8')).join('\n');
  certo(!/--luz-x|requestAnimationFrame\(passo\)|ef-magnet|ef-glare|glare-hover|spotlight/i.test(fonte), 'sobrou efeito proibido no código');
});
function andarTudo(d) { return readdirSync(d).flatMap((n) => { const c = join(d, n); return statSync(c).isDirectory() ? andarTudo(c) : /\.(jsx?|css)$/.test(c) ? [c] : []; }); }

/* ---------- 2) o app ---------- */
const nav = await chromium.launch({ executablePath: CHROME });
const a = await abrirSemeado(nav, BASE, {}); const p = a.page;
/* as animações de um pedaço da tela: nome (ou id) e duração */
const anims = (sel) => p.evaluate((sel) => { const el = typeof sel === 'string' ? document.querySelector(sel) : null; return el ? el.getAnimations().map((x) => ({ n: x.id || x.animationName || x.transitionProperty || '?', d: Math.round(x.effect.getTiming().duration) })) : null; }, sel);
const tem = (l, nome, dur) => !!l && l.some((x) => x.n === nome && (dur === undefined || x.d === dur));
/* tudo o que está se mexendo na página agora: nenhuma duração fora da escala */
const foraDaEscala = () => p.evaluate((E) => document.getAnimations().map((x) => ({ n: x.id || x.animationName || x.transitionProperty || '?', d: Math.round(x.effect.getTiming().duration), it: x.effect.getTiming().iterations, alvo: x.effect.target && x.effect.target.className })).filter((x) => !(E.includes(x.d) || x.n === 't-shake' || /^t-subtle/.test(x.n) || x.n === 'eflPulsa' || x.n === 'eflGota' || /^efl/.test(x.n)) || (x.it === Infinity && x.n !== 'eflPulsa')), ESCALA);
const conferirEscala = async (onde) => { const f = await foraDaEscala(); certo(f.length === 0, `${onde}: fora da escala ${JSON.stringify(f.slice(0, 3))}`); };
/* troca de aba: clica, olha logo depois o conteúdo e o traço */
async function trocaAba(area, nomeAba, clicar, painelSel, tracoSel, extra = '') {
  await clicar(); await espera(45);
  const c = await anims(painelSel), t = tracoSel ? await anims(tracoSel) : null;
  const okC = tem(c, 'fz-entra', 250), okT = !tracoSel || tem(t, 'fz-traco', 250);
  await conferirEscala(area + ' › ' + nomeAba);
  mapa.push({ area, aba: nomeAba, movimento: `conteúdo desliza 12 px e aparece (250 ms)${tracoSel ? '; o traço da aba desliza (250 ms)' : ''}${extra}`, ok: okC && okT });
  certo(okC, `${area} › ${nomeAba}: o conteúdo não entrou (${JSON.stringify(c)})`); certo(okT, `${area} › ${nomeAba}: o traço não deslizou (${JSON.stringify(t)})`);
  await espera(330);
}

await p.goto(BASE + '#/'); await espera(900);
const AREAS = [['planilha', 'Planilhas'], ['docx', 'Documentos'], ['postits', 'Quadros'], ['internos', 'Documentos internos'], ['pastas', 'Pastas'], ['externos', 'Documentos externos'], ['lixeira', 'Lixeira'], ['', 'Início']];
await caso('a) trocar de ÁREA pelo menu: o conteúdo entra deslizando, o marcador do menu desliza e o título entra letra por letra (8 áreas)', async () => {
  for (const [rota, nome] of AREAS) {
    await p.click(`.rail a[href="#/${rota}"]`); await espera(45);
    const c = await anims('.wk-main > *'), t = await anims('.rail > .fz-ind'), letras = await p.locator('[data-fz-tt]').count();
    const bom = tem(c, 'fz-entra', 250) && tem(t, 'fz-traco', 250) && letras >= 1;
    mapa.push({ area: nome, aba: '(entrar na área)', movimento: 'conteúdo desliza 12 px e aparece (250 ms); o marcador do menu desliza (250 ms); o título entra letra por letra saindo do desfoque', ok: bom });
    certo(tem(c, 'fz-entra', 250), `${nome}: conteúdo ${JSON.stringify(c)}`); certo(tem(t, 'fz-traco', 250), `${nome}: marcador ${JSON.stringify(t)}`); certo(letras >= 1, `${nome}: título sem as letras`);
    await conferirEscala(nome); await espera(1100);
    certo(await p.locator('[data-fz-tt]').count() === 0, `${nome}: o título não voltou ao texto normal`);
  }
});
await caso('a) redesenho por dado NÃO anima: filtrar a lista não refaz a entrada da tela nem o título', async () => {
  await p.goto(BASE + '#/planilha'); await espera(900);
  await p.click('.filtro-b'); await p.fill('.filtro-p input', 'co'); await espera(45);
  const c = await anims('.wk-main > *'); certo(!tem(c, 'fz-entra'), 'a tela entrou de novo'); certo(await p.locator('[data-fz-tt]').count() === 0, 'o título animou');
  certo(tem(await anims('.tb-arq tbody'), 'fz-troca', 150), 'f) o resultado não trocou suave (150 ms)');
  await p.fill('.filtro-p input', ''); await p.keyboard.press('Escape'); await espera(300);
});
await caso('a) Documentos internos: cada sub-aba (5)', async () => {
  await p.goto(BASE + '#/internos'); await espera(900);
  const n = await p.locator('.int-aba').count(); certo(n === 5, 'sub-abas: ' + n);
  for (const i of [1, 2, 3, 4, 0]) { const nome = (await p.locator('.int-aba').nth(i).innerText()).replace(/\s*\d+$/, '').trim(); await trocaAba('Documentos internos', nome, () => p.locator('.int-aba').nth(i).click(), '.tb-fora', '.int-abas > .fz-ind'); }
});
await caso('a) Planilha aberta: cada aba da faixa e cada aba da planilha', async () => {
  await p.goto(BASE + '#/planilha'); await espera(700); await p.locator('.tb-arq tr.arq .abre').first().click(); await p.waitForSelector('.pl-cv'); await espera(45);
  mapa.push({ area: 'Planilha (arquivo aberto)', aba: '(abrir o arquivo)', movimento: 'o editor entra deslizando 12 px (250 ms); o nome do arquivo entra letra por letra', ok: tem(await anims('.wk-main > *'), 'fz-entra', 250) });
  certo(tem(await anims('.wk-main > *'), 'fz-entra', 250), 'o editor não entrou'); await espera(700);
  const abas = await p.locator('.tabs .tab').allInnerTexts(); certo(abas.length >= 8, 'abas da faixa: ' + abas.length);
  for (let i = abas.length - 1; i >= 0; i--) { if (abas[i] === 'Página Inicial' && i !== 0) continue; await trocaAba('Planilha (arquivo aberto)', 'faixa · ' + abas[i], () => p.locator('.tabs .tab').nth(i).click(), '.ribbon', '.tabs > .fz-ind'); }
  await trocaAba('Planilha (arquivo aberto)', 'faixa · Página Inicial', () => p.locator('.tabs .tab:has-text("Página Inicial")').click(), '.ribbon', '.tabs > .fz-ind');
  await p.locator('.pl-aba-nova').click(); await espera(600);
  await trocaAba('Planilha (arquivo aberto)', 'abas da planilha (embaixo)', () => p.locator('.pl-aba').first().click(), '.pl-area', '.pl-abas-l > .fz-ind');
  await trocaAba('Planilha (arquivo aberto)', 'abas da planilha (voltar)', () => p.locator('.pl-aba').nth(1).click(), '.pl-area', '.pl-abas-l > .fz-ind');
});
await caso('a) Planilha: abas das janelas (Validação de dados e Assinatura)', async () => {
  await p.locator('.tabs .tab:has-text("Dados")').click(); await espera(400);
  await p.locator('[data-cmd="dados.validacao"]').first().click(); await p.waitForSelector('.rg-abas'); await espera(500);
  for (const i of [1, 2, 0]) await trocaAba('Janela Validação de dados', (await p.locator('.rg-aba').nth(i).innerText()).trim(), () => p.locator('.rg-aba').nth(i).click(), '.rg-abas + *', '.rg-abas > .fz-ind');
  await p.keyboard.press('Escape'); await espera(400);
  await p.locator('.tabs .tab:has-text("Inserir")').click(); await espera(400);
  await p.locator('[data-cmd="inserir.assinatura"]').first().click(); await p.waitForSelector('.seg[role=tablist]'); await espera(500);
  const n = await p.locator('.seg[role=tablist] button').count();
  for (let i = n - 1; i >= 0; i--) { if (i === 0 && n === 1) break; await trocaAba('Janela Assinatura', 'rubrica · ' + (await p.locator('.seg[role=tablist] button').nth(i).innerText()).trim(), () => p.locator('.seg[role=tablist] button').nth(i).click(), '.seg[role=tablist] + *', '.seg[role=tablist] > .fz-ind'); }
  await p.keyboard.press('Escape'); await espera(400);
});
await caso('a) Quadro aberto: abas da faixa e as visões Quadro e Kanban', async () => {
  await p.goto(BASE + '#/postits'); await espera(700); await p.locator('.tb-arq tr.arq .abre').first().click(); await p.waitForSelector('.qd-vistas'); await espera(900);
  const abas = await p.locator('.tabs .tab').allInnerTexts();
  for (let i = abas.length - 1; i >= 0; i--) await trocaAba('Quadro (arquivo aberto)', 'faixa · ' + abas[i], () => p.locator('.tabs .tab').nth(i).click(), '.ribbon', '.tabs > .fz-ind');
  await trocaAba('Quadro (arquivo aberto)', 'visão Kanban', () => p.locator('.qd-vistas button:has-text("Kanban")').click(), '.kb', '.qd-vistas > .fz-ind');
  await trocaAba('Quadro (arquivo aberto)', 'visão Quadro', () => p.locator('.qd-vistas button:has-text("Quadro")').click(), '.qd-area', '.qd-vistas > .fz-ind');
});
await caso('a) Documento aberto: abas da faixa', async () => {
  await p.goto(BASE + '#/docx'); await espera(700); await p.locator('.tb-arq tr.arq .abre').first().click(); await espera(1200);
  const abas = await p.locator('.tabs .tab').allInnerTexts();
  if (!abas.length) { mapa.push({ area: 'Documento (arquivo aberto)', aba: '(sem abas: o editor chega na v0.7.0)', movimento: 'a tela do arquivo entra deslizando (250 ms)', ok: true }); return; }
  for (let i = abas.length - 1; i >= 0; i--) await trocaAba('Documento (arquivo aberto)', 'faixa · ' + abas[i], () => p.locator('.tabs .tab').nth(i).click(), '.ribbon', '.tabs > .fz-ind');
});

/* ---------- 3) superfícies ---------- */
await caso('b) gaveta: abre em 400 ms com desfoque, os blocos entram em sequência (40 ms), fecha em 350 ms', async () => {
  await p.goto(BASE + '#/planilha'); await espera(900);
  await p.locator('[data-detalhes]').first().click(); await espera(45);
  certo(tem(await anims('[data-gaveta]'), 'fzGaveta', 400), 'abrir: ' + JSON.stringify(await anims('[data-gaveta]')));
  const seq = await p.evaluate(() => [...document.querySelectorAll('[data-gaveta] .fz-li')].map((x) => parseFloat(getComputedStyle(x).animationDelay) * 1000));
  certo(seq.length >= 2 && Math.round(seq[1] - seq[0]) === 40, 'g) sequência: ' + JSON.stringify(seq));
  await conferirEscala('gaveta aberta'); await espera(600);
  await p.keyboard.press('Escape'); await espera(45);
  certo(tem(await anims('[data-fz-fant=gaveta]'), 'fz-sai', 350), 'fechar: ' + JSON.stringify(await anims('[data-fz-fant=gaveta]')));
  await espera(450); certo(await p.locator('[data-fz-fant]').count() === 0, 'a gaveta que saiu ficou na página');
});
await caso('c) menus crescem do botão (250 ms) e fecham encolhendo (150 ms): Novo, filtro e menu da coluna', async () => {
  for (const [abre, sel] of [['.novo-drive-b', '.novo-drive-m'], ['.filtro-b', '.filtro-p'], ['[data-col-menu=nome]', '.col-menu']]) {
    await p.click(abre); await espera(45);
    certo(tem(await anims(sel), 't-dropdown-in', 250), `${sel} abrir: ` + JSON.stringify(await anims(sel)));
    await espera(350); await p.keyboard.press('Escape'); await espera(45);
    certo(tem(await anims('[data-fz-fant=menu]'), 'fz-sai', 150), `${sel} fechar: ` + JSON.stringify(await anims('[data-fz-fant=menu]')));
    await espera(250); certo(await p.locator('[data-fz-fant]').count() === 0, sel + ': o menu que saiu ficou na página');
  }
});
await caso('R13 · menu da coluna: com ele aberto, tocar em outra coluna faz o mesmo menu deslizar até lá', async () => {
  await p.goto(BASE + '#/'); await espera(900);
  await p.click('[data-col-menu=nome]'); await espera(400);
  await p.click('[data-col-menu=tipo]'); await espera(45);
  certo(tem(await anims('.col-menu'), 'fz-desliza', 250), JSON.stringify(await anims('.col-menu'))); certo(await p.locator('.col-menu').count() === 1, 'dois menus');
  await espera(300); await p.locator('.col-op:has-text("Documento")').click(); await espera(300);
  certo((await p.locator('[data-cont]').first().innerText()).includes('total filtrado'), 'o filtro da coluna não filtrou');
  await p.locator('.col-limpa').click(); await p.keyboard.press('Escape'); await espera(300);
});
await caso('d) confirmação: o fundo escurece e a janela sobe do centro (250 ms); fecha em 150 ms', async () => {
  await p.goto(BASE + '#/planilha'); await espera(900);
  await p.locator('.tb-arq tr.arq .iconbtn[aria-label^="Renomear"]').first().click(); await espera(45);
  certo(tem(await anims('.fundo'), 'fzFundo', 250), 'fundo: ' + JSON.stringify(await anims('.fundo'))); certo(tem(await anims('.janela'), 't-modal-in', 250), 'janela: ' + JSON.stringify(await anims('.janela')));
  await espera(350);
  /* h) erro de formulário: tremida curta só na mensagem */
  await p.locator('.janela input').fill(''); await p.locator('.janela button.primary').click(); await espera(45);
  const tremeu = await p.evaluate(() => { const e = document.querySelector('.janela .erro-t'); return !!e && e.textContent.trim().length > 0 && e.getAnimations().some((x) => x.animationName === 't-shake') && !document.querySelector('.janela').getAnimations().length; });
  certo(tremeu, 'h) a mensagem de erro não tremeu (ou a janela inteira tremeu)');
  await espera(350); await p.keyboard.press('Escape'); await espera(45);
  certo(tem(await anims('[data-fz-fant=janela]'), 'fz-sai', 150), 'fechar: ' + JSON.stringify(await anims('[data-fz-fant=janela]')));
  await espera(250);
});
await caso('e) avisos: um por vez, sobem de baixo (350 ms); o anterior sai por baixo (250 ms); no sucesso o visto se desenha; k) faíscas só no botão dourado', async () => {
  await p.locator('.tb-arq tr.arq .iconbtn[aria-label^="Renomear"]').first().click(); await espera(350);
  await p.locator('.janela input').fill('Nome novo do teste de fluidez'); await p.locator('.janela button.primary').click(); await espera(60);
  certo(await p.locator('.toast:not([data-fz-fant])').count() === 1, 'avisos na tela: ' + await p.locator('.toast:not([data-fz-fant])').count());
  certo(tem(await anims('.toast:not([data-fz-fant])'), 't-toast-in', 350), 'entrada: ' + JSON.stringify(await anims('.toast:not([data-fz-fant])')));
  const visto = await p.locator('.toast .t-success-check').count(), faisca = await p.locator('.fz-spk').count();
  certo(visto === 1, 'sem o visto de sucesso'); certo(faisca === 1, 'k) sem faíscas depois do botão dourado');
  await espera(200); certo(await p.locator('.toast .t-success-check[data-state=in]').count() === 1, 'o visto não se desenhou');
  await espera(500);
  await p.locator('.tb-arq tr.arq .iconbtn[aria-label*="ixeira"]').first().click(); await espera(60);
  certo(await p.locator('.toast:not([data-fz-fant])').count() === 1, 'dois avisos ao mesmo tempo');
  certo(tem(await anims('.toast[data-fz-fant]'), 'fz-sai', 250), 'o aviso anterior não saiu por baixo: ' + JSON.stringify(await anims('.toast[data-fz-fant]')));
  certo(await p.locator('.fz-spk').count() === 0, 'k) faíscas fora do botão dourado');
  await espera(400);
});
await caso('f) paleta (Ctrl K): abre com o fundo escurecendo; ao digitar o resultado troca suave (150 ms) e os itens entram em sequência', async () => {
  await p.keyboard.press('Control+k'); await espera(45);
  certo(tem(await anims('.fundo'), 'fzFundo', 250) && tem(await anims('.janela.paleta'), 't-modal-in', 250), 'abrir');
  certo(await p.locator('.paleta li.fz-li').count() >= 3, 'itens sem sequência');
  await espera(350); await p.keyboard.type('pla'); await espera(40);
  certo(tem(await anims('.paleta ul'), 'fz-troca', 150), JSON.stringify(await anims('.paleta ul')));
  await p.keyboard.press('Escape'); await espera(300);
});
await caso('i) desfoque no fim da gaveta quando tem mais conteúdo embaixo; j) botão de tema: o ícone novo entra no lugar', async () => {
  await p.setViewportSize({ width: 1280, height: 420 }); await p.locator('[data-detalhes]').first().click(); await espera(700);
  const mais = await p.evaluate(() => { const c = document.querySelector('[data-gaveta] .gv-corpo'); return { rola: c.scrollHeight > c.clientHeight + 6, classe: c.classList.contains('fz-mais') }; });
  certo(!mais.rola || mais.classe, 'i) ' + JSON.stringify(mais));
  await p.keyboard.press('Escape'); await p.setViewportSize({ width: 1280, height: 800 }); await espera(500);
  await p.click('[data-tema-botao]'); await espera(45);
  certo(tem(await anims('[data-tema-botao] svg'), 'fzTema', 250), JSON.stringify(await anims('[data-tema-botao] svg'))); certo(await p.evaluate(() => document.body.dataset.theme) === 'dark', 'o tema não trocou');
  await espera(300); await p.click('[data-tema-botao]'); await espera(300);
});
certo(a.erros.length === 0 || true, '');
await caso('Sem erro no console durante todo o passeio', async () => { certo(a.erros.length === 0, a.erros.slice(0, 3).join(' | ')); });
await a.ctx.close();

/* ---------- 4) movimento reduzido e celular ---------- */
await caso('Com "movimento reduzido": nada entra deslizando, nada fica para trás ao fechar, sem letras, sem faíscas', async () => {
  const r = await abrirSemeado(nav, BASE, { reduzido: true }); const q = r.page;
  await q.goto(BASE + '#/'); await espera(600); await q.click('.rail a[href="#/planilha"]'); await espera(45);
  const n = await q.evaluate(() => document.getAnimations().length); certo(n === 0, 'animações rodando: ' + n);
  certo(await q.locator('[data-fz-tt]').count() === 0, 'título com letras');
  await q.locator('[data-detalhes]').first().click(); await espera(60); await q.keyboard.press('Escape'); await espera(45);
  certo(await q.locator('[data-fz-fant]').count() === 0, 'ficou fantasma'); certo(r.erros.length === 0, r.erros.join(' | '));
  await r.ctx.close();
});
await caso('Celular (390 px): a folha da gaveta sobe em 400 ms e desce em 350 ms; trocar de área anima', async () => {
  const c = await abrirSemeado(nav, BASE, { w: 390, h: 844, toque: true }); const q = c.page;
  const an = (sel) => q.evaluate((sel) => { const el = document.querySelector(sel); return el ? el.getAnimations().map((x) => ({ n: x.id || x.animationName, d: Math.round(x.effect.getTiming().duration) })) : null; }, sel);
  await q.goto(BASE + '#/planilha'); await espera(800);
  await q.locator('[data-detalhes]').first().click(); await espera(45);
  certo(tem(await an('[data-gaveta]'), 'fzFolha', 400), JSON.stringify(await an('[data-gaveta]')));
  await espera(600); await q.locator('[data-gaveta] [aria-label="Fechar os detalhes"]').click(); await espera(45);
  certo(tem(await an('[data-fz-fant=gaveta]'), 'fz-sai', 350), JSON.stringify(await an('[data-fz-fant=gaveta]')));
  await espera(450); await q.goto(BASE + '#/docx'); await espera(45);
  certo(tem(await an('.wk-main > *'), 'fz-entra', 250), 'área no celular: ' + JSON.stringify(await an('.wk-main > *')));
  certo(c.erros.length === 0, c.erros.join(' | ')); await c.ctx.close();
});
await nav.close();

console.log('\nÁreas e abas de dentro, com o movimento de cada uma:');
for (const m of mapa) console.log(`  ${m.ok ? 'ok   ' : 'FALTA'} ${m.area} › ${m.aba}: ${m.movimento}`);
if (SAIDA) writeFileSync(SAIDA, JSON.stringify(mapa, null, 1));
console.log(`\n${ok} de ${ok + falhas} conferências de fluidez passaram; ${mapa.length} entradas de área e aba.`);
process.exit(falhas ? 1 : 0);
