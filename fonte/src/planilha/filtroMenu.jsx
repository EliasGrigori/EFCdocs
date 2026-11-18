/* Vértice Docs v0.6.24 parte 2 · menu do filtro da coluna da planilha no padrão do EFCwork (o mesmo visual do menu das listas),
   com os filtros do Excel: ordem, lista de valores com contagem, filtros de texto, número ou data, 10 primeiros, média e cor.
   O botão fica na faixa das letras das colunas (A, B, C), não em cima do título: o título continua legível. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icone, usarEsc } from '../ui/comum.jsx';
import { OPS, PERIODOS, serial, textoDoCriterio } from './filtroCriterios.js';
import '../ui/tabelaColunas.css';
import './filtroMenu.css';

const NOMES = { txt: ['De A a Z', 'De Z a A', 'Filtros de texto'], num: ['Menor para o maior', 'Maior para o menor', 'Filtros de número'], data: ['Mais antiga primeiro', 'Mais recente primeiro', 'Filtros de data'] };
const norm = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const paraSerial = (iso) => { if (!iso) return ''; const [a, m, d] = iso.split('-').map(Number); return serial(new Date(a, m - 1, d)); };

/* v0.6.24.4 (comentário do Elias no item 5): 10 maiores, 10 menores e média entram na lista de Filtros de número, sem botões à parte */
const RAPIDOS = [['top10', '10 maiores', { k: 'top', n: 10, pct: false, baixo: false }], ['baixo10', '10 menores', { k: 'top', n: 10, pct: false, baixo: true }],
  ['acima', 'Acima da média', { k: 'media', acima: true }], ['abaixo', 'Abaixo da média', { k: 'media', acima: false }]];
const rapidoDe = (cr) => (!cr ? null : cr.k === 'top' ? (cr.baixo ? 'baixo10' : 'top10') : cr.k === 'media' ? (cr.acima ? 'acima' : 'abaixo') : null);

function Condicao({ tipo, atual, aoAplicar }) {
  const lista = OPS[tipo];
  const ini = atual && atual.k === tipo ? atual : null;
  const [op, setOp] = useState(ini ? ini.op : (tipo === 'num' && rapidoDe(atual)) || (tipo === 'num' ? '>' : tipo === 'data' ? 'hoje' : 'contem'));
  const rapido = tipo === 'num' ? RAPIDOS.find((r) => r[0] === op) : null;
  const [a, setA] = useState(ini && ini.a != null ? String(ini.a) : '');
  const [b, setB] = useState(ini && ini.b != null ? String(ini.b) : '');
  const periodo = (tipo === 'data' && PERIODOS.some((p) => p[0] === op)) || !!rapido;
  const dois = op === 'entre' || op === 'fora';
  const campo = (v, set, rot, dado) => (tipo === 'data'
    ? <input type="date" aria-label={rot} data-filtro-cond={dado} value={v} onChange={(ev) => set(ev.target.value)} />
    : <input type={tipo === 'num' ? 'text' : 'text'} inputMode={tipo === 'num' ? 'decimal' : 'text'} aria-label={rot} data-filtro-cond={dado} value={v} placeholder={tipo === 'num' ? 'número' : 'texto'} onChange={(ev) => set(ev.target.value)} />);
  const pronto = periodo || (a !== '' && (!dois || b !== ''));
  const aplicar = () => {
    if (!pronto) return;
    const conv = (x) => (tipo === 'data' ? paraSerial(x) : x);
    aoAplicar(rapido ? rapido[2] : periodo ? { k: 'data', op } : { k: tipo, op, a: conv(a), ...(dois ? { b: conv(b) } : {}) });
  };
  return (
    <div className="pl-fcond" onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); aplicar(); } }}>
      <select aria-label="Condição" data-filtro-op value={op} onChange={(ev) => setOp(ev.target.value)}>
        {tipo === 'data' && <optgroup label="Período">{PERIODOS.map(([k, r]) => <option key={k} value={k}>{r}</option>)}</optgroup>}
        <optgroup label={tipo === 'data' ? 'Data' : 'Condição'}>{lista.map(([k, r]) => <option key={k} value={k}>{r}</option>)}</optgroup>
        {tipo === 'num' && <optgroup label="Maiores, menores e média">{RAPIDOS.map(([k, r]) => <option key={k} value={k}>{r}</option>)}</optgroup>}
      </select>
      {!periodo && <div className={'pl-fcond-v' + (dois ? ' dois' : '')}>{campo(a, setA, 'Valor', 'a')}{dois && <><span>e</span>{campo(b, setB, 'Segundo valor', 'b')}</>}</div>}
      <button type="button" className="btn sm" data-filtro-cond-ok disabled={!pronto} onClick={aplicar}>Aplicar</button>
    </div>
  );
}

/**
 * x, y: canto de cima do menu (dentro da área da planilha). tipo: 'txt' | 'num' | 'data'. criterio: o da coluna (ou undefined).
 * cores: { fundos: [...], letras: [...] } diferentes na coluna. aoCriterio(cr) aplica um critério do Excel.
 */
export function MenuFiltro({ x, y, titulo, tipo = 'txt', valores, criterio, cores, filtrada, ordem = null, aoCiclo, aoAplicar, aoCriterio, aoLimparColuna, aoFechar }) {
  const ref = useRef(null);
  const [q, setQ] = useState('');
  const [cond, setCond] = useState(!!(criterio && criterio.k && criterio.k !== 'cor'));
  const [marc, setMarc] = useState(() => new Set(valores.filter((v) => v.marcado).map((v) => v.t)));
  usarEsc(aoFechar, true, ref);
  useEffect(() => { const el = ref.current && ref.current.querySelector('input[type=search]'); if (el) el.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const fora = (ev) => { if (ref.current && !ref.current.contains(ev.target) && !(ev.target.closest && ev.target.closest('[data-seta-filtro]'))) aoFechar(); };
    const t = setTimeout(() => addEventListener('pointerdown', fora), 0);
    return () => { clearTimeout(t); removeEventListener('pointerdown', fora); };
  }, [aoFechar]);
  const vistos = useMemo(() => valores.filter((v) => !q || norm(v.t || '(vazias)').includes(norm(q))), [valores, q]);
  const todosVistos = vistos.length > 0 && vistos.every((v) => marc.has(v.t)), algum = vistos.some((v) => marc.has(v.t));
  const alternar = (t) => setMarc((s) => { const n = new Set(s); if (n.has(t)) n.delete(t); else n.add(t); return n; });
  const alternarTodos = () => setMarc((s) => { const n = new Set(s); if (todosVistos) for (const v of vistos) n.delete(v.t); else for (const v of vistos) n.add(v.t); return n; });
  const ok = () => aoAplicar([...marc], valores.map((v) => v.t));
  const [az, za, nomeCond] = NOMES[tipo] || NOMES.txt;
  const nLinhas = valores.reduce((s, v) => s + v.n, 0);
  const temCor = cores && (cores.fundos.length > 0 || cores.letras.length > 0);
  const amostra = (k, cor) => (
    <button key={k + cor} type="button" className="pl-fcor" data-filtro-cor={k + ':' + cor} title={(k === 'fundo' ? 'Preenchimento ' : 'Letra ') + cor} aria-label={(k === 'fundo' ? 'Só as de preenchimento ' : 'Só as de letra ') + cor}
      onClick={() => aoCriterio(k === 'fundo' ? { k: 'cor', fundo: cor } : { k: 'cor', cor })}>
      {k === 'fundo' ? <i style={{ background: cor || 'transparent' }} className={cor ? '' : 'sem'} /> : <b style={{ color: cor }}>A</b>}
    </button>
  );
  return (
    <div ref={ref} className="col-menu pl-fmenu" role="dialog" aria-label={'Filtro de ' + titulo} data-filtro-menu style={{ position: 'absolute', left: x, top: y }}
      onKeyDown={(ev) => { if (ev.key === 'Enter' && !(ev.target.closest && (ev.target.closest('button') || ev.target.closest('.pl-fcond')))) { ev.preventDefault(); ok(); } }}>
      <div className="col-cab">
        <div className="col-t"><b>{titulo}</b><small>{nLinhas} {nLinhas === 1 ? 'linha' : 'linhas'} · {valores.length} {valores.length === 1 ? 'valor' : 'valores'}</small></div>
        {filtrada && <button type="button" className="col-limpa" data-filtro-limpar onClick={aoLimparColuna}>Limpar esta coluna</button>}
      </div>
      {criterio && !Array.isArray(criterio.v) && <p className="col-av pl-fatual" data-filtro-atual><Icone n="filtro" />{textoDoCriterio(criterio)}</p>}
      <div className="col-corpo">
        <div className="col-g">
          <span className="col-h">Ordenar</span>
          {/* v0.6.24.3 (pedido do Elias): um botão só, em ciclo, igual ao EFCwork: ordem padrão, crescente, decrescente e volta ao padrão */}
          <button type="button" className={'col-op col-ci' + (ordem ? ' on' : '')} data-filtro-ordem={ordem || 'padrao'} title={`Cada toque troca: ordem padrão, ${az.toLowerCase()}, ${za.toLowerCase()}`} onClick={aoCiclo}>
            <Icone n={ordem === 'asc' ? 'ordAsc' : ordem === 'desc' ? 'ordDesc' : 'ordPad'} /><span>{ordem === 'asc' ? az : ordem === 'desc' ? za : 'Ordem padrão'}</span>
            <em>{ordem === 'asc' ? 'toque: inverte' : ordem === 'desc' ? 'toque: volta ao padrão' : 'toque: ordena'}</em>
          </button>
        </div>
        <div className="col-g">
          <button type="button" className={'col-op' + (cond ? ' on' : '')} aria-expanded={cond} data-filtro-condicoes onClick={() => setCond((v) => !v)}><Icone n="filtro" /><span>{nomeCond}</span><Icone n={cond ? 'chevronCima' : 'chevronBaixo'} /></button>
          {cond && <Condicao tipo={tipo} atual={criterio} aoAplicar={aoCriterio} />}
          {temCor && (
            <div className="pl-fcores" role="group" aria-label="Filtrar por cor">
              <span className="col-h">Filtrar por cor</span>
              <div>{cores.fundos.map((c) => amostra('fundo', c))}{cores.letras.map((c) => amostra('cor', c))}</div>
            </div>
          )}
        </div>
        <div className="col-g col-fg">
          <span className="col-h">Filtrar</span>
          <label className="col-bs"><Icone n="busca" />
            <input type="search" className="pl-fmenu-q" placeholder="Procurar" aria-label="Procurar valor" value={q} onChange={(ev) => {
              /* v0.6.4 (Grok B02): ao procurar, só o que foi achado fica marcado; é só dar OK */
              const v = ev.target.value; setQ(v);
              if (v.trim()) setMarc(new Set(valores.filter((t) => norm(t.t || '(vazias)').includes(norm(v))).map((t) => t.t)));
              else setMarc(new Set(valores.filter((t) => t.marcado).map((t) => t.t)));
            }} />
          </label>
          <div className="col-l" role="group" aria-label="Valores">
            {vistos.length > 0 && (
              <label className="col-li col-all pl-fmenu-i"><input type="checkbox" checked={todosVistos} ref={(el) => { if (el) el.indeterminate = !todosVistos && algum; }} onChange={alternarTodos} data-filtro-tudo />
                <span>{q ? 'Marcar os encontrados' : 'Marcar todos'}</span><em>{vistos.reduce((s, v) => s + v.n, 0)}</em></label>
            )}
            {vistos.map((v) => (
              <label key={v.t} className={'col-li pl-fmenu-i' + (v.ok ? '' : ' fora')} title={v.ok ? undefined : 'Escondido pelo filtro de outra coluna'}>
                <input type="checkbox" checked={marc.has(v.t)} onChange={() => alternar(v.t)} data-filtro-v={v.t} />
                <span className={v.t === '' ? 'col-vz' : undefined}>{v.t === '' ? '(em branco)' : v.t}</span><em>{v.n}</em>
              </label>
            ))}
            {!vistos.length && <p className="col-nd">Nada com esse texto.</p>}
          </div>
          <div className="pl-fmenu-r">
            <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
            <button type="button" className="btn sm primary" data-filtro-ok disabled={!marc.size} onClick={ok}>OK</button>
          </div>
        </div>
      </div>
    </div>
  );
}
