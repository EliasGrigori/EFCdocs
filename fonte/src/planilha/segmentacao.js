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

/* ---------- v0.6.42 (S2): criar, mover, mudar o tamanho, apagar e configurar ---------- */
export const SEG = { W: 184, H: 240, W_MIN: 80, H_MIN: 80 }; // tamanho do Excel ao inserir (4,87 cm × 6,35 cm)
export const caminhoSeg = (abaId) => `conteudo.abas.${abaId}.seg`;

/** Lugar da segmentação como os outros objetos da grade: célula (l, c), folga (dx, dy) e tamanho (w, h) em px a 100%.
    A da v0.6.41 guardava as duas células do Excel (a); vira este formato na hora. */
export function posDaSeg(aba, s) {
  if (s.a && s.l == null) { const t = tamanhoDaSeg(aba, s.a); return { l: s.a.l1, c: s.a.c1, dx: s.a.dx1, dy: s.a.dy1, w: t.w, h: t.h }; }
  return { l: s.l || 0, c: s.c || 0, dx: s.dx || 0, dy: s.dy || 0, w: s.w || SEG.W, h: s.h || SEG.H };
}
/** A segmentação no formato novo (sem o "a" da v0.6.41). */
export function normalSeg(aba, s) { const { a: _a, ...resto } = s; return { ...resto, ...posDaSeg(aba, s) }; }

/** Para o arquivo: as duas células (de e até) com as folgas em px, andando pelas larguras e alturas da aba
    (linha escondida conta a altura que ela teria, como no tamanho da tela). */
export function duasCelulas(aba, p) {
  const larg = (cc) => (aba.larg && aba.larg[cc] != null ? aba.larg[cc] : largPadrao(aba)), alt = (l) => (aba.alt && aba.alt[l] != null ? aba.alt[l] : altPadrao(aba));
  const andar = (i0, d0, tam, med) => { let i = i0, resto = d0 + tam; while (resto >= med(i) && med(i) > 0 && i < i0 + 2000) { resto -= med(i); i++; } return [i, Math.round(resto)]; };
  const [c2, dx2] = andar(p.c, p.dx, p.w, larg), [l2, dy2] = andar(p.l, p.dy, p.h, alt);
  return { c1: p.c, dx1: Math.round(p.dx), l1: p.l, dy1: Math.round(p.dy), c2, dx2, l2, dy2 };
}

/** Os nomes de segmentação usados no livro (o nome é único no arquivo, como no Excel). */
export function nomesDeSeg(c) {
  const n = new Set();
  for (const id of c.ordem || []) { const a = c.abas[id]; for (const s of (a && a.seg) || []) n.add(String(s.nome).toLowerCase()); for (const x of (a && a.segFora) || []) n.add(String(x).toLowerCase()); }
  return n;
}
const nomeLivre = (base, usados) => { let n = base, k = 0; while (usados.has(n.toLowerCase())) n = `${base} ${++k}`; usados.add(n.toLowerCase()); return n; };

/** Os títulos das colunas da tabela k: [{ col, titulo }]. */
export function colunasDaTabela(c, motor, k) {
  const t = c.tabelas[k], out = [];
  for (let cc = t.c1; cc <= t.c2; cc++) out.push({ col: cc, titulo: String(Array.isArray(t.cols) && t.cols[cc - t.c1] != null ? t.cols[cc - t.c1] : textoCelula(motor, c, t.aba, t.l1, cc).t) });
  return out;
}

/** Inserir › Segmentação de dados: uma segmentação para cada título escolhido, à direita da tabela, em cascata
    (como o Excel faz). novo = 1: feita no app (o arquivo do Excel ainda não leva; S3). */
export function novasSegs(c, abaId, k, titulos) {
  const t = c.tabelas[k], aba = c.abas[abaId], usados = nomesDeSeg(c);
  const naMesma = t.aba === abaId;
  const base = naMesma ? { l: t.l1, c: t.c2 + 2 } : { l: 1, c: 1 };
  const novas = titulos.map((tit, i) => ({ nome: nomeLivre(tit, usados), titulo: tit, tab: k, cn: tit, cols: 1, alt: 25, l: base.l, c: base.c, dx: 24 * i, dy: 24 * i, w: SEG.W, h: SEG.H, novo: 1 }));
  return { [caminhoSeg(abaId)]: [...((aba.seg || []).map((s) => normalSeg(aba, s))), ...novas] };
}

/** Muda uma segmentação (lugar, tamanho, título, colunas). mexida = 1 nas que vieram do Excel: o arquivo leva a mudança. */
export function comSeg(c, abaId, nome, campos) {
  const aba = c.abas[abaId];
  return { [caminhoSeg(abaId)]: (aba.seg || []).map((s) => (s.nome === nome ? { ...normalSeg(aba, s), ...campos, ...(s.novo ? {} : { mexida: 1 }) } : normalSeg(aba, s))) };
}

/** Apagar: sai da aba; a que veio do Excel fica anotada em segFora (o arquivo deixa de levá-la). Como no Excel, o filtro
    que ela fazia sai junto, se nenhuma outra segmentação mexe na mesma coluna. ler = lerAba da aba da tabela (para refazer as linhas). */
export function apagarSeg(c, motor, abaId, nome) {
  const aba = c.abas[abaId], s = (aba.seg || []).find((x) => x.nome === nome);
  if (!s) return {};
  const resto = (aba.seg || []).filter((x) => x.nome !== nome).map((x) => normalSeg(aba, x));
  const mud = { [caminhoSeg(abaId)]: resto.length ? resto : undefined };
  if (!s.novo) mud[`conteudo.abas.${abaId}.segFora`] = [...(aba.segFora || []), s.nome];
  const outra = (c.ordem || []).some((id) => ((id === abaId ? resto : c.abas[id].seg) || []).some((x) => x.tab === s.tab && x.cn === s.cn));
  const e = !outra && estadoDaSeg(c, motor, s);
  if (e && e.filtrada) Object.assign(mud, FT.mudancasDosFiltros(c, e.t.aba, e.alvo.k, filtroLimpo(e), e.ler.textoDe, e.ler.x));
  return mud;
}
