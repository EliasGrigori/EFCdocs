/* v0.6.68 (R44 parte 1): o fluxo ligado ao Kanban, com quem iniciou e quem concluiu. Falha na v0.6.67 (não existia). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../../src/quadro/modelo.js';
import { mudancasLigarFluxo, registrarAndamento, linhasAndamento, situacaoNoFluxo, colunaEfetiva, quemAgora } from '../../src/quadro/fluxoKanban.js';
import { mudancasFeito } from '../../src/quadro/postit.js';

const aplicar = (c, mud) => { for (const [k, v] of Object.entries(mud)) { const p = k.split('.'); let o = c; for (let i = 0; i < p.length - 1; i++) o = o[p[i]]; o[p[p.length - 1]] = v; } return c; };
const T1 = new Date('2026-11-25T13:00:00Z'), T2 = new Date('2026-11-25T15:30:00Z');
function quadro() {
  const c = Q.conteudoQuadroVazio();
  aplicar(c, Q.novoItem(c, 'postit', { texto: 'Nota' }, { id: 'p1' }).mudancas);
  for (const [id, t, y] of [['a1', 'Coletar amostra', 0], ['a2', 'Analisar', 120], ['a3', 'Registrar', 240]]) aplicar(c, Q.novoItem(c, 'processo', { texto: t, y }, { id }).mudancas);
  aplicar(c, Q.novoItem(c, 'decisao', { texto: 'Conforme?' }, { id: 'd1' }).mudancas);
  return c;
}
const mover = (c, id, col, op) => aplicar(c, registrarAndamento(c, Q.mudancasMoverKanban(c, id, col), op));
const [A, F, D] = ['c1', 'c2', 'c3'];

test('sem ligar, só o post-it aparece no Kanban; ligado, as atividades entram na primeira coluna, na ordem do código', () => {
  const c = quadro();
  assert.deepEqual(Object.values(Q.porColuna(c)).flat().map((x) => x.id), ['p1']);
  aplicar(c, mudancasLigarFluxo(c, true));
  assert.equal(c.fluxoKanban, true);
  const g = Q.porColuna(c);
  assert.deepEqual(g[A].map((x) => x.id), ['p1', 'a1', 'a2', 'a3']);
  assert.ok(!Object.values(g).flat().some((x) => x.id === 'd1'), 'decisão não vira cartão');
  aplicar(c, mudancasLigarFluxo(c, false));
  assert.deepEqual(Object.values(Q.porColuna(c)).flat().map((x) => x.id), ['p1']);
  assert.equal(Q.normalizarQuadro(c).fluxoKanban, undefined);
});

test('atividade nova com o fluxo ligado nasce no Kanban, no fim da primeira coluna', () => {
  const c = quadro(); aplicar(c, mudancasLigarFluxo(c, true));
  const r = Q.novoItem(c, 'processo', { texto: 'Nova' }, { id: 'a4' }); aplicar(c, r.mudancas);
  assert.equal(c.itens.a4.col, A);
  assert.deepEqual(Q.porColuna(c)[A].map((x) => x.id).slice(-1), ['a4']);
});

test('em Documentos internos: sair da primeira grava quem iniciou; chegar na última grava quem concluiu', () => {
  const c = quadro(); aplicar(c, mudancasLigarFluxo(c, true));
  mover(c, 'a1', F, { rastrear: true, quem: 'Admin', agora: T1 });
  assert.deepEqual(c.itens.a1.ini, { q: 'Admin', em: T1.toISOString() });
  assert.equal(c.itens.a1.fim, undefined);
  mover(c, 'a1', D, { rastrear: true, quem: 'Editor', agora: T2 });
  assert.deepEqual(c.itens.a1.ini, { q: 'Admin', em: T1.toISOString() }, 'quem iniciou não muda');
  assert.deepEqual(c.itens.a1.fim, { q: 'Editor', em: T2.toISOString() });
  /* direto da primeira para a última: quem conclui também iniciou */
  mover(c, 'a2', D, { rastrear: true, quem: 'Admin', agora: T2 });
  assert.equal(c.itens.a2.ini.q, 'Admin'); assert.equal(c.itens.a2.fim.q, 'Admin');
  /* o post-it também é rastreado, inclusive pela caixinha de feito */
  aplicar(c, registrarAndamento(c, mudancasFeito(c, 'p1', true), { rastrear: true, quem: 'Admin', agora: T1 }));
  assert.equal(c.itens.p1.fim.q, 'Admin');
});

test('voltar desfaz: da última para o meio tira o "concluiu"; para a primeira tira os dois', () => {
  const c = quadro(); aplicar(c, mudancasLigarFluxo(c, true));
  mover(c, 'a1', D, { rastrear: true, quem: 'Admin', agora: T1 });
  mover(c, 'a1', F, { rastrear: true, quem: 'Admin', agora: T2 });
  assert.ok(c.itens.a1.ini); assert.equal(c.itens.a1.fim, undefined);
  mover(c, 'a1', A, { rastrear: true, quem: 'Admin', agora: T2 });
  assert.equal(c.itens.a1.ini, undefined); assert.equal(c.itens.a1.fim, undefined);
});

test('fora de Documentos internos nada é gravado; mudar só a ordem na mesma coluna também não', () => {
  const c = quadro(); aplicar(c, mudancasLigarFluxo(c, true));
  mover(c, 'a1', D, { rastrear: false, quem: 'Admin', agora: T1 });
  assert.equal(c.itens.a1.col, D); assert.equal(c.itens.a1.ini, undefined); assert.equal(c.itens.a1.fim, undefined);
  mover(c, 'a2', F, { rastrear: true, quem: 'Admin', agora: T1 });
  const antes = c.itens.a2.ini;
  aplicar(c, registrarAndamento(c, Q.mudancasMoverKanban(c, 'a2', F, 0), { rastrear: true, quem: 'Outro', agora: T2 }));
  assert.deepEqual(c.itens.a2.ini, antes);
});

test('cópia de cartão não leva quem iniciou nem quem concluiu', () => {
  const c = quadro(); aplicar(c, mudancasLigarFluxo(c, true));
  mover(c, 'a1', D, { rastrear: true, quem: 'Admin', agora: T1 });
  const r = Q.colar(c, Q.copiar(c, ['a1']));
  /* pelo caminho do app (aplicarQ → registrarAndamento): colar não carimba quem colou (revisor novo, achado 1) */
  const mudApp = registrarAndamento(c, r.mudancas || r, { rastrear: true, quem: 'Outro', agora: T2 });
  const novos = Object.entries(mudApp).filter(([k, v]) => k.startsWith('itens.') && v && v.id !== 'a1').map(([, v]) => v);
  assert.ok(novos.length > 0);
  for (const n of novos) { assert.equal(n.ini, undefined); assert.equal(n.fim, undefined); assert.equal(n.col, D); }
});

test('o arquivo guarda e relê: marca inválida some, nome fica curto', () => {
  const c = quadro(); aplicar(c, mudancasLigarFluxo(c, true));
  mover(c, 'a1', D, { rastrear: true, quem: 'Admin', agora: T1 });
  const lido = Q.normalizarQuadro(JSON.parse(JSON.stringify(c)));
  assert.equal(lido.fluxoKanban, true);
  assert.deepEqual(lido.itens.a1.ini, c.itens.a1.ini);
  assert.deepEqual(lido.itens.a1.fim, c.itens.a1.fim);
  c.itens.a2.ini = { q: 'x'.repeat(200), em: 'não é data' };
  c.itens.a3.fim = { q: 'y'.repeat(200), em: T2.toISOString() };
  const l2 = Q.normalizarQuadro(c);
  assert.equal(l2.itens.a2.ini, undefined);
  assert.equal(l2.itens.a3.fim.q.length, 60);
});

test('linhas do cartão, selo da atividade no fluxo e quem mexe', () => {
  const c = quadro(); aplicar(c, mudancasLigarFluxo(c, true));
  assert.deepEqual(situacaoNoFluxo(c, c.itens.a1), { nome: 'A fazer', fase: 'afazer' });
  mover(c, 'a1', F, { rastrear: true, quem: 'Admin', agora: T1 });
  assert.equal(situacaoNoFluxo(c, c.itens.a1).fase, 'andamento');
  mover(c, 'a1', D, { rastrear: true, quem: 'Admin', agora: T2 });
  assert.equal(situacaoNoFluxo(c, c.itens.a1).fase, 'feito');
  const l = linhasAndamento(c.itens.a1);
  assert.deepEqual(l.map((x) => x.tipo), ['ini', 'fim']);
  assert.match(l[0].texto, /^Iniciado por Admin · /); assert.match(l[1].texto, /^Concluído por Admin · /);
  assert.equal(situacaoNoFluxo(c, c.itens.p1), null, 'post-it não tem selo');
  assert.equal(colunaEfetiva(c, { col: 'nao-existe' }), A);
  assert.equal(quemAgora('Editor'), 'Editor');
  assert.equal(quemAgora(''), 'Neste aparelho');
});

test('revisor novo: religar depois de tirar a coluna limpa o andamento; a ordem não repete', () => {
  const c = quadro(); aplicar(c, mudancasLigarFluxo(c, true));
  mover(c, 'a1', D, { rastrear: true, quem: 'Admin', agora: T1 });
  aplicar(c, mudancasLigarFluxo(c, false));
  aplicar(c, Q.removerColuna(c, D).mudancas);
  aplicar(c, mudancasLigarFluxo(c, true));
  assert.equal(colunaEfetiva(c, c.itens.a1), A);
  assert.equal(c.itens.a1.ini, undefined); assert.equal(c.itens.a1.fim, undefined);
  const c2 = quadro(); aplicar(c2, mudancasLigarFluxo(c2, true)); aplicar(c2, mudancasLigarFluxo(c2, false));
  aplicar(c2, Q.novoItem(c2, 'processo', { texto: 'Mais uma' }, { id: 'a9' }).mudancas);
  aplicar(c2, mudancasLigarFluxo(c2, true));
  const kos = Q.porColuna(c2)[A].map((x) => x.ko);
  assert.equal(new Set(kos).size, kos.length, 'ordem repetida: ' + kos);
});
