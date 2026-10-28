/* EFCdocs — Planilha: o campo de edição (na célula e na barra de fórmula), com as cores da fórmula por trás
   do texto e a ajuda (dica de argumento, autocompletar, erro antes do Enter, prévia, nome da coluna). */
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { pedacosColoridos, assinatura } from './ajuda.js';
import { Icone } from '../ui/comum.jsx';

/** O campo: textarea transparente por cima das cores. */
export const CampoFormula = forwardRef(function CampoFormula({ valor, cursor, aoMudar, aoTecla, aoFocar, aoSair, classe = '', estilo, rotulo, modoTeclado, focar, linhaUnica, fantasma, corretor }, ref) {
  const ta = useRef(null);
  const fundo = useRef(null);
  const selUser = useRef(null); // v0.5.1: trecho selecionado de propósito (Ctrl+A, arrastar): o cursor automático não pode desfazer
  useImperativeHandle(ref, () => ({
    focar: () => ta.current && ta.current.focus(),
    el: () => ta.current,
    posicao: () => (ta.current ? ta.current.selectionStart : 0),
  }));
  useLayoutEffect(() => {
    const t = ta.current;
    if (!t || document.activeElement !== t || cursor == null) return;
    const u = selUser.current;
    if (u && t.selectionStart === u.s && t.selectionEnd === u.e) return;
    if (t.selectionStart !== cursor || t.selectionEnd !== cursor) {
      try { t.setSelectionRange(cursor, cursor); } catch { /* sem cursor */ }
    }
  }, [cursor, valor]);
  useEffect(() => {
    if (focar && ta.current && document.activeElement !== ta.current) {
      ta.current.focus();
      const p = cursor == null ? ta.current.value.length : cursor;
      try { ta.current.setSelectionRange(p, p); } catch { /* sem cursor */ }
    }
  }, [focar]); // eslint-disable-line react-hooks/exhaustive-deps
  const ehFormula = valor.startsWith('=');
  const { pedacos } = ehFormula ? pedacosColoridos(valor.slice(1), cursor == null ? -1 : cursor - 1) : { pedacos: [] };
  const sincRolagem = () => { if (fundo.current && ta.current) { fundo.current.scrollTop = ta.current.scrollTop; fundo.current.scrollLeft = ta.current.scrollLeft; } };
  return (
    <div className={'ef ' + classe + (ehFormula ? ' formula' : '')} style={estilo}>
      {ehFormula && (
        <div className="ef-cores" ref={fundo} aria-hidden="true">
          <span className="tk-op">=</span>
          {pedacos.map((p, i) => (p.cls
            ? <span key={i} className={p.cls} style={p.cor ? { color: p.cor } : undefined}>{p.txt}</span>
            : <span key={i}>{p.txt}</span>))}
          <span>{'​'}</span>
        </div>
      )}
      {!ehFormula && fantasma && fantasma.length > valor.length && (
        <div className="ef-cores" aria-hidden="true"><span style={{ color: 'transparent' }}>{valor}</span><span className="ef-fantasma">{fantasma.slice(valor.length)}</span></div>
      )}
      <textarea ref={ta} className="ef-campo" value={valor} spellCheck={!!corretor && !ehFormula} lang="pt-BR" autoComplete="off" autoCorrect="off" autoCapitalize="off"
        aria-label={rotulo} rows={1} inputMode={modoTeclado || 'text'} wrap={linhaUnica ? 'off' : 'soft'}
        onChange={(ev) => { selUser.current = null; aoMudar(ev.target.value, ev.target.selectionStart); }}
        onSelect={(ev) => {
          const { selectionStart: a, selectionEnd: z } = ev.target;
          if (a !== z) { selUser.current = { s: a, e: z }; if (z !== cursor) aoMudar(ev.target.value, z, true); } else { selUser.current = null; if (a !== cursor) aoMudar(ev.target.value, a, true); }
          sincRolagem();
        }}
        onScroll={sincRolagem}
        onKeyDown={aoTecla} onFocus={aoFocar} onBlur={aoSair} />
    </div>
  );
});

/** A caixa de ajuda que aparece embaixo do campo enquanto se digita a fórmula. */
export function AjudaFormula({ ctxCursor, sugest, selSug, aoEscolher, problemas, aoCorrigir, aoCorrigirTudo, previa, etiquetas, estilo, aoFecharSugestoes }) {
  const f = ctxCursor && ctxCursor.funcao;
  const sig = f ? assinatura(f, ctxCursor.arg) : null;
  const erros = problemas.filter((p) => p.nivel === 'erro' && !(sugest.length && p.rotulo === 'Pôr aspas')); /* "Não sei o que é TET" só depois de fechar a lista de sugestões */
  const outros = problemas.filter((p) => p.nivel !== 'erro');
  const nada = !sig && !sugest.length && !problemas.length && !previa && !(etiquetas && etiquetas.length);
  if (nada) return null;
  return (
    <div className="pl-ajuda card" style={estilo} onPointerDown={(ev) => ev.preventDefault()} role="dialog" aria-label="Ajuda da fórmula">
      {sugest.length > 0 && (
        <ul className="pl-sug" role="listbox" aria-label="Sugestões">
          {sugest.map((s, i) => (
            <li key={s.tipo + s.rotulo} role="option" aria-selected={i === selSug}>
              <button type="button" className={i === selSug ? 'sel' : ''} onClick={() => aoEscolher(s)}>
                <Icone n={s.tipo === 'fn' ? 'funcao' : s.tipo === 'nome' ? 'renomear' : 'planilha'} />
                <b>{s.rotulo}</b><span>{s.detalhe}</span>
              </button>
            </li>
          ))}
          <li className="pl-sug-dica">Tab ou Enter completa · Esc fecha</li>
        </ul>
      )}
      {sig && !sugest.length && (
        <div className="pl-sig">
          <div className="pl-sig-l">
            <b>{f.pt}</b>(
            {sig.partes.map((p, i) => (
              <span key={i}>{i > 0 && '; '}<span className={p.atual ? 'atual' : ''}>{p.n}</span></span>
            ))})
          </div>
          {sig.atual && <div className="pl-sig-d"><b>{sig.atual.n}</b>: {sig.atual.d}</div>}
          {!sig.atual && ctxCursor.fechada && <div className="pl-sig-d">{f.desc}</div>}
          <div className="pl-sig-e">Exemplo: <code>{f.ex}</code> <span className="pl-sig-n">(só um modelo: troque as colunas e os valores pelos da sua planilha)</span></div>
        </div>
      )}
      {erros.length > 0 && (
        <div className="pl-prob">
          {erros.map((p, i) => (
            <div key={i} className="pl-prob-l erro"><Icone n="aviso" /><span>{p.msg}</span>{p.troca && <button type="button" className="btn sm" onClick={() => aoCorrigir(p)}>{p.rotulo || 'Corrigir'}</button>}</div>
          ))}
          {erros.filter((p) => p.troca).length > 1 && <button type="button" className="btn sm primary pl-prob-todos" onClick={aoCorrigirTudo}>Corrigir {erros.filter((p) => p.troca).length === 2 ? 'os dois' : 'todos'}</button>}
        </div>
      )}
      {outros.length > 0 && (
        <div className="pl-prob">
          {outros.map((p, i) => (
            <div key={i} className={'pl-prob-l ' + p.nivel}><Icone n="info" /><span>{p.msg}</span>{p.troca && <button type="button" className="btn sm" onClick={() => aoCorrigir(p)}>{p.rotulo || 'Corrigir'}</button>}</div>
          ))}
        </div>
      )}
      {etiquetas && etiquetas.length > 0 && (
        <div className="pl-etq">{etiquetas.map((e, i) => <span key={i}><b style={{ color: e.cor }}>{e.ref}</b> ‹{e.titulo}›</span>)}</div>
      )}
      {previa && <div className="pl-previa">Prévia: <b>{previa}</b></div>}
    </div>
  );
}
