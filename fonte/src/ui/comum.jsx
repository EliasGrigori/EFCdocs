/* EFCdocs — peças comuns da tela: ícone, janelas, avisos, rotas e datas. */
import { useEffect, useRef, useState } from 'react';
import { ICONES } from './icones.js';

export function Icone({ n, className, titulo }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden={titulo ? undefined : true} role={titulo ? 'img' : undefined} aria-label={titulo} className={className}
      dangerouslySetInnerHTML={{ __html: ICONES[n] || '' }} />
  );
}

export function useMedia(consulta) {
  const ler = () => (typeof matchMedia !== 'undefined' ? matchMedia(consulta).matches : false);
  const [v, setV] = useState(ler);
  useEffect(() => {
    const m = matchMedia(consulta);
    const f = () => setV(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, [consulta]);
  return v;
}

export function useRota() {
  const ler = () => location.hash.replace(/^#\/?/, '') || '';
  const [rota, setRota] = useState(ler);
  useEffect(() => {
    const f = () => setRota(ler());
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
  return rota;
}

export const irPara = (rota) => {
  location.hash = '#/' + rota;
};

const dois = (n) => String(n).padStart(2, '0');
export function dataHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()} ${dois(d.getHours())}:${dois(d.getMinutes())}`;
}
export function hora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return dois(d.getHours()) + ':' + dois(d.getMinutes());
}

export function Marca({ className }) {
  return <img className={className} src="icon-192.png" alt="" width="34" height="34" />;
}

/** Janela (diálogo). Esc fecha; toque fora fecha. */
export function Janela({ titulo, children, aoFechar, classe = '', rodape, rotulo }) {
  const ref = useRef(null);
  useEffect(() => {
    const tecla = (ev) => {
      if (ev.key === 'Escape') {
        ev.stopPropagation();
        aoFechar();
      }
    };
    addEventListener('keydown', tecla, true);
    const foco = ref.current && ref.current.querySelector('input,textarea,button.primary,button.perigo,select');
    if (foco) foco.focus();
    return () => removeEventListener('keydown', tecla, true);
  }, [aoFechar]);
  return (
    <div className="fundo" onMouseDown={(ev) => { if (ev.target === ev.currentTarget) aoFechar(); }}>
      <div className={'janela ' + classe} role="dialog" aria-modal="true" aria-label={rotulo || titulo} ref={ref}>
        {titulo && (
          <div className="janela-h">
            <h2>{titulo}</h2>
            <button type="button" className="iconbtn" aria-label="Fechar" onClick={aoFechar}><Icone n="x" /></button>
          </div>
        )}
        {children}
        {rodape && <div className="janela-r">{rodape}</div>}
      </div>
    </div>
  );
}

/** Pergunta simples: texto, campo opcional (linha ou várias linhas) e confirmar. */
export function Pergunta({ p, aoFechar }) {
  const [valor, setValor] = useState(p.valor || '');
  const [erro, setErro] = useState('');
  const confirmar = () => {
    if (p.campo) {
      const e = p.validar ? p.validar(valor) : '';
      if (e) { setErro(e); return; }
    }
    p.aoConfirmar(p.varias ? valor : valor.trim());
    aoFechar();
  };
  return (
    <Janela titulo={p.titulo} aoFechar={aoFechar} rodape={(
      <>
        <button type="button" className="btn sm" onClick={aoFechar}>Voltar</button>
        <button type="button" className={'btn sm ' + (p.perigo ? 'perigo' : 'primary')} onClick={confirmar}>{p.confirmar || 'Confirmar'}</button>
      </>
    )}>
      <div className="janela-c">
        {p.texto && <p>{p.texto}</p>}
        {p.campo && (
          <label className="campo-t">
            {p.campo}
            {p.varias
              ? <textarea value={valor} maxLength={p.max || 2000} rows={4} onChange={(ev) => { setValor(ev.target.value); setErro(''); }}
                  onKeyDown={(ev) => { if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) confirmar(); }} />
              : <input value={valor} maxLength={p.max || 120} inputMode={p.modo} placeholder={p.dica} onChange={(ev) => { setValor(ev.target.value); setErro(''); }}
                  onKeyDown={(ev) => { if (ev.key === 'Enter') confirmar(); }} />}
            <span className="erro-t" role="alert">{erro}</span>
          </label>
        )}
      </div>
    </Janela>
  );
}

export function Avisos({ lista, tirar }) {
  return (
    <div className="toasts" aria-live="polite">
      {lista.map((a) => (
        <div className="toast" role="status" key={a.id}>
          <Icone n={a.ic || 'info'} />
          <span>{a.texto}</span>
          {a.acao && <button type="button" onClick={() => { a.acao.fazer(); tirar(a.id); }}>{a.acao.rotulo}</button>}
        </div>
      ))}
    </div>
  );
}
