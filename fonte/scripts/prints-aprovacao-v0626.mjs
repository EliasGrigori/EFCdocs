/* Vértice Docs — prints da v0.6.26 (Quadro: PL01 a PL04 e o Esc do post-it). Dados inventados.
   Uso: node scripts/prints-aprovacao-v0626.mjs <endereço HOJE> <endereço PROPOSTA> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [HOJE, PROP, PASTA] = process.argv.slice(2);
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: process.env.CHROME });
const abrir = async (base, opc) => {
  const ctx = await nav.newContext({ reducedMotion: 'reduce', deviceScaleFactor: 2, ...opc });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  await p.goto(base + '#/postits'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-area'); await p.waitForTimeout(400);
  return { ctx, p };
};
const escrever = async (p, texto, tecla) => { await p.locator('[data-cmd="inserir.postit"]').first().click(); const ta = p.locator('textarea.qd-edita'); await ta.waitFor(); await ta.fill(texto); await ta.press(tecla); await p.waitForTimeout(150); };
for (const [lado, base] of [['hoje', HOJE], ['prop', PROP]]) {
  /* PL01: 12 post-its pelo botão, sem mexer na tela */
  let { ctx, p } = await abrir(base, { viewport: { width: 1366, height: 768 } });
  for (let i = 1; i <= 12; i++) await escrever(p, 'Tarefa ' + i, 'Control+Enter');
  await p.locator('.qd-area').click({ position: { x: 10, y: 10 } }); await p.waitForTimeout(200);
  await p.locator('.qd-area').screenshot({ path: `${PASTA}/doze-${lado}.png` });
  /* D15: Esc no post-it novo */
  await escrever(p, 'Comprar pão', 'Escape');
  const r = await p.locator('.qi-postit').last().boundingBox();
  await p.screenshot({ path: `${PASTA}/esc-${lado}.png`, clip: { x: r.x - 40, y: r.y - 30, width: r.width + 80, height: r.height + 60 } });
  await ctx.close();
  /* PL04: celular */
  ({ ctx, p } = await abrir(base, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }));
  for (let i = 1; i <= 3; i++) await escrever(p, 'Item ' + i, 'Control+Enter');
  await p.locator('.qd-area').tap({ position: { x: 10, y: 10 } }).catch(() => {}); await p.waitForTimeout(200);
  await p.screenshot({ path: `${PASTA}/celular-${lado}.png` });
  await ctx.close();
  /* Kanban no celular: o cartão escolhido (pedido de 18/11 18:22: excluir com facilidade) */
  ({ ctx, p } = await abrir(base, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }));
  await p.locator('.qd-vistas button:has-text("Kanban")').tap(); await p.waitForSelector('.kb-col');
  for (const t of ['Água; 59', 'Luz; 170']) { await p.locator('.kb-col').first().locator('.kb-novo').tap(); await p.locator('textarea.kb-edita').fill(t); await p.locator('textarea.kb-edita').press('Control+Enter'); await p.waitForTimeout(150); }
  await p.locator('.kb-card', { hasText: 'Luz; 170' }).tap({ position: { x: 30, y: 40 } }); await p.waitForTimeout(250);
  const col = await p.locator('.kb-col').first().boundingBox();
  await p.screenshot({ path: `${PASTA}/kanban-${lado}.png`, clip: { x: 0, y: col.y, width: 390, height: Math.min(420, col.height) } });
  await ctx.close();
  console.log(lado, 'ok');
}
await nav.close();
