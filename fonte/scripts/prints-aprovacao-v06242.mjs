/* Vértice Docs — prints da v0.6.24.2 (V24-01 a V24-07 do relatório do Grok da parte 1). Arquivos inventados (semente do layout).
   Uso: node scripts/prints-aprovacao-v06242.mjs <endereço HOJE> <endereço PROPOSTA> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { abrirSemeado, espera } from './layout/semente.mjs';
const [HOJE, PROP, PASTA] = process.argv.slice(2);
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: process.env.CHROME });
const area = async (p, nome, sels, folga = 10) => {
  const cx = (await Promise.all(sels.map((s) => p.locator(s).first().boundingBox().catch(() => null)))).filter(Boolean);
  const x0 = Math.max(0, Math.min(...cx.map((b) => b.x)) - folga), y0 = Math.max(0, Math.min(...cx.map((b) => b.y)) - folga);
  const x1 = Math.max(...cx.map((b) => b.x + b.width)) + folga, y1 = Math.max(...cx.map((b) => b.y + b.height)) + folga;
  await p.screenshot({ path: `${PASTA}/${nome}.png`, clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } });
};
for (const [lado, base] of [['hoje', HOJE], ['prop', PROP]]) {
  /* V24-01: escuro com filtro */
  let a = await abrirSemeado(nav, base, { w: 1366, h: 800, reduzido: true, escala: 2, tema: 'escuro' }); let p = a.page;
  await p.goto(base + '#/'); await espera(900); await p.click('[data-col-menu=tipo]'); await espera(200); await p.locator('[data-col-valor="Planilha"]').uncheck(); await p.keyboard.press('Escape'); await espera(300);
  await area(p, `escuro-${lado}`, ['.pg-cab.sub', '.tb-arq thead', '.tb-arq tr.arq:nth-child(2)']);
  await a.ctx.close();
  /* V24-02: 1024 px */
  a = await abrirSemeado(nav, base, { w: 1024, h: 768, reduzido: true, escala: 2 }); p = a.page;
  for (const [r, n] of [['#/internos', 'internos'], ['#/lixeira', 'lixeira']]) { await p.goto(base + r); await espera(900); await area(p, `media-${n}-${lado}`, ['.tb-arq thead', '.tb-arq tr.arq:nth-child(3)']); }
  /* V24-04: Lixeira com o mouse na linha */
  await p.goto(base + '#/lixeira'); await espera(600); await p.locator('.tb-arq tr.arq').first().hover(); await espera(200);
  await area(p, `apagar-${lado}`, ['.tb-arq tr.arq:nth-child(1) .btn.apagar'], 16);
  await a.ctx.close();
  /* V24-03: celular, Documentos internos */
  a = await abrirSemeado(nav, base, { w: 390, h: 844, toque: true, reduzido: true, escala: 2 }); p = a.page;
  await p.goto(base + '#/internos'); await espera(900);
  await p.screenshot({ path: `${PASTA}/cel-${lado}.png`, clip: { x: 0, y: 40, width: 390, height: 420 } });
  await a.ctx.close();
  /* V24-07: janela baixa */
  a = await abrirSemeado(nav, base, { w: 1280, h: 420, reduzido: true, escala: 2 }); p = a.page;
  await p.goto(base + '#/'); await espera(900); await p.click('[data-col-menu=tipo]'); await espera(400);
  await p.screenshot({ path: `${PASTA}/baixa-${lado}.png` });
  await a.ctx.close();
  console.log(lado, 'ok');
}
await nav.close();
