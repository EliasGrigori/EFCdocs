/* Vértice Docs — v0.6.32: defeitos menores do Quadro (relatório do Grok de 18/11, PL05 a PL12).
   Uso: node scripts/testar-quadro-cel.mjs <endereço>. Dados inventados. */
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
let ok = 0, falhas = 0;
const erros = [];
const certo = (c, m) => { if (!c) throw new Error(m); };
async function caso(nome, f) { try { await f(); ok++; console.log('  ok   ' + nome); } catch (e) { falhas++; console.log('  FALHA ' + nome + ' — ' + String(e.message || e).split('\n')[0].slice(0, 300)); } }
const nav = await chromium.launch({ executablePath: CHROME });
const bate = (a, b) => a.x < b.x + b.width - 1 && a.x + a.width > b.x + 1 && a.y < b.y + b.height - 1 && a.y + a.height > b.y + 1;
async function abrir(opc) {
  const ctx = await nav.newContext({ reducedMotion: 'reduce', ...opc });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
  await p.goto(BASE + '#/postits'); await p.waitForSelector('[data-novo=postits]'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio'); await p.waitForTimeout(300);
  return { ctx, p };
}
const novoPostit = async (p, texto, toque) => {
  const b = p.locator('[data-cmd="inserir.postit"]').first(); if (toque) await b.tap(); else await b.click();
  const ta = p.locator('textarea.qd-edita'); await ta.waitFor(); await ta.fill(texto); await ta.press('Control+Enter'); await p.waitForTimeout(150);
};

/* ---------- computador ---------- */
{
  const { ctx, p } = await abrir({ viewport: { width: 1366, height: 768 } });

  await caso('PL05: no Kanban, a coluna nova entra antes do "Feito", que continua sendo a última (o andamento continua "em Feito")', async () => {
    await p.locator('.qd-vistas button:has-text("Kanban")').click(); await p.waitForSelector('.kb-col');
    try { await p.locator('.kb-coluna-nova').click(); await p.locator('.janela input').fill('Revisão'); await p.locator('.janela button.primary').click(); await p.waitForTimeout(200);
    const nomes = await p.locator('.kb-col').evaluateAll((l) => l.map((e) => e.getAttribute('aria-label').replace('Coluna ', '')));
    certo(nomes.join('|') === 'A fazer|Fazendo|Revisão|Feito', 'ordem: ' + nomes.join(' | '));
    await p.locator('.kb-col').nth(3).locator('.kb-novo').click(); const ta = p.locator('textarea.kb-edita'); await ta.fill('Pronto'); await ta.press('Control+Enter'); await p.waitForTimeout(200);
    const and = await p.locator('.kb-and-pct').innerText();
    certo(/em “Feito”/.test(and) && /100%/.test(and), 'andamento: ' + and);
    } finally { await p.locator('.qd-vistas button:has-text("Quadro")').click(); await p.waitForTimeout(300); }
  });

  await caso('PL06: o post-it não encolhe a ponto de o código cobrir o texto (mínimo 96 × 60)', async () => {
    await novoPostit(p, 'Encolher');
    const it = p.locator('.qi-postit:has-text("Encolher")'); await it.click(); await p.waitForTimeout(150);
    const al = await p.locator('.qd-alca').boundingBox();
    await p.mouse.move(al.x + al.width / 2, al.y + al.height / 2); await p.mouse.down(); await p.mouse.move(al.x - 400, al.y - 400, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(200);
    const z = await p.locator('.qd-pct').innerText().then((t) => parseInt(t, 10) / 100);
    const b = await it.boundingBox();
    certo(b.width / z >= 95.5 && b.height / z >= 59.5, `tamanho: ${Math.round(b.width / z)} × ${Math.round(b.height / z)}`);
    const cod = await it.locator('.qi-cod').boundingBox(), txt = await it.locator('.qi-clamp').boundingBox();
    certo(cod.y + cod.height <= txt.y + 1, `o código (até ${Math.round(cod.y + cod.height)}) cobre o texto (desde ${Math.round(txt.y)})`);
  });

  await caso('PL08: o código Q-001 tem contraste de pelo menos 4,5 em todas as cores de post-it', async () => {
    const r = await p.evaluate(() => {
      const L = (c) => { const v = c.match(/[\d.]+/g).map(Number); const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return [0.2126 * f(v[0]) + 0.7152 * f(v[1]) + 0.0722 * f(v[2]), v[3] === undefined ? 1 : v[3]]; };
      const el = document.querySelector('.qi-postit .qi-cod'); const fg = getComputedStyle(el).color;
      const hexes = ['#fde68a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#ddd6fe', '#e5e7eb', '#ffffff'];
      const m = fg.match(/[\d.]+/g).map(Number); const a = m[3] ?? 1;
      return hexes.map((h) => { const b = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const mix = `rgb(${b.map((x, i) => Math.round(m[i] * a + x * (1 - a))).join(',')})`; const l1 = L(`rgb(${b.join(',')})`)[0], l2 = L(mix)[0]; return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100; });
    });
    certo(Math.min(...r) >= 4.5, 'contrastes: ' + r.join(', '));
  });

  await caso('PL11: arrastar um post-it até a borda da área rola a tela e o post-it continua debaixo do mouse', async () => {
    await novoPostit(p, 'Arrastar'); await p.keyboard.press('Escape');
    const area = await p.locator('.qd-area').boundingBox();
    const parado = p.locator('.qi-postit:has-text("Encolher")'), ant = await parado.boundingBox();
    const it = p.locator('.qi-postit:has-text("Arrastar")'), b = await it.boundingBox();
    const ox = b.x + b.width / 2, oy = b.y + 30;
    await p.mouse.move(ox, oy); await p.mouse.down();
    const fx = area.x + area.width - 8, fy = area.y + area.height / 2;
    await p.mouse.move(fx, fy, { steps: 12 }); await p.waitForTimeout(700); await p.mouse.move(fx, fy + 1); await p.mouse.up(); await p.waitForTimeout(250);
    const dep = await parado.boundingBox(), nb = await it.boundingBox();
    certo(dep.x < ant.x - 40, `a tela não rolou: o outro post-it estava em ${Math.round(ant.x)} e ficou em ${Math.round(dep.x)}`);
    certo(fx >= nb.x - 2 && fx <= nb.x + nb.width + 2, `o post-it não ficou debaixo do mouse: ${Math.round(nb.x)}..${Math.round(nb.x + nb.width)} e o mouse em ${Math.round(fx)}`);
  });
  await ctx.close();
}

/* ---------- celular ---------- */
{
  const { ctx, p } = await abrir({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const pequenos = () => p.evaluate(() => [...document.querySelectorAll('.qd button, .qd [role=tab]')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.top < innerHeight && r.bottom > 0 && !e.classList.contains('qd-ponto') && (r.width < 43.5 || r.height < 43.5); }).map((e) => { const r = e.getBoundingClientRect(); return `${(e.getAttribute('aria-label') || e.textContent).trim().slice(0, 20)} ${Math.round(r.width)}×${Math.round(r.height)}`; }));

  await caso('PL07: com o quadro vazio, todo botão do Quadro tem pelo menos 44 px no celular', async () => {
    const l = await pequenos(); certo(l.length === 0, l.join(' | '));
  });

  await caso('PL09: a lâmpada do Assistente não fica em cima da barra Quadro/Kanban', async () => {
    const a = await p.locator('.qd-vistas').boundingBox(), l = await p.locator('.qd-lamp').boundingBox();
    certo(!bate(a, l), `barra ${JSON.stringify(a)} · lâmpada ${JSON.stringify(l)}`);
  });

  await caso('PL07: com um post-it escolhido, barra do item, cores e pegadores de ligar têm alvo de 44 px', async () => {
    await novoPostit(p, 'Celular', true); await p.locator('.qi-postit').first().tap(); await p.waitForTimeout(300);
    const l = await pequenos(); certo(l.length === 0, l.join(' | '));
    const pt = await p.locator('.qd-ponto').first().boundingBox();
    const alvo = await p.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest('.qd-ponto'), [pt.x + pt.width / 2 + 20, pt.y + pt.height / 2]);
    certo(alvo, 'tocar a 20 px do centro do pegador não acerta o pegador');
  });

  await caso('PL10: com um post-it escolhido, as barras de baixo não cobrem o zoom nem o "Ajustar à tela"', async () => {
    const z = await p.locator('.qd-zoom').boundingBox();
    for (const s of ['.qd-barra', '.qd-cores-cel']) { const b = await p.locator(s).first().boundingBox(); certo(b && !bate(z, b), `${s} cobre o zoom: ${JSON.stringify(b)} · zoom ${JSON.stringify(z)}`); }
  });

  await caso('PL10: escolher um post-it que está atrás das barras de baixo rola a tela até ele aparecer inteiro', async () => {
    await p.keyboard.press('Escape'); await p.locator('.qd-area').tap({ position: { x: 20, y: 400 } }); await p.waitForTimeout(150);
    const area = await p.locator('.qd-area').boundingBox();
    /* arrasta a tela com o dedo até o post-it ficar perto da borda de baixo */
    const it = p.locator('.qi-postit').first(); let b = await it.boundingBox();
    const cdp = await ctx.newCDPSession(p); const dy = area.y + area.height - 70 - b.y;
    const toque = (type, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: 30, y }] });
    await toque('touchStart', area.y + 200); for (let i = 1; i <= 8; i++) await toque('touchMove', area.y + 200 + (dy * i) / 8); await toque('touchEnd'); await p.waitForTimeout(300);
    b = await it.boundingBox();
    certo(b.y > area.y + area.height - 200, 'não consegui levar o post-it para baixo: ' + JSON.stringify(b));
    await p.mouse.click(1, 1).catch(() => {});
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x + b.width / 2, y: b.y + 20 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(500);
    const nb = await it.boundingBox();
    const topos = await p.evaluate(() => [...document.querySelectorAll('.qd-barra, .qd-cores-cel')].map((e) => e.getBoundingClientRect().top));
    certo(topos.length > 0, 'a barra do item não apareceu');
    certo(nb.y + nb.height <= Math.min(...topos) + 1, `o post-it (até ${Math.round(nb.y + nb.height)}) continua atrás das barras (a partir de ${Math.round(Math.min(...topos))})`);
  });

  await caso('PL12: girar o celular para deitado mantém o post-it na área visível', async () => {
    await p.keyboard.press('Escape'); await p.locator('[data-cmd="exibir.ajustar"], .qd-zoom [aria-label="Ajustar à tela"]').first().tap(); await p.waitForTimeout(300);
    await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(500);
    const a = await p.locator('.qd-area').boundingBox(), b = await p.locator('.qi-postit').first().boundingBox();
    certo(b.y + b.height / 2 > a.y && b.y + b.height / 2 < a.y + a.height && b.x + b.width / 2 > a.x && b.x + b.width / 2 < a.x + a.width, `post-it ${JSON.stringify(b)} fora da área ${JSON.stringify(a)}`);
  });
  await ctx.close();
}

await caso('console sem erro', async () => { certo(erros.length === 0, erros.join(' | ').slice(0, 300)); });
console.log(`\n${ok} de ${ok + falhas} conferências do Quadro no celular passaram.`);
await nav.close();
process.exit(falhas ? 1 : 0);
