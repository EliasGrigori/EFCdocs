/* v0.6.73 (P2 do plano "Vértice como aba do Cwork"): login do Cwork pela interface combinada, perfil do cadastro e a trava
   "só dentro do Cwork". Falha na v0.6.72 (não existia). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { perfilDoCwork, lerLogin, ponteDoCwork, situacaoDoAcesso, aoMudarLogin } from '../../src/nucleo/loginCwork.js';
import { quemSou, definirLogin, nomeDoAparelho, ehDono, ID_APARELHO, loginDoCwork } from '../../src/nucleo/quem.js';

const janela = (usuario) => { const pai = { CworkPonteVertice: { versao: 1, usuario: () => usuario }, ouv: {}, addEventListener(n, f) { this.ouv[n] = f; }, removeEventListener(n) { delete this.ouv[n]; } }; return { parent: pai }; };

test('perfil do Cwork vira perfil do Vértice', () => {
  assert.equal(perfilDoCwork({ perfil: 'principal' }), 'admin');
  assert.equal(perfilDoCwork({ perfil: 'principal_temp' }), 'admin');
  assert.equal(perfilDoCwork({ perfil: 'secundario', estrela: true }), 'editor');
  assert.equal(perfilDoCwork({ perfil: 'secundario' }), 'operador');
  assert.equal(perfilDoCwork({ perfil: 'visitante' }), 'leitor');
  assert.equal(perfilDoCwork(null), 'leitor');
  assert.equal(perfilDoCwork({ perfil: 'visitante', estrela: true }), 'leitor', 'Visitante só lê, mesmo com estrela');
  assert.equal(perfilDoCwork({ perfil: 'bloqueado' }), 'leitor', 'perfil desconhecido: o mais seguro');
  assert.equal(perfilDoCwork({}), 'leitor');
});

test('lê quem entrou pela interface do Cwork; sem interface, sem login ou com erro dá null', () => {
  const l = lerLogin(janela({ uid: 'u-c', nome: ' Pessoa C ', perfil: 'secundario', estrela: true }));
  assert.deepEqual(l, { uid: 'u-c', nome: 'Pessoa C', perfil: 'editor', perfilCwork: 'secundario', estrela: true, contaTeste: false });
  assert.equal(lerLogin(janela(null)), null);
  assert.equal(lerLogin({ parent: {} }), null);
  const sozinho = {}; sozinho.parent = sozinho; assert.equal(lerLogin(sozinho), null);
  assert.equal(lerLogin({ get parent() { return { get CworkPonteVertice() { throw new Error('SecurityError'); } }; } }), null);
  assert.equal(lerLogin({ parent: { CworkPonteVertice: { versao: 1, usuario: () => { throw new Error('quebrou'); } } } }), null);
  assert.equal(ponteDoCwork({ parent: { CworkPonteVertice: { versao: 0, usuario: () => null } } }), null, 'versão 0 não vale');
});

test('situação do acesso: logado, saiu, Cwork antigo, fora do Cwork no site publicado e no servidor de testes', () => {
  const loc = (h) => ({ href: h });
  const p = { versao: 1, usuario: () => null };
  assert.equal(situacaoDoAcesso({ dentro: true, ponte: p, login: { uid: 'x' } }), 'cwork');
  assert.equal(situacaoDoAcesso({ dentro: true, ponte: p, login: null }), 'sair');
  assert.equal(situacaoDoAcesso({ dentro: true, ponte: null, login: null, loc: loc('https://eliasgrigori.github.io/EFCdocs/') }), 'aparelho');
  assert.equal(situacaoDoAcesso({ dentro: false, ponte: null, login: null, loc: loc('https://eliasgrigori.github.io/EFCdocs/') }), 'trava');
  assert.equal(situacaoDoAcesso({ dentro: false, ponte: null, login: null, loc: loc('http://localhost:8080/') }), 'aparelho');
  assert.equal(situacaoDoAcesso({ dentro: false, ponte: null, login: null, loc: loc('http://localhost:8080/?trava=1') }), 'trava');
});

test('logado: "quem sou" é a conta, o nome do comentário é o do cadastro e não se digita; dono por código', () => {
  definirLogin({ uid: 'u-c', nome: 'Pessoa C', perfil: 'admin' });
  try {
    assert.deepEqual(quemSou({ perfil: 'leitor' }).id, 'u-c');
    assert.equal(nomeDoAparelho(), 'Pessoa C');
    assert.equal(loginDoCwork().uid, 'u-c');
    const q = quemSou();
    assert.equal(ehDono({ criadoPor: 'neste aparelho' }, q), true, 'arquivo de antes do login: de quem usa o aparelho');
    assert.equal(ehDono({ criadoPorId: ID_APARELHO, criadoPor: 'Pessoa A' }, q), true);
    assert.equal(ehDono({ criadoPorId: 'u-c', criadoPor: 'Pessoa C' }, q), true);
    assert.equal(ehDono({ criadoPorId: 'u-d', criadoPor: 'Pessoa D' }, q), false);
    definirLogin({ uid: 'u-e', nome: '', perfil: 'operador' });
    assert.equal(quemSou().nome, 'Conta do Cwork', 'conta sem nome não grava o código como nome');
  } finally { definirLogin(null); }
  assert.equal(quemSou().id, ID_APARELHO, 'saiu: volta para o aparelho');
});

test('escuta a troca de conta no Cwork e para de escutar', () => {
  const w = janela(null); let n = 0;
  const parar = aoMudarLogin(() => n++, w);
  w.parent.ouv['cwork:usuario']();
  assert.equal(n, 1);
  parar(); assert.equal(w.parent.ouv['cwork:usuario'], undefined);
});

test('o ?em=cwork digitado no endereço não abre a trava (só a moldura de verdade conta)', async () => {
  const { molduraDoCwork, dentroDoCwork } = await import('../../src/nucleo/emCwork.js');
  const loc = { href: 'https://eliasgrigori.github.io/EFCdocs/?em=cwork', origin: 'https://eliasgrigori.github.io' };
  const sozinho = {}; sozinho.parent = sozinho;
  assert.equal(dentroDoCwork(loc, sozinho), true, 'o modo aba liga (visual)');
  assert.equal(molduraDoCwork(loc, sozinho), false, 'mas não conta como dentro do Cwork');
  assert.equal(situacaoDoAcesso({ dentro: molduraDoCwork(loc, sozinho), ponte: null, login: null, loc }), 'trava');
  const pai = { location: { origin: 'https://eliasgrigori.github.io', pathname: '/efcwork/' } };
  assert.equal(molduraDoCwork(loc, { parent: pai }), true);
});
