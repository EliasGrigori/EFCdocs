/* Vértice Docs — prints da página de aprovação da v0.6.52 (D-81: PDF igual à tela; seta curva e texto na linha).
   Uso: node scripts/prints-aprovacao-v0652.mjs <APP DEPOIS> <APP ANTES> <fonte do desenho de antes> <pasta>.
   Monta no app um quadro inventado parecido com o do print do Elias, tira o print da tela e desenha o mesmo arquivo com
   o desenho.js de antes e o de agora (o mesmo código do PDF e da imagem). */
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const [DEPOIS, ANTES, FONTE_ANTES, PASTA] = process.argv.slice(2);
const AQUI = fileURLToPath(new URL('..', import.meta.url));
mkdirSync(PASTA, { recursive: true });
const pacote = async (dir) => (await build({ stdin: { contents: `import { desenharQuadro, canvasDoQuadro } from './src/quadro/desenho.js'; window.QD = { desenharQuadro, canvasDoQuadro };`, resolveDir: path.resolve(dir), loader: 'js' }, bundle: true, write: false, format: 'iife', jsx: 'automatic', loader: { '.jsx': 'jsx' }, logLevel: 'silent' })).outputFiles[0].text;
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce', deviceScaleFactor: 1.5 });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
await p.goto(DEPOIS + '#/'); await p.click('.rail a[href="#/postits"]'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
const ITENS = [['inserir.inicio', 'COMANDA DE PULVERIZAÇÃO - DEFENCIVOS'], ['inserir.processo', 'TREINAMENTO DE DEFEN.'], ['inserir.processo', 'LAVAGEM DE EPI DA PULVERIZAÇÃO'], ['inserir.postit', 'DATAS INICIAL E FINAL DA LIMPEZA DEVE BATER COM AS ASSINATURAS']];
for (const [cmd, t] of ITENS) {
  await p.locator(`[data-cmd="${cmd}"]`).first().click();
  const ta = p.locator('textarea.qd-edita'); await ta.waitFor(); await ta.fill(t); await ta.press('Control+Enter'); await p.waitForTimeout(150); await p.keyboard.press('Escape');
}
/* arruma os itens arrastando (como o Elias faria): Início à esquerda, Treinamento ao lado, Lavagem abaixo à direita, post-it embaixo */
{
  const area = await p.locator('.qd-area').boundingBox();
  const alvos = [[90, 90], [420, 90], [760, 250], [110, 270]];
  for (let i = 0; i < 4; i++) {
    const b = await p.locator('.qi').nth(i).boundingBox();
    await p.mouse.move(b.x + 20, b.y + b.height - 12); await p.mouse.down();
    await p.mouse.move(area.x + alvos[i][0] + 20, area.y + alvos[i][1] + b.height - 12, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(150);
  }
  await p.keyboard.press('Escape');
}
/* liga Início → Treinamento → Lavagem; a segunda seta fica curva com texto na linha */
const ligar = async (de, para) => { await p.locator('.qi').nth(de).click(); await p.locator('button[title^="Ligar com seta"]').first().click(); await p.locator('.qi').nth(para).click(); await p.waitForTimeout(250); await p.keyboard.press('Escape'); };
await ligar(0, 1); await ligar(1, 2);
const tocarSeta = async (i) => { const q = await p.locator('.qd-seta-toque').nth(i).evaluate((e) => { const l = e.getTotalLength(); const pt = e.getPointAtLength(l * 0.3); const m = e.getScreenCTM(); return { x: pt.x * m.a + m.e, y: pt.y * m.d + m.f }; }); await p.mouse.click(q.x, q.y); await p.waitForTimeout(200); };
await tocarSeta(1);
for (let i = 0; i < 3; i++) { const b = p.locator('button[title="Seta curva"]'); if (await b.count()) { await b.first().click(); break; } await p.locator('button[title="Seta reta"], button[title="Seta em cotovelo"]').first().click(); await p.waitForTimeout(200); }
await p.locator('button[title^="Escrever na seta"]').first().click(); const ed = p.locator('input.qd-edita-seta'); await ed.fill('Sim'); await ed.press('Enter'); await p.waitForTimeout(250);
await tocarSeta(0);
await p.locator('button[title^="Escrever na seta"]').first().click(); const ed2 = p.locator('input.qd-edita-seta'); await ed2.fill('Começa'); await ed2.press('Enter'); await p.waitForTimeout(250);
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
await p.mouse.click(5, 790);
const a = await p.locator('.qd-area').boundingBox();
await p.screenshot({ path: `${PASTA}/1-tela.png`, clip: { x: a.x, y: a.y + 40, width: a.width, height: Math.min(a.height - 40, 420) } });
/* a seta curva com o texto acompanhando a linha */
await tocarSeta(1);
const bm = p.locator('button[title="Texto acompanhando a linha"]'); if (await bm.count()) await bm.first().click();
await p.mouse.click(5, 790); await p.waitForTimeout(300);
await p.screenshot({ path: `${PASTA}/2-seta-texto-na-linha.png`, clip: { x: a.x, y: a.y + 40, width: a.width, height: Math.min(a.height - 40, 420) } });
await p.waitForTimeout(1200);
const conteudo = await p.evaluate(() => new Promise((ok, erro) => {
  const r = indexedDB.open('efcdocs'); r.onerror = () => erro(r.error);
  r.onsuccess = () => { const t = r.result.transaction('arquivos').objectStore('arquivos').getAll(); t.onsuccess = async () => {
    const abrir = async (reg) => { const pk = reg.pacote; if (reg.conteudo) return reg.conteudo; const bin = Uint8Array.from(atob(pk.dados), (ch) => ch.charCodeAt(0)); const j = JSON.parse(await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).text()); return j.conteudo || j; };
    const l = (await Promise.all(t.result.filter((x) => x.ficha && x.ficha.tipo === 'postits').map(abrir))).filter((c) => c && c.itens);
    ok(l.sort((x, y) => Object.keys(y.itens).length - Object.keys(x.itens).length)[0]);
  }; };
}));
/* tarefa no post-it (responsável e prazo) só no desenho do PDF, para mostrar o rodapé */
const pid = Object.keys(conteudo.itens).find((k) => conteudo.itens[k].tipo === 'postit');
conteudo.itens[pid] = { ...conteudo.itens[pid], resp: 'ANA', prazo: '2099-11-25' };
for (const [lado, dir] of [['antes', FONTE_ANTES], ['depois', AQUI]]) {
  const pg = await ctx.newPage(); await pg.goto((lado === 'antes' ? ANTES : DEPOIS) + 'index.html'); await pg.waitForTimeout(800);
  await pg.addScriptTag({ content: await pacote(dir) });
  const png = await pg.evaluate(async (c) => { const cv = await window.QD.canvasDoQuadro(c, { escala: 1.5, codigos: true }); return cv.toDataURL('image/png'); }, conteudo);
  writeFileSync(`${PASTA}/1-pdf-${lado}.png`, Buffer.from(png.split(',')[1], 'base64'));
  await pg.close();
}
await nav.close(); console.log('prints em ' + PASTA);
