/* Testes da v0.6.6: correções do Grok (PDF com transparência, painel numa página, aba renomeada nos gráficos,
   formas que esticam com as linhas, grupo de uma forma só, tabela do Excel, zeroHeight) e acabamento dos gráficos
   (título ligado a célula, legenda e área no lugar, rótulos com o valor das células, caixas de texto por cima),
   largura e altura padrão do arquivo. Amostras inventadas: amostra-formas.xlsx, amostra-qualidade.xlsx, amostra-v066.xlsx. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lerXlsx, larguraPadraoDoExcel } from '../src/planilha/xlsx/ler.js';
import { gravarXlsx } from '../src/planilha/xlsx/gravar.js';
import { lerZip } from '../src/planilha/xlsx/zip.js';
import { xmlComNomesAtuais, nomesNasFormulas } from '../src/planilha/xlsx/graficosXlsx.js';
import { normalizarPlanilha } from '../src/planilha/modelo.js';
import { ajustarObjetosEstrutura, esticaComCelulas } from '../src/planilha/objetos.js';
import { sugestaoPainel } from '../src/planilha/impressao.js';
import { separarAlfa, pdfDasPaginas } from '../src/planilha/impressaoPdf.js';
import { svgDoGrafico } from '../src/planilha/desenhoGrafico.js';
import { normalizarG } from '../src/planilha/graficos.js';
import * as O from '../src/planilha/operacoes.js';
import { eixo } from '../src/planilha/modelo.js';

const amostra = (n) => new Uint8Array(readFileSync(new URL(`./amostras/${n}`, import.meta.url)));
const ler = async (n) => (await lerXlsx(amostra(n))).conteudo;
const idDe = (c, nome) => c.ordem.find((id) => c.abas[id].nome === nome);
const aplicar = (c, mud) => {
  const n = JSON.parse(JSON.stringify(c));
  for (const [k, v] of Object.entries(mud)) {
    const p = k.replace(/^conteudo\./, '').split('.');
    let o = n;
    for (let i = 0; i < p.length - 1; i++) { o[p[i]] = o[p[i]] || {}; o = o[p[i]]; }
    if (v === undefined) delete o[p[p.length - 1]]; else o[p[p.length - 1]] = v;
  }
  return n;
};
const texto = async (bytes) => {
  const z = lerZip(bytes);
  const out = {};
  for (const n of z.nomes) out[n] = await z.texto(n);
  return out;
};

test('v0.6.6: aba renomeada: o gráfico do Excel volta com o XML original e o nome novo (também depois de passar pelo modelo do app)', async () => {
  const c0 = await ler('amostra-formas.xlsx');
  for (const c of [c0, normalizarPlanilha(JSON.parse(JSON.stringify(c0)))]) {
    const c2 = aplicar(c, O.renomearAba(c, idDe(c, 'Dados'), 'Base'));
    const arq = await texto((await gravarXlsx(c2)).bytes);
    const ch = Object.keys(arq).find((n) => /charts\/chart\d+\.xml$/.test(n));
    const nomes = nomesNasFormulas(arq[ch]);
    assert.ok(nomes.length >= 2, 'tem fórmulas');
    assert.ok(nomes.every((n) => n === 'Base'), 'só o nome novo: ' + nomes.join(','));
    assert.match(arq[ch], /<chartSpace xmlns=/, 'o XML original (sem prefixo) foi mantido');
  }
});

test('v0.6.6: troca de nome no XML do gráfico: aspas, acento e aba que sumiu', () => {
  const c = { abas: { a1: { nome: 'Ações Corretivas' }, a2: { nome: 'Base 2' } } };
  const xml = "<c:f>'Ações'!$A$1:$A$3</c:f><c:f>Dados!$B$1</c:f>";
  const r = xmlComNomesAtuais(xml, { a1: 'Ações', a2: 'Dados' }, c);
  assert.deepEqual(nomesNasFormulas(r), ['Ações Corretivas', 'Base 2']);
  assert.equal(xmlComNomesAtuais(xml, { a9: 'Dados' }, c), null, 'aba apagada: refaz o gráfico');
  assert.equal(xmlComNomesAtuais(xml, {}, c), null, 'sem saber os nomes e com aba que não existe: refaz');
});

test('v0.6.6: PDF: imagem com partes transparentes vai com máscara de opacidade (nada de retângulo branco)', () => {
  const px = new Uint8ClampedArray([10, 20, 30, 255, 255, 255, 255, 0, 1, 2, 3, 128]);
  const s = separarAlfa(px);
  assert.deepEqual([...s.alfa], [255, 0, 128]);
  assert.deepEqual([...s.rgb], [10, 20, 30, 255, 255, 255, 1, 2, 3]);
  assert.equal(separarAlfa(new Uint8ClampedArray([1, 2, 3, 255])), null, 'toda opaca: continua JPEG');
  const im = { rgb: new Uint8Array(3), alfa: new Uint8Array([7]), flate: false, w: 1, h: 1 };
  const pdf = new TextDecoder('latin1').decode(pdfDasPaginas([{ W: 100, H: 100, ops: [{ k: 'img', svg: 's', x: 0, y: 0, w: 10, h: 10 }] }], { imagens: new Map([['s', im]]) }));
  assert.match(pdf, /\/ColorSpace \/DeviceGray/);
  assert.match(pdf, /\/SMask \d+ 0 R/);
  assert.doesNotMatch(pdf, /DCTDecode/);
});

test('v0.6.6: painel de formas maior que o papel: sugere "Aba toda numa página" (e deitada); configuração da pessoa vale', () => {
  const s = sugestaoPainel(undefined, [{ w: 900, h: 660 }]);
  assert.equal(s.imp.escala.modo, 'pagina');
  assert.equal(s.imp.orient, 'paisagem');
  assert.match(s.nota, /Aba toda numa página/);
  assert.equal(sugestaoPainel(undefined, [{ w: 200, h: 100 }]), null, 'forma pequena: nada muda');
  assert.equal(sugestaoPainel({ escala: { modo: 'colunas' } }, [{ w: 900, h: 660 }]), null, 'quem escolheu a escala não é contrariado');
  const r = sugestaoPainel({ orient: 'retrato' }, [{ w: 900, h: 660 }]);
  assert.equal(r.imp.orient, 'retrato', 'orientação salva fica');
  assert.equal(sugestaoPainel(undefined, []), null);
});

test('v0.6.6: inserir linhas no meio do painel estica a forma (como "mover e dimensionar com células"); excluir encolhe', () => {
  const med = { ...eixo({}, {}, 20, 1048576), padrao: 20 };
  const painel = { id: 'p', tipo: 'forma', l: 1, c: 1, dx: 0, dy: 0, w: 900, h: 660, ed: 'twoCell', partes: [] };
  const botao = { id: 'b', tipo: 'forma', l: 5, c: 2, dx: 0, dy: 0, w: 100, h: 40, ed: 'twoCell', partes: [] };
  const graf = { id: 'g', tipo: 'grafico', l: 3, c: 2, dx: 0, dy: 0, w: 300, h: 200 };
  assert.ok(esticaComCelulas(painel) && !esticaComCelulas(graf) && !esticaComCelulas({ tipo: 'forma', partes: [] }));
  const [p2, b2, g2] = ajustarObjetosEstrutura([painel, botao, graf], 'l', 4, 2, med);
  assert.equal(p2.h, 700, 'o painel cresceu 2 linhas');
  assert.equal(p2.l, 1);
  assert.equal(b2.l, 7); assert.equal(b2.h, 40, 'o botão (abaixo) só desce');
  assert.equal(g2.h, 200, 'gráfico não estica');
  const [p3] = ajustarObjetosEstrutura([painel], 'l', 10, -3, med);
  assert.equal(p3.h, 600, 'excluir 3 linhas de dentro encolhe');
  const [p4] = ajustarObjetosEstrutura([painel], 'l', 0, 1, med);
  assert.equal(p4.l, 2); assert.equal(p4.h, 660, 'linha acima de tudo: só desce');
});

test('v0.6.6: inserir linha pela operação estica o painel de fundo da amostra', async () => {
  const c = await ler('amostra-formas.xlsx');
  const id = idDe(c, 'Painel');
  const p0 = c.abas[id].objs[0];
  const c2 = aplicar(c, O.estrutura(c, id, 'l', 10, 2));
  const p1 = c2.abas[id].objs[0];
  assert.equal(p1.h, p0.h + 2 * 20, 'cresceu duas linhas de 20 px');
});

test('v0.6.6: inserir linhas acima da célula ligada: a caixa continua mostrando o total (=C40 vira =C43)', async () => {
  const c = await ler('amostra-formas.xlsx');
  const id = idDe(c, 'Painel');
  const achar = (cc) => cc.abas[id].objs.find((o) => o.tipo === 'forma' && o.partes.some((q) => q.texto && q.texto.ligado));
  assert.equal(achar(c).partes[0].texto.ligado.ref, 'C40');
  const c2 = aplicar(c, O.estrutura(c, id, 'l', 11, 3));
  assert.equal(achar(c2).partes[0].texto.ligado.ref, 'C43');
  const arq = await texto((await gravarXlsx(c2)).bytes);
  assert.match(arq['xl/drawings/drawing1.xml'], /textlink="\$C\$43"/);
});

test('v0.6.6: grupo que tinha o gráfico e só mais uma forma vira forma simples (não sobra grupo de um só ao salvar)', async () => {
  const c = await ler('amostra-formas.xlsx');
  const A = c.abas[idDe(c, 'Painel')];
  const ig = A.objs.findIndex((o) => o.tipo === 'grafico');
  const et = A.objs[ig - 1];
  assert.equal(et.partes.length, 1);
  assert.equal(et.xo, undefined, 'sem o XML do grupo');
  const arq = await texto((await gravarXlsx(c)).bytes);
  const d = arq['xl/drawings/drawing1.xml'];
  const grupos = [...d.matchAll(/<xdr:grpSp>([\s\S]*?)<\/xdr:grpSp>/g)].map((m) => (m[1].match(/<xdr:(sp|pic|cxnSp|graphicFrame)\b/g) || []).length);
  assert.ok(grupos.every((n) => n >= 2), 'todo grupo gravado tem 2 ou mais partes: ' + grupos.join(','));
});

test('v0.6.6: tabela do Excel volta ao salvar (nome, área, títulos e estilo) e acompanha as linhas inseridas', async () => {
  const c = await ler('amostra-v066.xlsx');
  const tb = c.tabelas.tabcoletas;
  assert.equal(tb.est.nome, 'TableStyleMedium9');
  let arq = await texto((await gravarXlsx(c)).bytes);
  const t1 = arq['xl/tables/table1.xml'];
  assert.match(t1, /displayName="TabColetas" ref="A1:C8"/);
  assert.match(t1, /<tableColumn id="1" name="Semana"\/><tableColumn id="2" name="Ponto"\/><tableColumn id="3" name="Cloro"\/>/);
  assert.match(t1, /name="TableStyleMedium9"/);
  assert.match(arq['[Content_Types].xml'], /tables\/table1\.xml" ContentType="application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.table\+xml"/);
  assert.match(arq['xl/worksheets/sheet2.xml'], /<tableParts count="1"><tablePart r:id="rIdT1"\/><\/tableParts><\/worksheet>$/);
  assert.match(arq['xl/worksheets/_rels/sheet2.xml.rels'], /Id="rIdT1"[^>]*relationships\/table" Target="\.\.\/tables\/table1\.xml"/);
  /* reabre e continua tabela */
  const c2 = (await lerXlsx((await gravarXlsx(c)).bytes)).conteudo;
  assert.equal(c2.tabelas.tabcoletas.l2, 7);
  /* inserir 2 linhas no meio da tabela */
  const c3 = aplicar(c, O.estrutura(c, idDe(c, 'Dados'), 'l', 3, 2));
  assert.equal(c3.tabelas.tabcoletas.l2, 9);
  arq = await texto((await gravarXlsx(c3)).bytes);
  assert.match(arq['xl/tables/table1.xml'], /ref="A1:C10"/);
});

test('v0.6.6: tabela com título repetido ou vazio vai como faixa normal (o Excel não aceitaria) e avisa', async () => {
  const c = await ler('amostra-v066.xlsx');
  const d = c.abas[idDe(c, 'Dados')];
  d.cel.B1 = { ...d.cel.B1, v: 'Semana' };
  const { bytes, avisos } = await gravarXlsx(c);
  const arq = await texto(bytes);
  assert.ok(!arq['xl/tables/table1.xml'], 'sem tabela');
  assert.ok(avisos.some((a) => /TabColetas.*faixa normal/.test(a)), avisos.join(' | '));
});

test('v0.6.6: largura e altura padrão do arquivo (64 px / 20 px; 89 px na aba com 12,71) e voltam ao salvar; zeroHeight volta', async () => {
  assert.equal(larguraPadraoDoExcel({ baseColWidth: '8' }), 64);
  assert.equal(larguraPadraoDoExcel({}), 64);
  assert.equal(larguraPadraoDoExcel({ defaultColWidth: '9.140625' }), 64);
  assert.equal(larguraPadraoDoExcel({ defaultColWidth: '12.7109375' }), 89);
  const c = await ler('amostra-v066.xlsx');
  const P = c.abas[idDe(c, 'Painel')], D = c.abas[idDe(c, 'Dados')];
  assert.equal(P.largP, 89); assert.equal(D.largP, 64); assert.equal(P.altP, 20);
  const arq = await texto((await gravarXlsx(c)).bytes);
  assert.match(arq['xl/worksheets/sheet1.xml'], /<sheetFormatPr defaultColWidth="12\.7109375" defaultRowHeight="15"/);
  assert.match(arq['xl/worksheets/sheet2.xml'], /<rowBreaks count="1" manualBreakCount="1"><brk id="10"/);
  assert.match(arq['xl/worksheets/sheet2.xml'], /<colBreaks count="1" manualBreakCount="1"><brk id="3"/);
  const z = await ler('amostra-v064.xlsx');
  const az = z.abas[z.ordem.find((id) => z.abas[id].zeroH)];
  assert.ok(az, 'aba com zeroHeight');
  const xz = Object.entries(await texto((await gravarXlsx(z)).bytes)).find(([n, t]) => /worksheets\/sheet\d+\.xml$/.test(n) && /zeroHeight="1"/.test(t));
  assert.ok(xz, 'zeroHeight gravado');
  /* com zeroHeight toda linha que aparece vai listada (senão o Excel esconderia) */
  const visiveis = [...xz[1].matchAll(/<row r="(\d+)"(?![^>]*hidden)/g)].map((m) => +m[1]);
  assert.ok(visiveis.includes(1) && visiveis.includes(2), 'linhas 1 e 2 listadas');
});

test('v0.6.6: gráfico do Excel: título ligado a célula, legenda e área no lugar, rótulos com o valor das células, caixa por cima', async () => {
  const c = await ler('amostra-v066.xlsx');
  const A = c.abas[idDe(c, 'Painel')];
  const o = A.objs.find((x) => x.tipo === 'grafico' && x.g.plano.grupos[0].tipo === 'doughnut');
  const P = o.g.plano;
  assert.deepEqual(P.titulo.ref, { aba: '', fx: 'B2' });
  assert.deepEqual(P.titulo.lay, { x: 0.05, y: 0.03 });
  assert.equal(P.legenda.lay.x, 0.72);
  assert.equal(P.area.lay.alvo, 'inner');
  assert.equal(P.grupos[0].furo, 58);
  const S = P.grupos[0].series[0];
  assert.ok(S.rotulos.faixa);
  assert.deepEqual(S.rotFaixa.txt, ['Baixo', 'Bom', 'Alto']);
  assert.equal(P.formas.length, 1);
  assert.deepEqual(P.formas[0].f.partes[0].texto.ligado, { aba: '', ref: 'C3' });
  /* desenho: a célula muda e o gráfico acompanha */
  const lerFaixa = (ref) => {
    const mapa = { B2: ['Cloro da semana 44'], 'E2:E4': ['Pouco', 'Certo', 'Muito'], C3: ['0,75'] };
    return mapa[ref.fx] ? { txt: mapa[ref.fx], num: [] } : null;
  };
  const svg = svgDoGrafico(normalizarG(o.g), null, { w: o.w, h: o.h, lerFaixa });
  assert.match(svg, /Cloro da semana 44/);
  for (const t of ['Pouco', 'Certo', 'Muito', '0,75']) assert.ok(svg.includes(t), t);
  /* salvar: o XML original volta, com a caixa por cima numa parte própria */
  const arq = await texto((await gravarXlsx(c)).bytes);
  const n = Object.keys(arq).find((k) => /charts\/chart\d+\.xml$/.test(k) && /doughnutChart/.test(arq[k]));
  assert.match(arq[n], /<c:userShapes r:id="rIdUS1"\/><\/c:chartSpace>$/);
  assert.match(arq[n], /<c15:datalabelsRange><c15:f>Painel!\$E\$2:\$E\$4<\/c15:f>/);
  const num = /chart(\d+)\.xml/.exec(n)[1];
  assert.match(arq[`xl/charts/_rels/chart${num}.xml.rels`], /chartUserShapes" Target="\.\.\/drawings\/drawingGr\d+\.xml"/);
  const dg = Object.keys(arq).find((k) => /drawingGr\d+\.xml$/.test(k));
  assert.match(arq[dg], /textlink="Painel!\$C\$3"/);
  assert.match(arq['[Content_Types].xml'], /drawingGr\d+\.xml" ContentType="application\/vnd\.openxmlformats-officedocument\.drawingml\.chartshapes\+xml"/);
  /* o gráfico mexido (refeito) continua com título ligado, posições e rótulos das células */
  const plano2 = JSON.parse(JSON.stringify(P)); plano2.grupos[0].furo = 40;
  o.g = { ...o.g, plano: plano2 };
  const arq2 = await texto((await gravarXlsx(c)).bytes);
  const x2 = arq2[n];
  assert.match(x2, /<c:title><c:tx><c:strRef><c:f>Painel!\$B\$2<\/c:f>/);
  assert.match(x2, /<c:holeSize val="40"\/>/);
  assert.match(x2, /<c:legend>[\s\S]*<c:manualLayout>[\s\S]*<c:x val="0.72"\/>/);
  assert.match(x2, /<c:plotArea><c:layout><c:manualLayout><c:layoutTarget val="inner"\/>/);
  assert.match(x2, /<c15:showDataLabelsRange val="1"\/>/);
  assert.match(x2, /<c:userShapes r:id="rIdUS1"\/><\/c:chartSpace>$/);
});

test('v0.6.6: renomear a aba muda o título ligado e os rótulos nas fórmulas do gráfico (por id da aba)', async () => {
  const c = await ler('amostra-v066.xlsx');
  const id = idDe(c, 'Painel');
  const c2 = aplicar(c, O.renomearAba(c, id, 'Resumo Semanal'));
  const arq = await texto((await gravarXlsx(c2)).bytes);
  const n = Object.keys(arq).find((k) => /charts\/chart\d+\.xml$/.test(k) && /doughnutChart/.test(arq[k]));
  assert.ok(nomesNasFormulas(arq[n]).every((x) => x === 'Resumo Semanal'), nomesNasFormulas(arq[n]).join(','));
  const dg = Object.keys(arq).find((k) => /drawingGr\d+\.xml$/.test(k));
  assert.match(arq[dg], /textlink="'Resumo Semanal'!\$C\$3"/, 'o texto ligado da caixa acompanha');
});
