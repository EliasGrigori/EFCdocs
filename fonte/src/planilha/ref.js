/* EFCdocs — Planilha: endereços de célula (A1), do tamanho do Excel.
   Linhas e colunas internas começam em 0; o que aparece para a pessoa começa em 1 (A1). */

export const MAX_LIN = 1048576; // Excel: 1.048.576 linhas
export const MAX_COL = 16384; // Excel: 16.384 colunas (até XFD)

const cacheLetra = [];
/** 0 → A, 25 → Z, 26 → AA, 16383 → XFD */
export function letraCol(c) {
  if (c < 702 && cacheLetra[c]) return cacheLetra[c];
  let n = c + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  if (c < 702) cacheLetra[c] = s;
  return s;
}

/** A → 0, XFD → 16383; -1 se não for coluna válida */
export function numCol(letras) {
  const t = String(letras).toUpperCase();
  if (!/^[A-Z]{1,3}$/.test(t)) return -1;
  let n = 0;
  for (const ch of t) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1 < MAX_COL ? n - 1 : -1;
}

/** chave guardada no arquivo: "B12" */
export const chave = (l, c) => letraCol(c) + (l + 1);

const RX_CEL = /^\$?([A-Za-z]{1,3})\$?(\d{1,7})$/;
/** "B12" → { l: 11, c: 1 }; null se inválida */
export function lerChave(k) {
  const m = RX_CEL.exec(k);
  if (!m) return null;
  const c = numCol(m[1]);
  const l = Number(m[2]) - 1;
  if (c < 0 || l < 0 || l >= MAX_LIN) return null;
  return { l, c };
}

export const ehEnderecoCelula = (t) => !!lerChave(t);

/** Texto de uma faixa: A1, A1:B3 */
export function textoFaixa(f) {
  const a = chave(f.l1, f.c1);
  return f.l1 === f.l2 && f.c1 === f.c2 ? a : a + ':' + chave(f.l2, f.c2);
}

export const normalFaixa = (f) => ({
  l1: Math.min(f.l1, f.l2), c1: Math.min(f.c1, f.c2), l2: Math.max(f.l1, f.l2), c2: Math.max(f.c1, f.c2),
});

export const dentro = (f, l, c) => l >= f.l1 && l <= f.l2 && c >= f.c1 && c <= f.c2;

/** Nome de aba numa fórmula: entre aspas simples se tiver espaço ou sinal. */
export function nomeAbaNaFormula(nome) {
  if (/^[A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ0-9_.]*$/.test(nome) && !lerChave(nome) && !/^R\d*C\d*$/i.test(nome)) return nome;
  return "'" + String(nome).replace(/'/g, "''") + "'";
}

/** Lê "Planilha2!B3:C4" (sem $ e com aba opcional) — usado pelo "Ir para". */
export function lerEndereco(texto) {
  const t = String(texto || '').trim();
  const m = /^(?:'((?:[^']|'')+)'|([^!:'"]+))!(.+)$/.exec(t);
  const aba = m ? (m[1] != null ? m[1].replace(/''/g, "'") : m[2]) : null;
  const resto = m ? m[3] : t;
  const p = resto.split(':');
  if (p.length > 2) return null;
  const a = lerChave(p[0].replace(/\$/g, ''));
  const b = p[1] ? lerChave(p[1].replace(/\$/g, '')) : a;
  if (!a || !b) return null;
  return { aba, ...normalFaixa({ l1: a.l, c1: a.c, l2: b.l, c2: b.c }) };
}
