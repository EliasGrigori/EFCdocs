/* Vértice Docs v0.6.24 · colunas das listas no padrão do EFCwork (projeto/src/tabela.js, do mesmo dono):
   cada coluna tem ordem (padrão, crescente, decrescente), busca, lista de valores com contagem e caixas,
   De/Até para número, mover para os lados e Travar. A ordem das colunas fica lembrada neste aparelho;
   a coluna travada guarda também a ordem e o filtro dela, até destravar. Só lógica: sem tela. */

/** Coluna: { id, rot, v(x) valor para ordenar e filtrar, txt(x) texto da lista de valores, tipo: 'texto'|'num'|'data', fixa } */

const CHAVE = (nome) => 'vd-tbcol-' + nome;
const sessao = new Map();
const ouvintes = new Set();

export const semAcento = (t) => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const vazio = (x) => x == null || x === '';
export const filtroAtivo = (f) => !!f && (!!f.txt || !!f.sel || !vazio(f.min) || !vazio(f.max));
const temMenu = (c) => !!c && typeof c.v === 'function' && !c.fixa;

function ler(nome) {
  try { return JSON.parse(globalThis.localStorage.getItem(CHAVE(nome)) || 'null') || {}; } catch { return {}; }
}
function gravar(nome, st) {
  const trava = {};
  for (const k of Object.keys(st.trava)) {
    if (!st.trava[k]) continue;
    trava[k] = { ordem: st.ordem && st.ordem.k === k ? st.ordem.dir : null, cf: filtroAtivo(st.cf[k]) ? st.cf[k] : null };
  }
  try {
    if (!st.colOrd.length && !Object.keys(trava).length) globalThis.localStorage.removeItem(CHAVE(nome));
    else globalThis.localStorage.setItem(CHAVE(nome), JSON.stringify({ colOrd: st.colOrd, trava }));
  } catch { /* sem armazenamento (aba anônima, cota): vale só nesta visita */ }
}

/** O estado de uma tabela: { cf: {coluna: filtro}, ordem: {k, dir} | null, colOrd: [ids], trava: {coluna: true} }. */
export function estadoTabela(nome) {
  if (!sessao.has(nome)) {
    const g = ler(nome), st = { cf: {}, ordem: null, colOrd: Array.isArray(g.colOrd) ? g.colOrd : [], trava: {} };
    for (const k of Object.keys(g.trava || {})) {
      const t = g.trava[k] || {};
      st.trava[k] = true;
      if (t.ordem === 'asc' || t.ordem === 'desc') st.ordem = { k, dir: t.ordem };
      if (filtroAtivo(t.cf)) st.cf[k] = t.cf;
    }
    sessao.set(nome, st);
  }
  return sessao.get(nome);
}

/** Muda o estado (fn recebe uma cópia e devolve a nova), grava o que precisa ficar lembrado e avisa quem desenha. */
export function mudarTabela(nome, fn) {
  const ant = estadoTabela(nome);
  const copia = { cf: { ...ant.cf }, ordem: ant.ordem ? { ...ant.ordem } : null, colOrd: [...ant.colOrd], trava: { ...ant.trava } };
  const novo = fn(copia) || copia;
  sessao.set(nome, novo); gravar(nome, novo);
  for (const o of ouvintes) o(nome);
  return novo;
}
export function ouvirTabelas(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn); }
/** Só para os testes: esquece o que está na memória da visita (o guardado no aparelho continua). */
export function esquecerSessao() { sessao.clear(); }

/** Texto que a célula mostra na lista de valores. */
export function rotulo(c, x) {
  const v = c.v(x);
  if (vazio(v)) return '';
  return c.txt ? String(c.txt(x)) : String(v);
}

export function passa(c, f, x) {
  if (!filtroAtivo(f)) return true;
  const lab = rotulo(c, x);
  if (f.txt && !semAcento(lab).includes(semAcento(f.txt))) return false;
  if (f.sel && !f.sel.includes(lab)) return false;
  if (!vazio(f.min) || !vazio(f.max)) {
    const v = c.v(x);
    if (typeof v !== 'number') return false;
    if (!vazio(f.min) && v < Number(f.min)) return false;
    if (!vazio(f.max) && v > Number(f.max)) return false;
  }
  return true;
}

const comparar = (x, y) => (typeof x === 'number' && typeof y === 'number' ? x - y : String(x == null ? '' : x).localeCompare(String(y == null ? '' : y), 'pt-BR', { numeric: true, sensitivity: 'base' }));

/** Aplica os filtros e a ordem das colunas. o.sem = coluna cujo filtro não conta (para a lista de valores dela). */
export function filtrarPorColunas(itens, cols, st, o = {}) {
  let l = itens;
  for (const c of cols) {
    if (!temMenu(c) || c.id === o.sem || !filtroAtivo(st.cf[c.id])) continue;
    l = l.filter((x) => passa(c, st.cf[c.id], x));
  }
  if (st.ordem && !o.semOrdem) {
    const c = cols.find((x) => x.id === st.ordem.k);
    if (temMenu(c)) {
      const s = st.ordem.dir === 'desc' ? -1 : 1;
      l = l.map((x, i) => [x, i]).sort((a, b) => comparar(c.v(a[0]), c.v(b[0])) * s || a[1] - b[1]).map((p) => p[0]);
    }
  }
  return l;
}

/** Os valores da coluna, com quantos há de cada, contando os outros filtros mas não o dela. Vazio por último. */
export function valoresDaColuna(itens, cols, st, k) {
  const c = cols.find((x) => x.id === k); if (!temMenu(c)) return [];
  const m = new Map();
  for (const x of filtrarPorColunas(itens, cols, st, { sem: k, semOrdem: true })) {
    const lab = rotulo(c, x), e = m.get(lab);
    if (e) e.n++; else m.set(lab, { lab, v: c.v(x), n: 1 });
  }
  return [...m.values()].sort((a, b) => (a.lab === '' ? 1 : b.lab === '' ? -1 : comparar(a.v, b.v)));
}

/** As colunas na ordem escolhida; as fixas (Ações) ficam no mesmo lugar. */
export function colunasEmOrdem(cols, colOrd) {
  if (!colOrd || !colOrd.length) return cols;
  const mov = cols.filter((c) => !c.fixa).map((c, i) => [c, i]);
  mov.sort((a, b) => { const ia = colOrd.indexOf(a[0].id), ib = colOrd.indexOf(b[0].id); return (ia < 0 ? 1000 + a[1] : ia) - (ib < 0 ? 1000 + b[1] : ib); });
  const fila = mov.map((p) => p[0]);
  return cols.map((c) => (c.fixa ? c : fila.shift()));
}

/** Nova ordem depois de soltar a coluna k antes (ou depois) da coluna alvo. */
export function moverColuna(cols, colOrd, k, alvo, depois) {
  const ids = colunasEmOrdem(cols, colOrd).filter((c) => !c.fixa).map((c) => c.id);
  if (k === alvo || !ids.includes(k) || !ids.includes(alvo)) return ids;
  const sem = ids.filter((x) => x !== k), i = sem.indexOf(alvo);
  sem.splice(depois ? i + 1 : i, 0, k);
  return sem;
}

/** Um passo para a esquerda (-1) ou para a direita (+1). */
export function moverDeLado(cols, colOrd, k, d) {
  const ids = colunasEmOrdem(cols, colOrd).filter((c) => !c.fixa).map((c) => c.id), i = ids.indexOf(k), j = i + d;
  if (i < 0 || j < 0 || j >= ids.length) return ids;
  return moverColuna(cols, colOrd, k, ids[j], d > 0);
}

/** Ciclo do botão de ordem: padrão, crescente, decrescente, padrão. */
export const proximaOrdem = (st, k) => (!st.ordem || st.ordem.k !== k ? { k, dir: 'asc' } : st.ordem.dir === 'asc' ? { k, dir: 'desc' } : null);

export const colunaFiltrada = (st, k) => filtroAtivo(st.cf[k]);
export const temFiltroDeColuna = (st) => Object.keys(st.cf).some((k) => filtroAtivo(st.cf[k]));
/** Algo para o "Limpar filtros" limpar: filtro ou ordem em coluna não travada. */
export const temAlgoParaLimpar = (st) => Object.keys(st.cf).some((k) => filtroAtivo(st.cf[k]) && !st.trava[k]) || (!!st.ordem && !st.trava[st.ordem.k]);

/** Limpa os filtros e a ordem das colunas que não estão travadas (o "Limpar" do filtro da tela). */
export function limparColunasSoltas(st) {
  for (const k of Object.keys(st.cf)) if (!st.trava[k]) delete st.cf[k];
  if (st.ordem && !st.trava[st.ordem.k]) st.ordem = null;
  return st;
}
