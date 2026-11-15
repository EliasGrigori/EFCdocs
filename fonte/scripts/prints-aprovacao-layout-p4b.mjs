/* Vértice Docs — prints do balão de comentário refeito (v0.6.20, parte 4, segunda versão do item 8).
   Uso: node scripts/prints-aprovacao-layout-p4b.mjs <endereço HOJE> <endereço PROPOSTA> <pasta de saída> */
import { chromium } from 'playwright';
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { abrirSemeado, espera } from './layout/semente.mjs';
const [HOJE, PROP, PASTA, SEMENTES] = process.argv.slice(2);
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: CHROME });
for (const [lado, base] of [['hoje', HOJE], ['prop', PROP]]) for (const tema of ['claro', 'escuro']) {
  const a = await abrirSemeado(nav, base, { reduzido: true, tema }); const p = a.page;
  await p.goto(base + '#/planilha'); await p.locator('.tb-arq tr.arq .abre').first().click(); await p.waitForSelector('.pl-cv'); await espera(700);
  const celula = async (ref) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await espera(100); };
  for (const [ref, v] of [['A1', 'Ponto'], ['B1', 'Cloro (mg/L)'], ['A2', 'Entrada'], ['B2', '0,4'], ['A3', 'Reservatório'], ['B3', '2,6'], ['A4', 'Bebedouro'], ['B4', '1,1']]) { await celula(ref); await p.keyboard.type(v); await p.keyboard.press('Enter'); }
  await celula('B3'); await p.keyboard.press('Shift+F2'); await p.waitForSelector('[data-com-texto]');
  await p.fill('[data-com-texto]', 'Passou do limite de 2,0. Refazer a coleta amanhã cedo.'); await p.locator('.janela input').last().fill('Ana Lima'); await p.click('[data-com-salvar]'); await espera(300);
  await celula('B3'); await p.keyboard.press('Shift+F2'); await p.waitForSelector('[data-com-texto]');
  const resp = p.locator('.janela textarea').nth(1); if (await resp.count()) { await resp.fill('Refeita às 7h: deu 1,4. Pode liberar.'); await p.locator('.janela input').last().fill('Bruno Sá'); }
  await p.click('[data-com-salvar]'); await espera(300); await celula('D8');
  const pos = await p.evaluate(() => { const k = document.querySelector('.pl-cv').getBoundingClientRect(); return { x: k.left, y: k.top }; });
  let achou = false; for (let dy = 30; dy < 120 && !achou; dy += 8) for (let dx = 60; dx < 320; dx += 10) { await p.mouse.move(pos.x + dx, pos.y + dy); await espera(30); if (await p.locator('[data-balao=com]').count()) { achou = true; break; } }
  await espera(500);
  const b = await p.locator('[data-balao=com]').boundingBox();
  await p.screenshot({ path: `${PASTA}/balao${tema === 'escuro' ? '-escuro' : ''}-${lado}.png`, clip: { x: Math.max(0, b.x - 190), y: Math.max(0, b.y - 80), width: 560, height: 260 } });
  console.log(lado, tema, achou, a.erros.slice(0, 2)); await a.ctx.close();
}
if (SEMENTES && existsSync(SEMENTES + '/sementes.json')) { copyFileSync(SEMENTES + '/sementes.json', PASTA + '/sementes.json'); copyFileSync(SEMENTES + '/armazem.json', PASTA + '/armazem.json'); }
await nav.close();
