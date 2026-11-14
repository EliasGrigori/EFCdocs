/* v0.6.16 (Ponte 1): o contrato EFD v1 com o EFCwork (os mesmos arquivos e exemplos dos dois lados) e as regras do Vértice. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { EFD, SUBABAS, montarEnvio, linhasDoResumo, textoDoResumo, noDocumento, partesDe, estadoDoc, mostrar } from '../../src/ponte/ponte.js';

const raiz = new URL('../../', import.meta.url);
const pdfFalso = (n) => { const b = new Uint8Array(n).fill(32); b.set(new TextEncoder().encode('%PDF-1.4\n')); return b; };
const ficha = (extra = {}) => ({ id: 'dmwf0ucrd01cluf', tipo: 'planilha', nome: 'Cadeia de custódia', criadoEm: '2026-11-10T13:05:00.000Z', criadoPor: 'neste aparelho', pastaNome: 'Fichas e custódias', codigo: 'CUS-01', ...extra });

test('Ponte 1: o conferente do contrato roda sem mudar o arquivo (os mesmos exemplos do EFCwork)', () => {
  const saida = execFileSync(process.execPath, [new URL('contrato/confere.js', raiz).pathname], { encoding: 'utf8' });
  assert.match(saida, /\b0 falhas/);
  const n = +/(\d+) ok/.exec(saida)[1];
  assert.ok(n >= 91, 'conferências: ' + n);
});

test('Ponte 1: a ficha que vai para a caixa passa em EFD.ficha, com PDF, original e a versão pedida', async () => {
  const pdf = pdfFalso(800), xlsx = new Uint8Array(2000).fill(80);
  const r = await montarEnvio({ ficha: ficha(), pdf, paginas: 2, papel: 'A4', orient: 'paisagem', original: { bytes: xlsx, nome: 'Cadeia de custódia.xlsx' }, rev: 3, agora: '2026-11-13T12:00:00.000Z' });
  assert.deepEqual(EFD.ficha(r.ficha), []);
  assert.equal(r.ficha.rev, 3); assert.equal(r.ficha.pub.rev, 3); assert.equal(r.ficha.id, 'dmwf0ucrd01cluf');
  assert.equal(r.ficha.pastaNome, 'Fichas e custódias'); assert.equal(r.ficha.codigo, 'CUS-01'); assert.equal(r.ficha.origem, 'docs');
  assert.equal(r.ficha.pub.paginas, 2); assert.equal(r.ficha.pub.orient, 'paisagem'); assert.equal(r.ficha.pub.preenche, 'nao');
  assert.equal(r.ficha.pub.sha256, createHash('sha256').update(pdf).digest('hex'));
  assert.ok(r.pdf instanceof ArrayBuffer && r.original instanceof ArrayBuffer, 'arquivos como ArrayBuffer (regra da caixa)');
  assert.equal(r.ficha.orig.formato, 'xlsx'); assert.equal(r.ficha.orig.bytes, 2000); assert.equal(r.nomeArquivo, 'Cadeia de custódia.xlsx');
});

test('Ponte 1: limites do plano grátis: PDF acima de 3,3 MB recusado; original acima de 1,3 MB fica de fora com aviso; papel desconhecido vai como A4', async () => {
  await assert.rejects(montarEnvio({ ficha: ficha(), pdf: pdfFalso(3_400_000), paginas: 1, rev: 1 }), /3,3 MB/);
  const r = await montarEnvio({ ficha: ficha(), pdf: pdfFalso(900), paginas: 1, papel: 'Carta', original: { bytes: new Uint8Array(1_400_000), nome: 'grande.xlsx' }, rev: 1 });
  assert.equal(r.ficha.orig, null); assert.equal(r.original, null);
  assert.ok(r.avisos.some((a) => /1,3 MB/.test(a)) && r.avisos.some((a) => /Carta vai como A4/.test(a)), r.avisos.join(' | '));
  assert.equal(r.ficha.pub.papel, 'A4');
  assert.equal(partesDe(675_000), 1); assert.equal(partesDe(675_001), 2); assert.equal(partesDe(3_375_000), 5);
});

test('Ponte 1: resumo do envio: rótulos, data e número como no Brasil, listas e o texto do "Copiar tudo"', () => {
  const l = linhasDoResumo({ 'coleta.os': 'OS-77', 'envio.amostras': 1234, 'coleta.data': '2026-11-12', 'amostras[]': [{ n: 1, identificacao: 'A-01', data: '2026-11-12', qtd: 2.5 }], 'nada.disso': 1 });
  assert.deepEqual(l.map((x) => [x.rotulo, x.texto]), [['Quantidade de amostras', '1.234'], ['Data da coleta', '12/11/2026'], ['OS', 'OS-77'], ['Lista de amostras', '1 linha']]);
  assert.deepEqual(l[3].linhas, ['1 · A-01 · 12/11/2026 · 2,5']);
  assert.equal(textoDoResumo('Remessa A', l), 'Remessa A\nQuantidade de amostras: 1.234\nData da coleta: 12/11/2026\nOS: OS-77\nLista de amostras:\n  1 · A-01 · 12/11/2026 · 2,5');
  assert.equal(mostrar('hora', '08:30'), '08:30');
});

test('Ponte 1: "na ficha" acha o texto (sem diferença de maiúsculas), o número e a data (número de série do Excel ou 12/11/2026)', () => {
  const conteudo = { abas: { a: { cel: { A1: { v: 'os-77 ' }, B1: { v: 6 }, C1: { v: 46338 }, D1: { v: '13/11/2026' }, E1: { f: 'B1*2' } } } } };
  const l = linhasDoResumo({ 'coleta.os': 'OS-77', 'envio.amostras': 6, 'coleta.data': '2026-11-12', 'envio.data': '2026-11-13', 'envio.caixas': 12, 'coleta.coletor': 'Joana' });
  assert.deepEqual([...noDocumento(conteudo, l)].sort(), ['coleta.data', 'coleta.os', 'envio.amostras', 'envio.data']);
});

test('Ponte 1: sub-abas pedidas e a situação de cada documento', () => {
  assert.deepEqual(SUBABAS, ['Etiquetas', 'Fichas e custódias', 'Formulários', 'Fluxogramas', 'POPs e procedimentos']);
  assert.equal(estadoDoc({}, 'd1').texto, 'Não compartilhado');
  assert.equal(estadoDoc({ d1: { rev: 2, estado: 'caixa' } }, 'd1').texto, 'Na caixa do Cwork · versão 2');
  assert.equal(estadoDoc({ d1: { rev: 2, estado: 'recebido' } }, 'd1').texto, 'Recebido pelo Cwork · versão 2');
});

test('Ponte 1: os arquivos do contrato são os do EFCwork (sem edição local)', () => {
  const ponte = readFileSync(new URL('contrato/efd-ponte.js', raiz), 'utf8'), efd = readFileSync(new URL('contrato/efd-v1.js', raiz), 'utf8');
  assert.match(ponte, /PONTE EFD v1/); assert.match(efd, /CONTRATO EFD v1/);
  assert.equal(createHash('sha256').update(efd).digest('hex'), '6543f0ba65f20a182e32e830f4c20aef824b2d61e635ba577b9ceab9bab5a6dc');
  assert.equal(createHash('sha256').update(ponte).digest('hex'), '7c0eab90cf2a6f0c25c3027e8999dd58e22a3067a97eef7fc32670f512f1b72d');
});
