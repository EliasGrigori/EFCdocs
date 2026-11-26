/* Vértice Docs v0.6.73 — print de antes (v0.6.72): dentro de uma página de teste do Cwork com a interface do login,
   o Vértice ainda pede "Seu nome" no comentário e mostra o perfil de teste. Dados inventados.
   Uso: node scripts/prints-aprovacao-v0673.mjs <endereço> <pasta> <prefixo> */
import { chromium } from 'playwright';
const [BASE, PASTA, PRE] = [process.argv[2], process.argv[3], process.argv[4] || 'x'];
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce' });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
await ctx.route('**/efcwork/com-ponte.html', (r) => r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><body style="margin:0">
  <div style="height:26px;background:#1d2b36;color:#fff;font:13px sans-serif;padding:5px 12px;box-sizing:border-box">Cwork (teste) · Vértice Docs · logado: Pessoa C</div>
  <script>window.CworkPonteVertice={versao:1,usuario:()=>({uid:'u-c',nome:'Pessoa C',perfil:'principal'}),pastas:()=>[]};</script>
  <iframe id="v" src="${BASE}" style="border:0;width:100vw;height:calc(100vh - 26px)"></iframe></body>` }));
const p = await ctx.newPage(); p.setDefaultTimeout(8000);
await p.goto(new URL('/efcwork/com-ponte.html', BASE).href);
const fr = p.frameLocator('#v'); await fr.locator('.rail').waitFor(); await p.waitForTimeout(2000);
await fr.locator('.rail a[href="#/postits"]').click(); await fr.locator('[data-novo=postits]').click(); await fr.locator('.qd-vazio').waitFor();
await fr.locator('[data-cmd="inserir.postit"]').first().click(); await fr.locator('textarea.qd-edita').fill('Conferir balança'); await fr.locator('textarea.qd-edita').press('Control+Enter'); await p.keyboard.press('Escape');
await fr.locator('.tab:has-text("Organizar")').click(); await fr.locator('[data-cmd="organizar.kanban"]').first().click(); await fr.locator('.kb-col').first().waitFor();
const c = fr.locator('.kb-card[data-item]').first(); await c.click({ position: { x: 30, y: 20 } });
await c.locator('[data-kb-comentar], [data-kb-coments]').first().click(); await fr.locator('[data-kb-gaveta]').waitFor(); await p.waitForTimeout(400);
await p.screenshot({ path: `${PASTA}/${PRE}-comentario.png` });
await nav.close();
