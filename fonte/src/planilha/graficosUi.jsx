/* EFCdocs v0.6.0 — tela dos gráficos: a janela Inserir/Editar gráfico (estilo Camadas) e a peça que fica sobre a grade. */
import { useMemo, useState } from 'react';
import { Janela, Icone } from '../ui/comum.jsx';
import { TIPOS_GRAFICO, NOME_TIPO, PALETA_GRAFICO, normalizarG, recomendar, cartaControle, numeroCurto } from './graficos.js';
import { svgDoGrafico, TEMA_CLARO } from './desenhoGrafico.js';

/** O desenho (SVG) do gráfico, no tamanho pedido. */
export function GraficoView({ g, dados, w, h, tema = TEMA_CLARO }) {
  const svg = useMemo(() => svgDoGrafico(g, dados, { w, h, tema }), [g, dados, w, h, tema]);
  return <div className="gr-view" style={{ width: w, height: h }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

const lerNum = (t) => { const s = String(t ?? '').trim().replace(/\./g, '').replace(',', '.'); if (!s) return undefined; const n = Number(s); return Number.isFinite(n) ? n : NaN; };
const mostraNum = (v) => (typeof v === 'number' ? String(v).replace('.', ',') : '');

/**
 * inicial: g já salvo (editar) ou null (novo) · faixaPadrao: texto da seleção · lerDados(fx, porLinhas) → { d, erro }
 */
export function JanelaGrafico({ inicial, faixaPadrao, lerDados, aoAplicar, aoFechar, tema }) {
  const [g, setG] = useState(() => normalizarG(inicial || { t: '', dados: { fx: faixaPadrao } }));
  const [fx, setFx] = useState(g.dados.fx || faixaPadrao || '');
  const [txt, setTxt] = useState({ meta: mostraNum(g.op.meta), lsc: mostraNum(g.op.lsc), lic: mostraNum(g.op.lic) });
  const [erro, setErro] = useState('');
  const lido = useMemo(() => lerDados(fx, !!g.porLinhas), [fx, g.porLinhas]); // eslint-disable-line react-hooks/exhaustive-deps
  const d = lido.d || { cats: [], series: [] };
  const rec = useMemo(() => recomendar(d), [d]);
  /* novo gráfico sem tipo escolhido: vale o recomendado */
  const tipo = g.t && (inicial || g.escolhido) ? g.t : rec[0];
  const gv = { ...g, t: tipo };
  const muda = (p) => setG((x) => ({ ...x, ...p }));
  const mudaOp = (p) => setG((x) => ({ ...x, op: { ...x.op, ...p } }));
  const numOp = (k, t) => { setTxt((x) => ({ ...x, [k]: t })); const n = lerNum(t); mudaOp({ [k]: Number.isNaN(n) ? undefined : n }); };
  const carta = tipo === 'controle' && d.series[0] ? cartaControle(d.series[0].vals, gv.op) : null;
  const aplicar = () => {
    if (lido.erro) { setErro(lido.erro); return; }
    if (!d.series.length) { setErro('A faixa não tem números. Escolha as células com os valores (pode incluir os títulos e a coluna dos nomes).'); return; }
    for (const k of ['meta', 'lsc', 'lic']) if (Number.isNaN(lerNum(txt[k]))) { setErro(`"${txt[k]}" não é um número.`); return; }
    const fim = normalizarG({ ...gv, dados: { aba: lido.aba || '', fx: lido.fx || fx } });
    aoAplicar(fim);
    aoFechar();
  };
  const cores = gv.op.cores && gv.op.cores.length ? gv.op.cores : [];
  const coresSerie = (d.series.length ? d.series : [{ nome: 'Série 1' }]).slice(0, 8).map((s, i) => ({ nome: s.nome, cor: cores[i] || PALETA_GRAFICO[i % PALETA_GRAFICO.length] }));
  const empilhavel = ['colunas', 'barras', 'area'].includes(tipo);
  const temEixos = !['pizza', 'rosca'].includes(tipo);
  return (
    <Janela titulo={inicial ? 'Editar gráfico' : 'Inserir gráfico'} icone="grafico" subtitulo={'Dados: ' + (fx || '—')} aoFechar={aoFechar} classe="gr-jan" rodape={(
      <>
        <span className="gr-dica">{carta ? `Média ${numeroCurto(carta.media)} · σ ${numeroCurto(carta.sigma)} · ${carta.nFora} fora dos limites` : `${d.series.length} série${d.series.length === 1 ? '' : 's'} · ${d.cats.length} ponto${d.cats.length === 1 ? '' : 's'}`}</span>
        <span style={{ flex: 1 }} />
        <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn sm primary" data-gr-aplicar data-foco onClick={aplicar}>{inicial ? 'Salvar' : 'Inserir'}</button>
      </>
    )}>
      <div className="janela-c gr-corpo" data-grafico-janela>
        <div className="rg-col">
          <section className="rg-cartao">
            <span className="rg-cab">Dados</span>
            <label className="rg-campo"><span>Células</span><input value={fx} data-gr-fx spellCheck={false} onChange={(ev) => { setFx(ev.target.value); setErro(''); }} placeholder="A1:C20" /></label>
            <label className="rg-chk"><input type="checkbox" checked={!!g.porLinhas} onChange={(ev) => muda({ porLinhas: ev.target.checked || undefined })} /> Cada linha é uma série (em vez de cada coluna)</label>
            {lido.erro && <p className="rg-erro" role="alert">{lido.erro}</p>}
          </section>
          <section className="rg-cartao">
            <span className="rg-cab">Recomendados para estes dados</span>
            <div className="gr-recs">
              {rec.map((t, i) => (
                <button key={t} type="button" className={'gr-mini' + (tipo === t ? ' on' : '')} data-gr-rec={t} aria-pressed={tipo === t} onClick={() => muda({ t, escolhido: true })}>
                  <span className="gr-mini-svg" dangerouslySetInnerHTML={{ __html: svgDoGrafico({ ...gv, t, titulo: '' }, d, { w: 132, h: 78, tema, mini: true }) }} />
                  <span className="gr-mini-n">{NOME_TIPO[t]}{i === 0 && <em>Recomendado</em>}</span>
                </button>
              ))}
            </div>
            <span className="rg-cab">Todos os tipos</span>
            <div className="gr-tipos" role="group" aria-label="Tipo de gráfico">
              {TIPOS_GRAFICO.map(([t, nome]) => (
                <button key={t} type="button" className={'gr-tipo' + (tipo === t ? ' on' : '')} data-gr-tipo={t} aria-pressed={tipo === t} title={nome} onClick={() => muda({ t, escolhido: true })}>
                  <span className="gr-tipo-svg" dangerouslySetInnerHTML={{ __html: svgDoGrafico({ ...gv, t, titulo: '' }, d, { w: 64, h: 40, tema, mini: true }) }} />
                  <span>{nome}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="rg-cartao">
            <span className="rg-cab">Textos</span>
            <label className="rg-campo"><span>Título</span><input value={g.titulo} data-gr-titulo maxLength={120} onChange={(ev) => muda({ titulo: ev.target.value })} placeholder="Ex.: Cloro residual por ponto" /></label>
            {temEixos && <label className="rg-campo"><span>Eixo de baixo</span><input value={g.op.eixoX} maxLength={60} onChange={(ev) => mudaOp({ eixoX: ev.target.value })} /></label>}
            {temEixos && <label className="rg-campo"><span>Eixo do lado</span><input value={g.op.eixoY} maxLength={60} onChange={(ev) => mudaOp({ eixoY: ev.target.value })} placeholder="Ex.: mg/L" /></label>}
          </section>
          <section className="rg-cartao">
            <span className="rg-cab">Opções</span>
            <label className="rg-campo"><span>Legenda</span>
              <select value={g.op.legenda} onChange={(ev) => mudaOp({ legenda: ev.target.value })}><option value="baixo">Embaixo</option><option value="dir">À direita</option><option value="nao">Sem legenda</option></select>
            </label>
            <div className="rg-linha">
              <label className="rg-chk"><input type="checkbox" checked={g.op.rotulos} data-gr-rotulos onChange={(ev) => mudaOp({ rotulos: ev.target.checked })} /> Mostrar os valores</label>
              {empilhavel && <label className="rg-chk"><input type="checkbox" checked={g.op.empilhado} onChange={(ev) => mudaOp({ empilhado: ev.target.checked })} /> Empilhado</label>}
            </div>
            {temEixos && tipo !== 'pareto' && <label className="rg-campo"><span>Meta (linha)</span><input value={txt.meta} data-gr-meta inputMode="decimal" onChange={(ev) => numOp('meta', ev.target.value)} placeholder="Ex.: 2" /></label>}
            {tipo === 'controle' && (
              <>
                <label className="rg-campo"><span>LSC</span><input value={txt.lsc} data-gr-lsc inputMode="decimal" onChange={(ev) => numOp('lsc', ev.target.value)} placeholder={carta ? 'calculado: ' + numeroCurto(cartaControle(d.series[0].vals, {}).lsc) : ''} /></label>
                <label className="rg-campo"><span>LIC</span><input value={txt.lic} data-gr-lic inputMode="decimal" onChange={(ev) => numOp('lic', ev.target.value)} placeholder={carta ? 'calculado: ' + numeroCurto(cartaControle(d.series[0].vals, {}).lic) : ''} /></label>
                <p className="rg-dica">Vazios: média ± 3 desvios (pela amplitude móvel, carta de valores individuais). Pontos fora ficam vermelhos.</p>
              </>
            )}
          </section>
          {!['pizza', 'rosca', 'pareto', 'controle', 'histograma'].includes(tipo) && (
            <section className="rg-cartao">
              <span className="rg-cab">Cores das séries</span>
              <div className="gr-cores">
                {coresSerie.map((s, i) => (
                  <label key={i} className="gr-cor" title={'Cor de ' + s.nome}>
                    <span className="gr-cor-am" style={{ background: s.cor }} /><span className="gr-cor-n">{s.nome}</span>
                    <input type="color" value={s.cor} aria-label={'Cor de ' + s.nome} onChange={(ev) => { const l = coresSerie.map((x) => x.cor); l[i] = ev.target.value; mudaOp({ cores: l }); }} />
                  </label>
                ))}
                {cores.length > 0 && <button type="button" className="btn sm" onClick={() => mudaOp({ cores: [] })}>Cores padrão</button>}
              </div>
            </section>
          )}
        </div>
        <div className="rg-col">
          <section className="rg-cartao gr-previa-c">
            <span className="rg-cab">Prévia</span>
            <div className="gr-previa" data-gr-previa dangerouslySetInnerHTML={{ __html: svgDoGrafico(gv, d, { w: 380, h: 270, tema }) }} />
            {erro && <p className="rg-erro" role="alert">{erro}</p>}
          </section>
        </div>
      </div>
    </Janela>
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
