/* Vértice Docs v0.6.40 — Planilha: setas e menu dos filtros (o da aba e o de cada tabela, T2).
   Saiu de Planilha.jsx (v0.6.3 a v0.6.24 parte 2): no título, só uma setinha para baixo, sem caixa; o contorno aparece
   ao passar o mouse; o menu é o do EFCwork, com os filtros do Excel. D-15: colunas roladas para trás das congeladas
   não mostram seta. Agora cada tabela com setas tem as dela, além do filtro da aba. */
import { Icone } from '../ui/comum.jsx';
import { chave, letraCol } from './ref.js';
import { estiloVisto } from './grade.js';
import * as D from './dados.js';
import * as FT from './filtrosTabela.js';
import { MenuFiltro } from './filtroMenu.jsx';
import { tipoDaColuna } from './filtroCriterios.js';

/** Grava um filtro (o da aba, k = null, ou o da tabela k) e diz quantas linhas ficaram, como o Excel faz na barra de baixo (v0.6.4, Grok B02). */
export function gravarFiltroComAviso({ c, abaId, k = null, fil, rotulo, mudar, avisar, textoDe, x }) {
  const feito = mudar(FT.mudancasDosFiltros(c, abaId, k, fil, textoDe, x), rotulo);
  if (feito !== false && fil) {
    const n = D.contagemDoFiltro(k == null ? fil : FT.filDaTabela({ ...c.tabelas[k], fil }), textoDe, x);
    if (n.total) avisar(n.visiveis + ' de ' + n.total + ' linhas aparecem.' + (fil.cx ? D.AVISO_CX : ''), { ic: 'filtro' });
  }
  return feito;
}

/** Dados › Filtrar (Ctrl+Shift+L): liga ou tira o filtro da tabela em que a célula está; fora de tabela, o da aba. */
export function alternarFiltroDaCelula({ c, abaId, ativa, area, mudar, avisar, ler }) {
  const a = FT.alvoDoFiltro(c, abaId, ativa.l, ativa.c);
  if (a.fil) { mudar(FT.tirarFiltro(c, abaId, a.k, ler), 'Tirar o filtro'); avisar('Filtro tirado: todas as linhas voltam.', { ic: 'filtro' }); return; }
  if (a.t) { mudar(FT.ligarFiltro(c, a.k), 'Filtrar'); avisar(`Use a seta de cada título para escolher o que aparece na tabela ${a.t.nome}.`, { ic: 'filtro' }); return; }
  const f = area();
  if (f.l2 - f.l1 < 1) { avisar('Clique numa célula da tabela (a primeira linha é o cabeçalho) para filtrar.', { ic: 'aviso' }); return; }
  mudar({ [`conteudo.abas.${abaId}.fil`]: D.novoFiltro(f) }, 'Filtrar');
  avisar('Use a seta de cada título para escolher o que aparece.', { ic: 'filtro' });
}

/** As setas de todos os filtros da aba e o menu aberto. menuFiltro = { col, k } (k null = filtro da aba). */
export function SetasDeFiltro(p) {
  const { c, abaId, G, tam, motor, menuFiltro, setMenuFiltro, textoDe, valorDe, xDados, gravar, aplicarLote, avisar, voltarFoco } = p;
  const aba = c.abas[abaId];
  const out = [];
  for (const { k, fil } of FT.filtrosDaAba(c, abaId)) {
    const ff = D.faixaDoFiltro(fil);
    if (!ff) continue;
    const y1 = G.yFim(ff.l1);
    if (y1 - G.yDe(ff.l1) < 14 || y1 < G.hh + 8 || G.yDe(ff.l1) > tam.H || (ff.l1 >= G.cl && y1 < G.hh + G.fy + 8)) continue;
    const pre = k == null ? '' : k + ':';
    for (let cc = ff.c1; cc <= ff.c2; cc++) {
      const x0 = G.xDe(cc), x1 = G.xFim(cc);
      if (x1 - x0 < 22 || x1 < G.hw + 22 || x0 > tam.W - 4 || (cc >= G.cc && x1 < G.hw + G.fx + 22)) continue;
      const filtrada = D.colunaFiltrada(fil, cc), fd = estiloVisto(c, aba.cel[chave(ff.l1, cc)], motor, abaId, ff.l1, cc).fundo, m = /^#?([0-9a-f]{6})$/i.exec(fd || '');
      /* título de fundo escuro (estilo de tabela verde, azul...): a setinha fica clara */
      const escuro = m && (() => { const n = parseInt(m[1], 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) < 140; })();
      out.push(
        <button key={pre + cc} type="button" className={'pl-seta-filtro discreta' + (filtrada ? ' on' : '') + (escuro ? ' em-escuro' : '')} data-seta-filtro={cc} data-seta-tabela={k == null ? undefined : k} tabIndex={-1}
          aria-label={(filtrada ? 'Filtro ativo na coluna ' : 'Filtrar a coluna ') + letraCol(cc)} title={filtrada ? 'Esta coluna está filtrada' : 'Filtrar esta coluna'}
          style={{ left: Math.min(x1, tam.W) - 16, top: y1 - 16 }}
          onPointerDown={(ev) => { ev.preventDefault(); ev.stopPropagation(); setMenuFiltro((mm) => (mm && mm.col === cc && (mm.k ?? null) === k ? null : { col: cc, k })); }}><Icone n={filtrada ? 'filtro' : 'chevronBaixo'} /></button>,
      );
    }
    if (!menuFiltro || (menuFiltro.k ?? null) !== k || menuFiltro.col < ff.c1 || menuFiltro.col > ff.c2) continue;
    const cc = menuFiltro.col, x0 = G.xDe(cc);
    const amostras = [], fundos = new Set(), letras = new Set();
    for (let l = ff.l1 + 1; l <= Math.min(ff.l2, ff.l1 + 5000); l++) { amostras.push({ v: valorDe(l, cc), t: textoDe(l, cc) }); const kk = xDados.corDe(l, cc); fundos.add(kk.fundo); letras.add(kk.cor); }
    const cores = { fundos: fundos.size > 1 ? [...fundos] : [], letras: letras.size > 1 ? [...letras] : [] };
    const fechar = () => { setMenuFiltro(null); setTimeout(voltarFoco, 0); };
    const ordenar = () => {
      setMenuFiltro(null);
      const r = D.cicloDeOrdem(c, abaId, cc, { valorDe, ...(k == null ? {} : { fil, guardar: FT.guardarNaTabela(c, k) }) });
      if (r.erro) { avisar(r.erro, { ic: 'aviso' }); return; }
      aplicarLote(r.lote, r.rotulo); avisar(r.aviso, { ic: 'classificar' });
    };
    out.push(
      <MenuFiltro key={'menu:' + pre + cc + ':' + fil.fx} x={Math.max(G.hw, Math.min(x0, tam.W - 304))} y={Math.min(y1 + 2, Math.max(G.hh, tam.H - 420))} tipo={tipoDaColuna(amostras)} cores={cores} criterio={fil.cr && fil.cr[cc]}
        titulo={textoDe(ff.l1, cc) || 'coluna ' + letraCol(cc)} valores={D.valoresDaColuna(fil, cc, textoDe, valorDe, xDados.corDe)} filtrada={D.colunaFiltrada(fil, cc)}
        ordem={D.estadoDaOrdem(fil, cc)} aoCiclo={ordenar}
        aoAplicar={(esc, todos) => { gravar(D.comCriterio(fil, cc, esc, todos), 'Filtrar', k); fechar(); }}
        aoCriterio={(cr) => { gravar({ ...fil, cr: { ...fil.cr, [cc]: cr } }, 'Filtrar', k); fechar(); }}
        aoLimparColuna={() => { setMenuFiltro(null); const cr = { ...fil.cr }; delete cr[cc]; gravar({ ...fil, cr }, 'Limpar o filtro da coluna', k); }}
        aoFechar={fechar} />,
    );
  }
  return <>{out}</>;
}
