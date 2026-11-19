/* Vértice Docs — v0.6.22: pinça no celular (D-61), soltar arquivo em qualquer tela (D-62), menu que se esconde em tela média (D3).
   Uso: node scripts/testar-toque-arquivos.mjs <endereço>. Arquivos inventados (amostra do projeto e um Word/PDF de mentira). */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { abrirSemeado, espera } from './layout/semente.mjs';
const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
let ok = 0, falhas = 0;
const certo = (c, m) => { if (!c) throw new Error(m); };
async function caso(nome, f) { try { await f(); ok++; console.log('  ok   ' + nome); } catch (e) { falhas++; console.log('  FALHA ' + nome + ' — ' + String(e.message || e).slice(0, 300)); } }
const nav = await chromium.launch({ executablePath: CHROME });
const XLSX = readFileSync(new URL('../testes/amostras/amostra-qualidade.xlsx', import.meta.url)).toString('base64');
const abrePlanilha = async (p) => { await p.goto(BASE + '#/planilha'); await p.locator('.tb-arq tr.arq .abre').first().click(); await p.waitForSelector('.pl-cv'); await espera(600); };
/* solta um arquivo (base64) em cima de um elemento, como o arrastar do Windows faz */
const soltar = (p, sel, nome, tipo, b64) => p.evaluate(async ({ sel, nome, tipo, b64 }) => {
  const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  const dt = new DataTransfer(); dt.items.add(new File([u], nome, { type: tipo }));
  const alvo = document.querySelector(sel) || document.body;
  for (const t of ['dragenter', 'dragover']) alvo.dispatchEvent(new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt }));
  await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
  const fundo = !!document.querySelector('.solta-tela');
  const d = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }); alvo.dispatchEvent(d);
  return { fundo, impedido: d.defaultPrevented };
}, { sel, nome, tipo, b64 });
const MIME_X = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/* ---------- D-61: pinça ---------- */
const cel = await abrirSemeado(nav, BASE, { w: 390, h: 844, toque: true, reduzido: true });
await abrePlanilha(cel.page);
const pinca = async (p, de, ate) => {
  const cdp = await p.context().newCDPSession(p); const b = await p.locator('.pl-cv').boundingBox();
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2, pts = (d) => [{ x: cx - d, y: cy, id: 1 }, { x: cx + d, y: cy, id: 2 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(de) });
  const passo = (ate - de) / 10; for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(de + passo * i) }); await espera(20); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await espera(400);
};
const zoom = (p) => p.locator('.pl-zpct').innerText();
await caso('Pinça no celular: abrir os dedos aproxima (mais de 100%); fechar afasta; a seleção continua numa célula só', async () => {
  const p = cel.page; certo(await zoom(p) === '100%', 'começa em 100%: ' + await zoom(p));
  await pinca(p, 40, 120); const z1 = parseInt(await zoom(p), 10); certo(z1 > 150, 'aproximou: ' + z1 + '%');
  await pinca(p, 120, 40); const z2 = parseInt(await zoom(p), 10); certo(z2 < z1 && z2 <= 110, 'afastou: ' + z2 + '%');
  const nome = await p.locator('.pl-nome').inputValue(); certo(!nome.includes(':'), 'seleção de uma célula: ' + nome);
  certo(await p.locator('.pl-menu').count() === 0, 'o primeiro dedo da pinça não abre o menu da célula');
});
await caso('Pinça respeita o mínimo e o máximo do zoom; sem erro no console', async () => {
  const p = cel.page; const z = []; for (const [a, b] of [[20, 170], [20, 170], [170, 10], [170, 10]]) { await pinca(p, a, b); z.push(parseInt(await zoom(p), 10)); }
  console.log('     zoom depois de cada pinça:', z.join(', ')); const zmax = z[1], zmin = z[3];
  certo(zmax === 200 && zmin === 50, `máximo ${zmax}%, mínimo ${zmin}%`);
  certo(cel.erros.length === 0, cel.erros.slice(0, 2).join(' | '));
});
await cel.ctx.close();

/* ---------- D-62: soltar arquivo ---------- */
const pc = await abrirSemeado(nav, BASE, { reduzido: true }); const q = pc.page;
await caso('Soltar um .xlsx no Início: aparece "Solte para abrir" e a janela do Excel já lê o arquivo; Abrir cria a planilha', async () => {
  await q.goto(BASE + '#/'); await q.waitForSelector('.wk-main'); await espera(300);
  const r = await soltar(q, '.wk-main', 'Amostra de controle.xlsx', MIME_X, XLSX);
  certo(r.fundo && r.impedido, 'o app aceitou o arrasto: ' + JSON.stringify(r));
  await q.waitForSelector('[data-excel-abrir]', { timeout: 30000 });
  certo(/Amostra de controle/.test(await q.locator('.janela-excel').innerText()), 'a janela mostra o arquivo solto');
  await q.click('[data-excel-abrir]'); await q.waitForSelector('.pl-cv', { timeout: 20000 });
  certo(/Amostra de controle/.test(await q.locator('body').innerText()), 'abriu a planilha com o nome do arquivo');
});
await caso('Soltar um .xlsx com uma planilha aberta também abre a janela do Excel (o arquivo vira uma planilha nova)', async () => {
  await abrePlanilha(q);
  const r = await soltar(q, '.pl-cv', 'Outra amostra.xlsx', MIME_X, XLSX); certo(r.impedido, 'aceitou');
  await q.waitForSelector('[data-excel-abrir]', { timeout: 30000 });
  await q.keyboard.press('Escape'); await espera(400); certo(await q.locator('.janela-excel').count() === 0, 'Esc fecha a janela');
});
await caso('Soltar um Word e um PDF: o app não abre a página do arquivo e diz quando cada um chega', async () => {
  await q.goto(BASE + '#/'); await q.waitForSelector('.wk-main'); await espera(300);
  const w = await soltar(q, '.wk-main', 'Procedimento.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', btoa('PK falso'));
  await espera(300); const t1 = await q.locator('body').innerText();
  const pdf = await soltar(q, '.wk-main', 'Laudo.pdf', 'application/pdf', btoa('%PDF-1.4 falso'));
  await espera(300); const t2 = await q.locator('body').innerText();
  certo(w.impedido && pdf.impedido, 'o navegador não abre o arquivo no lugar do app');
  certo(/é do Word\. Abrir Word chega/.test(t1) && /é um PDF\./.test(t2), 'avisos');
  certo(await q.locator('.janela-excel').count() === 0, 'nenhuma janela do Excel');
});
await caso('Dentro da janela do Excel, soltar na área continua lendo o arquivo uma vez só', async () => {
  await q.goto(BASE + '#/'); await q.waitForSelector('[data-abrir-excel]'); await q.click('[data-abrir-excel]'); await q.waitForSelector('.solta-excel');
  await soltar(q, '.solta-excel', 'Pela janela.xlsx', MIME_X, XLSX);
  await q.waitForSelector('[data-excel-abrir]', { timeout: 30000 }); certo(/Pela janela/.test(await q.locator('.janela-excel').innerText()), 'leu');
  await q.keyboard.press('Escape'); await espera(300);
  certo(pc.erros.length === 0, pc.erros.slice(0, 2).join(' | '));
});
await pc.ctx.close();

/* ---------- D3: menu lateral em tela média ---------- */
for (const [w, esconde] of [[1366, true], [1440, true], [1920, false]]) {
  const t = await abrirSemeado(nav, BASE, { w, h: 800, reduzido: true }); const p = t.page;
  await caso(`Tela de ${w}: no Início o menu aparece; com a planilha aberta ${esconde ? 'ele se esconde sozinho (a alça fica)' : 'ele continua'}`, async () => {
    await p.goto(BASE + '#/'); await p.waitForSelector('.wk-main'); await espera(300);
    certo(await p.locator('nav.rail').count() === 1, 'menu no Início');
    await abrePlanilha(p);
    const n = await p.locator('nav.rail').count();
    certo(esconde ? n === 0 : n === 1, 'menu com a planilha aberta: ' + n);
    if (esconde) {
      await p.locator('.app[data-menu-auto]').waitFor();
      const mais = await p.evaluate(() => document.querySelector('.ribbon').getBoundingClientRect().left);
      certo(mais < 60, 'a faixa ganhou o espaço do menu: começa em ' + mais);
    }
  });
  if (esconde && w === 1366) {
    await caso('Tela média: a alça mostra o menu de novo e ele fica enquanto a planilha está aberta; ao sair, a escolha guardada continua', async () => {
      await p.locator('[data-menu-alca]').click(); await espera(400);
      certo(await p.locator('nav.rail').count() === 1, 'a alça mostrou o menu');
      await p.locator('.pl-cv').click({ position: { x: 300, y: 200 } }); await espera(300);
      certo(await p.locator('nav.rail').count() === 1, 'continua depois de clicar na planilha');
      await p.goto(BASE + '#/'); await p.waitForSelector('.wk-main'); await espera(300);
      certo(await p.locator('nav.rail').count() === 1, 'menu no Início');
      certo(await p.evaluate(() => JSON.parse(localStorage.getItem('efcdocs:prefs') || '{}').menu || 'completo') === 'completo', 'a preferência guardada não mudou');
      await abrePlanilha(p); certo(await p.locator('nav.rail').count() === 0, 'abrir a planilha de novo esconde de novo');
      certo(t.erros.length === 0, t.erros.slice(0, 2).join(' | '));
    });
  }
  await t.ctx.close();
}

/* ---------- v0.6.23 (D10): a pinça aproxima no ponto entre os dedos ---------- */
const c2 = await abrirSemeado(nav, BASE, { w: 390, h: 844, toque: true, reduzido: true });
await abrePlanilha(c2.page);
await caso('Pinça (D10): a célula embaixo do ponto entre os dedos continua embaixo dele depois de aproximar', async () => {
  const p = c2.page; const b = await p.locator('.pl-cv').boundingBox();
  const P = { x: b.x + 230, y: b.y + 260 };
  await p.touchscreen.tap(P.x, P.y); await espera(300); const antes = await p.locator('.pl-nome').inputValue();
  await p.touchscreen.tap(b.x + 60, b.y + 40); await espera(800); /* tira a seleção (e as alças) de baixo dos dedos */
  const cdp = await p.context().newCDPSession(p), pts = (d) => [{ x: P.x - d, y: P.y, id: 1 }, { x: P.x + d, y: P.y, id: 2 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(30) });
  for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(30 + 3 * i) }); await espera(30); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await espera(600);
  const z = parseInt(await p.locator('.pl-zpct').innerText(), 10);
  await p.touchscreen.tap(P.x, P.y); await espera(300); const depois = await p.locator('.pl-nome').inputValue();
  certo(z > 120 && antes === depois, `zoom ${z}%; célula antes ${antes}, depois ${depois}`);
});
await caso('Pinça com os dedos em cima das alças da seleção também aproxima (e não mexe na seleção)', async () => {
  const p = c2.page; const b = await p.locator('.pl-cv').boundingBox();
  const P = { x: b.x + 230, y: b.y + 200 };
  await p.touchscreen.tap(P.x, P.y); await espera(400); const nome = await p.locator('.pl-nome').inputValue();
  const z0 = parseInt(await p.locator('.pl-zpct').innerText(), 10);
  const cdp = await p.context().newCDPSession(p), pts = (d) => [{ x: P.x - d, y: P.y, id: 1 }, { x: P.x + d, y: P.y, id: 2 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(40) });
  for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(40 - 2 * i) }); await espera(30); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await espera(600);
  const z1 = parseInt(await p.locator('.pl-zpct').innerText(), 10);
  certo(z1 < z0 && !(await p.locator('.pl-nome').inputValue()).includes(':'), `zoom ${z0}% → ${z1}%; seleção ${nome} → ${await p.locator('.pl-nome').inputValue()}`);
});
await c2.ctx.close();

/* ---------- v0.6.23: atalhos do Excel em português ---------- */
const at = await abrirSemeado(nav, BASE, { reduzido: true }); const r = at.page;
await abrePlanilha(r);
const vai = async (ref) => { await r.locator('.pl-nome').click(); await r.locator('.pl-nome').fill(ref); await r.locator('.pl-nome').press('Enter'); await espera(120); };
const escreve = async (ref, t) => { await vai(ref); await r.keyboard.type(t); await r.keyboard.press('Enter'); await espera(80); };
const ligado = (cmd) => r.locator(`.ribbon [data-cmd="${cmd}"]`).first().getAttribute('aria-pressed');
const rodape = () => r.locator('.foot-desfazer').innerText().catch(() => '');
for (const [ref, t] of [['A1', 'Fruta'], ['B1', 'Caixas'], ['C1', 'Lote'], ['A2', 'Mamão'], ['B2', '=1+1'], ['C2', 'A'], ['A3', 'Acerola'], ['B3', '12'], ['C3', 'B'], ['A4', 'Banana'], ['B4', '45']]) await escreve(ref, t);
await caso('Ctrl+2 e Ctrl+Alt+N ligam e desligam o negrito; Ctrl+3 o itálico; Ctrl+5 o tachado', async () => {
  await vai('A2'); await r.keyboard.press('Control+2'); await espera(200); certo(await ligado('formatar.negrito') === 'true', 'Ctrl+2');
  await r.keyboard.press('Control+Alt+n'); await espera(200); certo(await ligado('formatar.negrito') === 'false', 'Ctrl+Alt+N desliga');
  await r.keyboard.press('Control+3'); await espera(200); certo(await ligado('formatar.italico') === 'true', 'Ctrl+3');
  await r.keyboard.press('Control+5'); await espera(200); certo(/Tachado/.test(await rodape()), 'Ctrl+5: ' + await rodape());
});
await caso('Ctrl+B salva (como no Excel em português) e não mexe no negrito', async () => {
  await vai('A3'); await r.keyboard.press('Control+b'); await espera(300);
  certo(/Salvo:/.test(await r.locator('body').innerText()), 'aviso de salvo'); certo(await ligado('formatar.negrito') === 'false', 'negrito não mudou');
});
await caso('Ctrl+Shift+# põe formato de data; Ctrl+Shift+! de número; Ctrl+Shift+~ volta para Geral', async () => {
  await vai('B3'); await r.keyboard.press('Control+Shift+Digit3'); await espera(200); const d = await r.locator('[data-cx=numero] .rb-cx-v').innerText();
  await r.keyboard.press('Control+Shift+Digit1'); await espera(200); const n = await r.locator('[data-cx=numero] .rb-cx-v').innerText();
  await r.keyboard.press('Control+Shift+Backquote'); await espera(200); const g = await r.locator('[data-cx=numero] .rb-cx-v').innerText();
  certo(/Data/.test(d) && /Número/.test(n) && g === 'Geral', [d, n, g].join(' · '));
});
await caso('Ctrl+K abre Inserir link e Ctrl+Alt+T abre Criar tabela; a busca da planilha mostra Alt Q', async () => {
  await vai('A4'); await r.keyboard.press('Control+k'); await espera(400); const j1 = await r.locator('.janela').innerText().catch(() => '');
  await r.keyboard.press('Escape'); await espera(300);
  await vai('A2'); await r.keyboard.press('Control+Alt+t'); await espera(400); const j2 = await r.locator('.janela').innerText().catch(() => '');
  await r.keyboard.press('Escape'); await espera(300);
  certo(/[Ll]ink/.test(j1) && /[Tt]abela/.test(j2), 'janelas: ' + j1.slice(0, 40) + ' / ' + j2.slice(0, 40));
  certo(/Alt Q/.test(await r.locator('.ribbon, .topo, body').first().innerText()), 'Alt Q na busca');
});
await caso("Ctrl+' começa a editar com a fórmula da célula de cima; Esc cancela", async () => {
  await vai('B3'); await r.keyboard.press("Control+'"); await espera(250);
  const t = await r.locator('.ef-campo').first().inputValue().catch(() => ''); await r.keyboard.press('Escape'); await espera(150);
  certo(t === '=1+1', 'edição: ' + t);
});
await caso('Ctrl+Shift+* escolhe a região dos dados; Shift+F3 abre Inserir função; Ctrl+Shift+L liga o filtro', async () => {
  await vai('B3'); await r.keyboard.press('Control+Shift+Digit8'); await espera(200); const reg = await r.locator('.foot').innerText();
  await r.keyboard.press('Shift+F3'); await espera(400); const fn = await r.locator('.janela.pl-jfun').count(); await r.keyboard.press('Escape'); await espera(300);
  await vai('A1'); await r.keyboard.press('Control+Shift+L'); await espera(300); const fil = (await r.locator('[data-seta-filtro]').count()) > 0 ? 'true' : 'false'; /* v0.6.30 (D4): o Filtrar da Página Inicial fica na lista; as setas nos títulos dizem que ligou */
  await r.keyboard.press('Control+Shift+L'); await espera(300);
  certo(/Contagem: 11/.test(reg) && fn === 1 && fil === 'true', `região ${reg.replace(/\s+/g, ' ').slice(0, 80)}, função ${fn}, filtro ${fil}`);
});
await caso('Ctrl+9 esconde a linha; com linhas inteiras, Ctrl+- exclui e Ctrl+Z volta; com células soltas, avisa', async () => {
  await vai('A3'); await r.keyboard.press('Control+9'); await espera(250); await vai('A2'); await r.keyboard.press('ArrowDown'); await espera(120);
  const pulou = await r.locator('.pl-nome').inputValue(); await r.keyboard.press('Control+z'); await espera(250);
  await vai('A2'); await r.keyboard.press('Control+Minus'); await espera(300); const aviso = /linhas inteiras/.test(await r.locator('body').innerText());
  await vai('A4'); await r.keyboard.press('Shift+Space'); await espera(150); await r.keyboard.press('Control+Minus'); await espera(300);
  await vai('A4'); const sumiu = await r.locator('.pl-fx-campo').innerText(); await r.keyboard.press('Control+z'); await espera(300); await vai('A4'); const voltou = await r.locator('.pl-fx-campo').innerText();
  certo(pulou === 'A4' && aviso && sumiu === '' && voltou === 'Banana', `pulou ${pulou}, aviso ${aviso}, sumiu "${sumiu}", voltou "${voltou}"`);
});
await caso('Alça: A e B arrastados viram C e D (pedido do Elias)', async () => {
  await vai('C2'); await r.keyboard.down('Shift'); await r.keyboard.press('ArrowDown'); await r.keyboard.up('Shift'); await espera(150);
  const cv = await r.locator('.pl-cv').boundingBox(), x = cv.x + 30 + 2 * 80 + 79, y0 = cv.y + 24 + 3 * 22 - 1, y1 = cv.y + 24 + 5 * 22 - 4;
  await r.mouse.move(x, y0); await r.mouse.down(); await r.mouse.move(x, y1, { steps: 12 }); await r.mouse.up(); await espera(300);
  await vai('C4'); const c4 = await r.locator('.pl-fx-campo').innerText(); await vai('C5'); const c5 = await r.locator('.pl-fx-campo').innerText();
  certo(c4 === 'C' && c5 === 'D', `C4 "${c4}", C5 "${c5}"`);
});
await caso('Sem erro no console nos atalhos', async () => { certo(at.erros.length === 0, at.erros.slice(0, 3).join(' | ')); });
await at.ctx.close();
await nav.close();
console.log(`\n${ok} de ${ok + falhas} conferências de toque e arquivos passaram.`);
process.exit(falhas ? 1 : 0);
