/* EFCdocs — guarda pequenas preferências no aparelho (localStorage).
   Chaves sempre com prefixo "efcdocs:" (ou "efcdocs-demo:" no modo demonstração),
   para nunca misturar com o EFClaudian ou o EFCquiz, que dividem o mesmo site. */

export const PREFIXO = 'efcdocs:';
export const PREFIXO_DEMO = 'efcdocs-demo:';

/** Modo demonstração: endereço com ?demo=1 */
export function ehDemo(url) {
  try {
    return new URL(url || (typeof location !== 'undefined' ? location.href : 'http://x/')).searchParams.get('demo') === '1';
  } catch {
    return false;
  }
}

export function chave(nome, demo) {
  return ((demo === undefined ? ehDemo() : demo) ? PREFIXO_DEMO : PREFIXO) + nome;
}

function armazemPadrao(armazem) {
  if (armazem) return armazem;
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function ler(nome, padrao, opcoes = {}) {
  try {
    const a = armazemPadrao(opcoes.armazem);
    if (!a) return padrao;
    const v = a.getItem(chave(nome, opcoes.demo));
    return v === null ? padrao : JSON.parse(v);
  } catch {
    return padrao;
  }
}

export function gravar(nome, valor, opcoes = {}) {
  try {
    const a = armazemPadrao(opcoes.armazem);
    if (!a) return false;
    a.setItem(chave(nome, opcoes.demo), JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}
