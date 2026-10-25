/* EFCdocs — desenha o quadro num canvas (para PNG, PDF e impressão).
   Usa a mesma geometria da tela, então setas e formas saem no mesmo lugar. */

import { COR, TIPOS_ITEM, porZ, listaSetas } from './modelo.js';
import { pontosSeta, contornoForma, limites, meioDoCaminho } from './geometria.js';

export const FONTE = '"DejaVu Sans", Verdana, system-ui, sans-serif';
export const COR_TEXTO = '#1f2328';
export const COR_LINHA = '#3b4552';
export const COR_SETA = '#475467';

/** Limites do quadro inteiro, incluindo setas. */
export function limitesDoQuadro(c) {
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
    for (const p of palavras) {
      const teste = atual ? atual + ' ' + p : p;
      if (ctx.measureText(teste).width <= largura || !atual) {
        if (!atual && ctx.measureText(p).width > largura) {
          /* palavra maior que a caixa: corta em pedaços */
          let pedaco = '';
          for (const ch of p) {
            if (ctx.measureText(pedaco + ch).width > largura && pedaco) { linhas.push(pedaco); pedaco = ''; }
            pedaco += ch;
          }
          atual = pedaco;
        } else atual = teste;
      } else {
        linhas.push(atual);
        atual = p;
      }
    }
    linhas.push(atual);
  }
  return linhas;
}

function fonteDo(it, tamanho) {
  const f = it.fonte || {};
  return `${f.i ? 'italic ' : ''}${f.n || it.tipo === 'texto' ? '700 ' : ''}${tamanho}px ${FONTE}`;
}

export const tamanhoFonte = (it) => (it.tipo === 'texto' ? 18 : it.tipo === 'raia' ? 15 : 14);

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

function desenharItem(ctx, it, opcoes) {
  const cor = COR[it.cor] || '#ffffff';
  ctx.save();
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
  const folga = it.tipo === 'decisao' ? { x: it.w * 0.2, y: it.h * 0.22 } : it.tipo === 'dados' ? { x: 22, y: 8 } : it.tipo === 'texto' ? { x: 4, y: 2 } : { x: 12, y: it.tipo === 'postit' ? 18 : 8 };
  escreverTexto(ctx, it, { x: it.x + folga.x, y: it.y + folga.y, w: it.w - folga.x * 2, h: it.h - folga.y * 2 });
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
  for (const it of itens.filter((i) => i.tipo !== 'raia')) desenharItem(ctx, it, opcoes);
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
