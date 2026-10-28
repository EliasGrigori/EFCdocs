/* EFCdocs v0.6.0 — janela "Imprimir e PDF" da planilha (estilo Camadas): configurar página com prévia ao vivo. */
import { useEffect, useMemo, useState } from 'react';
import { Janela, Icone } from '../ui/comum.jsx';
import { PAPEIS, MARGENS, normalizarImp, lerIntervalo } from './impressao.js';
import { svgDaPagina } from './paginaDesenho.js';

const CAMPOS = [['&[Página]', 'Página'], ['&[Páginas]', 'Total de páginas'], ['&[Data]', 'Data'], ['&[Hora]', 'Hora'], ['&[Aba]', 'Aba'], ['&[Arquivo]', 'Arquivo']];
const cmTx = (v) => String(Math.round(v * 100) / 100).replace('.', ',');
const lerCm = (t) => { const n = Number(String(t).replace(',', '.')); return Number.isFinite(n) && n >= 0 && n <= 10 ? n : null; };
const presetMargem = (m) => Object.keys(MARGENS).find((k) => ['t', 'b', 'l', 'r', 'cab', 'rod'].every((q) => Math.abs(MARGENS[k][q] - m[q]) < 0.01)) || 'pers';

/**
 * imp0: configuração salva na aba · selecaoTexto: "A1:F20" · gerar(imp, alvo) → { paginas, esc, aviso } (pronto para desenhar)
 * aoSalvar(imp) · aoPdf(imp, alvo) · aoImprimir(imp, alvo)
 */
export function JanelaImprimir({ imp0, selecaoTexto, temVariasAbas, secao, gerar, aoSalvar, aoPdf, aoImprimir, aoFechar }) {
  const [imp, setImp] = useState(() => normalizarImp(imp0));
  const [alvo, setAlvo] = useState('aba');
  const [pag, setPag] = useState(0);
  const [ocupado, setOcupado] = useState('');
  const [margPers, setMargPers] = useState(() => presetMargem(normalizarImp(imp0).marg) === 'pers');
  const [txtM, setTxtM] = useState(() => Object.fromEntries(Object.entries(normalizarImp(imp0).marg).map(([k, v]) => [k, cmTx(v)])));
  const muda = (p) => setImp((x) => normalizarImp({ ...x, ...p }));
  const r = useMemo(() => gerar(imp, alvo), [imp, alvo]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = r.paginas.length;
  useEffect(() => { if (pag >= n) setPag(Math.max(0, n - 1)); }, [n, pag]);
  useEffect(() => { if (secao) { const el = document.querySelector(`[data-imp-sec="${secao}"]`); if (el) el.scrollIntoView({ block: 'nearest' }); } }, [secao]);
  const svg = n ? svgDaPagina(r.paginas[Math.min(pag, n - 1)], { id: 'pv' }) : '';
  const errTit = (imp.titLin && !lerIntervalo(imp.titLin, 'l')) || (imp.titCol && !lerIntervalo(imp.titCol, 'c'));
  const fazer = async (qual) => {
    setOcupado(qual);
    try { if (qual === 'pdf') await aoPdf(imp, alvo); else await aoImprimir(imp, alvo); } finally { setOcupado(''); }
  };
  const [focoCR, setFocoCR] = useState({ onde: 'rod', lado: 'c' });
  const inserirCampo = (onde, lado, campo) => muda({ [onde]: { ...imp[onde], [lado]: (imp[onde][lado] ? imp[onde][lado] + ' ' : '') + campo } });
  const linhaCR = (onde, rotulo) => (
    <div className="imp-cr">
      <span className="imp-cr-rot">{rotulo}</span>
      {[['e', 'Esquerda'], ['c', 'Centro'], ['d', 'Direita']].map(([lado, nome]) => (
        <input key={lado} value={imp[onde][lado]} placeholder={nome} aria-label={`${rotulo}: ${nome}`} data-imp-cr={onde + lado} maxLength={120} onChange={(ev) => muda({ [onde]: { ...imp[onde], [lado]: ev.target.value } })}
          onFocus={() => setFocoCR({ onde, lado })} />
      ))}
    </div>
  );
  return (
    <Janela titulo="Imprimir e PDF" icone="imprimir" subtitulo={`${n} página${n === 1 ? '' : 's'} · escala ${Math.round(r.esc * 100)}%`} aoFechar={aoFechar} classe="imp-jan" rodape={(
      <>
        <button type="button" className="btn sm" data-imp-salvar onClick={() => { aoSalvar(imp); aoFechar(); }} title="Guarda estas escolhas na aba (vão também no Excel)">Salvar na aba</button>
        <span style={{ flex: 1 }} />
        <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn sm" data-imp-pdf disabled={!!ocupado || !n} onClick={() => fazer('pdf')}><Icone n="pdf" />{ocupado === 'pdf' ? 'Gerando…' : 'Baixar PDF'}</button>
        <button type="button" className="btn sm primary" data-imp-imprimir data-foco disabled={!!ocupado || !n} onClick={() => fazer('imprimir')}><Icone n="imprimir" />{ocupado === 'imprimir' ? 'Preparando…' : 'Imprimir'}</button>
      </>
    )}>
      <div className="janela-c imp-corpo" data-imprimir-janela>
        <div className="rg-col imp-opcoes">
          <section className="rg-cartao" data-imp-sec="o-que">
            <span className="rg-cab">O que imprimir</span>
            <div className="rg-seg imp-seg" role="group" aria-label="O que imprimir">
              <button type="button" aria-pressed={alvo === 'aba'} data-imp-alvo="aba" onClick={() => setAlvo('aba')}>Esta aba</button>
              <button type="button" aria-pressed={alvo === 'sel'} data-imp-alvo="sel" onClick={() => setAlvo('sel')}>Seleção ({selecaoTexto})</button>
              {temVariasAbas && <button type="button" aria-pressed={alvo === 'todas'} data-imp-alvo="todas" onClick={() => setAlvo('todas')}>Todas as abas</button>}
            </div>
            {alvo === 'aba' && (
              <label className="rg-campo"><span>Área de impressão</span>
                <span className="rg-linha">
                  <input value={imp.area} data-imp-area placeholder="tudo que tem dado" spellCheck={false} onChange={(ev) => muda({ area: ev.target.value })} style={{ flex: 1 }} />
                  <button type="button" className="btn sm" onClick={() => muda({ area: selecaoTexto })}>Usar a seleção</button>
                </span>
              </label>
            )}
            {r.aviso && <p className="rg-erro" role="alert">{r.aviso}</p>}
          </section>
          <section className="rg-cartao" data-imp-sec="pagina">
            <span className="rg-cab">Página</span>
            <div className="rg-seg imp-seg" role="group" aria-label="Orientação">
              <button type="button" aria-pressed={imp.orient === 'retrato'} data-imp-orient="retrato" onClick={() => muda({ orient: 'retrato' })}>Retrato</button>
              <button type="button" aria-pressed={imp.orient === 'paisagem'} data-imp-orient="paisagem" onClick={() => muda({ orient: 'paisagem' })}>Paisagem</button>
            </div>
            <label className="rg-campo"><span>Papel</span><select value={imp.papel} onChange={(ev) => muda({ papel: ev.target.value })}>{Object.entries(PAPEIS).map(([k, p]) => <option key={k} value={k}>{p.nome}</option>)}</select></label>
            <label className="rg-campo" data-imp-sec="margens"><span>Margens</span>
              <select value={margPers ? 'pers' : presetMargem(imp.marg)} data-imp-margens onChange={(ev) => { const v = ev.target.value; if (v === 'pers') { setMargPers(true); return; } setMargPers(false); const m = { ...MARGENS[v] }; delete m.nome; muda({ marg: m }); setTxtM(Object.fromEntries(Object.entries(m).map(([k, x]) => [k, cmTx(x)]))); }}>
                {Object.entries(MARGENS).map(([k, m]) => <option key={k} value={k}>{m.nome} ({cmTx(m.t)} cm em cima, {cmTx(m.l)} cm dos lados)</option>)}
                <option value="pers">Personalizadas…</option>
              </select>
            </label>
            {margPers && (
              <div className="imp-marg">
                {[['t', 'Em cima'], ['b', 'Embaixo'], ['l', 'Esquerda'], ['r', 'Direita'], ['cab', 'Cabeçalho'], ['rod', 'Rodapé']].map(([k, nome]) => (
                  <label key={k}><span>{nome}</span><input value={txtM[k] ?? ''} inputMode="decimal" onChange={(ev) => { setTxtM((x) => ({ ...x, [k]: ev.target.value })); const v = lerCm(ev.target.value); if (v != null) muda({ marg: { ...imp.marg, [k]: v } }); }} /><em>cm</em></label>
                ))}
              </div>
            )}
          </section>
          <section className="rg-cartao" data-imp-sec="ajustar">
            <span className="rg-cab">Ajustar ao papel</span>
            <label className="rg-campo"><span>Escala</span>
              <select value={imp.escala.modo} data-imp-escala onChange={(ev) => muda({ escala: { ...imp.escala, modo: ev.target.value } })}>
                <option value="nenhum">Tamanho real (100%)</option>
                <option value="pagina">Aba toda numa página</option>
                <option value="colunas">Todas as colunas numa página</option>
                <option value="linhas">Todas as linhas numa página</option>
                <option value="paginas">Caber em N páginas…</option>
                <option value="pct">Porcentagem…</option>
              </select>
            </label>
            {imp.escala.modo === 'pct' && <label className="rg-campo"><span>Tamanho</span><span className="rg-linha"><input type="number" min="10" max="400" value={imp.escala.pct} data-imp-pct style={{ width: 90 }} onChange={(ev) => muda({ escala: { ...imp.escala, pct: +ev.target.value } })} /> % do normal</span></label>}
            {imp.escala.modo === 'paginas' && (
              <label className="rg-campo"><span>Caber em</span>
                <span className="rg-linha"><input type="number" min="0" max="50" value={imp.escala.largura} style={{ width: 64 }} onChange={(ev) => muda({ escala: { ...imp.escala, largura: +ev.target.value } })} /> de largura ×
                  <input type="number" min="0" max="50" value={imp.escala.altura} style={{ width: 64 }} onChange={(ev) => muda({ escala: { ...imp.escala, altura: +ev.target.value } })} /> de altura <small>(0 = livre)</small></span>
              </label>
            )}
          </section>
          <section className="rg-cartao" data-imp-sec="titulos">
            <span className="rg-cab">Títulos de impressão (repetem em toda página)</span>
            <label className="rg-campo"><span>Linhas no topo</span><input value={imp.titLin} data-imp-titlin placeholder="ex.: 1:1" spellCheck={false} onChange={(ev) => muda({ titLin: ev.target.value })} /></label>
            <label className="rg-campo"><span>Colunas à esquerda</span><input value={imp.titCol} data-imp-titcol placeholder="ex.: A:A" spellCheck={false} onChange={(ev) => muda({ titCol: ev.target.value })} /></label>
            {errTit && <p className="rg-erro">Use linhas como 1:2 e colunas como A:B.</p>}
          </section>
          <section className="rg-cartao" data-imp-sec="cabecalho">
            <span className="rg-cab">Cabeçalho e rodapé</span>
            {linhaCR('cab', 'Cabeçalho')}
            {linhaCR('rod', 'Rodapé')}
            <div className="imp-campos" role="group" aria-label="Inserir campo">
              {CAMPOS.map(([c, nome]) => <button key={c} type="button" className="btn sm" onMouseDown={(ev) => ev.preventDefault()} onClick={() => inserirCampo(focoCR.onde, focoCR.lado, c)}>+ {nome}</button>)}
            </div>
          </section>
          <section className="rg-cartao" data-imp-sec="opcoes">
            <span className="rg-cab">Opções</span>
            <div className="imp-chks">
              <label className="rg-chk"><input type="checkbox" checked={imp.grade} data-imp-grade onChange={(ev) => muda({ grade: ev.target.checked })} /> Linhas de grade</label>
              <label className="rg-chk"><input type="checkbox" checked={imp.titulos} onChange={(ev) => muda({ titulos: ev.target.checked })} /> Letras e números (A B C / 1 2 3)</label>
              <label className="rg-chk"><input type="checkbox" checked={imp.centH} onChange={(ev) => muda({ centH: ev.target.checked })} /> Centralizar na largura</label>
              <label className="rg-chk"><input type="checkbox" checked={imp.centV} onChange={(ev) => muda({ centV: ev.target.checked })} /> Centralizar na altura</label>
            </div>
            <label className="rg-campo"><span>Ordem das páginas</span>
              <select value={imp.ordem} onChange={(ev) => muda({ ordem: ev.target.value })}><option value="baixo">Para baixo, depois para o lado</option><option value="lado">Para o lado, depois para baixo</option></select>
            </label>
            {(imp.qL.length + imp.qC.length) > 0 && (
              <div className="rg-linha"><span className="rg-dica">{imp.qL.length + imp.qC.length} quebra(s) de página manual(is)</span><button type="button" className="btn sm" data-imp-sem-quebras onClick={() => muda({ qL: [], qC: [] })}>Remover as quebras</button></div>
            )}
          </section>
        </div>
        <div className="rg-col imp-previa-col">
          <section className="rg-cartao imp-previa-c">
            <div className="rg-linha rg-topo">
              <span className="rg-cab">Prévia</span>
              <span className="imp-nav">
                <button type="button" className="iconbtn" aria-label="Página anterior" disabled={pag <= 0} onClick={() => setPag(pag - 1)}><Icone n="setaEsq" /></button>
                <span data-imp-pag>{n ? `${Math.min(pag, n - 1) + 1} de ${n}` : 'sem páginas'}</span>
                <button type="button" className="iconbtn" aria-label="Próxima página" disabled={pag >= n - 1} onClick={() => setPag(pag + 1)}><Icone n="setaDir" /></button>
              </span>
            </div>
            <div className="imp-folha" data-imp-previa dangerouslySetInnerHTML={{ __html: svg }} />
          </section>
        </div>
      </div>
    </Janela>
  );
}
