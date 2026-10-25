/* EFCdocs — peças da tela do quadro: item, setas, barra da seleção, minimapa, temporizador, ferramentas, assistente e janelas pequenas. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icone, Janela } from '../ui/comum.jsx';
import { CORES, COR, CORES_FONTE, TIPOS_ITEM, FORMAS } from './modelo.js';
import { pontosSeta, caminhoSVG, meioDoCaminho, contornoForma } from './geometria.js';
import { MODELOS } from './modelos.js';
import { NOTA_GUT, NIVEIS_GUT, valorGut, nivelGut, prazoValido, resumoTarefa } from './tarefa.js';
import { linhasLegenda } from './legenda.js';

const estiloTexto = (it) => {
  const f = it.fonte || {};
  return {
    textAlign: { e: 'left', d: 'right', c: 'center' }[it.alinh || (it.tipo === 'texto' ? 'e' : 'c')],
    color: f.cor || undefined,
    fontWeight: f.n ? 700 : undefined,
    fontStyle: f.i ? 'italic' : undefined,
    textDecoration: f.s ? 'underline' : undefined,
  };
};

/** Quantas linhas de texto cabem no item; o resto vira reticências (…). */
export function linhasQueCabem(it, comTarefa) {
  const fs = it.tipo === 'texto' && !it.borda ? 18 : 14;
  const pad = it.tipo === 'postit' ? 28 + (comTarefa ? 38 : 0) : it.tipo === 'decisao' ? it.h * 0.44 : it.tipo === 'texto' ? 4 : 12;
  return Math.max(1, Math.floor((it.h - pad) / (fs * 1.3)));
}

function FormaSvg({ it }) {
  const pts = contornoForma({ ...it, x: 0, y: 0 });
  const fill = COR[it.cor] || '#ffffff';
  return (
    <svg className="qi-forma" viewBox={`0 0 ${it.w} ${it.h}`} preserveAspectRatio="none" aria-hidden="true">
      {pts
        ? <polygon points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill={fill} />
        : <rect x="0.8" y="0.8" width={Math.max(0, it.w - 1.6)} height={Math.max(0, it.h - 1.6)} rx={it.tipo === 'inicio' ? Math.min(it.h, it.w) / 2 : 0} fill={fill} />}
    </svg>
  );
}

/** Formas pequenas da legenda. */
function MiniForma({ tipo }) {
  const traco = { stroke: '#3b4552', strokeWidth: 1.4, fill: '#fff' };
  return (
    <svg viewBox="0 0 34 20" width="34" height="20" aria-hidden="true">
      {tipo === 'inicio' && <rect x="1" y="1" width="32" height="18" rx="9" {...traco} />}
      {tipo === 'processo' && <rect x="1" y="2" width="32" height="16" {...traco} />}
      {tipo === 'decisao' && <polygon points="17,1 33,10 17,19 1,10" {...traco} />}
      {tipo === 'dados' && <polygon points="8,1 33,1 26,19 1,19" {...traco} />}
      {tipo === 'postit' && <rect x="7" y="1" width="20" height="18" {...traco} fill={COR.amarelo} />}
      {tipo === 'seta' && <><path d="M1 10h28" stroke="#475467" strokeWidth="1.6" fill="none" /><path d="M33 10l-8-4v8z" fill="#475467" /></>}
    </svg>
  );
}

function LegendaView({ it }) {
  const linhas = it.linhas || [];
  return (
    <div className="qi-leg">
      <b>Legenda</b>
      {linhas.length === 0 && <span className="qi-leg-vazia">Nada para explicar ainda.</span>}
      {linhas.map((l) => (
        <div className="qi-leg-l" key={l.tipo}>
          <MiniForma tipo={l.tipo} />
          <span><b>{l.nome}</b><small>{l.descr}</small></span>
        </div>
      ))}
    </div>
  );
}

/** Rodapé do post-it de tarefa: responsável, prazo, situação e nota GUT. */
function RodapeTarefa({ t }) {
  return (
    <div className="qi-tarefa">
      <span className="qi-tar-l1"><span className={t.resp ? '' : 'sem-resp'}>{t.resp ? 'Resp.: ' + t.resp : 'Sem responsável'}</span>{t.gut > 0 && <em className={'gut gut-' + t.nivel} title={'Nota GUT ' + t.gut + ' · prioridade ' + t.nivel}>GUT {t.gut}</em>}</span>
      <span className={'qi-tar-l2' + (t.vencida ? ' venc' : '')}>{t.prazo ? (t.vencida ? 'Vencido: ' + t.prazo : 'Prazo: ' + t.prazo + ' · ' + t.status) : 'Sem prazo · ' + t.status}</span>
    </div>
  );
}
export { RodapeTarefa };

export function ItemView({ it, zi, sel, codigos, escondeTexto, tarefa }) {
  const forma = FORMAS.includes(it.tipo);
  const style = { left: it.x, top: it.y, width: it.w, height: it.h, zIndex: zi };
  if (it.tipo === 'postit') style.background = COR[it.cor] || COR.amarelo;
  const classe = 'qi qi-' + it.tipo + (sel ? ' sel' : '') + (it.borda ? ' qi-borda' : '') + (tarefa ? ' qi-com-tarefa' : '');
  return (
    <div className={classe} data-item={it.id} data-cod={it.cod || undefined} style={style}>
      {forma && <FormaSvg it={it} />}
      {it.tipo === 'imagem' && (it.src ? <img src={it.src} alt={it.texto || 'Imagem'} draggable="false" /> : <span className="qi-semimg"><Icone n="imagem" /></span>)}
      {it.tipo === 'raia' && <div className="qi-raia-h"><span>{escondeTexto ? '' : it.texto}</span></div>}
      {it.tipo === 'pagina' && <div className="qi-pg-h"><span>{escondeTexto ? '' : it.texto}</span></div>}
      {it.tipo === 'legenda' && <LegendaView it={it} />}
      {!['imagem', 'raia', 'pagina', 'legenda'].includes(it.tipo) && <div className="qi-t" style={estiloTexto(it)}>{escondeTexto ? '' : <span className="qi-clamp" style={{ WebkitLineClamp: linhasQueCabem(it, !!tarefa) }}>{it.texto}</span>}</div>}
      {tarefa && <RodapeTarefa t={tarefa} />}
      {codigos && it.cod && <span className="qi-cod">{it.cod}</span>}
      {(it.nota || it.link) && (
        <span className="qi-marcas">
          {it.nota && <span title={'Comentário: ' + it.nota}><Icone n="comentario" /></span>}
          {it.link && <a href={it.link} target="_blank" rel="noopener noreferrer" title={'Abrir link: ' + it.link} onPointerDown={(ev) => ev.stopPropagation()}><Icone n="link" /></a>}
        </span>
      )}
    </div>
  );
}

export function CamadaSetas({ c, selSeta, ligando, editandoSeta }) {
  return (
    <svg className="qd-setas" aria-hidden="true">
      <defs>
        <marker id="qd-ponta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
          <path d="M0 0L10 5L0 10z" fill="context-stroke" />
        </marker>
        <marker id="qd-ponta-n" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
          <path d="M0 0L10 5L0 10z" className="qd-ponta-cor" />
        </marker>
      </defs>
      {Object.values(c.setas).map((s) => {
        const a = c.itens[s.de.id], b = c.itens[s.para.id];
        if (!a || !b) return null;
        const { pontos } = pontosSeta(a, b, s);
        const d = caminhoSVG(pontos);
        const m = meioDoCaminho(pontos);
        const sel = selSeta === s.id;
        const fim = s.pontas !== 'nenhuma' ? 'url(#qd-ponta-n)' : undefined;
        const inicio = s.pontas === 'ambas' ? 'url(#qd-ponta-n)' : undefined;
        const larg = Math.max(28, String(s.rotulo || '').length * 7 + 14);
        return (
          <g key={s.id} className={'qd-seta' + (sel ? ' sel' : '')} data-seta={s.id}>
            <path className="qd-seta-toque" d={d} />
            <path className="qd-seta-linha" d={d} markerEnd={fim} markerStart={inicio} />
            {s.rotulo && editandoSeta !== s.id && (
              <g className="qd-rotulo" transform={`translate(${m.x} ${m.y})`}>
                <rect x={-larg / 2} y="-10" width={larg} height="20" />
                <text textAnchor="middle" y="4">{s.rotulo}</text>
              </g>
            )}
          </g>
        );
      })}
      {ligando && <path className="qd-ligando" d={caminhoSVG([ligando.de, ligando.p])} />}
    </svg>
  );
}

/** Bolinhas de ligação nos 4 lados do item selecionado: arrastar liga; tocar faz o "próximo passo" naquele lado. */
export function PontosLigacao({ it }) {
  const pts = { t: [it.x + it.w / 2, it.y - 16], r: [it.x + it.w + 16, it.y + it.h / 2], b: [it.x + it.w / 2, it.y + it.h + 16], l: [it.x - 16, it.y + it.h / 2] };
  return Object.entries(pts).map(([lado, [x, y]]) => (
    <button key={lado} type="button" className="qd-ponto" data-ponto={lado} data-de={it.id} style={{ left: x, top: y }}
      title="Arraste até outro item para ligar com seta. Toque para criar o próximo passo deste lado." aria-label={'Ligar ou criar próximo passo: ' + { t: 'acima', r: 'à direita', b: 'abaixo', l: 'à esquerda' }[lado]}>
      <Icone n={{ t: 'setaCima', r: 'setaDir', b: 'setaBaixo', l: 'setaEsq' }[lado]} />
    </button>
  ));
}

export function Alca({ it }) {
  return <span className="qd-alca" data-alca={it.id} style={{ left: it.x + it.w, top: it.y + it.h }} title="Arraste para mudar o tamanho" />;
}

/** Barra flutuante da seleção (o excluir fica no canto direito, como combinado).
    ancora: { x: centro, topo, base } em pixels da área; a barra mede o próprio tamanho e fica sempre dentro da tela. */
export function BarraSelecao({ ancora, area, botoes, onExcluir, rotuloExcluir, fixa, folga = 64 }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    /* celular: barra presa embaixo, centralizada (não cobre itens nem setas) */
    if (fixa) { setPos({ x: Math.max(8, (area.w - el.offsetWidth) / 2), y: area.h - el.offsetHeight - folga }); return; }
    const w = el.offsetWidth, h = el.offsetHeight;
    let y = ancora.topo - h - 30;
    if (y < 52) y = ancora.base + 30;
    const x = Math.max(8, Math.min(area.w - w - 8, ancora.x - w / 2));
    y = Math.max(52, Math.min(area.h - h - 8, y));
    setPos({ x, y });
  }, [ancora.x, ancora.topo, ancora.base, area.w, area.h, botoes.length, fixa, folga]);
  return (
    <div ref={ref} className={'qd-barra card' + (fixa ? ' fixa' : '')} style={pos ? { left: pos.x, top: pos.y } : { left: 0, top: 0, visibility: 'hidden' }} role="toolbar" aria-label="Ações da seleção" onPointerDown={(ev) => ev.stopPropagation()}>
      {botoes.map((b, i) => b === '|' ? <span key={'s' + i} className="sep" /> : (
        <button key={b.id} type="button" className={'rbi' + (b.on ? ' on' : '')} title={b.titulo} aria-label={b.titulo} aria-pressed={b.on ? true : undefined} data-acao={b.id} onClick={b.fazer}>
          {b.cor ? <i className="qd-amostra" style={{ background: b.cor }} /> : <Icone n={b.ic} />}
        </button>
      ))}
      {onExcluir && <><span className="sep" /><button type="button" className="rbi perigo" title={rotuloExcluir} aria-label={rotuloExcluir} data-acao="excluir" onClick={onExcluir}><Icone n="lixeira" /></button></>}
    </div>
  );
}

export function Minimapa({ itens, view, area, aoIr, setas }) {
  const W = 200, H = 130;
  const vw = { x: -view.x / view.z, y: -view.y / view.z, w: area.w / view.z, h: area.h / view.z };
  let x1 = vw.x, y1 = vw.y, x2 = vw.x + vw.w, y2 = vw.y + vw.h;
  for (const it of itens) { x1 = Math.min(x1, it.x); y1 = Math.min(y1, it.y); x2 = Math.max(x2, it.x + it.w); y2 = Math.max(y2, it.y + it.h); }
  const pad = 40;
  x1 -= pad; y1 -= pad; x2 += pad; y2 += pad;
  const s = Math.min(W / (x2 - x1), H / (y2 - y1));
  const ox = (W - (x2 - x1) * s) / 2, oy = (H - (y2 - y1) * s) / 2;
  const tx = (x) => ox + (x - x1) * s, ty = (y) => oy + (y - y1) * s;
  const ir = (ev) => {
    const r = ev.currentTarget.getBoundingClientRect();
    const wx = (ev.clientX - r.left - ox) / s + x1, wy = (ev.clientY - r.top - oy) / s + y1;
    aoIr(wx, wy);
  };
  return (
    <svg className="qd-mini card" width={W} height={H} role="img" aria-label="Minimapa do quadro"
      onPointerDown={(ev) => { ev.stopPropagation(); ev.currentTarget.setPointerCapture(ev.pointerId); ir(ev); }}
      onPointerMove={(ev) => { if (ev.buttons) ir(ev); }}>
      {itens.map((it) => <rect key={it.id} x={tx(it.x)} y={ty(it.y)} width={Math.max(1.5, it.w * s)} height={Math.max(1.5, it.h * s)} className={'mm-' + it.tipo} style={it.tipo === 'postit' ? { fill: COR[it.cor] } : undefined} />)}
      {setas}
      <rect className="mm-vista" x={tx(vw.x)} y={ty(vw.y)} width={vw.w * s} height={vw.h * s} />
    </svg>
  );
}

const PRESETS = [5, 10, 15, 30];
export function Temporizador({ fechar, avisar }) {
  const [total, setTotal] = useState(10 * 60);
  const [resta, setResta] = useState(10 * 60);
  const [rodando, setRodando] = useState(false);
  const fimRef = useRef(0);
  useEffect(() => {
    if (!rodando) return undefined;
    fimRef.current = Date.now() + resta * 1000;
    const t = setInterval(() => {
      const r = Math.max(0, Math.round((fimRef.current - Date.now()) / 1000));
      setResta(r);
      if (r === 0) {
        setRodando(false);
        avisar('Tempo da reunião acabou.', { ic: 'temporizador' });
        try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch { /* sem vibração */ }
        try {
          const A = window.AudioContext || window.webkitAudioContext;
          const ac = new A(); const o = ac.createOscillator(); const g = ac.createGain();
          o.frequency.value = 880; g.gain.value = 0.08; o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.6);
        } catch { /* sem som */ }
      }
    }, 250);
    return () => clearInterval(t);
  }, [rodando]); // eslint-disable-line react-hooks/exhaustive-deps
  const mm = String(Math.floor(resta / 60)).padStart(2, '0'), ss = String(resta % 60).padStart(2, '0');
  return (
    <div className={'qd-timer card' + (resta === 0 ? ' fim' : resta <= 60 ? ' quase' : '')} role="timer" aria-label="Temporizador de reunião" onPointerDown={(ev) => ev.stopPropagation()}>
      <b>{mm}:{ss}</b>
      <div className="qd-timer-b">
        {PRESETS.map((m) => <button key={m} type="button" className={'chipb' + (total === m * 60 ? ' on' : '')} onClick={() => { setTotal(m * 60); setResta(m * 60); setRodando(false); }}>{m} min</button>)}
      </div>
      <div className="qd-timer-b">
        <button type="button" className="rbi" title={rodando ? 'Pausar' : 'Começar'} aria-label={rodando ? 'Pausar' : 'Começar'} onClick={() => { if (resta === 0) setResta(total); setRodando(!rodando); }}><Icone n={rodando ? 'pausa' : 'play'} /></button>
        <button type="button" className="rbi" title="Voltar ao começo" aria-label="Voltar ao começo" onClick={() => { setRodando(false); setResta(total); }}><Icone n="restaurar" /></button>
        <button type="button" className="rbi" title="Fechar o temporizador" aria-label="Fechar o temporizador" onClick={fechar}><Icone n="x" /></button>
      </div>
    </div>
  );
}

export function JanelaCores({ titulo, fonte, aoEscolher, aoFechar }) {
  const lista = fonte ? CORES_FONTE.map(([hex, nome]) => [hex, hex, nome]) : CORES;
  return (
    <Janela titulo={titulo} aoFechar={aoFechar} classe="qd-cores">
      <div className="janela-c">
        <div className="qd-paleta">
          {lista.map(([id, hex, nome]) => (
            <button key={id} type="button" className="qd-cor" onClick={() => { aoEscolher(id); aoFechar(); }} data-cor={id}>
              <i style={{ background: hex }} />{nome}
            </button>
          ))}
        </div>
      </div>
    </Janela>
  );
}

export function JanelaFormas({ aoEscolher, aoFechar }) {
  return (
    <Janela titulo="Formas do fluxograma" aoFechar={aoFechar} classe="qd-formas">
      <div className="janela-c">
        <div className="qd-paleta">
          {[...FORMAS, 'postit', 'texto'].map((t) => (
            <button key={t} type="button" className="qd-cor" data-forma={t} onClick={() => { aoEscolher(t); aoFechar(); }}>
              <Icone n={t === 'postit' ? 'postit' : t} />
              <span><b>{TIPOS_ITEM[t].nome}</b><small>{{ processo: 'Uma etapa ou atividade', decisao: 'Pergunta com sim ou não', inicio: 'Começo ou fim do fluxo', dados: 'Registro, entrada ou saída', postit: 'Nota adesiva', texto: 'Título ou observação solta' }[t]}</small></span>
            </button>
          ))}
        </div>
        <p className="qd-dica">Dica: com um item escolhido, toque numa das setinhas em volta dele para criar o próximo passo já ligado.</p>
      </div>
    </Janela>
  );
}

export function JanelaLocalizar({ achar, substituir, aoFechar }) {
  const [q, setQ] = useState('');
  const [novo, setNovo] = useState('');
  const [res, setRes] = useState(null);
  return (
    <Janela titulo="Localizar e substituir" aoFechar={aoFechar} rodape={(
      <>
        <button type="button" className="btn sm" onClick={() => setRes(substituir(q, novo))} disabled={!q}>Substituir tudo</button>
        <button type="button" className="btn sm primary" onClick={() => setRes(achar(q))} disabled={!q}>Localizar</button>
      </>
    )}>
      <div className="janela-c">
        <label className="campo-t">Procurar (texto, comentário ou código Q-001)
          <input value={q} onChange={(ev) => { setQ(ev.target.value); setRes(null); }} onKeyDown={(ev) => { if (ev.key === 'Enter' && q) setRes(achar(q)); }} />
        </label>
        <label className="campo-t">Trocar por
          <input value={novo} onChange={(ev) => setNovo(ev.target.value)} />
        </label>
        {res && <p className="qd-dica" role="status">{res}</p>}
      </div>
    </Janela>
  );
}

/** Barra de ferramentas vertical (computador): os itens do quadro sempre à mão. */
export const FERRAMENTAS = [
  ['inserir.postit', 'postit', 'Post-it'], ['inserir.inicio', 'inicio', 'Início/Fim'], ['inserir.processo', 'processo', 'Atividade'],
  ['inserir.decisao', 'decisao', 'Decisão'], ['inserir.dados', 'dados', 'Entrada/Saída'], ['inserir.texto', 'texto', 'Texto'],
  ['inserir.pagina', 'pagina', 'Página'], ['inserir.legenda', 'legenda', 'Legenda'], ['inserir.seta', 'seta', 'Seta'],
];
export function Ferramentas({ aoUsar, ligada, aoFechar }) {
  return (
    <div className="qd-ferr card" role="toolbar" aria-label="Ferramentas do quadro" onPointerDown={(ev) => ev.stopPropagation()}>
      <button type="button" className="qd-ferr-x" title="Esconder as ferramentas" aria-label="Esconder as ferramentas" onClick={aoFechar}><Icone n="x" /></button>
      {FERRAMENTAS.map(([id, ic, nome]) => (
        <button key={id} type="button" className={'qd-ferr-b' + (ligada(id) ? ' on' : '')} data-ferr={id} title={nome} aria-label={nome} aria-pressed={ligada(id) || undefined} onClick={() => aoUsar(id)}>
          <Icone n={ic} /><span>{nome}</span>
        </button>
      ))}
    </div>
  );
}

/** Celular: faixa de baixo com "Editar" e as cores à mão. */
export function CoresCelular({ cor, aoCor, aoEditar }) {
  return (
    <div className="qd-cores-cel card" role="group" aria-label="Cores" onPointerDown={(ev) => ev.stopPropagation()}>
      {aoEditar && <button type="button" className="qd-cc-editar" onClick={aoEditar}><Icone n="renomear" />Editar</button>}
      <div className="qd-cc-lista">
        {CORES.map(([id, hex, nome]) => (
          <button key={id} type="button" className={'qd-cc' + (cor === id ? ' on' : '')} title={nome} aria-label={'Cor ' + nome} data-cor={id} style={{ background: hex }} onClick={() => aoCor(id)} />
        ))}
      </div>
    </div>
  );
}

/** Assistente do quadro: a lâmpada com o número de pendências e a lista de problemas. */
export function Assistente({ lista, aberto, aoAlternar, aoIr, folga }) {
  return (
    <>
      <button type="button" className={'qd-lamp card' + (lista.length ? ' tem' : '')} style={folga ? { bottom: folga } : undefined} aria-expanded={aberto} aria-label={'Assistente do quadro: ' + (lista.length ? lista.length + ' pendências' : 'nenhuma pendência')} title="Assistente do quadro" onClick={aoAlternar} onPointerDown={(ev) => ev.stopPropagation()}>
        <Icone n="lampada" /><span>Assistente</span>{lista.length > 0 && <em>{lista.length}</em>}
      </button>
      {aberto && (
        <div className="qd-assist card" style={folga ? { bottom: folga + 50 } : undefined} role="dialog" aria-label="Assistente do quadro" onPointerDown={(ev) => ev.stopPropagation()}>
          <header><b>Assistente</b><button type="button" className="rbi" title="Fechar" aria-label="Fechar o assistente" onClick={aoAlternar}><Icone n="x" /></button></header>
          {lista.length === 0 ? <p className="qd-assist-ok"><Icone n="check" />Tudo certo: nenhuma pendência no quadro.</p> : (
            <ul>
              {lista.map((p) => (
                <li key={p.id} className={p.nivel}>
                  <i aria-hidden="true" />
                  <span>{p.texto}</span>
                  {p.item && <button type="button" className="btn sm" onClick={() => aoIr(p)}>Ir</button>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

/** Janela dos modelos de quadro da qualidade. */
export function JanelaModelos({ aoEscolher, aoFechar }) {
  return (
    <Janela titulo="Modelos de quadro" aoFechar={aoFechar} classe="qd-formas">
      <div className="janela-c">
        <div className="qd-paleta">
          {MODELOS.map((m) => (
            <button key={m.id} type="button" className="qd-cor" data-modelo={m.id} onClick={() => { aoEscolher(m.id); aoFechar(); }}>
              <Icone n={m.ic} />
              <span><b>{m.nome}</b><small>{m.descr}</small></span>
            </button>
          ))}
        </div>
        <p className="qd-dica">O modelo entra com textos de exemplo. Se o quadro já tem itens, ele entra embaixo deles. Dá para desfazer com Ctrl+Z.</p>
      </div>
    </Janela>
  );
}

/** Painel do post-it de tarefa: responsável, prazo e nota GUT. Grava ao sair do campo (não a cada tecla). */
export function PainelTarefa({ it, c, hoje, bloqueado, aoMudar }) {
  const [resp, setResp] = useState(it.resp || '');
  const [prazo, setPrazo] = useState(it.prazo || '');
  const [dataRuim, setDataRuim] = useState(false);
  /* desfazer/refazer mudam o item por fora: o campo acompanha */
  useEffect(() => { setResp(it.resp || ''); }, [it.resp]);
  useEffect(() => { setPrazo(it.prazo || ''); }, [it.prazo]);
  const r = resumoTarefa(c, it, hoje);
  const gut = valorGut(it);
  const nivel = nivelGut(gut);
  const nomeNivel = nivel ? NIVEIS_GUT.find((n) => n.id === nivel).nome : '';
  const nota = (campo, rotulo) => (
    <label className="campo-t" key={campo}>{rotulo}
      <select value={it[campo] || ''} disabled={bloqueado} onChange={(ev) => aoMudar({ [campo]: ev.target.value })}>
        <option value="">—</option>
        {NOTA_GUT.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </label>
  );
  return (
    <div className="qd-tarefa-p" role="group" aria-label="Tarefa">
      <label className="campo-t">Responsável
        <input value={resp} maxLength={60} disabled={bloqueado} placeholder="Nome de quem faz" onChange={(ev) => setResp(ev.target.value)} onBlur={() => { if (resp.trim() !== (it.resp || '')) aoMudar({ resp }); }} onKeyDown={(ev) => { if (ev.key === 'Enter') ev.currentTarget.blur(); }} />
      </label>
      <label className="campo-t">Prazo
        <input type="date" value={prazo} min="2000-01-01" max="2100-12-31" disabled={bloqueado} onChange={(ev) => { setPrazo(ev.target.value); setDataRuim(false); }} onBlur={() => { if (prazo !== '' && !prazoValido(prazo)) { setDataRuim(true); setPrazo(it.prazo || ''); return; } if (prazo !== (it.prazo || '')) aoMudar({ prazo }); }} />
      </label>
      {dataRuim && <p className="qd-aviso venc" role="alert">Data não aceita. Use uma data de 01/01/2000 a 31/12/2100.</p>}
      {r && r.vencida && <p className="qd-aviso venc" role="status">Prazo vencido ({r.prazo}).</p>}
      <div className="qd-gut-sel"><b>GUT</b>{nota('g', 'Gravidade')}{nota('u', 'Urgência')}{nota('t', 'Tendência')}</div>
      <p className={'qd-gut-res' + (nivel ? ' gut-' + nivel : '')} role="status">
        {gut ? <>GUT = <b>{gut}</b> · prioridade {nomeNivel.toLowerCase()}</> : 'Preencha as três notas (1 a 5) para ver a prioridade.'}
      </p>
    </div>
  );
}

/** Uma linha do painel da legenda (nome e descrição). Grava ao sair do campo; acompanha desfazer/refazer. */
function LinhaLegenda({ l, bloqueado, aoMudar }) {
  const [n, setN] = useState(l.nome);
  const [d, setD] = useState(l.descr);
  useEffect(() => { setN(l.nome); }, [l.nome]);
  useEffect(() => { setD(l.descr); }, [l.descr]);
  const enter = (ev) => { if (ev.key === 'Enter') ev.currentTarget.blur(); };
  return (
    <div className="qd-leg-lin">
      <label className="campo-t">Nome
        <input value={n} maxLength={30} disabled={bloqueado} onChange={(ev) => setN(ev.target.value)} onBlur={() => { if (n.trim() !== l.nome) aoMudar(l.tipo, 'n', n); }} onKeyDown={enter} />
      </label>
      <label className="campo-t">Descrição
        <input value={d} maxLength={90} disabled={bloqueado} onChange={(ev) => setD(ev.target.value)} onBlur={() => { if (d.trim() !== l.descr) aoMudar(l.tipo, 'd', d); }} onKeyDown={enter} />
      </label>
    </div>
  );
}

/** Painel da legenda: troca o nome e a descrição de cada linha. Texto vazio volta ao padrão. */
export function PainelLegenda({ it, c, bloqueado, aoMudar }) {
  const linhas = linhasLegenda(c, it);
  return (
    <div className="qd-leg-p" role="group" aria-label="Textos da legenda">
      {linhas.length === 0 && <p className="qd-dica">A legenda se monta sozinha quando houver formas ou setas no quadro.</p>}
      {linhas.map((l) => <LinhaLegenda key={l.tipo} l={l} bloqueado={bloqueado} aoMudar={aoMudar} />)}
      <p className="qd-dica">Apague o texto e saia do campo para voltar ao padrão.</p>
    </div>
  );
}

export function PortalPainel({ alvo, children }) {
  return alvo ? createPortal(children, alvo) : null;
}
