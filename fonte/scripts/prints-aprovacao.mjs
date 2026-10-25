/* EFCdocs — prints de antes (v0.3.2 em /v032/) e depois (v0.4.0) para a página de aprovação da Planilha.
   Uso: node scripts/prints-aprovacao.mjs <endereço> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.argv[2], OUT = process.argv[3];
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const PC = { viewport: { width: 1366, height: 800 } };
const espera = (p, ms = 150) => p.waitForTimeout(ms);
const foto = (p, nome) => p.screenshot({ path: `${OUT}/${nome}.png` });

/* antes: a planilha da v0.3.2 ainda era "em breve" */
{
  const ctx = await b.newContext(PC); const p = await ctx.newPage();
  await p.goto(BASE + 'v032/#/planilha'); await espera(p, 900);
  await p.click('[data-novo=planilha]'); await espera(p, 600);
  await foto(p, 'antes-planilha');
  await ctx.close();
}

const ctx = await b.newContext(PC); const p = await ctx.newPage();
const ir = async (r) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(r); await p.locator('.pl-nome').press('Enter'); await espera(p, 80); };
const digitar = async (r, lista) => { await ir(r); for (const t of lista) { await p.keyboard.type(t); await p.keyboard.press('Enter'); } await espera(p, 80); };
const cmd = (id) => p.locator(`[data-cmd="${id}"]`).first().click();
const colar = (t) => p.evaluate((x) => { const d = new DataTransfer(); d.setData('text/plain', x); document.querySelector('.pl-cap').dispatchEvent(new ClipboardEvent('paste', { clipboardData: d, bubbles: true, cancelable: true })); }, t);

await p.goto(BASE + '#/planilha'); await espera(p, 900);
await p.click('[data-novo=planilha]'); await espera(p, 500);
await digitar('A1', ['Controle de cloro livre (exemplo)']);
await ir('A2');
await colar('Lote\tData\tCloro livre\tSituação\r\nL-012\t20/10/2026\t1,2\r\nL-013\t21/10/2026\t0,3\r\nL-014\t22/10/2026\t2,5\r\nL-015\t23/10/2026\t0,8\r\nL-016\t24/10/2026\t1,9\r\n');
await espera(p, 200);
await digitar('F1', ['Meta', '0,5']);
await ir('F2'); await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill('Meta_Cloro'); await p.locator('.pl-nome').press('Enter'); await espera(p);
await ir('A2'); await p.keyboard.press('Shift+ArrowRight'); await p.keyboard.press('Shift+ArrowRight'); await p.keyboard.press('Shift+ArrowRight');
await cmd('formatar.negrito'); await cmd('formatar.preenchimento'); await p.locator('.pl-cor[title="Azul bem claro"]').click(); await espera(p);
await cmd('formatar.bordas'); await p.locator('.pl-menu button:has-text("Contorno")').first().click(); await espera(p);
/* fórmula com a ajuda aberta */
await ir('D3');
await p.keyboard.type('=SE(E(C3>=Meta_Cloro;C3<=2);"OK";"Ajus');
await espera(p, 200);
await foto(p, 'depois-ajuda');
await p.keyboard.type('tar")');
await p.keyboard.press('Enter');
/* alça: leva a fórmula até o fim dos dados (dois toques na alça) */
await ir('D3');
const cv = await p.locator('.pl-cv').boundingBox();
await p.mouse.dblclick(cv.x + 46 + 80 * 4 - 1, cv.y + 24 + 22 * 3 - 1);
await espera(p, 200);
await ir('C3'); await p.keyboard.press('Shift+ArrowDown'); await p.keyboard.press('Shift+ArrowDown'); await p.keyboard.press('Shift+ArrowDown'); await p.keyboard.press('Shift+ArrowDown');
await espera(p);
await p.locator('.pl-st[data-est=soma]').click(); await espera(p);
await foto(p, 'depois-status');
await p.keyboard.press('Escape');
/* barra de fórmula com o nome da coluna */
await ir('D4'); await espera(p);
await foto(p, 'depois-barra');
/* erro antes do Enter */
await ir('E3');
await p.keyboard.type('=SE(C3>=0,5;"OK","Ajustar"'); await espera(p, 200);
await foto(p, 'depois-erro');
await p.keyboard.press('Escape');
/* nome em inglês */
await ir('E3');
await p.keyboard.type('=VLOOKUP("L-013";A3:C7;3;0)'); await espera(p, 200);
await foto(p, 'depois-ingles');
await p.keyboard.press('Enter');
/* formatos */
await digitar('G2', ['Custo', 'R$ 12,5', '8%', '1O/1O/2026']);
await ir('H2'); await p.keyboard.type('Observação comprida que avança sobre as células vazias do lado'); await p.keyboard.press('Enter');
await espera(p, 200);
await foto(p, 'depois-formatos');
await p.click('.tab:has-text("Exibir")'); await cmd('exibir.folhaClara'); await espera(p, 200);
await foto(p, 'depois-folhaclara');
await cmd('exibir.folhaClara');
/* menu do botão direito */
await p.mouse.click(cv.x + 46 + 80 * 2 + 40, cv.y + 24 + 22 * 4 + 10, { button: 'right' }); await espera(p, 200);
await foto(p, 'depois-menu');
await p.keyboard.press('Escape');
/* inserir função */
await p.click('.tab:has-text("Fórmulas")'); await cmd('formula.inserir'); await espera(p, 200);
await p.locator('.pl-jfun-q').fill('contar'); await espera(p, 200);
await foto(p, 'depois-funcoes');
await p.keyboard.press('Escape');
/* quem usa */
await ir('F2'); await cmd('formula.origem'); await espera(p, 200);
await foto(p, 'depois-quemusa');
await p.keyboard.press('Escape');
/* nomes */
await cmd('formula.nomes'); await espera(p, 200);
await foto(p, 'depois-nomes');
await p.keyboard.press('Escape');
/* Ctrl+K */
await p.keyboard.press('Control+k'); await p.keyboard.type('cloro'); await espera(p, 250);
await foto(p, 'depois-ctrlk');
await p.keyboard.press('Escape');
/* abas e congelar */
await p.locator('.pl-aba-nova').click(); await espera(p, 200);
await digitar('A1', ['Resumo da semana', '=MÉDIA(Planilha1!C3:C7)']);
await p.locator('.pl-aba.on').dblclick(); await p.locator('.janela input').fill('Resumo'); await p.locator('.janela .btn.primary').click();
await p.locator('.pl-aba:has-text("Planilha1")').click(); await espera(p, 200);
await p.click('.tab:has-text("Exibir")'); await cmd('exibir.congelar'); await p.locator('.pl-opcao:has-text("Congelar até a célula ativa")').click();
await espera(p, 200);
await foto(p, 'depois-abas');
/* linha do tempo */
await p.locator('.topbar-row [data-cmd="editar.historico"]').click(); await espera(p, 200);
await foto(p, 'depois-tempo');
await p.keyboard.press('Escape');
await ctx.close();

/* 10 mil linhas */
{
  const c2 = await b.newContext(PC); const q = await c2.newPage();
  await q.goto(BASE + '#/planilha'); await espera(q, 900); await q.click('[data-novo=planilha]'); await espera(q, 500);
  const linhas = ['Lote\tCloro livre\tSituação'];
  for (let i = 1; i <= 10000; i++) linhas.push(`L-${String(i).padStart(5, '0')}\t${((i % 25) / 10).toFixed(1).replace('.', ',')}`);
  await q.evaluate((x) => { const d = new DataTransfer(); d.setData('text/plain', x); document.querySelector('.pl-cap').dispatchEvent(new ClipboardEvent('paste', { clipboardData: d, bubbles: true, cancelable: true })); }, linhas.join('\r\n'));
  await espera(q, 400);
  await q.locator('.pl-nome').click(); await q.locator('.pl-nome').fill('E1'); await q.locator('.pl-nome').press('Enter'); await espera(q, 80);
  for (const t of ['Fora da faixa', '=CONT.SES(B:B;"<0,5")+CONT.SE(B:B;">2")', 'Média', '=MÉDIA(B:B)']) { await q.keyboard.type(t); await q.keyboard.press('Enter'); }
  await q.locator('.pl-nome').click(); await q.locator('.pl-nome').fill('A9990'); await q.locator('.pl-nome').press('Enter'); await espera(q, 300);
  await foto(q, 'depois-10mil');
  await c2.close();
}

/* celular */
{
  const c3 = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const q = await c3.newPage();
  await q.goto(BASE + '#/planilha'); await espera(q, 900);
  await q.locator('[data-novo=planilha]').tap(); await espera(q, 500);
  await q.evaluate((x) => { const d = new DataTransfer(); d.setData('text/plain', x); document.querySelector('.pl-cap').dispatchEvent(new ClipboardEvent('paste', { clipboardData: d, bubbles: true, cancelable: true })); }, 'Lote\tCloro\r\nL-1\t1,2\r\nL-2\t0,4\r\nL-3\t2,2');
  await espera(q, 300);
  await foto(q, 'depois-celular-alcas');
  const cv2 = await q.locator('.pl-cv').boundingBox();
  await q.touchscreen.tap(cv2.x + 46 + 80 * 2 + 40, cv2.y + 24 + 22 + 11);
  await espera(q, 100);
  await q.touchscreen.tap(cv2.x + 46 + 80 * 2 + 40, cv2.y + 24 + 22 + 11);
  await espera(q, 60);
  await q.touchscreen.tap(cv2.x + 46 + 80 * 2 + 40, cv2.y + 24 + 22 + 11);
  await q.waitForSelector('.pl-banda');
  await q.locator('.pl-banda textarea').fill('=SE(B2>=0,5;"OK";"Ajustar")');
  await espera(q, 200);
  await foto(q, 'depois-celular-banda');
  await c3.close();
}
await b.close();
console.log('prints em', OUT);
