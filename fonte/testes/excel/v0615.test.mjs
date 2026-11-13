/* v0.6.15: o que a rede achou nas cópias novas do Elias (13/11), reproduzido com uma pasta inventada. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { gravarXlsx } from '../../src/planilha/xlsx/gravar.js';
import { lerZip, criarZip } from '../../src/planilha/xlsx/zip.js';
import { normalizarPlanilha } from '../../src/planilha/modelo.js';
import { estiloVisto } from '../../src/planilha/grade.js';

const enc = (s) => new TextEncoder().encode(s);
const dec = (d) => new TextDecoder().decode(d);
const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NR = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

/** Pasta com uma aba: "esconder as linhas de baixo" (zeroHeight), linhas 4 a 6 vazias e visíveis sem altura própria;
    borda com o lado de cima azul-claro e o de baixo azul-escuro (cores do tema com clareamento). */
async function pasta() {
  const tema = '<?xml version="1.0" encoding="UTF-8"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="T"><a:themeElements><a:clrScheme name="T"><a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="0E2841"/></a:dk2><a:lt2><a:srgbClr val="E8E8E8"/></a:lt2><a:accent1><a:srgbClr val="156082"/></a:accent1><a:accent2><a:srgbClr val="E97132"/></a:accent2><a:accent3><a:srgbClr val="196B24"/></a:accent3><a:accent4><a:srgbClr val="0F9ED5"/></a:accent4><a:accent5><a:srgbClr val="A02B93"/></a:accent5><a:accent6><a:srgbClr val="4EA72E"/></a:accent6><a:hlink><a:srgbClr val="467886"/></a:hlink><a:folHlink><a:srgbClr val="96607D"/></a:folHlink></a:clrScheme><a:fontScheme name="T"><a:majorFont><a:latin typeface="Aptos"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="T"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>';
  const estilos = `<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="${NS}"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>`
    + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
    + '<borders count="2"><border/><border><left/><right/><top style="thin"><color theme="4" tint="0.39997558519241921"/></top><bottom style="thin"><color theme="4"/></bottom><diagonal/></border></borders>'
    + '<cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1"/></cellXfs></styleSheet>';
  const aba = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="${NS}"><sheetFormatPr defaultRowHeight="15" zeroHeight="1"/><sheetData>`
    + '<row r="1"><c r="A1" t="inlineStr"><is><t>Fruto</t></is></c></row><row r="2"><c r="A2" s="1" t="inlineStr"><is><t>mamão</t></is></c></row><row r="3"><c r="A3"><v>3</v></c></row>'
    + '<row r="4"/><row r="5"/><row r="6"/></sheetData></worksheet>';
  return criarZip([
    { nome: '[Content_Types].xml', dados: enc('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/></Types>') },
    { nome: '_rels/.rels', dados: enc(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NR}/officeDocument" Target="xl/workbook.xml"/></Relationships>`) },
    { nome: 'xl/_rels/workbook.xml.rels', dados: enc(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NR}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${NR}/styles" Target="styles.xml"/><Relationship Id="rId3" Type="${NR}/theme" Target="theme/theme1.xml"/></Relationships>`) },
    { nome: 'xl/workbook.xml', dados: enc(`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="${NS}" xmlns:r="${NR}"><sheets><sheet name="Tendência" sheetId="1" r:id="rId1"/></sheets></workbook>`) },
    { nome: 'xl/styles.xml', dados: enc(estilos) },
    { nome: 'xl/theme/theme1.xml', dados: enc(tema) },
    { nome: 'xl/worksheets/sheet1.xml', dados: enc(aba) },
  ]);
}
const ler = async (b) => normalizarPlanilha((await lerXlsx(b)).conteudo);
const parte = async (bytes, n) => dec(await lerZip(bytes).bytes(n));

test('v0.6.15 (D-58): com "esconder as linhas de baixo", as linhas vazias e visíveis depois do último dado continuam visíveis salvando duas vezes', async () => {
  const c1 = await ler(await pasta());
  const ocultas = (c) => Object.keys(c.abas[c.ordem[0]].ocL || {}).map(Number).sort((a, b) => a - b);
  assert.equal(ocultas(c1)[0], 6, 'a primeira oculta é a linha 7');
  const g1 = (await gravarXlsx(c1)).bytes;
  const c2 = await ler(g1);
  const g2 = (await gravarXlsx(c2)).bytes;
  const x = await parte(g2, 'xl/worksheets/sheet1.xml');
  for (const r of [4, 5, 6]) assert.match(x, new RegExp(`<row r="${r}"`), `linha ${r} listada (senão o Excel a esconde)`);
  assert.equal(ocultas(await ler(g2))[0], 6);
});

test('v0.6.15 (D-57): borda com uma cor em cada lado volta com as duas cores e a grade desenha cada lado com a sua', async () => {
  const c = await ler(await pasta()); const id = c.ordem[0]; const a = c.abas[id];
  const e = c.estilos[a.cel.A2.s];
  assert.match(e.bdcs.t, /^#[0-9a-f]{6}$/, 'cor de cima guardada');
  assert.notEqual(e.bdcs.t, e.bdcs.b);
  assert.equal(e.bdcs.b, '#156082');
  const st = await parte((await gravarXlsx(c)).bytes, 'xl/styles.xml');
  assert.match(st, new RegExp(`<top style="thin"><color rgb="FF${e.bdcs.t.slice(1).toUpperCase()}"/></top><bottom style="thin"><color rgb="FF156082"/></bottom>`));
  assert.equal(estiloVisto(c, a.cel.A2, null, id, 1, 0).bdcs.b, '#156082');
});
