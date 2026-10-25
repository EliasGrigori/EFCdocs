/* EFCdocs — desenha o quadro num canvas (para PNG, PDF e impressão).
   Usa a mesma geometria da tela, então setas e formas saem no mesmo lugar. */

import { COR, TIPOS_ITEM, porZ, listaSetas } from './modelo.js';
import { pontosSeta, contornoForma, limites, meioDoCaminho } from './geometria.js';
import { resumoTarefa, hojeISO } from './tarefa.js';
import { derivar, MEDIDAS } from './legenda.js';

/* cores do nível GUT: [fundo, texto] */
export const COR_GUT = { alta: ['#fee4e2', '#b42318'], media: ['#fef0c7', '#b54708'], baixa: ['#d1fadf', '#067647'] };

export const FONTE = '"DejaVu Sans", Verdana, system-ui, sans-serif';
export const COR_TEXTO = '#1f2328';
export const COR_LINHA = '#3b4552';
export const COR_SETA = '#475467';

/** Limites do quadro inteiro, incluindo setas. */
export function limitesDoQuadro(c) {
  c = derivar(c);
  const itens = porZ(c);
  const pts = listaSetas(c).map((s) => {
    const a = c.itens[s.de.id], b = c.itens[s.para.id];
    return a && b ? pontosSeta(a, b, s).pontos : [];
  });
  return limites(itens, pts);
}

/** Quebra o texto em linhas que cabem na largura. */
export function quebrarTexto(ctx, texto, largura) {
  const linhas = [];
  for (const par of String(texto || '').split('\n')) {
    const palavras = par.split(/\s+/).filter(Boolean);
    if (!palavras.length) { linhas.push(''); continue; }
    let atual = '';
    /* palavra maior que a caixa: corta em pedaços; o último pedaço segue como linha atual */
    const partir = (p) => {
      let pedaco = '';
      for (const ch of p) {
        if (ctx.measureText(pedaco + ch).width > largura && pedaco) { linhas.push(pedaco); pedaco = ''; }
        pedaco += ch;
      }
      return pedaco;
    };
    for (const p of palavras) {
      const teste = atual ? atual + ' ' + p : p;
      if (ctx.measureText(teste).width <= largura) { atual = teste; continue; }
      if (atual) linhas.push(atual);
      atual = ctx.measureText(p).width > largura ? partir(p) : p;
    }
    linhas.push(atual);
  }
  return linhas;
}

function fonteDo(it, tamanho) {
  const f = it.fonte || {};
  return `${f.i ? 'italic ' : ''}${f.n || (it.tipo === 'texto' && !it.borda) ? '700 ' : ''}${tamanho}px ${FONTE}`;
}

export const tamanhoFonte = (it) => (it.tipo === 'texto' ? (it.borda ? 14 : 18) : it.tipo === 'raia' || it.tipo === 'pagina' ? 15 : 14);

function escreverTexto(ctx, it, caixa) {
  const tam = tamanhoFonte(it);
  ctx.font = fonteDo(it, tam);
  ctx.fillStyle = (it.fonte && it.fonte.cor) || COR_TEXTO;
  const alinh = it.alinh || (it.tipo === 'texto' ? 'e' : 'c');
  const linhas = quebrarTexto(ctx, it.texto, caixa.w);
  const alt = tam * 1.3;
  const cabem = Math.max(1, Math.floor(caixa.h / alt));
  const mostrar = linhas.slice(0, cabem);
  if (linhas.length > cabem && mostrar.length) mostrar[mostrar.length - 1] = mostrar[mostrar.length - 1].replace(/.{0,2}$/, '…');
  let y = caixa.y + (caixa.h - mostrar.length * alt) / 2 + tam * 0.98;
  ctx.textAlign = alinh === 'e' ? 'left' : alinh === 'd' ? 'right' : 'center';
  const x = alinh === 'e' ? caixa.x : alinh === 'd' ? caixa.x + caixa.w : caixa.x + caixa.w / 2;
  for (const l of mostrar) {
    ctx.fillText(l, x, y);
    if (it.fonte && it.fonte.s) {
      const w = ctx.measureText(l).width;
      const x0 = alinh === 'e' ? x : alinh === 'd' ? x - w : x - w / 2;
      ctx.fillRect(x0, y + 2, w, 1.2);
    }
    y += alt;
  }
}

function caminhoForma(ctx, it) {
  const pts = contornoForma(it);
  ctx.beginPath();
  if (pts) {
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
  } else if (it.tipo === 'inicio') {
    const r = Math.min(it.h / 2, it.w / 2);
    ctx.moveTo(it.x + r, it.y);
    ctx.lineTo(it.x + it.w - r, it.y);
    ctx.arc(it.x + it.w - r, it.y + it.h / 2, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(it.x + r, it.y + it.h);
    ctx.arc(it.x + r, it.y + it.h / 2, r, Math.PI / 2, Math.PI * 1.5);
    ctx.closePath();
  } else {
    ctx.rect(it.x, it.y, it.w, it.h);
  }
}

/** Corta o texto com "…" para caber na largura. */
function cortar(ctx, texto, largura) {
  let t = String(texto);
  if (ctx.measureText(t).width <= largura) return t;
  while (t.length > 1 && ctx.measureText(t + '…').width > largura) t = t.slice(0, -1);
  return t + '…';
}

/** Formas pequenas da legenda (mesmo desenho da tela). */
function miniForma(ctx, tipo, x, y) {
  const w = 34, h = 20;
  ctx.save();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = COR_LINHA;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  if (tipo === 'inicio') {
    const r = h / 2;
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x + r, y + h); ctx.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5); ctx.closePath();
  } else if (tipo === 'decisao') {
    ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h / 2); ctx.lineTo(x + w / 2, y + h); ctx.lineTo(x, y + h / 2); ctx.closePath();
  } else if (tipo === 'dados') {
    ctx.moveTo(x + 7, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 7, y + h); ctx.lineTo(x, y + h); ctx.closePath();
  } else if (tipo === 'postit') {
    ctx.rect(x + 7, y, 20, h); ctx.fillStyle = COR.amarelo;
  } else if (tipo === 'seta') {
    ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w - 2, y + h / 2);
  } else ctx.rect(x, y + 1, w, h - 2);
  if (tipo === 'seta') {
    ctx.stroke();
    ctx.fillStyle = COR_SETA;
    ctx.beginPath(); ctx.moveTo(x + w, y + h / 2); ctx.lineTo(x + w - 8, y + h / 2 - 4); ctx.lineTo(x + w - 8, y + h / 2 + 4); ctx.closePath(); ctx.fill();
  } else { ctx.fill(); ctx.stroke(); }
  ctx.restore();
}

function desenharLegenda(ctx, it) {
  ctx.save();
  ctx.shadowColor = 'rgba(16,24,40,.14)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(it.x, it.y, it.w, it.h);
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#d0d5dd'; ctx.lineWidth = 1;
  ctx.strokeRect(it.x + 0.5, it.y + 0.5, it.w - 1, it.h - 1);
  ctx.fillStyle = COR_TEXTO; ctx.textAlign = 'left'; ctx.font = `700 13px ${FONTE}`;
  ctx.fillText('Legenda', it.x + 12, it.y + 24);
  const linhas = it.linhas || [];
  if (!linhas.length) { ctx.font = `12px ${FONTE}`; ctx.fillStyle = '#667085'; ctx.fillText('Nada para explicar ainda.', it.x + 12, it.y + MEDIDAS.topo + 22); }
  linhas.forEach((l, i) => {
    const y = it.y + MEDIDAS.topo + i * MEDIDAS.linha;
    miniForma(ctx, l.tipo, it.x + 12, y + 6);
    ctx.fillStyle = COR_TEXTO; ctx.font = `700 12px ${FONTE}`;
    ctx.fillText(cortar(ctx, l.nome, it.w - 66), it.x + 56, y + 16);
    ctx.fillStyle = '#667085'; ctx.font = `10.5px ${FONTE}`;
    ctx.fillText(cortar(ctx, l.descr, it.w - 66), it.x + 56, y + 31);
  });
  ctx.restore();
}

function desenharPagina(ctx, it) {
  ctx.save();
  ctx.shadowColor = 'rgba(16,24,40,.18)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(it.x, it.y, it.w, it.h);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#e9edf1';
  ctx.fillRect(it.x, it.y, it.w, 34);
  ctx.strokeStyle = '#cfd4dc'; ctx.lineWidth = 1;
  ctx.strokeRect(it.x + 0.5, it.y + 0.5, it.w - 1, it.h - 1);
  ctx.beginPath(); ctx.moveTo(it.x, it.y + 34.5); ctx.lineTo(it.x + it.w, it.y + 34.5); ctx.stroke();
  escreverTexto(ctx, { ...it, alinh: 'c', fonte: { ...(it.fonte || {}), n: true } }, { x: it.x + 12, y: it.y + 2, w: it.w - 24, h: 30 });
  ctx.restore();
}

/** Rodapé do post-it de tarefa: responsável, prazo, situação e nota GUT. */
function desenharTarefa(ctx, it, r) {
  const x = it.x + 8, base = it.y + it.h;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.font = `600 11px ${FONTE}`;
  ctx.fillStyle = 'rgba(31,35,40,.80)';
  const gut = r.gut ? `GUT ${r.gut}` : '';
  ctx.font = `700 10px ${FONTE}`;
  const wg = gut ? ctx.measureText(gut).width + 12 : 0;
  ctx.font = `600 11px ${FONTE}`;
  ctx.fillText(cortar(ctx, (r.resp ? 'Resp.: ' + r.resp : 'Sem responsável'), it.w - 16 - wg - 4), x, base - 22);
  ctx.fillStyle = r.vencida ? '#b42318' : 'rgba(31,35,40,.80)';
  if (r.vencida) ctx.font = `700 11px ${FONTE}`;
  ctx.fillText(cortar(ctx, (r.prazo ? (r.vencida ? 'Vencido: ' + r.prazo : 'Prazo: ' + r.prazo + ' · ' + r.status) : 'Sem prazo · ' + r.status), it.w - 16), x, base - 8);
  if (gut) {
    const [fundo, texto] = COR_GUT[r.nivel];
    ctx.fillStyle = fundo;
    ctx.fillRect(it.x + it.w - 8 - wg, base - 34, wg, 16);
    ctx.fillStyle = texto; ctx.font = `700 10px ${FONTE}`; ctx.textAlign = 'center';
    ctx.fillText(gut, it.x + it.w - 8 - wg / 2, base - 22);
  }
  ctx.restore();
}

function desenharItem(ctx, it, opcoes) {
  const cor = COR[it.cor] || '#ffffff';
  ctx.save();
  if (it.tipo === 'pagina') { desenharPagina(ctx, it); ctx.restore(); return; }
  if (it.tipo === 'legenda') { desenharLegenda(ctx, it); ctx.restore(); return; }
  if (it.tipo === 'raia') {
    ctx.fillStyle = it.cor === 'branco' ? '#fbfbfc' : '#f1f3f6';
    ctx.strokeStyle = '#cfd4dc';
    ctx.lineWidth = 1;
    ctx.fillRect(it.x, it.y, it.w, it.h);
    ctx.strokeRect(it.x + 0.5, it.y + 0.5, it.w - 1, it.h - 1);
    ctx.fillStyle = '#e4e7ec';
    ctx.fillRect(it.x, it.y, 46, it.h);
    ctx.translate(it.x + 23, it.y + it.h / 2);
    ctx.rotate(-Math.PI / 2);
    escreverTexto(ctx, { ...it, alinh: 'c', fonte: { ...(it.fonte || {}), n: true } }, { x: -it.h / 2 + 8, y: -18, w: it.h - 16, h: 36 });
    ctx.restore();
    return;
  }
  if (it.tipo === 'imagem') {
    const img = opcoes.imagens && opcoes.imagens.get(it.id);
    if (img) ctx.drawImage(img, it.x, it.y, it.w, it.h);
    else { ctx.fillStyle = '#eef0f3'; ctx.fillRect(it.x, it.y, it.w, it.h); }
    ctx.strokeStyle = '#d0d5dd';
    ctx.strokeRect(it.x + 0.5, it.y + 0.5, it.w - 1, it.h - 1);
    ctx.restore();
    return;
  }
  if (it.tipo === 'postit') {
    ctx.shadowColor = 'rgba(16,24,40,.18)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = cor;
    ctx.fillRect(it.x, it.y, it.w, it.h);
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(0,0,0,.10)';
    ctx.strokeRect(it.x + 0.5, it.y + 0.5, it.w - 1, it.h - 1);
  } else if (it.tipo !== 'texto') {
    caminhoForma(ctx, it);
    ctx.fillStyle = cor;
    ctx.fill();
    ctx.strokeStyle = COR_LINHA;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  if (it.tipo === 'texto' && it.borda) {
    ctx.strokeStyle = COR_LINHA; ctx.lineWidth = 1.2;
    ctx.strokeRect(it.x + 0.5, it.y + 0.5, it.w - 1, it.h - 1);
  }
  const tarefa = it.tipo === 'postit' && opcoes.c ? resumoTarefa(opcoes.c, it, opcoes.hoje || hojeISO()) : null;
  const folga = it.tipo === 'decisao' ? { x: it.w * 0.2, y: it.h * 0.22 } : it.tipo === 'dados' ? { x: 22, y: 8 } : it.tipo === 'texto' ? { x: 4, y: 2 } : { x: 12, y: it.tipo === 'postit' ? 18 : 8 };
  escreverTexto(ctx, it, { x: it.x + folga.x, y: it.y + folga.y, w: it.w - folga.x * 2, h: it.h - folga.y * 2 - (tarefa ? 34 : 0) });
  if (tarefa) desenharTarefa(ctx, it, tarefa);
  if (opcoes.codigos && it.cod) {
    ctx.font = `600 10px ${FONTE}`;
    ctx.fillStyle = 'rgba(31,35,40,.55)';
    ctx.textAlign = 'left';
    const cx = it.tipo === 'decisao' ? it.x + it.w / 2 - 16 : it.tipo === 'inicio' ? it.x + it.h / 2 : it.x + 6;
    ctx.fillText(it.cod, cx, it.y + (it.tipo === 'decisao' ? 22 : 13));
  }
  ctx.restore();
}

function desenharSeta(ctx, s, c) {
  const a = c.itens[s.de.id], b = c.itens[s.para.id];
  if (!a || !b) return;
  const { pontos } = pontosSeta(a, b, s);
  ctx.save();
  ctx.strokeStyle = COR_SETA;
  ctx.fillStyle = COR_SETA;
  ctx.lineWidth = 1.8;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pontos.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  const ponta = (de, para) => {
    const ang = Math.atan2(para.y - de.y, para.x - de.x);
    ctx.beginPath();
    ctx.moveTo(para.x, para.y);
    ctx.lineTo(para.x - 10 * Math.cos(ang - 0.42), para.y - 10 * Math.sin(ang - 0.42));
    ctx.lineTo(para.x - 10 * Math.cos(ang + 0.42), para.y - 10 * Math.sin(ang + 0.42));
    ctx.closePath();
    ctx.fill();
  };
  const n = pontos.length;
  if (s.pontas !== 'nenhuma') ponta(pontos[n - 2], pontos[n - 1]);
  if (s.pontas === 'ambas') ponta(pontos[1], pontos[0]);
  if (s.rotulo) {
    const m = meioDoCaminho(pontos);
    ctx.font = `600 12px ${FONTE}`;
    const w = ctx.measureText(s.rotulo).width + 10;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(m.x - w / 2, m.y - 9, w, 18);
    ctx.strokeStyle = '#d0d5dd';
    ctx.lineWidth = 1;
    ctx.strokeRect(m.x - w / 2 + 0.5, m.y - 8.5, w - 1, 17);
    ctx.fillStyle = COR_TEXTO;
    ctx.textAlign = 'center';
    ctx.fillText(s.rotulo, m.x, m.y + 4);
  }
  ctx.restore();
}

/** Desenha tudo. opcoes: { escala, origem: {x,y}, fundo, codigos, imagens: Map, demo } */
export function desenharQuadro(ctx, c, opcoes = {}) {
  c = derivar(c);
  opcoes = { ...opcoes, c };
  const escala = opcoes.escala || 1;
  const origem = opcoes.origem || { x: 0, y: 0 };
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.save();
  ctx.fillStyle = opcoes.fundo || '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.scale(escala, escala);
  ctx.translate(-origem.x, -origem.y);
  ctx.textBaseline = 'alphabetic';
  const itens = porZ(c);
  for (const it of itens.filter((i) => i.tipo === 'raia')) desenharItem(ctx, it, opcoes);
  for (const it of itens.filter((i) => i.tipo === 'pagina')) desenharItem(ctx, it, opcoes);
  for (const it of itens.filter((i) => i.tipo !== 'raia' && i.tipo !== 'pagina')) desenharItem(ctx, it, opcoes);
  for (const s of listaSetas(c)) desenharSeta(ctx, s, c);
  ctx.restore();
  if (opcoes.demo) marcaDemo(ctx);
}

export function marcaDemo(ctx) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-Math.PI / 9);
  ctx.font = `800 ${Math.round(Math.min(W, H) / 7)}px ${FONTE}`;
  ctx.fillStyle = 'rgba(180,35,24,.13)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DEMO · EFC', 0, 0);
  ctx.restore();
}

/** Carrega as imagens do quadro (para o canvas). */
export async function carregarImagens(c) {
  const mapa = new Map();
  const lista = Object.values(c.itens).filter((it) => it.tipo === 'imagem' && it.src);
  await Promise.all(lista.map((it) => new Promise((ok) => {
    const img = new Image();
    img.onload = () => { mapa.set(it.id, img); ok(); };
    img.onerror = () => ok();
    img.src = it.src;
  })));
  return mapa;
}

/** Monta o canvas do quadro inteiro (margem em volta). Limite de 24 milhões de pixels. */
export async function canvasDoQuadro(c, { escala = 2, margem = 40, codigos = true, demo = false } = {}) {
  c = derivar(c);
  const lim = limitesDoQuadro(c) || { x: 0, y: 0, w: 400, h: 240 };
  let e = escala;
  const largura = lim.w + margem * 2, altura = lim.h + margem * 2;
  while (largura * altura * e * e > 24e6 && e > 0.5) e -= 0.25;
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(largura * e);
  cv.height = Math.ceil(altura * e);
  const ctx = cv.getContext('2d');
  desenharQuadro(ctx, c, { escala: e, origem: { x: lim.x - margem, y: lim.y - margem }, codigos, imagens: await carregarImagens(c), demo });
  return cv;
}

export { TIPOS_ITEM };
