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

/* ---------- v0.6.0: pilha do Esc ----------
   Janela sobre janela (ou menu sobre janela): o Esc fecha só a de cima e devolve o teclado para a de baixo.
   Um único ouvinte, registrado antes de todos (captura na window), decide quem fecha. */
const pilhaEsc = [];
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape' || !pilhaEsc.length || ev.defaultPrevented) return;
    const topo = pilhaEsc[pilhaEsc.length - 1];
    if (topo.deixar && topo.deixar(ev)) return;
    if (ev.target && ev.target.closest && ev.target.closest('[data-esc-local]')) return; // a peça de dentro trata o próprio Esc (ex.: lista suspensa)
    ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
    const anterior = topo.foco;
    topo.fechar.current();
    setTimeout(() => {
      const a = document.activeElement;
      if ((!a || a === document.body || !a.isConnected) && anterior && anterior.isConnected) anterior.focus({ preventScroll: true });
    }, 0);
  }, true);
}
/** Liga o Esc de uma camada (janela, menu, painel). `el` (opcional) é o elemento da camada. */
export function usarEsc(fechar, ativo = true, el = null, deixar = null) {
  const ref = useRef(fechar);
  ref.current = fechar;
  useEffect(() => {
    if (!ativo) return undefined;
    const item = { fechar: ref, el, deixar, foco: document.activeElement };
    pilhaEsc.push(item);
    return () => { const i = pilhaEsc.indexOf(item); if (i >= 0) pilhaEsc.splice(i, 1); };
  }, [ativo]); // eslint-disable-line react-hooks/exhaustive-deps
}
/** Quantas camadas abertas respondem ao Esc (para testes e para quem precisa saber se há janela por cima). */
export const camadasAbertas = () => pilhaEsc.length;

/** Janela (diálogo). Esc fecha só a de cima; toque fora fecha.
    v0.6.0 (estilo Camadas): cabeçalho com ícone opcional e subtítulo. */
export function Janela({ titulo, children, aoFechar, classe = '', rodape, rotulo, icone, subtitulo }) {
  const ref = useRef(null);
  usarEsc(aoFechar, true, ref);
  useEffect(() => {
    const foco = ref.current && (ref.current.querySelector('[data-foco]') || ref.current.querySelector('input,textarea,button.primary,button.perigo,select'));
    if (foco) foco.focus();
  }, []);
  return (
    <div className="fundo" onMouseDown={(ev) => { if (ev.target === ev.currentTarget) aoFechar(); }}>
      <div className={'janela ' + classe} role="dialog" aria-modal="true" aria-label={rotulo || titulo} ref={ref}>
        {titulo && (
          <div className="janela-h">
            {icone && <span className="janela-ic" aria-hidden="true"><Icone n={icone} /></span>}
            <h2>{titulo}{subtitulo && <span className="janela-sub">{subtitulo}</span>}</h2>
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
    <Janela titulo={p.titulo} icone={p.icone || (p.perigo ? 'lixeira' : 'pergunta')} aoFechar={aoFechar} rodape={(
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

export function Avisos({ lista, tirar, menu }) {
  return (
    <div className="toasts" aria-live="polite" data-menu={menu}>
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
