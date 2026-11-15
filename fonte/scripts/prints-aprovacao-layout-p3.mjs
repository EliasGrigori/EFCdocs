/* Vértice Docs — prints do app de verdade para a página de aprovação da fluidez (v0.6.20, parte 3).
   O movimento é mostrado na página com o app rodando; aqui ficam só as imagens paradas de apoio.
   Uso: node scripts/prints-aprovacao-layout-p3.mjs <endereço HOJE> <endereço PROPOSTA> <pasta de saída> */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { abrirSemeado, espera } from './layout/semente.mjs';
const [HOJE, PROP, PASTA] = process.argv.slice(2);
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: CHROME });
for (const [lado, base] of [['hoje', HOJE], ['prop', PROP]]) {
  const a = await abrirSemeado(nav, base, { reduzido: true }); const p = a.page;
  const foto = (n, clip) => p.screenshot({ path: `${PASTA}/${n}-${lado}.png`, clip });
  await p.goto(base + '#/planilha'); await espera(700);
  await foto('acoes', { x: 760, y: 140, width: 520, height: 240 });
  await foto('topo', { x: 760, y: 0, width: 520, height: 50 });
  await p.goto(base + '#/'); await espera(700);
  if (lado === 'prop') { await p.click('[data-col-menu=tipo]'); await espera(500); }
  await foto('coluna', { x: 212, y: 370, width: 1068, height: 320 });
  await p.keyboard.press('Escape');
  await p.goto(base + '#/lixeira'); await espera(700); await foto('lixeira', { x: 212, y: 50, width: 1068, height: 330 });
  await a.ctx.close();
}
{
  const a = await abrirSemeado(nav, PROP, { muitos: 20 });
  const recs = await a.page.evaluate(async () => { const db = await new Promise((ok) => { const r = indexedDB.open('efcdocs', 1); r.onsuccess = () => ok(r.result); }); return new Promise((ok) => { const r = db.transaction('arquivos').objectStore('arquivos').getAll(); r.onsuccess = () => ok(r.result); }); });
  const ints = recs.filter((r) => r.ficha.codigo && /^ETQ/.test(r.ficha.codigo)).sort((x, y) => x.ficha.codigo.localeCompare(y.ficha.codigo));
  writeFileSync(`${PASTA}/sementes.json`, JSON.stringify(recs));
  writeFileSync(`${PASTA}/armazem.json`, JSON.stringify({ 'efcdocs:ponte': JSON.stringify({ [ints[0].id]: { rev: 2, pid: 'p-demo', em: '2026-11-14T15:10:00Z', estado: 'recebido' }, [ints[1].id]: { rev: 1, em: '2026-11-14T16:02:00Z', estado: 'caixa' } }) }));
  await a.ctx.close(); console.log('sementes:', recs.length);
}
await nav.close();
