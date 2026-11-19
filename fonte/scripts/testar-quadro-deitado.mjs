/* Vértice Docs — v0.6.33: Quadro com o celular deitado (e a barra Quadro/Kanban que voltou a flutuar).
   Uso: node scripts/testar-quadro-deitado.mjs <endereço>. Dados inventados. */
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
let ok = 0, falhas = 0;
const erros = [];
const certo = (c, m) => { if (!c) throw new Error(m); };
async function caso(nome, f) { try { await f(); ok++; console.log('  ok   ' + nome); } catch (e) { falhas++; console.log('  FALHA ' + nome + ' — ' + String(e.message || e).split('\n')[0].slice(0, 300)); } }
const nav = await chromium.launch({ executablePath: CHROME });
const bate = (a, b) => a.x < b.x + b.width - 1 && a.x + a.width > b.x + 1 && a.y < b.y + b.height - 1 && a.y + a.height > b.y + 1;
const caixa = (p, s) => p.locator(s).first().boundingBox();
async function abrir(opc) {
  const ctx = await nav.newContext({ reducedMotion: 'reduce', ...opc });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
  await p.goto(BASE + '#/postits'); await p.waitForSelector('[data-novo=postits]'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio'); await p.waitForTimeout(300);
  return { ctx, p };
}
const novoPostit = async (p, texto) => {
  await p.locator('[data-cmd="inserir.postit"]').first().click({ force: true });
  const ta = p.locator('textarea.qd-edita'); await ta.waitFor(); await ta.fill(texto); await ta.press('Control+Enter'); await p.waitForTimeout(150);
};
const CEL = { hasTouch: true, isMobile: true };

/* ---------- celular deitado ---------- */
for (const vp of [{ width: 844, height: 390 }, { width: 667, height: 375 }]) {
  const { ctx, p } = await abrir({ viewport: vp, ...CEL });
  const n = `${vp.width}×${vp.height}`;
  await caso(`deitado ${n}: o quadro ocupa pelo menos 70% da altura da tela`, async () => {
    const a = await caixa(p, '.qd-area'); const pct = Math.round(a.height / vp.height * 100);
    certo(pct >= 70, `o quadro tem ${Math.round(a.height)} px de ${vp.height} (${pct}%)`);
  });
  await caso(`deitado ${n}: título e ferramentas ficam numa linha só (barra de cima com até 64 px)`, async () => {
    const t = await caixa(p, '.topbar'); certo(t.height <= 64, `barra de cima com ${Math.round(t.height)} px`);
    const b = await caixa(p, '[data-cmd="inserir.postit"]'); certo(b && b.y < t.y + t.height && b.width >= 43.5, 'o botão Post-it não está na barra de cima: ' + JSON.stringify(b));
  });
  await caso(`deitado ${n}: abas, zoom e lâmpada não se cobrem`, async () => {
    const v = await caixa(p, '.qd-vistas'), z = await caixa(p, '.qd-zoom'), l = await caixa(p, '.qd-lamp');
    certo(!bate(v, z) && !bate(z, l) && !bate(v, l), `abas ${JSON.stringify(v)} · zoom ${JSON.stringify(z)} · lâmpada ${JSON.stringify(l)}`);
  });
  if (vp.width === 844) {
    await caso('deitado: o post-it novo nasce inteiro na tela e fora das abas (dá para tocar nele)', async () => {
      await novoPostit(p, 'Deitado'); await p.keyboard.press('Escape'); await p.waitForTimeout(150);
      const it = await caixa(p, '.qi-postit'), a = await caixa(p, '.qd-area'), v = await caixa(p, '.qd-vistas');
      certo(it.y >= a.y && it.y + it.height <= a.y + a.height, `post-it ${JSON.stringify(it)} fora da área ${JSON.stringify(a)}`);
      certo(!bate(it, v), `o post-it nasce embaixo das abas: ${JSON.stringify(it)} · abas ${JSON.stringify(v)}`);
      const alvo = await p.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest('.qi-postit'), [it.x + it.width / 2, it.y + it.height / 2]);
      certo(alvo, 'tocar no meio do post-it não acerta o post-it');
    });
    await caso('deitado: três post-its seguidos nascem todos à vista, sem ficar embaixo das abas, do zoom ou da lâmpada', async () => {
      await novoPostit(p, 'Dois'); await novoPostit(p, 'Três'); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
      const a = await caixa(p, '.qd-area');
      const cob = await Promise.all(['.qd-vistas', '.qd-zoom', '.qd-lamp'].map((s) => caixa(p, s)));
      const its = await p.locator('.qi-postit').evaluateAll((l) => l.map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, t: e.textContent }; }));
      certo(its.length === 3, 'post-its: ' + its.length);
      for (const it of its) {
        certo(it.y >= a.y && it.y + it.height <= a.y + a.height + 1, `"${it.t}" sai da tela: ${JSON.stringify(it)}`);
        certo(!cob.some((b) => bate(it, b)), `"${it.t}" fica embaixo de uma barra: ${JSON.stringify(it)}`);
      }
    });
    await caso('deitado: com um post-it escolhido fica só a barra do item, no pé do quadro, e o post-it aparece inteiro acima dela', async () => {
      await p.locator('.qi-postit').first().tap({ force: true }); await p.waitForTimeout(500);
      certo(!(await p.locator('.qd-cores-cel').isVisible()), 'a faixa grande de cores continua aparecendo');
      const a = await caixa(p, '.qd-area'), b = await caixa(p, '.qd-barra'), it = await caixa(p, '.qi-postit.sel'), v = await caixa(p, '.qd-vistas');
      certo(a.y + a.height - (b.y + b.height) <= 16, `a barra do item está ${Math.round(a.y + a.height - b.y - b.height)} px acima do pé`);
      certo(it.y >= v.y + v.height - 1 && it.y + it.height <= b.y + 1, `post-it ${JSON.stringify(it)} · abas até ${Math.round(v.y + v.height)} · barra desde ${Math.round(b.y)}`);
      certo(await p.locator('.qd-barra [aria-label*="Cor"], .qd-barra [title*="Cor"]').count() > 0, 'a barra do item não tem o botão de cor');
      await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    });
    await caso('PL13 (conferência): com um post-it escolhido, o botão Post-it continua na barra, no mesmo lugar', async () => {
      const antes = await caixa(p, '[data-cmd="inserir.postit"]');
      await p.locator('.qi-postit').first().tap({ force: true }); await p.waitForTimeout(250);
      certo(await p.locator('.qi-postit.sel').count() === 1, 'o post-it não ficou escolhido');
      const dep = await caixa(p, '[data-cmd="inserir.postit"]');
      certo(dep && Math.abs(dep.x - antes.x) < 1 && Math.abs(dep.y - antes.y) < 1, `antes ${JSON.stringify(antes)} · depois ${JSON.stringify(dep)}`);
    });
  }
  await ctx.close();
}

/* ---------- celular em pé ---------- */
{
  const { ctx, p } = await abrir({ viewport: { width: 390, height: 844 }, ...CEL });
  await caso('em pé: a barra Quadro/Kanban flutua sobre o quadro (o quadro começa logo abaixo da barra de cima)', async () => {
    const t = await caixa(p, '.topbar'), a = await caixa(p, '.qd-area');
    certo(a.y - (t.y + t.height) < 2, `o quadro começa ${Math.round(a.y - t.y - t.height)} px abaixo da barra de cima`);
  });
  await caso('em pé: zoom logo abaixo das abas, sem cobrir', async () => {
    const v = await caixa(p, '.qd-vistas'), z = await caixa(p, '.qd-zoom');
    certo(!bate(v, z) && z.y - (v.y + v.height) < 16, `abas ${JSON.stringify(v)} · zoom ${JSON.stringify(z)}`);
  });
  await caso('em pé: no Kanban, o andamento e as colunas começam abaixo das abas', async () => {
    await novoPostit(p, 'Kanban'); await p.locator('.qd-vistas button:has-text("Kanban")').click({ force: true }); await p.waitForSelector('.kb-col');
    const v = await caixa(p, '.qd-vistas'), and = await caixa(p, '.kb-and'), col = await caixa(p, '.kb-col');
    certo(and.y >= v.y + v.height && col.y >= v.y + v.height, `abas até ${Math.round(v.y + v.height)} · andamento em ${Math.round(and.y)} · coluna em ${Math.round(col.y)}`);
  });
  await ctx.close();
}

/* ---------- computador ---------- */
{
  const { ctx, p } = await abrir({ viewport: { width: 1366, height: 768 } });
  await caso('computador: a barra Quadro/Kanban flutua no canto do quadro (não ocupa uma faixa inteira)', async () => {
    const q = await caixa(p, '.qd'), a = await caixa(p, '.qd-area'), v = await caixa(p, '.qd-vistas');
    certo(Math.abs(a.y - q.y) < 2, `o quadro começa ${Math.round(a.y - q.y)} px abaixo do topo do módulo`);
    certo(v.width < q.width / 2, `as abas ocupam ${Math.round(v.width)} de ${Math.round(q.width)} px`);
  });
  await caso('computador: no Kanban, o andamento não fica embaixo das abas', async () => {
    await novoPostit(p, 'Computador'); await p.locator('.qd-vistas button:has-text("Kanban")').click(); await p.waitForSelector('.kb-col');
    const v = await caixa(p, '.qd-vistas'), and = await caixa(p, '.kb-and');
    certo(!bate(v, and), `abas ${JSON.stringify(v)} · andamento ${JSON.stringify(and)}`);
  });
  await ctx.close();
}

await caso('console sem erro', async () => { certo(erros.length === 0, erros.join(' | ').slice(0, 300)); });
console.log(`\n${ok} de ${ok + falhas} conferências do Quadro deitado passaram.`);
await nav.close();
process.exit(falhas ? 1 : 0);
