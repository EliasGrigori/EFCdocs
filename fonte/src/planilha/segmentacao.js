/* Vértice Docs v0.6.41 — Planilha: contas da segmentação de dados de tabela (S1), sem tela. A tela fica em segmentacaoUi.jsx. */
import { textoCelula } from './grade.js';
import { estiloDe, largPadrao, altPadrao } from './modelo.js';
import { chave, textoFaixa } from './ref.js';
import { ehErro } from './valores.js';
import * as D from './dados.js';
import * as FT from './filtrosTabela.js';

/** Como o filtro lê as células de uma aba (texto mostrado, valor e cor), para a tabela que pode estar em outra aba. */
export function lerAba(c, motor, abaId) {
  const aba = c.abas[abaId];
  return {
    textoDe: (l, cc) => textoCelula(motor, c, abaId, l, cc).t,
    x: {
      valorDe: (l, cc) => { const v = motor.valor(abaId, l, cc); return v && typeof v === 'object' && !ehErro(v) ? null : v; },
      corDe: (l, cc) => { const e = estiloDe(c, aba.cel[chave(l, cc)]); return { fundo: e.fundo || '', cor: e.cor || '' }; },
    },
  };
}

/** Tabela e coluna da segmentação (a coluna é achada pelo título, que pode ter mudado de lugar). null se não existe mais. */
export function colunaDaSeg(c, motor, s) {
  const t = c.tabelas && c.tabelas[s.tab];
  if (!t || !t.cab || !c.abas[t.aba]) return null;
  for (let cc = t.c1; cc <= t.c2; cc++) {
    const tit = Array.isArray(t.cols) && t.cols[cc - t.c1] != null ? t.cols[cc - t.c1] : textoCelula(motor, c, t.aba, t.l1, cc).t;
    if (String(tit) === String(s.cn)) return { t, col: cc };
  }
  return null;
}

/** O que a segmentação mostra: { t, col, alvo: { k, fil }, ler, itens: [{ t, ok, marcado }], filtrada, todos }. */
export function estadoDaSeg(c, motor, s) {
  const r = colunaDaSeg(c, motor, s);
  if (!r) return null;
  const { t, col } = r, aba = c.abas[t.aba];
  const alvo = FT.filtroDaAbaNaTabela(aba, t) ? { k: null, fil: aba.fil } : { k: s.tab, fil: FT.filDaTabela(t) || { cr: {}, fx: textoFaixa(FT.faixaDaTabela(t)) } };
  const ler = lerAba(c, motor, t.aba);
  const valores = D.valoresDaColuna(alvo.fil, col, ler.textoDe, ler.x.valorDe, ler.x.corDe);
  const cr = alvo.fil.cr && alvo.fil.cr[col];
  const sel = cr && Array.isArray(cr.v) ? new Set(cr.v) : null;
  const itens = valores.map((v) => ({ t: v.t, ok: v.ok, marcado: sel ? sel.has(v.t) : true }));
  itens.sort((a, b) => (a.ok === b.ok ? 0 : a.ok ? -1 : 1)); // sem dados por último (o resto fica na ordem crescente)
  return { t, col, alvo, ler, itens, filtrada: !!cr, todos: valores.map((v) => v.t) };
}

/** O filtro novo depois de tocar num valor. somar = Ctrl+toque ou seleção múltipla. null = nada muda. */
export function filtroAoTocar(e, texto, somar) {
  const { fil } = e.alvo;
  let sel;
  if (!somar) sel = [texto];
  else {
    const atual = new Set(e.itens.filter((i) => i.marcado).map((i) => i.t));
    if (atual.has(texto)) atual.delete(texto); else atual.add(texto);
    if (!atual.size) return null; // como no Excel, fica pelo menos um valor
    sel = [...atual];
  }
  return D.comCriterio(fil, e.col, sel, e.todos);
}
export const filtroLimpo = (e) => { const cr = { ...(e.alvo.fil.cr || {}) }; delete cr[e.col]; return { ...e.alvo.fil, cr }; };

/** Tamanho da segmentação em px a 100%: como no Excel ("mover, mas não dimensionar com as células"), linhas e colunas
    escondidas embaixo dela (o próprio filtro esconde) não a encolhem. */
export function tamanhoDaSeg(aba, a) {
  let w = -a.dx1 + a.dx2, h = -a.dy1 + a.dy2;
  for (let cc = a.c1; cc < a.c2; cc++) w += aba.larg && aba.larg[cc] != null ? aba.larg[cc] : largPadrao(aba);
  for (let l = a.l1; l < a.l2; l++) h += aba.alt && aba.alt[l] != null ? aba.alt[l] : altPadrao(aba);
  return { w: Math.max(60, w), h: Math.max(60, h) };
}
