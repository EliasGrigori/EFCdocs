/* EFCdocs — Planilha: telas para entender a conta (v0.4.3).
   PL11/PL12 JanelaExplicar · PL13 PainelProblemas · PL15 JanelaFluxo · PL18 JanelaMontar. */
import { useMemo, useState } from 'react';
import { Icone, Janela } from '../ui/comum.jsx';
import { tokenizar } from './formula.js';
import { textoEmLinhas, arrumarGrafo } from './explicar.js';
import { RECEITAS, COMPARACOES, COMPARA_CEL, faltaValor } from './receitas.js';
import { CORES_REF } from './ajuda.js';
import { chave, lerEndereco } from './ref.js';
import { conteudoQuadroVazio, novoItem, novaSeta } from '../quadro/modelo.js';

/** Um pedaço de fórmula com cores; a célula leva o nome da coluna ao lado (‹Cloro livre›). */
function TextoFormula({ texto, titulo }) {
  const tk = tokenizar(texto, 'pt');
  const out = [];
  let pos = 0;
  const cores = new Map();
  tk.forEach((t, i) => {
    if (t.i > pos) out.push(<span key={'e' + i}>{texto.slice(pos, t.i)}</span>);
    const tx = texto.slice(t.i, t.f);
    if (t.t === 'ref' || t.t === 'area') {
      const k = tx.replace(/\$/g, '').toUpperCase();
      if (!cores.has(k)) cores.set(k, CORES_REF[cores.size % CORES_REF.length]);
      const tit = t.t === 'ref' && titulo ? titulo(t.v) : null;
      out.push(<span key={i} className="tk-ref-b" style={{ color: cores.get(k), cursor: 'default' }}>{tx}{tit && <i className="pl-inlay">‹{tit}›</i>}</span>);
    } else {
      const cls = { fn: 'tk-fn', str: 'tk-str', num: 'tk-num', err: 'tk-err', bool: 'tk-bool', nome: 'tk-nome', op: 'tk-op', sep: 'tk-op', abre: 'tk-par', fecha: 'tk-par' }[t.t] || '';
      out.push(<span key={i} className={cls}>{tx}</span>);
    }
    pos = t.f;
  });
  if (pos < texto.length) out.push(<span key="fim">{texto.slice(pos)}</span>);
  return <>{out}</>;
}

/** Caixa "Por que deu erro?" (PL12): o motivo e os consertos de um toque. */
export function CaixaErro({ causa, aoAcao, somenteLeitura }) {
  if (!causa) return null;
  return (
    <div className="pl-porque" role="note">
      <div className="pl-porque-t"><Icone n="aviso" /><b>Por que deu erro? {causa.titulo}</b></div>
      <p>{causa.msg}</p>
      {causa.acoes.length > 0 && (
        <div className="chips">
          {causa.acoes.map((a, i) => (
            <button key={i} type="button" className={'btn sm' + (i === 0 ? ' primary' : '')} disabled={somenteLeitura && a.tipo !== 'ir'} onClick={() => aoAcao(a)}>{a.rotulo}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/** PL11: a fórmula em linhas numeradas, o valor de cada pedaço e a frase em português. */
export function JanelaExplicar({ nomeCel, dados, causa, titulo, aoAcao, aoAplicar, aoFluxo, aoMontar, aoFechar, somenteLeitura }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(() => (dados && dados.linhas.length ? textoEmLinhas(dados.linhas) : ''));
  return (
    <Janela titulo={'Explicar esta conta · ' + nomeCel} aoFechar={aoFechar} classe="pl-jexp" rodape={(
      <>
        {dados && <button type="button" className="btn" onClick={aoFluxo}><Icone n="fluxoConta" />Desenhar a conta</button>}
        <span className="sp" />
        <button type="button" className="btn primary" onClick={aoFechar}>Fechar</button>
      </>
    )}>
      <div className="janela-c">
        {!dados ? (
          <>
            <p>A célula {nomeCel} não tem fórmula. Selecione uma célula com conta (o que começa com =) e toque de novo em "Explicar esta conta".</p>
            {!somenteLeitura && <button type="button" className="btn sm" onClick={aoMontar}><Icone n="pergunta" />Montar uma conta respondendo uma pergunta</button>}
          </>
        ) : (
          <>
            <CaixaErro causa={causa} aoAcao={aoAcao} somenteLeitura={somenteLeitura} />
            {!editando ? (
              <ol className="pl-linhas" aria-label="A conta em linhas">
                {dados.linhas.map((x, i) => (
                  <li key={i} className={x.final ? 'final' : ''}>
                    <span className="pl-ln">{i + 1}</span>
                    <code style={{ paddingLeft: x.recuo * 18 }}><TextoFormula texto={x.texto} titulo={titulo} /></code>
                    {x.valor != null && <span className={'pl-lv' + (/^#/.test(x.valor) ? ' erro' : '')}>{x.valor}</span>}
                  </li>
                ))}
              </ol>
            ) : (
              <>
                <textarea className="pl-linhas-ed" aria-label="Editar a fórmula em linhas" spellCheck={false} value={texto} rows={Math.min(14, Math.max(4, texto.split('\n').length + 1))} onChange={(ev) => setTexto(ev.target.value)} />
                <p className="qd-dica">As quebras de linha e os espaços são só para ler melhor. Ao aplicar, a fórmula volta para uma linha só (como o Excel guarda).</p>
              </>
            )}
            <p className="pl-frase">{dados.frase}</p>
            {dados.faltam.length > 0 && <p className="qd-dica">{dados.faltam.join(', ')}: o EFCdocs ainda não calcula. A fórmula fica guardada e funciona no Excel.</p>}
            {!somenteLeitura && (
              <div className="chips">
                {!editando
                  ? <button type="button" className="btn sm" onClick={() => setEditando(true)}><Icone n="renomear" />Editar em linhas</button>
                  : (
                    <>
                      <button type="button" className="btn sm primary" onClick={() => { if (aoAplicar(texto.replace(/^\s*=?/, '='))) aoFechar(); }}><Icone n="check" />Aplicar</button>
                      <button type="button" className="btn sm" onClick={() => { setEditando(false); setTexto(textoEmLinhas(dados.linhas)); }}>Cancelar</button>
                    </>
                  )}
              </div>
            )}
          </>
        )}
      </div>
    </Janela>
  );
}

/** PL13: a lâmpada com o número de problemas e a lista (o mesmo jeito do Assistente do quadro). */
export function PainelProblemas({ lista, aberto, aoAlternar, aoIr, aoAcao, somenteLeitura }) {
  const erros = lista.filter((p) => p.nivel === 'erro').length;
  const avisos = lista.length - erros;
  const resumo = !lista.length ? 'nenhum problema' : [erros && `${erros} ${erros === 1 ? 'erro' : 'erros'}`, avisos && `${avisos} ${avisos === 1 ? 'aviso' : 'avisos'}`].filter(Boolean).join(' · ');
  return (
    <>
      <button type="button" className={'qd-lamp card pl-lamp' + (lista.length ? ' tem' : '')} aria-expanded={aberto} aria-label={'Problemas da planilha: ' + resumo} title="Problemas da planilha" onClick={aoAlternar} onPointerDown={(ev) => ev.stopPropagation()}>
        <Icone n="lampada" /><span>Problemas</span>{lista.length > 0 && <em>{lista.length}</em>}
      </button>
      {aberto && (
        <div className="qd-assist card pl-problemas" role="dialog" aria-label="Problemas da planilha" onPointerDown={(ev) => ev.stopPropagation()}>
          <header><b>Problemas · {resumo}</b><button type="button" className="rbi" title="Fechar" aria-label="Fechar a lista de problemas" onClick={aoAlternar}><Icone n="x" /></button></header>
          {lista.length === 0 ? <p className="qd-assist-ok"><Icone n="check" />Tudo certo: nenhum erro nem aviso na planilha.</p> : (
            <ul>
              {lista.map((p) => (
                <li key={p.id} className={p.nivel}>
                  <i aria-hidden="true" />
                  <span className="pl-prob-tx"><b className="pl-prob-cel">{p.cel}</b> {p.texto}</span>
                  <span className="pl-prob-b">
                    <button type="button" className="btn sm" onClick={() => aoIr(p)}>Ir</button>
                    {p.acoes.filter((a) => a.tipo !== 'ir' && !somenteLeitura).slice(0, 1).map((a, i) => <button key={i} type="button" className="btn sm primary" onClick={() => aoAcao(a)}>{a.rotulo}</button>)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

/* ---------------- PL15: a conta desenhada ---------------- */

const COR_NO = { conta: 'var(--primary)', valor: '#2f9e6e', faixa: '#8e4ec6' };
const corta = (t, n) => (t && t.length > n ? t.slice(0, n - 1) + '…' : t || '');

export function JanelaFluxo({ nomeCel, grafo, aoIr, aoQuadro, aoFechar, somenteLeitura }) {
  const lay = useMemo(() => arrumarGrafo(grafo), [grafo]);
  const P = 16;
  const W = lay.largura + P * 2, H = lay.altura + P * 2;
  const temPara = grafo.nos.some((n) => n.nivel < 0);
  return (
    <Janela titulo={'A conta desenhada · ' + nomeCel} aoFechar={aoFechar} classe="pl-jfluxo" rodape={(
      <>
        <span className="pl-fluxo-leg"><i style={{ background: COR_NO.conta }} />conta <i style={{ background: COR_NO.valor }} />valor <i style={{ background: COR_NO.faixa }} />faixa</span>
        <span className="sp" />
        {!somenteLeitura && <button type="button" className="btn" onClick={aoQuadro}><Icone n="postits" />Mandar para um quadro novo</button>}
        <button type="button" className="btn primary" onClick={aoFechar}>Fechar</button>
      </>
    )}>
      <div className="janela-c">
        {grafo.nos.length <= 1 && !temPara
          ? <p>A célula {nomeCel} não usa nem é usada por nenhuma outra. Escolha uma célula com fórmula.</p>
          : (
            <>
              <p className="qd-dica">Da esquerda para a direita: de onde vêm os números, a conta de {nomeCel}{temPara ? ' e, à direita, quem usa o resultado' : ''}. Toque numa caixa para ir até ela.</p>
              <div className="pl-fluxo">
                <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={'Fluxograma da conta de ' + nomeCel}>
                  <defs><marker id="pl-seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--text-muted)" /></marker></defs>
                  {grafo.setas.map((s, i) => {
                    const a = lay.pos.get(s.de), b = lay.pos.get(s.para);
                    if (!a || !b) return null;
                    const x1 = P + a.x + a.w, y1 = P + a.y + a.h / 2, x2 = P + b.x, y2 = P + b.y + b.h / 2, mx = (x1 + x2) / 2;
                    return <path key={i} d={`M${x1} ${y1}C${mx} ${y1} ${mx} ${y2} ${x2 - 2} ${y2}`} fill="none" stroke="var(--text-muted)" strokeWidth="1.5" markerEnd="url(#pl-seta)" />;
                  })}
                  {grafo.nos.map((n) => {
                    const p = lay.pos.get(n.id);
                    const destaque = n.nivel === 0;
                    return (
                      <g key={n.id} transform={`translate(${P + p.x} ${P + p.y})`} className="pl-fluxo-no" role="button" tabIndex={0} aria-label={`${n.rotulo}${n.titulo ? ' ' + n.titulo : ''}: ${n.valor}`}
                        onClick={() => aoIr(n)} onKeyDown={(ev) => { if (ev.key === 'Enter') aoIr(n); }}>
                        <rect width={p.w} height={p.h} rx="4" fill="var(--surface-2)" stroke={destaque ? 'var(--primary)' : 'var(--border-light)'} strokeWidth={destaque ? 2 : 1} />
                        <rect width="4" height={p.h} fill={COR_NO[n.tipo]} />
                        <text x="12" y="18" className="t1">{corta(n.rotulo + (n.titulo ? ' ‹' + n.titulo + '›' : ''), 26)}</text>
                        <text x="12" y="36" className="t2">{corta(n.formula || (n.tipo === 'faixa' ? 'faixa de células' : 'valor digitado'), 30)}</text>
                        <text x="12" y="54" className={'t3' + (/^#/.test(n.valor) ? ' erro' : '')}>{corta('= ' + n.valor, 28)}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </>
          )}
      </div>
    </Janela>
  );
}

/** O desenho vira um quadro de post-its (atividades e entradas ligadas por setas), para anotar e treinar. */
export function quadroDaConta(grafo, nomeCel, nomeArquivo) {
  const lay = arrumarGrafo(grafo, { w: 210, h: 96, gx: 90, gy: 30 });
  let c = conteudoQuadroVazio();
  const aplicar = (mud) => { const n = { ...c, itens: { ...c.itens }, setas: { ...c.setas } }; for (const [k, v] of Object.entries(mud)) { const [raiz, id] = k.split('.'); if (id) n[raiz][id] = v; else n[k] = v; } c = n; };
  const ids = new Map();
  const tit = novoItem(c, 'texto', { x: 0, y: -80, w: 520, h: 44, texto: `Conta de ${nomeCel} · ${nomeArquivo}`, fonte: { n: 1 } });
  aplicar(tit.mudancas);
  for (const n of grafo.nos) {
    const p = lay.pos.get(n.id);
    const texto = [n.rotulo + (n.titulo ? ` ‹${n.titulo}›` : ''), n.formula, '= ' + n.valor].filter(Boolean).join('\n');
    const r = novoItem(c, n.tipo === 'conta' ? 'processo' : 'dados', { x: p.x, y: p.y, w: p.w, h: p.h, texto, ...(n.nivel === 0 ? { cor: 'amarelo' } : {}) });
    aplicar(r.mudancas);
    ids.set(n.id, r.item.id);
  }
  for (const s of grafo.setas) {
    const de = ids.get(s.de), para = ids.get(s.para);
    if (!de || !para) continue;
    aplicar(novaSeta(c, de, para, { estilo: 'reta' }).mudancas);
  }
  return c;
}

/* ---------------- PL18: montar a conta respondendo uma pergunta ---------------- */

/**
 * colunas: [{ id, rotulo, faixa }] (todas as abas, com título); celulaPadrao: 'B2'; previa(texto) → texto do resultado;
 * aoPor(texto, nf) grava na célula ativa.
 */
export function JanelaMontar({ nomeCel, ocupada, colunas, celulaPadrao, previa, aoPor, aoFechar }) {
  const [rid, setRid] = useState(RECEITAS[0].id);
  const r = RECEITAS.find((x) => x.id === rid);
  const padroes = (rr) => Object.fromEntries(rr.campos.map((f) => [f.id, f.padrao != null ? f.padrao : f.tipo === 'coluna' ? (f.opcional ? '' : (colunas[0] ? colunas[0].faixa : '')) : f.tipo === 'celula' ? (f.opcional ? '' : celulaPadrao) : '']));
  const [vals, setVals] = useState(() => padroes(r));
  const trocar = (id) => { const rr = RECEITAS.find((x) => x.id === id); setRid(id); setVals(padroes(rr)); };
  const celOk = (t) => !t || !!lerEndereco(t);
  const invalidas = r.campos.filter((f) => f.tipo === 'celula' && vals[f.id] && !celOk(vals[f.id]));
  const semValor = r.campos.some((f) => f.tipo === 'comparacao') && (COMPARACOES.find((x) => x.id === vals.comp) || {}).semValor;
  const m = invalidas.length ? null : r.montar(vals);
  const res = m ? previa(m.texto, m.nf) : '';
  return (
    <Janela titulo={'Montar a conta · ' + nomeCel} aoFechar={aoFechar} classe="pl-jmontar" rodape={(
      <>
        <button type="button" className="btn" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn primary" disabled={!m} onClick={() => { if (aoPor('=' + m.texto, m.nf)) aoFechar(); }}><Icone n="check" />Pôr em {nomeCel}</button>
      </>
    )}>
      <div className="janela-c pl-montar">
        <div className="pl-montar-l" role="listbox" aria-label="O que você quer fazer?">
          {RECEITAS.map((x) => (
            <button key={x.id} type="button" role="option" aria-selected={x.id === rid} className={x.id === rid ? 'on' : ''} onClick={() => trocar(x.id)}>{x.nome}</button>
          ))}
        </div>
        <div className="pl-montar-d">
          <p className="qd-dica">{r.exemplo}</p>
          {r.campos.map((f) => {
            if (f.id === 'valor' && semValor) return null;
            const set = (v) => setVals({ ...vals, [f.id]: v });
            const rot = f.rotulo ? <span>{f.rotulo}</span> : null;
            if (f.tipo === 'coluna') {
              return (
                <label key={f.id} className="campo">{rot}
                  <select value={vals[f.id]} onChange={(ev) => set(ev.target.value)}>
                    {f.opcional && <option value="">(todas as linhas)</option>}
                    {colunas.map((cl) => <option key={cl.id} value={cl.faixa}>{cl.rotulo}</option>)}
                  </select>
                </label>
              );
            }
            if (f.tipo === 'comparacao' || f.tipo === 'comparaCel') {
              const lista = f.tipo === 'comparacao' ? COMPARACOES : COMPARA_CEL;
              return (
                <label key={f.id} className="campo">{rot || <span>{f.tipo === 'comparacao' ? 'as células que' : 'for'}</span>}
                  <select value={vals[f.id]} onChange={(ev) => set(ev.target.value)}>{lista.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select>
                </label>
              );
            }
            return (
              <label key={f.id} className="campo">{rot}
                <input value={vals[f.id]} spellCheck={false} placeholder={f.tipo === 'celula' ? (f.opcional ? 'opcional, ex.: C2' : 'ex.: B2') : f.id === 'valor' ? 'ex.: Ajustar ou 0,5' : ''}
                  aria-invalid={f.tipo === 'celula' && !celOk(vals[f.id])} onChange={(ev) => set(f.tipo === 'celula' ? ev.target.value.toUpperCase() : ev.target.value)} />
              </label>
            );
          })}
          {!colunas.length && r.campos.some((f) => f.tipo === 'coluna') && <p className="qd-dica">Para escolher colunas pelo nome, a planilha precisa de uma linha de títulos (ex.: Lote, Cloro, Situação).</p>}
          {invalidas.length > 0 && <p className="erro-t">"{vals[invalidas[0].id]}" não é uma célula. Escreva como B2 ou Lotes!B2.</p>}
          {!m && !invalidas.length && r.campos.some((f) => f.id === 'valor') && faltaValor(vals) && <p className="qd-dica">Escreva o valor que a conta vai comparar (ex.: Ajustar, OK ou 0,5).</p>}
          {m && (
            <div className="pl-montar-r">
              <div>Fica <code>={m.texto}</code></div>
              <div>Resultado agora: <b>{res}</b></div>
              {ocupada && <div className="qd-dica">{nomeCel} já tem conteúdo; ele será trocado (Ctrl+Z desfaz).</div>}
            </div>
          )}
        </div>
      </div>
    </Janela>
  );
}

export { chave };
