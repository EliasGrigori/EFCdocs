/* EFCdocs v0.6.5 — o desenho de uma aba (xl/drawings/drawingN.xml): gráficos, imagens, formas e botões, NA ORDEM da aba
   (o primeiro fica embaixo, o último em cima, como no Excel). */
import { escapar, XML_CAB } from './xml.js';
import { xmlDoGraficoObjeto, frameDoGrafico, NS_A, NS_R, NS_XDR } from './graficosXlsx.js';
import { gravarForma, formaDoBotao, ancoraXml } from './formasXlsx.js';
import { letraCol, lerChave } from '../ref.js';
import { textoCelula } from '../grade.js';

const deBase64 = (b64) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };

/**
 * Objetos da aba → { drawing, rels, charts:[{ n, xml }], midias:[{ nome, bytes, ext }], formas, botoes } ou null.
 * n0Chart / n0Img: números já usados nas abas de antes (chart1, image1... valem para o livro todo).
 */
export function gravarDesenhoAba(c, motor, aba, abaId, n0Chart, n0Img) {
  const lista = (aba.objs || []).filter((o) => o.tipo === 'grafico' || o.tipo === 'imagem' || o.tipo === 'forma' || o.tipo === 'botao');
  if (!lista.length) return null;
  const charts = [], midias = [], rels = [], ancoras = [];
  const ns = { xdr: NS_XDR, a: NS_A, r: NS_R };
  let id = 1, nRel = 0, formas = 0, botoes = 0;
  const novoId = () => ++id;
  const novoRel = () => `rIdD${++nRel}`;
  const novaMidia = (ext) => { const n = n0Img + midias.length + 1; return { n, nome: `xl/media/image${n}.${ext}`, alvo: `../media/image${n}.${ext}` }; };
  const nomeDaAba = (idA) => (c.abas[idA] ? c.abas[idA].nome : null);
  const lerLigado = (lg) => {
    const idA = lg.aba && c.abas[lg.aba] ? lg.aba : abaId;
    const p = lerChave(lg.ref);
    if (!p) return '';
    try { return textoCelula(motor, c, idA, p.l, p.c).t; } catch { return ''; }
  };
  for (const o of lista) {
    if (o.tipo === 'grafico') {
      const xml = xmlDoGraficoObjeto(c, motor, aba, abaId, o);
      if (!xml) continue;
      const n = n0Chart + charts.length;
      charts.push({ n, xml });
      const rid = novoRel();
      rels.push({ id: rid, tipo: 'chart', alvo: `../charts/chart${n}.xml` });
      ancoras.push(ancoraXml(aba, o, frameDoGrafico(o, novoId(), rid)));
      continue;
    }
    if (o.tipo === 'imagem') {
      const m = /^data:image\/(png|jpeg|webp|gif);base64,(.+)$/.exec(o.src || '');
      if (!m) continue;
      const ext = m[1] === 'jpeg' ? 'jpeg' : m[1];
      const md = novaMidia(ext);
      midias.push({ nome: md.nome, bytes: deBase64(m[2]), ext });
      const rid = novoRel();
      rels.push({ id: rid, tipo: 'image', alvo: md.alvo });
      const k = novoId();
      ancoras.push(ancoraXml(aba, o, `<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${k}" name="Imagem ${k}" descr="${escapar(o.nome || '', true)}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>` +
        `<xdr:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>` +
        '<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic>'));
      continue;
    }
    const f = o.tipo === 'botao' ? formaDoBotao(o) : o;
    const r = gravarForma(f, { aba, nomeDaAba, novoId, novoRel, novaMidia, lerLigado });
    if (!r) continue;
    ancoras.push(r.ancora);
    rels.push(...r.rels);
    midias.push(...r.midias);
    if (o.tipo === 'botao') botoes++; else formas++;
    if (f.xoNs) for (const [p, u] of Object.entries(f.xoNs)) if (!ns[p]) ns[p] = u;
  }
  if (!ancoras.length) return null;
  const nsTxt = Object.entries(ns).map(([p, u]) => `xmlns${p ? ':' + p : ''}="${escapar(u, true)}"`).join(' ');
  const drawing = `${XML_CAB}<xdr:wsDr ${nsTxt}>${ancoras.join('')}</xdr:wsDr>`;
  const TIPO = { chart: `${NS_R}/chart`, image: `${NS_R}/image`, hyperlink: `${NS_R}/hyperlink` };
  const relsXml = `${XML_CAB}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    rels.map((r) => `<Relationship Id="${r.id}" Type="${TIPO[r.tipo]}" Target="${escapar(r.alvo, true)}"${r.externo ? ' TargetMode="External"' : ''}/>`).join('') + '</Relationships>';
  void letraCol;
  return { drawing, rels: relsXml, charts, midias, formas, botoes };
}
