/* Vértice Docs — a "Biblioteca de funções" da faixa (v0.6.21 parte 2, R25): as funções que o app calcula,
   arrumadas nas gavetas do Excel (Lógica, Texto, Data e hora, Pesquisa e referência, Matemática, Estatística, Mais funções).
   Cada função do catálogo cai em uma gaveta só; nenhuma fica de fora (teste em testes/planilha/v0621p2.test.mjs). */
import { FUNCOES, CATEGORIAS } from './nomesFuncoes.js';

export const GAVETAS = [
  { chave: 'fnLogica', nome: 'Lógica', ic: 'n:fnLogica', cats: ['log'], dica: 'Lógica|Funções que escolhem entre resultados: SE, E, OU, SEERRO.' },
  { chave: 'fnTexto', nome: 'Texto', ic: 'n:fnTexto', cats: ['texto'], dica: 'Texto|Funções que juntam, cortam e arrumam textos.' },
  { chave: 'fnData', nome: 'Data e hora', ic: 'n:fnData', cats: ['data'], dica: 'Data e hora|Funções de datas, prazos e dias úteis.' },
  { chave: 'fnBusca', nome: 'Pesquisa e referência', curto: 'Pesquisa', ic: 'n:fnBusca', cats: ['busca'], dica: 'Pesquisa e referência|Funções que procuram um valor em outra parte da planilha: PROCV, PROCX, ÍNDICE.' },
  { chave: 'fnMat', nome: 'Matemática', ic: 'n:fnMat', cats: ['soma', 'num'], dica: 'Matemática|Somar, contar, arredondar e outras contas com números.' },
  { chave: 'fnEst', nome: 'Estatística', ic: 'n:fnEst', cats: ['est'], dica: 'Estatística|Média, mediana, desvio padrão, maior, menor e posição.' },
  { chave: 'fnMais', nome: 'Mais funções', ic: 'n:fnMais', cats: ['mat', 'info'], dica: 'Mais funções|Funções que devolvem várias células de uma vez e funções de teste.' },
];
const POR_CHAVE = Object.fromEntries(GAVETAS.map((g) => [g.chave, g]));
const ordem = (a, b) => a.pt.localeCompare(b.pt, 'pt-BR');

/** Itens da lista de uma gaveta: com mais de uma categoria, cada uma ganha o seu título. */
export function itensDaGaveta(chave) {
  const g = POR_CHAVE[chave];
  if (!g) return [];
  const itens = [];
  for (const cat of g.cats) {
    if (g.cats.length > 1) itens.push({ cab: CATEGORIAS[cat] });
    for (const f of FUNCOES.filter((x) => x.cat === cat).sort(ordem)) itens.push({ id: 'formula.inserir|' + f.en, nome: f.pt, dica: f.pt + '|' + f.desc });
  }
  itens.push('-', { id: 'formula.inserir|cat:' + g.cats[0], nome: 'Procurar nesta lista…', fim: true });
  return itens;
}

/** As contas do botão AutoSoma, na ordem do Excel. */
export const CONTAS_AUTOSOMA = [
  { id: 'formula.autosoma', nome: 'Soma' },
  { id: 'formula.autosoma|MÉDIA', nome: 'Média' },
  { id: 'formula.autosoma|CONT.NÚM', nome: 'Contar números' },
  { id: 'formula.autosoma|MÁXIMO', nome: 'Máximo' },
  { id: 'formula.autosoma|MÍNIMO', nome: 'Mínimo' },
];
export const FUNCOES_AUTOSOMA = ['SOMA', 'MÉDIA', 'CONT.NÚM', 'MÁXIMO', 'MÍNIMO'];

/** Tipos de gráfico com botão próprio na faixa (os outros ficam na lista "Outros gráficos"). */
export const GRAFICOS_NA_FAIXA = {
  colunas: { nome: 'Colunas', ic: 'n:gColunas', dica: 'Colunas|Compara valores lado a lado.' },
  linha: { nome: 'Linha', ic: 'n:gLinha', dica: 'Linha|Mostra como um valor muda ao longo do tempo.' },
  pizza: { nome: 'Pizza', ic: 'n:gPizza', dica: 'Pizza|Mostra a parte de cada item no total.' },
  rosca: { nome: 'Rosca', ic: 'n:gRosca', dica: 'Rosca|Como a pizza, com o meio vazio.' },
  barras: { nome: 'Barras', ic: 'n:gBarras', dica: 'Barras|Como as colunas, deitadas: bom para nomes compridos.' },
  area: { nome: 'Área', ic: 'n:gArea', dica: 'Área|Como a linha, com a parte de baixo preenchida.' },
  dispersao: { nome: 'Dispersão', ic: 'n:gDispersao', dica: 'Dispersão|Mostra a relação entre duas medidas.' },
};
export const OUTROS_GRAFICOS = ['combinado', 'pareto', 'controle', 'histograma', 'velocimetro'];
