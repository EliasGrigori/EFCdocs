/* EFCdocs v0.6.7 — Painel na tela: as peças na grade (arrastar, mudar o tamanho, encaixe com a linha dourada)
   e a janela de cada peça (número, texto, tabela; o gráfico usa a janela de gráfico de sempre). Estilo Camadas. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Janela, Icone } from '../ui/comum.jsx';
import { Seg, Campo, Cor } from './graficosUi.jsx';
import { PAINEL, NOME_PECA, medidas, moverPeca, alturaDoPainel, colide, textoDaMeta } from './painel.js';

const SETA = { cima: 'M6 1 L11 9 L1 9 Z', baixo: 'M1 2 L11 2 L6 10 Z' };

/** Um número grande (cartão). n = { texto, cor, seta, comp, erro } */
export function CartaoNumero({ p, n, wpx, hpx }) {
  const tam = Math.max(16, Math.min(56, hpx * 0.36, (wpx / Math.max(3, String(n.texto).length)) * 1.6));
  return (
    <div className="pn-num" style={{ '--pn-cor': n.cor || 'var(--text)' }}>
      {p.rotulo && <span className="pn-num-r">{p.rotulo}</span>}
      <b className="pn-num-v" style={{ fontSize: tam }} data-pn-valor>{n.texto}</b>
      {(n.comp || p.meta) && (
        <span className="pn-num-c">
          {n.seta && <svg viewBox="0 0 12 11" width="11" height="10" aria-hidden="true"><path d={SETA[n.seta]} fill="currentColor" /></svg>}
          {n.comp && <span>{n.comp}</span>}
          {p.meta && <span className="pn-meta">{textoDaMeta(p.meta)}</span>}
        </span>
      )}
    </div>
  );
}

function TabelaPeca({ tb }) {
  if (!tb || !tb.linhas.length) return <div className="pn-vazio-p">Faixa vazia</div>;
  return (
    <div className="pn-tab">
      <table>
        <tbody>
          {tb.linhas.map((ln, i) => (
            <tr key={i} className={i === 0 && tb.cab ? 'cab' : ''}>
              {ln.map((cl, j) => <td key={j} style={{ textAlign: cl.al === 'd' ? 'right' : cl.al === 'c' ? 'center' : 'left', ...(cl.fundo ? { background: cl.fundo } : {}), ...(cl.cor ? { color: cl.cor } : {}), ...(cl.b ? { fontWeight: 700 } : {}) }}>{cl.t}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {tb.cortou && <span className="pn-tab-mais">mostrando as primeiras {tb.linhas.length} linhas</span>}
    </div>
  );
}

/**
 * O painel inteiro. ler: { numero(p) → n, tabela(p) → tb, grafico(p, w, h) → svg }.
 * aoMudar(pecas, rotulo) · aoAbrir(p) · aoAdicionar(t) · aoExcluir(id)
 */
export function PainelView({ painel, nome, ler, larg, cel, somenteLeitura, sel, setSel, aoMudar, aoAbrir, aoAdicionar, aoExcluir, aoDesfazer, aoRefazer, aoColar }) {
  const pecas = painel.pecas;
  const M = useMemo(() => medidas(larg), [larg]);
  const pilha = cel || larg < PAINEL.MIN_W;
  const [arr, setArr] = useState(null);
  const caixa = useRef(null);
  useEffect(() => { if (caixa.current && !cel) caixa.current.focus({ preventScroll: true }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const destino = (a) => {
    if (!a) return null;
    const p = pecas.find((q) => q.id === a.id);
    if (!p) return null;
    const dx = Math.round(a.dx / M.passoX), dy = Math.round(a.dy / M.passoY);
    const n = a.modo === 'mover' ? { x: Math.max(0, Math.min(PAINEL.COLS - p.w, p.x + dx)), y: Math.max(0, p.y + dy), w: p.w, h: p.h }
      : { x: p.x, y: p.y, w: Math.max(1, Math.min(PAINEL.COLS - p.x, p.w + dx)), h: Math.max(1, p.h + dy) };
    return n;
  };
  const baixar = (ev, p, modo) => {
    if (ev.button !== 0 && ev.pointerType === 'mouse') return;
    setSel(p.id);
    if (somenteLeitura || pilha) return;
    ev.stopPropagation();
    ev.currentTarget.setPointerCapture(ev.pointerId);
    setArr({ id: p.id, modo, x0: ev.clientX, y0: ev.clientY, dx: 0, dy: 0, moveu: false });
  };
  const mover = (ev) => { if (!arr) return; const dx = ev.clientX - arr.x0, dy = ev.clientY - arr.y0; setArr({ ...arr, dx, dy, moveu: arr.moveu || Math.abs(dx) + Math.abs(dy) > 4 }); };
  const soltar = () => {
    if (!arr) return;
    const n = destino(arr);
    const p = pecas.find((q) => q.id === arr.id);
    setArr(null);
    if (!arr.moveu || !n || !p || (n.x === p.x && n.y === p.y && n.w === p.w && n.h === p.h)) return;
    aoMudar(moverPeca(pecas, p.id, n), arr.modo === 'mover' ? 'Mover peça do painel' : 'Mudar o tamanho da peça');
  };
  const tecla = (ev) => {
    if (ev.target !== caixa.current) return;
    const p = sel && pecas.find((q) => q.id === sel);
    const ctrl = ev.ctrlKey || ev.metaKey;
    if (ctrl && (ev.key === 'z' || ev.key === 'Z')) { ev.preventDefault(); if (ev.shiftKey) aoRefazer(); else aoDesfazer(); return; }
    if (ctrl && (ev.key === 'y' || ev.key === 'Y')) { ev.preventDefault(); aoRefazer(); return; }
    if (!p) return;
    if (ev.key === 'Escape') { setSel(null); return; }
    if (somenteLeitura) return;
    if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); aoExcluir(p.id); return; }
    if (ev.key === 'Enter') { ev.preventDefault(); aoAbrir(p); return; }
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
    if (d) {
      ev.preventDefault();
      const n = ev.shiftKey ? { w: Math.max(1, p.w + d[0]), h: Math.max(1, p.h + d[1]) } : { x: Math.max(0, p.x + d[0]), y: Math.max(0, p.y + d[1]) };
      aoMudar(moverPeca(pecas, p.id, n), ev.shiftKey ? 'Mudar o tamanho da peça' : 'Mover peça do painel');
    }
  };
  const alvo = arr && arr.moveu ? destino(arr) : null;
  const ordem = pilha ? [...pecas].sort((a, b) => a.y - b.y || a.x - b.x) : pecas;
  const H = Math.max(alturaDoPainel(pecas) * PAINEL.LIN + 2 * PAINEL.PAD + (alvo ? 400 : 120), 300);
  const conteudo = (p, w, h) => {
    if (p.t === 'grafico') return <div className="pn-gr" dangerouslySetInnerHTML={{ __html: ler.grafico(p, Math.max(60, Math.round(w)), Math.max(40, Math.round(h))) }} />;
    if (p.t === 'numero') return <CartaoNumero p={p} n={ler.numero(p)} wpx={w} hpx={h} />;
    if (p.t === 'tabela') return <TabelaPeca tb={ler.tabela(p)} />;
    return <div className={'pn-txt al-' + p.al} style={{ fontSize: p.tam * (4 / 3), fontWeight: p.negrito ? 700 : 400, ...(p.cor ? { color: p.cor } : {}) }}>{p.texto || <em className="pn-vazio-p">Texto vazio</em>}</div>;
  };
  const estiloPeca = (p) => (p.t === 'texto' ? { background: p.fundo === 'nenhum' || !p.fundo ? 'transparent' : p.fundo, boxShadow: p.fundo && p.fundo !== 'nenhum' ? undefined : 'none' } : undefined);
  return (
    <div className="pn-area" style={painel.fundo && painel.fundo !== '#eef2f5' ? { background: painel.fundo } : undefined} data-painel
      onPaste={(ev) => { ev.preventDefault(); if (aoColar) aoColar(); }} tabIndex={0} ref={caixa} onKeyDown={tecla}
      onPointerDown={(ev) => { if (ev.target === ev.currentTarget || ev.target.classList.contains('pn-folha')) setSel(null); }}
      aria-label={'Painel ' + nome + (pecas.length ? `: ${pecas.length} peça${pecas.length > 1 ? 's' : ''}` : ' em branco')}>
      {!pecas.length && (
        <div className="pn-branco" data-pn-branco>
          <span className="pn-branco-ic"><Icone n="n:painelNovo" /></span>
          <h3>Painel em branco</h3>
          <p>Junte aqui os gráficos, números e tabelas das outras abas. Tudo muda sozinho quando a planilha muda; sai em PDF de uma página e vai para o Excel.</p>
          {!somenteLeitura && (
            <div className="pn-branco-b">
              {['grafico', 'numero', 'texto', 'tabela'].map((t) => <button key={t} type="button" className="btn" data-pn-add={t} onClick={() => aoAdicionar(t)}><Icone n={'n:' + { grafico: 'painelGrafico', numero: 'painelNumero', texto: 'painelTexto', tabela: 'painelTabela' }[t]} />{NOME_PECA[t]}</button>)}
            </div>
          )}
        </div>
      )}
      {pilha ? (
        <div className="pn-pilha">
          {ordem.map((p) => (
            <div key={p.id} className={'pn-peca pn-t-' + p.t + (sel === p.id ? ' sel' : '') + (p.t === 'texto' ? ' pn-auto' : '')} data-peca={p.id} data-peca-t={p.t} style={{ ...(p.t === 'texto' ? { minHeight: p.h * PAINEL.LIN - PAINEL.GAP } : { height: p.h * PAINEL.LIN - PAINEL.GAP }), ...estiloPeca(p) }}
              onPointerDown={(ev) => baixar(ev, p, 'mover')} onDoubleClick={() => !somenteLeitura && aoAbrir(p)}>
              {conteudo(p, larg - 2 * PAINEL.PAD, p.h * PAINEL.LIN - PAINEL.GAP)}
            </div>
          ))}
          {/* v0.6.8 (Grok): no celular a faixa do Painel não aparece: os botões de pôr peças ficam no fim da lista */}
          {!somenteLeitura && pecas.length > 0 && (
            <div className="pn-add-cel" data-pn-add-cel>
              {['grafico', 'numero', 'texto', 'tabela'].map((t) => <button key={t} type="button" className="btn sm" data-pn-add={t} onClick={() => aoAdicionar(t)}><Icone n={'n:' + { grafico: 'painelGrafico', numero: 'painelNumero', texto: 'painelTexto', tabela: 'painelTabela' }[t]} />{NOME_PECA[t]}</button>)}
            </div>
          )}
        </div>
      ) : (
        <div className="pn-folha" style={{ width: M.W, height: H }}>
          {alvo && <div className="pn-alvo" style={(() => { const r = M.ret(alvo); return { left: r.x, top: r.y, width: r.w, height: r.h }; })()} aria-hidden="true" />}
          {pecas.map((p) => {
            const r = M.ret(p);
            const ar = arr && arr.id === p.id && arr.moveu ? arr : null;
            const st = { left: r.x, top: r.y, width: r.w, height: r.h, ...estiloPeca(p) };
            if (ar && ar.modo === 'mover') { st.transform = `translate(${ar.dx}px, ${ar.dy}px)`; st.zIndex = 5; st.opacity = 0.92; }
            if (ar && ar.modo === 'tamanho') { st.width = Math.max(40, r.w + ar.dx); st.height = Math.max(24, r.h + ar.dy); st.zIndex = 5; }
            const sobre = !ar && pecas.some((q) => colide(p, q));
            return (
              <div key={p.id} className={'pn-peca pn-t-' + p.t + (sel === p.id ? ' sel' : '') + (sobre ? ' sobre' : '')} data-peca={p.id} data-peca-t={p.t} style={st}
                role="group" aria-label={NOME_PECA[p.t] + (p.rotulo ? ': ' + p.rotulo : '')}
                onPointerDown={(ev) => baixar(ev, p, 'mover')} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={() => setArr(null)}
                onDoubleClick={() => !somenteLeitura && aoAbrir(p)}>
                {conteudo(p, st.width, st.height)}
                {sel === p.id && !somenteLeitura && (
                  <>
                    <span className="pn-alca" data-pn-alca aria-label="Mudar o tamanho" onPointerDown={(ev) => baixar(ev, p, 'tamanho')} onPointerMove={mover} onPointerUp={soltar} />
                    <span className="pn-barra" onPointerDown={(ev) => ev.stopPropagation()}>
                      <button type="button" className="iconbtn" aria-label="Mudar" title="Mudar (Enter)" data-pn-mudar onClick={() => aoAbrir(p)}><Icone n="renomear" /></button>
                      <button type="button" className="iconbtn" aria-label="Excluir" title="Excluir (Delete)" data-pn-excluir onClick={() => aoExcluir(p.id)}><Icone n="lixeira" /></button>
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const FORMATOS = [['', 'Como a célula'], ['#,##0', '1.234'], ['#,##0.00', '1.234,56'], ['"R$" #,##0.00', 'R$ 1.234,56'], ['0%', '12%'], ['0.0%', '12,3%'], ['dd/mm/yyyy', 'Data']];

/**
 * Janela de uma peça de número, texto ou tabela. p0 = peça (ou { t } para nova).
 * conta: { mostrar(f en) → texto pt, guardar(texto pt) → { f } | { erro } , lerFaixa(texto) → { aba, fx, nome } | { erro } , faixaTexto(p) → texto }
 * previa(p) → n (cartão) · aoAplicar(p) · aoFechar
 */
export function JanelaPeca({ p0, conta, previa, aoAplicar, aoFechar }) {
  const nova = !p0.id;
  const [p, setP] = useState(() => ({ ...p0 }));
  const [txtF, setTxtF] = useState(() => (p0.f ? '=' + conta.mostrar(p0.f) : ''));
  const [txtC, setTxtC] = useState(() => (p0.fc ? '=' + conta.mostrar(p0.fc) : ''));
  const [txtT, setTxtT] = useState(() => (p0.t === 'tabela' && p0.fx ? conta.faixaTexto(p0) : ''));
  const [erro, setErro] = useState('');
  const muda = (x) => setP((a) => ({ ...a, ...x }));
  const montar = () => {
    if (p.t === 'numero') {
      const r = conta.guardar(txtF);
      if (r.erro) return { erro: r.erro };
      const o = { ...p, f: r.f };
      if (txtC.trim()) { const rc = conta.guardar(txtC); if (rc.erro) return { erro: 'Comparar com: ' + rc.erro }; o.fc = rc.f; } else delete o.fc;
      return { p: o };
    }
    if (p.t === 'tabela') {
      const r = conta.lerFaixa(txtT);
      if (r.erro) return { erro: r.erro };
      return { p: { ...p, aba: r.aba, fx: r.fx } };
    }
    return { p };
  };
  const vista = useMemo(() => { const m = montar(); return m.p && p.t === 'numero' ? previa(m.p) : null; }, [p, txtF, txtC]); // eslint-disable-line react-hooks/exhaustive-deps
  const aplicar = () => { const m = montar(); if (m.erro) { setErro(m.erro); return; } aoAplicar(m.p); };
  /* v0.6.8 (Grok): "Nova tabela", "Novo número" (o gênero da palavra) */
  const titulo = nova ? ({ numero: 'Novo número', texto: 'Novo texto', tabela: 'Nova tabela', grafico: 'Novo gráfico' }[p.t] || 'Nova peça') + ' no painel' : NOME_PECA[p.t] + ' no painel';
  return (
    <Janela titulo={titulo.charAt(0).toUpperCase() + titulo.slice(1)} icone={'n:' + { numero: 'painelNumero', texto: 'painelTexto', tabela: 'painelTabela' }[p.t]} subtitulo={p.t === 'numero' ? 'Um número grande que vem de uma conta ou de uma célula' : p.t === 'tabela' ? 'Um pedaço de outra aba, ao vivo' : 'Título, explicação ou observação'}
      aoFechar={aoFechar} classe="pn-jan" rodape={(
        <>
          <span style={{ flex: 1 }} />
          <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
          <button type="button" className="btn sm primary" data-pn-ok onClick={aplicar}>{nova ? 'Pôr no painel' : 'OK'}</button>
        </>
      )}>
      <div className="janela-c pn-jan-c" data-pn-janela={p.t}>
        {p.t === 'numero' && (
          <>
            <section className="rg-cartao">
              <span className="rg-cab">O número</span>
              <Campo rotulo="Nome" dica="Aparece em cima do número"><input data-pn-rotulo value={p.rotulo || ''} maxLength={120} placeholder="Ex.: Não conformidades do mês" onChange={(ev) => muda({ rotulo: ev.target.value })} data-foco /></Campo>
              <Campo rotulo="Conta ou célula" dica="Uma célula (=Dados!C40) ou uma conta (=SOMA(Dados!B2:B7))"><input data-pn-conta value={txtF} spellCheck={false} placeholder="=Dados!C40" onChange={(ev) => { setTxtF(ev.target.value); setErro(''); }} /></Campo>
              <Campo rotulo="Formato"><select data-pn-formato value={p.nf || ''} onChange={(ev) => muda({ nf: ev.target.value || undefined })}>{FORMATOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></Campo>
            </section>
            <section className="rg-cartao">
              <span className="rg-cab">Meta e comparação (opcional)</span>
              <Campo rotulo="Meta" dica="Verde quando cumpre, vermelho quando não"><input data-pn-meta inputMode="decimal" value={p.meta ? String(p.meta.v).replace('.', ',') : ''} placeholder="Sem meta" onChange={(ev) => { const t = ev.target.value.trim().replace(/\./g, '').replace(',', '.'); const v = Number(t); muda({ meta: t === '' || !Number.isFinite(v) ? undefined : { v, sentido: (p.meta && p.meta.sentido) || 'maior' } }); }} /></Campo>
              {p.meta && <Seg valor={p.meta.sentido} rotulo="Sentido da meta" dado="pn-sentido" opcoes={[['maior', 'Maior é melhor'], ['menor', 'Menor é melhor']]} aoMudar={(v) => muda({ meta: { ...p.meta, sentido: v } })} />}
              <Campo rotulo="Comparar com" dica="Mostra a diferença em % com uma setinha (ex.: o mês passado)"><input data-pn-comp value={txtC} spellCheck={false} placeholder="=Dados!C39" onChange={(ev) => setTxtC(ev.target.value)} /></Campo>
            </section>
            <section className="rg-cartao pn-jan-previa">
              <span className="rg-cab">Prévia</span>
              <div className="pn-peca pn-t-numero" style={{ position: 'relative', height: 120 }}>{vista ? <CartaoNumero p={p} n={vista} wpx={260} hpx={120} /> : <span className="pn-vazio-p">Escreva a conta</span>}</div>
            </section>
          </>
        )}
        {p.t === 'texto' && (
          <section className="rg-cartao">
            <span className="rg-cab">Texto</span>
            <textarea data-pn-texto data-foco rows={4} maxLength={4000} value={p.texto || ''} onChange={(ev) => muda({ texto: ev.target.value })} placeholder="Ex.: Painel da qualidade · semana 44" />
            <div className="ge-linha">
              <select aria-label="Tamanho da letra" value={p.tam || 14} onChange={(ev) => muda({ tam: +ev.target.value })}>{[9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 40].map((x) => <option key={x} value={x}>{x}</option>)}</select>
              <button type="button" className={'btn sm ge-b' + (p.negrito ? ' on' : '')} aria-pressed={!!p.negrito} title="Negrito" onClick={() => muda({ negrito: !p.negrito })}><b>N</b></button>
              <Seg valor={p.al || 'e'} rotulo="Alinhar" dado="pn-al" opcoes={[['e', 'Esquerda'], ['c', 'Centro'], ['d', 'Direita']]} aoMudar={(v) => muda({ al: v })} />
            </div>
            <div className="ge-linha">
              <Cor valor={p.cor} rotulo="Cor do texto" semCor="Automática" aoMudar={(h) => muda({ cor: h || undefined })} />
              <Cor valor={p.fundo && p.fundo !== 'nenhum' ? p.fundo : null} rotulo="Fundo" semCor="Sem fundo" aoMudar={(h) => muda({ fundo: h || undefined })} />
            </div>
          </section>
        )}
        {p.t === 'tabela' && (
          <section className="rg-cartao">
            <span className="rg-cab">Tabela</span>
            <Campo rotulo="Células" dica="Aba e faixa, como Dados!A1:C8 (até 50 linhas e 12 colunas aparecem)"><input data-pn-faixa data-foco value={txtT} spellCheck={false} placeholder="Dados!A1:C8" onChange={(ev) => { setTxtT(ev.target.value); setErro(''); }} /></Campo>
            <label className="rg-chk"><input type="checkbox" checked={p.cab !== 0} onChange={(ev) => muda({ cab: ev.target.checked ? 1 : 0 })} /> A 1ª linha é o título</label>
          </section>
        )}
        {erro && <p className="rg-erro" role="alert" data-pn-erro>{erro}</p>}
      </div>
    </Janela>
  );
}

/** Escolher o gráfico que vai para o painel: um dos que já existem na planilha ou um novo. */
export function JanelaGraficoPainel({ lista, aoEscolher, aoNovo, aoFechar }) {
  return (
    <Janela titulo="Gráfico no painel" icone="n:painelGrafico" subtitulo="Um gráfico da planilha (continua ligado aos dados) ou um novo" aoFechar={aoFechar} classe="pn-jan" rodape={(
      <>
        <span style={{ flex: 1 }} />
        <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn sm primary" data-pn-gr-novo onClick={aoNovo}><Icone n="plus" />Gráfico novo</button>
      </>
    )}>
      <div className="janela-c pn-jan-c">
        {lista.length ? (
          <div className="pn-gr-lista" data-pn-gr-lista>
            {lista.map((x) => (
              <button key={x.id} type="button" className="pn-gr-item" data-pn-gr={x.id} onClick={() => aoEscolher(x)}>
                <span className="pn-gr-mini" dangerouslySetInnerHTML={{ __html: x.svg }} />
                <span className="pn-gr-n"><b>{x.titulo}</b><em>aba {x.aba}</em></span>
              </button>
            ))}
          </div>
        ) : <p className="rg-dica">Esta planilha ainda não tem gráficos. Use "Gráfico novo" e escolha as células.</p>}
      </div>
    </Janela>
  );
}
