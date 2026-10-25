/* EFCdocs — geometria do quadro: pontos de ligação, caminho das setas, seleção e limites.
   Usada pela tela (SVG) e pelo desenho de PNG/PDF (canvas), para os dois saírem iguais. */

export const centro = (it) => ({ x: it.x + it.w / 2, y: it.y + it.h / 2 });

export function ancora(it, lado) {
  switch (lado) {
    case 't': return { x: it.x + it.w / 2, y: it.y };
    case 'b': return { x: it.x + it.w / 2, y: it.y + it.h };
    case 'l': return { x: it.x, y: it.y + it.h / 2 };
    default: return { x: it.x + it.w, y: it.y + it.h / 2 };
  }
}

export const LADOS = ['t', 'r', 'b', 'l'];
const horizontal = (lado) => lado === 'l' || lado === 'r';

export function ladoMaisPerto(it, p) {
  let melhor = 'r', dist = Infinity;
  for (const lado of LADOS) {
    const a = ancora(it, lado);
    const d = (a.x - p.x) ** 2 + (a.y - p.y) ** 2;
    if (d < dist) { dist = d; melhor = lado; }
  }
  return melhor;
}

/** Lados automáticos: olha para onde o outro item está (levando em conta o tamanho). */
export function escolherLados(a, b) {
  const ca = centro(a), cb = centro(b);
  const dx = cb.x - ca.x, dy = cb.y - ca.y;
  const folgaX = Math.abs(dx) - (a.w + b.w) / 2;
  const folgaY = Math.abs(dy) - (a.h + b.h) / 2;
  if (folgaX > folgaY) return dx >= 0 ? ['r', 'l'] : ['l', 'r'];
  return dy >= 0 ? ['b', 't'] : ['t', 'b'];
}

const SAIDA = 18;
const empurra = (p, lado, d = SAIDA) => ({
  x: p.x + (lado === 'r' ? d : lado === 'l' ? -d : 0),
  y: p.y + (lado === 'b' ? d : lado === 't' ? -d : 0),
});

/** Pontos da seta (reta: 2 pontos; cotovelo: linhas retas em ângulo de 90°). */
export function pontosSeta(de, para, seta = {}) {
  const auto = escolherLados(de, para);
  const ladoA = (seta.de && seta.de.lado) || auto[0];
  const ladoB = (seta.para && seta.para.lado) || auto[1];
  const p1 = ancora(de, ladoA), p2 = ancora(para, ladoB);
  if (seta.estilo === 'reta') return { pontos: [p1, p2], ladoA, ladoB };
  const s1 = empurra(p1, ladoA), s2 = empurra(p2, ladoB);
  const meio = [];
  if (horizontal(ladoA) && horizontal(ladoB)) {
    const mx = (s1.x + s2.x) / 2;
    if ((ladoA === 'r' && s2.x >= s1.x) || (ladoA === 'l' && s2.x <= s1.x)) meio.push({ x: mx, y: s1.y }, { x: mx, y: s2.y });
    else { const my = (s1.y + s2.y) / 2; meio.push({ x: s1.x, y: my }, { x: s2.x, y: my }); }
  } else if (!horizontal(ladoA) && !horizontal(ladoB)) {
    const my = (s1.y + s2.y) / 2;
    if ((ladoA === 'b' && s2.y >= s1.y) || (ladoA === 't' && s2.y <= s1.y)) meio.push({ x: s1.x, y: my }, { x: s2.x, y: my });
    else { const mx = (s1.x + s2.x) / 2; meio.push({ x: mx, y: s1.y }, { x: mx, y: s2.y }); }
  } else if (horizontal(ladoA)) {
    meio.push({ x: s2.x, y: s1.y });
  } else {
    meio.push({ x: s1.x, y: s2.y });
  }
  return { pontos: limpar([p1, s1, ...meio, s2, p2]), ladoA, ladoB };
}

/* tira pontos repetidos e os do meio de uma mesma reta */
function limpar(pts) {
  const r = [];
  for (const p of pts) {
    const q = { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
    const u = r[r.length - 1];
    if (u && u.x === q.x && u.y === q.y) continue;
    r.push(q);
  }
  for (let i = r.length - 2; i > 0; i--) {
    const a = r[i - 1], b = r[i], c = r[i + 1];
    if ((a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)) r.splice(i, 1);
  }
  return r;
}

export const caminhoSVG = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + p.x + ' ' + p.y).join(' ');

/** Ponto no meio do comprimento da seta (onde vai o rótulo). */
export function meioDoCaminho(pts) {
  let total = 0;
  const seg = [];
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    seg.push(d);
    total += d;
  }
  let falta = total / 2;
  for (let i = 1; i < pts.length; i++) {
    if (falta <= seg[i - 1]) {
      const t = seg[i - 1] ? falta / seg[i - 1] : 0;
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t };
    }
    falta -= seg[i - 1];
  }
  return pts[0];
}

export const dentro = (it, p) => p.x >= it.x && p.x <= it.x + it.w && p.y >= it.y && p.y <= it.y + it.h;

/** Item de cima (maior z) no ponto; raias só se nada mais estiver ali. */
export function itemNoPonto(itens, p, ignorar) {
  let achou = null;
  for (const it of itens) {
    if (it.id === ignorar || !dentro(it, p)) continue;
    if (!achou) { achou = it; continue; }
    const raiaA = achou.tipo === 'raia', raiaB = it.tipo === 'raia';
    if (raiaA && !raiaB) achou = it;
    else if (raiaA === raiaB && it.z > achou.z) achou = it;
  }
  return achou;
}

export function normalizarRet(a, b) {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

/** Itens que tocam o retângulo de seleção (raias só se estiverem inteiras dentro). */
export function itensNoRet(itens, r) {
  return itens.filter((it) => {
    if (it.tipo === 'raia') return it.x >= r.x && it.y >= r.y && it.x + it.w <= r.x + r.w && it.y + it.h <= r.y + r.h;
    return it.x < r.x + r.w && it.x + it.w > r.x && it.y < r.y + r.h && it.y + it.h > r.y;
  }).map((it) => it.id);
}

/** Limites de tudo no quadro (para "Ajustar à tela", PNG e PDF). */
export function limites(itens, setasPontos = []) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const it of itens) {
    x1 = Math.min(x1, it.x); y1 = Math.min(y1, it.y);
    x2 = Math.max(x2, it.x + it.w); y2 = Math.max(y2, it.y + it.h);
  }
  for (const pts of setasPontos) for (const p of pts) {
    x1 = Math.min(x1, p.x); y1 = Math.min(y1, p.y);
    x2 = Math.max(x2, p.x); y2 = Math.max(y2, p.y);
  }
  if (!Number.isFinite(x1)) return null;
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/** Zoom e posição para caber o retângulo r na área (largura x altura). */
export function enquadrar(r, largura, altura, margem = 40, zMin = 0.2, zMax = 1.5) {
  if (!r) return { x: largura / 2, y: altura / 2, z: 1 };
  const z = Math.max(zMin, Math.min(zMax, Math.min((largura - margem * 2) / Math.max(r.w, 1), (altura - margem * 2) / Math.max(r.h, 1))));
  return { z, x: (largura - r.w * z) / 2 - r.x * z, y: (altura - r.h * z) / 2 - r.y * z };
}

/** Pontos da forma (para desenhar losango, paralelogramo). */
export function contornoForma(it) {
  const { x, y, w, h } = it;
  if (it.tipo === 'decisao') return [{ x: x + w / 2, y }, { x: x + w, y: y + h / 2 }, { x: x + w / 2, y: y + h }, { x, y: y + h / 2 }];
  if (it.tipo === 'dados') { const d = Math.min(18, w * 0.15); return [{ x: x + d, y }, { x: x + w, y }, { x: x + w - d, y: y + h }, { x, y: y + h }]; }
  return null;
}
