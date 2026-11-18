/* Vértice Docs — peças das telas de lista (v0.6.20), no layout da família (docs/REGRAS-DE-LAYOUT.md):
   R1 tela parada, só a tabela rola · R2 sem rodapé e mais linhas sozinhas · R3 total no selo do cabeçalho ·
   R5 cabeçalho com a mesma medida · R8 a gaveta da linha · R10 esqueleto enquanto carrega. As peças de base estão em src/layout/. */
import { Children, cloneElement, createContext, isValidElement, useCallback, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { GavetaLista } from './gaveta.jsx';
import { Letras } from './letras.jsx';
import { CabColuna, MenuColuna, usarTabela } from './colunas.jsx';
import { colunasEmOrdem } from './tabelaColunas.js';

const peca = () => (typeof window !== 'undefined' ? window.EFCLayout : null);
export const PASSO_LINHAS = 100;
/* a barra de cima do Vértice tem 50 px; a tabela para a 16 px do fim da janela */
const TELA = { margem: 16, barraTopo: 50, minimo: 200 };

/** R5 · título, linha de pílulas (altura reservada mesmo vazia) e ações à direita. */
export function CabPagina({ titulo, meta, children, sub }) {
  const T = sub ? 'h2' : 'h1';
  return (
    <header className={'efl-cab pg-cab' + (sub ? ' sub' : '')}>
      <div className="efl-cab-tx">
        <T className="pg-tit">{typeof titulo === 'string' ? <Letras texto={titulo} canal={sub ? 'sub' : 'pagina'} /> : titulo}</T>
        <div className="efl-meta" data-meta>{meta}</div>
      </div>
      {children ? <div className="pg-acoes">{children}</div> : null}
    </header>
  );
}

/** R3 · o total da lista no selo do cabeçalho; filtrando, "· total filtrado" em dourado suave. */
export function SeloTotal({ n, total, unidade, lendo }) {
  if (lendo) return <span className="pg-lendo" data-cont>Carregando…</span>;
  const nome = (q) => (q === 1 ? unidade[0] : unidade[1]);
  const filtrado = n !== total;
  return (
    <span className={'efl-selo efl-selo-total' + (filtrado ? ' efl-filtrado' : '')} data-cont title={filtrado ? `${n} de ${total} ${nome(total)}` : undefined}>
      <span><b>{n}</b> {nome(n)}{filtrado ? ' · total filtrado' : ''}</span>
    </span>
  );
}

/** R1 · mede a tabela depois de cada desenho e no redimensionar; ao sair da tela, solta a trava. */
function usarTelaParada() {
  useLayoutEffect(() => {
    const l = peca(); if (!l) return;
    const pg = document.querySelector('.pagina'); if (pg && pg.scrollTop && innerWidth >= 900) pg.scrollTop = 0;
    l.fixarTela(TELA);
  });
  useEffect(() => {
    const l = peca(); if (!l) return undefined;
    const medir = () => l.fixarTela(TELA);
    addEventListener('resize', medir);
    /* ao sair: se a tela nova não tem tabela (um arquivo aberto, por exemplo), solta a trava; se tem, ela mesma já mediu */
    return () => { removeEventListener('resize', medir); requestAnimationFrame(() => { if (!document.querySelector('.efl-tabela-rola')) document.documentElement.classList.remove('efl-tela-parada'); }); };
  }, []);
}

/** R10 · o esqueleto só aparece se a leitura passar de 150 ms (leitura rápida não pisca). */
function usarEsqueleto(lendo) {
  const [mostra, setMostra] = useState(false);
  useEffect(() => {
    if (!lendo) { setMostra(false); return undefined; }
    const t = setTimeout(() => setMostra(true), 150);
    return () => clearTimeout(t);
  }, [lendo]);
  return lendo && mostra;
}
const LARGURAS = [62, 38, 54, 30, 46, 58];

/**
 * A tabela das listas. colunas = [{ id, rot, cls }]; linha(x, extra) devolve o <tr>.
 * reinicia = texto que muda quando o filtro muda (a lista volta às primeiras 100 linhas).
 * detalhe(x) = os dados da gaveta daquela linha (R8); com ele, extra = { detalhar, naGaveta } e a tabela cuida da gaveta:
 * qual linha está aberta, anterior e próximo na ordem da tabela, e fechar quando a linha sai da lista.
 * v0.6.24 · base = a lista antes dos filtros das colunas (com ela, toda coluna com v(x) ganha o menu do EFCwork);
 * a ordem das colunas vem do estado da tabela e as células de cada linha acompanham (linha(x) devolve um <td> por coluna, na ordem de colunas).
 */
const OrdemColunas = createContext(null);
/** A linha de uma lista: as células saem na ordem das colunas que o usuário escolheu (use no lugar de <tr>). */
export function Tr(props) { return reordenar(<tr {...props} />, useContext(OrdemColunas)); }
function reordenar(tr, perm) {
  if (!perm || !isValidElement(tr)) return tr;
  const tds = Children.toArray(tr.props.children).filter(Boolean);
  if (tds.length !== perm.length) return tr;
  return cloneElement(tr, undefined, perm.map((i) => tds[i]));
}
export function TabelaArquivos({ nome, rotulo, colunas, itens, base, unidade, linha, vazio, lendo, reinicia = '', detalhe }) {
  const [colAberta, setColAberta] = useState(null);
  const fecharCol = useCallback(() => setColAberta(null), []);
  const st = usarTabela(nome);
  const temMenu = (c) => !!base && typeof c.v === 'function' && !c.fixa;
  const cols = base ? colunasEmOrdem(colunas, st.colOrd) : colunas;
  const perm = cols === colunas ? null : cols.map((c) => colunas.indexOf(c));
  const [limite, setLimite] = useState(PASSO_LINHAS);
  const chaveCols = JSON.stringify([st.cf, st.ordem]);
  useEffect(() => { setLimite(PASSO_LINHAS); }, [reinicia, chaveCols]);
  const esqueleto = usarEsqueleto(lendo);
  usarTelaParada();
  const temMais = !lendo && itens.length > limite;
  useEffect(() => {
    const l = peca(); if (!l) return;
    l.carregaMais(() => setLimite((n) => n + PASSO_LINHAS));
  });
  /* R8 · a gaveta desta tabela */
  const [naGaveta, setNaGaveta] = useState(null);
  const pos = detalhe && naGaveta ? itens.findIndex((x) => x.id === naGaveta) : -1;
  const aberto = pos >= 0 ? itens[pos] : null;
  useEffect(() => { if (naGaveta && !aberto && !lendo) setNaGaveta(null); }, [naGaveta, aberto, lendo]); /* a linha saiu da lista (lixeira, filtro): a gaveta fecha */
  useEffect(() => { if (pos >= limite) setLimite(Math.ceil((pos + 1) / PASSO_LINHAS) * PASSO_LINHAS); }, [pos, limite]); /* próximo além das linhas já desenhadas */
  const idAberto = aberto ? aberto.id : null;
  useEffect(() => {
    if (!idAberto) return;
    const tr = document.querySelector(`[data-efl-tabela="${nome}"] tr.arq[data-id="${idAberto}"]`);
    if (tr && tr.scrollIntoView) tr.scrollIntoView({ block: 'nearest' });
  }, [idAberto, limite, nome]);
  const fechar = useCallback(() => setNaGaveta(null), []);
  const extra = (x) => ({ detalhar: detalhe ? () => setNaGaveta(x.id) : null, naGaveta: x.id === idAberto });
  return (
    <div className="tb-fora" data-efl-tabela={nome}>
      <div className="efl-tabela-rola" role="region" aria-label={rotulo} tabIndex={0}>
        <table className="tb-arq" aria-busy={lendo ? 'true' : undefined}>
          <thead><tr>{cols.map((c) => (
            <th key={c.id} scope="col" className={c.cls + (temMenu(c) ? ' col-th' : '') + (colAberta === c.id ? ' col-ab' : '')} data-col={c.id} data-col-fixa={c.fixa ? '1' : undefined}
              aria-sort={st.ordem && st.ordem.k === c.id ? (st.ordem.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
              {temMenu(c) ? <CabColuna nome={nome} col={c} cols={colunas} aberta={colAberta === c.id} abrir={setColAberta} /> : c.rot}
            </th>
          ))}</tr></thead>
          {esqueleto ? (
            <tbody className="efl-esq" data-esqueleto>
              {LARGURAS.map((w, i) => <tr key={i}>{cols.map((c, j) => <td key={c.id} className={c.cls}>{c.id === 'acoes' ? null : <i style={{ width: (j === 0 ? w : Math.max(24, w - 14 * j)) + '%' }} />}</td>)}</tr>)}
            </tbody>
          ) : (
            <tbody>
              <OrdemColunas.Provider value={perm}>
              {lendo ? null : itens.length
                ? itens.slice(0, limite).map((x) => linha(x, extra(x)))
                : <tr className="tb-vazio"><td colSpan={colunas.length}><div className="vazio-lista">{vazio}</div></td></tr>}
              </OrdemColunas.Provider>
            </tbody>
          )}
        </table>
        {temMais && <div className="efl-fim" data-efl-tabela={nome}>Carregando mais…</div>}
      </div>
      {colAberta && base && <MenuColuna nome={nome} cols={colunas} base={base} k={colAberta} fechar={fecharCol} unidade={unidade} />}
      {aberto && <GavetaLista id={aberto.id} dados={detalhe(aberto, fechar)} ids={itens.map((x) => x.id)} abrir={setNaGaveta} fechar={fechar} />}
    </div>
  );
}
