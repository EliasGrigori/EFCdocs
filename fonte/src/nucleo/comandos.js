/* EFCdocs — catálogo único de comandos.
   A faixa, a barra curta, o painel e a busca "O que você quer fazer?" usam este mesmo catálogo.
   chega: em que versão o comando passa a funcionar (texto, ou por módulo { planilha, docx, postits }).
   Quando a versão do app alcança a do "chega", o comando liga sozinho. */

import { VERSAO } from './modelo.js';

const V4 = 'v0.4.0', V5 = 'v0.5.0', V6 = 'v0.6.0', V7 = 'v0.7.0', V8 = 'v0.8.0';
const DEPOIS = 'depois da v1.0.0';
const porModulo = (planilha, docx, postits) => ({ planilha, docx, postits });
const C = (id, nome, ic, extra = {}) => ({ id, nome, ic, sin: [], mods: ['*'], ...extra });

export const COMANDOS = [
  C('app.inicio', 'Ir para o início', 'casa', { sin: ['home', 'tela inicial', 'voltar'] }),
  C('app.buscar', 'O que você quer fazer?', 'busca', { sin: ['procurar comando', 'ajuda', 'pesquisar'], atalho: 'Ctrl+K' }),
  C('app.opcoes', 'Opções', 'gear', { sin: ['configurações', 'preferências', 'ajustes'] }),

  C('arquivo.novo', 'Novo', 'novo', { sin: ['criar', 'novo arquivo', 'em branco'], acao: 'arquivo.criar' }),
  C('arquivo.novaPlanilha', 'Nova planilha', 'planilha', { sin: ['criar planilha', 'excel'], acao: 'arquivo.criar' }),
  C('arquivo.novoDocumento', 'Novo documento', 'docx', { sin: ['criar documento', 'word', 'pop', 'formulário'], acao: 'arquivo.criar' }),
  C('arquivo.novoQuadro', 'Novo quadro de post-its', 'postits', { sin: ['criar quadro', 'kanban', 'fluxograma', 'post-it'], acao: 'arquivo.criar' }),
  C('arquivo.renomear', 'Renomear', 'renomear', { sin: ['mudar nome', 'trocar nome', 'título'], acao: 'arquivo.renomear', ed: true }),
  C('arquivo.lixeira', 'Mandar para a lixeira', 'lixeira', { sin: ['apagar arquivo', 'excluir arquivo', 'deletar', 'remover rascunho'], acao: 'arquivo.lixeira', ed: true }),
  C('arquivo.abrir', 'Abrir Excel/Word', 'abrir', { sin: ['importar', 'abrir arquivo', 'xlsx', 'docx'], chega: porModulo(V5, V7, null), mods: ['planilha', 'docx'] }),
  C('arquivo.exportarExcel', 'Exportar Excel', 'excel', { sin: ['salvar como excel', 'xlsx', 'baixar planilha'], chega: V5, mods: ['planilha'] }),
  C('arquivo.exportarWord', 'Exportar Word', 'docx', { sin: ['salvar como word', 'docx'], chega: V7, mods: ['docx'] }),
  C('arquivo.exportarPDF', 'Exportar PDF', 'pdf', { sin: ['pdf', 'baixar pdf', 'gerar pdf', 'paisagem'], chega: porModulo(V5, V7, null), acao: 'exportar' }),
  C('arquivo.exportarImagem', 'Exportar imagem (PNG)', 'imagem', { sin: ['png', 'jpg', 'foto do quadro', 'print'], mods: ['postits'], acao: 'exportar' }),
  C('arquivo.imprimir', 'Imprimir', 'imprimir', { sin: ['impressora'], chega: porModulo(V5, V7, null), acao: 'exportar' }),
  C('arquivo.versoes', 'Versões e revisões', 'historico', { sin: ['histórico', 'revisão antiga', 'versão anterior'], chega: V7, mods: ['docx', 'planilha'] }),
  C('arquivo.lancar', 'Lançar na pasta', 'pasta', { sin: ['lançamento', 'registrar', 'enviar para pasta'], chega: V8, acao: 'lancar' }),
  C('arquivo.cancelar', 'Cancelar com motivo', 'arquivar', { sin: ['cancelar lançamento', 'anular'], chega: V8, acao: 'lancamento.cancelar' }),

  C('editar.desfazer', 'Desfazer', 'desfazer', { sin: ['voltar', 'ctrl z'], atalho: 'Ctrl+Z', ed: true }),
  C('editar.refazer', 'Refazer', 'refazer', { sin: ['ctrl y'], atalho: 'Ctrl+Y', ed: true }),
  C('editar.colar', 'Colar', 'colar', { sin: ['ctrl v'], atalho: 'Ctrl+V', chega: porModulo(V4, V7, null), acao: 'quadro.editar' }),
  C('editar.recortar', 'Recortar', 'recortar', { sin: ['ctrl x'], atalho: 'Ctrl+X', chega: porModulo(V4, V7, null), acao: 'quadro.editar' }),
  C('editar.copiar', 'Copiar', 'copiar', { sin: ['ctrl c'], atalho: 'Ctrl+C', chega: porModulo(V4, V7, null) }),
  C('editar.pincel', 'Pincel de formatação', 'pincel', { sin: ['copiar formato', 'copiar cor'], chega: porModulo(V4, V7, null), acao: 'quadro.editar' }),
  C('editar.localizar', 'Localizar e substituir', 'busca', { sin: ['procurar', 'achar', 'substituir'], chega: porModulo(V4, V7, null) }),
  C('editar.comentar', 'Comentário', 'comentario', { sin: ['comentar', 'nota', 'observação'], chega: porModulo(V6, V7, null), acao: 'quadro.editar' }),
  C('editar.duplicar', 'Duplicar', 'dupl', { sin: ['cópia', 'ctrl d'], atalho: 'Ctrl+D', mods: ['postits'], acao: 'quadro.editar' }),
  C('editar.excluir', 'Excluir a seleção', 'lixeira', { sin: ['apagar post-it', 'apagar seta', 'delete', 'remover'], atalho: 'Delete', mods: ['postits'], acao: 'quadro.editar' }),
  C('editar.selecionarTudo', 'Selecionar tudo', 'selecao', { sin: ['ctrl a', 'marcar tudo'], atalho: 'Ctrl+A', mods: ['postits', 'planilha'] }),
  C('editar.historico', 'Linha do tempo do desfazer', 'historico', { sin: ['voltar vários passos', 'histórico de ações', 'desfazer até'], ed: true }),
  C('editar.colarValores', 'Colar só os valores', 'colar', { sin: ['colar especial', 'colar valor', 'sem fórmula'], mods: ['planilha'], acao: 'planilha.editar' }),
  C('editar.preencherBaixo', 'Preencher para baixo', 'setaBaixo', { sin: ['ctrl d', 'copiar para baixo'], atalho: 'Ctrl+D', mods: ['planilha'], acao: 'planilha.editar' }),
  C('editar.preencherDireita', 'Preencher para a direita', 'setaDir', { sin: ['ctrl r', 'copiar para o lado'], atalho: 'Ctrl+R', mods: ['planilha'], acao: 'planilha.editar' }),
  C('planilha.limparConteudo', 'Limpar conteúdo', 'x', { sin: ['apagar células', 'delete', 'limpar'], atalho: 'Delete', mods: ['planilha'], acao: 'planilha.editar' }),
  C('planilha.inserirLinha', 'Inserir linha acima', 'inserir', { sin: ['nova linha', 'adicionar linha'], mods: ['planilha'], acao: 'planilha.editar' }),
  C('planilha.inserirColuna', 'Inserir coluna à esquerda', 'inserir', { sin: ['nova coluna', 'adicionar coluna'], mods: ['planilha'], acao: 'planilha.editar' }),
  C('planilha.excluirLinha', 'Excluir linha', 'lixeira', { sin: ['apagar linha', 'remover linha'], mods: ['planilha'], acao: 'planilha.editar' }),
  C('planilha.excluirColuna', 'Excluir coluna', 'lixeira', { sin: ['apagar coluna', 'remover coluna'], mods: ['planilha'], acao: 'planilha.editar' }),
  C('planilha.ocultarLinha', 'Ocultar linhas', 'ver', { sin: ['esconder linha'], mods: ['planilha'], acao: 'planilha.editar' }),
  C('planilha.ocultarColuna', 'Ocultar colunas', 'ver', { sin: ['esconder coluna'], mods: ['planilha'], acao: 'planilha.editar' }),
  C('planilha.reexibir', 'Reexibir linhas', 'ver', { sin: ['mostrar linhas ocultas'], mods: ['planilha'], acao: 'planilha.editar' }),
  C('planilha.reexibirColuna', 'Reexibir colunas', 'ver', { sin: ['mostrar colunas ocultas', 'desocultar coluna'], mods: ['planilha'], acao: 'planilha.editar' }),
  C('planilha.novaAba', 'Nova aba', 'plus', { sin: ['nova folha', 'adicionar aba', 'nova planilha dentro'], mods: ['planilha'], acao: 'planilha.editar' }),
  C('planilha.cabecalho', 'Esta linha é o cabeçalho', 'titulo', { sin: ['títulos das colunas', 'linha de títulos'], mods: ['planilha'], acao: 'planilha.editar' }),

  C('formatar.negrito', 'Negrito', 'negrito', { sin: ['ctrl n', 'grosso'], chega: porModulo(V4, V7, null), acao: 'quadro.editar' }),
  C('formatar.italico', 'Itálico', 'italico', { sin: ['ctrl i', 'inclinado'], chega: porModulo(V4, V7, null), acao: 'quadro.editar' }),
  C('formatar.sublinhado', 'Sublinhado', 'sublinhado', { sin: ['ctrl s', 'grifar'], chega: porModulo(V4, V7, null), acao: 'quadro.editar' }),
  C('formatar.corFonte', 'Cor da fonte', 'corfonte', { sin: ['cor do texto', 'letra colorida'], chega: porModulo(V4, V7, null), acao: 'quadro.editar' }),
  C('formatar.preenchimento', 'Cor de preenchimento', 'balde', { sin: ['fundo', 'pintar célula', 'cor do post-it'], chega: porModulo(V4, null, null), mods: ['planilha', 'postits'], acao: 'quadro.editar' }),
  C('formatar.bordas', 'Bordas', 'borda', { sin: ['linha da célula', 'contorno'], chega: V4, mods: ['planilha'] }),
  C('formatar.esquerda', 'Alinhar à esquerda', 'aesq', { chega: porModulo(V4, V7, null), acao: 'quadro.editar' }),
  C('formatar.centro', 'Centralizar', 'acen', { sin: ['meio'], chega: porModulo(V4, V7, null), acao: 'quadro.editar' }),
  C('formatar.direita', 'Alinhar à direita', 'adir', { chega: porModulo(V4, V7, null), acao: 'quadro.editar' }),
  C('formatar.quebrar', 'Quebrar texto', 'quebra', { sin: ['várias linhas na célula'], chega: V4, mods: ['planilha'] }),
  C('formatar.mesclar', 'Mesclar células', 'mesclar', { sin: ['juntar células', 'unir'], chega: V4, mods: ['planilha'] }),
  C('formatar.moeda', 'Formato moeda (R$)', 'moeda', { sin: ['dinheiro', 'reais', 'contábil'], chega: V4, mods: ['planilha'] }),
  C('formatar.porcentagem', 'Formato porcentagem (%)', 'pct', { sin: ['percentual', 'por cento'], chega: V4, mods: ['planilha'] }),
  C('formatar.milhar', 'Separador de milhares', 'milhar', { sin: ['número com ponto', '1.000,00'], mods: ['planilha'], acao: 'planilha.editar' }),
  C('formatar.maisCasas', 'Mais casas decimais', 'maisdec', { sin: ['aumentar casas', 'mais decimais'], mods: ['planilha'], acao: 'planilha.editar' }),
  C('formatar.menosCasas', 'Menos casas decimais', 'menosdec', { sin: ['diminuir casas', 'menos decimais', 'arredondar visual'], mods: ['planilha'], acao: 'planilha.editar' }),
  C('formatar.formatoNumero', 'Formato de número', 'formatar', { sin: ['formatar células', 'ctrl 1', 'data', 'hora', 'código de formato'], atalho: 'Ctrl+1', mods: ['planilha'], acao: 'planilha.editar' }),
  C('formatar.fonte', 'Fonte e tamanho', 'titulo', { sin: ['tamanho da letra', 'tipo de letra', 'arial', 'calibri'], mods: ['planilha'], acao: 'planilha.editar' }),
  C('formatar.limpar', 'Limpar formatos', 'x', { sin: ['tirar formatação', 'apagar formato'], mods: ['planilha'], acao: 'planilha.editar' }),
  C('formatar.condicional', 'Formatação condicional', 'condicional', { sin: ['destacar regra', 'pintar se', 'cor automática'], chega: V6, mods: ['planilha'] }),
  C('formatar.lista', 'Lista com marcadores', 'lista', { sin: ['tópicos', 'bolinhas'], chega: V7, mods: ['docx'] }),
  C('formatar.numerada', 'Lista numerada', 'numerada', { sin: ['numeração'], chega: V7, mods: ['docx'] }),
  C('formatar.titulo', 'Estilo título', 'titulo', { sin: ['cabeçalho', 'título 1', 'heading'], chega: V7, mods: ['docx'] }),

  C('inserir.tabela', 'Tabela', 'tabela', { sin: ['formatar como tabela', 'grade'], chega: porModulo(V6, V7, null), mods: ['planilha', 'docx'] }),
  C('inserir.imagem', 'Imagem', 'imagem', { sin: ['foto', 'figura'], chega: porModulo(V6, V7, null), acao: 'quadro.editar' }),
  C('inserir.grafico', 'Gráfico', 'grafico', { sin: ['chart', 'colunas', 'pizza', 'barras', 'linhas', 'dashboard'], chega: porModulo(V6, V7, V6) }),
  C('inserir.link', 'Link', 'link', { sin: ['hiperlink', 'endereço', 'ir para aba'], chega: porModulo(V6, V7, null), acao: 'quadro.editar' }),
  C('inserir.botao', 'Botão que leva a outra aba', 'botao', { sin: ['botão', 'navegação', 'macro', 'atalho de aba'], chega: V6, mods: ['planilha'] }),
  C('inserir.foto', 'Foto na célula', 'foto', { sin: ['evidência', 'câmera'], chega: V8, mods: ['planilha'] }),
  C('inserir.status', 'Coluna de status', 'status', { sin: ['ok não ok', 'situação'], chega: V6, mods: ['planilha'] }),
  C('inserir.campo', 'Campo do formulário', 'campo', { sin: ['campo travado', 'preencher'], chega: V7, mods: ['docx'] }),
  C('inserir.checklist', 'Checklist', 'validacao', { sin: ['lista de verificação', 'caixa de marcar'], chega: V7, mods: ['docx'] }),
  C('inserir.assinatura', 'Assinatura', 'assinatura', { sin: ['assinar', 'aprovar', 'rubrica', 'linha de assinatura', 'visto'], chega: porModulo(null, V7, null), mods: ['planilha', 'docx', 'postits'], acao: 'quadro.editar' }),
  C('inserir.postit', 'Post-it', 'postit', { sin: ['nota adesiva', 'cartão', 'adicionar post-it'], mods: ['postits'], acao: 'quadro.editar' }),
  C('inserir.forma', 'Formas', 'forma', { sin: ['retângulo', 'losango', 'decisão', 'fluxograma', 'círculo'], mods: ['postits'], acao: 'quadro.editar' }),
  C('inserir.processo', 'Forma: atividade (etapa)', 'processo', { sin: ['retângulo', 'etapa', 'processo', 'atividade', 'fluxograma'], mods: ['postits'], acao: 'quadro.editar' }),
  C('inserir.decisao', 'Forma: decisão (sim/não)', 'decisao', { sin: ['losango', 'pergunta', 'condição', 'fluxograma'], mods: ['postits'], acao: 'quadro.editar' }),
  C('inserir.inicio', 'Forma: início ou fim', 'inicio', { sin: ['oval', 'terminal', 'começo', 'fluxograma'], mods: ['postits'], acao: 'quadro.editar' }),
  C('inserir.dados', 'Forma: entrada/saída', 'dados', { sin: ['paralelogramo', 'registro', 'dados', 'documento', 'fluxograma'], mods: ['postits'], acao: 'quadro.editar' }),
  C('inserir.seta', 'Seta', 'seta', { sin: ['conector', 'ligação', 'linha', 'ligar'], mods: ['postits'], acao: 'quadro.editar' }),
  C('inserir.proximo', 'Próximo passo (já ligado)', 'conector', { sin: ['adicionar etapa', 'mais', 'continuar fluxo'], mods: ['postits'], acao: 'quadro.editar' }),
  C('inserir.pagina', 'Página do quadro', 'pagina', { sin: ['folha', 'dividir o quadro', 'página do pdf', 'moldura'], mods: ['postits'], acao: 'quadro.editar' }),
  C('inserir.legenda', 'Legenda do fluxograma', 'legenda', { sin: ['significado das formas', 'chave', 'símbolos'], mods: ['postits'], acao: 'quadro.editar' }),
  C('inserir.modelo', 'Modelo de quadro da qualidade', 'modelo', { sin: ['rnc', 'ishikawa', '5w2h', 'gut', 'pdca', 'modelo pronto', 'mapa mental', 'linha do tempo'], mods: ['postits'], acao: 'quadro.editar' }),
  C('inserir.texto', 'Texto solto', 'texto', { sin: ['caixa de texto', 'título do quadro'], mods: ['postits'], acao: 'quadro.editar' }),

  C('formula.inserir', 'Inserir função', 'funcao', { sin: ['fórmula', 'função', 'calcular', 'fx'], chega: V4, mods: ['planilha'] }),
  C('formula.autosoma', 'AutoSoma', 'soma', { sin: ['somar', 'total', 'soma'], chega: V4, mods: ['planilha'] }),
  C('formula.explicar', 'Explicar esta conta', 'explicar', { sin: ['entender fórmula', 'por que deu erro', 'erro na fórmula', 'avaliar fórmula'], chega: 'v0.4.3', mods: ['planilha'] }),
  C('formula.fluxo', 'Desenhar a conta (fluxograma)', 'fluxoConta', { sin: ['fluxograma da conta', 'de onde vem', 'mapa da fórmula', 'diagrama'], chega: 'v0.4.3', mods: ['planilha'] }),
  C('formula.problemas', 'Problemas da planilha', 'lampada', { sin: ['erros', 'pendências', 'verificar planilha', 'revisar', 'assistente'], chega: 'v0.4.3', mods: ['planilha'] }),
  C('formula.montar', 'Montar a conta por pergunta', 'pergunta', { sin: ['receita', 'como faço', 'contar quantos', 'somar quando', 'quero calcular', 'assistente de fórmula'], chega: 'v0.4.3', mods: ['planilha'], acao: 'planilha.editar' }),
  C('formula.origem', 'De onde vem / quem usa esta célula', 'origem', { sin: ['rastrear precedentes', 'dependentes', 'referências', 'quem usa', 'para onde vai'], chega: V4, mods: ['planilha'] }),
  C('formula.nome', 'Dar nome à seleção', 'renomear', { sin: ['nome definido', 'meta', 'gerenciador de nomes', 'apelido da célula'], chega: V4, mods: ['planilha'], acao: 'planilha.editar' }),
  C('formula.nomes', 'Nomes da planilha', 'lista', { sin: ['gerenciador de nomes', 'renomear nome', 'nomes definidos'], chega: V4, mods: ['planilha'] }),

  C('dados.classificar', 'Classificar', 'classificar', { sin: ['ordenar', 'a-z', 'organizar'], chega: V6, mods: ['planilha'] }),
  C('dados.filtrar', 'Filtrar', 'filtro', { sin: ['filtro', 'mostrar só'], chega: V6, mods: ['planilha'] }),
  C('dados.validacao', 'Validação de dados', 'validacao', { sin: ['lista suspensa', 'limite de valor', 'regra de entrada'], chega: V6, mods: ['planilha'] }),
  C('dados.duplicados', 'Remover duplicados', 'dupl', { sin: ['repetidos'], chega: V6, mods: ['planilha'] }),
  C('dados.dinamica', 'Tabela dinâmica', 'tabela', { sin: ['pivot', 'resumo', 'agrupar'], chega: DEPOIS, mods: ['planilha'] }),

  C('revisao.ortografia', 'Ortografia', 'ortografia', { sin: ['corretor', 'erros de escrita'], chega: porModulo(V6, V7, null) }),
  C('revisao.controlar', 'Controlar alterações', 'revisao', { sin: ['marcas de revisão'], chega: V7, mods: ['docx'] }),
  C('revisao.concluir', 'Concluir revisão', 'assinatura', { sin: ['nova revisão', 'mandar para aprovação'], chega: V7, mods: ['docx'], acao: 'revisao.concluir' }),
  C('revisao.comparar', 'Comparar revisões', 'comparar', { sin: ['diferença entre versões', 'o que mudou'], chega: V7, mods: ['docx'] }),
  C('revisao.travar', 'Travar modelo', 'cadeado', { sin: ['proteger', 'bloquear', 'senha'], chega: V6, mods: ['planilha'] }),

  C('organizar.kanban', 'Kanban', 'kanban', { sin: ['colunas de status', 'a fazer', 'fazendo', 'feito'], mods: ['postits'] }),
  C('organizar.quadro', 'Quadro livre', 'quadro', { sin: ['voltar ao quadro', 'tela livre', 'fluxograma'], mods: ['postits'] }),
  C('organizar.raias', 'Raias por setor', 'raias', { sin: ['swimlane', 'fluxograma por setor', 'faixas'], mods: ['postits'], acao: 'quadro.editar' }),
  C('organizar.frente', 'Trazer para a frente', 'frente', { sin: ['por cima', 'ordem'], mods: ['postits'], acao: 'quadro.editar' }),
  C('organizar.tras', 'Mandar para trás', 'tras', { sin: ['por baixo', 'ordem', 'fundo'], mods: ['postits'], acao: 'quadro.editar' }),
  C('organizar.ordenarGut', 'Ordenar pelo GUT', 'classificar', { sin: ['prioridade', 'gravidade urgência tendência', 'priorizar'], mods: ['postits'], acao: 'quadro.editar' }),
  C('organizar.temporizador', 'Temporizador de reunião', 'temporizador', { sin: ['cronômetro', 'tempo', 'relógio'], mods: ['postits'] }),

  C('pagina.orientacao', 'Orientação da página', 'orientacao', { sin: ['retrato', 'paisagem'], chega: V7, mods: ['docx'] }),
  C('pagina.margens', 'Margens', 'margens', { chega: V7, mods: ['docx'] }),
  C('pagina.quebra', 'Quebra de página', 'quebrapag', { chega: V7, mods: ['docx'] }),
  C('pagina.cabecalho', 'Cabeçalho do POP', 'cabecalho', { sin: ['código', 'revisão', 'elaborado por'], chega: V7, mods: ['docx'] }),
  C('pagina.sumario', 'Sumário', 'sumario', { sin: ['índice'], chega: V7, mods: ['docx'] }),

  C('exibir.faixaTudo', 'Faixa: mostrar tudo', 'faixaTudo', { sin: ['mostrar faixa', 'mostrar ferramentas', 'ribbon'] }),
  C('exibir.faixaAbas', 'Faixa: só as abas', 'faixaAbas', { sin: ['recolher faixa', 'esconder botões', 'compacta'], atalho: 'Ctrl+F1' }),
  C('exibir.faixaOculta', 'Faixa: esconder (tela cheia)', 'faixaOculta', { sin: ['esconder faixa', 'mais espaço', 'ocultar barra'] }),
  C('exibir.menuCompleto', 'Menu lateral: completo', 'menuCompleto', { sin: ['mostrar menu'] }),
  C('exibir.menuIcones', 'Menu lateral: só ícones', 'menuIcones', { sin: ['recolher menu', 'menu pequeno'] }),
  C('exibir.menuOculto', 'Menu lateral: esconder', 'menuOculto', { sin: ['esconder menu', 'ocultar menu'] }),
  C('exibir.topoCompleto', 'Barra de cima: completa (título e busca)', 'topoCompleto', { sin: ['mostrar título', 'mostrar busca'] }),
  C('exibir.topoCompacto', 'Barra de cima: compacta (só as abas)', 'topoCompacto', { sin: ['esconder título', 'mais espaço', 'recolher barra de cima'] }),
  C('exibir.barraFormula', 'Barra de fórmula: expandir ou recolher', 'barraFormula', { sin: ['fx', 'aumentar barra de fórmula', 'barra de fórmulas', 'expandir fx'], mods: ['planilha'] }),
  C('exibir.painel', 'Mostrar ou fechar o painel lateral', 'painel', { sin: ['propriedades', 'painel', 'detalhes'] }),
  C('exibir.layoutA', 'Layout: faixa tipo Excel', 'layoutA', { sin: ['ribbon', 'faixa completa', 'opção a'] }),
  C('exibir.layoutB', 'Layout: barra curta e painel', 'layoutB', { sin: ['barra simples', 'opção b'] }),
  C('exibir.tema', 'Tema', 'tema', { sin: ['cor', 'escuro', 'claro', 'aparência', 'esmeralda', 'petróleo'] }),
  C('exibir.relevo', 'Relevo nas barras', 'relevo', { sin: ['sombra', 'efeito 3d', 'destaque'] }),
  C('exibir.telaCheia', 'Tela cheia', 'tela', { sin: ['maximizar', 'esconder tudo'] }),
  C('exibir.zoom', 'Zoom', 'zoommais', { sin: ['aumentar', 'diminuir', 'ampliar', '100%'], chega: porModulo(V4, V7, null) }),
  C('exibir.ajustar', 'Ajustar à tela', 'ajustar', { sin: ['ver tudo', 'caber na tela', 'enquadrar'], mods: ['postits'] }),
  C('exibir.codigos', 'Mostrar códigos (Q-001)', 'codigo', { sin: ['número do post-it', 'q-001', 'código'], mods: ['postits'] }),
  C('exibir.congelar', 'Congelar painéis', 'congelar', { sin: ['fixar linha', 'travar cabeçalho', 'congelar cabeçalho'], chega: V4, mods: ['planilha'] }),
  C('exibir.folhaClara', 'Folha clara', 'tema', { sin: ['grade branca', 'fundo branco', 'planilha clara'], chega: V4, mods: ['planilha'] }),
  C('exibir.grade', 'Linhas de grade', 'grade', { chega: V4, mods: ['planilha'] }),
  C('exibir.ferramentas', 'Barra de ferramentas do quadro', 'barraLat', { sin: ['ferramentas', 'barra lateral', 'formas à mão'], mods: ['postits'] }),
  C('exibir.assistente', 'Assistente do quadro', 'lampada', { sin: ['revisar fluxograma', 'pendências', 'erros do fluxo', 'verificar'], mods: ['postits'] }),
  C('exibir.minimapa', 'Minimapa', 'mapa', { sin: ['mapa do quadro', 'visão geral'], mods: ['postits'] }),
  C('exibir.leitura', 'Modo leitura', 'ver', { chega: V7, mods: ['docx'] }),
];

export const PorId = Object.fromEntries(COMANDOS.map((c) => [c.id, c]));

/** Compara versões "v0.3.0". Texto que não é versão (ex.: "depois da v1.0.0") conta como futuro. */
export function versaoMaior(a, b) {
  const p = (v) => { const m = /^v(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?$/.exec(v); return m ? [m[1], m[2], m[3], m[4] || 0].map(Number) : []; };
  const x = p(a), y = p(b);
  if (x.length !== 4) return true;
  for (let i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
}

/** "chega na v0.5.0" ou "chega depois da v1.0.0" (para as frases de aviso). */
export const textoChega = (v) => (/^v/.test(v) ? 'chega na ' + v : 'chega ' + v);

/** Em que versão o comando chega neste módulo; null = já funciona. */
export function chegaNa(cmd, mod, versao = VERSAO) {
  if (!cmd || !cmd.chega) return null;
  const v = typeof cmd.chega === 'string' ? cmd.chega : (cmd.chega[mod] || null);
  if (!v) return null;
  return versaoMaior(v, versao) ? v : null;
}

/** O comando aparece neste módulo? (mod null = fora de um arquivo) */
export function valeNoModulo(cmd, mod) {
  return mod ? cmd.mods.includes('*') || cmd.mods.includes(mod) : cmd.mods.includes('*') && !cmd.ed;
}

const normal = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

export function buscarComandos(texto, mod, max = 8) {
  const q = normal(texto);
  const validos = COMANDOS.filter((c) => valeNoModulo(c, mod));
  if (!q) return validos.filter((c) => !chegaNa(c, mod)).slice(0, max);
  const palavras = q.split(' ');
  const nota = (c) => {
    const nome = normal(c.nome);
    const sin = c.sin.map(normal);
    let s = 0;
    if (nome === q) s += 100;
    if (nome.startsWith(q)) s += 50;
    if (nome.includes(q)) s += 30;
    if (sin.some((x) => x === q)) s += 40;
    if (sin.some((x) => x.includes(q))) s += 20;
    if (palavras.length > 1 && palavras.every((p) => nome.includes(p) || sin.some((x) => x.includes(p)))) s += 15;
    if (s && !chegaNa(c, mod)) s += 5;
    return s;
  };
  return validos.map((c) => [nota(c), c]).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]).slice(0, max).map(([, c]) => c);
}
