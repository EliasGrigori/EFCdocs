/* Testes do Excel (v0.5.0): ZIP, XML, estilos, fórmulas, abrir e salvar .xlsx, e o motor com fórmulas do Excel antigo. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lerZip, criarZip, crc32 } from '../src/planilha/xlsx/zip.js';
import { desescapar, escapar, textoRico, atributos } from '../src/planilha/xlsx/xml.js';
import { lerEstilos, gravarEstilos, lerTema, corDe, aplicarTint } from '../src/planilha/xlsx/estilos.js';
import { tirarPrefixos, porPrefixos, trocarTabelas } from '../src/planilha/xlsx/formulas.js';
import { lerXlsx, LIMITES } from '../src/planilha/xlsx/ler.js';
import { gravarXlsx } from '../src/planilha/xlsx/gravar.js';
import { Motor } from '../src/planilha/motor.js';
import { planilhaVazia, normalizarPlanilha, mescladas, mesclaEm } from '../src/planilha/modelo.js';
import { criterio } from '../src/planilha/criterios.js';
import { dataDe } from '../src/planilha/valores.js';
import { ehErro } from '../src/planilha/valores.js';

const enc = new TextEncoder();
const AMOSTRA = new URL('./amostras/amostra-qualidade.xlsx', import.meta.url);

/* ---------- ZIP ---------- */
test('xlsx: CRC32 e ZIP de ida e volta (com compactação e sem)', async () => {
  assert.equal(crc32(enc.encode('123456789')).toString(16), 'cbf43926');
  const grande = 'linha de teste '.repeat(5000);
  const z = await criarZip([{ nome: 'a.txt', dados: 'olá, mundo' }, { nome: 'pasta/b.xml', dados: grande }, { nome: 'c.bin', dados: new Uint8Array([1, 2, 3]) }]);
  const r = lerZip(z);
  assert.deepEqual(r.nomes, ['a.txt', 'pasta/b.xml', 'c.bin']);
  assert.equal(await r.texto('a.txt'), 'olá, mundo');
  assert.equal(await r.texto('pasta/b.xml'), grande);
  assert.deepEqual([...(await r.bytes('c.bin'))], [1, 2, 3]);
  assert.ok(z.length < grande.length / 5, 'compactou');
  let pedacos = '';
  await r.pedacos('pasta/b.xml', (p) => { pedacos += p; });
  assert.equal(pedacos, grande);
  assert.throws(() => lerZip(enc.encode('não é zip')), /Excel/);
});

/* ---------- XML ---------- */
test('xlsx: texto do XML (entidades, _xHHHH_ do Excel, texto formatado e fonética)', () => {
  assert.equal(desescapar('A &amp; B &lt;5&gt; &#231;&#xE3;o _x000D__x000A_fim'), 'A & B <5> ção \r\nfim');
  const t = 'Linha 1\nLinha 2 & "aspas" <x> _x0041_ \u0001';
  assert.equal(desescapar(escapar(t)), t);
  assert.equal(textoRico('<r><t>Cloro </t></r><r><rPr><b/></rPr><t xml:space="preserve">livre</t></r><rPh sb="0" eb="1"><t>X</t></rPh>'), 'Cloro livre');
  assert.deepEqual(atributos('r="A1" s="3" x14ac:dyDescent="0.25" r:id="rId2"'), { r: 'A1', s: '3', dyDescent: '0.25', 'r:id': 'rId2' });
});

/* ---------- estilos ---------- */
test('xlsx: cores do tema com clarear/escurecer e cores indexadas', () => {
  const tema = lerTema(null);
  assert.equal(corDe({ theme: '4' }, tema), '#4472c4');
  assert.equal(corDe({ rgb: 'FF0F4C5C' }, tema), '#0f4c5c');
  assert.equal(corDe({ indexed: '10' }, tema), '#ff0000');
  assert.equal(corDe({ indexed: '64' }, tema), null);
  assert.equal(corDe({ auto: '1' }, tema), null);
  assert.equal(aplicarTint('000000', 0.5), '808080');
  assert.equal(aplicarTint('FFFFFF', -0.5), '808080');
});

test('xlsx: styles.xml vira estilos do EFCdocs (fonte, preenchimento, bordas, alinhamento, formato)', () => {
  const xml = `<styleSheet><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;R$&quot; #,##0.00"/></numFmts>
    <fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><i/><u/><sz val="14"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><strike/><sz val="11"/><color theme="4" tint="-0.25"/><name val="Arial"/></font></fonts>
    <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0F4C5C"/><bgColor indexed="64"/></patternFill></fill></fills>
    <borders count="2"><border><left/><right/><top/><bottom/></border><border><left style="thin"><color rgb="FF999999"/></left><right style="medium"/><top style="thick"/><bottom style="double"/></border></borders>
    <cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="164" fontId="1" fillId="2" borderId="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="14" fontId="2" fillId="1" borderId="0"/><xf numFmtId="10" fontId="0" fillId="0" borderId="0"><alignment horizontal="right" vertical="top"/></xf></cellXfs></styleSheet>`;
  const { xfs, fonteBase } = lerEstilos(xml, lerTema(null));
  assert.equal(fonteBase.nome, 'Calibri');
  assert.deepEqual(xfs[0], {});
  assert.deepEqual(xfs[1], { b: true, i: true, u: true, tam: 14, cor: '#ffffff', fundo: '#0f4c5c', bd: { l: 1, r: 2, t: 3, b: 3 }, bdc: '#999999', nf: '"R$" #,##0.00', al: 'c', av: 'm', qb: true });
  assert.equal(xfs[2].st, true); assert.equal(xfs[2].fonte, 'Arial'); assert.equal(xfs[2].nf, 'dd/mm/yyyy'); assert.equal(xfs[2].fundo, undefined, 'cinza 12,5% sem cor não vira preenchimento');
  assert.ok(/^#[0-9a-f]{6}$/.test(xfs[2].cor) && xfs[2].cor !== '#4472c4', 'cor do tema escurecida');
  assert.deepEqual(xfs[3], { nf: '0.00%', al: 'd', av: 't' });
});

test('xlsx: estilos do EFCdocs vão e voltam iguais pelo styles.xml', () => {
  const estilos = [{}, { b: true, cor: '#c00000' }, { fundo: '#fff2cc', bd: { t: 1, b: 1, l: 1, r: 1 }, bdc: '#808080' }, { nf: 'dd/mm/yyyy', al: 'c' }, { nf: '0.00', qb: true, av: 't' }, { i: true, u: true, st: true, tam: 9, fonte: 'Arial' }, { nf: '"R$" #,##0.00' }];
  const xml = gravarEstilos(estilos);
  const { xfs } = lerEstilos(xml, lerTema(null));
  assert.deepEqual(xfs, estilos);
});

/* ---------- fórmulas ---------- */
test('xlsx: prefixos das funções novas e A1# (ida e volta)', () => {
  assert.equal(tirarPrefixos('_xlfn._xlws.FILTER(A1:A9,B1:B9>0)+_xlfn.UNIQUE(C1:C3)+_xlfn.ANCHORARRAY(D2)'), 'FILTER(A1:A9,B1:B9>0)+UNIQUE(C1:C3)+D2#');
  assert.equal(tirarPrefixos('IFERROR(SUBTOTAL(1,_xlfn._TRO_TRAILING(P4:P1048576)),0)'), 'IFERROR(SUBTOTAL(1,TRIMRANGE(P4:P1048576,2,2)),0)');
  assert.equal(tirarPrefixos('_xlfn.SINGLE(A1:A9)&"_xlfn.texto"'), 'SINGLE(A1:A9)&"_xlfn.texto"');
  assert.equal(porPrefixos('FILTER(A1:A9,B1:B9>0)+UNIQUE(C1#)+SUM(X1)+IFS(A1>0,1)+"FILTER(x)"'), '_xlfn._xlws.FILTER(A1:A9,B1:B9>0)+_xlfn.UNIQUE(_xlfn.ANCHORARRAY(C1))+SUM(X1)+_xlfn.IFS(A1>0,1)+"FILTER(x)"');
  assert.equal(porPrefixos("SORT('Minha aba'!A2#)"), "_xlfn._xlws.SORT(_xlfn.ANCHORARRAY('Minha aba'!A2))");
});

test('xlsx: referência de tabela (Tabela[Coluna]) vira endereço', () => {
  const t = new Map([['tags', { nome: 'TAGs', aba: 'Base', l1: 2, c1: 1, l2: 20, c2: 4, cab: 1, tot: 1, cols: ["TAG's", 'LOCAL', 'PONTO\nDE COLETA', 'DATA'] }]]);
  const f = (s, aba = 'Base', l = 7) => trocarTabelas(s, t, { aba, l });
  assert.equal(f('SUM(TAGs[LOCAL])'), 'SUM($C$4:$C$20)');
  assert.equal(f("COUNTIF(TAGs[TAG''s],\"x\")"), 'COUNTIF($B$4:$B$20,"x")');
  assert.equal(f('TAGs[[#This Row],[DATA]]*2'), '$E8*2');
  assert.equal(f('TAGs[@DATA]'), '$E8');
  assert.equal(f('TAGs[[PONTO\r\nDE COLETA]]'), '$D$4:$D$20', 'quebra de linha \\r\\n na fórmula e \\n na tabela');
  assert.equal(f('TAGs[#Headers]'), '$B$3:$E$3');
  assert.equal(f('TAGs[#Totals]'), '$B$21:$E$21');
  assert.equal(f('TAGs[[#All],[LOCAL]:[DATA]]'), '$C$3:$E$21');
  assert.equal(f('VLOOKUP(A1,TAGs,2,0)', 'Outra aba'), 'VLOOKUP(A1,Base!$B$4:$E$20,2,0)');
  assert.equal(f('TAGs[NÃO EXISTE]'), '#REF!');
  assert.equal(f('"TAGs[LOCAL]"&Base!A1'), '"TAGs[LOCAL]"&Base!A1', 'dentro de texto não mexe');
  const t2 = new Map([['tb', { nome: 'TB', aba: 'Minha aba', l1: 0, c1: 0, l2: 9, c2: 1, cab: 1, tot: 0, cols: ['A', 'B'] }]]);
  assert.equal(trocarTabelas('SUM(TB[B])', t2, { aba: 'X', l: 0 }), "SUM('Minha aba'!$B$2:$B$10)");
});

/* ---------- abrir a amostra (feita no openpyxl, sem valores calculados) ---------- */
test('xlsx: abre a amostra: abas, cor, oculta, congelar, larguras, mescladas, nomes, estilos e relatório', async () => {
  const { conteudo: c, relatorio: r } = await lerXlsx(new Uint8Array(readFileSync(AMOSTRA)), { nomeArquivo: 'amostra-qualidade.xlsx' });
  assert.deepEqual(c.ordem.map((id) => c.abas[id].nome), ['Coletas', 'Resumo', 'Apoio']);
  const [col, res, apo] = c.ordem.map((id) => c.abas[id]);
  assert.equal(col.cor, '#1f7a46');
  assert.equal(apo.oculta, true);
  assert.deepEqual(col.cong, { l: 1, c: 0 });
  assert.equal(col.larg[1], Math.trunc(((256 * 18 + Math.trunc(128 / 7)) / 256) * 7));
  assert.equal(col.alt[0], 40);
  assert.deepEqual(res.mesc, ['A1:C1']);
  assert.equal(res.ocC[3], 1); assert.equal(res.ocL[13], 1);
  assert.deepEqual(c.nomes.meta_cloro, { n: 'Meta_Cloro', ref: 'Resumo!$B$8' });
  const est = (cel) => c.estilos[cel.s || 0];
  assert.deepEqual({ ...est(col.cel.A1) }, { b: true, cor: '#ffffff', fundo: '#0f4c5c', bd: { t: 1, b: 1, l: 1, r: 1 }, bdc: '#999999', al: 'c', av: 'm', qb: true });
  assert.equal(col.cel.A1.v, 'Data');
  assert.equal(col.cel.A2.v, 46027); assert.equal(est(col.cel.A2).nf, 'dd/mm/yyyy');
  assert.equal(res.cel.B3.f, 'AVERAGE(Coletas!$C$2:$C$41)', 'a coluna da tabela virou endereço');
  assert.equal(res.cel.B4.f, 'COUNTIF(Coletas!$E$2:$E$41,"NÃO CONFORME")');
  assert.equal(res.cel.B12.v, true);
  assert.equal(est(res.cel.B10).nf, '"R$" #,##0.00');
  assert.equal(col.cel.E2.lg, 1, 'fórmula do Excel antigo fica marcada');
  assert.equal(col.cel.E2.v, undefined, 'sem valor calculado no arquivo');
  /* a fórmula copiada até a linha 6.000 foi cortada com 1.000 linhas de folga */
  assert.ok(col.cel.E1041 && !col.cel.E1043);
  assert.match(r.abas[0].cortes[0], /linhas 1\.042 a 6\.000/);
  const fora = r.fora.map((x) => x.item);
  for (const item of ['Comentários e anotações', 'Formatação condicional', 'Validação de dados (listas suspensas)']) assert.ok(fora.includes(item), item);
  assert.match(r.avisos.join(' '), /TAB_COLETAS\[Cloro \(mg\/L\)\] virou Coletas!\$C\$2:\$C\$41/);
  assert.equal(c.calcExcel, true); assert.equal(c.fonteBase, 'Calibri');
  /* o motor calcula igual ao Excel */
  const m = new Motor(normalizarPlanilha(c));
  const id = c.ordem[1];
  assert.equal(m.valor(c.ordem[0], 1, 4), 'CONFORME');
  assert.equal(m.valor(c.ordem[0], 1, 5), 'JANEIRO');
  assert.ok(Math.abs(m.valor(id, 2, 1) - 1.1925) < 1e-9);
  assert.equal(m.valor(id, 6, 1), 1.3, 'PROCV');
  assert.equal(ehErro(m.valor(id, 12, 1)) && m.valor(id, 12, 1).cod, '#DIV/0!');
  assert.equal(m.valor(id, 8, 1), 35, 'CONT.SE com nome definido');
  assert.equal(m.valor(id, 4, 1), 7.4); assert.ok(Math.abs(m.valor(id, 5, 1) - 9.2) < 1e-9);
});

/* ---------- um .xlsx "do Excel" montado à mão (com o que o openpyxl não grava) ---------- */
async function xlsxDoExcel({ date1904 = false } = {}) {
  const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const sheet = `<worksheet ${NS}><sheetViews><sheetView workbookViewId="0"><pane xSplit="1" ySplit="2" topLeftCell="B3" state="frozen"/></sheetView></sheetViews><sheetData>
    <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="inlineStr"><is><t>em linha</t></is></c><c r="D1" t="b"><v>1</v></c><c r="E1" t="e"><v>#N/A</v></c></row>
    <row r="2"><c r="A2"><v>10</v></c><c r="B2"><f t="shared" ref="B2:B4" si="0">A2*2</f><v>20</v></c><c r="C2" cm="1"><f t="array" ref="C2:C4">_xlfn._xlws.SORT(A2:A4)</f><v>5</v></c><c r="D2"><f>_xlfn.IFS(A2&gt;5,"alto",TRUE,"baixo")</f><v>alto</v></c><c r="E2" t="str"><f>IF(A2="","",$G$2:$G$4)</f><v>g1</v></c><c r="G2" t="s"><v>2</v></c></row>
    <row r="3"><c r="A3"><v>5</v></c><c r="B3"><f t="shared" si="0"/><v>10</v></c><c r="C3"><v>7</v></c><c r="E3" t="str"><f>IF(A3="","",$G$2:$G$4)</f><v>g2</v></c><c r="G3" t="s"><v>3</v></c></row>
    <row r="4"><c r="A4"><v>7</v></c><c r="B4"><f t="shared" si="0"/><v>14</v></c><c r="C4"><v>10</v></c><c r="D4"><v></v></c><c r="F4"><f>A4+FUNCAO_QUE_NAO_EXISTE(1)</f><v>99</v></c><c r="G4" t="s"><v>4</v></c></row>
    <row r="5"><c r="A5"><v>43831</v></c><c r="B5"><f>TODAY()</f><v>1</v></c><c r="C5"><f>A2*1000</f><v>123</v></c></row>
    </sheetData><mergeCells count="1"><mergeCell ref="A6:B7"/></mergeCells></worksheet>`;
  const sst = `<sst ${NS} count="5" uniqueCount="5"><si><t>Ponto</t></si><si><r><t>Cloro </t></r><r><rPr><b/></rPr><t>livre</t></r></si><si><t>g1</t></si><si><t>g2</t></si><si><t>g3</t></si></sst>`;
  const wb = `<workbook ${NS}><workbookPr${date1904 ? ' date1904="1"' : ''}/><sheets><sheet name="Dados" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm.Print_Area" localSheetId="0">Dados!$A$1:$G$5</definedName><definedName name="Taxa">Dados!$A$2</definedName></definedNames></workbook>`;
  const rels = '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>';
  const raiz = '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  return criarZip([
    { nome: '_rels/.rels', dados: raiz }, { nome: 'xl/workbook.xml', dados: wb }, { nome: 'xl/_rels/workbook.xml.rels', dados: rels },
    { nome: 'xl/worksheets/sheet1.xml', dados: sheet }, { nome: 'xl/sharedStrings.xml', dados: sst },
    { nome: 'xl/vbaProject.bin', dados: new Uint8Array([0]) }, { nome: 'xl/charts/chart1.xml', dados: '<c/>' },
  ]);
}

test('xlsx: abre o que o Excel grava: compartilhada, matriz dinâmica, matriz antiga, prefixos, tipos e valores calculados', async () => {
  const { conteudo: c, relatorio: r } = await lerXlsx(await xlsxDoExcel());
  const a = c.abas[c.ordem[0]];
  assert.equal(a.cel.A1.v, 'Ponto'); assert.equal(a.cel.B1.v, 'Cloro livre'); assert.equal(a.cel.C1.v, 'em linha');
  assert.equal(a.cel.D1.v, true); assert.deepEqual(a.cel.E1.v, { e: '#N/A' });
  assert.equal(a.cel.B3.f, 'A3*2'); assert.equal(a.cel.B4.f, 'A4*2');
  assert.equal(a.cel.C2.f, 'SORT(A2:A4)'); assert.equal(a.cel.C2.da, 1);
  assert.equal(a.cel.C3, undefined, 'valor dentro da área que derrama vem da fórmula');
  assert.equal(a.cel.D2.f, 'IFS(A2>5,"alto",TRUE,"baixo")');
  assert.equal(a.cel.D4, undefined, '<v></v> vazio não vira zero');
  assert.equal(a.cel.E2.lg, 1);
  assert.deepEqual(a.cong, { l: 2, c: 1 });
  assert.deepEqual(a.mesc, ['A6:B7']);
  assert.deepEqual(c.nomes, { taxa: { n: 'Taxa', ref: 'Dados!$A$2' } });
  const fora = r.fora.map((x) => x.item);
  assert.ok(fora.includes('Macros (VBA)') && fora.includes('Gráficos') && fora.includes('Áreas de impressão'));
  assert.equal(r.semCalculo, 1); assert.match(r.exemplosSemCalculo[0].motivo, /FUNCAO_QUE_NAO_EXISTE/);

  /* motor: começa com os valores do Excel; derrama o SORT; Excel antigo faz interseção; HOJE recalcula; desconhecida mostra o valor do Excel */
  const m = new Motor(normalizarPlanilha(c));
  const id = c.ordem[0];
  assert.equal(m.valor(id, 1, 2), 5); assert.equal(m.valor(id, 2, 2), 7); assert.equal(m.valor(id, 3, 2), 10);
  assert.equal(m.valor(id, 1, 4), 'g1'); assert.equal(m.valor(id, 2, 4), 'g2', 'interseção implícita na linha da fórmula');
  assert.equal(m.valor(id, 3, 5), 99, 'função desconhecida: último valor do Excel');
  assert.ok(m.valor(id, 4, 1) > 46000, 'HOJE recalcula ao abrir');
  assert.equal(m.valor(id, 4, 2), 123, 'arquivo não mexido: começa com o valor do Excel');
  /* depois de mexer (sem calcExcel), calcula tudo */
  const c2 = normalizarPlanilha({ ...c, calcExcel: undefined });
  assert.equal(new Motor(c2).valor(id, 4, 2), 10000);
});

test('xlsx: sistema de datas de 1904 é convertido', async () => {
  const { relatorio: r } = await lerXlsx(await xlsxDoExcel({ date1904: true }));
  assert.match(r.avisos.join(' '), /1904/);
});

test('xlsx: corta o fim que não mostra nada e guarda a folga; linhas ocultas com valor demais saem', async () => {
  const linhas = [];
  for (let i = 1; i <= 3; i++) linhas.push(`<row r="${i}"><c r="A${i}"><v>${i}</v></c><c r="B${i}" t="str"><f>IF(A${i}="","",A${i}*2)</f><v>${i * 2}</v></c></row>`);
  for (let i = 4; i <= 5000; i++) linhas.push(`<row r="${i}"><c r="B${i}" t="str"><f>IF(A${i}="","",A${i}*2)</f><v></v></c></row>`);
  for (let i = 5001; i <= 40000; i++) linhas.push(`<row r="${i}" hidden="1"><c r="C${i}" t="str"><v>x</v></c></row>`);
  const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const z = await criarZip([
    { nome: '_rels/.rels', dados: '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { nome: 'xl/workbook.xml', dados: `<workbook ${NS}><sheets><sheet name="Longa" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { nome: 'xl/_rels/workbook.xml.rels', dados: '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>' },
    { nome: 'xl/worksheets/sheet1.xml', dados: `<worksheet ${NS}><sheetData>${linhas.join('')}</sheetData></worksheet>` },
  ]);
  const { conteudo: c, relatorio: r } = await lerXlsx(z);
  const a = c.abas[c.ordem[0]];
  assert.ok(a.cel.B1003 && !a.cel.B1004, 'ficaram 1.000 linhas de folga');
  assert.ok(!a.cel.C5001, 'as 35 mil linhas ocultas com valor saíram');
  assert.match(r.abas[0].cortes.join(' '), /linhas ocultas com valores/);
  assert.equal(LIMITES.folga, 1000);
});

/* ---------- salvar ---------- */
test('xlsx: salvar e abrir de novo dá a mesma planilha (valores, fórmulas, estilos, tamanhos, derramada, nomes)', async () => {
  const c = planilhaVazia();
  const a = c.abas.a1;
  a.nome = 'Análises';
  a.cel = {
    A1: { v: 'Ponto', s: 1 }, B1: { v: 'Cloro', s: 1 }, A2: { v: 'Entrada' }, B2: { v: 1.2 }, A3: { v: 'Rede' }, B3: { v: 0.8 }, A4: { v: 'Poço' }, B4: { v: 2.5 },
    C1: { f: 'SUM(B2:B4)' }, D1: { f: 'FILTER(A2:A4,B2:B4>1)' }, E1: { v: 46027, s: 2 }, F1: { v: true }, G1: { v: { e: '#N/A' } }, H1: { f: 'A1&" "&Taxa' }, I1: { v: '' }, J1: { f: 'IF(B2>1,"OK","AJUSTAR")', lg: 1 },
  };
  c.estilos = [{}, { b: true, fundo: '#0f4c5c', cor: '#ffffff', bd: { t: 1, b: 2, l: 1, r: 1 }, al: 'c' }, { nf: 'dd/mm/yyyy' }];
  a.larg = { 0: 120 }; a.alt = { 0: 30 }; a.ocL = { 9: 1 }; a.ocC = { 10: 1 }; a.cong = { l: 1, c: 1 }; a.mesc = ['A6:C6']; a.cor = '#c00000';
  c.nomes = { taxa: { n: 'Taxa', ref: "'Análises'!$B$2" } };
  c.ordem.push('a2'); c.abas.a2 = { id: 'a2', nome: 'Oculta', oculta: true, cel: { A1: { f: "'Análises'!C1*2" } } };
  const m = new Motor(c);
  assert.equal(m.valor('a1', 0, 3), 'Entrada'); assert.equal(m.valor('a1', 1, 3), 'Poço');
  const { bytes, avisos } = await gravarXlsx(c, m, { agora: new Date('2026-10-26T12:00:00Z') });
  assert.match(avisos.join(' '), /Usa FILTRO: só funciona no Excel 2021 ou no Microsoft 365/);
  const z = lerZip(bytes);
  assert.ok(z.tem('xl/metadata.xml'), 'matriz dinâmica com metadata.xml');
  const sh = await z.texto('xl/worksheets/sheet1.xml');
  assert.match(sh, /<c r="D1" cm="1" t="str"|<c r="D1" t="str" cm="1"/);
  assert.match(sh, /<f t="array" ref="D1:D2">_xlfn\._xlws\.FILTER\(A2:A4,B2:B4&gt;1\)<\/f>/);
  assert.match(sh, /<c r="D2" t="s">/, 'o segundo valor derramado vai como valor');
  assert.match(sh, /<c r="J1" t="str"><f>IF\(B2&gt;1,"OK","AJUSTAR"\)<\/f><v>OK<\/v>/, 'fórmula do Excel antigo vai sem matriz');
  assert.match(await z.texto('xl/workbook.xml'), /<sheet name="Oculta" sheetId="2" state="hidden"/);
  assert.match(await z.texto('xl/workbook.xml'), /fullCalcOnLoad="1"/);
  const { conteudo: c2 } = await lerXlsx(bytes);
  const b = c2.abas[c2.ordem[0]];
  assert.equal(b.nome, 'Análises');
  for (const k of ['A1', 'B2', 'E1', 'F1', 'G1', 'I1']) assert.deepEqual(b.cel[k].v, a.cel[k].v, k);
  for (const k of ['C1', 'D1', 'H1', 'J1']) assert.equal(b.cel[k].f, a.cel[k].f, k);
  assert.equal(b.cel.D1.da, 1); assert.equal(b.cel.J1.lg, 1); assert.equal(b.cel.D2, undefined);
  assert.deepEqual(c2.estilos[b.cel.A1.s], c.estilos[1]);
  assert.equal(c2.estilos[b.cel.E1.s].nf, 'dd/mm/yyyy');
  assert.deepEqual(b.larg, { 0: 120 }); assert.deepEqual(b.alt, { 0: 30 }); assert.deepEqual(b.ocL, { 9: 1 }); assert.deepEqual(b.ocC, { 10: 1 });
  assert.deepEqual(b.cong, { l: 1, c: 1 }); assert.deepEqual(b.mesc, ['A6:C6']); assert.equal(b.cor, '#c00000');
  assert.deepEqual(c2.nomes, c.nomes);
  assert.equal(c2.abas[c2.ordem[1]].oculta, true);
  const m2 = new Motor(normalizarPlanilha(c2));
  assert.equal(m2.valor(c2.ordem[0], 1, 3), 'Poço');
  assert.equal(m2.valor(c2.ordem[1], 0, 0), 9);
});

/* ---------- motor e funções (o que os arquivos do Excel mostraram) ---------- */
test('xlsx: Excel antigo: faixa numa conta vira a célula da linha; SOMARPRODUTO continua com matriz', () => {
  const c = planilhaVazia();
  c.abas.a1.cel = {
    A1: { v: 1 }, A2: { v: 2 }, A3: { v: 3 }, B1: { v: 10 }, B2: { v: 20 }, B3: { v: 30 },
    C2: { f: 'A1:A3*10', lg: 1 }, D2: { f: 'SUMPRODUCT((A1:A3>1)*B1:B3)', lg: 1 }, E2: { f: 'IF(TRUE,B1:B3)', lg: 1 }, F5: { f: 'A1:A3*10' },
  };
  const m = new Motor(c);
  assert.equal(m.valor('a1', 1, 2), 20);
  assert.equal(m.valor('a1', 1, 3), 50);
  assert.equal(m.valor('a1', 1, 4), 20);
  assert.equal(m.valor('a1', 6, 5), 30, 'fórmula do EFCdocs continua derramando');
});

test('xlsx: SUBTOTAL pula linha escondida por filtro; CONT.SES com condição vazia; MÊS(0); TEXTO com MMMM', () => {
  const c = planilhaVazia();
  const a = c.abas.a1;
  a.cel = { A1: { v: 5 }, A2: { v: 7 }, A3: { v: 100 }, B1: { f: 'SUBTOTAL(9,A1:A3)' }, B2: { f: 'SUBTOTAL(109,A1:A3)' }, C1: { v: 'x' }, C2: {}, D1: { f: 'COUNTIFS(C1:C3,E9)' }, D2: { f: 'MONTH(0)' }, D3: { f: 'TEXT(46027,"MMMM")' } };
  a.ocL = { 2: 1 }; a.ocF = { 2: 1 };
  const m = new Motor(c);
  assert.equal(m.valor('a1', 0, 1), 12, 'filtro: o 9 também pula');
  assert.equal(m.valor('a1', 1, 1), 12);
  assert.equal(m.valor('a1', 0, 3), 0, 'condição numa célula vazia vale 0 (não conta vazias)');
  assert.equal(m.valor('a1', 1, 3), 1);
  assert.equal(m.valor('a1', 2, 3), 'janeiro');
  assert.deepEqual(dataDe(0), { ano: 1900, mes: 1, dia: 0 });
  assert.equal(criterio(null)(0), true);
  assert.equal(criterio(null)(null), false);
});

test('xlsx: célula mesclada encontrada rápido com milhares de mescladas', () => {
  const mesc = [];
  for (let i = 0; i < 3000; i++) mesc.push(`A${i * 3 + 1}:B${i * 3 + 2}`);
  mesc.push('D1:D5000');
  const lista = mescladas({ mesc });
  assert.equal(mesclaEm(lista, 3, 1).t, 'A4:B5');
  assert.equal(mesclaEm(lista, 2, 0), null);
  assert.equal(mesclaEm(lista, 4000, 3).t, 'D1:D5000');
  assert.equal(mesclaEm(lista, 4000, 4), null);
});
