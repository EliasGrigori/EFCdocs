/* Auditoria visual no padrão do Cwork: mede, em cada tela, tamanhos de letra, cantos, botões, maiúsculas espaçadas, sombras, cores, emoji e rolagem de lado. */
import { chromium } from 'playwright';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path'; import { tmpdir } from 'node:os';
const RAIZ = process.argv[2], OUT = process.argv[3];
const A = 'testes/amostras/amostra-v0692.xlsx';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const medir = () => {
  const W = innerWidth, H = innerHeight;
  const vis = (el) => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1 || r.bottom <= 0 || r.top >= H || r.right <= 0 || r.left >= W) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  const fontes = {}, cantos = {}, sombras = new Set(), cores = new Set(), fundos = new Set(), familias = new Set();
  let maiusc = 0, emoji = 0; const exMaiusc = [], alvos = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el)) continue;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    const proprio = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    if (proprio) {
      const f = Math.round(parseFloat(cs.fontSize) * 2) / 2; fontes[f] = (fontes[f] || 0) + 1; familias.add(cs.fontFamily.split(',')[0].replace(/"/g, '').trim()); cores.add(cs.color);
      if (cs.textTransform === 'uppercase' && parseFloat(cs.letterSpacing) > 0.2) { maiusc++; if (exMaiusc.length < 4) exMaiusc.push(proprio.slice(0, 24)); }
      if (/\p{Extended_Pictographic}/u.test(proprio.replace(/[★☆✓✕×▾▸◂▴▼▲←→↑↓]/g, ''))) emoji++;
    }
    const tl = parseFloat(cs.borderTopLeftRadius) || 0;
    const temCaixa = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(cs.borderTopWidth) > 0 || cs.boxShadow !== 'none';
    if (tl > 0 && temCaixa && r.width > 12) { const k = tl >= Math.min(r.width, r.height) / 2 - 0.5 ? 'pílula/círculo' : Math.round(tl) + 'px'; cantos[k] = (cantos[k] || 0) + 1; }
    if (cs.boxShadow !== 'none') sombras.add(cs.boxShadow);
    if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') fundos.add(cs.backgroundColor);
    if (el.matches('button, [role=button], [role=tab], [role=menuitem], select, input:not([type=hidden]):not([type=file]), textarea, a[href]')) alvos.push({ h: Math.round(r.height), w: Math.round(r.width), t: (el.getAttribute('aria-label') || el.title || el.textContent || el.tagName).trim().slice(0, 22) });
  }
  const hs = alvos.map((a) => a.h).sort((x, y) => x - y);
  return {
    letras: Object.keys(fontes).map(Number).sort((x, y) => x - y), nLetras: Object.keys(fontes).length, familias: [...familias],
    cantos, nCantos: Object.keys(cantos).length, sombras: sombras.size, coresTexto: cores.size, fundos: fundos.size,
    maiusc, exMaiusc, emoji, alvos: alvos.length, hMin: hs[0] || 0, hMed: hs[Math.floor(hs.length / 2)] || 0, hMax: hs[hs.length - 1] || 0,
    menor34: alvos.filter((a) => a.h < 34).length, menor44: alvos.filter((a) => a.h < 44).length, menor28: alvos.filter((a) => a.h < 28).length,
    exPequenos: alvos.filter((a) => a.h < 28).slice(0, 5).map((a) => `${a.t} (${a.w}×${a.h})`),
    rolaDeLado: document.documentElement.scrollWidth > W + 1,
  };
};
const resultado = [];
const esp = (p, ms = 350) => p.waitForTimeout(ms);
async function rodar(nomeDisp, opc, tema) {
  const ctx = await b.newContext(opc);
  await ctx.addInitScript((t) => { try { if (!localStorage.getItem('efcdocs:prefs')) localStorage.setItem('efcdocs:prefs', JSON.stringify({ tema: t })); } catch { /* */ } globalThis.EFC_CEL_ABAS = true; }, tema);
  const p = await ctx.newPage(); const erros = [];
  p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text().slice(0, 120)); }); p.on('pageerror', (e) => erros.push('erro de página: ' + e.message.slice(0, 120)));
  const tela = async (nome) => { await esp(p, 250); const m = await p.evaluate(medir); const arq = `${nomeDisp}-${tema}-${nome}`.replace(/[^a-z0-9-]/gi, '_'); await p.screenshot({ path: `${OUT}/${arq}.png` }); resultado.push({ disp: nomeDisp, tema, tela: nome, print: arq + '.png', ...m }); };
  const tent = async (n, f) => { try { await f(); } catch (e) { resultado.push({ disp: nomeDisp, tema, tela: n, falhou: String(e.message).split('\n')[0].slice(0, 140) }); } };
  const ir = async (r) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(r); await p.locator('.pl-nome').press('Enter'); await esp(p); };
  await p.goto(RAIZ + '#/'); await esp(p, 900);
  await tent('Início', () => tela('Início'));
  await tent('Lista de planilhas', async () => { await p.goto(RAIZ + '#/planilha'); await esp(p, 500); await tela('Lista de planilhas'); });
  await tent('Abrir Excel (relatório)', async () => { await p.goto(RAIZ + '#/'); await esp(p, 500); await p.click('[data-abrir-excel]'); await p.setInputFiles('[data-excel-arquivo]', A); await p.waitForSelector('[data-excel-abrir]'); await esp(p, 400); await tela('Abrir Excel (relatório)'); await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv'); await esp(p, 900); });
  await p.addStyleTag({ content: '.toasts{visibility:hidden!important}' }).catch(() => {});
  await tent('Planilha · Página Inicial', async () => { await p.locator('.pl-aba:has-text("CONGELADA")').first().click(); await esp(p, 400); await tela('Planilha · Página Inicial'); });
  for (const aba of ['Inserir', 'Fórmulas', 'Dados', 'Exibir']) await tent('Planilha · ' + aba, async () => { await p.click(`.tabs .tab:has-text("${aba}")`); await tela('Planilha · ' + aba); });
  await tent('Janela Formatar como tabela', async () => { await ir('A1:C10'); await p.click('.tabs .tab:has-text("Inserir")'); await p.locator('[data-cmd="inserir.tabela"]').first().click(); await p.waitForSelector('[data-tab-ok]'); await tela('Janela Formatar como tabela'); await p.keyboard.press('Escape'); await esp(p); });
  await tent('Janela Validação de dados', async () => { await ir('B2:B6'); await p.click('.tabs .tab:has-text("Dados")'); await p.locator('[data-cmd="dados.validacao"]').first().click(); await esp(p, 600); await tela('Janela Validação de dados'); await p.keyboard.press('Escape'); await esp(p); });
  await tent('Janela Formatar células', async () => { await ir('B2'); await p.keyboard.press('Control+1'); await esp(p, 600); await tela('Janela Formatar células'); await p.keyboard.press('Escape'); await esp(p); });
  await tent('Janela da imagem', async () => {
    const png = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 240; c.height = 120; const x = c.getContext('2d'); x.fillStyle = '#1f6f8b'; x.fillRect(0, 0, 240, 120); return c.toDataURL('image/png').split(',')[1]; });
    const arq = join(mkdtempSync(join(tmpdir(), 'efc-')), 'logo.png'); writeFileSync(arq, Buffer.from(png, 'base64'));
    await ir('E3'); await p.click('.tabs .tab:has-text("Inserir")'); await p.locator('[data-arq-imagem]').setInputFiles(arq); await p.waitForSelector('[data-obj-tipo=imagem]'); await esp(p, 400);
    await p.locator('[data-obj-tipo=imagem]').dblclick(); await esp(p, 600); await tela('Janela da imagem'); await p.keyboard.press('Escape'); await esp(p);
  });
  await tent('Quadro', async () => { await p.goto(RAIZ + '#/postits'); await esp(p, 500); await p.locator('[data-novo=postits]').first().click(); await esp(p, 1200); await tela('Quadro'); });
  await tent('Opções', async () => { await p.goto(RAIZ + '#/'); await esp(p, 400); await p.locator('[data-cmd="app.opcoes"], [aria-label="Opções"], [title="Opções"]').first().click(); await esp(p, 600); await tela('Opções'); });
  resultado.push({ disp: nomeDisp, tema, tela: '(console)', erros });
  await ctx.close();
}
await rodar('PC', { viewport: { width: 1366, height: 700 } }, 'papel');
await rodar('PC', { viewport: { width: 1366, height: 700 } }, 'dark');
await rodar('Celular', { viewport: { width: 384, height: 790 }, hasTouch: true, isMobile: true }, 'papel');
await b.close();
writeFileSync(`${OUT}/auditoria.json`, JSON.stringify(resultado, null, 1));
for (const r of resultado) console.log(r.disp, r.tema, '|', r.tela, '|', r.falhou ? 'FALHOU ' + r.falhou : r.erros ? 'erros: ' + r.erros.length : `letras ${r.nLetras} [${r.letras}] cantos ${r.nCantos} ${JSON.stringify(r.cantos)} sombras ${r.sombras} alvos ${r.alvos} h ${r.hMin}/${r.hMed}/${r.hMax} <28:${r.menor28} <34:${r.menor34} <44:${r.menor44} maiúsc ${r.maiusc} emoji ${r.emoji} lado ${r.rolaDeLado} coresTxt ${r.coresTexto} fundos ${r.fundos}`);
