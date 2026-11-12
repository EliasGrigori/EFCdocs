/* Testes da v0.6.12 "Rápida" (D-16), núcleo: objeto vigiado muda no lugar e anota no diário; ritmo da gravação;
   diário de segurança das mudanças ainda não gravadas. Só dados inventados. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vigiar, vigiado, revisao, desde } from '../../src/nucleo/diario.js';
import { por, criarDiff, novoHistorico, fazer, desfazer, refazer } from '../../src/nucleo/diff.js';
import { esperaDeGravar, esperaDeConferir } from '../../src/nucleo/ritmo.js';
import { novoDiarioSeguro, anotar, gravou, lerPendencia, recuperar } from '../../src/nucleo/pendencias.js';

const armazemFalso = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };

test('v0.6.12: objeto comum continua sendo copiado; objeto vigiado muda no lugar e os de cima são copiados', () => {
  const a = { ficha: { nome: 'x' }, conteudo: { abas: { a1: { nome: 'P', cel: { A1: { v: 1 } } } } } };
  const b = por(a, 'conteudo.abas.a1.cel.B2', { v: 2 });
  assert.notEqual(b.conteudo.abas.a1.cel, a.conteudo.abas.a1.cel, 'sem vigiar: cópia, como sempre');
  assert.equal(a.conteudo.abas.a1.cel.B2, undefined);
  const cel = b.conteudo.abas.a1.cel; vigiar(cel);
  assert.ok(vigiado(cel)); assert.equal(revisao(cel), 0); assert.equal(revisao({}), -1);
  const c = por(b, 'conteudo.abas.a1.cel.C3', { v: 3 });
  assert.equal(c.conteudo.abas.a1.cel, cel, 'vigiado: o mesmo objeto');
  assert.deepEqual(cel.C3, { v: 3 });
  assert.notEqual(c, b); assert.notEqual(c.conteudo, b.conteudo); assert.notEqual(c.conteudo.abas.a1, b.conteudo.abas.a1, 'a aba é outra: é por ela que a tela sabe da mudança');
  const d = por(c, 'conteudo.abas.a1.cel.A1', undefined);
  assert.equal('A1' in cel, false); assert.equal(d.conteudo.abas.a1.cel, cel);
  assert.equal(revisao(cel), 2);
  /* trocar o objeto inteiro continua valendo (ações grandes) */
  const outro = { Z9: { v: 9 } };
  assert.equal(por(d, 'conteudo.abas.a1.cel', outro).conteudo.abas.a1.cel, outro);
});

test('v0.6.12: o diário devolve o que mudou desde uma revisão (como estava e como ficou) e avisa quando já não alcança', () => {
  const cel = { A1: { v: 1 } }; vigiar(cel); const arq = { cel };
  por(arq, 'cel.A1', { v: 2 }); por(arq, 'cel.B1', { v: 5 }); por(arq, 'cel.A1', { v: 3 }); por(arq, 'cel.B1', undefined);
  const m = desde(cel, 0);
  assert.deepEqual([...m.keys()], ['A1', 'B1']);
  assert.deepEqual(m.get('A1'), { a: { v: 1 }, d: { v: 3 } }, 'várias mudanças na mesma chave: o antes da primeira e o depois da última');
  assert.deepEqual(m.get('B1'), { a: undefined, d: undefined });
  assert.equal(desde(cel, 4).size, 0); assert.deepEqual([...desde(cel, 2).keys()], ['A1', 'B1']);
  assert.equal(desde(cel, 99), null); assert.equal(desde({}, 0), null);
  for (let i = 0; i < 9000; i++) por(arq, 'cel.C' + (i % 50), { v: i });
  assert.equal(desde(cel, 4), null, 'diário curto demais para quem ficou muito para trás: refaz do zero');
  assert.ok(desde(cel, revisao(cel) - 10).size > 0);
});

test('v0.6.12: desfazer e refazer com as células vigiadas voltam exatamente ao mesmo conteúdo', () => {
  const cel = { A1: { v: 1 }, A2: { v: 2 } }; vigiar(cel);
  let estado = { ficha: {}, conteudo: { abas: { a1: { cel } } } }; let h = novoHistorico();
  const foto = () => JSON.stringify(estado.conteudo);
  const f0 = foto();
  let r = fazer(h, estado, criarDiff(estado, { 'conteudo.abas.a1.cel.A1': { v: 10 }, 'conteudo.abas.a1.cel.B5': { v: 'novo' } }, 'Digitar')); h = r.h; estado = r.estado; const f1 = foto();
  r = fazer(h, estado, criarDiff(estado, { 'conteudo.abas.a1.cel.A2': undefined }, 'Apagar')); h = r.h; estado = r.estado; const f2 = foto();
  assert.equal(estado.conteudo.abas.a1.cel, cel);
  r = desfazer(h, estado); h = r.h; estado = r.estado; assert.deepEqual(JSON.parse(foto()), JSON.parse(f1));
  r = desfazer(h, estado); h = r.h; estado = r.estado; assert.deepEqual(JSON.parse(foto()), JSON.parse(f0));
  r = refazer(h, estado); h = r.h; estado = r.estado; assert.deepEqual(JSON.parse(foto()), JSON.parse(f1));
  r = refazer(h, estado); h = r.h; estado = r.estado; assert.deepEqual(JSON.parse(foto()), JSON.parse(f2));
  /* trocar o objeto vigiado por outro conta como mudança sem comparar os dois por extenso */
  const d = criarDiff(estado, { 'conteudo.abas.a1.cel': { A1: { v: 10 }, B5: { v: 'novo' } } }, 'Colar');
  assert.equal(d.ops.length, 1);
  assert.equal(criarDiff(estado, { 'conteudo.abas.a1.cel': cel }, 'Nada').ops.length, 0);
});

test('v0.6.12: arquivo pequeno grava na hora; arquivo grande espera a pessoa parar de digitar (com limites)', () => {
  assert.equal(esperaDeGravar(0), 0); assert.equal(esperaDeGravar(undefined), 0); assert.equal(esperaDeGravar(12), 0);
  assert.equal(esperaDeGravar(50), 400); assert.equal(esperaDeGravar(200), 800); assert.equal(esperaDeGravar(5000), 2500);
  assert.equal(esperaDeConferir(0), 250); assert.equal(esperaDeConferir(15), 250); assert.equal(esperaDeConferir(80), 960); assert.equal(esperaDeConferir(9999), 4000);
});

test('v0.6.12: diário de segurança: o que ainda não foi gravado fica anotado, sai quando a gravação termina e é refeito ao abrir', () => {
  const a = armazemFalso(); const d = novoDiarioSeguro();
  const T = (n) => `2026-11-12T03:00:0${n}.000Z`;
  assert.equal(anotar(d, 'arq1', T(0), 1, T(1), [{ c: 'conteudo.abas.a1.cel.A1', a: { v: 1 }, d: { v: 10 } }], a), true);
  assert.equal(anotar(d, 'arq1', T(0), 2, T(2), [{ c: 'conteudo.abas.a1.cel.A2', a: { v: 2 }, d: undefined }, { c: 'conteudo.abas.a1.cel.B5', a: undefined, d: { v: 'novo' } }], a), true);
  const pend = lerPendencia('arq1', a);
  assert.equal(pend.de, T(0)); assert.equal(pend.lotes.length, 2);
  assert.deepEqual(pend.lotes[1].ops, [{ c: 'conteudo.abas.a1.cel.A2', x: 1 }, { c: 'conteudo.abas.a1.cel.B5', d: { v: 'novo' } }]);
  const gravado = (t) => ({ ficha: { alteradoEm: t }, conteudo: { abas: { a1: { cel: { A1: { v: 1 }, A2: { v: 2 } } } } } });
  /* a página fechou antes de gravar: o aparelho ainda tem o estado T0 */
  const x = gravado(T(0)); assert.equal(recuperar(x, pend), 2);
  assert.deepEqual(x.conteudo.abas.a1.cel, { A1: { v: 10 }, B5: { v: 'novo' } });
  /* a gravação do primeiro lote chegou ao aparelho, mas a página fechou antes de limpar o diário: só o segundo é refeito */
  const y = gravado(T(1)); y.conteudo.abas.a1.cel.A1 = { v: 10 }; assert.equal(recuperar(y, pend), 1);
  assert.deepEqual(y.conteudo.abas.a1.cel, { A1: { v: 10 }, B5: { v: 'novo' } });
  /* o arquivo gravado é de outra história (outra aba ou outro aparelho gravou): não mexe */
  const z = gravado('2026-11-12T09:00:00.000Z'); assert.equal(recuperar(z, pend), 0); assert.deepEqual(z.conteudo.abas.a1.cel, { A1: { v: 1 }, A2: { v: 2 } });
  /* gravação terminada: o que ela cobre sai */
  gravou(d, 'arq1', 1, T(1), a); assert.equal(lerPendencia('arq1', a).lotes.length, 1); assert.equal(lerPendencia('arq1', a).de, T(1));
  gravou(d, 'arq1', 2, T(2), a); assert.equal(lerPendencia('arq1', a), null); assert.equal(a.m.size, 0);
});

test('v0.6.12: diário de segurança: mudança grande demais não é anotada (grava na hora) e nada entra depois dela até a gravação cobrir', () => {
  const a = armazemFalso(); const d = novoDiarioSeguro(); const muitas = {}; for (let i = 0; i < 600; i++) muitas['A' + (i + 1)] = { v: i };
  assert.equal(anotar(d, 'arq1', 't0', 1, 't1', [{ c: 'conteudo.abas.a1.cel.A1', d: { v: 1 } }], a), true);
  assert.equal(anotar(d, 'arq1', 't0', 2, 't2', [{ c: 'conteudo.abas.a1.cel', d: muitas }], a), false, 'todas as células de uma vez: grava já');
  assert.equal(anotar(d, 'arq1', 't0', 3, 't3', [{ c: 'conteudo.abas.a1.cel.A2', d: { v: 2 } }], a), false, 'depois do buraco nada entra: o diário não pode pular um passo');
  assert.equal(lerPendencia('arq1', a).lotes.length, 1, 'o que já estava anotado continua valendo (é o começo certo)');
  gravou(d, 'arq1', 3, 't3', a); assert.equal(lerPendencia('arq1', a), null);
  assert.equal(anotar(d, 'arq1', 't3', 4, 't4', [{ c: 'conteudo.abas.a1.cel.A3', d: { v: 3 } }], a), true, 'buraco coberto: volta a anotar');
  assert.equal(anotar(d, 'arq1', 't3', 5, 't5', null, a), false, 'sem a lista de mudanças não dá para anotar');
  /* armazém cheio ou sem armazém: não anota, quem chamou grava na hora */
  const cheio = { getItem: () => null, setItem: () => { throw new Error('cheio'); }, removeItem: () => {} };
  assert.equal(anotar(novoDiarioSeguro(), 'arq2', 't0', 1, 't1', [{ c: 'x.y', d: 1 }], cheio), false);
});
