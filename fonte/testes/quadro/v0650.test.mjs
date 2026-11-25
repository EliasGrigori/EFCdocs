/* v0.6.50: cores dos post-its mais claras (aprovadas em 25/11) e fundo do quadro (tipo e cor, guardado no arquivo). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../../src/quadro/modelo.js';
import { fundoValido, ehFundoPadrao, estiloDoFundo, TIPOS_FUNDO, CORES_FUNDO } from '../../src/quadro/fundo.js';
import { aplicarDiff, criarDiff } from '../../src/nucleo/diff.js';

const lum = (hex) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; const [r, g, b] = [1, 3, 5].map((i) => f(parseInt(hex.slice(i, i + 2), 16))); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };

test('cores: a paleta nova tem as mesmas 8 cores pelo nome, todas mais claras que antes', () => {
  const antes = { amarelo: '#fde68a', verde: '#bbf7d0', azul: '#bfdbfe', rosa: '#fbcfe8', laranja: '#fed7aa', lilas: '#ddd6fe', cinza: '#e5e7eb', branco: '#ffffff' };
  assert.deepEqual(Q.CORES.map(([id]) => id), Object.keys(antes));
  for (const [id, hex] of Q.CORES) assert.ok(lum(hex) >= lum(antes[id]), `${id}: ${hex} não é mais clara que ${antes[id]}`);
  assert.equal(Q.COR.amarelo, '#fff4b8');
});

test('cores: o texto preto do post-it tem contraste de pelo menos 7 em todas as cores', () => {
  for (const [id, hex] of Q.CORES) {
    const c = (lum(hex) + 0.05) / (lum('#1f2328') + 0.05);
    assert.ok(c >= 7, `${id}: contraste ${c.toFixed(2)}`);
  }
});

test('fundo: sem nada guardado é o de antes (bolinhas, cor do tema)', () => {
  assert.deepEqual(fundoValido(undefined), { tipo: 'bolinhas', cor: 'padrao' });
  assert.ok(ehFundoPadrao(null));
  assert.equal(Q.normalizarQuadro(Q.conteudoQuadroVazio()).fundo, undefined);
});

test('fundo: o escolhido é guardado no arquivo, volta igual ao abrir e o Ctrl+Z desfaz', () => {
  const c = Q.conteudoQuadroVazio();
  const arq = { conteudo: c };
  const depois = aplicarDiff(arq, criarDiff(arq, Q.noArquivo({ fundo: { tipo: 'quadriculado', cor: 'salvia' } })));
  assert.deepEqual(depois.conteudo.fundo, { tipo: 'quadriculado', cor: 'salvia' });
  const reaberto = Q.normalizarQuadro(JSON.parse(JSON.stringify(depois.conteudo)));
  assert.deepEqual(reaberto.fundo, { tipo: 'quadriculado', cor: 'salvia' });
  const desfeito = aplicarDiff(depois, criarDiff(depois, Q.noArquivo({ fundo: c.fundo })));
  assert.ok(ehFundoPadrao(desfeito.conteudo.fundo));
});

test('fundo: valor desconhecido no arquivo volta ao padrão, sem quebrar', () => {
  assert.equal(Q.normalizarQuadro({ ...Q.conteudoQuadroVazio(), fundo: { tipo: 'xadrez', cor: 'roxo' } }).fundo, undefined);
  assert.deepEqual(Q.normalizarQuadro({ ...Q.conteudoQuadroVazio(), fundo: { tipo: 'linhas', cor: 'neon' } }).fundo, { tipo: 'linhas', cor: 'padrao' });
  assert.equal(Q.normalizarQuadro({ ...Q.conteudoQuadroVazio(), fundo: 'liso' }).fundo, undefined);
});

test('fundo: cada desenho anda com a vista e cresce com o zoom', () => {
  const v = { x: 37, y: -12, z: 1.5 };
  const b = estiloDoFundo({ tipo: 'bolinhas', cor: 'padrao' }, v);
  assert.match(b.backgroundImage, /radial-gradient/); assert.equal(b.backgroundSize, '33px 33px'); assert.equal(b.backgroundPosition, '37px -12px');
  assert.equal(b['--qd-cor'], undefined);
  const q = estiloDoFundo({ tipo: 'quadriculado', cor: 'creme' }, v);
  assert.equal((q.backgroundImage.match(/linear-gradient/g) || []).length, 2); assert.equal(q.backgroundPosition, '37px -12px, 37px -12px');
  assert.equal(q['--qd-cor'], '#fbf8f1');
  assert.equal((estiloDoFundo({ tipo: 'linhas', cor: 'nevoa' }, v).backgroundImage.match(/linear-gradient/g) || []).length, 1);
  assert.equal(estiloDoFundo({ tipo: 'liso', cor: 'branco' }, v).backgroundImage, 'none');
  assert.equal(TIPOS_FUNDO.length, 4); assert.equal(CORES_FUNDO.length, 7);
});
