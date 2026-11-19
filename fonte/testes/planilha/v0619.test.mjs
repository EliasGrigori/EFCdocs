/* v0.6.19 "Tabelas vivas" (D-12, D-13, D-14, F296): a tabela cresce ao digitar embaixo, Tab abre linha, alça estica,
   estilo do Excel desenhado, Design da Tabela (nome, estilo, opções, totais, converter). Amostra inventada: amostra-v0619.xlsx. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { gravarXlsx } from '../../src/planilha/xlsx/gravar.js';
import { lerZip } from '../../src/planilha/xlsx/zip.js';
import { normalizarPlanilha } from '../../src/planilha/modelo.js';
import { Lote } from '../../src/planilha/operacoes.js';
import { Motor } from '../../src/planilha/motor.js';
import { estiloVisto } from '../../src/planilha/grade.js';
import { formatarComoTabela } from '../../src/planilha/inserir.js';
import { estiloDaTabela, pecasDoEstilo, lerNomeEstilo, GALERIA, coresDoTema, miniatura } from '../../src/planilha/tabelaEstilo.js';
import * as TV from '../../src/planilha/tabelaViva.js';

const ORIG = new Uint8Array(readFileSync(new URL('../amostras/amostra-v0619.xlsx', import.meta.url)));
const ler = async (bytes = ORIG) => normalizarPlanilha((await lerXlsx(bytes)).conteudo);
const aplicar = (c, mud) => { const o = JSON.parse(JSON.stringify(c)); for (const [k, v] of Object.entries(mud)) { const ps = k.replace(/^conteudo\./, '').split('.'); let x = o; for (const q of ps.slice(0, -1)) x = x[q] = x[q] || {}; if (v === undefined) delete x[ps.at(-1)]; else x[ps.at(-1)] = v; } return o; };
const idDe = (c, nome) => c.ordem.find((id) => c.abas[id].nome === nome);
const dec = (d) => new TextDecoder().decode(d);
async function tabelasDoArquivo(bytes) { const z = lerZip(bytes); const o = []; for (const n of z.nomes.filter((x) => /^xl\/tables\//.test(x)).sort()) o.push(dec(await z.bytes(n))); return o; }

test('estilos de fábrica: 60 na galeria, nomes do Excel, peças com as cores do tema', () => {
  assert.equal(GALERIA.reduce((s, g) => s + g.itens.length, 0), 60);
  assert.deepEqual(lerNomeEstilo('TableStyleMedium2'), { fam: 'Medium', n: 2 });
  assert.equal(lerNomeEstilo('TableStyleMedium29'), null);
  assert.equal(lerNomeEstilo('MeuEstilo'), null);
  const tema = coresDoTema({});
  const p = pecasDoEstilo('TableStyleMedium2', tema);
  assert.equal(p.cab.f, '#4472c4'); // acento 1 do Office
  assert.equal(p.cab.t, '#ffffff');
  assert.equal(p.l1.f, '#dae3f3'); // acento 1 clareado 80% (o Excel mostra #d9e1f2: diferença de arredondamento)
  for (const g of GALERIA) for (const nome of g.itens) assert.ok(pecasDoEstilo(nome, tema), nome);
  const mini = miniatura('TableStyleLight9', tema);
  assert.equal(mini[0][0].fundo, '#4472c4');
});

test('F296: a tabela que veio do Excel é desenhada (títulos, listras, totais, primeira coluna, colunas em tiras)', async () => {
  const c = await ler();
  const motor = new Motor(c);
  const co = idDe(c, 'Coletas'), es = idDe(c, 'Estoque'), re = idDe(c, 'Resumo');
  const A1 = '#' + coresDoTema(c)[4].toLowerCase(); // o acento 1 do tema do arquivo (o openpyxl grava o tema do Office 2007)
  const P2 = pecasDoEstilo('TableStyleMedium2', coresDoTema(c));
  const e = (aba, l, col) => estiloVisto(c, c.abas[aba].cel[String.fromCharCode(65 + col) + (l + 1)], motor, aba, l, col);
  assert.equal(e(co, 0, 0).fundo, A1);
  assert.equal(e(co, 0, 0).b, true);
  assert.equal(e(co, 1, 0).fundo, P2.l1.f); // primeira linha de dados com listra
  assert.equal(e(co, 2, 0).fundo, undefined); // segunda sem
  assert.equal(e(co, 9, 0).fundo, undefined); // fora da tabela
  /* Estoque: Claro 9, primeira coluna em negrito, totais com linha dupla em cima */
  assert.equal(e(es, 0, 1).fundo, A1);
  assert.equal(e(es, 2, 0).b, true);
  assert.equal(e(es, 2, 1).b, undefined);
  assert.equal(e(es, 6, 1).b, true);
  assert.equal(e(es, 6, 1).bd.t, 2);
  /* Resumo: Escuro 2, colunas em tiras (B e D) e sem listra de linha */
  assert.notEqual(e(re, 2, 1).fundo, e(re, 2, 2).fundo);
  assert.equal(e(re, 2, 1).fundo, e(re, 3, 1).fundo);
  assert.equal(e(re, 2, 1).cor, '#ffffff');
});

test('a formatação da própria célula vale por cima do estilo da tabela', async () => {
  const c = await ler();
  const co = idDe(c, 'Coletas');
  const lote = new Lote(c);
  lote.por(co, 'B2', { ...c.abas[co].cel.B2, s: lote.estilo({ fundo: '#ffff00' }) });
  const c2 = aplicar(c, lote.mudancas());
  const e = estiloVisto(c2, c2.abas[co].cel.B2, new Motor(c2), co, 1, 1);
  assert.equal(e.fundo, '#ffff00');
  assert.ok(e.bd); // as linhas da tabela continuam
});

test('D-12: digitar logo abaixo faz a tabela crescer, com a coluna calculada; um mudar só', async () => {
  const c = await ler();
  const co = idDe(c, 'Coletas');
  const lote = new Lote(c);
  lote.por(co, 'A10', { v: '10/03/2026' });
  const r = TV.crescerAoDigitar(c, lote, co, 9, 0);
  assert.deepEqual(r, { nome: 'Coletas', onde: 'linha' });
  const c2 = aplicar(c, lote.mudancas());
  const t = c2.tabelas.coletas;
  assert.equal(t.l2, 9);
  assert.equal(c2.abas[co].cel.E10.f, 'C10*D10'); // coluna calculada acompanha
  assert.equal(c2.abas[co].cel.B10, undefined);
  /* à direita: coluna nova com o título digitado */
  const lote2 = new Lote(c2);
  lote2.por(co, 'F1', { v: 'Obs' });
  assert.deepEqual(TV.crescerAoDigitar(c2, lote2, co, 0, 5), { nome: 'Coletas', onde: 'coluna' });
  const c3 = aplicar(c2, lote2.mudancas());
  assert.equal(c3.tabelas.coletas.c2, 5);
  assert.equal(c3.tabelas.coletas.cols.at(-1), 'Obs');
  /* duas linhas abaixo não cresce; tabela com totais não cresce por baixo */
  const lote3 = new Lote(c);
  lote3.por(co, 'A11', { v: 'x' });
  assert.equal(TV.crescerAoDigitar(c, lote3, co, 10, 0), null);
  const es = idDe(c, 'Estoque');
  const lote4 = new Lote(c);
  lote4.por(es, 'A8', { v: 'x' });
  assert.equal(TV.crescerAoDigitar(c, lote4, es, 7, 0), null);
});

test('coluna calculada: fórmula numa coluna vazia da tabela preenche a coluna', async () => {
  const c = await ler();
  const co = idDe(c, 'Coletas');
  const l1 = new Lote(c);
  l1.por(co, 'F1', { v: 'Dobro' });
  TV.crescerAoDigitar(c, l1, co, 0, 5);
  const c2 = aplicar(c, l1.mudancas());
  const l2 = new Lote(c2);
  l2.por(co, 'F3', { f: 'C3*2' });
  assert.equal(TV.colunaCalculadaAoDigitar(c2, l2, co, 2, 5), 7);
  const c3 = aplicar(c2, l2.mudancas());
  assert.equal(c3.abas[co].cel.F2.f, 'C2*2');
  assert.equal(c3.abas[co].cel.F9.f, 'C9*2');
});

test('D-13: Tab no fim da linha vai para o começo da próxima; na última célula abre linha nova', async () => {
  const c = await ler();
  const co = idDe(c, 'Coletas'), es = idDe(c, 'Estoque');
  assert.deepEqual(TV.tabNaTabela(c, co, 3, 4), { l: 4, c: 0 });
  assert.equal(TV.tabNaTabela(c, co, 3, 2), null);
  assert.deepEqual(TV.tabNaTabela(c, co, 8, 4), { novaLinha: 'coletas' });
  assert.deepEqual(TV.tabNaTabela(c, co, 4, 0, true), { l: 3, c: 4 });
  const r = TV.linhaNova(c, co, 'coletas');
  assert.deepEqual(r.alvo, { l: 9, c: 0 });
  const c2 = aplicar(c, r.mud);
  assert.equal(c2.tabelas.coletas.l2, 9);
  assert.equal(c2.abas[co].cel.E10.f, 'C10*D10');
  /* com linha de totais: a linha entra antes dos totais e a soma estica */
  const r2 = TV.linhaNova(c, es, 'estoque');
  const c3 = aplicar(c, r2.mud);
  assert.equal(c3.tabelas.estoque.l2, 7);
  assert.equal(c3.tabelas.estoque.tot, 1);
  assert.match(c3.abas[es].cel.B8.f, /SUBTOTAL\(109,\$?B\$?2:\$?B\$?7\)/);
  assert.equal(c3.abas[es].cel.A8.v, 'Total');
  /* linha de baixo ocupada: insere a linha na aba (o que estava embaixo desce) */
  const lote = new Lote(c);
  lote.por(co, 'C10', { v: 99 });
  const c4 = aplicar(c, lote.mudancas());
  const r3 = TV.linhaNova(c4, co, 'coletas');
  const c5 = aplicar(c4, r3.mud);
  assert.equal(c5.abas[co].cel.C11.v, 99);
  assert.equal(c5.tabelas.coletas.l2, 9);
  assert.equal(c5.abas[co].cel.E10.f, 'C10*D10');
});

test('D-14: redimensionar pela alça; não passa por cima de outra tabela; totais só nas colunas', async () => {
  const c = await ler();
  const co = idDe(c, 'Coletas');
  const r = TV.redimensionar(c, co, 'coletas', { l2: 11, c2: 5 });
  const c2 = aplicar(c, r.mud);
  assert.equal(c2.tabelas.coletas.l2, 11);
  assert.equal(c2.tabelas.coletas.c2, 5);
  assert.equal(c2.abas[co].cel.F1.v, 'Coluna6');
  assert.equal(c2.abas[co].cel.E12.f, 'C12*D12');
  const r2 = TV.redimensionar(c, co, 'coletas', { l2: 4, c2: 2 });
  const c3 = aplicar(c, r2.mud);
  assert.equal(c3.tabelas.coletas.l2, 4);
  assert.deepEqual(c3.tabelas.coletas.cols, ['Data', 'Ponto', 'Volume']);
  assert.equal(c3.abas[co].cel.A9.v, '08/03/2026'); // o que saiu da tabela fica na aba
  assert.match(TV.redimensionar(c, idDe(c, 'Estoque'), 'estoque', { l2: 9, c2: 2 }).erro, /totais/);
});

test('Design: renomear, estilo, opções, filtro, totais e converter em intervalo', async () => {
  const c = await ler();
  const co = idDe(c, 'Coletas'), es = idDe(c, 'Estoque');
  assert.match(TV.renomear(c, 'coletas', 'Estoque').erro, /Já existe/);
  assert.match(TV.renomear(c, 'coletas', '2x').erro, /nome/);
  const rn = TV.renomear(c, 'coletas', 'Amostras');
  assert.equal(rn.chave, 'amostras');
  assert.equal(aplicar(c, rn.mud).tabelas.amostras.nome, 'Amostras');
  const c2 = aplicar(c, TV.mudarEstilo(c, 'coletas', 'TableStyleLight1').mud);
  assert.equal(c2.tabelas.coletas.est.nome, 'TableStyleLight1');
  assert.equal(c2.tabelas.coletas.est.ll, 1);
  const c3 = aplicar(c, TV.mudarOpcao(c, 'coletas', 'pc').mud);
  assert.equal(c3.tabelas.coletas.est.pc, 1);
  /* v0.6.40 (T2): a tabela do Excel já vem com as setas dela (fil); o botão tira (sf) e liga de novo, sem tocar no filtro da aba */
  assert.ok(TV.filtroLigado(c, co, c.tabelas.coletas));
  const c3b = aplicar(c, TV.alternarFiltro(c, co, 'coletas').mud);
  assert.equal(c3b.tabelas.coletas.fil, undefined); assert.equal(c3b.tabelas.coletas.sf, 1); assert.ok(!TV.filtroLigado(c3b, co, c3b.tabelas.coletas));
  const c4 = aplicar(c3b, TV.alternarFiltro(c3b, co, 'coletas').mud);
  assert.deepEqual(c4.tabelas.coletas.fil, { cr: {} }); assert.equal(c4.tabelas.coletas.sf, undefined); assert.equal(c4.abas[co].fil, undefined);
  assert.ok(TV.filtroLigado(c4, co, c4.tabelas.coletas));
  /* totais: liga na Coletas (soma na última coluna), troca a função, desliga */
  const c5 = aplicar(c, TV.alternarTotais(c, co, 'coletas').mud);
  assert.equal(c5.tabelas.coletas.tot, 1);
  assert.equal(c5.tabelas.coletas.l2, 9);
  assert.equal(c5.abas[co].cel.A10.v, 'Total');
  assert.equal(c5.abas[co].cel.E10.f, 'SUBTOTAL(109,E2:E9)');
  const c6 = aplicar(c5, TV.totalDaColuna(c5, co, 'coletas', 2, 'media').mud);
  assert.equal(c6.abas[co].cel.C10.f, 'SUBTOTAL(101,C2:C9)');
  assert.equal(TV.funcaoDoTotal(c6, co, c6.tabelas.coletas, 2), 'media');
  const c7 = aplicar(c6, TV.alternarTotais(c6, co, 'coletas').mud);
  assert.equal(c7.tabelas.coletas.tot, 0);
  assert.equal(c7.abas[co].cel.A10, undefined);
  /* converter: a tabela sai e a aparência fica nas células */
  const c8 = aplicar(c, TV.converterEmIntervalo(c, es, 'estoque').mud);
  assert.equal(c8.tabelas.estoque, undefined);
  assert.equal(c8.estilos[c8.abas[es].cel.A1.s].fundo, '#' + coresDoTema(c)[4].toLowerCase());
});

test('Formatar como tabela: estilo vivo (sem pintar as células) e volta como tabela do Excel com o nome do estilo', async () => {
  const c = await ler();
  const re = idDe(c, 'Resumo');
  const lote = new Lote(c);
  for (const [k, v] of [['F2', 'Item'], ['G2', 'Qtd'], ['F3', 'a'], ['G3', 1], ['F4', 'b'], ['G4', 2]]) lote.por(re, k, { v });
  const c0 = aplicar(c, lote.mudancas());
  const r = formatarComoTabela(c0, re, { l1: 1, c1: 5, l2: 3, c2: 6 }, { nome: 'Itens', estilo: 'TableStyleMedium7', cabecalho: true, listras: true, filtro: false }, (l, cc) => c0.abas[re].cel[String.fromCharCode(65 + cc) + (l + 1)].v);
  assert.ok(!r.erro, r.erro);
  const c1 = aplicar(c0, r.mud);
  assert.equal(c1.abas[re].cel.F2.s, undefined); // nada pintado
  assert.equal(c1.tabelas.itens.est.nome, 'TableStyleMedium7');
  assert.equal(estiloVisto(c1, c1.abas[re].cel.F2, new Motor(c1), re, 1, 5).fundo, estiloDaTabela(c1.tabelas.itens, 1, 5, coresDoTema(c1)).fundo);
  assert.match(formatarComoTabela(c0, re, { l1: 2, c1: 2, l2: 4, c2: 4 }, { nome: 'Outra', cabecalho: true }, () => 'x').erro, /encosta/);
  const bytes = (await gravarXlsx(c1)).bytes || await gravarXlsx(c1);
  const xs = await tabelasDoArquivo(bytes instanceof Uint8Array ? bytes : bytes.dados);
  assert.ok(xs.some((x) => /name="Itens"/.test(x) && /TableStyleMedium7/.test(x) && /showRowStripes="1"/.test(x)));
});

test('ida e volta: a tabela que cresceu, os totais e o estilo novo voltam ao abrir o arquivo salvo', async () => {
  const c = await ler();
  const co = idDe(c, 'Coletas'), es = idDe(c, 'Estoque');
  let c2 = aplicar(c, TV.linhaNova(c, co, 'coletas').mud);
  c2 = aplicar(c2, TV.linhaNova(c2, es, 'estoque').mud);
  c2 = aplicar(c2, TV.mudarEstilo(c2, 'coletas', 'TableStyleDark5').mud);
  const g = await gravarXlsx(c2);
  const bytes = g instanceof Uint8Array ? g : g.bytes || g.dados;
  const c3 = await ler(bytes);
  assert.equal(c3.tabelas.coletas.l2, 9);
  assert.equal(c3.tabelas.coletas.est.nome, 'TableStyleDark5');
  assert.equal(c3.tabelas.estoque.l2, 7);
  assert.equal(c3.tabelas.estoque.tot, 1);
  assert.match(c3.abas[es].cel.B8.f, /SUBTOTAL\(109,\$?B\$?2:\$?B\$?7\)/);
});
