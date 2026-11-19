/* Vértice Docs v0.6.41 — Planilha: segmentação de dados de tabela (S1). A segmentação que veio do Excel aparece no lugar dela,
   com um botão por valor da coluna; tocar filtra a tabela (o filtro da própria tabela, v0.6.40), mesmo se a tabela está em
   outra aba. Como no Excel: toque = só aquele valor; Ctrl+toque ou o botão de seleção múltipla = soma ou tira um valor;
   o funil com X limpa. Valores sem linha por causa de outro filtro ficam apagados e vão para o fim.
   Modelo: aba.seg (xlsx/segmentacaoXlsx.js). Mover e mudar o tamanho ficam para o S2. */
import { useState } from 'react';
import { Icone } from '../ui/comum.jsx';
import { recorteDoObjeto } from './objetos.js';
import { estadoDaSeg, filtroAoTocar, filtroLimpo, tamanhoDaSeg } from './segmentacao.js';
import { gravarFiltroComAviso } from './filtrosUi.jsx';
import './segmentacao.css';

function Seg({ s, e, multi, setMulti, aplicar, somenteLeitura, minimo }) {
  const titulo = s.semTitulo ? null : (
    <div className="seg-cab">
      <b title={s.titulo}>{s.titulo}</b>
      <button type="button" className={'seg-ic' + (multi ? ' on' : '')} data-seg-multi aria-pressed={multi} aria-label="Seleção múltipla" title="Seleção múltipla (ou Ctrl+clique)" onClick={() => setMulti(!multi)}><Icone n="n:checklist" /></button>
      <button type="button" className="seg-ic" data-seg-limpar disabled={!e.filtrada || somenteLeitura} aria-label={'Limpar filtro de ' + s.titulo} title="Limpar filtro" onClick={() => aplicar(filtroLimpo(e), 'Limpar a segmentação')}><Icone n="n:limparFiltro" /></button>
    </div>
  );
  return (
    <>
      {titulo}
      <div className="seg-itens" style={{ gridTemplateColumns: `repeat(${s.cols}, minmax(0, 1fr))`, '--seg-alt': Math.max(minimo, s.alt) + 'px' }}>
        {e.itens.map((i) => (
          <button key={i.t} type="button" className={'seg-it' + (i.marcado ? ' on' : '') + (i.ok ? '' : ' sem')} data-seg-item={i.t} aria-pressed={i.marcado} disabled={somenteLeitura}
            title={i.ok ? i.t || '(vazio)' : (i.t || '(vazio)') + ': nenhuma linha com os outros filtros'}
            onClick={(ev) => { const f = filtroAoTocar(e, i.t, multi || ev.ctrlKey || ev.metaKey); if (f) aplicar(f, 'Segmentação'); }}>{i.t || '(vazio)'}</button>
        ))}
      </div>
    </>
  );
}

/** As segmentações da aba, por cima da grade. */
export function Segmentacoes({ c, abaId, G, tam, motor, mudar, avisar, somenteLeitura }) {
  const [multi, setMulti] = useState({});
  const lista = (c.abas[abaId] && c.abas[abaId].seg) || [];
  if (!lista.length) return null;
  const z = G.z;
  /* botões com 28 px no mouse e 44 px de verdade no toque (o desenho já vem aumentado pelo zoom) */
  const minimo = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches ? Math.ceil(44 / z) : 28;
  return (
    <div className="pl-objs pl-segs" style={{ left: G.hw, top: G.hh, width: Math.max(0, tam.W - G.hw), height: Math.max(0, tam.H - G.hh) }}>
      {lista.map((s) => {
        const e = estadoDaSeg(c, motor, s);
        if (!e) return null;
        const a = s.a, x = G.xDe(a.c1) + a.dx1 * z, y = G.yDe(a.l1) + a.dy1 * z;
        const tm = tamanhoDaSeg(c.abas[abaId], a), r = { x, y, w: tm.w * z, h: tm.h * z };
        const rc = recorteDoObjeto({ l: a.l1, c: a.c1 }, r, G);
        if (!rc.visivel) return null;
        const aplicar = (fil, rotulo) => gravarFiltroComAviso({ c, abaId: e.t.aba, k: e.alvo.k, fil, rotulo, mudar, avisar, textoDe: e.ler.textoDe, x: e.ler.x });
        return (
          <div key={s.nome} className={'pl-seg' + (e.filtrada ? ' filtrada' : '')} data-seg={s.nome} role="group" aria-label={'Segmentação ' + s.titulo}
            style={{ left: r.x - G.hw, top: r.y - G.hh, width: r.w, height: r.h, clipPath: rc.semCorte ? undefined : `inset(${rc.corte.t}px ${rc.corte.r}px ${rc.corte.b}px ${rc.corte.l}px)` }}
            onPointerDown={(ev) => { ev.stopPropagation(); ev.preventDefault(); /* o foco fica na grade: Ctrl+Z logo depois desfaz */ }}>
            <div className="pl-seg-in" style={{ width: r.w / z, height: r.h / z, transform: `scale(${z})`, transformOrigin: '0 0', '--seg-min': minimo + 'px' }}>
              <Seg s={s} e={e} multi={!!multi[s.nome]} setMulti={(v) => setMulti((m) => ({ ...m, [s.nome]: v }))} aplicar={aplicar} somenteLeitura={somenteLeitura} minimo={minimo} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
