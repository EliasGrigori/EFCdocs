/* Vértice Docs v0.6.64 — arrastar no Kanban com fluidez (F1 a F7 do estudo de 25/11, maquete aprovada).
   Fica fora do Kanban.jsx (o Quadro.jsx está no limite de linhas e o arrasto não precisa do React no meio do caminho):
   durante o arrasto nada passa pelo estado do React, só o DOM; o React só fica sabendo no fim, com a coluna e o lugar.
   - F2: o fantasma é uma cópia do próprio cartão e segue a mão com uma folga pequena (0,45 por quadro), inclinando
     conforme a velocidade;
   - F3: a vaga tem a altura do cartão e fica no lugar dele; o cartão de verdade se esconde (não some a tela);
   - F4: no vão entre colunas vale a coluna mais perto (nunca "nenhuma");
   - a vaga decide pela POSIÇÃO FINAL dos vizinhos (offsetTop, que não conta o deslize em andamento), com 8 px de folga
     que seguram a vaga onde ela está (+8 quando a vaga está antes do cartão, -8 depois): sem tremida;
   - o deslize dos vizinhos interrompido é cancelado e recomeça de onde o cartão está;
   - F5: perto da beira o quadro rola sozinho, mais rápido quanto mais perto (70 px; até 14 px por quadro);
   - F1: ao soltar, o fantasma voa até a vaga (o tempo cresce com a distância, pelos tokens da escala) e só então o
     cartão aparece lá: sem o salto de antes (o cartão voltava ao lugar antigo e escorregava até o novo);
   - F7: Esc no meio do arrasto devolve o post-it para onde estava.
   Durações só da escala (R32): deslize e entrada da vaga 250 ms (--duration-fast); voo 150, 250 ou 350 ms pela distância.
   Com "movimento reduzido": sem deslize, sem voo, o fantasma vai junto com a mão. */

import Mov from '../layout/efc-movimento.cjs';

const DESLIZE = 'kb-desliza';
const reduzido = () => Mov.reduzido();
const token = (nome, pad) => Mov.ms(nome, pad); /* lê "250ms" ou ".25s" (o token vem em segundos em parte do app) */
const SUAVE = 'cubic-bezier(.25,.8,.25,1)';

/**
 * Liga o arrasto a um Kanban.
 * @param {object} op
 * @param {() => HTMLElement} op.raiz       o elemento .kb (rola nos dois sentidos)
 * @param {(f: {id, col, indice, cancelado, lugares}) => void} op.aoSoltar  chamado no fim, já com o DOM limpo
 * @param {(ativo: boolean) => void} [op.aoMudar]  avisa quando começa e quando termina
 */
export function criarArrastoKanban(op) {
  let ar = null; /* o arrasto em andamento */
  let pendente = null; /* apertou e ainda não andou 6 px */

  const raiz = () => op.raiz();
  const cartoesVisiveis = (lista) => [...lista.children].filter((e) => e.classList.contains('kb-item') && e.style.display !== 'none');
  const proxVisivel = (e) => { let n = e.nextElementSibling; while (n && !(n.classList.contains('kb-item') && n.style.display !== 'none')) n = n.nextElementSibling; return n; };
  const posicoes = () => { const m = new Map(); for (const e of raiz().querySelectorAll('.kb-item, .kb-vaga-viva')) if (e.style.display !== 'none') m.set(e, e.getBoundingClientRect()); return m; };
  /* posição final do item na tela, sem o deslize em andamento (offsetTop não conta o transform) */
  const topoFinal = (e) => {
    const R = raiz(); let y = 0, n = e;
    while (n && n !== R) { y += n.offsetTop; n = n.offsetParent; }
    if (n !== R) return e.getBoundingClientRect().top;
    return y - R.scrollTop + R.getBoundingClientRect().top + R.clientTop;
  };
  const deslizar = (antes) => {
    if (reduzido()) return;
    const dur = token('--duration-fast', 250);
    for (const [e, r0] of antes) {
      if (!e.isConnected || e === (ar && ar.vaga)) continue;
      for (const a of e.getAnimations()) if (a.id === DESLIZE) a.cancel();
      const r = e.getBoundingClientRect(), dx = r0.left - r.left, dy = r0.top - r.top;
      if (Math.abs(dx) + Math.abs(dy) < 1) continue;
      /* sai de onde o cartão está agora (mesmo no meio de outro deslize), sem pulo */
      e.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: dur, easing: SUAVE }).id = DESLIZE;
    }
  };
  const colMaisPerto = (x) => {
    let m = null, d = Infinity;
    for (const c of raiz().querySelectorAll('.kb-col')) { const r = c.getBoundingClientRect(); const dd = x < r.left ? r.left - x : x > r.right ? x - r.right : 0; if (dd < d) { d = dd; m = c; } }
    return m;
  };

  function moverVaga() {
    const col = colMaisPerto(ar.mx); if (!col) return;
    const lista = col.querySelector('.kb-lista'); if (!lista) return;
    const vaga = ar.vaga, naLista = vaga.parentNode === lista;
    let antesDe = null;
    for (const k of cartoesVisiveis(lista)) {
      const meio = topoFinal(k) + k.offsetHeight / 2;
      const vagaAntes = naLista && (vaga.compareDocumentPosition(k) & Node.DOCUMENT_POSITION_FOLLOWING);
      if (ar.my < meio + (vagaAntes ? 8 : -8)) { antesDe = k; break; }
    }
    if (naLista && proxVisivel(vaga) === antesDe) return;
    const p = posicoes();
    if (antesDe) lista.insertBefore(vaga, antesDe);
    else { const ult = cartoesVisiveis(lista).pop(); lista.insertBefore(vaga, ult ? ult.nextSibling : lista.firstChild); }
    deslizar(p);
    if (!reduzido()) vaga.animate([{ opacity: 0.3, transform: 'scaleY(.92)' }, { opacity: 1, transform: 'none' }], { duration: token('--duration-fast', 250), easing: SUAVE });
    for (const c of raiz().querySelectorAll('.kb-col')) c.classList.toggle('alvo', c === col);
  }

  function quadro() {
    if (!ar || ar.fim) return;
    const red = reduzido(), k = red ? 1 : 0.45;
    ar.x += (ar.tx - ar.x) * k; ar.y += (ar.ty - ar.y) * k;
    ar.inc += (Math.max(-4, Math.min(4, ar.vx * 0.35)) - ar.inc) * 0.15; ar.vx *= 0.85;
    ar.esc += ((red ? 1 : 1.03) - ar.esc) * 0.3;
    ar.f.style.transform = `translate(${ar.x}px, ${ar.y}px) rotate(${red ? 0 : ar.inc.toFixed(2)}deg) scale(${ar.esc.toFixed(3)})`;
    /* F5: perto da beira, o quadro rola sozinho, mais rápido quanto mais perto */
    const R = raiz(), r = R.getBoundingClientRect(), B = 70;
    let sx = 0, sy = 0;
    if (ar.mx > r.right - B) sx = ((ar.mx - (r.right - B)) / B) * 14; else if (ar.mx < r.left + B) sx = -(((r.left + B) - ar.mx) / B) * 14;
    if (ar.my > r.bottom - B) sy = ((ar.my - (r.bottom - B)) / B) * 12; else if (ar.my < r.top + B) sy = -(((r.top + B) - ar.my) / B) * 12;
    if (sx || sy) { const x0 = R.scrollLeft, y0 = R.scrollTop; R.scrollBy(sx, sy); if (R.scrollLeft !== x0 || R.scrollTop !== y0) moverVaga(); }
    ar.raf = requestAnimationFrame(quadro);
  }

  function comecar() {
    const { cartao } = pendente, item = cartao.closest('.kb-item');
    const r = cartao.getBoundingClientRect(), R = raiz();
    ar = { ...pendente, item, x: r.left, y: r.top, tx: r.left, ty: r.top, vx: 0, inc: 0, esc: 1, ultX: pendente.px, h: item.getBoundingClientRect().height };
    pendente = null;
    try { R.setPointerCapture(ar.pid); } catch { /* sem captura */ }
    /* F2: o fantasma é uma cópia do próprio cartão */
    const f = cartao.cloneNode(true);
    f.classList.add('kb-fantasma'); f.classList.remove('sel', 'saindo'); f.removeAttribute('data-item'); f.setAttribute('aria-hidden', 'true'); f.dataset.fantasma = ar.id;
    for (const b of f.querySelectorAll('button, textarea')) b.remove();
    f.style.width = r.width + 'px'; f.style.transform = `translate(${r.left}px, ${r.top}px)`;
    R.appendChild(f); ar.f = f; R.classList.add('kb-arrastando');
    /* F3: a vaga tem a altura do cartão e fica no lugar dele */
    const v = document.createElement('div'); v.className = 'kb-vaga kb-vaga-viva'; v.style.height = ar.h + 'px'; v.setAttribute('aria-hidden', 'true');
    item.parentNode.insertBefore(v, item); ar.vaga = v;
    cartao.classList.add('saindo'); item.style.display = 'none';
    for (const c of R.querySelectorAll('.kb-col')) c.classList.toggle('alvo', c.contains(v));
    if (op.aoMudar) op.aoMudar(true);
    ar.raf = requestAnimationFrame(quadro);
  }

  function aoMover(ev) {
    if (pendente && pendente.pid === ev.pointerId) {
      if (Math.hypot(ev.clientX - pendente.px, ev.clientY - pendente.py) < 6) return;
      comecar();
    }
    if (!ar || ar.fim || ev.pointerId !== ar.pid) return;
    ev.preventDefault();
    ar.tx = ev.clientX - ar.dx; ar.ty = ev.clientY - ar.dy; ar.mx = ev.clientX; ar.my = ev.clientY;
    ar.vx = ev.clientX - ar.ultX; ar.ultX = ev.clientX;
    moverVaga();
  }

  /* onde cada cartão está agora (o que a pessoa vê), na mesma conta do deslize do Kanban.jsx (com a rolagem) */
  function lugaresAgora(idMovido, rVaga) {
    const R = raiz(), m = new Map();
    for (const k of R.querySelectorAll('.kb-card[data-item]')) { if (k.closest('.kb-item') && k.closest('.kb-item').style.display === 'none') continue; const r = k.getBoundingClientRect(); m.set(k.dataset.item, { x: r.left + R.scrollLeft, y: r.top + R.scrollTop }); }
    if (idMovido && rVaga) m.set(idMovido, { x: rVaga.left + R.scrollLeft, y: rVaga.top + R.scrollTop });
    return m;
  }

  function soltar(cancelado) {
    tirarOuvintes();
    if (pendente) { pendente = null; return; }
    if (!ar || ar.fim) return;
    const a = ar; a.fim = true; cancelAnimationFrame(a.raf);
    for (const c of raiz().querySelectorAll('.kb-col')) c.classList.remove('alvo');
    const destino = a.vaga.getBoundingClientRect();
    const dist = Math.hypot(destino.left - a.x, destino.top - a.y);
    /* F1: o tempo do voo cresce com a distância, pelos tokens da escala */
    const dur = reduzido() ? 0 : dist < 160 ? token('--duration-quick', 150) : dist < 480 ? token('--duration-fast', 250) : token('--duration-medium', 350);
    const fim = () => {
      if (!a.vaga.isConnected) { limpar(a); ar = null; if (op.aoMudar) op.aoMudar(false); return; }
      const lista = a.vaga.parentNode, col = a.vaga.closest('.kb-col');
      let indice = 0; for (const e of lista.children) { if (e === a.vaga) break; if (e.classList.contains('kb-item') && e.style.display !== 'none') indice++; }
      const lugares = lugaresAgora(a.id, a.vaga.getBoundingClientRect());
      limpar(a); ar = null;
      if (op.aoMudar) op.aoMudar(false);
      op.aoSoltar({ id: a.id, col: col ? col.dataset.col : null, indice, cancelado: !!cancelado, lugares });
    };
    if (!dur) { fim(); return; }
    a.f.getAnimations().forEach((x) => x.cancel());
    const voo = a.f.animate([{ transform: a.f.style.transform }, { transform: `translate(${destino.left}px, ${destino.top}px) rotate(0deg) scale(1)` }], { duration: dur, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
    voo.id = 'kb-voo';
    voo.onfinish = fim; voo.oncancel = fim;
  }

  function limpar(a) {
    for (const e of raiz().querySelectorAll('.kb-item')) for (const x of e.getAnimations()) if (x.id === DESLIZE) x.cancel(); /* o deslize do fim fica com o Kanban.jsx, a partir dos lugares de agora */
    if (a.f && a.f.isConnected) a.f.remove();
    raiz().classList.remove('kb-arrastando');
    if (a.vaga && a.vaga.isConnected) a.vaga.remove();
    if (a.item) a.item.style.display = '';
    if (a.cartao) a.cartao.classList.remove('saindo');
    try { raiz().releasePointerCapture(a.pid); } catch { /* já solta */ }
  }

  /* F7: Esc devolve o post-it para onde estava */
  function aoTecla(ev) {
    if (ev.key !== 'Escape' || !ar || ar.fim) return;
    ev.preventDefault(); ev.stopPropagation();
    const p = posicoes();
    ar.item.parentNode.insertBefore(ar.vaga, ar.item);
    deslizar(p);
    soltar(true);
  }

  const aoSoltarPonteiro = (ev) => { if ((pendente && ev.pointerId === pendente.pid) || (ar && ev.pointerId === ar.pid)) soltar(false); };
  function porOuvintes() {
    addEventListener('pointermove', aoMover, { passive: false });
    addEventListener('pointerup', aoSoltarPonteiro); addEventListener('pointercancel', aoSoltarPonteiro);
    addEventListener('keydown', aoTecla, true);
  }
  function tirarOuvintes() {
    removeEventListener('pointermove', aoMover, { passive: false });
    removeEventListener('pointerup', aoSoltarPonteiro); removeEventListener('pointercancel', aoSoltarPonteiro);
    removeEventListener('keydown', aoTecla, true);
  }

  return {
    /** Chamado no pointerdown do cartão que pode ser arrastado. */
    baixo(ev, id, cartao) {
      if (ar || pendente) return;
      const r = cartao.getBoundingClientRect();
      pendente = { id, cartao, px: ev.clientX, py: ev.clientY, dx: ev.clientX - r.left, dy: ev.clientY - r.top, pid: ev.pointerId, mx: ev.clientX, my: ev.clientY };
      porOuvintes();
    },
    ativo: () => !!ar,
    /** Ao sair da tela no meio do arrasto: limpa sem gravar nada. */
    parar() { tirarOuvintes(); pendente = null; if (ar) { cancelAnimationFrame(ar.raf); limpar(ar); ar = null; } },
  };
}
