/* EFCdocs — editor do quadro de post-its (v0.3.1).
   Quadro livre (post-its, formas de fluxograma, texto, imagem, raias, páginas, legenda) com setas presas,
   visão Kanban dos mesmos post-its, exportar PNG/PDF paisagem e imprimir.
   Toda mudança vira um diff: entra no desfazer/refazer e grava só o que mudou. */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ler, gravar } from '../nucleo/armazem.js';
import { Icone, Janela } from '../ui/comum.jsx';
import * as Q from './modelo.js';
import { itemNoPonto, itensNoRet, normalizarRet, enquadrar, ancora, limites } from './geometria.js';
import { limitesDoQuadro } from './desenho.js';
import { exportarPdf, exportarPng, imprimir, quadroVazio } from './exportar.js';
import { ItemView, CamadaSetas, PontosLigacao, Alca, BarraSelecao, Minimapa, Temporizador, JanelaCores, JanelaFormas, JanelaLocalizar, JanelaModelos, Ferramentas, CoresCelular, Assistente, PainelTarefa, PainelLegenda, PortalPainel } from './partes.jsx';
import { KanbanVista } from './Kanban.jsx';
import { derivar, mudancasLegenda, alturaLegenda } from './legenda.js';
import { resumoTarefa, hojeISO, mudancasOrdenarGut, mudancasTarefa, valorGut } from './tarefa.js';
import { problemas } from './assistente.js';
import { aplicarModelo, ModeloPorId } from './modelos.js';
import { JanelaAssinatura } from '../ui/assinatura.jsx';
import { ASN } from '../nucleo/assinatura.js';

const Z_MIN = 0.2, Z_MAX = 3;
const limitarZ = (z) => Math.max(Z_MIN, Math.min(Z_MAX, z));
const COM_TEXTO = (it) => it && it.tipo !== 'imagem' && it.tipo !== 'legenda' && it.tipo !== 'assinatura';
const COM_COR = (it) => it && ['postit', 'processo', 'decisao', 'inicio', 'dados', 'raia'].includes(it.tipo);
const LIGAVEL = (it) => it && !Q.ehFundo(it) && it.tipo !== 'legenda';
const NOME_TIPO = (it) => Q.TIPOS_ITEM[it.tipo].nome;

/* área de transferência do quadro (vale entre quadros do mesmo aparelho) */
let clipInterno = null;
let marcaClip = '';

function lerImagem(arquivo, max = 1200) {
  return new Promise((ok, erro) => {
    const fr = new FileReader();
    fr.onerror = () => erro(new Error('Não deu para ler a imagem.'));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => erro(new Error('Arquivo de imagem inválido.'));
      img.onload = () => {
        const e = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * e);
        cv.height = Math.round(img.height * e);
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        ok({ src: cv.toDataURL('image/jpeg', 0.82), w: cv.width, h: cv.height });
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(arquivo);
  });
}

export function Quadro({ arquivo, cx }) {
  const ficha = arquivo.ficha;
  const c = arquivo.conteudo;
  const somenteLeitura = !!cx.bloqueado('inserir.postit');

  const [vista, setVistaEstado] = useState(() => (ler('vista:' + ficha.id, 'quadro') === 'kanban' ? 'kanban' : 'quadro'));
  const setVista = (v) => { setVistaEstado(v); gravar('vista:' + ficha.id, v); };
  const vpSalvo = useRef(ler('vp:' + ficha.id, null));
  const [view, setView] = useState(() => vpSalvo.current || { x: 60, y: 60, z: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const [sel, setSelEstado] = useState({ itens: [], seta: null });
  const [arrasto, setArrasto] = useState(null);
  const [editando, setEditando] = useState(null);
  const [modo, setModo] = useState(null);
  const [qp, setQp] = useState(() => {
    const salvo = ler('quadro-prefs', {});
    /* v0.4.4.1: a barra da esquerda começa escondida (a faixa Inserir tem tudo); quem já tinha escolha antiga volta ao novo padrão uma vez */
    if (salvo.v !== 2) { salvo.ferramentas = false; salvo.v = 2; }
    return { minimapa: false, codigos: true, ortografia: true, ferramentas: false, ...salvo };
  });
  const [assistAberto, setAssistAberto] = useState(false);
  const [timer, setTimer] = useState(false);
  const [janela, setJanela] = useState(null);
  const [asn, setAsn] = useState(null); /* janela da assinatura: { id (null = nova), inicial } */
  const [area, setArea] = useState({ w: 800, h: 600 });
  const areaRef = useRef(null);
  const imgRef = useRef(null);
  const gesto = useRef(null);
  const toques = useRef(new Map());
  const descidas = useRef([0, 0]); // hora dos dois últimos toques no quadro (para os dois cliques)
  const espaco = useRef(false);

  useEffect(() => { gravar('quadro-prefs', qp); }, [qp]);
  const trocarQp = (k) => setQp((p) => ({ ...p, [k]: !p[k] }));

  /* seleção sempre só com o que existe (depois de desfazer, por exemplo) */
  const selValida = useMemo(() => ({
    itens: sel.itens.filter((id) => c.itens[id]),
    seta: sel.seta && c.setas[sel.seta] ? sel.seta : null,
  }), [sel, c]);
  const setSel = setSelEstado;
  const umItem = selValida.itens.length === 1 ? c.itens[selValida.itens[0]] : null;

  /* criouRef: item recém-criado; o primeiro texto dele entra na mesma ação do desfazer (um Ctrl+Z desfaz criar + escrever) */
  const criouRef = useRef(null);
  const aplicarQ = useCallback((mud, rotulo, acao, opcoes = {}) => {
    if (!mud || !Object.keys(mud).length) return false;
    const ok = cx.aplicar(Q.noArquivo(mud), rotulo, acao, opcoes);
    criouRef.current = opcoes.criou || null;
    return ok;
  }, [cx]);

  /* ---------- tamanho da área e primeiro enquadramento ---------- */
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return undefined;
    const medir = () => setArea({ w: el.clientWidth, h: el.clientHeight });
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [vista]);

  const ajustar = useCallback(() => {
    const el = areaRef.current;
    if (!el) return;
    const lim = limitesDoQuadro(c);
    if (!lim) { setView({ x: 60, y: 60, z: 1 }); return; }
    setView(enquadrar(lim, el.clientWidth, el.clientHeight, 48, Z_MIN, 1.25));
  }, [c]);

  useEffect(() => {
    if (!vpSalvo.current && Q.listaItens(c).length) ajustar();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => gravar('vp:' + ficha.id, view), 400);
    return () => clearTimeout(t);
  }, [view, ficha.id]);

  /* ---------- conteúdo com o arrasto em andamento ---------- */
  const cd = useMemo(() => derivar(c), [c]); /* legendas com altura e linhas calculadas (nunca gravado) */
  const cv = useMemo(() => {
    if (!arrasto) return cd;
    if (arrasto.tipo === 'mover' && (arrasto.dx || arrasto.dy)) {
      const itens = { ...cd.itens };
      for (const id of arrasto.ids) if (itens[id]) itens[id] = { ...itens[id], x: Math.round(itens[id].x + arrasto.dx), y: Math.round(itens[id].y + arrasto.dy) };
      return { ...cd, itens };
    }
    if (arrasto.tipo === 'tamanho' && cd.itens[arrasto.id]) {
      return { ...cd, itens: { ...cd.itens, [arrasto.id]: { ...cd.itens[arrasto.id], w: arrasto.w, h: arrasto.h } } };
    }
    return cd;
  }, [cd, arrasto]);
  /* "hoje" acompanha o relógio: passou da meia-noite (ou o aparelho acordou), os prazos se atualizam sozinhos */
  const [hoje, setHoje] = useState(hojeISO);
  useEffect(() => {
    const confere = () => setHoje((h) => { const n = hojeISO(); return n === h ? h : n; });
    const t = setInterval(confere, 30000);
    document.addEventListener('visibilitychange', confere);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', confere); };
  }, []);
  const pendencias = useMemo(() => problemas(c, hoje), [c, hoje]);

  const ordenados = useMemo(() => Q.porZ(cv), [cv]);

  /* ---------- coordenadas ---------- */
  const paraMundo = (px, py) => {
    const r = areaRef.current.getBoundingClientRect();
    const v = viewRef.current;
    return { x: (px - r.left - v.x) / v.z, y: (py - r.top - v.y) / v.z };
  };
  const centroVisivel = () => {
    const v = viewRef.current;
    return { x: (area.w / 2 - v.x) / v.z, y: (area.h / 2 - v.y) / v.z };
  };
  const zoomEm = (fator, sx, sy) => {
    setView((v) => {
      const z = limitarZ(v.z * fator);
      const px = sx ?? area.w / 2, py = sy ?? area.h / 2;
      return { z, x: px - ((px - v.x) * z) / v.z, y: py - ((py - v.y) * z) / v.z };
    });
  };
  const irPara = (wx, wy) => setView((v) => ({ ...v, x: area.w / 2 - wx * v.z, y: area.h / 2 - wy * v.z }));
  const mostrarItem = (it) => {
    const v = viewRef.current;
    const sx = v.x + it.x * v.z, sy = v.y + it.y * v.z;
    if (sx < 0 || sy < 0 || sx + it.w * v.z > area.w || sy + it.h * v.z > area.h) irPara(it.x + it.w / 2, it.y + it.h / 2);
  };

  /* ---------- ações ---------- */
  const avisoSelecione = () => cx.avisar('Escolha um item no quadro antes.', { ic: 'info' });

  const inserir = useCallback((tipo, extra = {}) => {
    if (vista === 'kanban' && tipo !== 'postit') setVista('quadro');
    const t = Q.TIPOS_ITEM[tipo];
    const ctr = centroVisivel();
    let v = Q.vagaLivre(c, ctr.x - (extra.w || t.w) / 2, ctr.y - (extra.h || t.h) / 2, extra.w || t.w, extra.h || t.h);
    let campos = tipo === 'pagina' ? { texto: 'Página ' + (Q.contagem(c).paginas + 1) } : {};
    if (tipo === 'pagina') {
      /* página nova não cai em cima de outra: vai para a direita da última, e desce quando a fileira enche */
      const w = extra.w || t.w, h = extra.h || t.h;
      const outras = Q.listaItens(c).filter((i) => i.tipo === 'pagina');
      const bate = (x, y) => outras.some((o) => x < o.x + o.w && x + w > o.x && y < o.y + o.h && y + h > o.y);
      let { x, y } = v;
      for (let i = 0; i < 60 && bate(x, y); i++) {
        x += w + 40;
        if ((i + 1) % 3 === 0) { x = v.x; y += h + 40; }
      }
      v = { x, y };
    }
    if (tipo === 'legenda') {
      /* a legenda entra ao lado do fluxo, com a altura que as linhas pedem */
      const miolo = Q.listaItens(c).filter((i) => !Q.ehFundo(i));
      const lim = miolo.length ? limites(miolo) : null;
      campos = { h: alturaLegenda(c, {}) };
      if (lim) v = { x: Math.round(lim.x + lim.w + 60), y: Math.round(lim.y) };
    }
    const r = Q.novoItem(c, tipo, { ...v, ...campos, ...extra });
    aplicarQ(r.mudancas, 'Novo: ' + t.nome.toLowerCase(), 'criou item', { criou: r.item.id });
    setSel({ itens: [r.item.id], seta: null });
    if (COM_TEXTO(r.item) && tipo !== 'raia') setEditando({ id: r.item.id, valor: r.item.texto || '' });
    return r.item;
  }, [c, vista, aplicarQ]); // eslint-disable-line react-hooks/exhaustive-deps

  const excluir = useCallback(() => {
    if (!selValida.itens.length && !selValida.seta) { avisoSelecione(); return; }
    const mud = Q.mudancasExcluir(c, selValida.itens, selValida.seta ? [selValida.seta] : []);
    const n = selValida.itens.length;
    aplicarQ(mud, n ? `Excluir ${n} ${n === 1 ? 'item' : 'itens'}` : 'Excluir seta', 'excluiu');
    setSel({ itens: [], seta: null });
    cx.avisar(n ? `${n} ${n === 1 ? 'item excluído' : 'itens excluídos'}.` : 'Seta excluída.', { ic: 'lixeira', acao: { rotulo: 'Desfazer', fazer: () => cx.executar('editar.desfazer') } });
  }, [c, selValida, aplicarQ, cx]);

  const copiar = useCallback((recortar) => {
    if (!selValida.itens.length) { avisoSelecione(); return; }
    clipInterno = Q.copiar(c, selValida.itens);
    marcaClip = clipInterno.itens.map((i) => i.texto).join('\n') || ' ';
    /* a rubrica não vai para o armazenamento do navegador (fica só no arquivo); colar logo em seguida, na mesma sessão, leva a rubrica */
    try { localStorage.setItem('efcdocs:clip-quadro', JSON.stringify({ ...clipInterno, marca: marcaClip, itens: clipInterno.itens.map((i) => { if (i.tipo !== 'assinatura') return i; const { rub, ...resto } = i; return resto; }) })); } catch { /* cheio */ }
    try { navigator.clipboard && navigator.clipboard.writeText(marcaClip).catch(() => {}); } catch { /* sem permissão */ }
    if (recortar) {
      aplicarQ(Q.mudancasExcluir(c, selValida.itens), 'Recortar', 'recortou');
      setSel({ itens: [], seta: null });
    } else cx.avisar(`${clipInterno.itens.length} ${clipInterno.itens.length === 1 ? 'item copiado' : 'itens copiados'}.`, { ic: 'copiar' });
  }, [c, selValida, aplicarQ, cx]);

  const colarClip = useCallback((clip) => {
    if (!clip || !clip.itens || !clip.itens.length) { cx.avisar('Nada para colar. Copie itens do quadro antes.', { ic: 'info' }); return; }
    const lim = limites(clip.itens);
    const ctr = centroVisivel();
    const dentroDaTela = selValida.itens.length || (lim && Math.abs(lim.x + lim.w / 2 - ctr.x) < area.w / viewRef.current.z / 2);
    const soAssinatura = clip.itens.every((i) => i.tipo === 'assinatura');
    const desl = dentroDaTela ? (soAssinatura && lim ? { x: Math.round(lim.w + 24), y: 0 } : { x: 24, y: 24 }) : { x: Math.round(ctr.x - lim.x - lim.w / 2), y: Math.round(ctr.y - lim.y - lim.h / 2) };
    const r = Q.colar(c, clip, desl);
    aplicarQ(r.mudancas, 'Colar', 'colou');
    setSel({ itens: r.ids, seta: null });
    /* a próxima colagem sai um pouco mais adiante, em vez de cair em cima desta */
    clipInterno = { itens: clip.itens.map((i) => ({ ...i, x: i.x + desl.x, y: i.y + desl.y })), setas: clip.setas || [] };
  }, [c, selValida, aplicarQ, cx, area]); // eslint-disable-line react-hooks/exhaustive-deps

  const colar = useCallback(() => {
    let clip = clipInterno;
    if (!clip) { try { clip = JSON.parse(localStorage.getItem('efcdocs:clip-quadro') || 'null'); } catch { clip = null; } }
    colarClip(clip);
  }, [colarClip]);

  const duplicar = useCallback(() => {
    if (!selValida.itens.length) { avisoSelecione(); return; }
    const r = Q.colar(c, Q.copiar(c, selValida.itens));
    aplicarQ(r.mudancas, 'Duplicar', 'duplicou');
    setSel({ itens: r.ids, seta: null });
  }, [c, selValida, aplicarQ]); // eslint-disable-line react-hooks/exhaustive-deps

  const proximo = useCallback((id, lado = 'r') => {
    if (!LIGAVEL(c.itens[id])) return;
    const r = Q.proximoPasso(c, id, lado);
    if (!r) return;
    aplicarQ(r.mudancas, 'Próximo passo', 'criou item');
    setSel({ itens: [r.item.id], seta: null });
    setEditando({ id: r.item.id, valor: '' });
    mostrarItem(r.item);
  }, [c, aplicarQ]); // eslint-disable-line react-hooks/exhaustive-deps

  const ligar = useCallback((de, para) => {
    if (de === para) return false;
    if (!LIGAVEL(c.itens[de]) || !LIGAVEL(c.itens[para])) { cx.avisar('Página, raia e legenda não se ligam com seta.', { ic: 'info' }); return false; }
    if (Q.setaEntre(c, de, para)) { cx.avisar('Esses dois já estão ligados por uma seta.', { ic: 'info' }); return false; }
    const r = Q.novaSeta(c, de, para);
    aplicarQ(r.mudancas, 'Ligar com seta', 'ligou');
    setSel({ itens: [], seta: r.seta.id });
    return true;
  }, [c, aplicarQ, cx]);

  const mudarFonte = (chave) => {
    const alvo = selValida.itens.map((id) => c.itens[id]).filter(COM_TEXTO);
    if (!alvo.length) { avisoSelecione(); return; }
    const todos = alvo.every((it) => it.fonte && it.fonte[chave]);
    const mud = {};
    for (const it of alvo) mud['itens.' + it.id] = { ...it, fonte: { ...(it.fonte || {}), [chave]: !todos } };
    aplicarQ(mud, { n: 'Negrito', i: 'Itálico', s: 'Sublinhado' }[chave], 'formatou');
  };
  const mudarCampo = (campos, rotulo, ids = selValida.itens) => {
    if (!ids.length) { avisoSelecione(); return; }
    aplicarQ(Q.mudancasCampo(c, ids, campos), rotulo, 'formatou');
  };
  const mudarTarefa = (id, campos) => mudancasTarefa(c, id, campos);
  const mudarLegenda = (id, tipo, campo, valor) => mudancasLegenda(c, id, tipo, campo, valor);
  const mudarSeta = (campos, rotulo) => {
    const s = c.setas[selValida.seta];
    if (s) aplicarQ({ ['setas.' + s.id]: { ...s, ...campos } }, rotulo, 'mudou seta');
  };

  const pedirComentario = () => {
    if (!umItem) { avisoSelecione(); return; }
    cx.perguntar({ titulo: 'Comentário · ' + (umItem.cod || NOME_TIPO(umItem)), campo: 'Comentário (aparece no painel e no ícone do item)', varias: true, valor: umItem.nota || '', confirmar: 'Salvar comentário', max: 1000,
      aoConfirmar: (v) => mudarCampo({ nota: v.trim() || undefined }, v.trim() ? 'Comentário' : 'Tirar comentário', [umItem.id]) });
  };
  const pedirLink = () => {
    if (!umItem) { avisoSelecione(); return; }
    cx.perguntar({ titulo: 'Link · ' + (umItem.cod || NOME_TIPO(umItem)), campo: 'Endereço (começa com https://). Deixe vazio para tirar.', valor: umItem.link || '', confirmar: 'Salvar link', max: 500, modo: 'url', dica: 'https://',
      validar: (v) => (!v.trim() || /^https?:\/\/\S+$/i.test(v.trim()) ? '' : 'Use um endereço que comece com https:// ou http://'),
      aoConfirmar: (v) => mudarCampo({ link: v.trim() || undefined }, v.trim() ? 'Link' : 'Tirar link', [umItem.id]) });
  };

  const exportar = async (como) => {
    if (quadroVazio(c, vista)) { cx.avisar(vista === 'kanban' ? 'O Kanban está sem post-its.' : 'O quadro está vazio.', { ic: 'info' }); return; }
    const opcoes = { vista, codigos: qp.codigos, demo: cx.demo };
    try {
      if (como === 'pdf') { cx.avisar('Gerando o PDF paisagem…', { ic: 'pdf' }); await exportarPdf(c, ficha.nome, opcoes); cx.avisar(`PDF pronto: ${ficha.nome}.pdf`, { ic: 'pdf' }); }
      if (como === 'png') { await exportarPng(c, ficha.nome, opcoes); cx.avisar(`Imagem pronta: ${ficha.nome}.png`, { ic: 'imagem' }); }
      if (como === 'imprimir') await imprimir(c, ficha.nome, opcoes);
    } catch {
      cx.avisar('Não deu para gerar o arquivo. Tente de novo.', { ic: 'aviso' });
    }
  };

  const escolherImagem = async (arq) => {
    if (!arq) return;
    if (!/^image\//.test(arq.type)) { cx.avisar('Escolha um arquivo de imagem (JPG ou PNG).', { ic: 'aviso' }); return; }
    try {
      const im = await lerImagem(arq);
      const e = Math.min(1, 320 / im.w);
      inserir('imagem', { src: im.src, w: Math.round(im.w * e), h: Math.round(im.h * e), texto: arq.name.replace(/\.[^.]+$/, '') });
      setEditando(null);
      if (im.src.length > 600000) cx.avisar('Imagem grande: ela ocupa espaço no aparelho. Prefira fotos menores.', { ic: 'aviso' });
    } catch (e) {
      cx.avisar(e.message, { ic: 'aviso' });
    }
  };

  /* assinatura: cria ou troca nome e rubrica de uma vez (um só Ctrl+Z) */
  const confirmarAssinatura = (v) => {
    const alvo = asn && asn.id ? c.itens[asn.id] : null;
    if (alvo) {
      const novo = { ...alvo, texto: v.nome };
      if (v.rub) novo.rub = v.rub; else delete novo.rub;
      aplicarQ({ ['itens.' + alvo.id]: novo }, 'Assinatura', 'editou');
      return;
    }
    inserir('assinatura', v.rub ? { texto: v.nome, rub: v.rub } : { texto: v.nome });
    cx.avisar('Assinatura inserida. Toque duas vezes nela para mudar o nome ou a rubrica.', { ic: 'assinatura' });
  };

  const usarModelo = (id) => {
    const m = ModeloPorId[id];
    if (!m) return;
    if (vista === 'kanban' && id !== 'kanban') setVista('quadro');
    if (vista !== 'kanban' && id === 'kanban') setVista('kanban');
    const r = aplicarModelo(c, id);
    aplicarQ(r.mudancas, 'Modelo: ' + m.nome, 'criou modelo');
    setSel({ itens: r.ids, seta: null });
    if (id !== 'kanban') setTimeout(() => { const el = areaRef.current; if (el) setView(enquadrar(r.lim, el.clientWidth, el.clientHeight, 70, Z_MIN, 1.1)); }, 40);
    cx.avisar(`Modelo "${m.nome}" inserido. Troque os textos de exemplo.`, { ic: 'quadro', acao: { rotulo: 'Desfazer', fazer: () => cx.executar('editar.desfazer') } });
  };

  const irParaPendencia = (p) => {
    const it = c.itens[p.item];
    if (!it) return;
    setVista('quadro');
    setSel({ itens: [it.id], seta: null });
    setTimeout(() => mostrarItem(it), 40);
    if (cx.cel) setAssistAberto(false);
  };

  /* ---------- comandos do catálogo ---------- */
  const trata = (id) => {
    switch (id) {
      case 'inserir.postit': inserir('postit'); return true;
      case 'inserir.processo': inserir('processo'); return true;
      case 'inserir.decisao': inserir('decisao'); return true;
      case 'inserir.inicio': inserir('inicio'); return true;
      case 'inserir.dados': inserir('dados'); return true;
      case 'inserir.texto': inserir('texto', { texto: '' }); return true;
      case 'inserir.pagina': inserir('pagina'); return true;
      case 'inserir.legenda': inserir('legenda'); return true;
      case 'inserir.modelo': setJanela('modelos'); return true;
      case 'exibir.ferramentas': trocarQp('ferramentas'); return true;
      case 'exibir.assistente': setAssistAberto(!assistAberto); return true;
      case 'organizar.ordenarGut': {
        if (!Q.listaItens(c).some((i) => valorGut(i) > 0)) { cx.avisar('Nenhum post-it tem a nota GUT. Dê notas de 1 a 5 em G, U e T no painel do post-it.', { ic: 'info' }); return true; }
        const mud = mudancasOrdenarGut(c);
        if (!Object.keys(mud).length) cx.avisar('As colunas já estão na ordem do GUT.', { ic: 'info' });
        else { aplicarQ(mud, 'Ordenar pelo GUT', 'ordem'); cx.avisar('Cada coluna ficou do maior GUT para o menor. Post-its sem nota ficam no fim.', { ic: 'kanban', acao: { rotulo: 'Desfazer', fazer: () => cx.executar('editar.desfazer') } }); }
        return true;
      }
      case 'inserir.forma': setJanela('formas'); return true;
      case 'inserir.imagem': imgRef.current && imgRef.current.click(); return true;
      case 'inserir.assinatura': setAsn({ id: null, inicial: {} }); return true;
      case 'inserir.link': pedirLink(); return true;
      case 'inserir.seta':
        if (vista === 'kanban') setVista('quadro');
        setModo(modo && modo.tipo === 'seta' ? null : { tipo: 'seta', de: umItem ? umItem.id : null });
        return true;
      case 'inserir.proximo': if (umItem) proximo(umItem.id); else avisoSelecione(); return true;
      case 'editar.copiar': copiar(false); return true;
      case 'editar.recortar': copiar(true); return true;
      case 'editar.colar': colar(); return true;
      case 'editar.duplicar': duplicar(); return true;
      case 'editar.excluir': excluir(); return true;
      case 'editar.selecionarTudo': setSel({ itens: Q.listaItens(c).filter((i) => !Q.ehFundo(i)).map((i) => i.id), seta: null }); return true;
      case 'editar.comentar': pedirComentario(); return true;
      case 'editar.localizar': setJanela('localizar'); return true;
      case 'editar.pincel':
        if (modo && modo.tipo === 'pincel') { setModo(null); return true; }
        if (!umItem) { cx.avisar('Escolha o item com a formatação que quer copiar e toque no Pincel.', { ic: 'info' }); return true; }
        setModo({ tipo: 'pincel', estilo: { cor: umItem.cor, fonte: umItem.fonte, alinh: umItem.alinh } });
        return true;
      case 'formatar.negrito': mudarFonte('n'); return true;
      case 'formatar.italico': mudarFonte('i'); return true;
      case 'formatar.sublinhado': mudarFonte('s'); return true;
      case 'formatar.corFonte': if (selValida.itens.length) setJanela('corFonte'); else avisoSelecione(); return true;
      case 'formatar.preenchimento': if (selValida.itens.length) setJanela('cores'); else avisoSelecione(); return true;
      case 'formatar.esquerda': mudarCampo({ alinh: 'e' }, 'Alinhar à esquerda'); return true;
      case 'formatar.centro': mudarCampo({ alinh: 'c' }, 'Centralizar'); return true;
      case 'formatar.direita': mudarCampo({ alinh: 'd' }, 'Alinhar à direita'); return true;
      case 'organizar.kanban': setVista(vista === 'kanban' ? 'quadro' : 'kanban'); return true;
      case 'organizar.quadro': setVista('quadro'); return true;
      case 'organizar.raias': {
        if (vista === 'kanban') setVista('quadro');
        const v = viewRef.current;
        aplicarQ(Q.criarRaias(c, Math.round(-v.x / v.z + 20), Math.round(-v.y / v.z + 20)), 'Raias por setor', 'criou raias');
        cx.avisar('Raias criadas. Toque duas vezes no nome para trocar o setor.', { ic: 'raias' });
        return true;
      }
      case 'organizar.frente': if (selValida.itens.length) aplicarQ(Q.mudancasFrente(c, selValida.itens), 'Trazer para a frente', 'ordem'); else avisoSelecione(); return true;
      case 'organizar.tras': if (selValida.itens.length) aplicarQ(Q.mudancasTras(c, selValida.itens), 'Mandar para trás', 'ordem'); else avisoSelecione(); return true;
      case 'organizar.temporizador': setTimer(!timer); return true;
      case 'exibir.zoom': setJanela('zoom'); return true;
      case 'exibir.ajustar': setVista('quadro'); setTimeout(ajustar, 0); return true;
      case 'exibir.minimapa': trocarQp('minimapa'); return true;
      case 'exibir.codigos': trocarQp('codigos'); return true;
      case 'revisao.ortografia':
        trocarQp('ortografia');
        cx.avisar(qp.ortografia ? 'Correção ortográfica desligada.' : 'Correção ortográfica ligada: o corretor do aparelho sublinha as palavras ao escrever.', { ic: 'ortografia' });
        return true;
      case 'arquivo.exportarPDF': exportar('pdf'); return true;
      case 'arquivo.exportarImagem': exportar('png'); return true;
      case 'arquivo.imprimir': exportar('imprimir'); return true;
      default: return false;
    }
  };

  const ligado = (id) => {
    const alvo = selValida.itens.map((i) => c.itens[i]).filter(COM_TEXTO);
    const todos = (f) => alvo.length > 0 && alvo.every(f);
    switch (id) {
      case 'organizar.kanban': return vista === 'kanban';
      case 'organizar.quadro': return vista === 'quadro';
      case 'exibir.minimapa': return qp.minimapa;
      case 'exibir.ferramentas': return qp.ferramentas;
      case 'exibir.assistente': return assistAberto;
      case 'exibir.codigos': return qp.codigos;
      case 'revisao.ortografia': return qp.ortografia;
      case 'organizar.temporizador': return timer;
      case 'inserir.modelo': return janela === 'modelos';
      case 'editar.pincel': return !!(modo && modo.tipo === 'pincel');
      case 'inserir.seta': return !!(modo && modo.tipo === 'seta');
      case 'formatar.negrito': return todos((it) => it.fonte && it.fonte.n);
      case 'formatar.italico': return todos((it) => it.fonte && it.fonte.i);
      case 'formatar.sublinhado': return todos((it) => it.fonte && it.fonte.s);
      case 'formatar.esquerda': return todos((it) => (it.alinh || (it.tipo === 'texto' ? 'e' : 'c')) === 'e');
      case 'formatar.centro': return todos((it) => (it.alinh || (it.tipo === 'texto' ? 'e' : 'c')) === 'c');
      case 'formatar.direita': return todos((it) => it.alinh === 'd');
      default: return false;
    }
  };

  const maos = useRef({});
  maos.current = { trata, ligado };
  useEffect(() => {
    cx.registrarEditor({ trata: (id) => maos.current.trata(id), ligado: (id) => maos.current.ligado(id) });
    return () => cx.registrarEditor(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* status no rodapé (e avisa o topo que o que está ligado mudou) */
  useEffect(() => {
    cx.setStatus({ ...Q.contagem(c), sel: selValida.itens.length + (selValida.seta ? 1 : 0), zoom: vista === 'quadro' ? view.z : 0, vista, qp, modo: modo && modo.tipo });
  }, [c, selValida.itens.length, selValida.seta, view.z, vista, qp, modo]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- edição de texto ---------- */
  const comecarEdicao = (it) => {
    if (somenteLeitura && cx.travado && cx.chamarFaixa) cx.chamarFaixa();
    if (somenteLeitura) return;
    if (it.tipo === 'assinatura') { setSel({ itens: [it.id], seta: null }); setAsn({ id: it.id, inicial: { nome: it.texto, rub: it.rub } }); return; }
    if (!COM_TEXTO(it)) return;
    setSel({ itens: [it.id], seta: null });
    setEditando({ id: it.id, valor: it.texto || '' });
  };
  const terminarEdicao = (salvar) => {
    const e = editando;
    setEditando(null);
    if (!salvar || !e) return;
    if (e.seta) {
      const s = c.setas[e.seta];
      if (s && (s.rotulo || '') !== e.valor.trim()) aplicarQ({ ['setas.' + s.id]: { ...s, rotulo: e.valor.trim().slice(0, 60) } }, 'Texto da seta', 'editou texto');
      return;
    }
    const it = c.itens[e.id];
    if (it && it.texto !== e.valor) aplicarQ(Q.mudancasCampo(c, [it.id], { texto: e.valor.slice(0, 2000) }), 'Editar texto', 'editou texto', { juntar: criouRef.current === it.id });
  };

  /* ---------- toque e mouse no quadro ---------- */
  const aoBaixar = (ev) => {
    if (editando) return; /* o blur do campo salva */
    const el = ev.target;
    if (el.closest('.qd-barra,.qd-mini,.qd-timer,.qd-zoom,.qd-vistas,.qd-vazio,.qd-modo,.qd-ferr,.qd-lamp,.qd-assist,.qd-cores-cel')) return;
    descidas.current = [descidas.current[1], ev.timeStamp];
    toques.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (toques.current.size === 2) {
      const [a, b] = [...toques.current.values()];
      const r = areaRef.current.getBoundingClientRect();
      gesto.current = { tipo: 'pinca', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, c0: { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top }, v0: viewRef.current };
      setArrasto(null);
      return;
    }
    if (toques.current.size > 2) return;
    /* o ponteiro só é "preso" quando o arrasto começa (assim o duplo clique chega no item ou na seta) */
    const p = paraMundo(ev.clientX, ev.clientY);
    const base = { x0: ev.clientX, y0: ev.clientY, moveu: false, pid: ev.pointerId };
    if (ev.button === 1 || espaco.current) { gesto.current = { tipo: 'pan', ...base, v0: viewRef.current }; return; }

    const ponto = el.closest('[data-ponto]');
    const alca = el.closest('[data-alca]');
    const itemEl = el.closest('[data-item]');
    const setaEl = el.closest('[data-seta]');

    if (ponto && !somenteLeitura) {
      const de = ponto.dataset.de, lado = ponto.dataset.ponto;
      gesto.current = { tipo: 'ligar', ...base, de, lado, inicio: ancora(c.itens[de], lado) };
      ev.preventDefault();
      return;
    }
    if (alca && !somenteLeitura) {
      const it = c.itens[alca.dataset.alca];
      gesto.current = { tipo: 'tamanho', ...base, id: it.id, w0: it.w, h0: it.h };
      return;
    }
    if (modo && modo.tipo === 'seta') {
      if (itemEl && LIGAVEL(c.itens[itemEl.dataset.item])) {
        const id = itemEl.dataset.item;
        if (!modo.de) setModo({ tipo: 'seta', de: id });
        else if (id !== modo.de) { ligar(modo.de, id); setModo(null); }
      }
      gesto.current = null;
      return;
    }
    if (modo && modo.tipo === 'pincel' && itemEl) {
      const id = itemEl.dataset.item;
      const it = c.itens[id];
      const campos = { fonte: modo.estilo.fonte, alinh: modo.estilo.alinh };
      if (modo.estilo.cor && it.tipo !== 'texto' && it.tipo !== 'imagem') campos.cor = modo.estilo.cor;
      aplicarQ(Q.mudancasCampo(c, [id], campos), 'Pincel de formatação', 'formatou');
      setModo(null);
      setSel({ itens: [id], seta: null });
      gesto.current = null;
      return;
    }
    if (itemEl) {
      const id = itemEl.dataset.item;
      if (ev.shiftKey || ev.ctrlKey || ev.metaKey) {
        setSel((s) => ({ itens: s.itens.includes(id) ? s.itens.filter((x) => x !== id) : [...s.itens, id], seta: null }));
        gesto.current = null;
        return;
      }
      let ids = selValida.itens;
      if (!ids.includes(id)) { ids = [id]; setSel({ itens: [id], seta: null }); }
      /* raia e página levam junto o que está dentro delas */
      const levar = new Set(ids);
      for (const rid of ids) {
        const r = c.itens[rid];
        if (r && Q.ehFundo(r)) for (const o of Q.listaItens(c)) {
          if (Q.ehFundo(o)) continue;
          const cxo = o.x + o.w / 2, cyo = o.y + o.h / 2;
          if (cxo >= r.x && cxo <= r.x + r.w && cyo >= r.y && cyo <= r.y + r.h) levar.add(o.id);
        }
      }
      gesto.current = somenteLeitura ? null : { tipo: 'mover', ...base, ids: [...levar] };
      return;
    }
    if (setaEl) {
      setSel({ itens: [], seta: setaEl.dataset.seta });
      gesto.current = null;
      return;
    }
    if (ev.pointerType === 'mouse' && ev.button === 0) gesto.current = { tipo: 'area', ...base, a: p, somar: ev.shiftKey };
    else gesto.current = { tipo: 'pan', ...base, v0: viewRef.current };
  };

  const aoMover = (ev) => {
    if (toques.current.has(ev.pointerId)) toques.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const g = gesto.current;
    if (!g) return;
    if (g.tipo === 'pinca') {
      if (toques.current.size < 2) return;
      const [a, b] = [...toques.current.values()];
      const r = areaRef.current.getBoundingClientRect();
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const cAtual = { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top };
      const z = limitarZ(g.v0.z * (d / g.d0));
      const wx = (g.c0.x - g.v0.x) / g.v0.z, wy = (g.c0.y - g.v0.y) / g.v0.z;
      setView({ z, x: cAtual.x - wx * z, y: cAtual.y - wy * z });
      return;
    }
    const dx = ev.clientX - g.x0, dy = ev.clientY - g.y0;
    if (!g.moveu && Math.hypot(dx, dy) < (ev.pointerType === 'touch' ? 6 : 3)) return;
    if (!g.moveu) { try { areaRef.current.setPointerCapture(g.pid); } catch { /* sem captura */ } }
    g.moveu = true;
    const z = viewRef.current.z;
    if (g.tipo === 'pan') setView({ ...g.v0, x: g.v0.x + dx, y: g.v0.y + dy });
    else if (g.tipo === 'mover') setArrasto({ tipo: 'mover', ids: g.ids, ...encaixar(g.ids, dx / z, dy / z, z, ev.altKey) });
    else if (g.tipo === 'tamanho') { const mn = c.itens[g.id] && c.itens[g.id].tipo === 'assinatura' ? { w: ASN.W_MIN, h: ASN.H_MIN } : { w: 40, h: 30 }; setArrasto({ tipo: 'tamanho', id: g.id, w: Math.max(mn.w, Math.round(g.w0 + dx / z)), h: Math.max(mn.h, Math.round(g.h0 + dy / z)) }); }
    else if (g.tipo === 'ligar') {
      const p = paraMundo(ev.clientX, ev.clientY);
      const alvo = itemNoPonto(Q.listaItens(c).filter((i) => LIGAVEL(i)), p, g.de);
      /* a linha "gruda" no centro do item de destino; solta no vazio cria um item novo ali */
      setArrasto({ tipo: 'ligar', de: g.inicio, p: alvo ? { x: alvo.x + alvo.w / 2, y: alvo.y + alvo.h / 2 } : p, alvo: alvo ? alvo.id : null });
    } else if (g.tipo === 'area') setArrasto({ tipo: 'area', a: g.a, b: paraMundo(ev.clientX, ev.clientY) });
  };

  /* alinhamento automático: o centro do que está sendo arrastado encaixa no centro de outro item
     (tolerância de 7 px na tela) e aparece uma linha guia. Alt solta o encaixe. */
  const encaixar = (ids, dx, dy, z, livre) => {
    if (livre) return { dx, dy, guias: [] };
    const movidos = ids.map((id) => c.itens[id]).filter(Boolean);
    const bb = limites(movidos.map((it) => ({ ...it, x: it.x + dx, y: it.y + dy })));
    if (!bb) return { dx, dy, guias: [] };
    const cx0 = bb.x + bb.w / 2, cy0 = bb.y + bb.h / 2, tol = 7 / z;
    let mx = null, my = null;
    for (const o of Q.listaItens(c)) {
      if (ids.includes(o.id) || Q.ehFundo(o)) continue;
      const ox = o.x + o.w / 2, oy = o.y + o.h / 2;
      if (Math.abs(ox - cx0) < tol && (!mx || Math.abs(ox - cx0) < Math.abs(mx.v - cx0))) mx = { v: ox, o };
      if (Math.abs(oy - cy0) < tol && (!my || Math.abs(oy - cy0) < Math.abs(my.v - cy0))) my = { v: oy, o };
    }
    const ndx = mx ? dx + (mx.v - cx0) : dx, ndy = my ? dy + (my.v - cy0) : dy;
    const guias = [];
    if (mx) { const y1 = Math.min(bb.y + ndy - dy, mx.o.y), y2 = Math.max(bb.y + bb.h + ndy - dy, mx.o.y + mx.o.h); guias.push({ x: mx.v, y: y1 - 16, h: y2 - y1 + 32 }); }
    if (my) { const x1 = Math.min(bb.x + ndx - dx, my.o.x), x2 = Math.max(bb.x + bb.w + ndx - dx, my.o.x + my.o.w); guias.push({ y: my.v, x: x1 - 16, w: x2 - x1 + 32 }); }
    return { dx: ndx, dy: ndy, guias };
  };

  const aoSoltar = (ev) => {
    toques.current.delete(ev.pointerId);
    const g = gesto.current;
    if (!g) return;
    if (g.tipo === 'pinca') { if (toques.current.size === 0) gesto.current = null; return; }
    gesto.current = null;
    const a = arrasto;
    setArrasto(null);
    if (ev.type === 'pointercancel') return;
    if (g.tipo === 'mover' && g.moveu && a && a.tipo === 'mover') {
      const n = g.ids.length;
      aplicarQ(Q.mudancasMover(c, g.ids, a.dx, a.dy), n === 1 ? 'Mover ' + NOME_TIPO(c.itens[g.ids[0]]).toLowerCase() : `Mover ${n} itens`, 'moveu');
    } else if (g.tipo === 'tamanho' && g.moveu && a && a.tipo === 'tamanho') {
      aplicarQ(Q.mudancasCampo(c, [g.id], { w: a.w, h: a.h }), 'Mudar tamanho', 'redimensionou');
    } else if (g.tipo === 'ligar') {
      if (!g.moveu) proximo(g.de, g.lado);
      else if (a && a.alvo) ligar(g.de, a.alvo);
      else if (a) {
        /* soltou no vazio: cria um item igual ali, já ligado */
        const base = c.itens[g.de];
        const tipo = Q.tipoDoProximo(base);
        const t = Q.TIPOS_ITEM[tipo];
        const w = base.tipo === tipo ? base.w : t.w, h = base.tipo === tipo ? base.h : t.h;
        const novo = Q.novoItem(c, tipo, { x: Math.round(a.p.x - w / 2), y: Math.round(a.p.y - h / 2), w, h, ...(base.tipo === tipo && base.cor ? { cor: base.cor } : {}) });
        const c2 = { ...c, itens: { ...c.itens, [novo.item.id]: novo.item } };
        const s = Q.novaSeta(c2, g.de, novo.item.id);
        aplicarQ({ ...novo.mudancas, ...s.mudancas }, 'Novo item ligado', 'criou item');
        setSel({ itens: [novo.item.id], seta: null });
        setEditando({ id: novo.item.id, valor: '' });
      }
    } else if (g.tipo === 'area') {
      if (g.moveu && a && a.tipo === 'area') {
        const ids = itensNoRet(Q.listaItens(cd), normalizarRet(a.a, a.b));
        setSel((s) => ({ itens: g.somar ? [...new Set([...s.itens, ...ids])] : ids, seta: null }));
      } else setSel({ itens: [], seta: null });
    } else if (g.tipo === 'pan' && !g.moveu) setSel({ itens: [], seta: null });
  };

  /* dois cliques só valem se os dois toques foram no quadro (um toque no "Fluxograma" do quadro vazio
     seguido de um toque na forma nova, no mesmo lugar, não abre a edição) */
  const aoDuploClique = (ev) => {
    if (somenteLeitura || modo) return;
    if (ev.timeStamp - descidas.current[0] > 700) return;
    const itemEl = ev.target.closest('[data-item]');
    const setaEl = ev.target.closest('[data-seta]');
    const alvoItem = itemEl && c.itens[itemEl.dataset.item];
    /* raia e página: dois toques no título trocam o nome; no resto da área, criam um post-it ali */
    const noTitulo = !!ev.target.closest('.qi-raia-h, .qi-pg-h');
    if (alvoItem && !(Q.ehFundo(alvoItem) && !noTitulo)) { comecarEdicao(alvoItem); return; }
    if (setaEl) { const s = c.setas[setaEl.dataset.seta]; setSel({ itens: [], seta: s.id }); setEditando({ seta: s.id, valor: s.rotulo || '' }); return; }
    if (ev.target.closest('.qd-barra,.qd-mini,.qd-timer,.qd-zoom,.qd-vistas,.qd-vazio,.qd-ok-cel,.qd-ferr,.qd-lamp,.qd-assist,.qd-cores-cel')) return;
    const p = paraMundo(ev.clientX, ev.clientY);
    const t = Q.TIPOS_ITEM.postit;
    const r = Q.novoItem(c, 'postit', { x: Math.round(p.x - t.w / 2), y: Math.round(p.y - t.h / 2) });
    aplicarQ(r.mudancas, 'Novo post-it', 'criou item', { criou: r.item.id });
    setSel({ itens: [r.item.id], seta: null });
    setEditando({ id: r.item.id, valor: '' });
  };

  /* roda do mouse: rola o quadro; com Ctrl, zoom no ponto do mouse */
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return undefined;
    const roda = (ev) => {
      if (ev.target.closest('.qd-barra,.qd-timer,.qd-assist,textarea')) return;
      ev.preventDefault();
      const r = el.getBoundingClientRect();
      if (ev.ctrlKey || ev.metaKey) zoomEm(Math.exp(-ev.deltaY * 0.0015), ev.clientX - r.left, ev.clientY - r.top);
      else setView((v) => ({ ...v, x: v.x - ev.deltaX, y: v.y - ev.deltaY }));
    };
    el.addEventListener('wheel', roda, { passive: false });
    return () => el.removeEventListener('wheel', roda);
  }, [vista, area]); // eslint-disable-line react-hooks/exhaustive-deps

  /* teclado do quadro */
  useEffect(() => {
    const tecla = (ev) => {
      if (cx.temJanela || janela) return;
      if (/^(input|textarea|select)$/i.test(ev.target.tagName) || ev.target.isContentEditable) return;
      if (ev.key === ' ' && vista === 'quadro') { espaco.current = true; return; }
      const ctrl = ev.ctrlKey || ev.metaKey;
      const k = ev.key.toLowerCase();
      if (ev.key === 'Escape') { setModo(null); setSel({ itens: [], seta: null }); return; }
      if (somenteLeitura) return;
      if (ev.key === 'Delete' || ev.key === 'Backspace') { if (selValida.itens.length || selValida.seta) { ev.preventDefault(); excluir(); } return; }
      if (ctrl && k === 'c') { if (selValida.itens.length) { ev.preventDefault(); copiar(false); } return; }
      if (ctrl && k === 'x') { if (selValida.itens.length) { ev.preventDefault(); copiar(true); } return; }
      if (ctrl && k === 'd') { ev.preventDefault(); duplicar(); return; }
      if (ctrl && k === 'a') { ev.preventDefault(); trata('editar.selecionarTudo'); return; }
      /* fonte do item: Ctrl+B negrito, Ctrl+I itálico, Ctrl+U sublinhado */
      if (ctrl && (k === 'b' || k === 'i' || k === 'u') && selValida.itens.length) { ev.preventDefault(); trata(k === 'b' ? 'formatar.negrito' : k === 'i' ? 'formatar.italico' : 'formatar.sublinhado'); return; }
      if ((ev.key === 'Enter' || ev.key === 'F2') && umItem) { ev.preventDefault(); comecarEdicao(umItem); return; }
      if (ev.key === 'Tab' && umItem && vista === 'quadro') { ev.preventDefault(); proximo(umItem.id, ev.shiftKey ? 'b' : 'r'); return; }
      const setas = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (setas[ev.key] && selValida.itens.length && vista === 'quadro') {
        ev.preventDefault();
        const passo = ev.shiftKey ? 10 : 1;
        aplicarQ(Q.mudancasMover(c, selValida.itens, setas[ev.key][0] * passo, setas[ev.key][1] * passo), 'Mover com o teclado', 'moveu');
      }
    };
    const solta = (ev) => { if (ev.key === ' ') espaco.current = false; };
    const aoColar = (ev) => {
      if (cx.temJanela || janela || somenteLeitura) return;
      if (/^(input|textarea)$/i.test(ev.target.tagName) || ev.target.isContentEditable) return;
      const dt = ev.clipboardData;
      if (!dt) return;
      const img = [...dt.files].find((f) => /^image\//.test(f.type));
      if (img) { ev.preventDefault(); escolherImagem(img); return; }
      const texto = dt.getData('text/plain');
      const interno = clipInterno || (() => { try { return JSON.parse(localStorage.getItem('efcdocs:clip-quadro') || 'null'); } catch { return null; } })();
      const marca = clipInterno ? marcaClip : (interno && interno.marca);
      if (interno && (!texto || texto === marca)) { ev.preventDefault(); colarClip(interno); return; }
      if (texto && texto.trim()) {
        ev.preventDefault();
        const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const MAX_COLAR = 200;
        const sobrou = Math.max(0, linhas.length - MAX_COLAR);
        linhas.length = Math.min(linhas.length, MAX_COLAR);
        /* com itens no quadro, os colados entram abaixo de tudo; sem nada, no meio da tela */
        const miolo = Q.listaItens(c).filter((i) => !Q.ehFundo(i));
        const lim = miolo.length ? limites(miolo) : null;
        let c2 = c;
        const mud = {};
        const ids = [];
        const ctr = centroVisivel();
        linhas.forEach((l, i) => {
          const r = Q.novoItem(c2, 'postit', lim
            ? { x: Math.round(lim.x + (i % 5) * 190), y: Math.round(lim.y + lim.h + 60 + Math.floor(i / 5) * 150), texto: l.slice(0, 500) }
            : { x: Math.round(ctr.x - 85 + (i % 5) * 190), y: Math.round(ctr.y - 65 + Math.floor(i / 5) * 150), texto: l.slice(0, 500) });
          Object.assign(mud, r.mudancas);
          c2 = { ...c2, seq: r.mudancas.seq, itens: { ...c2.itens, [r.item.id]: r.item } };
          ids.push(r.item.id);
        });
        aplicarQ(mud, linhas.length === 1 ? 'Colar texto' : `Colar ${linhas.length} linhas como post-its`, 'colou');
        setSel({ itens: ids, seta: null });
        if (sobrou) cx.avisar(`Colei as primeiras ${MAX_COLAR} linhas. Sobraram ${sobrou}: cole de novo o resto.`, { ic: 'info' });
        else if (lim && ids.length) setTimeout(() => mostrarItem(c2.itens[ids[0]]), 40);
      }
    };
    addEventListener('keydown', tecla);
    addEventListener('keyup', solta);
    addEventListener('paste', aoColar);
    return () => { removeEventListener('keydown', tecla); removeEventListener('keyup', solta); removeEventListener('paste', aoColar); };
  });

  /* celular: faixa de baixo com "Editar" e as cores, só quando o que está escolhido tem cor */
  const itensSel = selValida.itens.map((id) => c.itens[id]).filter(Boolean);
  const faixaCores = cx.cel && vista === 'quadro' && !somenteLeitura && !arrasto && !editando && !modo && itensSel.length > 0 && itensSel.some(COM_COR);

  /* ---------- barra da seleção ---------- */
  let barra = null;
  if (vista === 'quadro' && !arrasto && !editando && !modo && (selValida.itens.length || selValida.seta)) {
    const z = view.z;
    let caixa = null, botoes = [], rotuloExcluir = '';
    if (selValida.seta) {
      const s = c.setas[selValida.seta];
      const a = c.itens[s.de.id], b = c.itens[s.para.id];
      caixa = limites([a, b]);
      rotuloExcluir = 'Excluir a seta';
      botoes = [
        { id: 'rotulo', ic: 'texto', titulo: 'Escrever na seta (ex.: Sim, Não)', fazer: () => setEditando({ seta: s.id, valor: s.rotulo || '' }) },
        { id: 'estilo', ic: s.estilo === 'reta' ? 'setaCotovelo' : 'setaReta', titulo: s.estilo === 'reta' ? 'Seta em cotovelo' : 'Seta reta', fazer: () => mudarSeta({ estilo: s.estilo === 'reta' ? 'cotovelo' : 'reta' }, 'Estilo da seta') },
        { id: 'inverter', ic: 'inverter', titulo: 'Inverter o sentido', fazer: () => mudarSeta({ de: s.para, para: s.de }, 'Inverter seta') },
        { id: 'pontas', ic: 'pontas', titulo: { fim: 'Ponta nos dois lados', ambas: 'Sem ponta (só linha)', nenhuma: 'Ponta só no fim' }[s.pontas || 'fim'], fazer: () => mudarSeta({ pontas: { fim: 'ambas', ambas: 'nenhuma', nenhuma: 'fim' }[s.pontas || 'fim'] }, 'Pontas da seta') },
      ];
    } else {
      const its = selValida.itens.map((id) => cv.itens[id]).filter(Boolean);
      caixa = limites(its);
      const temCor = its.some(COM_COR);
      rotuloExcluir = its.length === 1 ? 'Excluir ' + NOME_TIPO(its[0]).toLowerCase() : `Excluir ${its.length} itens`;
      if (temCor) botoes.push({ id: 'cor', cor: Q.COR[(its.find((it) => it.cor) || {}).cor] || '#fff', titulo: 'Cor', fazer: () => setJanela('cores') });
      if (its.length === 1) {
        const it = its[0];
        if (COM_TEXTO(it)) botoes.push({ id: 'editar', ic: 'renomear', titulo: 'Escrever (Enter)', fazer: () => comecarEdicao(it) });
        if (it.tipo === 'assinatura') botoes.push({ id: 'editar', ic: 'assinatura', titulo: 'Nome e rubrica (Enter)', fazer: () => comecarEdicao(it) });
        if (LIGAVEL(it)) {
          botoes.push({ id: 'proximo', ic: 'conector', titulo: 'Próximo passo já ligado (Tab)', fazer: () => proximo(it.id) });
          botoes.push({ id: 'ligar', ic: 'seta', titulo: 'Ligar com seta: toque depois no destino', fazer: () => setModo({ tipo: 'seta', de: it.id }) });
        }
        botoes.push({ id: 'comentar', ic: 'comentario', titulo: it.nota ? 'Ver ou mudar o comentário' : 'Comentário', on: !!it.nota, fazer: pedirComentario });
      } else {
        botoes.push({ id: 'frente', ic: 'frente', titulo: 'Trazer para a frente', fazer: () => trata('organizar.frente') });
      }
      botoes.push({ id: 'duplicar', ic: 'dupl', titulo: 'Duplicar (Ctrl+D)', fazer: duplicar });
      if (cx.cel || !cx.painelAberto) botoes.push({ id: 'detalhes', ic: 'painel', titulo: 'Detalhes no painel', fazer: cx.abrirPainel });
    }
    if (caixa && !somenteLeitura) {
      const ancoraBarra = { x: view.x + (caixa.x + caixa.w / 2) * z, topo: view.y + caixa.y * z, base: view.y + (caixa.y + caixa.h) * z };
      barra = <BarraSelecao ancora={ancoraBarra} area={area} botoes={botoes} onExcluir={excluir} rotuloExcluir={rotuloExcluir} fixa={cx.cel} folga={cx.cel && faixaCores ? 74 : 64} />;
    }
  }

  /* ---------- painel lateral: o que está selecionado ---------- */
  const secaoPainel = (
    <div className="side-s qd-painel">
      {umItem ? (
        <>
          <h4>{NOME_TIPO(umItem)}{umItem.cod ? ' · ' + umItem.cod : ''}</h4>
          <dl>
            {umItem.cod && <><dt>Código</dt><dd>{umItem.cod}</dd></>}
            <dt>Tipo</dt><dd>{NOME_TIPO(umItem)}</dd>
            {umItem.texto && <><dt>Texto</dt><dd>{umItem.texto}</dd></>}
            <dt>Ligações</dt><dd>{Q.setasDoItem(c, umItem.id).length}</dd>
          </dl>
          {COM_COR(umItem) && (
            <div className="qd-cores-mini" role="group" aria-label="Cor">
              {Q.CORES.map(([id, hex, nome]) => (
                <button key={id} type="button" disabled={somenteLeitura} className={umItem.cor === id ? 'on' : ''} title={nome} aria-label={'Cor ' + nome} style={{ background: hex }} onClick={() => mudarCampo({ cor: id }, 'Cor', [umItem.id])} />
              ))}
            </div>
          )}
          {umItem.tipo === 'postit' && <PainelTarefa key={umItem.id} it={umItem} c={c} hoje={hoje} bloqueado={somenteLeitura} aoMudar={(campos) => aplicarQ(mudarTarefa(umItem.id, campos), 'Tarefa do post-it', 'editou tarefa')} />}
          {umItem.tipo === 'legenda' && <PainelLegenda key={umItem.id} it={umItem} c={c} bloqueado={somenteLeitura} aoMudar={(tipo, campo, valor) => aplicarQ(mudarLegenda(umItem.id, tipo, campo, valor), 'Texto da legenda', 'editou legenda')} />}
          {umItem.tipo === 'pagina' && <p className="qd-dica">Itens dentro desta página: {Q.itensDaPagina(c, umItem).length}. Arraste pelo título para levar tudo junto. No PDF, cada página vira uma folha.</p>}
          {umItem.tipo === 'postit' && (
            <label className="campo-t">Coluna do Kanban
              <select value={umItem.col} disabled={somenteLeitura} onChange={(ev) => aplicarQ(Q.mudancasMoverKanban(c, umItem.id, ev.target.value), 'Mudar de coluna', 'moveu')}>
                {c.colunas.map((k) => <option key={k.id} value={k.id}>{k.nome}</option>)}
              </select>
            </label>
          )}
          <div className="chips">
            <button type="button" className="chipb" disabled={somenteLeitura} onClick={pedirComentario}><Icone n="comentario" />{umItem.nota ? 'Comentário' : 'Comentar'}</button>
            <button type="button" className="chipb" disabled={somenteLeitura} onClick={pedirLink}><Icone n="link" />{umItem.link ? 'Link' : 'Pôr link'}</button>
          </div>
          {umItem.nota && <p className="qd-nota">{umItem.nota}</p>}
        </>
      ) : selValida.seta ? (() => {
        const s = c.setas[selValida.seta];
        const a = c.itens[s.de.id], b = c.itens[s.para.id];
        return (
          <>
            <h4>Seta</h4>
            <dl>
              <dt>De</dt><dd>{a.cod || a.texto || NOME_TIPO(a)}</dd>
              <dt>Para</dt><dd>{b.cod || b.texto || NOME_TIPO(b)}</dd>
              <dt>Texto</dt><dd>{s.rotulo || '—'}</dd>
            </dl>
            <div className="chips">
              {[['cotovelo', 'Cotovelo'], ['reta', 'Reta']].map(([v, n]) => <button key={v} type="button" disabled={somenteLeitura} className={'chipb' + ((s.estilo || 'cotovelo') === v ? ' on' : '')} onClick={() => mudarSeta({ estilo: v }, 'Estilo da seta')}>{n}</button>)}
            </div>
            <div className="chips">
              {[['fim', 'Ponta no fim'], ['ambas', 'Duas pontas'], ['nenhuma', 'Sem ponta']].map(([v, n]) => <button key={v} type="button" disabled={somenteLeitura} className={'chipb' + ((s.pontas || 'fim') === v ? ' on' : '')} onClick={() => mudarSeta({ pontas: v }, 'Pontas da seta')}>{n}</button>)}
            </div>
          </>
        );
      })() : selValida.itens.length > 1 ? (
        <>
          <h4>{selValida.itens.length} itens</h4>
          <div className="qd-cores-mini" role="group" aria-label="Cor">
            {Q.CORES.map(([id, hex, nome]) => <button key={id} type="button" disabled={somenteLeitura} title={nome} aria-label={'Cor ' + nome} style={{ background: hex }} onClick={() => mudarCampo({ cor: id }, 'Cor', selValida.itens.filter((i) => COM_COR(c.itens[i])))} />)}
          </div>
        </>
      ) : (
        <>
          <h4>Quadro</h4>
          <dl>
            <dt>Post-its</dt><dd>{Q.contagem(c).postits}</dd>
            <dt>Formas</dt><dd>{Q.contagem(c).formas}</dd>
            <dt>Setas</dt><dd>{Q.contagem(c).setas}</dd>
            {Q.contagem(c).paginas > 0 && <><dt>Páginas</dt><dd>{Q.contagem(c).paginas}</dd></>}
            <dt>Pendências</dt><dd>{pendencias.length}</dd>
            <dt>Colunas</dt><dd>{c.colunas.map((k) => k.nome).join(' · ')}</dd>
            <dt>Próximo código</dt><dd>{Q.codigo(c.seq + 1)}</dd>
          </dl>
          <p className="qd-dica">Dois toques no vazio criam um post-it. Arraste as setinhas em volta de um item até outro para ligar. Tab cria o próximo passo; Delete apaga.</p>
        </>
      )}
    </div>
  );

  const zi = (it, i) => (Q.ehFundo(it) ? 1 + i : 100 + i);
  const ligando = arrasto && arrasto.tipo === 'ligar' ? { de: arrasto.de, p: arrasto.p } : null;
  const retArea = arrasto && arrasto.tipo === 'area' ? normalizarRet(arrasto.a, arrasto.b) : null;
  const vazio = Q.listaItens(c).length === 0;
  const editItem = editando && editando.id ? cv.itens[editando.id] : null;
  /* nas formas, o texto de quem escreve fica no meio da caixa (como na forma desenhada) */
  const taRef = useRef(null);
  useLayoutEffect(() => {
    const ta = taRef.current;
    if (!ta || !editItem || !['inicio', 'processo', 'dados', 'decisao'].includes(editItem.tipo)) return;
    const h = editItem.h;
    ta.style.paddingTop = '0px'; ta.style.paddingBottom = '0px'; ta.style.height = '0px';
    const t = ta.scrollHeight;
    ta.style.height = h + 'px';
    const p = Math.max(6, Math.floor((h - 4 - t) / 2));
    ta.style.paddingTop = p + 'px'; ta.style.paddingBottom = '6px';
  }, [editItem && editItem.id, editando && editando.valor]);
  const editSeta = editando && editando.seta ? c.setas[editando.seta] : null;

  return (
    <div className={'sup sup-postits qd' + (somenteLeitura ? ' leitura' : '')} data-vista={vista}>
      <input ref={imgRef} type="file" accept="image/*" hidden onChange={(ev) => { escolherImagem(ev.target.files[0]); ev.target.value = ''; }} />
      <div className="qd-vistas" role="tablist" aria-label="Visão do quadro">
        <button type="button" role="tab" aria-selected={vista === 'quadro'} className={vista === 'quadro' ? 'on' : ''} onClick={() => setVista('quadro')}><Icone n="quadro" />Quadro</button>
        <button type="button" role="tab" aria-selected={vista === 'kanban'} className={vista === 'kanban' ? 'on' : ''} onClick={() => setVista('kanban')}><Icone n="kanban" />Kanban</button>
        {vista === 'kanban' && !somenteLeitura && <button type="button" className="qd-gut" data-cmd="organizar.ordenarGut" title="Ordenar cada coluna pela nota GUT (maior primeiro)" onClick={() => trata('organizar.ordenarGut')}><Icone n="classificar" />GUT</button>}
      </div>
      {somenteLeitura && <div className="qd-modo leitura"><Icone n="ver" />{cx.travado && cx.travado.motivo === 'conflito' ? 'Em espera: escolha no aviso do topo o que fazer.' : cx.travado ? 'Só para ver' : 'Só leitura: seu perfil de teste não edita o quadro.'}</div>}

      {vista === 'kanban' ? (
        <KanbanVista c={c} aplicarQ={aplicarQ} somenteLeitura={somenteLeitura} sel={selValida} setSel={setSel} cx={cx} codigos={qp.codigos} hoje={hoje} />
      ) : (
        <div className={'qd-area' + (modo ? ' modo-' + modo.tipo : '')} ref={areaRef}
          style={{ backgroundPosition: `${view.x}px ${view.y}px`, backgroundSize: `${22 * view.z}px ${22 * view.z}px` }}
          onPointerDown={aoBaixar} onPointerMove={aoMover} onPointerUp={aoSoltar} onPointerCancel={aoSoltar} onDoubleClick={aoDuploClique}
          role="application" aria-label={'Quadro ' + ficha.nome}>
          <div className="qd-mundo" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}>
            {ordenados.map((it, i) => (
              <ItemView key={it.id} it={it} zi={zi(it, i)} sel={selValida.itens.includes(it.id) || (arrasto && arrasto.tipo === 'ligar' && arrasto.alvo === it.id)} codigos={qp.codigos} escondeTexto={editItem && editItem.id === it.id} tarefa={it.tipo === 'postit' ? resumoTarefa(cv, it, hoje) : null} />
            ))}
            <CamadaSetas c={cv} selSeta={selValida.seta} ligando={ligando} editandoSeta={editSeta && editSeta.id} />
            {!somenteLeitura && umItem && !arrasto && !editando && !modo && cv.itens[umItem.id] && (
              <>
                {LIGAVEL(umItem) && <PontosLigacao it={cv.itens[umItem.id]} />}
                {umItem.tipo !== 'legenda' && <Alca it={cv.itens[umItem.id]} />}
              </>
            )}
            {retArea && <div className="qd-ret" style={{ left: retArea.x, top: retArea.y, width: retArea.w, height: retArea.h }} />}
            {arrasto && arrasto.guias && arrasto.guias.map((gu, i) => (
              <div key={i} className={'qd-guia ' + (gu.h ? 'v' : 'h')} style={gu.h ? { left: gu.x, top: gu.y, height: gu.h } : { left: gu.x, top: gu.y, width: gu.w }} />
            ))}
            {editItem && (
              <textarea ref={taRef} className={'qd-edita qd-edita-' + editItem.tipo} autoFocus spellCheck={qp.ortografia} lang="pt-BR" value={editando.valor} aria-label="Texto do item"
                style={editItem.tipo === 'raia'
                  ? { left: editItem.x + 50, top: editItem.y + 6, width: Math.min(320, editItem.w - 60), height: 40 }
                  : editItem.tipo === 'pagina'
                    ? { left: editItem.x + 12, top: editItem.y + 2, width: Math.min(420, editItem.w - 24), height: 30, textAlign: 'center' }
                  : { left: editItem.x, top: editItem.y, width: editItem.w, height: editItem.h, textAlign: { e: 'left', d: 'right', c: 'center' }[editItem.alinh || (editItem.tipo === 'texto' ? 'e' : 'c')], background: editItem.tipo === 'postit' ? Q.COR[editItem.cor] : undefined }}
                onChange={(ev) => setEditando({ ...editando, valor: ev.target.value })}
                onPointerDown={(ev) => ev.stopPropagation()}
                onKeyDown={(ev) => {
                  if (ev.key === 'Escape') { ev.stopPropagation(); terminarEdicao(false); }
                  if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); terminarEdicao(true); }
                  if (ev.key === 'Tab') { ev.preventDefault(); terminarEdicao(true); proximo(editItem.id, ev.shiftKey ? 'b' : 'r'); }
                }}
                onBlur={() => terminarEdicao(true)} />
            )}
            {editSeta && (() => {
              const a = c.itens[editSeta.de.id], b = c.itens[editSeta.para.id];
              const m = { x: (a.x + a.w / 2 + b.x + b.w / 2) / 2, y: (a.y + a.h / 2 + b.y + b.h / 2) / 2 };
              return (
                <input className="qd-edita-seta" autoFocus value={editando.valor} maxLength={60} aria-label="Texto da seta" placeholder="Ex.: Sim"
                  style={{ left: m.x - 80, top: m.y - 16 }} onChange={(ev) => setEditando({ ...editando, valor: ev.target.value })}
                  onPointerDown={(ev) => ev.stopPropagation()}
                  onKeyDown={(ev) => { if (ev.key === 'Enter') terminarEdicao(true); if (ev.key === 'Escape') { ev.stopPropagation(); terminarEdicao(false); } }}
                  onBlur={() => terminarEdicao(true)} />
              );
            })()}
          </div>

          {barra}

          {!cx.cel && !somenteLeitura && qp.ferramentas && <Ferramentas aoUsar={(id) => trata(id)} ligada={ligado} aoFechar={() => trocarQp('ferramentas')} />}
          {faixaCores && (
            <CoresCelular cor={(itensSel.find(COM_COR) || {}).cor}
              aoCor={(id) => mudarCampo({ cor: id }, 'Cor', selValida.itens.filter((i) => COM_COR(c.itens[i])))}
              aoEditar={itensSel.length === 1 && (COM_TEXTO(itensSel[0]) || itensSel[0].tipo === 'assinatura') ? () => comecarEdicao(itensSel[0]) : null} />
          )}

          {cx.cel && editando && !somenteLeitura && (
            <div className="qd-ok-cel card" role="group" aria-label="Terminar de escrever" onPointerDown={(ev) => ev.stopPropagation()} onMouseDown={(ev) => ev.preventDefault()}>
              <button type="button" className="btn sm" data-ok="cancelar" onClick={() => terminarEdicao(false)}>Cancelar</button>
              <button type="button" className="btn sm primary" data-ok="ok" onClick={() => terminarEdicao(true)}>OK</button>
            </div>
          )}

          {modo && (
            <div className="qd-modo" role="status">
              <Icone n={modo.tipo === 'seta' ? 'seta' : 'pincel'} />
              <span>{modo.tipo === 'seta' ? (modo.de ? `Agora toque no destino da seta (saindo de ${c.itens[modo.de] ? c.itens[modo.de].cod || NOME_TIPO(c.itens[modo.de]) : ''}).` : 'Toque no item de onde a seta sai.') : 'Toque no item que vai receber a formatação.'}</span>
              <button type="button" className="btn sm" onClick={() => setModo(null)}>Cancelar</button>
            </div>
          )}

          {vazio && !somenteLeitura && (
            <div className="qd-vazio card">
              <span title="Dois toques no quadro também criam um post-it">Comece por:</span>
              <div className="chips">
                <button type="button" className="chipb" onClick={() => inserir('postit')}><Icone n="postit" />Post-it</button>
                <button type="button" className="chipb" onClick={() => inserir('inicio', { texto: 'Início' })}><Icone n="inicio" />Fluxograma</button>
                <button type="button" className="chipb" onClick={() => setVista('kanban')}><Icone n="kanban" />Kanban</button>
                <button type="button" className="chipb" data-cmd="inserir.modelo" onClick={() => setJanela('modelos')}><Icone n="modelo" />Modelos</button>
              </div>
            </div>
          )}

          <div className="qd-zoom card" role="group" aria-label="Zoom">
            <button type="button" className="rbi" title="Diminuir" aria-label="Diminuir o zoom" onClick={() => zoomEm(1 / 1.2)}><Icone n="menos" /></button>
            <button type="button" className="qd-pct" title="Voltar a 100%" onClick={() => zoomEm(1 / view.z)}>{Math.round(view.z * 100)}%</button>
            <button type="button" className="rbi" title="Aumentar" aria-label="Aumentar o zoom" onClick={() => zoomEm(1.2)}><Icone n="maiszoom" /></button>
            <button type="button" className="rbi" title="Ajustar à tela" aria-label="Ajustar à tela" onClick={ajustar}><Icone n="ajustar" /></button>
            <button type="button" className={'rbi' + (qp.minimapa ? ' on' : '')} title="Minimapa" aria-label="Minimapa" aria-pressed={qp.minimapa} onClick={() => trocarQp('minimapa')}><Icone n="mapa" /></button>
          </div>
          {qp.minimapa && <Minimapa itens={ordenados} view={view} area={area} aoIr={irPara} />}
        </div>
      )}

      <Assistente lista={pendencias} aberto={assistAberto} aoAlternar={() => setAssistAberto(!assistAberto)} aoIr={irParaPendencia}
        folga={cx.cel ? undefined : vista === 'kanban' ? 14 : qp.minimapa ? 150 : 10} />
      {timer && <Temporizador fechar={() => setTimer(false)} avisar={cx.avisar} />}
      <PortalPainel alvo={cx.alvoPainel}>{secaoPainel}</PortalPainel>

      {janela === 'cores' && <JanelaCores titulo="Cor" aoEscolher={(id) => mudarCampo({ cor: id }, 'Cor', selValida.itens.filter((i) => COM_COR(c.itens[i])))} aoFechar={() => setJanela(null)} />}
      {janela === 'corFonte' && <JanelaCores titulo="Cor da fonte" fonte aoEscolher={(hex) => {
        const mud = {};
        for (const id of selValida.itens) { const it = c.itens[id]; if (COM_TEXTO(it)) mud['itens.' + id] = { ...it, fonte: { ...(it.fonte || {}), cor: hex === '#1f2328' ? undefined : hex } }; }
        aplicarQ(mud, 'Cor da fonte', 'formatou');
      }} aoFechar={() => setJanela(null)} />}
      {asn && <JanelaAssinatura inicial={asn.inicial} titulo={asn.id ? 'Editar assinatura' : 'Nova assinatura'} confirmar={asn.id ? 'Salvar' : 'Inserir'} aoConfirmar={confirmarAssinatura} aoFechar={() => setAsn(null)} />}
      {janela === 'modelos' && <JanelaModelos aoEscolher={usarModelo} aoFechar={() => setJanela(null)} />}
      {janela === 'formas' && <JanelaFormas aoEscolher={(t) => inserir(t, t === 'inicio' ? { texto: 'Início' } : {})} aoFechar={() => setJanela(null)} />}
      {janela === 'localizar' && (
        <JanelaLocalizar aoFechar={() => setJanela(null)}
          achar={(q) => {
            const ids = Q.localizar(c, q);
            if (!ids.length) return `Nada encontrado para "${q}".`;
            setVista('quadro');
            setSel({ itens: ids, seta: null });
            const lim = limites(ids.map((id) => c.itens[id]));
            if (lim && areaRef.current) setView(enquadrar(lim, areaRef.current.clientWidth, areaRef.current.clientHeight, 80, Z_MIN, 1.2));
            return `${ids.length} ${ids.length === 1 ? 'item encontrado e marcado' : 'itens encontrados e marcados'} no quadro.`;
          }}
          substituir={(q, novo) => {
            if (somenteLeitura) return 'Seu perfil não permite esta ação.';
            const r = Q.substituirTudo(c, q, novo);
            if (!r.total) return `Nada encontrado para "${q}".`;
            aplicarQ(r.mudancas, 'Substituir', 'substituiu');
            return `${r.total} ${r.total === 1 ? 'troca feita' : 'trocas feitas'}. Dá para desfazer com Ctrl+Z.`;
          }} />
      )}
      {janela === 'zoom' && (
        <Janela titulo="Zoom" aoFechar={() => setJanela(null)}>
          <div className="janela-c">
            <div className="chips">
              {[50, 75, 100, 125, 150, 200].map((p) => <button key={p} type="button" className={'chipb' + (Math.round(view.z * 100) === p ? ' on' : '')} onClick={() => { zoomEm(p / 100 / view.z); setJanela(null); }}>{p}%</button>)}
              <button type="button" className="chipb" onClick={() => { setVista('quadro'); setTimeout(ajustar, 0); setJanela(null); }}><Icone n="ajustar" />Ajustar à tela</button>
            </div>
            <p className="qd-dica">No computador: Ctrl + roda do mouse. No celular: dois dedos.</p>
          </div>
        </Janela>
      )}
    </div>
  );
}
