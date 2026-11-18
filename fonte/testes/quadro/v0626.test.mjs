/* v0.6.26 · Quadro: PL01 e PL04 (vaga do post-it novo), relatório do Grok de 18/11. Dados inventados. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../../src/quadro/modelo.js';
import { aplicarDiff, criarDiff } from '../../src/nucleo/diff.js';

const aplicar = (c, mud) => aplicarDiff({ conteudo: c }, criarDiff({ conteudo: c }, Q.noArquivo(mud))).conteudo;
const bate = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Põe n post-its do jeito do botão: no centro da tela, na vaga livre. */
function encher(n, tela) {
  let c = Q.conteudoQuadroVazio();
  const t = Q.TIPOS_ITEM.postit;
  const cx = tela.x + tela.w / 2 - t.w / 2, cy = tela.y + tela.h / 2 - t.h / 2;
  for (let i = 0; i < n; i++) {
    const v = Q.vagaLivre(c, cx, cy, t.w, t.h, 28, tela);
    c = aplicar(c, Q.novoItem(c, 'postit', { ...v, texto: 'Tarefa ' + (i + 1) }).mudancas);
  }
  return Q.listaItens(c).filter((o) => o.tipo === 'postit');
}

test('PL01: 30 post-its pelo botão não caem um em cima do outro (antes, do 9º em diante, caíam no mesmo lugar)', () => {
  const its = encher(30, { x: 0, y: 0, w: 1154, h: 503 });
  assert.equal(its.length, 30);
  for (let i = 0; i < its.length; i++) for (let j = i + 1; j < its.length; j++) assert.ok(!bate(its[i], its[j]), `${its[i].texto} em cima de ${its[j].texto}`);
});

test('PL01: enquanto há vaga na tela, o novo cabe inteiro nela; o primeiro fica no centro', () => {
  const tela = { x: 0, y: 0, w: 1154, h: 503 };
  const its = encher(8, tela);
  const t = Q.TIPOS_ITEM.postit;
  assert.deepEqual([its[0].x, its[0].y], [Math.round(tela.w / 2 - t.w / 2), Math.round(tela.h / 2 - t.h / 2)]);
  for (const o of its) assert.ok(o.x >= 0 && o.y >= 0 && o.x + o.w <= tela.w && o.y + o.h <= tela.h, `${o.texto} fora: ${o.x},${o.y}`);
});

test('PL04: na tela estreita do celular (390 px de quadro) o 2º e o 3º também cabem inteiros', () => {
  const tela = { x: 0, y: 0, w: 390, h: 659 };
  for (const o of encher(3, tela)) assert.ok(o.x >= 0 && o.x + o.w <= tela.w && o.y >= 0 && o.y + o.h <= tela.h, `${o.texto}: ${o.x},${o.y}`);
});

test('sem a área da tela (Kanban), a vaga continua a de antes (passo diagonal)', () => {
  let c = Q.conteudoQuadroVazio();
  const t = Q.TIPOS_ITEM.postit;
  c = aplicar(c, Q.novoItem(c, 'postit', { x: 0, y: 0 }).mudancas);
  const k = Math.ceil(Math.min(t.w, t.h) / 28);
  assert.deepEqual(Q.vagaLivre(c, 0, 0, t.w, t.h), { x: 28 * k, y: 28 * k });
});
