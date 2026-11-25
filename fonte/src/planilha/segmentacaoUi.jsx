/* Vértice Docs v0.6.41 — Planilha: segmentação de dados de tabela (S1). A segmentação que veio do Excel aparece no lugar dela,
   com um botão por valor da coluna; tocar filtra a tabela (o filtro da própria tabela, v0.6.40), mesmo se a tabela está em
   outra aba. Como no Excel: toque = só aquele valor; Ctrl+toque ou o botão de seleção múltipla = soma ou tira um valor;
   o funil com X limpa. Valores sem linha por causa de outro filtro ficam apagados e vão para o fim.
   v0.6.42 (S2): Inserir › Segmentação de dados; tocar no título escolhe; arrastar o título move; a alça do canto muda o
   tamanho; a barra em cima tem Configurações e a lixeira (Delete também apaga); dois cliques no título abrem as configurações.
   Modelo: aba.seg (xlsx/segmentacaoXlsx.js e segmentacao.js). */
import { useEffect, useRef, useState } from 'react';
import { Icone, Janela, usarEsc } from '../ui/comum.jsx';
import { recorteDoObjeto, retDoObjeto, ancoraNoPonto } from './objetos.js';
import { estadoDaSeg, filtroAoTocar, filtroLimpo, posDaSeg, comSeg, apagarSeg, novasSegs, colunasDaTabela, SEG } from './segmentacao.js';
import { alvoDoFiltro } from './filtrosTabela.js';
import { gravarFiltroComAviso } from './filtrosUi.jsx';
import './segmentacao.css';

function Seg({ s, e, multi, setMulti, aplicar, somenteLeitura, minimo, aoBaixarTitulo }) {
  const titulo = s.semTitulo ? null : (
    <div className="seg-cab" data-seg-titulo onPointerDown={aoBaixarTitulo}>
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
export function Segmentacoes({ c, abaId, G, tam, motor, mudar, avisar, perguntar, somenteLeitura, rolarPor }) {
  const [multi, setMulti] = useState({});
  const [sel, setSel] = useState(null); // nome da segmentação escolhida
  const [arr, setArr] = useState(null); // arrastando: { nome, modo: 'mover' | 'tamanho', ddx, ddy }
  const toque = useRef(null);
  const aba = c.abas[abaId];
  const lista = (aba && aba.seg) || [];
  const escolhida = sel && lista.some((s) => s.nome === sel) ? sel : null;
  usarEsc(() => setSel(null), !!escolhida);
  const apagar = (nome) => { mudar(apagarSeg(c, motor, abaId, nome), 'Excluir a segmentação'); setSel(null); avisar('Segmentação excluída. Dá para desfazer.', { ic: 'lixeira' }); };
  const configurar = (s) => perguntar && perguntar({ Componente: JanelaConfigSeg, props: { s, aoAplicar: (campos) => mudar(comSeg(c, abaId, s.nome, campos), 'Configurações da segmentação') } });
  /* Delete apaga a escolhida; tocar fora tira a escolha */
  useEffect(() => {
    if (!escolhida) return undefined;
    const tecla = (ev) => { if ((ev.key === 'Delete' || ev.key === 'Backspace') && !somenteLeitura && !(ev.target.closest && ev.target.closest('input,textarea,[contenteditable="true"],.janela'))) { ev.preventDefault(); ev.stopPropagation(); apagar(escolhida); } };
    const fora = (ev) => { if (!ev.target.closest || !ev.target.closest('.pl-seg, .pl-seg-barra')) { setSel(null); toque.current = null; /* o clique de fora não vale como primeiro de dois cliques */ } };
    window.addEventListener('keydown', tecla, true); document.addEventListener('pointerdown', fora, true);
    return () => { window.removeEventListener('keydown', tecla, true); document.removeEventListener('pointerdown', fora, true); };
  }); // eslint-disable-line react-hooks/exhaustive-deps
  if (!lista.length) return null;
  const z = G.z;
  /* botões com 28 px no mouse e 44 px de verdade no toque (o desenho já vem aumentado pelo zoom) */
  const minimo = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches ? Math.ceil(44 / z) : 28;
  const comecar = (ev, s, modo) => {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    if (ev.target.closest && ev.target.closest('.seg-ic')) return;
    ev.preventDefault(); ev.stopPropagation();
    const agora = ev.timeStamp || Date.now(), ult = toque.current;
    toque.current = { nome: s.nome, t: agora };
    setSel(s.nome);
    /* dois cliques sem arrastar abrem as configurações (decide ao soltar: escolher e já arrastar só move) */
    const dupla = modo === 'mover' && ult && ult.nome === s.nome && agora - ult.t < 450;
    if (somenteLeitura) return;
    const el = ev.currentTarget, x0 = ev.clientX, y0 = ev.clientY;
    try { el.setPointerCapture(ev.pointerId); } catch { /* sem captura */ }
    let ultimo = null;
    const mover = (m) => { ultimo = { nome: s.nome, modo, ddx: m.clientX - x0, ddy: m.clientY - y0 }; setArr(ultimo); };
    const soltar = () => {
      el.removeEventListener('pointermove', mover); el.removeEventListener('pointerup', soltar); el.removeEventListener('pointercancel', soltar);
      setArr(null);
      if (!ultimo || Math.abs(ultimo.ddx) + Math.abs(ultimo.ddy) < 4) { if (dupla) { toque.current = null; configurar(s); } else if (ev.pointerType !== 'mouse') trazerParaATela(s); return; }
      toque.current = null;
      const p = posDaSeg(aba, s);
      if (modo === 'mover') { const r = retDoObjeto(p, G); mudar(comSeg(c, abaId, s.nome, ancoraNoPonto(G, Math.max(G.hw, r.x + ultimo.ddx), Math.max(G.hh, r.y + ultimo.ddy))), 'Mover a segmentação'); }
      else mudar(comSeg(c, abaId, s.nome, { w: Math.round(Math.max(SEG.W_MIN, p.w + ultimo.ddx / z)), h: Math.round(Math.max(SEG.H_MIN, p.h + ultimo.ddy / z)) }), 'Tamanho da segmentação');
    };
    el.addEventListener('pointermove', mover); el.addEventListener('pointerup', soltar); el.addEventListener('pointercancel', soltar);
  };
  /* v0.6.63 (42·H13): no toque, a segmentação escolhida que passa da borda da tela vem para dentro dela (a grade rola o que
     falta, sem passar do começo dela), para a barra e a alça do canto ficarem à mão sem rolar */
  const trazerParaATela = (s) => {
    if (!rolarPor) return;
    const r = retDoObjeto(posDaSeg(aba, s), G), folga = 8;
    const dx = r.x + r.w > tam.W - folga ? Math.min(r.x + r.w - (tam.W - folga), Math.max(0, r.x - G.hw - folga)) : 0;
    const dy = r.y + r.h > tam.H - folga ? Math.min(r.y + r.h - (tam.H - folga), Math.max(0, r.y - G.hh - folga)) : 0;
    if (dx <= 0 && dy <= 0) return;
    /* o "clique" do toque chega depois da rolagem, no mesmo ponto da tela: lá agora pode estar a engrenagem da barra */
    const engole = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
    document.addEventListener('click', engole, { capture: true, once: true });
    setTimeout(() => document.removeEventListener('click', engole, { capture: true }), 500);
    rolarPor(dx, dy);
  };
  let barra = null;
  const caixas = lista.map((s) => {
    const e = estadoDaSeg(c, motor, s);
    if (!e) return null;
    const p = posDaSeg(aba, s), r = retDoObjeto(p, G), a = arr && arr.nome === s.nome ? arr : null;
    if (a && a.modo === 'mover') { r.x += a.ddx; r.y += a.ddy; }
    if (a && a.modo === 'tamanho') { r.w = Math.max(SEG.W_MIN * z, r.w + a.ddx); r.h = Math.max(SEG.H_MIN * z, r.h + a.ddy); }
    const rc = recorteDoObjeto(p, r, G);
    if (!rc.visivel && !a) return null;
    const aplicar = (fil, rotulo) => gravarFiltroComAviso({ c, abaId: e.t.aba, k: e.alvo.k, fil, rotulo, mudar, avisar, textoDe: e.ler.textoDe, x: e.ler.x });
    const esta = escolhida === s.nome;
    if (esta && !a && !somenteLeitura) {
      barra = (
        <div className="pl-obj-barra pl-seg-barra" data-seg-barra style={{ left: Math.max(0, Math.min(r.x - G.hw + r.w - 70, tam.W - G.hw - 100)), top: Math.max(0, Math.min(r.y - G.hh - 40, tam.H - G.hh - 48)) }} onPointerDown={(ev) => { ev.stopPropagation(); ev.preventDefault(); }}>
          <button type="button" className="iconbtn" data-seg-config aria-label="Configurações da segmentação" title="Configurações" onClick={() => configurar(s)}><Icone n="gear" /></button>
          <button type="button" className="iconbtn" data-seg-apagar aria-label="Excluir a segmentação" title="Excluir (Delete)" onClick={() => apagar(s.nome)}><Icone n="lixeira" /></button>
        </div>
      );
    }
    return (
      <div key={s.nome} className={'pl-seg' + (e.filtrada ? ' filtrada' : '') + (esta ? ' escolhida' : '') + (s.semTitulo ? ' sem-titulo' : '')} data-seg={s.nome} role="group" aria-label={'Segmentação ' + s.titulo}
        style={{ left: r.x - G.hw, top: r.y - G.hh, width: r.w, height: r.h, clipPath: a || rc.semCorte ? undefined : `inset(${rc.corte.t}px ${rc.corte.r}px ${rc.corte.b}px ${rc.corte.l}px)` }}
        onPointerDown={(ev) => { ev.stopPropagation(); ev.preventDefault(); /* o foco fica na grade: Ctrl+Z logo depois desfaz */ if (ev.target.closest && !ev.target.closest('button, .seg-cab, .pl-obj-alca')) comecar(ev, s, 'mover'); }}>
        <div className="pl-seg-in" style={{ width: r.w / z, height: r.h / z, transform: `scale(${z})`, transformOrigin: '0 0', '--seg-min': minimo + 'px' }}>
          <Seg s={s} e={e} multi={!!multi[s.nome]} setMulti={(v) => setMulti((m) => ({ ...m, [s.nome]: v }))} aplicar={aplicar} somenteLeitura={somenteLeitura} minimo={minimo} aoBaixarTitulo={(ev) => comecar(ev, s, 'mover')} />
        </div>
        {esta && !somenteLeitura && <span className="pl-obj-alca" data-alca="seg" aria-label="Mudar o tamanho" onPointerDown={(ev) => comecar(ev, s, 'tamanho')} />}
      </div>
    );
  });
  return (
    <div className="pl-objs pl-segs" style={{ left: G.hw, top: G.hh, width: Math.max(0, tam.W - G.hw), height: Math.max(0, tam.H - G.hh) }}>
      {caixas}{barra}
    </div>
  );
}

/** Configurações da segmentação (como a janela do Excel): título, mostrar o título e colunas de botões. */
export function JanelaConfigSeg({ s, aoAplicar, aoFechar }) {
  const [titulo, setTitulo] = useState(s.titulo || '');
  const [mostrar, setMostrar] = useState(!s.semTitulo);
  const [cols, setCols] = useState(String(s.cols || 1));
  const n = +cols, ok = /^\d{1,2}$/.test(cols.trim()) && n >= 1 && n <= 20;
  const aplicar = () => { if (!ok) return; aoAplicar({ titulo: titulo.trim() || s.cn, cols: n, semTitulo: mostrar ? undefined : 1 }); aoFechar(); };
  return (
    <Janela titulo="Configurações da segmentação" icone="filtro" subtitulo={`Coluna ${s.cn}`} aoFechar={aoFechar} classe="pl-jdados pl-jseg" rodape={(
      <>
        <span className="sp" />
        <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn sm primary" data-segc-ok disabled={!ok} onClick={aplicar}>OK</button>
      </>
    )}>
      <section className="rg-cartao">
        <span className="rg-cab">Título</span>
        <label className="campo-t">Texto do título<input data-segc-titulo data-foco value={titulo} maxLength={120} onChange={(ev) => setTitulo(ev.target.value)} onKeyDown={(ev) => { if (ev.key === 'Enter') aplicar(); }} /></label>
        <label className="dd-col"><input type="checkbox" data-segc-mostrar checked={mostrar} onChange={(ev) => setMostrar(ev.target.checked)} /><span>Mostrar o título</span></label>
      </section>
      <section className="rg-cartao">
        <span className="rg-cab">Botões</span>
        <label className="campo-t">Colunas de botões (1 a 20)<input data-segc-cols inputMode="numeric" value={cols} onChange={(ev) => setCols(ev.target.value)} onKeyDown={(ev) => { if (ev.key === 'Enter') aplicar(); }} /></label>
        {!ok && <p className="pl-jseg-erro" role="alert">Use um número de 1 a 20.</p>}
      </section>
    </Janela>
  );
}

/** Inserir › Segmentação de dados: escolher as colunas da tabela em que a célula está. */
export function abrirInserirSegmentacao({ c, abaId, ativa, motor, mudar, cx }) {
  const a = alvoDoFiltro(c, abaId, ativa.l, ativa.c);
  if (!a.t) { cx.avisar('Clique numa célula de uma tabela (Inserir › Tabela) para inserir a segmentação de dados.', { ic: 'aviso' }); return; }
  const k = Object.keys(c.tabelas).find((x) => c.tabelas[x] === a.t);
  cx.perguntar({ Componente: JanelaInserirSeg, props: { c, abaId, k, motor, mudar, avisar: cx.avisar } });
}

export function JanelaInserirSeg({ c, abaId, k, motor, mudar, avisar, aoFechar }) {
  const cols = colunasDaTabela(c, motor, k);
  const [marc, setMarc] = useState(() => new Set());
  const alternar = (t) => setMarc((m) => { const n = new Set(m); if (n.has(t)) n.delete(t); else n.add(t); return n; });
  const aplicar = () => {
    const titulos = cols.map((x) => x.titulo).filter((t) => marc.has(t));
    if (!titulos.length) return;
    mudar(novasSegs(c, abaId, k, titulos), titulos.length === 1 ? 'Inserir segmentação de dados' : 'Inserir segmentações de dados');
    avisar(`${titulos.length === 1 ? 'Segmentação inserida' : `${titulos.length} segmentações inseridas`} ao lado da tabela. Arraste pelo título para mudar de lugar.`, { ic: 'filtro' });
    aoFechar();
  };
  return (
    <Janela titulo="Inserir segmentação de dados" icone="filtro" subtitulo={`Tabela ${c.tabelas[k].nome}`} aoFechar={aoFechar} classe="pl-jdados pl-jseg" rodape={(
      <>
        <span className="sp" />
        <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn sm primary" data-segi-ok disabled={!marc.size} onClick={aplicar}>OK</button>
      </>
    )}>
      <section className="rg-cartao">
        <span className="rg-cab">Uma segmentação para cada coluna marcada</span>
        <div className="pl-jseg-lista">
          {cols.map((x, i) => (
            <label key={x.col} className="dd-col"><input type="checkbox" data-segi-col={x.titulo} {...(i === 0 ? { 'data-foco': '' } : {})} checked={marc.has(x.titulo)} onChange={() => alternar(x.titulo)} /><span>{x.titulo}</span></label>
          ))}
        </div>
      </section>
    </Janela>
  );
}
