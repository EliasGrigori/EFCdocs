/* EFCdocs — topo: nome do arquivo, busca, faixa tipo Excel (opção A) e barra curta (opção B). */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GRAFICOS_NA_FAIXA } from '../planilha/biblioteca.js';
import { TEMAS, AMOSTRAS } from '../nucleo/prefs.js';
import { PorId, chegaNa, valeNoModulo, textoChega } from '../nucleo/comandos.js';
import { ROTULOS, DICA_ESTILO, estiloDaFaixa } from '../nucleo/prefs.js';
import { MAPA as ICONE_FAIXA } from './iconesFaixa.js';
import { validarNome } from '../nucleo/modelo.js';
import { Icone, usarEsc } from './comum.jsx';
import { Letras } from './letras.jsx';
import { dicaDoComando } from '../nucleo/dicas.js';
import { MENUS_FAIXA, CAIXAS_FAIXA } from './faixaMenus.js';

/* item: ['g', id, rótulo?] botão grande · ['col', [ids]] coluna de pequenos · ['lin', [ids]] linha de ícones ·
   ['pilha', [filas]] duas linhas (v0.6.21) · dentro de col e de pilha: ['menu', chave] botão com lista; na pilha: ['v', 'comando|valor'] ícone que já leva o valor ·
   parte 3: ['gm', chave] botão grande com lista; dentro de col: ['r', id, rótulo] botão pequeno com o nome do Excel só nesta aba */
const ABA_ARQUIVO = {
  id: 'arquivo', nome: 'Arquivo', grupos: [
    { nome: 'Arquivo', itens: [['g', 'arquivo.novo'], ['g', 'arquivo.renomear'], ['g', 'arquivo.abrir'], ['g', 'arquivo.exportarExcel'], ['g', 'arquivo.baixarOriginal'], ['g', 'arquivo.relatorioExcel'], ['g', 'arquivo.exportarWord'], ['g', 'arquivo.exportarPDF'], ['g', 'arquivo.exportarImagem'], ['g', 'arquivo.imprimir']] },
    { nome: 'Registro', itens: [['g', 'arquivo.versoes'], ['g', 'arquivo.lancar'], ['g', 'arquivo.lixeira']] },
    { nome: 'Cwork', itens: [['g', 'arquivo.interno'], ['g', 'arquivo.camposCwork'], ['g', 'arquivo.compartilharCwork']] },
  ],
};
/* v0.6.30 (D7): os quatro grupos do Vértice (barra de cima, menu lateral, layout, aparência) num grupo só, com listas, como no Inserir */
const GRUPOS_EXIBIR = [
  { nome: 'Do Vértice', itens: [['gm', 'vtBarra'], ['gm', 'vtMenu'], ['gm', 'vtLayout'], ['gm', 'vtAparencia'], ['g', 'exibir.telaCheia']] },
];
const GRUPO_TRANSFERENCIA = { nome: 'Área de transferência', itens: [['g', 'editar.colar'], ['col', ['editar.recortar', 'editar.copiar', 'editar.pincel']]] };

/* v0.6.2: o botão principal de cada aba (um só, cheio de cor nos estilos B e E) */
const PRINCIPAL = {
  planilha: { arquivo: 'arquivo.exportarExcel', inicio: 'editar.colar', inserir: 'inserir.grafico', layout: 'impressao.configurar', formulas: 'formula.inserir', dados: 'dados.validacao', revisao: 'editar.comentar', exibir: 'exibir.congelar', grafico: 'grafico.editar' },
  docx: { arquivo: 'arquivo.exportarWord', inicio: 'editar.colar', inserir: 'inserir.tabela', layout: 'pagina.margens', revisao: 'editar.comentar', exibir: 'exibir.leitura' },
  postits: { arquivo: 'arquivo.exportarImagem', inicio: 'editar.colar', inserir: 'inserir.postit', organizar: 'organizar.kanban', revisao: 'editar.comentar', exibir: 'exibir.ajustar' },
};

const FAIXAS = {
  planilha: [ABA_ARQUIVO,
    /* v0.6.21 (R25): Página Inicial nos lugares do Excel — mesma ordem de grupos, mesma posição dos botões dentro de cada grupo */
    { id: 'inicio', nome: 'Página Inicial', grupos: [GRUPO_TRANSFERENCIA,
      { nome: 'Fonte', itens: [['pilha', [
        [['cx', 'fonte'], ['cx', 'tamanho'], 'formatar.aumentarFonte', 'formatar.diminuirFonte'],
        ['formatar.negrito', 'formatar.italico', 'formatar.sublinhado', '|', 'formatar.bordas', '|', 'formatar.preenchimento', 'formatar.corFonte']]]] },
      { nome: 'Alinhamento', itens: [['pilha', [
        ['formatar.cima', 'formatar.meio', 'formatar.baixo', '|', ['t', 'formatar.quebrar']],
        ['formatar.esquerda', 'formatar.centro', 'formatar.direita', '|', ['t', 'formatar.mesclar']]]]] },
      { nome: 'Número', itens: [['pilha', [
        [['cx', 'numero']],
        ['formatar.moeda', 'formatar.porcentagem', 'formatar.milhar', '|', 'formatar.maisCasas', 'formatar.menosCasas']]]] },
      { nome: 'Estilos', itens: [['g', 'formatar.condicional'], ['g', 'inserir.tabela', 'Formatar como tabela']] }, /* parte 2 (D1): os nomes do Excel */
      { nome: 'Células', itens: [['col', [['menu', 'inserir'], ['menu', 'excluir'], ['menu', 'formatar']]]] },
      { nome: 'Edição', itens: [['col', ['formula.autosoma', ['menu', 'preencher'], ['menu', 'limpar']]], ['gm', 'classificarFiltrar'], ['g', 'editar.localizar']] }] }, /* v0.6.30 (D4) */
    /* v0.6.21 parte 2 (R25): Inserir nos lugares do Excel (Tabelas, Ilustrações, Gráficos, Links, Comentários, Texto); o que o Excel não tem fica no fim, em "Do Vértice".
       Nova aba, Inserir linha e Inserir coluna moram em Página Inicial › Células › Inserir, como no Excel. */
    { id: 'inserir', nome: 'Inserir', grupos: [
      { nome: 'Tabelas', itens: [['g', 'dados.dinamica'], ['g', 'inserir.tabela']] },
      { nome: 'Ilustrações', itens: [['g', 'inserir.imagem'], ['g', 'inserir.formas']] },
      { nome: 'Gráficos', itens: [['g', 'inserir.grafico'], ['pilha', [
        [['v', 'inserir.grafico|colunas'], ['v', 'inserir.grafico|linha'], ['v', 'inserir.grafico|pizza'], ['v', 'inserir.grafico|rosca']],
        [['v', 'inserir.grafico|barras'], ['v', 'inserir.grafico|area'], ['v', 'inserir.grafico|dispersao'], ['menu', 'outrosGraficos']]]]] },
      { nome: 'Links', itens: [['g', 'inserir.link'], ['col', ['inserir.tirarLink']]] },
      { nome: 'Comentários', itens: [['g', 'editar.comentar']] },
      { nome: 'Texto', itens: [['g', 'inserir.assinatura']] },
      { nome: 'Do Vértice', itens: [['g', 'inserir.painel'], ['col', ['inserir.status', 'inserir.botao', 'inserir.foto']]] }] },
    /* v0.6.21 parte 3 (R25): Layout da Página nos lugares do Excel (Configurar página, Dimensionar para ajustar, Opções de planilha) */
    { id: 'layout', nome: 'Layout da Página', grupos: [
      { nome: 'Configurar página', itens: [['gm', 'margens'], ['gm', 'orientacao'], ['gm', 'papel'], ['gm', 'areaImp'], ['gm', 'quebras'], ['g', 'impressao.titulos']] },
      { nome: 'Dimensionar para ajustar', itens: [['gm', 'ajustarPag']] },
      { nome: 'Opções de planilha', itens: [['col', [['r', 'exibir.grade', 'Exibir a grade'], ['r', 'impressao.grade', 'Imprimir a grade'], ['r', 'impressao.titulosLC', 'Imprimir A B C e 1 2 3']]]] },
      { nome: 'Do Vértice', itens: [['col', [['r', 'impressao.configurar', 'Configurar página…'], 'impressao.cabecalho', 'arquivo.exportarPDF']]] }] },
    /* v0.6.21 parte 2 (R25): Fórmulas nos lugares do Excel (Biblioteca de funções, Nomes definidos, Auditoria de fórmulas) */
    { id: 'formulas', nome: 'Fórmulas', grupos: [
      { nome: 'Biblioteca de funções', itens: [['g', 'formula.inserir'],
        ['col', [['menu', 'autosoma'], ['menu', 'fnLogica'], ['menu', 'fnTexto']]],
        ['col', [['menu', 'fnData'], ['menu', 'fnBusca'], ['menu', 'fnMat']]],
        ['col', [['menu', 'fnEst'], ['menu', 'fnMais']]]] },
      { nome: 'Nomes definidos', itens: [['g', 'formula.nomes'], ['col', ['formula.nome', 'planilha.cabecalho']]] },
      { nome: 'Auditoria de fórmulas', itens: [['col', ['formula.origem', 'formula.fluxo', 'formula.problemas']], ['g', 'formula.explicar']] },
      { nome: 'Do Vértice', itens: [['g', 'formula.montar']] }] },
    /* v0.6.21 parte 3 (R25): Dados, Revisão e Exibir nos lugares do Excel; o que é só do Vértice fica no fim */
    { id: 'dados', nome: 'Dados', grupos: [
      { nome: 'Classificar e filtrar', itens: [['col', ['dados.az', 'dados.za']], ['g', 'dados.classificar'], ['g', 'dados.filtrar', 'Filtro'], ['col', [['r', 'dados.limparFiltro', 'Limpar'], ['r', 'dados.reaplicar', 'Reaplicar']]]] },
      { nome: 'Ferramentas de dados', itens: [['g', 'dados.textoColunas', 'Texto para colunas'], ['g', 'dados.duplicados', 'Remover duplicatas'], ['g', 'dados.validacao', 'Validação de dados'], ['col', [['r', 'dados.circular', 'Circular inválidos'], ['r', 'dados.limparCirculos', 'Limpar círculos']]]] },
      /* v0.6.37: Estrutura de tópicos, como no Excel (o Subtotal entra na v0.6.38) */
      { nome: 'Estrutura de tópicos', itens: [['g', 'dados.agrupar', 'Agrupar'], ['g', 'dados.desagrupar', 'Desagrupar'], ['col', [['r', 'dados.mostrarDetalhe', 'Mostrar detalhe'], ['r', 'dados.ocultarDetalhe', 'Ocultar detalhe'], ['r', 'dados.limparEstrutura', 'Limpar estrutura']]]] },
      /* v0.6.25: no lugar do grupo Análise do Excel (Análise de Dados) */
      { nome: 'Análise', itens: [['g', 'dados.estatistica', 'Estatística descritiva'], ['g', 'dados.amostra', 'Amostragem']] }] },
    { id: 'revisao', nome: 'Revisão', grupos: [
      { nome: 'Revisão de texto', itens: [['g', 'revisao.ortografia']] },
      { nome: 'Comentários', itens: [['g', 'editar.comentar', 'Novo comentário'], ['g', 'revisao.comentarios', 'Mostrar comentários']] },
      { nome: 'Proteger', itens: [['g', 'revisao.travar', 'Proteger planilha']] },
      { nome: 'Alterações', itens: [['g', 'arquivo.versoes', 'Versões e revisões']] }] },
    { id: 'exibir', nome: 'Exibir', grupos: [
      { nome: 'Mostrar', itens: [['col', [['r', 'exibir.grade', 'Linhas de grade'], ['r', 'exibir.barraFormula', 'Barra de fórmulas']]], ['col', ['exibir.abaGrafico', 'exibir.folhaClara']]] },
      { nome: 'Zoom', itens: [['g', 'exibir.zoom'], ['g', 'exibir.zoom100', '100%']] },
      { nome: 'Janela', itens: [['gm', 'congelar']] }, ...GRUPOS_EXIBIR] },
  ],
  docx: [ABA_ARQUIVO,
    { id: 'inicio', nome: 'Página Inicial', grupos: [GRUPO_TRANSFERENCIA,
      { nome: 'Fonte', itens: [['lin', ['formatar.negrito', 'formatar.italico', 'formatar.sublinhado', 'formatar.corFonte']]] },
      { nome: 'Parágrafo', itens: [['lin', ['formatar.lista', 'formatar.numerada', 'formatar.esquerda', 'formatar.centro', 'formatar.direita']]] },
      { nome: 'Estilos', itens: [['g', 'formatar.titulo']] },
      { nome: 'Edição', itens: [['g', 'editar.localizar']] }] },
    { id: 'inserir', nome: 'Inserir', grupos: [
      { nome: 'Inserir', itens: [['g', 'inserir.tabela'], ['g', 'inserir.imagem'], ['g', 'inserir.grafico'], ['g', 'inserir.link']] },
      { nome: 'Formulário', itens: [['g', 'inserir.campo'], ['g', 'inserir.checklist'], ['g', 'inserir.assinatura']] }] },
    { id: 'layout', nome: 'Layout', grupos: [
      { nome: 'Página', itens: [['g', 'pagina.orientacao'], ['g', 'pagina.margens'], ['g', 'pagina.quebra']] },
      { nome: 'Documento', itens: [['g', 'pagina.cabecalho'], ['g', 'pagina.sumario']] }] },
    { id: 'revisao', nome: 'Revisão', grupos: [
      { nome: 'Revisão', itens: [['g', 'revisao.ortografia'], ['g', 'editar.comentar'], ['g', 'revisao.controlar']] },
      { nome: 'Revisões do documento', itens: [['g', 'revisao.concluir'], ['g', 'revisao.comparar'], ['g', 'arquivo.versoes']] }] },
    { id: 'exibir', nome: 'Exibir', grupos: [{ nome: 'Documento', itens: [['g', 'exibir.leitura'], ['g', 'exibir.zoom']] }, ...GRUPOS_EXIBIR] },
  ],
  postits: [ABA_ARQUIVO,
    { id: 'inicio', nome: 'Página Inicial', grupos: [GRUPO_TRANSFERENCIA,
      { nome: 'Editar', itens: [['lin', ['editar.duplicar', 'editar.excluir', 'editar.selecionarTudo', 'editar.localizar', 'editar.historico'], 3]] },
      { nome: 'Fonte', itens: [['lin', ['formatar.negrito', 'formatar.italico', 'formatar.sublinhado', 'formatar.corFonte', 'formatar.preenchimento'], 3]] },
      { nome: 'Alinhamento', itens: [['lin', ['formatar.esquerda', 'formatar.centro', 'formatar.direita']]] }] },
    { id: 'inserir', nome: 'Inserir', grupos: [
      { nome: 'Quadro', itens: [['g', 'inserir.postit'], ['g', 'inserir.seta'], ['g', 'inserir.proximo'], ['g', 'inserir.texto'], ['g', 'inserir.pagina'], ['g', 'inserir.legenda']] },
      { nome: 'Fluxograma', itens: [['g', 'inserir.forma'], ['col', ['inserir.processo', 'inserir.decisao', 'inserir.inicio']], ['col', ['inserir.dados']], ['g', 'inserir.modelo']] },
      { nome: 'Objetos', itens: [['g', 'inserir.imagem'], ['g', 'inserir.assinatura'], ['g', 'inserir.link'], ['g', 'inserir.grafico']] }] },
    { id: 'organizar', nome: 'Organizar', grupos: [
      { nome: 'Visões', itens: [['g', 'organizar.quadro'], ['g', 'organizar.kanban'], ['g', 'organizar.raias']] },
      { nome: 'Ordem', itens: [['col', ['organizar.frente', 'organizar.tras']]] },
      { nome: 'Prioridade', itens: [['g', 'organizar.ordenarGut']] },
      { nome: 'Reunião', itens: [['g', 'organizar.temporizador']] }] },
    { id: 'revisao', nome: 'Revisão', grupos: [
      { nome: 'Revisão', itens: [['g', 'revisao.ortografia'], ['g', 'editar.comentar']] }] },
    { id: 'exibir', nome: 'Exibir', grupos: [{ nome: 'Quadro', itens: [['g', 'exibir.ajustar'], ['g', 'exibir.zoom'], ['g', 'exibir.minimapa'], ['g', 'exibir.codigos'], ['g', 'exibir.ferramentas'], ['g', 'exibir.assistente']] }, ...GRUPOS_EXIBIR] },
  ],
};

export const BARRA_CURTA = {
  planilha: ['editar.desfazer', 'editar.refazer', 'editar.historico', '|', 'formatar.negrito', 'formatar.italico', 'formatar.preenchimento', 'formatar.moeda', 'formatar.porcentagem', '|', 'formula.inserir', 'formula.autosoma', 'exibir.congelar'],
  docx: ['editar.desfazer', 'editar.refazer', '|', 'formatar.negrito', 'formatar.italico', 'formatar.titulo', 'formatar.lista', '|', 'inserir.tabela', 'inserir.imagem', 'inserir.campo'],
  postits: ['editar.desfazer', 'editar.refazer', 'editar.historico', '|', 'inserir.postit', 'inserir.forma', 'inserir.seta', 'inserir.proximo', '|', 'formatar.preenchimento', 'editar.excluir', '|', 'organizar.kanban', 'exibir.ajustar'],
};

/** v0.6.3: aba que só aparece com um gráfico selecionado (como no Excel) */
export const ABA_GRAFICO = { id: 'grafico', nome: 'Gráfico', contextual: true, grupos: [
  { nome: 'Gráfico', itens: [['g', 'grafico.editar'], ['g', 'grafico.estilo'], ['g', 'grafico.cores'], ['g', 'grafico.semaforo'], ['g', 'grafico.erro']] },
  { nome: 'Usar de novo', itens: [['g', 'grafico.duplicar'], ['g', 'grafico.modelo'], ['g', 'grafico.imagem']] }, /* v0.6.7 */
  { nome: 'Remover', itens: [['g', 'grafico.excluir']] },
  { nome: 'Faixa', itens: [['g', 'exibir.abaGrafico']] }] };

/** v0.6.7: aba que aparece quando a aba da planilha é um Painel */
export const ABA_PAINEL = { id: 'painel', nome: 'Painel', contextual: true, grupos: [
  { nome: 'Pôr no painel', itens: [['g', 'painel.grafico'], ['g', 'painel.numero'], ['g', 'painel.texto'], ['g', 'painel.tabela']] },
  { nome: 'Peça', itens: [['g', 'painel.mudar'], ['g', 'painel.excluir']] },
  { nome: 'Painel', itens: [['g', 'painel.arrumar'], ['g', 'painel.pdf']] }] };

/** v0.6.19: aba que aparece com a célula dentro de uma tabela (como a "Design da Tabela" do Excel; não abre sozinha) */
export const ABA_TABELA = { id: 'tabela', nome: 'Design da Tabela', contextual: true, grupos: [
  { nome: 'Propriedades', itens: [['g', 'tabela.nome'], ['g', 'tabela.redimensionar']] },
  { nome: 'Ferramentas', itens: [['g', 'tabela.converter']] },
  { nome: 'Opções de estilo', itens: [['col', ['tabela.totais', 'tabela.listras', 'tabela.listrasCol']], ['col', ['tabela.primeira', 'tabela.ultima', 'tabela.filtro']]] },
  { nome: 'Totais', itens: [['g', 'tabela.totalColuna']] },
  { nome: 'Estilos', itens: [['g', 'tabela.estilos']] }] };

/** Abas da faixa do módulo, só com o que vale nele. ctx.grafico: há um gráfico selecionado; ctx.painel: a aba é um Painel. */
export function abasDoModulo(mod, ctx = {}) {
  const vale = (id) => PorId[id] && valeNoModulo(PorId[id], mod);
  const base = [...(FAIXAS[mod] || []), ...(mod === 'planilha' && ctx.painel ? [ABA_PAINEL] : []), ...(mod === 'planilha' && ctx.tabela && !ctx.grafico ? [ABA_TABELA] : []), ...(mod === 'planilha' && ctx.grafico ? [ABA_GRAFICO] : [])];
  return base.map((aba) => ({
    ...aba,
    grupos: aba.grupos.map((g) => ({
      ...g,
      itens: g.itens.map(([tipo, x, r]) => [tipo, tipo === 'pilha'
        ? x.map((fila) => fila.filter((i) => i === '|' || (typeof i === 'string' ? vale(i) : i[0] === 'cx' || i[0] === 'menu' || vale(i[1].split('|')[0])))).filter((fila) => fila.length)
        : Array.isArray(x) ? x.filter((i) => (typeof i === 'string' ? vale(i) : i[0] === 'r' ? vale(i[1]) : true)) : x, tipo === 'g' ? r : undefined])
        .filter(([tipo, x]) => (tipo === 'gm' ? !!MENUS_FAIXA[x] : Array.isArray(x) ? x.length : vale(x))),
    })).filter((g) => g.itens.length),
  }));
}

/* Rótulos curtos na faixa (o nome completo fica no "title" e na busca) */
export const ROTULO_CURTO = {
  'formatar.quebrar': 'Quebrar texto', 'formatar.mesclar': 'Mesclar', 'editar.pincel': 'Pincel',
  'exibir.abaGrafico': 'Aba Gráfico',
  'inserir.tirarLink': 'Tirar link',
  'grafico.editar': 'Editar', 'grafico.estilo': 'Estilo rápido', 'grafico.cores': 'Cores', 'grafico.semaforo': 'Semáforo', 'grafico.excluir': 'Excluir',
  'grafico.imagem': 'Baixar imagem', 'grafico.duplicar': 'Duplicar', 'grafico.modelo': 'Guardar estilo', 'grafico.erro': 'Barras de erro',
  'tabela.nome': 'Nome', 'tabela.redimensionar': 'Redimensionar', 'tabela.converter': 'Converter em intervalo', 'tabela.totalColuna': 'Total da coluna', 'tabela.estilos': 'Estilos',
  'inserir.painel': 'Painel', 'painel.grafico': 'Gráfico', 'painel.numero': 'Número', 'painel.texto': 'Texto', 'painel.tabela': 'Tabela',
  'painel.arrumar': 'Arrumar', 'painel.pdf': 'PDF', 'painel.mudar': 'Mudar', 'painel.excluir': 'Excluir',
  'exibir.faixaTudo': 'Mostrar tudo', 'exibir.faixaAbas': 'Só as abas', 'exibir.faixaOculta': 'Esconder',
  'exibir.topoCompleto': 'Completa', 'exibir.topoCompacto': 'Só as abas', 'exibir.barraFormula': 'Barra fx',
  'exibir.menuCompleto': 'Completo', 'exibir.menuIcones': 'Só ícones', 'exibir.menuOculto': 'Esconder',
  'exibir.layoutA': 'Faixa Excel', 'exibir.layoutB': 'Barra e painel', 'exibir.painel': 'Painel lateral',
  'arquivo.lixeira': 'Lixeira', 'arquivo.versoes': 'Versões', 'arquivo.cancelar': 'Cancelar',
  'formula.origem': 'De onde vem / quem usa', 'formula.explicar': 'Explicar conta', 'formula.fluxo': 'Desenhar a conta', 'formula.problemas': 'Verificação de erros', 'formula.montar': 'Montar a conta', 'inserir.botao': 'Botão de aba',
  'inserir.formas': 'Formas', 'inserir.status': 'Coluna de status', 'inserir.foto': 'Foto na célula', 'inserir.assinatura': 'Linha de assinatura', 'inserir.imagem': 'Imagens',
  'inserir.proximo': 'Próximo passo', 'dados.dinamica': 'Tabela dinâmica', 'dados.duplicados': 'Duplicados',
  'dados.validacao': 'Validação', 'dados.textoColunas': 'Texto para colunas', 'dados.agrupar': 'Agrupar', 'dados.desagrupar': 'Desagrupar', 'dados.mostrarDetalhe': 'Mostrar detalhe', 'dados.ocultarDetalhe': 'Ocultar detalhe', 'dados.limparEstrutura': 'Limpar estrutura', 'dados.circular': 'Circular inválidos', 'dados.limparCirculos': 'Limpar círculos', 'dados.estatistica': 'Estatística', 'dados.amostra': 'Amostragem', 'formatar.condicional': 'Formatação condicional', 'editar.localizar': 'Localizar',
  'arquivo.exportarPDF': 'Exportar PDF', 'arquivo.interno': 'Documento interno', 'arquivo.camposCwork': 'Campos do Cwork', 'arquivo.compartilharCwork': 'Compartilhar com o Cwork', 'arquivo.exportarImagem': 'Exportar PNG', 'arquivo.lancar': 'Lançar na pasta',
  'arquivo.abrir': 'Abrir Excel', 'arquivo.exportarExcel': 'Salvar como Excel', 'arquivo.relatorioExcel': 'O que veio do Excel', 'arquivo.baixarOriginal': 'Baixar original',
  'editar.comentar': 'Comentário', 'revisao.comentarios': 'Comentários', 'organizar.temporizador': 'Temporizador', 'revisao.comparar': 'Comparar',
  'revisao.concluir': 'Concluir revisão', 'pagina.cabecalho': 'Cabeçalho do POP', 'pagina.orientacao': 'Orientação',
  'exibir.congelar': 'Congelar', 'exibir.grade': 'Linhas de grade', 'exibir.leitura': 'Modo leitura',
  'exibir.relevo': 'Relevo', 'exibir.mesa': 'Mesa', 'exibir.telaCheia': 'Tela cheia', 'formatar.titulo': 'Título', 'inserir.campo': 'Campo',
  'editar.colar': 'Colar', 'inserir.processo': 'Atividade', 'inserir.decisao': 'Decisão', 'inserir.inicio': 'Início/Fim',
  'inserir.dados': 'Entrada/Saída', 'inserir.pagina': 'Página', 'inserir.legenda': 'Legenda', 'inserir.modelo': 'Modelos', 'organizar.ordenarGut': 'Ordenar GUT', 'exibir.ferramentas': 'Barra de ferramentas', 'exibir.assistente': 'Assistente', 'organizar.quadro': 'Quadro livre', 'organizar.frente': 'Para a frente',
  'organizar.tras': 'Para trás', 'exibir.ajustar': 'Ajustar à tela', 'exibir.codigos': 'Códigos Q',
  'editar.excluir': 'Excluir', 'editar.selecionarTudo': 'Selecionar tudo', 'formatar.preenchimento': 'Cor',
  'editar.duplicar': 'Duplicar', 'inserir.texto': 'Texto solto',
  'editar.historico': 'Linha do tempo', 'planilha.inserirLinha': 'Inserir linha', 'planilha.inserirColuna': 'Inserir coluna',
  'planilha.excluirLinha': 'Excluir linha', 'planilha.excluirColuna': 'Excluir coluna', 'planilha.limparConteudo': 'Limpar conteúdo',
  'formatar.limpar': 'Limpar formatos', 'planilha.novaAba': 'Nova aba', 'formula.nome': 'Definir nome', 'formula.nomes': 'Gerenciador de nomes',
  'planilha.cabecalho': 'Linha de títulos', 'exibir.folhaClara': 'Folha clara', 'planilha.ocultarLinha': 'Ocultar linhas',
  'planilha.ocultarColuna': 'Ocultar colunas', 'planilha.reexibir': 'Reexibir linhas', 'planilha.reexibirColuna': 'Reexibir colunas', 'formula.inserir': 'Inserir função', 'formula.autosoma': 'AutoSoma',
};

/** Botão de comando. tipo: g grande · s pequeno · i só ícone · t ícone e texto.
    prim = botão principal da aba · soIcone = estilo E (o nome fica só na dica, mas continua para quem usa leitor de tela) */
export function BotaoCmd({ id, tipo = 'g', cx, rotulo, prim, soIcone }) {
  const cmd = PorId[id];
  if (!cmd) return null;
  const chega = chegaNa(cmd, cx.mod);
  const bloq = cx.bloqueado(id);
  const ligado = cx.ligado(id);
  const info = dicaDoComando(cmd, cx.mod);
  const nota = [chega ? textoChega(chega).replace(/^c/, 'C') + '.' : '', bloq || ''].filter(Boolean).join(' ');
  const titulo = cmd.nome + (info.atalho ? ` (${info.atalho})` : '') + (nota ? ` — ${nota}` : '');
  const classe = { g: 'rbb', s: 'rbs', i: 'rbi', t: 'tlab' }[tipo] + (ligado ? ' on' : '') + (chega ? ' futuro' : '');
  const ic = ICONE_FAIXA[id] ? 'n:' + ICONE_FAIXA[id] : cmd.ic;
  return (
    <button type="button" className={classe} aria-label={tipo === 'i' ? titulo : undefined} data-nota={nota || undefined} title={soIcone && tipo !== 'i' ? titulo : undefined}
      aria-pressed={typeof ligado === 'boolean' ? ligado : undefined} disabled={!!bloq} data-cmd={id} data-fam={id.split('.')[0]} data-prim={prim ? '' : undefined} onClick={() => cx.executar(id)}>
      {tipo === 'g' ? <span className="q"><Icone n={ic} /></span> : <Icone n={ic} />}
      {tipo !== 'i' && <span className="rot">{rotulo || cmd.nome}</span>}
    </button>
  );
}

/* ---------- v0.6.21 (R25): peças da faixa igual ao Excel ---------- */

/* As listas e as caixas da faixa (só dados) ficam em faixaMenus.js (v0.6.21 parte 3: faixa.jsx não passa de 800 linhas) */

/** Lista que nasce do botão (cresce a partir dele e fecha encolhendo — regra de fluidez, letra c).
    Fecha com Esc (uma camada), com clique fora e ao escolher; as setas do teclado andam pelos itens. */
function ListaFaixa({ ancora, fechar, rotulo, estreita, children }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    const a = ancora.current;
    if (!a) return;
    const r = a.getBoundingClientRect(), larg = estreita ? 76 : 232;
    const left = Math.max(8, Math.min(r.left, innerWidth - larg - 8));
    setPos({ left, top: r.bottom + 4, minWidth: Math.max(larg, estreita ? 0 : r.width), maxHeight: Math.max(160, innerHeight - r.bottom - 16), origem: (r.left - left + 12) + 'px 0' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!pos || !ref.current) return;
    const alvo = ref.current.querySelector('[aria-checked=true]') || ref.current.querySelector('button:not(:disabled)');
    if (alvo) alvo.focus({ preventScroll: true });
    if (alvo && alvo.scrollIntoView) alvo.scrollIntoView({ block: 'nearest' });
  }, [pos]);
  useEffect(() => {
    const fora = (ev) => { if (!ev.target.closest('.rb-lista') && !(ancora.current && ancora.current.contains(ev.target))) fechar(); };
    const some = () => fechar();
    addEventListener('mousedown', fora); addEventListener('resize', some);
    return () => { removeEventListener('mousedown', fora); removeEventListener('resize', some); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  usarEsc(() => { fechar(); if (ancora.current) ancora.current.focus(); }, true);
  const tecla = (ev) => {
    if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp' && ev.key !== 'Home' && ev.key !== 'End') return;
    ev.preventDefault();
    const bs = [...ref.current.querySelectorAll('button:not(:disabled)')], i = bs.indexOf(document.activeElement);
    const n = ev.key === 'Home' ? 0 : ev.key === 'End' ? bs.length - 1 : (i + (ev.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length;
    if (bs[n]) bs[n].focus();
  };
  if (!pos) return null;
  return createPortal(
    <div ref={ref} className={'rb-lista' + (estreita ? ' estreita' : '')} role="menu" aria-label={rotulo} onKeyDown={tecla}
      style={{ left: pos.left, top: pos.top, minWidth: pos.minWidth, maxHeight: pos.maxHeight, transformOrigin: pos.origem }}>{children}</div>,
    document.querySelector('.app') || document.body);
}

/* Botão pequeno com seta: abre a lista de comandos de um grupo.
   Item da lista: id de comando · '-' separador · { cab } título de seção · { id: 'comando|valor', nome, dica? } escolha que já leva o valor.
   soIcone: dentro da pilha (só o desenho). direto (AutoSoma): o botão faz a conta e a seta ao lado abre a lista, como no Excel. */
function BotaoMenuFaixa({ chave, cx, soIcone, grande }) {
  const m = MENUS_FAIXA[chave];
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const itens = (typeof m.itens === 'function' ? m.itens() : m.itens).concat(m.fim ? ['-', { ...m.fim, fim: true }] : []);
  const base = (x) => (typeof x === 'string' ? x : x.id).split('|')[0];
  const cmds = itens.filter((x) => x !== '-' && !x.cab);
  const todosBloq = cmds.every((x) => cx.bloqueado(base(x)));
  const fam = (m.direto || (cmds[0] ? base(cmds[0]) : '')).split('.')[0] || undefined; /* v0.6.31: cor da família pelo 1º comando da lista */
  const atual = m.valor && cx.valorDe ? cx.valorDe(m.valor) : undefined; /* parte 3: a lista marca o que vale hoje (margens, papel, congelado...) */
  const lista = aberto && (
    <ListaFaixa ancora={ref} fechar={() => setAberto(false)} rotulo={m.nome}>
      {itens.map((x, i) => {
        if (x === '-') return <span className="rb-lista-sep" key={'s' + i} />;
        if (x.cab) return <span className="rb-lista-cab" key={'c' + i}>{x.cab}</span>;
        const id = typeof x === 'string' ? x : x.id;
        const cmd = PorId[base(x)];
        if (!cmd) return null;
        const bloq = cx.bloqueado(base(x)), info = dicaDoComando(cmd, cx.mod), puro = typeof x === 'string';
        const ic = puro ? (ICONE_FAIXA[id] ? 'n:' + ICONE_FAIXA[id] : cmd.ic) : x.ic;
        const ligado = m.marcaLigado && cx.ligado ? cx.ligado(base(x)) === true : false; /* v0.6.30: lista de opções que ligam e desligam */
        const marcado = (!puro && x.v !== undefined && x.v === atual) || ligado;
        return (
          <button key={id} type="button" data-fam={base(x).split('.')[0]} role={!puro && x.v !== undefined ? 'menuitemradio' : m.marcaLigado ? 'menuitemcheckbox' : 'menuitem'} aria-checked={(!puro && x.v !== undefined) || m.marcaLigado ? marcado : undefined}
            className={'rb-lista-it' + (m.classe ? ' ' + m.classe : '') + (x.fim ? ' fim' : '') + (marcado ? ' on' : '')} data-cmd={id} data-dica={x.dica} disabled={!!bloq} title={bloq || undefined}
            onClick={() => { setAberto(false); cx.executar(id); }}>
            {ic && <Icone n={ic} />}<span>{puro ? cmd.nome : x.nome}</span>{(puro || id === m.direto) && info.atalho && <kbd>{info.atalho}</kbd>}{marcado && <Icone n="check" className="ok" />}
          </button>
        );
      })}
    </ListaFaixa>
  );
  if (m.direto) {
    return (
      <span className="rb-duplo">
        <BotaoCmd id={m.direto} tipo="s" cx={cx} rotulo={m.nome} />
        <button ref={ref} type="button" className={'rbs rb-abre rb-so-seta' + (aberto ? ' aberto' : '')} data-menu-faixa={chave} data-fam={fam} data-dica={m.dica} aria-label={m.seta} aria-haspopup="menu" aria-expanded={aberto}
          disabled={todosBloq} onClick={() => setAberto(!aberto)}><Icone n="chevronBaixo" className="rb-seta" /></button>
        {lista}
      </span>
    );
  }
  if (grande) {
    return (
      <>
        <button ref={ref} type="button" className={'rbb rb-abre' + (aberto ? ' aberto' : '')} data-menu-faixa={chave} data-fam={fam} data-dica={m.dica} aria-haspopup="menu" aria-expanded={aberto}
          disabled={todosBloq} title={todosBloq ? cx.bloqueado(base(cmds[0])) : undefined} onClick={() => setAberto(!aberto)}>
          <span className="q"><Icone n={m.ic} /></span><span className="rot">{m.nome.includes(' ') ? m.nome.slice(0, m.nome.lastIndexOf(' ') + 1) : ''}<span className="rb-nw">{m.nome.slice(m.nome.lastIndexOf(' ') + 1)}<Icone n="chevronBaixo" className="rb-seta" /></span></span>
        </button>
        {lista}
      </>
    );
  }
  return (
    <>
      <button ref={ref} type="button" className={(soIcone ? 'rbi rb-abre' : 'rbs rb-abre') + (aberto ? ' aberto' : '')} data-menu-faixa={chave} data-fam={fam} data-dica={m.dica} aria-haspopup="menu" aria-expanded={aberto}
        aria-label={soIcone ? m.nome : undefined} disabled={todosBloq} title={todosBloq ? cx.bloqueado(base(cmds[0])) : undefined} onClick={() => setAberto(!aberto)}>
        <Icone n={m.ic} />{!soIcone && <span className="rot">{m.curto || m.nome}</span>}{!soIcone && <Icone n="chevronBaixo" className="rb-seta" />}
      </button>
      {lista}
    </>
  );
}

/* Ícone que já leva o valor (os tipos de gráfico do grupo Gráficos): "comando|valor" */
function BotaoValor({ id, cx }) {
  const [cmd, v] = id.split('|');
  const g = GRAFICOS_NA_FAIXA[v];
  if (!g || !PorId[cmd]) return null;
  const bloq = cx.bloqueado(cmd);
  return (
    <button type="button" className="rbi" data-cmd={id} data-dica={g.dica} aria-label={'Gráfico de ' + g.nome.toLowerCase()} disabled={!!bloq} title={bloq || undefined} onClick={() => cx.executar(id)}>
      <Icone n={g.ic} />
    </button>
  );
}

/* Caixa com o valor da célula ativa; a lista troca o valor na hora */
function CaixaFaixa({ chave, cx }) {
  const c = CAIXAS_FAIXA[chave];
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const bloq = cx.bloqueado(c.cmd);
  const v = cx.valorDe ? cx.valorDe(c.valor) : undefined;
  const texto = c.mostra(v);
  return (
    <>
      <button ref={ref} type="button" className={'rb-cx' + (aberto ? ' aberto' : '')} data-cx={chave} data-dica={c.dica} style={{ width: c.largura }}
        aria-haspopup="menu" aria-expanded={aberto} aria-label={c.nome + ': ' + texto} disabled={!!bloq} title={bloq || undefined} onClick={() => setAberto(!aberto)}>
        <span className="rb-cx-v" key={texto}>{texto}</span><Icone n="chevronBaixo" className="rb-seta" />
      </button>
      {aberto && (
        <ListaFaixa ancora={ref} fechar={() => setAberto(false)} rotulo={c.nome} estreita={c.estreita}>
          {c.opcoes().map((o) => (
            <button key={o.id} type="button" role="menuitemradio" aria-checked={o.v === (v ?? '')} className={'rb-lista-it' + (o.v === (v ?? '') ? ' on' : '')} data-valor={o.id} style={o.estilo}
              onClick={() => { setAberto(false); cx.executar(o.id); }}>
              <span>{o.nome}</span>{o.v === (v ?? '') && <Icone n="check" className="ok" />}
            </button>
          ))}
          {c.fim && <span className="rb-lista-sep" />}
          {c.fim && <button type="button" role="menuitem" className="rb-lista-it fim" data-cmd={c.fim.id} onClick={() => { setAberto(false); cx.executar(c.fim.id); }}><span>{c.fim.nome}</span></button>}
        </ListaFaixa>
      )}
    </>
  );
}

/* Uma linha da pilha: ícones, separadores, caixas de valor e botões com nome */
function LinhaPilha({ itens, b }) {
  return (
    <div className="rb-fila">
      {itens.map((x, k) => x === '|'
        ? <span className="rb-div" key={k} aria-hidden="true" />
        : typeof x === 'string'
          ? <BotaoCmd key={x} id={x} tipo="i" {...b} />
          : x[0] === 'cx'
            ? <CaixaFaixa key={x[1]} chave={x[1]} cx={b.cx} />
            : x[0] === 'v'
              ? <BotaoValor key={x[1]} id={x[1]} cx={b.cx} />
              : x[0] === 'menu'
                ? <BotaoMenuFaixa key={x[1]} chave={x[1]} cx={b.cx} soIcone />
                : <BotaoCmd key={x[1]} id={x[1]} tipo="s" {...b} rotulo={ROTULO_CURTO[x[1]]} />)}
    </div>
  );
}

function GrupoFaixa({ g, cx, prim, soIcone, ultimo }) {
  const b = { cx, prim: undefined, soIcone };
  return (
    <div className="rb-g" role="group" aria-label={g.nome} data-ultimo={ultimo ? '' : undefined}>
      <div className="rb-i">
        {g.itens.map(([tipo, x, colunas], j) => tipo === 'g'
          ? <BotaoCmd key={j} id={x} {...b} prim={x === prim} rotulo={colunas || ROTULO_CURTO[x]} />
          : tipo === 'gm'
            ? <BotaoMenuFaixa key={j} chave={x} cx={cx} grande />
          : tipo === 'pilha'
            ? <div className="rb-pilha" key={j}>{x.map((fila, k) => <LinhaPilha key={k} itens={fila} b={b} />)}</div>
            : tipo === 'col'
              ? <div className="rb-col" key={j}>{x.map((id) => (typeof id === 'string'
                ? <BotaoCmd key={id} id={id} tipo="s" {...b} rotulo={ROTULO_CURTO[id]} />
                : id[0] === 'r'
                  ? <BotaoCmd key={id[1]} id={id[1]} tipo="s" {...b} rotulo={id[2]} />
                  : <BotaoMenuFaixa key={id[1]} chave={id[1]} cx={cx} />))}</div>
              : <div className="rb-lin" key={j} style={{ gridTemplateColumns: `repeat(${colunas || (x.length <= 4 ? x.length : Math.ceil(x.length / 2))}, 28px)` }}>
                {x.map((id) => <BotaoCmd key={id} id={id} tipo="i" {...b} />)}
              </div>)}
      </div>
      <div className="rb-n">{g.nome}</div>
    </div>
  );
}

/* A faixa nunca passa da tela: o que não cabe vai para "Mais" (as larguras dos grupos são medidas e guardadas) */
function Faixa({ aba, cx, flutua, cel, estilo }) {
  const abas = abasDoModulo(cx.mod, cx.contexto);
  const atual = abas.find((a) => a.id === aba) || abas[1];
  const prim = (PRINCIPAL[cx.mod] || {})[atual.id];
  const ref = useRef(null);
  const larguras = useRef({});
  const [larg, setLarg] = useState(0);
  const [est, setEst] = useState({ corte: null, medir: true, aperto: 0 }); /* v0.6.21: aperto 1 = antes de mandar grupo para o "Mais", os botões de linha ficam só com o ícone (o Excel faz igual) */
  const [maisAberto, setMaisAberto] = useState(false);
  /* tela estreita (celular ou janela pequena): a faixa rola de lado; setas mostram que tem mais */
  const [lados, setLados] = useState({ esq: false, dir: false });
  const medirLados = () => {
    const el = ref.current;
    if (!el || !cel) { setLados((x) => (x.esq || x.dir ? { esq: false, dir: false } : x)); return; }
    const esq = el.scrollLeft > 4, dir = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setLados((x) => (x.esq === esq && x.dir === dir ? x : { esq, dir }));
  };
  useEffect(() => { medirLados(); }); // eslint-disable-line react-hooks/exhaustive-deps
  const rolar = (d) => { const el = ref.current; if (el) el.scrollBy({ left: d * Math.max(160, el.clientWidth * 0.6), behavior: 'smooth' }); };
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => { setLarg(el.clientWidth); medirLados(); });
    ro.observe(el);
    return () => ro.disconnect();
  }, [flutua]);
  useLayoutEffect(() => { setEst({ corte: null, medir: true, aperto: 0 }); setMaisAberto(false); }, [atual.id, cx.mod, larg, cel, estilo]);
  useLayoutEffect(() => {
    if (!est.medir || !ref.current) return;
    if (cel) { setEst({ corte: null, medir: false, aperto: 0 }); return; }
    const gs = [...ref.current.querySelectorAll(':scope > .rb-g')];
    const ch = atual.id + ':' + estilo + ':' + est.aperto + ':';
    gs.forEach((g, i) => { larguras.current[ch + i] = g.offsetWidth; });
    const w = gs.map((_, i) => larguras.current[ch + i] || 0);
    /* v0.6.21: o espaço entre os grupos também conta (antes ficava de fora e o último grupo podia passar da tela) */
    const vao = (parseFloat(getComputedStyle(ref.current).columnGap) || 0) * Math.max(0, gs.length - 1);
    const disp = ref.current.clientWidth - 16 - vao;
    let corte = null;
    /* parte 2: três degraus antes do "Mais": 1 = as filas ficam só com o ícone; 2 = a coluna do último grupo também; 3 = todas as colunas */
    if (w.reduce((a, b) => a + b, 0) > disp && est.aperto < 3 && ref.current.querySelector('.rb-pilha, .rb-col')) { setEst({ corte: null, medir: true, aperto: est.aperto + 1 }); return; }
    if (w.reduce((a, b) => a + b, 0) > disp) {
      let acc = 0, n = 0;
      for (const x of w) { if (acc + x > disp - 100) break; /* v0.6.4 (R02): sobra lugar para o "Mais" e para o botão de recolher, também no estilo E */ acc += x; n++; }
      corte = Math.max(1, n);
    }
    setEst({ corte, medir: false, aperto: est.aperto });
  }, [est.medir, est.aperto]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!maisAberto) return undefined;
    const fora = (ev) => { if (!ev.target.closest('.rb-mais-area')) setMaisAberto(false); };
    addEventListener('mousedown', fora);
    return () => removeEventListener('mousedown', fora);
  }, [maisAberto]);
  usarEsc(() => setMaisAberto(false), maisAberto);
  const corte = est.medir ? null : est.corte;
  const naFaixa = corte == null ? atual.grupos : atual.grupos.slice(0, corte);
  const noMais = corte == null ? [] : atual.grupos.slice(corte);
  return (
    <div className={'ribbon' + (flutua ? ' flutua' : '') + (cel ? '' : ' ajustada')} data-estilo={estilo} data-aperto={est.aperto || undefined} role="toolbar" aria-label={'Faixa ' + atual.nome} data-aba={atual.id} ref={ref} onScroll={cel ? medirLados : undefined}>
      {cel && lados.esq && <button type="button" className="rb-rolar esq" aria-label="Ver os botões anteriores" onClick={() => rolar(-1)}><Icone n="setaEsq" /></button>}
      {naFaixa.map((g, i) => <GrupoFaixa g={g} cx={cx} prim={prim} soIcone={estilo === 'E'} ultimo={i === atual.grupos.length - 1} key={atual.id + i} />)}
      {cel && lados.dir && <button type="button" className="rb-rolar dir" aria-label="Tem mais botões: ver os próximos" data-dica="Tem mais|Arraste a faixa para o lado ou toque aqui para ver os outros botões." onClick={() => rolar(1)}><Icone n="setaDir" /></button>}
      {!cel && (
        <button type="button" className="rb-recolher" data-faixa-recolher={flutua ? 'fixar' : 'recolher'}
          aria-label={flutua ? 'Fixar a faixa (mostrar sempre)' : 'Recolher a faixa (só as abas)'} title={flutua ? 'Fixar a faixa' : 'Recolher a faixa'}
          onClick={() => cx.executar(flutua ? 'exibir.faixaTudo' : 'exibir.faixaAbas')}>
          <Icone n={flutua ? 'alfinete' : 'chevronCima'} />
        </button>
      )}
      {noMais.length > 0 && (
        <div className="rb-mais-area">
          <button type="button" className="rbb rb-mais" aria-expanded={maisAberto} aria-label="Mais comandos" data-dica="Mais comandos|Os grupos que não cabem na largura da tela ficam aqui." onClick={() => setMaisAberto(!maisAberto)}>
            <Icone n="mais" /><span>Mais</span>
          </button>
          {maisAberto && <div className="rb-mais-painel card" role="group" aria-label="Mais comandos">{noMais.map((g, i) => <GrupoFaixa g={g} cx={cx} prim={prim} soIcone={estilo === 'E'} key={'m' + i} />)}</div>}
        </div>
      )}
    </div>
  );
}

/* v0.4.9 (L07): no celular, uma barra só com o que mais se usa (como no Excel do Android); o botão "Abas" abre as abas e a faixa completa */
const BARRA_CEL = {
  planilha: ['formatar.negrito', 'formatar.italico', 'formatar.sublinhado', 'formatar.corFonte', 'formatar.preenchimento', '|', 'formatar.centro', 'formatar.moeda', 'formula.autosoma', '|', 'editar.desfazer', 'editar.refazer'],
  docx: ['formatar.negrito', 'formatar.italico', 'formatar.titulo', 'formatar.lista', '|', 'inserir.tabela', 'inserir.imagem', '|', 'editar.desfazer', 'editar.refazer'],
  postits: ['inserir.postit', 'inserir.forma', 'inserir.seta', 'inserir.proximo', '|', 'formatar.preenchimento', 'editar.excluir', '|', 'editar.desfazer', 'editar.refazer'],
};
function BarraCurta({ cx, soIcones, cel, abasAbertas, aoAbas }) {
  const lista = cel ? (BARRA_CEL[cx.mod] || []) : (BARRA_CURTA[cx.mod] || []);
  /* v0.5.1: no celular, desfazer, refazer e Abas ficam fixos na ponta direita; só o resto rola */
  const fixos = cel ? lista.filter((id) => id === 'editar.desfazer' || id === 'editar.refazer') : [];
  const rola = cel ? lista.filter((id) => !fixos.includes(id)) : lista;
  while (cel && rola.length && rola[rola.length - 1] === '|') rola.pop();
  const itens = rola.map((id, i) => (id === '|' ? <span className="sep" key={i} /> : <BotaoCmd key={id} id={id} tipo="i" cx={cx} />));
  return (
    <div className={'tbar' + (soIcones ? ' so-icones' : '') + (cel ? ' cel-rapida' : '')} role="toolbar" aria-label="Barra de ferramentas">
      {cel ? <div className="tbar-rola">{itens}</div> : itens}
      {!cel && <span className="sp" />}
      {cel
        ? (
          <div className="tbar-fixo">
            {fixos.map((id) => <BotaoCmd key={id} id={id} tipo="i" cx={cx} />)}
            <button type="button" className={'tlab abas-cel' + (abasAbertas ? ' on' : '')} aria-expanded={abasAbertas} aria-label="Abas da faixa" onClick={aoAbas}><Icone n={abasAbertas ? 'chevronCima' : 'chevronBaixo'} /><span>Abas</span></button>
          </div>
        )
        : <BotaoCmd id="exibir.painel" tipo="t" cx={cx} rotulo="Painel" />}
    </div>
  );
}

/** v0.6.1: um botão só, como as "Opções de exibição da faixa" do Excel (o menu flutua por cima de tudo:
    antes ele ficava preso dentro da linha das abas e não aparecia, e a faixa não voltava). Ctrl+F1 também mostra/esconde. */
function OpcoesFaixa({ prefs, cx, cel, compacto }) {
  const [aberto, setAberto] = useState(null);
  const ref = useRef(null);
  const menu = useRef(null);
  usarEsc(() => setAberto(null), !!aberto, menu);
  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (ev) => { if (ref.current && !ref.current.contains(ev.target) && menu.current && !menu.current.contains(ev.target)) setAberto(null); };
    const fechar = () => setAberto(null);
    addEventListener('mousedown', fora);
    addEventListener('resize', fechar);
    return () => { removeEventListener('mousedown', fora); removeEventListener('resize', fechar); };
  }, [aberto]);
  const nomes = prefs.layout === 'B' ? ROTULOS.faixaB : { tudo: 'Mostrar a faixa sempre', abas: 'Só as abas (a faixa aparece ao clicar numa aba)', oculta: 'Esconder a faixa e as abas' };
  const cmd = { tudo: 'exibir.faixaTudo', abas: 'exibir.faixaAbas', oculta: 'exibir.faixaOculta' };
  const ic = { tudo: 'faixaTudo', abas: 'faixaAbas', oculta: 'faixaOculta' };
  const abrir = () => {
    if (aberto) { setAberto(null); return; }
    const r = ref.current.getBoundingClientRect();
    setAberto({ top: Math.round(r.bottom + 6), right: Math.max(8, Math.round(innerWidth - r.right)) });
  };
  return (
    <>
      <button ref={ref} type="button" className="iconbtn modo" data-opcoes-faixa aria-label="Opções de exibição da faixa" aria-expanded={!!aberto} aria-haspopup="menu" title="Opções de exibição da faixa" onClick={abrir}>
        {/* v0.6.6 (Grok): não repete a setinha do "Recolher" da faixa: mostra o desenho do modo de agora */}
        <Icone n={ic[prefs.faixa] || 'faixaTudo'} />
      </button>
      {aberto && (
        <div ref={menu} className="faixa-menu" role="menu" aria-label="Opções de exibição da faixa" style={{ position: 'fixed', top: aberto.top, right: aberto.right, maxHeight: Math.max(160, innerHeight - aberto.top - 8), overflowY: 'auto' }} data-esc-local>
          <span className="faixa-menu-cab">Faixa de cima</span>
          {['tudo', 'abas', 'oculta'].map((m) => (
            <button key={m} type="button" role="menuitemradio" aria-checked={prefs.faixa === m} data-faixa-modo={m} className={'faixa-menu-it' + (prefs.faixa === m ? ' on' : '')}
              onClick={() => { cx.executar(cmd[m]); setAberto(null); }}>
              <Icone n={ic[m]} /><span>{nomes[m]}</span>{prefs.faixa === m && <Icone n="check" className="ok" />}
            </button>
          ))}
          {!cel && <>
            <span className="faixa-menu-sep" />
            <button type="button" role="menuitemcheckbox" aria-checked={!compacto} data-topo-alterna className="faixa-menu-it" onClick={() => { cx.executar(compacto ? 'exibir.topoCompleto' : 'exibir.topoCompacto'); setAberto(null); }}>
              <Icone n={compacto ? 'topoCompleto' : 'topoCompacto'} /><span>{compacto ? 'Mostrar a linha do título' : 'Juntar o título com as abas (mais espaço)'}</span>
            </button>
          </>}
          {prefs.faixa !== 'oculta' && prefs.layout === 'A' && cx.setPref && <>
            <span className="faixa-menu-sep" />
            <span className="faixa-menu-cab">Estilo da faixa</span>
            {['auto', 'B', 'C', 'D', 'E'].map((e) => (
              <button key={e} type="button" role="menuitemradio" aria-checked={(prefs.estilo || 'auto') === e} data-faixa-estilo={e} className={'faixa-menu-it' + ((prefs.estilo || 'auto') === e ? ' on' : '')} title={e === 'auto' ? 'B no computador, E no celular' : DICA_ESTILO[e]}
                onClick={() => { cx.setPref('estilo', e); setAberto(null); }}>
                <span className="faixa-menu-letra">{e === 'auto' ? 'Auto' : e}</span><span>{ROTULOS.estilo[e]}</span>{(prefs.estilo || 'auto') === e && <Icone n="check" className="ok" />}
              </button>
            ))}
          </>}
          {cx.setPref && (
            <>
              <span className="faixa-menu-sep" />
              <span className="faixa-menu-cab">Tema</span>
              <div className="faixa-temas" role="group" aria-label="Tema">
                {TEMAS.map(([id]) => {
                  const t = TEMAS.find(([x]) => x === id);
                  if (!t || !AMOSTRAS[id]) return null;
                  return (
                    <button key={id} type="button" className={'faixa-tema' + (prefs.tema === id ? ' on' : '')} data-faixa-tema={id} aria-pressed={prefs.tema === id} title={t[1]} aria-label={'Tema ' + t[1]}
                      onClick={() => { cx.setPref('tema', id); setAberto(null); }}><i style={{ '--tb': AMOSTRAS[id][0], '--ta': AMOSTRAS[id][1] }} /><span>{t[1]}</span></button>
                  );
                })}
                <button type="button" className="faixa-tema-mais" data-faixa-temas-mais onClick={() => { setAberto(null); cx.executar('app.opcoes'); }}>Mais opções de tela…</button>
              </div>
            </>
          )}
          <span className="faixa-menu-dica">Ctrl+F1 mostra ou esconde a faixa</span>
        </div>
      )}
    </>
  );
}

function NomeArquivo({ ficha, cx }) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(ficha.nome);
  const [erro, setErro] = useState('');
  useEffect(() => { setNome(ficha.nome); }, [ficha.nome]);
  const bloq = cx.bloqueado('arquivo.renomear');
  if (!editando) {
    return <button type="button" className="nome" title={bloq || 'Toque para renomear'} disabled={!!bloq} onClick={() => setEditando(true)}>{ficha.nome}</button>;
  }
  const terminar = (salvar) => {
    if (salvar) {
      const e = validarNome(nome);
      if (e) { setErro(e); return; }
      cx.renomear(nome.trim());
    }
    setEditando(false);
    setErro('');
    setNome(ficha.nome);
  };
  return (
    <span style={{ display: 'grid', flex: 1, minWidth: 0 }}>
      <input className="nome" aria-label="Nome do arquivo" autoFocus value={nome} maxLength={120}
        onChange={(ev) => { setNome(ev.target.value); setErro(''); }}
        onKeyDown={(ev) => { if (ev.key === 'Enter') terminar(true); if (ev.key === 'Escape') { ev.stopPropagation(); terminar(false); } }}
        onBlur={() => terminar(true)} />
      {erro && <span className="erro-t" role="alert">{erro}</span>}
    </span>
  );
}

/** v0.6.20 (fluidez, item j): botão de tema na barra de cima; o ícone novo entra no lugar do antigo. */
function BotaoTema({ prefs, cx }) {
  const escuro = prefs.tema === 'dark';
  const [troca, setTroca] = useState(0);
  const rot = escuro ? 'Mudar para o tema Claro' : 'Mudar para o tema Escuro';
  return (
    <button type="button" className={'iconbtn' + (troca ? ' fz-tema' : '')} data-tema-botao={escuro ? 'dark' : 'papel'} aria-label={rot} title={rot}
      onClick={() => { cx.setPref('tema', escuro ? 'papel' : 'dark'); setTroca((n) => n + 1); }}>
      <Icone key={troca} n={escuro ? 'sol' : 'lua'} />
    </button>
  );
}

export function Topo({ titulo, trilha, ficha, salvo, prefs, cx, cel, aba, setAba, faixaTemp, setFaixaTemp, abrirGaveta }) {
  const temArquivo = !!ficha;
  /* v0.6.3: a aba "Gráfico" abre sozinha quando um gráfico é selecionado e volta para a anterior quando deixa de ser */
  const temGrafico = !!(cx.contexto && cx.contexto.grafico);
  const temPainel = !!(cx.contexto && cx.contexto.painel); // v0.6.7
  const temTabela = !!(cx.contexto && cx.contexto.tabela); // v0.6.19
  const antesDoGrafico = useRef('inicio');
  const abaAtual = useRef(aba);
  abaAtual.current = aba;
  useEffect(() => {
    if (temGrafico) { if (abaAtual.current !== 'grafico') { antesDoGrafico.current = abaAtual.current; setAba('grafico'); } }
    else if (abaAtual.current === 'grafico') setAba(temPainel ? 'painel' : antesDoGrafico.current || 'inicio');
  }, [temGrafico]); // eslint-disable-line react-hooks/exhaustive-deps
  /* v0.6.19: a aba "Design da Tabela" não abre sozinha; ao sair da tabela com ela aberta, volta para a Página Inicial */
  useEffect(() => { if (!temTabela && abaAtual.current === 'tabela') setAba(temPainel ? 'painel' : 'inicio'); }, [temTabela]); // eslint-disable-line react-hooks/exhaustive-deps
  /* v0.6.7: na aba Painel a faixa abre a aba "Painel"; ao sair dela volta para a anterior */
  const antesDoPainel = useRef('inicio');
  useEffect(() => {
    if (temPainel) { if (abaAtual.current !== 'painel' && abaAtual.current !== 'grafico') { antesDoPainel.current = abaAtual.current; setAba('painel'); } }
    else if (abaAtual.current === 'painel') setAba(antesDoPainel.current || 'inicio');
  }, [temPainel]); // eslint-disable-line react-hooks/exhaustive-deps
  const mostraMenu = cel || prefs.menu === 'oculto';
  const layoutA = prefs.layout === 'A';
  /* v0.4.9 (L07): no celular as abas ficam escondidas atrás do botão "Abas" da barra rápida */
  const [celAbas, setCelAbas] = useState(() => !!(typeof globalThis !== 'undefined' && globalThis.EFC_CEL_ABAS));
  const celRapida = cel && temArquivo && layoutA;
  const abasLiberadas = !celRapida || celAbas;
  const mostraAbas = temArquivo && layoutA && abasLiberadas && (prefs.faixa !== 'oculta' || faixaTemp);
  const mostraFaixa = temArquivo && layoutA && abasLiberadas && (prefs.faixa === 'tudo' || faixaTemp);
  /* v0.4.7: barra de cima compacta (como no Excel com a faixa recolhida): a linha do título some e o nome, o desfazer e a busca vão para a linha das abas */
  const compacto = mostraAbas && !cel && prefs.topo === 'compacto';
  const abasNav = mostraAbas && (
    <nav className={'tabs' + (compacto ? ' compacta' : '')} aria-label="Abas da faixa">
      {compacto && (
        <span className="tb-mini">
          {mostraMenu && <button type="button" className="iconbtn" aria-label="Abrir menu" onClick={abrirGaveta}><Icone n="menu" /></button>}
          <NomeArquivo ficha={ficha} cx={cx} />
          <span className={'salvo' + (salvo.sujo ? ' sujo' : '')} aria-live="polite" title={salvo.texto}><i /></span>
        </span>
      )}
      {abasDoModulo(cx.mod, cx.contexto).map((a) => (
        <button key={a.id} type="button" data-aba-ctx={a.contextual ? '' : undefined} className={'tab' + (a.contextual ? ' ctx' : '') + (aba === a.id && mostraFaixa ? ' active' : '')} aria-pressed={aba === a.id && mostraFaixa}
          onClick={() => {
            if (prefs.faixa !== 'tudo') setFaixaTemp(!(faixaTemp && aba === a.id));
            setAba(a.id);
          }}>
          {a.nome}
        </button>
      ))}
      <span className="sp" />
      {compacto && (
        <span className="tb-mini-dir">
          <BotaoCmd id="editar.desfazer" tipo="i" cx={cx} />
          <BotaoCmd id="editar.refazer" tipo="i" cx={cx} />
          <BotaoCmd id="editar.historico" tipo="i" cx={cx} />
          <button type="button" className="iconbtn" aria-label={`O que você quer fazer? (${cx.mod === 'planilha' ? 'Alt Q' : 'Ctrl K'})`} title={`O que você quer fazer? (${cx.mod === 'planilha' ? 'Alt Q' : 'Ctrl K'})`} onClick={() => cx.executar('app.buscar')}><Icone n="busca" /></button>
          <BotaoCmd id="exibir.painel" tipo="i" cx={cx} />
          <button type="button" className="iconbtn" aria-label="Opções" title="Opções" onClick={() => cx.executar('app.opcoes')}><Icone n="gear" /></button>
        </span>
      )}
      <OpcoesFaixa prefs={prefs} cx={cx} cel={cel} compacto={compacto} />
    </nav>
  );
  return (
    <header className={'topbar' + (compacto ? ' compacto' : '')}>
      {!compacto && (
      <div className="topbar-row">
        {mostraMenu && <button type="button" className="iconbtn" aria-label="Abrir menu" onClick={abrirGaveta}><Icone n="menu" /></button>}
        <div className="tb-tit">
          {temArquivo ? <NomeArquivo ficha={ficha} cx={cx} /> : trilha !== undefined && !cel ? <p className="tb-trilha" data-trilha>{trilha ? <span>{trilha} / </span> : null}<b><Letras texto={titulo} canal="topo" /></b></p> : <h1><Letras texto={titulo} canal="topo" /></h1>}
          {temArquivo && <span className={'salvo' + (salvo.sujo ? ' sujo' : '')} aria-live="polite"><i />{salvo.texto}</span>}
        </div>
        {temArquivo && <BotaoCmd id="editar.desfazer" tipo="i" cx={cx} />}
        {temArquivo && !cel && <BotaoCmd id="editar.refazer" tipo="i" cx={cx} />}
        {temArquivo && !cel && <BotaoCmd id="editar.historico" tipo="i" cx={cx} />}
        <button type="button" className="busca" onClick={() => cx.executar('app.buscar')}>
          <Icone n="busca" />O que você quer fazer?<kbd>{cx.mod === 'planilha' ? 'Alt Q' : 'Ctrl K'}</kbd>
        </button>
        {cel && <button type="button" className="iconbtn" aria-label="O que você quer fazer?" onClick={() => cx.executar('app.buscar')}><Icone n="busca" /></button>}
        {temArquivo && layoutA && prefs.faixa === 'oculta' && !faixaTemp && (
          <button type="button" className="iconbtn" aria-label="Mostrar a faixa por um momento" title="Mostrar a faixa" onClick={() => setFaixaTemp(true)}><Icone n="faixaTudo" /></button>
        )}
        {temArquivo && (layoutA || prefs.faixa === 'oculta') && <BotaoCmd id="exibir.painel" tipo="i" cx={cx} />}
        <BotaoTema prefs={prefs} cx={cx} />
        <button type="button" className="iconbtn" aria-label="Opções" title="Opções" onClick={() => cx.executar('app.opcoes')}><Icone n="gear" /></button>
      </div>
      )}
      {celRapida && <BarraCurta cx={cx} cel abasAbertas={celAbas} aoAbas={() => setCelAbas(!celAbas)} />}
      {abasNav}
      {mostraFaixa && <Faixa aba={aba} cx={cx} flutua={prefs.faixa !== 'tudo'} cel={cel} estilo={estiloDaFaixa(prefs, cel)} />}
      {temArquivo && !layoutA && prefs.faixa !== 'oculta' && <BarraCurta cx={cx} soIcones={prefs.faixa === 'abas'} />}
    </header>
  );
}
