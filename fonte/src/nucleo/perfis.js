/* EFCdocs — perfis (do cadastro do EFClaudian) e o que cada um pode fazer.
   1 = pode; 0 = não pode; "dono" = só no que ele mesmo criou.
   A mesma tabela vira regra do Firestore na v0.9.0 (o app nunca confia só na tela). */

export const PERFIS = {
  admin: { nome: 'Admin', cadastro: 'Principal' },
  editor: { nome: 'Editor', cadastro: 'Estrela' },
  operador: { nome: 'Operador', cadastro: 'Secundário' },
  leitor: { nome: 'Leitor', cadastro: 'Visitante' },
};

export const MATRIZ = {
  ver: { admin: 1, editor: 1, operador: 1, leitor: 1 },
  exportar: { admin: 1, editor: 1, operador: 1, leitor: 1 },
  'arquivo.criar': { admin: 1, editor: 1, operador: 1, leitor: 0 },
  'arquivo.renomear': { admin: 1, editor: 1, operador: 'dono', leitor: 0 },
  'arquivo.lixeira': { admin: 1, editor: 1, operador: 'dono', leitor: 0 },
  'arquivo.restaurar': { admin: 1, editor: 1, operador: 'dono', leitor: 0 },
  'arquivo.excluirDeVez': { admin: 1, editor: 'dono', operador: 0, leitor: 0 },
  preencher: { admin: 1, editor: 1, operador: 1, leitor: 0 },
  lancar: { admin: 1, editor: 1, operador: 1, leitor: 0 },
  editarTexto: { admin: 1, editor: 1, operador: 0, leitor: 0 },
  /* v0.3.0: mexer no quadro (post-its, setas, colunas). Operador também mexe: quadro é de reunião. */
  'quadro.editar': { admin: 1, editor: 1, operador: 1, leitor: 0 },
  'pasta.criar': { admin: 1, editor: 1, operador: 0, leitor: 0 },
  'pasta.excluir': { admin: 1, editor: 1, operador: 0, leitor: 0 },
  'pasta.arquivar': { admin: 1, editor: 1, operador: 0, leitor: 0 },
  'revisao.concluir': { admin: 1, editor: 1, operador: 0, leitor: 0 },
  'revisao.aprovar': { admin: 1, editor: 0, operador: 0, leitor: 0 },
  'externo.importar': { admin: 1, editor: 1, operador: 0, leitor: 0 },
  'lancamento.cancelar': { admin: 1, editor: 'dono', operador: 0, leitor: 0 },
  'perfis.gerenciar': { admin: 1, editor: 0, operador: 0, leitor: 0 },
};

export function pode(perfil, acao, contexto = {}) {
  const linha = MATRIZ[acao];
  if (!linha) return false;
  const v = linha[perfil];
  if (v === 'dono') return !!contexto.usuario && contexto.usuario === contexto.criadoPor;
  return v === 1;
}

export const SEM_PERMISSAO = 'Seu perfil não permite esta ação.';
