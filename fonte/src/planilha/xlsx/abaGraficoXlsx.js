/* Vértice Docs v0.6.18 (D-43) — aba de gráfico (chartsheet) do Excel.
   No app ela é uma aba comum marcada (aba.grafico), com o gráfico preso em A1 e sem linhas de grade. Ao salvar como Excel,
   se continua só com um gráfico (nenhuma célula, nenhum outro objeto, nenhum comentário), volta como aba de gráfico:
   xl/chartsheets/sheetN.xml, o desenho com o gráfico ocupando a aba e as ligações do livro trocadas. Se ganhou células ou
   outros objetos, vai como aba comum com o gráfico (nada se perde) e o aviso diz isso.
   Recebe a lista de partes já montada por gravar.js (a aba i está em xl/worksheets/sheet{i+1}.xml) e mexe nela. */
import { XML_CAB, escapar } from './xml.js';

const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const CT_WS = 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml';
const CT_CS = 'application/vnd.openxmlformats-officedocument.spreadsheetml.chartsheet+xml';
const EMU = 9525;
const hexArgb = (h) => 'FF' + String(h).replace('#', '').toUpperCase().padStart(6, '0').slice(-6);

/** Ao ler: o gráfico da aba de gráfico fica no canto, do tamanho que o Excel guardou (ou de uma página deitada, se veio sem tamanho). */
export function noCantoDaAbaDeGrafico(o) {
  if (!o || o.tipo !== 'grafico') return;
  Object.assign(o, { l: 0, c: 0, dx: 0, dy: 0 });
  if (!(o.w >= 200 && o.h >= 150)) { o.w = 960; o.h = 600; }
}

/** A aba ainda é só um gráfico? */
export function continuaAbaDeGrafico(aba) {
  if (!aba || !aba.grafico) return false;
  if (Object.values(aba.cel || {}).some((x) => x && (x.v !== undefined && x.v !== '' || x.f != null))) return false;
  if (aba.com && Object.keys(aba.com).length) return false;
  const objs = aba.objs || [];
  return objs.length === 1 && objs[0].tipo === 'grafico';
}

/** Troca as abas de gráfico nas partes. Devolve { voltaram, viraramComuns: [nome] }. */
export function virarAbasDeGrafico(arquivos, abas, primeiraVisivel = 0) {
  const res = { voltaram: 0, viraramComuns: [] };
  const por = new Map(arquivos.map((a) => [a.nome, a]));
  abas.forEach((aba, ia) => {
    if (!aba || !aba.grafico) return;
    if (!continuaAbaDeGrafico(aba)) { res.viraramComuns.push(aba.nome); return; }
    const pWs = `xl/worksheets/sheet${ia + 1}.xml`, pDr = `xl/drawings/drawing${ia + 1}.xml`;
    const ws = por.get(pWs), dr = por.get(pDr);
    if (!ws || !dr) { res.viraramComuns.push(aba.nome); return; }
    /* o desenho: o quadro do gráfico (comum ou do Excel 2016) ocupa a aba toda, a partir do canto */
    const dx = String(dr.dados);
    const an = /<xdr:(twoCellAnchor|oneCellAnchor|absoluteAnchor)\b[^>]*>([\s\S]*?)<\/xdr:\1>/.exec(dx);
    if (!an) { res.viraramComuns.push(aba.nome); return; }
    const quadro = an[2].replace(/^\s*<xdr:from>[\s\S]*?<\/xdr:from>\s*(?:<xdr:to>[\s\S]*?<\/xdr:to>\s*)?|^\s*<xdr:pos\b[^>]*\/>\s*/, '').replace(/^\s*<xdr:ext\b[^>]*\/>\s*/, '').replace(/<xdr:clientData\b[^>]*\/>\s*$/, '');
    const o = aba.objs[0];
    const ext = `<xdr:ext cx="${Math.round(Math.max(60, o.w || 480) * EMU)}" cy="${Math.round(Math.max(40, o.h || 300) * EMU)}"/>`;
    dr.dados = dx.slice(0, an.index) + `<xdr:absoluteAnchor><xdr:pos x="0" y="0"/>${ext}${quadro}<xdr:clientData/></xdr:absoluteAnchor>` + dx.slice(an.index + an[0].length);
    /* a parte da aba */
    const pCs = `xl/chartsheets/sheet${ia + 1}.xml`;
    ws.nome = pCs; por.delete(pWs); por.set(pCs, ws);
    ws.dados = `${XML_CAB}<chartsheet xmlns="${NS}" xmlns:r="${NS_R}">${aba.cor ? `<sheetPr><tabColor rgb="${hexArgb(aba.cor)}"/></sheetPr>` : ''}` +
      `<sheetViews><sheetView zoomToFit="1" workbookViewId="0"${ia === primeiraVisivel ? ' tabSelected="1"' : ''}/></sheetViews>` +
      '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/><pageSetup orientation="landscape"/><drawing r:id="rId3"/></chartsheet>';
    /* as ligações da aba (só o desenho fica) */
    const rWs = por.get(`xl/worksheets/_rels/sheet${ia + 1}.xml.rels`);
    if (rWs) {
      rWs.nome = `xl/chartsheets/_rels/sheet${ia + 1}.xml.rels`;
      rWs.dados = String(rWs.dados).replace(/<Relationship\b(?![^>]*\/drawing")[^>]*\/>/g, '');
    }
    /* o livro: a ligação, o tipo de conteúdo e os nomes de impressão (que aba de gráfico não tem) */
    const rWb = por.get('xl/_rels/workbook.xml.rels');
    if (rWb) rWb.dados = String(rWb.dados).replace(`Type="${NS_R}/worksheet" Target="worksheets/sheet${ia + 1}.xml"`, `Type="${NS_R}/chartsheet" Target="chartsheets/sheet${ia + 1}.xml"`);
    const tp = por.get('[Content_Types].xml');
    if (tp) tp.dados = String(tp.dados).replace(`<Override PartName="/${pWs}" ContentType="${CT_WS}"/>`, `<Override PartName="/${pCs}" ContentType="${CT_CS}"/>`);
    const wb = por.get('xl/workbook.xml');
    if (wb) wb.dados = String(wb.dados).replace(new RegExp(`<definedName name="_xlnm\\.[^"]*" localSheetId="${ia}"[^>]*>[^<]*</definedName>`, 'g'), '').replace('<definedNames></definedNames>', '');
    res.voltaram++;
  });
  void escapar;
  return res;
}
