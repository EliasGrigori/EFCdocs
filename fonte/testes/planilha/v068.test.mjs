/* Testes da v0.6.8: o que apareceu no teste do Elias no Excel de verdade e nos relatórios do Grok (v0.6.6 e v0.6.7).
   Só a amostra inventada amostra-v068.xlsx (gerar-amostra-v068.py), que imita a ESTRUTURA da planilha real. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { gravarXlsx } from '../../src/planilha/xlsx/gravar.js';
import { lerZip } from '../../src/planilha/xlsx/zip.js';
import { porPrefixos, tirarPrefixos } from '../../src/planilha/xlsx/formulas.js';
import { ancoraXml, ancoraMais } from '../../src/planilha/xlsx/formasXlsx.js';
import { geometria } from '../../src/planilha/grade.js';
import { sugestaoPainel } from '../../src/planilha/impressao.js';
import { pacoteDoGrafico } from '../../src/planilha/graficoPlano.js';
import { normalizarObjetos } from '../../src/planilha/objetos.js';
import { pdfDasPaginas } from '../../src/planilha/impressaoPdf.js';

const amostra = (n) => new Uint8Array(readFileSync(new URL(`../amostras/${n}`, import.meta.url)));
const ler = async (n) => lerXlsx(amostra(n));
const idDe = (c, nome) => c.ordem.find((id) => c.abas[id].nome === nome);
const texto = async (bytes) => { const z = lerZip(bytes); const out = {}; for (const n of z.nomes) out[n] = await z.texto(n); return out; };
const parteDaAba = (arq, nome) => {
  const wb = arq['xl/workbook.xml'], rels = arq['xl/_rels/workbook.xml.rels'];
  const m = new RegExp(`<sheet [^>]*name="${nome.replace(/[.]/g, '\\.')}"[^>]*r:id="([^"]+)"`).exec(wb);
  const t = new RegExp(`<Relationship\\b[^>]*Id="${m[1]}"[^>]*>`).exec(rels)[0];
  return 'xl/' + /Target="([^"]+)"/.exec(t)[1].replace(/^\/?xl\//, '');
};
const formulas = (xml) => new Map([...xml.matchAll(/<c r="([A-Z]+\d+)"[^>]*>(<f[^>]*>[^<]*<\/f>)/g)].map((m) => [m[1], m[2]]));

test('v0.6.8: prefixos do Excel: a função de dentro também (SORT(UNIQUE)), nomes do LET/LAMBDA com _xlpm., TRIMRANGE como o Excel grava', () => {
  assert.equal(porPrefixos('SORT(UNIQUE(B2:B20))'), '_xlfn._xlws.SORT(_xlfn.UNIQUE(B2:B20))');
  assert.equal(porPrefixos('COUNTA(TRIMRANGE(Dados!A:A,2,2))'), 'COUNTA(_xlfn._TRO_TRAILING(Dados!A:A))');
  assert.equal(porPrefixos('TRIMRANGE(A1:A9,1,2)'), '_xlfn.TRIMRANGE(A1:A9,1,2)');
  assert.equal(porPrefixos('LET(x,Dados!C2,y,2,x*y)'), '_xlfn.LET(_xlpm.x,Dados!C2,_xlpm.y,2,_xlpm.x*_xlpm.y)');
  assert.equal(porPrefixos('LET(a,SUM(A:A),a*2)'), '_xlfn.LET(_xlpm.a,SUM(A:A),_xlpm.a*2)', 'a coluna A não vira _xlpm');
  assert.equal(porPrefixos('MAP(A1:A3,LAMBDA(v,v*2))'), '_xlfn.MAP(A1:A3,_xlfn.LAMBDA(_xlpm.v,_xlpm.v*2))');
  assert.equal(porPrefixos('TEXTJOIN(", ",TRUE,UNIQUE(A1:A9))'), '_xlfn.TEXTJOIN(", ",TRUE,_xlfn.UNIQUE(A1:A9))');
  assert.equal(porPrefixos('IF(A1="LET(x,1,x)",1,2)'), 'IF(A1="LET(x,1,x)",1,2)', 'dentro de texto não mexe');
  for (const f of ['_xlfn.LET(_xlpm.x,1,_xlpm.x)', '_xlfn._xlws.SORT(_xlfn.UNIQUE(B2:B20))', 'COUNTA(_xlfn._TRO_TRAILING(Dados!A:A))']) assert.equal(porPrefixos(tirarPrefixos(f)), f, 'ida e volta: ' + f);
});

test('v0.6.8: abrir e salvar sem mexer: todas as fórmulas do Excel 365 voltam iguais (sem o "reparo" do Excel)', async () => {
  const { conteudo: c } = await ler('amostra-v068.xlsx');
  const arq0 = await texto(amostra('amostra-v068.xlsx'));
  const arq = await texto((await gravarXlsx(c)).bytes);
  const antes = formulas(arq0[parteDaAba(arq0, 'AUX VEL')]), depois = formulas(arq[parteDaAba(arq, 'AUX VEL')]);
  assert.ok(antes.size >= 15, 'fórmulas na amostra: ' + antes.size);
  for (const [r, f] of antes) {
    const g = depois.get(r);
    /* a área do FILTER é a do cálculo de agora (o Excel refaz); o texto da fórmula tem que ser o mesmo */
    assert.equal(g && g.replace(/ ref="[^"]+"/, ''), f.replace(/ ref="[^"]+"/, ''), r);
  }
  assert.match(arq['[Content_Types].xml'], /metadata\.xml/);
});

test('v0.6.8: fórmula mexida pelo EFCdocs ganha os prefixos; fórmula que o Excel não aceitaria vai só com o valor (com aviso)', async () => {
  const { conteudo: c } = await ler('amostra-v068.xlsx');
  const A = c.abas[idDe(c, 'AUX VEL')];
  A.cel.F1 = { f: 'LET(k,Dados!C2,k*3)' };
  A.cel.F2 = { f: 'SUM(1,2' }; // parêntese aberto: o Excel apagaria
  const { bytes, avisos } = await gravarXlsx(c);
  const fs = formulas((await texto(bytes))[parteDaAba(await texto(bytes), 'AUX VEL')]);
  assert.match(fs.get('F1'), /^<f[^>]*>_xlfn\.LET\(_xlpm\.k,Dados!C2,_xlpm\.k\*3\)<\/f>$/);
  assert.equal(fs.get('F2'), undefined, 'sem a fórmula ruim');
  assert.ok(avisos.some((a) => /não aceitaria/.test(a) && /AUX VEL!F2/.test(a)), avisos.join(' | '));
});

test('v0.6.8: área derramada por cima de uma célula com conteúdo próprio não vai (o Excel apagaria a fórmula)', async () => {
  const { conteudo: c } = await ler('amostra-v068.xlsx');
  const A = c.abas[idDe(c, 'AUX VEL')];
  A.cel.A11 = { v: 'atrapalha' }; // o FILTER derrama até A10; A11 ainda livre
  A.cel.A5 = { f: '1+1' }; // agora dentro da área do FILTER
  const arq = await texto((await gravarXlsx(c)).bytes);
  const x = arq[parteDaAba(arq, 'AUX VEL')];
  assert.match(x, /<c r="A2"[^>]*><f t="array" ref="A2"/, 'a âncora vai sozinha');
  assert.match(x, /<c r="A5"[^>]*><f>1\+1<\/f>/);
});

test('v0.6.8: objeto que passa por cima de coluna oculta: a âncora pula a coluna (o Excel não encolhe o logotipo nem o velocímetro)', () => {
  const aba = { larg: { 2: 0 }, ocC: { 2: 1 }, largP: 64, altP: 20, alt: { 9: 0 }, ocL: { 9: 1 } };
  /* colunas 1, 2 (oculta) e 3: 64 + 0 + 64 = 128 px de largura visível */
  const xml = ancoraXml(aba, { l: 0, c: 1, dx: 0, dy: 0, w: 128, h: 30 }, '<x/>');
  assert.match(xml, /<xdr:to><xdr:col>4<\/xdr:col><xdr:colOff>0<\/xdr:colOff>/, xml);
  const y = ancoraXml(aba, { l: 8, c: 0, dx: 0, dy: 0, w: 10, h: 40 }, '<x/>');
  assert.match(y, /<xdr:row>11<\/xdr:row><xdr:rowOff>0<\/xdr:rowOff><\/xdr:to>/, 'a linha 10 oculta é pulada: ' + y);
  const a = ancoraMais(aba, 0, 1, 0, 0, 100, 0);
  assert.deepEqual([a.c, Math.round(a.dx)], [3, 36]);
});

test('v0.6.8: velocímetro dentro do grupo: volta para dentro do grupo, o logotipo vai uma vez só e a proteção e o filtro voltam', async () => {
  const { conteudo: c, relatorio } = await ler('amostra-v068.xlsx');
  const V = c.abas[idDe(c, 'VERIF. CLORO')];
  const g = V.objs.find((o) => o.tipo === 'grafico'), f = V.objs.find((o) => o.tipo === 'forma');
  assert.ok(g.noGrupo && f.grTok && g.noGrupo.tok === f.grTok);
  assert.ok(V.prot && V.prot.a.password, 'proteção com senha');
  assert.equal(relatorio.extras.protegidas, 2);
  const arq = await texto((await gravarXlsx(c)).bytes);
  const dv = arq[parteDaAba(arq, 'VERIF. CLORO').replace('worksheets/sheet', 'drawings/drawing')] || Object.entries(arq).find(([k, v]) => /drawings\/drawing\d+\.xml$/.test(k) && /Velocímetro/.test(v))[1];
  assert.match(dv, /<xdr:grpSp>(?:(?!<\/xdr:grpSp>)[\s\S])*<xdr:graphicFrame\b/, 'o gráfico está dentro do grupo');
  assert.match(dv, /<xdr:to><xdr:col>4<\/xdr:col><xdr:colOff>0<\/xdr:colOff><xdr:row>5<\/xdr:row>/, 'o logotipo vai até a coluna E, passando pela C oculta');
  assert.equal(Object.keys(arq).filter((k) => /^xl\/media\//.test(k)).length, 1, 'o logotipo das 3 abas vai uma vez só');
  const sv = arq[parteDaAba(arq, 'VERIF. CLORO')];
  assert.match(sv, /<sheetProtection sheet="1"[^>]*password="/);
  assert.match(arq['xl/workbook.xml'], /<definedName name="_xlnm\._FilterDatabase" localSheetId="\d" hidden="1">'VERIF\. CLORO'!\$B\$7:\$H\$299<\/definedName>/);
});

test('v0.6.8: o gráfico que saiu do lugar sai do grupo; o velocímetro pequeno não cresce ao abrir', async () => {
  const { conteudo: c } = await ler('amostra-v068.xlsx');
  const V = c.abas[idDe(c, 'VERIF. CLORO')];
  const g = V.objs.find((o) => o.tipo === 'grafico');
  assert.ok(g.w < 180 && g.h < 120, `tamanho do Excel: ${g.w} × ${g.h}`);
  assert.equal(normalizarObjetos([g])[0].w, g.w);
  const i = V.objs.indexOf(g);
  V.objs[i] = { ...g, dx: g.dx + 20 };
  const arq = await texto((await gravarXlsx(c)).bytes);
  const dv = Object.entries(arq).find(([k, v]) => /drawings\/drawing\d+\.xml$/.test(k) && /Velocímetro|Painel do velocímetro/.test(v))[1];
  assert.ok(!/<xdr:grpSp>(?:(?!<\/xdr:grpSp>)[\s\S])*<xdr:graphicFrame\b/.test(dv), 'solto');
  assert.equal((dv.match(/<c:chart\b/g) || []).length, 1);
});

test('v0.6.8: macros e botão de macro: o aviso ao salvar diz que não vão; comentários contados juntos', async () => {
  const { conteudo: c } = await ler('amostra-v068.xlsx');
  c.importado = { ...(c.importado || {}), temMacros: true, botoesMacro: ['IMPRIMIR SEMANA'] };
  const { avisos } = await gravarXlsx(c);
  assert.ok(avisos.some((a) => /macros \(VBA\) e o botão "IMPRIMIR SEMANA"/.test(a)), avisos.join(' | '));
});

test('v0.6.8: seleção na última linha congelada com a planilha rolada fica no lugar (e não na célula de cima)', () => {
  const tam = (n) => ({ pos: (l) => l * n, tam: () => n, em: (y) => Math.floor(y / n) });
  const G = geometria({ linhas: tam(20), colunas: tam(64), z: 0.8, sx: 0, sy: 14000, cong: { l: 7, c: 0 }, W: 1000, H: 600 });
  const y = G.yDe(6), fim = G.yFim(6);
  assert.ok(fim - y > 15 && fim - y < 17, `altura ${fim - y}`);
  assert.ok(G.yDe(7) < y, 'yDe(7) é da parte que rola (por isso não serve como borda)');
  /* com linhas congeladas, a rolagem anda de linha em linha */
  const G2 = geometria({ linhas: tam(20), colunas: tam(64), z: 1, sx: 0, sy: 13, cong: { l: 7, c: 0 }, W: 1000, H: 600 });
  assert.equal(G2.yDe(8) - G2.yFim(6), 0, 'a primeira linha que rola começa logo abaixo do congelado');
});

test('v0.6.8: Imprimir: formas e gráficos espalhados além do papel já vêm em uma página (Grok A02)', () => {
  const s = sugestaoPainel(undefined, [{ x: 64, y: 0, w: 400, h: 300 }, { x: 700, y: 40, w: 500, h: 200 }]);
  assert.ok(s && s.imp.escala.modo === 'pagina' && s.imp.orient === 'paisagem');
  assert.equal(sugestaoPainel(undefined, [{ x: 0, y: 0, w: 200, h: 100 }]), null);
});

test('v0.6.8: estilo guardado leva só a aparência (sem as barras de erro); PDF com o texto das formas pesquisável', () => {
  const p = pacoteDoGrafico({ t: 'col', fx: { fundo: '#000000', series: [{ cor: '#ff0000', erro: { tipo: 'pct', v: 5 } }] } });
  assert.deepEqual(p, { fundo: '#000000', series: [{ cor: '#ff0000' }] });
  const pdf = new TextDecoder('latin1').decode(pdfDasPaginas([{ W: 300, H: 200, ops: [{ k: 'img', x: 10, y: 10, w: 100, h: 30, svg: 's', oculto: 'Painel da Qualidade' }] }], { imagens: new Map([['s', { w: 1, h: 1, bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]) }]]) }));
  assert.match(pdf, /3 Tr \/F1 [\d.]+ Tf [\d.]+ Tz [\d.]+ [\d.]+ Td \(Painel da Qualidade\) Tj/);
});
