/* EFCdocs — prints de antes (v0.4.0 em /v040/) e depois (v0.4.1) para a página de aprovação das correções.
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

for (const [lado, raiz] of [['antes', BASE + 'v040/'], ['depois', BASE]]) {
  /* G01: o mesmo arquivo em duas abas */
  {
    const ctx = await b.newContext(PC); const p = await ctx.newPage();
    await nova(p, raiz);
    await digitar(p, 'A1', ['Lote', 'L-012']);
    const p2 = await ctx.newPage();
    await p2.goto(p.url()); await espera(p2, 1200);
    await ir(p2, 'B1'); await p2.keyboard.type('Digitado na aba 2'); await p2.keyboard.press('Enter'); await espera(p2, 400);
    await foto(p2, `${lado}-duas-abas`, { x: 0, y: 0, width: 1366, height: 330 });
    if (lado === 'depois') {
      /* conflito: outro lugar gravou no meio */
      await p.bringToFront();
      await p.evaluate(() => new Promise((ok) => {
        const id = location.hash.split('/').pop();
        const r = indexedDB.open('efcdocs');
        r.onsuccess = () => { const t = r.result.transaction('arquivos', 'readwrite'); const s = t.objectStore('arquivos'); const g = s.get(id); g.onsuccess = () => s.put({ ...g.result, marca: 'outra' }); t.oncomplete = () => ok(); };
      }));
      await p2.close();
      await espera(p, 600);
      await digitar(p, 'A3', ['L-013']);
      await espera(p, 500);
      await foto(p, 'depois-conflito', { x: 0, y: 0, width: 1366, height: 330 });
    }
    await ctx.close();
  }

  /* G02..G05 e G08, G09 na mesma planilha */
  {
    const ctx = await b.newContext(PC); const p = await ctx.newPage();
    await nova(p, raiz);
    await digitar(p, 'A1', ['Entrada', '01/03/2024', '=A2+1', '=DATA(2024;2;29)', '25:00', '123456789012345']);
    await digitar(p, 'B1', ['Como foi digitado', "'01/03/2024", "'=A2+1", "'=DATA(2024;2;29)", "'25:00", "'123456789012345"]);
    await ir(p, 'A6'); await espera(p);
    await foto(p, `${lado}-datas`, await grade(p, 520, 150));

    /* dica do SE com o cursor no fim */
    await ir(p, 'D2');
    await p.keyboard.type('=SE(A2>1;"OK";"Não")'); await espera(p, 250);
    await foto(p, `${lado}-dica-fim`, await grade(p, 760, 330));
    await p.keyboard.press('Escape');

    /* mensagens de erro */
    await ir(p, 'D3');
    await p.keyboard.type('=SOMA(A2,A3'); await espera(p, 250);
    await foto(p, `${lado}-mensagens`, await grade(p, 760, 330));
    await p.keyboard.press('Escape');
    await ir(p, 'D4');
    await p.keyboard.type('=PROCV(A2)'); await espera(p, 250);
    await foto(p, `${lado}-mensagens2`, await grade(p, 760, 440));
    await p.keyboard.press('Escape');

    /* congelar a linha 1 e rolar */
    await ir(p, 'A1');
    await p.click('.tab:has-text("Exibir")');
    await cmd(p, 'exibir.congelar');
    await p.locator('.pl-opcao:has-text("Congelar a linha de cima")').click(); await espera(p);
    await p.locator('.pl-rol').evaluate((el) => { el.scrollTop = 300; }); await espera(p, 250);
    { const c = await p.locator('.pl-cv').boundingBox(); await foto(p, `${lado}-congelado`, { x: c.x, y: c.y, width: 260, height: 120 }); }
    await p.locator('.pl-rol').evaluate((el) => { el.scrollTop = 0; }); await espera(p);
    await p.click('.tab:has-text("Página Inicial")');

    /* cores da fonte nos temas */
    await digitar(p, 'F1', ['Cor da fonte', 'Preto', 'Amarelo', 'Vermelho', 'Azul escuro', 'Laranja']);
    const cores = [['F2', 'Preto'], ['F3', 'Amarelo'], ['F4', 'Vermelho'], ['F5', 'Azul escuro'], ['F6', 'Laranja']];
    for (const [r, nome] of cores) {
      await ir(p, r);
      await cmd(p, 'formatar.corFonte'); await espera(p, 120);
      await p.locator(`.pl-cor[title="${nome}"]`).first().click(); await espera(p, 80);
    }
    await ir(p, 'H1');
    const clipCores = async () => { const c = await p.locator('.pl-cv').boundingBox(); return { x: c.x + 46 + 80 * 5, y: c.y, width: 120, height: 24 + 22 * 6 }; };
    await tema(p, 'light'); await foto(p, `${lado}-cores-claro`, await clipCores());
    await tema(p, 'dark'); await foto(p, `${lado}-cores-escuro`, await clipCores());
    await tema(p, 'light');

    /* barra de fórmulas com o número grande */
    await ir(p, 'A6'); await espera(p);
    { const c = await p.locator('.pl-cv').boundingBox(); await foto(p, `${lado}-barra-numero`, { x: 0, y: c.y - 44, width: 700, height: 44 + 24 + 22 * 6 }); }

    /* Leitor tenta digitar */
    await perfil(p, 'Leitor');
    await ir(p, 'C2'); await p.keyboard.type('x'); await espera(p, 300);
    await foto(p, `${lado}-leitor`);
    await perfil(p, 'Admin');
    await ctx.close();
  }

  /* G06: celular, dois toques e digitar */
  {
    const ctx = await b.newContext(CEL); const p = await ctx.newPage();
    await p.goto(raiz + '#/planilha'); await espera(p, 900);
    await p.locator('[data-novo=planilha]').tap(); await espera(p, 500);
    const cv = await p.locator('.pl-cv').boundingBox();
    await p.touchscreen.tap(cv.x + 86, cv.y + 35); await espera(p, 120);
    await p.touchscreen.tap(cv.x + 86, cv.y + 35); await espera(p, 200);
    await p.keyboard.type('123'); await espera(p, 200);
    await foto(p, `${lado}-celular`);
    await ctx.close();
  }
}
await b.close();
console.log('prints prontos em ' + OUT);
