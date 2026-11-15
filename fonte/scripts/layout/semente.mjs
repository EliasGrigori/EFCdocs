/* Vértice Docs — arquivos inventados para os testes e os prints das telas de lista (nenhum dado real).
   Uso: await abrirSemeado(navegador, endereco, { w, h, tema, muitos, toque, atrasoBanco }). */
export const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const PLAN = ['Controle de coletas 2026', 'Estoque do almoxarifado', 'Horas da equipe de campo', 'Potabilidade da água', 'Plano de amostragem', 'Inspeções do mês', 'Calibração de balanças', 'Treinamentos de 2026', 'Lista de fornecedores', 'Custos por talhão', 'Checklist de veículos', 'Controle de EPI', 'Manutenção de bombas', 'Escala de plantão'];
const DOCS = ['POP de higienização', 'Formulário de visita', 'Ata da reunião de segurança', 'Instrução de colheita', 'Política de qualidade', 'Relatório mensal'];
const QUAD = ['Quadro de tarefas da semana', 'Fluxo de recebimento', 'Kanban da manutenção', 'Mapa de riscos'];
const INT = [['Etiquetas', 'ETQ-001', 'Etiqueta de amostra', 'planilha'], ['Etiquetas', 'ETQ-002', 'Etiqueta de lote', 'planilha'], ['Fichas e custódias', 'FIC-010', 'Ficha de custódia', 'planilha'], ['Formulários', 'FOR-021', 'Registro de inspeção', 'planilha'], ['Formulários', 'FOR-022', 'Lista de presença', 'planilha'], ['Fluxogramas', 'FLX-003', 'Fluxo de não conformidade', 'postits'], ['POPs e procedimentos', 'POP-007', 'Coleta de água', 'planilha']];

/** Troca os arquivos do banco do app (IndexedDB "efcdocs") pelos inventados. Precisa de um arquivo de cada tipo já criado pela tela (molde). */
export async function semear(page, { muitos = 0, lixeira = 3 } = {}) {
  await page.evaluate(async ({ PLAN, DOCS, QUAD, INT, muitos, lixeira }) => {
    const db = await new Promise((ok, erro) => { const r = indexedDB.open('efcdocs', 1); r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error); });
    const todos = await new Promise((ok) => { const r = db.transaction('arquivos').objectStore('arquivos').getAll(); r.onsuccess = () => ok(r.result); });
    const molde = {}; todos.forEach((r) => { molde[r.ficha.tipo] = molde[r.ficha.tipo] || r; });
    const novos = []; let n = 0;
    const base = Date.parse('2026-11-14T13:30:00Z');
    const por = (tipo, nome, extra = {}) => {
      const m = molde[tipo]; if (!m) return; n++;
      const em = new Date(base - n * 1000 * 60 * 47).toISOString(), id = 'dsem' + String(n).padStart(4, '0');
      novos.push({ ...m, id, marca: 'sem' + n, ficha: { ...m.ficha, id, tipo, nome, criadoEm: em, alteradoEm: em, ...extra } });
    };
    PLAN.forEach((x) => por('planilha', x)); DOCS.forEach((x) => por('docx', x)); QUAD.forEach((x) => por('postits', x));
    INT.forEach(([pastaNome, codigo, nome, tipo]) => por(tipo, nome, { pastaNome, codigo }));
    for (let i = 0; i < lixeira; i++) por('planilha', ['Rascunho antigo', 'Teste de importação', 'Cópia de estoque'][i % 3], { status: 'lixeira', lixeiraEm: new Date(base - i * 86400000).toISOString() });
    for (let i = 0; i < muitos; i++) por('planilha', 'Registro ' + String(i + 1).padStart(3, '0') + ' de coleta');
    await new Promise((ok, erro) => { const t = db.transaction('arquivos', 'readwrite'); const s = t.objectStore('arquivos'); todos.forEach((r) => s.delete(r.id)); novos.forEach((r) => s.put(r)); t.oncomplete = ok; t.onerror = () => erro(t.error); });
    db.close();
  }, { PLAN, DOCS, QUAD, INT, muitos, lixeira });
}

/** Faz o banco demorar a abrir (para ver o esqueleto): só nesta página de teste, nada muda no app. */
export const ATRASAR_BANCO = (ms) => `(() => { const abrir = IDBFactory.prototype.open; IDBFactory.prototype.open = function (...a) {
  const real = abrir.apply(this, a), falso = {};
  real.onupgradeneeded = (e) => { falso.result = real.result; falso.transaction = real.transaction; if (falso.onupgradeneeded) falso.onupgradeneeded(e); };
  real.onsuccess = () => setTimeout(() => { falso.result = real.result; if (falso.onsuccess) falso.onsuccess({ target: falso }); }, ${ms});
  real.onerror = () => { falso.error = real.error; if (falso.onerror) falso.onerror({ target: falso }); };
  return falso; }; })();`;

/** Abre o app, cria um arquivo de cada tipo pela tela (moldes), semeia e recarrega. */
export async function abrirSemeado(nav, url, { w = 1280, h = 800, tema = 'claro', muitos = 0, toque = false, reduzido = false, escala = 1 } = {}) {
  const ctx = await nav.newContext({ deviceScaleFactor: escala, viewport: { width: w, height: h }, hasTouch: toque, reducedMotion: reduzido ? 'reduce' : 'no-preference', serviceWorkers: 'block', locale: 'pt-BR', timezoneId: 'America/Fortaleza', colorScheme: tema === 'escuro' ? 'dark' : 'light' });
  const page = await ctx.newPage();
  const erros = []; page.on('pageerror', (e) => erros.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
  await page.goto(url);
  const criar = w < 900 ? null : '[data-novo]';
  for (const t of ['planilha', 'docx', 'postits']) {
    await page.goto(url + '#/'); await page.waitForSelector(`.cartao-novo[data-novo="${t}"]`, { timeout: 20000 });
    await page.click(`.cartao-novo[data-novo="${t}"]`); await espera(600);
  }
  void criar;
  await page.goto(url + '#/'); await espera(250);
  await semear(page, { muitos });
  await page.evaluate((tema) => { const p = JSON.parse(localStorage.getItem('efcdocs:prefs') || '{}'); p.tema = tema === 'escuro' ? 'dark' : 'papel'; localStorage.setItem('efcdocs:prefs', JSON.stringify(p)); }, tema);
  await page.reload(); await page.waitForSelector('.wk-main'); await espera(400);
  return { ctx, page, erros };
}
