/* v0.6.14 "Estável nas planilhas reais": o que a rede de conferentes achou nas planilhas reais do Elias (cópias anonimizadas
   e o arquivo real que ele testou no Excel), reproduzido com uma pasta inventada montada aqui mesmo. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { gravarXlsx } from '../../src/planilha/xlsx/gravar.js';
import { lerZip, criarZip } from '../../src/planilha/xlsx/zip.js';
import { normalizarPlanilha, estiloHerdado } from '../../src/planilha/modelo.js';
import { estrutura } from '../../src/planilha/operacoes.js';
import { limparForma, assinaturaForma, formaSemMudanca } from '../../src/planilha/formas.js';
import { estiloVisto } from '../../src/planilha/grade.js';

const enc = (s) => new TextEncoder().encode(s);
const dec = (d) => new TextDecoder().decode(d);
const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NR = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

/** Pasta inventada: Normal com letra 10 e "centralizado no meio", coluna C formatada inteira (amarelo, data), colunas F até o fim
    com estilo, linha 4 formatada inteira, alinhamentos que a grade não desenha, nomes que só valem numa aba. */
async function pasta() {
  const estilos = `<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="${NS}"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts>`
    + '<fonts count="2"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="10"/><name val="Calibri"/></font></fonts>'
    + '<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFFF00"/></patternFill></fill>'
    + '<fill><gradientFill degree="90"><stop position="0"><color rgb="FF0070C0"/></stop><stop position="1"><color rgb="FFFFFFFF"/></stop></gradientFill></fill></fills>'
    + '<borders count="2"><border/><border><left style="dotted"/><right style="thin"/><top/><bottom style="double"/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"><alignment vertical="center"/></xf></cellStyleXfs>'
    + '<cellXfs count="9">'
    + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment vertical="center"/></xf>' // 0 Normal
    + '<xf numFmtId="164" fontId="0" fillId="2" borderId="0" xfId="0" applyFill="1" applyNumberFormat="1"/>' // 1 coluna C
    + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' // 2 linha 4
    + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="justify" vertical="center"/></xf>' // 3
    + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="left" indent="2"/></xf>' // 4
    + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment textRotation="90" shrinkToFit="1"/></xf>' // 5
    + '<xf numFmtId="0" fontId="0" fillId="2" borderId="0" xfId="0" applyFill="1"/>' // 6 colunas F em diante
    + '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>' // 7 bordas pontilhada e dupla
    + '<xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1"/>' // 8 degradê
    + '</cellXfs></styleSheet>';
  const aba1 = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="${NS}" xmlns:r="${NR}"><sheetFormatPr defaultRowHeight="12.75"/>`
    + '<cols><col min="3" max="3" width="12" style="1" customWidth="1"/><col min="4" max="4" width="9.140625" customWidth="1"/><col min="6" max="16384" width="9.140625" style="6"/></cols>'
    + '<sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>sem estilo</t></is></c><c r="B1" s="3" t="inlineStr"><is><t>justificado</t></is></c><c r="C1" s="1"><v>46000</v></c></row>'
    + '<row r="2"><c r="B2" s="4" t="inlineStr"><is><t>recuo</t></is></c><c r="D2" s="5" t="inlineStr"><is><t>girado</t></is></c></row>'
    + '<row r="4" s="2" customFormat="1"><c r="A4" s="2" t="inlineStr"><is><t>linha</t></is></c></row>'
    + '<row r="6"><c r="A6"><v>1</v></c></row></sheetData></worksheet>';
  const aba2 = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="${NS}"><cols><col min="3" max="16383" width="9" hidden="1"/><col min="16384" max="16384" width="40" customWidth="1"/></cols><sheetData><row r="1"><c r="A1"><v>2</v></c><c r="B1" s="7"><v>3</v></c><c r="C1" s="8"><v>4</v></c></row></sheetData></worksheet>`;
  const wb = `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="${NS}" xmlns:r="${NR}"><sheets><sheet name="Dados" sheetId="1" r:id="rId1"/><sheet name="Outra" sheetId="2" r:id="rId2"/></sheets>`
    + '<definedNames><definedName name="SoAqui" localSheetId="1">Outra!$A$1</definedName><definedName name="Periodo" localSheetId="0">Dados!$A$1</definedName>'
    + '<definedName name="Periodo">Dados!$A$6</definedName></definedNames></workbook>';
  return criarZip([
    { nome: '[Content_Types].xml', dados: enc('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>') },
    { nome: '_rels/.rels', dados: enc(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NR}/officeDocument" Target="xl/workbook.xml"/></Relationships>`) },
    { nome: 'xl/_rels/workbook.xml.rels', dados: enc(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NR}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${NR}/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="${NR}/styles" Target="styles.xml"/></Relationships>`) },
    { nome: 'xl/workbook.xml', dados: enc(wb) },
    { nome: 'xl/styles.xml', dados: enc(estilos) },
    { nome: 'xl/worksheets/sheet1.xml', dados: enc(aba1) },
    { nome: 'xl/worksheets/sheet2.xml', dados: enc(aba2) },
  ]);
}
const ler = async () => normalizarPlanilha((await lerXlsx(await pasta())).conteudo);
const parte = async (bytes, n) => dec(await lerZip(bytes).bytes(n));
const idDe = (c, nome) => c.ordem.find((id) => c.abas[id].nome === nome);

test('v0.6.14 (D-46): célula sem s="" usa o Normal do arquivo; justificado, recuo, texto girado e reduzir para caber voltam iguais', async () => {
  const c = await ler(); const a = c.abas[idDe(c, 'Dados')];
  assert.deepEqual(c.estilos[a.cel.A1.s], { tam: 10, av: 'm' }, 'A1 sem s="" tem a letra 10 e o meio do Normal');
  assert.equal(c.estilos[a.cel.B1.s].alx, 'justify');
  const st = await parte((await gravarXlsx(c)).bytes, 'xl/styles.xml');
  assert.match(st, /<alignment horizontal="justify" vertical="center"\/>/);
  assert.match(st, /<alignment horizontal="left" indent="2"\/>/);
  assert.match(st, /<alignment textRotation="90" shrinkToFit="1"\/>/);
  /* trocou o alinhamento no app: o justificado não volta por cima da escolha */
  const e = c.estilos[a.cel.B1.s]; c.estilos.push({ ...e, al: 'c' }); a.cel.B1 = { ...a.cel.B1, s: c.estilos.length - 1 };
  assert.match(await parte((await gravarXlsx(c)).bytes, 'xl/styles.xml'), /<alignment horizontal="center" vertical="center"\/>/);
});

test('v0.6.14 (D-48): a letra do Normal (10) volta como letra do arquivo, e a de 11 fica marcada à parte', async () => {
  const c = await ler();
  assert.equal(c.tamBase, 10);
  const st = await parte((await gravarXlsx(c)).bytes, 'xl/styles.xml');
  assert.match(st, /<fonts count="\d+"><font><sz val="10"\/>/, 'a fonte 0 é a de 10');
  const sem = await parte((await gravarXlsx({ ...c, tamBase: undefined })).bytes, 'xl/styles.xml');
  assert.match(sem, /<fonts count="\d+"><font><sz val="11"\/>/, 'pasta feita no app continua com 11');
});

test('v0.6.14 (D-47): coluna e linha formatadas inteiras: a vazia mostra, a nova herda, o estilo anda junto e volta ao salvar', async () => {
  const c = await ler(); const id = idDe(c, 'Dados'); const a = c.abas[id];
  assert.ok(a.estC[2], 'coluna C formatada');
  assert.deepEqual(a.estCFim, { c: Math.max(5, a.estCFim.c), s: a.estCFim.s }, 'F até o fim fica como "até o fim"');
  assert.equal(c.estilos[a.estC[2]].fundo, '#ffff00');
  assert.equal(c.estilos[a.estL[3]].b, true, 'linha 4 em negrito');
  /* a vazia mostra o estilo herdado (a linha vale mais que a coluna, como no Excel) */
  assert.equal(estiloVisto(c, undefined, null, id, 9, 2).fundo, '#ffff00');
  assert.equal(estiloVisto(c, undefined, null, id, 3, 2).b, true);
  assert.equal(estiloHerdado(a, 9, 30), a.estCFim.s, 'coluna AE herda o "até o fim"');
  /* salvar: <col style> e <row s customFormat> */
  let x = await parte((await gravarXlsx(c)).bytes, 'xl/worksheets/sheet1.xml');
  assert.match(x, new RegExp(`<col min="3" max="3" width="[\\d.]+" style="${a.estC[2]}" customWidth="1"/>`));
  assert.match(x, new RegExp(`<col min="\\d+" max="16384" width="[\\d.]+" style="${a.estCFim.s}"/>`));
  assert.match(x, new RegExp(`<row r="4" s="${a.estL[3]}" customFormat="1">`));
  /* inserir uma coluna antes da C: o estilo vai para a D */
  const r = estrutura(c, id, 'c', 0, 1);
  const c2 = JSON.parse(JSON.stringify(c)); for (const [k, v] of Object.entries(r.mud || r)) { const ps = k.replace(/^conteudo\./, '').split('.'); let o = c2; for (const p of ps.slice(0, -1)) o = o[p] = o[p] || {}; if (v === undefined) delete o[ps.at(-1)]; else o[ps.at(-1)] = v; }
  assert.ok(c2.abas[id].estC[3] && !c2.abas[id].estC[2], 'o estilo da coluna andou');
  x = await parte((await gravarXlsx(c2)).bytes, 'xl/worksheets/sheet1.xml');
  assert.match(x, /<col min="4" max="4" width="[\d.]+" style="\d+" customWidth="1"\/>/);
});

test('v0.6.14 (D-49): nome que só vale numa aba continua da aba; repetido, fica o do livro todo', async () => {
  const c = await ler();
  assert.equal(c.nomes.soaqui.loc, idDe(c, 'Outra'));
  assert.equal(c.nomes.periodo.loc, undefined); assert.equal(c.nomes.periodo.ref.replace(/\$/g, ''), 'Dados!A6', 'fica o do livro todo');
  const wb = await parte((await gravarXlsx(c)).bytes, 'xl/workbook.xml');
  assert.match(wb, /<definedName name="SoAqui" localSheetId="1">/);
  assert.match(wb, /<definedName name="Periodo">/);
});

test('v0.6.14 (D-51): guardar no aparelho não muda a assinatura da forma (o grupo do Excel volta como veio)', () => {
  const o = { tipo: 'forma', id: 'f', w: 100, h: 50, nome: 'Grupo', xo: '<xdr:grpSp/>',
    partes: [{ g: 'roundRect', x: 0, y: 0, w: 100, h: 50, texto: { pars: [], anc: 'ctr', ins: [0, 0, 0, 0], wrap: true, ligado: { aba: 'a2', ref: 'G7' } } }] };
  /* planilha guardada antes da v0.6.14: assinatura antiga (a ordem das chaves conta) */
  const velha = { ...o, xoSig: assinaturaForma(o) };
  const f = limparForma(velha, { id: 'f', l: 0, c: 0, dx: 0, dy: 0 });
  assert.deepEqual(Object.keys(f.partes[0].texto.ligado), ['aba', 'ref'], 'a ordem fica como o leitor faz');
  assert.ok(formaSemMudanca(f), 'a assinatura antiga ainda vale depois de limpar');
  /* de agora em diante a assinatura é estável: trocar a ordem das chaves não muda */
  const nova = { ...o, xoSig: assinaturaForma(o, { estavel: true }) };
  const troca = { ...nova, partes: [{ ...nova.partes[0], texto: { ...nova.partes[0].texto, ligado: { ref: 'G7', aba: 'a2' } } }] };
  assert.ok(formaSemMudanca(troca));
  /* mexeu de verdade: não vale mais */
  const mexida = { ...nova, partes: [{ ...nova.partes[0], w: 120 }] };
  assert.ok(!formaSemMudanca(mexida));
});

test('v0.6.14 (D-52): colunas ocultas até a penúltima (XFD visível) continuam ocultas ao salvar', async () => {
  const c = await ler(); const a = c.abas[idDe(c, 'Outra')];
  assert.equal(a.ocCFim, 2); assert.equal(a.ocCFimAte, 16382);
  const x = await parte((await gravarXlsx(c)).bytes, 'xl/worksheets/sheet2.xml');
  assert.match(x, /<col min="3" max="16383" width="[\d.]+" customWidth="1" hidden="1"\/>/);
  assert.ok(!/max="16384"[^>]*hidden/.test(x), 'a XFD não fica oculta');
});

test('v0.6.14 (D-53): borda pontilhada e dupla voltam com o mesmo tipo; borda posta no app é a lisa', async () => {
  const c = await ler(); const a = c.abas[idDe(c, 'Outra')];
  const e = c.estilos[a.cel.B1.s];
  assert.deepEqual(e.bdt, { l: 'dotted', b: 'double' });
  const st = await parte((await gravarXlsx(c)).bytes, 'xl/styles.xml');
  assert.match(st, /<border><left style="dotted"><color indexed="64"\/><\/left><right style="thin">[^]*?<bottom style="double">/);
});

test('v0.6.14 (D-54): degradê volta como degradê (a grade mostra a primeira cor); trocar a cor no app vira cor lisa', async () => {
  const c = await ler(); const a = c.abas[idDe(c, 'Outra')];
  const e = c.estilos[a.cel.C1.s];
  assert.equal(e.fundo, '#0070c0');
  let st = await parte((await gravarXlsx(c)).bytes, 'xl/styles.xml');
  assert.match(st, /<fill><gradientFill degree="90"><stop position="0"><color rgb="FF0070C0"\/><\/stop>/);
  c.estilos[a.cel.C1.s] = { ...e, fundo: '#ff0000' };
  st = await parte((await gravarXlsx(c)).bytes, 'xl/styles.xml');
  assert.ok(!/gradientFill/.test(st)); assert.match(st, /<fgColor rgb="FFFF0000"\/>/);
});
