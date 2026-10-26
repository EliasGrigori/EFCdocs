/* EFCdocs — pedacinhos de XML para o .xlsx (rápidos, sem montar árvore). */

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** Texto do XML → texto normal (entidades e os _xHHHH_ do Excel). */
export function desescapar(s) {
  if (!s) return '';
  if (s.indexOf('&') >= 0) {
    s = s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (_, e) => {
      if (e[0] === '#') { const n = e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : ''; }
      return ENT[e];
    });
  }
  if (s.indexOf('_x') >= 0) s = s.replace(/_x([0-9A-Fa-f]{4})_/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  return s;
}

/** Atributos de uma tag: 'r="A1" s="3"' → { r:'A1', s:'3' } */
export function atributos(s) {
  const o = {};
  if (!s) return o;
  const rx = /([\w:.-]+)\s*=\s*"([^"]*)"|([\w:.-]+)\s*=\s*'([^']*)'/g;
  let m;
  while ((m = rx.exec(s))) {
    const k = m[1] || m[3];
    const v = m[2] !== undefined ? m[2] : m[4];
    o[k.includes(':') && !k.startsWith('xml') && !k.startsWith('r:') ? k.split(':').pop() : k] = v.indexOf('&') >= 0 ? desescapar(v) : v;
  }
  return o;
}

/** Todas as tags <nome .../> ou <nome ...>...</nome> (sem aninhar a mesma tag). */
export function tags(xml, nome) {
  const out = [];
  if (!xml) return out;
  const rx = new RegExp(`<(?:\\w+:)?${nome}(?=[\\s/>])([^>]*?)(?:/>|>([\\s\\S]*?)</(?:\\w+:)?${nome}>)`, 'g');
  let m;
  while ((m = rx.exec(xml))) out.push({ a: atributos(m[1]), dentro: m[2] || '', bruto: m[0] });
  return out;
}

export const tag = (xml, nome) => tags(xml, nome)[0] || null;

/** Texto de um <si> ou <is> do Excel (junta os pedaços de texto formatado; ignora a fonética). */
export function textoRico(s) {
  if (!s) return '';
  if (s.indexOf('<rPh') >= 0) s = s.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');
  let out = '';
  const rx = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t(?:\s[^>]*)?\/>/g;
  let m;
  while ((m = rx.exec(s))) out += m[1] ? desescapar(m[1]) : '';
  return out;
}

/* ---------- gravar ---------- */
/** Texto normal → texto seguro para o XML (com os _xHHHH_ do Excel para caracteres de controle). atributo: também as aspas. */
export function escapar(s, atributo = false) {
  s = String(s);
  if (/_x[0-9A-Fa-f]{4}_/.test(s)) s = s.replace(/_(x[0-9A-Fa-f]{4}_)/g, '_x005F_$1');
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, (c) => '_x' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0') + '_');
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return atributo ? s.replace(/"/g, '&quot;').replace(/\n/g, '&#10;').replace(/\r/g, '&#13;').replace(/\t/g, '&#9;') : s;
}

export const XML_CAB = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
