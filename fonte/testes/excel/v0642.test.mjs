/* v0.6.42 · S2 da segmentação: criar, mover, mudar o tamanho, configurar e apagar; o arquivo do Excel leva o que mudou nas
   segmentações que vieram dele. Amostra inventada: testes/amostras/amostra-v0641.xlsx (ver testes/excel/v0641.test.mjs). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { gravarXlsx } from '../../src/planilha/xlsx/gravar.js';
import { lerZip } from '../../src/planilha/xlsx/zip.js';
import { Motor } from '../../src/planilha/motor.js';
import { aplicarMud, renomear } from '../../src/planilha/tabelaViva.js';
import { estrutura } from '../../src/planilha/operacoes.js';
import * as FT from '../../src/planilha/filtrosTabela.js';
import * as S from '../../src/planilha/segmentacao.js';

const abrir = async () => { const b = new Uint8Array(readFileSync(new URL('../amostras/amostra-v0641.xlsx', import.meta.url))); const c = (await lerXlsx(b)).conteudo; const id = (n) => c.ordem.find((x) => c.abas[x].nome === n); return { b, c, co: id('Coletas'), pa: id('Painel') }; };
const tocar = (c, s, texto) => { const e = S.estadoDaSeg(c, new Motor(c), s); return aplicarMud(c, FT.mudancasDosFiltros(c, e.t.aba, e.alvo.k, S.filtroAoTocar(e, texto), e.ler.textoDe, e.ler.x)); };
const seg = (c, id, nome) => c.abas[id].seg.find((s) => s.nome === nome);
const salvar = async (c, b) => { const g = await gravarXlsx(c, new Motor(c), { original: b }); const z = lerZip(g.bytes); const txt = async (n) => (z.nomes.includes(n) ? new TextDecoder().decode(await z.bytes(n)) : null); return { g, z, txt }; };

test('a segmentação guardada pela v0.6.41 (duas células) vira o formato dos objetos da grade', () => {
  const aba = { cel: {}, altP: 20, largP: 64 };
  assert.deepEqual(S.posDaSeg(aba, { a: { c1: 4, dx1: 4, l1: 1, dy1: 3, c2: 7, dx2: 0, l2: 11, dy2: 0 } }), { l: 1, c: 4, dx: 4, dy: 3, w: 188, h: 197 });
  assert.deepEqual(S.duasCelulas(aba, { l: 1, c: 4, dx: 4, dy: 3, w: 188, h: 197 }), { c1: 4, dx1: 4, l1: 1, dy1: 3, c2: 7, dx2: 0, l2: 11, dy2: 0 });
});

test('Inserir › Segmentação de dados: uma por coluna marcada, à direita da tabela, em cascata, com nome único no livro', async () => {
  const { c, co } = await abrir();
  const n = aplicarMud(c, S.novasSegs(c, co, 'tabcoletas', ['Fruta', 'Kg']));
  const [a, b] = n.abas[co].seg.slice(2);
  assert.deepEqual([a.nome, a.titulo, a.cn, a.novo, a.l, a.c, a.w, a.h], ['Fruta 2', 'Fruta', 'Fruta', 1, 0, 4, 184, 240], 'Fruta e Fruta 1 já existem');
  assert.deepEqual([b.nome, b.dx, b.dy], ['Kg', 24, 24]);
  assert.equal(S.estadoDaSeg(n, new Motor(n), b).itens.length, 8);
});

test('mover, mudar o tamanho e configurar: a que veio do Excel fica marcada como mexida; a feita no app, não', async () => {
  const { c, co } = await abrir();
  let n = aplicarMud(c, S.comSeg(c, co, 'Fruta', { l: 14, c: 1, dx: 0, dy: 0, w: 220, h: 160, titulo: 'Frutas', cols: 3 }));
  const f = seg(n, co, 'Fruta');
  assert.deepEqual([f.l, f.c, f.w, f.h, f.titulo, f.cols, f.mexida, f.a], [14, 1, 220, 160, 'Frutas', 3, 1, undefined]);
  n = aplicarMud(n, S.novasSegs(n, co, 'tabcoletas', ['Kg']));
  n = aplicarMud(n, S.comSeg(n, co, 'Kg', { w: 300 }));
  assert.equal(seg(n, co, 'Kg').mexida, undefined);
});

test('apagar: sai da aba, fica anotada para o arquivo e leva o filtro dela se nenhuma outra segmentação mexe na coluna', async () => {
  const { c, co } = await abrir();
  let n = tocar(c, seg(c, co, 'Talhão'), 'T2');
  assert.deepEqual(n.tabelas.tabcoletas.fil.cr[0], { v: ['T2'] });
  n = aplicarMud(n, S.apagarSeg(n, new Motor(n), co, 'Talhão'));
  assert.equal(seg(n, co, 'Talhão'), undefined); assert.deepEqual(n.abas[co].segFora, ['Talhão']);
  assert.equal(n.tabelas.tabcoletas.fil.cr[0], undefined, 'o filtro do Talhão saiu');
  assert.deepEqual(n.tabelas.tabcoletas.fil.cr[1], { v: ['Mamão'] }, 'o da Fruta ficou');
  const n2 = aplicarMud(n, S.apagarSeg(n, new Motor(n), co, 'Fruta'));
  assert.deepEqual(n2.tabelas.tabcoletas.fil.cr[1], { v: ['Mamão'] }, 'a Fruta da colheita (aba Painel) continua mexendo na coluna: o filtro fica');
});

test('salvar como Excel: a mexida leva lugar, tamanho, título e colunas; a apagada sai (com o cache dela); a feita no app avisa', async () => {
  const { b, c, co } = await abrir();
  let n = aplicarMud(c, S.comSeg(c, co, 'Fruta', { l: 14, c: 1, dx: 0, dy: 0, w: 192, h: 160, titulo: 'Frutas', cols: 3 }));
  n = aplicarMud(n, S.apagarSeg(n, new Motor(n), co, 'Talhão'));
  n = aplicarMud(n, S.novasSegs(n, co, 'tabcoletas', ['Kg']));
  const { g, z, txt } = await salvar(n, b);
  const sl = await txt('xl/slicers/slicer1.xml');
  assert.match(sl, /<slicer name="Fruta"[^>]*caption="Frutas"[^>]*columnCount="3"/);
  assert.doesNotMatch(sl, /name="Talhão"/);
  const desenhos = await Promise.all(z.nomes.filter((x) => /^xl\/drawings\/drawing\d+\.xml$/.test(x)).map(txt));
  const comFruta = desenhos.find((x) => /<sle:slicer [^>]*name="Fruta"/.test(x));
  assert.ok(comFruta, 'desenho da Fruta');
  assert.match(comFruta, /<xdr:from><xdr:col>1<\/xdr:col><xdr:colOff>0<\/xdr:colOff><xdr:row>14<\/xdr:row><xdr:rowOff>0<\/xdr:rowOff><\/xdr:from><xdr:to><xdr:col>4<\/xdr:col>/);
  assert.ok(!desenhos.some((x) => /name="Talhão"/.test(x)), 'o desenho da apagada saiu');
  const caches = await Promise.all(z.nomes.filter((x) => /^xl\/slicerCaches\//.test(x)).map(txt));
  assert.equal(caches.length, 1); assert.match(caches[0], /name="SegmentaçãodeDados_Fruta"/);
  assert.ok(g.avisos.some((x) => /A segmentação "Kg", feita no app, ainda não vai para o arquivo do Excel/.test(x)), g.avisos.join(' | '));
  /* e o arquivo abre de novo com o que ficou */
  const c2 = (await lerXlsx(g.bytes)).conteudo, co2 = c2.ordem[0];
  assert.deepEqual(c2.abas[co2].seg.map((s) => [s.nome, s.titulo, s.cols, s.l, s.c]), [['Fruta', 'Frutas', 3, 14, 1]]);
});

test('inserir linhas acima leva a segmentação junto (o tamanho fica); renomear a tabela mantém a segmentação ligada', async () => {
  const { c, co, pa } = await abrir();
  const n = aplicarMud(c, estrutura(c, co, 'l', 0, 2));
  const f = seg(n, co, 'Fruta');
  assert.deepEqual([f.l, f.c, f.mexida], [3, 4, 1]);
  assert.equal(f.h, seg(aplicarMud(c, S.comSeg(c, co, 'Fruta', {})), co, 'Fruta').h);
  const r = renomear(c, 'tabcoletas', 'Colheita');
  const n2 = aplicarMud(c, r.mud);
  assert.equal(seg(n2, co, 'Fruta').tab, 'colheita'); assert.equal(seg(n2, pa, 'Fruta 1').tab, 'colheita');
  assert.ok(S.estadoDaSeg(n2, new Motor(n2), seg(n2, co, 'Fruta')));
});
