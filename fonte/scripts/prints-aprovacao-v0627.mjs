/* Vértice Docs — dados da página de aprovação da v0.6.27: posição quadro a quadro depois de um clique da roda (antes e depois).
   Uso: node scripts/prints-aprovacao-v0627.mjs <HOJE> <PROPOSTA> <saida.json> */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const [HOJE, PROP, SAIDA] = process.argv.slice(2);
const nav = await chromium.launch({ executablePath: process.env.CHROME });
const medir = async (p, ler, girar, ms = 600) => {
  await p.evaluate(([ler, ms]) => { const f = new Function('return ' + ler); globalThis.__pos = []; const t0 = performance.now(); const passo = () => { globalThis.__pos.push([performance.now() - t0, f()]); if (performance.now() - t0 < ms) requestAnimationFrame(passo); }; requestAnimationFrame(passo); }, [ler, ms]);
  await girar(); await p.waitForTimeout(ms + 100); return p.evaluate(() => globalThis.__pos);
};
const out = {};
for (const [lado, base] of [['hoje', HOJE], ['prop', PROP]]) {
  let ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } }); await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  let p = await ctx.newPage();
  await p.goto(base + '#/planilha'); await p.click('[data-novo=planilha]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(300);
  await p.click('.tabs .tab:has-text("Exibir")');
  if (await p.locator('[data-menu-faixa=congelar]').count()) { await p.click('[data-menu-faixa=congelar]'); await p.waitForSelector('.rb-lista [data-cmd="exibir.congelar|linha"]'); }
  await p.locator('[data-cmd="exibir.congelar|linha"]').first().click(); await p.waitForTimeout(300); await p.mouse.move(700, 450);
  /* a posição que a pessoa vê: a 1ª linha que rola, desenhada (sy da geometria) — lida do scrollTop e arredondada como a grade faz */
  out['planilha-' + lado] = await medir(p, "document.querySelector('.pl-rol').scrollTop", () => p.mouse.wheel(0, 100), 800);
  await ctx.close();
  ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } }); p = await ctx.newPage();
  await p.goto(base + '#/postits'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-area'); await p.waitForTimeout(300);
  await p.mouse.move(700, 450);
  out['quadro-' + lado] = await medir(p, "(() => { const m = /translate\\(([-\\d.]+)px, ([-\\d.]+)px\\)/.exec(document.querySelector('.qd-mundo').style.transform); return m ? -(+m[2]) : NaN; })()", () => p.mouse.wheel(0, 100));
  await ctx.close();
}
writeFileSync(SAIDA, JSON.stringify(out));
await nav.close();
