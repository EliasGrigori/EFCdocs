/* Vértice Docs — prints da v0.6.24 parte 1 (colunas das listas no padrão do EFCwork). Arquivos inventados (semente do layout).
   Uso: node scripts/prints-aprovacao-v0624.mjs <endereço HOJE> <endereço PROPOSTA> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { abrirSemeado, espera } from './layout/semente.mjs';
const [HOJE, PROP, PASTA] = process.argv.slice(2);
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: process.env.CHROME });
const area = async (p, nome, sels, folga = 12) => {
  const caixas = (await Promise.all(sels.map((s) => p.locator(s).first().boundingBox().catch(() => null)))).filter(Boolean);
  const x0 = Math.max(0, Math.min(...caixas.map((b) => b.x)) - folga), y0 = Math.max(0, Math.min(...caixas.map((b) => b.y)) - folga);
  const x1 = Math.max(...caixas.map((b) => b.x + b.width)) + folga, y1 = Math.max(...caixas.map((b) => b.y + b.height)) + folga;
  await p.screenshot({ path: `${PASTA}/${nome}.png`, clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } });
};
for (const [lado, base] of [['hoje', HOJE], ['prop', PROP]]) {
  const a = await abrirSemeado(nav, base, { w: 1366, h: 900, reduzido: true, escala: 2 }); const p = a.page;
  const prop = lado === 'prop';
  /* 1 · o menu da coluna Tipo */
  await p.goto(base + '#/planilha'); await espera(900);
  await p.goto(base + '#/'); await espera(900);
  await p.click('[data-col-menu=tipo]'); await espera(500);
  await area(p, `menu-${lado}`, ['.tb-arq thead', '.col-menu', '.tb-arq tr.arq:nth-child(4)']);
  /* 2 · filtrar só documentos */
  if (prop) { for (const v of ['Planilha', 'Quadro']) await p.locator(`[data-col-valor="${v}"]`).uncheck(); }
  else await p.locator('.col-op:has-text("Documento")').click();
  await espera(400);
  await area(p, `valores-${lado}`, ['.pg-cab', '.tb-arq thead', '.col-menu', '.tb-arq tr.arq:nth-child(3)']);
  await p.keyboard.press('Escape'); await espera(200);
  if (prop) { await p.click('[data-col-menu=tipo]'); await espera(200); await p.click('.col-limpa'); await p.keyboard.press('Escape'); }
  else { await p.click('[data-col-menu=tipo]'); await espera(200); await p.click('.col-limpa'); await p.keyboard.press('Escape').catch(() => {}); }
  await espera(300);
  /* 3 · ordem de A a Z pela coluna Nome */
  await p.goto(base + '#/planilha'); await espera(900);
  await p.click('[data-col-menu=nome]'); await espera(300);
  if (prop) await p.click('[data-col-ordem]'); else await p.locator('.col-op:has-text("Ordenar de A a Z")').click();
  await espera(400);
  await area(p, `ordem-${lado}`, ['.tb-arq thead', '.col-menu', '.tb-arq tr.arq:nth-child(5)']);
  await p.keyboard.press('Escape'); await espera(200);
  if (prop) {
    await p.click('[data-col-menu=nome]'); await espera(200); await p.click('[data-col-ordem]'); await p.click('[data-col-ordem]'); await p.keyboard.press('Escape'); await espera(200);
    /* 4 · arrastar "Alterado em" para antes de Nome (só existe na proposta) */
    const de = await p.locator('th[data-col=quando] .col-thr').boundingBox(), ate = await p.locator('th[data-col=nome]').boundingBox();
    await p.mouse.move(de.x + 10, de.y + de.height / 2); await p.mouse.down(); await p.mouse.move(ate.x + 30, ate.y + ate.height / 2, { steps: 10 });
    await area(p, 'arrastar1-prop', ['.tb-arq thead', '.tb-arq tr.arq:nth-child(3)']);
    await p.mouse.up(); await espera(400);
    await area(p, 'arrastar2-prop', ['.tb-arq thead', '.tb-arq tr.arq:nth-child(3)']);
    /* 5 · Travar */
    await p.goto(base + '#/'); await espera(900);
    await p.click('[data-col-menu=tipo]'); await espera(200); await p.locator('[data-col-valor="Quadro"]').uncheck(); await p.click('[data-col-trava]'); await espera(400);
    await area(p, 'travar-prop', ['.tb-arq thead', '.col-menu']);
    await p.click('[data-col-trava]'); await p.click('.col-limpa'); await p.keyboard.press('Escape'); await espera(200);
  }
  await p.goto(base + '#/planilha'); await espera(600);
  /* 6 · Documentos internos: cabeçalho */
  await p.goto(base + '#/internos'); await espera(900);
  if (prop) { await p.click('[data-col-menu=situacao]'); await espera(400); await area(p, 'internos-prop', ['.tb-arq thead', '.col-menu', '.tb-arq tr.arq:nth-child(2)']); await p.keyboard.press('Escape'); }
  else await area(p, 'internos-hoje', ['.tb-arq thead', '.tb-arq tr.arq:nth-child(2)']);
  console.log(lado, a.erros.slice(0, 2)); await a.ctx.close();
  /* 7 · celular */
  const c = await abrirSemeado(nav, base, { w: 390, h: 844, toque: true, reduzido: true, escala: 2 }); const q = c.page;
  await q.goto(base + '#/planilha'); await espera(900);
  await q.screenshot({ path: `${PASTA}/cel1-${lado}.png` });
  if (prop) { await q.locator('[data-col-menu=quando]').tap(); await espera(600); await q.screenshot({ path: `${PASTA}/cel2-${lado}.png` }); }
  await c.ctx.close();
}
await nav.close();
