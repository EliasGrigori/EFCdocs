/* Vértice Docs v0.6.48 — testes no navegador do Quadro: D-76 (fundo de bolinhas em duas camadas), D-77 (código Q-xxx
   em cima da curva da forma Início/Fim) e D-78 (moldura de seleção afastada do item). Quadro novo com itens inventados.
   Falha na v0.6.46/v0.6.47 e passa na v0.6.48. Uso: node scripts/testar-quadro-v0648.mjs <endereço> */
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const nav = await chromium.launch({ executablePath: CHROME });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce' });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
const erros = [];
p.on('pageerror', (e) => erros.push(String(e)));
let falhas = 0;
const caso = (nome, ok, info = '') => { console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome}${info ? ' — ' + info : ''}`); if (!ok) falhas++; };
await p.goto(BASE + '#/'); await p.click('.rail a[href="#/postits"]'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
const escrever = async (t) => { const ta = p.locator('textarea.qd-edita'); await ta.waitFor(); await ta.fill(t); await ta.press('Control+Enter'); await p.waitForTimeout(150); };
for (const [c, t] of [['inserir.inicio', 'Início'], ['inserir.processo', 'Conferir lote'], ['inserir.postit', 'Ligar para o cliente'], ['inserir.decisao', 'Aprovado?']]) {
  await p.locator(`[data-cmd="${c}"]`).first().click(); await escrever(t);
}
await p.keyboard.press('Escape');

/* D-76: quantas camadas de bolinhas aparecem atrás dos itens (a área é transparente; conta até o primeiro fundo opaco) */
const camadas = () => p.evaluate(() => {
  let e = document.querySelector('.qd-area'), n = 0;
  while (e) {
    const s = getComputedStyle(e);
    if (/radial-gradient/.test(s.backgroundImage)) n++;
    if (e !== document.querySelector('.qd-area') && s.backgroundColor !== 'rgba(0, 0, 0, 0)') break;
    e = e.parentElement;
  }
  return n;
});
caso('D-76 uma camada só de bolinhas no Quadro', (await camadas()) === 1, `camadas: ${await camadas()}`);
{
  /* arrastar o quadro (barra de espaço não; com o botão do meio) e conferir que continua uma camada, que anda junto */
  const a = await p.locator('.qd-area').boundingBox();
  const pos0 = await p.locator('.qd-area').evaluate((e) => getComputedStyle(e).backgroundPosition);
  await p.mouse.move(a.x + 100, a.y + a.height - 120); await p.mouse.down({ button: 'middle' });
  await p.mouse.move(a.x + 137, a.y + a.height - 107, { steps: 6 }); await p.mouse.up({ button: 'middle' }); await p.waitForTimeout(200);
  const pos1 = await p.locator('.qd-area').evaluate((e) => getComputedStyle(e).backgroundPosition);
  caso('D-76 depois de arrastar o quadro continua uma camada (e ela anda)', (await camadas()) === 1, `posição ${pos0} → ${pos1}`);
}
{
  await p.locator('[role=tab]:has-text("Kanban")').click(); await p.waitForTimeout(300);
  const fundo = await p.locator('.sup-postits').evaluate((e) => getComputedStyle(e).backgroundImage);
  caso('D-76 o Kanban continua com o fundo de antes', /radial-gradient/.test(fundo), fundo.slice(0, 40));
  await p.locator('[role=tab]:has-text("Quadro")').click(); await p.waitForTimeout(300);
}

/* D-77: os cantos do código (Q-001) ficam dentro da forma Início/Fim, a pelo menos 2 px da curva */
{
  const r = await p.evaluate(() => {
    const it = document.querySelector('.qi-inicio'), cod = it.querySelector('.qi-cod');
    const a = it.getBoundingClientRect(), b = cod.getBoundingClientRect();
    return { w: a.width, h: a.height, x1: b.left - a.left, y1: b.top - a.top, x2: b.right - a.left, y2: b.bottom - a.top };
  });
  const raio = Math.min(r.w, r.h) / 2;
  const dentro = (x, y) => {
    const cx = x < raio ? raio : x > r.w - raio ? r.w - raio : x, cy = y < raio ? raio : y > r.h - raio ? r.h - raio : y;
    return Math.hypot(x - cx, y - cy) <= raio - 2;
  };
  const cantos = [[r.x1, r.y1], [r.x1, r.y2], [r.x2, r.y1], [r.x2, r.y2]];
  caso('D-77 o código fica dentro da curva da forma Início/Fim', cantos.every(([x, y]) => dentro(x, y)), `código em x ${r.x1.toFixed(0)}–${r.x2.toFixed(0)}, y ${r.y1.toFixed(0)}–${r.y2.toFixed(0)}; raio ${raio}`);
}

/* D-78: a moldura de seleção fica colada no item e a alça no canto dela */
{
  await p.locator('.qi-processo').click(); await p.waitForTimeout(250);
  const m = await p.evaluate(() => {
    const it = document.querySelector('.qi-processo'), s = getComputedStyle(it), al = document.querySelector('.qd-alca');
    const a = it.getBoundingClientRect(), h = al ? al.getBoundingClientRect() : null;
    return { off: parseFloat(s.outlineOffset), larg: parseFloat(s.outlineWidth), estilo: s.outlineStyle, canto: h ? Math.hypot(h.left + h.width / 2 - (a.right + parseFloat(s.outlineOffset) + parseFloat(s.outlineWidth) / 2), h.top + h.height / 2 - (a.bottom + parseFloat(s.outlineOffset) + parseFloat(s.outlineWidth) / 2)) : -1 };
  });
  caso('D-78 a moldura fica colada no item (sem a segunda caixa a 3 px)', m.estilo === 'solid' && m.off <= 0 && m.larg >= 1.5, `afastamento ${m.off} px, espessura ${m.larg} px`);
  caso('D-78 a alça de tamanho fica no canto da moldura', m.canto >= 0 && m.canto <= 2, `do centro da alça ao canto da linha da moldura: ${m.canto.toFixed(1)} px`);
  await p.keyboard.press('Escape'); await p.keyboard.press('Control+a'); await p.waitForTimeout(250);
  const todos = await p.evaluate(() => [...document.querySelectorAll('.qi.sel')].map((e) => parseFloat(getComputedStyle(e).outlineOffset)));
  caso('D-78 com tudo escolhido, cada item tem uma moldura só, colada', todos.length >= 4 && todos.every((o) => o <= 0), `${todos.length} itens, afastamentos ${todos.join(', ')}`);
}
caso('sem erro na página', erros.length === 0, erros.join(' | '));
await nav.close();
console.log(falhas ? `FIM: ${falhas} falha(s)` : 'FIM: tudo certo');
process.exit(falhas ? 1 : 0);
