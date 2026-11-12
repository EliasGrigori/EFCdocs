/* Vértice Docs — ritmo do trabalho pesado (v0.6.12, D-16): o que custa o tamanho do arquivo não roda a cada tecla.
   A regra é medir: enquanto a tarefa é rápida, ela roda na hora (arquivo pequeno fica como sempre foi);
   quando passa a prender a tela, espera a pessoa parar de digitar. */

/** Quanto esperar (ms) antes de gravar no aparelho, pelo tempo que a última gravação prendeu a tela. */
export const esperaDeGravar = (custoMs) => (!(custoMs > 16) ? 0 : Math.min(2500, Math.max(400, Math.round(custoMs * 4))));

/** Quanto esperar (ms) antes de refazer a lista de problemas da planilha, pelo tempo que a última levou. */
export const esperaDeConferir = (custoMs) => (!(custoMs > 20) ? 250 : Math.min(4000, Math.max(800, Math.round(custoMs * 12))));
