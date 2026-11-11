/* Testes da v0.6.9.1: o nome de cada coluna da tabela do Excel é igual ao texto da célula do título
   (espaço no fim e quebra de linha contam), senão o Excel "repara" o arquivo e apaga a tabela. Amostra inventada. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { gravarXlsx, nomeDeColunaXlsx } from '../../src/planilha/xlsx/gravar.js';
import { lerZip } from '../../src/planilha/xlsx/zip.js';

const amostra = (n) => new Uint8Array(readFileSync(new URL(`../amostras/${n}`, import.meta.url)));
const texto = async (bytes) => {
  const z = lerZip(bytes);
  const out = {};
  for (const n of z.nomes) out[n] = await z.texto(n);
  return out;
};
const idDe = (c, nome) => c.ordem.find((id) => c.abas[id].nome === nome);

test('v0.6.9.1: nome de coluna da tabela como o Excel grava (quebra de linha em _x000a_, espaço no fim mantido)', () => {
  assert.equal(nomeDeColunaXlsx('Data \r\nColheita'), 'Data _x000a_Colheita');
  assert.equal(nomeDeColunaXlsx('Data\nAnálise '), 'Data_x000a_Análise ');
  assert.equal(nomeDeColunaXlsx('Hora da Coleta '), 'Hora da Coleta ');
  assert.equal(nomeDeColunaXlsx('A & B "x"'), 'A &amp; B &quot;x&quot;');
  assert.equal(nomeDeColunaXlsx('a_x000d_b'), 'a_x005F_x000d_b', 'um texto que já parece código do Excel é protegido');
});

test('v0.6.9.1: título com espaço no fim e quebra de linha: a tabela volta com o nome idêntico ao da célula', async () => {
  const c = (await lerXlsx(amostra('amostra-v066.xlsx'))).conteudo;
  const d = c.abas[idDe(c, 'Dados')];
  d.cel.B1 = { ...d.cel.B1, v: 'Ponto de\r\nColeta ' };
  d.cel.C1 = { ...d.cel.C1, v: 'Cloro (ppm) ' };
  const { bytes, avisos } = await gravarXlsx(c);
  const arq = await texto(bytes);
  assert.ok(arq['xl/tables/table1.xml'], 'a tabela continua tabela; avisos: ' + avisos.join(' | '));
  assert.match(arq['xl/tables/table1.xml'], /<tableColumn id="2" name="Ponto de_x000a_Coleta "\/><tableColumn id="3" name="Cloro \(ppm\) "\/>/);
  /* abre de novo: continua sendo tabela */
  const c2 = (await lerXlsx(bytes)).conteudo;
  assert.equal(Object.keys(c2.tabelas).length, 1);
});

test('v0.6.9.1: título só com espaços ou repetido (sem diferença de maiúsculas) continua indo como faixa normal', async () => {
  const c = (await lerXlsx(amostra('amostra-v066.xlsx'))).conteudo;
  const d = c.abas[idDe(c, 'Dados')];
  d.cel.B1 = { ...d.cel.B1, v: '   ' };
  assert.ok(!(await texto((await gravarXlsx(c)).bytes))['xl/tables/table1.xml']);
  const c2 = (await lerXlsx(amostra('amostra-v066.xlsx'))).conteudo;
  const d2 = c2.abas[idDe(c2, 'Dados')];
  d2.cel.B1 = { ...d2.cel.B1, v: 'SEMANA' };
  assert.ok(!(await texto((await gravarXlsx(c2)).bytes))['xl/tables/table1.xml']);
});

test('v0.6.9.1: fórmula que já vem com #REF! do Excel é contada à parte (não é falta de cálculo do EFCdocs)', async () => {
  const { criarZip } = await import('../../src/planilha/xlsx/zip.js');
  const enc = (t) => new TextEncoder().encode(t);
  const CAB = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const bytes = await criarZip([
    { nome: '[Content_Types].xml', dados: enc(CAB + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>') },
    { nome: '_rels/.rels', dados: enc(CAB + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>') },
    { nome: 'xl/workbook.xml', dados: enc(CAB + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Dados" sheetId="1" r:id="rId1"/></sheets></workbook>') },
    { nome: 'xl/_rels/workbook.xml.rels', dados: enc(CAB + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>') },
    { nome: 'xl/worksheets/sheet1.xml', dados: enc(CAB + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="e"><f>_xlfn.SINGLE(IF(_xlfn.SINGLE(Dados!#REF!:Dados!#REF!)=0,"",Dados!#REF!))</f><v>#REF!</v></c><c r="B1"><f>SUM(1,2)</f><v>3</v></c></row></sheetData></worksheet>') },
  ]);
  const { relatorio } = await lerXlsx(bytes);
  assert.equal(relatorio.comRef, 1);
  assert.equal(relatorio.semCalculo, 0, 'não conta como falta de cálculo');
});

test('v0.6.9.1: amostra-v0691.xlsx: a tabela volta com os nomes iguais aos do Excel e as fórmulas com #REF! são contadas à parte', async () => {
  const lido = await lerXlsx(amostra('amostra-v0691.xlsx'));
  assert.equal(lido.relatorio.comRef, 5);
  assert.equal(lido.relatorio.semCalculo, 0);
  const { bytes } = await gravarXlsx(lido.conteudo);
  const t1 = (await texto(bytes))['xl/tables/table1.xml'];
  assert.ok(t1, 'a tabela voltou');
  assert.match(t1, /<tableColumn id="2" name="Data _x000a_Coleta"\/><tableColumn id="3" name="Hora da Coleta "\/><tableColumn id="4" name="Ponto_x000a_de coleta"\/>/);
});
