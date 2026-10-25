/* EFCdocs v0.4.1 — testes das regras da Planilha (motor, fórmulas, formatos, entrada, operações). */
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
