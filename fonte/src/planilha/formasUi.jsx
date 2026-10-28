/* EFCdocs v0.6.5 — formas na tela: o desenho (FormaView) e a janela "Forma" (inserir e mudar). Estilo Camadas. */
import { useMemo, useState } from 'react';
import { Janela, Icone } from '../ui/comum.jsx';
import { Seg, Campo, Preench, Traco, Fonte } from './graficosUi.jsx';
import { svgDaForma, DESENHOS, NOME_DESENHO, ehLinha, textoDaParte, comTexto, caminhoDoDesenho, novaForma, limparParte } from './formas.js';

/** O desenho da forma no tamanho pedido. lerLigado: texto das células ligadas (muda quando a célula muda). */
export function FormaView({ o, w, h, lerLigado, valores }) {
  const svg = useMemo(() => svgDaForma(o, w, h, { lerLigado, uid: o.id }), [o, w, h, valores]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="fm-view" style={{ width: w, height: h }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** Os valores das células ligadas, em texto (para o desenho só refazer quando mudam). */
export function valoresLigados(o, lerLigado) {
  if (!o.partes.some((p) => p.texto && p.texto.ligado)) return '';
  return o.partes.map((p) => (p.texto && p.texto.ligado ? lerLigado(p.texto.ligado) : '')).join('\u0001');
}

const ICONE_DESENHO = (g) => {
  const geo = caminhoDoDesenho(g === 'textBox' ? 'rect' : g, 28, ehLinha(g) ? 20 : 20);
  const linha = ehLinha(g);
  return `<svg viewBox="-2 -2 32 24" width="32" height="24" aria-hidden="true"><path d="${geo.ponta ? geo.ponta + ' ' : ''}${geo.d}" fill="${linha || g === 'textBox' ? 'none' : 'currentColor'}" fill-opacity="${linha ? 0 : 0.85}" stroke="currentColor" stroke-width="${linha ? 2 : 1}"${g === 'textBox' ? ' stroke-dasharray="3 2"' : ''}/>${g === 'arrowLine' ? '<path d="M28,20 L21,19 L26,14 Z" fill="currentColor"/>' : ''}${g === 'textBox' ? '<text x="14" y="15" text-anchor="middle" font-size="11" fill="currentColor" font-weight="700">T</text>' : ''}</svg>`;
};

const PONTAS = [['', 'Sem'], ['triangle', 'Seta'], ['stealth', 'Fina'], ['arrow', 'Aberta'], ['oval', 'Bolinha'], ['diamond', 'Losango']];

/**
 * Janela da forma. atual = objeto 'forma' (mudar) ou null (inserir; ancora é onde ela vai).
 * aoSalvar(objeto) devolve texto de erro ou nada.
 */
export function JanelaForma({ c, atual, ancora, abaAtualId, novoId, lerLigado, aoSalvar, aoExcluir, aoFechar, cores }) {
  const [o, setO] = useState(() => atual || novaForma('roundRect', ancora || { l: 0, c: 0 }, novoId ? novoId() : 'novo', { texto: '' }));
  const [k, setK] = useState(() => { const ps = (atual && atual.partes) || []; const i = ps.findIndex((p) => p.texto || p.link); return i >= 0 ? i : 0; });
  const [erro, setErro] = useState('');
  const p = o.partes[k] || o.partes[0];
  const grupo = o.partes.length > 1;
  const linha = ehLinha(p.g);
  const ehImg = p.g === 'img';
  const mudarParte = (patch) => { setErro(''); setO((x) => ({ ...x, partes: x.partes.map((q, i) => (i === k ? { ...q, ...patch } : q)) })); };
  const t = p.texto || null;
  const r0 = (t && t.pars[0] && t.pars[0].runs && t.pars[0].runs[0]) || {};
  const [texto, setTexto] = useState(textoDaParte(p));
  const [kTexto, setKTexto] = useState(k);
  if (kTexto !== k) { setKTexto(k); setTexto(textoDaParte(o.partes[k] || o.partes[0])); }
  const mudarTexto = (v) => {
    setTexto(v);
    const base = p.texto ? p : { ...p, texto: { pars: [], anc: 'ctr', ins: [9.6, 4.8, 9.6, 4.8], wrap: true, cor: p.txBox ? '#1f2d36' : '#ffffff' } };
    mudarParte({ texto: comTexto(base, v).texto });
  };
  const mudarRuns = (patch) => {
    const tt = p.texto || { pars: [{ al: 'ctr', runs: [] }], anc: 'ctr', ins: [9.6, 4.8, 9.6, 4.8], wrap: true };
    const fix = (r) => { const x = { ...r }; for (const [kk, v] of Object.entries(patch)) { if (v == null || v === false) delete x[kk]; else x[kk] = v; } return x; };
    mudarParte({ texto: { ...tt, pars: tt.pars.map((q) => ({ ...q, runs: q.runs.map(fix) })), ...(patch.cor !== undefined ? { cor: patch.cor || tt.cor } : {}), ...(patch.tam !== undefined && patch.tam ? { tam: patch.tam } : {}) } });
  };
  const trocarDesenho = (g) => {
    if (atual && !grupo) { mudarParte({ g, adj: undefined, cust: undefined, ...(g === 'textBox' ? { txBox: true, preench: { t: 'nenhum' }, linha: { t: 'nenhum' } } : {}) }); return; }
    if (!atual) { const n = novaForma(g, ancora || { l: 0, c: 0 }, o.id, { texto }); setO(n); setK(0); return; }
    mudarParte({ g, adj: undefined, cust: undefined });
  };
  /* link do clique */
  const lk = p.link || null;
  const tipoLink = !lk ? 'nenhum' : lk.url ? 'site' : 'aba';
  const abas = c.ordem;
  const ligado = t && t.ligado ? t.ligado : null;
  const salvar = () => {
    if (lk && lk.url !== undefined && !/^(https?:\/\/|mailto:)\S+/i.test(lk.url)) { setErro('O endereço do site precisa começar com https:// (ou mailto: para e-mail).'); return; }
    if (lk && lk.aba !== undefined && !c.abas[lk.aba]) { setErro('Escolha a aba para onde a forma leva.'); return; }
    if (lk && lk.ref && !/^[A-Za-z]{1,3}\d{1,7}$/.test(lk.ref)) { setErro('A célula precisa ser um endereço, como B3.'); return; }
    const partes = o.partes.map(limparParte).filter(Boolean);
    if (!partes.length) { setErro('A forma ficou vazia.'); return; }
    const e = aoSalvar({ ...o, partes });
    if (e) setErro(e);
  };
  /* prévia que cabe na caixa */
  const pw = 300, ph = 170;
  const W = Math.max(1, o.w), H = Math.max(1, o.h);
  const k0 = Math.min(1.6, pw / W, ph / H);
  const nomeParte = (q, i) => q.nome || textoDaParte(q).slice(0, 30) || (q.g === 'img' ? 'Figura' : NOME_DESENHO[q.g] || 'Parte') + ' ' + (i + 1);
  return (
    <Janela titulo={atual ? 'Forma' : 'Inserir forma'} icone="forma" subtitulo={atual ? (grupo ? `Grupo com ${o.partes.length} partes` : NOME_DESENHO[p.g] || 'Forma do Excel') : 'Escolha o desenho e o texto'} aoFechar={aoFechar} classe="ge-jan fm-jan" rodape={(
      <>
        {atual && <button type="button" className="btn sm perigo iconbtn" data-fm-excluir aria-label="Excluir a forma" title="Excluir a forma" onClick={aoExcluir}><Icone n="lixeira" /></button>}
        <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn sm primary" data-fm-ok onClick={salvar}>{atual ? 'OK' : 'Inserir'}</button>
      </>
    )}>
      <div className="janela-c ge-corpo fm-corpo" data-forma-janela>
        <div className="ge-esq">
          <section className="rg-cartao">
            <span className="rg-cab">Prévia</span>
            <div className="fm-previa" style={{ height: ph + 16 }}>
              <div className="fm-previa-in" style={{ width: W * k0, height: H * k0 }}>
                <FormaView o={{ ...o, id: 'previa' }} w={W * k0} h={H * k0} lerLigado={lerLigado} valores={JSON.stringify(o.partes.map((q) => q.texto && q.texto.ligado))} />
                {grupo && <span className="fm-marca" aria-hidden="true" style={{ left: p.x * (W / (o.w0 || W)) * k0 - 3, top: p.y * (H / (o.h0 || H)) * k0 - 3, width: Math.max(4, p.w * (W / (o.w0 || W)) * k0) + 6, height: Math.max(4, p.h * (H / (o.h0 || H)) * k0) + 6 }} />}
              </div>
            </div>
          </section>
          {!ehImg && (
            <section className="rg-cartao">
              <span className="rg-cab">Desenho</span>
              <div className="fm-galeria" role="group" aria-label="Desenho">
                {DESENHOS.map(([g, nome]) => (
                  <button key={g} type="button" className={'fm-des' + (p.g === g ? ' on' : '')} aria-pressed={p.g === g} title={nome} aria-label={nome} data-fm-des={g} onClick={() => trocarDesenho(g)}
                    dangerouslySetInnerHTML={{ __html: ICONE_DESENHO(g) }} />
                ))}
              </div>
            </section>
          )}
        </div>
        <div className="ge-dir">
          {grupo && (
            <section className="rg-cartao">
              <span className="rg-cab">Parte do grupo</span>
              <Campo rotulo="Mexer em"><select value={k} data-fm-parte onChange={(ev) => setK(+ev.target.value)}>{o.partes.map((q, i) => <option key={i} value={i}>{nomeParte(q, i)}</option>)}</select></Campo>
            </section>
          )}
          {!linha && !ehImg && (
            <section className="rg-cartao">
              <span className="rg-cab">Texto</span>
              {ligado
                ? <p className="dd-dica" data-fm-ligado>Mostra o valor de <b>{(ligado.aba && c.abas[ligado.aba] && ligado.aba !== abaAtualId ? c.abas[ligado.aba].nome + '!' : '') + ligado.ref}</b> e muda sozinho. <button type="button" className="btn sm" data-fm-soltar onClick={() => mudarParte({ texto: { ...t, ligado: undefined } })}>Soltar da célula</button></p>
                : <textarea className="fm-texto" rows={3} value={texto} data-fm-texto data-foco maxLength={5000} placeholder="Texto dentro da forma" onChange={(ev) => mudarTexto(ev.target.value)} />}
              {!ligado && <Campo rotulo="Ligar à célula" dica="Opcional: a forma mostra o valor dessa célula (como no Excel)."><input data-fm-ligar maxLength={12} spellCheck={false} placeholder="B2" onBlur={(ev) => { const v = ev.target.value.trim().toUpperCase(); if (/^[A-Z]{1,3}\d{1,7}$/.test(v)) { const base = p.texto || { pars: [], anc: 'ctr', ins: [9.6, 4.8, 9.6, 4.8], wrap: true, cor: p.txBox ? '#1f2d36' : '#ffffff' }; mudarParte({ texto: { ...base, ligado: { ref: v } } }); ev.target.value = ''; } }} /></Campo>}
              <Campo rotulo="Letra"><Fonte valor={{ tam: r0.tam || (t && t.tam), cor: r0.cor || (t && t.cor), negrito: !!r0.neg }} rotulo="Letra" cores={cores} aoMudar={(x) => { if ('negrito' in x) mudarRuns({ neg: x.negrito }); else mudarRuns(x); }} /></Campo>
              <Campo rotulo="Alinhar"><div className="ge-linha">
                <Seg rotulo="Alinhar na horizontal" dado="fm-al" valor={(t && t.pars[0] && t.pars[0].al) || 'ctr'} opcoes={[['l', 'Esquerda'], ['ctr', 'Centro'], ['r', 'Direita']]} aoMudar={(v) => t && mudarParte({ texto: { ...t, pars: t.pars.map((q) => ({ ...q, al: v })) } })} />
                <Seg rotulo="Alinhar na vertical" dado="fm-anc" valor={(t && t.anc) || 'ctr'} opcoes={[['t', 'Em cima'], ['ctr', 'Meio'], ['b', 'Embaixo']]} aoMudar={(v) => t && mudarParte({ texto: { ...t, anc: v } })} />
              </div></Campo>
            </section>
          )}
          {!linha && !ehImg && (
            <section className="rg-cartao">
              <span className="rg-cab">Preenchimento</span>
              <Preench valor={p.preench} rotulo="Preenchimento" cores={cores} dado="fm-pre" corPadrao="#2f6f8f" aoMudar={(v) => mudarParte({ preench: v })} />
            </section>
          )}
          <section className="rg-cartao">
            <span className="rg-cab">{linha ? 'Linha' : 'Contorno'}</span>
            <Traco valor={p.linha} rotulo={linha ? 'Linha' : 'Contorno'} cores={cores} dado="fm-ln" corPadrao="#1f2d36" semNenhum={linha} aoMudar={(v) => mudarParte({ linha: { ...(p.linha || {}), ...v, ...(v.t === 'nenhum' ? { t: 'nenhum' } : {}) } })} />
            {linha && (
              <div className="ge-linha">
                <Campo rotulo="Começo"><select value={(p.linha && p.linha.ini) || ''} data-fm-ini onChange={(ev) => mudarParte({ linha: { ...(p.linha || { t: 'solido', cor: '#1f2d36', larg: 1.5 }), ini: ev.target.value || undefined } })}>{PONTAS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></Campo>
                <Campo rotulo="Fim"><select value={(p.linha && p.linha.fim) || ''} data-fm-fim onChange={(ev) => mudarParte({ linha: { ...(p.linha || { t: 'solido', cor: '#1f2d36', larg: 1.5 }), fim: ev.target.value || undefined } })}>{PONTAS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></Campo>
              </div>
            )}
            {!ehImg && <Campo rotulo="Sombra"><div className="ge-linha"><Seg rotulo="Sombra" dado="fm-sombra" valor={p.efeito && p.efeito.sombra ? 'sim' : 'nao'} opcoes={[['nao', 'Sem'], ['sim', 'Com']]} aoMudar={(v) => mudarParte({ efeito: v === 'sim' ? { ...(p.efeito || {}), sombra: { cor: '#000000', alfa: 0.3, blur: 6, dist: 2, dir: 90 } } : p.efeito && p.efeito.brilho ? { brilho: p.efeito.brilho } : undefined })} /></div></Campo>}
          </section>
          <section className="rg-cartao">
            <span className="rg-cab">Ao clicar</span>
            <Seg rotulo="Ao clicar" dado="fm-link" valor={tipoLink} opcoes={[['nenhum', 'Nada'], ['aba', 'Ir para uma aba'], ['site', 'Abrir um site']]} aoMudar={(v) => mudarParte({ link: v === 'nenhum' ? undefined : v === 'site' ? { url: (lk && lk.url) || 'https://' } : { aba: abas.find((id) => id !== abaAtualId) || abaAtualId } })} />
            {tipoLink === 'aba' && <>
              <Campo rotulo="Aba"><select value={lk.aba || ''} data-fm-aba onChange={(ev) => mudarParte({ link: { ...lk, aba: ev.target.value, abaNome: undefined } })}>{!lk.aba && <option value="">{lk.abaNome ? lk.abaNome + ' (não veio)' : 'Escolha'}</option>}{abas.map((id) => <option key={id} value={id}>{c.abas[id].nome}</option>)}</select></Campo>
              <Campo rotulo="Na célula"><input value={lk.ref || ''} data-fm-ref maxLength={12} spellCheck={false} placeholder="A1" onChange={(ev) => mudarParte({ link: { ...lk, ref: ev.target.value.trim().toUpperCase() || undefined } })} /></Campo>
            </>}
            {tipoLink === 'site' && <Campo rotulo="Endereço"><input value={lk.url || ''} data-fm-url maxLength={2000} spellCheck={false} onChange={(ev) => mudarParte({ link: { url: ev.target.value.trim() } })} /></Campo>}
            <p className="dd-dica">Com link, um clique leva para lá (no Excel também). Para mover ou mudar: arraste, ou Ctrl + clique (no celular, segure o dedo), e depois Enter.</p>
          </section>
          {erro && <p className="rg-erro" role="alert">{erro}</p>}
        </div>
      </div>
    </Janela>
  );
}
