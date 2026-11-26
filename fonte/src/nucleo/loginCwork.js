/* Vértice Docs · login do Cwork (P2 do plano "Vértice como aba do Cwork", aprovada em 26/11 06:02).
   O Vértice não carrega o Firebase nem guarda chave nenhuma: dentro do Cwork (mesmo site), ele pergunta ao Cwork quem
   está logado, pela interface combinada no pedido P3 (PEDIDO-P3-PARA-A-CONVERSA-DO-CWORK.md):
     window.CworkPonteVertice = { versao: 1, usuario() → { uid, nome, perfil, estrela, contaTeste } | null, pastas() }
     e o evento 'cwork:usuario' na janela do Cwork quando entra, sai ou muda o cadastro.
   - Perfil do Cwork → perfil do Vértice: Principal (e temporário) = Admin; líder ★ = Editor; Secundário = Operador;
     Visitante = Leitor.
   - Só dentro do Cwork (decisão do Elias): no endereço publicado, fora do Cwork, o Vértice mostra "Abra pelo Cwork".
     No servidor de testes (outro endereço) não trava, a não ser com ?trava=1 (para conferir a tela).
   - Cwork sem a interface (antes da P3): o Vértice segue como hoje ("neste aparelho"), sem travar.
   Parte sem tela (testada no node). */

export const ENDERECO_CWORK = 'https://eliasgrigori.github.io/efcwork/';
export const SITE_PUBLICADO = 'eliasgrigori.github.io';

/** Perfil do Vértice para o cadastro do Cwork. */
export function perfilDoCwork(u) {
  if (!u) return 'leitor';
  const p = String(u.perfil || '');
  if (p === 'principal' || p === 'principal_temp') return 'admin';
  if (p === 'visitante') return 'leitor'; /* Visitante só lê, mesmo com estrela */
  if (p !== 'secundario') return 'leitor'; /* perfil que o Vértice não conhece: o mais seguro */
  return u.estrela ? 'editor' : 'operador';
}

/** A interface do Cwork, se o Vértice estiver dentro dele (mesmo site). */
export function ponteDoCwork(win = typeof window !== 'undefined' ? window : null) {
  try {
    if (!win || !win.parent || win.parent === win) return null;
    const p = win.parent.CworkPonteVertice; /* outro site dá erro de segurança aqui */
    return p && p.versao >= 1 && typeof p.usuario === 'function' ? p : null;
  } catch { return null; }
}

/** Quem está logado no Cwork: { uid, nome, perfil (do Vértice), perfilCwork, estrela, contaTeste } ou null. */
export function lerLogin(win) {
  const p = ponteDoCwork(win);
  if (!p) return null;
  try {
    const u = p.usuario();
    if (!u || !u.uid) return null;
    return { uid: String(u.uid).slice(0, 128), nome: String(u.nome || '').trim().slice(0, 80), perfil: perfilDoCwork(u), perfilCwork: String(u.perfil || ''), estrela: !!u.estrela, contaTeste: !!u.contaTeste };
  } catch { return null; }
}

/** Situação do acesso: 'cwork' (logado pelo Cwork) · 'sair' (dentro do Cwork, mas ninguém logado) · 'aparelho' (como antes) · 'trava' (fora do Cwork, no endereço publicado). */
export function situacaoDoAcesso({ dentro, ponte, login, loc = typeof location !== 'undefined' ? location : null }) {
  if (ponte) return login ? 'cwork' : 'sair';
  if (dentro) return 'aparelho'; /* Cwork de antes da P3 */
  let forcar = false, publicado = false;
  try { const u = new URL(loc.href); forcar = u.searchParams.get('trava') === '1'; publicado = u.hostname === SITE_PUBLICADO; } catch { /* sem endereço: não trava */ }
  return forcar || publicado ? 'trava' : 'aparelho';
}

/** Escuta as mudanças de login no Cwork. Devolve a função que para de escutar. */
export function aoMudarLogin(fazer, win = typeof window !== 'undefined' ? window : null) {
  try {
    const alvo = win.parent;
    if (!alvo || alvo === win) return () => {};
    alvo.addEventListener('cwork:usuario', fazer);
    const parar = () => { try { alvo.removeEventListener('cwork:usuario', fazer); } catch { /* a página de fora foi embora */ } };
    try { win.addEventListener('pagehide', parar, { once: true }); } catch { /* sem pagehide: só no desligar */ } /* a moldura recarregou: não deixa ouvinte morto no Cwork */
    return parar;
  } catch { return () => {}; }
}
