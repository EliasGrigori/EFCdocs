/* EFCdocs — exportar o quadro: PNG, PDF paisagem e imprimir.
   Na visão Kanban, exporta as colunas; na visão de quadro, o quadro inteiro. */

import { canvasDoQuadro, quebrarTexto, marcaDemo, FONTE, COR_TEXTO } from './desenho.js';
import { montarPdfPaisagem } from './pdf.js';
import { COR, porColuna, listaItens } from './modelo.js';

const dois = (n) => String(n).padStart(2, '0');
export function carimboData(d = new Date()) {
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()} ${dois(d.getHours())}:${dois(d.getMinutes())}`;
}

export function baixar(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const paraBlob = (cv, tipo, qualidade) => new Promise((ok, erro) => cv.toBlob((b) => (b ? ok(b) : erro(new Error('canvas vazio'))), tipo, qualidade));

/** Kanban em canvas: colunas lado a lado, cartões em pilha. */
export function canvasDoKanban(c, { escala = 2, demo = false } = {}) {
  const grupos = porColuna(c);
  const LC = 260, ESP = 16, M = 24, TOPO = 44, CARD_MIN = 54;
  const medir = document.createElement('canvas').getContext('2d');
  medir.font = `14px ${FONTE}`;
  const alturaCard = (it) => Math.max(CARD_MIN, 34 + Math.min(6, quebrarTexto(medir, it.texto || ' ', LC - 40).length) * 18);
  const alturas = c.colunas.map((k) => (grupos[k.id] || []).reduce((s, it) => s + alturaCard(it) + 10, 0));
  const W = M * 2 + c.colunas.length * LC + (c.colunas.length - 1) * ESP;
  const H = M * 2 + TOPO + Math.max(120, ...alturas);
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(W * escala);
  cv.height = Math.ceil(H * escala);
  const ctx = cv.getContext('2d');
  ctx.scale(escala, escala);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  c.colunas.forEach((k, i) => {
    const x = M + i * (LC + ESP);
    ctx.fillStyle = '#f2f4f7';
    ctx.fillRect(x, M, LC, H - M * 2);
    ctx.fillStyle = COR_TEXTO;
    ctx.font = `700 15px ${FONTE}`;
    ctx.textAlign = 'left';
    ctx.fillText(k.nome, x + 12, M + 26);
    ctx.fillStyle = '#667085';
    ctx.font = `600 12px ${FONTE}`;
    ctx.textAlign = 'right';
    ctx.fillText(String((grupos[k.id] || []).length), x + LC - 12, M + 26);
    let y = M + TOPO;
    for (const it of grupos[k.id] || []) {
      const h = alturaCard(it);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#d0d5dd';
      ctx.fillRect(x + 10, y, LC - 20, h);
      ctx.strokeRect(x + 10.5, y + 0.5, LC - 21, h - 1);
      ctx.fillStyle = COR[it.cor] || '#fde68a';
      ctx.fillRect(x + 10, y, 5, h);
      ctx.fillStyle = 'rgba(31,35,40,.55)';
      ctx.font = `600 10px ${FONTE}`;
      ctx.textAlign = 'left';
      ctx.fillText(it.cod || '', x + 24, y + 16);
      ctx.fillStyle = (it.fonte && it.fonte.cor) || COR_TEXTO;
      ctx.font = `${it.fonte && it.fonte.i ? 'italic ' : ''}${it.fonte && it.fonte.n ? '700 ' : ''}14px ${FONTE}`;
      const linhas = quebrarTexto(ctx, it.texto || '', LC - 40).slice(0, 6);
      linhas.forEach((l, j) => ctx.fillText(l, x + 24, y + 36 + j * 18));
      y += h + 10;
    }
  });
  if (demo) marcaDemo(ctx);
  return cv;
}

async function canvasDaVista(c, vista, opcoes) {
  if (vista === 'kanban') return canvasDoKanban(c, opcoes);
  return canvasDoQuadro(c, opcoes);
}

export const quadroVazio = (c, vista) => (vista === 'kanban' ? !listaItens(c).some((i) => i.tipo === 'postit') : listaItens(c).length === 0);

export async function exportarPng(c, nome, { vista, codigos, demo }) {
  const cv = await canvasDaVista(c, vista, { escala: 2, codigos, demo });
  baixar(await paraBlob(cv, 'image/png'), `${nome}.png`);
}

export async function exportarPdf(c, nome, { vista, codigos, demo }) {
  const cv = await canvasDaVista(c, vista, { escala: 2, codigos, demo });
  const jpg = new Uint8Array(await (await paraBlob(cv, 'image/jpeg', 0.92)).arrayBuffer());
  const bytes = montarPdfPaisagem({
    titulo: nome,
    direita: (vista === 'kanban' ? 'Kanban · ' : 'Quadro · ') + carimboData(),
    rodape: `EFCdocs · Post-its${demo ? ' · DEMO · EFC' : ''} · gerado em ${carimboData()}`,
    jpeg: { bytes: jpg, w: cv.width, h: cv.height },
    noTopo: vista === 'kanban', /* Kanban começa no alto da folha, como no quadro de parede */
  });
  baixar(new Blob([bytes], { type: 'application/pdf' }), `${nome}.pdf`);
  return bytes.length;
}

/** Imprime em paisagem por uma moldura escondida (não abre janela nova). */
export async function imprimir(c, nome, { vista, codigos, demo }) {
  const cv = await canvasDaVista(c, vista, { escala: 2, codigos, demo });
  const url = cv.toDataURL('image/png');
  const fr = document.createElement('iframe');
  fr.setAttribute('aria-hidden', 'true');
  fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(fr);
  const doc = fr.contentDocument;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${nome.replace(/[<>&]/g, '')}</title><style>@page{size:A4 landscape;margin:10mm}html,body{margin:0}h1{font:700 14px Verdana,sans-serif;margin:0 0 6px}img{max-width:100%;max-height:178mm;display:block;margin:auto}</style></head><body><h1></h1><img alt=""></body></html>`);
  doc.close();
  doc.querySelector('h1').textContent = nome + ' · ' + carimboData();
  const img = doc.querySelector('img');
  await new Promise((ok) => { img.onload = ok; img.onerror = ok; img.src = url; });
  fr.contentWindow.focus();
  fr.contentWindow.print();
  setTimeout(() => fr.remove(), 60000);
}
