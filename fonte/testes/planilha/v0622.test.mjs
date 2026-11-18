/* v0.6.22 · pinça no celular (D-61), arquivo solto em cima do app (D-62) e desfazer em dois passos (D01 da v0.6.19). Sem tela. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zoomDaPinca } from '../../src/planilha/pinca.js';
import { tipoDoArquivo, avisoDoArquivo, trazArquivo } from '../../src/nucleo/soltar.js';
import { Lote } from '../../src/planilha/operacoes.js';

test('Pinça: o zoom acompanha a distância dos dedos, em passos de 5%, entre o mínimo e o máximo', () => {
  assert.equal(zoomDaPinca(1, 100, 200, 0.5, 2), 2);
  assert.equal(zoomDaPinca(1, 100, 150, 0.5, 2), 1.5);
  assert.equal(zoomDaPinca(1, 100, 112, 0.5, 2), 1.1, 'arredonda para 5%');
  assert.equal(zoomDaPinca(1, 100, 30, 0.5, 2), 0.5, 'não passa do mínimo');
  assert.equal(zoomDaPinca(1.5, 100, 400, 0.5, 2), 2, 'não passa do máximo');
  assert.equal(zoomDaPinca(1.2, 0, 50, 0.5, 2), 1.2, 'sem distância inicial não muda');
});

test('Arquivo solto: Excel abre; .xls, CSV, Word, PDF e outros dizem o que fazer', () => {
  assert.equal(tipoDoArquivo('Coletas.xlsx'), 'excel'); assert.equal(tipoDoArquivo('Macros.XLSM'), 'excel');
  assert.equal(tipoDoArquivo('sem extensão', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'), 'excel');
  assert.equal(tipoDoArquivo('antigo.xls'), 'excelAntigo'); assert.equal(tipoDoArquivo('dados.csv'), 'csv');
  assert.equal(tipoDoArquivo('POP.docx'), 'word'); assert.equal(tipoDoArquivo('x', 'application/pdf'), 'pdf');
  assert.equal(tipoDoArquivo('foto.png', 'image/png'), 'outro');
  assert.equal(avisoDoArquivo('excel', 'a.xlsx'), null);
  assert.match(avisoDoArquivo('word', 'POP.docx'), /"POP.docx" é do Word\. Abrir Word chega com o editor do Documento/);
  assert.match(avisoDoArquivo('pdf', 'Laudo.pdf'), /é um PDF/);
  assert.match(avisoDoArquivo('excelAntigo', 'a.xls'), /Salvar como/);
  assert.match(avisoDoArquivo('outro', ''), /^Este arquivo não é/);
  assert.equal(trazArquivo({ types: ['Files'] }), true); assert.equal(trazArquivo({ types: ['text/plain'] }), false); assert.equal(trazArquivo(null), false);
});

test('Lote.copia: guarda o que foi digitado antes da tabela crescer (o 1º passo de desfazer é só a expansão)', () => {
  const c = { estilos: [{}], abas: { a: { cel: { A1: { v: 'Título' } } } } };
  const l = new Lote(c); l.por('a', 'A3', { v: 'digitado' }); l.outras['conteudo.abas.a.larg.0'] = 90;
  const so = l.copia();
  l.por('a', 'B3', { v: 1, s: 0 }); l.outras['conteudo.tabelas.t1'] = { l2: 3 };
  assert.deepEqual(so.mudancas(), { 'conteudo.abas.a.larg.0': 90, 'conteudo.abas.a.cel.A3': { v: 'digitado' } });
  assert.ok('conteudo.tabelas.t1' in l.mudancas() && 'conteudo.abas.a.cel.B3' in l.mudancas(), 'o lote inteiro continua com a expansão');
});
