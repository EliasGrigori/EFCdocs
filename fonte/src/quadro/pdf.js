/* EFCdocs — PDF paisagem (A4) com a imagem do quadro, sem biblioteca externa.
   Cabeçalho com o nome do quadro e a data; rodapé com a origem. Texto em WinAnsi (acentos do português). */

const A4 = { w: 842, h: 595 }; /* paisagem, em pontos */

const WIN = { '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97 };

/** Texto → string PDF entre parênteses, já escapada, em WinAnsi. */
export function textoPdf(t) {
  let s = '';
  for (const ch of String(t)) {
    let c = WIN[ch] ?? ch.codePointAt(0);
    if (c > 255) c = 63; /* "?" para o que não existe na fonte padrão */
    const x = String.fromCharCode(c);
    s += x === '(' || x === ')' || x === '\\' ? '\\' + x : c < 32 ? ' ' : x;
  }
  return '(' + s + ')';
}

/** Texto dos metadados (título do arquivo): UTF-16, aceita qualquer letra. */
export function textoInfo(t) {
  let h = 'FEFF';
  for (const ch of String(t)) {
    const cp = ch.codePointAt(0);
    if (cp > 0xffff) { h += '003F'; continue; }
    h += cp.toString(16).toUpperCase().padStart(4, '0');
  }
  return '<' + h + '>';
}

/** Largura aproximada em Helvetica (para alinhar à direita e cortar). */
export function larguraTexto(t, tamanho) {
  return String(t).length * tamanho * 0.52;
}

function bytesLatin1(s) {
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255;
  return b;
}

/** Uma folha só. jpeg: { bytes: Uint8Array, w, h } em pixels. Devolve Uint8Array do PDF. */
export function montarPdfPaisagem({ titulo = '', direita = '', rodape = '', jpeg, noTopo = false }) {
  return montarPdfFolhas({ titulo, rodape, folhas: [{ jpeg, noTopo, direita }] });
}

/** Várias folhas A4 paisagem, cada uma com a sua imagem. folhas: [{ jpeg, noTopo, direita }].
    O rodapé ganha "folha 2 de 3" quando há mais de uma. */
export function montarPdfFolhas({ titulo = '', rodape = '', folhas }) {
  const M = 28, topo = 46, baixo = 30;
  const areaW = A4.w - M * 2, areaH = A4.h - topo - baixo;
  const n = folhas.length;

  const objetos = [];
  const add = (corpo) => { objetos.push(corpo); return objetos.length; };
  const filhas = folhas.map((_, i) => 5 + i * 3);
  add('<< /Type /Catalog /Pages 2 0 R >>');
  add(`<< /Type /Pages /Kids [${filhas.map((k) => k + ' 0 R').join(' ')}] /Count ${n} >>`);
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  folhas.forEach((f, i) => {
    const { jpeg, noTopo = false, direita = '' } = f;
    const esc = Math.min(areaW / jpeg.w, areaH / jpeg.h);
    const iw = jpeg.w * esc, ih = jpeg.h * esc;
    const ix = M + (areaW - iw) / 2, iy = noTopo ? baixo + areaH - ih : baixo + (areaH - ih) / 2;

    let tit = String(titulo);
    const maxTit = areaW - larguraTexto(direita, 9) - 24;
    while (tit.length > 4 && larguraTexto(tit, 13) > maxTit) tit = tit.slice(0, -2);
    if (tit !== String(titulo)) tit = tit.slice(0, -1) + '…';
    const pe = n > 1 ? `${rodape} · folha ${i + 1} de ${n}` : rodape;

    const conteudo = [
      'q 0.12 0.15 0.18 rg',
      `BT /F2 13 Tf ${M} ${A4.h - 30} Td ${textoPdf(tit)} Tj ET`,
      `BT /F1 9 Tf ${(A4.w - M - larguraTexto(direita, 9)).toFixed(1)} ${A4.h - 29} Td ${textoPdf(direita)} Tj ET`,
      'Q',
      `q 0.82 0.84 0.87 RG 0.6 w ${M} ${A4.h - 38} m ${A4.w - M} ${A4.h - 38} l S Q`,
      `q ${iw.toFixed(2)} 0 0 ${ih.toFixed(2)} ${ix.toFixed(2)} ${iy.toFixed(2)} cm /Im1 Do Q`,
      `q 0.45 0.48 0.52 rg BT /F1 8 Tf ${M} 14 Td ${textoPdf(pe)} Tj ET Q`,
    ].join('\n');
    const base = 5 + i * 3;
    add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /Im1 ${base + 2} 0 R >> >> /Contents ${base + 1} 0 R >>`);
    const cb = bytesLatin1(conteudo);
    add({ dict: `<< /Length ${cb.length} >>`, stream: cb });
    add({ dict: `<< /Type /XObject /Subtype /Image /Width ${jpeg.w} /Height ${jpeg.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.bytes.length} >>`, stream: jpeg.bytes });
  });
  add(`<< /Title ${textoInfo(titulo)} /Producer (EFCdocs) /Creator (EFCdocs) >>`);

  const partes = [];
  let pos = 0;
  const push = (b) => { partes.push(b); pos += b.length; };
  push(bytesLatin1('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));
  const offs = [];
  objetos.forEach((o, i) => {
    offs.push(pos);
    if (typeof o === 'string') push(bytesLatin1(`${i + 1} 0 obj\n${o}\nendobj\n`));
    else {
      push(bytesLatin1(`${i + 1} 0 obj\n${o.dict}\nstream\n`));
      push(o.stream);
      push(bytesLatin1('\nendstream\nendobj\n'));
    }
  });
  const xref = pos;
  let x = `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const o of offs) x += String(o).padStart(10, '0') + ' 00000 n \n';
  x += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R /Info ${objetos.length} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  push(bytesLatin1(x));

  const total = new Uint8Array(pos);
  let k = 0;
  for (const p of partes) { total.set(p, k); k += p.length; }
  return total;
}

export const PAGINA_PAISAGEM = A4;
