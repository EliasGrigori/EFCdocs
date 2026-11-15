/* Vértice Docs v0.6.20 · menu da coluna (R13 do layout da família): filtro e ordem saindo do título de cada coluna.
   Abre crescendo do botão; tocando no botão de outra coluna com o menu aberto, o mesmo menu desliza até lá;
   ao fechar, encolhe (a camada de fluidez cuida da saída). Mexe no mesmo filtro do botão "Filtro" da tela. */
import { useEffect, useLayoutEffect, useRef } from 'react';
import { TIPOS } from '../nucleo/modelo.js';
import { Icone, usarEsc } from './comum.jsx';
import { Mov } from './fluidez.js';

/** Quais colunas têm menu e quando cada uma está "em uso" (o botão do título fica dourado). */
export const MENUS = {
  nome: { rot: 'Nome', emUso: (f) => !!f.q || f.ordem === 'nome' },
  tipo: { rot: 'Tipo', emUso: (f) => f.tipo !== 'todos' },
  quando: { rot: 'Data', emUso: (f) => f.ordem === 'antigos' },
};

export function BotaoColuna({ id, rot, f, aberta, abrir }) {
  const uso = MENUS[id].emUso(f);
  return (
    <button type="button" className={'col-b' + (uso ? ' uso' : '')} data-col-menu={id} aria-haspopup="menu" aria-expanded={aberta} aria-label={`Filtro e ordem da coluna ${rot}` + (uso ? ' (em uso)' : '')}
      title="Filtro e ordem desta coluna" onClick={(ev) => { ev.stopPropagation(); abrir(aberta ? null : id); }}>
      <Icone n={uso ? 'filtro' : 'chevronBaixo'} />
    </button>
  );
}

const Op = ({ on, children, ...r }) => <button type="button" role="menuitemradio" aria-checked={on} className={'col-op' + (on ? ' on' : '')} {...r}><span className="col-v" aria-hidden="true">{on ? <Icone n="check" /> : null}</span>{children}</button>;

export function MenuColuna({ id, f, mudar, tipos, fechar, tabela }) {
  const ref = useRef(null), de = useRef(null);
  usarEsc(fechar, true);
  /* o lugar: embaixo do botão da coluna, sem sair da janela */
  useLayoutEffect(() => {
    const m = ref.current, b = document.querySelector(`[data-efl-tabela="${tabela}"] [data-col-menu="${id}"]`); if (!m || !b) return;
    const r = b.getBoundingClientRect(), w = m.offsetWidth;
    const x = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)), y = r.bottom + 6;
    m.style.left = x + 'px'; m.style.top = y + 'px';
    const ant = de.current; de.current = { x, y };
    /* trocou de coluna com o menu aberto: desliza da coluna antiga até a nova (R13) */
    if (ant && (ant.x !== x || ant.y !== y) && !Mov.reduzido()) {
      m.getAnimations().forEach((a) => a.cancel());
      m.animate([{ transform: `translate(${ant.x - x}px, ${ant.y - y}px)` }, { transform: 'none' }], { duration: Mov.ms('--duration-fast', 250), easing: 'cubic-bezier(.22,1,.36,1)' }).id = 'fz-desliza';
    }
    const campo = m.querySelector('input'); if (campo) campo.focus({ preventScroll: true }); else { const o = m.querySelector('.col-op.on, .col-op'); if (o) o.focus({ preventScroll: true }); }
  }, [id, tabela]);
  useEffect(() => {
    const fora = (ev) => { if (ref.current && !ref.current.contains(ev.target) && !(ev.target.closest && ev.target.closest('[data-col-menu]'))) fechar(); };
    document.addEventListener('pointerdown', fora, true); addEventListener('resize', fechar);
    return () => { document.removeEventListener('pointerdown', fora, true); removeEventListener('resize', fechar); };
  }, [fechar]);
  const ordem = (o) => mudar({ ...f, ordem: f.ordem === o && o !== 'recentes' ? 'recentes' : o });
  return (
    <div className="col-menu" role="menu" aria-label={'Coluna ' + MENUS[id].rot} data-col-aberta={id} ref={ref}>
      <div className="col-corpo" key={id}>
        {id === 'nome' && (
          <>
            <label className="col-campo"><span>Nome contém</span>
              <input value={f.q} placeholder="Escreva um pedaço do nome" onChange={(ev) => mudar({ ...f, q: ev.target.value })} onKeyDown={(ev) => { if (ev.key === 'Enter') fechar(); }} />
            </label>
            <Op on={f.ordem === 'nome'} onClick={() => ordem('nome')}>Ordenar de A a Z</Op>
          </>
        )}
        {id === 'tipo' && (
          <>
            <Op on={f.tipo === 'todos'} onClick={() => mudar({ ...f, tipo: 'todos' })}>Todos os tipos</Op>
            {(tipos || []).map((t) => <Op key={t} on={f.tipo === t} onClick={() => mudar({ ...f, tipo: t })}>{TIPOS[t].nome}</Op>)}
          </>
        )}
        {id === 'quando' && (
          <>
            <Op on={f.ordem === 'recentes'} onClick={() => mudar({ ...f, ordem: 'recentes' })}>Mais recentes primeiro</Op>
            <Op on={f.ordem === 'antigos'} onClick={() => mudar({ ...f, ordem: 'antigos' })}>Mais antigos primeiro</Op>
          </>
        )}
      </div>
      {MENUS[id].emUso(f) && (
        <button type="button" className="col-limpa" onClick={() => mudar(id === 'nome' ? { ...f, q: '', ordem: f.ordem === 'nome' ? 'recentes' : f.ordem } : id === 'tipo' ? { ...f, tipo: 'todos' } : { ...f, ordem: 'recentes' })}>Limpar esta coluna</button>
      )}
    </div>
  );
}
