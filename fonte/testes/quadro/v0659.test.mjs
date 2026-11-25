/* v0.6.59: arrumar itens no Quadro (alinhar, distribuir, travar). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../../src/quadro/modelo.js';
import { mudancasAlinhar, mudancasDistribuir, mudancasTravar, trataArrumar, valorArrumar } from '../../src/quadro/arrumar.js';
import { aplicarDiff, criarDiff } from '../../src/nucleo/diff.js';

const aplicar = (c, mud) => aplicarDiff({ conteudo: c }, criarDiff({ conteudo: c }, Q.noArquivo(mud))).conteudo;
function quadro(pos) {
  let c = Q.conteudoQuadroVazio();
  const ids = [];
  for (const [x, y, tipo = 'postit'] of pos) { const r = Q.novoItem(c, tipo); c = aplicar(c, r.mudancas); c = aplicar(c, { ['itens.' + r.item.id]: { ...c.itens[r.item.id], x, y } }); ids.push(r.item.id); }
  return { c, ids };
}

test('alinhar: esquerda, direita, em cima e ao meio pela caixa dos escolhidos', () => {
  const { c, ids } = quadro([[100, 50], [260, 120], [180, 300]]);
  const it = (cc, i) => cc.itens[ids[i]];
  let d = aplicar(c, mudancasAlinhar(c, ids, 'esq'));
  assert.deepEqual(ids.map((_, i) => it(d, i).x), [100, 100, 100]);
  d = aplicar(c, mudancasAlinhar(c, ids, 'dir'));
  assert.deepEqual(ids.map((_, i) => it(d, i).x + it(d, i).w), [430, 430, 430]);
  d = aplicar(c, mudancasAlinhar(c, ids, 'topo'));
  assert.deepEqual(ids.map((_, i) => it(d, i).y), [50, 50, 50]);
  d = aplicar(c, mudancasAlinhar(c, ids, 'meio'));
  const meios = ids.map((_, i) => it(d, i).y + it(d, i).h / 2);
  assert.ok(meios.every((m) => Math.abs(m - meios[0]) <= 1));
  assert.equal(mudancasAlinhar(c, [ids[0]], 'esq'), null, 'um só não alinha');
});

test('distribuir: os das pontas ficam e o espaço entre eles fica igual', () => {
  const { c, ids } = quadro([[0, 0], [190, 0], [600, 0], [900, 0]]);
  const d = aplicar(c, mudancasDistribuir(c, ids, 'h'));
  const xs = ids.map((id) => d.itens[id].x), w = d.itens[ids[0]].w;
  assert.equal(xs[0], 0); assert.equal(xs[3], 900);
  const vaos = [xs[1] - xs[0] - w, xs[2] - xs[1] - w, xs[3] - xs[2] - w];
  assert.ok(Math.max(...vaos) - Math.min(...vaos) <= 1, String(vaos));
  assert.equal(mudancasDistribuir(c, ids.slice(0, 2), 'h'), null, 'dois não distribuem');
});

test('travar: não move, não exclui, fica fora do alinhar; destravar volta tudo', () => {
  let { c, ids } = quadro([[0, 0], [300, 80], [600, 160]]);
  const r = mudancasTravar(c, [ids[1]]);
  assert.equal(r.travar, true);
  c = aplicar(c, r.mud);
  assert.equal(c.itens[ids[1]].trava, true);
  assert.deepEqual(Q.mudancasMover(c, [ids[1]], 50, 50), {}, 'travado não anda');
  assert.ok(!('itens.' + ids[1] in Q.mudancasExcluir(c, [ids[1]])), 'travado não sai');
  const al = mudancasAlinhar(c, ids, 'topo');
  assert.ok(!('itens.' + ids[1] in al), 'o travado fica onde está');
  assert.equal(valorArrumar('organizar.travar', c, [ids[1]]), true);
  c = aplicar(c, mudancasTravar(c, [ids[1]]).mud);
  assert.equal(c.itens[ids[1]].trava, undefined);
});

test('comandos: avisam quando falta escolher; o botão só da lista não faz nada', () => {
  const { c, ids } = quadro([[0, 0], [300, 0]]);
  let aviso = '', mud = null;
  const cx = { c, selecionados: [ids[0]], aplicarQ: (m) => { mud = m; }, avisar: (t) => { aviso = t; } };
  assert.equal(trataArrumar('organizar.alinhar|esq', cx), true); assert.match(aviso, /dois ou mais/);
  assert.equal(trataArrumar('organizar.distribuir|h', { ...cx, selecionados: ids }), true); assert.match(aviso, /três ou mais/);
  assert.equal(trataArrumar('organizar.alinhar', cx), true); assert.equal(mud, null);
  assert.equal(trataArrumar('editar.copiar', cx), undefined);
});
