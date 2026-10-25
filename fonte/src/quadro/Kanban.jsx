/* EFCdocs — visão Kanban do quadro: os mesmos post-its, organizados em colunas.
   Arrastar um cartão muda a coluna (e a ordem); o post-it continua no mesmo lugar no quadro livre. */
import { useRef, useState } from 'react';
import { Icone } from '../ui/comum.jsx';
import { RodapeTarefa } from './partes.jsx';
import { resumoTarefa } from './tarefa.js';
import { COR, porColuna, mudancasMoverKanban, adicionarColuna, renomearColuna, removerColuna, moverColuna, novoItem, vagaKanban, mudancasCampo } from './modelo.js';

export function KanbanVista({ c, aplicarQ, somenteLeitura, sel, setSel, cx, codigos, hoje }) {
  const grupos = porColuna(c);
  const [arrasto, setArrasto] = useState(null); /* { id, x, y, dx, dy, w, alvo: { col, indice } } */
  const [editando, setEditando] = useState(null);
  const inicio = useRef(null);

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
    <div className="kb" onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar}>
      {c.colunas.map((k, i) => {
        const lista = grupos[k.id] || [];
        const alvoAqui = arrasto && arrasto.alvo && arrasto.alvo.col === k.id;
        return (
          <section key={k.id} className={'kb-col' + (alvoAqui ? ' alvo' : '')} data-col={k.id} aria-label={'Coluna ' + k.nome}>
            <header className="kb-h">
              <button type="button" className="kb-nome" disabled={somenteLeitura} title="Renomear a coluna" onClick={() => menuColuna(k, i)}>{k.nome}</button>
              <span className="kb-qt">{lista.length}</span>
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
                    {(() => { const r = resumoTarefa(c, it, hoje); return r && <RodapeTarefa t={r} />; })()}
                    {it.nota && <span className="kb-nota" title={'Comentário: ' + it.nota}><Icone n="comentario" /></span>}
                  </article>
                </div>
              ))}
              {alvoAqui && arrasto.alvo.indice >= lista.filter((x) => x.id !== arrasto.id).length && <div className="kb-vaga" />}
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
