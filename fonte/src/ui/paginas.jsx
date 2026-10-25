/* EFCdocs — páginas: Início, lista por tipo, Lixeira, Pastas e Documentos externos (prévia da v0.8.0). */
import { TIPOS, ativos, naLixeira, maisRecentes } from '../nucleo/modelo.js';
import { LIMITE_DEMO } from '../nucleo/banco.js';
import { Icone, dataHora } from './comum.jsx';

const CMD_NOVO = { planilha: 'arquivo.novaPlanilha', docx: 'arquivo.novoDocumento', postits: 'arquivo.novoQuadro' };
const DESCRICAO = {
  planilha: 'Fórmulas em português. Abrir e salvar Excel chega na v0.5.0.',
  docx: 'POP, formulários e documentos internos.',
  postits: 'Quadro, Kanban e fluxograma com setas.',
};

function BotoesNovo({ tipos, cx }) {
  return (
    <div className="novos">
      {tipos.map((t) => {
        const bloq = cx.bloqueado(CMD_NOVO[t]);
        return (
          <button key={t} type="button" className="novo" disabled={!!bloq} title={bloq || TIPOS[t].novo} data-novo={t} onClick={() => cx.executar(CMD_NOVO[t])}>
            <span className="ri"><Icone n={t} /></span>
            <span>
              <b>{TIPOS[t].novo}</b>
              <span>{DESCRICAO[t]}{TIPOS[t].chega ? ` Editor na ${TIPOS[t].chega}.` : ''}</span>
            </span>
          </button>
        );
      })}
    </div>
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
      <h2>Início</h2>
      <p className="sub">Crie uma planilha, um documento ou um quadro. Tudo fica guardado neste aparelho e compactado. Nesta versão o quadro de post-its e a planilha já funcionam; o documento chega na v0.7.0.</p>
      <div className="secao"><h3>Novo</h3><SeloDemo fichas={fichas} demo={demo} /></div>
      <BotoesNovo tipos={['planilha', 'docx', 'postits']} cx={cx} />
      <div className="secao"><h3>Recentes</h3><span className="cont">{lista.length} {lista.length === 1 ? 'arquivo' : 'arquivos'}</span></div>
      {lista.length
        ? <div className="lista">{lista.map((f) => <LinhaArquivo key={f.id} f={f} cx={cx} />)}</div>
        : <div className="vazio-lista">Nenhum arquivo ainda. Toque em um dos botões acima para criar.</div>}
      {cx.instalar && (
        <>
          <div className="secao"><h3>Instalar</h3></div>
          <button type="button" className="btn" onClick={cx.instalar}><Icone n="instalar" />Instalar o EFCdocs neste aparelho</button>
        </>
      )}
    </div>
  );
}

export function ListaDoTipo({ tipo, fichas, cx, demo }) {
  const lista = maisRecentes(ativos(fichas).filter((f) => f.tipo === tipo));
  const titulo = { planilha: 'Planilhas', docx: 'Documentos', postits: 'Quadros de post-its' }[tipo];
  const sub = TIPOS[tipo].chega
    ? `O editor de ${TIPOS[tipo].nome.toLowerCase()} chega na ${TIPOS[tipo].chega}. Já dá para criar, renomear e organizar.`
    : 'Quadro livre com post-its, formas de fluxograma e setas presas, Kanban, raias por setor e PDF paisagem.';
  return (
    <div className="pagina">
      <h2>{titulo}</h2>
      <p className="sub">{sub}</p>
      <div className="secao"><h3>Novo</h3><SeloDemo fichas={fichas} demo={demo} /></div>
      <BotoesNovo tipos={[tipo]} cx={cx} />
      <div className="secao"><h3>{titulo}</h3><span className="cont">{lista.length}</span></div>
      {lista.length
        ? <div className="lista">{lista.map((f) => <LinhaArquivo key={f.id} f={f} cx={cx} />)}</div>
        : <div className="vazio-lista">Nenhum arquivo deste tipo ainda.</div>}
    </div>
  );
}

export function Lixeira({ fichas, cx }) {
  const lista = maisRecentes(naLixeira(fichas));
  return (
    <div className="pagina">
      <h2>Lixeira</h2>
      <p className="sub">Rascunhos que você apagou. Dá para restaurar. "Excluir de vez" apaga do aparelho e fica anotado no histórico. Registros lançados não vêm para cá: eles só podem ser cancelados com motivo (chega na v0.8.0).</p>
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
        <h2>Pastas</h2>
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
      <h2>Documentos externos</h2>
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
        <p>Este arquivo já está guardado no aparelho. Teste agora: renomear (toque no nome lá em cima), desfazer e refazer, a faixa, o painel e os temas.</p>
        <ul>{O_QUE_VEM[tipo].map((t) => <li key={t}><Icone n="check" />{t}</li>)}</ul>
      </div>
    </div>
  );
}
