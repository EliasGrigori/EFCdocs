/* EFCdocs — visão Kanban do quadro: os mesmos post-its, organizados em colunas.
   Arrastar um cartão muda a coluna (e a ordem); o post-it continua no mesmo lugar no quadro livre.
   v0.6.20 (parte 4): desenho novo. O cartão é o próprio post-it (papel da cor que a pessoa escolheu, sem faixa de lado);
   em cima, o andamento do quadro; cada coluna mostra quanto do quadro está nela; ao mover, os cartões deslizam até o lugar. */
import { useLayoutEffect, useRef, useState } from 'react';
import { Mov } from '../ui/fluidez.js';
import { vencida, concluida } from './tarefa.js';
import { Icone } from '../ui/comum.jsx';
import { resumoTarefa } from './tarefa.js';
import { COR, porColuna, mudancasMoverKanban, adicionarColuna, renomearColuna, removerColuna, moverColuna, novoItem, vagaKanban, mudancasCampo } from './modelo.js';

/** As iniciais de quem responde, para a bolinha do cartão ("Ana Lima" → "AL"). */
const iniciais = (nome) => String(nome).trim().split(/\s+/).filter(Boolean).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
const NIVEL = { alta: 3, media: 2, baixa: 1 };

/** O rodapé da tarefa no cartão do Kanban: quem responde, o prazo (ponto e texto; caixa só no vencido) e a prioridade. */
function TarefaCartao({ t }) {
  return (
    <div className="qi-tarefa kb-tarefa">
      <span className={'kb-resp' + (t.resp ? '' : ' sem')} title={t.resp ? 'Responsável: ' + t.resp : 'Sem responsável'}>
        <i aria-hidden="true">{t.resp ? iniciais(t.resp) : '?'}</i><span>{t.resp || 'Sem responsável'}</span>
      </span>
      {t.prazo
        ? <span className={'efl-pilula ' + (t.vencida ? 'cr' : t.concluida ? 'ok' : '')}>{t.vencida ? 'Vencido ' + t.prazo : t.prazo}</span>
        : <span className="kb-semprazo">Sem prazo</span>}
      {t.gut > 0 && (
        <span className={'kb-gut n' + (NIVEL[t.nivel] || 0)} title={'Nota GUT ' + t.gut + ' · prioridade ' + t.nivel}>
          <svg viewBox="0 0 14 12" aria-hidden="true"><rect x="0" y="7" width="3" height="5" rx="1" /><rect x="5.5" y="4" width="3" height="8" rx="1" /><rect x="11" y="0" width="3" height="12" rx="1" /></svg>GUT {t.gut}
        </span>
      )}
    </div>
  );
}

export function KanbanVista({ c, aplicarQ, somenteLeitura, sel, setSel, cx, codigos, hoje }) {
  const grupos = porColuna(c);
  const [arrasto, setArrasto] = useState(null); /* { id, x, y, dx, dy, w, alvo: { col, indice } } */
  const [editando, setEditando] = useState(null);
  const inicio = useRef(null);
  /* ao mover, criar ou tirar, cada cartão desliza do lugar antigo até o novo (só transform; 250 ms da escala) */
  const palco = useRef(null), lugares = useRef(new Map());
  useLayoutEffect(() => {
    const el = palco.current; if (!el) return;
    const agora = new Map();
    for (const k of el.querySelectorAll('.kb-card[data-item]:not(.kb-fantasma)')) { const r = k.getBoundingClientRect(); agora.set(k.dataset.item, { x: r.left + el.scrollLeft, y: r.top + el.scrollTop, k }); }
    if (!arrasto && !Mov.reduzido()) {
      for (const [id, n] of agora) {
        const a = lugares.current.get(id);
        if (!a) { if (lugares.current.size) n.k.animate([{ opacity: 0, transform: 'translateY(10px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: Mov.ms('--duration-fast', 250), easing: 'cubic-bezier(.22,1,.36,1)' }).id = 'kb-entra'; continue; }
        const dx = a.x - n.x, dy = a.y - n.y;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) n.k.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: Mov.ms('--duration-fast', 250), easing: 'cubic-bezier(.22,1,.36,1)' }).id = 'kb-desliza';
      }
    }
    lugares.current = agora;
  });
  /* o andamento do quadro: quantos post-its, quantos na última coluna (feitos) e quantos com prazo vencido */
  const todos = c.colunas.flatMap((k) => grupos[k.id] || []);
  const feitos = todos.filter((it) => concluida(c, it)).length, vencidos = todos.filter((it) => vencida(c, it, hoje)).length;
  const pct = todos.length ? Math.round((feitos / todos.length) * 100) : 0;

  const alvoNoPonto = (x, y, id) => {
    const cols = [...document.querySelectorAll('.kb-col')];
    for (const el of cols) {
      const r = el.getBoundingClientRect();
      if (x < r.left || x > r.right) continue;
      const cards = [...el.querySelectorAll('.kb-card')].filter((k) => k.dataset.item !== id);
      let indice = cards.length;
      for (let i = 0; i < cards.length; i++) {
        const rc = cards[i].getBoundingClientRect();
        if (y < rc.top + rc.height / 2) { indice = i; break; }
      }
      return { col: el.dataset.col, indice };
    }
    return null;
  };

  const baixo = (ev, it) => {
    if (ev.button > 0 || editando) return;
    setSel({ itens: [it.id], seta: null });
    if (somenteLeitura) return;
    /* no toque, só a alça arrasta (assim o dedo ainda rola a coluna) */
    if (ev.pointerType === 'touch' && !ev.target.closest('.kb-alca')) return;
    const r = ev.currentTarget.getBoundingClientRect();
    inicio.current = { id: it.id, px: ev.clientX, py: ev.clientY, dx: ev.clientX - r.left, dy: ev.clientY - r.top, w: r.width, ok: false, pid: ev.pointerId, el: ev.currentTarget };
  };
  const mover = (ev) => {
    const i = inicio.current;
    if (!i) return;
    if (!i.ok) {
      if (Math.hypot(ev.clientX - i.px, ev.clientY - i.py) < 6) return;
      i.ok = true;
      try { i.el.setPointerCapture(i.pid); } catch { /* sem captura */ }
    }
    ev.preventDefault();
    setArrasto({ id: i.id, x: ev.clientX - i.dx, y: ev.clientY - i.dy, w: i.w, alvo: alvoNoPonto(ev.clientX, ev.clientY, i.id) });
  };
  const soltar = () => {
    const i = inicio.current;
    inicio.current = null;
    if (!i || !i.ok || !arrasto) { setArrasto(null); return; }
    if (arrasto.alvo) {
      const mud = mudancasMoverKanban(c, i.id, arrasto.alvo.col, arrasto.alvo.indice);
      const nome = (c.colunas.find((k) => k.id === arrasto.alvo.col) || {}).nome;
      if (Object.keys(mud).length) aplicarQ(mud, 'Mover para ' + nome, 'moveu');
    }
    setArrasto(null);
  };

  const novoNaColuna = (colId) => {
    const v = vagaKanban(c, colId);
    const r = novoItem(c, 'postit', { x: v.x, y: v.y, col: colId });
    aplicarQ(r.mudancas, 'Novo post-it', 'criou item');
    setSel({ itens: [r.item.id], seta: null });
    setEditando({ id: r.item.id, valor: '' });
  };

  const terminarEdicao = (salvar) => {
    if (salvar && editando && c.itens[editando.id] && editando.valor !== c.itens[editando.id].texto) {
      aplicarQ(mudancasCampo(c, [editando.id], { texto: editando.valor }), 'Editar texto', 'editou texto');
    }
    setEditando(null);
  };

  const menuColuna = (k, i) => {
    cx.perguntar({
      titulo: 'Coluna "' + k.nome + '"', campo: 'Nome da coluna', valor: k.nome, confirmar: 'Salvar nome', max: 40,
      aoConfirmar: (nome) => { if (nome && nome !== k.nome) aplicarQ(renomearColuna(c, k.id, nome), 'Renomear coluna', 'renomeou coluna'); },
    });
    void i;
  };

  const tirarColuna = (k) => {
    const r = removerColuna(c, k.id);
    if (r.erro) { cx.avisar(r.erro, { ic: 'aviso' }); return; }
    aplicarQ(r.mudancas, 'Tirar coluna', 'tirou coluna');
  };

  return (
    <div className="kb" ref={palco} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar}>
      <header className="kb-and" data-kb-andamento aria-label="Andamento do quadro">
        <b>{todos.length} {todos.length === 1 ? 'post-it' : 'post-its'}</b>
        {c.colunas.length > 1 && todos.length > 0 && <span className="kb-and-barra" role="img" aria-label={`${pct}% feito`}><i style={{ transform: `scaleX(${pct / 100})` }} /></span>}
        {c.colunas.length > 1 && todos.length > 0 && <span className="kb-and-pct">{feitos} de {todos.length} em “{c.colunas[c.colunas.length - 1].nome}” · {pct}%</span>}
        {vencidos > 0 && <span className="efl-pilula cr" data-kb-vencidos>{vencidos} {vencidos === 1 ? 'vencido' : 'vencidos'}</span>}
      </header>
      {c.colunas.map((k, i) => {
        const lista = grupos[k.id] || [];
        const alvoAqui = arrasto && arrasto.alvo && arrasto.alvo.col === k.id;
        return (
          <section key={k.id} className={'kb-col' + (alvoAqui ? ' alvo' : '')} data-col={k.id} aria-label={'Coluna ' + k.nome}>
            <header className="kb-h">
              <button type="button" className="kb-nome" disabled={somenteLeitura} title="Renomear a coluna" onClick={() => menuColuna(k, i)}>{k.nome}</button>
              <span className="kb-qt">{lista.length}</span>
              <span className="kb-parte" aria-hidden="true"><i style={{ transform: `scaleX(${todos.length ? lista.length / todos.length : 0})` }} /></span>
              {!somenteLeitura && (
                <span className="kb-acoes">
                  <button type="button" className="rbi" title="Mover a coluna para a esquerda" aria-label="Mover a coluna para a esquerda" disabled={i === 0} onClick={() => aplicarQ(moverColuna(c, k.id, -1), 'Mover coluna', 'moveu coluna')}><Icone n="setaEsq" /></button>
                  <button type="button" className="rbi" title="Mover a coluna para a direita" aria-label="Mover a coluna para a direita" disabled={i === c.colunas.length - 1} onClick={() => aplicarQ(moverColuna(c, k.id, 1), 'Mover coluna', 'moveu coluna')}><Icone n="setaDir" /></button>
                  <button type="button" className="rbi" title="Tirar a coluna (só vazia)" aria-label={'Tirar a coluna ' + k.nome} onClick={() => tirarColuna(k)}><Icone n="lixeira" /></button>
                </span>
              )}
            </header>
            <div className="kb-lista">
              {lista.map((it, j) => (
                <div key={it.id}>
                  {alvoAqui && arrasto.alvo.indice === j && <div className="kb-vaga" />}
                  <article className={'kb-card' + (sel.itens.includes(it.id) ? ' sel' : '') + (arrasto && arrasto.id === it.id ? ' saindo' : '')}
                    data-item={it.id} style={{ '--kb-cor': COR[it.cor] || COR.amarelo }}
                    onPointerDown={(ev) => baixo(ev, it)}
                    onDoubleClick={() => { if (!somenteLeitura) setEditando({ id: it.id, valor: it.texto }); }}>
                    {!somenteLeitura && <span className="kb-alca" title="Arraste para outra coluna" aria-hidden="true"><Icone n="mao" /></span>}
                    {codigos && <span className="kb-cod">{it.cod}</span>}
                    {editando && editando.id === it.id ? (
                      <textarea className="kb-edita" autoFocus value={editando.valor} aria-label="Texto do post-it"
                        onChange={(ev) => setEditando({ ...editando, valor: ev.target.value })}
                        onPointerDown={(ev) => ev.stopPropagation()}
                        onKeyDown={(ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); terminarEdicao(false); } if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) terminarEdicao(true); }}
                        onBlur={() => terminarEdicao(true)} />
                    ) : <p style={{ fontWeight: it.fonte && it.fonte.n ? 700 : undefined, fontStyle: it.fonte && it.fonte.i ? 'italic' : undefined, color: it.fonte && it.fonte.cor }}>{it.texto || <span className="kb-vazio">Sem texto. Toque duas vezes para escrever.</span>}</p>}
                    {(() => { const r = resumoTarefa(c, it, hoje); return r && <TarefaCartao t={r} />; })()}
                    {it.nota && <span className="kb-nota" title={'Comentário: ' + it.nota}><Icone n="comentario" /></span>}
                  </article>
                </div>
              ))}
              {alvoAqui && arrasto.alvo.indice >= lista.filter((x) => x.id !== arrasto.id).length && <div className="kb-vaga" />}
              {!lista.length && !alvoAqui && <p className="kb-sem">{somenteLeitura ? 'Nada aqui.' : 'Arraste um post-it para cá.'}</p>}
            </div>
            {!somenteLeitura && <button type="button" className="kb-novo" onClick={() => novoNaColuna(k.id)}><Icone n="plus" />Post-it</button>}
          </section>
        );
      })}
      {!somenteLeitura && (
        <button type="button" className="kb-coluna-nova" onClick={() => cx.perguntar({
          titulo: 'Nova coluna', campo: 'Nome da coluna', valor: '', confirmar: 'Criar coluna', max: 40, validar: (v) => (v.trim() ? '' : 'Digite um nome.'),
          aoConfirmar: (nome) => aplicarQ(adicionarColuna(c, nome).mudancas, 'Nova coluna', 'criou coluna'),
        })}><Icone n="plus" />Coluna</button>
      )}
      {arrasto && (
        <div className="kb-card kb-fantasma" style={{ left: arrasto.x, top: arrasto.y, width: arrasto.w, '--kb-cor': COR[(c.itens[arrasto.id] || {}).cor] || COR.amarelo }}>
          <p>{(c.itens[arrasto.id] || {}).texto}</p>
        </div>
      )}
    </div>
  );
}
