/* Vértice Docs · Quadro · texturas de papel do post-it (v0.6.57; proposta 5 dos post-its, aprovada em 25/11).
   Ponta dobrada (desenhada: o canto de baixo à direita é cortado e a aba aparece por cima), amassado e mancha de café
   (imagens geradas por scripts/gerar-texturas.py; a mancha foi refeita pelo comentário do Elias: anel fino e escuro
   na beira, miolo claro, segundo anel parcial e respingos, como nas manchas de café de verdade).
   A tela (partes.jsx) e o PDF (desenho.js) usam as mesmas medidas daqui. */

export const TEXTURAS = [
  { id: '', nome: 'Liso' },
  { id: 'dobrado', nome: 'Ponta dobrada' },
  { id: 'amassado', nome: 'Amassado' },
  { id: 'cafe', nome: 'Mancha de café' },
];
const IDS = new Set(TEXTURAS.map((t) => t.id).filter(Boolean));
export const texturaValida = (id) => (IDS.has(id) ? id : undefined);
export const texturaDo = (it) => (it && it.tipo === 'postit' ? texturaValida(it.tex) : undefined);
/** Endereço da imagem (relativo à página do app); a ponta dobrada não usa imagem. */
export const urlTextura = (id) => (id === 'amassado' || id === 'cafe' ? `assets/texturas/${id}.png` : '');

/** Tamanho da aba da ponta dobrada. */
export const tamanhoDobra = (it) => Math.round(Math.max(12, Math.min(28, it.w * 0.17, it.h * 0.22)));
/** Tamanho e posição da mancha: no canto de cima à direita, passando um pouco da borda (o que passa fica cortado). */
export function lugarMancha(it) {
  const s = Math.round(Math.min(it.w, it.h) * 0.95);
  return { s, x: it.w - s * 0.8, y: -s * 0.24 };
}

/** O que a tela acrescenta ao estilo do post-it. */
export function estiloTextura(it, cor) {
  const t = texturaDo(it);
  if (!t) return null;
  if (t === 'dobrado') { const a = tamanhoDobra(it); return { background: `linear-gradient(315deg, transparent ${(a * Math.SQRT1_2).toFixed(2)}px, ${cor} 0)` }; }
  if (t === 'amassado') return { backgroundImage: `url(${urlTextura(t)})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' };
  const m = lugarMancha(it);
  return { backgroundImage: `url(${urlTextura(t)})`, backgroundSize: `${m.s}px ${m.s}px`, backgroundPosition: `${m.x.toFixed(1)}px ${m.y.toFixed(1)}px`, backgroundRepeat: 'no-repeat' };
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
/** Fundo do post-it com a ponta dobrada (o canto cortado, com sombra), no lugar do retângulo. */
export function caminhoDobrado(ctx, it) {
  const a = tamanhoDobra(it);
  ctx.beginPath();
  ctx.moveTo(it.x, it.y); ctx.lineTo(it.x + it.w, it.y); ctx.lineTo(it.x + it.w, it.y + it.h - a);
  ctx.lineTo(it.x + it.w - a, it.y + it.h); ctx.lineTo(it.x, it.y + it.h); ctx.closePath();
}
/** A aba dobrada, por cima do papel (o mesmo degradê da tela). */
export function desenharAba(ctx, it) {
  const a = tamanhoDobra(it), x1 = it.x + it.w, y1 = it.y + it.h;
  ctx.save();
  ctx.shadowColor = 'rgba(16,24,40,.22)'; ctx.shadowBlur = 4; ctx.shadowOffsetX = -1; ctx.shadowOffsetY = -1;
  const g = ctx.createLinearGradient(x1 - a / 2, y1 - a / 2, x1 - a, y1 - a);
  g.addColorStop(0, 'rgba(0,0,0,.16)'); g.addColorStop(1, 'rgba(0,0,0,.05)');
  ctx.beginPath(); ctx.moveTo(x1, y1 - a); ctx.lineTo(x1 - a, y1); ctx.lineTo(x1 - a, y1 - a); ctx.closePath();
  ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1;
  ctx.shadowColor = 'transparent'; ctx.fillStyle = g; ctx.fill();
  ctx.restore();
}
/** Amassado e mancha: a imagem por cima do fundo e por baixo do texto, cortada nas bordas do post-it. */
export function desenharImagemTextura(ctx, it, img) {
  const t = texturaDo(it);
  if (!img || (t !== 'amassado' && t !== 'cafe')) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(it.x, it.y, it.w, it.h); ctx.clip();
  if (t === 'amassado') ctx.drawImage(img, it.x, it.y, it.w, it.h);
  else { const m = lugarMancha(it); ctx.drawImage(img, it.x + m.x, it.y + m.y, m.s, m.s); }
  ctx.restore();
}
