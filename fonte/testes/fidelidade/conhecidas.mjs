/* Diferenças JÁ CONHECIDAS da rede de fidelidade (v0.6.10). Cada uma tem o número do defeito (D-) ou do limite (L-)
   da MEMORIA-DO-PROJETO.md. Diferença nova, que não está aqui, faz o teste falhar: ou é defeito novo (anotar na
   memória e aqui), ou é piora (consertar). Quando um defeito for corrigido, APAGAR a linha dele: o teste passa a
   cobrar que a diferença não volte. Regra "não pode piorar" do Método Sabiá 2.0. */

/** fonte: 'idaVolta' (EFCdocs lê → grava → lê), 'openpyxl' (estrutura e estilo) ou 'libreoffice' (recálculo).
 *  grupo: expressão que casa com o nome do grupo da diferença. */
export const CONHECIDAS = {
  'amostra-anonimizar.xlsx': [
    { fonte: 'idaVolta', grupo: /^\(pasta\) · tabelas$/, id: 'D-20', motivo: 'tabela com título numérico (2024) some ao salvar' },
    { fonte: 'openpyxl', grupo: /^tabela$/, id: 'D-20', motivo: 'tabela com título numérico (2024) some ao salvar' },
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
    { fonte: 'idaVolta', grupo: /^\(pasta\) · tabelas$/, id: 'D-20', motivo: 'tabela TabAnos com título numérico (2024) some ao salvar' },
    { fonte: 'openpyxl', grupo: /^tabela$/, id: 'D-20', motivo: 'tabela TabAnos com título numérico (2024) some ao salvar' },
    { fonte: 'openpyxl', grupo: /^nome da aba: espaço no começo ou no fim sumiu$/, id: 'D-22', motivo: 'a aba "Resumo " perde o espaço do fim' },
    { fonte: 'openpyxl', grupo: /^coluna oculta voltou a aparecer$/, id: 'D-23', motivo: 'colunas AY até XFD ocultas: só 50 continuam ocultas' },
    { fonte: 'idaVolta', grupo: /^Coletas · ocF$/, id: 'D-24', motivo: 'linhas ocultas pelo filtro por mês deixam de contar como "pelo filtro"' },
    { fonte: 'openpyxl', grupo: /^filtro: critério sumiu/, id: 'D-24', motivo: 'o critério de data do filtro não é lido nem gravado' },
  ],
  /* cópia anonimizada da planilha antiga do Elias, revisada e liberada por ele para o repositório (A03 da v0.6.10).
     Sem gerador: foi feita com ferramentas/anonimizar a partir do arquivo real, que nunca entra no projeto. */
  'amostra-real-anonimizada.xlsx': [
    { fonte: 'idaVolta', grupo: / · ocF$/, id: 'D-24', motivo: 'filtro com critério de data: as linhas continuam ocultas, mas deixam de contar como "ocultas pelo filtro"' },
    { fonte: 'openpyxl', grupo: /^filtro: critério sumiu/, id: 'D-24', motivo: 'critério de data do filtro não é lido nem gravado' },
    { fonte: 'libreoffice', grupo: /SUBTOTAL/, id: 'D-24', motivo: 'sem o critério do filtro, o LibreOffice muda o SUBTOTAL da aba de resumo' },
    { fonte: 'openpyxl', grupo: /^coluna oculta voltou a aparecer$/, id: 'D-23', motivo: 'colunas ocultas até o fim da aba: só 50 continuam ocultas' },
    { fonte: 'openpyxl', grupo: /^nome da aba: espaço no começo ou no fim sumiu$/, id: 'D-22', motivo: 'o nome da aba de resumo perde o espaço do fim' },
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
  { fonte: 'idaVolta', grupo: / · ocF$/, id: 'D-24', motivo: 'filtro com critério de data: as linhas continuam ocultas, mas deixam de contar como "ocultas pelo filtro" (SUBTOTAL muda)' },
  { fonte: 'openpyxl', grupo: /^filtro: critério sumiu/, id: 'D-24', motivo: 'critério de data do filtro não é lido nem gravado' },
  { fonte: 'libreoffice', grupo: /SUBTOTAL/, id: 'D-24', motivo: 'sem o critério do filtro, o LibreOffice muda o SUBTOTAL (no Excel falta provar)' },
  { fonte: 'openpyxl', grupo: /^coluna oculta voltou a aparecer$/, id: 'D-23', motivo: 'colunas ocultas até o fim da aba: só as 50 depois do último dado continuam ocultas' },
  { fonte: 'openpyxl', grupo: /^nome da aba: espaço no começo ou no fim sumiu$/, id: 'D-22', motivo: 'o nome da aba perde o espaço do fim' },
  { fonte: 'openpyxl', grupo: /^fórmula: referência de tabela virou endereço$/, id: 'L-02', motivo: 'o motor trabalha com endereços; a conta é a mesma' },
  { fonte: 'openpyxl', grupo: /^fórmula de folga cortada$/, id: 'L-04', motivo: 'fórmulas que dão vazio depois do último dado: ficam 1.000 linhas de folga' },
  { fonte: 'openpyxl', grupo: /^linha depois do corte/, id: 'L-07', motivo: 'limite de 300.000 células por aba (800.000 na pasta): a leitura para e avisa' },
  { fonte: 'openpyxl', grupo: /^texto: quebra de linha do Windows/, id: 'L-05', motivo: 'quebra de linha \\r\\n vira \\n; na tela é igual' },
  { fonte: 'openpyxl', grupo: /^posição da rolagem ao abrir/, id: 'L-06', motivo: 'o congelamento volta igual; a planilha abre no começo, não onde estava rolada' },
];

export function conhecida(arquivo, fonte, grupo, fora) {
  const lista = [...(CONHECIDAS[arquivo] || []), ...(fora ? CONHECIDAS_FORA : [])];
  return lista.find((k) => k.fonte === fonte && k.grupo.test(grupo)) || null;
}
