/* EFCdocs — topo: nome do arquivo, busca, faixa tipo Excel (opção A) e barra curta (opção B). */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TEMAS, AMOSTRAS } from '../nucleo/prefs.js';
import { PorId, chegaNa, valeNoModulo, textoChega } from '../nucleo/comandos.js';
import { ROTULOS, DICA_ESTILO, estiloDaFaixa } from '../nucleo/prefs.js';
import { MAPA as ICONE_FAIXA } from './iconesFaixa.js';
import { validarNome } from '../nucleo/modelo.js';
import { Icone, usarEsc } from './comum.jsx';
import { dicaDoComando } from '../nucleo/dicas.js';

/* item: ['g', id] botão grande · ['col', [ids]] coluna de pequenos · ['lin', [ids]] linha de ícones */
const ABA_ARQUIVO = {
  id: 'arquivo', nome: 'Arquivo', grupos: [
    { nome: 'Arquivo', itens: [['g', 'arquivo.novo'], ['g', 'arquivo.renomear'], ['g', 'arquivo.abrir'], ['g', 'arquivo.exportarExcel'], ['g', 'arquivo.baixarOriginal'], ['g', 'arquivo.relatorioExcel'], ['g', 'arquivo.exportarWord'], ['g', 'arquivo.exportarPDF'], ['g', 'arquivo.exportarImagem'], ['g', 'arquivo.imprimir']] },
    { nome: 'Registro', itens: [['g', 'arquivo.versoes'], ['g', 'arquivo.lancar'], ['g', 'arquivo.lixeira']] },
  ],
};
const GRUPOS_EXIBIR = [
  { nome: 'Barra de cima e faixa', itens: [['col', ['exibir.topoCompleto', 'exibir.topoCompacto']], ['col', ['exibir.faixaTudo', 'exibir.faixaAbas', 'exibir.faixaOculta']]] },
  { nome: 'Menu lateral', itens: [['col', ['exibir.menuCompleto', 'exibir.menuIcones', 'exibir.menuOculto']]] },
  { nome: 'Layout', itens: [['g', 'exibir.painel'], ['col', ['exibir.layoutA', 'exibir.layoutB']]] },
  { nome: 'Aparência', itens: [['col', ['exibir.tema', 'exibir.relevo', 'exibir.mesa']], ['g', 'exibir.telaCheia']] },
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
    { id: 'inicio', nome: 'Página Inicial', grupos: [GRUPO_TRANSFERENCIA,
      { nome: 'Fonte', itens: [['lin', ['formatar.negrito', 'formatar.italico', 'formatar.sublinhado', 'formatar.bordas', 'formatar.preenchimento', 'formatar.corFonte', 'formatar.fonte'], 4]] },
      { nome: 'Alinhamento', itens: [['lin', ['formatar.esquerda', 'formatar.centro', 'formatar.direita', 'formatar.quebrar', 'formatar.mesclar']]] },
      { nome: 'Número', itens: [['lin', ['formatar.moeda', 'formatar.porcentagem', 'formatar.milhar', 'formatar.maisCasas', 'formatar.menosCasas', 'formatar.formatoNumero']]] },
      { nome: 'Células', itens: [['lin', ['planilha.inserirLinha', 'planilha.inserirColuna', 'planilha.excluirLinha', 'planilha.excluirColuna'], 2]] },
      { nome: 'Estilos', itens: [['g', 'formatar.condicional'], ['g', 'inserir.tabela']] },
      { nome: 'Edição', itens: [['g', 'formula.autosoma'], ['lin', ['planilha.limparConteudo', 'formatar.limpar', 'editar.historico'], 3], ['g', 'dados.filtrar'], ['g', 'editar.localizar']] }] },
    { id: 'inserir', nome: 'Inserir', grupos: [
      { nome: 'Planilha', itens: [['g', 'planilha.novaAba'], ['g', 'planilha.inserirLinha'], ['g', 'planilha.inserirColuna']] }, /* v0.6.3 (R02): botões grandes com nome, para não confundir com Nova aba */
      { nome: 'Tabelas', itens: [['g', 'inserir.tabela'], ['g', 'inserir.status'], ['g', 'inserir.foto']] },
      { nome: 'Ilustrações', itens: [['g', 'inserir.imagem'], ['g', 'inserir.formas'], ['g', 'inserir.grafico'], ['g', 'inserir.assinatura']] },
      { nome: 'Navegação', itens: [['g', 'inserir.link'], ['g', 'inserir.tirarLink'], ['g', 'inserir.botao'], ['g', 'editar.comentar']] }] },
    { id: 'layout', nome: 'Layout da Página', grupos: [
      { nome: 'Configurar página', itens: [['g', 'impressao.margens'], ['g', 'impressao.orientacao'], ['g', 'impressao.area'], ['g', 'impressao.quebra'], ['g', 'impressao.titulos'], ['col', ['impressao.limparArea', 'impressao.semQuebras', 'impressao.cabecalho']]] },
      { nome: 'Ajustar e imprimir', itens: [['g', 'impressao.ajustar'], ['g', 'impressao.configurar'], ['g', 'arquivo.exportarPDF']] }] },
    { id: 'formulas', nome: 'Fórmulas', grupos: [
      { nome: 'Funções', itens: [['g', 'formula.inserir'], ['g', 'formula.autosoma']] },
      { nome: 'Nomes', itens: [['g', 'formula.nome'], ['g', 'formula.nomes'], ['g', 'planilha.cabecalho']] },
      { nome: 'Entender a conta', itens: [['g', 'formula.explicar'], ['g', 'formula.origem'], ['g', 'formula.fluxo'], ['g', 'formula.problemas']] },
      { nome: 'Para o leigo', itens: [['g', 'formula.montar']] }] },
    { id: 'dados', nome: 'Dados', grupos: [
      { nome: 'Classificar e filtrar', itens: [['g', 'dados.classificar'], ['g', 'dados.filtrar'], ['g', 'dados.reaplicar']] },
      { nome: 'Ferramentas', itens: [['g', 'dados.validacao'], ['g', 'dados.duplicados'], ['g', 'dados.dinamica']] }] },
    { id: 'revisao', nome: 'Revisão', grupos: [
      { nome: 'Revisão', itens: [['g', 'revisao.ortografia'], ['g', 'editar.comentar'], ['g', 'revisao.comentarios'], ['g', 'arquivo.versoes']] },
      { nome: 'Proteger', itens: [['g', 'revisao.travar']] }] },
    { id: 'exibir', nome: 'Exibir', grupos: [{ nome: 'Planilha', itens: [['g', 'exibir.congelar'], ['col', ['exibir.grade', 'exibir.folhaClara', 'exibir.barraFormula', 'exibir.abaGrafico']], ['g', 'exibir.zoom']] }, { nome: 'Linhas e colunas', itens: [['col', ['planilha.ocultarLinha', 'planilha.ocultarColuna', 'planilha.reexibir', 'planilha.reexibirColuna']]] }, ...GRUPOS_EXIBIR] },
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
  { nome: 'Gráfico', itens: [['g', 'grafico.editar'], ['g', 'grafico.estilo'], ['g', 'grafico.cores'], ['g', 'grafico.semaforo']] },
  { nome: 'Remover', itens: [['g', 'grafico.excluir']] },
  { nome: 'Faixa', itens: [['g', 'exibir.abaGrafico']] }] };

/** Abas da faixa do módulo, só com o que vale nele. ctx.grafico: há um gráfico selecionado. */
export function abasDoModulo(mod, ctx = {}) {
  const vale = (id) => PorId[id] && valeNoModulo(PorId[id], mod);
  const base = [...(FAIXAS[mod] || []), ...(mod === 'planilha' && ctx.grafico ? [ABA_GRAFICO] : [])];
  return base.map((aba) => ({
    ...aba,
    grupos: aba.grupos.map((g) => ({
      ...g,
      itens: g.itens.map(([tipo, x]) => [tipo, Array.isArray(x) ? x.filter(vale) : x])
        .filter(([, x]) => (Array.isArray(x) ? x.length : vale(x))),
    })).filter((g) => g.itens.length),
  }));
}

/* Rótulos curtos na faixa (o nome completo fica no "title" e na busca) */
export const ROTULO_CURTO = {
  'exibir.abaGrafico': 'Aba Gráfico',
  'inserir.tirarLink': 'Tirar link',
  'grafico.editar': 'Editar', 'grafico.estilo': 'Estilo rápido', 'grafico.cores': 'Cores', 'grafico.semaforo': 'Semáforo', 'grafico.excluir': 'Excluir',
  'exibir.faixaTudo': 'Mostrar tudo', 'exibir.faixaAbas': 'Só as abas', 'exibir.faixaOculta': 'Esconder',
  'exibir.topoCompleto': 'Completa', 'exibir.topoCompacto': 'Só as abas', 'exibir.barraFormula': 'Barra fx',
  'exibir.menuCompleto': 'Completo', 'exibir.menuIcones': 'Só ícones', 'exibir.menuOculto': 'Esconder',
  'exibir.layoutA': 'Faixa Excel', 'exibir.layoutB': 'Barra e painel', 'exibir.painel': 'Painel lateral',
  'arquivo.lixeira': 'Lixeira', 'arquivo.versoes': 'Versões', 'arquivo.cancelar': 'Cancelar',
  'formula.origem': 'De onde vem / quem usa', 'formula.explicar': 'Explicar conta', 'formula.fluxo': 'Desenhar a conta', 'formula.problemas': 'Verificação', 'formula.montar': 'Montar a conta', 'inserir.botao': 'Botão de aba',
  'inserir.proximo': 'Próximo passo', 'dados.dinamica': 'Tabela dinâmica', 'dados.duplicados': 'Duplicados',
  'dados.validacao': 'Validação', 'formatar.condicional': 'Destacar regra', 'editar.localizar': 'Localizar',
  'arquivo.exportarPDF': 'Exportar PDF', 'arquivo.exportarImagem': 'Exportar PNG', 'arquivo.lancar': 'Lançar na pasta',
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
  'formatar.limpar': 'Limpar formatos', 'planilha.novaAba': 'Nova aba', 'formula.nome': 'Dar nome', 'formula.nomes': 'Nomes',
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
      aria-pressed={ligado ? true : undefined} disabled={!!bloq} data-cmd={id} data-fam={id.split('.')[0]} data-prim={prim ? '' : undefined} onClick={() => cx.executar(id)}>
      {tipo === 'g' ? <span className="q"><Icone n={ic} /></span> : <Icone n={ic} />}
      {tipo !== 'i' && <span className="rot">{rotulo || cmd.nome}</span>}
    </button>
  );
}

function GrupoFaixa({ g, cx, prim, soIcone }) {
  const b = { cx, prim: undefined, soIcone };
  return (
    <div className="rb-g" role="group" aria-label={g.nome}>
      <div className="rb-i">
        {g.itens.map(([tipo, x, colunas], j) => tipo === 'g'
          ? <BotaoCmd key={j} id={x} {...b} prim={x === prim} rotulo={ROTULO_CURTO[x]} />
          : tipo === 'col'
            ? <div className="rb-col" key={j}>{x.map((id) => <BotaoCmd key={id} id={id} tipo="s" {...b} rotulo={ROTULO_CURTO[id]} />)}</div>
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
  const [est, setEst] = useState({ corte: null, medir: true });
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
  useLayoutEffect(() => { setEst({ corte: null, medir: true }); setMaisAberto(false); }, [atual.id, cx.mod, larg, cel, estilo]);
  useLayoutEffect(() => {
    if (!est.medir || !ref.current) return;
    if (cel) { setEst({ corte: null, medir: false }); return; }
    const gs = [...ref.current.querySelectorAll(':scope > .rb-g')];
    gs.forEach((g, i) => { larguras.current[atual.id + ':' + estilo + ':' + i] = g.offsetWidth; });
    const w = gs.map((_, i) => larguras.current[atual.id + ':' + estilo + ':' + i] || 0);
    const disp = ref.current.clientWidth - 16;
    let corte = null;
    if (w.reduce((a, b) => a + b, 0) > disp) {
      let acc = 0, n = 0;
      for (const x of w) { if (acc + x > disp - 100) break; /* v0.6.4 (R02): sobra lugar para o "Mais" e para o botão de recolher, também no estilo E */ acc += x; n++; }
      corte = Math.max(1, n);
    }
    setEst({ corte, medir: false });
  }, [est.medir]); // eslint-disable-line react-hooks/exhaustive-deps
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
    <div className={'ribbon' + (flutua ? ' flutua' : '') + (cel ? '' : ' ajustada')} data-estilo={estilo} role="toolbar" aria-label={'Faixa ' + atual.nome} data-aba={atual.id} ref={ref} onScroll={cel ? medirLados : undefined}>
      {cel && lados.esq && <button type="button" className="rb-rolar esq" aria-label="Ver os botões anteriores" onClick={() => rolar(-1)}><Icone n="setaEsq" /></button>}
      {naFaixa.map((g, i) => <GrupoFaixa g={g} cx={cx} prim={prim} soIcone={estilo === 'E'} key={atual.id + i} />)}
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
        <Icone n={prefs.faixa === 'tudo' ? 'chevronCima' : 'chevronBaixo'} />
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
              <span className="faixa-menu-cab">Temas favoritos</span>
              <div className="faixa-temas" role="group" aria-label="Temas favoritos">
                {(prefs.favTemas || []).map((id) => {
                  const t = TEMAS.find(([x]) => x === id);
                  if (!t || !AMOSTRAS[id]) return null;
                  return (
                    <button key={id} type="button" className={'faixa-tema' + (prefs.tema === id ? ' on' : '')} data-faixa-tema={id} aria-pressed={prefs.tema === id} title={t[1]} aria-label={'Tema ' + t[1]}
                      onClick={() => { cx.setPref('tema', id); setAberto(null); }}><i style={{ '--tb': AMOSTRAS[id][0], '--ta': AMOSTRAS[id][1] }} /><span>{t[1]}</span></button>
                  );
                })}
                <button type="button" className="faixa-tema-mais" data-faixa-temas-mais onClick={() => { setAberto(null); cx.executar('app.opcoes'); }}>Escolher favoritos…</button>
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

export function Topo({ titulo, ficha, salvo, prefs, cx, cel, aba, setAba, faixaTemp, setFaixaTemp, abrirGaveta }) {
  const temArquivo = !!ficha;
  /* v0.6.3: a aba "Gráfico" abre sozinha quando um gráfico é selecionado e volta para a anterior quando deixa de ser */
  const temGrafico = !!(cx.contexto && cx.contexto.grafico);
  const antesDoGrafico = useRef('inicio');
  const abaAtual = useRef(aba);
  abaAtual.current = aba;
  useEffect(() => {
    if (temGrafico) { if (abaAtual.current !== 'grafico') { antesDoGrafico.current = abaAtual.current; setAba('grafico'); } }
    else if (abaAtual.current === 'grafico') setAba(antesDoGrafico.current || 'inicio');
  }, [temGrafico]); // eslint-disable-line react-hooks/exhaustive-deps
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
          <button type="button" className="iconbtn" aria-label="O que você quer fazer? (Ctrl K)" title="O que você quer fazer? (Ctrl K)" onClick={() => cx.executar('app.buscar')}><Icone n="busca" /></button>
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
          {temArquivo ? <NomeArquivo ficha={ficha} cx={cx} /> : <h1>{titulo}</h1>}
          {temArquivo && <span className={'salvo' + (salvo.sujo ? ' sujo' : '')} aria-live="polite"><i />{salvo.texto}</span>}
        </div>
        {temArquivo && <BotaoCmd id="editar.desfazer" tipo="i" cx={cx} />}
        {temArquivo && !cel && <BotaoCmd id="editar.refazer" tipo="i" cx={cx} />}
        {temArquivo && !cel && <BotaoCmd id="editar.historico" tipo="i" cx={cx} />}
        <button type="button" className="busca" onClick={() => cx.executar('app.buscar')}>
          <Icone n="busca" />O que você quer fazer?<kbd>Ctrl K</kbd>
        </button>
        {cel && <button type="button" className="iconbtn" aria-label="O que você quer fazer?" onClick={() => cx.executar('app.buscar')}><Icone n="busca" /></button>}
        {temArquivo && layoutA && prefs.faixa === 'oculta' && !faixaTemp && (
          <button type="button" className="iconbtn" aria-label="Mostrar a faixa por um momento" title="Mostrar a faixa" onClick={() => setFaixaTemp(true)}><Icone n="faixaTudo" /></button>
        )}
        {temArquivo && (layoutA || prefs.faixa === 'oculta') && <BotaoCmd id="exibir.painel" tipo="i" cx={cx} />}
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
