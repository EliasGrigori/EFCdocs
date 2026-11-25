/* v0.6.56: D-84 (códigos Q-001 sem buracos depois de excluir), Ctrl+A em dois passos e D-83 (linhas na Atividade com código). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../../src/quadro/modelo.js';
import { proximaSelecaoTudo, ligadosA } from '../../src/quadro/selecao.js';
import { linhasQueCabem } from '../../src/quadro/postit.js';
import { aplicarDiff, criarDiff } from '../../src/nucleo/diff.js';

const aplicar = (c, mud) => aplicarDiff({ conteudo: c }, criarDiff({ conteudo: c }, Q.noArquivo(mud))).conteudo;
function quadro(tipos) {
  let c = Q.conteudoQuadroVazio();
  const ids = [];
  for (const t of tipos) { const r = Q.novoItem(c, t); c = aplicar(c, r.mudancas); ids.push(r.item.id); }
  return { c, ids };
}
const cods = (c) => Q.listaItens(c).filter((i) => i.cod).map((i) => i.cod).sort();

test('D-84: excluir um item do meio fecha o buraco na numeração', () => {
  let { c, ids } = quadro(['postit', 'processo', 'postit', 'decisao']);
  assert.deepEqual(cods(c), ['Q-001', 'Q-002', 'Q-003', 'Q-004']);
  c = aplicar(c, Q.mudancasExcluir(c, [ids[1]]));
  assert.deepEqual(cods(c), ['Q-001', 'Q-002', 'Q-003']);
  assert.equal(c.itens[ids[2]].cod, 'Q-002');
  assert.equal(c.itens[ids[3]].cod, 'Q-003');
  assert.equal(c.seq, 3);
  const r = Q.novoItem(c, 'postit');
  assert.equal(r.item.cod, 'Q-004');
});

test('D-84: a ordem dos códigos se mantém e itens sem código não contam', () => {
  let { c, ids } = quadro(['postit', 'texto', 'postit', 'postit', 'postit']);
  c = aplicar(c, Q.mudancasExcluir(c, [ids[0], ids[3]]));
  assert.equal(c.itens[ids[2]].cod, 'Q-001');
  assert.equal(c.itens[ids[4]].cod, 'Q-002');
  assert.equal(c.itens[ids[1]].cod, undefined);
  assert.equal(c.seq, 2);
});

test('D-84: excluir o último não mexe nos outros e libera o número', () => {
  let { c, ids } = quadro(['postit', 'postit', 'postit']);
  const mud = Q.mudancasExcluir(c, [ids[2]]);
  assert.deepEqual(Object.keys(mud).sort(), ['itens.' + ids[2], 'seq'].sort());
  c = aplicar(c, mud);
  assert.equal(Q.novoItem(c, 'postit').item.cod, 'Q-003');
});

test('Ctrl+A: com um item escolhido, primeiro os ligados a ele por setas; depois tudo', () => {
  let { c, ids } = quadro(['processo', 'processo', 'processo', 'processo', 'raia']);
  for (const [a, b] of [[0, 1], [1, 2]]) c = aplicar(c, Q.novaSeta(c, ids[a], ids[b]).mudancas);
  assert.deepEqual(ligadosA(c, [ids[0]]).sort(), [ids[0], ids[1], ids[2]].sort());
  const p1 = proximaSelecaoTudo(c, [ids[2]]);
  assert.deepEqual([...p1].sort(), [ids[0], ids[1], ids[2]].sort());
  const p2 = proximaSelecaoTudo(c, p1);
  assert.deepEqual([...p2].sort(), [ids[0], ids[1], ids[2], ids[3]].sort());
  assert.deepEqual([...proximaSelecaoTudo(c, [])].sort(), [...p2].sort());
  /* item sem setas: já está "inteiro", vai direto para tudo */
  assert.equal(proximaSelecaoTudo(c, [ids[3]]).length, 4);
});

test('D-83: a Atividade e a Entrada/Saída com código continuam com 3 linhas', () => {
  for (const tipo of ['processo', 'dados']) {
    const it = { tipo, w: 170, h: 74 };
    assert.equal(linhasQueCabem(it, false, false, true), 3);
    assert.equal(linhasQueCabem(it, false, false, false), 3);
  }
});
