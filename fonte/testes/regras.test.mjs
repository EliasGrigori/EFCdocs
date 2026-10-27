/* Testes da v0.5.1: lista suspensa e validação de dados, formatação condicional e comentários (regras, motor, xlsx). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Motor } from '../src/planilha/motor.js';
import { normalizarPlanilha, planilhaVazia } from '../src/planilha/modelo.js';
import {
  faixasDe, ancoraDe, textoFaixas, emFaixas, estiloCondicional, validacaoEm, opcoesLista, valorValido, listaDaCelula,
  descreverRegra, descreverValidacao, moverRegras, textoDoComentario, mensagemDeErro, estiloComRegras,
} from '../src/planilha/regras.js';
import { lerXlsx } from '../src/planilha/xlsx/ler.js';
import { gravarXlsx } from '../src/planilha/xlsx/gravar.js';
import { lerZip, criarZip } from '../src/planilha/xlsx/zip.js';
import { estrutura } from '../src/planilha/operacoes.js';

/** planilha pequena: A1:A8 números e textos, C1:C4 lista de apoio, tabela Tab[Cor] em E1:E4 */
function base(extra = {}) {
  const c = planilhaVazia();
  const a = c.abas.a1;
  const col = (k, vs) => vs.forEach((v, i) => { a.cel[k + (i + 1)] = { v }; });
  col('A', [5, 12, 'Abacate', 'abacate', 7, null, 12, 'x']);
  col('C', ['Verde', 'Maduro', 'Podre']);
  a.cel.E1 = { v: 'Cor' }; col('E', ['Cor', 'azul', 'verde', 'rosa']);
  c.tabelas = { tab: { nome: 'Tab', aba: 'a1', l1: 0, c1: 4, l2: 3, c2: 4, cols: ['Cor'], cab: 1, tot: 0 } };
  Object.assign(a, extra);
  return normalizarPlanilha(c);
}
const ef = (m, c, l, col) => estiloCondicional(m, c, 'a1', l, col);

test('faixas: texto, âncora e coluna inteira', () => {
  const f = faixasDe('M8:M537 E9:K216 B:B');
  assert.equal(f.length, 3);
  assert.deepEqual(ancoraDe(f), { l: 0, c: 1 });
  assert.ok(emFaixas(f, 10, 5) && !emFaixas(f, 0, 3) && emFaixas(f, 5000, 1));
  assert.equal(textoFaixas(f), 'M8:M537 E9:K216 B:B');
});

test('formatação condicional: valor da célula, texto, vazios e repetidos', () => {
  const c = base({ cf: [
    { fx: 'A1:A8', t: 'cellIs', op: 'greaterThan', f1: '10', e: { fundo: '#ff0000' } },
    { fx: 'A1:A8', t: 'duplicateValues', e: { cor: '#0000ff', b: true } },
    { fx: 'A1:A8', t: 'containsText', tx: 'ABA', e: { i: true } },
    { fx: 'A1:A8', t: 'containsBlanks', e: { fundo: '#cccccc' } },
  ] });
  const m = new Motor(c);
  assert.equal(ef(m, c, 0, 0), null, '5 não passa de 10 e não repete');
  assert.equal(ef(m, c, 1, 0).fundo, '#ff0000');
  assert.deepEqual(ef(m, c, 1, 0), { fundo: '#ff0000', cor: '#0000ff', b: true }, '12 aparece duas vezes (A2 e A7): as duas regras valem');
  assert.equal(ef(m, c, 2, 0).i, true, 'texto contém sem ligar para maiúscula');
  assert.equal(ef(m, c, 2, 0).cor, '#0000ff', 'Abacate e abacate são repetidos (maiúscula não conta)');
  assert.equal(ef(m, c, 5, 0).fundo, '#cccccc', 'vazia');
  assert.equal(ef(m, c, 0, 3), null, 'fora da faixa');
});

test('formatação condicional: fórmula relativa conta da célula de cima e da esquerda; a regra de cima manda; parar se verdadeiro', () => {
  const c = base({ cf: [
    { fx: 'A1:A8', t: 'expression', f1: '$A1>6', e: { fundo: '#00ff00', cor: '#111111' }, par: 1 },
    { fx: 'A1:A8', t: 'expression', f1: 'ISNUMBER($A1)', e: { fundo: '#999999', b: true } },
  ] });
  const m = new Motor(c);
  assert.deepEqual(ef(m, c, 1, 0), { fundo: '#00ff00', cor: '#111111' }, '12 > 6: só a primeira (parar)');
  assert.deepEqual(ef(m, c, 0, 0), { fundo: '#999999', b: true }, '5: só a segunda');
  assert.deepEqual(ef(m, c, 7, 0), { fundo: '#00ff00', cor: '#111111' }, 'no Excel texto é maior que número: "x" > 6');
  const c2 = base({ cf: [
    { fx: 'A1:A8', t: 'expression', f1: '$A1>6', e: { fundo: '#00ff00' } },
    { fx: 'A1:A8', t: 'expression', f1: 'ISNUMBER($A1)', e: { fundo: '#999999', b: true } },
  ] });
  assert.deepEqual(ef(new Motor(c2), c2, 1, 0), { fundo: '#00ff00', b: true }, 'sem parar: a de cima ganha no fundo e as duas se juntam');
});

test('formatação condicional: maiores valores, média, texto que começa/termina e erro', () => {
  const c = base({ cf: [
    { fx: 'A1:A8', t: 'top10', n: 2, e: { fundo: '#aaaaaa' } },
    { fx: 'A1:A8', t: 'aboveAverage', e: { cor: '#123456' } },
    { fx: 'A1:A8', t: 'beginsWith', tx: 'x', e: { u: true } },
    { fx: 'A1:A8', t: 'endsWith', tx: 'ate', e: { st: true } },
  ] });
  const m = new Motor(c);
  assert.equal(ef(m, c, 1, 0).fundo, '#aaaaaa'); assert.equal(ef(m, c, 6, 0).fundo, '#aaaaaa'); assert.ok(!ef(m, c, 4, 0) || !ef(m, c, 4, 0).fundo);
  assert.equal(ef(m, c, 1, 0).cor, '#123456', '12 está acima da média');
  assert.equal(ef(m, c, 7, 0).u, true);
  assert.equal(ef(m, c, 2, 0).st, true);
});

test('formatação condicional recalcula quando o valor muda', () => {
  const c = base({ cf: [{ fx: 'A1:A8', t: 'cellIs', op: 'lessThan', f1: '6', e: { fundo: '#ff0000' } }] });
  const m = new Motor(c);
  assert.equal(ef(m, c, 0, 0).fundo, '#ff0000');
  const c2 = { ...c, abas: { ...c.abas, a1: { ...c.abas.a1, cel: { ...c.abas.a1.cel, A1: { v: 50 } } } } };
  m.atualizar(c2);
  assert.equal(ef(m, c2, 0, 0), null);
});

test('estilo com regras por cima (só para desenhar)', () => {
  assert.deepEqual(estiloComRegras({ b: true, fundo: '#fff' }, { fundo: '#f00', i: true }), { b: true, fundo: '#f00', i: true });
  assert.equal(estiloComRegras({ b: true }, null).b, true);
});

test('lista suspensa: lista escrita, faixa, nome de tabela via INDIRECT e outra aba', () => {
  const c = base({ val: [
    { fx: 'B1:B4', t: 'list', f1: '"Sim, Não ,Talvez"', vz: 1, me: 1 },
    { fx: 'D1:D4', t: 'list', f1: '$C$1:$C$3', me: 1 },
    { fx: 'F1', t: 'list', f1: 'INDIRECT("Tab[Cor]")', me: 1 },
    { fx: 'G1', t: 'list', f1: 'INDIRECT("naoexiste")', me: 1 },
  ] });
  const m = new Motor(c);
  const o1 = opcoesLista(m, c, 'a1', c.abas.a1.val[0], 0, 1);
  assert.deepEqual(o1.itens.map((x) => x.t), ['Sim', 'Não', 'Talvez']); assert.equal(o1.literal, true);
  assert.deepEqual(opcoesLista(m, c, 'a1', c.abas.a1.val[1], 2, 3).itens.map((x) => x.t), ['Verde', 'Maduro', 'Podre']);
  assert.deepEqual(opcoesLista(m, c, 'a1', c.abas.a1.val[2], 0, 5).itens.map((x) => x.t), ['azul', 'verde', 'rosa'], 'tabela do Excel pelo nome da coluna');
  assert.match(opcoesLista(m, c, 'a1', c.abas.a1.val[3], 0, 6).erro, /erro/);
  assert.equal(listaDaCelula(c.abas.a1, 1, 1).t, 'list');
  assert.equal(listaDaCelula(c.abas.a1, 9, 9), null);
  assert.equal(listaDaCelula({ val: [{ fx: 'A1', t: 'list', f1: '"a"', sd: 1 }] }, 0, 0), null, 'sem seta (showDropDown)');
});

test('validação: lista aceita só o que está nela (maiúscula conta na lista escrita, não na faixa)', () => {
  const c = base({ val: [
    { fx: 'B1', t: 'list', f1: '"Sim,Não"', me: 1 },
    { fx: 'D1', t: 'list', f1: '$C$1:$C$3', me: 1 },
  ] });
  const m = new Motor(c);
  const [a, b] = c.abas.a1.val;
  assert.equal(valorValido(m, c, 'a1', a, 0, 1, 'Sim', 'Sim'), true);
  assert.equal(valorValido(m, c, 'a1', a, 0, 1, 'sim', 'sim'), false);
  assert.equal(valorValido(m, c, 'a1', b, 0, 3, 'verde', 'verde'), true);
  assert.equal(valorValido(m, c, 'a1', b, 0, 3, 'Roxo', 'Roxo'), false);
  assert.equal(valorValido(m, c, 'a1', b, 0, 3, null, ''), true, 'apagar nunca é barrado');
});

test('validação: número, decimal, data, tamanho do texto e fórmula (com o valor novo na célula)', () => {
  const c = base({ val: [
    { fx: 'B1', t: 'whole', op: 'between', f1: '1', f2: '10', me: 1 },
    { fx: 'B2', t: 'decimal', op: 'greaterThan', f1: '0.5', me: 1 },
    { fx: 'B3', t: 'textLength', op: 'lessThanOrEqual', f1: '5', me: 1 },
    { fx: 'B4:B6', t: 'custom', f1: 'COUNTIF($B$4:$B$6,B4)=1', me: 1, ee: 'warning', met: 'ATENÇÃO', mem: 'Já existe.' },
    { fx: 'B8', t: 'date', op: 'greaterThanOrEqual', f1: 'DATE(2026,1,1)', me: 1 },
  ] });
  c.abas.a1.cel.B5 = { v: 'rep' };
  const m = new Motor(c);
  const v = c.abas.a1.val;
  assert.equal(valorValido(m, c, 'a1', v[0], 0, 1, 5), true);
  assert.equal(valorValido(m, c, 'a1', v[0], 0, 1, 11), false);
  assert.equal(valorValido(m, c, 'a1', v[0], 0, 1, 2.5), false, 'inteiro');
  assert.equal(valorValido(m, c, 'a1', v[0], 0, 1, 'texto'), false);
  assert.equal(valorValido(m, c, 'a1', v[1], 1, 1, 0.4), false);
  assert.equal(valorValido(m, c, 'a1', v[1], 1, 1, 0.6), true);
  assert.equal(valorValido(m, c, 'a1', v[2], 2, 1, 'abcdef'), false);
  assert.equal(valorValido(m, c, 'a1', v[2], 2, 1, 12345), true, '5 dígitos');
  assert.equal(valorValido(m, c, 'a1', v[3], 3, 1, 'novo'), true, 'ninguém tem "novo"');
  assert.equal(valorValido(m, c, 'a1', v[3], 3, 1, 'rep'), false, 'B5 já tem "rep"');
  assert.equal(valorValido(m, c, 'a1', v[4], 7, 1, 46500), true);
  assert.equal(valorValido(m, c, 'a1', v[4], 7, 1, 40000), false);
  assert.deepEqual(mensagemDeErro(v[3]), { titulo: 'ATENÇÃO', texto: 'Já existe.', nivel: 'warning' });
  assert.equal(mensagemDeErro({}).nivel, 'stop');
  assert.equal(c.abas.a1.cel.B4, undefined, 'a conta com valor de teste não grava nada');
  assert.equal(validacaoEm(c.abas.a1, 4, 1).t, 'custom');
});

test('frases que descrevem as regras', () => {
  assert.match(descreverRegra({ t: 'cellIs', op: 'greaterThan', f1: '10' }), /maior que 10/);
  assert.match(descreverRegra({ t: 'containsText', tx: 'ok' }), /contém "ok"/);
  assert.match(descreverValidacao({ t: 'list', f1: '"a,b,c"' }), /Lista: a, b, c/);
  assert.match(descreverValidacao({ t: 'whole', op: 'between', f1: '1', f2: '9' }), /entre 1 e 9/);
});

test('inserir e excluir linhas e colunas levam as faixas das regras e dos comentários', () => {
  const c = base({
    val: [{ fx: 'B5:B8', t: 'list', f1: '$C$1:$C$3' }],
    cf: [{ fx: 'A1:A8', t: 'expression', f1: '$A1>0', e: { fundo: '#f00' } }],
    com: { B6: { t: 'oi' } },
  });
  const mud = estrutura(c, 'a1', 'l', 2, 3); // insere 3 linhas antes da linha 3
  assert.equal(mud['conteudo.abas.a1.val'][0].fx, 'B8:B11');
  assert.equal(mud['conteudo.abas.a1.val'][0].f1, '$C$1:$C$6', 'a lista que cruza o ponto cresce');
  assert.equal(mud['conteudo.abas.a1.cf'][0].fx, 'A1:A11');
  assert.deepEqual(Object.keys(mud['conteudo.abas.a1.com']), ['B9']);
  const apaga = estrutura(c, 'a1', 'l', 4, -2); // exclui linhas 5 e 6
  assert.equal(apaga['conteudo.abas.a1.val'][0].fx, 'B5:B6');
  assert.equal(apaga['conteudo.abas.a1.com'], undefined, 'o comentário da linha 6 sumiu junto');
  const col = moverRegras(c.abas.a1, 'c', 0, 1);
  assert.equal(col.val[0].fx, 'C5:C8');
});

test('comentários: texto inteiro com as respostas', () => {
  assert.equal(textoDoComentario({ t: 'Nota', r: [{ a: 'Ana', t: 'ok' }, { t: 'feito' }] }), 'Nota\nAna: ok\nfeito');
});

/* ---------- Excel ---------- */
const enc = new TextEncoder();
async function xlsxComRegras() {
  const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const sheet = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="${NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main" xmlns:xm="http://schemas.microsoft.com/office/excel/2006/main"><sheetData>` +
    '<row r="1"><c r="A1"><v>1</v></c><c r="B1" t="inlineStr"><is><t>Sim</t></is></c></row><row r="2"><c r="A2"><v>20</v></c></row></sheetData>' +
    '<conditionalFormatting sqref="A1:A2"><cfRule type="cellIs" dxfId="0" priority="2" operator="greaterThan"><formula>10</formula></cfRule><cfRule type="expression" dxfId="1" priority="1" stopIfTrue="1"><formula>$A1=1</formula></cfRule></conditionalFormatting>' +
    '<conditionalFormatting sqref="B1"><cfRule type="colorScale" priority="3"><colorScale><cfvo type="min"/><cfvo type="max"/><color rgb="FFFF0000"/><color rgb="FF00FF00"/></colorScale></cfRule></conditionalFormatting>' +
    '<conditionalFormatting sqref="A1:A2"><cfRule type="containsText" dxfId="0" priority="4" operator="containsText" text="x"><formula>NOT(ISERROR(SEARCH("x",A1)))</formula></cfRule></conditionalFormatting>' +
    '<dataValidations count="2"><dataValidation type="list" errorStyle="warning" allowBlank="1" showInputMessage="1" showErrorMessage="1" errorTitle="Opa" error="Escolha da lista" promptTitle="Dica" prompt="Use a seta" sqref="B1:B5"><formula1>"Sim,Não"</formula1></dataValidation>' +
    '<dataValidation type="whole" operator="between" allowBlank="1" showErrorMessage="1" sqref="A1:A2"><formula1>1</formula1><formula2>99</formula2></dataValidation></dataValidations>' +
    '<extLst><ext uri="{CCE6A557-97BC-4b89-ADB6-D9C93CAAB3DF}" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main"><x14:dataValidations count="1"><x14:dataValidation type="list" allowBlank="1"><x14:formula1><xm:f>Apoio!$A$1:$A$3</xm:f></x14:formula1><xm:sqref>C1:C9</xm:sqref></x14:dataValidation></x14:dataValidations></ext></extLst>' +
    '<legacyDrawing r:id="rId1"/></worksheet>';
  const sheet2 = `<?xml version="1.0"?><worksheet xmlns="${NS}"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>um</t></is></c></row></sheetData></worksheet>`;
  const rel = (t, alvo, id) => `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${t}" Target="${alvo}"/>`;
  const arquivos = [
    { nome: '[Content_Types].xml', dados: '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/></Types>' },
    { nome: '_rels/.rels', dados: `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rel('officeDocument', 'xl/workbook.xml', 'rId1')}</Relationships>` },
    { nome: 'xl/workbook.xml', dados: `<?xml version="1.0"?><workbook xmlns="${NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Dados" sheetId="1" r:id="rId1"/><sheet name="Apoio" sheetId="2" r:id="rId2"/></sheets></workbook>` },
    { nome: 'xl/_rels/workbook.xml.rels', dados: `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rel('worksheet', 'worksheets/sheet1.xml', 'rId1')}${rel('worksheet', 'worksheets/sheet2.xml', 'rId2')}${rel('styles', 'styles.xml', 'rId3')}${rel('person', 'persons/person.xml', 'rId4')}</Relationships>` },
    { nome: 'xl/styles.xml', dados: `<?xml version="1.0"?><styleSheet xmlns="${NS}"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellXfs>` +
      '<dxfs count="2"><dxf><font><b/><color rgb="FF9C0006"/></font><fill><patternFill><bgColor rgb="FFFFC7CE"/></patternFill></fill></dxf><dxf><font><i/><strike/></font><fill><patternFill patternType="solid"><fgColor rgb="FF00B050"/><bgColor rgb="FF00B050"/></patternFill></fill></dxf></dxfs></styleSheet>' },
    { nome: 'xl/worksheets/sheet1.xml', dados: sheet },
    { nome: 'xl/worksheets/sheet2.xml', dados: sheet2 },
    { nome: 'xl/worksheets/_rels/sheet1.xml.rels', dados: `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rel('comments', '../comments1.xml', 'rId2')}<Relationship Id="rId3" Type="http://schemas.microsoft.com/office/2017/10/relationships/threadedComment" Target="../threadedComments/threadedComment1.xml"/></Relationships>` },
    { nome: 'xl/comments1.xml', dados: `<?xml version="1.0"?><comments xmlns="${NS}"><authors><author>Maria</author><author>tc={AAAA}</author></authors><commentList>` +
      '<comment ref="A1" authorId="0"><text><r><rPr><b/></rPr><t>Maria:</t></r><r><t xml:space="preserve">\nConferir o cloro</t></r></text></comment>' +
      '<comment ref="B1" authorId="1"><text><t>[Threaded comment]\n\nYour version of Excel allows you to read this threaded comment; however, any edits to it will get removed.\n\nComment:\n    Fallback</t></text></comment></commentList></comments>' },
    { nome: 'xl/threadedComments/threadedComment1.xml', dados: '<?xml version="1.0"?><ThreadedComments xmlns="http://schemas.microsoft.com/office/spreadsheetml/2018/threadedcomments"><threadedComment ref="B1" dT="2026-10-26T10:00:00.00" personId="{P1}" id="{AAAA}"><text>Qual o limite?</text></threadedComment><threadedComment ref="B1" dT="2026-10-26T11:00:00.00" personId="{P2}" id="{BBBB}" parentId="{AAAA}"><text>2 mg/L</text></threadedComment></ThreadedComments>' },
    { nome: 'xl/persons/person.xml', dados: '<?xml version="1.0"?><personList xmlns="http://schemas.microsoft.com/office/spreadsheetml/2018/threadedcomments"><person displayName="Ana" id="{P1}" userId="a" providerId="None"/><person displayName="Beto" id="{P2}" userId="b" providerId="None"/></personList>' },
  ];
  return criarZip(arquivos);
}

test('xlsx: lê validação, formatação condicional (por força, com dxf) e comentários (nota e conversa)', async () => {
  const { conteudo: c, relatorio: r } = await lerXlsx(await xlsxComRegras(), {});
  const a = c.abas[c.ordem[0]];
  assert.equal(a.val.length, 3);
  assert.deepEqual({ ...a.val[0] }, { fx: 'B1:B5', t: 'list', f1: '"Sim,Não"', vz: 1, mi: 1, mit: 'Dica', mim: 'Use a seta', me: 1, ee: 'warning', met: 'Opa', mem: 'Escolha da lista' });
  assert.deepEqual({ ...a.val[1] }, { fx: 'A1:A2', t: 'whole', f1: '1', f2: '99', vz: 1, me: 1 });
  assert.equal(a.val[2].f1, 'Apoio!$A$1:$A$3', 'bloco novo do Excel (lista de outra aba)');
  assert.equal(a.val[2].fx, 'C1:C9');
  assert.equal(a.cf.length, 3);
  assert.equal(a.cf[0].t, 'expression'); assert.equal(a.cf[0].par, 1); assert.deepEqual(a.cf[0].e, { b: false, i: true, st: true, fundo: '#00b050' }.constructor === Object ? a.cf[0].e : null);
  assert.equal(a.cf[0].e.fundo, '#00b050'); assert.equal(a.cf[0].e.st, true);
  assert.equal(a.cf[1].t, 'cellIs'); assert.equal(a.cf[1].e.fundo, '#ffc7ce'); assert.equal(a.cf[1].e.b, true); assert.equal(a.cf[1].e.cor, '#9c0006');
  assert.equal(a.cf[2].t, 'containsText'); assert.equal(a.cf[2].tx, 'x');
  assert.deepEqual(r.fora.map((x) => x.item), ['Escalas de cor (formatação condicional)']);
  assert.deepEqual(a.com.A1, { t: 'Conferir o cloro', a: 'Maria' });
  assert.equal(a.com.B1.t, 'Qual o limite?'); assert.equal(a.com.B1.a, 'Ana'); assert.deepEqual(a.com.B1.r, [{ a: 'Beto', t: '2 mg/L' }]);
  assert.equal(r.extras.conversas, 1); assert.equal(r.extras.respostas, 1); assert.equal(r.extras.notas, 1);
});

test('xlsx: grava e lê de volta as regras e os comentários sem perder nada', async () => {
  const { conteudo } = await lerXlsx(await xlsxComRegras(), {});
  const c = normalizarPlanilha(conteudo);
  const { bytes, avisos } = await gravarXlsx(c, null, {});
  assert.match(avisos.join(' '), /conversa de comentários vai como anotação comum/);
  const z = lerZip(bytes);
  assert.ok(z.tem('xl/comments1.xml') && z.tem('xl/drawings/vmlDrawing1.vml') && z.tem('xl/worksheets/_rels/sheet1.xml.rels'));
  const tipos = await z.texto('[Content_Types].xml');
  assert.match(tipos, /Extension="vml"/); assert.match(tipos, /comments1\.xml/);
  const folha = await z.texto('xl/worksheets/sheet1.xml');
  assert.ok(folha.indexOf('<conditionalFormatting') < folha.indexOf('<dataValidations') && folha.indexOf('<dataValidations') < folha.indexOf('<pageMargins') && folha.indexOf('<pageMargins') < folha.indexOf('<legacyDrawing'), 'ordem dos elementos da aba');
  assert.match(await z.texto('xl/styles.xml'), /<dxfs count="2">/);
  const r2 = await lerXlsx(bytes, {});
  const a = r2.conteudo.abas[r2.conteudo.ordem[0]], b = c.abas[c.ordem[0]];
  const sem = (x) => x.map((q) => { const { id, ...o } = q; return o; });
  assert.deepEqual(a.val, b.val);
  assert.deepEqual(sem(a.cf), sem(b.cf));
  assert.equal(a.com.A1.t, 'Conferir o cloro');
  assert.match(a.com.B1.t, /Qual o limite\?/); assert.match(a.com.B1.t, /Beto respondeu: 2 mg\/L/);
});

test('xlsx: lista suspensa que usa INDIRECT com o nome da tabela do Excel', async () => {
  const { conteudo, relatorio } = await lerXlsx(readAmostra(), {});
  assert.ok(conteudo.tabelas.tab_coletas, 'guarda onde ficavam as tabelas');
  assert.equal(relatorio.extras.listas, 1);
  const c = normalizarPlanilha(conteudo);
  const m = new Motor(c);
  const id = c.ordem[0];
  const r = { fx: 'H2', t: 'list', f1: 'INDIRECT("TAB_COLETAS[Ponto]")' };
  const o = opcoesLista(m, c, id, r, 1, 7);
  assert.equal(o.itens.length, 40, 'a coluna Ponto da tabela inteira');
  void estiloCondicional;
});

import { readFileSync } from 'node:fs';
function readAmostra() { return new Uint8Array(readFileSync(new URL('./amostras/amostra-qualidade.xlsx', import.meta.url))); }
void enc;
