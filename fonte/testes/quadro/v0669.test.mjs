/* v0.6.69 (R44 parte 2): histórico de quem fez cada atualização do cartão. Falha na v0.6.68 (não existia). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../../src/quadro/modelo.js';
import { mudancasLigarFluxo } from '../../src/quadro/fluxoKanban.js';
import { registrarTudo, registrarHistorico, linhasHistorico, comLinha, MAX_HIST, JUNTAR_MS } from '../../src/quadro/historico.js';
import { mudancasTarefa } from '../../src/quadro/tarefa.js';

const aplicar = (c, mud) => { for (const [k, v] of Object.entries(mud)) { const p = k.split('.'); let o = c; for (let i = 0; i < p.length - 1; i++) o = o[p[i]]; o[p[p.length - 1]] = v; } return c; };
const t = (min) => new Date(Date.parse('2026-11-26T10:00:00Z') + min * 60000);
const op = (quem, min, rastrear = true) => ({ rastrear, quem, agora: t(min) });
function quadro() {
  const c = Q.conteudoQuadroVazio();
  aplicar(c, Q.novoItem(c, 'postit', { texto: 'Conferir balança' }, { id: 'p1' }).mudancas);
  aplicar(c, Q.novoItem(c, 'processo', { texto: 'Coletar' }, { id: 'a1' }).mudancas);
  return c;
}
const vai = (c, mud, o) => aplicar(c, registrarTudo(c, mud, o));

test('cada mudança do cartão vira uma linha com quem e quando; a coluna guarda o nome da hora', () => {
  const c = quadro();
  vai(c, Q.mudancasMoverKanban(c, 'p1', 'c2'), op('Pessoa A', 0));
  vai(c, mudancasTarefa(c, 'p1', { resp: 'Pessoa C', prazo: '2026-11-30' }), op('Pessoa B', 10));
  vai(c, Q.mudancasCampo(c, ['p1'], { texto: 'Conferir balança 2' }), op('Pessoa B', 20));
  vai(c, Q.mudancasCampo(c, ['p1'], { trava: true }), op('Pessoa A', 30));
  const h = c.itens.p1.hist;
  assert.deepEqual(h.map((l) => l.o), ['col', 'resp', 'prazo', 'texto', 'trava']);
  assert.deepEqual([h[0].de, h[0].para, h[0].q], ['A fazer', 'Fazendo', 'Pessoa A']);
  const l = linhasHistorico(c.itens.p1);
  assert.equal(l[0].texto, 'travou o cartão');
  assert.equal(l.at(-1).texto, 'moveu de “A fazer” para “Fazendo”');
  assert.match(l[2].texto, /pôs o prazo 30\/11\/2026/);
  assert.equal(l[3].texto, 'passou para Pessoa C');
});

test('fora de Documentos internos nada vai para o histórico', () => {
  const c = quadro();
  vai(c, Q.mudancasMoverKanban(c, 'p1', 'c2'), op('Pessoa A', 0, false));
  vai(c, Q.mudancasCampo(c, ['p1'], { texto: 'x' }), op('Pessoa A', 1, false));
  assert.equal(c.itens.p1.hist, undefined);
});

test('a mesma pessoa no mesmo campo em pouco tempo vira uma linha só; ir e voltar de coluna some', () => {
  const c = quadro();
  for (let i = 0; i < 5; i++) vai(c, Q.mudancasCampo(c, ['p1'], { texto: 'abc'.slice(0, (i % 3) + 1) + i }), op('Pessoa A', i * 0.2));
  assert.equal(c.itens.p1.hist.length, 1);
  assert.equal(c.itens.p1.hist[0].para, c.itens.p1.texto);
  vai(c, Q.mudancasMoverKanban(c, 'p1', 'c2'), op('Pessoa A', 5));
  vai(c, Q.mudancasMoverKanban(c, 'p1', 'c1'), op('Pessoa A', 5.5));
  assert.deepEqual(c.itens.p1.hist.map((l) => l.o), ['texto']);
  vai(c, Q.mudancasCampo(c, ['p1'], { texto: 'outra pessoa' }), op('Pessoa B', 6));
  assert.equal(c.itens.p1.hist.length, 2, 'outra pessoa é outra linha');
  vai(c, Q.mudancasCampo(c, ['p1'], { texto: 'bem depois' }), op('Pessoa B', 6 + JUNTAR_MS / 60000 + 1));
  assert.equal(c.itens.p1.hist.length, 3, 'depois de um tempo é outra linha');
});

test('cartão criado num arquivo dos internos começa com "criou"; escrever logo depois não vira outra linha', () => {
  const c = quadro();
  const r = Q.novoItem(c, 'postit', { texto: '' }, { id: 'p2' });
  vai(c, r.mudancas, op('Pessoa A', 0));
  vai(c, Q.mudancasCampo(c, ['p2'], { texto: 'Novo' }), op('Pessoa A', 0.5));
  assert.deepEqual(c.itens.p2.hist.map((l) => l.o), ['criou']);
  assert.equal(linhasHistorico(c.itens.p2)[0].texto, 'criou o cartão');
});

test('colar não leva o histórico do original; decisão e atividade com o fluxo desligado não têm histórico', () => {
  const c = quadro();
  vai(c, Q.mudancasMoverKanban(c, 'p1', 'c3'), op('Pessoa A', 0));
  const r = Q.colar(c, Q.copiar(c, ['p1']));
  const mud = registrarTudo(c, r.mudancas || r, op('Pessoa B', 1));
  const nova = Object.values(mud).find((v) => v && v.id && v.id !== 'p1' && v.tipo === 'postit');
  assert.deepEqual(nova.hist.map((l) => [l.o, l.q]), [['criou', 'Pessoa B']]);
  vai(c, Q.mudancasCampo(c, ['a1'], { texto: 'Coletar 2' }), op('Pessoa A', 2));
  assert.equal(c.itens.a1.hist, undefined);
  aplicar(c, mudancasLigarFluxo(c, true));
  vai(c, Q.mudancasCampo(c, ['a1'], { texto: 'Coletar 3' }), op('Pessoa A', 3));
  assert.equal(c.itens.a1.hist.length, 1, 'com o fluxo ligado, a atividade tem histórico');
});

test('o arquivo guarda e relê; linha inválida some; fica só o fim da lista', () => {
  const c = quadro();
  vai(c, Q.mudancasMoverKanban(c, 'p1', 'c2'), op('Pessoa A', 0));
  const lido = Q.normalizarQuadro(JSON.parse(JSON.stringify(c)));
  assert.deepEqual(lido.itens.p1.hist, c.itens.p1.hist);
  c.itens.p1.hist = [...c.itens.p1.hist, { q: 'X', em: 'ontem', o: 'col' }, { q: 'Y', em: t(1).toISOString(), o: 'inventado' }];
  assert.equal(Q.normalizarQuadro(c).itens.p1.hist.length, 1);
  let h = [];
  for (let i = 0; i < MAX_HIST + 15; i++) h = comLinha(h, { q: 'P' + i, em: t(i).toISOString(), o: 'texto', para: String(i) });
  assert.equal(h.length, MAX_HIST);
  assert.equal(h.at(-1).para, String(MAX_HIST + 14));
  c.itens.p1.hist = Array.from({ length: 60 }, (_, i) => ({ q: 'P', em: t(i).toISOString(), o: 'gut', para: String(i) }));
  assert.equal(Q.normalizarQuadro(c).itens.p1.hist.length, MAX_HIST);
});

test('mudar só a ordem dentro da coluna e mexer em outro cartão não suja o histórico', () => {
  const c = quadro();
  aplicar(c, Q.novoItem(c, 'postit', { texto: 'B' }, { id: 'p3' }).mudancas);
  const mud = registrarHistorico(c, Q.mudancasMoverKanban(c, 'p3', 'c1', 0), op('Pessoa A', 0));
  for (const v of Object.values(mud)) assert.equal(v.hist, undefined);
});
