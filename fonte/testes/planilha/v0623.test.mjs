/* v0.6.23 · atalhos do Excel em português, preenchimento mais esperto e pinça no ponto dos dedos (D10). Sem tela. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { atalhoDe, fazerAtalho, eixoInteiro } from '../../src/planilha/atalhos.js';
import { continuarSerie } from '../../src/planilha/entrada.js';
import { ancoraDaPinca } from '../../src/planilha/pinca.js';
import { PorId } from '../../src/nucleo/comandos.js';
import { ATALHOS, DESCRICAO } from '../../src/nucleo/dicas.js';

const C = (key, extra = {}) => atalhoDe({ key, ctrlKey: true, ...extra });
test('Atalhos do Excel em português: formatação (lista do suporte da Microsoft)', () => {
  assert.equal(C('n'), 'formatar.negrito'); assert.equal(C('2', { code: 'Digit2' }), 'formatar.negrito'); assert.equal(C('n', { altKey: true }), 'formatar.negrito');
  assert.equal(C('i'), 'formatar.italico'); assert.equal(C('3', { code: 'Digit3' }), 'formatar.italico');
  assert.equal(C('s'), 'formatar.sublinhado'); assert.equal(C('4', { code: 'Digit4' }), 'formatar.sublinhado');
  assert.equal(C('5', { code: 'Digit5' }), 'formatar.tachado'); assert.equal(C('1', { code: 'Digit1' }), 'formatar.formatoNumero');
  assert.equal(C('~', { shiftKey: true, code: 'Backquote' }), 'formatar.formatoNumero|geral');
  assert.equal(C('!', { shiftKey: true, code: 'Digit1' }), 'formatar.formatoNumero|numero');
  assert.equal(C('@', { shiftKey: true, code: 'Digit2' }), 'formatar.formatoNumero|hora');
  assert.equal(C('#', { shiftKey: true, code: 'Digit3' }), 'formatar.formatoNumero|data');
  assert.equal(C('$', { shiftKey: true, code: 'Digit4' }), 'formatar.moeda'); assert.equal(C('%', { shiftKey: true, code: 'Digit5' }), 'formatar.porcentagem');
  assert.equal(C('¨', { shiftKey: true, code: 'Digit6' }), 'formatar.formatoNumero|cientifico', 'teclado ABNT: Shift+6 é ¨');
  assert.equal(C('&', { shiftKey: true, code: 'Digit7' }), '@borda:contorno'); assert.equal(C('_', { shiftKey: true, code: 'Minus' }), '@borda:nenhuma');
});
test('Atalhos: arquivo, edição, seleção, inserir e excluir', () => {
  assert.equal(C('b'), 'cx:arquivo.salvar', 'Ctrl+B é Salvar no Excel em português');
  assert.equal(C('z'), 'cx:editar.desfazer'); assert.equal(C('y'), 'cx:editar.refazer'); assert.equal(C('Z', { shiftKey: true }), 'cx:editar.refazer');
  assert.equal(C('a'), '@tudo'); assert.equal(C('t'), '@tudo'); assert.equal(C(' ', { shiftKey: true }), '@tudo');
  assert.equal(C('*', { shiftKey: true, code: 'Digit8' }), '@regiao');
  assert.equal(C('l'), 'editar.localizar'); assert.equal(C('u'), 'editar.localizar', 'Ctrl+U é Substituir no Excel em português');
  assert.equal(C('k'), 'inserir.link'); assert.equal(C('t', { altKey: true }), 'inserir.tabela'); assert.equal(C('v', { altKey: true }), 'editar.colarValores');
  assert.equal(C('L', { shiftKey: true }), 'dados.filtrar'); assert.equal(C('9', { code: 'Digit9' }), 'planilha.ocultarLinha'); assert.equal(C('0', { code: 'Digit0' }), 'planilha.ocultarColuna');
  assert.equal(C('-', { code: 'Minus' }), '@excluir'); assert.equal(C('+', { shiftKey: true, code: 'Equal' }), '@inserir');
  assert.equal(C(';'), '@data'); assert.equal(C(':', { shiftKey: true }), '@hora'); assert.equal(C("'"), '@formulaDeCima');
  assert.equal(C('d'), 'editar.preencherBaixo'); assert.equal(C('r'), 'editar.preencherDireita');
  assert.equal(C('=', { altKey: true, code: 'Equal' }), '@zoomMais'); assert.equal(C('-', { altKey: true, code: 'Minus' }), '@zoomMenos');
  assert.equal(atalhoDe({ key: 'F3', shiftKey: true }), 'formula.inserir'); assert.equal(atalhoDe({ key: 'F7' }), 'revisao.ortografia');
  assert.equal(atalhoDe({ key: 'F11', shiftKey: true }), 'planilha.novaAba'); assert.equal(atalhoDe({ key: 'F1', shiftKey: true, altKey: true }), 'planilha.novaAba');
  assert.equal(atalhoDe({ key: '=', altKey: true, code: 'Equal' }), 'formula.autosoma');
  assert.equal(atalhoDe({ key: 'a' }), null, 'sem Ctrl, letra é para escrever'); assert.equal(C('ArrowDown'), null, 'Ctrl+setas ficam com a planilha');
});
test('Atalhos: todo comando pedido existe no catálogo, e a lista mostrada bate com o que a tecla faz', () => {
  const teclas = ['n', 'i', 's', 'b', 'k', 'l', 'd', 'r', 'u', 'g'].map((k) => C(k)).concat([C('5', { code: 'Digit5' }), C('t', { altKey: true }), C('L', { shiftKey: true }), atalhoDe({ key: 'F3', shiftKey: true }), atalhoDe({ key: 'F7' })]);
  for (const id of teclas) { const base = id.replace(/^cx:/, '').split('|')[0]; assert.ok(PorId[base], 'comando que não existe: ' + id); }
  const A = ATALHOS.planilha;
  assert.equal(A['formatar.negrito'], 'Ctrl+N'); assert.equal(A['arquivo.salvar'], 'Ctrl+B'); assert.equal(A['formatar.tachado'], 'Ctrl+5'); assert.equal(A['inserir.link'], 'Ctrl+K');
  assert.equal(A['app.buscar'], 'Alt+Q', 'na planilha a busca é Alt+Q (Ctrl+K é link)');
  assert.ok(DESCRICAO['formatar.tachado'] && DESCRICAO['arquivo.salvar']);
});
test('fazerAtalho: Ctrl+- e Ctrl++ só com linhas ou colunas inteiras; o resto vai para a planilha ou para o app', () => {
  const feito = [];
  const p = { trata: (id) => { feito.push('t:' + id); return true; }, executar: (id) => feito.push('x:' + id), avisar: (t) => feito.push('aviso'), maxLin: 100, maxCol: 10,
    faixa: () => ({ l1: 2, c1: 0, l2: 3, c2: 9 }), tudo: () => feito.push('tudo'), regiao: () => feito.push('regiao'), agora: (t) => feito.push(t), formulaDeCima: () => feito.push('cima'), bordas: (t) => feito.push('borda:' + t), zoom: (d) => feito.push('zoom' + d) };
  for (const id of ['@excluir', '@inserir', 'formatar.negrito', 'cx:arquivo.salvar', '@borda:contorno', '@zoomMais', '@data', '@formulaDeCima']) fazerAtalho(id, p);
  assert.deepEqual(feito, ['t:planilha.excluirLinha', 't:planilha.inserirLinha', 't:formatar.negrito', 'x:arquivo.salvar', 'borda:contorno', 'zoom0.1', 'data', 'cima']);
  assert.equal(eixoInteiro({ l1: 0, c1: 3, l2: 99, c2: 3 }, 100, 10), 'coluna'); assert.equal(eixoInteiro({ l1: 1, c1: 1, l2: 2, c2: 2 }, 100, 10), null);
  feito.length = 0; fazerAtalho('@excluir', { ...p, faixa: () => ({ l1: 1, c1: 1, l2: 2, c2: 2 }) }); assert.deepEqual(feito, ['aviso']);
});
const ser = (y, m, d) => Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 864e5);
test('Preenchimento: letras, texto terminado em letra, romanos, multiplicando e dias úteis', () => {
  assert.deepEqual(continuarSerie(['A', 'B'], 3), ['C', 'D', 'E'], 'o pedido do Elias');
  assert.deepEqual(continuarSerie(['a', 'c'], 2), ['e', 'g']);
  assert.deepEqual(continuarSerie(['Y', 'Z'], 2), ['AA', 'AB'], 'depois do Z, como as colunas');
  assert.deepEqual(continuarSerie(['AA', 'AB'], 1), ['AC']);
  assert.deepEqual(continuarSerie(['Amostra A', 'Amostra B'], 2), ['Amostra C', 'Amostra D']);
  assert.deepEqual(continuarSerie(['Lote-A', 'Lote-B'], 1), ['Lote-C']);
  assert.deepEqual(continuarSerie(['I', 'II'], 3), ['III', 'IV', 'V']); assert.deepEqual(continuarSerie(['iv', 'v'], 1), ['vi']);
  assert.deepEqual(continuarSerie([2, 4, 8], 2), [16, 32]); assert.deepEqual(continuarSerie([3, 1.5, 0.75], 1), [0.375]);
  assert.deepEqual(continuarSerie([ser(2026, 11, 12), ser(2026, 11, 13), ser(2026, 11, 16)], 4, { ehData: true }), [17, 18, 19, 20].map((d) => ser(2026, 11, d)), 'quinta, sexta, segunda → terça a sexta');
  assert.deepEqual(continuarSerie([ser(2026, 11, 19), ser(2026, 11, 20), ser(2026, 11, 23)], 2, { ehData: true }), [ser(2026, 11, 24), ser(2026, 11, 25)]);
});
test('Preenchimento: o que já existia continua, e o que não é série fica copiando', () => {
  assert.deepEqual(continuarSerie([1, 2, 3], 2), [4, 5]); assert.deepEqual(continuarSerie(['Q-001', 'Q-002'], 1), ['Q-003']);
  assert.deepEqual(continuarSerie(['seg', 'ter'], 1), ['qua']); assert.deepEqual(continuarSerie(['Jan', 'Fev'], 1), ['Mar']);
  assert.equal(continuarSerie(['A'], 2), null, 'uma letra só copia, como no Excel'); assert.equal(continuarSerie([5], 2), null);
  assert.equal(continuarSerie(['OK', 'NG'], 2), null, 'siglas não viram série'); assert.equal(continuarSerie(['Sim', 'Não'], 2), null);
  assert.deepEqual(continuarSerie([ser(2026, 11, 16), ser(2026, 11, 17), ser(2026, 11, 18)], 3, { ehData: true }), [19, 20, 21].map((d) => ser(2026, 11, d)), 'sem pular fim de semana no exemplo, segue dia a dia');
});
test('Pinça (D10): o ponto entre os dedos fica no mesmo lugar da planilha', () => {
  const n = ancoraDaPinca({ sx: 100, sy: 50, z0: 1, z1: 2, px: 200, py: 100 });
  assert.equal(100 + 200 / 1, n.sx + 200 / 2); assert.equal(50 + 100 / 1, n.sy + 100 / 2);
  assert.deepEqual(ancoraDaPinca({ sx: 0, sy: 0, z0: 2, z1: 1, px: 10, py: 10 }), { sx: 0, sy: 0 }, 'não rola para antes do começo');
});
