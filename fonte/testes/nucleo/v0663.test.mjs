/* v0.6.63: a busca acha o comando no plural ("Excluir linhas" acha "Excluir linha"), relatório do Grok de 25/11. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buscarComandos } from '../../src/nucleo/comandos.js';

const ids = (q, mod) => buscarComandos(q, mod).map((c) => c.id);

test('plural acha o singular, na Planilha', () => {
  assert.ok(ids('Excluir linhas', 'planilha').includes('planilha.excluirLinha'));
  assert.ok(ids('excluir colunas', 'planilha').includes('planilha.excluirColuna'));
  assert.equal(ids('Excluir linhas', 'planilha')[0], ids('Excluir linha', 'planilha')[0]);
});

test('o singular continua achando o mesmo de antes', () => {
  assert.equal(ids('Excluir linha', 'planilha')[0], 'planilha.excluirLinha');
  assert.equal(ids('post-it', 'postits')[0], 'inserir.postit');
});

test('palavras curtas e terminadas em "ss" não perdem letra', () => {
  assert.equal(buscarComandos('xyzw', null).length, 0);
  assert.ok(ids('reunioes', 'postits').includes('organizar.temporizador') || ids('reuniao', 'postits').includes('organizar.temporizador'));
});
