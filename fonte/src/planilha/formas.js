/* EFCdocs v0.6.5 — formas sobre a planilha (as "Formas" do Excel: painéis de fundo, setas, botões com link, caixas de texto).
   Regras puras + desenho em SVG (o mesmo SVG serve para a grade, a prévia de impressão e o PDF).

   Um objeto 'forma' é UMA âncora do Excel. Pode ter várias partes (um grupo do Excel):
     { id, tipo:'forma', l, c, dx, dy, w, h, w0, h0, nome, partes:[parte], ed?, xo?, xoNs?, xoSig? }
     w0, h0 = tamanho em que as partes foram medidas (ao mudar o tamanho, as partes acompanham).
     xo = XML original (volta igual ao Excel se nada mudou; só a posição é refeita).
   parte = { g, adj?, cust?, x, y, w, h, rot?, fh?, fv?, preench?, linha?, efeito?, texto?, link?, src?, nome? }
     g: desenho ('rect', 'roundRect', 'ellipse', 'rightArrow', 'line', 'img' para figura, 'cust' para desenho livre...)
     preench: { t:'nenhum' } | { t:'solido', cor, alfa? } | { t:'degrade', paradas:[{p,cor,alfa?}], ang, forma? }
     linha: { t:'nenhum' } | { t:'solido', cor, alfa?, larg (pt), tr?, ini?, fim? }  (ini/fim: ponta 'triangle', 'stealth', 'arrow', 'oval', 'diamond')
     efeito: { sombra?: { cor, alfa, blur, dist, dir }, brilho?: { cor, alfa, raio } } (pt e graus)
     texto: { pars:[{ al, runs:[{ t, tam?, cor?, neg?, it?, sub?, tach?, fonte? }] , tam? }], anc, ins:[l,t,r,b] px, wrap, vert?, cor?, tam?, clip?, ligado?: { aba?, abaNome?, ref } }
     link: { aba, ref? } (outra aba) | { abaNome, ref? } (aba que não veio) | { url } */

export const FM = { W: 160, H: 64, W_MIN: 2, H_MIN: 2, MAX_PARTES: 120 };
export const COR_FORMA = '#2f6f8f';
const COR_OK = /^#[0-9a-f]{6}$/i;
const r2 = (v) => Math.round(v * 100) / 100;
const ehNum = (v) => typeof v === 'number' && Number.isFinite(v);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
export const PT_PX = 96 / 72;
export const FONTE_PADRAO = "Calibri, Carlito, 'Segoe UI', Arial, sans-serif";

/* ============================================================ desenhos prontos ============================================================ */
/** Nomes em português do que dá para inserir (e o que a janela oferece para trocar). */
export const DESENHOS = [
  ['rect', 'Retângulo'], ['roundRect', 'Retângulo arredondado'], ['round2DiagRect', 'Cantos em diagonal'], ['ellipse', 'Elipse'],
  ['triangle', 'Triângulo'], ['diamond', 'Losango'], ['parallelogram', 'Paralelogramo'], ['hexagon', 'Hexágono'],
  ['homePlate', 'Etiqueta'], ['chevron', 'Divisa'], ['rightArrow', 'Seta para a direita'], ['leftArrow', 'Seta para a esquerda'],
  ['upArrow', 'Seta para cima'], ['downArrow', 'Seta para baixo'], ['leftRightArrow', 'Seta dupla'], ['star5', 'Estrela'],
  ['flowChartDocument', 'Documento'], ['flowChartTerminator', 'Início/fim'], ['wedgeRoundRectCallout', 'Balão'], ['line', 'Linha'],
  ['arrowLine', 'Seta (linha)'], ['textBox', 'Caixa de texto'],
];
export const NOME_DESENHO = Object.fromEntries(DESENHOS);

const P = (pts) => 'M' + pts.map(([x, y]) => `${r2(x)},${r2(y)}`).join(' L') + ' Z';
/** Retângulo com cada canto redondo ('r') ou cortado ('s'): cantos = [tl, tr, br, bl] (raio em px). */
function cantos(w, h, raios, tipos = ['r', 'r', 'r', 'r']) {
  const m = Math.min(w, h) / 2;
  const [a, b, c, d] = raios.map((r) => Math.max(0, Math.min(m, r || 0)));
  const arco = (r, x, y, t) => (r ? (t === 's' ? ` L${r2(x)},${r2(y)}` : ` A${r2(r)},${r2(r)} 0 0 1 ${r2(x)},${r2(y)}`) : '');
  return `M${r2(a)},0 L${r2(w - b)},0` + arco(b, w, b, tipos[1]) + ` L${r2(w)},${r2(h - c)}` + arco(c, w - c, h, tipos[2]) +
    ` L${r2(d)},${r2(h)}` + arco(d, 0, h - d, tipos[3]) + ` L0,${r2(a)}` + arco(a, a, 0, tipos[0]) + ' Z';
}
const elipse = (cx, cy, rx, ry) => `M${r2(cx - rx)},${r2(cy)} A${r2(rx)},${r2(ry)} 0 1 0 ${r2(cx + rx)},${r2(cy)} A${r2(rx)},${r2(ry)} 0 1 0 ${r2(cx - rx)},${r2(cy)} Z`;
function poligono(n, w, h, gira = -90) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = ((gira + (360 / n) * i) * Math.PI) / 180; pts.push([w / 2 + (w / 2) * Math.cos(a), h / 2 + (h / 2) * Math.sin(a)]); }
  return P(pts);
}
function estrela(n, w, h, dentro = 0.38) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = ((-90 + (180 / n) * i) * Math.PI) / 180, k = i % 2 ? dentro : 1;
    pts.push([w / 2 + (w / 2) * k * Math.cos(a), h / 2 + (h / 2) * k * Math.sin(a)]);
  }
  return P(pts);
}
/** Ponto na elipse no ângulo (graus, horário a partir do eixo x, como o Office). */
const naElipse = (cx, cy, rx, ry, g) => { const a = (g * Math.PI) / 180; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; };
function arcoAberto(w, h, ini, fim) {
  let sw = fim - ini; while (sw <= 0) sw += 360;
  const [x1, y1] = naElipse(w / 2, h / 2, w / 2, h / 2, ini), [x2, y2] = naElipse(w / 2, h / 2, w / 2, h / 2, ini + sw);
  return `M${r2(x1)},${r2(y1)} A${r2(w / 2)},${r2(h / 2)} 0 ${sw > 180 ? 1 : 0} 1 ${r2(x2)},${r2(y2)}`;
}
function faixaDeArco(w, h, ini, fim, esp) {
  let sw = fim - ini; while (sw <= 0) sw += 360;
  const rx = w / 2, ry = h / 2, ix = Math.max(0, rx - esp), iy = Math.max(0, ry - esp);
  const [a1, b1] = naElipse(rx, ry, rx, ry, ini), [a2, b2] = naElipse(rx, ry, rx, ry, ini + sw);
  const [c1, d1] = naElipse(rx, ry, ix, iy, ini + sw), [c2, d2] = naElipse(rx, ry, ix, iy, ini);
  const g = sw > 180 ? 1 : 0;
  return `M${r2(a1)},${r2(b1)} A${r2(rx)},${r2(ry)} 0 ${g} 1 ${r2(a2)},${r2(b2)} L${r2(c1)},${r2(d1)} A${r2(ix)},${r2(iy)} 0 ${g} 0 ${r2(c2)},${r2(d2)} Z`;
}
/** Balão: corpo + ponta até (tx, ty) (px dentro da caixa da forma). A ponta sai do meio do lado mais perto. */
function pontaDoBalao(w, h, tx, ty) {
  const dx = tx - w / 2, dy = ty - h / 2;
  if (Math.abs(dy) * w >= Math.abs(dx) * h) {
    const y = dy > 0 ? h : 0, x0 = w * (dx > 0 ? 0.58 : 0.25), x1 = w * (dx > 0 ? 0.75 : 0.42);
    return P([[x0, y], [tx, ty], [x1, y]]);
  }
  const x = dx > 0 ? w : 0, y0 = h * (dy > 0 ? 0.58 : 0.25), y1 = h * (dy > 0 ? 0.75 : 0.42);
  return P([[x, y0], [tx, ty], [x, y1]]);
}
const DOC = (w, h, k = 1) => `M0,0 L${r2(w)},0 L${r2(w)},${r2((h * 17322) / 21600)} C${r2(w / 2)},${r2((h * 17322) / 21600)} ${r2(w / 2)},${r2((h * 23922 * k) / 21600)} 0,${r2((h * 20172) / 21600)} Z`;

/** Os desenhos que o EFCdocs conhece (o resto vira retângulo e a importação avisa). */
export const CONHECIDOS = new Set(['rect', 'textBox', 'roundRect', 'round1Rect', 'round2SameRect', 'round2DiagRect', 'snip1Rect', 'snip2SameRect', 'snip2DiagRect', 'snipRoundRect',
  'ellipse', 'triangle', 'rtTriangle', 'diamond', 'parallelogram', 'trapezoid', 'homePlate', 'chevron', 'pentagon', 'hexagon', 'heptagon', 'octagon', 'decagon', 'dodecagon',
  'plus', 'mathPlus', 'star4', 'star5', 'star6', 'star7', 'star8', 'star10', 'star12', 'star16', 'star24', 'star32', 'rightArrow', 'leftArrow', 'upArrow', 'downArrow', 'leftRightArrow',
  'upDownArrow', 'notchedRightArrow', 'line', 'arrowLine', 'straightConnector1', 'bentConnector2', 'bentConnector3', 'bentConnector4', 'bentConnector5', 'curvedConnector2', 'curvedConnector3',
  'curvedConnector4', 'curvedConnector5', 'flowChartProcess', 'flowChartAlternateProcess', 'flowChartDecision', 'flowChartInputOutput', 'flowChartPredefinedProcess', 'flowChartInternalStorage',
  'flowChartDocument', 'flowChartMultidocument', 'flowChartTerminator', 'flowChartPreparation', 'flowChartManualInput', 'flowChartManualOperation', 'flowChartConnector',
  'flowChartOffpageConnector', 'flowChartPunchedCard', 'flowChartMerge', 'flowChartExtract', 'flowChartDelay', 'flowChartMagneticDisk', 'flowChartSort', 'flowChartCollate', 'flowChartOr',
  'flowChartSummingJunction', 'flowChartPunchedTape', 'flowChartOnlineStorage', 'flowChartDisplay', 'flowChartMagneticDrum', 'can', 'donut', 'frame', 'wedgeRectCallout', 'wedgeRoundRectCallout',
  'wedgeEllipseCallout', 'cloud', 'cloudCallout', 'heart', 'arc', 'blockArc', 'pie', 'chord', 'plaque', 'bevel', 'cube', 'teardrop', 'leftBracket', 'rightBracket', 'leftBrace', 'rightBrace',
  'mathMinus', 'mathMultiply', 'smileyFace', 'noSmoking', 'foldedCorner', 'halfFrame', 'corner', 'diagStripe', 'lightningBolt', 'sun', 'moon', 'ribbon2', 'ribbon', 'wave', 'doubleWave', 'flowChartData']);
const ABERTOS = new Set(['line', 'arrowLine', 'straightConnector1', 'bentConnector2', 'bentConnector3', 'bentConnector4', 'bentConnector5', 'curvedConnector2', 'curvedConnector3', 'curvedConnector4', 'curvedConnector5', 'arc', 'leftBracket', 'rightBracket', 'leftBrace', 'rightBrace']);
export const ehLinha = (g) => ABERTOS.has(g);

/**
 * Caminho do desenho pronto no tamanho w×h (px). adj = ajustes do Excel ({ adj, adj1, adj2... } em 1/100000).
 * Devolve { d, extra?:[d só com contorno], aberto?, txt:{x,y,w,h} (onde vai o texto) }.
 */
export function caminhoDoDesenho(g, w, h, adj = {}) {
  w = Math.max(0, w); h = Math.max(0, h);
  const ss = Math.min(w, h), A = (k, p) => (ehNum(adj[k]) ? adj[k] : p) / 100000;
  const caixa = { x: 0, y: 0, w, h };
  const vc = h / 2, hc = w / 2;
  switch (g) {
    case 'roundRect': return { d: cantos(w, h, Array(4).fill(ss * A('adj', 16667))), txt: caixa };
    case 'flowChartAlternateProcess': return { d: cantos(w, h, Array(4).fill(ss / 6)), txt: caixa };
    case 'round1Rect': return { d: cantos(w, h, [0, ss * A('adj', 16667), 0, 0]), txt: caixa };
    case 'round2SameRect': { const a = ss * A('adj1', 16667), b = ss * A('adj2', 0); return { d: cantos(w, h, [a, a, b, b]), txt: caixa }; }
    case 'round2DiagRect': { const a = ss * A('adj1', 16667), b = ss * A('adj2', 0); return { d: cantos(w, h, [a, b, a, b]), txt: caixa }; }
    case 'snip1Rect': return { d: cantos(w, h, [0, ss * A('adj', 16667), 0, 0], ['s', 's', 's', 's']), txt: caixa };
    case 'snip2SameRect': { const a = ss * A('adj1', 16667), b = ss * A('adj2', 0); return { d: cantos(w, h, [a, a, b, b], ['s', 's', 's', 's']), txt: caixa }; }
    case 'snip2DiagRect': { const a = ss * A('adj1', 0), b = ss * A('adj2', 16667); return { d: cantos(w, h, [a, b, a, b], ['s', 's', 's', 's']), txt: caixa }; }
    case 'snipRoundRect': return { d: cantos(w, h, [ss * A('adj1', 16667), ss * A('adj2', 16667), 0, 0], ['r', 's', 'r', 'r']), txt: caixa };
    case 'flowChartPunchedCard': return { d: cantos(w, h, [Math.min(w, h) / 5, 0, 0, 0], ['s', 's', 's', 's']), txt: caixa };
    case 'plaque': return { d: cantos(w, h, Array(4).fill(ss * A('adj', 16667)), ['s', 's', 's', 's']), txt: caixa };
    case 'ellipse': case 'flowChartConnector': case 'smileyFace': case 'noSmoking': case 'sun': case 'flowChartOr': case 'flowChartSummingJunction': {
      const extra = g === 'flowChartOr' ? [`M${r2(hc)},0 L${r2(hc)},${r2(h)} M0,${r2(vc)} L${r2(w)},${r2(vc)}`] : g === 'flowChartSummingJunction' ? [`M${r2(w * 0.146)},${r2(h * 0.146)} L${r2(w * 0.854)},${r2(h * 0.854)} M${r2(w * 0.854)},${r2(h * 0.146)} L${r2(w * 0.146)},${r2(h * 0.854)}`] : undefined;
      return { d: elipse(hc, vc, w / 2, h / 2), extra, txt: { x: w * 0.146, y: h * 0.146, w: w * 0.708, h: h * 0.708 } };
    }
    case 'cloud': case 'cloudCallout': {
      /* nuvem simples: elipse com ondas */
      const pts = [], n = 10;
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; pts.push([hc + (w / 2) * 0.86 * Math.cos(a), vc + (h / 2) * 0.86 * Math.sin(a)]); }
      let d = `M${r2(pts[0][0])},${r2(pts[0][1])}`;
      for (let i = 0; i < n; i++) { const b = pts[(i + 1) % n]; d += ` A${r2(w * 0.17)},${r2(h * 0.17)} 0 0 1 ${r2(b[0])},${r2(b[1])}`; }
      return { d: d + ' Z', txt: { x: w * 0.18, y: h * 0.18, w: w * 0.64, h: h * 0.64 } };
    }
    case 'triangle': { const x = w * A('adj', 50000); return { d: P([[x, 0], [w, h], [0, h]]), txt: { x: w / 4, y: h / 2, w: w / 2, h: h / 2 } }; }
    case 'flowChartExtract': return { d: P([[hc, 0], [w, h], [0, h]]), txt: { x: w / 4, y: h / 2, w: w / 2, h: h / 2 } };
    case 'flowChartMerge': return { d: P([[0, 0], [w, 0], [hc, h]]), txt: { x: w / 4, y: 0, w: w / 2, h: h / 2 } };
    case 'rtTriangle': return { d: P([[0, 0], [w, h], [0, h]]), txt: { x: w / 12, y: (h * 7) / 12, w: w / 2, h: (h * 5) / 12 } };
    case 'diamond': case 'flowChartDecision': return { d: P([[hc, 0], [w, vc], [hc, h], [0, vc]]), txt: { x: w / 4, y: h / 4, w: w / 2, h: h / 2 } };
    case 'flowChartSort': return { d: P([[hc, 0], [w, vc], [hc, h], [0, vc]]), extra: [`M0,${r2(vc)} L${r2(w)},${r2(vc)}`], txt: { x: w / 4, y: h / 4, w: w / 2, h: h / 2 } };
    case 'flowChartCollate': return { d: `M0,0 L${r2(w)},0 L0,${r2(h)} L${r2(w)},${r2(h)} Z`, txt: { x: w / 4, y: h / 4, w: w / 2, h: h / 2 } };
    case 'parallelogram': case 'flowChartInputOutput': case 'flowChartData': {
      const x = g === 'parallelogram' ? ss * A('adj', 25000) : w / 5;
      return { d: P([[x, 0], [w, 0], [w - x, h], [0, h]]), txt: { x: x / 2, y: 0, w: w - x, h } };
    }
    case 'trapezoid': { const x = ss * A('adj', 25000); return { d: P([[0, h], [x, 0], [w - x, 0], [w, h]]), txt: { x: x / 2, y: 0, w: w - x, h } }; }
    case 'flowChartManualOperation': return { d: P([[0, 0], [w, 0], [w * 0.8, h], [w * 0.2, h]]), txt: { x: w * 0.2, y: 0, w: w * 0.6, h } };
    case 'flowChartManualInput': return { d: P([[0, h / 5], [w, 0], [w, h], [0, h]]), txt: { x: 0, y: h / 5, w, h: (h * 4) / 5 } };
    case 'homePlate': { const x = w - ss * A('adj', 50000); return { d: P([[0, 0], [x, 0], [w, vc], [x, h], [0, h]]), txt: { x: 0, y: 0, w: (x + w) / 2, h } }; }
    case 'chevron': { const x = ss * A('adj', 50000); return { d: P([[0, 0], [w - x, 0], [w, vc], [w - x, h], [0, h], [x, vc]]), txt: { x, y: 0, w: Math.max(0, w - 2 * x), h } }; }
    case 'flowChartOffpageConnector': return { d: P([[0, 0], [w, 0], [w, h * 0.8], [hc, h], [0, h * 0.8]]), txt: { x: 0, y: 0, w, h: h * 0.8 } };
    case 'pentagon': return { d: P([[hc, 0], [w, h * 0.38], [w * 0.81, h], [w * 0.19, h], [0, h * 0.38]]), txt: { x: w * 0.19, y: h * 0.38, w: w * 0.62, h: h * 0.62 } };
    case 'hexagon': case 'flowChartPreparation': { const x = g === 'hexagon' ? ss * A('adj', 25000) : w / 5; return { d: P([[x, 0], [w - x, 0], [w, vc], [w - x, h], [x, h], [0, vc]]), txt: { x: x / 2, y: h / 6, w: w - x, h: (h * 2) / 3 } }; }
    case 'octagon': { const x = ss * A('adj', 29289); return { d: P([[x, 0], [w - x, 0], [w, x], [w, h - x], [w - x, h], [x, h], [0, h - x], [0, x]]), txt: { x: x / 2, y: x / 2, w: w - x, h: h - x } }; }
    case 'heptagon': return { d: poligono(7, w, h), txt: { x: w / 6, y: h / 6, w: (w * 2) / 3, h: (h * 2) / 3 } };
    case 'decagon': return { d: poligono(10, w, h, 0), txt: { x: w / 8, y: h / 8, w: (w * 3) / 4, h: (h * 3) / 4 } };
    case 'dodecagon': return { d: poligono(12, w, h, 0), txt: { x: w / 8, y: h / 8, w: (w * 3) / 4, h: (h * 3) / 4 } };
    case 'plus': case 'mathPlus': { const x = g === 'plus' ? ss * A('adj', 25000) : ss * 0.235; return { d: P([[x, 0], [w - x, 0], [w - x, x], [w, x], [w, h - x], [w - x, h - x], [w - x, h], [x, h], [x, h - x], [0, h - x], [0, x], [x, x]]), txt: { x, y: x, w: w - 2 * x, h: h - 2 * x } }; }
    case 'mathMinus': return { d: P([[w * 0.07, h * 0.38], [w * 0.93, h * 0.38], [w * 0.93, h * 0.62], [w * 0.07, h * 0.62]]), txt: caixa };
    case 'mathMultiply': { const k = 0.15; return { d: P([[w * k, 0], [hc, vc - h * k], [w - w * k, 0], [w, h * k], [hc + w * k, vc], [w, h - h * k], [w - w * k, h], [hc, vc + h * k], [w * k, h], [0, h - h * k], [hc - w * k, vc], [0, h * k]]), txt: caixa }; }
    case 'star4': return { d: estrela(4, w, h, 0.25), txt: { x: w * 0.32, y: h * 0.32, w: w * 0.36, h: h * 0.36 } };
    case 'star5': return { d: estrela(5, w, h, 0.38), txt: { x: w * 0.3, y: h * 0.35, w: w * 0.4, h: h * 0.35 } };
    case 'star6': case 'star7': case 'star8': case 'star10': case 'star12': case 'star16': case 'star24': case 'star32': {
      const n = +g.slice(4); return { d: estrela(n, w, h, n >= 16 ? 0.8 : n >= 10 ? 0.72 : 0.58), txt: { x: w * 0.25, y: h * 0.25, w: w / 2, h: h / 2 } };
    }
    case 'rightArrow': case 'leftArrow': case 'notchedRightArrow': {
      const dy1 = (h * A('adj1', 50000)) / 2, dx2 = ss * A('adj2', 50000), x1 = w - dx2;
      let pts = [[0, vc - dy1], [x1, vc - dy1], [x1, 0], [w, vc], [x1, h], [x1, vc + dy1], [0, vc + dy1]];
      if (g === 'notchedRightArrow') pts.push([(dy1 * dx2) / Math.max(1, vc), vc]);
      if (g === 'leftArrow') pts = pts.map(([x, y]) => [w - x, y]);
      return { d: P(pts), txt: { x: g === 'leftArrow' ? dx2 / 2 : 0, y: vc - dy1, w: w - dx2 / 2, h: dy1 * 2 } };
    }
    case 'upArrow': case 'downArrow': {
      const dx1 = (w * A('adj1', 50000)) / 2, dy2 = ss * A('adj2', 50000), y1 = h - dy2;
      let pts = [[hc - dx1, 0], [hc - dx1, y1], [0, y1], [hc, h], [w, y1], [hc + dx1, y1], [hc + dx1, 0]];
      if (g === 'upArrow') pts = pts.map(([x, y]) => [x, h - y]);
      return { d: P(pts), txt: { x: hc - dx1, y: g === 'upArrow' ? dy2 / 2 : 0, w: dx1 * 2, h: h - dy2 / 2 } };
    }
    case 'leftRightArrow': {
      const dy1 = (h * A('adj1', 50000)) / 2, dx2 = ss * A('adj2', 50000);
      return { d: P([[0, vc], [dx2, 0], [dx2, vc - dy1], [w - dx2, vc - dy1], [w - dx2, 0], [w, vc], [w - dx2, h], [w - dx2, vc + dy1], [dx2, vc + dy1], [dx2, h]]), txt: { x: dx2 / 2, y: vc - dy1, w: w - dx2, h: dy1 * 2 } };
    }
    case 'upDownArrow': {
      const dx1 = (w * A('adj1', 50000)) / 2, dy2 = ss * A('adj2', 50000);
      return { d: P([[hc, 0], [w, dy2], [hc + dx1, dy2], [hc + dx1, h - dy2], [w, h - dy2], [hc, h], [0, h - dy2], [hc - dx1, h - dy2], [hc - dx1, dy2], [0, dy2]]), txt: { x: hc - dx1, y: dy2 / 2, w: dx1 * 2, h: h - dy2 } };
    }
    case 'line': case 'arrowLine': case 'straightConnector1': return { d: `M0,0 L${r2(w)},${r2(h)}`, aberto: true, txt: caixa };
    case 'bentConnector2': return { d: `M0,0 L${r2(w)},0 L${r2(w)},${r2(h)}`, aberto: true, txt: caixa };
    case 'bentConnector3': case 'bentConnector4': case 'bentConnector5': { const x = w * A('adj1', 50000); return { d: `M0,0 L${r2(x)},0 L${r2(x)},${r2(h)} L${r2(w)},${r2(h)}`, aberto: true, txt: caixa }; }
    case 'curvedConnector2': return { d: `M0,0 C${r2(w / 2)},0 ${r2(w)},${r2(h / 2)} ${r2(w)},${r2(h)}`, aberto: true, txt: caixa };
    case 'curvedConnector3': case 'curvedConnector4': case 'curvedConnector5': { const x = w * A('adj1', 50000); return { d: `M0,0 C${r2(x)},0 ${r2(x)},${r2(h)} ${r2(w)},${r2(h)}`, aberto: true, txt: caixa }; }
    case 'flowChartPredefinedProcess': return { d: P([[0, 0], [w, 0], [w, h], [0, h]]), extra: [`M${r2(w / 8)},0 L${r2(w / 8)},${r2(h)} M${r2((w * 7) / 8)},0 L${r2((w * 7) / 8)},${r2(h)}`], txt: { x: w / 8, y: 0, w: (w * 3) / 4, h } };
    case 'flowChartInternalStorage': return { d: P([[0, 0], [w, 0], [w, h], [0, h]]), extra: [`M${r2(w / 8)},0 L${r2(w / 8)},${r2(h)} M0,${r2(h / 8)} L${r2(w)},${r2(h / 8)}`], txt: { x: w / 8, y: h / 8, w: (w * 7) / 8, h: (h * 7) / 8 } };
    case 'flowChartDocument': return { d: DOC(w, h), txt: { x: 0, y: 0, w, h: (h * 17322) / 21600 } };
    case 'flowChartMultidocument': {
      const o = Math.min(w, h) * 0.08;
      return { d: DOC(w - 2 * o, h - 2 * o).replace(/(-?[\d.]+),(-?[\d.]+)/g, (_, x, y) => `${r2(+x)},${r2(+y + 2 * o)}`), extra: [`M${r2(o)},${r2(2 * o)} L${r2(o)},${r2(o)} L${r2(w - o)},${r2(o)} L${r2(w - o)},${r2(h * 0.7)} M${r2(2 * o)},${r2(o)} L${r2(2 * o)},0 L${r2(w)},0 L${r2(w)},${r2(h * 0.62)}`], txt: { x: 0, y: 2 * o, w: w - 2 * o, h: (h - 2 * o) * 0.8 } };
    }
    case 'flowChartPunchedTape': case 'wave': case 'doubleWave': case 'ribbon': case 'ribbon2': {
      const a = h * 0.1;
      return { d: `M0,${r2(a)} C${r2(w / 4)},${r2(-a)} ${r2(w / 4)},${r2(3 * a)} ${r2(w / 2)},${r2(a)} C${r2((3 * w) / 4)},${r2(-a)} ${r2((3 * w) / 4)},${r2(3 * a)} ${r2(w)},${r2(a)} L${r2(w)},${r2(h - a)} C${r2((3 * w) / 4)},${r2(h + a)} ${r2((3 * w) / 4)},${r2(h - 3 * a)} ${r2(w / 2)},${r2(h - a)} C${r2(w / 4)},${r2(h + a)} ${r2(w / 4)},${r2(h - 3 * a)} 0,${r2(h - a)} Z`, txt: { x: 0, y: 2 * a, w, h: h - 4 * a } };
    }
    case 'flowChartTerminator': { const rx = Math.min(w / 2, (w * 3475) / 21600), ry = h / 2; return { d: `M${r2(rx)},0 L${r2(w - rx)},0 A${r2(rx)},${r2(ry)} 0 0 1 ${r2(w - rx)},${r2(h)} L${r2(rx)},${r2(h)} A${r2(rx)},${r2(ry)} 0 0 1 ${r2(rx)},0 Z`, txt: { x: rx / 3, y: 0, w: w - (2 * rx) / 3, h } }; }
    case 'flowChartDelay': return { d: `M0,0 L${r2(hc)},0 A${r2(hc)},${r2(vc)} 0 0 1 ${r2(hc)},${r2(h)} L0,${r2(h)} Z`, txt: { x: 0, y: h * 0.15, w: w * 0.85, h: h * 0.7 } };
    case 'flowChartDisplay': return { d: `M0,${r2(vc)} L${r2(w / 6)},0 L${r2((w * 5) / 6)},0 A${r2(w / 6)},${r2(vc)} 0 0 1 ${r2((w * 5) / 6)},${r2(h)} L${r2(w / 6)},${r2(h)} Z`, txt: { x: w / 6, y: 0, w: (w * 2) / 3, h } };
    case 'flowChartOnlineStorage': return { d: `M${r2(w / 6)},0 L${r2(w)},0 A${r2(w / 6)},${r2(vc)} 0 0 0 ${r2(w)},${r2(h)} L${r2(w / 6)},${r2(h)} A${r2(w / 6)},${r2(vc)} 0 0 1 ${r2(w / 6)},0 Z`, txt: { x: w / 6, y: 0, w: (w * 2) / 3, h } };
    case 'can': case 'flowChartMagneticDisk': case 'flowChartMagneticDrum': {
      const ry = g === 'can' ? (ss * A('adj', 25000)) / 2 : h / 6;
      return { d: `M0,${r2(ry)} A${r2(hc)},${r2(ry)} 0 0 1 ${r2(w)},${r2(ry)} L${r2(w)},${r2(h - ry)} A${r2(hc)},${r2(ry)} 0 0 1 0,${r2(h - ry)} Z`, extra: [`M0,${r2(ry)} A${r2(hc)},${r2(ry)} 0 0 0 ${r2(w)},${r2(ry)}`], txt: { x: 0, y: ry * 2, w, h: h - ry * 3 } };
    }
    case 'cube': case 'bevel': {
      const k = ss * A('adj', g === 'cube' ? 25000 : 12500);
      if (g === 'bevel') return { d: P([[0, 0], [w, 0], [w, h], [0, h]]), extra: [P([[k, k], [w - k, k], [w - k, h - k], [k, h - k]]), `M0,0 L${r2(k)},${r2(k)} M${r2(w)},0 L${r2(w - k)},${r2(k)} M${r2(w)},${r2(h)} L${r2(w - k)},${r2(h - k)} M0,${r2(h)} L${r2(k)},${r2(h - k)}`], txt: { x: k, y: k, w: w - 2 * k, h: h - 2 * k } };
      return { d: P([[0, k], [k, 0], [w, 0], [w, h - k], [w - k, h], [0, h]]), extra: [`M0,${r2(k)} L${r2(w - k)},${r2(k)} L${r2(w)},0 M${r2(w - k)},${r2(k)} L${r2(w - k)},${r2(h)}`], txt: { x: 0, y: k, w: w - k, h: h - k } };
    }
    case 'donut': { const t = ss * A('adj', 25000); return { d: elipse(hc, vc, w / 2, h / 2) + ' ' + elipse(hc, vc, Math.max(0, w / 2 - t), Math.max(0, h / 2 - t)), parImpar: true, txt: { x: w * 0.146, y: h * 0.146, w: w * 0.708, h: h * 0.708 } }; }
    case 'frame': { const t = ss * A('adj1', 12500); return { d: P([[0, 0], [w, 0], [w, h], [0, h]]) + ' ' + P([[t, t], [w - t, t], [w - t, h - t], [t, h - t]]), parImpar: true, txt: { x: t, y: t, w: w - 2 * t, h: h - 2 * t } }; }
    case 'halfFrame': { const t = ss / 3; return { d: P([[0, 0], [w, 0], [w - t, t], [t, t], [t, h - t], [0, h]]), txt: caixa }; }
    case 'corner': { const t = ss / 2; return { d: P([[0, 0], [t, 0], [t, h - t], [w, h - t], [w, h], [0, h]]), txt: caixa }; }
    case 'diagStripe': { const t = ss / 2; return { d: P([[0, t], [t, 0], [w, 0], [0, h]]), txt: caixa }; }
    case 'foldedCorner': { const t = ss * 0.1667; return { d: P([[0, 0], [w, 0], [w, h - t], [w - t, h], [0, h]]), extra: [`M${r2(w - t)},${r2(h)} L${r2(w - t * 0.8)},${r2(h - t * 0.8)} L${r2(w)},${r2(h - t)}`], txt: caixa }; }
    case 'wedgeRectCallout': case 'wedgeRoundRectCallout': case 'wedgeEllipseCallout': {
      const tx = hc + w * A('adj1', -20833), ty = vc + h * A('adj2', 62500);
      const corpo = g === 'wedgeRectCallout' ? P([[0, 0], [w, 0], [w, h], [0, h]]) : g === 'wedgeRoundRectCallout' ? cantos(w, h, Array(4).fill(ss * 0.1667)) : elipse(hc, vc, w / 2, h / 2);
      return { d: corpo, ponta: pontaDoBalao(w, h, tx, ty), txt: caixa };
    }
    case 'heart': return { d: `M${r2(hc)},${r2(h / 4)} C${r2(hc)},0 0,0 0,${r2(h / 4)} C0,${r2(h / 2)} ${r2(hc)},${r2(h * 0.75)} ${r2(hc)},${r2(h)} C${r2(hc)},${r2(h * 0.75)} ${r2(w)},${r2(h / 2)} ${r2(w)},${r2(h / 4)} C${r2(w)},0 ${r2(hc)},0 ${r2(hc)},${r2(h / 4)} Z`, txt: { x: w / 4, y: h / 4, w: w / 2, h: h / 2 } };
    case 'teardrop': return { d: `M${r2(hc)},0 L${r2(w)},0 L${r2(w)},${r2(vc)} A${r2(hc)},${r2(vc)} 0 1 1 ${r2(hc)},0 Z`, txt: { x: w * 0.146, y: h * 0.146, w: w * 0.708, h: h * 0.708 } };
    case 'arc': return { d: arcoAberto(w, h, (ehNum(adj.adj1) ? adj.adj1 : 16200000) / 60000, (ehNum(adj.adj2) ? adj.adj2 : 0) / 60000), aberto: true, txt: caixa };
    case 'blockArc': return { d: faixaDeArco(w, h, (ehNum(adj.adj1) ? adj.adj1 : 10800000) / 60000, (ehNum(adj.adj2) ? adj.adj2 : 0) / 60000, ss * A('adj3', 25000)), txt: caixa };
    case 'pie': case 'chord': {
      const ini = (ehNum(adj.adj1) ? adj.adj1 : 0) / 60000, fim = (ehNum(adj.adj2) ? adj.adj2 : 16200000) / 60000;
      const arco = arcoAberto(w, h, ini, fim);
      return { d: g === 'pie' ? `${arco} L${r2(hc)},${r2(vc)} Z` : `${arco} Z`, txt: caixa };
    }
    case 'leftBracket': return { d: `M${r2(w)},0 A${r2(w)},${r2(Math.min(h / 2, w))} 0 0 0 0,${r2(Math.min(h / 2, w))} L0,${r2(h - Math.min(h / 2, w))} A${r2(w)},${r2(Math.min(h / 2, w))} 0 0 0 ${r2(w)},${r2(h)}`, aberto: true, txt: caixa };
    case 'rightBracket': return { d: `M0,0 A${r2(w)},${r2(Math.min(h / 2, w))} 0 0 1 ${r2(w)},${r2(Math.min(h / 2, w))} L${r2(w)},${r2(h - Math.min(h / 2, w))} A${r2(w)},${r2(Math.min(h / 2, w))} 0 0 1 0,${r2(h)}`, aberto: true, txt: caixa };
    case 'leftBrace': return { d: `M${r2(w)},0 C0,0 ${r2(w)},${r2(vc)} 0,${r2(vc)} C${r2(w)},${r2(vc)} 0,${r2(h)} ${r2(w)},${r2(h)}`, aberto: true, txt: caixa };
    case 'rightBrace': return { d: `M0,0 C${r2(w)},0 0,${r2(vc)} ${r2(w)},${r2(vc)} C0,${r2(vc)} ${r2(w)},${r2(h)} 0,${r2(h)}`, aberto: true, txt: caixa };
    case 'lightningBolt': return { d: P([[w * 0.39, 0], [w * 0.6, h * 0.32], [w * 0.5, h * 0.36], [w * 0.8, h * 0.62], [w * 0.7, h * 0.66], [w, h], [w * 0.45, h * 0.72], [w * 0.55, h * 0.68], [w * 0.2, h * 0.46], [w * 0.3, h * 0.42], [0, h * 0.18]]), txt: caixa };
    case 'moon': return { d: `M${r2(w)},0 A${r2(w)},${r2(vc)} 0 0 0 ${r2(w)},${r2(h)} A${r2(w / 2)},${r2(vc)} 0 0 1 ${r2(w)},0 Z`, txt: caixa };
    default: return { d: P([[0, 0], [w, 0], [w, h], [0, h]]), txt: caixa };
  }
}

/** Desenho livre do Excel (custGeom): caminhos com moveTo, lnTo, cubicBezTo, quadBezTo, arcTo e close, no tamanho w×h. */
export function caminhoLivre(cust, w, h) {
  let d = '';
  for (const p of cust || []) {
    const sx = p.w ? w / p.w : 1, sy = p.h ? h / p.h : 1;
    let cx = 0, cy = 0;
    const pt = (x, y) => `${r2(x * sx)},${r2(y * sy)}`;
    for (const k of p.cmds || []) {
      if (k.t === 'M') { d += ` M${pt(k.p[0], k.p[1])}`; [cx, cy] = k.p; }
      else if (k.t === 'L') { d += ` L${pt(k.p[0], k.p[1])}`; [cx, cy] = k.p; }
      else if (k.t === 'C') { d += ` C${pt(k.p[0], k.p[1])} ${pt(k.p[2], k.p[3])} ${pt(k.p[4], k.p[5])}`; cx = k.p[4]; cy = k.p[5]; }
      else if (k.t === 'Q') { d += ` Q${pt(k.p[0], k.p[1])} ${pt(k.p[2], k.p[3])}`; cx = k.p[2]; cy = k.p[3]; }
      else if (k.t === 'A') {
        const [wr, hr, st, sw] = k.p; // st e sw em graus
        const a0 = (st * Math.PI) / 180, a1 = ((st + sw) * Math.PI) / 180;
        const ox = cx - wr * Math.cos(a0), oy = cy - hr * Math.sin(a0);
        const ex = ox + wr * Math.cos(a1), ey = oy + hr * Math.sin(a1);
        d += ` A${r2(wr * sx)},${r2(hr * sy)} 0 ${Math.abs(sw) > 180 ? 1 : 0} ${sw > 0 ? 1 : 0} ${pt(ex, ey)}`;
        cx = ex; cy = ey;
      } else if (k.t === 'Z') d += ' Z';
    }
  }
  return d.trim() || `M0,0 L${r2(w)},0 L${r2(w)},${r2(h)} L0,${r2(h)} Z`;
}

/* ============================================================ texto ============================================================ */
let ctxMedir = null;
function medir(t, px, neg, it, fonte) {
  if (ctxMedir === null) {
    try {
      if (typeof OffscreenCanvas !== 'undefined') ctxMedir = new OffscreenCanvas(4, 4).getContext('2d');
      else if (typeof document !== 'undefined') ctxMedir = document.createElement('canvas').getContext('2d');
      else ctxMedir = false;
    } catch { ctxMedir = false; }
  }
  if (ctxMedir) {
    ctxMedir.font = `${it ? 'italic ' : ''}${neg ? 'bold ' : ''}${px}px ${fonte || FONTE_PADRAO}`;
    return ctxMedir.measureText(t).width;
  }
  return String(t).length * px * (neg ? 0.55 : 0.5);
}
const familia = (f) => (f && !/^\+/.test(f) ? `'${String(f).replace(/'/g, '')}', ${FONTE_PADRAO}` : FONTE_PADRAO);

/**
 * Quebra o texto nas linhas que cabem em largura (px). Devolve { linhas:[{ al, alt, base, pedacos:[{t,px,run}], larg }], alt }.
 * wrap=false: só quebra no Enter.
 */
export function arrumarTexto(texto, largura, valorLigado = null) {
  const out = [];
  const tamPadrao = texto.tam || 11;
  const pars = valorLigado != null
    ? [{ al: (texto.pars[0] && texto.pars[0].al) || 'l', runs: [{ ...((texto.pars[0] && texto.pars[0].runs[0]) || {}), t: String(valorLigado) }] }]
    : texto.pars || [];
  for (const p of pars) {
    const runs = (p.runs || []).filter((r) => r && r.t != null);
    const tamP = p.tam || (runs[0] && runs[0].tam) || tamPadrao;
    /* pedaços: palavras (com o espaço que vem depois), cada um com o estilo do pedaço do Excel */
    const pal = [];
    for (const r of runs) {
      const tam = (r.tam || tamPadrao) * PT_PX * (r.sub ? 0.66 : 1);
      for (const parte of String(r.t).split(/(\n)/)) {
        if (parte === '\n') { pal.push({ quebra: true }); continue; }
        for (const m of parte.match(/\S+\s*|\s+/g) || []) pal.push({ t: m, px: medir(m, tam, r.neg, r.it, familia(r.fonte)), run: r, tam });
      }
    }
    let linha = { pedacos: [], larg: 0, maior: tamP * PT_PX };
    const fechar = () => { out.push({ al: p.al || 'l', ...linha }); linha = { pedacos: [], larg: 0, maior: tamP * PT_PX }; };
    for (const x of pal) {
      if (x.quebra) { fechar(); continue; }
      const semEsp = medir(x.t.trimEnd(), x.tam, x.run.neg, x.run.it, familia(x.run.fonte));
      if (texto.wrap !== false && linha.pedacos.length && linha.larg + semEsp > largura + 0.5) {
        /* tira o espaço do fim da linha que fechou */
        fechar();
        if (!x.t.trim()) continue;
      }
      if (texto.wrap !== false && !linha.pedacos.length && semEsp > largura + 0.5 && x.t.trim().length > 1) {
        /* palavra maior que a linha: corta por letra (como o Excel) */
        let resto = x.t;
        while (resto.length) {
          let k = resto.length;
          while (k > 1 && medir(resto.slice(0, k).trimEnd(), x.tam, x.run.neg, x.run.it, familia(x.run.fonte)) > largura) k--;
          const pedaco = resto.slice(0, k);
          linha.pedacos.push({ t: pedaco, run: x.run, tam: x.tam }); linha.larg += medir(pedaco, x.tam, x.run.neg, x.run.it, familia(x.run.fonte)); linha.maior = Math.max(linha.maior, x.tam);
          resto = resto.slice(k);
          if (resto.length) fechar();
        }
        continue;
      }
      linha.pedacos.push({ t: x.t, run: x.run, tam: x.tam });
      linha.larg += x.px;
      linha.maior = Math.max(linha.maior, x.tam);
    }
    fechar();
  }
  let alt = 0;
  for (const l of out) { l.alt = l.maior * 1.2; l.base = alt + l.maior * 0.95; alt += l.alt; }
  return { linhas: out, alt };
}

/* ============================================================ SVG ============================================================ */
const TRACOS = { dash: [4, 3], sysDash: [3, 1], dot: [1, 2], sysDot: [1, 1], lgDash: [8, 3], dashDot: [4, 3, 1, 3], lgDashDot: [8, 3, 1, 3], lgDashDotDot: [8, 3, 1, 3, 1, 3], sysDashDot: [3, 1, 1, 1], sysDashDotDot: [3, 1, 1, 1, 1, 1] };
const cor = (c, p = '#000000') => (typeof c === 'string' && COR_OK.test(c) ? c.toLowerCase() : p);

function pontaDaLinha(id, tipo, corL, larg) {
  const k = Math.max(2.5, 3 / Math.max(0.6, larg / 1.5));
  if (tipo === 'oval') return `<marker id="${id}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="${k}" markerHeight="${k}" orient="auto-start-reverse"><circle cx="5" cy="5" r="4.5" fill="${corL}"/></marker>`;
  if (tipo === 'diamond') return `<marker id="${id}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="${k}" markerHeight="${k}" orient="auto-start-reverse"><path d="M5,0 L10,5 L5,10 L0,5 Z" fill="${corL}"/></marker>`;
  if (tipo === 'arrow') return `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="${k}" markerHeight="${k}" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10" fill="none" stroke="${corL}" stroke-width="2"/></marker>`;
  if (tipo === 'stealth') return `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="${k}" markerHeight="${k}" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 L3,5 Z" fill="${corL}"/></marker>`;
  return `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="${k}" markerHeight="${k}" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 Z" fill="${corL}"/></marker>`;
}

function preenchimento(pr, id, defs) {
  if (!pr || pr.t === 'nenhum') return 'fill="none"';
  if (pr.t === 'degrade' && Array.isArray(pr.paradas) && pr.paradas.length) {
    const st = pr.paradas.map((s) => `<stop offset="${r2(Math.max(0, Math.min(1, s.p || 0)))}" stop-color="${cor(s.cor, '#888888')}"${s.alfa != null && s.alfa < 1 ? ` stop-opacity="${r2(s.alfa)}"` : ''}/>`).join('');
    if (pr.forma === 'circulo') defs.push(`<radialGradient id="${id}" cx="50%" cy="50%" r="70%">${st}</radialGradient>`);
    else {
      const a = ((pr.ang || 0) * Math.PI) / 180, cx = Math.cos(a) / 2, cy = Math.sin(a) / 2;
      defs.push(`<linearGradient id="${id}" x1="${r2(0.5 - cx)}" y1="${r2(0.5 - cy)}" x2="${r2(0.5 + cx)}" y2="${r2(0.5 + cy)}">${st}</linearGradient>`);
    }
    return `fill="url(#${id})"`;
  }
  return `fill="${cor(pr.cor, '#888888')}"${pr.alfa != null && pr.alfa < 1 ? ` fill-opacity="${r2(pr.alfa)}"` : ''}`;
}

function filtroDoEfeito(ef, id, defs) {
  if (!ef || (!ef.sombra && !ef.brilho)) return '';
  let f = '';
  const merge = [];
  if (ef.brilho) {
    const r = Math.max(0.5, (ef.brilho.raio || 4) * PT_PX);
    f += `<feMorphology in="SourceAlpha" operator="dilate" radius="${r2(r / 3)}" result="bd"/><feGaussianBlur in="bd" stdDeviation="${r2(r / 2)}" result="bb"/><feFlood flood-color="${cor(ef.brilho.cor, '#ffffff')}" flood-opacity="${r2(ef.brilho.alfa ?? 0.6)}"/><feComposite in2="bb" operator="in" result="brilho"/>`;
    merge.push('brilho');
  }
  if (ef.sombra) {
    const s = ef.sombra, dist = (s.dist || 0) * PT_PX, dir = ((s.dir || 0) * Math.PI) / 180;
    f += `<feDropShadow dx="${r2(dist * Math.cos(dir))}" dy="${r2(dist * Math.sin(dir))}" stdDeviation="${r2(Math.max(0.01, ((s.blur || 0) * PT_PX) / 2))}" flood-color="${cor(s.cor, '#000000')}" flood-opacity="${r2(s.alfa ?? 0.4)}" result="sombra"/>`;
    if (!merge.length) { defs.push(`<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">${f}</filter>`); return ` filter="url(#${id})"`; }
    merge.push('sombra');
  }
  defs.push(`<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">${f}<feMerge>${merge.map((m) => `<feMergeNode in="${m}"/>`).join('')}<feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  return ` filter="url(#${id})"`;
}

/**
 * SVG de uma parte (px já na escala da forma). lerLigado(ligado) → texto da célula ligada.
 * Devolve o pedaço de SVG (um <g data-parte="k">).
 */
function svgDaParte(p, k, uid, defs, sx, sy, lerLigado) {
  const x = p.x * sx, y = p.y * sy, w = Math.max(0, p.w * sx), h = Math.max(0, p.h * sy);
  const g = p.g || 'rect';
  const ehImg = g === 'img';
  const geo = ehImg || g === 'cust' ? { d: g === 'cust' ? caminhoLivre(p.cust, w, h) : `M0,0 L${r2(w)},0 L${r2(w)},${r2(h)} L0,${r2(h)} Z`, txt: { x: 0, y: 0, w, h }, aberto: g === 'cust' && p.aberto } : caminhoDoDesenho(g, w, h, p.adj || {});
  const ln = p.linha && p.linha.t !== 'nenhum' ? p.linha : null;
  const larg = ln ? Math.max(0.25, (ln.larg ?? 0.75) * PT_PX) : 0;
  const corL = ln ? cor(ln.cor, '#000000') : 'none';
  const aberto = geo.aberto || ehLinha(g);
  const trans = [];
  if (p.rot) trans.push(`rotate(${r2(p.rot)} ${r2(w / 2)} ${r2(h / 2)})`);
  const flip = p.fh || p.fv ? ` transform="translate(${p.fh ? r2(w) : 0} ${p.fv ? r2(h) : 0}) scale(${p.fh ? -1 : 1} ${p.fv ? -1 : 1})"` : '';
  let s = `<g data-parte="${k}" transform="translate(${r2(x)} ${r2(y)})${trans.length ? ' ' + trans.join(' ') : ''}">`;
  const filtro = filtroDoEfeito(p.efeito, `${uid}-e${k}`, defs);
  let corpo = '';
  if (ehImg && p.src) {
    /* figura recortada num desenho (elipse, cantos redondos...) */
    let cp = '';
    if (p.corte) { defs.push(`<clipPath id="${uid}-r${k}"><path d="${caminhoDoDesenho(p.corte, w, h, p.adj || {}).d}"/></clipPath>`); cp = ` clip-path="url(#${uid}-r${k})"`; }
    corpo += `<image href="${esc(p.src)}" x="0" y="0" width="${r2(w)}" height="${r2(h)}" preserveAspectRatio="none"${cp}/>`;
    if (ln) corpo += `<rect x="0" y="0" width="${r2(w)}" height="${r2(h)}" fill="none" stroke="${corL}" stroke-width="${r2(larg)}"/>`;
  } else {
    const fill = aberto ? 'fill="none"' : preenchimento(p.preench, `${uid}-p${k}`, defs);
    let traco = '';
    if (ln) {
      traco = ` stroke="${corL}" stroke-width="${r2(larg)}"${ln.alfa != null && ln.alfa < 1 ? ` stroke-opacity="${r2(ln.alfa)}"` : ''} stroke-linejoin="round"`;
      if (ln.tr && TRACOS[ln.tr]) traco += ` stroke-dasharray="${TRACOS[ln.tr].map((v) => r2(v * larg)).join(' ')}"`;
      if (ln.ini && ln.ini !== 'none') { defs.push(pontaDaLinha(`${uid}-i${k}`, ln.ini, corL, larg)); traco += ` marker-start="url(#${uid}-i${k})"`; }
      if (ln.fim && ln.fim !== 'none') { defs.push(pontaDaLinha(`${uid}-f${k}`, ln.fim, corL, larg)); traco += ` marker-end="url(#${uid}-f${k})"`; }
    }
    if (geo.ponta) corpo += `<path d="${geo.ponta}" ${fill}${traco}/>`;
    corpo += `<path d="${geo.d}" ${fill}${traco}${geo.parImpar ? ' fill-rule="evenodd"' : ''}/>`;
    if (geo.ponta && ln) { /* o corpo cobre a base da ponta: refaz só o contorno da ponta por fora */ }
    if (geo.extra && ln) for (const e of geo.extra) corpo += `<path d="${e}" fill="none"${traco.replace(/ marker-(start|end)="[^"]*"/g, '')}/>`;
    /* linha fina: área invisível mais larga para dar para clicar */
    if (aberto) corpo += `<path d="${geo.d}" fill="none" stroke="#000" stroke-opacity="0" stroke-width="${r2(Math.max(10, larg + 8))}" class="fm-toque"/>`;
  }
  s += `<g${flip}${filtro}>${corpo}</g>`;
  /* texto: não espelha (como no Excel), mas gira junto */
  const t = p.texto;
  if (t && (t.ligado || (t.pars && t.pars.some((q) => q.runs && q.runs.some((r) => String(r.t || '').length))))) {
    const valor = t.ligado && lerLigado ? lerLigado(t.ligado) : null;
    const ins = Array.isArray(t.ins) ? t.ins : [9.6, 4.8, 9.6, 4.8];
    const tx = geo.txt || { x: 0, y: 0, w, h };
    const vert = t.vert === 'vert' || t.vert === 'vert270' || t.vert === 'eaVert';
    const W = Math.max(1, (vert ? tx.h : tx.w) - ins[0] - ins[2]), H = Math.max(1, (vert ? tx.w : tx.h) - ins[1] - ins[3]);
    const arr = arrumarTexto(t, W, valor);
    const y0 = t.anc === 'b' ? H - arr.alt : t.anc === 'ctr' ? (H - arr.alt) / 2 : 0;
    const corPadrao = cor(t.cor, '#000000');
    let lin = '';
    for (const l of arr.linhas) {
      const xx = l.al === 'ctr' ? W / 2 : l.al === 'r' ? W : 0;
      const anc = l.al === 'ctr' ? 'middle' : l.al === 'r' ? 'end' : 'start';
      /* o espaço do fim da linha não conta para alinhar */
      const ped0 = l.pedacos.map((q, i) => (i === l.pedacos.length - 1 ? { ...q, t: q.t.replace(/\s+$/, '') } : q)).filter((q) => q.t.length);
      /* palavras seguidas com o mesmo estilo vão num pedaço só */
      const ped = [];
      for (const q of ped0) { const u = ped[ped.length - 1]; if (u && u.run === q.run && u.tam === q.tam) u.t += q.t; else ped.push({ ...q }); }
      if (!ped.length) continue;
      lin += `<text x="${r2(xx)}" y="${r2(y0 + l.base)}" text-anchor="${anc}" xml:space="preserve">` + ped.map((q) => {
        const r = q.run;
        return `<tspan font-size="${r2(q.tam)}" font-family="${esc(familia(r.fonte))}" fill="${cor(r.cor, corPadrao)}"${r.neg ? ' font-weight="bold"' : ''}${r.it ? ' font-style="italic"' : ''}${r.sub ? ' text-decoration="underline"' : r.tach ? ' text-decoration="line-through"' : ''}>${esc(q.t)}</tspan>`;
      }).join('') + '</text>';
    }
    const ox = tx.x + ins[0], oy = tx.y + ins[1];
    let tr = `translate(${r2(ox)} ${r2(oy)})`;
    if (vert) tr = t.vert === 'vert270' ? `translate(${r2(tx.x + ins[1])} ${r2(tx.y + tx.h - ins[0])}) rotate(-90)` : `translate(${r2(tx.x + tx.w - ins[1])} ${r2(tx.y + ins[0])}) rotate(90)`;
    if (t.rotT) tr += ` rotate(${r2(t.rotT)} ${r2(W / 2)} ${r2(H / 2)})`;
    let clip = '';
    if (t.clip) { defs.push(`<clipPath id="${uid}-c${k}"><rect x="0" y="0" width="${r2(W)}" height="${r2(H)}"/></clipPath>`); clip = ` clip-path="url(#${uid}-c${k})"`; }
    /* área do texto também recebe o clique (caixa de texto sem fundo) */
    s += `<g transform="${tr}"${clip}><rect x="0" y="0" width="${r2(W)}" height="${r2(H)}" fill="#000" fill-opacity="0" class="fm-toque"/>${lin}</g>`;
  }
  return s + '</g>';
}

/** SVG da forma inteira no tamanho w×h (px a 100%). opc: { lerLigado, uid } */
export function svgDaForma(o, w = o.w, h = o.h, opc = {}) {
  const w0 = o.w0 || o.w || 1, h0 = o.h0 || o.h || 1;
  const sx = w0 > 0.5 ? w / w0 : 1, sy = h0 > 0.5 ? h / h0 : 1;
  const uid = 'fm' + String(opc.uid || o.id || 'x').replace(/[^\w-]/g, '');
  const defs = [];
  const partes = (o.partes || []).map((p, k) => svgDaParte(p, k, uid, defs, sx, sy, opc.lerLigado)).join('');
  const W = Math.max(1, w), H = Math.max(1, h);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${r2(W)} ${r2(H)}" width="${r2(W)}" height="${r2(H)}" overflow="visible">${defs.length ? `<defs>${defs.join('')}</defs>` : ''}${partes}</svg>`;
}

/* ============================================================ regras ============================================================ */
/** Parte em que (x, y) (px dentro da forma a 100%) cai, de cima para baixo; só as partes com link quando soLink. */
export function parteNoPonto(o, x, y, soLink = false) {
  const w0 = o.w0 || o.w || 1, h0 = o.h0 || o.h || 1, sx = w0 > 0.5 ? o.w / w0 : 1, sy = h0 > 0.5 ? o.h / h0 : 1;
  const ps = o.partes || [];
  for (let k = ps.length - 1; k >= 0; k--) {
    const p = ps[k];
    if (soLink && !p.link) continue;
    const px = p.x * sx, py = p.y * sy, pw = Math.max(6, p.w * sx), ph = Math.max(6, p.h * sy);
    if (x >= px - 3 && x <= px + pw + 3 && y >= py - 3 && y <= py + ph + 3) return k;
  }
  return -1;
}
export const temLink = (o) => !!(o && o.tipo === 'forma' && (o.partes || []).some((p) => p.link));

/** Texto simples de uma parte (para a janela e o leitor de tela). */
export const textoDaParte = (p) => (p && p.texto && p.texto.pars ? p.texto.pars.map((q) => (q.runs || []).map((r) => r.t || '').join('')).join('\n') : '');
export const textoDaForma = (o) => (o.partes || []).map(textoDaParte).filter(Boolean).join(' · ');

/** Troca o texto de uma parte guardando o estilo do primeiro pedaço. */
export function comTexto(p, texto) {
  const t = p.texto || { pars: [], anc: 'ctr', ins: [9.6, 4.8, 9.6, 4.8], wrap: true };
  const r0 = (t.pars[0] && t.pars[0].runs && t.pars[0].runs[0]) || {};
  const al = (t.pars[0] && t.pars[0].al) || 'ctr';
  const { t: _t, ...estilo } = r0; void _t;
  const pars = String(texto).split('\n').map((ln) => ({ al, runs: [{ ...estilo, t: ln }] }));
  return { ...p, texto: { ...t, pars: texto === '' ? [] : pars, ligado: undefined } };
}

const limitar = (v, a, b, p) => (ehNum(v) ? Math.max(a, Math.min(b, v)) : p);
function limparCor(c) { return typeof c === 'string' && COR_OK.test(c) ? c.toLowerCase() : undefined; }
function limparPreench(pr) {
  if (!pr || typeof pr !== 'object') return undefined;
  if (pr.t === 'nenhum') return { t: 'nenhum' };
  if (pr.t === 'degrade' && Array.isArray(pr.paradas)) {
    const paradas = pr.paradas.slice(0, 10).map((s) => ({ p: limitar(s.p, 0, 1, 0), cor: limparCor(s.cor) || '#888888', ...(ehNum(s.alfa) && s.alfa < 1 ? { alfa: limitar(s.alfa, 0, 1, 1) } : {}) }));
    return paradas.length ? { t: 'degrade', paradas, ang: limitar(pr.ang, -360, 360, 90), ...(pr.forma === 'circulo' ? { forma: 'circulo' } : {}) } : undefined;
  }
  if (pr.t === 'solido') return { t: 'solido', cor: limparCor(pr.cor) || '#888888', ...(ehNum(pr.alfa) && pr.alfa < 1 ? { alfa: limitar(pr.alfa, 0, 1, 1) } : {}) };
  return undefined;
}
const PONTAS = new Set(['triangle', 'stealth', 'arrow', 'oval', 'diamond']);
function limparLinha(ln) {
  if (!ln || typeof ln !== 'object') return undefined;
  if (ln.t === 'nenhum') return { t: 'nenhum' };
  const o = { t: 'solido', cor: limparCor(ln.cor) || '#000000', larg: limitar(ln.larg, 0, 40, 0.75) };
  if (ehNum(ln.alfa) && ln.alfa < 1) o.alfa = limitar(ln.alfa, 0, 1, 1);
  if (ln.tr && TRACOS[ln.tr]) o.tr = ln.tr;
  if (PONTAS.has(ln.ini)) o.ini = ln.ini;
  if (PONTAS.has(ln.fim)) o.fim = ln.fim;
  return o;
}
function limparEfeito(ef) {
  if (!ef || typeof ef !== 'object') return undefined;
  const o = {};
  if (ef.sombra) o.sombra = { cor: limparCor(ef.sombra.cor) || '#000000', alfa: limitar(ef.sombra.alfa, 0, 1, 0.4), blur: limitar(ef.sombra.blur, 0, 100, 4), dist: limitar(ef.sombra.dist, 0, 100, 3), dir: limitar(ef.sombra.dir, -360, 360, 45) };
  if (ef.brilho) o.brilho = { cor: limparCor(ef.brilho.cor) || '#ffffff', alfa: limitar(ef.brilho.alfa, 0, 1, 0.6), raio: limitar(ef.brilho.raio, 0, 100, 5) };
  return o.sombra || o.brilho ? o : undefined;
}
function limparLink(lk) {
  if (!lk || typeof lk !== 'object') return undefined;
  const ref = typeof lk.ref === 'string' && /^\$?[A-Za-z]{1,3}\$?\d{1,7}(:\$?[A-Za-z]{1,3}\$?\d{1,7})?$/.test(lk.ref) ? lk.ref.replace(/\$/g, '').toUpperCase() : undefined;
  if (typeof lk.aba === 'string' && lk.aba) return { aba: lk.aba, ...(ref ? { ref } : {}) };
  if (typeof lk.abaNome === 'string' && lk.abaNome) return { abaNome: lk.abaNome.slice(0, 100), ...(ref ? { ref } : {}) };
  if (typeof lk.url === 'string' && /^(https?:|mailto:)/i.test(lk.url)) return { url: lk.url.slice(0, 2000) };
  return undefined;
}
function limparTexto(t) {
  if (!t || typeof t !== 'object' || !Array.isArray(t.pars)) return undefined;
  const pars = t.pars.slice(0, 200).map((q) => ({
    al: ['l', 'ctr', 'r', 'just'].includes(q.al) ? q.al : 'l',
    ...(ehNum(q.tam) ? { tam: limitar(q.tam, 1, 400, 11) } : {}),
    runs: (Array.isArray(q.runs) ? q.runs : []).slice(0, 200).map((r) => {
      const o = { t: String(r.t ?? '').slice(0, 5000) };
      if (ehNum(r.tam)) o.tam = limitar(r.tam, 1, 400, 11);
      const c = limparCor(r.cor); if (c) o.cor = c;
      if (r.neg) o.neg = true; if (r.it) o.it = true; if (r.sub) o.sub = true; if (r.tach) o.tach = true;
      if (typeof r.fonte === 'string' && r.fonte && r.fonte.length < 60) o.fonte = r.fonte;
      return o;
    }),
  }));
  const o = { pars, anc: ['t', 'ctr', 'b'].includes(t.anc) ? t.anc : 't', ins: Array.isArray(t.ins) && t.ins.length === 4 ? t.ins.map((v) => limitar(v, 0, 400, 0)) : [9.6, 4.8, 9.6, 4.8], wrap: t.wrap !== false };
  if (['vert', 'vert270', 'eaVert'].includes(t.vert)) o.vert = t.vert;
  const c = limparCor(t.cor); if (c) o.cor = c;
  if (ehNum(t.tam)) o.tam = limitar(t.tam, 1, 400, 11);
  if (ehNum(t.rotT) && t.rotT) o.rotT = limitar(t.rotT, -360, 360, 0);
  if (t.clip) o.clip = true;
  if (t.ligado && typeof t.ligado.ref === 'string' && /^[A-Za-z]{1,3}\d{1,7}$/.test(t.ligado.ref)) o.ligado = { ref: t.ligado.ref.toUpperCase(), ...(typeof t.ligado.aba === 'string' && t.ligado.aba ? { aba: t.ligado.aba } : {}), ...(typeof t.ligado.abaNome === 'string' && t.ligado.abaNome ? { abaNome: t.ligado.abaNome.slice(0, 100) } : {}) };
  return o;
}
function limparCust(cust) {
  if (!Array.isArray(cust)) return undefined;
  const out = [];
  for (const p of cust.slice(0, 40)) {
    const cmds = (Array.isArray(p.cmds) ? p.cmds : []).slice(0, 4000).filter((k) => k && /^[MLCQAZ]$/.test(k.t)).map((k) => (k.t === 'Z' ? { t: 'Z' } : { t: k.t, p: (Array.isArray(k.p) ? k.p : []).slice(0, 6).map((v) => (ehNum(v) ? v : 0)) }));
    out.push({ w: ehNum(p.w) ? p.w : 0, h: ehNum(p.h) ? p.h : 0, cmds });
  }
  return out.length ? out : undefined;
}
const SRC_OK = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;
export function limparParte(p) {
  if (!p || typeof p !== 'object') return null;
  const g = p.g === 'img' || p.g === 'cust' || CONHECIDOS.has(p.g) ? p.g : 'rect';
  if (g === 'img' && !(typeof p.src === 'string' && p.src.length <= 500000 && SRC_OK.test(p.src))) return null;
  const o = { g, x: limitar(p.x, -20000, 20000, 0), y: limitar(p.y, -20000, 20000, 0), w: limitar(p.w, 0, 20000, 0), h: limitar(p.h, 0, 20000, 0) };
  if (p.adj && typeof p.adj === 'object') { const a = {}; for (const [k, v] of Object.entries(p.adj)) if (/^adj\d?$/.test(k) && ehNum(v)) a[k] = v; if (Object.keys(a).length) o.adj = a; }
  if (g === 'cust') { o.cust = limparCust(p.cust); if (!o.cust) o.g = 'rect'; if (p.aberto) o.aberto = true; }
  if (ehNum(p.rot) && p.rot) o.rot = limitar(p.rot, -360, 360, 0);
  if (p.fh) o.fh = true; if (p.fv) o.fv = true;
  const pr = limparPreench(p.preench); if (pr) o.preench = pr;
  const ln = limparLinha(p.linha); if (ln) o.linha = ln;
  const ef = limparEfeito(p.efeito); if (ef) o.efeito = ef;
  const tx = limparTexto(p.texto); if (tx) o.texto = tx;
  const lk = limparLink(p.link); if (lk) o.link = lk;
  if (g === 'img') { o.src = p.src; if (CONHECIDOS.has(p.corte) && p.corte !== 'rect') o.corte = p.corte; }
  if (typeof p.nome === 'string' && p.nome) o.nome = p.nome.slice(0, 120);
  if (p.txBox) o.txBox = true;
  return o;
}

/** Forma nova (Inserir › Forma) presa a uma célula. */
export function novaForma(g, ancora, id, { texto = '' } = {}) {
  const linha = ehLinha(g);
  const w = linha ? 160 : g === 'textBox' ? 200 : ['rightArrow', 'leftArrow', 'leftRightArrow', 'homePlate', 'chevron'].includes(g) ? 160 : FM.W;
  const h = linha ? 0 : g === 'textBox' ? 48 : ['upArrow', 'downArrow', 'star5', 'ellipse', 'diamond', 'hexagon', 'triangle'].includes(g) ? 96 : FM.H;
  const p = { g, x: 0, y: 0, w, h };
  if (linha) p.linha = { t: 'solido', cor: '#1f2d36', larg: 1.5, ...(g === 'arrowLine' ? { fim: 'triangle' } : {}) };
  else if (g === 'textBox') { p.preench = { t: 'nenhum' }; p.linha = { t: 'nenhum' }; p.txBox = true; }
  else { p.preench = { t: 'solido', cor: COR_FORMA }; p.linha = { t: 'nenhum' }; }
  if (!linha) {
    p.texto = { pars: texto ? [{ al: g === 'textBox' ? 'l' : 'ctr', runs: [{ t: texto, tam: 11, ...(g === 'textBox' ? {} : { cor: '#ffffff', neg: true }) }] }] : [], anc: g === 'textBox' ? 't' : 'ctr', ins: [9.6, 4.8, 9.6, 4.8], wrap: true, ...(g === 'textBox' ? { cor: '#1f2d36' } : { cor: '#ffffff' }) };
  }
  return { id, tipo: 'forma', l: ancora.l, c: ancora.c, dx: ancora.dx ?? 6, dy: ancora.dy ?? 6, w, h, w0: w, h0: h, nome: NOME_DESENHO[g] || 'Forma', partes: [p] };
}

/** Limpa uma forma que veio de arquivo (ou de colar). */
export function limparForma(o, base) {
  const partes = (Array.isArray(o.partes) ? o.partes : []).slice(0, FM.MAX_PARTES).map(limparParte).filter(Boolean);
  if (!partes.length) return null;
  const f = { ...base, tipo: 'forma', w: limitar(o.w, 0, 20000, FM.W), h: limitar(o.h, 0, 20000, FM.H), w0: limitar(o.w0, 0, 20000, o.w || FM.W), h0: limitar(o.h0, 0, 20000, o.h || FM.H), nome: String(o.nome || '').slice(0, 120), partes };
  if (typeof o.xo === 'string' && o.xo.length < 400000) { f.xo = o.xo; if (typeof o.xoSig === 'string') f.xoSig = o.xoSig; if (o.xoNs && typeof o.xoNs === 'object') f.xoNs = o.xoNs; if (o.xoRels && typeof o.xoRels === 'object') f.xoRels = o.xoRels; }
  if (o.ed === 'oneCell' || o.ed === 'absolute' || o.ed === 'twoCell') f.ed = o.ed;
  if (o.trava) f.trava = true;
  return f;
}

/** Assinatura do que dá para mexer (para saber se o XML original ainda vale). */
export function assinaturaForma(o) {
  const s = JSON.stringify((o.partes || []).map((p) => ({ ...p, src: p.src ? p.src.length + ':' + p.src.slice(-40) : undefined })));
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36) + ':' + s.length;
}
