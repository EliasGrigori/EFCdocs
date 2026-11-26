/* v0.6.71 (Q1 do relatório do Quadro): cartão irmão (Shift+Enter) e igualar tamanho. Falha na v0.6.70 (não existia). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../../src/quadro/modelo.js';
import { irmaoPasso, setaDoPai, SEM_PAI } from '../../src/quadro/mapaMental.js';
import { mudancasIgualar } from '../../src/quadro/arrumar.js';

const aplicar = (c, mud) => { for (const [k, v] of Object.entries(mud)) { const p = k.split('.'); let o = c; for (let i = 0; i < p.length - 1; i++) o = o[p[i]]; o[p[p.length - 1]] = v; } return c; };
function mapa() {
  const c = Q.conteudoQuadroVazio();
  aplicar(c, Q.novoItem(c, 'postit', { texto: 'Centro', x: 0, y: 200 }, { id: 'raiz' }).mudancas);
  aplicar(c, Q.novoItem(c, 'postit', { texto: 'Ramo 1', x: 300, y: 100, cor: 'verde' }, { id: 'r1' }).mudancas);
  aplicar(c, Q.novaSeta(c, 'raiz', 'r1', { estilo: 'curva' }).mudancas);
  return c;
}

test('o irmão nasce embaixo do cartão que está ao lado do pai, ligado ao mesmo pai, com o mesmo estilo de seta e cor', () => {
  const c = mapa();
  const r = irmaoPasso(c, 'r1');
  aplicar(c, r.mudancas);
  const n = c.itens[r.item.id];
  assert.equal(n.x, c.itens.r1.x);
  assert.equal(n.y, c.itens.r1.y + c.itens.r1.h + 30);
  assert.equal(n.cor, 'verde');
  assert.deepEqual([r.seta.de.id, r.seta.para.id, r.seta.estilo, r.seta.rotulo], ['raiz', r.item.id, 'curva', '']);
  assert.equal(setaDoPai(c, r.item.id).de.id, 'raiz');
  /* o próximo irmão desce mais um, sem ficar em cima do primeiro */
  const r2 = irmaoPasso(c, r.item.id); aplicar(c, r2.mudancas);
  assert.equal(c.itens[r2.item.id].y, n.y + n.h + 30);
});

test('cartão embaixo do pai: o irmão vai para a direita; vaga ocupada anda mais um', () => {
  const c = Q.conteudoQuadroVazio();
  aplicar(c, Q.novoItem(c, 'postit', { texto: 'Pai', x: 200, y: 0 }, { id: 'p' }).mudancas);
  aplicar(c, Q.novoItem(c, 'postit', { texto: 'Filho', x: 200, y: 250 }, { id: 'f' }).mudancas);
  aplicar(c, Q.novaSeta(c, 'p', 'f').mudancas);
  aplicar(c, Q.novoItem(c, 'postit', { texto: 'Atrapalha', x: 200 + 170 + 30, y: 250 }, { id: 'x' }).mudancas);
  const r = irmaoPasso(c, 'f');
  assert.equal(r.item.y, 250);
  assert.equal(r.item.x, 200 + 2 * (170 + 30));
});

test('cartão sem pai não cria nada e explica; atividade do fluxo puxa atividade', () => {
  const c = mapa();
  assert.deepEqual(irmaoPasso(c, 'raiz'), { erro: SEM_PAI });
  aplicar(c, Q.novoItem(c, 'inicio', { texto: 'Início', x: 0, y: 600 }, { id: 'i' }).mudancas);
  aplicar(c, Q.novoItem(c, 'processo', { texto: 'Etapa', x: 300, y: 600 }, { id: 'e' }).mudancas);
  aplicar(c, Q.novaSeta(c, 'i', 'e').mudancas);
  assert.equal(irmaoPasso(c, 'e').item.tipo, 'processo');
});

test('igualar: pelo maior, sem sair do lugar; travado e legenda ficam de fora; menos de dois não faz nada', () => {
  const c = mapa();
  c.itens.r1.w = 240; c.itens.r1.h = 160;
  const m = mudancasIgualar(c, ['raiz', 'r1'], 'wh');
  aplicar(c, m);
  assert.deepEqual([c.itens.raiz.w, c.itens.raiz.h, c.itens.raiz.x, c.itens.raiz.y], [240, 160, 0, 200]);
  const c2 = mapa(); c2.itens.r1.w = 240; c2.itens.r1.h = 160;
  aplicar(c2, mudancasIgualar(c2, ['raiz', 'r1'], 'w'));
  assert.deepEqual([c2.itens.raiz.w, c2.itens.raiz.h], [240, 130]);
  const c3 = mapa(); c3.itens.r1.w = 240; c3.itens.raiz.trava = true;
  assert.equal(mudancasIgualar(c3, ['raiz', 'r1'], 'w'), null, 'só sobra um solto');
  assert.equal(mudancasIgualar(c3, ['r1'], 'w'), null);
  assert.equal(mudancasIgualar(mapa(), ['raiz', 'r1'], 'x'), null);
});
