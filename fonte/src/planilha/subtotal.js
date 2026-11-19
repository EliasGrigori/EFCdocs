/* Vértice Docs v0.6.38 — Planilha: Dados › Subtotal (D9 parte 2b), como o Excel.
   Fica fora de Planilha.jsx (arquivo grande não cresce): aqui só as regras, sem tela.
   - Para cada mudança na coluna escolhida, insere uma linha com o rótulo ("Mamão Total") em negrito e, em cada coluna marcada,
     =SUBTOTAL(n;faixa do grupo); no fim, "Total Geral" com =SUBTOTAL(n;faixa inteira) (o SUBTOTAL não conta os outros SUBTOTAL).
   - Monta os grupos (Agrupar da v0.6.37): dados no nível 2, linhas de subtotal no nível 1, total geral fora.
   - As linhas entram pelo mesmo caminho de "Inserir linha" (operacoes.estrutura): fórmulas e o que está embaixo se ajustam.
   - "Remover todos" apaga as linhas que têm SUBTOTAL na área e tira os grupos dela.
   Tudo vira uma mudança só (um Ctrl+Z desfaz). */
import { chave, letraCol, normalFaixa } from './ref.js';
import { estrutura, Lote } from './operacoes.js';
import { estiloDe } from './modelo.js';
import { lerEntrada } from './entrada.js';
import { normalizarImp } from './impressao.js';
import { criarDiff, aplicarDiff } from '../nucleo/diff.js';

/** [número do SUBTOTAL, nome na lista, rótulo da linha] — os nomes do Excel em português. */
export const FUNCOES = [[9, 'Soma', 'Total'], [3, 'Contagem', 'Contagem'], [1, 'Média', 'Média'], [4, 'Máx', 'Máx'], [5, 'Mín', 'Mín'], [6, 'Produto', 'Produto'], [2, 'Contar núm', 'Contar núm'], [7, 'DesvPad', 'DesvPad'], [8, 'DesvPadP', 'DesvPadP'], [10, 'Var', 'Var'], [11, 'VarP', 'VarP']];
const rotuloDe = (fn) => (FUNCOES.find((x) => x[0] === fn) || FUNCOES[0])[2];
export const MAX_GRUPOS = 2000;

const ehSubtotal = (cel) => !!(cel && cel.f != null && /(^|[^A-Z0-9_.])SUBTOTAL\(/i.test(cel.f));
const textoCru = (cel) => (!cel ? '' : cel.v != null ? String(cel.v) : cel.f != null ? '=' + cel.f : '');

/** Aplica mudanças ("conteudo....": valor) num estado { conteudo } e devolve o novo. */
const aplicar = (est, mud) => aplicarDiff(est, criarDiff(est, mud));

/** Mudanças de c0 para c1, aba por aba (para um Ctrl+Z só). */
export function mudancasEntre(c0, c1) {
  const mud = {};
  for (const k of new Set([...Object.keys(c0), ...Object.keys(c1)])) {
    if (k === 'abas') continue;
    if (c0[k] !== c1[k]) mud['conteudo.' + k] = c1[k];
  }
  for (const id of new Set([...Object.keys(c0.abas), ...Object.keys(c1.abas)])) if (c0.abas[id] !== c1.abas[id]) mud[`conteudo.abas.${id}`] = c1.abas[id];
  return mud;
}

/** Linhas da área (sem o título) que têm SUBTOTAL em alguma célula das colunas da área. */
export function linhasDeSubtotal(aba, area) {
  const f = normalFaixa(area), out = [];
  for (let l = f.l1 + 1; l <= f.l2; l++) for (let cc = f.c1; cc <= f.c2; cc++) if (ehSubtotal(aba.cel[chave(l, cc)])) { out.push(l); break; }
  return out;
}

/** Tira os grupos (e o que eles escondiam) das linhas l1..l2. */
function semGrupos(aba, l1, l2) {
  const limpa = (m, fn) => { if (!m) return m; const o = { ...m }; for (const k of Object.keys(o)) if (+k >= l1 && +k <= l2 + 1) fn(o, k); return Object.keys(o).length ? o : undefined; };
  const ocL = aba.grpL ? limpa(aba.ocL, (o, k) => { if (aba.grpL[k] || (aba.grpFL && aba.grpFL[k])) delete o[k]; }) : aba.ocL;
  return { ...aba, grpL: limpa(aba.grpL, (o, k) => delete o[k]), grpFL: limpa(aba.grpFL, (o, k) => delete o[k]), ocL };
}

/** Remover todos: apaga as linhas de SUBTOTAL da área e os grupos dela. Devolve { conteudo, area, removidas } ou { erro }. */
export function removerSubtotais(c, abaId, area) {
  const f = normalFaixa(area);
  const linhas = linhasDeSubtotal(c.abas[abaId], f);
  let est = { conteudo: c };
  for (const l of [...linhas].sort((a, b) => b - a)) est = aplicar(est, estrutura(est.conteudo, abaId, 'l', l, -1));
  const l2 = f.l2 - linhas.length;
  const aba = semGrupos(est.conteudo.abas[abaId], f.l1, l2 + linhas.length);
  return { conteudo: { ...est.conteudo, abas: { ...est.conteudo.abas, [abaId]: aba } }, area: { ...f, l2 }, removidas: linhas.length };
}

/**
 * Subtotal. area: a tabela com a linha de títulos em cima. op = { col (coluna da planilha), fn (1..11), colunas: [colunas da planilha],
 * substituir (padrão sim), abaixo (resumo embaixo, padrão sim), quebra (quebra de página entre grupos) }.
 * textoDe(c, l, col): o texto que aparece (para o rótulo e para comparar). Devolve { conteudo, grupos, area } ou { erro }.
 */
export function fazerSubtotal(c, abaId, area, op, textoDe) {
  let f = normalFaixa(area);
  if (f.l2 - f.l1 < 1) return { erro: 'Escolha uma tabela com títulos e pelo menos uma linha de dados.' };
  if (op.col < f.c1 || op.col > f.c2) return { erro: 'A coluna de "A cada mudança em" precisa estar na tabela.' };
  const colunas = (op.colunas || []).filter((x) => x >= f.c1 && x <= f.c2);
  if (!colunas.length) return { erro: 'Marque pelo menos uma coluna em "Adicionar subtotal a".' };
  let c1 = c;
  if (op.substituir !== false && linhasDeSubtotal(c.abas[abaId], f).length) { const r = removerSubtotais(c, abaId, f); c1 = r.conteudo; f = r.area; }
  const abaixo = op.abaixo !== false, fn = op.fn || 9, rot = rotuloDe(fn);
  /* grupos: linhas seguidas com o mesmo texto na coluna (maiúscula e minúscula contam igual, como no Excel) */
  const grupos = [];
  for (let l = f.l1 + 1; l <= f.l2; l++) {
    const t = String(textoDe(c1, l, op.col) ?? ''), k = t.trim().toLowerCase();
    const g = grupos[grupos.length - 1];
    if (g && g.k === k) g.fim = l; else grupos.push({ ini: l, fim: l, k, t: t.trim() });
  }
  if (grupos.length > MAX_GRUPOS) return { erro: `São ${grupos.length} grupos; o limite é ${MAX_GRUPOS}. Ponha a tabela em ordem pela coluna antes.` };
  /* insere as linhas de baixo para cima (os índices de cima não mudam) */
  let est = { conteudo: c1 };
  for (let i = grupos.length - 1; i >= 0; i--) est = aplicar(est, estrutura(est.conteudo, abaId, 'l', abaixo ? grupos[i].fim + 1 : grupos[i].ini, 1));
  /* onde ficou cada grupo e cada linha de subtotal */
  grupos.forEach((g, i) => { const d = abaixo ? i : i + 1; g.ini += d; g.fim += d; g.lin = abaixo ? g.fim + 1 : g.ini - 1; });
  const ultima = f.l2 + grupos.length; /* última linha com dados ou subtotal */
  est = aplicar(est, estrutura(est.conteudo, abaId, 'l', abaixo ? ultima + 1 : f.l1 + 1, 1));
  if (!abaixo) grupos.forEach((g) => { g.ini++; g.fim++; g.lin++; });
  const geral = abaixo ? ultima + 1 : f.l1 + 1;
  const ini = abaixo ? f.l1 + 1 : f.l1 + 2, fim = abaixo ? ultima : ultima + 1;
  /* as células: rótulo em negrito e as fórmulas */
  const cc0 = est.conteudo, lote = new Lote(cc0);
  const formula = (cc, a, b) => lerEntrada(`=SUBTOTAL(${fn};${letraCol(cc)}${a + 1}:${letraCol(cc)}${b + 1})`).f;
  const poe = (l, cc, cel, negrito) => { const atual = cc0.abas[abaId].cel[chave(l, cc)]; const s = negrito ? lote.estilo({ ...estiloDe(cc0, atual), b: true }) : atual && atual.s; lote.por(abaId, chave(l, cc), s ? { ...cel, s } : cel); };
  const linhaDe = (l, texto, a, b) => {
    poe(l, op.col, { v: texto }, true);
    for (const cc of colunas) if (cc !== op.col) poe(l, cc, { f: formula(cc, a, b) });
  };
  for (const g of grupos) linhaDe(g.lin, `${g.t || '(vazio)'} ${rot}`, g.ini, g.fim);
  linhaDe(geral, `${rot} Geral`, ini, fim);
  const mud = lote.mudancas();
  est = aplicar(est, mud);
  /* os grupos (v0.6.37): dados no nível 2, subtotais no nível 1 */
  let aba = semGrupos(est.conteudo.abas[abaId], f.l1 + 1, fim + 1);
  const grpL = { ...(aba.grpL || {}) };
  for (const g of grupos) { for (let l = g.ini; l <= g.fim; l++) grpL[l] = 2; grpL[g.lin] = 1; }
  aba = { ...aba, grpL };
  if (!abaixo) aba.grpAcima = 1; else delete aba.grpAcima;
  if (op.quebra) { const imp = normalizarImp(aba.imp); const qL = new Set(imp.qL || []); grupos.slice(0, -1).forEach((g) => qL.add(abaixo ? g.lin + 1 : g.fim + 1)); aba.imp = { ...imp, qL: [...qL].sort((a, b) => a - b) }; }
  return { conteudo: { ...est.conteudo, abas: { ...est.conteudo.abas, [abaId]: aba } }, grupos: grupos.length, area: { ...f, l2: fim + (abaixo ? 1 : 0) } };
}
