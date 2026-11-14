/* v0.6.17 (Ponte 2): campos por nome de célula, preencher uma cópia em memória, pedido do EFCwork e número diferente (D03). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EFD } from '../../src/ponte/ponte.js';
import { camposDoLivro, camposParaPub, capacidades, preencher, conferirPedido, divergencias, faixaDoNome, dicionario, FOLHAS_MAX } from '../../src/ponte/campos.js';

const exemplos = JSON.parse(readFileSync(new URL('../../contrato/exemplos-efd-v1.json', import.meta.url), 'utf8'));
const nome = (n, ref) => [n.toLowerCase(), { n, ref }];
/* ficha inventada: OS numa mescla B2:D2, data com formato de data em B3, caixas em B4, lista de amostras nas linhas 7 a 9
   (a identificação em células mescladas de duas colunas) */
const livro = (extra = {}) => ({
  v: 1, ordem: ['a1', 'a2'], seq: 3, estilos: [{}, { nf: 'dd/mm/yyyy' }, { negrito: true }],
  abas: {
    a1: { id: 'a1', nome: 'Ficha 1', mesc: ['B2:D2', 'B7:C7', 'B8:C8', 'B9:C9'],
      cel: { A2: { v: 'OS' }, B2: { v: 'exemplo', s: 2 }, B3: { v: 46000, s: 1 }, C3: { v: '' }, B4: { v: 5 }, A7: { v: 99 }, B7: { v: 'modelo' }, D7: { v: 46000, s: 1 }, B9: { v: 'sobra' } } },
    a2: { id: 'a2', nome: 'Outra', cel: {} },
  },
  nomes: Object.fromEntries([
    nome('efc_coleta_os', "'Ficha 1'!$B$2:$D$2"), nome('efc_coleta_data', "'Ficha 1'!$B$3"), nome('efc_envio_caixas', "'Ficha 1'!$B$4"), nome('efc_coleta_hora', "'Ficha 1'!$C$3"),
    nome('efc_amostras_n', "'Ficha 1'!$A$7:$A$9"), nome('efc_amostras_identificacao', "'Ficha 1'!$B$7:$B$9"), nome('efc_amostras_data', "'Ficha 1'!$D$7:$D$9"),
    nome('efc_nao_existe', "'Ficha 1'!$F$1"), nome('efc_lab_nome', "'Sumiu'!$A$1"), nome('Total', "'Ficha 1'!$B$4"),
    ...Object.entries(extra),
  ]),
});
const pedido = (extra = {}) => ({ pid: 'p8k2m4x9aa01', docId: 'dmhx3k2a01zz9q', de: 'efcwork', copias: 1, criadoEm: '2026-11-13T12:00:00.000Z', dados: {}, ...extra });

test('Ponte 2: nomes efc_ viram campos na ordem do dicionário; os de fora do dicionário e os quebrados não entram', () => {
  const r = camposDoLivro(livro());
  assert.deepEqual(r.campos.map((x) => x.chave), ['envio.caixas', 'coleta.data', 'coleta.hora', 'coleta.os', 'amostras[].n', 'amostras[].identificacao', 'amostras[].data']);
  assert.deepEqual(r.fora, ['efc_lab_nome', 'efc_nao_existe']); assert.equal(r.excesso, 0);
  const os = r.campos.find((x) => x.chave === 'coleta.os');
  assert.deepEqual([os.abaId, os.l1, os.c1, os.l2, os.c2, os.tipo, os.rotulo], ['a1', 1, 1, 1, 3, 'texto', 'OS']);
  assert.deepEqual(camposParaPub(r.campos)[5], { chave: 'amostras[].identificacao', rotulo: 'Lista de amostras · Identificação', tipo: 'texto' });
  /* o que vai em pub.campos passa no conferente do contrato */
  const f = structuredClone(exemplos.validos.fichas.find((x) => x.pub && x.pub.preenche === 'docs'));
  f.pub.campos = camposParaPub(r.campos);
  assert.deepEqual(EFD.ficha(f), []);
  assert.deepEqual(faixaDoNome(livro(), "'Ficha 1'!$B$7:$B$9"), { abaId: 'a1', l1: 6, c1: 1, l2: 8, c2: 1 });
  assert.equal(faixaDoNome(livro(), '$B$7'), null); assert.equal(faixaDoNome(livro(), "'Ficha 1'!$A$1,'Ficha 1'!$B$1"), null);
});

test('Ponte 2: de 1 a 32 campos: o que passa do limite fica de fora e é contado', () => {
  const dic = dicionario(); assert.equal(dic.length, 43, '31 simples e 12 colunas de lista');
  const todos = Object.fromEntries(dic.map((d, i) => nome(EFD.nomeExcel(d.chave.replace('[].', '[]_').replace('[]', '')), `'Outra'!$A$${i + 1}`)));
  const r = camposDoLivro(livro(todos));
  assert.equal(r.campos.length, 32); assert.equal(r.excesso, 11);
  assert.equal(EFD.nomeExcel('amostras[].data'.replace('[].', '.')), 'efc_amostras_data');
});

test('Ponte 2: preencher põe o valor na âncora da mescla, respeita o formato da célula e não mexe no modelo', () => {
  const c = livro(), { campos } = camposDoLivro(c), antes = JSON.stringify(c);
  const r = preencher(c, campos, { 'coleta.os': 'OS-0412', 'coleta.data': '2026-11-12', 'coleta.hora': '08:30', 'envio.caixas': 2 });
  const cel = r.conteudo.abas.a1.cel;
  assert.deepEqual(cel.B2, { s: 2, v: 'OS-0412' }, 'mescla B2:D2: valor na âncora, estilo mantido');
  assert.deepEqual(cel.B3, { s: 1, v: 46338 }, 'célula com formato de data recebe o número do Excel');
  assert.deepEqual(cel.C3, { v: '08:30' }, 'sem formato de hora, entra o texto');
  assert.deepEqual(cel.B4, { v: 2 });
  assert.equal(r.postos, 4);
  assert.equal(JSON.stringify(c), antes, 'o documento-modelo não mudou');
  assert.equal(r.conteudo.abas.a2, c.abas.a2, 'aba que não foi tocada não é copiada');
  assert.deepEqual(r.conteudo.mesc, c.mesc);
});

test('Ponte 2: lista: uma linha por casa (mescladas contam uma vez), datas no formato da célula, e as casas que sobram ficam vazias', () => {
  const c = livro(), { campos } = camposDoLivro(c);
  assert.deepEqual(capacidades(c, campos), { 'amostras[]': 3 });
  const r = preencher(c, campos, { 'amostras[]': [{ n: 1, identificacao: 'T01-A', data: '2026-11-12' }, { n: 2, identificacao: 'T02-A', data: '2026-11-13' }] });
  const cel = r.conteudo.abas.a1.cel;
  assert.deepEqual([cel.A7.v, cel.B7.v, cel.D7.v], [1, 'T01-A', 46338]);
  assert.deepEqual([cel.A8.v, cel.B8.v, cel.D8.v], [2, 'T02-A', '13/11/2026'], 'D8 não tem formato de data: entra o texto');
  assert.deepEqual([cel.A9, cel.B9, cel.D9], [undefined, undefined, undefined], 'a linha de exemplo que sobrou fica vazia de verdade (as contas do modelo não contam com ela)');
  assert.equal(cel.B2.v, 'exemplo', 'campo simples que não veio no pedido fica como está');
});

test('Ponte 2: pedido: lista maior que a capacidade repete a folha; folhas trocam só o que muda; cópias multiplicam', () => {
  const c = livro();
  const linhas = [1, 2, 3, 4, 5, 6, 7].map((n) => ({ n, identificacao: 'A-0' + n }));
  const r = conferirPedido(pedido({ dados: { 'coleta.os': 'OS-1', 'amostras[]': linhas } }), { c, revAtual: 2 });
  assert.equal(r.erro, undefined);
  assert.deepEqual(r.folhas.map((f) => f['amostras[]'].map((x) => x.n)), [[1, 2, 3], [4, 5, 6], [7]]);
  assert.ok(r.folhas.every((f) => f['coleta.os'] === 'OS-1'));
  const r2 = conferirPedido(pedido({ copias: 2, dados: { 'coleta.os': 'OS-1', 'envio.caixas': 2 }, folhas: [{ 'envio.caixas': 1 }, { 'envio.caixas': 2 }] }), { c });
  assert.deepEqual(r2.folhas.map((f) => f['envio.caixas']), [1, 2, 1, 2]);
});

test('Ponte 2: pedido inválido responde o erro do contrato e não gera folha', () => {
  const c = livro();
  assert.equal(conferirPedido(pedido({ dados: { 'coleta.os': 'x' } }), { c: null }).erro, 'sem-documento');
  assert.equal(conferirPedido(pedido({ rev: 1, dados: { 'coleta.os': 'x' } }), { c, revAtual: 2 }).erro, 'revisao-mudou');
  assert.equal(conferirPedido(pedido({ rev: 2, dados: { 'coleta.os': 'x' } }), { c, revAtual: 2 }).erro, undefined);
  const fora = conferirPedido(pedido({ dados: { 'lab.nome': 'Laboratório A' } }), { c });
  assert.equal(fora.erro, 'campo-desconhecido'); assert.match(fora.detalhe, /Laboratório/);
  assert.equal(conferirPedido(pedido({ dados: { 'isso.nao': 'x' } }), { c }).erro, 'campo-desconhecido', 'chave fora do dicionário');
  assert.equal(conferirPedido(pedido({ dados: { 'envio.caixas': 'dois' } }), { c }).erro, 'campo-desconhecido', 'tipo errado');
  assert.equal(conferirPedido(pedido({ dados: { 'participantes[]': [{ n: 1, nome: 'Ana' }] } }), { c }).erro, 'campo-desconhecido', 'lista sem coluna marcada');
  const muitas = conferirPedido(pedido({ copias: 20, dados: { 'amostras[]': [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ n })) } }), { c });
  assert.equal(muitas.erro, 'nao-cabe'); assert.match(muitas.detalhe, new RegExp(`60 folhas; o limite é ${FOLHAS_MAX}`));
  /* os pedidos de exemplo do contrato têm a forma certa (o erro, se houver, é só por campo que este documento não marcou) */
  for (const p of exemplos.validos.pedidos) { const r = conferirPedido(p, { c }); assert.ok(!r.erro || /não tem campo marcado/.test(r.detalhe), r.detalhe); }
});

test('Ponte 2 (D03): número da ficha diferente do envio é apontado; igual, texto e fórmula não', () => {
  const c = livro(), { campos } = camposDoLivro(c);
  assert.deepEqual([...divergencias(c, campos, { 'envio.caixas': 6, 'coleta.os': 'outra' })], [['envio.caixas', 5]]);
  assert.equal(divergencias(c, campos, { 'envio.caixas': 5 }).size, 0);
  c.abas.a1.cel.B4 = { f: 'A1+1', v: 5 };
  assert.equal(divergencias(c, campos, { 'envio.caixas': 6 }).size, 0, 'conta não é conferida (o valor depende de outras células)');
});

test('Ponte 2: do pedido às páginas: preenche a cópia, refaz as contas, uma leva de páginas por folha, e o arquivo guardado não muda', async () => {
  const { paginasDoPedido, pedidoDoResumo } = await import('../../src/ponte/pedido.js');
  const conteudo = { v: 1, ordem: ['a1'], seq: 2, estilos: [{}], abas: { a1: { id: 'a1', nome: 'Ficha', cel: { A1: { v: 'OS' }, B1: { v: 'exemplo' }, A2: { v: 'Dobro' }, B2: { f: 'B3*2' }, B3: { v: 1 } } } },
    nomes: Object.fromEntries([nome('efc_coleta_os', 'Ficha!$B$1'), nome('efc_envio_caixas', 'Ficha!$B$3')]) };
  const arquivo = { ficha: { tipo: 'planilha', nome: 'Ficha X' }, conteudo }, antes = JSON.stringify(conteudo);
  const r = paginasDoPedido(pedido({ copias: 2, dados: { 'coleta.os': 'OS-0412', 'envio.caixas': 21 } }), arquivo, 1);
  assert.equal(r.erro, undefined); assert.equal(r.folhas, 2); assert.equal(r.paginas.length, 2);
  const textos = r.paginas[0].ops.filter((o) => o.k === 'text').map((o) => o.t);
  assert.ok(textos.includes('OS-0412') && textos.includes('21') && textos.includes('42'), 'valor posto e conta refeita (21 × 2): ' + textos.join(' | '));
  assert.ok(!textos.includes('exemplo'));
  assert.equal(JSON.stringify(conteudo), antes, 'o documento guardado não mudou');
  assert.equal(paginasDoPedido(pedido({ dados: { 'coleta.os': 'x' } }), { ficha: { tipo: 'postits', nome: 'Q' }, conteudo: {} }).erro, 'sem-documento', 'quadro não tem campo');
  assert.equal(paginasDoPedido(pedido({ dados: { 'coleta.os': 'x' } }), { ficha: { tipo: 'planilha', nome: 'L', status: 'lixeira' }, conteudo }).erro, 'sem-documento', 'documento na lixeira');
  /* a partir do resumo do envio: vale só o que o documento tem marcado */
  const local = pedidoDoResumo({ docId: 'dmhx3k2a01zz9q', titulo: 'Remessa', dados: { 'coleta.os': 'OS-9', 'lab.nome': 'Laboratório A', 'amostras[]': [{ n: 1 }] } }, conteudo);
  assert.deepEqual(local.dados, { 'coleta.os': 'OS-9' });
  assert.equal(paginasDoPedido(local, arquivo).paginas.length, 1);
});

test('Ponte 2: ficha do Excel com nomes efc_ (feitos no Gerenciador de Nomes): os campos vêm ao abrir, voltam ao salvar e o pedido preenche mescladas e lista', async () => {
  const { lerXlsx } = await import('../../src/planilha/xlsx/ler.js');
  const { gravarXlsx } = await import('../../src/planilha/xlsx/gravar.js');
  const { normalizarPlanilha } = await import('../../src/planilha/modelo.js');
  const { Motor } = await import('../../src/planilha/motor.js');
  const { paginasDoPedido } = await import('../../src/ponte/pedido.js');
  const bytes = new Uint8Array(readFileSync(new URL('../amostras/amostra-v0617.xlsx', import.meta.url)));
  const c = normalizarPlanilha((await lerXlsx(bytes)).conteudo);
  const r = camposDoLivro(c);
  assert.equal(r.campos.length, 11); assert.deepEqual(r.fora, []);
  assert.deepEqual(capacidades(c, r.campos), { 'amostras[]': 6 });
  const item = pedido({ dados: { 'lab.nome': 'Laboratório A', 'coleta.os': 'OS-0412', 'coleta.data': '2026-11-12', 'coleta.coletor': 'Joana Silva', 'envio.amostras': 8, 'envio.caixas': 2,
    'amostras[]': [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ n, identificacao: 'T0' + n + '-A', data: '2026-11-12', hora: '08:3' + n, analise: 'Microbiológica' })) } });
  const pg = paginasDoPedido(item, { ficha: { tipo: 'planilha', nome: 'Ficha de solicitação' }, conteudo: c }, undefined);
  assert.equal(pg.erro, undefined); assert.equal(pg.folhas, 2, '8 amostras em 6 casas: repete a folha');
  const t1 = pg.paginas[0].ops.filter((o) => o.k === 'text').map((o) => o.t), t2 = pg.paginas[1].ops.filter((o) => o.k === 'text').map((o) => o.t);
  for (const esperado of ['Laboratório A', 'OS-0412', '12/11/2026', 'Joana Silva', 'T06-A', '08:31', '6']) assert.ok(t1.includes(esperado), `folha 1 tem "${esperado}": ${t1.join(' | ')}`);
  assert.ok(!t1.includes('T07-A') && !t1.includes('(exemplo)') && !t1.includes('(nome do laboratório)'));
  assert.ok(t2.includes('T07-A') && t2.includes('T08-A') && !t2.includes('T01-A') && !t2.includes('6'), 'folha 2 com as duas que sobraram e a conta refeita (2 linhas, não 6): ' + t2.join(' | '));
  /* ida e volta: os nomes continuam no arquivo salvo */
  const salvo = await gravarXlsx(c, new Motor(c), { titulo: 'Ficha', original: bytes });
  const c2 = normalizarPlanilha((await lerXlsx(salvo.bytes)).conteudo);
  assert.deepEqual(camposDoLivro(c2).campos.map((x) => [x.chave, x.l1, x.c1, x.l2, x.c2]), r.campos.map((x) => [x.chave, x.l1, x.c1, x.l2, x.c2]));
});
