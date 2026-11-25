/* Vértice Docs · Quadro · configurar página e montar as folhas (v0.6.54; propostas 3, 5 e 6 aprovadas em 25/11).
   - Usa os papéis e as margens da Planilha (planilha/impressao.js), como no Excel.
   - conteudo.impressao = { alvo, orient, papel, marg, escala, pct, largura, cabRod }, guardado no quadro (só quando não é
     o padrão). Padrão = como era antes: A4 deitado, ajustado a 1 página, com o nome do quadro em cima e a origem embaixo.
   - Ajustar a 1 página enche a folha, aumentando ou diminuindo, como era antes ("quem não mexer continua como hoje").
     Tamanho real e porcentagem dividem o quadro em várias folhas (para baixo, depois para o lado); N páginas de largura
     só diminui, como no Excel. O fundo do quadro não sai no papel. */
import { PAPEIS, MARGENS, CM } from '../planilha/impressao.js';
import { listaItens, folhas, recorte } from './modelo.js';
import { limitesDoQuadro, desenharQuadro, carregarImagens, fontesProntas } from './desenho.js';
import { derivar } from './legenda.js';

export const PX_PT = 0.75; /* 1 px da tela = 0,75 pt no papel (100%) */
export const ALVOS = [['tudo', 'Quadro todo'], ['escolhidos', 'Itens escolhidos'], ['paginas', 'Cada página numa folha']];
export const ESCALAS = [['pagina', 'Ajustar a 1 página'], ['real', 'Tamanho real (100%)'], ['pct', 'Porcentagem…'], ['largura', 'Caber em N páginas de largura…']];
export const IMPQ_PADRAO = { alvo: 'auto', orient: 'paisagem', papel: 'A4', marg: 'estreita', escala: 'pagina', pct: 100, largura: 1, cabRod: true };
const FOLGA = 12; /* px em volta do que vai sair */

const um = (v, lista, padrao) => (lista.includes(v) ? v : padrao);
const num = (v, min, max, padrao) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : padrao; };

/** A configuração conferida: o que não for conhecido volta ao padrão. */
export function normalizarImpQ(x) {
  const o = x && typeof x === 'object' ? x : {};
  return {
    alvo: um(o.alvo, ['auto', 'tudo', 'escolhidos', 'paginas'], 'auto'),
    orient: um(o.orient, ['retrato', 'paisagem'], 'paisagem'),
    papel: um(o.papel, Object.keys(PAPEIS), 'A4'),
    marg: um(o.marg, Object.keys(MARGENS), 'estreita'),
    escala: um(o.escala, ESCALAS.map(([k]) => k), 'pagina'),
    pct: num(o.pct, 10, 400, 100),
    largura: num(o.largura, 1, 20, 1),
    cabRod: o.cabRod !== false,
  };
}
export const ehImpQPadrao = (x) => JSON.stringify(normalizarImpQ(x)) === JSON.stringify(IMPQ_PADRAO);

/** Tamanho do papel em pontos, já deitado ou em pé. */
export function tamanhoPapel(imp) {
  const p = PAPEIS[imp.papel] || PAPEIS.A4;
  return imp.orient === 'paisagem' ? { w: p.h, h: p.w } : { w: p.w, h: p.h };
}

/** Área onde o quadro é desenhado, em pontos, medida do canto de cima (o cabeçalho e o rodapé ficam nas margens). */
export function areaUtil(imp) {
  const P = tamanhoPapel(imp), m = MARGENS[imp.marg] || MARGENS.estreita;
  const t = m.t * CM, b = m.b * CM, l = m.l * CM, r = m.r * CM;
  return { x: l, y: t, w: Math.max(40, P.w - l - r), h: Math.max(40, P.h - t - b) };
}

/** Grupos que vão para o papel: cada um vira uma ou mais folhas. */
function grupos(c, imp, escolhidos) {
  const cd = derivar(c);
  const alvo = imp.alvo === 'auto' ? (folhas(cd).length ? 'paginas' : 'tudo') : imp.alvo;
  if (alvo === 'paginas' && folhas(cd).length) return folhas(cd).map((f) => ({ titulo: f.titulo, ids: f.ids }));
  if (alvo === 'escolhidos') {
    const ids = new Set((escolhidos || []).filter((id) => cd.itens[id]));
    return ids.size ? [{ titulo: '', ids }] : [];
  }
  const ids = new Set(listaItens(cd).map((o) => o.id));
  return ids.size ? [{ titulo: '', ids }] : [];
}

/** Escala (pontos por px) de um grupo com largura w e altura h (px), para a área A (pontos). */
export function escalaDoGrupo(imp, w, h, A) {
  if (imp.escala === 'real') return PX_PT;
  if (imp.escala === 'pct') return PX_PT * imp.pct / 100;
  if (imp.escala === 'largura') return Math.min(PX_PT, (imp.largura * A.w) / w);
  return Math.min(A.w / w, A.h / h); /* como antes da v0.6.54: o quadro enche a folha (aumenta ou diminui), aprovado no item 5 */
}

/**
 * As folhas, prontas para desenhar: [{ W, H, area, mundo, s, offX, offY, ids, titulo }]
 * W/H = papel (pt); area = onde a imagem entra (pt, de cima); mundo = pedaço do quadro (px); s = pt por px.
 * Devolve também esc (1 = 100%) e aviso (quando não há o que imprimir).
 */
export function paginasDaImpressao(c, imp0, escolhidos) {
  const imp = normalizarImpQ(imp0);
  const P = tamanhoPapel(imp), A = areaUtil(imp);
  const lista = grupos(c, imp, escolhidos);
  if (!lista.length) return { paginas: [], esc: 1, aviso: imp.alvo === 'escolhidos' ? 'Escolha um ou mais itens no quadro para imprimir só eles.' : 'O quadro está vazio.' };
  const paginas = [];
  let menor = Infinity;
  for (const g of lista) {
    const lim = limitesDoQuadro(recorte(c, g.ids));
    if (!lim) continue;
    const R = { x: lim.x - FOLGA, y: lim.y - FOLGA, w: lim.w + FOLGA * 2, h: lim.h + FOLGA * 2 };
    const s = escalaDoGrupo(imp, R.w, R.h, A);
    menor = Math.min(menor, s);
    const cols = Math.max(1, Math.ceil(R.w * s / A.w - 1e-6)), lins = Math.max(1, Math.ceil(R.h * s / A.h - 1e-6));
    const offX = cols === 1 ? (A.w - R.w * s) / 2 : 0, offY = lins === 1 ? (A.h - R.h * s) / 2 : 0;
    for (let co = 0; co < cols; co++) {
      for (let li = 0; li < lins; li++) {
        paginas.push({ W: P.w, H: P.h, area: A, s, offX, offY, ids: g.ids, titulo: g.titulo, mundo: { x: R.x + co * A.w / s, y: R.y + li * A.h / s, w: A.w / s, h: A.h / s }, parte: cols * lins > 1 ? { co, li, cols, lins } : null });
      }
    }
  }
  return { paginas, esc: Number.isFinite(menor) ? menor / PX_PT : 1, aviso: '' };
}

/** Desenha a área de uma folha num canvas (k = pixels por ponto). */
export async function canvasDaFolha(c, pg, { k = 2, codigos = true, demo = false, imagens } = {}) {
  await fontesProntas();
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(pg.area.w * k)); cv.height = Math.max(1, Math.round(pg.area.h * k));
  const ctx = cv.getContext('2d');
  const sub = recorte(c, pg.ids);
  desenharQuadro(ctx, sub, { escala: pg.s * k, origem: { x: pg.mundo.x - pg.offX / pg.s, y: pg.mundo.y - pg.offY / pg.s }, codigos, demo, imagens: imagens || await carregarImagens(sub) });
  return cv;
}
