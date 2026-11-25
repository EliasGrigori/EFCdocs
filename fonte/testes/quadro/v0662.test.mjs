/* v0.6.62: as 12 texturas aprovadas em 25/11 (P1 a P12; P3 = B suave, P4 = C derramamento). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import * as Q from '../../src/quadro/modelo.js';
import { TEXTURAS, estiloTextura, pecasTextura, contornoAmassado, contornoRasgado, imagensDoPostit, urlTextura, alturaLinha } from '../../src/quadro/texturas.js';

const P = (tex) => ({ tipo: 'postit', tex, w: 170, h: 130 });

test('as 12 texturas, na ordem do menu', () => {
  assert.deepEqual(TEXTURAS.map((t) => t.id), ['', 'dobrado', 'amassado', 'cafe', 'fita', 'pautado', 'quadriculado', 'alfinete', 'rasgado', 'kraft', 'clipe', 'destaque']);
  for (const n of ['amassado', 'cafe', 'grao', 'kraft']) assert.ok(existsSync(`src/quadro/texturas/${n}.png`), n);
});

test('nenhuma usa o atalho "background" (D-85) e a cor vai junto como --c', () => {
  for (const { id } of TEXTURAS) {
    const e = estiloTextura(P(id || undefined), '#fbe1ec');
    assert.equal('background' in e, false, id);
    assert.equal(e['--c'], '#fbe1ec');
  }
});

test('peças de cada uma na tela', () => {
  const cls = (t) => pecasTextura(P(t), '#fff4b8').map((x) => x.cls).join(' ');
  assert.equal(cls('dobrado'), 'qi-aba'); assert.equal(cls('fita'), 'qi-fita'); assert.equal(cls('alfinete'), 'qi-alfinete qi-alfinete-sombra');
  assert.equal(cls('clipe'), 'qi-clipe qi-clipe-dentro'); assert.equal(cls('amassado'), 'qi-tex-papel'); assert.equal(cls(undefined), '');
  assert.match(pecasTextura(P('amassado'), '#fff4b8')[0].style.clipPath, /^polygon\(/);
});

test('amassado suave (B): o contorno entra no máximo 35% do catálogo (3,5% × 0,35)', () => {
  for (const [x, y] of contornoAmassado()) assert.ok(Math.min(x, 100 - x) <= 1.23 || Math.min(y, 100 - y) <= 1.23, `${x} ${y}`);
  assert.equal(contornoRasgado()[0].join(), '0,0');
});

test('imagens que cada post-it precisa e o pautado na altura da letra', () => {
  assert.deepEqual(imagensDoPostit(P(undefined)), ['liso']);
  assert.deepEqual(imagensDoPostit(P('kraft')), ['kraft', 'liso']);
  assert.deepEqual(imagensDoPostit(P('fita')), []);
  assert.equal(urlTextura('liso'), 'assets/texturas/grao.png');
  assert.equal(+alturaLinha(1).toFixed(2), 18.2);
  assert.match(estiloTextura(P('pautado'), '#fff', 1.3).backgroundImage, /23\.66px/);
});

test('o arquivo aceita as texturas novas e descarta as desconhecidas', () => {
  let c = Q.conteudoQuadroVazio();
  const r = Q.novoItem(c, 'postit'); c = { ...c, itens: { ...c.itens, [r.item.id]: { ...r.item, tex: 'clipe' } } };
  assert.equal(Q.normalizarQuadro(c).itens[r.item.id].tex, 'clipe');
  c.itens[r.item.id].tex = 'pizza';
  assert.equal(Q.normalizarQuadro(c).itens[r.item.id].tex, undefined);
});
