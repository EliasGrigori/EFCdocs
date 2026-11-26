/* v0.6.72 (P1 do plano "Vértice como aba do Cwork"): quem sou, número de gravação, modo aba e banco pronto para a nuvem.
   Falha na v0.6.71 (não existia). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quemSou, autorDaFicha, donoDaFicha, nomeGravado, ID_APARELHO } from '../../src/nucleo/quem.js';
import { criarArquivo, carimbar } from '../../src/nucleo/modelo.js';
import { criarBanco, bancoNaMemoria } from '../../src/nucleo/banco.js';
import { dentroDoCwork } from '../../src/nucleo/emCwork.js';
import { criarFila, enviarPendentes, remotoNaMemoria, nomeCopiaEmConflito } from '../../src/nucleo/nuvem.js';
import { pode } from '../../src/nucleo/perfis.js';

test('quem sou: sem login é "neste aparelho" com o nome do perfil; com login do Cwork é a conta', () => {
  const q = quemSou({ perfil: 'editor', perfilNome: 'Editor' });
  assert.equal(q.id, ID_APARELHO); assert.equal(q.origem, 'aparelho');
  assert.equal(q.nome, 'Editor', 'sem nome digitado (node não tem localStorage), vale o perfil');
  const l = quemSou({ perfil: 'editor' }, { uid: 'u123', nome: 'Pessoa A', perfil: 'principal' });
  assert.deepEqual([l.id, l.nome, l.perfil, l.origem], ['u123', 'Pessoa A', 'principal', 'cwork']);
  assert.equal(nomeGravado({ id: 'x', nome: '' }), 'x');
});

test('a ficha guarda nome e id de quem criou e alterou; arquivo antigo continua com o mesmo dono', () => {
  const a = criarArquivo({ tipo: 'planilha', autor: { id: ID_APARELHO, nome: 'Pessoa A' }, agora: '2026-11-26T08:00:00.000Z' });
  assert.deepEqual([a.ficha.criadoPor, a.ficha.criadoPorId, a.ficha.alteradoPorId, a.ficha.gravacao], ['Pessoa A', ID_APARELHO, ID_APARELHO, 0]);
  const b = carimbar(a, { id: 'u9', nome: 'Pessoa B' });
  assert.deepEqual([b.ficha.alteradoPor, b.ficha.alteradoPorId, b.ficha.criadoPor], ['Pessoa B', 'u9', 'Pessoa A']);
  const velho = criarArquivo({ tipo: 'docx', autor: 'neste aparelho' });
  assert.deepEqual(autorDaFicha('neste aparelho'), { id: ID_APARELHO, nome: 'neste aparelho' });
  const antigo = { criadoPor: 'neste aparelho' }; /* ficha de antes da v0.6.72, sem criadoPorId */
  assert.equal(donoDaFicha(antigo), ID_APARELHO);
  assert.equal(donoDaFicha(velho.ficha), ID_APARELHO);
  /* a permissão "só o dono" continua igual para quem sempre usou este aparelho */
  assert.equal(pode('operador', 'arquivo.renomear', { usuario: quemSou().id, criadoPor: donoDaFicha(antigo) }), true);
  assert.equal(pode('operador', 'arquivo.renomear', { usuario: quemSou().id, criadoPor: donoDaFicha({ criadoPor: 'Pessoa B', criadoPorId: 'u9' }) }), false, 'arquivo de outra conta não');
});

test('cada salvar e cada mudança de ficha sobem o número de gravação', async () => {
  const banco = criarBanco({ backend: bancoNaMemoria() });
  const a = criarArquivo({ tipo: 'postits', autor: { id: ID_APARELHO, nome: 'Pessoa A' } });
  await banco.criar(a);
  const r = await banco.salvar(a);
  assert.equal(r.gravacao, 2);
  await banco.mudarFicha(a.ficha.id, { nome: 'Outro' });
  assert.equal((await banco.abrir(a.ficha.id)).ficha.gravacao, 3);
  /* outro banco (outra aba) lê a última do aparelho e continua dali */
  const outro = criarBanco({ backend: banco.backend });
  assert.equal((await outro.salvar((await outro.abrir(a.ficha.id)))).gravacao, 4);
});

test('modo aba: ?em=cwork ou página de fora no /efcwork/ do mesmo site; outro site ou sozinho não', () => {
  const loc = (h) => ({ href: h, origin: new URL(h).origin });
  assert.equal(dentroDoCwork(loc('https://eliasgrigori.github.io/EFCdocs/?em=cwork'), null), true);
  assert.equal(dentroDoCwork(loc('https://eliasgrigori.github.io/EFCdocs/'), null), false);
  const pai = { location: { origin: 'https://eliasgrigori.github.io', pathname: '/efcwork/' } };
  const win = { parent: pai };
  assert.equal(dentroDoCwork(loc('https://eliasgrigori.github.io/EFCdocs/'), win), true);
  const winOutro = { get parent() { return { get location() { throw new Error('SecurityError'); } }; } };
  assert.equal(dentroDoCwork(loc('https://eliasgrigori.github.io/EFCdocs/'), winOutro), false);
  const sozinho = {}; sozinho.parent = sozinho;
  assert.equal(dentroDoCwork(loc('https://eliasgrigori.github.io/EFCdocs/'), sozinho), false);
  assert.equal(dentroDoCwork(loc('https://eliasgrigori.github.io/EFCdocs/'), { parent: { location: { origin: 'https://eliasgrigori.github.io', pathname: '/EFC-Sabi--Quiz/' } } }), false);
});

test('nuvem (remoto falso): envia a fila, lembra a versão; sem internet espera; conflito vira cópia e nada se perde', async () => {
  const banco = criarBanco({ backend: bancoNaMemoria() });
  const remoto = remotoNaMemoria();
  const fila = criarFila();
  const a = criarArquivo({ tipo: 'postits', nome: 'Mapa', autor: { id: ID_APARELHO, nome: 'Pessoa A' } });
  await banco.criar(a); fila.por(a.ficha.id); fila.por(a.ficha.id);
  assert.equal(fila.tamanho, 1, 'o mesmo arquivo entra uma vez');
  let r = await enviarPendentes({ local: banco.backend, remoto, fila });
  assert.deepEqual(r.enviados, [a.ficha.id]); assert.equal(fila.tamanho, 0);
  assert.equal((await banco.abrir(a.ficha.id)).ficha.nuvem.versao, 1);
  /* sem internet: fica na fila */
  await banco.salvar(await banco.abrir(a.ficha.id)); fila.por(a.ficha.id); remoto.sairDoAr();
  r = await enviarPendentes({ local: banco.backend, remoto, fila });
  assert.equal(r.parou, 'sem internet'); assert.equal(fila.tamanho, 1);
  remoto.sairDoAr(false);
  r = await enviarPendentes({ local: banco.backend, remoto, fila });
  assert.equal((await banco.abrir(a.ficha.id)).ficha.nuvem.versao, 2);
  /* conflito: outra pessoa gravou a versão 3 na nuvem; este aparelho ainda acha que é a 2 */
  const daNuvem = await remoto.ler(a.ficha.id);
  await remoto.gravar({ ficha: { ...daNuvem.ficha, nome: 'Mapa (de outra pessoa)' }, pacote: daNuvem.pacote }, 2);
  const meu = await banco.abrir(a.ficha.id);
  await banco.salvar({ ...meu, conteudo: { ...meu.conteudo, marcaDoTeste: 'meu' } }); fila.por(a.ficha.id);
  r = await enviarPendentes({ local: banco.backend, remoto, fila, quem: 'Pessoa A', agora: '2026-11-26T09:00:00.000Z' });
  assert.equal(r.conflitos.length, 1);
  const copia = await banco.abrir(r.conflitos[0].copia);
  assert.equal(copia.ficha.nome, nomeCopiaEmConflito('Mapa', 'Pessoa A'));
  assert.equal(copia.conteudo.marcaDoTeste, 'meu', 'o que eu fiz está na cópia');
  const original = await banco.abrir(a.ficha.id);
  assert.equal(original.ficha.nome, 'Mapa (de outra pessoa)'); assert.equal(original.ficha.nuvem.versao, 3);
  assert.deepEqual(fila.lista(), [r.conflitos[0].copia], 'a cópia também vai para a nuvem');
  r = await enviarPendentes({ local: banco.backend, remoto, fila });
  assert.equal(remoto.tamanho(), 2);
});

test('revisor novo: gravação nunca volta para trás com duas abas; o salvar não apaga a versão da nuvem', async () => {
  const back = bancoNaMemoria();
  const A = criarBanco({ backend: back }), B = criarBanco({ backend: back });
  const a = criarArquivo({ tipo: 'postits', autor: { id: ID_APARELHO, nome: 'Pessoa A' } });
  await A.criar(a);
  const doB = await B.abrir(a.ficha.id); await B.salvar(doB); /* B sabe 2 */
  for (let i = 0; i < 4; i++) await A.salvar(await A.abrir(a.ficha.id)); /* A leva o aparelho a 6 */
  const r = await B.salvar(await B.abrir(a.ficha.id)); /* B pega de volta (relê) */
  assert.equal(r.gravacao, 7);
  await B.mudarFicha(a.ficha.id, { nome: 'Outro' });
  assert.equal((await A.abrir(a.ficha.id)).ficha.gravacao, 8);
  /* nuvem: depois de enviar, salvar com a ficha antiga (como o App faz) não apaga a versão conhecida */
  const remoto = remotoNaMemoria(); const fila = criarFila([a.ficha.id]);
  const velho = await A.abrir(a.ficha.id);
  await enviarPendentes({ local: back, remoto, fila, aoMarcar: A.lembrarNuvem });
  await A.salvar({ ...velho, conteudo: { ...velho.conteudo, x: 1 } }); fila.por(a.ficha.id);
  const r2 = await enviarPendentes({ local: back, remoto, fila, aoMarcar: A.lembrarNuvem });
  assert.equal(r2.conflitos.length, 0, 'conflito falso'); assert.equal(r2.enviados.length, 1);
});

test('revisor novo: salvar durante o envio não perde nada e o arquivo continua na fila; cópias de conflito têm id próprio', async () => {
  const banco = criarBanco({ backend: bancoNaMemoria() });
  const a = criarArquivo({ tipo: 'postits', nome: 'Mapa', autor: { id: ID_APARELHO, nome: 'Pessoa A' } });
  await banco.criar(a);
  const remoto = remotoNaMemoria(); const gravarDeVerdade = remoto.gravar;
  remoto.gravar = async (x, e) => { const atual = await banco.abrir(a.ficha.id); await banco.salvar({ ...atual, conteudo: { ...atual.conteudo, noMeio: 'sim' } }); return gravarDeVerdade(x, e); };
  const fila = criarFila([a.ficha.id]);
  await enviarPendentes({ local: banco.backend, remoto, fila, aoMarcar: banco.lembrarNuvem });
  assert.equal((await banco.abrir(a.ficha.id)).conteudo.noMeio, 'sim', 'o que foi salvo no meio sumiu');
  assert.deepEqual(fila.lista(), [a.ficha.id], 'devia continuar na fila');
  remoto.gravar = gravarDeVerdade;
  await enviarPendentes({ local: banco.backend, remoto, fila, aoMarcar: banco.lembrarNuvem });
  assert.equal(fila.tamanho, 0);
  /* dois conflitos no mesmo instante: duas cópias diferentes */
  const agora = '2026-11-26T10:00:00.000Z', copias = [];
  for (let k = 0; k < 2; k++) {
    const n = await remoto.ler(a.ficha.id); await remoto.gravar({ ficha: n.ficha, pacote: n.pacote }, n.versao);
    const meu = await banco.abrir(a.ficha.id);
    await banco.backend.por({ ...(await banco.backend.um(a.ficha.id)), ficha: { ...meu.ficha, nuvem: { versao: 1, em: agora } } });
    fila.por(a.ficha.id);
    const r = await enviarPendentes({ local: banco.backend, remoto, fila: criarFila([a.ficha.id]), agora });
    copias.push(r.conflitos[0].copia);
  }
  assert.notEqual(copias[0], copias[1]);
});
