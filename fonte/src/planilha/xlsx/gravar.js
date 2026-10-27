/* EFCdocs — salvar a planilha como arquivo do Excel (.xlsx).
   Vai: valores, fórmulas (com o valor já calculado), estilos, larguras, alturas, ocultas, mescladas, congelar painéis,
   cor e abas ocultas, nomes definidos e matrizes que derramam (matriz dinâmica do Excel 365).
   O Excel recalcula tudo ao abrir (fullCalcOnLoad). */
import { criarZip } from './zip.js';
import { escapar, XML_CAB } from './xml.js';
import { gravarEstilos } from './estilos.js';
import { porPrefixos } from './formulas.js';
import { chave, letraCol, lerChave } from '../ref.js';
import { valorGuardado, LARG_PADRAO, ALT_PADRAO } from '../modelo.js';
import { ehErro } from '../valores.js';
import { Motor } from '../motor.js';
import { POR_EN } from '../nomesFuncoes.js';
import { gravarValidacoes, gravarCondicionais, gravarComentarios } from './extras.js';

const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
const CT = 'application/vnd.openxmlformats-officedocument.spreadsheetml.';

/* fórmulas que o Excel antigo não entende sem matriz dinâmica */
const RX_MATRIZ = /(^|[^\w.])(FILTER|UNIQUE|SORT|SORTBY|SEQUENCE|TRANSPOSE|RANDARRAY|XLOOKUP|XMATCH|TEXTSPLIT|VSTACK|HSTACK|TOCOL|TOROW|CHOOSECOLS|CHOOSEROWS|TAKE|DROP|EXPAND|WRAPCOLS|WRAPROWS|FREQUENCY|MMULT|LET|LAMBDA|MAP|REDUCE|SCAN|BYROW|BYCOL|MAKEARRAY|TRIMRANGE|SINGLE)\(/i;

const larguraExcel = (px) => Math.max(0, Math.trunc((px / 7) * 256) / 256);
const ptDe = (px) => Math.round(px * 0.75 * 100) / 100;
const numTx = (n) => (Number.isFinite(n) ? String(n) : '0');
const hexArgb = (h) => 'FF' + String(h).replace('#', '').toUpperCase().padStart(6, '0').slice(-6);

/**
 * conteudo da planilha → { bytes: Uint8Array, avisos: [] }.
 * motor: o motor de cálculo já carregado (para os valores das fórmulas); se faltar, calcula aqui.
 */
export async function gravarXlsx(conteudo, motor, { agora = new Date(), titulo = '' } = {}) {
  const c = conteudo;
  const m = motor || new Motor(c);
  const avisos = [];
  const textos = [], idxTexto = new Map();
  const ss = (t) => { let i = idxTexto.get(t); if (i == null) { i = textos.length; textos.push(t); idxTexto.set(t, i); } return i; };
  let usaMatriz = false;
  let assinaturas = 0;
  const novas = new Set(); // funções do Excel 2019/2021/365 (PL21: avisar quem vai abrir num Excel antigo)
  const partes = [];
  const dxfs = []; // estilos das regras de formatação condicional (v0.5.1)
  const notas = []; // comentários por aba: { ia, comments, vml }
  let conversas = 0;
  const abas = c.ordem.map((id) => c.abas[id]);
  const primeiraVisivel = Math.max(0, abas.findIndex((a) => !a.oculta));

  abas.forEach((aba, ia) => {
    const id = aba.id || c.ordem[ia];
    if (aba.objs && aba.objs.length) assinaturas += aba.objs.length;
    /* junta as células por linha */
    const linhas = new Map();
    const por = (l, cc, x) => { let L = linhas.get(l); if (!L) { L = new Map(); linhas.set(l, L); } L.set(cc, x); };
    for (const [k, cel] of Object.entries(aba.cel || {})) {
      const p = lerChave(k);
      if (!p || !cel) continue;
      if (cel.v === undefined && cel.f == null && !cel.s) continue;
      por(p.l, p.c, { cel });
    }
    /* valores das áreas derramadas (o Excel guarda o valor em cada célula da área) */
    const spills = (m.spillDe && m.spillDe[id]) || new Map();
    for (const s of spills.values()) {
      for (let i = s.l1; i <= s.l2; i++) for (let j = s.c1; j <= s.c2; j++) {
        if (i === s.l1 && j === s.c1) continue;
        const L = linhas.get(i);
        const atual = L && L.get(j);
        const v = s.m.d[i - s.l1][j - s.c1];
        por(i, j, { cel: atual ? atual.cel : {}, derramado: v == null ? 0 : v });
      }
    }
    for (const k of Object.keys(aba.alt || {})) if (!linhas.has(+k)) linhas.set(+k, new Map());
    for (const k of Object.keys(aba.ocL || {})) if (aba.ocL[k] && !linhas.has(+k)) linhas.set(+k, new Map());

    let lMax = 0, cMax = 0;
    const corpo = [];
    for (const l of [...linhas.keys()].sort((a, b) => a - b)) {
      const L = linhas.get(l);
      let atr = ` r="${l + 1}"`;
      const alt = aba.alt && aba.alt[l];
      if (aba.ocL && aba.ocL[l]) atr += ' hidden="1"';
      if (alt != null && alt !== ALT_PADRAO) atr += ` ht="${ptDe(alt)}" customHeight="1"`;
      const cels = [];
      for (const cc of [...L.keys()].sort((a, b) => a - b)) {
        const { cel, derramado } = L.get(cc);
        const r = letraCol(cc) + (l + 1);
        const s = cel.s ? ` s="${cel.s}"` : '';
        if (l > lMax) lMax = l;
        if (cc > cMax) cMax = cc;
        const valorXml = (v) => {
          if (v == null) return { t: '', v: '' };
          if (ehErro(v)) return { t: ' t="e"', v: `<v>${escapar(v.cod)}</v>` };
          if (typeof v === 'number') return { t: '', v: `<v>${numTx(v)}</v>` };
          if (typeof v === 'boolean') return { t: ' t="b"', v: `<v>${v ? 1 : 0}</v>` };
          return null;
        };
        if (derramado !== undefined) {
          const x = valorXml(derramado);
          if (x) cels.push(`<c r="${r}"${s}${x.t}>${x.v}</c>`);
          else cels.push(`<c r="${r}"${s} t="s"><v>${ss(String(derramado))}</v></c>`);
          continue;
        }
        if (cel.f != null) {
          for (const mm of cel.f.matchAll(/([A-Z][A-Z0-9.]*)\(/g)) { const meta = POR_EN[mm[1]]; if (meta && (meta.v === '21' || meta.v === '19') && !meta.oculta) novas.add(meta.pt); }
          let v;
          try { v = m.valor(id, l, cc); } catch { v = null; }
          if (v == null) v = 0;
          const area = spills.get(l * 16384 + cc);
          const ehMatriz = !!area || !!cel.da || (!cel.lg && RX_MATRIZ.test(cel.f)) || (!cel.lg && /[A-Z]\$?\d+#/.test(cel.f));
          const f = escapar(porPrefixos(cel.f));
          let fx;
          if (ehMatriz) {
            usaMatriz = true;
            const ref = area ? `${r}:${letraCol(area.c2)}${area.l2 + 1}` : r;
            fx = `<f t="array" ref="${ref}">${f}</f>`;
          } else fx = `<f>${f}</f>`;
          const x = valorXml(v);
          const cm = ehMatriz ? ' cm="1"' : '';
          if (x) cels.push(`<c r="${r}"${s}${x.t}${cm}>${fx}${x.v}</c>`);
          else cels.push(`<c r="${r}"${s} t="str"${cm}>${fx}<v>${escapar(String(v))}</v></c>`);
          continue;
        }
        const v = valorGuardado(cel);
        if (v == null) { if (cel.s) cels.push(`<c r="${r}"${s}/>`); continue; }
        const x = valorXml(v);
        if (x) cels.push(`<c r="${r}"${s}${x.t}>${x.v}</c>`);
        else cels.push(`<c r="${r}"${s} t="s"><v>${ss(String(v))}</v></c>`);
      }
      corpo.push(`<row${atr}>${cels.join('')}</row>`);
    }

    /* colunas */
    const colunas = new Map();
    for (const [k, w] of Object.entries(aba.larg || {})) colunas.set(+k, { w });
    for (const [k, o] of Object.entries(aba.ocC || {})) if (o) colunas.set(+k, { ...(colunas.get(+k) || {}), oculta: true });
    const cols = [...colunas.keys()].sort((a, b) => a - b).map((cc) => {
      const x = colunas.get(cc);
      const w = x.w != null ? x.w : LARG_PADRAO;
      return `<col min="${cc + 1}" max="${cc + 1}" width="${larguraExcel(w)}" customWidth="1"${x.oculta ? ' hidden="1"' : ''}/>`;
    });

    let cab = '';
    if (aba.cor) cab += `<sheetPr><tabColor rgb="${hexArgb(aba.cor)}"/></sheetPr>`;
    cab += `<dimension ref="A1${lMax || cMax ? ':' + letraCol(cMax) + (lMax + 1) : ''}"/>`;
    let vista = `<sheetView workbookViewId="0"${ia === primeiraVisivel ? ' tabSelected="1"' : ''}>`;
    const cg = aba.cong;
    if (cg && (cg.l > 0 || cg.c > 0)) {
      const painel = cg.l > 0 && cg.c > 0 ? 'bottomRight' : cg.l > 0 ? 'bottomLeft' : 'topRight';
      vista += `<pane${cg.c > 0 ? ` xSplit="${cg.c}"` : ''}${cg.l > 0 ? ` ySplit="${cg.l}"` : ''} topLeftCell="${letraCol(cg.c || 0)}${(cg.l || 0) + 1}" activePane="${painel}" state="frozen"/>`;
      vista += `<selection pane="${painel}" activeCell="${letraCol(cg.c || 0)}${(cg.l || 0) + 1}" sqref="${letraCol(cg.c || 0)}${(cg.l || 0) + 1}"/>`;
    }
    vista += '</sheetView>';
    cab += `<sheetViews>${vista}</sheetViews>`;
    cab += `<sheetFormatPr defaultColWidth="${larguraExcel(LARG_PADRAO)}" defaultRowHeight="${ptDe(ALT_PADRAO)}" customHeight="1"/>`;
    if (cols.length) cab += `<cols>${cols.join('')}</cols>`;
    let fim = '';
    const mesc = (aba.mesc || []).filter((t) => /^[A-Z]+\d+:[A-Z]+\d+$/.test(t));
    if (mesc.length) fim += `<mergeCells count="${mesc.length}">${mesc.map((t) => `<mergeCell ref="${t}"/>`).join('')}</mergeCells>`;
    fim += gravarCondicionais(aba.cf, dxfs);
    fim += gravarValidacoes(aba.val);
    fim += '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>';
    const co = gravarComentarios(aba.com, ia);
    if (co) { fim += '<legacyDrawing r:id="rId1"/>'; notas.push({ ia, ...co }); conversas += co.conversas; }
    partes.push({
      nome: `xl/worksheets/sheet${ia + 1}.xml`,
      dados: `${XML_CAB}<worksheet xmlns="${NS}" xmlns:r="${NS_R}">${cab}<sheetData>${corpo.join('')}</sheetData>${fim}</worksheet>`,
    });
  });

  /* livro */
  const nomes = Object.values(c.nomes || {}).filter((n) => n && n.n && n.ref);
  const wb = `${XML_CAB}<workbook xmlns="${NS}" xmlns:r="${NS_R}"><workbookPr/>` +
    `<bookViews><workbookView activeTab="${primeiraVisivel}"/></bookViews><sheets>` +
    abas.map((a, i) => `<sheet name="${escapar(a.nome, true)}" sheetId="${i + 1}"${a.oculta ? ' state="hidden"' : ''} r:id="rId${i + 1}"/>`).join('') +
    '</sheets>' +
    (nomes.length ? `<definedNames>${nomes.map((n) => `<definedName name="${escapar(n.n, true)}">${escapar(porPrefixos(n.ref))}</definedName>`).join('')}</definedNames>` : '') +
    '<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>';
  const nA = abas.length;
  const relsWb = `${XML_CAB}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    abas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${REL}worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
    `<Relationship Id="rId${nA + 1}" Type="${REL}styles" Target="styles.xml"/>` +
    `<Relationship Id="rId${nA + 2}" Type="${REL}sharedStrings" Target="sharedStrings.xml"/>` +
    (usaMatriz ? `<Relationship Id="rId${nA + 3}" Type="${REL}sheetMetadata" Target="metadata.xml"/>` : '') +
    '</Relationships>';
  const sst = `${XML_CAB}<sst xmlns="${NS}" count="${textos.length}" uniqueCount="${textos.length}">` +
    textos.map((t) => `<si><t${/^\s|\s$|\n/.test(t) ? ' xml:space="preserve"' : ''}>${escapar(t)}</t></si>`).join('') + '</sst>';
  const metadata = `${XML_CAB}<metadata xmlns="${NS}" xmlns:xda="http://schemas.microsoft.com/office/spreadsheetml/2017/dynamicarray">` +
    '<metadataTypes count="1"><metadataType name="XLDAPR" minSupportedVersion="120000" copy="1" pasteAll="1" pasteValues="1" merge="1" splitFirst="1" rowColShift="1" clearFormats="1" clearComments="1" assign="1" coerce="1" cellMeta="1"/></metadataTypes>' +
    '<futureMetadata name="XLDAPR" count="1"><bk><extLst><ext uri="{bdbb8cdc-fa1e-496e-a857-3c3f30c029c3}"><xda:dynamicArrayProperties fDynamic="1" fCollapsed="0"/></ext></extLst></bk></futureMetadata>' +
    '<cellMetadata count="1"><bk><rc t="1" v="0"/></bk></cellMetadata></metadata>';
  const quando = agora.toISOString().replace(/\.\d+Z$/, 'Z');
  const core = `${XML_CAB}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
    (titulo ? `<dc:title>${escapar(titulo)}</dc:title>` : '') +
    `<dc:creator>EFCdocs</dc:creator><cp:lastModifiedBy>EFCdocs</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${quando}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${quando}</dcterms:modified></cp:coreProperties>`;
  const app = `${XML_CAB}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>EFCdocs</Application></Properties>`;
  const tipos = `${XML_CAB}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
    (notas.length ? '<Default Extension="vml" ContentType="application/vnd.openxmlformats-officedocument.vmlDrawing"/>' : '') +
    `<Override PartName="/xl/workbook.xml" ContentType="${CT}sheet.main+xml"/>` +
    abas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="${CT}worksheet+xml"/>`).join('') +
    `<Override PartName="/xl/styles.xml" ContentType="${CT}styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="${CT}sharedStrings+xml"/>` +
    (usaMatriz ? `<Override PartName="/xl/metadata.xml" ContentType="${CT}sheetMetadata+xml"/>` : '') +
    notas.map((n) => `<Override PartName="/xl/comments${n.ia + 1}.xml" ContentType="${CT}comments+xml"/>`).join('') +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>';
  const relsRaiz = `${XML_CAB}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="${REL}officeDocument" Target="xl/workbook.xml"/>` +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
    `<Relationship Id="rId3" Type="${REL}extended-properties" Target="docProps/app.xml"/></Relationships>`;

  const arquivos = [
    { nome: '[Content_Types].xml', dados: tipos },
    { nome: '_rels/.rels', dados: relsRaiz },
    { nome: 'docProps/core.xml', dados: core },
    { nome: 'docProps/app.xml', dados: app },
    { nome: 'xl/workbook.xml', dados: wb },
    { nome: 'xl/_rels/workbook.xml.rels', dados: relsWb },
    { nome: 'xl/styles.xml', dados: gravarEstilos(c.estilos || [{}], c.fonteBase || 'Calibri', dxfs) },
    { nome: 'xl/sharedStrings.xml', dados: sst },
    ...(usaMatriz ? [{ nome: 'xl/metadata.xml', dados: metadata }] : []),
    ...partes,
    ...notas.flatMap((n) => [
      { nome: `xl/comments${n.ia + 1}.xml`, dados: n.comments },
      { nome: `xl/drawings/vmlDrawing${n.ia + 1}.vml`, dados: n.vml },
      { nome: `xl/worksheets/_rels/sheet${n.ia + 1}.xml.rels`, dados: `${XML_CAB}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}vmlDrawing" Target="../drawings/vmlDrawing${n.ia + 1}.vml"/><Relationship Id="rId2" Type="${REL}comments" Target="../comments${n.ia + 1}.xml"/></Relationships>` },
    ]),
  ];
  if (conversas) avisos.push(`${conversas === 1 ? 'A conversa de comentários vai' : `As ${conversas} conversas de comentários vão`} como anotação comum no Excel (o texto e as respostas ficam juntos na mesma anotação).`);
  if (assinaturas) avisos.push(`${assinaturas === 1 ? 'A assinatura' : `As ${assinaturas} assinaturas`} sobre a planilha não ${assinaturas === 1 ? 'vai' : 'vão'} no Excel (chega com o Documento, na v0.7.0).`);
  if (novas.size) {
    const l = [...novas].sort();
    avisos.push(`Usa ${l.slice(0, 4).join(', ')}${l.length > 4 ? ` e mais ${l.length - 4}` : ''}: ${l.length === 1 ? 'só funciona' : 'só funcionam'} no Excel 2021 ou no Microsoft 365.`);
  }
  const bytes = await criarZip(arquivos, agora);
  void chave;
  return { bytes, avisos };
}
