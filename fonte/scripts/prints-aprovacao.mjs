/* EFCdocs — prints de antes (v0.4.2 em /v042/) e depois (v0.4.3) para a página de aprovação das correções.
   Uso: node scripts/prints-aprovacao.mjs <endereço> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.argv[2], OUT = process.argv[3];
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const PC = { viewport: { width: 1366, height: 800 } };
const CEL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const espera = (p, ms = 150) => p.waitForTimeout(ms);
const foto = (p, nome, clip) => p.screenshot({ path: `${OUT}/${nome}.png`, ...(clip ? { clip } : {}) });

const ir = async (p, r) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(r); await p.locator('.pl-nome').press('Enter'); await espera(p, 80); };
const digitar = async (p, r, lista) => { await ir(p, r); for (const t of lista) { await p.keyboard.type(t); await p.keyboard.press('Enter'); } await espera(p, 120); };
const cmd = (p, id) => p.locator(`[data-cmd="${id}"]`).first().click();
const nova = async (p, raiz) => { await p.goto(raiz + '#/planilha'); await espera(p, 900); await p.click('[data-novo=planilha]'); await espera(p, 500); };
const tema = async (p, id) => {
  await p.locator('.topbar [aria-label="Opções"]').click(); await espera(p);
  await p.locator(`.tema-b[data-tema="${id}"]`).click(); await espera(p);
  await p.keyboard.press('Escape'); await espera(p, 250);
};
const perfil = async (p, nome) => {
  await p.locator('.topbar [aria-label="Opções"]').click(); await espera(p);
  await p.locator(`.opcoes .chipb:has-text("${nome}")`).click();
  await p.keyboard.press('Escape'); await espera(p, 200);
};
const grade = async (p, w = 560, h = 260) => { const c = await p.locator('.pl-cv').boundingBox(); return { x: c.x, y: c.y - 60, width: w, height: h + 60 }; };



const faixaClip = { x: 0, y: 0, width: 1366, height: 190 };
const exemplo = async (p) => {
  await digitar(p, 'A1', ['Lote', 'L-012', 'L-013', 'L-014', 'L-015']);
  await digitar(p, 'B1', ['Cloro livre', '1,2', '0,3', "'1,4", '2']);
  await digitar(p, 'C1', ['Situação', '=SE(E(B2>=0,5;B2<=2);"OK";"Ajustar")', '=SE(E(B3>=0,5;B3<=2);"OK";"Ajustar")', '=SE(E(B4>=0,5;B4<=2);"OK";"Ajustar")', '=SE(E(B5>=0,5;B5<=2);"OK";"Ajustar")']);
  await digitar(p, 'D1', ['Qtd. amostras', '10', '', '5', '4']);
  await digitar(p, 'E1', ['Conformes', '9', '4', '5', '4']);
  await digitar(p, 'F1', ['% conformes', '=E2/D2', '=E3/D3', '=E4/D4', '=E5/D5']);
  await digitar(p, 'G1', ['Meta', '=F2*1,15', '=F3*1,15']);
  await digitar(p, 'H1', ['Total', '=SOMA(F2:F5)']);
};
for (const [lado, raiz] of [['antes', BASE + 'v042/'], ['depois', BASE]]) {
  {
    const ctx = await b.newContext(PC); const p = await ctx.newPage();
    await nova(p, raiz);
    await exemplo(p);
    await ir(p, 'C2');
    await p.click('.tab:has-text("Fórmulas")'); await espera(p, 250);
    await foto(p, `${lado}-faixa-formulas`, faixaClip);
    if (lado === 'antes') {
      await cmd(p, 'formula.explicar'); await espera(p, 300);
      await foto(p, 'antes-explicar');
      /* o erro: só o painel de detalhes */
      await ir(p, 'H2');
      await p.locator('.topbar [aria-label*="ainel"]').first().click().catch(() => {}); await espera(p, 400);
      await foto(p, 'antes-erro');
      await p.locator('.topbar [aria-label*="ainel"]').first().click().catch(() => {}); await espera(p, 200);
    } else {
      await cmd(p, 'formula.explicar'); await espera(p, 400);
      await foto(p, 'depois-explicar');
      await p.keyboard.press('Escape'); await espera(p, 200);
      await ir(p, 'H2'); await cmd(p, 'formula.explicar'); await espera(p, 400);
      await foto(p, 'depois-erro');
      await p.keyboard.press('Escape'); await espera(p, 200);
      await p.locator('.pl-lamp').click(); await espera(p, 400);
      await foto(p, 'depois-problemas');
      await p.locator('.pl-lamp').click(); await espera(p, 200);
      await ir(p, 'H2'); await cmd(p, 'formula.fluxo'); await espera(p, 500);
      await foto(p, 'depois-fluxo');
      await p.click('.pl-jfluxo button:has-text("Mandar para um quadro novo")'); await espera(p, 1200);
      await foto(p, 'depois-quadro');
      await p.goBack(); await espera(p, 1200);
      await ir(p, 'J2'); await p.click('.tab:has-text("Fórmulas")'); await espera(p, 150);
      await cmd(p, 'formula.montar'); await espera(p, 400);
      await p.locator('.pl-jmontar select').first().selectOption({ label: 'Situação (C)' });
      await p.locator('.pl-jmontar input').first().fill('Ajustar'); await espera(p, 250);
      await foto(p, 'depois-montar');
      await p.keyboard.press('Escape'); await espera(p, 200);
    }
    /* N04: botão direito no cabeçalho da coluna C */
    const cv = await p.locator('.pl-cv').boundingBox();
    await p.mouse.click(cv.x + 46 + 80 * 2 + 40, cv.y + 10, { button: 'right' }); await espera(p, 350);
    await foto(p, `${lado}-cabecalho`, { x: 0, y: 0, width: 900, height: 620 });
    await p.keyboard.press('Escape'); await espera(p, 200);
    /* LAMBDA e prévia de função que falta */
    await ir(p, 'B8');
    await p.keyboard.type('=LAMBDA(x;x*2)(4)'); await espera(p, 250);
    await foto(p, `${lado}-lambda`, await grade(p, 760, 420));
    await p.keyboard.press('Escape'); await espera(p, 150);
    await ir(p, 'B9');
    await p.keyboard.type('=CORREL(B2:B5;D2:D5)'); await espera(p, 250);
    await foto(p, `${lado}-correl`, await grade(p, 760, 420));
    await p.keyboard.press('Escape'); await espera(p, 150);
    await ir(p, 'B10');
    await p.keyboard.type('=PROVC(A2;A2:C5;3;0)'); await espera(p, 250);
    await foto(p, `${lado}-provc`, await grade(p, 760, 420));
    await p.keyboard.press('Escape'); await espera(p, 150);
    /* dicas: Negrito e Tabela dinâmica */
    await p.click('.tab:has-text("Página Inicial")'); await espera(p, 150);
    await p.hover('.ribbon [data-cmd="formatar.negrito"]'); await espera(p, 800);
    await foto(p, `${lado}-dica-negrito`, { x: 0, y: 0, width: 700, height: 260 });
    await p.mouse.move(700, 500); await espera(p, 200);
    await p.click('.tab:has-text("Dados")'); await espera(p, 150);
    await p.hover('.ribbon [data-cmd="dados.dinamica"]'); await espera(p, 800);
    await foto(p, `${lado}-dica-dinamica`, { x: 300, y: 0, width: 800, height: 280 });
    await p.mouse.move(700, 500); await espera(p, 200);
    /* Início */
    await p.goto(raiz + '#/'); await espera(p, 700);
    await foto(p, `${lado}-inicio`, { x: 210, y: 0, width: 1156, height: 330 });
    await ctx.close();
  }
  /* quadro: faixa e dica do Colar */
  {
    const ctx = await b.newContext(PC); const p = await ctx.newPage();
    await p.goto(raiz + '#/postits'); await espera(p, 900);
    await p.click('[data-novo=postits]'); await espera(p, 600);
    await p.click('.tab:has-text("Página Inicial")'); await espera(p, 200);
    await p.hover('.ribbon [data-cmd="editar.colar"]'); await espera(p, 800);
    await foto(p, `${lado}-quadro-faixa`, { x: 0, y: 0, width: 1000, height: 260 });
    await ctx.close();
  }
  /* 800 px */
  {
    const ctx = await b.newContext({ viewport: { width: 800, height: 700 } }); const p = await ctx.newPage();
    await nova(p, raiz);
    await foto(p, `${lado}-faixa-800`, { x: 0, y: 0, width: 800, height: 230 });
    await ctx.close();
  }
}
await b.close();
console.log('prints prontos em ' + OUT);
