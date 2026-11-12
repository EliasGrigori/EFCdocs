/* Testes do anonimizador (ferramentas/anonimizar): troca os dados e mantém a estrutura. Só amostras inventadas. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { anonimizar, criarAnonimizador, estilosDeData } from '../../ferramentas/anonimizar/anonimizar.js';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { lerZip } from '../../src/planilha/xlsx/zip.js';

const amostra = (n) => new Uint8Array(readFileSync(new URL(`../amostras/${n}`, import.meta.url)));
const partes = async (bytes) => { const z = lerZip(bytes); const o = {}; for (const n of z.nomes) if (/\.(xml|rels|vml)$/.test(n)) o[n] = await z.texto(n); return o; };
const SECRETOS = ['Maria', 'Exemplo', 'Souza', 'Inventado', 'Fictícia', 'FICTÍCIA', 'Fulano', 'Beltrana', 'Carlos', 'Modelo', 'secreto', 'Aprovado', 'Reprovado', 'análise', 'Cliente', 'Pedido', 'Situação', 'empresa-ficticia', 'Venda grande', '1520.75', '880.1', '2999.99', '26110318350', '10457'];

test('anonimizador: texto inventado tem o mesmo formato (tamanho, maiúsculas, pontuação, zeros à esquerda) e é sempre o mesmo para a mesma entrada', () => {
  const A = criarAnonimizador(123);
  const n = A.texto('Maria Exemplo, 0042-A');
  assert.equal(n.length, 'Maria Exemplo, 0042-A'.length);
  assert.match(n, /^[A-Z][a-z]{4} [A-Z][a-z]{6}, 00\d\d-[A-Z]$/);
  assert.notEqual(n, 'Maria Exemplo, 0042-A');
  assert.equal(A.texto('Maria Exemplo, 0042-A'), n);
  assert.equal(A.texto('  '), '  ');
  assert.equal(A.texto('Linha 1\nLinha 2').split('\n').length, 2);
});

test('anonimizador: números mudam mas guardam o jeito (casas, inteiro, código comprido); 0 e 1 ficam; data anda um número inteiro de dias', () => {
  const A = criarAnonimizador(7);
  assert.equal(A.numero('0', false), '0'); assert.equal(A.numero('1', false), '1');
  const d = A.numero('1520.75', false); assert.notEqual(d, '1520.75'); assert.ok((d.split('.')[1] || '').length <= 2); assert.ok(Math.abs(+d - 1520.75) < 1520.75 * 0.31);
  const i = A.numero('45', false); assert.match(i, /^\d+$/); assert.notEqual(i, '45');
  const c = A.numero('26110318350', false); assert.equal(c.length, 11); assert.notEqual(c, '26110318350');
  assert.equal(A.numero('1520.75', false), d, 'o mesmo número vira sempre o mesmo');
  const dt = A.numero('46086', true); assert.equal(46086 - +dt, A.deslocDias);
  const h = A.numero('0.3541666666666667', true); assert.ok(+h > 0 && +h < 1 && h !== '0.3541666666666667');
  assert.notEqual(A.numero('0.04', false), '0.04');
});

test('anonimizador: fórmula guarda a conta e os endereços; troca texto entre aspas e nome de coluna de tabela; formato de data fica', () => {
  const A = criarAnonimizador(9);
  const col = A.texto('Valor (R$)');
  assert.equal(A.formula('SUM(TabVendas[Valor (R$)])'), `SUM(TabVendas[${col}])`);
  assert.equal(A.formula('TabVendas[[#This Row],[Valor (R$)]]*2'), `TabVendas[[#This Row],[${col}]]*2`);
  assert.equal(A.formula('TabVendas[@[Valor (R$)]]'), `TabVendas[@[${col}]]`);
  assert.equal(A.formula('TEXT(C5,"dd/mm/yyyy")&""'), 'TEXT(C5,"dd/mm/yyyy")&""');
  assert.equal(A.formula("'Aba com espaço'!A1+[1]Plan1!B2"), "'Aba com espaço'!A1+[1]Plan1!B2");
  const f = A.formula('IF(A1>2000,"Venda grande para Maria","")'); assert.match(f, /^IF\(A1>2000,"[A-Z][a-z]{4} [a-z]{6} [a-z]{4} [A-Z][a-z]{4}",""\)$/); assert.ok(!f.includes('Maria'));
});

test('anonimizador: estilos de data são reconhecidos (padrão do Excel e formato próprio)', () => {
  const x = '<styleSheet><numFmts><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="#,##0.00&quot; kg&quot;"/></numFmts><cellXfs count="4"><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/><xf numFmtId="165"/></cellXfs></styleSheet>';
  assert.deepEqual(estilosDeData(x), [false, true, true, false]);
});

test('anonimizador: na amostra inventada nenhum dado original sobra em nenhuma parte do arquivo', async () => {
  const { bytes, relatorio } = await anonimizar(amostra('amostra-anonimizar.xlsx'), { sal: 42 });
  const ps = await partes(bytes);
  for (const [nome, x] of Object.entries(ps)) for (const s of SECRETOS) assert.ok(!x.includes(s), `"${s}" sobrou em ${nome}`);
  assert.equal(relatorio.sobrou.length, 0);
  assert.equal(relatorio.imagens, 1);
  assert.deepEqual(relatorio.abas, ['VENDAS', 'RESUMO']);
  assert.deepEqual(relatorio.tabelas, ['TabVendas']);
});

test('anonimizador: a estrutura fica igual (mesclas, larguras, coluna oculta, congelamento, estilos, tabela, validação, imagem, fórmulas)', async () => {
  const orig = amostra('amostra-anonimizar.xlsx');
  const { bytes } = await anonimizar(orig, { sal: 42 });
  const a = (await lerXlsx(orig)).conteudo, b = (await lerXlsx(bytes)).conteudo;
  assert.deepEqual(b.ordem.map((id) => b.abas[id].nome), a.ordem.map((id) => a.abas[id].nome));
  for (let i = 0; i < a.ordem.length; i++) {
    const x = a.abas[a.ordem[i]], y = b.abas[b.ordem[i]];
    assert.deepEqual(Object.keys(y.cel).sort(), Object.keys(x.cel).sort(), 'as mesmas células');
    for (const k of Object.keys(x.cel)) { assert.equal(y.cel[k].s, x.cel[k].s, `estilo de ${k}`); assert.equal(y.cel[k].f != null, x.cel[k].f != null, `fórmula em ${k}`); assert.equal(typeof y.cel[k].v, typeof x.cel[k].v, `tipo de ${k}`); }
    for (const campo of ['mesc', 'larg', 'alt', 'ocC', 'ocL', 'cl', 'cc']) assert.deepEqual(y[campo], x[campo], campo);
    assert.equal((y.val || []).length, (x.val || []).length); assert.equal((y.objs || []).length, (x.objs || []).length);
  }
  assert.equal(b.estilos.length, a.estilos.length);
  const ta = Object.values(a.tabelas)[0], tb = Object.values(b.tabelas)[0];
  assert.deepEqual([tb.nome, tb.l1, tb.c1, tb.l2, tb.c2], [ta.nome, ta.l1, ta.c1, ta.l2, ta.c2]);
});

test('anonimizador: o título da tabela continua IGUAL ao texto da célula (senão o Excel apaga a tabela), inclusive com espaço no fim, quebra de linha, texto rico e título que é número', async () => {
  const { bytes } = await anonimizar(amostra('amostra-anonimizar.xlsx'), { sal: 42 });
  const c = (await lerXlsx(bytes)).conteudo; const aba = c.abas[c.ordem[0]];
  const ps = await partes(bytes); const tab = Object.entries(ps).find(([n]) => /xl\/tables\//.test(n))[1];
  const nomes = [...tab.matchAll(/<tableColumn\b[^>]*\bname="([^"]*)"/g)].map((m) => m[1].replace(/_x000a_/g, '\n').replace(/&amp;/g, '&').replace(/&quot;/g, '"'));
  const titulos = ['A4', 'B4', 'C4', 'D4', 'E4', 'F4'].map((k) => String(aba.cel[k].v));
  assert.deepEqual(nomes, titulos);
  assert.equal(titulos[4], '2024', 'título que é número fica');
  assert.ok(titulos[0].endsWith(' '), 'espaço do fim fica'); assert.ok(titulos[1].includes('\n'), 'quebra de linha fica');
  /* a fórmula que usa a coluna aponta para o nome novo */
  assert.ok(aba.cel.B10.f.includes(`[${titulos[3]}]`) || /\$?D\$?5/.test(aba.cel.B10.f), 'fórmula segue a coluna: ' + aba.cel.B10.f);
});

test('anonimizador: lista da validação continua batendo com as células; autor, impressora, caminho da pasta e link de fora saem', async () => {
  const { bytes } = await anonimizar(amostra('amostra-anonimizar.xlsx'), { sal: 42 });
  const ps = await partes(bytes); const folha = ps['xl/worksheets/sheet1.xml'];
  const lista = (folha.match(/<formula1>&quot;([^<]*)&quot;<\/formula1>/) || folha.match(/<formula1>"([^<]*)"<\/formula1>/))[1].split(',');
  const c = (await lerXlsx(bytes)).conteudo; const aba = c.abas[c.ordem[0]];
  for (const k of ['F5', 'F6', 'F7', 'F8']) assert.ok(lista.includes(String(aba.cel[k].v)), `${k} = ${aba.cel[k].v} está na lista ${lista}`);
  assert.match(ps['docProps/core.xml'], /<dc:creator\b[^>]*>Anonimo<\/dc:creator>/);
  assert.ok(!Object.keys(ps).some((n) => /printerSettings|customXml/.test(n)));
  assert.ok(Object.values(ps).every((x) => !/absPath/.test(x)));
  const rels = Object.entries(ps).filter(([n]) => n.endsWith('.rels')).map(([, x]) => x).join('');
  assert.ok(!/TargetMode="External"[^>]*Target="(?!https:\/\/exemplo\.invalid\/)/.test(rels) && !/Target="(?!https:\/\/exemplo\.invalid\/)[^"]*"[^>]*TargetMode="External"/.test(rels));
});

test('anonimizador: com "manter números" os números e as datas ficam e os textos mudam', async () => {
  const orig = amostra('amostra-anonimizar.xlsx');
  const { bytes } = await anonimizar(orig, { sal: 42, numeros: false });
  const a = (await lerXlsx(orig)).conteudo, b = (await lerXlsx(bytes)).conteudo; const x = a.abas[a.ordem[0]], y = b.abas[b.ordem[0]];
  assert.equal(y.cel.D5.v, x.cel.D5.v); assert.equal(y.cel.C5.v, x.cel.C5.v); assert.notEqual(y.cel.A5.v, x.cel.A5.v);
});

test('anonimizador: as amostras de tabelas da v0.6.9.1 e da v0.6.9.2 passam sem sobrar texto e continuam abrindo', async () => {
  for (const n of ['amostra-v0691.xlsx', 'amostra-v0692.xlsx']) {
    const { bytes, relatorio } = await anonimizar(amostra(n), { sal: 5 });
    assert.equal(relatorio.sobrou.length, 0, n);
    const c = (await lerXlsx(bytes)).conteudo; assert.ok(c.ordem.length >= 2, n);
  }
});

test('anonimizador v0.6.10 (D-21): título com quebra de linha do Windows (\\r\\n) e nome da coluna da tabela (\\n) viram o MESMO texto', async () => {
  const A = criarAnonimizador(99);
  const t = A.texto('Data \r\nColeta'), n = A.nomeColuna('Data \nColeta');
  assert.equal(t.replace(/\r/g, ''), n);
  assert.ok(t.includes('\r\n'), 'a célula continua com \\r\\n');
  /* de ponta a ponta: o título da tabela na célula passa a ter _x000D_ (como o Excel grava) */
  const z = lerZip(amostra('amostra-anonimizar.xlsx')); const arqs = [];
  for (const nome of z.nomes) {
    let d = await z.bytes(nome);
    if (nome === 'xl/worksheets/sheet1.xml') d = new TextEncoder().encode(new TextDecoder().decode(d).replace(/(<c r="B4"[^>]*><is><t>C&#243;digo do)\n/, '$1_x000D_\n'));
    arqs.push({ nome, dados: d });
  }
  const { criarZip } = await import('../../src/planilha/xlsx/zip.js');
  const { bytes } = await anonimizar(await criarZip(arqs));
  const p = await partes(bytes);
  const col = /<tableColumn id="2" name="([^"]*)"/.exec(Object.entries(p).find(([k]) => /tables\/table\d+\.xml$/.test(k))[1])[1].replace(/_x000a_/g, '\n');
  const cel = /<c r="B4"[^>]*><is><t[^>]*>([^<]*)<\/t>/.exec(p['xl/worksheets/sheet1.xml'])[1].replace(/_x000D_/g, '');
  assert.equal(cel.replace(/&#(\d+);/g, (m, h) => String.fromCharCode(+h)), col.replace(/&#(\d+);/g, (m, h) => String.fromCharCode(+h)));
});

test('anonimizador v0.6.11.1 (D-27): valores de filtro, datas do filtro, segmentação, tinta e suplemento não levam nada do original; a conferência pega valor idêntico', async () => {
  const { criarZip } = await import('../../src/planilha/xlsx/zip.js');
  const z = lerZip(amostra('amostra-anonimizar.xlsx')); const arqs = [];
  const enc = (t) => new TextEncoder().encode(t);
  for (const nome of z.nomes) {
    let d = await z.bytes(nome);
    /* filtro da tabela com dois valores de célula (um com quebra de linha) e uma data; como o Excel grava */
    if (nome === 'xl/tables/table1.xml') d = enc(new TextDecoder().decode(d).replace('<autoFilter ref="A4:F8"/>',
      '<autoFilter ref="A4:F8"><filterColumn colId="5"><filters><filter val="Aprovado"/><filter val="Reprovado"/></filters></filterColumn>'
      + '<filterColumn colId="2"><filters><dateGroupItem year="2026" month="3" day="5" dateTimeGrouping="day"/></filters></filterColumn>'
      + '<filterColumn colId="0"><customFilters><customFilter operator="equal" val="Maria Exemplo de Souza"/></customFilters></filterColumn></autoFilter>'));
    arqs.push({ nome, dados: d });
  }
  arqs.push({ nome: 'xl/slicers/slicer1.xml', dados: enc('<slicers xmlns="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main"><slicer name="Situação 1" cache="SegmentaçãodeDados_Situação" caption="Situação" rowHeight="225425"/></slicers>') });
  arqs.push({ nome: 'xl/slicerCaches/slicerCache1.xml', dados: enc('<slicerCacheDefinition xmlns="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main" name="SegmentaçãodeDados_Situação" sourceName="Situação"><extLst><x15:tableSlicerCache xmlns:x15="x" tableId="1" column="6"/></extLst></slicerCacheDefinition>') });
  arqs.push({ nome: 'xl/ink/ink1.xml', dados: enc('<inkml:ink xmlns:inkml="http://www.w3.org/2003/InkML"><inkml:trace contextRef="#ctx0" brushRef="#br0">1898 2240 0,-32 0 16,32 33 0</inkml:trace></inkml:ink>') });
  arqs.push({ nome: 'xl/webextensions/webextension1.xml', dados: enc('<we:webextension xmlns:we="x" id="{1}"><we:reference id="wa1" version="1.0" store="pt-BR" storeType="OMEX"/><we:properties><we:property name="docId" value="&quot;SEGREDO-DO-SUPLEMENTO&quot;"/></we:properties></we:webextension>') });
  const { bytes, relatorio } = await anonimizar(await criarZip(arqs));
  const p = await partes(bytes); const tab = p['xl/tables/table1.xml'];
  for (const s of ['Aprovado', 'Reprovado', 'Maria Exemplo']) assert.ok(!tab.includes(s), 'sobrou no filtro: ' + s);
  /* o valor do filtro é o MESMO texto inventado da célula (o filtro continua casando) */
  const celF5 = /<c r="F5"[^>]*><is><t[^>]*>([^<]*)<\/t>/.exec(p['xl/worksheets/sheet1.xml'])[1];
  assert.ok(tab.includes(`<filter val="${celF5}"/>`), 'filtro casa com a célula F5');
  assert.ok(!/year="2026" month="3" day="5"/.test(tab), 'a data do filtro andou junto com as datas');
  assert.match(tab, /<dateGroupItem year="\d{4}" month="\d+" day="\d+" dateTimeGrouping="day"\/>/);
  /* segmentação: legenda e campo de origem iguais ao nome da coluna já trocado */
  const col6 = /<tableColumn id="6" name="([^"]*)"/.exec(tab)[1];
  assert.ok(p['xl/slicers/slicer1.xml'].includes(`caption="${col6}"`)); assert.ok(p['xl/slicerCaches/slicerCache1.xml'].includes(`sourceName="${col6}"`));
  assert.ok(!/1898 2240/.test(p['xl/ink/ink1.xml']), 'tinta apagada'); assert.ok(!/SEGREDO/.test(p['xl/webextensions/webextension1.xml']), 'configuração do suplemento apagada');
  assert.equal(relatorio.sobrou.length, 0, JSON.stringify(relatorio.sobrou)); assert.ok(relatorio.conferidosTodos > 10);
  assert.ok(!relatorio.naoConhecidas.some((n) => /slicer|ink|webextension/.test(n)), 'essas partes agora são tratadas: ' + relatorio.naoConhecidas);
});
