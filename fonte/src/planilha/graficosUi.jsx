/* EFCdocs v0.6.1 — editor de gráficos (estilo Camadas) e a peça que fica sobre a grade.
   Pedido do Elias (F5): editar tudo de um jeito fácil, diferente do Excel, mas com todas as funções de lá.
   Como funciona: a prévia fica grande à esquerda; clicar numa parte dela (título, barra, eixo, legenda, fundo) abre
   o que dá para mudar daquela parte, à direita. Os estilos rápidos mudam tudo de uma vez; depois dá para ajustar o detalhe.
   Os gráficos do EFCdocs guardam as mudanças em g.fx; os que vieram do Excel mudam direto no plano (g.plano). */
import { useMemo, useRef, useState } from 'react';
import { Janela, Icone, usarEsc } from '../ui/comum.jsx';
import { TIPOS_GRAFICO, NOME_TIPO, normalizarG, recomendar, cartaControle, numeroCurto } from './graficos.js';
import { svgDoGrafico, svgDoPlano, planoDoGrafico, TEMA_CLARO } from './desenhoGrafico.js';
import { seriesDe, juntar, clonar, ESTILOS_RAPIDOS, LAYOUTS_RAPIDOS, PALETAS, fxDoEstilo, fxDoLayout, aplicarPacote, pacoteCores } from './graficoPlano.js';
import { PainelCores } from './cores.jsx';

/** O desenho (SVG) do gráfico, no tamanho pedido. */
export function GraficoView({ g, dados, w, h, tema = TEMA_CLARO, lerFaixa }) {
  const svg = useMemo(() => svgDoGrafico(g, dados, { w, h, tema, lerFaixa }), [g, dados, w, h, tema, lerFaixa]);
  return <div className="gr-view" style={{ width: w, height: h }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

const lerNum = (t) => { const s = String(t ?? '').trim().replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'); if (!s) return undefined; const n = Number(s); return Number.isFinite(n) ? n : NaN; };
const mostraNum = (v) => (typeof v === 'number' ? String(v).replace('.', ',') : '');
const ehNum = (v) => typeof v === 'number' && Number.isFinite(v);

const FORMATOS = [['', 'Como na planilha'], ['General', 'Geral'], ['0', '1234'], ['#,##0', '1.234'], ['0.0', '1234,5'], ['#,##0.00', '1.234,50'], ['"R$" #,##0.00', 'R$ 1.234,50'], ['"R$" #,##0', 'R$ 1.234'], ['0%', '12%'], ['0.0%', '12,5%'], ['dd/mm/yyyy', '05/01/2026'], ['dd/mm', '05/01'], ['mmm/yy', 'jan/26']];
const FORMAS = [['circle', 'Bolinha'], ['square', 'Quadrado'], ['diamond', 'Losango'], ['triangle', 'Triângulo'], ['x', 'X'], ['star', 'Estrela'], ['none', 'Sem']];
const TRACOS = [['solid', 'Contínua'], ['dash', 'Tracejada'], ['sysDot', 'Pontilhada'], ['dashDot', 'Traço e ponto']];
const TIPOS_SERIE = [['bar', 'Colunas'], ['line', 'Linha'], ['area', 'Área']];
const DIRETOS = new Set(['colunas', 'barras', 'linha', 'area']);

/* ---------- peças pequenas ---------- */
function Seg({ valor, opcoes, aoMudar, rotulo, dado }) {
  return (
    <div className="rg-seg ge-seg" role="group" aria-label={rotulo}>
      {opcoes.map(([v, t]) => <button key={String(v)} type="button" aria-pressed={valor === v} data-ge-op={dado ? `${dado}:${v}` : undefined} onClick={() => aoMudar(v)}>{t}</button>)}
    </div>
  );
}
function Campo({ rotulo, children, dica }) {
  return <label className="rg-campo ge-campo"><span>{rotulo}</span>{children}{dica && <em className="ge-dica">{dica}</em>}</label>;
}
function Num({ valor, aoMudar, placeholder, dado, passo }) {
  const [t, setT] = useState(mostraNum(valor));
  const [ultimo, setUltimo] = useState(valor);
  if (valor !== ultimo) { setUltimo(valor); setT(mostraNum(valor)); }
  return <input value={t} inputMode="decimal" placeholder={placeholder} data-ge={dado} step={passo} onChange={(ev) => { setT(ev.target.value); const n = lerNum(ev.target.value); if (!Number.isNaN(n)) aoMudar(n); }} />;
}
/** Botão de cor: abre o painel de cores (os 6 módulos do estilo Camadas) por cima. */
function Cor({ valor, aoMudar, rotulo, semCor = 'Sem cor', cores, dado }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  usarEsc(() => setAberto(false), aberto, ref);
  return (
    <span className="ge-cor" ref={ref}>
      <button type="button" className="ge-cor-b" aria-label={rotulo} title={rotulo} data-ge-cor={dado} aria-expanded={aberto} onClick={() => setAberto((x) => !x)}>
        <i style={{ background: valor || 'transparent' }} className={valor ? '' : 'vazio'} /><span>{valor ? valor.toUpperCase() : semCor}</span>
      </button>
      {aberto && (
        <div className="ge-pop" role="dialog" aria-label={rotulo} onMouseDown={(ev) => ev.stopPropagation()}>
          <PainelCores rotulo={rotulo} valor={valor} semCor={semCor} cores={cores} aoMudar={(h) => { aoMudar(h); setAberto(false); }} />
        </div>
      )}
    </span>
  );
}
const corDe = (pr) => (pr && pr.t === 'solido' ? pr.cor : pr && pr.t === 'degrade' && pr.paradas && pr.paradas[0] ? pr.paradas[0].cor : null);
/** Preenchimento: Cor / Degradê / Sem preenchimento */
function Preench({ valor, aoMudar, rotulo, cores, corPadrao, dado }) {
  const t = valor ? valor.t : 'auto';
  const c1 = corDe(valor) || corPadrao || '#0f6e8c';
  const c2 = valor && valor.t === 'degrade' && valor.paradas && valor.paradas[valor.paradas.length - 1] ? valor.paradas[valor.paradas.length - 1].cor : '#0b3d52';
  return (
    <div className="ge-linha">
      <Seg rotulo={rotulo} valor={t === 'auto' ? 'solido' : t} dado={dado} opcoes={[['solido', 'Cor'], ['degrade', 'Degradê'], ['nenhum', 'Nenhum']]} aoMudar={(v) => aoMudar(v === 'nenhum' ? { t: 'nenhum' } : v === 'degrade' ? { t: 'degrade', paradas: [{ p: 0, cor: c1 }, { p: 1, cor: c2 }], ang: 90 } : { t: 'solido', cor: c1 })} />
      {t !== 'nenhum' && <Cor valor={c1} rotulo={rotulo + ': cor'} cores={cores} dado={dado} aoMudar={(h) => aoMudar(t === 'degrade' ? { ...valor, paradas: [{ p: 0, cor: h || c1 }, ...valor.paradas.slice(1)] } : h ? { t: 'solido', cor: h } : { t: 'nenhum' })} />}
      {t === 'degrade' && <Cor valor={c2} rotulo={rotulo + ': segunda cor'} cores={cores} aoMudar={(h) => aoMudar({ ...valor, paradas: [valor.paradas[0], { p: 1, cor: h || c2 }] })} />}
    </div>
  );
}
/** Linha / contorno: Sem / cor + espessura + tracejado */
function Traco({ valor, aoMudar, rotulo, cores, corPadrao, dado, semNenhum }) {
  const ativo = valor ? valor.t !== 'nenhum' : !!corPadrao;
  return (
    <div className="ge-linha">
      {!semNenhum && <Seg rotulo={rotulo} valor={ativo ? 'sim' : 'nao'} dado={dado} opcoes={[['sim', 'Com'], ['nao', 'Sem']]} aoMudar={(v) => aoMudar(v === 'nao' ? { t: 'nenhum' } : { t: 'solido', cor: (valor && valor.cor) || corPadrao || '#5b6b76', larg: (valor && valor.larg) || 1.5 })} />}
      {ativo && <>
        <Cor valor={(valor && valor.cor) || corPadrao} rotulo={rotulo + ': cor'} cores={cores} aoMudar={(h) => aoMudar({ ...(valor || { t: 'solido' }), t: 'solido', cor: h || corPadrao })} />
        <select aria-label={rotulo + ': espessura'} value={String((valor && valor.larg) || '')} onChange={(ev) => aoMudar({ ...(valor || { t: 'solido', cor: corPadrao }), t: 'solido', larg: ev.target.value ? +ev.target.value : undefined })}>
          <option value="">Espessura</option>{[0.5, 0.75, 1, 1.5, 2.25, 3, 4.5, 6].map((x) => <option key={x} value={x}>{String(x).replace('.', ',')} pt</option>)}
        </select>
        <select aria-label={rotulo + ': tipo de linha'} value={(valor && valor.tr) || 'solid'} onChange={(ev) => aoMudar({ ...(valor || { t: 'solido', cor: corPadrao }), t: 'solido', tr: ev.target.value === 'solid' ? undefined : ev.target.value })}>
          {TRACOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
      </>}
    </div>
  );
}
function Fonte({ valor = {}, aoMudar, rotulo, cores, semNegrito }) {
  return (
    <div className="ge-linha">
      <select aria-label={rotulo + ': tamanho'} value={String(valor.tam || '')} onChange={(ev) => aoMudar({ tam: ev.target.value ? +ev.target.value : null })}>
        <option value="">Tamanho</option>{[7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28].map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      <Cor valor={valor.cor} rotulo={rotulo + ': cor do texto'} semCor="Automática" cores={cores} aoMudar={(h) => aoMudar({ cor: h || null })} />
      {!semNegrito && <button type="button" className={'btn sm ge-b' + (valor.negrito ? ' on' : '')} aria-pressed={!!valor.negrito} title="Negrito" onClick={() => aoMudar({ negrito: !valor.negrito })}><b>N</b></button>}
    </div>
  );
}

/* ---------- mexer no gráfico (EFCdocs: g.fx; Excel: g.plano) ---------- */
function mexer(g, fn) { const x = clonar(g); fn(x); return x; }
const alvo = (x) => (x.t === 'excel' ? x.plano : (x.fx || (x.fx = {})));
function setCampo(x, nome, patch) {
  const a = alvo(x);
  a[nome] = patch === null ? null : juntar(a[nome] || {}, patch);
}
function setSerie(x, i, patch) {
  if (x.t === 'excel') { const L = seriesDe(x.plano); if (L[i]) Object.assign(L[i].S, juntar(L[i].S, patch)); return; }
  const fx = alvo(x); fx.series = fx.series || {}; fx.series[i] = juntar(fx.series[i] || {}, patch);
}
function setEixo(x, k, patch) {
  const a = alvo(x); a.eixos = a.eixos || {};
  a.eixos[k] = juntar(a.eixos[k] || {}, patch);
}
function setGrupo(x, patch) {
  if (x.t === 'excel') { for (const G of x.plano.grupos) for (const k of Object.keys(patch)) if (G[k] !== undefined || ((k === 'espaco' || k === 'sobrepor') && G.tipo === 'bar') || ((k === 'giro') && /pie|doughnut/.test(G.tipo)) || (k === 'furo' && G.tipo === 'doughnut')) G[k] = patch[k]; return; }
  const fx = alvo(x); fx.grupo = { ...(fx.grupo || {}), ...patch };
}
/** Excel: muda o tipo de uma série (vai para outro grupo) e o eixo. */
function tipoDaSerieExcel(x, i, tipo, eixo2) {
  const P = x.plano;
  const L = seriesDe(P);
  const it = L[i];
  if (!it) return;
  it.G.series = it.G.series.filter((s) => s !== it.S);
  let G = P.grupos.find((gg) => gg.tipo === tipo && !!gg.eixo2 === !!eixo2);
  if (!G) {
    G = tipo === 'bar' ? { tipo, dir: 'col', agrup: 'clustered', espaco: 150, sobrepor: 0, series: [] } : { tipo, agrup: 'standard', marcas: true, series: [] };
    if (eixo2) G.eixo2 = true;
    P.grupos.push(G);
  }
  if (tipo === 'line' && it.S.contorno !== undefined && it.S.linha === undefined) { it.S.linha = it.S.contorno && it.S.contorno.t !== 'nenhum' ? it.S.contorno : { t: 'solido', cor: corDe(it.S.preench), larg: 2.25 }; delete it.S.contorno; }
  G.series.push(it.S);
  P.grupos = P.grupos.filter((gg) => gg.series.length || gg.tipo === 'gauge');
  if (eixo2 && !P.eixos.y2) { P.eixos.y2 = { tipo: 'val', pos: 'r', grade: null, linha: null, rotulo: { ...(P.eixos.y && P.eixos.y.rotulo) } }; P.eixos.x2 = { tipo: 'cat', apagado: true }; }
}

const ABAS = [['tipo', 'Tipo e dados', 'grafico'], ['estilo', 'Estilo', 'tema'], ['series', 'Séries', 'lista'], ['eixos', 'Eixos', 'grade'], ['textos', 'Textos', 'titulo'], ['fundo', 'Fundo', 'balde']];

/**
 * inicial: g já salvo (editar) ou null (novo) · faixaPadrao: texto da seleção · lerDados(fx, porLinhas, ocultos) → { d, erro, ocultas }
 * lerFaixa: para os gráficos que vieram do Excel · tamanho: { w, h } do gráfico na grade (a prévia fica do mesmo jeito)
 */
export function JanelaGrafico({ inicial, faixaPadrao, lerDados, lerFaixa, aoAplicar, aoFechar, tema, tamanho }) {
  const [g, setG] = useState(() => normalizarG(inicial || { t: '', dados: { fx: faixaPadrao } }));
  const [fx, setFx] = useState(g.dados.fx || faixaPadrao || '');
  const [aba, setAba] = useState('tipo');
  const [serieSel, setSerieSel] = useState(0);
  const [pontoSel, setPontoSel] = useState(null);
  const [eixoSel, setEixoSel] = useState('y');
  const [erro, setErro] = useState('');
  const ehX = g.t === 'excel';
  const lido = useMemo(() => (ehX ? { d: { cats: [], series: [] } } : lerDados(fx, !!g.porLinhas, !!g.op.ocultos)), [fx, g.porLinhas, g.op.ocultos, ehX]); // eslint-disable-line react-hooks/exhaustive-deps
  const d = lido.d || { cats: [], series: [] };
  const rec = useMemo(() => recomendar(d), [d]);
  const tipo = ehX ? 'excel' : g.t && (inicial || g.escolhido) ? g.t : rec[0];
  const gv = ehX ? g : { ...g, t: tipo };
  const P = useMemo(() => planoDoGrafico(gv, d, lerFaixa), [gv, d, lerFaixa]); // eslint-disable-line react-hooks/exhaustive-deps
  const series = seriesDe(P);
  const muda = (p) => setG((x) => ({ ...x, ...p }));
  const mudaOp = (p) => setG((x) => ({ ...x, op: { ...x.op, ...p } }));
  const mx = (fn) => setG((x) => mexer({ ...x, t: x.t === 'excel' ? 'excel' : (x.t && (inicial || x.escolhido) ? x.t : tipo) }, fn));
  const carta = tipo === 'controle' && d.series[0] ? cartaControle(d.series[0].vals, gv.op) : null;
  const cores = (P.paleta || []).slice(0, 12);
  const W = Math.min(520, Math.max(320, (tamanho && tamanho.w) || 480));
  const H = Math.round(W * Math.min(1.1, Math.max(0.45, ((tamanho && tamanho.h) || 300) / ((tamanho && tamanho.w) || 480))));
  const svg = useMemo(() => svgDoPlano(P, { w: W, h: H, tema, rotulo: 'Prévia do gráfico' }), [P, W, H, tema]);

  const aplicar = () => {
    if (!ehX) {
      if (lido.erro) { setErro(lido.erro); return; }
      if (!d.series.length) { setErro('A faixa não tem números. Escolha as células com os valores (pode incluir os títulos e a coluna dos nomes).'); return; }
    }
    const fim = normalizarG(ehX ? g : { ...gv, dados: { aba: lido.aba || '', fx: lido.fx || fx } });
    aoAplicar(fim);
    aoFechar();
  };
  /* clicar numa parte da prévia: abre o que dá para mudar dela */
  const aoClicarPrevia = (ev) => {
    /* o número em cima da barra não tem parte: vale o que está embaixo dele (e o fundo só se não houver outra coisa) */
    const lista = (document.elementsFromPoint ? document.elementsFromPoint(ev.clientX, ev.clientY) : [ev.target]).map((x) => x && x.closest && x.closest('[data-parte]')).filter(Boolean);
    const el = lista.find((x) => !/^(fundo|area)$/.test(x.getAttribute('data-parte'))) || lista[0] || ev.target.closest('[data-parte]');
    if (!el) return;
    const [k, a, b] = el.getAttribute('data-parte').split(':');
    if (k === 'serie' || k === 'ponto') { setSerieSel(+a || 0); setPontoSel(k === 'ponto' ? +b : null); setAba('series'); }
    else if (k === 'eixo') { setEixoSel(a === 'x' ? 'x' : a === 'y2' ? 'y2' : 'y'); setAba('eixos'); }
    else if (k === 'titulo' || k === 'legenda') setAba('textos');
    else if (k === 'fundo' || k === 'area') setAba('fundo');
    else if (k === 'meta' || k === 'valor' || k === 'ponteiro' || k === 'faixas') setAba('tipo');
  };
  const resumo = carta ? `Média ${numeroCurto(carta.media)} · σ ${numeroCurto(carta.sigma)} · ${carta.nFora} fora dos limites` : ehX ? `Gráfico do Excel · ${series.length} série${series.length === 1 ? '' : 's'}` : `${d.series.length} série${d.series.length === 1 ? '' : 's'} · ${d.cats.length} ponto${d.cats.length === 1 ? '' : 's'}${lido.ocultas ? ` · ${lido.ocultas} oculta${lido.ocultas === 1 ? '' : 's'} fora` : ''}`;

  return (
    <Janela titulo={inicial ? 'Editar gráfico' : 'Inserir gráfico'} icone="grafico" subtitulo={ehX ? 'Veio do Excel: tudo que você não mexer continua igual' : 'Dados: ' + (fx || '—')} aoFechar={aoFechar} classe="gr-jan ge-jan" rodape={(
      <>
        <span className="gr-dica">{resumo}</span>
        <span style={{ flex: 1 }} />
        <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn sm primary" data-gr-aplicar data-foco onClick={aplicar}>{inicial ? 'Salvar' : 'Inserir'}</button>
      </>
    )}>
      <div className="janela-c ge-corpo" data-grafico-janela>
        <div className="ge-esq">
          <section className="rg-cartao ge-previa-c">
            <span className="rg-cab">Prévia <em>clique numa parte para mudar</em></span>
            <div className="gr-previa ge-previa" data-gr-previa onClick={aoClicarPrevia} dangerouslySetInnerHTML={{ __html: svg }} />
            {erro && <p className="rg-erro" role="alert">{erro}</p>}
          </section>
          <section className="rg-cartao">
            <span className="rg-cab">Estilos rápidos</span>
            <div className="ge-estilos">
              {ESTILOS_RAPIDOS.map(([id, nome, desc]) => {
                const gx = aplicarPacote(gv, fxDoEstilo(id, series.length), { estilo: id });
                return (
                  <button key={id} type="button" className={'ge-est' + (g.estilo === id ? ' on' : '')} title={desc} aria-pressed={g.estilo === id} data-ge-estilo={id}
                    onClick={() => setG(() => ({ ...aplicarPacote(gv, fxDoEstilo(id, series.length), { estilo: id }), escolhido: true }))}>
                    <span dangerouslySetInnerHTML={{ __html: svgDoPlano(planoDoGrafico(gx, d, lerFaixa), { w: 120, h: 72, mini: true }) }} />
                    <span>{nome}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
        <div className="ge-dir">
          <div className="ge-abas" role="tablist" aria-label="O que mudar">
            {ABAS.map(([k, t, ic]) => <button key={k} type="button" role="tab" aria-selected={aba === k} data-ge-aba={k} onClick={() => setAba(k)}><Icone n={ic} /><span>{t}</span></button>)}
          </div>
          <div className="ge-painel" role="tabpanel">
            {aba === 'tipo' && <AbaTipo {...{ g, gv, ehX, tipo, rec, d, fx, setFx, setErro, lido, muda, mudaOp, mx, P, series, tema, lerFaixa, carta }} />}
            {aba === 'estilo' && <AbaEstilo {...{ g, gv, P, setG, series, cores }} />}
            {aba === 'series' && <AbaSeries {...{ g, gv, ehX, tipo, P, series, serieSel, setSerieSel, pontoSel, setPontoSel, mx, cores }} />}
            {aba === 'eixos' && <AbaEixos {...{ P, eixoSel, setEixoSel, mx, cores, ehX, g, mudaOp }} />}
            {aba === 'textos' && <AbaTextos {...{ g, ehX, P, mx, muda, mudaOp, cores }} />}
            {aba === 'fundo' && <AbaFundo {...{ P, mx, cores }} />}
          </div>
        </div>
      </div>
    </Janela>
  );
}

/* ---------- Tipo e dados ---------- */
function AbaTipo({ g, gv, ehX, tipo, rec, d, fx, setFx, setErro, lido, muda, mudaOp, mx, P, series, tema, carta }) {
  const empilhavel = ['colunas', 'barras', 'area'].includes(tipo);
  const temMeta = !['pizza', 'rosca', 'pareto', 'dispersao', 'excel'].includes(tipo);
  if (ehX) {
    return (
      <>
        <section className="rg-cartao">
          <span className="rg-cab">Gráfico do Excel</span>
          <p className="rg-dica">Este gráfico veio pronto do Excel. Tudo que você não mudar aqui volta igual quando salvar como Excel. Para trocar o tipo de uma série (colunas, linha, área) ou mandar para o eixo da direita, use <b>Séries</b>.</p>
          <Campo rotulo="Título"><input value={(P.titulo && P.titulo.texto) || ''} data-gr-titulo maxLength={120} onChange={(ev) => mx((x) => { x.plano.titulo = ev.target.value ? { ...(x.plano.titulo || { tam: 14, negrito: true }), texto: ev.target.value } : null; x.titulo = ev.target.value; })} placeholder="Sem título" /></Campo>
        </section>
        <section className="rg-cartao">
          <span className="rg-cab">De onde vêm os números</span>
          <div className="ge-lista-dados">
            {series.map(({ S }, i) => (
              <div key={i} className="ge-dado"><i style={{ background: corDe(S.preench) || corDe(S.linha) || (P.paleta || [])[i % 6] }} /><b>{S.nome.txt || `Série ${i + 1}`}</b><span>{S.vals.ref ? S.vals.ref.fx : 'números escritos no gráfico'}</span></div>
            ))}
          </div>
        </section>
      </>
    );
  }
  return (
    <>
      <section className="rg-cartao">
        <span className="rg-cab">Dados</span>
        <Campo rotulo="Células"><input value={fx} data-gr-fx spellCheck={false} onChange={(ev) => { setFx(ev.target.value); setErro(''); }} placeholder="A1:C20" /></Campo>
        <label className="rg-chk"><input type="checkbox" checked={!!g.porLinhas} onChange={(ev) => muda({ porLinhas: ev.target.checked || undefined })} /> Cada linha é uma série (em vez de cada coluna)</label>
        <label className="rg-chk"><input type="checkbox" checked={!!g.op.ocultos} data-gr-ocultos onChange={(ev) => mudaOp({ ocultos: ev.target.checked || undefined })} /> Mostrar também linhas e colunas ocultas {lido.ocultas ? <em className="ge-nota">({lido.ocultas} oculta{lido.ocultas === 1 ? '' : 's'} fora agora, como no Excel)</em> : null}</label>
        {lido.erro && <p className="rg-erro" role="alert">{lido.erro}</p>}
        <Campo rotulo="Título"><input value={g.titulo} data-gr-titulo maxLength={120} onChange={(ev) => muda({ titulo: ev.target.value })} placeholder="Ex.: Cloro residual por ponto" /></Campo>
      </section>
      <section className="rg-cartao">
        <span className="rg-cab">Recomendados para estes dados</span>
        <div className="gr-recs">
          {rec.map((t, i) => (
            <button key={t} type="button" className={'gr-mini' + (tipo === t ? ' on' : '')} data-gr-rec={t} aria-pressed={tipo === t} onClick={() => muda({ t, escolhido: true })}>
              <span className="gr-mini-svg" dangerouslySetInnerHTML={{ __html: svgDoGrafico({ ...gv, t, titulo: '', fx: undefined }, d, { w: 132, h: 78, tema, mini: true }) }} />
              <span className="gr-mini-n">{NOME_TIPO[t]}{i === 0 && <em>Recomendado</em>}</span>
            </button>
          ))}
        </div>
        <span className="rg-cab">Todos os tipos</span>
        <div className="gr-tipos" role="group" aria-label="Tipo de gráfico">
          {TIPOS_GRAFICO.map(([t, nome]) => (
            <button key={t} type="button" className={'gr-tipo' + (tipo === t ? ' on' : '')} data-gr-tipo={t} aria-pressed={tipo === t} title={nome} onClick={() => muda({ t, escolhido: true })}>
              <span className="gr-tipo-svg" dangerouslySetInnerHTML={{ __html: svgDoGrafico({ ...gv, t, titulo: '', fx: undefined }, d, { w: 64, h: 40, tema, mini: true }) }} />
              <span>{nome}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="rg-cartao">
        <span className="rg-cab">Opções</span>
        <div className="rg-linha">
          <label className="rg-chk"><input type="checkbox" checked={g.op.rotulos} data-gr-rotulos onChange={(ev) => mudaOp({ rotulos: ev.target.checked })} /> Mostrar os valores</label>
        </div>
        {empilhavel && <Campo rotulo="Empilhar"><Seg rotulo="Empilhar" dado="empilhado" valor={g.op.empilhado === '100' ? '100' : g.op.empilhado ? 'sim' : 'nao'} opcoes={[['nao', 'Lado a lado'], ['sim', 'Empilhado'], ['100', '100%']]} aoMudar={(v) => mudaOp({ empilhado: v === '100' ? '100' : v === 'sim' })} /></Campo>}
        {temMeta && <Campo rotulo={tipo === 'velocimetro' ? 'Meta' : 'Meta (linha)'}><Num valor={g.op.meta} dado="meta" placeholder="Ex.: 2" aoMudar={(n) => mudaOp({ meta: n })} /></Campo>}
        {tipo === 'velocimetro' && (
          <>
            <Campo rotulo="Mínimo"><Num valor={g.op.min} placeholder="0" dado="min" aoMudar={(n) => mudaOp({ min: n })} /></Campo>
            <Campo rotulo="Máximo"><Num valor={g.op.max} placeholder="automático" dado="max" aoMudar={(n) => mudaOp({ max: n })} /></Campo>
            <Campo rotulo="Melhor é"><Seg rotulo="Melhor é" valor={g.op.sentido === 'menor' ? 'menor' : 'maior'} opcoes={[['maior', 'Mais alto'], ['menor', 'Mais baixo']]} aoMudar={(v) => mudaOp({ sentido: v === 'menor' ? 'menor' : undefined })} /></Campo>
            <p className="rg-dica">As cores (verde, amarelo e vermelho) saem da meta. Sem meta: verde até 60%, amarelo até 85%, vermelho no fim.</p>
          </>
        )}
        {tipo === 'controle' && (
          <>
            <Campo rotulo="LSC"><Num valor={g.op.lsc} dado="lsc" placeholder={carta ? 'calculado: ' + numeroCurto(cartaControle(d.series[0].vals, {}).lsc) : ''} aoMudar={(n) => mudaOp({ lsc: n })} /></Campo>
            <Campo rotulo="LIC"><Num valor={g.op.lic} dado="lic" placeholder={carta ? 'calculado: ' + numeroCurto(cartaControle(d.series[0].vals, {}).lic) : ''} aoMudar={(n) => mudaOp({ lic: n })} /></Campo>
            <p className="rg-dica">Vazios: média ± 3 desvios (pela amplitude móvel, carta de valores individuais). Pontos fora ficam vermelhos.</p>
          </>
        )}
        {void mx}
      </section>
    </>
  );
}

/* ---------- Estilo: estilos rápidos, layout, cores, semáforo ---------- */
function AbaEstilo({ g, gv, P, setG, series }) {
  const sem = P.semaforo;
  const nomeX = (P.eixos && P.eixos.x && P.eixos.x.titulo && P.eixos.x.titulo.texto) || 'Categorias';
  const nomeY = (series[0] && series[0].S.nome.txt) || 'Valores';
  const aplicaFx = (pacote, extra) => setG(() => ({ ...aplicarPacote(gv, pacote, extra), escolhido: true }));
  return (
    <>
      <section className="rg-cartao">
        <span className="rg-cab">Layout rápido</span>
        <p className="rg-dica">Onde ficam o título, a legenda e os números. Funciona com qualquer estilo.</p>
        <div className="ge-chips">
          {LAYOUTS_RAPIDOS.map(([id, nome]) => <button key={id} type="button" className="btn sm" data-ge-layout={id} onClick={() => aplicaFx(fxDoLayout(id, { titulo: gv.titulo || (P.titulo && P.titulo.texto) || 'Título do gráfico', eixoX: nomeX, eixoY: nomeY }), id === 'so' ? { titulo: g.t === 'excel' ? g.titulo : '' } : id === 'titulo-baixo' || id === 'legenda-direita' ? { titulo: gv.titulo || (g.t === 'excel' ? g.titulo : 'Título do gráfico') } : undefined)}>{nome}</button>)}
        </div>
      </section>
      <section className="rg-cartao">
        <span className="rg-cab">Cores</span>
        <div className="ge-paletas">
          {PALETAS.map(([id, nome, cs]) => (
            <button key={id} type="button" className="ge-pal" data-ge-paleta={id} title={nome} onClick={() => aplicaFx(pacoteCores(P, cs), g.t === 'excel' ? undefined : { op: { ...g.op, cores: cs.slice() } })}>
              <span>{cs.slice(0, 5).map((c) => <i key={c} style={{ background: c }} />)}</span>{nome}
            </button>
          ))}
        </div>
      </section>
      <section className="rg-cartao">
        <span className="rg-cab">Semáforo da qualidade</span>
        <label className="rg-chk"><input type="checkbox" checked={!!sem} data-ge-semaforo onChange={(ev) => aplicaFx({ semaforo: ev.target.checked ? { folga: 15 } : null })} /> Pintar cada barra ou ponto pela meta</label>
        {sem && (
          <>
            <Campo rotulo="Meta"><Num valor={sem.meta} placeholder={typeof g.op.meta === 'number' ? 'a meta do gráfico' : 'a média'} aoMudar={(n) => aplicaFx({ semaforo: { ...sem, meta: n } })} /></Campo>
            <Campo rotulo="Perto (%)"><Num valor={sem.folga ?? 15} aoMudar={(n) => aplicaFx({ semaforo: { ...sem, folga: n } })} /></Campo>
            <Campo rotulo="Melhor é"><Seg rotulo="Melhor é" valor={sem.sentido === 'menor' ? 'menor' : 'maior'} opcoes={[['maior', 'Mais alto'], ['menor', 'Mais baixo']]} aoMudar={(v) => aplicaFx({ semaforo: { ...sem, sentido: v } })} /></Campo>
            <p className="rg-dica">Verde: dentro da meta · amarelo: perto (dentro da faixa "perto") · vermelho: fora.</p>
          </>
        )}
      </section>
      {g.t !== 'excel' && g.fx && (
        <button type="button" className="btn sm ge-limpar" data-ge-limpar onClick={() => setG((x) => { const y = { ...x }; delete y.fx; delete y.estilo; return y; })}><Icone n="restaurar" />Tirar a formatação (voltar ao padrão do EFCdocs)</button>
      )}
    </>
  );
}

/* ---------- Séries ---------- */
function AbaSeries({ g, ehX, tipo, P, series, serieSel, setSerieSel, pontoSel, setPontoSel, mx, cores }) {
  const i = Math.min(serieSel, Math.max(0, series.length - 1));
  const it = series[i];
  if (!it) return <p className="rg-dica">Escolha os dados primeiro.</p>;
  const { G, S } = it;
  const corS = corDe(S.preench) || corDe(S.linha) || (P.paleta || [])[i % Math.max(1, (P.paleta || []).length)] || '#0f6e8c';
  const linha = G.tipo === 'line' || G.tipo === 'scatter';
  const redondo = G.tipo === 'pie' || G.tipo === 'doughnut';
  const R = S.rotulos || {};
  const setS = (patch) => mx((x) => setSerie(x, i, patch));
  const podeTipo = ehX ? !redondo && G.tipo !== 'scatter' && G.tipo !== 'gauge' : DIRETOS.has(tipo);
  const tipoAtual = G.tipo;
  const fxS = (g.fx && g.fx.series && g.fx.series[i]) || {};
  const nPts = Math.max((S.vals.num || []).length, (S.cats.txt || []).length);
  return (
    <>
      <div className="ge-chips" role="group" aria-label="Série">
        {series.map(({ S: s }, k) => (
          <button key={k} type="button" className={'ge-chip' + (k === i ? ' on' : '')} aria-pressed={k === i} data-ge-serie={k} onClick={() => { setSerieSel(k); setPontoSel(null); }}>
            <i style={{ background: corDe(s.preench) || corDe(s.linha) || (P.paleta || [])[k % 6] }} />{s.nome.txt || `Série ${k + 1}`}
          </button>
        ))}
      </div>
      {podeTipo && (
        <section className="rg-cartao">
          <span className="rg-cab">Tipo desta série</span>
          <Seg rotulo="Tipo da série" dado="tipoSerie" valor={tipoAtual} opcoes={TIPOS_SERIE} aoMudar={(v) => mx((x) => { if (x.t === 'excel') tipoDaSerieExcel(x, i, v, !!G.eixo2); else setSerie(x, i, { tipo: v }); })} />
          <label className="rg-chk"><input type="checkbox" checked={!!G.eixo2 || !!fxS.eixo2} data-ge-eixo2 onChange={(ev) => mx((x) => { if (x.t === 'excel') tipoDaSerieExcel(x, i, tipoAtual, ev.target.checked); else { setSerie(x, i, { eixo2: ev.target.checked }); if (ev.target.checked) { const fx = alvo(x); fx.eixos = fx.eixos || {}; } } })} /> Usar o eixo da direita (para números de outro tamanho)</label>
        </section>
      )}
      {!redondo && (
        <section className="rg-cartao">
          <span className="rg-cab">{linha ? 'Linha' : 'Preenchimento e contorno'}</span>
          {linha ? (
            <>
              <Traco rotulo="Linha" valor={S.linha} corPadrao={corS} cores={cores} dado="linha" aoMudar={(v) => setS({ linha: v })} />
              <label className="rg-chk"><input type="checkbox" checked={!!S.suave} data-ge-suave onChange={(ev) => setS({ suave: ev.target.checked })} /> Linha curva (suave)</label>
              <Campo rotulo="Marcador">
                <div className="ge-linha">
                  <select aria-label="Forma do marcador" data-ge-marcador value={(S.marcador && S.marcador.forma) || 'none'} onChange={(ev) => setS({ marcador: ev.target.value === 'none' ? { forma: 'none' } : { ...(S.marcador || {}), forma: ev.target.value, tam: (S.marcador && S.marcador.tam) || 6 } })}>
                    {FORMAS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                  </select>
                  {S.marcador && S.marcador.forma !== 'none' && <>
                    <select aria-label="Tamanho do marcador" value={String(S.marcador.tam || 6)} onChange={(ev) => setS({ marcador: { ...S.marcador, tam: +ev.target.value } })}>{[3, 4, 5, 6, 7, 8, 10, 12].map((x) => <option key={x} value={x}>{x}</option>)}</select>
                    <Cor valor={corDe(S.marcador.preench) || corS} rotulo="Cor do marcador" cores={cores} aoMudar={(h) => setS({ marcador: { ...S.marcador, preench: h ? { t: 'solido', cor: h } : { t: 'nenhum' } } })} />
                  </>}
                </div>
              </Campo>
            </>
          ) : (
            <>
              <Campo rotulo="Preencher"><Preench rotulo="Preenchimento" valor={S.preench} corPadrao={corS} cores={cores} dado="preench" aoMudar={(v) => setS({ preench: v })} /></Campo>
              <Campo rotulo="Contorno"><Traco rotulo="Contorno" valor={S.contorno} cores={cores} dado="contorno" aoMudar={(v) => setS({ contorno: v })} /></Campo>
            </>
          )}
          <Campo rotulo="Efeito">
            <Seg rotulo="Efeito" dado="efeito" valor={S.efeito && S.efeito.brilho ? 'brilho' : S.efeito && S.efeito.sombra ? 'sombra' : 'nao'} opcoes={[['nao', 'Nenhum'], ['brilho', 'Brilho'], ['sombra', 'Sombra']]} aoMudar={(v) => setS({ efeito: v === 'brilho' ? { brilho: { cor: corS, raio: 5, alfa: 0.6 } } : v === 'sombra' ? { sombra: { cor: '#000000', alfa: 0.3, blur: 4, dist: 2, dir: 90 } } : null })} />
          </Campo>
        </section>
      )}
      <section className="rg-cartao">
        <span className="rg-cab">Números na série</span>
        <div className="ge-linha ge-checks">
          <label className="rg-chk"><input type="checkbox" checked={!!R.val} data-ge-rot-val onChange={(ev) => setS({ rotulos: ev.target.checked || R.pct || R.cat || R.nome ? { ...R, val: ev.target.checked } : null })} /> Valor</label>
          {redondo && <label className="rg-chk"><input type="checkbox" checked={!!R.pct} onChange={(ev) => setS({ rotulos: { ...R, pct: ev.target.checked } })} /> Porcentagem</label>}
          <label className="rg-chk"><input type="checkbox" checked={!!R.cat} onChange={(ev) => setS({ rotulos: { ...R, cat: ev.target.checked } })} /> Categoria</label>
          <label className="rg-chk"><input type="checkbox" checked={!!R.nome} onChange={(ev) => setS({ rotulos: { ...R, nome: ev.target.checked } })} /> Nome da série</label>
        </div>
        {(R.val || R.pct || R.cat || R.nome) && <>
          <Campo rotulo="Onde">
            <select aria-label="Posição dos números" data-ge-rot-pos value={R.pos || ''} onChange={(ev) => setS({ rotulos: { ...R, pos: ev.target.value || undefined } })}>
              <option value="">Automático</option>
              {(linha ? [['t', 'Em cima'], ['b', 'Embaixo'], ['r', 'À direita'], ['l', 'À esquerda'], ['ctr', 'No ponto']] : redondo ? [['ctr', 'Dentro'], ['outEnd', 'Fora'], ['bestFit', 'Melhor lugar']] : [['outEnd', 'Fora, na ponta'], ['inEnd', 'Dentro, na ponta'], ['ctr', 'No meio'], ['inBase', 'Dentro, na base']]).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Formato">
            <select aria-label="Formato dos números" data-ge-rot-fmt value={R.fmt || ''} onChange={(ev) => setS({ rotulos: { ...R, fmt: ev.target.value || undefined } })}>
              {FORMATOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Texto"><Fonte rotulo="Números" valor={R} cores={cores} aoMudar={(p) => setS({ rotulos: { ...R, ...p } })} /></Campo>
        </>}
      </section>
      {!redondo && G.tipo !== 'gauge' && (
        <section className="rg-cartao">
          <span className="rg-cab">Linha de tendência</span>
          <Seg rotulo="Tendência" dado="tendencia" valor={S.tendencia ? S.tendencia.tipo : 'nao'} opcoes={[['nao', 'Nenhuma'], ['linear', 'Reta'], ['media', 'Média móvel']]} aoMudar={(v) => setS({ tendencia: v === 'nao' ? null : { tipo: v, periodo: 3 } })} />
          {S.tendencia && S.tendencia.tipo === 'media' && <Campo rotulo="Período"><Num valor={S.tendencia.periodo || 3} aoMudar={(n) => setS({ tendencia: { ...S.tendencia, periodo: Math.max(2, Math.round(n || 2)) } })} /></Campo>}
        </section>
      )}
      <section className="rg-cartao">
        <span className="rg-cab">Cor de cada {redondo ? 'fatia' : 'ponto'}</span>
        <p className="rg-dica">Clique numa {redondo ? 'fatia' : 'barra ou ponto'} na prévia, ou escolha aqui. "Invisível" esconde (é assim que se faz o velocímetro no Excel).</p>
        <div className="ge-pontos">
          {Array.from({ length: Math.min(nPts, 60) }, (_, k) => {
            const pt = (S.pontos && S.pontos[k]) || {};
            const c = corDe(pt.preench);
            return (
              <button key={k} type="button" className={'ge-pt' + (pontoSel === k ? ' on' : '')} data-ge-ponto={k} onClick={() => setPontoSel(k)} title={(S.cats.txt && S.cats.txt[k]) || String(k + 1)}>
                <i className={pt.preench && pt.preench.t === 'nenhum' ? 'vazio' : ''} style={{ background: c || (redondo ? (P.paleta || [])[k % 6] : corS) }} />
                <span>{(S.cats.txt && S.cats.txt[k]) || k + 1}</span>
              </button>
            );
          })}
        </div>
        {pontoSel != null && pontoSel < nPts && (
          <div className="ge-ponto-ed">
            <b>{(S.cats.txt && S.cats.txt[pontoSel]) || `Ponto ${pontoSel + 1}`}</b>
            <Preench rotulo="Cor do ponto" valor={(S.pontos && S.pontos[pontoSel] && S.pontos[pontoSel].preench) || null} corPadrao={redondo ? (P.paleta || [])[pontoSel % 6] : corS} cores={cores} dado="ponto" aoMudar={(v) => setS({ pontos: { [pontoSel]: { preench: v, ...(v.t === 'nenhum' ? { contorno: { t: 'nenhum' } } : {}) } } })} />
            {S.pontos && S.pontos[pontoSel] && <button type="button" className="btn sm" onClick={() => setS({ pontos: { [pontoSel]: null } })}>Cor da série</button>}
          </div>
        )}
      </section>
    </>
  );
}

/* ---------- Eixos ---------- */
function AbaEixos({ P, eixoSel, setEixoSel, mx, cores }) {
  const E = P.eixos || {};
  if (!E.x && !E.y) return <p className="rg-dica">Este tipo de gráfico não tem eixos.</p>;
  const opcoes = [['x', 'Das categorias'], ['y', 'Dos números'], ...(E.y2 ? [['y2', 'Da direita']] : [])];
  const k = E[eixoSel] ? eixoSel : 'y';
  const e = E[k] || {};
  const setE = (patch) => mx((x) => setEixo(x, k, patch));
  const val = e.tipo === 'val';
  return (
    <>
      <Seg rotulo="Eixo" dado="eixo" valor={k} opcoes={opcoes} aoMudar={setEixoSel} />
      <section className="rg-cartao">
        <span className="rg-cab">Mostrar</span>
        <label className="rg-chk"><input type="checkbox" checked={!e.apagado} data-ge-eixo-mostrar onChange={(ev) => setE({ apagado: !ev.target.checked })} /> Mostrar este eixo</label>
        <Campo rotulo="Nome"><input value={(e.titulo && e.titulo.texto) || ''} data-ge-eixo-titulo maxLength={60} onChange={(ev) => setE({ titulo: ev.target.value ? { ...(e.titulo || {}), texto: ev.target.value } : null })} placeholder="Ex.: mg/L" /></Campo>
        {!val && <label className="rg-chk"><input type="checkbox" checked={!!e.inverter} onChange={(ev) => setE({ inverter: ev.target.checked })} /> Ordem ao contrário</label>}
      </section>
      {val && (
        <section className="rg-cartao">
          <span className="rg-cab">Escala</span>
          <Campo rotulo="Mínimo"><Num valor={e.min} dado="eixo-min" placeholder="automático" aoMudar={(n) => setE({ min: n })} /></Campo>
          <Campo rotulo="Máximo"><Num valor={e.max} dado="eixo-max" placeholder="automático" aoMudar={(n) => setE({ max: n })} /></Campo>
          <Campo rotulo="De quanto em quanto"><Num valor={e.passo} dado="eixo-passo" placeholder="automático" aoMudar={(n) => setE({ passo: n })} /></Campo>
          <Campo rotulo="Formato">
            <select aria-label="Formato dos números do eixo" data-ge-eixo-fmt value={e.fmt || ''} onChange={(ev) => setE({ fmt: ev.target.value || undefined, fmtLigado: false })}>
              {FORMATOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </Campo>
          <label className="rg-chk"><input type="checkbox" checked={!!e.inverter} onChange={(ev) => setE({ inverter: ev.target.checked })} /> De cima para baixo</label>
        </section>
      )}
      <section className="rg-cartao">
        <span className="rg-cab">Linhas</span>
        <Campo rotulo="Grade"><Traco rotulo="Linhas de grade" valor={e.grade || { t: 'nenhum' }} corPadrao="#d9d9d9" cores={cores} dado="grade" aoMudar={(v) => setE({ grade: v.t === 'nenhum' ? null : v })} /></Campo>
        <Campo rotulo="Linha do eixo"><Traco rotulo="Linha do eixo" valor={e.linha || { t: 'nenhum' }} corPadrao="#bfbfbf" cores={cores} aoMudar={(v) => setE({ linha: v })} /></Campo>
      </section>
      <section className="rg-cartao">
        <span className="rg-cab">Números do eixo</span>
        <Fonte rotulo="Números do eixo" valor={e.rotulo || {}} cores={cores} aoMudar={(p) => setE({ rotulo: { ...(e.rotulo || {}), ...p } })} />
      </section>
    </>
  );
}

/* ---------- Textos ---------- */
function AbaTextos({ g, ehX, P, mx, muda, mudaOp, cores }) {
  const T = P.titulo || {};
  const L = P.legenda;
  const posLeg = L ? L.pos || 'b' : 'nao';
  return (
    <>
      <section className="rg-cartao">
        <span className="rg-cab">Título</span>
        <Campo rotulo="Texto"><input value={ehX ? (T.texto || '') : g.titulo} maxLength={120} data-ge-titulo onChange={(ev) => { if (ehX) mx((x) => { x.plano.titulo = ev.target.value ? { ...(x.plano.titulo || { tam: 14, negrito: true }), texto: ev.target.value } : null; x.titulo = ev.target.value; }); else muda({ titulo: ev.target.value }); }} /></Campo>
        <Campo rotulo="Letra"><Fonte rotulo="Título" valor={T} cores={cores} aoMudar={(p) => mx((x) => setCampo(x, 'titulo', p))} /></Campo>
        <Campo rotulo="Alinhar"><Seg rotulo="Alinhar título" valor={T.alinhar === 'e' ? 'e' : 'c'} opcoes={[['e', 'Esquerda'], ['c', 'Centro']]} aoMudar={(v) => mx((x) => setCampo(x, 'titulo', { alinhar: v === 'e' ? 'e' : null }))} /></Campo>
      </section>
      <section className="rg-cartao">
        <span className="rg-cab">Legenda</span>
        <Seg rotulo="Legenda" dado="legenda" valor={posLeg} opcoes={[['nao', 'Sem'], ['b', 'Embaixo'], ['t', 'Em cima'], ['r', 'Direita'], ['l', 'Esquerda']]} aoMudar={(v) => {
          if (!ehX) mudaOp({ legenda: v === 'nao' ? 'nao' : v === 'r' ? 'dir' : 'baixo' });
          mx((x) => { const a = alvo(x); a.legenda = v === 'nao' ? null : juntar(a.legenda || {}, { pos: v, auto: false }); if (!ehX) x.op = { ...x.op, legenda: v === 'nao' ? 'nao' : v === 'r' ? 'dir' : 'baixo' }; });
        }} />
        {L && <Campo rotulo="Letra"><Fonte rotulo="Legenda" valor={L} cores={cores} aoMudar={(p) => mx((x) => setCampo(x, 'legenda', p))} /></Campo>}
      </section>
      <section className="rg-cartao">
        <span className="rg-cab">Letra de todo o gráfico</span>
        <Fonte rotulo="Letra do gráfico" valor={P.fonte || {}} cores={cores} semNegrito aoMudar={(p) => mx((x) => setCampo(x, 'fonte', p))} />
      </section>
    </>
  );
}

/* ---------- Fundo ---------- */
function AbaFundo({ P, mx, cores }) {
  const F = P.fundo || {};
  const A = P.area || {};
  const barras = P.grupos.some((G) => G.tipo === 'bar');
  const pizza = P.grupos.find((G) => G.tipo === 'pie' || G.tipo === 'doughnut');
  const gb = P.grupos.find((G) => G.tipo === 'bar') || {};
  return (
    <>
      <section className="rg-cartao">
        <span className="rg-cab">Fundo do gráfico</span>
        <Preench rotulo="Fundo" valor={F.preench || { t: 'solido', cor: '#ffffff' }} cores={cores} dado="fundo" aoMudar={(v) => mx((x) => setCampo(x, 'fundo', { preench: v }))} />
        <Campo rotulo="Borda"><Traco rotulo="Borda do gráfico" valor={F.borda || { t: 'nenhum' }} corPadrao="#d9d9d9" cores={cores} aoMudar={(v) => mx((x) => setCampo(x, 'fundo', { borda: v }))} /></Campo>
        <label className="rg-chk"><input type="checkbox" checked={!!F.cantos} onChange={(ev) => mx((x) => setCampo(x, 'fundo', { cantos: ev.target.checked }))} /> Cantos arredondados</label>
      </section>
      <section className="rg-cartao">
        <span className="rg-cab">Área do desenho</span>
        <Preench rotulo="Área do desenho" valor={A.preench || { t: 'nenhum' }} cores={cores} aoMudar={(v) => mx((x) => setCampo(x, 'area', { preench: v }))} />
      </section>
      {barras && (
        <section className="rg-cartao">
          <span className="rg-cab">Barras</span>
          <Campo rotulo="Espaço entre grupos" dica="% da largura da barra"><input type="range" min="0" max="300" step="10" value={gb.espaco ?? 150} data-ge-espaco onChange={(ev) => mx((x) => setGrupo(x, { espaco: +ev.target.value }))} /></Campo>
          <Campo rotulo="Sobrepor" dica="-100 a 100"><input type="range" min="-100" max="100" step="10" value={gb.sobrepor ?? 0} onChange={(ev) => mx((x) => setGrupo(x, { sobrepor: +ev.target.value }))} /></Campo>
        </section>
      )}
      {pizza && (
        <section className="rg-cartao">
          <span className="rg-cab">{pizza.tipo === 'doughnut' ? 'Rosca' : 'Pizza'}</span>
          <Campo rotulo="Girar" dica="graus"><input type="range" min="0" max="359" step="5" value={pizza.giro || 0} data-ge-giro onChange={(ev) => mx((x) => setGrupo(x, { giro: +ev.target.value }))} /></Campo>
          {pizza.tipo === 'doughnut' && <Campo rotulo="Furo" dica="%"><input type="range" min="10" max="90" step="5" value={pizza.furo ?? 50} onChange={(ev) => mx((x) => setGrupo(x, { furo: +ev.target.value }))} /></Campo>}
        </section>
      )}
    </>
  );
}

/** Barra pequena que aparece sobre o gráfico escolhido. */
export function BarraGrafico({ x, y, aoEditar, aoExcluir, somenteLeitura }) {
  return (
    <div className="pl-obj-barra" style={{ left: x, top: y }} role="toolbar" aria-label="Gráfico">
      <button type="button" className="iconbtn" data-obj-ed="1" aria-label="Editar gráfico" title="Editar gráfico (Enter)" onClick={aoEditar}><Icone n="grafico" /></button>
      {!somenteLeitura && <button type="button" className="iconbtn" data-obj-ex="1" aria-label="Excluir gráfico" title="Excluir (Delete)" onClick={aoExcluir}><Icone n="lixeira" /></button>}
    </div>
  );
}
