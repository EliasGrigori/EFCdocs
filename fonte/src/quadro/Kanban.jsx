/* EFCdocs — visão Kanban do quadro: os mesmos post-its, organizados em colunas.
   Arrastar um cartão muda a coluna (e a ordem); o post-it continua no mesmo lugar no quadro livre.
   v0.6.20 (parte 4): desenho novo. O cartão é o próprio post-it (papel da cor que a pessoa escolheu, sem faixa de lado);
   em cima, o andamento do quadro; cada coluna mostra quanto do quadro está nela; ao mover, os cartões deslizam até o lugar. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { criarArrastoKanban } from './kanbanArrasto.js'; /* v0.6.64: arrastar com fluidez (F1 a F7) */
import { Mov } from '../ui/fluidez.js';
import { vencida, concluida } from './tarefa.js';
import { Icone } from '../ui/comum.jsx';
import { resumoTarefa } from './tarefa.js';
import { AVISO_TRAVADO } from './arrumar.js'; /* v0.6.61 */
import { COR, porColuna, mudancasMoverKanban, adicionarColuna, renomearColuna, removerColuna, moverColuna, novoItem, vagaKanban, mudancasCampo, mudancasExcluir } from './modelo.js';
import { tituloDe } from './postit.js'; /* v0.6.51: título do post-it no cartão */
import { texturaDo, estiloTextura, pecasTextura } from './texturas.js'; /* v0.6.65 (V3): a textura do Quadro no cartão */
import { familiaDo, escalaDo, garantirFonte } from './fontesQ.js'; /* v0.6.65 (V3): a letra do Quadro no cartão */
import { validarNome } from '../nucleo/modelo.js';
import { GavetaComentarios, totalComentarios } from './comentariosKanban.jsx'; /* v0.6.67 (N2) */
import { etiquetasDe, etiquetaDo, contagemEtiquetas, passaNoFiltro, resumoFiltro, indiceNaColuna, SEM } from './etiquetas.js'; /* v0.6.66 (N1) */

const NIVEL = { alta: 3, media: 2, baixa: 1 };

/** v0.6.65 (V2): o rodapé do cartão só com o que existe: quem responde (ícone de pessoa e nome), o prazo, o GUT e os comentários.
    Saíram o "Sem responsável", o "Sem prazo" e a bolinha de iniciais (regra da auditoria visual). */
function PeCartao({ t, coments, aoComentar }) {
  const resp = t && t.resp, prazo = t && t.prazo, gut = t && t.gut > 0;
  if (!resp && !prazo && !gut && !coments) return null;
  return (
    <div className="kb-pe">
      {resp && <span className="kb-resp" title={'Responsável: ' + t.resp}><Icone n="usuario" /><span>{t.resp}</span></span>}
      {prazo && <span className={'efl-pilula ' + (t.vencida ? 'cr' : t.concluida ? 'ok' : '')}>{t.vencida ? 'Vencido ' + t.prazo : t.prazo}</span>}
      {gut && (
        <span className={'kb-gut n' + (NIVEL[t.nivel] || 0)} title={'Nota GUT ' + t.gut + ' · prioridade ' + t.nivel}>
          <svg viewBox="0 0 14 12" aria-hidden="true"><rect x="0" y="7" width="3" height="5" rx="1" /><rect x="5.5" y="4" width="3" height="8" rx="1" /><rect x="11" y="0" width="3" height="12" rx="1" /></svg>GUT {t.gut}
        </span>
      )}
      {coments > 0 && <button type="button" className="kb-coments" data-kb-coments title={coments === 1 ? 'Ver o comentário' : `Ver os ${coments} comentários`} aria-label={coments === 1 ? '1 comentário' : coments + ' comentários'}
        onPointerDown={(ev) => ev.stopPropagation()} onClick={(ev) => { ev.stopPropagation(); aoComentar(); }}><Icone n="comentario" />{coments}</button>} {/* v0.6.67 (N2): um toque abre a gaveta */}
    </div>
  );
}

/** v0.6.65 (V1): o nome do quadro em cima das colunas; um clique muda, como o nome na barra de cima. */
function NomeQuadro({ ficha, cx }) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(ficha ? ficha.nome : '');
  const [erro, setErro] = useState('');
  useEffect(() => { if (ficha) setNome(ficha.nome); }, [ficha && ficha.nome]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ficha) return null;
  const bloq = cx.bloqueado('arquivo.renomear');
  if (!editando) return <button type="button" className="kb-titulo" data-kb-titulo title={bloq || 'Clique para renomear o quadro'} disabled={!!bloq} onClick={() => setEditando(true)}>{ficha.nome}</button>;
  const terminar = (salvar) => {
    if (salvar) { const e = validarNome(nome); if (e) { setErro(e); return; } if (nome.trim() !== ficha.nome) cx.renomear(nome.trim()); }
    setEditando(false); setErro(''); setNome(ficha.nome);
  };
  return (
    <span className="kb-titulo-ed">
      <input className="kb-titulo" aria-label="Nome do quadro" autoFocus value={nome} maxLength={120}
        onChange={(ev) => { setNome(ev.target.value); setErro(''); }}
        onKeyDown={(ev) => { if (ev.key === 'Enter') terminar(true); if (ev.key === 'Escape') { ev.stopPropagation(); terminar(false); } }}
        onBlur={() => terminar(true)} />
      {erro && <span className="erro-t" role="alert">{erro}</span>}
    </span>
  );
}

/** v0.6.66 (N1): filtro único recolhível (botão com o resumo; o painel lista as etiquetas com a contagem). Não é guardado no arquivo. */
function FiltroEtiquetas({ c, todos, escondidas, setEscondidas }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (ev) => { if (ref.current && !ref.current.contains(ev.target)) setAberto(false); };
    const esc = (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); setAberto(false); } };
    document.addEventListener('pointerdown', fora, true); window.addEventListener('keydown', esc, true);
    return () => { document.removeEventListener('pointerdown', fora, true); window.removeEventListener('keydown', esc, true); };
  }, [aberto]);
  const n = contagemEtiquetas(todos), lista = [...etiquetasDe(c), { id: SEM, nome: 'Sem etiqueta', cor: null }];
  const trocar = (id) => { const s2 = new Set(escondidas); if (s2.has(id)) s2.delete(id); else s2.add(id); setEscondidas(s2); };
  const ativo = escondidas.size > 0;
  return (
    <span className="kb-filtro" ref={ref}>
      <button type="button" className={'btn kb-filtro-b' + (ativo ? ' on' : '')} data-kb-filtro aria-expanded={aberto} onClick={() => setAberto(!aberto)}><Icone n="filtro" /><span>{resumoFiltro(c, escondidas)}</span></button>
      {aberto && (
        <div className="filtro-p kb-filtro-p card" role="group" aria-label="Filtrar por etiqueta">
          {lista.map((e) => (
            <label key={e.id || 'sem'} className="kb-filtro-op">
              <input type="checkbox" checked={!escondidas.has(e.id)} onChange={() => trocar(e.id)} data-kb-filtro-op={e.id || 'sem'} />
              <i className="kb-eti-ponto" style={{ background: e.cor || 'transparent', borderColor: e.cor ? 'transparent' : undefined }} aria-hidden="true" />
              <span>{e.nome}</span><small>{n[e.id] || 0}</small>
            </label>
          ))}
          {ativo && <button type="button" className="kb-filtro-limpar" onClick={() => setEscondidas(new Set())}>Mostrar todas</button>}
        </div>
      )}
    </span>
  );
}

/** v0.6.65 (V3): a textura e a letra escolhidas no Quadro também no cartão (o tamanho do cartão é o do Kanban). */
function papelDoCartao(it) {
  const cor = COR[it.cor] || COR.amarelo, tex = texturaDo(it) || 'liso', medida = { ...it, w: 260, h: 96 };
  const style = { '--kb-cor': cor, backgroundColor: cor, ...estiloTextura(medida, cor, escalaDo(it)) };
  if (familiaDo(it)) garantirFonte(familiaDo(it));
  return { tex, style, pecas: pecasTextura(medida, cor), letra: familiaDo(it) ? { fontFamily: `"${familiaDo(it)}", var(--f, sans-serif)`, fontSize: +(15 * escalaDo(it)).toFixed(2) } : null };
}

export function KanbanVista({ c, aplicarQ, somenteLeitura, sel, setSel, cx, codigos, hoje, ficha }) {
  const grupos = porColuna(c);
  const [editando, setEditando] = useState(null);
  const [escondidas, setEscondidas] = useState(() => new Set()); /* v0.6.66 (N1): etiquetas escondidas pelo filtro */
  const [gaveta, setGaveta] = useState(null); /* v0.6.67 (N2): post-it com a gaveta de comentários aberta */
  /* v0.6.64: o arrasto mexe só no DOM (kanbanArrasto.js); o React fica sabendo no fim, com a coluna e o lugar */
  const arrastando = useRef(false), aoSoltarRef = useRef(null), arr = useRef(null);
  /* ao mover, criar ou tirar, cada cartão desliza do lugar antigo até o novo (só transform; 250 ms da escala) */
  const palco = useRef(null), lugares = useRef(new Map());
  useLayoutEffect(() => {
    const el = palco.current; if (!el) return;
    const agora = new Map();
    for (const k of el.querySelectorAll('.kb-card[data-item]:not(.kb-fantasma)')) { const r = k.getBoundingClientRect(); agora.set(k.dataset.item, { x: r.left + el.scrollLeft, y: r.top + el.scrollTop, k }); }
    if (!arrastando.current && !Mov.reduzido()) {
      for (const [id, n] of agora) {
        const a = lugares.current.get(id);
        if (!a) { if (lugares.current.size) n.k.animate([{ opacity: 0, transform: 'translateY(10px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: Mov.ms('--duration-fast', 250), easing: 'cubic-bezier(.22,1,.36,1)' }).id = 'kb-entra'; continue; }
        const dx = a.x - n.x, dy = a.y - n.y;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) n.k.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: Mov.ms('--duration-fast', 250), easing: 'cubic-bezier(.22,1,.36,1)' }).id = 'kb-desliza';
      }
    }
    lugares.current = agora;
  });
  if (!arr.current) arr.current = criarArrastoKanban({ raiz: () => palco.current, aoMudar: (v) => { arrastando.current = v; }, aoSoltar: (f) => aoSoltarRef.current(f) });
  useEffect(() => () => arr.current && arr.current.parar(), []);
  /* fim do arrasto: o deslize parte de onde cada cartão estava na tela (com a vaga), então o cartão solto não pula */
  aoSoltarRef.current = ({ id, col, indice, cancelado, lugares: ondeEstavam }) => {
    lugares.current = new Map([...ondeEstavam].map(([k, v]) => [k, { ...v, k: null }]));
    if (cancelado || !col || !c.itens[id] || c.itens[id].trava) return;
    const cheia = (grupos[col] || []).filter((x) => x.id !== id), visiveis = cheia.filter((x) => passaNoFiltro(x, escondidas)); /* v0.6.66: com o filtro, a vaga conta só os à vista */
    const mud = mudancasMoverKanban(c, id, col, indiceNaColuna(cheia, visiveis, indice));
    const nome = (c.colunas.find((k) => k.id === col) || {}).nome;
    if (Object.keys(mud).length) flushSync(() => aplicarQ(mud, 'Mover para ' + nome, 'moveu'));
  };
  /* o andamento do quadro: quantos post-its, quantos na última coluna (feitos) e quantos com prazo vencido */
  const todos = c.colunas.flatMap((k) => grupos[k.id] || []);
  const feitos = todos.filter((it) => concluida(c, it)).length, vencidos = todos.filter((it) => vencida(c, it, hoje)).length;
  const pct = todos.length ? Math.round((feitos / todos.length) * 100) : 0;

  const baixo = (ev, it) => {
    if (ev.button > 0 || editando) return;
    setSel({ itens: [it.id], seta: null });
    if (somenteLeitura || it.trava) return; /* v0.6.61: travado não sai da coluna arrastando */
    /* no toque, só a alça arrasta (assim o dedo ainda rola a coluna) */
    if (ev.pointerType === 'touch' && !ev.target.closest('.kb-alca')) return;
    arr.current.baixo(ev, it.id, ev.currentTarget);
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
  /* v0.6.26 (PL03): sair da página ou esconder o app no meio da edição guarda o texto (o app anota e recupera ao abrir) */
  const fimRef = useRef(null); fimRef.current = () => terminarEdicao(true);
  useEffect(() => {
    const sair = (ev) => { if (ev.type === 'pagehide' || document.visibilityState === 'hidden') fimRef.current(); };
    addEventListener('pagehide', sair); document.addEventListener('visibilitychange', sair);
    return () => { removeEventListener('pagehide', sair); document.removeEventListener('visibilitychange', sair); };
  }, []);

  /* v0.6.26 (Elias, 18/11 18:22: "não consigo excluir com facilidade um post-it" no Kanban do celular): lixeira no canto de cima do cartão escolhido */
  const excluirCartao = (it) => {
    if (it.trava) { cx.avisar(AVISO_TRAVADO, { ic: 'cadeado' }); return; } /* v0.6.61: antes dizia "Post-it excluído." sem excluir */
    aplicarQ(mudancasExcluir(c, [it.id]), 'Excluir post-it', 'excluiu');
    setSel({ itens: [], seta: null });
    cx.avisar('Post-it excluído.', { ic: 'lixeira', acao: { rotulo: 'Desfazer', fazer: () => cx.executar('editar.desfazer') } });
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
    <div className="kb" ref={palco}>
      <header className="kb-and" data-kb-andamento aria-label="Andamento do quadro">
        <NomeQuadro ficha={ficha} cx={cx} />
        <b>{todos.length} {todos.length === 1 ? 'post-it' : 'post-its'}</b>
        {c.colunas.length > 1 && todos.length > 0 && <span className="kb-and-barra" role="img" aria-label={`${pct}% feito`}><i style={{ transform: `scaleX(${pct / 100})` }} /></span>}
        {c.colunas.length > 1 && todos.length > 0 && <span className="kb-and-pct">{feitos} de {todos.length} em “{c.colunas[c.colunas.length - 1].nome}” · {pct}%</span>}
        {vencidos > 0 && <span className="efl-pilula cr" data-kb-vencidos>{vencidos} {vencidos === 1 ? 'vencido' : 'vencidos'}</span>}
        {etiquetasDe(c).length > 0 && <FiltroEtiquetas c={c} todos={todos} escondidas={escondidas} setEscondidas={setEscondidas} />}
      </header>
      {c.colunas.map((k, i) => {
        const lista = (grupos[k.id] || []).filter((it) => passaNoFiltro(it, escondidas)); /* v0.6.66 (N1) */
        return (
          <section key={k.id} className="kb-col" data-col={k.id} aria-label={'Coluna ' + k.nome}>
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
              {lista.map((it) => { const papel = papelDoCartao(it), eti = etiquetaDo(c, it); return (
                <div key={it.id} className="kb-item">
                  <article className={'kb-card qi-tex-' + papel.tex + (eti ? ' kb-com-eti' : '') + (sel.itens.includes(it.id) ? ' sel' : '')}
                    data-item={it.id} style={papel.style}
                    onPointerDown={(ev) => baixo(ev, it)}
                    onDoubleClick={() => { if (!somenteLeitura) setEditando({ id: it.id, valor: it.texto }); }}>
                    {papel.pecas.map((pc, i) => <span key={'p' + i} className={pc.cls} aria-hidden="true" style={pc.style} />)}
                    {!somenteLeitura && (it.trava ? <span className="kb-trava" title="Travado" aria-label="Travado" data-trava={it.id}><Icone n="cadeado" /></span> : <span className="kb-alca" title="Arraste para outra coluna" aria-hidden="true"><Icone n="mao" /></span>)}
                    {!somenteLeitura && !it.trava && sel.itens.includes(it.id) && !(editando && editando.id === it.id) && (
                      <button type="button" className="kb-lixo" title="Excluir o post-it" aria-label={'Excluir o post-it ' + (it.cod || '')} data-kb-excluir={it.id}
                        onPointerDown={(ev) => ev.stopPropagation()} onClick={(ev) => { ev.stopPropagation(); excluirCartao(it); }}><Icone n="lixeira" /></button>
                    )}
                    {eti && <span className="kb-eti" data-eti={eti.id}><i className="kb-eti-ponto" style={{ background: eti.cor }} aria-hidden="true" />{eti.nome}</span>}
                    {codigos && <span className="kb-cod">{it.cod}</span>}
                    {tituloDe(it) && <b className="kb-tit" style={papel.letra ? { fontFamily: papel.letra.fontFamily } : undefined}>{tituloDe(it)}</b>}
                    {editando && editando.id === it.id ? (
                      <textarea className="kb-edita" autoFocus value={editando.valor} aria-label="Texto do post-it"
                        onChange={(ev) => setEditando({ ...editando, valor: ev.target.value })}
                        onPointerDown={(ev) => ev.stopPropagation()}
                        onKeyDown={(ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); terminarEdicao(true); } /* v0.6.26 (D15) */ if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) terminarEdicao(true); }}
                        onBlur={() => terminarEdicao(true)} />
                    ) : <p style={{ ...(papel.letra || {}), fontWeight: it.fonte && it.fonte.n ? 700 : undefined, fontStyle: it.fonte && it.fonte.i ? 'italic' : undefined, color: it.fonte && it.fonte.cor }}>{it.texto || <span className="kb-vazio">Sem texto. Toque duas vezes para escrever.</span>}</p>}
                    <PeCartao t={resumoTarefa(c, it, hoje)} coments={totalComentarios(it)} aoComentar={() => setGaveta(it.id)} />
                    {!somenteLeitura && !totalComentarios(it) && <button type="button" className="kb-com-novo" data-kb-comentar={it.id} title="Comentar" aria-label={'Comentar ' + (it.cod || 'o post-it')}
                      onPointerDown={(ev) => ev.stopPropagation()} onClick={(ev) => { ev.stopPropagation(); setGaveta(it.id); }}><Icone n="comentario" /></button>}
                  </article>
                </div>
              ); })}
              {!lista.length && <p className="kb-sem">{somenteLeitura ? 'Nada aqui.' : 'Arraste um post-it para cá.'}</p>}
            </div>
            {!somenteLeitura && <button type="button" className="kb-novo" onClick={() => novoNaColuna(k.id)}><Icone n="plus" />Post-it</button>}
          </section>
        );
      })}
      {gaveta && c.itens[gaveta] && (
        <GavetaComentarios c={c} id={gaveta} aplicarQ={aplicarQ} somenteLeitura={somenteLeitura} fechar={() => setGaveta(null)} abrir={setGaveta}
          ids={c.colunas.flatMap((k) => (grupos[k.id] || []).filter((x) => passaNoFiltro(x, escondidas)).map((x) => x.id))} />
      )}
      {!somenteLeitura && (
        <button type="button" className="kb-coluna-nova" onClick={() => cx.perguntar({
          titulo: 'Nova coluna', campo: 'Nome da coluna', valor: '', confirmar: 'Criar coluna', max: 40, validar: (v) => (v.trim() ? '' : 'Digite um nome.'),
          aoConfirmar: (nome) => aplicarQ(adicionarColuna(c, nome).mudancas, 'Nova coluna', 'criou coluna'),
        })}><Icone n="plus" />Coluna</button>
      )}
    </div>
  );
}
