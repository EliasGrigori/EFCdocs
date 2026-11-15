/* Vértice Docs — o detalhe ao lado (gaveta) no layout da família (docs/REGRAS-DE-LAYOUT.md):
   R6 situação com ponto e texto (caixa só no vermelho) · R8 cabeçalho da gaveta, anterior e próximo ·
   R9 histórico do arquivo com a linha do tempo da gota.
   As peças vêm de src/layout (window.EFCLayout); aqui fica só o HTML do Vértice em volta delas.
   Nada aqui grava no banco: o histórico é montado com o que a ficha já guarda (criado, alterado, lixeira) e com o
   estado do envio ao Cwork que já fica no aparelho. */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TIPOS } from '../nucleo/modelo.js';
import { Icone, usarEsc, dataHora } from './comum.jsx';

const peca = () => (typeof window !== 'undefined' ? window.EFCLayout : null);
const TOM = { ok: 'ok', warn: 'wa', wa: 'wa', crit: 'cr', cr: 'cr' };

/** R6 · situação: ponto colorido + texto, sem caixa. tom: '' (cinza), 'ok', 'warn' ou 'crit' (só este ganha caixa). */
export function Situacao({ tom = '', children, ...resto }) {
  return <span className={'efl-pilula' + (TOM[tom] ? ' ' + TOM[tom] : '')} {...resto}>{children}</span>;
}

/** A situação do arquivo, como o painel sempre mostrou (hoje todo arquivo é rascunho; na lixeira, diz isso). */
export function situacaoArquivo(f) {
  if (f.status === 'lixeira') return { tom: '', texto: 'Na lixeira' };
  return { tom: 'warn', texto: 'Rascunho' };
}

/** "Planilha · ETQ-001": o texto pequeno da linha de cima da gaveta. */
export const subDoArquivo = (f) => TIPOS[f.tipo].nome + (f.codigo ? ' · ' + f.codigo : '');

/**
 * R9 · as etapas do histórico de um arquivo, da mais antiga para a mais nova (a mais nova embaixo, onde a gota chega).
 * envio = o estado guardado no aparelho ({ rev, em, estado: 'caixa' | 'recebido' }) ou nada.
 */
export function etapasDoArquivo(f, envio) {
  const quem = (n) => (n && n !== 'neste aparelho' ? n : '');
  const meio = [];
  if (f.alteradoEm && f.alteradoEm !== f.criadoEm) meio.push({ t: f.alteradoEm, nome: 'Alterado', quem: quem(f.alteradoPor) });
  if (envio && envio.em) meio.push({ t: envio.em, nome: 'Mandado para o Cwork', txt: 'Versão ' + envio.rev, envio: true });
  meio.sort((a, b) => String(a.t).localeCompare(String(b.t)));
  const es = [{ nome: 'Criado', feito: true, data: dataHora(f.criadoEm), quem: quem(f.criadoPor) }];
  for (const m of meio) {
    es.push({ nome: m.nome, feito: true, data: dataHora(m.t), txt: m.txt, quem: m.quem });
    if (m.envio) es.push(envio.estado === 'recebido' ? { nome: 'Recebido pelo Cwork', feito: true, txt: 'Versão ' + envio.rev } : { nome: 'Recebido pelo Cwork', feito: false, atual: true, txt: 'Está na caixa, esperando o Cwork abrir' });
  }
  if (f.status === 'lixeira' && f.lixeiraEm) es.push({ nome: 'Mandado para a lixeira', feito: true, data: dataHora(f.lixeiraEm) });
  return es;
}

/**
 * Os dados da gaveta de um arquivo das listas (título, situação, linhas, histórico e botões).
 * cx.envioDe(id) = o estado do envio ao Cwork guardado no aparelho. extras = { situacoes, acoes } de quem chama.
 */
export function dadosDoArquivo(f, cx, { situacoes = [], acoes } = {}) {
  const bloq = (a) => cx.bloqueado(a, f) || '';
  const padrao = f.status === 'lixeira'
    ? [{ id: 'restaurar', rotulo: 'Restaurar', ic: 'restaurar', tipo: 'ouro', fazer: () => cx.restaurar(f), bloq: bloq('arquivo.restaurar') },
      { id: 'apagar', rotulo: 'Apagar para sempre', ic: 'lixeira', tipo: 'apagar', fazer: () => cx.excluirDeVez(f), bloq: bloq('arquivo.excluirDeVez') }]
    : [{ id: 'abrir', rotulo: 'Abrir', ic: f.tipo, tipo: 'ouro', fazer: () => cx.abrir(f.id) },
      { id: 'renomear', rotulo: 'Renomear', ic: 'renomear', fazer: () => cx.perguntarNome(f), bloq: bloq('arquivo.renomear') },
      { id: 'lixeira', rotulo: 'Lixeira', ic: 'lixeira', fazer: () => cx.lixeira(f), bloq: bloq('arquivo.lixeira') }];
  return {
    sub: subDoArquivo(f), titulo: f.nome,
    situacoes: [situacaoArquivo(f), ...situacoes],
    linhas: [f.pastaNome ? ['Documento interno', f.pastaNome] : null, ['Versão do arquivo', String(f.rev || 0).padStart(2, '0')]].filter(Boolean),
    etapas: etapasDoArquivo(f, cx.envioDe ? cx.envioDe(f.id) : null),
    acoes: acoes || padrao,
  };
}

/** R9 · o histórico com a gota. A gota só corre até o que a pessoa ainda não viu (a peça guarda isso no aparelho). */
export function Historico({ id, etapas }) {
  const ref = useRef(null);
  const assinatura = etapas.map((e) => [e.nome, e.data || '', e.txt || '', e.quem || '', e.feito ? 1 : 0].join('|')).join(';');
  const html = useMemo(() => { const l = peca(); return l ? l.linhaDoTempo('arq-' + id, etapas) : ''; }, [id, assinatura]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const l = peca(); if (l && ref.current) l.gota(ref.current, true); }, [html]);
  if (!html) return <ol className="gv-hist-simples">{etapas.map((e, i) => <li key={i}><b>{e.nome}</b> {e.data}</li>)}</ol>;
  return <div className="gv-hist" data-gv-hist ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * R8 · cabeçalho da gaveta: na linha de cima o texto pequeno (tipo · código) à esquerda e, à direita, as setas e o X
 * (o X é sempre o último); embaixo, o título com a largura toda.
 * nav = { ids, atual, abrir } liga anterior/próximo (setas e Alt + seta para cima/baixo); sem nav, só o X.
 */
export function CabGaveta({ sub, titulo, fechar, rotuloFechar = 'Fechar', nav }) {
  const casa = useRef(null);
  const abrir = useRef(null);
  abrir.current = nav ? nav.abrir : null;
  const ids = nav ? nav.ids.join('\n') : '';
  const atual = nav ? nav.atual : null;
  useLayoutEffect(() => {
    const l = peca(), el = casa.current;
    if (!l || !el) return undefined;
    /* as setas são redesenhadas pela peça a cada troca: quem estava com o teclado numa delas continua nela */
    const foco = document.activeElement && el.contains(document.activeElement) ? document.activeElement.getAttribute('data-d') : null;
    l.navGaveta({ acoes: el, ids: ids ? ids.split('\n') : [], atual, abrir: (id) => abrir.current && abrir.current(id), corpo: '.gv-corpo', classeBotao: 'iconbtn' });
    if (foco) { const b = el.querySelector(`button[data-d="${foco}"]:not([disabled])`) || el.querySelector('button:not([disabled])'); if (b) b.focus({ preventScroll: true }); }
    return () => l.navGaveta({ acoes: el, ids: [], atual: null });
  }, [ids, atual]);
  return (
    <header className="efl-gv-cab gv-cab">
      <span className="efl-gv-sub" data-gv-sub>{sub}</span>
      <span className="efl-gv-acoes">
        <span className="gv-nav" ref={casa} />
        <button type="button" className="iconbtn" aria-label={rotuloFechar} title={rotuloFechar} onClick={fechar}><Icone n="x" /></button>
      </span>
      <h2 data-gv-titulo>{titulo}</h2>
    </header>
  );
}

/**
 * A gaveta das telas de lista: abre ao lado, por cima da tabela, sem abrir o arquivo.
 * dados = { sub, titulo, situacoes: [{ tom, texto }], linhas: [[rótulo, valor]], etapas, acoes: [{ rotulo, ic, fazer, tipo, bloq }] }
 */
export function GavetaLista({ id, dados, ids, abrir, fechar }) {
  usarEsc(fechar, true);
  const ref = useRef(null);
  /* o teclado entra na gaveta quando ela abre (o Esc devolve para o botão que abriu) */
  useEffect(() => { const el = ref.current; if (el && !el.contains(document.activeElement)) el.focus({ preventScroll: true }); }, []);
  const alvo = typeof document !== 'undefined' ? document.querySelector('.work') : null;
  const gaveta = (
    <aside className="side gv-lista efl-gaveta" aria-label={'Detalhes: ' + dados.titulo} data-gaveta={id} tabIndex={-1} ref={ref}>
      <span className="alca" />
      <CabGaveta sub={dados.sub} titulo={dados.titulo} fechar={fechar} rotuloFechar="Fechar os detalhes" nav={{ ids, atual: id, abrir }} />
      <div className="gv-corpo">
        <p className="gv-sit" data-gv-sit>{dados.situacoes.map((s, i) => <Situacao key={i} tom={s.tom}>{s.texto}</Situacao>)}</p>
        {dados.linhas.length > 0 && (
          <div className="side-s">
            <dl>{dados.linhas.map(([dt, dd]) => [<dt key={dt + 't'}>{dt}</dt>, <dd key={dt + 'd'}>{dd}</dd>])}</dl>
          </div>
        )}
        <div className="side-s">
          <h4>Histórico</h4>
          <Historico id={id} etapas={dados.etapas} />
        </div>
      </div>
      <div className="gv-pe">
        {dados.acoes.map((a) => (
          <button key={a.rotulo} type="button" className={'btn' + (a.tipo === 'ouro' ? ' primary' : a.tipo === 'apagar' ? ' apagar' : '')} disabled={!!a.bloq} title={a.bloq || undefined} data-gv-acao={a.id} onClick={a.fazer}>
            <Icone n={a.ic} />{a.rotulo}
          </button>
        ))}
      </div>
    </aside>
  );
  return alvo ? createPortal(gaveta, alvo) : gaveta;
}
