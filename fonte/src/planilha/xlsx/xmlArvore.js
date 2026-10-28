/* EFCdocs v0.6.1 — XML pequeno → árvore (para o XML dos gráficos, que tem a mesma tag dentro dela mesma).
   Os nomes ficam sem o prefixo (c:ser → ser, a:solidFill → solidFill); os atributos também (r:id → id).
   Partes que não interessam ao desenho saem antes: mc:AlternateContent (fica o Fallback) e as extensões (extLst). */
import { desescapar } from './xml.js';

const semPrefixo = (n) => { const i = n.indexOf(':'); return i >= 0 ? n.slice(i + 1) : n; };

function attrs(s) {
  const o = {};
  if (!s) return o;
  const rx = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m;
  while ((m = rx.exec(s))) {
    if (m[1].startsWith('xmlns')) continue;
    const v = m[2] !== undefined ? m[2] : m[3];
    o[semPrefixo(m[1])] = v.indexOf('&') >= 0 ? desescapar(v) : v;
  }
  return o;
}

/** Tira o que atrapalha: comentários, cabeçalho, AlternateContent (fica o Fallback) e extLst. */
export function limparXml(xml) {
  let s = String(xml || '');
  s = s.replace(/<\?[\s\S]*?\?>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<(\w+:)?AlternateContent\b[\s\S]*?<\/(\w+:)?AlternateContent>/g, (b) => { const f = /<(?:\w+:)?Fallback\b[^>]*>([\s\S]*?)<\/(?:\w+:)?Fallback>/.exec(b); return f ? f[1] : ''; });
  /* extLst pode ter extLst dentro: tira do mais de dentro para fora */
  for (let i = 0; i < 4 && /<(\w+:)?extLst\b/.test(s); i++) s = s.replace(/<(\w+:)?extLst\b[^>]*>(?:(?!<(?:\w+:)?extLst\b)[\s\S])*?<\/(\w+:)?extLst>/g, '').replace(/<(\w+:)?extLst\b[^>]*\/>/g, '');
  return s;
}

/** Árvore: { n, a, k:[filhos], t:texto } */
export function arvore(xml) {
  const s = limparXml(xml);
  const raiz = { n: '#', a: {}, k: [], t: '' };
  const pilha = [raiz];
  const rx = /<(\/?)([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = rx.exec(s))) {
    const topo = pilha[pilha.length - 1];
    if (m[5] != null) { if (m[5].trim() || topo.n === 't' || topo.n === 'v') topo.t += desescapar(m[5]); continue; }
    const nome = semPrefixo(m[2]);
    if (m[1]) { // fecha
      for (let i = pilha.length - 1; i > 0; i--) if (pilha[i].n === nome) { pilha.length = i; break; }
      continue;
    }
    const no = { n: nome, a: attrs(m[3]), k: [], t: '' };
    topo.k.push(no);
    if (!m[4]) pilha.push(no);
  }
  return raiz.k[0] || raiz;
}

export const filhos = (no, nome) => (no ? no.k.filter((x) => x.n === nome) : []);
export const filho = (no, nome) => (no ? no.k.find((x) => x.n === nome) || null : null);
/** Caminho 'a/b/c' (só filhos diretos). */
export function em(no, caminho) {
  let x = no;
  for (const p of caminho.split('/')) { x = filho(x, p); if (!x) return null; }
  return x;
}
/** Valor do atributo val de um filho (ou de um caminho). */
export function val(no, caminho, padrao = undefined) {
  const x = em(no, caminho);
  return x && x.a.val !== undefined ? x.a.val : padrao;
}
export const valNum = (no, caminho, padrao = undefined) => { const v = val(no, caminho); const n = v === undefined ? NaN : parseFloat(v); return Number.isFinite(n) ? n : padrao; };
export const valBool = (no, caminho, padrao = undefined) => { const x = em(no, caminho); if (!x) return padrao; const v = x.a.val; return v === undefined ? true : v === '1' || v === 'true'; };
/** Todos os descendentes com o nome. */
export function busca(no, nome, out = []) {
  if (!no) return out;
  for (const x of no.k) { if (x.n === nome) out.push(x); busca(x, nome, out); }
  return out;
}
/** Texto de todos os <a:t> de dentro (títulos, rótulos). */
export const textoDe = (no) => busca(no, 't').map((x) => x.t).join('');
