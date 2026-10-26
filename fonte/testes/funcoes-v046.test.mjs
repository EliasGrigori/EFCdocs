/* EFCdocs v0.4.6 — primeiro bloco de funções: TETO, ARREDMULTB, MODO, PERCENTIL, QUARTIL, ORDEM, CORREL, FREQUÊNCIA. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Motor } from '../src/planilha/motor.js';
import { paraGuardar, escrever } from '../src/planilha/formula.js';
import { planilhaVazia } from '../src/planilha/modelo.js';
import { E } from '../src/planilha/valores.js';
import { numCol } from '../src/planilha/ref.js';
import { FUNCOES, POR_PT, acharFuncao, funcaoDoExcelQueFalta, funcaoParecida } from '../src/planilha/nomesFuncoes.js';
import { IMPL } from '../src/planilha/funcoes.js';

function montar(celulas) {
  const c = planilhaVazia();
  for (const [k, x] of Object.entries(celulas)) c.abas.a1.cel[k] = typeof x === 'string' && x.startsWith('=') ? { f: paraGuardar(x.slice(1)) } : { v: x };
  return c;
}
const val = (m, k) => { const p = /^([A-Z]+)(\d+)$/.exec(k); return m.valor('a1', +p[2] - 1, numCol(p[1])); };
const calc = (formula, celulas = {}) => val(new Motor(montar({ ...celulas, Z99: '=' + formula })), 'Z99');
const erro = (v) => v && v.cod;

test('os 8 nomes existem em português e em inglês, com cálculo, e saíram da lista "ainda não calcula"', () => {
  for (const [pt, en] of [['TETO', 'CEILING'], ['ARREDMULTB', 'FLOOR'], ['MODO', 'MODE'], ['PERCENTIL', 'PERCENTILE'], ['QUARTIL', 'QUARTILE'], ['ORDEM', 'RANK'], ['CORREL', 'CORREL'], ['FREQUÊNCIA', 'FREQUENCY']]) {
    assert.equal(POR_PT[pt] && POR_PT[pt].en, en, pt);
    assert.equal(acharFuncao(pt).f.en, en);
    assert.equal(acharFuncao(en).f.pt, pt);
    assert.ok(IMPL[en], 'sem cálculo: ' + en);
    assert.equal(funcaoDoExcelQueFalta(pt), false, pt + ' ainda na lista que falta');
  }
  /* sem acento também acha, e CORREL não vira CORRESP */
  assert.equal(acharFuncao('FREQUENCIA').f.en, 'FREQUENCY');
  assert.notEqual((funcaoParecida('CORREL') || {}).en, 'MATCH');
  assert.ok(FUNCOES.length >= 123);
});

test('TETO: arredonda para cima até o múltiplo', () => {
  assert.equal(calc('TETO(2,5;2)'), 4);
  assert.equal(calc('TETO(2,1;0,5)'), 2.5);
  assert.equal(calc('TETO(0,3;0,1)'), 0.3);        // sem ruído de ponto flutuante
  assert.equal(calc('TETO(4;2)'), 4);               // já é múltiplo
  assert.equal(calc('TETO(-2,5;-2)'), -4);          // negativo com negativo: para longe do zero
  assert.equal(calc('TETO(-2,5;2)'), -2);           // negativo com positivo: para o zero
  assert.equal(calc('TETO(5;0)'), 0);
  assert.equal(erro(calc('TETO(2,5;-2)')), E.NUM.cod);
  assert.equal(Object.is(calc('TETO(-0,4;2)'), -0), false, 'não pode sair -0');
  assert.equal(erro(calc('TETO("x";2)')), E.VALOR.cod);
  assert.equal(calc('TETO(A1;10)', { A1: 11 }), 20);
});

test('ARREDMULTB: arredonda para baixo até o múltiplo', () => {
  assert.equal(calc('ARREDMULTB(3,7;2)'), 2);
  assert.equal(calc('ARREDMULTB(3,7;0,5)'), 3.5);
  assert.equal(calc('ARREDMULTB(0,3;0,1)'), 0.3);
  assert.equal(calc('ARREDMULTB(-2,5;2)'), -4);
  assert.equal(calc('ARREDMULTB(-2,5;-2)'), -2);
  assert.equal(erro(calc('ARREDMULTB(5;0)')), E.DIV0.cod);
  assert.equal(erro(calc('ARREDMULTB(2,5;-2)')), E.NUM.cod);
  /* derrama sobre uma faixa, como as outras funções de valor único */
  const m = new Motor(montar({ A1: 11, A2: 19, A3: 20, C1: '=ARREDMULTB(A1:A3;10)' }));
  assert.deepEqual([val(m, 'C1'), val(m, 'C2'), val(m, 'C3')], [10, 10, 20]);
});

test('MODO, PERCENTIL, QUARTIL e ORDEM dão o mesmo que os nomes novos', () => {
  const cels = { A1: 1, A2: 2, A3: 2, A4: 3, A5: 4 };
  assert.equal(calc('MODO(A1:A5)', cels), 2);
  assert.equal(erro(calc('MODO(A1:A2)', cels)), E.NA.cod);                      // sem repetido: #N/D
  assert.equal(calc('PERCENTIL(A1:A5;0,5)', cels), calc('PERCENTIL.INC(A1:A5;0,5)', cels));
  assert.equal(calc('QUARTIL(A1:A5;1)', cels), 2);
  assert.equal(calc('QUARTIL(A1:A5;3)', cels), 3);
  assert.equal(calc('QUARTIL(A1:A5;0)', cels), 1);
  assert.equal(calc('QUARTIL(A1:A5;4)', cels), 4);
  assert.equal(erro(calc('QUARTIL(A1:A5;5)', cels)), E.NUM.cod);
  assert.equal(erro(calc('PERCENTIL(A1:A5;1,5)', cels)), E.NUM.cod);
  assert.equal(calc('ORDEM(4;A1:A5)', cels), 1);
  assert.equal(calc('ORDEM(4;A1:A5;1)', cels), 5);
  assert.equal(calc('ORDEM(2;A1:A5)', cels), 3);                                 // empate: as duas ficam em 3º
  assert.equal(erro(calc('ORDEM(9;A1:A5)', cels)), E.NA.cod);
  assert.equal(erro(calc('ORDEM(2;A1:A5;"x")', cels)), E.VALOR.cod);          // ordem em texto: #VALOR!
  assert.equal(erro(calc('ORDEM.EQ(2;A1:A5;"x")', cels)), E.VALOR.cod);
});

test('PERCENTIL de 0,9 em 5 valores dá 3,6', () => {
  /* a linha acima compara com (3, 6) por vírgula de JavaScript; aqui a conta certa: posição 0,9·4 = 3,6 entre 3 e 4 */
  assert.ok(Math.abs(calc('PERCENTIL(A1:A5;0,9)', { A1: 1, A2: 2, A3: 2, A4: 3, A5: 4 }) - 3.6) < 1e-12);
});

test('CORREL: correlação de Pearson com as regras do Excel', () => {
  const sobem = { A1: 1, A2: 2, A3: 3, A4: 4, B1: 2, B2: 4, B3: 6, B4: 8, C1: 8, C2: 6, C3: 4, C4: 2, D1: 1, D2: 3, D3: 2, D4: 5 };
  assert.ok(Math.abs(calc('CORREL(A1:A4;B1:B4)', sobem) - 1) < 1e-12);
  assert.ok(Math.abs(calc('CORREL(A1:A4;C1:C4)', sobem) + 1) < 1e-12);
  /* valor conferido à mão: x = 1,2,3,4 e y = 1,3,2,5 → r = 0,8315218... */
  assert.ok(Math.abs(calc('CORREL(A1:A4;D1:D4)', sobem) - 0.8315218406202999) < 1e-9);
  /* os dois lados valem igual */
  assert.ok(Math.abs(calc('CORREL(D1:D4;A1:A4)', sobem) - calc('CORREL(A1:A4;D1:D4)', sobem)) < 1e-12);
  /* par com texto ou vazio fica de fora */
  const comTexto = { A1: 1, A2: 2, A3: 3, A4: 4, A5: 'x', B1: 2, B2: 4, B3: 6, B4: 8, B5: 99 };
  assert.ok(Math.abs(calc('CORREL(A1:A5;B1:B5)', comTexto) - 1) < 1e-12);
  assert.equal(erro(calc('CORREL(A1:A3;B1:B4)', sobem)), E.NA.cod);              // tamanhos diferentes
  assert.equal(erro(calc('CORREL(A1:A1;B1:B1)', sobem)), E.DIV0.cod);            // um par só
  assert.equal(erro(calc('CORREL(A1:A3;B1:B3)', { A1: 5, A2: 5, A3: 5, B1: 1, B2: 2, B3: 3 })), E.DIV0.cod); // sem variação
  assert.equal(erro(calc('CORREL(A1:A3;B1:B3)', { A1: 1, A2: 2, A3: 3, B1: 1, B2: 2, B3: '=1/0' })), E.DIV0.cod);
});

test('FREQUÊNCIA: uma coluna com a contagem de cada faixa e uma linha a mais para o que passa do último limite', () => {
  const dados = { A1: 1, A2: 2, A3: 3, A4: 4, A5: 5, A6: 6, A7: 'x', B1: 2, B2: 4, C1: '=FREQUÊNCIA(A1:A7;B1:B2)' };
  const m = new Motor(montar(dados));
  /* até 2: {1,2}; de 2 a 4: {3,4}; acima de 4: {5,6}; o texto não conta */
  assert.deepEqual([val(m, 'C1'), val(m, 'C2'), val(m, 'C3')], [2, 2, 2]);
  assert.equal(val(m, 'C4') == null || val(m, 'C4') === '' || val(m, 'C4') === undefined || val(m, 'C4') === null, true, 'não deve passar de 3 linhas');
  /* a soma das contagens é o total de números */
  const s = new Motor(montar({ ...dados, E1: '=SOMA(C1#)' }));
  assert.equal(val(s, 'E1'), 6);
  /* limites fora de ordem: cada contagem fica no seu limite */
  const f = new Motor(montar({ A1: 1, A2: 2, A3: 3, A4: 4, A5: 5, B1: 4, B2: 2, C1: '=FREQUÊNCIA(A1:A5;B1:B2)' }));
  assert.deepEqual([val(f, 'C1'), val(f, 'C2'), val(f, 'C3')], [2, 2, 1]);
  /* limite repetido: o segundo fica com 0 */
  const r = new Motor(montar({ A1: 1, A2: 2, A3: 3, B1: 2, B2: 2, C1: '=FREQUÊNCIA(A1:A3;B1:B2)' }));
  assert.deepEqual([val(r, 'C1'), val(r, 'C2'), val(r, 'C3')], [2, 0, 1]);
  /* ocupar o caminho dá #DESPEJAR!, como as outras que derramam */
  const oc = new Motor(montar({ A1: 1, A2: 2, A3: 3, B1: 2, C1: '=FREQUÊNCIA(A1:A3;B1:B1)', C2: 'x' }));
  assert.equal(erro(val(oc, 'C1')), '#SPILL!');
  /* sem limites: uma contagem só, com tudo */
  assert.equal(calc('FREQUÊNCIA(A1:A3;D1:D2)', { A1: 1, A2: 2, A3: 3 }), 3);
});

test('o Explicar e as frases não quebram com as funções novas', async () => {
  const { explicarConta } = await import('../src/planilha/explicar.js');
  const c = montar({ A1: 1, A2: 2, A3: 3, B1: 2, B2: 4, B3: 7, C1: '=CORREL(A1:A3;B1:B3)', C2: '=TETO(A1;0,5)', C3: '=PERCENTIL(A1:A3;0,9)', C4: '=ORDEM(A2;A1:A3)', C5: '=QUARTIL(A1:A3;1)' });
  const m = new Motor(c);
  for (const k of ['C1', 'C2', 'C3', 'C4', 'C5']) {
    const p = /^([A-Z]+)(\d+)$/.exec(k);
    const r = explicarConta(m, c, 'a1', +p[2] - 1, numCol(p[1]), () => null);
    assert.ok(r && r.frase && !/ainda não calcula/.test(r.frase) && !/undefined|\?\?/.test(r.frase), k + ': ' + (r && r.frase));
  }
  const r = explicarConta(m, c, 'a1', 0, 2, () => null);
  assert.match(r.frase, /correla/i);
  assert.equal(escrever(JSON.parse(JSON.stringify(m.formula('a1', 0, 2).arv)), 'pt'), 'CORREL(A1:A3;B1:B3)');
});
