/* EFCdocs — páginas: Início, lista por tipo, Lixeira, Pastas e Documentos externos (prévia da v0.8.0). */
import { TIPOS, ativos, naLixeira, maisRecentes } from '../nucleo/modelo.js';
import { LIMITE_DEMO } from '../nucleo/banco.js';
import { useEffect, useState } from 'react';
import { Icone, dataHora } from './comum.jsx';

const CMD_NOVO = { planilha: 'arquivo.novaPlanilha', docx: 'arquivo.novoDocumento', postits: 'arquivo.novoQuadro' };
/* o que cada botão "Novo" faz: vai na dica (parar o mouse em cima), não na tela */
const DESCRICAO = {
  planilha: 'Fórmulas em português. Abrir e salvar Excel chega na v0.5.0.',
  docx: 'POP, formulários e documentos internos.',
  postits: 'Quadro, Kanban e fluxograma com setas.',
};
const NOME_CURTO = { planilha: 'Planilha', docx: 'Documento', postits: 'Quadro' };

/** Botões de "Novo": compactos, ícone e nome; a descrição fica na dica. */
function BotoesNovo({ tipos, cx }) {
  return (
    <div className={'novos' + (tipos.length === 1 ? ' um' : '')}>
      {tipos.map((t) => {
        const bloq = cx.bloqueado(CMD_NOVO[t]);
        const dica = `${TIPOS[t].novo}|${bloq || DESCRICAO[t] + (TIPOS[t].chega ? ` Editor na ${TIPOS[t].chega}.` : '')}`;
        return (
          <button key={t} type="button" className="novo" disabled={!!bloq} data-dica={dica} aria-label={TIPOS[t].novo} data-novo={t} onClick={() => cx.executar(CMD_NOVO[t])}>
            <span className="ri"><Icone n={t} /><i className="mais"><Icone n="plus" /></i></span>
            <b>{tipos.length === 1 ? TIPOS[t].novo : NOME_CURTO[t]}</b>
            {TIPOS[t].chega && <span className="em">{TIPOS[t].chega}</span>}
          </button>
        );
      })}
    </div>
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

function useFiltro(chave) {
  const [f, setF] = useState(() => filtrosGuardados[chave] || FILTRO_PADRAO);
  const mudar = (novo) => { filtrosGuardados[chave] = novo; setF(novo); };
  return [f, mudar];
}

function Filtro({ f, mudar, tipos, aberto, setAberto }) {
  const ativo = f.q || f.tipo !== 'todos' || f.ordem !== 'recentes';
  const resumo = [f.q ? `"${f.q}"` : null, tipos && f.tipo !== 'todos' ? TIPOS[f.tipo].nome : null, ORDENS[f.ordem]].filter(Boolean).join(' · ');
  return (
    <button type="button" className={'filtro-b' + (ativo ? ' on' : '') + (aberto ? ' aberto' : '')} aria-expanded={aberto} aria-controls="filtro-painel" onClick={() => setAberto(!aberto)}>
      <Icone n="filtro" /><span className="res">{resumo}</span><Icone n="chevronBaixo" />
    </button>
  );
}

function PainelFiltro({ f, mudar, tipos, fechar }) {
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

/** Cabeçalho de uma lista (título, quantos, filtro) e as linhas filtradas. */
function ListaFiltrada({ chave, titulo, todos, tipos, cx, vazio }) {
  const [f, mudar] = useFiltro(chave);
  const [aberto, setAberto] = useState(false);
  const lista = aplicarFiltro(todos, f);
  /* Esc fecha o painel do filtro, esteja o foco onde estiver */
  useEffect(() => {
    if (!aberto) return undefined;
    const tecla = (ev) => { if (ev.key === 'Escape') setAberto(false); };
    addEventListener('keydown', tecla);
    return () => removeEventListener('keydown', tecla);
  }, [aberto]);
  return (
    <>
      <div className="secao">
        <h3>{titulo}</h3>
        <span className="cont">{lista.length === todos.length ? todos.length : `${lista.length} de ${todos.length}`}</span>
        {todos.length > 0 && <Filtro f={f} mudar={mudar} tipos={tipos} aberto={aberto} setAberto={setAberto} />}
      </div>
      {aberto && todos.length > 0 && <PainelFiltro f={f} mudar={mudar} tipos={tipos} fechar={() => setAberto(false)} />}
      {lista.length
        ? <div className="lista">{lista.map((x) => <LinhaArquivo key={x.id} f={x} cx={cx} />)}</div>
        : <div className="vazio-lista">{todos.length ? 'Nenhum arquivo com esse filtro.' : vazio}</div>}
    </>
  );
}

export function LinhaArquivo({ f, cx, lixeira }) {
  const bloq = (acao) => cx.bloqueado(acao, f);
  return (
    <div className="arq" data-id={f.id}>
      <button type="button" className="abre" onClick={() => (lixeira ? null : cx.abrir(f.id))} disabled={lixeira} style={lixeira ? { cursor: 'default' } : undefined}>
        <span className="ri"><Icone n={f.tipo} /></span>
        <span className="txt">
          <b>{f.nome}</b>
          <span>{TIPOS[f.tipo].nome} · {lixeira ? 'na lixeira desde ' + dataHora(f.lixeiraEm) : dataHora(f.alteradoEm)}</span>
        </span>
      </button>
      {!lixeira && <span className="selo warn">Rascunho</span>}
      {lixeira ? (
        <>
          <button type="button" className="btn sm" disabled={!!bloq('arquivo.restaurar')} onClick={() => cx.restaurar(f)}><Icone n="restaurar" />Restaurar</button>
          <button type="button" className="iconbtn" aria-label={'Excluir de vez: ' + f.nome} title={bloq('arquivo.excluirDeVez') || 'Excluir de vez'} disabled={!!bloq('arquivo.excluirDeVez')} onClick={() => cx.excluirDeVez(f)}><Icone n="x" /></button>
        </>
      ) : (
        <>
          <button type="button" className="iconbtn" aria-label={'Renomear: ' + f.nome} title={bloq('arquivo.renomear') || 'Renomear'} disabled={!!bloq('arquivo.renomear')} onClick={() => cx.perguntarNome(f)}><Icone n="renomear" /></button>
          <button type="button" className="iconbtn" aria-label={'Mandar para a lixeira: ' + f.nome} title={bloq('arquivo.lixeira') || 'Mandar para a lixeira'} disabled={!!bloq('arquivo.lixeira')} onClick={() => cx.lixeira(f)}><Icone n="lixeira" /></button>
        </>
      )}
    </div>
  );
}

function SeloDemo({ fichas, demo }) {
  if (!demo) return null;
  const n = ativos(fichas).length;
  return <span className={'selo ' + (n >= LIMITE_DEMO ? 'warn' : '')}>Demonstração: {n} de {LIMITE_DEMO} arquivos</span>;
}

export function Inicio({ fichas, cx, demo }) {
  const lista = maisRecentes(ativos(fichas));
  return (
    <div className="pagina">
      <div className="secao topo"><h3>Novo</h3><SeloDemo fichas={fichas} demo={demo} /></div>
      <BotoesNovo tipos={['planilha', 'docx', 'postits']} cx={cx} />
      <ListaFiltrada chave="inicio" titulo="Recentes" todos={lista} tipos={['planilha', 'docx', 'postits']} cx={cx}
        vazio="Nenhum arquivo ainda. Tudo o que você criar fica guardado neste aparelho." />
      {cx.instalar && <button type="button" className="btn sm instalar" onClick={cx.instalar}><Icone n="instalar" />Instalar o EFCdocs neste aparelho</button>}
    </div>
  );
}

export function ListaDoTipo({ tipo, fichas, cx, demo }) {
  const lista = maisRecentes(ativos(fichas).filter((f) => f.tipo === tipo));
  const titulo = { planilha: 'Planilhas', docx: 'Documentos', postits: 'Quadros' }[tipo];
  return (
    <div className="pagina">
      {TIPOS[tipo].chega && <div className="aviso-breve"><Icone n="info" /><span>O editor de {TIPOS[tipo].nome.toLowerCase()} chega na {TIPOS[tipo].chega}. Já dá para criar, renomear e organizar.</span></div>}
      <div className="secao topo"><BotoesNovo tipos={[tipo]} cx={cx} /><SeloDemo fichas={fichas} demo={demo} /></div>
      <ListaFiltrada chave={tipo} titulo={titulo} todos={lista} cx={cx} vazio={`Nenhum${tipo === 'postits' ? ' quadro' : tipo === 'docx' ? ' documento' : 'a planilha'} ainda.`} />
    </div>
  );
}

export function Lixeira({ fichas, cx }) {
  const lista = maisRecentes(naLixeira(fichas));
  return (
    <div className="pagina">
      <p className="sub">Restaure o que apagou ou exclua de vez (fica anotado no histórico).</p>
      {lista.length
        ? <div className="lista">{lista.map((f) => <LinhaArquivo key={f.id} f={f} cx={cx} lixeira />)}</div>
        : <div className="vazio-lista">A lixeira está vazia.</div>}
    </div>
  );
}

const PASTAS_INICIAIS = ['Treinamentos', 'Avaliação de Eficácia', 'Documentos Internos', 'Formulários', 'Fluxogramas'];
const Cartao = ({ ic, titulo, children }) => <div className="card plano"><b><Icone n={ic} />{titulo}</b><span>{children}</span></div>;

export function EmBreve({ qual }) {
  if (qual === 'pastas') {
    return (
      <div className="pagina">
        <div className="aviso-breve"><Icone n="info" /><span><b>Chega na v0.8.0.</b> Esta página mostra como vai ficar, combinado no PLANO v2.</span></div>
        <p className="sub">Pastas criadas e excluídas por Principais e Estrela; cada uma com Arquivados; subpastas por ano e mês; lançamento com número sequencial (ex.: TRE-2026-0001); depois de lançado, só Cancelar com motivo.</p>
        <div className="secao"><h3>Pastas iniciais</h3></div>
        <div className="planos">{PASTAS_INICIAIS.map((p) => <Cartao key={p} ic="pasta" titulo={p}>Arquivados · subpastas por ano e mês</Cartao>)}</div>
        <div className="secao"><h3>Regras</h3></div>
        <div className="planos">
          <Cartao ic="lixeira" titulo="Excluir pasta">Só vazia, com motivo. Com lançamentos, só arquivar.</Cartao>
          <Cartao ic="historico" titulo="Revisões de formulário">Rev. 00, 01…; aprovação por um Principal; antigas só para consulta.</Cartao>
          <Cartao ic="foto" titulo="Fotos">Apagam 15 dias depois de concluído o registro, 45 se não concluído. Aviso antes e "Baixar fotos".</Cartao>
        </div>
      </div>
    );
  }
  return (
    <div className="pagina">
      <div className="aviso-breve"><Icone n="info" /><span><b>Chega na v0.8.0.</b> Esta página mostra como vai ficar, combinado no PLANO v2.</span></div>
      <p className="sub">Documentos que vêm de fora e nunca são criados no app (alvará, licença ambiental, certificados, laudos de calibração, AVCB, contratos). Controle por validade, não por revisão.</p>
      <div className="planos">
        <Cartao ic="externo" titulo="Importar">PDF ou foto; não se edita; ficha com emissor, número, emissão, validade, responsável e unidade.</Cartao>
        <Cartao ic="aviso" titulo="Avisos">A vencer: 60, 30 e 7 dias antes. Vencido em vermelho.</Cartao>
        <Cartao ic="restaurar" titulo="Renovar">Novo arquivo e nova validade; o anterior vira Substituído e fica no histórico.</Cartao>
        <Cartao ic="cadeado" titulo="Nunca se apagam sozinhos">A regra de prazo das fotos não vale para eles.</Cartao>
      </div>
    </div>
  );
}

const O_QUE_VEM = {
  planilha: ['Grade com fórmulas em português e explicação da conta', 'Barra de status com Soma, Média e Contagem', 'Abrir e salvar Excel com relatório de compatibilidade (v0.5.0)'],
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
