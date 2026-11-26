/* Vértice Docs · quem está usando (P1 do plano "Vértice como aba do Cwork", aprovada em 26/11 05:20).
   Um lugar só para responder "quem sou": a ficha do arquivo (criado e alterado por), os comentários, quem iniciou,
   quem concluiu e o histórico do cartão perguntam aqui.
   - Hoje (sem login): id = "neste aparelho" (o mesmo de sempre, então as permissões dos arquivos antigos não mudam) e o nome
     é o que a pessoa digitou nos comentários deste aparelho (localStorage "efcdocs.autor"); sem ele, o nome do perfil.
   - Na P2 (login do Cwork): id = conta do Firebase e nome/perfil = cadastro de Pessoas do Cwork; basta passar o login aqui.
   Parte sem tela (testada no node). */

export const ID_APARELHO = 'neste aparelho';
const CHAVE_NOME = 'efcdocs.autor';
/* v0.6.73 (P2): quem entrou no Cwork (nucleo/loginCwork.js). O App avisa aqui; todo mundo que pergunta "quem sou" já recebe a conta. */
let loginAtual = null;
export const definirLogin = (l) => { loginAtual = l && l.uid ? l : null; };
export const loginDoCwork = () => loginAtual;

/** O nome digitado neste aparelho (comentários). */
export function nomeDoAparelho() {
  if (loginAtual) return loginAtual.nome || 'Conta do Cwork'; /* v0.6.73: logado pelo Cwork, o nome é o do cadastro */
  try { return String(localStorage.getItem(CHAVE_NOME) || '').trim().slice(0, 60); } catch { return ''; }
}
export function guardarNomeDoAparelho(nome) {
  if (loginAtual) return; /* logado: o nome não é digitado */
  try { const n = String(nome || '').trim().slice(0, 60); if (n) localStorage.setItem(CHAVE_NOME, n); } catch { /* sem armazenamento: só não guarda */ }
}

/** Quem sou: { id, nome, perfil, origem }. login = { uid, nome, perfil } quando vier do Cwork (P2). */
export function quemSou({ perfil = '', perfilNome = '' } = {}, login = loginAtual) {
  if (login && login.uid) return { id: String(login.uid), nome: String(login.nome || '').slice(0, 80) || 'Conta do Cwork', perfil: login.perfil || perfil, origem: 'cwork' };
  return { id: ID_APARELHO, nome: nomeDoAparelho() || String(perfilNome || '').trim(), perfil, origem: 'aparelho' };
}

/** O nome que vai para o que fica gravado (nunca vazio). */
export const nomeGravado = (q) => String((q && q.nome) || (q && q.id) || ID_APARELHO).slice(0, 80);

/** Aceita o jeito antigo (texto) e o novo ({ id, nome }): devolve { id, nome } para gravar na ficha. */
export function autorDaFicha(autor) {
  if (autor && typeof autor === 'object') return { id: String(autor.id || ID_APARELHO).slice(0, 128), nome: nomeGravado(autor) };
  const t = String(autor || ID_APARELHO).slice(0, 80);
  return { id: ID_APARELHO, nome: t };
}

/** Quem criou o arquivo, para a permissão "só o dono": o id novo ou, nos arquivos antigos, o texto de antes. */
export const donoDaFicha = (f) => (f && (f.criadoPorId || f.criadoPor)) || ID_APARELHO;
/** v0.6.73 (P2): arquivo de "neste aparelho" (antes do login) é de quem está usando este aparelho; o resto, do código gravado. */
export const ehDono = (f, q) => { const d = donoDaFicha(f); return d === ID_APARELHO || d === (q && q.id); };
