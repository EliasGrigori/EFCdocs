/* Vértice Docs · Quadro · texturas de papel do post-it.
   v0.6.57: ponta dobrada, amassado e mancha de café. v0.6.60 (D-85): a cor fica só em backgroundColor.
   v0.6.62: as 12 aprovadas em 25/11 a partir do catálogo do Elias (P1 a P12): liso melhorado (padrão de todo post-it sem
   textura), dobra com aba de brilho, amassado suave (B: contorno 35% do catálogo, facetas 45%), café em derramamento (C),
   fita, pautado, quadriculado, alfinete, borda rasgada, kraft, clipe e marca-texto.
   A tela (partes.jsx + quadro.css) e o PDF (desenho.js, pelas funções do fim) usam as mesmas medidas daqui;
   as imagens (amassado, café, grão, kraft) vêm de scripts/gerar-texturas.mjs. */

export const TEXTURAS = [
  { id: '', nome: 'Liso' }, { id: 'dobrado', nome: 'Ponta dobrada' }, { id: 'amassado', nome: 'Amassado' }, { id: 'cafe', nome: 'Mancha de café' },
  { id: 'fita', nome: 'Fita adesiva' }, { id: 'pautado', nome: 'Papel pautado' }, { id: 'quadriculado', nome: 'Quadriculado' }, { id: 'alfinete', nome: 'Alfinete' },
  { id: 'rasgado', nome: 'Borda rasgada' }, { id: 'kraft', nome: 'Papel kraft' }, { id: 'clipe', nome: 'Clipe' }, { id: 'destaque', nome: 'Marca-texto' },
];
const IDS = new Set(TEXTURAS.map((t) => t.id).filter(Boolean));
export const texturaValida = (id) => (IDS.has(id) ? id : undefined);
export const texturaDo = (it) => (it && it.tipo === 'postit' ? texturaValida(it.tex) : undefined);
const IMG = { amassado: 'amassado', cafe: 'cafe', kraft: 'kraft', liso: 'grao' };
/** Endereço da imagem da textura (relativo à página do app); '' quando é só desenho. 'liso' = o grão do post-it sem textura. */
export const urlTextura = (id) => (IMG[id] ? `assets/texturas/${IMG[id]}.png` : '');
/** As imagens que um post-it precisa (o liso usa o grão). */
export const imagensDoPostit = (it) => ({ liso: ['liso'], kraft: ['kraft', 'liso'], amassado: ['amassado'], cafe: ['cafe'] }[texturaDo(it) || 'liso'] || []);

/* ---------- medidas comuns ---------- */
export const tamanhoDobra = (it) => Math.round(Math.max(12, Math.min(28, it.w * 0.17, it.h * 0.22)));
const PONTOS_AMASSADO = [[1, 3], [14, 0.5], [27, 3.5], [45, 0.5], [61, 2.5], [77, 0], [91, 3], [99, 1], [97.5, 22], [100, 41], [96.5, 63], [99.5, 84], [97, 97.5], [83, 99.5], [69, 96.5], [52, 99.5], [35, 97], [18, 100], [3, 97.5], [0.5, 79], [3, 56], [0, 34], [2.5, 16]];
const F_AMASSADO = 0.35;
/** Contorno do amassado em % (0 a 100): as pontas entram só 35% do que entravam no catálogo. */
export const contornoAmassado = () => PONTOS_AMASSADO.map(([x, y]) => {
  const ax = x < 50 ? x * F_AMASSADO : 100 - (100 - x) * F_AMASSADO, ay = y < 50 ? y * F_AMASSADO : 100 - (100 - y) * F_AMASSADO;
  return Math.min(x, 100 - x) < Math.min(y, 100 - y) ? [ax, y] : [x, ay];
});
export const contornoRasgado = () => [[0, 0], [100, 0], [100, 94], [95, 98], [90, 93], [85, 97.5], [79, 94], [73, 99], [67, 94], [61, 98], [55, 93], [49, 97.5], [43, 94], [37, 99], [31, 94], [25, 98], [19, 93], [13, 97.5], [7, 94], [2, 98], [0, 95]];
const poligonoCss = (pts) => `polygon(${pts.map(([x, y]) => `${+x.toFixed(2)}% ${+y.toFixed(2)}%`).join(',')})`;
/** Altura da linha do texto (14 px × 1,3 × escala da letra): o pautado acompanha. */
export const alturaLinha = (escala = 1) => 14 * 1.3 * escala;
export const MARGEM_PAUTA = 26, TOPO_PAUTA = 16, PASSO_GRADE = 14;
const LISO_DEGRADE = 'linear-gradient(180deg, rgba(0,0,0,.05) 0, rgba(0,0,0,.012) 16%, rgba(255,255,255,.12) 55%, rgba(0,0,0,.025) 100%)';
const KRAFT_DEGRADE = 'linear-gradient(180deg, rgba(120,82,40,.1) 0%, rgba(120,82,40,.04) 100%)';

/** O que a tela acrescenta ao estilo do post-it (só propriedades longas: nunca o atalho "background", ver D-85). */
export function estiloTextura(it, cor, escala = 1) {
  const t = texturaDo(it) || 'liso';
  const e = { '--c': cor };
  if (t === 'liso') Object.assign(e, { backgroundImage: `${LISO_DEGRADE},url(${urlTextura('liso')})`, backgroundSize: '100% 100%,120px 120px' });
  else if (t === 'dobrado') { const a = tamanhoDobra(it); Object.assign(e, { backgroundColor: 'transparent', backgroundImage: `linear-gradient(315deg, transparent ${(a * Math.SQRT1_2).toFixed(2)}px, ${cor} 0)` }); }
  else if (t === 'cafe') Object.assign(e, { backgroundImage: `url(${urlTextura('cafe')})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' });
  else if (t === 'kraft') Object.assign(e, { backgroundImage: `${KRAFT_DEGRADE},url(${urlTextura('kraft')}),url(${urlTextura('liso')})`, backgroundSize: '100% 100%,136px 136px,120px 120px' });
  else if (t === 'quadriculado') Object.assign(e, { backgroundImage: 'linear-gradient(to right, rgba(60,85,120,.12) 1px, transparent 1px),linear-gradient(to bottom, rgba(60,85,120,.12) 1px, transparent 1px)', backgroundSize: `${PASSO_GRADE}px ${PASSO_GRADE}px` });
  else if (t === 'pautado') { const L = alturaLinha(escala); Object.assign(e, { backgroundImage: `linear-gradient(90deg, transparent ${MARGEM_PAUTA}px, rgba(210,82,82,.32) ${MARGEM_PAUTA}px, rgba(210,82,82,.32) ${MARGEM_PAUTA + 1.5}px, transparent ${MARGEM_PAUTA + 1.5}px),repeating-linear-gradient(180deg, transparent 0, transparent ${(L - 1).toFixed(2)}px, rgba(75,108,158,.22) ${(L - 1).toFixed(2)}px, rgba(75,108,158,.22) ${L.toFixed(2)}px)`, backgroundPosition: `0 0,0 ${TOPO_PAUTA}px` }); }
  else if (t === 'destaque') Object.assign(e, { backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,.07) 0, rgba(0,0,0,.07) 22px, transparent 22px)' });
  else if (t === 'amassado' || t === 'rasgado') Object.assign(e, { backgroundColor: 'transparent' });
  return e;
}

/** Peças por cima ou por baixo do post-it na tela: [{ cls, style }] (partes.jsx desenha cada uma num <span>). */
export function pecasTextura(it, cor) {
  const t = texturaDo(it);
  if (t === 'dobrado') { const a = tamanhoDobra(it); return [{ cls: 'qi-aba', style: { width: a, height: a } }]; }
  if (t === 'amassado') return [{ cls: 'qi-tex-papel', style: { backgroundColor: cor, clipPath: poligonoCss(contornoAmassado()), backgroundImage: `url(${urlTextura('amassado')})`, backgroundSize: '100% 100%' } }];
  if (t === 'rasgado') return [{ cls: 'qi-tex-papel', style: { backgroundColor: cor, clipPath: poligonoCss(contornoRasgado()), backgroundImage: LISO_DEGRADE } }];
  if (t === 'fita') return [{ cls: 'qi-fita' }];
  if (t === 'alfinete') return [{ cls: 'qi-alfinete' }, { cls: 'qi-alfinete-sombra' }];
  if (t === 'clipe') return [{ cls: 'qi-clipe' }, { cls: 'qi-clipe-dentro' }];
  return [];
}

/** Mudanças para trocar a textura dos post-its escolhidos ('' = liso). */
export function mudancasTextura(c, ids, tex) {
  const t = texturaValida(tex);
  const mud = {};
  for (const id of ids) {
    const it = c.itens[id];
    if (!it || it.tipo !== 'postit') continue;
    const novo = { ...it };
    if (t) novo.tex = t; else delete novo.tex;
    mud['itens.' + id] = novo;
  }
  return mud;
}
export function valorTextura(c, ids) {
  const ts = [...new Set(ids.map((id) => c.itens[id]).filter((it) => it && it.tipo === 'postit').map((it) => texturaDo(it) || ''))];
  return ts.length === 1 ? ts[0] : ts.length ? null : '';
}

/* ---------- PDF e imagem (desenho.js chama) ---------- */
const caminho = (ctx, it, pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](it.x + (it.w * x) / 100, it.y + (it.h * y) / 100)); ctx.closePath(); };
function retArredondado(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
/** Degradê (linear ou radial) com as paradas; null se o canvas não souber fazer (então a camada não é pintada). */
function degradeDe(ctx, tipo, args, paradas) { const f = tipo === 'r' ? ctx.createRadialGradient : ctx.createLinearGradient; const g = f && f.apply(ctx, args); if (!g || !g.addColorStop) return null; for (const [p, c] of paradas) g.addColorStop(p, c); return g; }
const padrao = (ctx, img) => { try { return img ? ctx.createPattern(img, 'repeat') : null; } catch { return null; } };

/**
 * Desenha o papel do post-it com a textura (fundo, sombra, imagem, linhas e peças) e devolve o que o texto precisa:
 * { topo } (pautado: o texto começa em cima, nas linhas) e { marca } (marca-texto atrás de cada linha).
 * imagens: Map com 'tex:<nome>' (carregarImagens). O contorno fino só vai nos de papel reto.
 */
export function desenharPostitTextura(ctx, it, cor, imagens, escala = 1) {
  const t = texturaDo(it) || 'liso';
  const img = (n) => imagens && imagens.get('tex:' + n);
  ctx.save();
  ctx.fillStyle = cor;
  ctx.shadowColor = 'rgba(40,30,10,.18)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
  let forma = null;
  if (t === 'dobrado') { const a = tamanhoDobra(it); forma = [[0, 0], [100, 0], [100, 100 - (a / it.h) * 100], [100 - (a / it.w) * 100, 100], [0, 100]]; }
  else if (t === 'amassado') forma = contornoAmassado();
  else if (t === 'rasgado') forma = contornoRasgado();
  if (forma) { caminho(ctx, it, forma); ctx.fill(); } else { retArredondado(ctx, it.x, it.y, it.w, it.h, 4); ctx.fill(); }
  ctx.shadowColor = 'transparent';
  /* por cima do papel, dentro dele */
  ctx.save();
  if (forma) caminho(ctx, it, forma); else retArredondado(ctx, it.x, it.y, it.w, it.h, 4);
  ctx.clip();
  const degrade = (paradas) => { const g = degradeDe(ctx, 'l', [0, it.y, 0, it.y + it.h], paradas); if (g) { ctx.fillStyle = g; ctx.fillRect(it.x, it.y, it.w, it.h); } };
  const ladrilho = (n) => { const pt = padrao(ctx, img(n)); if (pt) { ctx.save(); ctx.translate(it.x, it.y); ctx.fillStyle = pt; ctx.fillRect(0, 0, it.w, it.h); ctx.restore(); } };
  if (t === 'liso' || t === 'rasgado') { degrade([[0, 'rgba(0,0,0,.05)'], [0.16, 'rgba(0,0,0,.012)'], [0.55, 'rgba(255,255,255,.12)'], [1, 'rgba(0,0,0,.025)']]); if (t === 'liso') ladrilho('liso'); }
  if (t === 'kraft') { degrade([[0, 'rgba(120,82,40,.1)'], [1, 'rgba(120,82,40,.04)']]); ladrilho('kraft'); ladrilho('liso'); }
  if ((t === 'amassado' || t === 'cafe') && img(t)) ctx.drawImage(img(t), it.x, it.y, it.w, it.h);
  if (t === 'quadriculado') { ctx.fillStyle = 'rgba(60,85,120,.12)'; for (let x = 0; x < it.w; x += PASSO_GRADE) ctx.fillRect(it.x + x, it.y, 1, it.h); for (let y = 0; y < it.h; y += PASSO_GRADE) ctx.fillRect(it.x, it.y + y, it.w, 1); }
  if (t === 'pautado') {
    const L = alturaLinha(escala);
    ctx.fillStyle = 'rgba(75,108,158,.22)'; for (let y = TOPO_PAUTA + L - 1; y < it.h; y += L) ctx.fillRect(it.x, it.y + y, it.w, 1);
    ctx.fillStyle = 'rgba(210,82,82,.32)'; ctx.fillRect(it.x + MARGEM_PAUTA, it.y, 1.5, it.h);
  }
  if (t === 'destaque') { ctx.fillStyle = 'rgba(0,0,0,.07)'; ctx.fillRect(it.x, it.y, it.w, 22); }
  ctx.restore();
  if (!forma) { ctx.strokeStyle = 'rgba(0,0,0,.10)'; ctx.lineWidth = 1; retArredondado(ctx, it.x + 0.5, it.y + 0.5, it.w - 1, it.h - 1, 4); ctx.stroke(); }
  ctx.restore();
  return { topo: t === 'pautado', marca: t === 'destaque' };
}

/** Peças que ficam por cima de tudo (depois do texto): aba da dobra, fita, alfinete e clipe. */
export function desenharPecasTextura(ctx, it, cor) {
  const t = texturaDo(it);
  ctx.save();
  if (t === 'dobrado') {
    const a = tamanhoDobra(it), x1 = it.x + it.w, y1 = it.y + it.h;
    ctx.shadowColor = 'rgba(40,30,10,.18)'; ctx.shadowBlur = 3; ctx.shadowOffsetX = -2; ctx.shadowOffsetY = -2;
    const g = degradeDe(ctx, 'l', [x1 - a, y1 - a, x1, y1], [[0, 'rgba(255,255,255,.92)'], [0.48, misturar(cor, '#8f8058', 0.24)], [0.5, 'rgba(0,0,0,.16)'], [0.51, 'rgba(0,0,0,0)']]); /* 135°: do canto de dentro para a ponta */
    ctx.beginPath(); ctx.moveTo(x1 - a, y1 - a); ctx.lineTo(x1, y1 - a); ctx.lineTo(x1 - a, y1); ctx.closePath();
    ctx.fillStyle = g || misturar(cor, '#8f8058', 0.24); ctx.fill();
  } else if (t === 'fita') {
    ctx.translate(it.x + it.w / 2, it.y + 1); ctx.rotate((-2.5 * Math.PI) / 180);
    ctx.shadowColor = 'rgba(0,0,0,.12)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1;
    ctx.fillStyle = 'rgba(255,255,255,.58)'; ctx.fillRect(-35, -10, 70, 20);
    ctx.shadowColor = 'transparent'; ctx.strokeStyle = 'rgba(120,110,90,.28)'; ctx.setLineDash([2, 2]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-34.5, -10); ctx.lineTo(-34.5, 10); ctx.moveTo(34.5, -10); ctx.lineTo(34.5, 10); ctx.stroke();
  } else if (t === 'alfinete') {
    const cx = it.x + it.w / 2, cy = it.y + 1;
    ctx.save(); ctx.filter = 'blur(2px)'; ctx.fillStyle = 'rgba(30,20,10,.2)'; ctx.translate(cx + 8, cy + 9); ctx.rotate((24 * Math.PI) / 180); ctx.beginPath(); ctx.ellipse(0, 0, 5.5, 2.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.shadowColor = 'rgba(0,0,0,.32)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 3;
    ctx.fillStyle = degradeDe(ctx, 'r', [cx - 2.9, cy - 3.2, 0, cx, cy, 8], [[0, '#ff8b8b'], [0.52, '#dc2626'], [1, '#7f1d1d']]) || '#dc2626'; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
  } else if (t === 'clipe') {
    const x = it.x + it.w - 32, y = it.y - 11;
    ctx.shadowColor = 'rgba(0,0,0,.16)'; ctx.shadowBlur = 3; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 2;
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2.4; retArredondado(ctx, x + 1.2, y + 1.2, 9.6, 29.6, 4.8); ctx.stroke();
    ctx.shadowColor = 'transparent'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 4, y + 7); ctx.lineTo(x + 4, y + 21); ctx.arcTo(x + 4, y + 24, x + 7, y + 24, 3); ctx.arcTo(x + 10, y + 24, x + 10, y + 21, 3); ctx.lineTo(x + 10, y + 7); ctx.stroke();
  }
  ctx.restore();
}
/** Mistura duas cores #rrggbb (k = quanto da segunda). */
function misturar(a, b, k) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(String(h).slice(i, i + 2), 16) || 0);
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v * (1 - k) + y[i] * k)).join(',')})`;
}
/** Marca-texto atrás de uma linha de texto (o mesmo da tela). */
export function marcaDaLinha(ctx, x0, yBase, w, tam) {
  ctx.save();
  ctx.fillStyle = degradeDe(ctx, 'l', [x0 - 6, 0, x0 + w + 6, 0], [[0, 'rgba(253,224,71,0)'], [0.03, 'rgba(250,204,21,.55)'], [0.95, 'rgba(250,204,21,.45)'], [1, 'rgba(253,224,71,0)']]) || 'rgba(250,204,21,.5)'; retArredondado(ctx, x0 - 6, yBase - tam * 0.95, w + 12, tam * 1.3, 4); ctx.fill();
  ctx.restore();
}
