/* EFCdocs — prints de antes (v0.2.0 em /v020/) e depois (v0.3.0) para a página de aprovação. */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.argv[2], OUT = process.argv[3];
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const PC = { viewport: { width: 1366, height: 800 } };
const CEL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
async function pagina(op) { const ctx = await b.newContext({ ...op, acceptDownloads: true }); return [ctx, await ctx.newPage()]; }
const espera = (p, ms = 900) => p.waitForTimeout(ms);
async function escrever(p, t) { const ta = p.locator('textarea.qd-edita'); await ta.fill(t); await ta.press('Control+Enter'); await espera(p, 150); }

for (const [nome, url] of [['antes', BASE + 'v020/'], ['depois', BASE]]) {
  let [ctx, p] = await pagina(PC);
  await p.goto(url); await espera(p, nome === 'antes' ? 3000 : 900); /* a v0.2.0 recarrega sozinha na primeira visita */
  await p.screenshot({ path: `${OUT}/${nome}-inicio.png` });
  await p.click('[data-novo=postits]'); await espera(p, 700);
  await p.screenshot({ path: `${OUT}/${nome}-quadro-novo.png` });
  await p.locator('.topbar [aria-label="Opções"]').click(); await espera(p, 300);
  await p.screenshot({ path: `${OUT}/${nome}-opcoes.png` });
  await ctx.close();
  [ctx, p] = await pagina(CEL);
  await p.goto(url); await espera(p, nome === 'antes' ? 3000 : 1200);
  await p.screenshot({ path: `${OUT}/${nome}-celular.png` });
  await ctx.close();
}

/* depois: um quadro de verdade (exemplo de reunião de qualidade, sem dados reais) */
let [ctx, p] = await pagina(PC);
await p.goto(BASE); await espera(p);
await p.click('[data-novo=postits]'); await espera(p, 500);
await p.locator('.qd-vazio .chipb:has-text("Fluxograma")').click();
await escrever(p, 'Início da coleta');
await p.locator('[data-ponto=r]').click(); await escrever(p, 'Coletar a amostra de água');
await p.locator('[data-ponto=r]').click(); await escrever(p, 'Medir o cloro livre');
await p.keyboard.press('Escape');
await p.locator('[data-cmd="inserir.forma"]').first().click(); await p.locator('[data-forma=decisao]').click();
await escrever(p, 'Entre 0,2 e 2,0 mg/L?');
const dec = await p.locator('.qi-decisao').boundingBox();
const med = await p.locator('.qi[data-cod="Q-003"]').boundingBox();
await p.keyboard.press('Escape');
await p.mouse.move(dec.x + dec.width / 2, dec.y + dec.height / 2); await p.mouse.down();
await p.mouse.move(med.x + med.width + 150, med.y + med.height / 2 - 4, { steps: 10 }); await p.mouse.up(); await espera(p, 200);
await p.keyboard.press('Escape');
await p.locator('.qi[data-cod="Q-003"]').click(); await espera(p, 150);
await p.locator('.qd-barra [data-acao=ligar]').click();
await p.locator('.qi-decisao').click(); await espera(p, 200);
await p.keyboard.press('Escape');
await p.locator('.qi-decisao').click();
await p.locator('[data-ponto=b]').click(); await escrever(p, 'Registrar e liberar');
await p.keyboard.press('Escape');
await p.locator('.qi-decisao').click();
await p.locator('[data-ponto=r]').click(); await escrever(p, 'Abrir RNC e corrigir a dosagem');
await p.keyboard.press('Escape');
const setas = p.locator('.qd-seta-toque');
console.log('setas:', await setas.count());
for (const [i, txt] of [[3, 'Sim'], [4, 'Não']]) {
  await setas.nth(i).dblclick({ force: true });
  const inp = p.locator('input.qd-edita-seta'); await inp.fill(txt); await inp.press('Enter'); await espera(p, 150);
  await p.keyboard.press('Escape');
}
/* post-its da reunião */
const area = await p.locator('.qd-area').boundingBox();
const notas = [['Trocar reagente DPD vencido', 'rosa'], ['Treinar a equipe nova na coleta', 'azul'], ['Calibrar o fotômetro', 'amarelo']];
for (let i = 0; i < notas.length; i++) {
  await p.mouse.dblclick(area.x + 120 + i * 200, area.y + area.height - 150);
  await escrever(p, notas[i][0]);
}
await p.locator('.qd-zoom [aria-label="Ajustar à tela"]').click(); await espera(p, 300);
await p.keyboard.press('Escape'); await espera(p, 200);
await p.screenshot({ path: `${OUT}/depois-fluxograma.png` });
await p.locator('.qi[data-cod="Q-007"]').click(); await espera(p, 200);
await p.screenshot({ path: `${OUT}/depois-selecao.png` });
await p.keyboard.press('Escape');
await p.locator('.qd-vistas button:has-text("Kanban")').click(); await espera(p, 400);
await p.screenshot({ path: `${OUT}/depois-kanban.png` });
await p.locator('.qd-vistas button:has-text("Quadro")').click(); await espera(p, 300);
await p.click('.tab:has-text("Organizar")');
await p.locator('[data-cmd="organizar.temporizador"]').click();
await p.locator('.qd-zoom [aria-label=Minimapa]').click(); await espera(p, 300);
await p.locator('.qi[data-cod="Q-002"]').click();
await p.locator('.qd-barra [data-acao=detalhes]').click(); await espera(p, 300);
await p.screenshot({ path: `${OUT}/depois-painel-temporizador.png` });
await p.click('.tab:has-text("Arquivo")');
const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('[data-cmd="arquivo.exportarPDF"]').first().click()]);
await dl.saveAs(`${OUT}/depois-exemplo.pdf`);
await ctx.close();

/* celular: quadro e Kanban */
[ctx, p] = await pagina(CEL);
await p.goto(BASE + '#/postits'); await espera(p, 1000);
await p.locator('[data-novo=postits]').tap(); await espera(p, 400);
await p.locator('.qd-vazio .chipb:has-text("Post-it")').tap(); await escrever(p, 'Verificar cloro da caixa 2');
await p.locator('[data-ponto=r]').tap(); await escrever(p, 'Registrar na planilha');
await p.locator('[data-ponto=b]').tap(); await escrever(p, 'Avisar o encarregado');
await p.keyboard.press('Escape');
await p.locator('.qd-zoom [aria-label="Ajustar à tela"]').tap(); await espera(p, 300);
await p.locator('.qi[data-cod="Q-002"]').tap(); await espera(p, 300);
await p.screenshot({ path: `${OUT}/depois-celular-quadro.png` });
await p.keyboard.press('Escape');
await p.locator('.qd-vistas button:has-text("Kanban")').tap(); await espera(p, 400);
await p.screenshot({ path: `${OUT}/depois-celular-kanban.png` });
await ctx.close();

/* tema Petróleo */
[ctx, p] = await pagina(PC);
await p.goto(BASE); await espera(p);
await p.locator('.topbar [aria-label="Opções"]').click();
await p.locator('.tema-b[data-tema=petroleo]').click(); await p.keyboard.press('Escape'); await espera(p, 300);
await p.screenshot({ path: `${OUT}/depois-petroleo-inicio.png` });
await ctx.close();
await b.close();
console.log('prints prontos');
