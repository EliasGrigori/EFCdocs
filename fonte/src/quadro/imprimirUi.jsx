/* Vértice Docs · Quadro · janela "Imprimir e PDF" (v0.6.54), no mesmo jeito da Planilha (planilha/imprimirUi.jsx):
   opções à esquerda, prévia ao vivo das folhas à direita. As contas ficam em impressaoQuadro.js. */
import { useEffect, useMemo, useState } from 'react';
import { Janela, Icone } from '../ui/comum.jsx';
import { PAPEIS, MARGENS } from '../planilha/impressao.js';
import { ALVOS, ESCALAS, normalizarImpQ, paginasDaImpressao, canvasDaFolha } from './impressaoQuadro.js';
import { folhas } from './modelo.js';
import { derivar } from './legenda.js';

const cm = (v) => String(Math.round(v * 100) / 100).replace('.', ',');

export function JanelaImprimirQuadro({ c, nome, escolhidos, codigos, somenteLeitura, aoSalvar, aoPdf, aoImprimir, aoFechar }) {
  const [imp, setImp] = useState(() => normalizarImpQ(c.impressao));
  const [pag, setPag] = useState(0);
  const [ocupado, setOcupado] = useState('');
  const [imagem, setImagem] = useState('');
  const muda = (p) => setImp((x) => normalizarImpQ({ ...x, ...p }));
  const temPaginas = useMemo(() => folhas(derivar(c)).length > 0, [c]);
  const alvoAtual = imp.alvo === 'auto' ? (temPaginas ? 'paginas' : 'tudo') : imp.alvo;
  const r = useMemo(() => paginasDaImpressao(c, imp, escolhidos), [c, imp, escolhidos]);
  const n = r.paginas.length, pg = n ? r.paginas[Math.min(pag, n - 1)] : null;
  useEffect(() => { if (pag >= n) setPag(Math.max(0, n - 1)); }, [n, pag]);
  /* prévia: desenha a folha atual em tamanho pequeno (rápido) sempre que algo muda */
  useEffect(() => {
    let vivo = true;
    if (!pg) { setImagem(''); return undefined; }
    canvasDaFolha(c, pg, { k: 1.2, codigos }).then((cv) => { if (vivo) setImagem(cv.toDataURL('image/png')); });
    return () => { vivo = false; };
  }, [c, pg, codigos]);
  const fazer = async (qual) => {
    setOcupado(qual);
    try { if (qual === 'pdf') await aoPdf(imp); else await aoImprimir(imp); } finally { setOcupado(''); }
  };
  const pct = (v, t) => (v / t) * 100 + '%';
  const nEsc = (escolhidos || []).length;
  return (
    <Janela titulo="Imprimir e PDF" icone="imprimir" subtitulo={`${n} folha${n === 1 ? '' : 's'} · escala ${Math.round(r.esc * 100)}%`} aoFechar={aoFechar} classe="imp-jan qd-imp" rodape={(
      <>
        <button type="button" className="btn sm" data-impq-salvar disabled={somenteLeitura} onClick={() => { aoSalvar(imp); aoFechar(); }} title="Guarda estas escolhas no quadro (valem para o PDF, a impressão e o Cwork)">Salvar no quadro</button>
        <span style={{ flex: 1 }} />
        <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn sm" data-impq-pdf disabled={!!ocupado || !n} onClick={() => fazer('pdf')}><Icone n="pdf" />{ocupado === 'pdf' ? 'Gerando…' : 'Baixar PDF'}</button>
        <button type="button" className="btn sm primary" data-impq-imprimir data-foco disabled={!!ocupado || !n} onClick={() => fazer('imprimir')}><Icone n="imprimir" />{ocupado === 'imprimir' ? 'Preparando…' : 'Imprimir'}</button>
      </>
    )}>
      <div className="janela-c imp-corpo" data-imprimir-quadro>
        <div className="rg-col imp-opcoes">
          <section className="rg-cartao">
            <span className="rg-cab">O que imprimir</span>
            <div className="rg-seg imp-seg" role="group" aria-label="O que imprimir">
              {ALVOS.filter(([k]) => k !== 'paginas' || temPaginas).map(([k, nomeAlvo]) => (
                <button key={k} type="button" aria-pressed={alvoAtual === k} data-impq-alvo={k} disabled={k === 'escolhidos' && !nEsc} onClick={() => muda({ alvo: k })}>
                  {k === 'escolhidos' ? `${nomeAlvo} (${nEsc})` : nomeAlvo}
                </button>
              ))}
            </div>
            {r.aviso && <p className="rg-erro" role="alert">{r.aviso}</p>}
          </section>
          <section className="rg-cartao">
            <span className="rg-cab">Página</span>
            <div className="rg-seg imp-seg" role="group" aria-label="Orientação">
              <button type="button" aria-pressed={imp.orient === 'retrato'} data-impq-orient="retrato" onClick={() => muda({ orient: 'retrato' })}>Retrato</button>
              <button type="button" aria-pressed={imp.orient === 'paisagem'} data-impq-orient="paisagem" onClick={() => muda({ orient: 'paisagem' })}>Paisagem</button>
            </div>
            <label className="rg-campo"><span>Papel</span><select value={imp.papel} data-impq-papel onChange={(ev) => muda({ papel: ev.target.value })}>{Object.entries(PAPEIS).map(([k, p]) => <option key={k} value={k}>{p.nome}</option>)}</select></label>
            <label className="rg-campo"><span>Margens</span>
              <select value={imp.marg} data-impq-margens onChange={(ev) => muda({ marg: ev.target.value })}>
                {Object.entries(MARGENS).map(([k, m]) => <option key={k} value={k}>{m.nome} ({cm(m.t)} cm em cima, {cm(m.l)} cm dos lados)</option>)}
              </select>
            </label>
          </section>
          <section className="rg-cartao">
            <span className="rg-cab">Ajustar ao papel</span>
            <label className="rg-campo"><span>Escala</span>
              <select value={imp.escala} data-impq-escala onChange={(ev) => muda({ escala: ev.target.value })}>{ESCALAS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select>
            </label>
            {imp.escala === 'pct' && <label className="rg-campo"><span>Tamanho</span><span className="rg-linha"><input type="number" min="10" max="400" value={imp.pct} data-impq-pct style={{ width: 90 }} onChange={(ev) => muda({ pct: ev.target.value })} /> %</span></label>}
            {imp.escala === 'largura' && <label className="rg-campo"><span>Páginas</span><span className="rg-linha"><input type="number" min="1" max="20" value={imp.largura} data-impq-largura style={{ width: 70 }} onChange={(ev) => muda({ largura: ev.target.value })} /> de largura</span></label>}
            {r.esc < 0.5 && n > 0 && (
              <p className="imp-aviso-esc" role="status" data-impq-aviso-escala>
                <Icone n="aviso" />
                <span>O quadro ficou em <b>{Math.round(r.esc * 100)}%</b> do tamanho real e a letra pode ficar pequena demais. Tente o papel deitado, um papel maior ou mais páginas de largura.</span>
              </p>
            )}
          </section>
          <section className="rg-cartao">
            <span className="rg-cab">Cabeçalho e rodapé</span>
            <label className="rg-chk"><input type="checkbox" checked={imp.cabRod} data-impq-cabrod onChange={(ev) => muda({ cabRod: ev.target.checked })} /> Nome do quadro e data em cima; origem embaixo</label>
            <p className="rg-dica">O fundo do quadro (bolinhas, linhas e cor) não sai no papel, como o plano de fundo do Excel.</p>
          </section>
        </div>
        <div className="rg-col imp-previa-col">
          <section className="rg-cartao imp-previa-c">
            <div className="rg-linha rg-topo">
              <span className="rg-cab">Prévia</span>
              <span className="imp-nav">
                <button type="button" className="iconbtn" aria-label="Folha anterior" disabled={pag <= 0} onClick={() => setPag(pag - 1)}><Icone n="setaEsq" /></button>
                <span data-impq-pag>{n ? `${Math.min(pag, n - 1) + 1} de ${n}` : 'sem folhas'}</span>
                <button type="button" className="iconbtn" aria-label="Próxima folha" disabled={pag >= n - 1} onClick={() => setPag(pag + 1)}><Icone n="setaDir" /></button>
              </span>
            </div>
            <div className="imp-folha">
              {pg && (
                <div className="imp-pagina qd-imp-pagina" data-impq-previa style={{ aspectRatio: `${pg.W} / ${pg.H}`, maxWidth: `calc(58vh * ${pg.W / pg.H})` }}>
                  {imp.cabRod && (
                    <div className="qd-imp-cab" style={{ left: pct(pg.area.x, pg.W), right: pct(pg.area.x, pg.W), bottom: pct(pg.H - pg.area.y + 6, pg.H) }}>
                      <b>{nome}</b><span>{(pg.titulo ? pg.titulo + ' · ' : 'Quadro · ') + (pg.parte ? `parte ${pg.parte.co * pg.parte.lins + pg.parte.li + 1} de ${pg.parte.cols * pg.parte.lins}` : 'hoje')}</span>
                    </div>
                  )}
                  {imagem && <img alt="" src={imagem} style={{ position: 'absolute', left: pct(pg.area.x, pg.W), top: pct(pg.area.y, pg.H), width: pct(pg.area.w, pg.W), height: pct(pg.area.h, pg.H) }} />}
                  <div className="qd-imp-area" style={{ left: pct(pg.area.x, pg.W), top: pct(pg.area.y, pg.H), width: pct(pg.area.w, pg.W), height: pct(pg.area.h, pg.H) }} />
                  {imp.cabRod && <div className="qd-imp-rod" style={{ left: pct(pg.area.x, pg.W), top: pct(pg.area.y + pg.area.h + 6, pg.H) }}>Vértice Docs · Post-its{n > 1 ? ` · folha ${Math.min(pag, n - 1) + 1} de ${n}` : ''}</div>}
                </div>
              )}
            </div>
            <p className="rg-dica">A linha tracejada fina mostra a área útil (dentro das margens).</p>
          </section>
        </div>
      </div>
    </Janela>
  );
}
