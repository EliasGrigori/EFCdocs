/* Vértice Docs — prints do app de verdade para a página de aprovação do layout (v0.6.20, parte 1).
   HOJE = a versão anterior servida num endereço; PROPOSTA = esta versão servida em outro. Só arquivos inventados.
   Uso: node scripts/prints-aprovacao-layout.mjs <endereço HOJE> <endereço PROPOSTA> <pasta de saída> */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { abrirSemeado, espera, ATRASAR_BANCO } from './layout/semente.mjs';

const [HOJE, PROP, PASTA] = process.argv.slice(2);
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: CHROME });
const LADOS = [['hoje', HOJE], ['prop', PROP]];
const foto = (p, nome, lado, clip) => p.screenshot({ path: `${PASTA}/${nome}-${lado}.png`, clip });
const ir = async (p, base, rota, ms = 700) => { await p.goto(base + '#/' + rota); await espera(ms); };
/* rola a lista: hoje é a página que rola; na proposta, só a tabela */
const rolar = (p, y) => p.evaluate((y) => { const t = document.querySelector('.efl-tabela-rola') || document.querySelector('.pagina'); t.scrollTop = y; }, y);

for (const [lado, base] of LADOS) {
  /* ---- PC claro, poucos arquivos ---- */
  let a = await abrirSemeado(nav, base, {});
  let p = a.page;
  await ir(p, base, 'planilha'); await foto(p, 'planilhas', lado); await foto(p, 'trilha', lado, { x: 212, y: 0, width: 1068, height: 150 });
  await foto(p, 'fundo', lado, { x: 212, y: 600, width: 1068, height: 200 });
  await ir(p, base, 'internos'); await foto(p, 'internos', lado); await foto(p, 'abas', lado, { x: 212, y: 50, width: 1068, height: 270 });
  await ir(p, base, 'lixeira'); await foto(p, 'lixeira', lado);
  await ir(p, base, ''); await foto(p, 'inicio', lado);
  await ir(p, base, 'docx'); await p.click('.filtro-b'); await p.fill('.filtro-p input', 'reuni'); await espera(500); await foto(p, 'filtro', lado);
  await a.ctx.close();
  /* ---- PC claro, 250 planilhas: rolar ---- */
  a = await abrirSemeado(nav, base, { muitos: 230, reduzido: true }); p = a.page;
  await ir(p, base, 'planilha');
  for (const [i, y] of [0, 500, 1000, 1500].entries()) { await rolar(p, y); await espera(250); await foto(p, 'rola' + i, lado); }
  await a.ctx.close();
  /* ---- banco lento: o que aparece enquanto os arquivos não chegam ---- */
  a = await abrirSemeado(nav, base, {});
  await a.ctx.addInitScript(ATRASAR_BANCO(4000));
  p = await a.ctx.newPage(); await p.goto(base + '#/planilha'); await espera(1500); await foto(p, 'lento', lado);
  await a.ctx.close();
  /* ---- escuro ---- */
  a = await abrirSemeado(nav, base, { tema: 'escuro' }); p = a.page;
  await ir(p, base, 'planilha'); await foto(p, 'escuro', lado);
  await a.ctx.close();
  /* ---- botão dourado, de perto (3×), claro e escuro ---- */
  for (const tema of ['claro', 'escuro']) {
    const ctx = await nav.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 3, serviceWorkers: 'block', colorScheme: tema === 'escuro' ? 'dark' : 'light' });
    const q = await ctx.newPage(); await q.goto(base); await q.waitForSelector('.novo-drive-b');
    await q.evaluate((tema) => { const x = JSON.parse(localStorage.getItem('efcdocs:prefs') || '{}'); x.tema = tema === 'escuro' ? 'dark' : 'papel'; localStorage.setItem('efcdocs:prefs', JSON.stringify(x)); }, tema);
    await q.reload(); await q.waitForSelector('.novo-drive-b'); await espera(900);
    await q.screenshot({ path: `${PASTA}/ouro-${tema}-${lado}.png`, clip: { x: 0, y: 52, width: 212, height: 58 } });
    await ctx.close();
  }
  /* ---- celular ---- */
  a = await abrirSemeado(nav, base, { w: 390, h: 844, toque: true }); p = a.page;
  await ir(p, base, 'planilha'); await foto(p, 'cel-planilhas', lado);
  await ir(p, base, 'internos'); await foto(p, 'cel-internos', lado);
  await a.ctx.close();
  console.log('prints de', lado, 'prontos');
}
/* ---- os arquivos inventados da demonstração que roda dentro da página (150 registros, com 120 planilhas a mais) ---- */
{
  const a = await abrirSemeado(nav, PROP, { muitos: 120 });
  const recs = await a.page.evaluate(async () => { const db = await new Promise((ok) => { const r = indexedDB.open('efcdocs', 1); r.onsuccess = () => ok(r.result); }); return new Promise((ok) => { const r = db.transaction('arquivos').objectStore('arquivos').getAll(); r.onsuccess = () => ok(r.result); }); });
  writeFileSync(`${PASTA}/sementes.json`, JSON.stringify(recs)); await a.ctx.close();
  console.log('sementes da demonstração:', recs.length);
}
await nav.close();
