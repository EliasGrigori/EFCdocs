/* EFCdocs — imagens da planilha ⇄ figuras do Excel (xdr:pic dentro do desenho da aba). v0.6.3.
   Ler: figura presa a uma célula vira objeto 'imagem' (guardada pequena, em texto data:). Gravar: o inverso. */
import { tag } from './xml.js';
import { escapar } from './xml.js';
import { LARG_PADRAO, largPadrao, ALT_PADRAO, altPadrao } from '../modelo.js';
import { gifAnimado } from '../imagem.js';
import { IMG, imagemValida } from '../objetos.js';

const EMU = 9525;
const largCol = (aba, c) => (aba.ocC && aba.ocC[c] ? 0 : aba.larg && aba.larg[c] != null ? aba.larg[c] : largPadrao(aba));
const altLin = (aba, l) => (aba.ocL && aba.ocL[l] ? 0 : aba.alt && aba.alt[l] != null ? aba.alt[l] : altPadrao(aba));
const TIPOS = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };

export function paraBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
const deBase64 = (b64) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };

/** Bytes da figura → texto data: pequeno o bastante; reduz se der (só onde há OffscreenCanvas). Devolve '' se não couber. */
export async function figuraParaTexto(bytes, tipo) {
  const direto = `data:${tipo};base64,${paraBase64(bytes)}`;
  if (direto.length <= IMG.MAX_CHARS) return direto;
  if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') return '';
  try {
    const bmp = await createImageBitmap(new Blob([bytes], { type: tipo }));
    let k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    for (let volta = 0; volta < 10; volta++) {
      const cv = new OffscreenCanvas(Math.max(1, Math.round(bmp.width * k)), Math.max(1, Math.round(bmp.height * k)));
      cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
      for (const [t, q] of tipo === 'image/jpeg' ? [['image/jpeg', 0.8]] : [['image/webp', 0.85], ['image/jpeg', 0.75]]) {
        const blob = await cv.convertToBlob({ type: t, quality: q });
        if (blob.type !== t) continue;
        const txt = `data:${t};base64,${paraBase64(new Uint8Array(await blob.arrayBuffer()))}`;
        if (txt.length <= IMG.MAX_CHARS) return txt;
      }
      k *= 0.8;
    }
  } catch { /* sem como reduzir */ }
  return '';
}

const num = (x, n) => { const m = new RegExp(`<(?:\\w+:)?${n}>(-?\\d+)</(?:\\w+:)?${n}>`).exec(x || ''); return m ? +m[1] : 0; };
/** Posição e tamanho (px) de uma âncora do desenho. */
export function geometriaDaAncora(an, aba) {
  const fr = tag(an.dentro, 'from');
  const l = num(fr && fr.dentro, 'row'), c = num(fr && fr.dentro, 'col');
  const dx = num(fr && fr.dentro, 'colOff') / EMU, dy = num(fr && fr.dentro, 'rowOff') / EMU;
  let w = 240, h = 160;
  const ext = /<(?:\w+:)?ext\b[^>]*cx="(\d+)"[^>]*cy="(\d+)"/.exec(an.dentro);
  const to = tag(an.dentro, 'to');
  if (to) {
    const tl = num(to.dentro, 'row'), tc = num(to.dentro, 'col');
    w = -dx + num(to.dentro, 'colOff') / EMU; for (let k = c; k < tc; k++) w += largCol(aba, k);
    h = -dy + num(to.dentro, 'rowOff') / EMU; for (let k = l; k < tl; k++) h += altLin(aba, k);
  } else if (ext) { w = +ext[1] / EMU; h = +ext[2] / EMU; }
  return { l, c, dx: Math.max(0, dx), dy: Math.max(0, dy), w: Math.max(IMG.W_MIN, Math.round(w)), h: Math.max(IMG.H_MIN, Math.round(h)) };
}

/** Âncora com figura (xdr:pic) → objeto 'imagem', ou { fora: motivo }. */
export async function lerFiguraDaAncora(zip, relsD, an, aba) {
  const emb = /<(?:\w+:)?blip\b[^>]*\br:embed="([^"]+)"/.exec(an.dentro);
  if (!emb) return { fora: 'figura sem arquivo' };
  const rc = relsD.get(emb[1]);
  if (!rc || !rc.alvo) return { fora: 'figura sem arquivo' };
  const ext = String(rc.alvo).split('.').pop().toLowerCase();
  const tipo = TIPOS[ext];
  if (!tipo) return { fora: 'formato de figura que o EFCdocs não abre (' + ext + ')' };
  const bytes = await zip.bytes(rc.alvo);
  if (!bytes || !bytes.length) return { fora: 'figura vazia' };
  const src = await figuraParaTexto(bytes, tipo);
  if (!imagemValida(src)) return { fora: 'figura grande demais' };
  const desc = /<(?:\w+:)?cNvPr\b[^>]*\bdescr="([^"]*)"/.exec(an.dentro);
  return { obj: { tipo: 'imagem', ...geometriaDaAncora(an, aba), src, nome: desc ? desc[1].slice(0, 200) : '' }, animada: ext === 'gif' && gifAnimado(bytes) };
}

/**
 * Gravar: as imagens da aba → âncoras do desenho + arquivos de mídia.
 * n0 = quantas figuras já foram gravadas nas abas de antes (para os nomes image1, image2...).
 */
export function gravarImagensAba(aba, n0, idIni = 100) {
  const lista = (aba.objs || []).filter((o) => o.tipo === 'imagem');
  const ancoras = [], rels = [], midias = [];
  lista.forEach((o, k) => {
    const m = /^data:image\/(png|jpeg|webp|gif);base64,(.+)$/.exec(o.src || '');
    if (!m) return;
    const ext = m[1] === 'jpeg' ? 'jpeg' : m[1];
    const n = n0 + midias.length + 1;
    midias.push({ nome: `xl/media/image${n}.${ext}`, bytes: deBase64(m[2]), ext });
    const rid = `rIdI${midias.length}`;
    rels.push({ id: rid, alvo: `../media/image${n}.${ext}` });
    let col = o.c, x = o.dx + o.w;
    while (col < 16383 && x >= largCol(aba, col) && largCol(aba, col) > 0) { x -= largCol(aba, col); col++; }
    let lin = o.l, y = o.dy + o.h;
    while (lin < 1048575 && y >= altLin(aba, lin) && altLin(aba, lin) > 0) { y -= altLin(aba, lin); lin++; }
    ancoras.push(`<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>${o.c}</xdr:col><xdr:colOff>${Math.round(o.dx * EMU)}</xdr:colOff><xdr:row>${o.l}</xdr:row><xdr:rowOff>${Math.round(o.dy * EMU)}</xdr:rowOff></xdr:from>` +
      `<xdr:to><xdr:col>${col}</xdr:col><xdr:colOff>${Math.round(x * EMU)}</xdr:colOff><xdr:row>${lin}</xdr:row><xdr:rowOff>${Math.round(y * EMU)}</xdr:rowOff></xdr:to>` +
      `<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${idIni + k}" name="Imagem ${k + 1}" descr="${escapar(o.nome || '', true)}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>` +
      `<xdr:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>` +
      '<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor>');
  });
  return { ancoras, rels, midias };
}
