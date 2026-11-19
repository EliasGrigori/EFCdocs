/* Vértice Docs v0.6.40 — Planilha: um filtro por tabela (T2 do estudo de tabelas).
   Como no Excel: cada tabela tem as setas dela, e a aba pode ter, além disso, um filtro comum fora das tabelas.
   Antes a aba tinha um filtro só: ligar o filtro de uma tabela tirava o da aba (e o de outra tabela).
   Modelo:
   - c.tabelas[k].fil = { cr, cx?, ord? }: setas ligadas. As colunas do cr são as da planilha (como em aba.fil).
     A faixa não é guardada: é sempre a tabela, do título à última linha de dados (sem a linha de totais).
   - c.tabelas[k].sf = 1: a pessoa tirou as setas (ou o arquivo do Excel veio sem elas).
   - Sem fil e sem sf: tabela de antes da v0.6.40. Fica como era: o arquivo sai com as setas; se o filtro da aba
     coincide com ela, aquele filtro é o dela.
   - aba.ocF continua sendo a soma das linhas que os filtros escondem (o da aba e os das tabelas); elas também estão em aba.ocL. */
import { textoFaixa } from './ref.js';
import { faixaDoFiltro, linhasEscondidasPeloFiltro } from './dados.js';

export const faixaDaTabela = (t) => ({ l1: t.l1, c1: t.c1, l2: t.l2 - (t.tot ? 1 : 0), c2: t.c2 });
/** O filtro da aba coincide com a tabela (jeito de antes da v0.6.40, quando a aba tinha um filtro só). */
export function filtroDaAbaNaTabela(aba, t) {
  const ff = faixaDoFiltro(aba && aba.fil);
  return !!(t && ff && ff.l1 === t.l1 && ff.c1 === t.c1 && ff.c2 === t.c2);
}
/** O filtro da tabela no formato do filtro da aba (com fx), ou null se ela não tem setas. Critério de coluna que saiu
    da tabela (Redimensionar para menos colunas) não vale. */
export function filDaTabela(t) {
  if (!t || !t.cab || !t.fil) return null;
  const dentro = (o) => { const r = {}; for (const k of Object.keys(o || {})) if (+k >= t.c1 && +k <= t.c2) r[k] = o[k]; return r; };
  return { ...t.fil, cr: dentro(t.fil.cr), ...(t.fil.cx ? { cx: dentro(t.fil.cx) } : {}), fx: textoFaixa(faixaDaTabela(t)) };
}
/** O que fica guardado na tabela (sem a faixa, que vem da própria tabela). */
const guardado = (fil) => { const { fx: _fx, ...resto } = fil; return { cr: {}, ...resto }; };
const semFiltro = (t) => { const { fil: _f, sf: _s, fcx: _c, ...resto } = t; return resto; };

/** Todos os filtros da aba: [{ k (null = o da aba), fil (com fx) }]. */
export function filtrosDaAba(c, abaId) {
  const aba = c.abas[abaId], out = [];
  if (aba && aba.fil && faixaDoFiltro(aba.fil)) out.push({ k: null, fil: aba.fil });
  for (const [k, t] of Object.entries(c.tabelas || {})) {
    if (!t || t.aba !== abaId || filtroDaAbaNaTabela(aba, t)) continue;
    const f = filDaTabela(t);
    if (f) out.push({ k, fil: f });
  }
  return out;
}
/** As faixas dos filtros da aba (a grade reserva o lugar da seta na linha dos títulos). */
export const faixasDosFiltros = (c, abaId) => filtrosDaAba(c, abaId).map((x) => faixaDoFiltro(x.fil));

/** O filtro que vale na célula: o da tabela em que ela está (se a tabela tem títulos) ou o da aba. { k, fil, t }; fil null = sem filtro. */
export function alvoDoFiltro(c, abaId, l, col) {
  const aba = c.abas[abaId];
  for (const [k, t] of Object.entries(c.tabelas || {})) {
    if (!t || t.aba !== abaId || !t.cab || l < t.l1 || l > t.l2 || col < t.c1 || col > t.c2) continue;
    if (filtroDaAbaNaTabela(aba, t)) return { k: null, fil: aba.fil, t };
    return { k, fil: filDaTabela(t), t };
  }
  return { k: null, fil: (aba && aba.fil) || null, t: null };
}

/** As mudanças que gravam o filtro (o da aba, k = null, ou o da tabela k). O fcx (critério cru do Excel, v0.6.11) sai:
    mexido aqui, o arquivo passa a sair do filtro do app. */
function gravacao(c, abaId, k, fil) {
  if (k == null) return { [`conteudo.abas.${abaId}.fil`]: fil || undefined };
  const t = c.tabelas[k];
  return { 'conteudo.tabelas': { ...c.tabelas, [k]: fil ? { ...semFiltro(t), fil: guardado(fil) } : { ...semFiltro(t), sf: 1 } } };
}
/** Para Classificar pela seta da tabela: grava o filtro com a ordem nova sem perder o critério que veio do Excel. */
export const guardarNaTabela = (c, k) => (fil) => ({ 'conteudo.tabelas': { ...c.tabelas, [k]: { ...c.tabelas[k], fil: guardado(fil) } } });

/**
 * Muda um filtro (o da aba, k = null, ou o da tabela k) e refaz as linhas escondidas somando todos os filtros da aba.
 * fil undefined = tirar o filtro. O critério que veio do Excel e o app não entende (cx) sai do filtro mexido (D-24);
 * nos outros filtros que têm cx, as linhas que ele escondia continuam escondidas.
 * textoDe(l, c) = texto mostrado na célula; x = { valorDe, corDe }.
 */
export function mudancasDosFiltros(c, abaId, k, fil, textoDe, x) {
  const aba = c.abas[abaId];
  if (fil && fil.cx) { const { cx: _cx, ...resto } = fil; fil = resto; }
  const antigoF = aba.ocF || {};
  const ocL = {}, ocF = {};
  for (const s of Object.keys(aba.ocL || {})) if (!antigoF[s]) ocL[s] = aba.ocL[s];
  const esconder = (l) => { ocL[l] = 1; ocF[l] = 1; };
  for (const e of filtrosDaAba(c, abaId)) {
    if (e.k === k) continue;
    for (const l of linhasEscondidasPeloFiltro(e.fil, textoDe, x)) esconder(l);
    if (e.fil.cx && Object.keys(e.fil.cx).length) {
      const f = faixaDoFiltro(e.fil);
      for (const s of Object.keys(antigoF)) { const l = +s; if (l > f.l1 && l <= f.l2) esconder(l); }
    }
  }
  const novo = !fil ? null : k == null ? fil : filDaTabela({ ...c.tabelas[k], fil: guardado(fil) });
  if (novo) for (const l of linhasEscondidasPeloFiltro(novo, textoDe, x)) esconder(l);
  const p = `conteudo.abas.${abaId}.`;
  return {
    [p + 'ocL']: Object.keys(ocL).length ? ocL : undefined,
    [p + 'ocF']: Object.keys(ocF).length ? ocF : undefined,
    ...gravacao(c, abaId, k, fil),
  };
}

/** Tira o filtro (da aba ou da tabela k) e mostra as linhas que só ele escondia. ler = { textoDe, x }: com ele, os outros
    filtros são refeitos (duas tabelas lado a lado escondem a linha inteira: tirar o filtro de uma não mostra o que a outra
    esconde). Sem ele (só nas contas sem tela), mostra as linhas da faixa do filtro. */
export function tirarFiltro(c, abaId, k, ler) {
  if (ler && ler.textoDe) return mudancasDosFiltros(c, abaId, k, undefined, ler.textoDe, ler.x);
  const aba = c.abas[abaId];
  const f = faixaDoFiltro(k == null ? aba.fil : filDaTabela(c.tabelas[k]));
  const ocL = { ...(aba.ocL || {}) }, ocF = { ...(aba.ocF || {}) };
  if (f) for (const s of Object.keys(aba.ocF || {})) { const l = +s; if (l > f.l1 && l <= f.l2) { delete ocF[s]; delete ocL[s]; } }
  const p = `conteudo.abas.${abaId}.`;
  return { [p + 'ocL']: Object.keys(ocL).length ? ocL : undefined, [p + 'ocF']: Object.keys(ocF).length ? ocF : undefined, ...gravacao(c, abaId, k, undefined) };
}
/** Liga as setas da tabela k (sem critério: nada some). */
export const ligarFiltro = (c, k) => gravacao(c, null, k, { cr: {} });
