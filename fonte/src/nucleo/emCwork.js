/* Vértice Docs · modo aba (P1 do plano "Vértice como aba do Cwork", aprovada em 26/11 05:20).
   O Elias vai usar o Vértice só dentro do Cwork, numa aba. Quando o Vértice está dentro do Cwork:
   - <html> ganha a classe "em-cwork": o menu do Vértice esconde a marca (logo e nome) e o cartão "Neste aparelho / Perfil de
     teste", que o Cwork já mostra na barra dele; o resto do menu (Novo, arquivos, lixeira) continua.
   - O Vértice avisa o Cwork (postMessage, mesmo endereço) quando está pronto e qual arquivo está aberto, para a aba mostrar o
     nome. Mensagens: { de: 'vertice', tipo: 'pronto', versao } e { de: 'vertice', tipo: 'arquivo', nome, tipoArquivo }.
   Como saber que está dentro: endereço com ?em=cwork (o Cwork vai abrir assim na P3) ou a página de fora ser do mesmo site e
   estar em /efcwork/. Ainda NÃO trava o uso fora do Cwork: isso entra com o login (P2), para não deixar o Elias sem acesso.
   Parte sem tela (testada no node). */

/** O Vértice está dentro do Cwork? (loc e win podem ser trocados no teste) */
export function dentroDoCwork(loc = typeof location !== 'undefined' ? location : null, win = typeof window !== 'undefined' ? window : null) {
  try { if (loc && new URL(loc.href).searchParams.get('em') === 'cwork') return true; } catch { /* endereço estranho: segue */ }
  try {
    if (win && win.parent && win.parent !== win) {
      const p = win.parent.location; /* outro site dá erro de segurança aqui: não é o Cwork */
      return !!loc && p.origin === loc.origin && /\/efcwork(\/|$)/i.test(p.pathname);
    }
  } catch { return false; }
  return false;
}

/** Liga a classe do modo aba no <html>. Devolve se está dentro. */
export function ligarModoAba(doc = typeof document !== 'undefined' ? document : null, dentro = dentroDoCwork()) {
  if (doc && doc.documentElement) doc.documentElement.classList.toggle('em-cwork', !!dentro);
  return !!dentro;
}

/** Manda um aviso para o Cwork (só quando está dentro dele e no mesmo endereço). */
export function avisarCwork(msg, win = typeof window !== 'undefined' ? window : null) {
  try {
    if (!win || !win.parent || win.parent === win || !dentroDoCwork(win.location, win)) return false;
    win.parent.postMessage({ de: 'vertice', ...msg }, win.location.origin);
    return true;
  } catch { return false; }
}
