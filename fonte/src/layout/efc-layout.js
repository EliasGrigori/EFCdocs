/* EFC · layout v0.6.15 — peças portáteis (JavaScript puro, sem biblioteca) do layout aprovado pelo Elias no EFCwork em 14/11/2026.
   Tiradas do código testado do EFCwork (src/tabela.js, src/moderno.js, src/calibracao.js) e escritas sem nada do EFCwork,
   para o Vértice Docs usar com o HTML dele. Use junto com efc-layout.css e efc-movimento.css.
   Tudo fica em window.EFCLayout. Cada função diz quando chamar. Nada aqui grava no banco; só o "até onde viu" da gota vai
   para o localStorage (com try/catch). */
(function (G) {
  'use strict';
  const doc = document, raiz = doc.documentElement;
  const mov = () => !(G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches);
  /* lê um token de duração da escala da família (efc-movimento.css); se não existir, usa o padrão */
  const ms = (tok, pad) => { const v = getComputedStyle(raiz).getPropertyValue(tok).trim(), n = parseFloat(v); return isNaN(n) ? pad : /ms$/.test(v) ? n : n * 1000; };
  const EASE = 'cubic-bezier(.22,1,.36,1)';
  const $$ = (s, el) => Array.from((el || doc).querySelectorAll(s));

  /* ============ R1 · tela parada, só a tabela rola (PC) ============
     Chame DEPOIS de cada desenho da tela e no resize. Com UMA tabela na tela e espaço suficiente, a tabela desce até
     o fundo da janela (margem de 16 px) e a página não rola; com duas tabelas ou pouco espaço, cada tabela ganha uma
     altura máxima e a página rola como antes. No celular (< 900 px) não trava nada.
     Importante: só muda a altura quando ela mudou (senão a tabela volta ao topo quando carregam mais linhas). */
  function fixarTela(o) {
    o = Object.assign({ tabela: '.efl-tabela-rola', fora: '.efl-gaveta', margem: 16, pc: 900, minimo: 240, barraTopo: 56 }, o || {});
    const ws = $$(o.tabela).filter(w => !(o.fora && w.closest(o.fora)));
    const poe = (w, h, mh) => { if (w.style.height !== h) w.style.height = h; if (w.style.maxHeight !== mh) w.style.maxHeight = mh; };
    let trava = false;
    if (innerWidth >= o.pc && ws.length === 1) {
      const w = ws[0], topo = w.getBoundingClientRect().top + scrollY, alto = innerHeight - topo - o.margem;
      if (alto >= o.minimo) { if (scrollY) scrollTo(0, 0); poe(w, alto + 'px', ''); trava = true; }
      else poe(w, '', (innerHeight - o.barraTopo - 32) + 'px');
    } else ws.forEach(w => poe(w, '', innerWidth >= o.pc ? (innerHeight - o.barraTopo - 32) + 'px' : ''));
    raiz.classList.toggle('efl-tela-parada', trava);
    return trava;
  }

  /* ============ R1 · o redesenho não volta a tabela ao topo ============
     const volta = EFCLayout.guardaRolagem(); desenha(); volta();
     Cada tabela precisa de um atributo data-efl-tabela="nome-unico" no elemento de fora. */
  function guardaRolagem(sel) {
    sel = sel || '[data-efl-tabela] .efl-tabela-rola';
    const m = {}; $$(sel).forEach(w => { m[w.closest('[data-efl-tabela]').getAttribute('data-efl-tabela')] = [w.scrollTop, w.scrollLeft]; });
    return () => $$(sel).forEach(w => { const r = m[w.closest('[data-efl-tabela]').getAttribute('data-efl-tabela')]; if (r) { w.scrollTop = r[0]; w.scrollLeft = r[1]; } });
  }

  /* ============ R3 · total no selo do cabeçalho ============
     meta = a linha de pílulas debaixo do título (ex.: "5 itens ativos · R$ 303,80 em estoque").
     o = { geral: 'R$ 303,80' (total sem filtro), valor: 'R$ 231,38' (total do que está na tela), filtrado: true/false,
           sufixo: 'em estoque' (o que vem depois do valor sem filtro; padrão "no total") }.
     Se já existe uma pílula com o valor geral, ela mesma vira o total (não duplica). Filtrando: "R$ 231,38 · total filtrado".
     Enquanto a lista ainda carrega, NÃO chame (não existe número de verdade ainda). */
  function seloTotal(meta, o) {
    if (!meta || !o) return null;
    let s = meta.querySelector('.efl-selo-total');
    if (!s) s = $$('.efl-selo', meta).find(x => o.geral && x.textContent.indexOf(o.geral) >= 0) || null;
    if (!s) { s = doc.createElement('span'); s.className = 'efl-selo'; meta.appendChild(s); }
    s.classList.add('efl-selo-total'); s.classList.toggle('efl-filtrado', !!o.filtrado);
    s.textContent = o.filtrado ? o.valor + ' · total filtrado' : (o.geral || o.valor) + ' ' + (o.sufixo || 'no total');
    if (o.dica) s.title = o.dica;
    return s;
  }

  /* ============ R4 · ícones da tabela na linha das abas (PC) ============
     abas = a fileira de abas; ferramentas = o grupo com imprimir/planilha/colunas (recebe a classe efl-ferramentas).
     Chame depois de cada desenho, antes de fixarTela (a altura depende disso). */
  function ferramentasNasAbas(abas, ferramentas, pc) {
    if (!abas || !ferramentas || innerWidth < (pc || 900)) return false;
    if (abas.parentNode && abas.parentNode.classList.contains('efl-abas-linha')) { abas.parentNode.appendChild(ferramentas); }
    else { const w = doc.createElement('div'); w.className = 'efl-abas-linha'; abas.parentNode.insertBefore(w, abas); w.appendChild(abas); w.appendChild(ferramentas); }
    ferramentas.classList.add('efl-ferramentas');
    return true;
  }

  /* ============ R1/R2 · mais linhas carregam sozinhas (no lugar de "Mostrar mais" e de "Mostrando X de Y") ============
     Desenhe as primeiras 100 linhas e, se houver mais, um <div class="efl-fim" data-efl-tabela="nome">Carregando mais…</div>
     no fim da tabela. aoChegar(nome) aumenta o limite (+100) e redesenha. Chame depois de cada desenho. */
  let obsFim = null;
  function carregaMais(aoChegar) {
    if (obsFim) obsFim.disconnect();
    if (typeof IntersectionObserver !== 'function') return;
    obsFim = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; obsFim.unobserve(e.target); aoChegar(e.target.getAttribute('data-efl-tabela')); }));
    $$('.efl-fim').forEach(x => obsFim.observe(x));
  }

  /* ============ R7 · lista de cartões que se rearruma ao trocar o filtro (FLIP, sem "entrar em sequência") ============
     const foto = EFCLayout.fotografa('.lista .cartao', 'data-id'); desenha(); EFCLayout.rearruma('.lista .cartao', 'data-id', foto);
     O cartão que continua desliza até o lugar novo; o que entra aparece no lugar dele; nada entra em fila. */
  function fotografa(sel, attr) { const m = {}; $$(sel).forEach(c => { m[c.getAttribute(attr)] = c.getBoundingClientRect(); }); return m; }
  function rearruma(sel, attr, foto) {
    if (!foto || !mov()) return; const d = ms('--duration-fast', 250);
    $$(sel).forEach(c => { const r0 = foto[c.getAttribute(attr)], r = c.getBoundingClientRect();
      if (r0) { const dy = r0.top - r.top; if (Math.abs(dy) > 1) c.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], { duration: d, easing: EASE }); }
      else c.animate([{ opacity: 0, transform: 'scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: d, easing: EASE }); });
  }

  /* ============ R13 · menu da coluna: some com efeito e, trocando de coluna, desliza até a coluna nova ============
     Antes de redesenhar: const antes = EFCLayout.fotoMenu('.menu-da-coluna');
     Depois: EFCLayout.menuDepois('.menu-da-coluna', antes, colunaMudou) */
  function fotoMenu(sel) { const m = doc.querySelector(sel); return m ? { r: m.getBoundingClientRect(), copia: m.cloneNode(true) } : null; }
  function menuDepois(sel, antes, colunaMudou) {
    if (!antes || !mov()) return; const nv = doc.querySelector(sel);
    if (nv && colunaMudou) {
      requestAnimationFrame(() => { const r2 = nv.getBoundingClientRect(), dx = antes.r.left - r2.left, dy = antes.r.top - r2.top; if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
        nv.style.transition = 'none'; nv.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; void nv.offsetWidth;
        nv.style.transition = 'transform ' + ms('--duration-fast', 250) + 'ms ' + EASE; nv.style.transform = '';
        setTimeout(() => { nv.style.transition = ''; }, ms('--duration-fast', 250) + 50); });
    } else if (!nv) {
      const g = antes.copia, r = antes.r; g.classList.add('efl-sai'); g.setAttribute('aria-hidden', 'true');
      g.style.cssText += ';position:fixed;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;margin:0;right:auto;bottom:auto';
      doc.body.appendChild(g); setTimeout(() => g.remove(), ms('--duration-quick', 150) + 40);
    }
  }

  /* ============ R12 · resultados da busca/paleta mudam de altura sem pular ============
     EFCLayout.alturaSuave(caixaDosResultados, () => { caixa.innerHTML = novos; }) — os itens novos ganham .efl-novo. */
  function alturaSuave(caixa, troca, itemSel) {
    if (!caixa) return troca();
    const h0 = caixa.offsetHeight, ant = new Set($$(itemSel || '[data-k]', caixa).map(x => x.getAttribute('data-k')));
    troca();
    if (!mov()) return;
    $$(itemSel || '[data-k]', caixa).forEach((x, i) => { if (!ant.has(x.getAttribute('data-k'))) { x.style.setProperty('--i', Math.min(i, 5)); x.classList.add('efl-novo'); } });
    const h1 = caixa.scrollHeight; if (Math.abs(h1 - h0) < 2) return;
    caixa.classList.add('efl-altura-suave'); caixa.style.height = h0 + 'px'; void caixa.offsetHeight; caixa.style.height = h1 + 'px';
    setTimeout(() => { caixa.style.height = ''; caixa.classList.remove('efl-altura-suave'); }, ms('--duration-quick', 150) + 30);
  }

  /* ============ R9 · linha do tempo com a gota ============
     EFCLayout.linhaDoTempo(id, etapas) devolve o HTML. etapas = [{ nome, feito, atual?, data? ('2026-11-14'), txt?, quem?, alerta? }]
     Em lista de histórico (ex.: últimas movimentações de um documento), passe da MAIS ANTIGA para a MAIS NOVA, todas com feito: true:
     a gota corre só até o que a pessoa ainda não viu. Depois de pôr o HTML na tela, chame EFCLayout.gota(container). */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmtD = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : esc(d); };
  const CERTO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>';
  const visto = {};
  const chave = id => 'efl-gota-' + id;
  const leVisto = id => { try { return Number(localStorage.getItem(chave(id)) || 0); } catch (e) { return 0; } };
  const gravaVisto = (id, n) => { visto[id] = n; try { localStorage.setItem(chave(id), String(n)); } catch (e) { /* sem armazenamento: só nesta sessão */ } };
  function nivelVisto(id, feitas) { if (visto[id] != null) return Math.min(visto[id], feitas); if (!mov()) return feitas; const v = leVisto(id); return Math.max(1, Math.min(v || 1, feitas)); }
  function linhaDoTempo(id, es) {
    const i0 = es.findIndex(x => !x.feito), feitas = i0 < 0 ? es.length : i0, v = nivelVisto(id, feitas);
    return '<div class="efl-tl-w" data-efl-tl="' + esc(id) + '" data-feitas="' + feitas + '"><span class="efl-tubo" aria-hidden="true"><i class="efl-fluido"></i></span><ol class="efl-tl">' +
      es.map((x, n) => '<li class="' + (x.feito ? 'ok' : x.atual ? 'at' : '') + (x.feito && n >= v ? ' esp' : '') + '"><span class="efl-n"><span class="efl-n-b"><i class="efl-n-in"></i></span><span class="efl-n-nn">' + (n + 1) + '</span>' + CERTO + '</span><div><b>' + esc(x.nome) + (x.data ? ' <em>' + fmtD(x.data) + '</em>' : '') + '</b>' +
        (x.txt ? '<span>' + esc(x.txt) + '</span>' : '') + (x.quem ? '<small>' + esc(x.quem) + '</small>' : '') + (x.atual ? '<small>próxima etapa</small>' : '') + (x.alerta ? '<small class="efl-alerta">' + esc(x.alerta) + '</small>' : '') + '</div></li>').join('') + '</ol></div>';
  }
  const SOBE = 600, PAUSA = 400, GOTA = 300, PARA = 16; /* tempos da opção 3 · Gota (Elias, 06/11 09:07) */
  const tok = {};
  function gota(container, abriuAgora) {
    const ol = (container || doc).querySelector('[data-efl-tl]'); if (!ol) return;
    const id = ol.getAttribute('data-efl-tl'), feitas = Number(ol.getAttribute('data-feitas')) || 0, lis = $$('.efl-tl > li', ol);
    const tubo = ol.querySelector('.efl-tubo'), fl = ol.querySelector('.efl-fluido'); if (!lis.length || !tubo) return;
    const centro = n => lis[n].offsetTop + 14, topo = centro(0);
    tubo.style.top = topo + 'px'; tubo.style.height = (centro(lis.length - 1) - topo) + 'px';
    const alto = n => n <= 1 ? 0 : Math.max(0, centro(n - 1) - topo - PARA);
    let nivel = nivelVisto(id, feitas); const t = (tok[id] || 0) + 1; tok[id] = t;
    fl.style.transition = 'none'; fl.style.height = alto(nivel) + 'px'; void fl.offsetHeight;
    if (nivel >= feitas) { gravaVisto(id, feitas); return; }
    const vivo = () => tok[id] === t && ol.isConnected;
    const passo = () => {
      if (!vivo()) return;
      nivel++; fl.style.transition = 'height ' + SOBE + 'ms cubic-bezier(.45,.05,.3,1)'; fl.style.height = alto(nivel) + 'px';
      setTimeout(() => {
        if (!vivo()) return;
        const g = doc.createElement('i'); g.className = 'efl-gota'; g.style.top = (topo + alto(nivel) - 3) + 'px'; ol.appendChild(g);
        setTimeout(() => {
          g.remove(); if (!vivo()) return;
          const li = lis[nivel - 1]; if (li) { li.classList.remove('esp'); li.classList.add('acende'); const n = li.querySelector('.efl-n'), r = doc.createElement('i'); r.className = 'efl-onda'; n.appendChild(r); setTimeout(() => r.remove(), 650); }
          gravaVisto(id, nivel);
          if (nivel < feitas) setTimeout(passo, PAUSA);
        }, GOTA);
      }, SOBE);
    };
    setTimeout(passo, abriuAgora ? 220 : 0);
  }

  /* ============ R8 · gaveta: registro anterior e próximo sem fechar (setas, Alt + seta para cima/baixo) ============
     EFCLayout.navGaveta({ acoes: elemento .efl-gv-acoes, ids: [ids na ordem da tabela], atual: id, abrir: id => {...} })
     Põe as duas setas antes do X (o X continua sendo o último botão). */
  const SETA = d => '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (d < 0 ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6') + '"/></svg>';
  let navAtual = null;
  function navGaveta(o) {
    if (!o || !o.acoes) return; const k = o.ids.indexOf(o.atual); navAtual = (k < 0 || o.ids.length < 2) ? null : o;
    $$('.efl-gv-nav', o.acoes).forEach(x => x.remove()); if (!navAtual) return;
    const s = doc.createElement('span'); s.className = 'efl-gv-nav'; s.style.display = 'inline-flex';
    s.innerHTML = '<button type="button" data-d="-1" title="Anterior · ' + k + ' de ' + o.ids.length + ' (Alt + seta para cima)" aria-label="Registro anterior"' + (k === 0 ? ' disabled' : '') + '>' + SETA(-1) + '</button>' +
      '<button type="button" data-d="1" title="Próximo · ' + (k + 2) + ' de ' + o.ids.length + ' (Alt + seta para baixo)" aria-label="Próximo registro"' + (k === o.ids.length - 1 ? ' disabled' : '') + '>' + SETA(1) + '</button>';
    if (o.classeBotao) $$('button', s).forEach(b => { b.className = o.classeBotao; });
    s.addEventListener('click', e => { const b = e.target.closest('button[data-d]'); if (b && !b.disabled) anda(Number(b.getAttribute('data-d'))); });
    o.acoes.insertBefore(s, o.acoes.firstChild);
  }
  function anda(d) {
    const o = navAtual; if (!o) return; const k = o.ids.indexOf(o.atual), n = k + d; if (n < 0 || n >= o.ids.length) return;
    o.abrir(o.ids[n]);
    const c = o.corpo && doc.querySelector(o.corpo); if (c && mov()) { c.style.setProperty('--efl-d', d); c.classList.remove('efl-gv-troca'); void c.offsetWidth; c.classList.add('efl-gv-troca'); }
  }
  doc.addEventListener('keydown', e => { if (!navAtual || !e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return; e.preventDefault(); anda(e.key === 'ArrowUp' ? -1 : 1); });

  G.EFCLayout = { versao: '0.6.15', fixarTela, guardaRolagem, seloTotal, ferramentasNasAbas, carregaMais, fotografa, rearruma, fotoMenu, menuDepois, alturaSuave, linhaDoTempo, gota, navGaveta, mov, ms };
})(window);
