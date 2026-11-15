/* EFCdocs — páginas: Início, lista por tipo, Lixeira, Pastas e Documentos externos (prévia da v0.8.0). */
import { TIPOS, ativos, naLixeira, maisRecentes } from '../nucleo/modelo.js';
import { LIMITE_DEMO } from '../nucleo/banco.js';
import { useEffect, useState } from 'react';
import { Icone, dataHora, usarEsc } from './comum.jsx';
import { CabPagina, SeloTotal, TabelaArquivos } from './listas.jsx';
import { dadosDoArquivo } from './gaveta.jsx';

const CMD_NOVO = { planilha: 'arquivo.novaPlanilha', docx: 'arquivo.novoDocumento', postits: 'arquivo.novoQuadro' };
/* o que cada botão "Novo" faz: vai na dica (parar o mouse em cima), não na tela */
const DESCRICAO = {
  planilha: 'Fórmulas em português. Abre e salva arquivos do Excel (.xlsx).',
  docx: 'POP, formulários e documentos internos.',
  postits: 'Quadro, Kanban e fluxograma com setas.',
};
const NOME_CURTO = { planilha: 'Planilha', docx: 'Documento', postits: 'Quadro' };

/** Botões de "Novo": compactos, ícone e nome; a descrição fica na dica. */
function BotoesNovo({ tipos, cx }) {
  return (
    <>
      {tipos.map((t) => {
        const bloq = cx.bloqueado(CMD_NOVO[t]);
        const dica = `${TIPOS[t].novo}|${bloq || DESCRICAO[t] + (TIPOS[t].chega ? ` Editor na ${TIPOS[t].chega}.` : '')}`;
        return (
          <button key={t} type="button" className="btn pg-novo" disabled={!!bloq} data-dica={dica} aria-label={TIPOS[t].novo} data-novo={t} onClick={() => cx.executar(CMD_NOVO[t])}>
            <Icone n="plus" />{tipos.length === 1 ? TIPOS[t].novo : NOME_CURTO[t]}
          </button>
        );
      })}
    </>
  );
}

/* ---------- filtro único, recolhível: um botão com o resumo que abre um painel ---------- */
const ORDENS = { recentes: 'Mais recentes', antigos: 'Mais antigos', nome: 'Nome (A a Z)' };
const FILTRO_PADRAO = { q: '', tipo: 'todos', ordem: 'recentes' };
const filtrosGuardados = {}; // o filtro de cada página continua igual ao voltar para ela
const semAcento = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function aplicarFiltro(lista, f) {
  const q = semAcento(f.q).trim();
  let out = lista.filter((x) => (f.tipo === 'todos' || x.tipo === f.tipo) && (!q || semAcento(x.nome).includes(q)));
  if (f.ordem === 'nome') out = [...out].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
  else if (f.ordem === 'antigos') out = [...out].reverse();
  return out;
}

export function useFiltro(chave) {
  const [f, setF] = useState(() => filtrosGuardados[chave] || FILTRO_PADRAO);
  const mudar = (novo) => { filtrosGuardados[chave] = novo; setF(novo); };
  return [f, mudar];
}

export function Filtro({ f, mudar, tipos, aberto, setAberto }) {
  const ativo = f.q || f.tipo !== 'todos' || f.ordem !== 'recentes';
  const resumo = [f.q ? `"${f.q}"` : null, tipos && f.tipo !== 'todos' ? TIPOS[f.tipo].nome : null, ORDENS[f.ordem]].filter(Boolean).join(' · ');
  return (
    <button type="button" className={'filtro-b' + (ativo ? ' on' : '') + (aberto ? ' aberto' : '')} aria-expanded={aberto} aria-controls="filtro-painel" onClick={() => setAberto(!aberto)}>
      <Icone n="filtro" /><span className="res">{resumo}</span><Icone n="chevronBaixo" />
    </button>
  );
}

export function PainelFiltro({ f, mudar, tipos, fechar }) {
  const ativo = f.q || f.tipo !== 'todos' || f.ordem !== 'recentes';
  return (
    <div className="filtro-p" id="filtro-painel" onKeyDown={(ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); fechar(); } }}>
      <label className="campo"><span>Nome</span>
        <input value={f.q} placeholder="Procurar pelo nome" autoFocus onChange={(ev) => mudar({ ...f, q: ev.target.value })} />
      </label>
      {tipos && (
        <label className="campo"><span>Tipo</span>
          <select value={f.tipo} onChange={(ev) => mudar({ ...f, tipo: ev.target.value })}>
            <option value="todos">Todos</option>
            {tipos.map((t) => <option key={t} value={t}>{TIPOS[t].nome}</option>)}
          </select>
        </label>
      )}
      <label className="campo"><span>Ordem</span>
        <select value={f.ordem} onChange={(ev) => mudar({ ...f, ordem: ev.target.value })}>
          {Object.entries(ORDENS).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
        </select>
      </label>
      <button type="button" className="btn sm" disabled={!ativo} onClick={() => mudar(FILTRO_PADRAO)}>Limpar</button>
    </div>
  );
}

const COL_NOME = { id: 'nome', rot: 'Nome', cls: 'c-nome' };
const COL_TIPO = { id: 'tipo', rot: 'Tipo', cls: 'c-tipo' };
const COL_QUANDO = { id: 'quando', rot: 'Alterado em', cls: 'c-quando' };
const COL_ACOES = { id: 'acoes', rot: <span className="so-leitor">Ações</span>, cls: 'c-acoes' };

/**
 * Uma tela de lista no layout da família: cabeçalho (título, selo do total, ações), filtro único e a tabela.
 * sub = a lista é uma parte da tela (Recentes, no Início): o cabeçalho dela é menor e não repete o título da página.
 */
function ListaFiltrada({ chave, titulo, unidade, todos, tipos, cx, vazio, lendo, meta, acoes, sub, lixeira }) {
  const [f, mudar] = useFiltro(chave);
  const [aberto, setAberto] = useState(false);
  const lista = aplicarFiltro(todos, f);
  /* Esc fecha o painel do filtro, esteja o foco onde estiver */
  usarEsc(() => setAberto(false), aberto);
  const semTipo = unidade[1] !== 'arquivos';
  const colunas = lixeira ? COLUNAS_LIXEIRA : semTipo ? [COL_NOME, COL_QUANDO, COL_ACOES] : [COL_NOME, COL_TIPO, COL_QUANDO, COL_ACOES];
  return (
    <>
      <CabPagina titulo={titulo} sub={sub} meta={<><SeloTotal n={lista.length} total={todos.length} unidade={unidade} lendo={lendo} />{meta}</>}>
        {todos.length > 0 && <Filtro f={f} mudar={mudar} tipos={tipos} aberto={aberto} setAberto={setAberto} />}
        {acoes}
      </CabPagina>
      {aberto && todos.length > 0 && <PainelFiltro f={f} mudar={mudar} tipos={tipos} fechar={() => setAberto(false)} />}
      <TabelaArquivos nome={chave || 'lista'} rotulo={titulo} colunas={colunas} itens={lista} lendo={lendo} reinicia={f.q + '|' + f.tipo + '|' + f.ordem}
        vazio={todos.length ? 'Nenhum arquivo com esse filtro.' : vazio}
        detalhe={(x) => dadosDoArquivo(x, cx)} filtro={{ f, mudar, tipos }}
        linha={(x, extra) => <LinhaArquivo key={x.id} f={x} cx={cx} semTipo={semTipo} lixeira={lixeira} extra={extra} />} />
    </>
  );
}

/** O botão que abre a gaveta da linha (R8): o primeiro das ações, em todas as listas. */
export function BotaoDetalhes({ nome, extra }) {
  if (!extra || !extra.detalhar) return null;
  return <button type="button" className="iconbtn" data-detalhes aria-label={'Detalhes: ' + nome} aria-pressed={extra.naGaveta} title="Detalhes (abre ao lado, sem abrir o arquivo)" onClick={extra.detalhar}><Icone n="painel" /></button>;
}

export function LinhaArquivo({ f, cx, lixeira, semTipo, extra }) {
  const bloq = (acao) => cx.bloqueado(acao, f);
  const quando = lixeira ? dataHora(f.lixeiraEm) : dataHora(f.alteradoEm);
  return (
    <tr className={'arq' + (extra && extra.naGaveta ? ' na-gaveta' : '')} data-id={f.id}>
      <td className="c-nome">
        <button type="button" className="abre" onClick={() => (lixeira ? null : cx.abrir(f.id))} disabled={lixeira} title={f.nome} style={lixeira ? { cursor: 'default' } : undefined}>
          <span className="ri"><Icone n={f.tipo} /></span>
          <span className="txt">
            <b>{f.nome}</b>
            <span className="so-cel">{semTipo ? '' : TIPOS[f.tipo].nome + ' · '}{lixeira ? 'na lixeira desde ' + quando : quando}</span>
          </span>
        </button>
      </td>
      {!semTipo && <td className="c-tipo">{TIPOS[f.tipo].nome}</td>}
      <td className="c-quando">{quando}</td>
      <td className="c-acoes">
        {lixeira ? (
          <span className="acoes">
            <BotaoDetalhes nome={f.nome} extra={extra} />
            <button type="button" className="btn sm" disabled={!!bloq('arquivo.restaurar')} onClick={() => cx.restaurar(f)}><Icone n="restaurar" />Restaurar</button>
            <button type="button" className="btn sm apagar" aria-label={'Apagar para sempre: ' + f.nome} title={bloq('arquivo.excluirDeVez') || 'Apagar para sempre'} disabled={!!bloq('arquivo.excluirDeVez')} onClick={() => cx.excluirDeVez(f)}><Icone n="lixeira" />Apagar para sempre</button>
          </span>
        ) : (
          <span className="acoes">
            <BotaoDetalhes nome={f.nome} extra={extra} />
            <button type="button" className="iconbtn" aria-label={'Renomear: ' + f.nome} title={bloq('arquivo.renomear') || 'Renomear'} disabled={!!bloq('arquivo.renomear')} onClick={() => cx.perguntarNome(f)}><Icone n="renomear" /></button>
            <button type="button" className="iconbtn" aria-label={'Mandar para a lixeira: ' + f.nome} title={bloq('arquivo.lixeira') || 'Mandar para a lixeira'} disabled={!!bloq('arquivo.lixeira')} onClick={() => cx.lixeira(f)}><Icone n="lixeira" /></button>
          </span>
        )}
      </td>
    </tr>
  );
}

function SeloDemo({ fichas, demo, cx }) {
  if (!demo) return null;
  const n = ativos(fichas).length;
  const explicar = () => cx.avisar(`Demonstração: até ${LIMITE_DEMO} arquivos, guardados só neste aparelho. O que você exportar sai com a marca DEMO · EFC.`, { ic: 'info', longo: true });
  return <button type="button" className={'efl-selo demo-selo ' + (n >= LIMITE_DEMO ? 'warn' : '')} onClick={explicar} title="O que é a demonstração?">Demonstração: {n} de {LIMITE_DEMO} arquivos</button>;
}

/* v0.4.9 (L02/L05): cartões grandes de criar; cada um é uma prévia em branco do próprio arquivo (papel claro, em qualquer tema) */
const PREVIA = {
  planilha: <span className="pv pv-pl" aria-hidden="true"><i className="pv-cab" /><i className="pv-col" /></span>,
  docx: <span className="pv pv-dc" aria-hidden="true"><i /><i /><i /><i /><i className="curta" /><i /><i /><i className="curta" /></span>,
  postits: <span className="pv pv-qd" aria-hidden="true"><i className="pv-pit" /><i className="pv-pit b" /><i className="pv-seta" /></span>,
};
const FRASE = { planilha: 'Tabela com contas, em português', docx: 'POP, formulário e documento interno', postits: 'Post-its, setas, Kanban e fluxograma' };
function CartoesInicio({ cx }) {
  return (
    <div className="cartoes-novos">
      {['planilha', 'docx', 'postits'].map((t) => {
        const bloq = cx.bloqueado(CMD_NOVO[t]);
        const dica = `${TIPOS[t].novo}|${bloq || DESCRICAO[t] + (TIPOS[t].chega ? ` Editor na ${TIPOS[t].chega}.` : '')}`;
        return (
          <button key={t} type="button" className="cartao-novo" disabled={!!bloq} data-novo={t} data-dica={dica} aria-label={TIPOS[t].novo} onClick={() => cx.executar(CMD_NOVO[t])}>
            {PREVIA[t]}
            <span className="cn-rod">
              <span className="ri"><Icone n={t} /></span>
              <span className="cn-tx"><b>{NOME_CURTO[t]} em branco</b><span>{FRASE[t]}</span></span>
              {TIPOS[t].chega && <span className="em">{TIPOS[t].chega}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Inicio({ fichas, cx, demo, lendo }) {
  const lista = maisRecentes(ativos(fichas));
  return (
    <div className="pagina pg-lista pg-inicio">
      <CabPagina titulo="Início" meta={<SeloDemo fichas={fichas} demo={demo} cx={cx} />}>
        <button type="button" className="btn" data-abrir-excel data-dica="Abrir do Excel|Traz uma cópia de um arquivo .xlsx ou .xlsm como planilha nova. O original não muda." onClick={() => cx.executar('arquivo.abrir')}><Icone n="excel" />Abrir arquivo do Excel</button>
        {cx.instalar && <button type="button" className="btn instalar" onClick={cx.instalar}><Icone n="instalar" />Instalar</button>}
      </CabPagina>
      <CartoesInicio cx={cx} />
      <ListaFiltrada chave="inicio" titulo="Recentes" sub unidade={['arquivo', 'arquivos']} todos={lista} tipos={['planilha', 'docx', 'postits']} cx={cx} lendo={lendo}
        vazio="Comece criando uma planilha. Tudo fica salvo neste aparelho." />
    </div>
  );
}

const TITULO_TIPO = { planilha: 'Planilhas', docx: 'Documentos', postits: 'Quadros' };
export function ListaDoTipo({ tipo, fichas, cx, demo, lendo }) {
  const lista = maisRecentes(ativos(fichas).filter((f) => f.tipo === tipo));
  const unidade = { planilha: ['planilha', 'planilhas'], docx: ['documento', 'documentos'], postits: ['quadro', 'quadros'] }[tipo];
  const chega = TIPOS[tipo].chega;
  return (
    <div className="pagina pg-lista">
      <ListaFiltrada chave={tipo} titulo={TITULO_TIPO[tipo]} unidade={unidade} todos={lista} cx={cx} lendo={lendo}
        meta={<>
          {chega && <span className="efl-selo pg-breve" title={`O editor de ${TIPOS[tipo].nome.toLowerCase()} chega na ${chega}. Já dá para criar, renomear e organizar.`}><Icone n="info" />Editor na {chega}</span>}
          <SeloDemo fichas={fichas} demo={demo} cx={cx} />
        </>}
        acoes={<BotoesNovo tipos={[tipo]} cx={cx} />}
        vazio={`Nenhum${tipo === 'postits' ? ' quadro' : tipo === 'docx' ? ' documento' : 'a planilha'} ainda.`} />
    </div>
  );
}

const COLUNAS_LIXEIRA = [COL_NOME, COL_TIPO, { id: 'quando', rot: 'Na lixeira desde', cls: 'c-quando' }, COL_ACOES];
export function Lixeira({ fichas, cx, lendo }) {
  const lista = maisRecentes(naLixeira(fichas));
  return (
    <div className="pagina pg-lista pg-lixeira">
      <ListaFiltrada chave="lixeira" titulo="Lixeira" unidade={['arquivo', 'arquivos']} todos={lista} tipos={['planilha', 'docx', 'postits']} cx={cx} lendo={lendo} lixeira
        vazio="A lixeira está vazia." meta={<span className="pg-nota">Restaure ou apague para sempre.</span>} />
    </div>
  );
}

const PASTAS_INICIAIS = ['Treinamentos', 'Avaliação de Eficácia', 'Documentos Internos', 'Formulários', 'Fluxogramas'];
/* v0.6.20 (parte 4): as páginas que ainda vão chegar ganharam o cabeçalho da família e viraram um plano em linhas
   (título à esquerda, explicação à direita), no lugar do aviso em caixa e da grade de cartões. */
const Linha = ({ ic, titulo, children }) => <div className="plano-l"><dt><Icone n={ic} />{titulo}</dt><dd>{children}</dd></div>;
const Plano = ({ titulo, children }) => <section className="plano-s">{titulo && <h2>{titulo}</h2>}<dl>{children}</dl></section>;
const SeloChega = () => <span className="efl-selo pg-breve aviso-breve" title="Esta página mostra como vai ficar, combinado no PLANO v2."><Icone n="info" />Chega na v0.8.0</span>;

export function EmBreve({ qual }) {
  if (qual === 'pastas') {
    return (
      <div className="pagina pg-plano">
        <CabPagina titulo="Pastas" meta={<SeloChega />} />
        <p className="plano-intro">Pastas criadas e excluídas por Principais e Estrela; cada uma com Arquivados; subpastas por ano e mês; lançamento com número sequencial (ex.: TRE-2026-0001); depois de lançado, só Cancelar com motivo.</p>
        <Plano titulo="Pastas iniciais">
          {PASTAS_INICIAIS.map((p) => <Linha key={p} ic="pasta" titulo={p}>Arquivados · subpastas por ano e mês</Linha>)}
        </Plano>
        <Plano titulo="Regras">
          <Linha ic="lixeira" titulo="Excluir pasta">Só vazia, com motivo. Com lançamentos, só arquivar.</Linha>
          <Linha ic="historico" titulo="Revisões de formulário">Rev. 00, 01…; aprovação por um Principal; antigas só para consulta.</Linha>
          <Linha ic="foto" titulo="Fotos">Apagam 15 dias depois de concluído o registro, 45 se não concluído. Aviso antes e "Baixar fotos".</Linha>
        </Plano>
      </div>
    );
  }
  return (
    <div className="pagina pg-plano">
      <CabPagina titulo="Documentos externos" meta={<SeloChega />} />
      <p className="plano-intro">Documentos que vêm de fora e nunca são criados no app (alvará, licença ambiental, certificados, laudos de calibração, AVCB, contratos). Controle por validade, não por revisão.</p>
      <Plano titulo="Como vai funcionar">
        <Linha ic="externo" titulo="Importar">PDF ou foto; não se edita; ficha com emissor, número, emissão, validade, responsável e unidade.</Linha>
        <Linha ic="aviso" titulo="Avisos">A vencer: 60, 30 e 7 dias antes. Vencido em vermelho.</Linha>
        <Linha ic="restaurar" titulo="Renovar">Novo arquivo e nova validade; o anterior vira Substituído e fica no histórico.</Linha>
        <Linha ic="cadeado" titulo="Nunca se apagam sozinhos">A regra de prazo das fotos não vale para eles.</Linha>
      </Plano>
    </div>
  );
}

const O_QUE_VEM = {
  planilha: ['Grade com fórmulas em português e explicação da conta', 'Barra de status com Soma, Média e Contagem', 'Abrir e salvar Excel (.xlsx e .xlsm) com relatório do que veio e do que ficou de fora'],
  docx: ['POP com cabeçalho travado e campos de formulário', 'Revisões no editor: comparar, linha do tempo, aprovação', 'Abrir e salvar Word, PDF retrato'],
};

/** Área do editor que ainda não chegou (planilha e documento). */
export function EditorEmBreve({ tipo }) {
  return (
    <div className={'sup sup-' + tipo} aria-label={'Área do editor de ' + TIPOS[tipo].nome}>
      {tipo === 'docx' && <div className="folha" />}
      <div className="card aviso-ed">
        <span className="ic"><Icone n={tipo} /></span>
        <h2>Editor de {TIPOS[tipo].nome.toLowerCase()} chega na {TIPOS[tipo].chega}</h2>
        <p>O arquivo já fica guardado no aparelho e dá para renomear.</p>
        <ul>{O_QUE_VEM[tipo].map((t) => <li key={t}><Icone n="check" />{t}</li>)}</ul>
      </div>
    </div>
  );
}
