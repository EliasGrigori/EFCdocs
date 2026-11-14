/* EFCdocs v0.6.5 — o desenho de uma aba (xl/drawings/drawingN.xml): gráficos, imagens, formas e botões, NA ORDEM da aba
   (o primeiro fica embaixo, o último em cima, como no Excel). */
import { escapar, XML_CAB } from './xml.js';
import { xmlDoGraficoObjeto, frameDoGrafico, comFormasDoGrafico, lerFaixaDoLivro, NS_A, NS_R, NS_XDR } from './graficosXlsx.js';
import { xmlDoCx, frameDoCx, REL_CX } from './cxXlsx.js';
import { gravarForma, formaDoBotao, ancoraXml } from './formasXlsx.js';
import { formaSemMudanca } from '../formas.js';
import { letraCol, lerChave } from '../ref.js';
import { textoCelula } from '../grade.js';

const deBase64 = (b64) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };

/**
 * Objetos da aba → { drawing, rels, charts:[{ n, xml }], midias:[{ nome, bytes, ext }], formas, botoes } ou null.
 * n0Chart / n0Img: números já usados nas abas de antes (chart1, image1... valem para o livro todo).
 */
export function gravarDesenhoAba(c, motor, aba, abaId, n0Chart, n0Img, cache = null) {
  const lista = (aba.objs || []).filter((o) => o.tipo === 'grafico' || o.tipo === 'imagem' || o.tipo === 'forma' || o.tipo === 'botao');
  if (!lista.length) return null;
  const charts = [], midias = [], rels = [], ancoras = [];
  const ns = { xdr: NS_XDR, a: NS_A, r: NS_R };
  let id = 1, nRel = 0, formas = 0, botoes = 0;
  const novoId = () => ++id;
  const novoRel = () => `rIdD${++nRel}`;
  /* v0.6.8 (Grok): a mesma imagem (o logotipo em todas as abas) vai uma vez só no arquivo; cache = { mapa, n } do livro todo */
  const cacheImg = cache || { mapa: new Map(), n: n0Img };
  const novaMidia = (ext, src) => {
    const ja = src && cacheImg.mapa.get(src);
    if (ja) return { ...ja, ja: true };
    const n = ++cacheImg.n;
    const md = { n, nome: `xl/media/image${n}.${ext}`, alvo: `../media/image${n}.${ext}` };
    if (src) cacheImg.mapa.set(src, md);
    return md;
  };
  const nomeDaAba = (idA) => (c.abas[idA] ? c.abas[idA].nome : null);
  const lerLigado = (lg) => {
    const idA = lg.aba && c.abas[lg.aba] ? lg.aba : abaId;
    const p = lerChave(lg.ref);
    if (!p) return '';
    try { return textoCelula(motor, c, idA, p.l, p.c).t; } catch { return ''; }
  };
  /* o gráfico vira uma parte chart{n}.xml e uma relação; devolve o r:id (ou null) */
  const parteDoGrafico = (o) => {
    /* v0.6.18 (D-44): gráfico novo do Excel (cx): volta o XML guardado, com os nomes e números de agora */
    if (o.g && o.g.t === 'cx') {
      const xml = xmlDoCx(c, abaId, o.g, lerFaixaDoLivro(c, motor, abaId, true));
      if (!xml) return null;
      const n = n0Chart + charts.length;
      charts.push({ n, xml, cx: true, ...(o.g.cx.estilo ? { estilo: o.g.cx.estilo } : {}), ...(o.g.cx.cores ? { cores: o.g.cx.cores } : {}) });
      const rid = novoRel();
      rels.push({ id: rid, tipo: 'chartEx', alvo: `../charts/chartEx${n}.xml` });
      return rid;
    }
    const xml = xmlDoGraficoObjeto(c, motor, aba, abaId, o);
    if (!xml) return null;
    const n = n0Chart + charts.length;
    /* v0.6.6: caixas de texto por cima do gráfico (userShapes) voltam numa parte própria */
    const cf = comFormasDoGrafico(xml, o, c);
    charts.push({ n, xml: cf.xml, ...(cf.us ? { us: cf.us } : {}) });
    const rid = novoRel();
    rels.push({ id: rid, tipo: 'chart', alvo: `../charts/chart${n}.xml` });
    return rid;
  };
  const soltarGrafico = (o) => { const rid = parteDoGrafico(o); if (rid) ancoras.push(ancoraXml(aba, o, o.g && o.g.t === 'cx' ? frameDoCx(o, novoId(), rid) : frameDoGrafico(o, novoId(), rid))); };
  /* v0.6.8 (Grok): gráficos que vieram dentro de um grupo do Excel (velocímetro sobre o painel) voltam para dentro dele,
     se nem o grupo nem o gráfico mudaram de lugar e o grupo não mudou */
  const mesmoLugar = (o, p0) => Array.isArray(p0) && o.l === p0[0] && o.c === p0[1] && Math.abs(o.dx - p0[2]) < 1.5 && Math.abs(o.dy - p0[3]) < 1.5 && Math.abs(o.w - p0[4]) < 1.5 && Math.abs(o.h - p0[5]) < 1.5;
  const grupoPorTok = new Map();
  for (const o of lista) if (o.tipo === 'forma' && o.grTok && o.xo && formaSemMudanca(o) && mesmoLugar(o, o.grP0) && !grupoPorTok.has(o.grTok)) grupoPorTok.set(o.grTok, o);
  const dentroDe = new Map(); // id da forma → { k: gráfico }
  for (const o of lista) {
    if (o.tipo !== 'grafico' || !o.noGrupo || !mesmoLugar(o, o.noGrupo.p0)) continue;
    const f = grupoPorTok.get(o.noGrupo.tok);
    if (!f) continue;
    const m = dentroDe.get(f.id) || {};
    if (m[o.noGrupo.k]) continue;
    m[o.noGrupo.k] = o; dentroDe.set(f.id, m);
  }
  /* só embute se TODOS os gráficos do grupo podem voltar para dentro (senão o grupo é refeito e eles vão soltos) */
  for (const [fid, m] of [...dentroDe]) { const f = lista.find((x) => x.id === fid); const nMarcas = (String(f.xo).match(/\befcgr="\d+"/g) || []).length; if (Object.keys(m).length !== nMarcas) dentroDe.delete(fid); }
  const embutidos = new Set([...dentroDe.values()].flatMap((m) => Object.values(m).map((o) => o.id)));
  for (const o of lista) {
    if (o.tipo === 'grafico') {
      if (embutidos.has(o.id)) continue; // vai dentro do grupo dele
      soltarGrafico(o);
      continue;
    }
    if (o.tipo === 'imagem') {
      const m = /^data:image\/(png|jpeg|webp|gif);base64,(.+)$/.exec(o.src || '');
      if (!m) continue;
      const ext = m[1] === 'jpeg' ? 'jpeg' : m[1];
      const md = novaMidia(ext, o.src);
      if (!md.ja) midias.push({ nome: md.nome, bytes: deBase64(m[2]), ext });
      const rid = novoRel();
      rels.push({ id: rid, tipo: 'image', alvo: md.alvo });
      const k = novoId();
      ancoras.push(ancoraXml(aba, o, `<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${k}" name="Imagem ${k}" descr="${escapar(o.nome || '', true)}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>` +
        `<xdr:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>` +
        `<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${Math.round(o.w * 9525)}" cy="${Math.round(o.h * 9525)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic>`));
      continue;
    }
    const f = o.tipo === 'botao' ? formaDoBotao(o) : o;
    const doGrupo = dentroDe.get(o.id) || {};
    const r = gravarForma(f, { aba, nomeDaAba, novoId, novoRel, novaMidia, lerLigado, graficoDoGrupo: (k) => (doGrupo[k] ? parteDoGrafico(doGrupo[k]) : null) });
    /* gráfico que era para ir dentro do grupo e não foi (o grupo saiu refeito): vai solto, logo acima do grupo */
    const soltos = Object.entries(doGrupo).filter(([k]) => !(r && r.usouGrupo && r.usouGrupo.includes(+k))).map(([, go]) => go);
    if (!r) { for (const go of soltos) soltarGrafico(go); continue; }
    ancoras.push(r.ancora);
    for (const go of soltos) soltarGrafico(go);
    rels.push(...r.rels);
    midias.push(...r.midias);
    if (o.tipo === 'botao') botoes++; else formas++;
    if (f.xoNs) for (const [p, u] of Object.entries(f.xoNs)) if (!ns[p]) ns[p] = u;
  }
  if (!ancoras.length) return null;
  const nsTxt = Object.entries(ns).map(([p, u]) => `xmlns${p ? ':' + p : ''}="${escapar(u, true)}"`).join(' ');
  const drawing = `${XML_CAB}<xdr:wsDr ${nsTxt}>${ancoras.join('')}</xdr:wsDr>`;
  const TIPO = { chart: `${NS_R}/chart`, image: `${NS_R}/image`, hyperlink: `${NS_R}/hyperlink`, chartEx: REL_CX };
  const relsXml = `${XML_CAB}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    rels.map((r) => `<Relationship Id="${r.id}" Type="${TIPO[r.tipo]}" Target="${escapar(r.alvo, true)}"${r.externo ? ' TargetMode="External"' : ''}/>`).join('') + '</Relationships>';
  void letraCol;
  return { drawing, rels: relsXml, charts, midias, formas, botoes };
}
