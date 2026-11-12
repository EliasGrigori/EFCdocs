/* Testes da v0.6.12 "Rápida" (D-16), planilha: o motor de cálculo e o índice das células acompanham as mudanças feitas
   no lugar e dão o MESMO resultado de quem refaz tudo do zero. Só dados inventados (sorteio com semente fixa). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Motor } from '../../src/planilha/motor.js';
import { indiceDe, limitesDe } from '../../src/planilha/indice.js';
import { criarDiff, novoHistorico, fazer, desfazer, refazer } from '../../src/nucleo/diff.js';
import { vigiado } from '../../src/nucleo/diario.js';
import { chave, lerChave } from '../../src/planilha/ref.js';
import * as O from '../../src/planilha/operacoes.js';

const sorteio = (s) => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const copia = (x) => JSON.parse(JSON.stringify(x));
function planilha() {
  const cel = {};
  for (let l = 0; l < 40; l++) { cel[chave(l, 0)] = { v: l + 1 }; cel[chave(l, 1)] = { v: (l * 7) % 13 }; cel[chave(l, 2)] = { f: `A${l + 1}*2+B${l + 1}` }; }
  cel.E1 = { f: 'SUM(A1:A40)' }; cel.E2 = { f: 'SUM(C1:C40)' }; cel.E3 = { f: 'E1+E2' }; cel.E4 = { f: 'COUNTA(A:A)' }; cel.E5 = { f: 'IF(A1>5,"alto","baixo")' };
  const cel2 = { A1: { f: 'Planilha1!E3*2' }, A2: { v: 'texto' } };
  return { v: 1, ordem: ['a1', 'a2'], abas: { a1: { id: 'a1', nome: 'Planilha1', cel }, a2: { id: 'a2', nome: 'Outra', cel: cel2 } }, estilos: [{}], nomes: {}, seq: 3 };
}
const valores = (motor, c) => { const out = {}; for (const id of c.ordem) for (const k of Object.keys(c.abas[id].cel).concat(['J1', 'E1', 'E2', 'E3', 'E4', 'E5', 'A1'])) { const p = lerChave(k); const v = motor.valor(id, p.l, p.c); out[id + '!' + k] = v && typeof v === 'object' ? JSON.stringify(v) : v; } return out; };
const indiceLimpo = (cel) => { const i = indiceDe(copia(cel)); return { porCol: [...i.porCol].sort((a, b) => a[0] - b[0]), porLin: [...i.porLin].sort((a, b) => a[0] - b[0]) }; };
const indiceVivo = (cel) => { const i = indiceDe(cel); return { porCol: [...i.porCol].sort((a, b) => a[0] - b[0]), porLin: [...i.porLin].sort((a, b) => a[0] - b[0]) }; };

test('v0.6.12: o motor registra as células de cada aba como vigiadas e uma digitação não troca o objeto das células', () => {
  let estado = { ficha: {}, conteudo: planilha() }; const motor = new Motor(estado.conteudo);
  const cel = estado.conteudo.abas.a1.cel; assert.ok(vigiado(cel)); assert.ok(vigiado(estado.conteudo.abas.a2.cel));
  assert.equal(motor.valor('a1', 0, 4), 820); assert.equal(motor.valor('a2', 0, 0), (820 + motor.valor('a1', 1, 4)) * 2);
  const r = fazer(novoHistorico(), estado, criarDiff(estado, { 'conteudo.abas.a1.cel.A1': { v: 101 } }, 'Digitar')); estado = r.estado;
  assert.equal(estado.conteudo.abas.a1.cel, cel, 'o mesmo objeto, mudado no lugar');
  const n = motor.atualizar(estado.conteudo);
  assert.ok(n > 0 && n < 12, 'recalcula só quem depende de A1 (' + n + ')');
  assert.equal(motor.valor('a1', 0, 4), 920); assert.equal(motor.valor('a1', 0, 2), 202); assert.equal(motor.valor('a1', 4, 4), 'alto');
  assert.deepEqual(valores(motor, estado.conteudo), valores(new Motor(copia(estado.conteudo)), estado.conteudo));
});

test('v0.6.12: 600 mudanças sorteadas (digitar, fórmula, apagar, formato, lote grande, desfazer, refazer): motor e índice vivos iguais aos refeitos do zero', () => {
  const rnd = sorteio(20261112); let estado = { ficha: {}, conteudo: planilha() }; let h = novoHistorico(5000); const motor = new Motor(estado.conteudo);
  const conferir = (passo) => {
    motor.atualizar(estado.conteudo);
    const c = estado.conteudo; const novo = new Motor(copia(c));
    assert.deepEqual(valores(motor, c), valores(novo, c), 'valores no passo ' + passo);
    for (const id of c.ordem) {
      assert.deepEqual(indiceVivo(c.abas[id].cel), indiceLimpo(c.abas[id].cel), 'índice no passo ' + passo);
      assert.deepEqual(motor.usado(id), novo.usado(id), 'área usada no passo ' + passo);
      assert.deepEqual({ ...limitesDe(c.abas[id].cel) }, { ...limitesDe(copia(c.abas[id].cel)) });
    }
  };
  conferir(0);
  for (let i = 1; i <= 600; i++) {
    const x = rnd(); const id = rnd() < 0.85 ? 'a1' : 'a2'; const l = Math.floor(rnd() * 46), col = Math.floor(rnd() * 7); const k = chave(l, col);
    let r = null;
    if (x < 0.12 && h.feitos.length) r = desfazer(h, estado);
    else if (x < 0.18 && h.desfeitos.length) r = refazer(h, estado);
    else {
      let mud;
      if (x < 0.45) mud = { [`conteudo.abas.${id}.cel.${k}`]: { v: Math.floor(rnd() * 100) } };
      else if (x < 0.6) mud = { [`conteudo.abas.${id}.cel.${k}`]: { f: ['SUM(A1:A10)', `A${l + 1}+1`, 'E1*2', 'COUNTA(B:B)', `IF(B${l + 1}>3,1,0)`][Math.floor(rnd() * 5)] } };
      else if (x < 0.78) mud = { [`conteudo.abas.${id}.cel.${k}`]: undefined };
      else if (x < 0.84) mud = { [`conteudo.abas.${id}.cel.${k}`]: { s: 1 } }; /* só formato: não conta como célula com conteúdo */
      else if (x < 0.92) mud = O.limparConteudo(estado.conteudo, id, [{ l1: l, c1: 0, l2: Math.min(45, l + 3), c2: 2 }]).mudancas();
      else { /* ação grande: troca o objeto inteiro das células, como fazem inserir linha e ordenar */
        const novo = { ...estado.conteudo.abas[id].cel }; for (let j = 0; j < 5; j++) novo[chave(Math.floor(rnd() * 46), 3)] = { v: j };
        mud = { [`conteudo.abas.${id}.cel`]: novo };
      }
      r = fazer(h, estado, criarDiff(estado, mud, 'passo ' + i));
    }
    h = r.h; estado = r.estado;
    if (i % 7 === 0 || i > 580) conferir(i);
  }
  conferir('fim');
  while (h.feitos.length) { const r = desfazer(h, estado); h = r.h; estado = r.estado; }
  motor.atualizar(estado.conteudo);
  assert.deepEqual(copia(estado.conteudo), planilha(), 'desfazer tudo volta ao começo, célula por célula');
  conferir('volta');
});

test('v0.6.12: apagar até 4.000 células vai uma a uma (no lugar); acima disso troca o objeto inteiro', () => {
  const cel = {}; for (let l = 0; l < 4200; l++) cel[chave(l, 0)] = { v: l };
  const c = { v: 1, ordem: ['a1'], abas: { a1: { id: 'a1', nome: 'P', cel } }, estilos: [{}], nomes: {}, seq: 2 };
  const m1 = O.limparConteudo(c, 'a1', [{ l1: 0, c1: 0, l2: O.LOTE_INTEIRO - 1, c2: 0 }]).mudancas();
  assert.equal(Object.keys(m1).length, O.LOTE_INTEIRO); assert.ok(!('conteudo.abas.a1.cel' in m1));
  const m2 = O.limparConteudo(c, 'a1', [{ l1: 0, c1: 0, l2: O.LOTE_INTEIRO, c2: 0 }]).mudancas();
  assert.deepEqual(Object.keys(m2), ['conteudo.abas.a1.cel']);
  /* 4.000 de uma vez no lugar: o motor acompanha pelo diário e o índice fica certo */
  let estado = { ficha: {}, conteudo: c }; const motor = new Motor(c);
  estado = fazer(novoHistorico(), estado, criarDiff(estado, m1, 'Apagar')).estado;
  assert.equal(estado.conteudo.abas.a1.cel, cel); motor.atualizar(estado.conteudo);
  assert.deepEqual(motor.usado('a1'), { lMax: 4199, cMax: 0 }); assert.equal(indiceDe(cel).porCol.get(0).length, 200); assert.equal(indiceDe(cel).porCol.get(0)[0], 4000);
});

test('v0.6.12: a área usada encolhe quando a última célula é apagada e a aba vazia dá -1', () => {
  const cel = { A1: { v: 1 }, C9: { v: 2 }, B3: { s: 2 } }; const c = { v: 1, ordem: ['a1'], abas: { a1: { id: 'a1', nome: 'P', cel } }, estilos: [{}, {}, {}], nomes: {}, seq: 2 };
  let estado = { ficha: {}, conteudo: c }; const motor = new Motor(c); const ir = (mud) => { estado = fazer(novoHistorico(), estado, criarDiff(estado, mud, '')).estado; motor.atualizar(estado.conteudo); };
  assert.deepEqual(motor.usado('a1'), { lMax: 8, cMax: 2 }, 'célula só com formato (B3) não conta, como antes');
  ir({ 'conteudo.abas.a1.cel.C9': undefined }); assert.deepEqual(motor.usado('a1'), { lMax: 0, cMax: 0 });
  ir({ 'conteudo.abas.a1.cel.F20': { v: 'x' } }); assert.deepEqual(motor.usado('a1'), { lMax: 19, cMax: 5 });
  ir({ 'conteudo.abas.a1.cel.F20': { s: 1 } }); assert.deepEqual(motor.usado('a1'), { lMax: 0, cMax: 0 }, 'ficou só o formato');
  ir({ 'conteudo.abas.a1.cel.A1': undefined }); assert.deepEqual(motor.usado('a1'), { lMax: -1, cMax: -1 });
});
