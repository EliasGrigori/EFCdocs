/* EFCdocs — peças da tela do quadro: item, setas, barra da seleção, minimapa, temporizador e janelas pequenas. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icone, Janela } from '../ui/comum.jsx';
import { CORES, COR, CORES_FONTE, TIPOS_ITEM, FORMAS } from './modelo.js';
import { pontosSeta, caminhoSVG, meioDoCaminho, contornoForma } from './geometria.js';

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

export function ItemView({ it, zi, sel, codigos, escondeTexto }) {
  const forma = FORMAS.includes(it.tipo);
  const style = { left: it.x, top: it.y, width: it.w, height: it.h, zIndex: zi };
  if (it.tipo === 'postit') style.background = COR[it.cor] || COR.amarelo;
  return (
    <div className={'qi qi-' + it.tipo + (sel ? ' sel' : '')} data-item={it.id} data-cod={it.cod || undefined} style={style}>
      {forma && <FormaSvg it={it} />}
      {it.tipo === 'imagem' && (it.src ? <img src={it.src} alt={it.texto || 'Imagem'} draggable="false" /> : <span className="qi-semimg"><Icone n="imagem" /></span>)}
      {it.tipo === 'raia'
        ? <div className="qi-raia-h" style={{ background: it.cor === 'branco' ? undefined : undefined }}><span>{escondeTexto ? '' : it.texto}</span></div>
        : it.tipo !== 'imagem' && <div className="qi-t" style={estiloTexto(it)}>{escondeTexto ? '' : it.texto}</div>}
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
export function BarraSelecao({ ancora, area, botoes, onExcluir, rotuloExcluir, fixa }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    /* celular: barra presa embaixo, centralizada (não cobre itens nem setas) */
    if (fixa) { setPos({ x: Math.max(8, (area.w - el.offsetWidth) / 2), y: area.h - el.offsetHeight - 64 }); return; }
    const w = el.offsetWidth, h = el.offsetHeight;
    let y = ancora.topo - h - 30;
    if (y < 52) y = ancora.base + 30;
    const x = Math.max(8, Math.min(area.w - w - 8, ancora.x - w / 2));
    y = Math.max(52, Math.min(area.h - h - 8, y));
    setPos({ x, y });
  }, [ancora.x, ancora.topo, ancora.base, area.w, area.h, botoes.length, fixa]);
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

export function PortalPainel({ alvo, children }) {
  return alvo ? createPortal(children, alvo) : null;
}
