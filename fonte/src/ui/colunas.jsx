/* Vértice Docs · menu da coluna das listas.
   v0.6.20 (R13): abre crescendo do título; tocando em outra coluna com o menu aberto, o mesmo menu desliza até lá.
   v0.6.24: no padrão do EFCwork (projeto/src/tabela.js): ordem em ciclo, busca, valores com contagem e caixas,
   De/Até para número, mover para os lados, Travar; arrastar o título muda a coluna de lugar (lembrado no aparelho);
   no celular o menu sobe de baixo. A lógica fica em tabelaColunas.js. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icone, usarEsc } from './comum.jsx';
import { Mov } from './fluidez.js';
import './tabelaColunas.css';
import {
  estadoTabela, mudarTabela, ouvirTabelas, valoresDaColuna, proximaOrdem, colunaFiltrada, moverColuna, semAcento, vazio,
} from './tabelaColunas.js';

/** O estado da tabela, redesenhando quem usa quando ele muda. */
export function usarTabela(nome) {
  const [, setV] = useState(0);
  useEffect(() => ouvirTabelas((n) => { if (n === nome) setV((v) => v + 1); }), [nome]);
  return estadoTabela(nome);
}

const NOMES_ORDEM = { num: ['Menor para o maior', 'Maior para o menor'], data: ['Mais antiga primeiro', 'Mais recente primeiro'], texto: ['De A a Z', 'De Z a A'] };
const nomesOrdem = (c) => NOMES_ORDEM[c.tipo] || NOMES_ORDEM.texto;

function Marcas({ st, k }) {
  const o = st.ordem && st.ordem.k === k ? st.ordem.dir : '', f = colunaFiltrada(st, k), t = !!st.trava[k];
  if (!o && !f && !t) return null;
  return (
    <>
      {f && <i className="col-mf" title="Filtrada"><Icone n="filtro" /></i>}
      {o && <i className="col-mo" title={o === 'asc' ? 'Crescente' : 'Decrescente'}><Icone n={o === 'asc' ? 'ordAsc' : 'ordDesc'} /></i>}
      {t && <i className="col-mt" title="Travada"><Icone n="cadeado" /></i>}
    </>
  );
}

/** O título da coluna: o nome abre o menu (e arrastado com o mouse muda a coluna de lugar); o botão ao lado mostra as marcas. */
export function CabColuna({ nome, col, cols, aberta, abrir }) {
  const st = usarTabela(nome), k = col.id;
  const marcada = colunaFiltrada(st, k) || (st.ordem && st.ordem.k === k) || !!st.trava[k];
  const arr = useRef(null);
  const alvoDe = (ev) => {
    const el = document.elementFromPoint(ev.clientX, ev.clientY), th = el && el.closest && el.closest(`[data-efl-tabela="${nome}"] th[data-col]`);
    if (!th || th.getAttribute('data-col-fixa')) return null;
    const r = th.getBoundingClientRect();
    return { th, k: th.getAttribute('data-col'), depois: ev.clientX > r.left + r.width / 2 };
  };
  const limparAlvo = () => document.querySelectorAll('th[data-col-alvo]').forEach((t) => t.removeAttribute('data-col-alvo'));
  const fimArrasto = () => { limparAlvo(); document.documentElement.classList.remove('col-arrastando'); };
  /* o arrasto é ouvido na página inteira: o primeiro movimento já pode sair de cima do título */
  const baixo = (ev) => {
    if (ev.pointerType === 'touch' || ev.button !== 0) return;
    const a = { x: ev.clientX, ativo: false };
    arr.current = a;
    const move = (e) => {
      if (!a.ativo) { if (Math.abs(e.clientX - a.x) < 6) return; a.ativo = true; document.documentElement.classList.add('col-arrastando'); }
      limparAlvo(); const t = alvoDe(e);
      if (t && t.k !== k) t.th.setAttribute('data-col-alvo', t.depois ? 'depois' : 'antes');
    };
    const solta = (e) => {
      removeEventListener('pointermove', move, true); removeEventListener('pointerup', solta, true); removeEventListener('pointercancel', cancela, true);
      fimArrasto();
      if (!a.ativo) return;
      a.moveu = true;
      const t = alvoDe(e);
      if (t && t.k !== k) mudarTabela(nome, (s) => { s.colOrd = moverColuna(cols, s.colOrd, k, t.k, t.depois); return s; });
      setTimeout(() => { if (arr.current === a) arr.current = null; }, 0);
    };
    const cancela = () => { a.ativo = false; solta({}); };
    addEventListener('pointermove', move, true); addEventListener('pointerup', solta, true); addEventListener('pointercancel', cancela, true);
  };
  const clique = (ev) => { ev.stopPropagation(); if (arr.current && arr.current.moveu) { arr.current = null; return; } abrir(aberta ? null : k); };
  return (
    <span className="col-thi">
      <button type="button" className="col-thr" data-col-menu={k} aria-haspopup="dialog" aria-expanded={aberta} title="Opções da coluna · arraste para mudar de lugar"
        onPointerDown={baixo} onClick={clique}>{col.rot}</button>
      <button type="button" className={'col-hm' + (marcada ? ' on' : '')} data-col-hm={k} aria-haspopup="dialog" aria-expanded={aberta} aria-label={'Opções da coluna ' + col.rot + (marcada ? ' (em uso)' : '')}
        onClick={(ev) => { ev.stopPropagation(); abrir(aberta ? null : k); }}>
        <Marcas st={st} k={k} /><i className="col-hv"><Icone n="chevronBaixo" /></i>
      </button>
    </span>
  );
}

/** Marca e desmarca valores: sem escolha guardada = todos marcados. */
function trocaValores(f, todos, labs, ligar) {
  const atual = f.sel || todos;
  const sel = ligar ? [...new Set([...atual, ...labs])] : atual.filter((l) => !labs.includes(l));
  return todos.every((l) => sel.includes(l)) ? undefined : sel;
}

export function MenuColuna({ nome, cols, base, k, fechar, unidade = ['arquivo', 'arquivos'] }) {
  const st = usarTabela(nome), c = cols.find((x) => x.id === k);
  const ref = useRef(null), de = useRef(null);
  const folha = typeof window !== 'undefined' && (innerWidth < 600 || !!document.querySelector('.app.cel'));
  usarEsc(fechar, true);
  useLayoutEffect(() => {
    const m = ref.current; if (!m || folha) return;
    const b = document.querySelector(`[data-efl-tabela="${nome}"] [data-col-menu="${k}"]`); if (!b) return;
    const th = b.closest('th') || b, r = th.getBoundingClientRect(), w = m.offsetWidth;
    /* cabe embaixo? se não, e se em cima houver mais espaço, abre para cima (a ponta vai para baixo) */
    m.style.maxHeight = 'none'; const alto = m.offsetHeight;
    const embaixo = innerHeight - r.bottom - 18, emCima = r.top - 18, cima = alto > embaixo && emCima > embaixo;
    const x = Math.max(8, Math.min(innerWidth - w - 8, r.left)), y = cima ? Math.max(8, r.top - 6 - Math.min(alto, emCima)) : r.bottom + 6;
    m.style.left = x + 'px'; m.style.top = y + 'px';
    m.style.maxHeight = Math.max(200, cima ? emCima : embaixo) + 'px';
    m.classList.toggle('col-cima', cima);
    m.style.setProperty('--col-pt', Math.max(16, Math.min(w - 16, r.left + Math.min(r.width, 120) / 2 - x)) + 'px');
    const ant = de.current; de.current = { x, y };
    if (ant && (ant.x !== x || ant.y !== y) && !Mov.reduzido()) {
      m.getAnimations().forEach((a) => a.cancel());
      m.animate([{ transform: `translate(${ant.x - x}px, ${ant.y - y}px)` }, { transform: 'none' }], { duration: Mov.ms('--duration-fast', 250), easing: 'cubic-bezier(.22,1,.36,1)' }).id = 'fz-desliza';
    }
  }, [k, nome, folha]);
  useLayoutEffect(() => { const m = ref.current; const o = m && (m.querySelector('.col-ci') || m.querySelector('input')); if (o) o.focus({ preventScroll: true }); }, [k]);
  useEffect(() => {
    const fora = (ev) => { if (ref.current && !ref.current.contains(ev.target) && !(ev.target.closest && ev.target.closest('[data-col-menu], [data-col-hm]'))) fechar(); };
    document.addEventListener('pointerdown', fora, true); addEventListener('resize', fechar);
    return () => { document.removeEventListener('pointerdown', fora, true); removeEventListener('resize', fechar); };
  }, [fechar]);
  if (!c) return null;

  const f = st.cf[k] || {}, tr = !!st.trava[k], o = st.ordem && st.ordem.k === k ? st.ordem.dir : '';
  const nomes = nomesOrdem(c);
  const vals = valoresDaColuna(base, cols, st, k), todosLabs = vals.map((x) => x.lab);
  const busca = semAcento(f.txt), vis = busca ? vals.filter((x) => semAcento(x.lab).includes(busca)) : vals;
  const marcado = (lab) => !f.sel || f.sel.includes(lab);
  const todosMarc = vis.length > 0 && vis.every((x) => marcado(x.lab)), algum = vis.some((x) => marcado(x.lab));
  const nItens = vals.reduce((s, x) => s + x.n, 0);
  const muda = (fn) => mudarTabela(nome, (s) => { fn(s); return s; });
  const mudaF = (novo) => muda((s) => { const g = { ...(s.cf[k] || {}), ...novo }; for (const x of Object.keys(g)) if (vazio(g[x])) delete g[x]; if (Object.keys(g).length) s.cf[k] = g; else delete s.cf[k]; });
  const filtrada = colunaFiltrada(st, k) || !!o;
  return (
    <>
      {folha && <div className="col-fundo" onPointerDown={fechar} />}
      <div className={'col-menu' + (folha ? ' col-folha' : '')} role="dialog" aria-label={'Coluna ' + c.rot} data-col-aberta={k} ref={ref}>
        {!folha && <i className="col-pt" aria-hidden="true" />}
        <div className="col-cab">
          <div className="col-t"><b>{c.rot}</b><small>{nItens} {nItens === 1 ? unidade[0] : unidade[1]} · {vals.length} {vals.length === 1 ? 'valor' : 'valores'}</small></div>
          <button type="button" className={'col-tr' + (tr ? ' on' : '')} data-col-trava aria-pressed={tr} title={tr ? 'Destravar: volta a poder mudar' : 'Travar: a ordem e o filtro desta coluna ficam assim, mesmo ao sair do app, até você destravar'}
            onClick={() => muda((s) => { if (tr) delete s.trava[k]; else s.trava[k] = true; })}><Icone n="cadeado" /><span>{tr ? 'Travada' : 'Travar'}</span></button>
        </div>
        {tr && <p className="col-av"><Icone n="cadeado" />Travada. Destrave para mudar a ordem ou o filtro.</p>}
        <div className="col-corpo" key={k}>
          <div className="col-g">
            <div className="col-hh"><span className="col-h">Ordenar</span>
              <button type="button" className="col-limpa" disabled={!filtrada || tr} onClick={() => muda((s) => { delete s.cf[k]; if (s.ordem && s.ordem.k === k) s.ordem = null; })}>Limpar esta coluna</button>
            </div>
            <button type="button" className={'col-op col-ci' + (o ? ' on' : '')} data-col-ordem={o || 'padrao'} disabled={tr} title={`Cada toque troca: ordem padrão, ${nomes[0].toLowerCase()}, ${nomes[1].toLowerCase()}`}
              onClick={() => muda((s) => { s.ordem = proximaOrdem(s, k); })}>
              <Icone n={o === 'asc' ? 'ordAsc' : o === 'desc' ? 'ordDesc' : 'ordPad'} /><span>{o === 'asc' ? nomes[0] : o === 'desc' ? nomes[1] : 'Ordem padrão'}</span>
              <em>{o === 'asc' ? 'toque: inverte' : o === 'desc' ? 'toque: volta ao padrão' : 'toque: ordena'}</em>
            </button>
          </div>
          <div className="col-g col-fg">
            <span className="col-h">Filtrar</span>
            <label className="col-bs"><Icone n="busca" />
              <input type="search" data-col-busca value={f.txt || ''} placeholder={'Buscar em ' + c.rot} aria-label={'Buscar em ' + c.rot} disabled={tr} onChange={(ev) => mudaF({ txt: ev.target.value })} onKeyDown={(ev) => { if (ev.key === 'Enter') fechar(); }} />
            </label>
            {c.tipo === 'num' && (
              <div className="col-nr">
                <label><small>De</small><input type="number" inputMode="decimal" data-col-min value={f.min == null ? '' : f.min} placeholder="mínimo" disabled={tr} onChange={(ev) => mudaF({ min: ev.target.value })} /></label>
                <label><small>Até</small><input type="number" inputMode="decimal" data-col-max value={f.max == null ? '' : f.max} placeholder="máximo" disabled={tr} onChange={(ev) => mudaF({ max: ev.target.value })} /></label>
              </div>
            )}
            <div className="col-l">
              {vis.length > 0 && (
                <label className="col-li col-all">
                  <input type="checkbox" data-col-todos checked={todosMarc} disabled={tr} ref={(el) => { if (el) el.indeterminate = !todosMarc && algum; }}
                    onChange={() => mudaF({ sel: trocaValores(f, todosLabs, vis.map((x) => x.lab), !todosMarc) })} />
                  <span>{busca ? 'Marcar os encontrados' : 'Marcar todos'}</span><em>{vis.reduce((s, x) => s + x.n, 0)}</em>
                </label>
              )}
              {vis.slice(0, 400).map((x) => (
                <label key={x.lab} className="col-li">
                  <input type="checkbox" data-col-valor={x.lab} checked={marcado(x.lab)} disabled={tr} onChange={(ev) => mudaF({ sel: trocaValores(f, todosLabs, [x.lab], ev.target.checked) })} />
                  <span className={x.lab === '' ? 'col-vz' : undefined}>{x.lab === '' ? '(em branco)' : x.lab}</span><em>{x.n}</em>
                </label>
              ))}
              {!vis.length && <p className="col-nd">Nada com “{f.txt || ''}”.</p>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
