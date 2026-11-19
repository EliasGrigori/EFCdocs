/* Vértice Docs — listas e caixas da faixa igual ao Excel (só dados; quem desenha é faixa.jsx).
   v0.6.21: parte 1 (Inserir, Excluir, Formatar, Preencher, Limpar; letra, tamanho, formato), parte 2 (AutoSoma, gavetas de funções,
   outros gráficos), parte 3 (Margens, Orientação, Tamanho, Área de impressão, Quebras, Ajustar à página, Congelar painéis). */
import { FONTES, TAMANHOS_LETRA } from '../planilha/fontes.js';
import { FORMATOS } from '../planilha/formato.js';
import { GAVETAS, itensDaGaveta, CONTAS_AUTOSOMA, OUTROS_GRAFICOS } from '../planilha/biblioteca.js';
import { NOME_TIPO } from '../planilha/graficos.js';
import { MARGENS, PAPEIS } from '../planilha/impressao.js';
import { AJUSTES, CONGELAR } from '../planilha/faixaExtra.js';

/* Botões que abrem uma lista de comandos (Inserir, Excluir, Formatar, Preencher, Limpar), como no Excel */
export const MENUS_FAIXA = {
  inserir: { nome: 'Inserir', ic: 'inserir', dica: 'Inserir|Põe uma linha, uma coluna ou uma aba nova na planilha.', itens: ['planilha.inserirLinha', 'planilha.inserirColuna', '-', 'planilha.novaAba'] },
  excluir: { nome: 'Excluir', ic: 'lixeira', dica: 'Excluir|Tira a linha ou a coluna da célula escolhida.', itens: ['planilha.excluirLinha', 'planilha.excluirColuna'] },
  /* parte 2 (D2): altura da linha, largura da coluna e os ajustes, na ordem do Excel */
  formatar: { nome: 'Formatar', ic: 'ver', dica: 'Formatar|Muda a altura das linhas e a largura das colunas; esconde e mostra de novo.', itens: ['planilha.alturaLinha', 'planilha.ajustarLinha', '-', 'planilha.larguraColuna', 'planilha.ajustarColuna', '-', 'planilha.ocultarLinha', 'planilha.ocultarColuna', '-', 'planilha.reexibir', 'planilha.reexibirColuna'] },
  preencher: { nome: 'Preencher', ic: 'setaBaixo', dica: 'Preencher|Copia a célula de cima ou a do lado para as células escolhidas.', itens: ['editar.preencherBaixo', 'editar.preencherDireita'] },
  /* v0.6.21 parte 2: AutoSoma com a seta (as contas do Excel), as gavetas da Biblioteca de funções e os outros gráficos */
  autosoma: { nome: 'AutoSoma', ic: 'n:soma', direto: 'formula.autosoma', seta: 'Outras contas da AutoSoma', dica: 'Outras contas|Média, contar números, máximo e mínimo dos números acima ou ao lado.', itens: CONTAS_AUTOSOMA, fim: { id: 'formula.inserir', nome: 'Mais funções…' } },
  ...Object.fromEntries(GAVETAS.map((g) => [g.chave, { nome: g.nome, curto: g.curto, ic: g.ic, dica: g.dica, itens: () => itensDaGaveta(g.chave), classe: 'fn' }])),
  outrosGraficos: { nome: 'Outros gráficos', ic: 'n:gMais', dica: 'Outros gráficos|Colunas com linha, Pareto, carta de controle, histograma e velocímetro.', itens: OUTROS_GRAFICOS.map((t) => ({ id: 'inserir.grafico|' + t, nome: NOME_TIPO[t] })), fim: { id: 'inserir.grafico', nome: 'Escolher pelos dados…' } },
  /* v0.6.21 parte 3: listas do Layout da Página e o Congelar painéis do Excel; "valor" marca na lista o que vale hoje */
  margens: { nome: 'Margens', ic: 'n:margens', valor: 'valor.margens', dica: 'Margens|Normal, estreita, larga ou do seu jeito.',
    itens: Object.entries(MARGENS).map(([k, m]) => ({ id: 'impressao.margens|' + k, v: k, nome: m.nome, dica: `${m.nome}|Em cima ${String(m.t).replace('.', ',')} cm, nos lados ${String(m.l).replace('.', ',')} cm.` })), fim: { id: 'impressao.margens', nome: 'Margens personalizadas…' } },
  orientacao: { nome: 'Orientação', ic: 'n:orientacao', valor: 'valor.orientacao', dica: 'Orientação|Página em pé (retrato) ou deitada (paisagem).',
    itens: [{ id: 'impressao.orientacao|retrato', v: 'retrato', nome: 'Retrato' }, { id: 'impressao.orientacao|paisagem', v: 'paisagem', nome: 'Paisagem' }] },
  papel: { nome: 'Tamanho', ic: 'n:papel', valor: 'valor.papel', dica: 'Tamanho|O tamanho da folha impressa.',
    itens: Object.entries(PAPEIS).map(([k, p]) => ({ id: 'impressao.papel|' + k, v: k, nome: p.nome })), fim: { id: 'impressao.papel', nome: 'Mais opções de página…' } },
  areaImp: { nome: 'Área de impressão', ic: 'n:area', dica: 'Área de impressão|Imprime só as células escolhidas, ou volta a imprimir tudo.', itens: ['impressao.area', 'impressao.limparArea'] },
  quebras: { nome: 'Quebras', ic: 'n:quebraPag', dica: 'Quebras|Começa uma página nova antes da célula escolhida, ou tira as quebras.', itens: ['impressao.quebra', 'impressao.semQuebras'] },
  ajustarPag: { nome: 'Ajustar à página', ic: 'n:ajustar', valor: 'valor.ajustar', dica: 'Ajustar à página|Encolhe a impressão para caber na folha.',
    itens: Object.entries(AJUSTES).map(([k, nome]) => ({ id: 'impressao.ajustar|' + k, v: k, nome })), fim: { id: 'impressao.ajustar', nome: 'Mais opções de ajuste…' } },
  congelar: { nome: 'Congelar painéis', ic: 'n:congelar', valor: 'valor.congelar', dica: 'Congelar painéis|Deixa linhas e colunas paradas enquanto o resto rola.',
    itens: [
      { id: 'exibir.congelar|ativa', v: 'ativa', nome: CONGELAR.ativa, dica: 'Congelar painéis|Linhas acima e colunas à esquerda da célula escolhida ficam paradas.' },
      { id: 'exibir.congelar|linha', v: 'linha', nome: CONGELAR.linha, dica: 'Congelar linha superior|A primeira linha fica parada ao rolar para baixo.' },
      { id: 'exibir.congelar|coluna', v: 'coluna', nome: CONGELAR.coluna, dica: 'Congelar primeira coluna|A coluna A fica parada ao rolar para o lado.' },
      '-', { id: 'exibir.congelar|nada', nome: CONGELAR.nada, dica: 'Descongelar painéis|Tudo volta a rolar.' }] },
  /* v0.6.30 (D4): Página Inicial › Edição › Classificar e filtrar, como no Excel; marcaLigado: o item ligado (Filtro) ganha a marca */
  classificarFiltrar: { nome: 'Classificar e filtrar', ic: 'n:filtro', marcaLigado: true, dica: 'Classificar e filtrar|Põe em ordem de A a Z ou de Z a A, liga o filtro nos títulos, limpa ou reaplica.',
    itens: ['dados.az', 'dados.za', { id: 'dados.classificar', nome: 'Personalizar classificação…', ic: 'n:classificar' }, '-', 'dados.filtrar', 'dados.limparFiltro', 'dados.reaplicar'] },
  /* v0.6.30 (D7): os quatro grupos do Vértice no Exibir viram listas de um grupo só (Planilha, Documento e Quadro) */
  vtBarra: { nome: 'Barra de cima', ic: 'n:topoCompleto', marcaLigado: true, dica: 'Barra de cima e faixa|A barra de cima completa ou compacta; a faixa inteira, só as abas ou escondida.',
    itens: [{ cab: 'Barra de cima' }, 'exibir.topoCompleto', 'exibir.topoCompacto', '-', { cab: 'Faixa' }, 'exibir.faixaTudo', 'exibir.faixaAbas', 'exibir.faixaOculta'] },
  vtMenu: { nome: 'Menu lateral', ic: 'n:menuCompleto', marcaLigado: true, dica: 'Menu lateral|Completo, só com os ícones ou escondido.', itens: ['exibir.menuCompleto', 'exibir.menuIcones', 'exibir.menuOculto'] },
  vtLayout: { nome: 'Layout', ic: 'n:layoutA', marcaLigado: true, dica: 'Layout|O painel do lado e os dois jeitos de arrumar a tela.', itens: ['exibir.painel', '-', 'exibir.layoutA', 'exibir.layoutB'] },
  vtAparencia: { nome: 'Aparência', ic: 'n:tema', marcaLigado: true, dica: 'Aparência|Tema claro ou escuro, relevo e mesa.', itens: ['exibir.tema', 'exibir.relevo', 'exibir.mesa'] },
  limpar: { nome: 'Limpar', ic: 'n:limparFormato', dica: 'Limpar|Apaga só o que está escrito ou só a aparência da célula.', itens: ['planilha.limparConteudo', 'formatar.limpar'] },
};

/* Caixas que mostram o valor da célula ativa (letra, tamanho, formato do número) e abrem a lista para trocar */
export const CAIXAS_FAIXA = {
  fonte: {
    nome: 'Letra', cmd: 'formatar.fonte', valor: 'valor.fonte', largura: 124, dica: 'Letra|O tipo de letra da célula escolhida.',
    mostra: (v) => v || 'Padrão',
    opcoes: () => FONTES.map((f) => ({ id: 'formatar.fonte|f:' + f, v: f, nome: f || 'Padrão', estilo: f ? { fontFamily: `'${f}', var(--f)` } : undefined })),
    fim: { id: 'formatar.fonte', nome: 'Mais opções de letra…' },
  },
  tamanho: {
    nome: 'Tamanho da letra', cmd: 'formatar.fonte', valor: 'valor.tamanho', largura: 50, estreita: true, dica: 'Tamanho da letra|O tamanho da letra da célula escolhida.',
    mostra: (v) => String(v || 11),
    opcoes: () => TAMANHOS_LETRA.map((t) => ({ id: 'formatar.fonte|t:' + t, v: t, nome: String(t) })),
  },
  numero: {
    nome: 'Formato do número', cmd: 'formatar.formatoNumero', valor: 'valor.numero', largura: 150, dica: 'Formato do número|Como o número aparece: moeda, data, porcentagem e outros.',
    mostra: (v) => (FORMATOS.find((f) => f.id === v) || { nome: 'Personalizado' }).nome,
    opcoes: () => FORMATOS.map((f) => ({ id: 'formatar.formatoNumero|' + f.id, v: f.id, nome: f.nome })),
    fim: { id: 'formatar.formatoNumero', nome: 'Mais formatos de número…' },
  },
};

