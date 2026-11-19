/* Vértice Docs v0.6.19 "Tabelas vivas" (D-12, D-13, D-14) — a tabela como objeto que reage ao que a pessoa faz em volta.
   Regras puras, sem tela. Tudo devolve "mudanças" para um único mudar(): um Ctrl+Z desfaz a ação inteira.
   - Digitar logo abaixo (ou logo à direita) da tabela a faz crescer, com o formato e as colunas calculadas da linha de cima.
   - Tab na última célula abre uma linha nova; Tab no fim de uma linha vai para o começo da próxima (como no Excel).
   - A alça do canto estica ou encolhe a tabela; Design da Tabela: nome, estilo, opções, linha de totais, converter em intervalo.
   A tabela: c.tabelas[chave] = { nome, aba, l1, c1, l2, c2, cols, cab, tot, est, fcx, fxc (coluna calculada do Excel, v0.6.39), ord e ordRef (ordenação guardada do Excel, v0.6.39) }. */
import { chave, textoFaixa, MAX_LIN, MAX_COL } from './ref.js';
import { Lote, moverFormula, estrutura } from './operacoes.js';
import { mescladas, estiloDe } from './modelo.js';
import { faixasDe, textoFaixas } from './regras.js';
import { faixaDoFiltro, novoFiltro } from './dados.js';
import { titulosDaTabela, nomeDeTabelaValido, formatarComoTabela } from './inserir.js';
import { estiloDaTabela, coresDoTema, temEstiloVivo, ESTILO_PADRAO } from './tabelaEstilo.js';

const vazia = (x) => !x || ((x.v === undefined || x.v === '') && x.f == null);
export const linhasDeDados = (t) => ({ d0: t.l1 + (t.cab ? 1 : 0), dN: t.l2 - (t.tot ? 1 : 0) });

/** A tabela que contém a célula: { k, t } ou null. */
export function tabelaEm(c, abaId, l, col) {
  for (const [k, t] of Object.entries(c.tabelas || {})) if (t && t.aba === abaId && l >= t.l1 && l <= t.l2 && col >= t.c1 && col <= t.c2) return { k, t };
  return null;
}

/**
 * v0.6.29 (Elias, 18/11: "Ctrl+Shift+Baixo deveria parar no final da tabela, porém passa para a última célula da coluna"):
 * Ctrl+seta dentro de uma tabela para na borda dela, como no Excel. alvo = aonde o salto comum levaria (pela regra das
 * células cheias). Se a partida está dentro da tabela e o alvo sai dela, fica na borda; partindo da própria borda, o salto
 * segue normal para fora (um segundo Ctrl+seta sai da tabela).
 */
export function pararNaTabela(c, abaId, l, col, dl, dc, alvo) {
  const r = tabelaEm(c, abaId, l, col);
  if (!r) return alvo;
  const { t } = r;
  if (dl > 0 && l < t.l2 && alvo > t.l2) return t.l2;
  if (dl < 0 && l > t.l1 && alvo < t.l1) return t.l1;
  if (dc > 0 && col < t.c2 && alvo > t.c2) return t.c2;
  if (dc < 0 && col > t.c1 && alvo < t.c1) return t.c1;
  return alvo;
}

/** Fórmula da coluna calculada (como fica na primeira linha de dados) ou null: todas as linhas com a mesma fórmula. */
function formulaDaColuna(pegar, t, col) {
  const { d0, dN } = linhasDeDados(t);
  if (dN < d0) return null;
  let base = null;
  for (let l = d0; l <= dN; l++) {
    const x = pegar(chave(l, col));
    if (!x || x.f == null) return null;
    const norm = moverFormula(x.f, d0 - l, 0);
    if (base == null) base = norm; else if (norm !== base) return null;
  }
  return base;
}

/* faixa livre para a tabela ocupar: sem outra tabela e sem mesclada */
function livre(c, abaId, k, f) {
  if (f.l2 >= MAX_LIN || f.c2 >= MAX_COL) return false;
  for (const [kk, t] of Object.entries(c.tabelas || {})) if (kk !== k && t && t.aba === abaId && !(t.l2 < f.l1 || t.l1 > f.l2 || t.c2 < f.c1 || t.c1 > f.c2)) return false;
  return !mescladas(c.abas[abaId]).some((m) => !(m.l2 < f.l1 || m.l1 > f.l2 || m.c2 < f.c1 || m.c1 > f.c2));
}

/* as regras (validação e cor) que cobrem uma coluna da tabela até a última linha acompanham a linha nova */
function estenderRegras(regras, t, dNvelho, dNnovo) {
  if (!Array.isArray(regras) || !regras.length || dNnovo === dNvelho) return null;
  const { d0 } = linhasDeDados(t);
  let mexeu = false;
  const out = regras.map((r) => {
    if (!r || !r.fx) return r;
    const fs = faixasDe(r.fx).map((f) => (f.c1 >= t.c1 && f.c2 <= t.c2 && f.l2 === dNvelho && f.l1 >= d0 - 0 && f.l1 <= dNvelho ? { ...f, l2: dNnovo } : f));
    const fx = textoFaixas(fs);
    if (fx === r.fx) return r;
    mexeu = true;
    return { ...r, fx };
  });
  return mexeu ? out : null;
}

/**
 * Leva a tabela t (chave k) para a faixa nf (mesmo canto de cima à esquerda). acc = { pegar(k), por(k, x) } sobre as células da aba;
 * extra = objeto onde vão as outras mudanças (tabelas, filtro, regras); aba = a aba como fica (para filtro e regras).
 * copiar: as linhas novas ganham o formato da última linha de dados (digitar embaixo, Tab); a alça não copia formato, só fórmulas.
 */
function levarPara(c, abaId, k, t, nf, acc, extra, aba, { copiar = true } = {}) {
  const { d0, dN } = linhasDeDados(t);
  const dNnovo = nf.l2 - (t.tot ? 1 : 0);
  /* colunas calculadas: só as que existem antes de crescer */
  const calc = {};
  if (dNnovo > dN) for (let col = t.c1; col <= Math.min(t.c2, nf.c2); col++) { const f = formulaDaColuna(acc.pegar, t, col); if (f) calc[col] = f; }
  for (let l = dN + 1; l <= dNnovo; l++) {
    for (let col = nf.c1; col <= nf.c2; col++) {
      const kc = chave(l, col);
      const x = acc.pegar(kc);
      const src = acc.pegar(chave(dN, Math.min(col, t.c2)));
      const nova = { ...(x || {}) };
      let mudou = false;
      if (copiar && !nova.s && src && src.s && dN >= d0) { nova.s = src.s; mudou = true; }
      if (calc[col] && vazia(x)) { delete nova.v; nova.f = moverFormula(calc[col], l - d0, 0); mudou = true; }
      if (mudou) acc.por(kc, nova);
    }
  }
  /* colunas novas: título "ColunaN" (se a célula do título está vazia) e o formato da coluna da esquerda */
  for (let col = t.c2 + 1; col <= nf.c2; col++) {
    for (let l = t.l1; l <= nf.l2; l++) {
      const kc = chave(l, col), x = acc.pegar(kc), src = acc.pegar(chave(l, t.c2));
      if (copiar && src && src.s && !(x && x.s)) acc.por(kc, { ...(x || {}), s: src.s });
    }
  }
  let cols = Array.isArray(t.cols) ? t.cols.slice(0, nf.c2 - nf.c1 + 1) : [];
  if (t.cab) {
    const brutos = [];
    for (let col = nf.c1; col <= nf.c2; col++) { const x = acc.pegar(chave(t.l1, col)); brutos.push(x && x.f == null && x.v !== undefined && x.v !== '' ? x.v : ''); }
    cols = titulosDaTabela(brutos);
    for (let col = t.c2 + 1; col <= nf.c2; col++) { const kc = chave(t.l1, col), x = acc.pegar(kc); if (vazia(x)) acc.por(kc, { ...(x || {}), v: cols[col - nf.c1] }); }
  } else while (cols.length < nf.c2 - nf.c1 + 1) cols.push('Coluna' + (cols.length + 1));
  const tn = { ...t, l2: nf.l2, c2: nf.c2, cols };
  extra['conteudo.tabelas'] = { ...(extra['conteudo.tabelas'] || c.tabelas), [k]: tn };
  /* filtro da tabela acompanha */
  const ff = faixaDoFiltro(aba.fil);
  if (ff && ff.l1 === t.l1 && ff.c1 === t.c1 && ff.c2 === t.c2 && (ff.l2 === t.l2 || ff.l2 === dN)) {
    extra[`conteudo.abas.${abaId}.fil`] = { ...aba.fil, fx: textoFaixa({ l1: t.l1, c1: nf.c1, l2: dNnovo, c2: nf.c2 }) };
  }
  for (const campo of ['val', 'cf']) { const r = estenderRegras(aba[campo], t, dN, dNnovo); if (r) extra[`conteudo.abas.${abaId}.${campo}`] = r; }
  return tn;
}
const accDoLote = (lote, abaId) => ({ pegar: (k) => lote.pegar(abaId, k), por: (k, x) => lote.por(abaId, k, x) });

/**
 * D-12: depois de gravar a célula digitada no lote. Se ela está logo abaixo (ou à direita) de uma tabela, a tabela cresce.
 * Devolve { nome, onde: 'linha'|'coluna' } ou null. A tabela com linha de totais não cresce por baixo (como no Excel).
 */
export function crescerAoDigitar(c, lote, abaId, l, col) {
  if (!c.tabelas) return null;
  const aba = c.abas[abaId];
  if (!vazia(aba.cel[chave(l, col)]) || vazia(lote.pegar(abaId, chave(l, col)))) return null;
  for (const [k, t] of Object.entries(c.tabelas)) {
    if (!t || t.aba !== abaId) continue;
    let nf = null, onde = null;
    if (!t.tot && l === t.l2 + 1 && col >= t.c1 && col <= t.c2) { nf = { l1: t.l1, c1: t.c1, l2: l, c2: t.c2 }; onde = 'linha'; }
    else if (col === t.c2 + 1 && l >= t.l1 && l <= t.l2) { nf = { l1: t.l1, c1: t.c1, l2: t.l2, c2: col }; onde = 'coluna'; }
    if (!nf || !livre(c, abaId, k, onde === 'linha' ? { l1: l, c1: t.c1, l2: l, c2: t.c2 } : { l1: t.l1, c1: col, l2: t.l2, c2: col })) continue;
    levarPara(c, abaId, k, t, nf, accDoLote(lote, abaId), lote.outras, aba);
    return { nome: t.nome, onde };
  }
  return null;
}

/** Coluna calculada: fórmula digitada numa coluna da tabela que está vazia preenche a coluna inteira. Devolve quantas células. */
export function colunaCalculadaAoDigitar(c, lote, abaId, l, col) {
  const x = lote.pegar(abaId, chave(l, col));
  if (!x || x.f == null) return 0;
  const achou = tabelaEm(c, abaId, l, col);
  if (!achou) return 0;
  const { t } = achou;
  const { d0, dN } = linhasDeDados(t);
  if (l < d0 || l > dN || dN === d0) return 0;
  const aba = c.abas[abaId];
  for (let r = d0; r <= dN; r++) if (r !== l && !vazia(aba.cel[chave(r, col)])) return 0;
  let n = 0;
  for (let r = d0; r <= dN; r++) {
    if (r === l) continue;
    const kc = chave(r, col), velha = aba.cel[kc];
    lote.por(abaId, kc, { ...(velha || {}), f: moverFormula(x.f, r - l, 0), ...(x.s && !(velha && velha.s) ? { s: x.s } : {}) });
    n++;
  }
  return n;
}

/**
 * D-13: Tab dentro da tabela. Devolve { l, c } (para onde ir), { novaLinha: k } (abrir linha) ou null (anda como sempre).
 * volta: Shift+Tab.
 */
export function tabNaTabela(c, abaId, l, col, volta = false) {
  const achou = tabelaEm(c, abaId, l, col);
  if (!achou) return null;
  const { k, t } = achou;
  const { dN } = linhasDeDados(t);
  if (t.tot && l === t.l2) return null;
  if (!volta && col === t.c2) return l < dN ? { l: l + 1, c: t.c1 } : { novaLinha: k };
  if (volta && col === t.c1 && l > t.l1) return { l: l - 1, c: t.c2 };
  return null;
}

/* aplica as mudanças de estrutura() numa cópia rasa, só no que a tabela precisa ler */
function abaDepois(c, abaId, mud) {
  const aba = { ...c.abas[abaId] };
  for (const campo of ['cel', 'fil', 'val', 'cf', 'mesc']) { const kk = `conteudo.abas.${abaId}.${campo}`; if (kk in mud) aba[campo] = mud[kk]; }
  return aba;
}
/* total de coluna: a faixa da SUBTOTAL(…, B2:B6) passa a ir até a linha nova */
const RX_FAIXA_COL = /(\$?)([A-Z]{1,3})(\$?)(\d+):(\$?)([A-Z]{1,3})(\$?)(\d+)/g;
function esticarTotal(f, d0, dVelho, dNovo) {
  return f.replace(RX_FAIXA_COL, (m, a, c1, b, r1, e, c2, g, r2) => (c1 === c2 && +r1 === d0 + 1 && +r2 === dVelho + 1 ? `${a}${c1}${b}${r1}:${e}${c2}${g}${dNovo + 1}` : m));
}

/**
 * Abre uma linha nova no fim dos dados da tabela (Tab na última célula). Se a linha de baixo está vazia, só cresce;
 * se tem algo (ou se há linha de totais), insere a linha na aba, como o Excel. Devolve { mud, alvo } ou { erro }.
 */
export function linhaNova(c, abaId, k) {
  const t = c.tabelas && c.tabelas[k];
  if (!t) return { erro: 'Tabela não encontrada.' };
  const { d0, dN } = linhasDeDados(t);
  const aba = c.abas[abaId];
  const baixo = { l1: t.l2 + 1, c1: t.c1, l2: t.l2 + 1, c2: t.c2 };
  let baixoVazio = true;
  for (let col = t.c1; col <= t.c2; col++) if (!vazia(aba.cel[chave(t.l2 + 1, col)])) baixoVazio = false;
  if (!t.tot && baixoVazio && livre(c, abaId, k, baixo)) {
    const lote = new Lote(c);
    levarPara(c, abaId, k, t, { l1: t.l1, c1: t.c1, l2: t.l2 + 1, c2: t.c2 }, accDoLote(lote, abaId), lote.outras, aba);
    return { mud: lote.mudancas(), alvo: { l: dN + 1, c: t.c1 } };
  }
  if (t.l2 + 1 >= MAX_LIN) return { erro: 'Não cabe mais nenhuma linha na aba.' };
  /* insere uma linha na aba: dentro da tabela (antes dos totais) ou logo abaixo dela */
  const i = t.tot ? t.l2 : t.l2 + 1;
  const mud = estrutura(c, abaId, 'l', i, 1);
  const kCel = `conteudo.abas.${abaId}.cel`;
  const cel = { ...(mud[kCel] || aba.cel) };
  const acc = { pegar: (kk) => cel[kk], por: (kk, x) => { if (x && (x.v !== undefined || x.f != null || x.s)) cel[kk] = x; else delete cel[kk]; } };
  const tabs = mud['conteudo.tabelas'] || c.tabelas;
  const t2 = tabs[k] || t;
  const depois = abaDepois(c, abaId, mud);
  const extra = { 'conteudo.tabelas': tabs };
  if (t.tot) {
    /* a tabela já cresceu (a linha entrou antes dos totais): formato e fórmulas da linha de cima na linha nova; totais esticam */
    const calc = {};
    for (let col = t.c1; col <= t.c2; col++) { const f = formulaDaColuna((kk) => aba.cel[kk], t, col); if (f) calc[col] = f; }
    for (let col = t.c1; col <= t.c2; col++) {
      const src = cel[chave(i - 1, col)], nova = {};
      if (src && src.s && dN >= d0) nova.s = src.s;
      if (calc[col]) nova.f = moverFormula(calc[col], i - d0, 0);
      if (nova.s || nova.f) acc.por(chave(i, col), nova);
      const tc = cel[chave(i + 1, col)];
      if (tc && tc.f != null) { const nf = esticarTotal(tc.f, d0, dN, dN + 1); if (nf !== tc.f) cel[chave(i + 1, col)] = { ...tc, f: nf }; }
    }
    for (const campo of ['val', 'cf']) { const r = estenderRegras(depois[campo], { ...t2, tot: 1 }, dN, dN + 1); if (r) extra[`conteudo.abas.${abaId}.${campo}`] = r; }
    const ff = faixaDoFiltro(depois.fil);
    if (ff && ff.l1 === t.l1 && ff.c1 === t.c1 && ff.c2 === t.c2 && ff.l2 === dN) extra[`conteudo.abas.${abaId}.fil`] = { ...depois.fil, fx: textoFaixa({ l1: t.l1, c1: t.c1, l2: dN + 1, c2: t.c2 }) };
  } else {
    levarPara(c, abaId, k, t2, { l1: t2.l1, c1: t2.c1, l2: t2.l2 + 1, c2: t2.c2 }, acc, extra, depois);
  }
  return { mud: { ...mud, ...extra, [kCel]: cel }, alvo: { l: dN + 1, c: t.c1 } };
}

/**
 * D-14: a alça do canto (ou Design › Redimensionar). O canto de cima à esquerda fica; a faixa nova precisa de uma linha de dados.
 * Com linha de totais, só as colunas mudam pela alça. Devolve { mud } ou { erro }.
 */
export function redimensionar(c, abaId, k, nf0) {
  const t = c.tabelas && c.tabelas[k];
  if (!t) return { erro: 'Tabela não encontrada.' };
  const nf = { l1: t.l1, c1: t.c1, l2: Math.max(nf0.l2, t.l1 + (t.cab ? 1 : 0) + (t.tot ? 1 : 0)), c2: Math.max(nf0.c2, t.c1) };
  if (t.tot && nf.l2 !== t.l2) return { erro: 'Com a linha de totais ligada, a alça muda só as colunas. Desligue os totais (Design da Tabela) para mudar as linhas.' };
  if (nf.l2 === t.l2 && nf.c2 === t.c2) return { mud: {} };
  if (!livre(c, abaId, k, nf)) return { erro: 'A tabela não pode passar por cima de outra tabela nem de células mescladas.' };
  const lote = new Lote(c);
  levarPara(c, abaId, k, t, nf, accDoLote(lote, abaId), lote.outras, c.abas[abaId], { copiar: false });
  return { mud: lote.mudancas() };
}

/* ---------------- Design da Tabela ---------------- */
const comTabela = (c, k, tn) => ({ 'conteudo.tabelas': { ...c.tabelas, [k]: tn } });

export function renomear(c, k, novo) {
  const t = c.tabelas && c.tabelas[k];
  const nome = String(novo || '').trim();
  if (!t) return { erro: 'Tabela não encontrada.' };
  if (nome === t.nome) return { mud: {} };
  if (!nomeDeTabelaValido(nome)) return { erro: 'O nome da tabela só pode ter letras, números e _ (sem espaço) e não pode começar com número.' };
  const usado = Object.entries(c.tabelas).some(([kk, x]) => kk !== k && x && String(x.nome).toLowerCase() === nome.toLowerCase())
    || Object.values(c.nomes || {}).some((x) => x && x.n && String(x.n).toLowerCase() === nome.toLowerCase());
  if (usado) return { erro: 'Já existe uma tabela ou nome com esse nome. Escolha outro.' };
  const tabs = {};
  for (const [kk, x] of Object.entries(c.tabelas)) tabs[kk === k ? nome.toLowerCase() : kk] = kk === k ? { ...x, nome } : x;
  return { mud: { 'conteudo.tabelas': tabs }, chave: nome.toLowerCase() };
}

/** Estilo da galeria (nome do Excel) ou null = "Nenhum". As opções (listras, colunas em destaque) ficam. */
export function mudarEstilo(c, k, nome) {
  const t = c.tabelas[k];
  const op = t.est || { ll: 1 };
  const est = nome ? { nome, ll: op.ll ? 1 : 0, lc: op.lc ? 1 : 0, pc: op.pc ? 1 : 0, uc: op.uc ? 1 : 0 } : { sem: 1, ll: op.ll ? 1 : 0, lc: op.lc ? 1 : 0, pc: op.pc ? 1 : 0, uc: op.uc ? 1 : 0 };
  return { mud: comTabela(c, k, { ...t, est }) };
}

/** Opções de estilo: ll (linhas em tiras), lc (colunas em tiras), pc (primeira coluna), uc (última coluna). */
export function mudarOpcao(c, k, campo) {
  const t = c.tabelas[k];
  const est = { ...(t.est || { nome: ESTILO_PADRAO, ll: 1 }) };
  est[campo] = est[campo] ? 0 : 1;
  return { mud: comTabela(c, k, { ...t, est }) };
}
export const opcaoLigada = (t, campo) => !!(t && t.est && t.est[campo]);

/** Botão de filtro: liga ou tira as setas da tabela (o filtro da aba passa a ser o da tabela). */
export function alternarFiltro(c, abaId, k) {
  const t = c.tabelas[k];
  const aba = c.abas[abaId];
  const { dN } = linhasDeDados(t);
  if (!t.cab) return { erro: 'O filtro precisa da linha de títulos.' };
  const ff = faixaDoFiltro(aba.fil);
  const daTabela = ff && ff.l1 === t.l1 && ff.c1 === t.c1 && ff.c2 === t.c2;
  if (daTabela) return { mud: { [`conteudo.abas.${abaId}.fil`]: undefined }, ligado: false };
  return { mud: { [`conteudo.abas.${abaId}.fil`]: novoFiltro({ l1: t.l1, c1: t.c1, l2: dN, c2: t.c2 }) }, ligado: true, trocou: !!ff };
}
export function filtroLigado(c, abaId, t) { const ff = faixaDoFiltro(c.abas[abaId] && c.abas[abaId].fil); return !!(t && ff && ff.l1 === t.l1 && ff.c1 === t.c1 && ff.c2 === t.c2); }

export const FUNCOES_TOTAL = [
  ['nenhum', 'Nenhum', null], ['soma', 'Soma', 109], ['media', 'Média', 101], ['contagem', 'Contagem', 103],
  ['contNum', 'Contar números', 102], ['max', 'Máximo', 104], ['min', 'Mínimo', 105], ['desvpad', 'Desvio padrão', 107], ['var', 'Variância', 110],
];
const formulaTotal = (n, col, d0, dN) => `SUBTOTAL(${n},${colLetra(col)}${d0 + 1}:${colLetra(col)}${dN + 1})`;
function colLetra(n) { let s = ''; n += 1; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; }

/** Linha de totais: liga (como o Excel: "Total" na primeira coluna e a soma — ou a contagem — na última) ou desliga (a linha sai). */
export function alternarTotais(c, abaId, k) {
  const t = c.tabelas[k];
  const aba = c.abas[abaId];
  const { d0, dN } = linhasDeDados(t);
  if (t.tot) {
    const lote = new Lote(c);
    for (let col = t.c1; col <= t.c2; col++) lote.por(abaId, chave(t.l2, col), undefined);
    lote.outras['conteudo.tabelas'] = { ...c.tabelas, [k]: { ...t, l2: t.l2 - 1, tot: 0 } };
    return { mud: lote.mudancas(), ligado: false };
  }
  const r = t.l2 + 1;
  let mud = {}, cel = aba.cel, tabs = c.tabelas;
  let baixoVazio = true;
  for (let col = t.c1; col <= t.c2; col++) if (!vazia(aba.cel[chave(r, col)])) baixoVazio = false;
  if (!baixoVazio || !livre(c, abaId, k, { l1: r, c1: t.c1, l2: r, c2: t.c2 })) {
    if (r >= MAX_LIN) return { erro: 'Não cabe a linha de totais.' };
    mud = estrutura(c, abaId, 'l', r, 1);
    cel = mud[`conteudo.abas.${abaId}.cel`] || cel;
    tabs = mud['conteudo.tabelas'] || tabs;
  }
  cel = { ...cel };
  const numerica = (col) => { for (let l = d0; l <= dN; l++) { const x = aba.cel[chave(l, col)]; if (x && (typeof x.v === 'number' || x.f != null)) return true; } return false; };
  const sDe = (col) => { const x = aba.cel[chave(dN, col)]; return x && x.s; };
  if (t.c2 > t.c1 || !numerica(t.c1)) cel[chave(r, t.c1)] = { v: 'Total' };
  const ult = t.c2;
  if (ult !== t.c1 || numerica(ult)) cel[chave(r, ult)] = { f: formulaTotal(numerica(ult) ? 109 : 103, ult, d0, dN), ...(sDe(ult) ? { s: sDe(ult) } : {}) };
  const tn = { ...(tabs[k] || t), l2: r, tot: 1 };
  return { mud: { ...mud, [`conteudo.abas.${abaId}.cel`]: cel, 'conteudo.tabelas': { ...tabs, [k]: tn } }, ligado: true };
}

/** Função do total de uma coluna (na linha de totais). id de FUNCOES_TOTAL. */
export function totalDaColuna(c, abaId, k, col, id) {
  const t = c.tabelas[k];
  if (!t.tot) return { erro: 'Ligue a linha de totais primeiro.' };
  if (col < t.c1 || col > t.c2) return { erro: 'Escolha uma célula da tabela.' };
  const { d0, dN } = linhasDeDados(t);
  const fn = FUNCOES_TOTAL.find((x) => x[0] === id);
  const lote = new Lote(c);
  const kc = chave(t.l2, col), velha = c.abas[abaId].cel[kc] || {};
  const nova = { ...velha };
  delete nova.v; delete nova.f;
  if (fn && fn[2]) nova.f = formulaTotal(fn[2], col, d0, dN);
  lote.por(abaId, kc, nova);
  return { mud: lote.mudancas() };
}
/** Qual função está no total da coluna (para marcar no menu). */
export function funcaoDoTotal(c, abaId, t, col) {
  if (!t || !t.tot) return null;
  const x = c.abas[abaId].cel[chave(t.l2, col)];
  const m = x && x.f && /^SUBTOTAL\((\d+),/.exec(x.f);
  if (!m) return x && !vazia(x) ? 'outro' : 'nenhum';
  const fn = FUNCOES_TOTAL.find((q) => q[2] === +m[1]);
  return fn ? fn[0] : 'outro';
}

/**
 * Converter em intervalo: a tabela deixa de existir; a aparência fica pintada nas células (como o Excel faz) e as setas saem.
 */
export function converterEmIntervalo(c, abaId, k) {
  const t = c.tabelas[k];
  const aba = c.abas[abaId];
  const lote = new Lote(c);
  if (temEstiloVivo(t)) {
    const tema = coresDoTema(c);
    for (let l = t.l1; l <= t.l2; l++) for (let col = t.c1; col <= t.c2; col++) {
      const tb = estiloDaTabela(t, l, col, tema);
      if (!tb) continue;
      const kc = chave(l, col), x = aba.cel[kc] || {};
      const e = { ...estiloDe(c, x) };
      if (tb.fundo && !e.fundo) e.fundo = tb.fundo;
      if (tb.cor && !e.cor) e.cor = tb.cor;
      if (tb.b && e.b == null) e.b = true;
      if (tb.bd) {
        const bd = { ...(e.bd || {}) }, bdcs = { ...(e.bdcs || {}) };
        for (const s of ['t', 'b', 'l', 'r']) if (tb.bd[s] && !bd[s]) { bd[s] = tb.bd[s]; bdcs[s] = tb.bdcs[s]; }
        e.bd = bd; e.bdcs = bdcs; if (!e.bdc) e.bdc = tb.bdc;
      }
      lote.por(abaId, kc, { ...x, s: lote.estilo(e) || undefined });
    }
  }
  const tabs = { ...c.tabelas }; delete tabs[k];
  lote.outras['conteudo.tabelas'] = Object.keys(tabs).length ? tabs : undefined;
  if (filtroLigado(c, abaId, t)) lote.outras[`conteudo.abas.${abaId}.fil`] = undefined;
  return { mud: lote.mudancas() };
}

/* ---------------- tabelas feitas no app antes da v0.6.19 ---------------- */
/** Mudanças aplicadas numa cópia rasa de c (só os caminhos tocados são copiados). */
export function aplicarMud(c, mud) {
  const raiz = { conteudo: c };
  for (const [k, v] of Object.entries(mud)) {
    const ps = k.split('.');
    let o = raiz;
    for (let i = 0; i < ps.length - 1; i++) { const x = o[ps[i]]; o[ps[i]] = Array.isArray(x) ? x.slice() : { ...(x || {}) }; o = o[ps[i]]; }
    if (v === undefined) delete o[ps[ps.length - 1]]; else o[ps[ps.length - 1]] = v;
  }
  return raiz.conteudo;
}
/** Tabela antiga do app (cores pintadas, sem estilo guardado): tira a pintura e guarda o estilo padrão. null se já é viva. */
export function vivificar(c, abaId, k) {
  const t = c.tabelas && c.tabelas[k];
  if (!t || t.est) return null;
  const valorDe = (l, cc) => { const x = c.abas[abaId].cel[chave(l, cc)]; return x ? x.v : undefined; };
  const r = formatarComoTabela(c, abaId, { l1: t.l1, c1: t.c1, l2: t.l2, c2: t.c2 }, { nome: t.nome, estilo: ESTILO_PADRAO, cabecalho: !!t.cab, listras: true, filtro: false }, valorDe);
  if (r.erro) return null;
  const tn = r.mud['conteudo.tabelas'][t.nome.toLowerCase()];
  r.mud['conteudo.tabelas'] = { ...r.mud['conteudo.tabelas'], [k]: { ...tn, tot: t.tot, ...(t.fcx ? { fcx: t.fcx } : {}), ...(t.fxc ? { fxc: t.fxc } : {}), ...(t.ord ? { ord: t.ord, ordRef: t.ordRef } : {}) } }; /* v0.6.39 (T0) */
  if (k !== t.nome.toLowerCase()) delete r.mud['conteudo.tabelas'][t.nome.toLowerCase()];
  return r.mud;
}
