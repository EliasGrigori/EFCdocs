/* EFCdocs v0.6.0 — gráficos ⇄ .xlsx (DrawingML), sem biblioteca.
   Gravar: cada gráfico vira um gráfico NATIVO do Excel (colunas, barras, linha, área, pizza, rosca, dispersão, combinado).
     Pareto, carta de controle e histograma também vão nativos (colunas/linha), com os valores calculados escritos no gráfico.
     As escolhas do EFCdocs vão junto numa extensão (o Excel ignora; ao abrir de volta, o gráfico volta igual).
   Ler: os gráficos do Excel com dados numa faixa só da mesma pasta viram gráficos do EFCdocs; os outros entram no relatório. */
import { tags, tag, atributos, desescapar, escapar, XML_CAB } from './xml.js';
import { letraCol, lerChave } from '../ref.js';
import { LARG_PADRAO, ALT_PADRAO, estiloDe } from '../modelo.js';
import { dadosDaFaixa, normalizarG, pareto, cartaControle, histograma, PALETA_GRAFICO, COR_FORA, COR_MEDIA } from '../graficos.js';
import { faixasDe } from '../regras.js';
import { formatar } from '../formato.js';

const NS_C = 'http://schemas.openxmlformats.org/drawingml/2006/chart';
const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_XDR = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';
const URI_EFC = '{6A1F3E2B-7C4D-4E5F-8A9B-0C1D2E3F4A5B}';
const EMU = 9525;

const corX = (h) => String(h || '#000000').replace('#', '').toUpperCase();
const nomeAba = (n) => (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(n) ? n : "'" + String(n).replace(/'/g, "''") + "'");
const abs = (l, c) => `$${letraCol(c)}$${l + 1}`;
const refF = (aba, l1, c1, l2, c2) => `${nomeAba(aba)}!${abs(l1, c1)}${l2 === l1 && c2 === c1 ? '' : ':' + abs(l2, c2)}`;
const largCol = (aba, c) => (aba.ocC && aba.ocC[c] ? 0 : aba.larg && aba.larg[c] != null ? aba.larg[c] : LARG_PADRAO);
const altLin = (aba, l) => (aba.ocL && aba.ocL[l] ? 0 : aba.alt && aba.alt[l] != null ? aba.alt[l] : ALT_PADRAO);

/* ---------- pedaços do XML do gráfico ---------- */
const rich = (t, sz = 1400, b = true) => `<c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${sz}" b="${b ? 1 : 0}"/></a:pPr><a:r><a:rPr lang="pt-BR" sz="${sz}" b="${b ? 1 : 0}"/><a:t>${escapar(t)}</a:t></a:r></a:p></c:rich></c:tx>`;
const titulo = (t, sz) => `<c:title>${rich(t, sz)}<c:overlay val="0"/></c:title>`;
const preench = (cor) => `<c:spPr><a:solidFill><a:srgbClr val="${corX(cor)}"/></a:solidFill></c:spPr>`;
const traco = (cor, w = 28575, tracejado = false) => `<c:spPr><a:ln w="${w}" cap="rnd"><a:solidFill><a:srgbClr val="${corX(cor)}"/></a:solidFill>${tracejado ? '<a:prstDash val="dash"/>' : ''}<a:round/></a:ln></c:spPr>`;
const strCache = (lista) => `<c:strCache><c:ptCount val="${lista.length}"/>${lista.map((t, i) => `<c:pt idx="${i}"><c:v>${escapar(t)}</c:v></c:pt>`).join('')}</c:strCache>`;
const numCache = (lista, tag2 = 'numCache') => `<c:${tag2}><c:formatCode>General</c:formatCode><c:ptCount val="${lista.length}"/>${lista.map((v, i) => (typeof v === 'number' && Number.isFinite(v) ? `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>` : '')).join('')}</c:${tag2}>`;
const strLit = (lista) => `<c:strLit><c:ptCount val="${lista.length}"/>${lista.map((t, i) => `<c:pt idx="${i}"><c:v>${escapar(t)}</c:v></c:pt>`).join('')}</c:strLit>`;
const dLbls = (mostra) => (mostra ? '<c:dLbls><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>' : '');

/** Série: { nome, nomeRef?, catRef?, cats, valRef?, vals, cor, linha?, tracejado?, marca? } */
function serie(s, i, tipo, rotulos) {
  const tx = s.nomeRef ? `<c:tx><c:strRef><c:f>${escapar(s.nomeRef)}</c:f>${strCache([s.nome])}</c:strRef></c:tx>` : `<c:tx><c:v>${escapar(s.nome)}</c:v></c:tx>`;
  const cat = s.cats && s.cats.length ? (s.catRef ? `<c:cat><c:strRef><c:f>${escapar(s.catRef)}</c:f>${strCache(s.cats)}</c:strRef></c:cat>` : `<c:cat>${strLit(s.cats)}</c:cat>`) : '';
  const val = s.valRef ? `<c:val><c:numRef><c:f>${escapar(s.valRef)}</c:f>${numCache(s.vals)}</c:numRef></c:val>` : `<c:val>${numCache(s.vals, 'numLit')}</c:val>`;
  const ini = `<c:ser><c:idx val="${i}"/><c:order val="${i}"/>${tx}`;
  if (tipo === 'bar') return `${ini}${preench(s.cor)}<c:invertIfNegative val="0"/>${dLbls(rotulos)}${cat}${val}</c:ser>`;
  if (tipo === 'area') return `${ini}<c:spPr><a:solidFill><a:srgbClr val="${corX(s.cor)}"><a:alpha val="45000"/></a:srgbClr></a:solidFill></c:spPr>${dLbls(rotulos)}${cat}${val}</c:ser>`;
  if (tipo === 'pie') {
    const pts = (s.cats || []).map((_, k) => `<c:dPt><c:idx val="${k}"/><c:bubble3D val="0"/>${preench(s.coresPts[k % s.coresPts.length])}</c:dPt>`).join('');
    return `${ini}${pts}<c:dLbls><c:showLegendKey val="0"/><c:showVal val="0"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="1"/><c:showBubbleSize val="0"/><c:showLeaderLines val="1"/></c:dLbls>${cat}${val}</c:ser>`;
  }
  if (tipo === 'scatter') {
    const xv = s.xRef ? `<c:xVal><c:numRef><c:f>${escapar(s.xRef)}</c:f>${numCache(s.xs)}</c:numRef></c:xVal>` : `<c:xVal>${numCache(s.xs, 'numLit')}</c:xVal>`;
    const yv = val.replace('<c:val>', '<c:yVal>').replace('</c:val>', '</c:yVal>');
    return `${ini}<c:spPr><a:ln w="19050"><a:noFill/></a:ln></c:spPr><c:marker><c:symbol val="circle"/><c:size val="6"/>${preench(s.cor)}</c:marker>${dLbls(rotulos)}${xv}${yv}<c:smooth val="0"/></c:ser>`;
  }
  /* linha */
  const marca = s.marca === false ? '<c:marker><c:symbol val="none"/></c:marker>' : `<c:marker><c:symbol val="circle"/><c:size val="5"/>${preench(s.cor)}</c:marker>`;
  const pts = (s.foraPts || []).map((k) => `<c:dPt><c:idx val="${k}"/><c:marker><c:symbol val="circle"/><c:size val="7"/>${preench(COR_FORA)}</c:marker><c:bubble3D val="0"/></c:dPt>`).join('');
  return `${ini}${traco(s.cor, s.tracejado ? 19050 : 28575, s.tracejado)}${marca}${pts}${dLbls(rotulos)}${cat}${val}<c:smooth val="0"/></c:ser>`;
}
const eixoCat = (id, cruza, pos = 'b', titulo2 = '', apagado = false) => `<c:catAx><c:axId val="${id}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="${apagado ? 1 : 0}"/><c:axPos val="${pos}"/>${titulo2 ? titulo(titulo2, 1000) : ''}<c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="low"/><c:crossAx val="${cruza}"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>`;
const eixoVal = (id, cruza, pos = 'l', titulo2 = '', { max, min, grade = true, cruzaMax = false, fmt = 'General', apagado = false } = {}) => `<c:valAx><c:axId val="${id}"/><c:scaling><c:orientation val="minMax"/>${max != null ? `<c:max val="${max}"/>` : ''}${min != null ? `<c:min val="${min}"/>` : ''}</c:scaling><c:delete val="${apagado ? 1 : 0}"/><c:axPos val="${pos}"/>${grade ? '<c:majorGridlines><c:spPr><a:ln w="9525"><a:solidFill><a:srgbClr val="E3E8ED"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>' : ''}${titulo2 ? titulo(titulo2, 1000) : ''}<c:numFmt formatCode="${escapar(fmt, true)}" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln><a:noFill/></a:ln></c:spPr><c:crossAx val="${cruza}"/><c:crosses val="${cruzaMax ? 'max' : 'autoZero'}"/><c:crossBetween val="between"/></c:valAx>`;

/** Monta o XML de um gráfico (c:chartSpace). ctx = { d, refs } */
export function xmlDoGrafico(g, ctx) {
  const { d } = ctx;
  const R = ctx.refs; // { nome[i], cat, val[i] } por série (índice em d.series)
  const cores = g.op.cores && g.op.cores.length ? [...g.op.cores, ...PALETA_GRAFICO] : PALETA_GRAFICO;
  const base = d.series.map((s, i) => ({ nome: s.nome, nomeRef: R.nome[i], cats: d.cats, catRef: R.cat, vals: s.vals, valRef: R.val[i], cor: cores[i % cores.length] }));
  const rot = !!g.op.rotulos;
  const A1 = 111111, A2 = 222222, A3 = 333333, A4 = 444444;
  let plot = '';
  const metaSerie = (n) => (typeof g.op.meta === 'number' ? [{ nome: 'Meta', cats: d.cats, vals: new Array(n).fill(g.op.meta), cor: '#D79A22', tracejado: true, marca: false }] : []);
  switch (g.t) {
    case 'barras': case 'colunas': {
      const emp = g.op.empilhado;
      plot = `<c:barChart><c:barDir val="${g.t === 'barras' ? 'bar' : 'col'}"/><c:grouping val="${emp ? 'stacked' : 'clustered'}"/><c:varyColors val="0"/>${base.map((s, i) => serie(s, i, 'bar', rot)).join('')}<c:gapWidth val="80"/>${emp ? '<c:overlap val="100"/>' : ''}<c:axId val="${A1}"/><c:axId val="${A2}"/></c:barChart>`;
      const meta = metaSerie(d.cats.length);
      if (meta.length && g.t === 'colunas') plot += `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${meta.map((s, i) => serie(s, base.length + i, 'line', false)).join('')}<c:marker val="1"/><c:axId val="${A1}"/><c:axId val="${A2}"/></c:lineChart>`;
      plot += g.t === 'barras' ? eixoCat(A1, A2, 'l', g.op.eixoY) + eixoVal(A2, A1, 'b', g.op.eixoX) : eixoCat(A1, A2, 'b', g.op.eixoX) + eixoVal(A2, A1, 'l', g.op.eixoY);
      break;
    }
    case 'linha': case 'area': {
      const tp = g.t === 'area' ? 'area' : 'line';
      const ser = [...base.map((s) => ({ ...s, marca: d.cats.length <= 40 }))];
      plot = tp === 'area'
        ? `<c:areaChart><c:grouping val="${g.op.empilhado ? 'stacked' : 'standard'}"/><c:varyColors val="0"/>${ser.map((s, i) => serie(s, i, 'area', rot)).join('')}<c:axId val="${A1}"/><c:axId val="${A2}"/></c:areaChart>`
        : `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${[...ser, ...metaSerie(d.cats.length)].map((s, i) => serie(s, i, 'line', rot && i < ser.length)).join('')}<c:marker val="1"/><c:axId val="${A1}"/><c:axId val="${A2}"/></c:lineChart>`;
      plot += eixoCat(A1, A2, 'b', g.op.eixoX) + eixoVal(A2, A1, 'l', g.op.eixoY);
      break;
    }
    case 'pizza': case 'rosca': {
      const s = { ...base[0], coresPts: cores };
      plot = g.t === 'rosca'
        ? `<c:doughnutChart><c:varyColors val="1"/>${serie(s, 0, 'pie', rot)}<c:firstSliceAng val="0"/><c:holeSize val="58"/></c:doughnutChart>`
        : `<c:pieChart><c:varyColors val="1"/>${serie(s, 0, 'pie', rot)}<c:firstSliceAng val="0"/></c:pieChart>`;
      break;
    }
    case 'dispersao': {
      const [x, ...ys] = base;
      plot = `<c:scatterChart><c:scatterStyle val="lineMarker"/><c:varyColors val="0"/>${ys.map((s, i) => serie({ ...s, xs: x.vals, xRef: x.valRef, cor: cores[i % cores.length] }, i, 'scatter', rot)).join('')}<c:axId val="${A1}"/><c:axId val="${A2}"/></c:scatterChart>`;
      plot += eixoVal(A1, A2, 'b', g.op.eixoX, { grade: false }).replace('<c:crossBetween val="between"/>', '<c:crossBetween val="midCat"/>') + eixoVal(A2, A1, 'l', g.op.eixoY);
      break;
    }
    case 'combinado': {
      const [b0, ...ls] = base;
      const maxB = Math.max(0, ...b0.vals.filter((v) => v != null)), maxL = Math.max(0, ...ls.flatMap((s) => s.vals).filter((v) => v != null));
      const dir = maxB && maxL && (maxB / maxL > 5 || maxL / maxB > 5);
      plot = `<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>${serie(b0, 0, 'bar', rot)}<c:gapWidth val="80"/><c:axId val="${A1}"/><c:axId val="${A2}"/></c:barChart>`;
      plot += `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${[...ls, ...metaSerie(d.cats.length)].map((s, i) => serie(s, i + 1, 'line', rot && i < ls.length)).join('')}<c:marker val="1"/><c:axId val="${dir ? A3 : A1}"/><c:axId val="${dir ? A4 : A2}"/></c:lineChart>`;
      plot += eixoCat(A1, A2, 'b', g.op.eixoX) + eixoVal(A2, A1, 'l', g.op.eixoY);
      if (dir) plot += eixoCat(A3, A4, 'b', '', true) + eixoVal(A4, A3, 'r', '', { grade: false, cruzaMax: true });
      break;
    }
    case 'pareto': {
      const p = pareto(d);
      const nome = (d.series[0] && d.series[0].nome) || 'Quantidade';
      plot = `<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>${serie({ nome, cats: p.cats, vals: p.vals, cor: cores[0] }, 0, 'bar', rot)}<c:gapWidth val="40"/><c:axId val="${A1}"/><c:axId val="${A2}"/></c:barChart>`;
      plot += `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${serie({ nome: '% acumulado', cats: p.cats, vals: p.acum.map((v) => Math.round(v * 10) / 10), cor: cores[1] }, 1, 'line', false)}${serie({ nome: '80%', cats: p.cats, vals: p.cats.map(() => 80), cor: cores[1], tracejado: true, marca: false }, 2, 'line', false)}<c:marker val="1"/><c:axId val="${A3}"/><c:axId val="${A4}"/></c:lineChart>`;
      plot += eixoCat(A1, A2, 'b', g.op.eixoX) + eixoVal(A2, A1, 'l', g.op.eixoY) + eixoCat(A3, A4, 'b', '', true) + eixoVal(A4, A3, 'r', '', { max: 100, min: 0, grade: false, cruzaMax: true, fmt: '0"%"' });
      break;
    }
    case 'controle': {
      const s0 = base[0];
      const k = cartaControle(s0.vals, g.op);
      const n = d.cats.length;
      const fx = (v, nome, cor, tr) => ({ nome, cats: d.cats, vals: new Array(n).fill(Math.round(v * 10000) / 10000), cor, tracejado: tr, marca: false });
      /* tudo com os valores escritos no gráfico: os limites são calculados na hora de salvar, e o LibreOffice só desenha séries escritas se todas forem assim */
      const ser = [{ nome: s0.nome, cats: d.cats, vals: s0.vals, cor: s0.cor, foraPts: k.fora.map((f, i) => (f ? i : -1)).filter((i) => i >= 0) }, fx(k.lsc, 'LSC', COR_FORA, true), fx(k.media, 'Média', COR_MEDIA, false), fx(k.lic, 'LIC', COR_FORA, true)];
      if (typeof g.op.meta === 'number') ser.push(fx(g.op.meta, 'Meta', '#D79A22', true));
      plot = `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${ser.map((s, i) => serie(s, i, 'line', rot && i === 0)).join('')}<c:marker val="1"/><c:axId val="${A1}"/><c:axId val="${A2}"/></c:lineChart>`;
      plot += eixoCat(A1, A2, 'b', g.op.eixoX) + eixoVal(A2, A1, 'l', g.op.eixoY);
      break;
    }
    case 'histograma': {
      const h = histograma(d.series.flatMap((s) => s.vals));
      plot = `<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>${serie({ nome: 'Frequência', cats: h.cats, vals: h.vals, cor: cores[0] }, 0, 'bar', rot)}<c:gapWidth val="2"/><c:axId val="${A1}"/><c:axId val="${A2}"/></c:barChart>`;
      plot += eixoCat(A1, A2, 'b', g.op.eixoX) + eixoVal(A2, A1, 'l', g.op.eixoY || 'Frequência');
      break;
    }
    default: break;
  }
  const leg = g.op.legenda === 'nao' ? '' : `<c:legend><c:legendPos val="${g.op.legenda === 'dir' ? 'r' : 'b'}"/><c:overlay val="0"/></c:legend>`;
  const efc = escapar(JSON.stringify({ ...g, dados: { ...g.dados, aba: ctx.nomeAba || '' } }));
  return `${XML_CAB}<c:chartSpace xmlns:c="${NS_C}" xmlns:a="${NS_A}" xmlns:r="${NS_R}"><c:roundedCorners val="0"/>` +
    `<c:chart>${g.titulo ? titulo(g.titulo) + '<c:autoTitleDeleted val="0"/>' : '<c:autoTitleDeleted val="1"/>'}<c:plotArea><c:layout/>${plot}</c:plotArea>${leg}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart>` +
    '<c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="9525"><a:solidFill><a:srgbClr val="D2D9E0"/></a:solidFill></a:ln></c:spPr>' +
    `<c:extLst><c:ext uri="${URI_EFC}" xmlns:efc="urn:efcdocs:grafico"><efc:g>${efc}</efc:g></c:ext></c:extLst></c:chartSpace>`;
}

/** Refs (endereços com aba) das séries, a partir da faixa e do que dadosDaFaixa achou. */
function refsDaFaixa(nomeAbaD, f, d, porLinhas) {
  const out = { nome: [], val: [], cat: null };
  if (!porLinhas) {
    const l0 = f.l1 + (d.cab ? 1 : 0);
    if (d.temCat) out.cat = refF(nomeAbaD, l0, f.c1, f.l2, f.c1);
    for (const s of d.series) {
      const c = f.c1 + s.j;
      out.nome.push(d.cab ? refF(nomeAbaD, f.l1, c, f.l1, c) : null);
      out.val.push(refF(nomeAbaD, l0, c, f.l2, c));
    }
  } else {
    const c0 = f.c1 + (d.cab ? 1 : 0);
    if (d.temCat) out.cat = refF(nomeAbaD, f.l1, c0, f.l1, f.c2);
    for (const s of d.series) {
      const l = f.l1 + s.j;
      out.nome.push(d.cab ? refF(nomeAbaD, l, f.c1, l, f.c1) : null);
      out.val.push(refF(nomeAbaD, l, c0, l, f.c2));
    }
  }
  return out;
}

/**
 * Gráficos de uma aba → { drawing, rels, charts:[{ n, xml }] } ou null.
 * n0: número do primeiro chart (chart1, chart2... em todo o livro).
 */
export function gravarGraficosAba(c, motor, aba, abaId, n0) {
  const lista = (aba.objs || []).filter((o) => o.tipo === 'grafico');
  if (!lista.length) return null;
  const charts = [];
  const ancoras = [];
  lista.forEach((o, k) => {
    const g = normalizarG(o.g);
    const abaD = g.dados.aba && c.abas[g.dados.aba] ? g.dados.aba : abaId;
    const A = c.abas[abaD];
    const fs = faixasDe(g.dados.fx);
    if (!fs.length) return;
    const f = fs[0];
    const ler = (l, cc) => { let v; try { v = motor.valor(abaD, l, cc); } catch { v = null; } return v && typeof v === 'object' ? null : v; };
    const texto = (l, cc) => { const v = ler(l, cc); if (v == null) return ''; const cel = A.cel && A.cel[letraCol(cc) + (l + 1)]; const e = estiloDe(c, cel || {}); try { return formatar(v, e.nf).t; } catch { return String(v); } };
    const d = dadosDaFaixa(f, ler, texto, !!g.porLinhas);
    if (!d.series.length) return;
    const refs = refsDaFaixa(A.nome, f, d, !!g.porLinhas);
    const n = n0 + charts.length;
    charts.push({ n, xml: xmlDoGrafico(g, { d, refs, nomeAba: A.nome }) });
    /* âncora de duas células (o canto de baixo calculado pelas larguras/alturas) */
    let col = o.c, x = o.dx + o.w;
    while (col < 16383 && x >= largCol(aba, col) && largCol(aba, col) > 0) { x -= largCol(aba, col); col++; }
    let lin = o.l, y = o.dy + o.h;
    while (lin < 1048575 && y >= altLin(aba, lin) && altLin(aba, lin) > 0) { y -= altLin(aba, lin); lin++; }
    ancoras.push(`<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>${o.c}</xdr:col><xdr:colOff>${Math.round(o.dx * EMU)}</xdr:colOff><xdr:row>${o.l}</xdr:row><xdr:rowOff>${Math.round(o.dy * EMU)}</xdr:rowOff></xdr:from>` +
      `<xdr:to><xdr:col>${col}</xdr:col><xdr:colOff>${Math.round(x * EMU)}</xdr:colOff><xdr:row>${lin}</xdr:row><xdr:rowOff>${Math.round(y * EMU)}</xdr:rowOff></xdr:to>` +
      `<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${k + 2}" name="Gráfico ${k + 1}" descr="${escapar(g.titulo || 'Gráfico do EFCdocs', true)}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>` +
      `<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="${NS_C}"><c:chart xmlns:c="${NS_C}" r:id="rIdG${charts.length}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`);
  });
  if (!charts.length) return null;
  const drawing = `${XML_CAB}<xdr:wsDr xmlns:xdr="${NS_XDR}" xmlns:a="${NS_A}" xmlns:r="${NS_R}">${ancoras.join('')}</xdr:wsDr>`;
  const rels = `${XML_CAB}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    charts.map((ch, i) => `<Relationship Id="rIdG${i + 1}" Type="${NS_R}/chart" Target="../charts/chart${ch.n}.xml"/>`).join('') + '</Relationships>';
  return { drawing, rels, charts };
}

/* ============================================================ ler ============================================================ */
const TIPO_XL = { barChart: 'bar', bar3DChart: 'bar', lineChart: 'linha', line3DChart: 'linha', areaChart: 'area', area3DChart: 'area', pieChart: 'pizza', pie3DChart: 'pizza', ofPieChart: 'pizza', doughnutChart: 'rosca', scatterChart: 'dispersao' };
const NAO_TEMOS = ['radarChart', 'bubbleChart', 'stockChart', 'surfaceChart', 'surface3DChart'];

function lerRef(f) {
  const t = desescapar(f || '').trim().replace(/^\(|\)$/g, '');
  if (!t || t.includes(',')) return null; // várias áreas: não dá
  const m = /^(?:'((?:[^']|'')+)'|([^!]+))!(\$?[A-Z]+\$?\d+)(?::(\$?[A-Z]+\$?\d+))?$/i.exec(t);
  if (!m) return null;
  const a = lerChave(m[3].replace(/\$/g, '')), b = lerChave((m[4] || m[3]).replace(/\$/g, ''));
  if (!a || !b) return null;
  return { aba: m[1] != null ? m[1].replace(/''/g, "'") : m[2], l1: Math.min(a.l, b.l), c1: Math.min(a.c, b.c), l2: Math.max(a.l, b.l), c2: Math.max(a.c, b.c) };
}
const textoDoTitulo = (xml) => { const t = tag(xml || '', 'title'); if (!t) return ''; return [...t.dentro.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((m) => desescapar(m[1])).join('').trim(); };

/** Um chart.xml do Excel → g do EFCdocs (ou { fora: motivo }). */
export function gDoXml(xml) {
  const ext = /<efc:g>([\s\S]*?)<\/efc:g>/.exec(xml);
  if (ext) { try { const g = normalizarG(JSON.parse(desescapar(ext[1]))); return { g, efc: true }; } catch { /* segue lendo como Excel */ } }
  if (/<cx:chartSpace/.test(xml)) return { fora: 'tipo novo do Excel (cascata, funil, mapa...)' };
  const pa = tag(xml, 'plotArea');
  if (!pa) return { fora: 'gráfico sem dados' };
  if (NAO_TEMOS.some((n) => pa.dentro.includes('<c:' + n))) return { fora: 'tipo que o EFCdocs ainda não tem (radar, bolhas, ações ou superfície)' };
  const grupos = [];
  for (const nome of Object.keys(TIPO_XL)) for (const gx of tags(pa.dentro, nome)) grupos.push({ nome, x: gx });
  if (!grupos.length) return { fora: 'tipo que o EFCdocs ainda não tem' };
  let t = TIPO_XL[grupos[0].nome];
  const primeiro = grupos[0].x.dentro;
  if (t === 'bar') t = /<c:barDir val="bar"/.test(primeiro) ? 'barras' : 'colunas';
  if (grupos.length > 1) t = grupos.some((gr) => TIPO_XL[gr.nome] === 'bar') && grupos.some((gr) => TIPO_XL[gr.nome] === 'linha') ? 'combinado' : t;
  const empilhado = /<c:grouping val="(stacked|percentStacked)"/.test(primeiro);
  const series = [];
  for (const gr of grupos) for (const s of tags(gr.x.dentro, 'ser')) {
    const val = /<c:(?:val|yVal)>[\s\S]*?<c:f>([\s\S]*?)<\/c:f>/.exec(s.dentro);
    const cat = /<c:(?:cat|xVal)>[\s\S]*?<c:f>([\s\S]*?)<\/c:f>/.exec(s.dentro);
    const nome = /<c:tx>[\s\S]*?<c:f>([\s\S]*?)<\/c:f>/.exec(s.dentro);
    const cor = /<c:spPr>[\s\S]*?<a:srgbClr val="([0-9A-Fa-f]{6})"/.exec(s.dentro);
    series.push({ val: val && lerRef(val[1]), cat: cat && lerRef(cat[1]), nome: nome && lerRef(nome[1]), cor: cor ? '#' + cor[1].toLowerCase() : null });
  }
  if (!series.length || series.some((s) => !s.val)) return { fora: 'os dados não estão em células (valores escritos no gráfico)' };
  const abas = new Set(series.flatMap((s) => [s.val, s.cat, s.nome].filter(Boolean).map((r) => r.aba)));
  if (abas.size > 1) return { fora: 'os dados estão em abas diferentes' };
  const todos = series.flatMap((s) => [s.val, s.cat, s.nome].filter(Boolean));
  const f = { l1: Math.min(...todos.map((r) => r.l1)), c1: Math.min(...todos.map((r) => r.c1)), l2: Math.max(...todos.map((r) => r.l2)), c2: Math.max(...todos.map((r) => r.c2)) };
  const v0 = series[0].val;
  const porLinhas = v0.l1 === v0.l2 && v0.c2 > v0.c1;
  /* dispersão: a coluna de X é a primeira série do EFCdocs */
  const leg = /<c:legend>[\s\S]*?<c:legendPos val="(\w+)"/.exec(xml);
  const g = normalizarG({
    t, titulo: textoDoTitulo(tag(xml, 'chart')?.dentro.split('<c:plotArea')[0] || ''), porLinhas,
    dados: { aba: [...abas][0], fx: `${letraCol(f.c1)}${f.l1 + 1}:${letraCol(f.c2)}${f.l2 + 1}` },
    op: { legenda: !/<c:legend>/.test(xml) ? 'nao' : leg && leg[1] === 'r' ? 'dir' : 'baixo', empilhado, rotulos: /<c:showVal val="1"/.test(pa.dentro), cores: series.map((s) => s.cor).filter(Boolean) },
  });
  if (/3DChart/.test(grupos[0].nome)) g.xl = '3D';
  return { g };
}

/** Lê os gráficos de uma aba (desenho ligado pela rels da aba). Devolve { objs:[...], fora:[{ motivo }] }. */
export async function lerGraficosAba(zip, relsAba, aba, lerRelsDe) {
  const objs = [], fora = [];
  for (const r of relsAba.values()) {
    if (!/drawing$/.test(r.tipo) || !r.alvo) continue;
    const dx = await zip.texto(r.alvo);
    if (!dx) continue;
    const relsD = await lerRelsDe(r.alvo);
    for (const an of [...tags(dx, 'twoCellAnchor'), ...tags(dx, 'oneCellAnchor'), ...tags(dx, 'absoluteAnchor')]) {
      const gf = /<c:chart\b[^>]*r:id="([^"]+)"/.exec(an.dentro);
      if (!gf) { if (/<cx:chart\b|chartex/i.test(an.dentro)) fora.push({ motivo: 'tipo novo do Excel (cascata, funil, mapa...)' }); continue; }
      const rc = relsD.get(gf[1]);
      if (!rc || !rc.alvo) continue;
      const xml = await zip.texto(rc.alvo);
      if (!xml) continue;
      const r2 = gDoXml(xml);
      if (r2.fora) { fora.push({ motivo: r2.fora }); continue; }
      const fr = tag(an.dentro, 'from');
      const num = (x, n) => { const m = new RegExp(`<xdr:${n}>(-?\\d+)</xdr:${n}>`).exec(x || ''); return m ? +m[1] : 0; };
      const l = num(fr && fr.dentro, 'row'), c = num(fr && fr.dentro, 'col');
      const ddx = num(fr && fr.dentro, 'colOff') / EMU, ddy = num(fr && fr.dentro, 'rowOff') / EMU;
      let w = 480, h = 300;
      const ext = /<xdr:ext\b[^>]*cx="(\d+)"[^>]*cy="(\d+)"/.exec(an.dentro);
      const to = tag(an.dentro, 'to');
      if (to) {
        const tl = num(to.dentro, 'row'), tc = num(to.dentro, 'col');
        w = -ddx + num(to.dentro, 'colOff') / EMU; for (let k = c; k < tc; k++) w += largCol(aba, k);
        h = -ddy + num(to.dentro, 'rowOff') / EMU; for (let k = l; k < tl; k++) h += altLin(aba, k);
      } else if (ext) { w = +ext[1] / EMU; h = +ext[2] / EMU; }
      objs.push({ tipo: 'grafico', l, c, dx: Math.max(0, ddx), dy: Math.max(0, ddy), w: Math.max(180, Math.round(w)), h: Math.max(120, Math.round(h)), g: r2.g, nomeAbaDados: r2.efc ? null : r2.g.dados.aba });
    }
  }
  void atributos;
  return { objs, fora };
}
