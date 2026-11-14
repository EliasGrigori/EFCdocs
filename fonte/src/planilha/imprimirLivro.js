/* Vértice Docs — Planilha: imprimir e PDF sem depender da tela (v0.6.17). Estas funções saíram do Planilha.jsx sem mudar
   o que fazem: recebem o conteúdo (c) e o motor de contas e devolvem as páginas. Servem à tela (Imprimir, PDF, Compartilhar)
   e à Ponte 2 (preencher uma cópia em memória e imprimir a pedido do EFCwork). */
import { MAX_LIN, MAX_COL, chave, lerChave, textoFaixa, normalFaixa, lerEndereco } from './ref.js';
import { eixo, largPadrao, altPadrao, estiloDe, mescladas, mesclaEm } from './modelo.js';
import { textoCelula } from './grade.js';
import { objetosDaAba } from './objetos.js';
import { svgDaForma } from './formas.js';
import { dadosDaFaixa } from './graficos.js';
import { TEMA_CLARO, svgDoGrafico } from './desenhoGrafico.js';
import { lerFaixaDoLivro } from './xlsx/graficosXlsx.js';
import { paginar, normalizarImp } from './impressao.js';
import { desenharPaginas, svgDaPagina } from './paginaDesenho.js';

/** Texto da célula ligada a uma forma (caixa de texto que mostra o valor da célula). */
export const lerLigadoDe = (c, motor, idPadrao) => (lg) => {
  const idA = lg && lg.aba && c.abas[lg.aba] ? lg.aba : idPadrao;
  const p = lg && lerChave(lg.ref);
  if (!p) return '';
  try { return textoCelula(motor, c, idA, p.l, p.c).t; } catch { return ''; }
};

/** Lê a faixa dos dados de um gráfico ("A1:C20" ou "Resumo!A1:C20") e devolve { d, erro, fx, aba }. */
export function lerDadosGrafico(c, motor, texto, porLinhas, abaPadrao, mostrarOcultos = false) {
  let t = String(texto || '').trim();
  let abaD = abaPadrao;
  const m = /^(?:'([^']+)'|([^!]+))!(.+)$/.exec(t);
  if (m) {
    const nome = (m[1] || m[2]).trim();
    const id = c.ordem.find((x) => c.abas[x].nome.toLocaleLowerCase('pt-BR') === nome.toLocaleLowerCase('pt-BR'));
    if (!id) return { erro: `Não achei a aba "${nome}".`, d: { cats: [], series: [] } };
    abaD = id; t = m[3].trim();
  }
  const f0 = lerEndereco(t.toUpperCase());
  if (!f0) return { erro: t ? 'Diga as células, por exemplo A1:C20.' : '', d: { cats: [], series: [] } };
  const f = normalFaixa(f0);
  if ((f.l2 - f.l1 + 1) > 5000 || (f.c2 - f.c1 + 1) > 60) return { erro: 'Faixa grande demais para um gráfico (até 5.000 linhas e 60 colunas).', d: { cats: [], series: [] } };
  const AD = c.abas[abaD];
  /* v0.6.1: como no Excel, linhas e colunas ocultas ficam fora (a não ser que o gráfico peça para mostrar) */
  const ocultos = !mostrarOcultos && AD && (AD.ocL || AD.ocC) ? { l: AD.ocL || {}, c: AD.ocC || {} } : null;
  const fmtDe = (l, cc) => { const x = AD && AD.cel[chave(l, cc)]; return x ? estiloDe(c, x).nf || null : null; };
  const d = dadosDaFaixa(f, (l, cc) => { const v = motor.valor(abaD, l, cc); return v && typeof v === 'object' ? null : v; }, (l, cc) => textoCelula(motor, c, abaD, l, cc).t, porLinhas, fmtDe, ocultos);
  return { d, fx: textoFaixa(f), aba: abaD, ocultas: d.ocultas || 0 };
}

/** O que a impressão precisa saber de uma aba: tamanhos, texto de cada célula, mescladas e os objetos já desenhados. */
export function fonteImpressao(c, motor, idA, nomeArquivo) {
  const A = c.abas[idA];
  const ec = eixo(A.larg, A.ocC, largPadrao(A), MAX_COL), el = eixo(A.alt, A.ocL, altPadrao(A), MAX_LIN);
  const ms = mescladas(A);
  const objetos = objetosDaAba(A).map((o) => {
    if (o.tipo === 'grafico') {
      if (o.g.t === 'excel') return { ...o, svg: svgDoGrafico(o.g, null, { w: o.w, h: o.h, tema: TEMA_CLARO, lerFaixa: lerFaixaDoLivro(c, motor, idA, o.g.plano && o.g.plano.soVisiveis === false) }) };
      const ld = lerDadosGrafico(c, motor, o.g.dados.fx, !!o.g.porLinhas, o.g.dados.aba && c.abas[o.g.dados.aba] ? o.g.dados.aba : idA, !!o.g.op.ocultos);
      return { ...o, svg: svgDoGrafico(o.g, ld.d, { w: o.w, h: o.h, tema: TEMA_CLARO }) };
    }
    /* v0.6.8 (Grok): o texto das formas também vai como texto (invisível, por cima da imagem) para dar para pesquisar no PDF */
    if (o.tipo === 'forma') {
      const ll = lerLigadoDe(c, motor, idA);
      const texto = (o.partes || []).map((pp) => (pp.texto && pp.texto.ligado ? ll(pp.texto.ligado) || '' : pp.texto && pp.texto.pars ? pp.texto.pars.map((q) => (q.runs || []).map((r) => r.t || '').join('')).join(' ') : '')).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      return { ...o, svg: svgDaForma(o, Math.max(1, o.w), Math.max(1, o.h), { lerLigado: ll, uid: 'imp' + o.id }), ...(texto ? { textoOculto: texto.slice(0, 500) } : {}) };
    }
    const nome = String(o.nome || '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    const lin = Math.round(o.h * 0.72);
    return { ...o, svg: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${o.w} ${o.h}" width="${o.w}" height="${o.h}">${o.rub ? `<image href="${o.rub}" xlink:href="${o.rub}" x="6" y="2" width="${o.w - 12}" height="${lin - 4}" preserveAspectRatio="xMidYMax meet"/>` : ''}<line x1="6" y1="${lin}" x2="${o.w - 6}" y2="${lin}" stroke="#222" stroke-width="1"/><text x="${o.w / 2}" y="${lin + 14}" text-anchor="middle" font-size="12" font-family="Helvetica, Arial" fill="#222">${nome}</text></svg>` };
  });
  return {
    tamCol: (k) => ec.tam(k), tamLin: (k) => el.tam(k),
    celula: (l, k) => { const tc = textoCelula(motor, c, idA, l, k); return { t: tc.t, al: tc.al, e: tc.e, v: tc.v, cor: tc.cor }; },
    mescla: (l, k) => mesclaEm(ms, l, k),
    objetos, aba: A.nome, arquivo: nomeArquivo || 'Planilha', agora: new Date(),
  };
}

/** Área usada: células com valor, fórmula, preenchimento ou borda, mais os objetos. */
export function areaUsada(c, motor, idA) {
  const A = c.abas[idA];
  let l2 = -1, c2 = -1;
  for (const [k, x] of Object.entries(A.cel || {})) {
    if (!x) continue;
    const e = x.s ? (c.estilos[x.s] || {}) : {};
    if (x.v === undefined && x.f === undefined && !e.fundo && !e.bd) continue;
    const p = lerChave(k);
    /* fórmula que dá vazio (a folga copiada até o fim) não estica a impressão */
    if (p && !e.fundo && !e.bd && (x.v === '' || x.f !== undefined)) { let v; try { v = motor.valor(idA, p.l, p.c); } catch { v = null; } if (v == null || v === '') continue; }
    if (p) { if (p.l > l2) l2 = p.l; if (p.c > c2) c2 = p.c; }
  }
  const ec = eixo(A.larg, A.ocC, largPadrao(A), MAX_COL), el = eixo(A.alt, A.ocL, altPadrao(A), MAX_LIN);
  for (const o of objetosDaAba(A)) { const cf = ec.em(ec.pos(o.c) + o.dx + o.w - 1), lf = el.em(el.pos(o.l) + o.dy + o.h - 1); if (lf > l2) l2 = lf; if (cf > c2) c2 = cf; }
  for (const m of mescladas(A)) { if (m.l2 > l2) l2 = m.l2; if (m.c2 > c2) c2 = m.c2; }
  return l2 < 0 ? null : { l1: 0, c1: 0, l2, c2 };
}

/** As páginas da impressão. alvo: 'todas' (abas visíveis), 'aba' ou 'sel' (a faixa dada). Devolve { paginas, esc, aviso }. */
export function gerarImpressao(c, motor, { imp, alvo, abaId, faixa, nomeArquivo }) {
  const ids = alvo === 'todas' ? c.ordem.filter((x) => !c.abas[x].oculta) : [abaId];
  let todas = [], esc = 1, aviso = '';
  for (const idA of ids) {
    const impA = idA === abaId ? imp : normalizarImp(c.abas[idA].imp);
    let area = null;
    if (alvo === 'sel' && idA === abaId) area = normalFaixa(faixa);
    else if (impA.area) { const f0 = lerEndereco(impA.area); area = f0 ? normalFaixa(f0) : null; if (!f0 && idA === abaId) aviso = `"${impA.area}" não é uma área válida (use, por exemplo, A1:F40).`; }
    if (!area) area = areaUsada(c, motor, idA);
    if (!area) continue;
    if ((area.l2 - area.l1 + 1) * (area.c2 - area.c1 + 1) > 3000000) { aviso = 'Área grande demais para imprimir de uma vez: escolha uma parte.'; continue; }
    const fonte = fonteImpressao(c, motor, idA, nomeArquivo);
    const pg = paginar(impA, area, fonte.tamCol, fonte.tamLin, { objetos: fonte.objetos || [] });
    if (pg.paginas.length > 500) { aviso = `Daria ${pg.paginas.length} páginas: escolha uma área menor ou use "Aba toda numa página" / "Todas as colunas numa página".`; continue; }
    if (idA === abaId) esc = pg.esc;
    todas = todas.concat(desenharPaginas(pg, fonte));
  }
  if (!todas.length && !aviso) aviso = 'Não há nada para imprimir: a aba está vazia.';
  /* numera as páginas no conjunto todo */
  return { paginas: todas, esc, aviso };
}

/** Manda as páginas para a impressora (janela de imprimir do navegador), por um quadro escondido. */
export async function imprimirPaginas(paginas, titulo) {
  if (!paginas.length) return;
  const p0 = paginas[0];
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${String(titulo || 'planilha').replace(/[<>&]/g, '')}</title><style>@page{size:${p0.W}pt ${p0.H}pt;margin:0}html,body{margin:0;padding:0;background:#fff}.pg{width:${p0.W}pt;height:${p0.H}pt;overflow:hidden;page-break-after:always;break-after:page}.pg:last-child{page-break-after:auto;break-after:auto}.pg svg{display:block;width:100%;height:100%}</style></head><body>${paginas.map((p, i) => `<div class="pg">${svgDaPagina(p, { id: 'i' + i + '_' })}</div>`).join('')}</body></html>`;
  const fr = document.createElement('iframe');
  fr.setAttribute('aria-hidden', 'true');
  fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(fr);
  const d = fr.contentDocument;
  d.open(); d.write(html); d.close();
  await new Promise((ok) => setTimeout(ok, 250));
  try { fr.contentWindow.focus(); fr.contentWindow.print(); } finally { setTimeout(() => fr.remove(), 60000); }
}
