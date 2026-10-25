/* EFCdocs — topo: nome do arquivo, busca, faixa tipo Excel (opção A) e barra curta (opção B). */
import { useEffect, useRef, useState } from 'react';
import { PorId, chegaNa, valeNoModulo } from '../nucleo/comandos.js';
import { ROTULOS } from '../nucleo/prefs.js';
import { validarNome } from '../nucleo/modelo.js';
import { Icone } from './comum.jsx';

/* item: ['g', id] botão grande · ['col', [ids]] coluna de pequenos · ['lin', [ids]] linha de ícones */
const ABA_ARQUIVO = {
  id: 'arquivo', nome: 'Arquivo', grupos: [
    { nome: 'Arquivo', itens: [['g', 'arquivo.novo'], ['g', 'arquivo.renomear'], ['g', 'arquivo.abrir'], ['g', 'arquivo.exportarExcel'], ['g', 'arquivo.exportarWord'], ['g', 'arquivo.exportarPDF'], ['g', 'arquivo.exportarImagem'], ['g', 'arquivo.imprimir']] },
    { nome: 'Registro', itens: [['g', 'arquivo.versoes'], ['g', 'arquivo.lancar'], ['g', 'arquivo.lixeira']] },
  ],
};
const GRUPOS_EXIBIR = [
  { nome: 'Faixa', itens: [['col', ['exibir.faixaTudo', 'exibir.faixaAbas', 'exibir.faixaOculta']]] },
  { nome: 'Menu lateral', itens: [['col', ['exibir.menuCompleto', 'exibir.menuIcones', 'exibir.menuOculto']]] },
  { nome: 'Layout', itens: [['g', 'exibir.painel'], ['col', ['exibir.layoutA', 'exibir.layoutB']]] },
  { nome: 'Aparência', itens: [['g', 'exibir.tema'], ['g', 'exibir.relevo'], ['g', 'exibir.telaCheia']] },
];
const GRUPO_TRANSFERENCIA = { nome: 'Área de transferência', itens: [['g', 'editar.colar'], ['col', ['editar.recortar', 'editar.copiar', 'editar.pincel']]] };

const FAIXAS = {
  planilha: [ABA_ARQUIVO,
    { id: 'inicio', nome: 'Página Inicial', grupos: [GRUPO_TRANSFERENCIA,
      { nome: 'Fonte', itens: [['lin', ['formatar.negrito', 'formatar.italico', 'formatar.sublinhado', 'formatar.bordas', 'formatar.preenchimento', 'formatar.corFonte', 'formatar.fonte']]] },
      { nome: 'Alinhamento', itens: [['lin', ['formatar.esquerda', 'formatar.centro', 'formatar.direita', 'formatar.quebrar', 'formatar.mesclar']]] },
      { nome: 'Número', itens: [['lin', ['formatar.moeda', 'formatar.porcentagem', 'formatar.milhar', 'formatar.maisCasas', 'formatar.menosCasas', 'formatar.formatoNumero']]] },
      { nome: 'Células', itens: [['col', ['planilha.inserirLinha', 'planilha.inserirColuna']], ['col', ['planilha.excluirLinha', 'planilha.excluirColuna']]] },
      { nome: 'Estilos', itens: [['g', 'formatar.condicional'], ['g', 'inserir.tabela']] },
      { nome: 'Edição', itens: [['g', 'formula.autosoma'], ['col', ['planilha.limparConteudo', 'formatar.limpar', 'editar.historico']], ['g', 'dados.filtrar'], ['g', 'editar.localizar']] }] },
    { id: 'inserir', nome: 'Inserir', grupos: [
      { nome: 'Planilha', itens: [['g', 'planilha.novaAba'], ['col', ['planilha.inserirLinha', 'planilha.inserirColuna']]] },
      { nome: 'Tabelas', itens: [['g', 'inserir.tabela'], ['g', 'inserir.status'], ['g', 'inserir.foto']] },
      { nome: 'Ilustrações', itens: [['g', 'inserir.imagem'], ['g', 'inserir.grafico']] },
      { nome: 'Navegação', itens: [['g', 'inserir.link'], ['g', 'inserir.botao'], ['g', 'editar.comentar']] }] },
    { id: 'formulas', nome: 'Fórmulas', grupos: [
      { nome: 'Funções', itens: [['g', 'formula.inserir'], ['g', 'formula.autosoma']] },
      { nome: 'Nomes', itens: [['g', 'formula.nome'], ['g', 'formula.nomes'], ['g', 'planilha.cabecalho']] },
      { nome: 'Entender a conta', itens: [['g', 'formula.origem'], ['g', 'formula.explicar']] }] },
    { id: 'dados', nome: 'Dados', grupos: [
      { nome: 'Classificar e filtrar', itens: [['g', 'dados.classificar'], ['g', 'dados.filtrar']] },
      { nome: 'Ferramentas', itens: [['g', 'dados.validacao'], ['g', 'dados.duplicados'], ['g', 'dados.dinamica']] },
      { nome: 'Arquivos', itens: [['g', 'arquivo.abrir'], ['g', 'arquivo.exportarExcel']] }] },
    { id: 'revisao', nome: 'Revisão', grupos: [
      { nome: 'Revisão', itens: [['g', 'revisao.ortografia'], ['g', 'editar.comentar'], ['g', 'arquivo.versoes']] },
      { nome: 'Proteger', itens: [['g', 'revisao.travar']] }] },
    { id: 'exibir', nome: 'Exibir', grupos: [{ nome: 'Planilha', itens: [['g', 'exibir.congelar'], ['g', 'exibir.grade'], ['g', 'exibir.folhaClara'], ['g', 'exibir.zoom']] }, { nome: 'Linhas e colunas', itens: [['col', ['planilha.ocultarLinha', 'planilha.ocultarColuna', 'planilha.reexibir']]] }, ...GRUPOS_EXIBIR] },
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
      { nome: 'Editar', itens: [['g', 'editar.duplicar'], ['g', 'editar.excluir'], ['col', ['editar.selecionarTudo', 'editar.localizar', 'editar.historico']]] },
      { nome: 'Fonte', itens: [['lin', ['formatar.negrito', 'formatar.italico', 'formatar.sublinhado', 'formatar.corFonte']]] },
      { nome: 'Alinhamento', itens: [['lin', ['formatar.esquerda', 'formatar.centro', 'formatar.direita']]] },
      { nome: 'Cor', itens: [['g', 'formatar.preenchimento']] }] },
    { id: 'inserir', nome: 'Inserir', grupos: [
      { nome: 'Quadro', itens: [['g', 'inserir.postit'], ['g', 'inserir.seta'], ['g', 'inserir.proximo'], ['g', 'inserir.texto'], ['g', 'inserir.pagina'], ['g', 'inserir.legenda']] },
      { nome: 'Fluxograma', itens: [['g', 'inserir.forma'], ['col', ['inserir.processo', 'inserir.decisao', 'inserir.inicio']], ['col', ['inserir.dados']], ['g', 'inserir.modelo']] },
      { nome: 'Objetos', itens: [['g', 'inserir.imagem'], ['g', 'inserir.link'], ['g', 'inserir.grafico']] }] },
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

/** Abas da faixa do módulo, só com o que vale nele. */
export function abasDoModulo(mod) {
  const vale = (id) => PorId[id] && valeNoModulo(PorId[id], mod);
  return (FAIXAS[mod] || []).map((aba) => ({
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
  'exibir.faixaTudo': 'Mostrar tudo', 'exibir.faixaAbas': 'Só as abas', 'exibir.faixaOculta': 'Esconder',
  'exibir.menuCompleto': 'Completo', 'exibir.menuIcones': 'Só ícones', 'exibir.menuOculto': 'Esconder',
  'exibir.layoutA': 'Faixa tipo Excel', 'exibir.layoutB': 'Barra e painel', 'exibir.painel': 'Painel lateral',
  'arquivo.lixeira': 'Lixeira', 'arquivo.versoes': 'Versões', 'arquivo.cancelar': 'Cancelar',
  'formula.origem': 'De onde vem / quem usa', 'formula.explicar': 'Explicar conta', 'inserir.botao': 'Botão de aba',
  'inserir.proximo': 'Próximo passo', 'dados.dinamica': 'Tabela dinâmica', 'dados.duplicados': 'Duplicados',
  'dados.validacao': 'Validação', 'formatar.condicional': 'Destacar regra', 'editar.localizar': 'Localizar',
  'arquivo.exportarPDF': 'Exportar PDF', 'arquivo.exportarImagem': 'Exportar PNG', 'arquivo.lancar': 'Lançar na pasta',
  'editar.comentar': 'Comentário', 'organizar.temporizador': 'Temporizador', 'revisao.comparar': 'Comparar',
  'revisao.concluir': 'Concluir revisão', 'pagina.cabecalho': 'Cabeçalho do POP', 'pagina.orientacao': 'Orientação',
  'exibir.congelar': 'Congelar', 'exibir.grade': 'Linhas de grade', 'exibir.leitura': 'Modo leitura',
  'exibir.relevo': 'Relevo', 'exibir.telaCheia': 'Tela cheia', 'formatar.titulo': 'Título', 'inserir.campo': 'Campo',
  'editar.colar': 'Colar', 'inserir.processo': 'Atividade', 'inserir.decisao': 'Decisão', 'inserir.inicio': 'Início/Fim',
  'inserir.dados': 'Entrada/Saída', 'inserir.pagina': 'Página', 'inserir.legenda': 'Legenda', 'inserir.modelo': 'Modelos', 'organizar.ordenarGut': 'Ordenar GUT', 'exibir.ferramentas': 'Ferramentas', 'exibir.assistente': 'Assistente', 'organizar.quadro': 'Quadro livre', 'organizar.frente': 'Para a frente',
  'organizar.tras': 'Para trás', 'exibir.ajustar': 'Ajustar à tela', 'exibir.codigos': 'Códigos Q',
  'editar.excluir': 'Excluir', 'editar.selecionarTudo': 'Selecionar tudo', 'formatar.preenchimento': 'Cor',
  'editar.duplicar': 'Duplicar', 'inserir.texto': 'Texto solto',
  'editar.historico': 'Linha do tempo', 'planilha.inserirLinha': 'Inserir linha', 'planilha.inserirColuna': 'Inserir coluna',
  'planilha.excluirLinha': 'Excluir linha', 'planilha.excluirColuna': 'Excluir coluna', 'planilha.limparConteudo': 'Limpar conteúdo',
  'formatar.limpar': 'Limpar formatos', 'planilha.novaAba': 'Nova aba', 'formula.nome': 'Dar nome', 'formula.nomes': 'Nomes',
  'planilha.cabecalho': 'Linha de títulos', 'exibir.folhaClara': 'Folha clara', 'planilha.ocultarLinha': 'Ocultar linhas',
  'planilha.ocultarColuna': 'Ocultar colunas', 'planilha.reexibir': 'Reexibir', 'formula.inserir': 'Inserir função', 'formula.autosoma': 'AutoSoma',
};

/** Botão de comando. tipo: g grande · s pequeno · i só ícone · t ícone e texto */
export function BotaoCmd({ id, tipo = 'g', cx, rotulo }) {
  const cmd = PorId[id];
  if (!cmd) return null;
  const chega = chegaNa(cmd, cx.mod);
  const bloq = cx.bloqueado(id);
  const ligado = cx.ligado(id);
  const titulo = cmd.nome + (cmd.atalho ? ` (${cmd.atalho})` : '') + (chega ? ` — chega na ${chega}` : '') + (bloq ? ` — ${bloq}` : '');
  const classe = { g: 'rbb', s: 'rbs', i: 'rbi', t: 'tlab' }[tipo] + (ligado ? ' on' : '') + (chega ? ' futuro' : '');
  return (
    <button type="button" className={classe} title={titulo} aria-label={tipo === 'i' ? titulo : undefined}
      aria-pressed={ligado ? true : undefined} disabled={!!bloq} data-cmd={id} onClick={() => cx.executar(id)}>
      <Icone n={cmd.ic} />
      {tipo !== 'i' && <span>{rotulo || cmd.nome}</span>}
    </button>
  );
}

function Faixa({ aba, cx, flutua }) {
  const abas = abasDoModulo(cx.mod);
  const atual = abas.find((a) => a.id === aba) || abas[1];
  return (
    <div className={'ribbon' + (flutua ? ' flutua' : '')} role="toolbar" aria-label={'Faixa ' + atual.nome} data-aba={atual.id}>
      {atual.grupos.map((g, i) => (
        <div className="rb-g" role="group" aria-label={g.nome} key={i}>
          <div className="rb-i">
            {g.itens.map(([tipo, x], j) => tipo === 'g'
              ? <BotaoCmd key={j} id={x} cx={cx} rotulo={ROTULO_CURTO[x]} />
              : tipo === 'col'
                ? <div className="rb-col" key={j}>{x.map((id) => <BotaoCmd key={id} id={id} tipo="s" cx={cx} rotulo={ROTULO_CURTO[id]} />)}</div>
                : <div className="rb-lin" key={j}>{x.map((id) => <BotaoCmd key={id} id={id} tipo="i" cx={cx} />)}</div>)}
          </div>
          <div className="rb-n">{g.nome}</div>
        </div>
      ))}
    </div>
  );
}

function BarraCurta({ cx, soIcones }) {
  return (
    <div className={'tbar' + (soIcones ? ' so-icones' : '')} role="toolbar" aria-label="Barra de ferramentas">
      {(BARRA_CURTA[cx.mod] || []).map((id, i) => (id === '|' ? <span className="sep" key={i} /> : <BotaoCmd key={id} id={id} tipo="i" cx={cx} />))}
      <span className="sp" />
      <BotaoCmd id="exibir.painel" tipo="t" cx={cx} rotulo="Painel" />
    </div>
  );
}

function ModoFaixa({ prefs, cx }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (ev) => { if (ref.current && !ref.current.contains(ev.target)) setAberto(false); };
    addEventListener('mousedown', fora);
    return () => removeEventListener('mousedown', fora);
  }, [aberto]);
  const nomes = prefs.layout === 'B' ? ROTULOS.faixaB : ROTULOS.faixa;
  const cmd = { tudo: 'exibir.faixaTudo', abas: 'exibir.faixaAbas', oculta: 'exibir.faixaOculta' };
  const ic = { tudo: 'faixaTudo', abas: 'faixaAbas', oculta: 'faixaOculta' };
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="iconbtn modo" aria-label="Como mostrar a faixa" aria-expanded={aberto} title="Como mostrar a faixa" onClick={() => setAberto(!aberto)}>
        <Icone n="chevronBaixo" />
      </button>
      {aberto && (
        <div className="card" role="menu" style={{ position: 'absolute', right: 0, top: 36, zIndex: 30, padding: 6, display: 'grid', gap: 2, minWidth: 210, boxShadow: '0 12px 30px rgba(0,0,0,.25)' }}>
          {['tudo', 'abas', 'oculta'].map((m) => (
            <button key={m} type="button" role="menuitemradio" aria-checked={prefs.faixa === m} className={'rbs' + (prefs.faixa === m ? ' on' : '')} style={{ height: 36 }}
              onClick={() => { cx.executar(cmd[m]); setAberto(false); }}>
              <Icone n={ic[m]} /><span>{nomes[m]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
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
  const mostraMenu = cel || prefs.menu === 'oculto';
  const layoutA = prefs.layout === 'A';
  const mostraAbas = temArquivo && layoutA && (prefs.faixa !== 'oculta' || faixaTemp);
  const mostraFaixa = temArquivo && layoutA && (prefs.faixa === 'tudo' || faixaTemp);
  return (
    <header className="topbar">
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
      {mostraAbas && (
        <nav className="tabs" aria-label="Abas da faixa">
          {abasDoModulo(cx.mod).map((a) => (
            <button key={a.id} type="button" className={'tab' + (aba === a.id && mostraFaixa ? ' active' : '')} aria-pressed={aba === a.id && mostraFaixa}
              onClick={() => {
                if (prefs.faixa !== 'tudo') setFaixaTemp(!(faixaTemp && aba === a.id));
                setAba(a.id);
              }}>
              {a.nome}
            </button>
          ))}
          <span className="sp" />
          <ModoFaixa prefs={prefs} cx={cx} />
        </nav>
      )}
      {mostraFaixa && <Faixa aba={aba} cx={cx} flutua={prefs.faixa !== 'tudo'} />}
      {temArquivo && !layoutA && prefs.faixa !== 'oculta' && <BarraCurta cx={cx} soIcones={prefs.faixa === 'abas'} />}
    </header>
  );
}
