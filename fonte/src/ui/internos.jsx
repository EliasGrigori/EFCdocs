/* Vértice Docs — Ponte 1 (v0.6.16): Documentos internos com sub-abas, a janela de escolher sub-aba e código,
   e o painel "Resumo do envio" que vem do EFCwork junto com a ficha para preencher. */
import { useMemo, useState } from 'react';
import { TIPOS, ativos } from '../nucleo/modelo.js';
import { Janela, Icone, dataHora, usarEsc } from './comum.jsx';
import { CabPagina, SeloTotal, TabelaArquivos } from './listas.jsx';
import { useFiltro, Filtro, PainelFiltro, aplicarFiltro, BotaoDetalhes } from './paginas.jsx';
import { Situacao, dadosDoArquivo } from './gaveta.jsx';
import './internos.css';
import { SUBABAS, PODE_COMPARTILHAR, estadoDoc, linhasDoResumo, textoDoResumo, noDocumento } from '../ponte/ponte.js';
import { camposDoLivro, divergencias } from '../ponte/campos.js';

const copiar = async (texto, avisar, oQue) => {
  try { await navigator.clipboard.writeText(texto); avisar(`${oQue} copiado.`, { ic: 'check' }); } catch { avisar('Não deu para copiar aqui. Selecione o texto e use Ctrl+C.', { ic: 'aviso' }); }
};

/** R6 · a situação de um documento interno: ponto e texto (verde = recebido; amarelo = na caixa; cinza = não foi). */
function situacaoInterno(estado, x) {
  if (!PODE_COMPARTILHAR[x.tipo]) return { tom: '', texto: `Compartilhar chega na ${TIPOS[x.tipo].chega || 'v0.7.0'}` };
  return estadoDoc(estado, x.id);
}

/** Página "Documentos internos": uma aba por tipo de papel; cada linha diz se já foi para o Cwork. */
const COLUNAS_INTERNOS = [
  { id: 'codigo', rot: 'Código', cls: 'c-codigo' }, { id: 'nome', rot: 'Nome', cls: 'c-nome' }, { id: 'tipo', rot: 'Tipo', cls: 'c-tipo' },
  { id: 'quando', rot: 'Alterado em', cls: 'c-quando' }, { id: 'situacao', rot: 'Situação', cls: 'c-situacao' }, { id: 'acoes', rot: <span className="so-leitor">Ações</span>, cls: 'c-acoes' },
];

export function DocsInternos({ fichas, estado, cx, acrescentar, editar, lendo }) {
  const todos = useMemo(() => ativos(fichas).filter((f) => f.pastaNome), [fichas]);
  const [f, mudar] = useFiltro('internos');
  const [aberto, setAberto] = useState(false);
  usarEsc(() => setAberto(false), aberto);
  /* o filtro (nome e ordem) vale para todas as sub-abas; os contadores das abas seguem o filtro */
  const internos = aplicarFiltro([...todos].sort((a, b) => (b.alteradoEm || '').localeCompare(a.alteradoEm || '')), f);
  const [escolhida, setSub] = useState(null);
  const abas = [...SUBABAS, ...new Set(todos.map((x) => x.pastaNome).filter((n) => !SUBABAS.includes(n)))];
  const qt = (n) => internos.filter((x) => x.pastaNome === n).length;
  /* sem a aba "Todas" (pedido do Elias em 13/11): abre na primeira sub-aba que tem documento */
  const sub = escolhida && abas.includes(escolhida) ? escolhida : abas.find(qt) || abas[0];
  const lista = internos.filter((x) => x.pastaNome === sub);
  return (
    <div className="pagina pg-lista internos">
      <CabPagina titulo="Documentos internos" meta={<SeloTotal n={internos.length} total={todos.length} unidade={['documento', 'documentos']} lendo={lendo} />}>
        <button type="button" className="btn pg-novo" data-int-acrescentar onClick={acrescentar}><Icone n="plus" />Pôr um arquivo aqui</button>
      </CabPagina>
      <div className="efl-abas-linha">
        <div className="int-abas" role="tablist" aria-label="Sub-abas dos documentos internos">
          {abas.map((n) => (
            <button key={n} type="button" role="tab" aria-selected={sub === n} className={'int-aba' + (sub === n ? ' on' : '')} data-int-sub={n} onClick={() => setSub(n)}>
              {n}{qt(n) ? <span className="qt">{qt(n)}</span> : null}
            </button>
          ))}
        </div>
        <div className="efl-ferramentas">
          {todos.length > 0 && <Filtro f={f} mudar={mudar} aberto={aberto} setAberto={setAberto} />}
        </div>
      </div>
      {aberto && todos.length > 0 && <PainelFiltro f={f} mudar={mudar} fechar={() => setAberto(false)} />}
      <TabelaArquivos nome="internos" rotulo={'Documentos internos: ' + sub} colunas={COLUNAS_INTERNOS} itens={lista} lendo={lendo} reinicia={sub + '|' + f.q + '|' + f.ordem + '|' + f.tipo} filtro={{ f, mudar, tipos: ['planilha', 'docx', 'postits'] }}
        vazio={todos.length ? (internos.length ? `Nada em ${sub}.` : 'Nenhum documento com esse filtro.') : 'Ponha aqui as etiquetas, fichas, formulários, fluxogramas e POPs que vão para o Cwork: "Pôr um arquivo aqui" ou, com o arquivo aberto, Arquivo › Documento interno.'}
        detalhe={(x) => {
          const e = situacaoInterno(estado, x);
          return dadosDoArquivo(x, cx, { situacoes: [e], acoes: [
            { id: 'abrir', rotulo: 'Abrir', ic: x.tipo, tipo: 'ouro', fazer: () => cx.abrir(x.id) },
            { id: 'subaba', rotulo: 'Sub-aba e código', ic: 'renomear', fazer: () => editar(x) },
          ] });
        }}
        linha={(x, extra) => {
          const e = situacaoInterno(estado, x);
          return (
            <tr className={'arq' + (extra.naGaveta ? ' na-gaveta' : '')} key={x.id} data-id={x.id}>
              <td className="c-codigo">{x.codigo || ''}</td>
              <td className="c-nome">
                <button type="button" className="abre" title={x.nome} onClick={() => cx.abrir(x.id)}>
                  <span className="ri"><Icone n={x.tipo} /></span>
                  <span className="txt"><b>{x.nome}</b><span className="so-cel">{x.codigo || ''}<Situacao tom={e.tom}>{e.texto}</Situacao></span></span>
                </button>
              </td>
              <td className="c-tipo">{TIPOS[x.tipo].nome}</td>
              <td className="c-quando">{dataHora(x.alteradoEm)}</td>
              <td className="c-situacao"><Situacao tom={e.tom} data-int-estado={x.id}>{e.texto}</Situacao></td>
              <td className="c-acoes"><span className="acoes">
                <BotaoDetalhes nome={x.nome} extra={extra} />
                <button type="button" className="iconbtn" aria-label={'Sub-aba e código: ' + x.nome} title="Sub-aba e código" onClick={() => editar(x)}><Icone n="renomear" /></button>
              </span></td>
            </tr>
          );
        }} />
    </div>
  );
}

/** Escolher a sub-aba e o código de um documento interno (e, vindo da página, qual arquivo). */
export function JanelaInterno({ ficha, fichas, aoSalvar, aoFechar, depois }) {
  const opcoes = useMemo(() => (ficha ? [ficha] : ativos(fichas || []).filter((f) => !f.pastaNome)), [ficha, fichas]);
  const [id, setId] = useState(ficha ? ficha.id : (opcoes[0] && opcoes[0].id) || '');
  const atual = opcoes.find((f) => f.id === id);
  const [sub, setSub] = useState((ficha && ficha.pastaNome) || SUBABAS[1]);
  const [codigo, setCodigo] = useState((ficha && ficha.codigo) || '');
  const ok = atual && sub && codigo.length <= 20;
  return (
    <Janela titulo="Documento interno" icone="pasta" subtitulo={depois ? 'Escolha onde ele fica antes de ir para o Cwork' : 'Sub-aba e código'} aoFechar={aoFechar} classe="int-janela"
      rodape={<>
        {ficha && ficha.pastaNome && <button type="button" className="btn sm" data-int-tirar onClick={() => aoSalvar(ficha, { pastaNome: '', codigo: '' })}>Tirar dos documentos internos</button>}
        <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn sm primary" data-int-salvar disabled={!ok} onClick={() => aoSalvar(atual, { pastaNome: sub, codigo: codigo.trim() })}>{depois ? 'Salvar e compartilhar' : 'Salvar'}</button>
      </>}>
      <div className="janela-c int-campos">
        {!ficha && (
          <label className="campo"><span>Arquivo</span>
            {opcoes.length ? (
              <select value={id} data-int-arquivo onChange={(ev) => setId(ev.target.value)}>
                {opcoes.map((f) => <option key={f.id} value={f.id}>{f.nome} ({TIPOS[f.tipo].nome})</option>)}
              </select>
            ) : <small>Todos os arquivos já estão nos documentos internos.</small>}
          </label>
        )}
        <label className="campo"><span>Sub-aba</span>
          <select value={sub} data-int-subaba onChange={(ev) => setSub(ev.target.value)}>
            {SUBABAS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="campo"><span>Código (opcional, até 20 letras)</span>
          <input value={codigo} maxLength={20} placeholder="Ex.: FIC-01" data-int-codigo onChange={(ev) => setCodigo(ev.target.value)} />
        </label>
        <small className="op-dica">O Cwork separa a tabela de impressos por esta sub-aba e mostra o código, quem editou, a data e a versão.</small>
      </div>
    </Janela>
  );
}

/** Painel "Resumo do envio": os dados que o EFCwork mandou, com copiar, "na ficha" e quantos faltam. */
export function ResumoEnvio({ resumo, conteudo, avisar, aoFechar, aoPreencher }) {
  const linhas = useMemo(() => linhasDoResumo(resumo.dados), [resumo]);
  const achou = useMemo(() => noDocumento(conteudo, linhas), [conteudo, linhas]);
  const simples = linhas.filter((x) => x.tipo !== 'lista');
  const faltam = simples.filter((x) => !achou.has(x.chave)).length;
  /* v0.6.17 (Ponte 2): com campos marcados, dá para preencher e imprimir daqui; e o número da ficha que difere do envio é apontado (D03) */
  const campos = useMemo(() => (conteudo && conteudo.abas ? camposDoLivro(conteudo).campos : []), [conteudo]);
  const difere = useMemo(() => (campos.length ? divergencias(conteudo, campos, resumo.dados || {}) : new Map()), [conteudo, campos, resumo]);
  const preenche = campos.filter((x) => (x.lista || x.chave) in (resumo.dados || {})).length;
  return (
    <aside className="resumo-envio" aria-label="Resumo do envio" data-resumo>
      <div className="re-cab">
        <div><b>Resumo do envio</b><span>{resumo.titulo || 'Dados do EFCwork'}</span></div>
        <button type="button" className="iconbtn" aria-label="Fechar o resumo" title="Fechar (o resumo sai da caixa)" onClick={aoFechar}><Icone n="x" /></button>
      </div>
      <div className="re-conta" data-resumo-faltam>{faltam ? `Faltam ${faltam} de ${simples.length}` : `Todos os ${simples.length} já estão na ficha`}</div>
      {difere.size > 0 && <div className="re-difere" data-resumo-difere>{difere.size === 1 ? 'Um número da ficha está diferente do envio.' : `${difere.size} números da ficha estão diferentes do envio.`}</div>}
      <div className="re-linhas">
        {linhas.map((x) => (
          <div key={x.chave} className={'re-linha' + (achou.has(x.chave) ? ' na-ficha' : '')} data-resumo-chave={x.chave}>
            <span className="re-rot">{x.rotulo}</span>
            {x.tipo === 'lista' ? (
              <ol className="re-lista">{x.linhas.map((t, i) => <li key={i}><span>{t}</span><button type="button" className="iconbtn" aria-label={'Copiar ' + t} onClick={() => copiar(t, avisar, 'Linha')}><Icone n="copiar" /></button></li>)}</ol>
            ) : (
              <span className="re-val"><b>{x.texto}</b>{difere.has(x.chave) ? <em className="dif" data-difere={x.chave}>na ficha está {difere.get(x.chave).toLocaleString('pt-BR')}</em> : achou.has(x.chave) && <em><Icone n="check" />na ficha</em>}
                <button type="button" className="iconbtn" aria-label={'Copiar ' + x.rotulo} title="Copiar" onClick={() => copiar(x.texto, avisar, x.rotulo)}><Icone n="copiar" /></button></span>
            )}
          </div>
        ))}
      </div>
      <div className="re-rod">
        <button type="button" className="btn sm" data-resumo-tudo onClick={() => copiar(textoDoResumo(resumo.titulo, linhas), avisar, 'Resumo')}><Icone n="copiar" />Copiar tudo</button>
        {preenche > 0 && aoPreencher && <button type="button" className="btn sm primary" data-resumo-preencher title={`O documento tem ${preenche} ${preenche === 1 ? 'campo marcado' : 'campos marcados'} para estes dados`} onClick={aoPreencher}><Icone n="imprimir" />Preencher e imprimir</button>}
      </div>
    </aside>
  );
}
