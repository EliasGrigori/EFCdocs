/* Vértice Docs v0.6.61 (V56-03) — coluna inserida no meio de uma tabela com títulos ganha um título único (Coluna1, Coluna2...),
   como no Excel; sem ele a tabela saía como faixa normal ao salvar. Saiu de operacoes.js para ele ficar abaixo de 800 linhas. */
import { chave } from './ref.js';

/** Escreve os títulos em cel (o objeto de células já movidas), na linha l1, nas colunas i até i+k-1 da tabela que vai de na a nb. */
export function titularColunasNovas(cel, l1, na, nb, i, k) {
  const usados = new Set();
  for (let j = na; j <= nb; j++) { const x = cel[chave(l1, j)]; if (x && x.v != null && x.v !== '') usados.add(String(x.v).toLowerCase()); }
  let n0 = 1;
  for (let j = i; j < i + k; j++) {
    while (usados.has(('Coluna' + n0).toLowerCase())) n0++;
    const nome = 'Coluna' + n0; usados.add(nome.toLowerCase());
    cel[chave(l1, j)] = { ...(cel[chave(l1, j)] || {}), v: nome };
  }
}
