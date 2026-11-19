/* Vértice Docs — v0.6.29 (D17, aprovada pelo Elias em 18/11): curtose e assimetria, como no Excel.
   Ficam fora de funcoes.js (arquivo grande que não pode crescer); entram no IMPL pela última linha dele.
   Recebem os auxiliares de funcoes.js para juntar os números do mesmo jeito que DESVPAD.A (texto e vazio ficam de fora). */

/** Média e desvio padrão (amostra ou população) de uma lista de números. */
function momentos(xs, amostra) {
  const n = xs.length, m = xs.reduce((s, x) => s + x, 0) / n;
  const q = xs.reduce((s, x) => s + (x - m) ** 2, 0);
  return { n, m, dp: Math.sqrt(q / (amostra ? n - 1 : n)) };
}

export const estatisticasExtras = ({ numeros, ehErro, E }) => ({
  /** CURT (KURT): curtose da amostra; precisa de 4 números e de variação (senão #DIV/0!). */
  KURT: (args, ctx) => {
    const xs = numeros(args, ctx); if (ehErro(xs)) return xs;
    if (xs.length < 4) return E.DIV0;
    const { n, m, dp } = momentos(xs, true); if (!dp) return E.DIV0;
    const s4 = xs.reduce((s, x) => s + ((x - m) / dp) ** 4, 0);
    return (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3)) * s4 - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
  },
  /** DISTORÇÃO (SKEW): assimetria da amostra; precisa de 3 números e de variação. */
  SKEW: (args, ctx) => {
    const xs = numeros(args, ctx); if (ehErro(xs)) return xs;
    if (xs.length < 3) return E.DIV0;
    const { n, m, dp } = momentos(xs, true); if (!dp) return E.DIV0;
    return n / ((n - 1) * (n - 2)) * xs.reduce((s, x) => s + ((x - m) / dp) ** 3, 0);
  },
  /** DISTORÇÃO.P (SKEW.P): assimetria da população inteira. */
  'SKEW.P': (args, ctx) => {
    const xs = numeros(args, ctx); if (ehErro(xs)) return xs;
    if (!xs.length) return E.DIV0;
    const { n, m, dp } = momentos(xs, false); if (!dp) return E.DIV0;
    return xs.reduce((s, x) => s + ((x - m) / dp) ** 3, 0) / n;
  },
});
