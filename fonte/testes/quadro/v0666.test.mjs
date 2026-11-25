/* v0.6.66 (N1): etiqueta de frente no post-it e filtro único. Falha na v0.6.65 (não havia etiquetas). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../../src/quadro/modelo.js';
import { etiquetasValidas, novaEtiqueta, mudancasEtiqueta, valorEtiqueta, contagemEtiquetas, passaNoFiltro, resumoFiltro, indiceNaColuna, raiasPorEtiqueta, CORES_ETIQUETA, SEM } from '../../src/quadro/etiquetas.js';

const aplicar = (c, mud) => { for (const [k, v] of Object.entries(mud)) { const p = k.split('.'); let o = c; for (let i = 0; i < p.length - 1; i++) o = o[p[i]]; o[p[p.length - 1]] = v; } return c; };
function quadro() {
  const c = Q.conteudoQuadroVazio();
  for (const [id, t] of [['p1', 'Um'], ['p2', 'Dois'], ['p3', 'Três']]) aplicar(c, Q.novoItem(c, 'postit', { texto: t }, { id }).mudancas);
  return c;
}

test('nova etiqueta: id, nome limpo e cor da paleta, na ordem; nome repetido devolve a mesma', () => {
  const c = quadro();
  const a = novaEtiqueta(c, '  Coletas  '); aplicar(c, a.mudancas);
  const b = novaEtiqueta(c, 'Auditoria'); aplicar(c, b.mudancas);
  assert.deepEqual(c.etiquetas, [{ id: 'e1', nome: 'Coletas', cor: CORES_ETIQUETA[0] }, { id: 'e2', nome: 'Auditoria', cor: CORES_ETIQUETA[1] }]);
  assert.equal(novaEtiqueta(c, 'coletas').id, 'e1');
  assert.ok(novaEtiqueta(c, '   ').erro);
});

test('pôr e tirar a etiqueta nos post-its; etiqueta que não existe não entra', () => {
  const c = quadro(); aplicar(c, novaEtiqueta(c, 'Coletas').mudancas);
  aplicar(c, mudancasEtiqueta(c, ['p1', 'p2'], 'e1'));
  assert.equal(c.itens.p1.fr, 'e1'); assert.equal(valorEtiqueta(c, ['p1', 'p2']), 'e1'); assert.equal(valorEtiqueta(c, ['p1', 'p3']), null);
  assert.deepEqual(mudancasEtiqueta(c, ['p3'], 'e9'), {});
  aplicar(c, mudancasEtiqueta(c, ['p1'], '')); assert.equal('fr' in c.itens.p1, false);
});

test('ao abrir: lista conferida e post-it com etiqueta que sumiu fica sem etiqueta', () => {
  const c = quadro(); c.etiquetas = [{ id: 'e1', nome: 'Coletas', cor: '#000000' }, { id: 'e1', nome: 'Repetida' }, { id: 'x y', nome: 'Inválida' }, { id: 'e2', nome: '' }];
  c.itens.p1.fr = 'e1'; c.itens.p2.fr = 'e5';
  const n = Q.normalizarQuadro(c);
  assert.deepEqual(n.etiquetas, [{ id: 'e1', nome: 'Coletas', cor: CORES_ETIQUETA[0] }]);
  assert.equal(n.itens.p1.fr, 'e1'); assert.equal('fr' in n.itens.p2, false);
  assert.equal('etiquetas' in Q.normalizarQuadro(quadro()), false, 'quadro sem etiquetas continua igual');
  assert.equal(etiquetasValidas('lixo').length, 0);
});

test('filtro: contagem, quem passa, resumo e o lugar na coluna inteira', () => {
  const c = quadro(); aplicar(c, novaEtiqueta(c, 'Coletas').mudancas); aplicar(c, mudancasEtiqueta(c, ['p1', 'p2'], 'e1'));
  const lista = Object.values(c.itens);
  assert.deepEqual(contagemEtiquetas(lista), { [SEM]: 1, e1: 2 });
  const esc = new Set([SEM]);
  assert.equal(passaNoFiltro(c.itens.p3, esc), false); assert.equal(passaNoFiltro(c.itens.p1, esc), true);
  assert.equal(resumoFiltro(c, new Set()), 'Todas as etiquetas'); assert.equal(resumoFiltro(c, esc), 'Coletas');
  const a = { id: 'a' }, b = { id: 'b' }, x = { id: 'x' }, d = { id: 'd' };
  assert.equal(indiceNaColuna([a, x, b, d], [a, b, d], 1), 2, 'antes do b, que está depois do escondido');
  assert.equal(indiceNaColuna([a, x, b, d, { id: 'y' }], [a, b, d], 3), 4, 'depois do último à vista');
});

test('Raias por setor com etiquetas: uma raia por etiqueta e os post-its dela dentro', () => {
  const c = quadro(); aplicar(c, novaEtiqueta(c, 'Coletas').mudancas); aplicar(c, novaEtiqueta(c, 'Auditoria').mudancas);
  aplicar(c, mudancasEtiqueta(c, ['p1'], 'e1')); aplicar(c, mudancasEtiqueta(c, ['p2'], 'e2'));
  const mud = raiasPorEtiqueta(c, 0, 0, { idCurto: Q.idCurto, menorZ: Q.menorZ });
  const raias = Object.values(mud).filter((i) => i.tipo === 'raia');
  assert.deepEqual(raias.map((r) => r.texto), ['Coletas', 'Auditoria']);
  assert.ok(mud['itens.p1'].y >= raias[0].y && mud['itens.p1'].y < raias[0].y + raias[0].h);
  assert.ok(mud['itens.p2'].y >= raias[1].y); assert.equal(mud['itens.p3'], undefined);
  assert.equal(raiasPorEtiqueta(quadro(), 0, 0, { idCurto: Q.idCurto, menorZ: Q.menorZ }), null, 'sem etiquetas: as raias de sempre');
});
