/* EFCdocs v0.4.3 — testes das regras da Planilha (motor, fórmulas, formatos, entrada, operações). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Motor } from '../src/planilha/motor.js';
import { paraGuardar, paraMostrar, ler, escrever, deslocar, ajustarEstrutura, tokenizar, lerGuardada } from '../src/planilha/formula.js';
import { planilhaVazia, normalizarPlanilha, eixo, indiceEstilo } from '../src/planilha/modelo.js';
import { formatar, codigoPt, codigoDePt, mudarCasas, ehFormatoData } from '../src/planilha/formato.js';
import { lerEntrada, continuarSerie, lerTSV, escreverTSV } from '../src/planilha/entrada.js';
import { diagnosticar, corrigir, contextoNoCursor, sugestoes } from '../src/planilha/ajuda.js';
import { serialDe, dataDe, numeroGeral, lerNumeroPt, E } from '../src/planilha/valores.js';
import { letraCol, numCol, lerEndereco, MAX_LIN, MAX_COL } from '../src/planilha/ref.js';
import { FUNCOES, POR_PT, acharFuncao } from '../src/planilha/nomesFuncoes.js';
import { IMPL } from '../src/planilha/funcoes.js';
import * as O from '../src/planilha/operacoes.js';
import { aplicarDiff, criarDiff } from '../src/nucleo/diff.js';

/* monta uma planilha a partir de { A1: valor ou '=fórmula' } */
function montar(celulas, outras = {}) {
  const c = planilhaVazia();
  const put = (aba, k, x) => {
    if (typeof x === 'string' && x.startsWith('=')) aba.cel[k] = { f: paraGuardar(x.slice(1)) };
    else aba.cel[k] = { v: x };
  };
  for (const [k, x] of Object.entries(celulas)) put(c.abas.a1, k, x);
  let n = 2;
  for (const [nome, cels] of Object.entries(outras)) {
    const id = 'a' + n++;
    c.ordem.push(id);
    c.abas[id] = { id, nome, cel: {} };
    for (const [k, x] of Object.entries(cels)) put(c.abas[id], k, x);
  }
  c.seq = n;
  return c;
}
const val = (m, k, aba = 'a1') => { const p = /^([A-Z]+)(\d+)$/.exec(k); return m.valor(aba, +p[2] - 1, numCol(p[1])); };
const calc = (formula, celulas = {}) => { const c = montar({ ...celulas, Z99: '=' + formula }); return val(new Motor(c), 'Z99'); };
const quase = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('endereços: colunas até XFD e linhas até 1.048.576', () => {
  assert.equal(letraCol(0), 'A'); assert.equal(letraCol(25), 'Z'); assert.equal(letraCol(26), 'AA'); assert.equal(letraCol(16383), 'XFD');
  assert.equal(numCol('XFD'), 16383); assert.equal(numCol('XFE'), -1);
  assert.equal(MAX_LIN, 1048576); assert.equal(MAX_COL, 16384);
  assert.deepEqual(lerEndereco("'Minha aba'!B3:C4"), { aba: 'Minha aba', l1: 2, c1: 1, l2: 3, c2: 2 });
});

test('fórmula: pt-BR na tela, inglês no arquivo (como o Excel guarda)', () => {
  assert.equal(paraGuardar('SE(B2>=0,5;"OK";"Ajustar")'), 'IF(B2>=0.5,"OK","Ajustar")');
  assert.equal(paraMostrar('IF(B2>=0.5,"OK","Ajustar")'), 'SE(B2>=0,5;"OK";"Ajustar")');
  assert.equal(paraGuardar('PROCV(A2;Lotes!A:C;3;FALSO)'), 'VLOOKUP(A2,Lotes!A:C,3,FALSE)');
  assert.equal(paraGuardar("SOMA('Aba 2'!$B$2:B9)"), "SUM('Aba 2'!$B$2:B9)");
  /* nomes em inglês e sem acento são aceitos (PL10) */
  assert.equal(paraGuardar('VLOOKUP(A1;B:C;2;0)'), 'VLOOKUP(A1,B:C,2,0)');
  assert.equal(paraMostrar(paraGuardar('MEDIA(A1:A3)')), 'MÉDIA(A1:A3)');
  assert.equal(paraGuardar('{1\\2;3\\4}'), '{1,2;3,4}');
  assert.equal(paraGuardar('-2^2'), '-2^2');
  assert.throws(() => paraGuardar('SE(A1>0,5;"OK","Não")'), /ponto e vírgula/);
  assert.throws(() => paraGuardar('SOMA(A1'), /parêntese/);
});

test('nomes das funções conferidos em pt-BR (inclui os corrigidos)', () => {
  for (const [pt, en] of [['OUEXCL', 'XOR'], ['ÚNICO', 'UNIQUE'], ['É.NÃO.DISP', 'ISNA'], ['ÉNÚM', 'ISNUMBER'], ['CORRESPX', 'XMATCH'], ['SENÃODISP', 'IFNA'], ['PARÂMETRO', 'SWITCH'], ['UNIRTEXTO', 'TEXTJOIN'], ['MUDAR', 'REPLACE'], ['ARRUMAR', 'TRIM'], ['DIATRABALHOTOTAL', 'NETWORKDAYS'], ['NÚMSEMANA', 'WEEKNUM'], ['MÁXIMOSES', 'MAXIFS'], ['DESVPAD.A', 'STDEV.S'], ['MODO.ÚNICO', 'MODE.SNGL'], ['MULT', 'PRODUCT']]) {
    assert.equal(POR_PT[pt] && POR_PT[pt].en, en, pt);
  }
  /* apelidos da proposta e da documentação também funcionam */
  assert.equal(acharFuncao('XOU').f.en, 'XOR');
  assert.equal(acharFuncao('ÉNÚMERO').f.en, 'ISNUMBER');
  assert.ok(FUNCOES.length >= 115, 'pelo menos 115 funções: ' + FUNCOES.length);
  for (const f of FUNCOES) assert.ok(IMPL[f.en], 'sem cálculo: ' + f.pt);
});

test('somar, contar e condições (SOMASE, CONT.SES, MÉDIASES)', () => {
  const cels = { A1: 'Lote', B1: 'Cloro', C1: 'Sit', A2: 'L1', B2: 1.2, C2: 'OK', A3: 'L2', B3: 0.3, C3: 'Ajustar', A4: 'L1', B4: 2.5, C4: 'Ajustar', A5: 'L3', B5: '1,0', C5: '' };
  assert.equal(calc('SOMA(B2:B5)', cels), 4.0);
  assert.equal(calc('SOMA(B2:B5;"1,0")', cels), 5.0);
  assert.equal(calc('CONT.NÚM(B2:B5)', cels), 3);
  assert.equal(calc('CONT.VALORES(A2:C5)', cels), 12);
  assert.equal(calc('CONT.SE(C2:C5;"Ajustar")', cels), 2);
  assert.equal(calc('CONT.SE(B2:B5;">=1")', cels), 2);
  assert.equal(calc('CONT.SE(A2:A5;"L*")', cels), 4);
  assert.equal(calc('SOMASE(A2:A5;"L1";B2:B5)', cels), 3.7);
  assert.equal(calc('CONT.SES(A2:A5;"L1";C2:C5;"Ajustar")', cels), 1);
  quase(calc('MÉDIASES(B2:B5;C2:C5;"Ajustar")', cels), 1.4);
  assert.equal(calc('MÁXIMOSES(B2:B5;A2:A5;"L1")', cels), 2.5);
  assert.equal(calc('SOMARPRODUTO(B2:B4;{1;2;3})', cels), 1.2 + 0.6 + 7.5);
  assert.equal(calc('CONTAR.VAZIO(C2:C6)', cels), 2);
  assert.equal(calc('SOMA(B:B)', cels), 4.0);
});

test('estatística e números (arredondamento igual ao Excel)', () => {
  const cels = { A1: 1, A2: 2, A3: 2, A4: 9 };
  assert.equal(calc('MÉDIA(A1:A4)', cels), 3.5);
  assert.equal(calc('MED(A1:A4)', cels), 2);
  assert.equal(calc('MODO.ÚNICO(A1:A4)', cels), 2);
  assert.equal(calc('MAIOR(A1:A4;2)', cels), 2);
  assert.equal(calc('MENOR(A1:A4;1)', cels), 1);
  quase(calc('DESVPAD.A(A1:A4)', cels), 3.696845502136472);
  assert.equal(calc('ORDEM.EQ(9;A1:A4)', cels), 1);
  assert.equal(calc('PERCENTIL.INC(A1:A4;0,5)', cels), 2);
  assert.equal(calc('QUARTIL.INC(A1:A4;3)', cels), 3.75);
  assert.equal(calc('ARRED(2,675;2)'), 2.68);
  assert.equal(calc('ARRED(-2,5;0)'), -3);
  assert.equal(calc('ARREDONDAR.PARA.CIMA(2,11;1)'), 2.2);
  assert.equal(calc('ARREDONDAR.PARA.BAIXO(2,19;1)'), 2.1);
  assert.equal(calc('TRUNCAR(-2,7)'), -2);
  assert.equal(calc('INT(-2,7)'), -3);
  assert.equal(calc('MOD(-3;2)'), 1);
  assert.equal(calc('POTÊNCIA(2;10)'), 1024);
  assert.equal(calc('RAIZ(-1)'), E.NUM);
  assert.equal(calc('1/0'), E.DIV0);
  assert.equal(calc('MÉDIA(A1:A2)'), E.DIV0);
  assert.equal(calc('-2^2'), 4);
  assert.equal(calc('10%*50'), 5);
});

test('lógica: SE, SES, E, OU, SEERRO, PARÂMETRO, LET', () => {
  assert.equal(calc('SE(B2>=0,5;"OK";"Ajustar")', { B2: 1.2 }), 'OK');
  assert.equal(calc('SE(E(B2>=0,5;B2<=2);"OK";"Ajustar")', { B2: 2.5 }), 'Ajustar');
  assert.equal(calc('SE(B2>1;"alto")', { B2: 0 }), false);
  assert.equal(calc('SES(B2<0,5;"Baixo";B2>2;"Alto";VERDADEIRO;"OK")', { B2: 3 }), 'Alto');
  assert.equal(calc('OU(1>2;"a"="A")'), true);
  assert.equal(calc('OUEXCL(VERDADEIRO;VERDADEIRO)'), false);
  assert.equal(calc('NÃO(FALSO)'), true);
  assert.equal(calc('SEERRO(1/0;"sem amostra")'), 'sem amostra');
  assert.equal(calc('SENÃODISP(PROCV(9;A1:B2;2;0);"não achei")', { A1: 1, B1: 'x' }), 'não achei');
  assert.equal(calc('PARÂMETRO("R";"A";"Aprovado";"R";"Reprovado";"Pendente")'), 'Reprovado');
  assert.equal(calc('ESCOLHER(2;"Baixa";"Média";"Alta")'), 'Média');
  assert.equal(calc('LET(x;5;y;x*2;x+y)'), 15);
  /* SE não calcula o lado que não usa (o erro do outro lado não aparece) */
  assert.equal(calc('SE(VERDADEIRO;1;1/0)'), 1);
});

test('buscar: PROCV, PROCX, ÍNDICE+CORRESP, DESLOC, INDIRETO', () => {
  const cels = { A1: 'L-012', B1: 'Fornecedor A', A2: 'L-013', B2: 'Fornecedor B', A3: 'L-014', B3: 'Fornecedor C', D1: 10, D2: 20, D3: 30 };
  assert.equal(calc('PROCV("l-013";A1:B3;2;0)', cels), 'Fornecedor B');
  assert.equal(calc('PROCV("L-*4";A1:B3;2;FALSO)', cels), 'Fornecedor C');
  assert.equal(calc('PROCV("X";A1:B3;2;0)', cels), E.NA);
  assert.equal(calc('PROCV(25;D1:D3;1)', cels), 20);
  assert.equal(calc('PROCX("L-014";A1:A3;B1:B3)', cels), 'Fornecedor C');
  assert.equal(calc('PROCX("Z";A1:A3;B1:B3;"sem")', cels), 'sem');
  assert.equal(calc('ÍNDICE(B1:B3;CORRESP("L-013";A1:A3;0))', cels), 'Fornecedor B');
  assert.equal(calc('CORRESPX("L-014";A1:A3)', cels), 3);
  assert.equal(calc('SOMA(DESLOC(D1;1;0;2;1))', cels), 50);
  assert.equal(calc('INDIRETO("D"&2)', cels), 20);
  assert.equal(calc('LINS(A1:A3)*COLS(A1:B1)', cels), 6);
  assert.equal(calc('SOMA(ÍNDICE(D1:D3;2):D3)', cels), 50);
});

test('datas: mesma contagem do Excel (com o 29/02/1900) e funções de data', () => {
  assert.equal(serialDe(1900, 1, 1), 1);
  assert.equal(serialDe(1900, 2, 28), 59);
  assert.equal(serialDe(1900, 3, 1), 61);
  assert.deepEqual(dataDe(60), { ano: 1900, mes: 2, dia: 29 });
  assert.equal(serialDe(2026, 10, 25), 46320);
  assert.deepEqual(dataDe(46320), { ano: 2026, mes: 10, dia: 25 });
  assert.equal(calc('DATA(2026;13;1)'), serialDe(2027, 1, 1));
  assert.equal(calc('DIA.DA.SEMANA(DATA(2026;10;25))'), 1);
  assert.equal(calc('DIA.DA.SEMANA(DATA(2026;10;25);2)'), 7);
  assert.equal(calc('DATADIF(DATA(2020;1;15);DATA(2026;10;25);"Y")'), 6);
  assert.equal(calc('DATADIF(DATA(2020;1;15);DATA(2026;10;25);"M")'), 81);
  assert.equal(calc('FIMMÊS(DATA(2024;1;31);1)'), serialDe(2024, 2, 29));
  assert.equal(calc('DATAM(DATA(2026;1;31);1)'), serialDe(2026, 2, 28));
  assert.equal(calc('DIATRABALHOTOTAL(DATA(2026;10;19);DATA(2026;10;25))'), 5);
  assert.equal(calc('DIATRABALHO(DATA(2026;10;23);1)'), serialDe(2026, 10, 26));
  assert.equal(calc('NÚMSEMANA(DATA(2026;1;1))'), 1);
  assert.equal(calc('DIAS(DATA(2026;10;25);DATA(2026;10;1))'), 24);
  assert.equal(calc('TEXTO(DATA(2026;10;25);"dd/mm/aaaa")'), '25/10/2026');
  assert.equal(calc('TEXTO(1234,5;"#.##0,00")'), '1.234,50');
  quase(calc('TEMPO(14;30;0)'), 14.5 / 24);
});

test('texto', () => {
  assert.equal(calc('CONCAT("Lote ";A1;"-";B1)', { A1: 'L', B1: 12 }), 'Lote L-12');
  assert.equal(calc('UNIRTEXTO(", ";VERDADEIRO;A1:A3)', { A1: 'a', A3: 'c' }), 'a, c');
  assert.equal(calc('ESQUERDA("Fazenda";3)&DIREITA("Matriz";2)&EXT.TEXTO("abcdef";2;3)'), 'Fazizbcd');
  assert.equal(calc('NÚM.CARACT("ação")'), 4);
  assert.equal(calc('ARRUMAR("  muito   espaço  ")'), 'muito espaço');
  assert.equal(calc('PRI.MAIÚSCULA("josé elias")'), 'José Elias');
  assert.equal(calc('MAIÚSCULA("ç")&MINÚSCULA("Á")'), 'Çá');
  assert.equal(calc('PROCURAR("-";"L-013")'), 2);
  assert.equal(calc('LOCALIZAR("CLORO";"cloro livre")'), 1);
  assert.equal(calc('SUBSTITUIR("1.234.567";".";"")'), '1234567');
  assert.equal(calc('MUDAR("ABCDEF";2;3;"x")'), 'AxEF');
  assert.equal(calc('VALOR("1,5")+1'), 2.5);
  assert.equal(calc('REPT("*";3)'), '***');
  assert.equal(calc('"a"&1,5'), 'a1,5');
});

test('matrizes que derramam (FILTRO, ÚNICO, CLASSIFICAR, SEQUÊNCIA) e #DESPEJAR!', () => {
  const c = montar({ A1: 'x', A2: 'y', A3: 'x', B1: 3, B2: 1, B3: 2, D1: '=ÚNICO(A1:A3)', E1: '=SEQUÊNCIA(3)', F1: '=CLASSIFICAR(B1:B3;1;-1)', G1: '=FILTRO(A1:A3;B1:B3>1)', H1: '=SOMA(E1#)' });
  const m = new Motor(c);
  assert.equal(val(m, 'D1'), 'x'); assert.equal(val(m, 'D2'), 'y'); assert.equal(val(m, 'D3'), null);
  assert.equal(val(m, 'E3'), 3);
  assert.deepEqual([val(m, 'F1'), val(m, 'F2'), val(m, 'F3')], [3, 2, 1]);
  assert.deepEqual([val(m, 'G1'), val(m, 'G2')], ['x', 'x']);
  assert.equal(val(m, 'H1'), 6);
  /* ocupar uma célula do caminho dá #DESPEJAR! e liberar volta a derramar */
  const c2 = { ...c, abas: { a1: { ...c.abas.a1, cel: { ...c.abas.a1.cel, E2: { v: 'ocupado' } } } } };
  m.atualizar(c2);
  assert.equal(val(m, 'E1'), E.DESPEJAR);
  m.atualizar(c);
  assert.equal(val(m, 'E1'), 1);
  assert.equal(val(m, 'E2'), 2);
});

test('recalcula só o que depende, inclusive em outra aba', () => {
  const c = montar({ A1: 1, A2: '=A1*2', A3: '=A2+Dados!A1', A4: 7 }, { Dados: { A1: 10, B1: '=Planilha1!A2*10' } });
  const m = new Motor(c);
  assert.equal(val(m, 'A3'), 12);
  assert.equal(val(m, 'B1', 'a2'), 20);
  const c2 = { ...c, abas: { ...c.abas, a1: { ...c.abas.a1, cel: { ...c.abas.a1.cel, A1: { v: 5 } } } } };
  const n = m.atualizar(c2);
  assert.equal(n, 3, 'recalculou só A2, A3 e Dados!B1');
  assert.equal(val(m, 'A3'), 20);
  assert.equal(val(m, 'B1', 'a2'), 100);
});

test('conta circular: fica 0 e é avisada; função desconhecida mostra o último valor do Excel', () => {
  const m = new Motor(montar({ A1: '=B1+1', B1: '=A1+1' }));
  assert.equal(val(m, 'A1'), 0);
  assert.equal(m.circulares().length, 2);
  const c = planilhaVazia();
  c.abas.a1.cel.A1 = { f: 'PMT(0.01,12,1000)', v: -88.85 };
  const m2 = new Motor(c);
  assert.equal(val(m2, 'A1'), -88.85);
  assert.deepEqual(m2.formula('a1', 0, 0).desc, ['PMT']);
});

test('formatos guardados no código do Excel e mostrados no jeito do Brasil (PL03)', () => {
  assert.equal(formatar(1234.5, '#,##0.00').t, '1.234,50');
  assert.equal(formatar(-10.5, '"R$" #,##0.00').t, '-R$ 10,50');
  assert.equal(formatar(0.256, '0.0%').t, '25,6%');
  assert.equal(formatar(46320, 'dd/mm/yyyy').t, '25/10/2026');
  assert.equal(formatar(46320.75, 'dd/mm/yyyy hh:mm').t, '25/10/2026 18:00');
  assert.equal(formatar(46320, 'dddd, d" de "mmmm" de "yyyy').t, 'domingo, 25 de outubro de 2026');
  assert.equal(formatar(1.5, '[h]:mm').t, '36:00');
  assert.equal(formatar(1234567, '#,##0,').t, '1.235');
  assert.equal(formatar(12, '000').t, '012');
  assert.equal(formatar(5, '[Red][<0]0;0').cor, null);
  assert.equal(formatar(-5, '0;[Red]-0').cor, '#ff0000');
  assert.equal(formatar(0, '0.00;-0.00;"zero"').t, 'zero');
  assert.equal(formatar('abc', '@').t, 'abc');
  assert.equal(formatar(1 / 3, 'General').t, '0,333333333');
  assert.equal(formatar(true).t, 'VERDADEIRO');
  assert.equal(formatar(E.NA).t, '#N/D');
  assert.equal(codigoPt('#,##0.00'), '#.##0,00');
  assert.equal(codigoPt('dd/mm/yyyy'), 'dd/mm/aaaa');
  assert.equal(codigoDePt('#.##0,00'), '#,##0.00');
  assert.equal(codigoDePt('dd/mm/aaaa hh:mm'), 'dd/mm/yyyy hh:mm');
  assert.equal(mudarCasas('#,##0.00', 1), '#,##0.000');
  assert.equal(mudarCasas('0.0%', -1), '0%');
  assert.equal(mudarCasas('General', 1, 2), '0.0');
  assert.ok(ehFormatoData('dd/mm/yyyy'));
  assert.ok(!ehFormatoData('#,##0.00'));
  assert.equal(numeroGeral(1e12), '1E+12');
});

test('digitação: número, R$, %, data, hora e a letra O no lugar do zero (PL26)', () => {
  assert.deepEqual(lerEntrada('1.234,5'), { v: 1234.5 });
  assert.equal(lerEntrada('R$ 10,50').v, 10.5);
  assert.equal(lerEntrada('12%').v, 0.12);
  assert.equal(lerEntrada('25/10/2026').v, 46320);
  const o = lerEntrada('1O/1O/2026');
  assert.equal(o.v, serialDe(2026, 10, 10));
  assert.match(o.aviso, /letra O/);
  const inv = lerEntrada('31/02/2026');
  assert.equal(inv.v, '31/02/2026');
  assert.match(inv.aviso, /não é uma data/);
  quase(lerEntrada('14:30').v, 14.5 / 24);
  assert.equal(lerEntrada("'007").v, '007');
  assert.equal(lerEntrada('007').v, 7);
  assert.equal(lerEntrada('VERDADEIRO').v, true);
  assert.equal(lerEntrada('=soma(a1:a3)').f, 'SUM(A1:A3)');
  assert.ok(lerEntrada('=SE(').erro);
  assert.equal(lerEntrada('abc', '@').v, 'abc');
  assert.equal(lerEntrada('12', '@').v, '12');
  assert.equal(lerNumeroPt('1.5'), null);
});

test('alça de preenchimento: séries de números, datas, meses, dias e códigos Q-001', () => {
  assert.deepEqual(continuarSerie([1, 2], 3), [3, 4, 5]);
  assert.equal(continuarSerie([5], 2), null);
  assert.deepEqual(continuarSerie([46320], 2, { ehData: true }), [46321, 46322]);
  assert.deepEqual(continuarSerie([serialDe(2026, 1, 31), serialDe(2026, 2, 28)], 1, { ehData: true }).length, 1);
  assert.deepEqual(continuarSerie([serialDe(2026, 1, 15), serialDe(2026, 2, 15)], 2, { ehData: true }), [serialDe(2026, 3, 15), serialDe(2026, 4, 15)]);
  assert.deepEqual(continuarSerie(['jan', 'fev'], 2), ['mar', 'abr']);
  assert.deepEqual(continuarSerie(['Dez'], 2), ['Jan', 'Fev']);
  assert.deepEqual(continuarSerie(['seg'], 2), ['ter', 'qua']);
  assert.deepEqual(continuarSerie(['Q-001'], 3), ['Q-002', 'Q-003', 'Q-004']);
  assert.deepEqual(continuarSerie(['Lote 9'], 2), ['Lote 10', 'Lote 11']);
});

test('ajuda da fórmula: erro antes do Enter com "Corrigir" (PL08) e dica (PL07)', () => {
  const d = diagnosticar('SE(B2>=0,5;"OK","Ajustar"');
  assert.equal(d.filter((x) => x.nivel === 'erro').length, 2);
  assert.equal(corrigir('SE(B2>=0,5;"OK","Ajustar"', d), 'SE(B2>=0,5;"OK";"Ajustar")');
  assert.match(diagnosticar('PROCVV(A1;B:C;2;0)')[0].msg, /PROCV/);
  assert.match(diagnosticar('SE(A1>0;OK;"x")')[0].msg, /aspas/);
  assert.equal(corrigir('SOMA(B10:B2)', diagnosticar('SOMA(B10:B2)')), 'SOMA(B2:B10)');
  assert.equal(diagnosticar('VLOOKUP(A1;B:C;2;0)')[0].nivel, 'dica');
  assert.match(diagnosticar('SE(A1)')[0].msg, /Falta: valor_se_verdadeiro/);
  assert.equal(diagnosticar('SE(A1>1;"a";"b")').length, 0);
  assert.equal(diagnosticar('Meta_Cloro*2', { nomes: new Set(['meta_cloro']) }).length, 0);
  const ctx = contextoNoCursor('SE(B2>=0,5;', 11);
  assert.equal(ctx.funcao.pt, 'SE'); assert.equal(ctx.arg, 1);
  assert.deepEqual(sugestoes('clo', { colunas: [{ titulo: 'Cloro livre', letra: 'B', ref: 'B2' }] }).map((s) => s.rotulo), ['Cloro livre (B)']);
  assert.equal(sugestoes('proc')[0].rotulo, 'PROCX');
});

test('inserir e excluir linhas ajusta todas as fórmulas (e #REF! no que sumiu)', () => {
  const c = montar({ A1: 1, A2: 2, A3: 3, B1: '=SOMA(A1:A3)', B2: '=A3*2', B3: '=$A$2' }, { Outra: { A1: '=Planilha1!A3+1' } });
  let mud = O.estrutura(c, 'a1', 'l', 1, 2); // insere 2 linhas antes da linha 2
  let c2 = aplicarDiff({ conteudo: c }, criarDiff({ conteudo: c }, mud)).conteudo;
  assert.equal(c2.abas.a1.cel.B1.f, 'SUM(A1:A5)');
  assert.equal(c2.abas.a1.cel.B4.f, 'A5*2');
  assert.equal(c2.abas.a1.cel.B5.f, '$A$4');
  assert.equal(c2.abas.a2.cel.A1.f, 'Planilha1!A5+1');
  const m = new Motor(c2);
  assert.equal(val(m, 'B1'), 6);
  mud = O.estrutura(c, 'a1', 'l', 2, -1); // exclui a linha 3
  c2 = aplicarDiff({ conteudo: c }, criarDiff({ conteudo: c }, mud)).conteudo;
  assert.equal(c2.abas.a1.cel.B1.f, 'SUM(A1:A2)');
  assert.equal(c2.abas.a1.cel.B2.f, '#REF!*2');
  assert.equal(c2.abas.a2.cel.A1.f, '#REF!+1');
  mud = O.estrutura(c, 'a1', 'c', 0, 1); // insere coluna antes de A
  c2 = aplicarDiff({ conteudo: c }, criarDiff({ conteudo: c }, mud)).conteudo;
  assert.equal(c2.abas.a1.cel.C1.f, 'SUM(B1:B3)');
});

test('renomear aba e nome definido troca em todas as fórmulas (PL16)', () => {
  const c = montar({ A1: 0.5, B1: '=Lotes!A1', C1: '=SE(B1>=Meta;"OK";"x")' }, { Lotes: { A1: 1 } });
  c.nomes = { meta: { n: 'Meta', ref: 'Planilha1!$A$1' } };
  let mud = O.renomearAba(c, 'a2', 'Lotes 2026');
  let c2 = aplicarDiff({ conteudo: c }, criarDiff({ conteudo: c }, mud)).conteudo;
  assert.equal(c2.abas.a1.cel.B1.f, "'Lotes 2026'!A1");
  assert.equal(val(new Motor(c2), 'C1'), 'OK');
  mud = O.renomearNome(c2, 'Meta', 'Meta_Cloro');
  const c3 = aplicarDiff({ conteudo: c2 }, criarDiff({ conteudo: c2 }, mud)).conteudo;
  assert.equal(c3.abas.a1.cel.C1.f, 'IF(B1>=Meta_Cloro,"OK","x")');
  assert.equal(val(new Motor(c3), 'C1'), 'OK');
  /* excluir a aba: quem usava passa a mostrar #REF! */
  const c4 = aplicarDiff({ conteudo: c3 }, criarDiff({ conteudo: c3 }, O.excluirAba(c3, 'a2'))).conteudo;
  assert.equal(c4.abas.a1.cel.B1.f, '#REF!');
  assert.equal(c4.ordem.length, 1);
});

test('copiar e colar anda as referências; recortar move e reaponta', () => {
  const c = montar({ A1: 1, A2: 2, B1: '=A1*2', C5: '=B1+1' });
  const clip = O.copiar(c, 'a1', { l1: 0, c1: 1, l2: 0, c2: 1 });
  let { lote } = O.colar(c, 'a1', 1, 1, clip);
  let c2 = aplicarDiff({ conteudo: c }, criarDiff({ conteudo: c }, lote.mudancas())).conteudo;
  assert.equal(c2.abas.a1.cel.B2.f, 'A2*2');
  ({ lote } = O.colar(c, 'a1', 9, 4, clip, { recortar: true }));
  c2 = aplicarDiff({ conteudo: c }, criarDiff({ conteudo: c }, lote.mudancas())).conteudo;
  assert.equal(c2.abas.a1.cel.B1, undefined);
  assert.equal(c2.abas.a1.cel.E10.f, 'A1*2');
  assert.equal(c2.abas.a1.cel.C5.f, 'E10+1');
  /* colar valores tira a fórmula */
  ({ lote } = O.colar(c, 'a1', 3, 3, O.copiar(c, 'a1', { l1: 0, c1: 1, l2: 0, c2: 1 }, new Motor(c)), { modo: 'valores' }));
  c2 = aplicarDiff({ conteudo: c }, criarDiff({ conteudo: c }, lote.mudancas())).conteudo;
  assert.equal(c2.abas.a1.cel.D4.v, 2);
});

test('preencher: fórmula anda e série continua', () => {
  const c = montar({ A1: 'Q-001', B1: 1, B2: 2, C1: '=B1*10' });
  const lote = O.preencher(c, 'a1', { l1: 0, c1: 0, l2: 0, c2: 0 }, { l1: 1, c1: 0, l2: 2, c2: 0 }, 'b');
  const c2 = aplicarDiff({ conteudo: c }, criarDiff({ conteudo: c }, lote.mudancas())).conteudo;
  assert.equal(c2.abas.a1.cel.A3.v, 'Q-003');
  const l2 = O.preencher(c, 'a1', { l1: 0, c1: 1, l2: 1, c2: 2 }, { l1: 2, c1: 1, l2: 3, c2: 2 }, 'b');
  const c3 = aplicarDiff({ conteudo: c }, criarDiff({ conteudo: c }, l2.mudancas())).conteudo;
  assert.equal(c3.abas.a1.cel.B4.v, 4);
  assert.equal(c3.abas.a1.cel.C3.f, 'B3*10');
});

test('arquivo: formato antigo abre, estilos sem repetição, eixos de tamanho', () => {
  const n = normalizarPlanilha({ abas: [{ id: 'a1', nome: 'Planilha1', celulas: {} }] });
  assert.deepEqual(n.ordem, ['a1']);
  assert.equal(n.abas.a1.nome, 'Planilha1');
  let r = indiceEstilo([{}], { b: 1 });
  assert.equal(r.s, 1);
  r = indiceEstilo(r.estilos, { b: 1 });
  assert.equal(r.s, 1);
  assert.equal(r.estilos.length, 2);
  const e = eixo({ 2: 50 }, { 5: 1 }, 20, MAX_LIN);
  assert.equal(e.pos(3), 20 + 20 + 50);
  assert.equal(e.pos(7), 7 * 20 + 30 - 20);
  assert.equal(e.em(95), 3);
  assert.equal(e.total, MAX_LIN * 20 + 10);
});

test('desempenho: 10 mil linhas com fórmulas abrem e recalculam rápido (PL27)', () => {
  const c = planilhaVazia();
  const cel = c.abas.a1.cel;
  for (let i = 1; i <= 10000; i++) {
    cel['A' + i] = { v: 'L-' + i };
    cel['B' + i] = { v: (i % 25) / 10 };
    cel['C' + i] = { f: `IF(AND(B${i}>=0.5,B${i}<=2),"OK","Ajustar")` };
  }
  cel.E1 = { f: 'COUNTIF(C:C,"Ajustar")' };
  cel.E2 = { f: 'AVERAGE(B1:B10000)' };
  let t = Date.now();
  const m = new Motor(c);
  const abrir = Date.now() - t;
  assert.equal(m.valor('a1', 0, 4), 3600);
  t = Date.now();
  const c2 = { ...c, abas: { a1: { ...c.abas.a1, cel: { ...cel, B5: { v: 3 } } } } };
  m.atualizar(c2);
  const recalc = Date.now() - t;
  assert.equal(m.valor('a1', 0, 4), 3601);
  assert.ok(abrir < 4000, 'abrir em ' + abrir + ' ms');
  assert.ok(recalc < 1500, 'recalcular em ' + recalc + ' ms');
});

test('tokens da fórmula guardam posição (para cores e dicas)', () => {
  const tk = tokenizar('SE(B2>=0,5;"OK")');
  assert.deepEqual(tk.map((t) => t.t), ['fn', 'abre', 'ref', 'op', 'num', 'sep', 'str', 'fecha']);
  assert.equal(tk[2].i, 3);
  assert.equal(escrever(deslocar(lerGuardada('A1+$B$1+B$2'), 2, 1), 'pt'), 'B3+$B$1+C$2');
  assert.equal(escrever(ajustarEstrutura(ler('SUM(A1:A9)', 'en'), { abaAlvo: 'x', abaDaFormula: 'x', eixo: 'l', i: 0, n: -1 }), 'en'), 'SUM(A1:A8)');
  assert.equal(escreverTSV([['a', 'b\tc']]), 'a\t"b\tc"\r\n');
  assert.deepEqual(lerTSV('1\t2\r\n3\t4'), [['1', '2'], ['3', '4']]);
});

/* ---------- v0.4.1: correções da aprovação ---------- */
import { formatoDaFormula } from '../src/planilha/formatoAuto.js';
import { numeroCheio } from '../src/planilha/valores.js';
import { corLegivel } from '../src/planilha/grade.js';

test('v0.4.1: fórmula com data herda o formato de data (data - data fica número)', () => {
  const nf = (n) => ({ '0,0': 'dd/mm/yyyy', '0,1': '"R$" #,##0.00', '0,2': 'hh:mm', '0,3': 'hh:mm', '0,4': '@' })[`${n.t === 'ref' ? n.l : n.l1},${n.t === 'ref' ? n.c : n.c1}`];
  igualF('A1+1', 'dd/mm/yyyy');
  igualF('DATE(2024,2,29)', 'dd/mm/yyyy');
  igualF('TODAY()', 'dd/mm/yyyy');
  igualF('NOW()', 'dd/mm/yyyy hh:mm');
  igualF('TIME(1,2,3)', 'hh:mm');
  igualF('A1-A1', null);
  igualF('TODAY()-A1', null);
  igualF('D1-C1', 'hh:mm');
  igualF('A1', 'dd/mm/yyyy');
  igualF('SUM(B1:B3)', '"R$" #,##0.00');
  igualF('B1*2', null);
  igualF('IF(1,A1,0)', 'dd/mm/yyyy');
  igualF('E1', null);
  igualF('Z9+1', null);
  function igualF(f, esperado) { assert.equal(formatoDaFormula(f, nf), esperado, f); }
});

test('v0.4.1: 25:00 é guardado como horas somadas ([h]:mm)', () => {
  const r = lerEntrada('25:00', 'General');
  assert.equal(r.nf, '[h]:mm');
  assert.equal(formatar(r.v, r.nf).t, '25:00');
  assert.equal(lerEntrada('25:30:10', 'General').nf, '[h]:mm:ss');
  assert.equal(lerEntrada('9:05', 'General').nf, 'hh:mm');
  assert.equal(formatar(lerEntrada('123:15', 'General').v, '[h]:mm').t, '123:15');
});

test('v0.4.1: número para editar sai inteiro (sem 1,23457E+14)', () => {
  assert.equal(numeroCheio(123456789012345), '123456789012345');
  assert.equal(numeroCheio(0.1 + 0.2), '0,3');
  assert.equal(numeroCheio(-42.125), '-42,125');
  assert.equal(numeroCheio(1 / 3), '0,333333333333333');
  assert.equal(numeroCheio(1e21), '1E+21');
});

test('v0.4.1: dica da função continua com o cursor logo depois do ")"', () => {
  const t = 'SE(A1>1;"OK";"Não")';
  const r = contextoNoCursor(t, t.length);
  assert.equal(r.funcao.pt, 'SE');
  assert.equal(r.fechada, true);
  assert.equal(contextoNoCursor('SOMA(A1)+1', 10).funcao, null);
  assert.equal(contextoNoCursor('SE(A1>1;SOMA(B1:B2)', 19).funcao.pt, 'SE');
});

test('v0.4.1: mensagens de erro explicam e dão exemplo', () => {
  assert.match(diagnosticar('SE(A1)')[0].msg, /Falta: valor_se_verdadeiro\. Exemplo:/);
  assert.match(diagnosticar('SOMA(A1,A2)')[0].msg, /vírgula é só para casas decimais/);
  assert.match(diagnosticar('SOMA(A1')[0].msg, /ponha "\)" no fim/);
});

test('v0.4.1: cor da letra se ajusta ao tema sem perder o matiz', () => {
  /* preto no tema escuro: vira o texto do tema */
  assert.equal(corLegivel('#000000', '#1e1e1e', '#e6e6e6'), '#e6e6e6');
  /* amarelo no claro: escurece (ocre), não vira preto */
  const am = corLegivel('#ffff00', '#ffffff', '#1f1f1f');
  assert.notEqual(am, '#ffff00');
  assert.notEqual(am, '#000000');
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(am.slice(i, i + 2), 16));
  assert.ok(r > b + 40 && g > b + 40, 'perdeu o amarelo: ' + am);
  /* cinza no branco já se lê: fica */
  assert.equal(corLegivel('#808080', '#ffffff', '#1f1f1f'), '#808080');
  /* vermelho no escuro já se lê: fica */
  assert.equal(corLegivel('#ff0000', '#1e1e1e', '#e6e6e6'), '#ff0000');
});

/* ---------- v0.4.2: função inexistente, dicas dos botões ---------- */
import { funcaoParecida, funcaoDoExcelQueFalta } from '../src/planilha/nomesFuncoes.js';
import { DESCRICAO, ATALHOS, dicaDoComando } from '../src/nucleo/dicas.js';
import { PorId } from '../src/nucleo/comandos.js';
import { readFileSync } from 'node:fs';
import { ERRO_EXPLICA } from '../src/planilha/valores.js';

test('v0.4.2: só sugere troca de função quando a grafia é bem parecida (E1/N24)', () => {
  /* os casos do relatório do Grok: nada de trocar CORREL por CORRESP etc. */
  for (const f of ['CORREL', 'TENDÊNCIA', 'MODO', 'TETO', 'FREQUÊNCIA', 'NÃOD', 'MÉDIAA', 'DIST.NORM.N', 'TEXTOANTES']) {
    assert.equal(funcaoParecida(f), null, f);
    const d = diagnosticar(`${f}(A1)`);
    assert.ok(d.every((x) => !x.troca && x.nivel !== 'erro'), f + ' deveria só avisar');
  }
  assert.equal(funcaoParecida('SOMAA').pt, 'SOMA');
  assert.equal(funcaoParecida('PROCVV').pt, 'PROCV');
  assert.equal(diagnosticar('SOMAA(A1)')[0].troca.novo, 'SOMA');
  assert.ok(funcaoDoExcelQueFalta('CORREL') && funcaoDoExcelQueFalta('correl') && funcaoDoExcelQueFalta('TREND'));
  assert.ok(!funcaoDoExcelQueFalta('SOMA') && !funcaoDoExcelQueFalta('XYZW'));
  assert.match(diagnosticar('CORREL(A1:A3;B1:B3)')[0].msg, /ainda não sabe calcular/);
  assert.match(diagnosticar('XYZW(1)')[0].msg, /Não conheço a função XYZW/);
});

test('v0.4.2: função desconhecida fica guardada e a célula mostra #NOME? (nunca some)', () => {
  const c = planilhaVazia();
  const id = c.ordem[0];
  c.abas[id].cel.A1 = { f: paraGuardar('CORREL(B1:B3;C1:C3)') };
  const m = new Motor(c);
  assert.equal(String(m.valor(id, 0, 0)), '#NOME?');
  assert.equal(paraMostrar(c.abas[id].cel.A1.f), 'CORREL(B1:B3;C1:C3)');
});

test('v0.4.2: #DIV/0! explica com o exemplo do SEERRO', () => {
  assert.match(ERRO_EXPLICA['#DIV/0!'], /=SEERRO\(A1\/B1;0\)/);
});

test('v0.4.2: todo botão da faixa tem dica (o que faz) e os atalhos são os que funcionam', () => {
  const fonte = readFileSync(new URL('../src/ui/faixa.jsx', import.meta.url), 'utf8');
  const bloco = fonte.slice(fonte.indexOf('const FAIXAS'), fonte.indexOf('export const BARRA_CURTA'));
  const bloco2 = fonte.slice(fonte.indexOf('export const BARRA_CURTA'), fonte.indexOf('/** Abas da faixa'));
  const ids = new Set([...(bloco + bloco2).matchAll(/'([a-z]+\.[a-zA-Z]+)'/g)].map((m) => m[1]));
  const sem = [...ids].filter((id) => PorId[id] && !DESCRICAO[id]);
  assert.deepEqual(sem, [], 'sem dica: ' + sem.join(', '));
  for (const id of Object.keys(DESCRICAO)) assert.ok(PorId[id], 'dica de comando que não existe: ' + id);
  for (const mod of Object.keys(ATALHOS)) for (const id of Object.keys(ATALHOS[mod])) assert.ok(PorId[id], 'atalho de comando que não existe: ' + id);
  const neg = dicaDoComando(PorId['formatar.negrito'], 'planilha');
  assert.equal(neg.atalho, 'Ctrl+B');
  assert.equal(dicaDoComando(PorId['editar.copiar'], 'postits').atalho, 'Ctrl+C');
  assert.equal(dicaDoComando(PorId['formatar.negrito'], 'postits').atalho, 'Ctrl+B');
});

/* ---------- v0.4.3: entender a conta e correções do Grok ---------- */
import * as X from '../src/planilha/explicar.js';
import { RECEITAS, criterio, valorNaFormula } from '../src/planilha/receitas.js';
import { DESCRICAO_MOD } from '../src/nucleo/dicas.js';
import { textoChega } from '../src/nucleo/comandos.js';

const TIT = { B: 'Cloro livre', D: 'Qtd. amostras', E: 'Conformes', F: '% conformes' };
const titulo = (id, l, c) => (l > 0 ? TIT[letraCol(c)] || null : null);
const exemplo = () => montar({
  A1: 'Lote', B1: 'Cloro livre', C1: 'Situação', D1: 'Qtd. amostras', E1: 'Conformes', F1: '% conformes', G1: 'Meta', H1: 'Total',
  A2: 'L-012', B2: 1.2, C2: '=SE(E(B2>=0,5;B2<=2);"OK";"Ajustar")', D2: 10, E2: 9, F2: '=E2/D2', G2: '=F2*1,15', H2: '=SOMA(F2:F5)',
  A3: 'L-013', B3: 0.3, C3: '=SE(E(B3>=0,5;B3<=2);"OK";"Ajustar")', E3: 4, F3: '=E3/D3', G3: '=F3*1,15',
  A4: 'L-014', B4: '1,4', C4: '=SE(E(B4>=0,5;B4<=2);"OK";"Ajustar")', D4: 5, E4: 5, F4: '=E4/D5',
  A5: 'L-015', B5: 2, C5: '=SE(E(B5>=0,5;B5<=2);"OK";"Ajustar")', D5: 4, E5: 4, F5: '=E5/D5',
  J2: '=PROCV("l-012 ";A2:C5;3;0)', K2: '=CORREL(B2:B5;D2:D5)', L2: '=B4*2',
});
const pos = (k) => { const p = /^([A-Z]+)(\d+)$/.exec(k); return [+p[2] - 1, numCol(p[1])]; };

test('v0.4.3: LAMBDA chamada na hora grava, não trava o Enter e mostra #NOME?', () => {
  assert.equal(paraGuardar('LAMBDA(x;x*2)(4)'), 'LAMBDA(x,x*2)(4)');
  assert.equal(paraMostrar('LAMBDA(x,x*2)(4)'), 'LAMBDA(x;x*2)(4)');
  assert.ok(diagnosticar('LAMBDA(x;x*2)(4)').every((p) => p.nivel !== 'erro'), 'x é parâmetro do LAMBDA, não erro');
  assert.ok(diagnosticar('LAMBDA(x;y;x+y)(1;2)').every((p) => p.nivel !== 'erro'));
  assert.ok(diagnosticar('LET(a;2;b;3;a+b)').every((p) => p.nivel !== 'erro'));
  assert.equal(calc('LAMBDA(x;x*2)(4)').cod, '#NAME?');
  /* a referência dentro da chamada anda junto ao copiar */
  assert.equal(escrever(deslocar(lerGuardada('LAMBDA(x,x*2)(A1)'), 1, 0), 'en'), 'LAMBDA(x,x*2)(A2)');
});

test('v0.4.3: duas letras trocadas também sugerem a troca (PROVC → PROCV)', () => {
  assert.equal(funcaoParecida('PROVC').pt, 'PROCV');
  assert.equal(funcaoParecida('SOMSE').pt, 'SOMASE');
  assert.equal(funcaoParecida('CORREL'), null);
  const d = diagnosticar('PROVC(A1;B1:C9;2;0)');
  assert.ok(d.some((p) => p.rotulo === 'Usar PROCV'));
});

test('v0.4.3: PL11 a conta em linhas, o valor de cada pedaço e a frase com o nome da coluna', () => {
  const c = exemplo(); const m = new Motor(c);
  const e = X.explicarConta(m, c, 'a1', 1, 2, titulo);
  assert.deepEqual(e.linhas.map((x) => x.texto), ['=SE(', 'E(B2>=0,5;B2<=2);', '"OK";', '"Ajustar"', ')']);
  assert.equal(e.linhas[1].valor, 'VERDADEIRO');
  assert.equal(e.linhas[4].valor, '"OK"');
  assert.match(e.frase, /Se a coluna Cloro livre \(B2 = 1,2\) estiver entre 0,5 e 2, mostra "OK"; se não, mostra "Ajustar"\. Agora mostra "OK"\./);
  /* editar em linhas: as quebras são ignoradas e a fórmula volta a uma linha só */
  assert.equal(paraGuardar(X.textoEmLinhas(e.linhas).slice(1)), c.abas.a1.cel.C2.f);
  assert.equal(X.explicarConta(m, c, 'a1', 0, 0, titulo), null, 'sem fórmula, nada a explicar');
  assert.match(X.explicarConta(m, c, 'a1', 1, 9, titulo).frase, /^Procura "l-012 " na primeira coluna de A2:C5/);
});

test('v0.4.3: PL12 o erro é seguido até onde começa, com o motivo e o conserto', () => {
  const c = exemplo(); const m = new Motor(c);
  const h2 = X.causaDoErro(m, c, 'a1', ...pos('H2'), titulo);
  assert.equal(h2.cod, '#DIV/0!');
  assert.deepEqual([h2.origem.l, h2.origem.c], pos('F3'));
  assert.match(h2.msg, /H2 mostra #DIV\/0! porque usa F3\. O erro começa em F3\. A conta é =E3\/D3, e D3 ‹Qtd\. amostras› está vazio/);
  assert.deepEqual(h2.acoes.map((a) => a.rotulo), ['Ir para F3', 'Ir para D3', 'Usar SEERRO em F3']);
  const j2 = X.causaDoErro(m, c, 'a1', ...pos('J2'), titulo);
  assert.equal(j2.cod, '#N/A');
  assert.match(j2.msg, /PROCV não achou "l-012 " na primeira coluna de A2:C5\. Existe "L-012" em A2/);
  assert.equal(X.causaDoErro(m, c, 'a1', ...pos('C2'), titulo), null, 'sem erro, sem causa');
  /* texto que entra em conta de número */
  const c2 = montar({ A1: 'abc', B1: '=A1*2', C1: '1,4 ', D1: '=C1*2' });
  const m2 = new Motor(c2);
  const v = X.causaDoErro(m2, c2, 'a1', 0, 1, null);
  assert.equal(v.cod, '#VALUE!');
  assert.match(v.msg, /A1 tem o texto "abc"/);
  /* #DESPEJAR!: mostra quem está no caminho */
  const c3 = montar({ A1: '=SEQUÊNCIA(3)', A3: 'x' });
  const s = X.causaDoErro(new Motor(c3), c3, 'a1', 0, 0, null);
  assert.equal(s.cod, '#SPILL!');
  assert.match(s.msg, /3 × 1 células a partir de A1, e A3 já tem conteúdo/);
});

test('v0.4.3: PL13 lista de problemas da planilha (erros, texto, vizinhas, número fixo, funções que faltam)', () => {
  const c = exemplo(); const m = new Motor(c);
  const l = X.problemasDaPlanilha(m, c, titulo);
  const por = (cel) => l.filter((p) => p.cel === cel);
  assert.equal(l[0].nivel, 'erro', 'erros primeiro');
  assert.match(por('F3')[0].texto, /#DIV\/0!.*Mais 2 células mostram este erro/);
  assert.ok(por('F3')[0].acoes.some((a) => a.tipo === 'seerro'));
  assert.match(por('B4')[0].texto, /Número guardado como texto \("1,4"\)/);
  assert.equal(por('B4')[0].acoes[0].tipo, 'converter');
  const viz = por('F4').find((p) => p.id.startsWith('vizinha'));
  assert.ok(viz, 'F4 usa D5 e as vizinhas usam a própria linha');
  assert.equal(viz.acoes[0].formula, 'E4/D4');
  const fixo = l.find((p) => p.id.startsWith('fixo'));
  assert.match(fixo.texto, /=F2\*1,15 \(e em mais 1 fórmula de G2:G3\)/);
  assert.deepEqual(fixo.acoes[0].celulas.map((x) => x.l), [1, 2]);
  assert.match(l.find((p) => p.id === 'falta:CORREL').texto, /CORREL é uma função que o EFCdocs ainda não calcula/);
  assert.equal(X.trocarNumeroPorNome('F2*1.15', 1.15, 'Fator'), 'F2*Fator');
  assert.equal(X.formulaDeCima('E3/D3'), 'E4/D4');
  assert.equal(X.formaRelativa(lerGuardada('E2/D2'), 1, 5), X.formaRelativa(lerGuardada('E3/D3'), 2, 5));
  /* planilha sem problemas: lista vazia */
  const ok = montar({ A1: 'Lote', B1: 'Valor', A2: 'x', B2: 2, A3: 'y', B3: 3, B4: '=SOMA(B2:B3)' });
  assert.deepEqual(X.problemasDaPlanilha(new Motor(ok), ok, null), []);
});

test('v0.4.3: PL15 a conta desenhada (de onde vem, faixa com a conta que dá erro, quem usa)', () => {
  const c = exemplo(); const m = new Motor(c);
  const g = X.grafoDaConta(m, c, 'a1', ...pos('H2'), titulo);
  const r = (n) => g.nos.find((x) => x.rotulo === n);
  assert.equal(r('H2').nivel, 0);
  assert.equal(r('F2:F5').tipo, 'faixa');
  assert.equal(r('F3').valor, '#DIV/0!', 'a conta com erro de dentro da faixa aparece');
  assert.ok(r('D3') && r('E3'));
  assert.ok(g.setas.some((s) => s.de === r('F2:F5').id && s.para === r('H2').id));
  const g2 = X.grafoDaConta(m, c, 'a1', ...pos('F2'), titulo);
  assert.ok(g2.nos.some((x) => x.rotulo === 'G2' && x.nivel === -1), 'quem usa F2 aparece à direita');
  const lay = X.arrumarGrafo(g);
  assert.ok(lay.pos.get(r('D3').id).x < lay.pos.get(r('F3').id).x && lay.pos.get(r('F3').id).x < lay.pos.get(r('H2').id).x);
});

test('v0.4.3: PL18 as receitas montam fórmulas válidas, só com funções que o EFCdocs calcula', () => {
  assert.equal(valorNaFormula('0,5'), '0,5');
  assert.equal(valorNaFormula('Ajustar'), '"Ajustar"');
  assert.equal(criterio('maior', '5'), '">5"');
  assert.equal(criterio('contem', 'cloro'), '"*cloro*"');
  assert.equal(criterio('preenchido', ''), '"<>"');
  const vals = { col: 'C2:C200', comp: 'igual', valor: 'Ajustar', soma: 'E2:E200', quando: 'C2:C200', cel: 'B2', em: 'A2:A200', traz: 'C2:C200', senao: 'Não achou', min: '0,5', max: '2', sim: 'OK', nao: 'Fora', ini: 'B2', fim: '', a: 'A2', b: 'B2', c: '', sep: ' - ', de: '01/10/2026', ate: '31/10/2026' };
  const c = exemplo(); const m = new Motor(c);
  for (const r of RECEITAS) {
    const v = { ...Object.fromEntries(r.campos.map((f) => [f.id, f.padrao ?? ''])), ...vals };
    if (r.id === 'seMaior') v.comp = '>=';
    const x = r.montar(v);
    assert.ok(x, r.id + ' montou');
    const arv = ler(x.texto, 'pt');
    const fns = [];
    (function vai(n) { if (n.t === 'fn') { fns.push(n); n.args.forEach(vai); } else if (n.t === 'bin') { vai(n.a); vai(n.b); } else if (n.a) vai(n.a); })(arv);
    for (const f of fns) assert.ok(!f.desc && IMPL[f.n], `${r.id}: ${f.n} precisa existir`);
    const p = m.previa(x.texto, 'a1', 9, 9);
    assert.ok(!p.erro, r.id + ' calcula');
  }
  const contar = RECEITAS.find((r) => r.id === 'contar');
  assert.equal(contar.montar({ col: 'C2:C200', comp: 'igual', valor: '' }), null, 'sem valor não monta (não conta vazias sem querer)');
  assert.equal(m.previa(contar.montar({ col: 'C2:C200', comp: 'igual', valor: 'Ajustar' }).texto, 'a1', 9, 9).valor, 2);
});

test('v0.4.3: dicas do quadro sem "fórmula" e "Excel", atalhos B/I/U, e "chega depois da v1.0.0"', () => {
  for (const [id, t] of Object.entries(DESCRICAO_MOD.postits)) assert.ok(!/fórmula|Excel/i.test(t), id);
  assert.match(dicaDoComando(PorId['editar.colar'], 'postits').desc, /post-it/);
  assert.match(dicaDoComando(PorId['editar.colar'], 'planilha').desc, /Excel/);
  assert.equal(dicaDoComando(PorId['formatar.sublinhado'], 'postits').atalho, 'Ctrl+U');
  assert.equal(textoChega('v0.5.0'), 'chega na v0.5.0');
  assert.equal(textoChega('depois da v1.0.0'), 'chega depois da v1.0.0');
  for (const id of ['exibir.faixaTudo', 'exibir.faixaAbas', 'exibir.faixaOculta', 'exibir.menuCompleto', 'exibir.menuIcones', 'exibir.menuOculto', 'exibir.layoutA', 'exibir.layoutB']) assert.ok(DESCRICAO[id], id);
});

/* ---------------- v0.4.3.1: correções da aprovação da v0.4.3 ---------------- */
import { textoFaixaCaixa, lerEnderecoCaixa } from '../src/planilha/ref.js';
import { dataNaFormula } from '../src/planilha/receitas.js';

test('v0.4.3.1: frase do Explicar de cada função sem erro de português (de a, em o, por o, for/estiver depois de "confere se")', () => {
  const dia = serialDe(2026, 10, 1);
  const c = montar({
    A1: 'Lote', B1: 'Cloro', C1: 'Qtd', D1: 'Data',
    A2: 'L-012', B2: 1.2, C2: 10, D2: dia, A3: 'L-013', B3: 3, C3: 5, D3: dia + 1,
  }, { Planilha2: { A1: 1, A2: 2, A3: 3 } });
  const est = indiceEstilo(c.estilos, { nf: 'dd/mm/yyyy' });
  c.estilos = est.estilos; c.abas.a1.cel.D2.s = est.s; c.abas.a1.cel.D3.s = est.s;
  const tit = (id, l, col) => (id === 'a1' && l > 0 ? { A: 'Lote', B: 'Cloro', C: 'Qtd', D: 'Data' }[letraCol(col)] || null : null);
  const formulas = [
    'B2*C2', 'B2/C2', 'B2-C2', 'B2+C2', 'B2^2', 'A2&B2', 'B2>C2',
    'SE(B2>1;"A";"B")', 'SE(E(B2>=0,5;B2<=2);"OK";"X")', 'SE(OU(B2>1;C2<3);1;2)', 'SE(B2>2;"Alto";SE(B2>1;"Médio";"OK"))', 'SE(SE(B2>1;1;0)=1;"a";"b")',
    'SEERRO(B2/0;0)', 'SOMA(B2:B3)', 'SOMA(Planilha2!A1:A3)', 'MÉDIA(B2:B3)', 'MÁXIMO(B2:B3)', 'MÍNIMO(B2:B3)', 'CONT.NÚM(B2:B3)', 'CONT.VALORES(A2:A3)', 'CONTAR.VAZIO(A2:A3)',
    'CONT.SE(A2:A3;"L-012")', 'CONT.SE(B2:B3;">1")', 'SOMASE(A2:A3;"L-012";C2:C3)', 'MÉDIASE(A2:A3;"L-012";B2:B3)',
    'CONT.SES(A2:A3;"L-012";B2:B3;">1")', 'SOMASES(C2:C3;A2:A3;"L-012";B2:B3;">1")', 'MÉDIASES(B2:B3;A2:A3;"L-012")',
    'PROCV("L-012";A2:C3;3;0)', 'PROCX("L-012";A2:A3;C2:C3;"não")', 'CORRESP("L-012";A2:A3;0)', 'ÍNDICE(C2:C3;1)', 'ARRED(B2;1)', 'HOJE()-D2', 'D2+30', 'D3-D2',
    'MÁXIMO(B2:B3)-MÍNIMO(B2:B3)', 'ÍNDICE(C2:C3;CORRESP("L-012";A2:A3;0))', 'SE(B2>1;"";"x")', 'SEERRO(B2/0;"")', 'A5', 'SE(A5="";"";1)', 'FILTRO(A2:C3;C2:C3>5;"nada")', 'DIATRABALHOTOTAL(D2;D3)',
    'UNIRTEXTO("-";VERDADEIRO;A2;A3)', 'ARRUMAR(A2)', 'SEQUÊNCIA(3)', 'MEDIANA(B2:B3)', 'E(B2>1;C2<20)', 'NÃO(B2>1)',
  ];
  const ruins = [/ de [oa] /, / em [oa] /, / por [oa] /, / a [oa] /, /\bde a\b/, /confere se[^.;]*(for|estiver|der )/, /\([^()]*\([^()]*\)[^()]*\)/, /\(\(/, /\b4\d{4}\b/];
  for (const f of formulas) {
    const cc = JSON.parse(JSON.stringify(c));
    cc.abas.a1.cel.F2 = { f: paraGuardar(f) };
    const mm = new Motor(cc);
    const r = X.explicarConta(mm, cc, 'a1', 1, numCol('F'), tit);
    assert.ok(r && r.frase, f + ' sem frase');
    const sem = r.frase.replace(/ Agora mostra.*$/, '').replace(/"[^"]*"/g, '""');
    for (const rx of ruins) {
      if (/^(D2\+30|HOJE\(\)-D2|D3-D2)$/.test(f) && rx.source === '\\b4\\d{4}\\b') { assert.ok(!rx.test(sem), f + ': data como número: ' + r.frase); continue; }
      assert.ok(!rx.test(sem), `${f}: "${r.frase}" casou ${rx}`);
    }
  }
  /* alguns textos exatos */
  const ex = (f) => { const cc = JSON.parse(JSON.stringify(c)); cc.abas.a1.cel.F2 = { f: paraGuardar(f) }; return X.explicarConta(new Motor(cc), cc, 'a1', 1, 5, tit).frase; };
  assert.match(ex('B2/C2'), /^Divide a coluna Cloro \(B2 = 1,2\) pela coluna Qtd \(C2 = 10\)\./);
  assert.match(ex('HOJE()-D2'), /^Conta os dias de 01\/10\/2026 \(D2\) até hoje\./);
  assert.match(ex('SE(B2>2;"Alto";SE(B2>1;"Médio";"OK"))'), /se não, olha de novo: se a coluna Cloro \(B2 = 1,2\) for maior que 1, mostra "Médio"; se não, mostra "OK"/);
  assert.match(ex('SOMA(Planilha2!A1:A3)'), /^Soma/);
  assert.match(ex('MÁXIMO(B2:B3)-MÍNIMO(B2:B3)'), /^Tira o menor valor \(1,2\) do maior \(3\) da coluna Cloro \(B2:B3\)\./);
  assert.match(ex('ÍNDICE(C2:C3;CORRESP("L-012";A2:A3;0))'), /^Acha "L-012" na coluna Lote \(A2:A3\) e traz o valor da mesma linha da coluna Qtd \(C2:C3\)\./);
  assert.match(ex('SE(B2>1;"";"x")'), /mostra "x"|deixa a célula vazia/);
  assert.match(ex('SE(B2>1;"";"x")'), /^Se a coluna Cloro \(B2 = 1,2\) for maior que 1, deixa a célula vazia; se não, mostra "x"\./);
  assert.match(ex('A5'), /^Mostra a coluna Lote \(A5 = vazio\)\./);
  assert.match(ex('FILTRO(A2:C3;C2:C3>5;"nada")'), /^Mostra só as linhas .* em que a coluna Qtd \(C2:C3\) é maior que 5/);
  assert.match(ex('DIATRABALHOTOTAL(D2;D3)'), /^Conta os dias úteis de 01\/10\/2026 \(D2\) até 02\/10\/2026 \(D3\)\./);
});

test('v0.4.3.1: conta circular não trava o motor (C1=C2, grupo de 3, entre abas) e dá um aviso só', () => {
  const tit = () => null;
  /* uma fórmula que só aponta para outra célula: antes estourava a pilha e a tela ficava em branco */
  const a = montar({ C1: '=C2', C2: '=C1' });
  const ma = new Motor(a);
  assert.equal(ma.valor('a1', 0, 2), 0);
  assert.equal(ma.valor('a1', 1, 2), 0);
  assert.equal(ma.circulares().length, 2);
  const pa = X.problemasDaPlanilha(ma, a, tit, {}).filter((x) => /circ/.test(x.id));
  assert.equal(pa.length, 1);
  assert.equal(pa[0].texto, 'C1 e C2 dependem uma da outra, então as duas ficam 0. Apague uma das contas.');
  assert.equal(X.causaDaConta(ma, a, 'a1', 0, 2, tit).acoes.length, 1);
  X.explicarConta(ma, a, 'a1', 0, 2, tit); X.grafoDaConta(ma, a, 'a1', 0, 2, tit);
  /* três células: nunca #CALC! */
  const b = montar({ A10: '=A11', A11: '=A12', A12: '=A10' });
  const mb = new Motor(b);
  for (const l of [9, 10, 11]) assert.equal(mb.valor('a1', l, 0), 0);
  assert.equal(mb.circulares().length, 3);
  assert.equal(X.causaCircular(mb, b, 'a1', 9, 0).msg, 'A10, A11 e A12 dependem umas das outras, então todas ficam 0. Apague uma das contas.');
  /* ordem de cálculo diferente (começa pela do meio) dá o mesmo */
  const b2 = new Motor(JSON.parse(JSON.stringify(b)));
  assert.equal(b2.valor('a1', 10, 0), 0);
  assert.equal(b2.circulares().length, 3);
  /* entre abas: as duas células levam o nome da aba */
  const d = montar({ A1: '=Planilha2!A1' }, { Planilha2: { A1: 1 } });
  d.abas.a2.cel.A1 = { f: paraGuardar('Planilha1!A1') };
  const md = new Motor(d);
  assert.equal(md.valor('a1', 0, 0), 0);
  assert.match(X.causaCircular(md, d, 'a1', 0, 0).msg, /^Planilha1!A1 e Planilha2!A1 dependem uma da outra/);
  /* a célula que usa o resultado de uma circular não trava */
  const e = montar({ C1: '=C2', C2: '=C1', D1: '=C1+1' });
  assert.equal(new Motor(e).valor('a1', 0, 3), 1);
  /* o que não é circular continua certo (encadeado e derramado) */
  const f = montar({ A1: 5, B1: '=A1', C1: '=B1', D1: '=C1*2', E1: '=SEQUÊNCIA(2)' });
  const mf = new Motor(f);
  assert.equal(mf.valor('a1', 0, 3), 10);
  assert.equal(mf.valor('a1', 1, 4), 2);
  assert.equal(mf.circulares().length, 0);
});

test('v0.4.3.1: soma de outra aba diz "A1:A3 da aba Planilha2"', () => {
  const c = montar({ F2: '=SOMA(Planilha2!A1:A3)' }, { Planilha2: { A1: 1, A2: 2, A3: 3 } });
  const r = X.explicarConta(new Motor(c), c, 'a1', 1, 5, null);
  assert.match(r.frase, /^Soma A1:A3 da aba Planilha2\./);
});

test('v0.4.3.1: conta circular: um aviso só para o grupo, no Explicar e no Problemas', () => {
  const c = montar({ N3: '=N4+1', N4: '=N3+1', A1: '=A1+1', B1: 1 });
  const m = new Motor(c);
  const pos2 = (k) => pos(k);
  const g = X.causaCircular(m, c, 'a1', ...pos2('N3'));
  assert.equal(g.msg, 'N3 e N4 dependem uma da outra, então as duas ficam 0. Apague uma das contas.');
  assert.deepEqual(g.acoes.map((a) => a.rotulo), ['Ir para N4']);
  assert.equal(X.causaDaConta(m, c, 'a1', ...pos2('N4')).cod, 'circular');
  assert.equal(X.causaCircular(m, c, 'a1', ...pos2('B1')), null, 'célula normal não é circular');
  const a1 = X.causaCircular(m, c, 'a1', ...pos2('A1'));
  assert.equal(a1.msg, 'A1 depende dela mesma, então fica 0. Apague a conta ou tire a própria célula dela.');
  const l = X.problemasDaPlanilha(m, c, null).filter((p) => /depend/.test(p.texto));
  assert.equal(l.length, 2, 'um aviso para N3/N4 e um para A1');
  assert.ok(l.some((p) => p.texto.startsWith('N3 e N4 dependem uma da outra')));
});

test('v0.4.3.1: caixa de nome: C:C, B:D, 3:3 (mostrar e ler)', () => {
  assert.equal(textoFaixaCaixa({ l1: 0, l2: MAX_LIN - 1, c1: 2, c2: 2 }), 'C:C');
  assert.equal(textoFaixaCaixa({ l1: 0, l2: MAX_LIN - 1, c1: 1, c2: 3 }), 'B:D');
  assert.equal(textoFaixaCaixa({ l1: 2, l2: 2, c1: 0, c2: MAX_COL - 1 }), '3:3');
  assert.equal(textoFaixaCaixa({ l1: 0, l2: 1, c1: 0, c2: 1 }), 'A1:B2');
  assert.deepEqual(lerEnderecoCaixa('c:c'), { aba: null, l1: 0, c1: 2, l2: MAX_LIN - 1, c2: 2 });
  assert.deepEqual(lerEnderecoCaixa('2:4'), { aba: null, l1: 1, c1: 0, l2: 3, c2: MAX_COL - 1 });
  assert.deepEqual(lerEnderecoCaixa('Planilha2!B:C'), { aba: 'Planilha2', l1: 0, c1: 1, l2: MAX_LIN - 1, c2: 2 });
  assert.equal(lerEnderecoCaixa('B2:C3').l2, 2);
  assert.equal(lerEnderecoCaixa('abc'), null);
});

test('v0.4.3.1: receitas: começam vazias, não montam sem escolher, datas e receitas novas', () => {
  for (const r of RECEITAS) {
    const v = Object.fromEntries(r.campos.map((f) => [f.id, f.padrao ?? '']));
    assert.equal(r.montar(v), null, r.id + ' não devia montar vazia');
    const ex = typeof r.exemplo === 'function' ? r.exemplo({}) : r.exemplo;
    assert.ok(ex && !/Packing|aba Lotes|L-012/.test(ex), r.id + ' exemplo inventado: ' + ex);
    assert.ok(!/46\d{3}/.test(ex));
  }
  assert.ok(RECEITAS.find((r) => r.id === 'contarEntre') && RECEITAS.find((r) => r.id === 'desvio'));
  assert.equal(dataNaFormula('01/10/2026'), 'DATA(2026;10;1)');
  assert.equal(dataNaFormula('b1'), 'B1');
  assert.equal(dataNaFormula('31/02/2026'), null);
  assert.equal(dataNaFormula(''), null);
  const ex = RECEITAS.find((r) => r.id === 'contar').exemplo({ texto: { titulo: 'Situação', valor: 'Ajustar' } });
  assert.equal(ex, 'Quantas linhas de Situação estão como "Ajustar"?');
  /* contar entre duas datas calcula */
  const dia = serialDe(2026, 10, 1);
  const c = montar({ A1: 'Data', A2: dia, A3: dia + 9, A4: dia + 40 });
  const t = RECEITAS.find((r) => r.id === 'contarEntre').montar({ col: 'A2:A200', de: '01/10/2026', ate: '31/10/2026' }).texto;
  assert.equal(new Motor(c).previa(t, 'a1', 9, 9).valor, 2);
  const d = RECEITAS.find((r) => r.id === 'desvio').montar({ col: 'A2:A200', tipo: 'amostra' }).texto;
  assert.equal(d, 'DESVPAD.A(A2:A200)');
  assert.ok(!new Motor(montar({ A2: 1, A3: 2, A4: 3 })).previa(d, 'a1', 9, 9).erro);
});

test('v0.4.3.1: código com zero na frente é avisado só quando só tem dígitos e começa com zero', () => {
  assert.equal(lerEntrada('001').zeroNaFrente, '001');
  assert.equal(lerEntrada('001').v, 1);
  assert.equal(lerEntrada('0042').zeroNaFrente, '0042');
  assert.equal(lerEntrada('0').zeroNaFrente, undefined);
  assert.equal(lerEntrada('0,5').zeroNaFrente, undefined);
  assert.equal(lerEntrada('10').zeroNaFrente, undefined);
  assert.equal(lerEntrada('001', '@').zeroNaFrente, undefined, 'coluna em formato Texto já guarda como texto');
  assert.deepEqual(lerEntrada("'001"), { v: '001', texto: true });
});

test('v0.4.3.1: inserir coluna leva junto a escolha lembrada dos zeros', () => {
  const c = montar({ A1: 'x' });
  c.abas.a1.zeros = { 2: 't' };
  const mud = O.estrutura(c, 'a1', 'c', 0, 1);
  assert.deepEqual(mud['conteudo.abas.a1.zeros'], { 3: 't' });
});
