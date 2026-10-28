/* EFCdocs — Planilha (v0.5.1): telas da lista suspensa / validação de dados, da formatação condicional e dos comentários. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icone, Janela } from '../ui/comum.jsx';
import { paraGuardar, paraMostrar } from './formula.js';
import { lerEntrada } from './entrada.js';
import { formatar } from './formato.js';
import { faixasDe, textoDoComentario, TIPOS_VALIDACAO, ESTILOS_ERRO, OPERADORES, TIPOS_REGRA, descreverRegra, descreverValidacao, novoIdRegra } from './regras.js';
import { PainelCores } from './cores.jsx';

const SEM_DOIS = new Set(['between', 'notBetween']);
const eh2 = (op) => !op || SEM_DOIS.has(op);

/** O que a pessoa digitou (pt-BR) → fórmula guardada. Número e data viram o número; "=conta" vira fórmula. Devolve { f } ou { erro }. */
function lerParametro(texto, tipo, aceitaTexto = false) {
  const t = String(texto ?? '').trim();
  if (!t) return { erro: 'Preencha este campo.' };
  if (t[0] === '=') { try { return { f: paraGuardar(t.slice(1)) }; } catch (e) { return { erro: e.message || 'A conta tem um problema.' }; } }
  const r = lerEntrada(t, 'General');
  if (r.erro) return { erro: r.erro.message || 'Valor inválido.' };
  if (typeof r.v === 'number') return { f: String(r.v) };
  if (aceitaTexto) return { f: typeof r.v === 'boolean' ? (r.v ? 'TRUE' : 'FALSE') : '"' + String(r.v ?? t).replace(/"/g, '""') + '"' };
  if (tipo === 'textLength') return { erro: 'Digite um número (ou uma conta começando com =).' };
  return { erro: tipo === 'date' ? 'Digite uma data (dd/mm/aaaa) ou uma conta começando com =.' : tipo === 'time' ? 'Digite uma hora (hh:mm) ou uma conta começando com =.' : 'Digite um número ou uma conta começando com =.' };
}
const mostrarParametro = (f, tipo) => {
  if (f == null || f === '') return '';
  if (/^-?\d+(\.\d+)?$/.test(f)) {
    const n = Number(f);
    if (tipo === 'date') return formatar(n, 'dd/mm/yyyy').t;
    if (tipo === 'time') return formatar(n, 'hh:mm').t;
    return String(n).replace('.', ',');
  }
  try { return '=' + paraMostrar(f); } catch { return '=' + f; }
};

/* ============================================================
   Validação de dados
   ============================================================ */
export function JanelaValidacao({ faixaTexto, inicial, aoAplicar, aoLimpar, aoFechar }) {
  const ini = inicial || {};
  const literal = ini.t === 'list' && /^"/.test(ini.f1 || '');
  const [t, setT] = useState(ini.t || 'list');
  const [op, setOp] = useState(ini.op || 'between');
  const [f1, setF1] = useState(ini.t === 'list' ? '' : mostrarParametro(ini.f1, ini.t));
  const [f2, setF2] = useState(mostrarParametro(ini.f2, ini.t));
  const [origem, setOrigem] = useState(ini.t === 'list' && !literal ? 'faixa' : 'itens');
  const [itens, setItens] = useState(literal ? String(ini.f1).replace(/^"|"$/g, '').replace(/""/g, '"').split(',').map((x) => x.trim()).join('\n') : '');
  const [faixaLista, setFaixaLista] = useState(ini.t === 'list' && !literal ? mostrarParametro(ini.f1, 'list').replace(/^=/, '') : '');
  const [vz, setVz] = useState(inicial ? !!ini.vz : true);
  const [seta, setSeta] = useState(!ini.sd);
  const [mi, setMi] = useState(!!ini.mi);
  const [mit, setMit] = useState(ini.mit || '');
  const [mim, setMim] = useState(ini.mim || '');
  const [me, setMe] = useState(inicial ? !!ini.me : true);
  const [ee, setEe] = useState(ini.ee || 'stop');
  const [met, setMet] = useState(ini.met || '');
  const [mem, setMem] = useState(ini.mem || '');
  const [aba, setAba] = useState('regra');
  const [erro, setErro] = useState('');

  const rotuloDados = { whole: 'Número inteiro', decimal: 'Número', date: 'Data', time: 'Hora', textLength: 'Tamanho do texto' }[t] || '';
  const montar = () => {
    const r = { fx: faixaTexto, t };
    if (t === 'any') {
      if (!mi || (!mit && !mim)) return { erro: 'Escolha um tipo de regra, ou ligue o aviso ao selecionar com um texto.' };
    } else if (t === 'list') {
      if (origem === 'itens') {
        const lista = itens.split(/[\n;,]/).map((x) => x.trim()).filter(Boolean);
        if (!lista.length) return { erro: 'Escreva pelo menos um item da lista (um por linha).' };
        const txt = lista.join(',');
        if (txt.length > 250) return { erro: 'A lista escrita passou de 250 letras (limite do Excel). Ponha os itens numa faixa de células e use "Faixa ou nome".' };
        r.f1 = '"' + txt.replace(/"/g, '""') + '"';
      } else {
        const a = lerParametro(faixaLista.trim().startsWith('=') ? faixaLista : '=' + faixaLista, 'list');
        if (a.erro) return { erro: 'A faixa da lista: ' + a.erro };
        r.f1 = a.f;
      }
      if (!seta) r.sd = 1;
    } else if (t === 'custom') {
      const a = lerParametro(f1.trim().startsWith('=') ? f1 : '=' + f1, t);
      if (a.erro) return { erro: 'A fórmula: ' + a.erro };
      r.f1 = a.f;
    } else {
      r.op = op === 'between' ? undefined : op;
      const a = lerParametro(f1, t);
      if (a.erro) return { erro: (eh2(op) ? 'O primeiro valor: ' : 'O valor: ') + a.erro };
      r.f1 = a.f;
      if (eh2(op)) { const b = lerParametro(f2, t); if (b.erro) return { erro: 'O segundo valor: ' + b.erro }; r.f2 = b.f; }
    }
    if (vz) r.vz = 1;
    if (mi) { r.mi = 1; if (mit.trim()) r.mit = mit.trim().slice(0, 32); if (mim.trim()) r.mim = mim.trim().slice(0, 255); }
    if (me && t !== 'any') { r.me = 1; if (ee !== 'stop') r.ee = ee; if (met.trim()) r.met = met.trim().slice(0, 32); if (mem.trim()) r.mem = mem.trim().slice(0, 255); }
    return { r };
  };
  const aplicar = () => {
    const m = montar();
    if (m.erro) { setErro(m.erro); return; }
    aoAplicar(m.r); aoFechar();
  };
  const aba2 = (id, nome) => <button type="button" role="tab" aria-selected={aba === id} className={'rg-aba' + (aba === id ? ' on' : '')} onClick={() => setAba(id)}>{nome}</button>;
  return (
    <Janela titulo="Validação de dados" icone="validacao" subtitulo={faixaTexto ? 'Vale em ' + faixaTexto : undefined} aoFechar={aoFechar} classe="rg-jan" rodape={(
      <>
        {inicial && <button type="button" className="btn sm perigo" data-val-limpar onClick={() => { aoLimpar(); aoFechar(); }}>Limpar regra</button>}
        <span style={{ flex: 1 }} />
        <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn sm primary" data-val-aplicar onClick={aplicar}>Aplicar</button>
      </>
    )}>
      <div className="janela-c rg-corpo" data-validacao>
        <p className="rg-sub">Vale para: <b>{faixaTexto}</b></p>
        <div className="rg-abas" role="tablist">{aba2('regra', 'Regra')}{aba2('aviso', 'Aviso ao selecionar')}{aba2('erro', 'Alerta de erro')}</div>
        {aba === 'regra' && (
          <div className="rg-form">
            <label className="rg-campo"><span>Permitir</span>
              <select value={t} data-val-tipo onChange={(ev) => { setT(ev.target.value); setErro(''); }}>
                {TIPOS_VALIDACAO.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
              </select>
            </label>
            {t === 'list' && (
              <>
                <div className="rg-radios" role="radiogroup" aria-label="De onde vêm os itens">
                  <label><input type="radio" name="rg-origem" checked={origem === 'itens'} onChange={() => setOrigem('itens')} /> Escrever os itens aqui</label>
                  <label><input type="radio" name="rg-origem" checked={origem === 'faixa'} onChange={() => setOrigem('faixa')} /> Usar uma faixa ou um nome</label>
                </div>
                {origem === 'itens'
                  ? <label className="rg-campo col"><span>Itens (um por linha)</span><textarea rows={5} value={itens} data-val-itens onChange={(ev) => { setItens(ev.target.value); setErro(''); }} placeholder={'Conforme\nNão conforme\nNão se aplica'} /></label>
                  : <label className="rg-campo col"><span>Faixa ou nome dos itens</span><input value={faixaLista} data-val-faixa spellCheck={false} onChange={(ev) => { setFaixaLista(ev.target.value); setErro(''); }} placeholder="Apoio!A2:A20   ou   Analistas   ou   INDIRETO(&quot;Tabela[Coluna]&quot;)" /><small>Os itens acompanham a faixa: se você mudar a lista lá, a seta daqui muda junto.</small></label>}
                <label className="rg-chk"><input type="checkbox" checked={seta} onChange={(ev) => setSeta(ev.target.checked)} /> Mostrar a seta da lista na célula</label>
              </>
            )}
            {t !== 'list' && t !== 'custom' && t !== 'any' && (
              <>
                <label className="rg-campo"><span>Dados</span>
                  <select value={op} onChange={(ev) => setOp(ev.target.value)}>{OPERADORES.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select>
                </label>
                <label className="rg-campo"><span>{eh2(op) ? (t === 'date' ? 'De' : t === 'textLength' ? 'Mínimo' : 'Mínimo') : rotuloDados}</span><input value={f1} data-val-f1 spellCheck={false} onChange={(ev) => { setF1(ev.target.value); setErro(''); }} placeholder={t === 'date' ? '01/01/2026' : t === 'time' ? '08:00' : '0'} /></label>
                {eh2(op) && <label className="rg-campo"><span>{t === 'date' ? 'Até' : 'Máximo'}</span><input value={f2} data-val-f2 spellCheck={false} onChange={(ev) => { setF2(ev.target.value); setErro(''); }} placeholder={t === 'date' ? '31/12/2026' : t === 'time' ? '18:00' : '100'} /></label>}
                <small className="rg-dica">Dá para usar uma célula ou uma conta, como =B2 ou =HOJE().</small>
              </>
            )}
            {t === 'custom' && (
              <label className="rg-campo col"><span>Fórmula (precisa dar VERDADEIRO para aceitar)</span><input value={f1} data-val-f1 spellCheck={false} onChange={(ev) => { setF1(ev.target.value); setErro(''); }} placeholder="=CONT.SE($B$2:$B$100;B2)=1" /><small>A conta é feita como se o valor novo já estivesse na célula. Exemplo acima: não deixa repetir.</small></label>
            )}
            {t !== 'any' && <label className="rg-chk"><input type="checkbox" checked={vz} onChange={(ev) => setVz(ev.target.checked)} /> Aceitar célula vazia</label>}
          </div>
        )}
        {aba === 'aviso' && (
          <div className="rg-form">
            <label className="rg-chk"><input type="checkbox" checked={mi} onChange={(ev) => setMi(ev.target.checked)} /> Mostrar um aviso quando a célula for selecionada</label>
            <label className="rg-campo"><span>Título</span><input value={mit} maxLength={32} disabled={!mi} onChange={(ev) => setMit(ev.target.value)} /></label>
            <label className="rg-campo col"><span>Mensagem</span><textarea rows={3} maxLength={255} value={mim} disabled={!mi} onChange={(ev) => setMim(ev.target.value)} placeholder="Ex.: Escolha na lista." /></label>
          </div>
        )}
        {aba === 'erro' && (
          <div className="rg-form">
            <label className="rg-chk"><input type="checkbox" checked={me} onChange={(ev) => setMe(ev.target.checked)} /> Mostrar um alerta quando digitarem algo que não vale</label>
            <label className="rg-campo"><span>Estilo</span><select value={ee} disabled={!me} onChange={(ev) => setEe(ev.target.value)}>{ESTILOS_ERRO.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
            <label className="rg-campo"><span>Título</span><input value={met} maxLength={32} disabled={!me} onChange={(ev) => setMet(ev.target.value)} placeholder="ATENÇÃO" /></label>
            <label className="rg-campo col"><span>Mensagem</span><textarea rows={3} maxLength={255} value={mem} disabled={!me} onChange={(ev) => setMem(ev.target.value)} placeholder="Este valor não está de acordo com a regra de validação desta célula." /></label>
          </div>
        )}
        {erro && <p className="rg-erro" role="alert">{erro}</p>}
      </div>
    </Janela>
  );
}

/** Lista (seta) da célula: itens, busca ao digitar, teclado. */
export function ListaSuspensa({ x, y, w, itens, atual, aoEscolher, aoFechar, aviso }) {
  const ref = useRef(null);
  const [i, setI] = useState(() => { const k = itens.findIndex((it) => it.t === atual || String(it.v) === String(atual)); return k < 0 ? 0 : k; });
  const [busca, setBusca] = useState('');
  useEffect(() => { if (ref.current) ref.current.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const el = ref.current && ref.current.querySelector('[aria-selected="true"]');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [i]);
  useEffect(() => {
    const fora = (ev) => { if (ref.current && !ref.current.contains(ev.target) && !(ev.target.closest && ev.target.closest('[data-lista-seta]'))) aoFechar(); };
    const t = setTimeout(() => addEventListener('pointerdown', fora), 0);
    return () => { clearTimeout(t); removeEventListener('pointerdown', fora); };
  }, [aoFechar]);
  const tecla = (ev) => {
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); aoFechar(); return; }
    if (ev.key === 'ArrowDown') { ev.preventDefault(); setI((k) => Math.min(itens.length - 1, k + 1)); return; }
    if (ev.key === 'ArrowUp') { ev.preventDefault(); setI((k) => Math.max(0, k - 1)); return; }
    if (ev.key === 'Home') { ev.preventDefault(); setI(0); return; }
    if (ev.key === 'End') { ev.preventDefault(); setI(itens.length - 1); return; }
    if (ev.key === 'Enter' || ev.key === 'Tab') { ev.preventDefault(); if (itens[i]) aoEscolher(itens[i]); return; }
    if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      const b = (busca + ev.key).toLowerCase();
      setBusca(b);
      const k = itens.findIndex((it) => it.t.toLowerCase().startsWith(b));
      if (k >= 0) setI(k); else setBusca(ev.key.toLowerCase());
      clearTimeout(tecla.t); tecla.t = setTimeout(() => setBusca(''), 900);
    }
  };
  return (
    <div ref={ref} className="pl-lista" role="listbox" aria-label="Lista da célula" tabIndex={-1} data-lista data-esc-local style={{ left: x, top: y, minWidth: Math.max(120, w) }} onKeyDown={tecla}>
      {aviso && <div className="pl-lista-vazia">{aviso}</div>}
      {!aviso && itens.length === 0 && <div className="pl-lista-vazia">A lista está vazia.</div>}
      {itens.map((it, k) => (
        <div key={k} role="option" aria-selected={k === i} className={'pl-lista-i' + (k === i ? ' on' : '')} data-lista-item onPointerDown={(ev) => { ev.preventDefault(); aoEscolher(it); }} onMouseEnter={() => setI(k)}>{it.t || ' '}</div>
      ))}
    </div>
  );
}

/** Balão de comentário (ou de aviso da validação). */
export function Balao({ x, y, titulo, texto, respostas, tipo = 'com', maxW = 260 }) {
  return (
    <div className={'pl-balao ' + tipo} data-balao={tipo} style={{ left: x, top: y, maxWidth: maxW }} role="note">
      {titulo ? <b>{titulo}</b> : null}
      {texto ? <p>{texto}</p> : null}
      {(respostas || []).map((r, k) => <p key={k} className="resp"><b>{r.a || 'Resposta'}</b> {r.t}</p>)}
    </div>
  );
}

/* ============================================================
   Comentários
   ============================================================ */
export function JanelaComentario({ chaveCel, inicial, nomeInicial, aoSalvar, aoExcluir, aoFechar, somenteLeitura }) {
  const [t, setT] = useState(inicial ? inicial.t || '' : '');
  const [a, setA] = useState(nomeInicial || (inicial && inicial.a) || '');
  const [resp, setResp] = useState('');
  const campo = useRef(null);
  useEffect(() => { if (campo.current) campo.current.focus(); }, []);
  const salvar = () => {
    const txt = t.replace(/\s+$/, '');
    const respostas = [...((inicial && inicial.r) || []), ...(resp.trim() ? [{ a: a.trim(), t: resp.trim() }] : [])];
    if (!txt.trim() && !respostas.length) { aoFechar(); return; }
    aoSalvar({ ...(inicial || {}), t: txt, a: a.trim() || undefined, ...(respostas.length ? { r: respostas } : {}) });
    aoFechar();
  };
  return (
    <Janela titulo={`Comentário em ${chaveCel}`} icone="comentario" aoFechar={aoFechar} classe="rg-jan" rodape={(
      <>
        {inicial && !somenteLeitura && <button type="button" className="btn sm perigo" data-com-excluir onClick={() => { aoExcluir(); aoFechar(); }}>Excluir</button>}
        <span style={{ flex: 1 }} />
        <button type="button" className="btn sm" onClick={aoFechar}>{somenteLeitura ? 'Fechar' : 'Cancelar'}</button>
        {!somenteLeitura && <button type="button" className="btn sm primary" data-com-salvar onClick={salvar}>Salvar</button>}
      </>
    )}>
      <div className="janela-c rg-corpo" data-comentario>
        <label className="rg-campo col"><span>Comentário</span>
          <textarea ref={campo} rows={5} value={t} readOnly={somenteLeitura} data-com-texto onChange={(ev) => setT(ev.target.value)} placeholder="Escreva o comentário ou a observação desta célula." />
        </label>
        {inicial && inicial.r && inicial.r.length > 0 && (
          <div className="rg-resps"><b>Respostas</b>{inicial.r.map((r, k) => <p key={k}><b>{r.a || 'Resposta'}:</b> {r.t}</p>)}</div>
        )}
        {inicial && inicial.enc && !somenteLeitura && (
          <label className="rg-campo col"><span>Responder</span><textarea rows={2} value={resp} onChange={(ev) => setResp(ev.target.value)} /></label>
        )}
        {!somenteLeitura && <label className="rg-campo"><span>Seu nome (aparece no comentário)</span><input value={a} maxLength={60} onChange={(ev) => setA(ev.target.value)} placeholder="Opcional" /></label>}
        {inicial && inicial.enc && <small className="rg-dica">Veio como conversa do Excel 365. Ao salvar como .xlsx, a conversa vira uma anotação comum (o texto e as respostas ficam juntos).</small>}
      </div>
    </Janela>
  );
}

export function JanelaComentarios({ lista, aoIr, aoFechar }) {
  return (
    <Janela titulo={`Comentários desta aba (${lista.length})`} icone="comentario" aoFechar={aoFechar} classe="rg-jan" rodape={<button type="button" className="btn sm primary" onClick={aoFechar}>Fechar</button>}>
      <div className="janela-c rg-corpo" data-comentarios>
        {!lista.length && <p className="rg-sub">Esta aba não tem comentários. Para criar, clique numa célula e use Revisão › Comentário (ou o botão direito).</p>}
        {lista.map((q) => (
          <button key={q.k} type="button" className="rg-item" onClick={() => { aoIr(q.p.l, q.p.c); aoFechar(); }}>
            <b>{q.k}</b>
            <span>{textoDoComentario(q.x).replace(/\s+/g, ' ').slice(0, 140)}</span>
          </button>
        ))}
      </div>
    </Janela>
  );
}

/* ============================================================
   Formatação condicional
   ============================================================ */
const REALCES = [
  ['Vermelho claro', { fundo: '#ffc7ce', cor: '#9c0006' }],
  ['Amarelo', { fundo: '#ffeb9c', cor: '#9c5700' }],
  ['Verde', { fundo: '#c6efce', cor: '#006100' }],
  ['Azul claro', { fundo: '#ddebf7', cor: '#1f4e79' }],
  ['Só a letra vermelha', { cor: '#c00000', b: true }],
  ['Só a letra verde', { cor: '#00803c', b: true }],
  ['Cinza (inativo)', { fundo: '#e7e6e6', cor: '#7f7f7f' }],
];

function Amostra({ e, texto = 'Aa 123' }) {
  return <span className="rg-amostra" style={{ background: e.fundo || undefined, color: e.cor || undefined, fontWeight: e.b ? 700 : undefined, fontStyle: e.i ? 'italic' : undefined, textDecoration: [e.u ? 'underline' : '', e.st ? 'line-through' : ''].filter(Boolean).join(' ') || undefined }}>{texto}</span>;
}

function FormRegra({ regra, faixaTexto, aoOk, aoVoltar, cores, aoPegar }) {
  const r0 = regra || { t: 'cellIs', op: 'greaterThan', f1: '', e: { fundo: '#ffc7ce', cor: '#9c0006' } };
  const [t, setT] = useState(r0.t);
  const [op, setOp] = useState(r0.op || (r0.t === 'cellIs' ? 'equal' : 'greaterThan'));
  const [f1, setF1] = useState(r0.t === 'expression' ? mostrarParametro(r0.f1) : mostrarParametro(r0.f1));
  const [f2, setF2] = useState(mostrarParametro(r0.f2));
  const [tx, setTx] = useState(r0.tx || '');
  const [n, setN] = useState(r0.n || 10);
  const [pc, setPc] = useState(!!r0.pc);
  const [bx, setBx] = useState(!!r0.bx);
  const [ab, setAb] = useState(r0.ab !== 0);
  const [e, setE] = useState(r0.e || {});
  const [par, setPar] = useState(!!r0.par);
  const [fx, setFx] = useState(r0.fx || faixaTexto);
  const [erro, setErro] = useState('');
  const [qualCor, setQualCor] = useState('fundo');
  const mudaE = (p) => setE((x) => { const o = { ...x, ...p }; for (const k of Object.keys(o)) if (o[k] === undefined || o[k] === false) delete o[k]; return o; });
  const textoT = ['containsText', 'notContainsText', 'beginsWith', 'endsWith'].includes(t);
  const ok = () => {
    const r = { id: r0.id || novoIdRegra(), fx: fx.trim().toUpperCase().replace(/\s+/g, ' '), t, e: { ...e } };
    if (!faixasDe(r.fx).length) { setErro('Diga onde vale, por exemplo A2:A100 ou B:B.'); return; }
    if (!Object.keys(r.e).length) { setErro('Escolha pelo menos uma cor ou um destaque (negrito, itálico...).'); return; }
    if (t === 'cellIs') {
      r.op = op;
      const a = lerParametro(f1, 'x', true); if (a.erro) { setErro(a.erro); return; } r.f1 = a.f;
      if (eh2(op)) { const b = lerParametro(f2, 'x', true); if (b.erro) { setErro('O segundo valor: ' + b.erro); return; } r.f2 = b.f; }
    } else if (t === 'expression') {
      const a = lerParametro(f1.trim().startsWith('=') ? f1 : '=' + f1, 'x');
      if (a.erro) { setErro('A conta: ' + a.erro); return; }
      r.f1 = a.f;
    } else if (textoT) {
      if (!tx) { setErro('Escreva o texto.'); return; }
      r.tx = tx;
    } else if (t === 'top10') { r.n = Math.max(1, Math.floor(+n || 10)); if (pc) r.pc = 1; if (bx) r.bx = 1; } else if (t === 'aboveAverage') { if (!ab) r.ab = 0; }
    if (par) r.par = 1;
    aoOk(r);
  };
  return (
    <div className="rg-form rg-duas" data-cond-form>
      <div className="rg-col">
        <section className="rg-cartao">
          <span className="rg-cab">Quando</span>
          <label className="rg-campo"><span>Regra</span>
            <select value={t} data-cond-tipo onChange={(ev) => { setT(ev.target.value); setErro(''); }}>{TIPOS_REGRA.map(([k, nome]) => <option key={k} value={k}>{nome}</option>)}</select>
          </label>
          {t === 'cellIs' && (
            <>
              <label className="rg-campo"><span>For</span><select value={op} onChange={(ev) => setOp(ev.target.value)}>{OPERADORES.map(([k, nome]) => <option key={k} value={k}>{nome}</option>)}</select></label>
              <label className="rg-campo"><span>{eh2(op) ? 'De' : 'Valor'}</span><input value={f1} data-cond-f1 spellCheck={false} onChange={(ev) => { setF1(ev.target.value); setErro(''); }} placeholder="Um número, um texto ou =B2" /></label>
              {eh2(op) && <label className="rg-campo"><span>Até</span><input value={f2} spellCheck={false} onChange={(ev) => { setF2(ev.target.value); setErro(''); }} /></label>}
            </>
          )}
          {t === 'expression' && <label className="rg-campo col"><span>Conta (VERDADEIRO pinta a célula)</span><input value={f1} data-cond-f1 spellCheck={false} onChange={(ev) => { setF1(ev.target.value); setErro(''); }} placeholder="=$B2=&quot;Não conforme&quot;" /><small>Escreva como se fosse para a primeira célula da área; a conta acompanha as outras linhas. Use $ para travar a coluna.</small></label>}
          {textoT && <label className="rg-campo"><span>Texto</span><input value={tx} data-cond-tx onChange={(ev) => { setTx(ev.target.value); setErro(''); }} /></label>}
          {t === 'top10' && (
            <div className="rg-campo"><span>Quais</span>
              <div className="rg-linha">
                <select value={bx ? 'b' : 'a'} onChange={(ev) => setBx(ev.target.value === 'b')}><option value="a">Maiores</option><option value="b">Menores</option></select>
                <input type="number" min="1" value={n} style={{ width: 70 }} onChange={(ev) => setN(ev.target.value)} />
                <label className="rg-chk"><input type="checkbox" checked={pc} onChange={(ev) => setPc(ev.target.checked)} /> por cento</label>
              </div>
            </div>
          )}
          {t === 'aboveAverage' && <label className="rg-campo"><span>Quais</span><select value={ab ? 'a' : 'b'} onChange={(ev) => setAb(ev.target.value === 'a')}><option value="a">Acima da média</option><option value="b">Abaixo da média</option></select></label>}
          <label className="rg-campo"><span>Vale em</span><input value={fx} data-cond-fx spellCheck={false} onChange={(ev) => { setFx(ev.target.value); setErro(''); }} /></label>
        </section>
        <section className="rg-cartao">
          <span className="rg-cab">Modelos prontos</span>
          <div className="rg-realces" role="group" aria-label="Modelos de destaque">
            {REALCES.map(([nome, est]) => <button key={nome} type="button" className={'rg-realce' + (JSON.stringify(est) === JSON.stringify(e) ? ' on' : '')} title={nome} data-realce={nome} onClick={() => setE({ ...est })}><Amostra e={est} texto="Aa" /><span>{nome}</span></button>)}
          </div>
        </section>
        <section className="rg-cartao">
          <div className="rg-linha rg-topo">
            <span className="rg-cab">Cores</span>
            <div className="rg-seg" role="group" aria-label="Qual cor">
              <button type="button" aria-pressed={qualCor === 'fundo'} data-cond-qual="fundo" onClick={() => setQualCor('fundo')}>Fundo</button>
              <button type="button" aria-pressed={qualCor === 'cor'} data-cond-qual="cor" onClick={() => setQualCor('cor')}>Letra</button>
            </div>
          </div>
          {qualCor === 'fundo'
            ? <PainelCores key="f" valor={e.fundo} semCor="Sem cor" cores={cores} aoPegar={aoPegar ? () => aoPegar('fundo') : undefined} leitura={{ letra: e.cor }} aoMudar={(v) => mudaE({ fundo: v })} />
            : <PainelCores key="l" valor={e.cor} semCor="Automática" cores={cores} aoPegar={aoPegar ? () => aoPegar('cor') : undefined} leitura={{ fundo: e.fundo }} aoMudar={(v) => mudaE({ cor: v })} />}
          <div className="rg-linha rg-estilos" role="group" aria-label="Estilo da letra">
            <label className="rg-chk"><input type="checkbox" checked={!!e.b} onChange={(ev) => mudaE({ b: ev.target.checked })} /> <b>Negrito</b></label>
            <label className="rg-chk"><input type="checkbox" checked={!!e.i} onChange={(ev) => mudaE({ i: ev.target.checked })} /> <i>Itálico</i></label>
            <label className="rg-chk"><input type="checkbox" checked={!!e.u} onChange={(ev) => mudaE({ u: ev.target.checked })} /> <u>Sublinhado</u></label>
            <label className="rg-chk"><input type="checkbox" checked={!!e.st} onChange={(ev) => mudaE({ st: ev.target.checked })} /> <s>Riscado</s></label>
          </div>
        </section>
      </div>
      <div className="rg-col">
        <section className="rg-cartao rg-previa-c">
          <span className="rg-cab">Como fica</span>
          <div className="rg-previa"><Amostra e={e} texto="Rede 1   0,70" /></div>
          <p className="rg-dica">Assim ficam as células de {fx || 'a área'} onde a regra valer.</p>
          <label className="rg-chk"><input type="checkbox" checked={par} onChange={(ev) => setPar(ev.target.checked)} /> Se esta regra valer, não olhar as de baixo</label>
        </section>
        {erro && <p className="rg-erro" role="alert">{erro}</p>}
        <div className="rg-linha rg-botoes">
          <button type="button" className="btn sm" onClick={aoVoltar}>Voltar</button>
          <button type="button" className="btn sm primary" data-cond-ok onClick={ok}>OK</button>
        </div>
      </div>
    </div>
  );
}

export function JanelaCondicional({ lista, faixaTexto, selecao, aoSalvar, aoFechar, cores, aoPegar }) {
  const [regras, setRegras] = useState(() => lista.map((r) => (r.id ? r : { ...r, id: novoIdRegra() })));
  const [modo, setModo] = useState(null); // null = lista; { regra } = formulário
  const [soSel, setSoSel] = useState(false);
  const mostradas = useMemo(() => (soSel && selecao ? regras.filter(selecao) : regras), [regras, soSel, selecao]);
  const mover = (id, d) => setRegras((l) => { const i = l.findIndex((r) => r.id === id); const j = i + d; if (i < 0 || j < 0 || j >= l.length) return l; const o = [...l]; [o[i], o[j]] = [o[j], o[i]]; return o; });
  const salvarRegra = (r) => { setRegras((l) => (l.some((x) => x.id === r.id) ? l.map((x) => (x.id === r.id ? r : x)) : [r, ...l])); setModo(null); };
  const mudou = JSON.stringify(regras) !== JSON.stringify(lista);
  return (
    <Janela titulo="Formatação condicional" icone="condicional" subtitulo={faixaTexto ? 'Seleção: ' + faixaTexto : undefined} aoFechar={aoFechar} classe={'rg-jan rg-larga' + (modo ? ' rg-form-on' : '')} rodape={modo ? null : (
      <>
        <button type="button" className="btn sm" data-cond-limpar-aba disabled={!regras.length} onClick={() => setRegras([])}>Limpar todas da aba</button>
        <span style={{ flex: 1 }} />
        <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn sm primary" data-cond-aplicar disabled={!mudou} onClick={() => { aoSalvar(regras); aoFechar(); }}>Aplicar</button>
      </>
    )}>
      <div className="janela-c rg-corpo" data-condicional>
        {modo
          ? <FormRegra regra={modo.regra} faixaTexto={faixaTexto} cores={cores} aoPegar={aoPegar} aoOk={salvarRegra} aoVoltar={() => setModo(null)} />
          : (
            <>
              <div className="rg-linha rg-topo">
                <button type="button" className="btn sm primary" data-cond-nova onClick={() => setModo({ regra: null })}><Icone n="plus" /> Nova regra</button>
                {selecao && <label className="rg-chk"><input type="checkbox" checked={soSel} onChange={(ev) => setSoSel(ev.target.checked)} /> Só as que mexem na seleção ({faixaTexto})</label>}
              </div>
              {!mostradas.length && <p className="rg-sub">{regras.length ? 'Nenhuma regra mexe na seleção.' : 'Esta aba ainda não tem regras. Clique em "Nova regra": por exemplo, pintar de vermelho o que for maior que 10, ou o texto "Não conforme".'}</p>}
              <ol className="rg-regras">
                {mostradas.map((r) => {
                  const i = regras.findIndex((x) => x.id === r.id);
                  return (
                    <li key={r.id} data-regra={r.id} className="rg-regra">
                      <Amostra e={r.e || {}} />
                      <div className="rg-regra-t"><b>{descreverRegra(r)}</b><span>vale em {r.fx}{r.par ? ' · para aqui se valer' : ''}</span></div>
                      <div className="rg-regra-b">
                        <button type="button" className="iconbtn" aria-label="Mais força (sobe)" title="Mais força: sobe" disabled={i === 0} onClick={() => mover(r.id, -1)}><Icone n="setaCima" /></button>
                        <button type="button" className="iconbtn" aria-label="Menos força (desce)" title="Menos força: desce" disabled={i === regras.length - 1} onClick={() => mover(r.id, 1)}><Icone n="setaBaixo" /></button>
                        <button type="button" className="iconbtn" aria-label="Editar a regra" title="Editar" data-cond-editar onClick={() => setModo({ regra: r })}><Icone n="renomear" /></button>
                        <button type="button" className="iconbtn" aria-label="Excluir a regra" title="Excluir" data-cond-excluir onClick={() => setRegras((l) => l.filter((x) => x.id !== r.id))}><Icone n="lixeira" /></button>
                      </div>
                    </li>
                  );
                })}
              </ol>
              {regras.length > 1 && <p className="rg-dica">As regras de cima têm mais força: se duas pintam a mesma coisa, vale a de cima.</p>}
            </>
          )}
      </div>
    </Janela>
  );
}

/** Resumo para o relatório e para a Verificação. */
export const resumoValidacao = descreverValidacao;
