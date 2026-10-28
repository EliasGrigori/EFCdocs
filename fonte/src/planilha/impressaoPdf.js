/* EFCdocs v0.6.0 — PDF da planilha em vetor (texto de verdade, que dá para selecionar e procurar), sem biblioteca.
   Fontes padrão do PDF (Helvetica e variações, WinAnsi: acentos do português). Gráficos e formas entram como imagem nítida:
   v0.6.6 (Grok B03): com transparência (RGB + máscara de opacidade, compactados), para o painel escuro aparecer por baixo
   e o texto branco não sumir; imagem sem nenhum ponto transparente continua JPEG (menor). */
import { textoPdf, textoInfo } from '../quadro/pdf.js';

/* larguras da Helvetica e da Helvetica-Bold (AFM), caracteres 32 a 126, em milésimos do tamanho */
const HN = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const HB = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];
/** Largura do texto em pontos na Helvetica (acentos contam como a letra sem acento). */
export function larguraHelvetica(t, pt, negrito = false) {
  const tab = negrito ? HB : HN;
  let w = 0;
  for (const ch of String(t).normalize('NFD')) {
    const c = ch.charCodeAt(0);
    if (c >= 0x300 && c <= 0x36f) continue;
    w += c >= 32 && c <= 126 ? tab[c - 32] : 556;
  }
  return (w * pt) / 1000;
}

const rgb = (hex) => { const n = parseInt(String(hex || '#000000').slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255].map((v) => v.toFixed(3)).join(' '); };
const f2 = (v) => (Math.round(v * 100) / 100).toString();
function bytesLatin1(s) { const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255; return b; }

/**
 * paginas: saída de desenharPaginas · imagens: Map(svg → { bytes, w, h }) (JPEG já pronto, feito no navegador)
 * Devolve Uint8Array do PDF.
 */
export function pdfDasPaginas(paginas, { titulo = 'Planilha', imagens = new Map() } = {}) {
  const objetos = [];
  const add = (corpo) => { objetos.push(corpo); return objetos.length; };
  add('<< /Type /Catalog /Pages 2 0 R >>');
  add('PAGES');
  const F = ['Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique'].map((n) => add(`<< /Type /Font /Subtype /Type1 /BaseFont /${n} /Encoding /WinAnsiEncoding >>`));
  /* imagens (uma por gráfico diferente) */
  const idImg = new Map();
  for (const [svg, im] of imagens) {
    if (!im) continue;
    let n;
    if (im.rgb) {
      const filtro = im.flate ? ' /Filter /FlateDecode' : '';
      const sm = add({ dict: `<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceGray /BitsPerComponent 8${filtro} /Length ${im.alfa.length} >>`, stream: im.alfa });
      n = add({ dict: `<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8${filtro} /SMask ${sm} 0 R /Length ${im.rgb.length} >>`, stream: im.rgb });
    } else n = add({ dict: `<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>`, stream: im.bytes });
    idImg.set(svg, n);
  }
  const fontes = `/Font << /F1 ${F[0]} 0 R /F2 ${F[1]} 0 R /F3 ${F[2]} 0 R /F4 ${F[3]} 0 R >>`;
  const kids = [];
  for (const pag of paginas) {
    const H = pag.H;
    const c = [];
    const usadas = new Set();
    for (const o of pag.ops) {
      if (o.k === 'rect') c.push(`${rgb(o.fill)} rg ${f2(o.x)} ${f2(H - o.y - o.h)} ${f2(o.w)} ${f2(o.h)} re f`);
      else if (o.k === 'rectL') c.push(`${rgb(o.cor)} RG ${o.w2} w ${f2(o.x)} ${f2(H - o.y - o.h)} ${f2(o.w)} ${f2(o.h)} re S`);
      else if (o.k === 'line') c.push(`${rgb(o.cor)} RG ${f2(o.w)} w ${f2(o.x1)} ${f2(H - o.y1)} m ${f2(o.x2)} ${f2(H - o.y2)} l S`);
      else if (o.k === 'text') {
        const fn = o.bold && o.italic ? '/F4' : o.bold ? '/F2' : o.italic ? '/F3' : '/F1';
        const w = larguraHelvetica(o.t, o.size, o.bold);
        const x = o.anchor === 'middle' ? o.x - w / 2 : o.anchor === 'end' ? o.x - w : o.x;
        const clip = o.clip ? `${f2(o.clip.x)} ${f2(H - o.clip.y - o.clip.h)} ${f2(o.clip.w)} ${f2(o.clip.h)} re W n ` : '';
        let s = `q ${clip}${rgb(o.cor)} rg BT ${fn} ${f2(o.size)} Tf ${f2(x)} ${f2(H - o.y)} Td ${textoPdf(o.t)} Tj ET`;
        if (o.under) s += ` ${rgb(o.cor)} RG ${f2(o.size * 0.06)} w ${f2(x)} ${f2(H - o.y - o.size * 0.12)} m ${f2(x + w)} ${f2(H - o.y - o.size * 0.12)} l S`;
        if (o.strike) s += ` ${rgb(o.cor)} RG ${f2(o.size * 0.06)} w ${f2(x)} ${f2(H - o.y + o.size * 0.3)} m ${f2(x + w)} ${f2(H - o.y + o.size * 0.3)} l S`;
        c.push(s + ' Q');
      } else if (o.k === 'img') {
        const n = idImg.get(o.svg);
        if (!n) continue;
        usadas.add(n);
        const clip = o.clip ? `${f2(o.clip.x)} ${f2(H - o.clip.y - o.clip.h)} ${f2(o.clip.w)} ${f2(o.clip.h)} re W n ` : '';
        c.push(`q ${clip}${f2(o.w)} 0 0 ${f2(o.h)} ${f2(o.x)} ${f2(H - o.y - o.h)} cm /Im${n} Do Q`);
      }
    }
    const cb = bytesLatin1(c.join('\n'));
    const nC = add({ dict: `<< /Length ${cb.length} >>`, stream: cb });
    const xo = usadas.size ? ` /XObject << ${[...usadas].map((n) => `/Im${n} ${n} 0 R`).join(' ')} >>` : '';
    kids.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f2(pag.W)} ${f2(pag.H)}] /Resources << ${fontes}${xo} >> /Contents ${nC} 0 R >>`));
  }
  objetos[1] = `<< /Type /Pages /Kids [${kids.map((k) => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
  const info = add(`<< /Title ${textoInfo(titulo)} /Producer (EFCdocs) /Creator (EFCdocs) >>`);
  const partes = [];
  let pos = 0;
  const push = (b) => { partes.push(b); pos += b.length; };
  push(bytesLatin1('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));
  const offs = [];
  objetos.forEach((o, i) => {
    offs.push(pos);
    if (typeof o === 'string') push(bytesLatin1(`${i + 1} 0 obj\n${o}\nendobj\n`));
    else { push(bytesLatin1(`${i + 1} 0 obj\n${o.dict}\nstream\n`)); push(o.stream); push(bytesLatin1('\nendstream\nendobj\n')); }
  });
  const xref = pos;
  let x = `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const o of offs) x += String(o).padStart(10, '0') + ' 00000 n \n';
  x += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  push(bytesLatin1(x));
  const total = new Uint8Array(pos);
  let k = 0;
  for (const p of partes) { total.set(p, k); k += p.length; }
  return total;
}

/** Separa os pontos RGBA do canvas em RGB e opacidade (para o PDF). Devolve null se tudo é opaco. */
export function separarAlfa(px) {
  const n = px.length / 4;
  let transp = false;
  for (let i = 3; i < px.length; i += 4) if (px[i] < 255) { transp = true; break; }
  if (!transp) return null;
  const rgb = new Uint8Array(n * 3), alfa = new Uint8Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 3) {
    const a = px[i * 4 + 3];
    alfa[i] = a;
    /* o canvas guarda a cor sem pré-multiplicar; ponto totalmente transparente fica branco (não suja a borda) */
    if (a === 0) { rgb[j] = rgb[j + 1] = rgb[j + 2] = 255; continue; }
    rgb[j] = px[i * 4]; rgb[j + 1] = px[i * 4 + 1]; rgb[j + 2] = px[i * 4 + 2];
  }
  return { rgb, alfa };
}
async function compactar(bytes) {
  if (typeof CompressionStream === 'undefined') return null;
  const cs = new CompressionStream('deflate');
  const out = new Blob([bytes]).stream().pipeThrough(cs);
  return new Uint8Array(await new Response(out).arrayBuffer());
}
/** SVG → imagem para o PDF (no navegador), com 3× a resolução do tamanho em pontos (até ~6 milhões de pontos).
    Com partes transparentes: RGB + opacidade compactados (FlateDecode); toda opaca: JPEG. */
export async function svgParaImagemPdf(svg, wPt, hPt, fator = 3) {
  const lim = Math.sqrt(6e6 / Math.max(1, wPt * hPt));
  const f = Math.max(1, Math.min(fator, lim));
  const w = Math.max(1, Math.round(wPt * f)), h = Math.max(1, Math.round(hPt * f));
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    await new Promise((ok, erro) => { img.onload = ok; img.onerror = erro; img.src = url; });
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const sep = separarAlfa(ctx.getImageData(0, 0, w, h).data);
    if (sep) {
      const [rgbZ, alfaZ] = await Promise.all([compactar(sep.rgb), compactar(sep.alfa)]);
      if (rgbZ && alfaZ) return { rgb: rgbZ, alfa: alfaZ, flate: true, w, h };
      return { rgb: sep.rgb, alfa: sep.alfa, flate: false, w, h };
    }
    const blob = await new Promise((ok) => cv.toBlob(ok, 'image/jpeg', 0.9));
    return { bytes: new Uint8Array(await blob.arrayBuffer()), w, h };
  } finally { URL.revokeObjectURL(url); }
}
