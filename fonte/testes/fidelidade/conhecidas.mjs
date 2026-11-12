/* Diferenças JÁ CONHECIDAS da rede de fidelidade (v0.6.10). Cada uma tem o número do defeito (D-) ou do limite (L-)
   da MEMORIA-DO-PROJETO.md. Diferença nova, que não está aqui, faz o teste falhar: ou é defeito novo (anotar na
   memória e aqui), ou é piora (consertar). Quando um defeito for corrigido, APAGAR a linha dele: o teste passa a
   cobrar que a diferença não volte. Regra "não pode piorar" do Método Sabiá 2.0. */

/** fonte: 'idaVolta' (EFCdocs lê → grava → lê), 'openpyxl' (estrutura e estilo) ou 'libreoffice' (recálculo).
 *  grupo: expressão que casa com o nome do grupo da diferença. */
export const CONHECIDAS = {
  'amostra-anonimizar.xlsx': [
    { fonte: 'idaVolta', grupo: / · v \(número virou o mesmo texto\)$/, id: 'L-08', motivo: 'título numérico de tabela (2024) volta como texto "2024", como o Excel grava (era o D-20)' },
    { fonte: 'openpyxl', grupo: /^número virou o mesmo texto$/, id: 'L-08', motivo: 'título numérico de tabela volta como texto, como o Excel grava' },
    { fonte: 'openpyxl', grupo: /^fórmula: referência de tabela virou endereço$/, id: 'L-02', motivo: 'o motor trabalha com endereços; a conta é a mesma' },
  ],
  'amostra-v068.xlsx': [
    { fonte: 'idaVolta', grupo: /^AUX VEL · v$/, id: 'A-01', motivo: 'o gerador da amostra gravou de propósito um valor guardado errado (2) em C8; o EFCdocs calcula 9 e o LibreOffice confirma 9' },
  ],
  'amostra-qualidade.xlsx': [
    { fonte: 'openpyxl', grupo: /^fórmula de folga cortada$/, id: 'L-04', motivo: 'fórmulas que dão vazio depois do último dado: ficam 1.000 linhas de folga (aviso ao abrir)' },
    { fonte: 'openpyxl', grupo: /^fórmula: referência de tabela virou endereço$/, id: 'L-02', motivo: 'o motor trabalha com endereços; a conta é a mesma' },
  ],
  /* inventada para reproduzir os achados da planilha anonimizada (gerar-amostra-v0610.py) */
  'amostra-v0610.xlsx': [
    { fonte: 'idaVolta', grupo: / · v \(número virou o mesmo texto\)$/, id: 'L-08', motivo: 'títulos 2024 e 2025 da TabAnos voltam como texto, como o Excel grava (era o D-20)' },
    { fonte: 'openpyxl', grupo: /^número virou o mesmo texto$/, id: 'L-08', motivo: 'títulos numéricos da TabAnos voltam como texto' },
  ],
  /* cópia anonimizada da planilha antiga do Elias, revisada e liberada por ele para o repositório (A03 da v0.6.10).
     Sem gerador: foi feita com ferramentas/anonimizar a partir do arquivo real, que nunca entra no projeto. */
  'amostra-real-anonimizada.xlsx': [
    { fonte: 'libreoffice', grupo: /SUBTOTAL/, id: 'L-09', motivo: 'o LibreOffice calcula o SUBTOTAL da aba de resumo diferente no arquivo salvo, com filtro, linhas ocultas e fórmula iguais ao original (D-24 corrigido); no Excel falta provar' },
    { fonte: 'openpyxl', grupo: /^fórmula: referência de tabela virou endereço$/, id: 'L-02', motivo: 'o motor trabalha com endereços; a conta é a mesma' },
    { fonte: 'openpyxl', grupo: /^texto: quebra de linha do Windows/, id: 'L-05', motivo: 'quebra de linha \\r\\n vira \\n; na tela é igual' },
    { fonte: 'openpyxl', grupo: /^posição da rolagem ao abrir/, id: 'L-06', motivo: 'o congelamento volta igual; a planilha abre no começo' },
  ],
  /* gerada por gerar-amostras-auditoria.py (não vai para o repositório: 2,5 MB) */
  'amostra-grande.xlsx': [
    { fonte: 'openpyxl', grupo: /^linha depois do corte/, id: 'L-07', motivo: 'limite de 300.000 células por aba: a leitura para na linha 10.001 e avisa' },
  ],
};

/** Valem para as planilhas de fora do repositório (pasta EFC_AMOSTRAS_FORA, por exemplo a anonimizada do Elias). */
export const CONHECIDAS_FORA = [
  { fonte: 'libreoffice', grupo: /SUBTOTAL/, id: 'L-09', motivo: 'o LibreOffice pode calcular SUBTOTAL com filtro de tabela diferente no arquivo salvo; no Excel falta provar' },
  { fonte: 'openpyxl', grupo: /^fórmula: referência de tabela virou endereço$/, id: 'L-02', motivo: 'o motor trabalha com endereços; a conta é a mesma' },
  { fonte: 'openpyxl', grupo: /^fórmula de folga cortada$/, id: 'L-04', motivo: 'fórmulas que dão vazio depois do último dado: ficam 1.000 linhas de folga' },
  { fonte: 'openpyxl', grupo: /^linha depois do corte/, id: 'L-07', motivo: 'limite de 300.000 células por aba (800.000 na pasta): a leitura para e avisa' },
  { fonte: 'openpyxl', grupo: /^texto: quebra de linha do Windows/, id: 'L-05', motivo: 'quebra de linha \\r\\n vira \\n; na tela é igual' },
  { fonte: 'openpyxl', grupo: /^posição da rolagem ao abrir/, id: 'L-06', motivo: 'o congelamento volta igual; a planilha abre no começo, não onde estava rolada' },
  { fonte: 'idaVolta', grupo: / · v \(número virou o mesmo texto\)$/, id: 'L-08', motivo: 'título numérico de tabela volta como texto, como o Excel grava' },
  { fonte: 'openpyxl', grupo: /^número virou o mesmo texto$/, id: 'L-08', motivo: 'título numérico de tabela volta como texto, como o Excel grava' },
];

export function conhecida(arquivo, fonte, grupo, fora) {
  const lista = [...(CONHECIDAS[arquivo] || []), ...(fora ? CONHECIDAS_FORA : [])];
  return lista.find((k) => k.fonte === fonte && k.grupo.test(grupo)) || null;
}
