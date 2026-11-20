/* Vértice Docs v0.6.41 — Planilha: segmentação de dados de tabela vinda do Excel (S1 da segmentação).
   Lê as segmentações ligadas a uma tabela (x15:tableSlicerCache) e guarda na aba onde ela está desenhada:
   aba.seg = [{ nome, titulo, tab (chave da tabela em c.tabelas), cn (nome da coluna), cols (colunas de botões),
                alt (altura do botão em px), l, c, dx, dy, w, h (lugar como os objetos da grade, em px a 100%; v0.6.42) }].
   v0.6.41 guardava as duas células do Excel em "a"; segmentacao.js (posDaSeg) ainda entende.
   Só para mostrar e filtrar: as partes do arquivo (segmentação, cache e desenho) continuam voltando como vieram
   (guardar e devolver, v0.6.13), e o filtro que ela mexe sai no filtro da tabela (v0.6.40). As de tabela dinâmica
   e as linhas do tempo continuam sem aparecer. */
import { tags, tag, atributos, desescapar, escapar } from './xml.js';
import { largPadrao, altPadrao } from '../modelo.js';

const EMU = 9525;
const px = (v) => Math.round((+v || 0) / EMU);
const numDe = (bloco, nome) => { const m = new RegExp(`<(?:\\w+:)?${nome}>\\s*(-?\\d+)\\s*</(?:\\w+:)?${nome}>`).exec(bloco); return m ? +m[1] : 0; };
function ancoraDe(bloco) {
  const de = /<(?:\w+:)?from>([\s\S]*?)<\/(?:\w+:)?from>/.exec(bloco), ate = /<(?:\w+:)?to>([\s\S]*?)<\/(?:\w+:)?to>/.exec(bloco);
  if (!de || !ate) return null;
  return { c1: numDe(de[1], 'col'), dx1: px(numDe(de[1], 'colOff')), l1: numDe(de[1], 'row'), dy1: px(numDe(de[1], 'rowOff')),
    c2: numDe(ate[1], 'col'), dx2: px(numDe(ate[1], 'colOff')), l2: numDe(ate[1], 'row'), dy2: px(numDe(ate[1], 'rowOff')) };
}

/**
 * Chamado no fim da leitura, quando conteudo.tabelas já existe. folhas = [{ nome, parte, rels }], relsWb = relações do livro,
 * lerRels(xml, parte) e relsDe(parte) = os de ler.js, fora = o mapa "o que veio e o que ficou de fora".
 */
export async function lerSegmentacoes(zip, folhas, relsWb, conteudo, lerRels, relsDe, fora) {
  /* caches de tabela: nome do cache → { tabela (id do arquivo), coluna (id da coluna) } */
  const caches = new Map();
  for (const r of relsWb.values()) {
    if (!/slicerCache$/.test(r.tipo) || !r.alvo) continue;
    const x = (await zip.texto(r.alvo)) || '';
    const raiz = /<(?:\w+:)?slicerCacheDefinition\b([^>]*)>/.exec(x), ts = /<(?:\w+:)?tableSlicerCache\b([^>]*?)\/?>/.exec(x);
    if (!raiz || !ts) continue;
    const a = atributos(raiz[1]), b = atributos(ts[1]);
    caches.set(a.name, { tabela: String(b.tableId), coluna: String(b.column) });
  }
  if (!caches.size) return 0;
  /* id da tabela no arquivo → chave em conteudo.tabelas e nome de cada coluna pelo id */
  const tabs = new Map();
  for (const f of folhas) for (const r of (f.rels || new Map()).values()) {
    if (!/table$/.test(r.tipo) || !r.alvo) continue;
    const t = tag((await zip.texto(r.alvo)) || '', 'table');
    if (!t) continue;
    const cols = new Map(tags(t.dentro, 'tableColumn').map((c) => [String(c.a.id), desescapar(c.a.name || '')]));
    tabs.set(String(t.a.id), { k: String(t.a.displayName || t.a.name || '').toLowerCase(), cols });
  }
  const porNome = new Map(conteudo.ordem.map((id) => [conteudo.abas[id].nome, id]));
  let n = 0;
  for (const f of folhas) {
    const abaId = porNome.get(f.nome);
    if (!abaId || !f.rels) continue;
    const defs = [];
    for (const r of f.rels.values()) if (/(^|\/)slicer$/.test(r.tipo) && r.alvo) for (const s of tags((await zip.texto(r.alvo)) || '', 'slicer')) defs.push(s.a);
    if (!defs.length) continue;
    const ancoras = new Map();
    for (const r of f.rels.values()) {
      if (!/drawing$/.test(r.tipo) || !r.alvo) continue;
      const dx = (await zip.texto(r.alvo)) || '';
      for (const m of dx.matchAll(/<(?:\w+:)?twoCellAnchor\b[\s\S]*?<\/(?:\w+:)?twoCellAnchor>/g)) {
        const s = /<(?:\w+:)?slicer\b[^>]*\bname="([^"]*)"/.exec(m[0]);
        if (s) { const a = ancoraDe(m[0]); if (a) ancoras.set(desescapar(s[1]), a); }
      }
    }
    const lista = [];
    for (const d of defs) {
      const ca = caches.get(d.cache), tb = ca && tabs.get(ca.tabela), t = tb && conteudo.tabelas && conteudo.tabelas[tb.k], a = ancoras.get(d.name);
      if (!t || !t.cab || !a || !tb.cols.has(ca.coluna)) continue;
      /* tamanho que não muda com as células ("mover, mas não dimensionar"): linha escondida conta a altura que teria */
      const aba = conteudo.abas[abaId], lg = (cc) => (aba.larg && aba.larg[cc] != null ? aba.larg[cc] : largPadrao(aba)), at = (l) => (aba.alt && aba.alt[l] != null ? aba.alt[l] : altPadrao(aba));
      let w = a.dx2 - a.dx1, h = a.dy2 - a.dy1;
      for (let cc = a.c1; cc < a.c2; cc++) w += lg(cc);
      for (let l = a.l1; l < a.l2; l++) h += at(l);
      lista.push({ nome: d.name, titulo: d.caption != null ? d.caption : d.name, tab: tb.k, cn: tb.cols.get(ca.coluna),
        cols: Math.max(1, Math.min(20, +d.columnCount || 1)), alt: Math.max(16, Math.min(80, px(d.rowHeight) || 25)), ...(d.showCaption === '0' ? { semTitulo: 1 } : {}),
        l: a.l1, c: a.c1, dx: a.dx1, dy: a.dy1, w: Math.max(60, w), h: Math.max(60, h) });
    }
    if (lista.length) { conteudo.abas[abaId].seg = lista; n += lista.length; }
  }
  const x = fora && fora.get('Segmentações de dados e linhas do tempo');
  if (n && x) x.detalhe = `${n === 1 ? 'a segmentação de tabela aparece' : `as ${n} segmentações de tabela aparecem`} e filtra${n === 1 ? '' : 'm'} a tabela; as de tabela dinâmica e as linhas do tempo não aparecem aqui; todas voltam iguais ao salvar como Excel`;
  return n;
}

/* ---------- v0.6.42 (S2): ao salvar, o que mudou no app nas segmentações que vieram do Excel ----------
   As partes voltam pelo guardar e devolver (devolver.js); aqui só se ajusta: a apagada no app sai (aba.segFora) e a
   mexida (lugar, tamanho, título, colunas de botões, mostrar o título) leva o que está no app. A feita no app (novo) ainda não vai (S3). */
const doApp = (aba, nome) => ((aba && aba.seg) || []).find((s) => s.nome === nome);
/** Nomes das segmentações apagadas no app. */
export const apagadasNoApp = (aba) => new Set((aba && aba.segFora) || []);
/** A parte da segmentação (xl/slicers/…) com o título, as colunas e o "mostrar o título" das mexidas no app. */
export function ajustarParteSeg(xml, aba) {
  if (!aba || !aba.seg || !xml) return xml;
  return String(xml).replace(/<((?:\w+:)?slicer)\b([^>]*?)(\/?)>/g, (m, tg, at, fim) => {
    const s = doApp(aba, desescapar((/\bname="([^"]*)"/.exec(at) || [])[1] || ''));
    if (!s || !s.mexida) return m;
    let a = at;
    const por = (k, v) => { a = new RegExp(`\\s${k}="[^"]*"`).test(a) ? a.replace(new RegExp(`(\\s${k}=")[^"]*"`), `$1${v}"`) : `${a} ${k}="${v}"`; };
    const tirar = (k) => { a = a.replace(new RegExp(`\\s${k}="[^"]*"`), ''); };
    por('caption', escapar(String(s.titulo || '')));
    if (s.cols > 1) por('columnCount', s.cols); else tirar('columnCount');
    if (s.semTitulo) por('showCaption', '0'); else tirar('showCaption');
    return `<${tg}${a}${fim}>`;
  });
}
/** O bloco do desenho (twoCellAnchor) com o lugar e o tamanho do app, se a segmentação foi mexida. */
export function ajustarAncoraSeg(bloco, aba, nome) {
  const s = doApp(aba, nome);
  if (!s || !s.mexida || s.l == null || !/<xdr:from>/.test(bloco)) return bloco;
  const lg = (cc) => (aba.larg && aba.larg[cc] != null ? aba.larg[cc] : largPadrao(aba)), at = (l) => (aba.alt && aba.alt[l] != null ? aba.alt[l] : altPadrao(aba));
  const andar = (i0, d0, tam, med) => { let i = i0, resto = d0 + tam; while (resto >= med(i) && med(i) > 0 && i < i0 + 2000) { resto -= med(i); i++; } return [i, Math.round(resto)]; };
  const [c2, dx2] = andar(s.c, s.dx || 0, s.w, lg), [l2, dy2] = andar(s.l, s.dy || 0, s.h, at);
  const ponta = (tg, c, dx, l, dy) => `<xdr:${tg}><xdr:col>${c}</xdr:col><xdr:colOff>${Math.round(dx) * EMU}</xdr:colOff><xdr:row>${l}</xdr:row><xdr:rowOff>${Math.round(dy) * EMU}</xdr:rowOff></xdr:${tg}>`;
  return bloco.replace(/<xdr:from>[\s\S]*?<\/xdr:from>/, ponta('from', s.c, s.dx || 0, s.l, s.dy || 0)).replace(/<xdr:to>[\s\S]*?<\/xdr:to>/, ponta('to', c2, dx2, l2, dy2));
}
