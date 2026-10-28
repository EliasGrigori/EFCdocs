/* EFCdocs — tela principal: menu, topo com faixa, área de trabalho, painel, rodapé e janelas.
   Os comandos passam todos por executar(id): o catálogo diz se já chegou, o perfil diz se pode,
   e o editor aberto (hoje, o quadro de post-its) trata os comandos dele. */
import { guardarOriginal, apagarOriginal } from './nucleo/originais.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ehDemo, ler, gravar } from './nucleo/armazem.js';
import { pwa, atualizarAgora, pedirInstalacao } from './nucleo/pwa.js';
import { TIPOS, VERSAO, criarArquivo, validarNome, carimbar, ativos } from './nucleo/modelo.js';
import { criarDiff, novoHistorico, fazer, desfazer, refazer, podeDesfazer, podeRefazer, rotuloDesfazer, juntarUltimas } from './nucleo/diff.js';
import { tamanhoLegivel } from './nucleo/compacta.js';
import { criarBanco } from './nucleo/banco.js';
import { PorId, chegaNa, textoChega } from './nucleo/comandos.js';
import { pode, SEM_PERMISSAO } from './nucleo/perfis.js';
import { normalizarPrefs } from './nucleo/prefs.js';
import { normalizarQuadro } from './quadro/modelo.js';
import { Icone, Avisos, Pergunta, useMedia, useRota, irPara, dataHora, hora } from './ui/comum.jsx';
import { Topo } from './ui/faixa.jsx';
import { DicasComandos } from './ui/dica.jsx';
import { Menu, BarraCelular } from './ui/menu.jsx';
import { Paleta, Opcoes, Painel } from './ui/janelas.jsx';
import { Inicio, ListaDoTipo, Lixeira, EmBreve, EditorEmBreve } from './ui/paginas.jsx';
import { Quadro } from './quadro/Quadro.jsx';
import { Planilha } from './planilha/Planilha.jsx';
import { normalizarPlanilha } from './planilha/modelo.js';
import { StatusPlanilha } from './planilha/partes.jsx';
import { LinhaDoTempo } from './ui/historico.jsx';
import { JanelaAbrirExcel } from './ui/excel.jsx';

const AUTOR = 'neste aparelho';
const TITULOS = { '': 'Início', planilha: 'Planilhas', docx: 'Documentos', postits: 'Quadros', lixeira: 'Lixeira', pastas: 'Pastas', externos: 'Documentos externos' };
const NOVO_POR_CMD = { 'arquivo.novaPlanilha': 'planilha', 'arquivo.novoDocumento': 'docx', 'arquivo.novoQuadro': 'postits' };
const DO_MODULO = { planilha: 'da planilha', docx: 'do documento', postits: 'do quadro' };

function usePwa() {
  const [, tick] = useState(0);
  useEffect(() => {
    const f = () => tick((n) => n + 1);
    pwa.ouvintes.add(f);
    return () => pwa.ouvintes.delete(f);
  }, []);
  return pwa;
}

const abrirConteudo = (ficha, conteudo) => (ficha.tipo === 'postits' ? normalizarQuadro(conteudo) : ficha.tipo === 'planilha' ? normalizarPlanilha(conteudo) : conteudo);

/* v0.4.9: alça do menu escondido. Fina por padrão; ao chegar o mouse (ou ao tocar) sai para fora e mostra a seta;
   dá para puxar para a direita ou só tocar. */
function AlcaMenu({ aoAbrir }) {
  const [puxa, setPuxa] = useState(false);
  const ini = useRef(null);
  const solta = () => { ini.current = null; setPuxa(false); };
  return (
    <button type="button" className={'menu-alca' + (puxa ? ' puxa' : '')} data-menu-alca aria-label="Mostrar o menu lateral" title="Mostrar o menu lateral (toque ou puxe para a direita)"
      onClick={aoAbrir}
      onPointerDown={(ev) => { ini.current = ev.clientX; setPuxa(true); try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch { /* sem captura */ } }}
      onPointerMove={(ev) => { if (ini.current != null && ev.clientX - ini.current > 28) { solta(); aoAbrir(); } }}
      onPointerUp={solta} onPointerCancel={solta}>
      <Icone n="chevronDir" />
    </button>
  );
}

export function App() {
  /* Teclado do celular: o app acompanha a parte da tela que sobra (visualViewport) e a página não sobe,
     para a célula que está sendo digitada continuar à vista. */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const ajustar = () => {
      const r = document.documentElement;
      const encolheu = vv.scale <= 1.01 && window.innerHeight - vv.height > 80;
      if (encolheu) { r.style.setProperty('--vvh', Math.round(vv.height) + 'px'); if (window.scrollY || vv.offsetTop) window.scrollTo(0, 0); }
      else r.style.removeProperty('--vvh');
    };
    vv.addEventListener('resize', ajustar);
    vv.addEventListener('scroll', ajustar);
    ajustar();
    return () => { vv.removeEventListener('resize', ajustar); vv.removeEventListener('scroll', ajustar); document.documentElement.style.removeProperty('--vvh'); };
  }, []);

  const demo = ehDemo();
  const estadoPwa = usePwa();
  const escuro = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
  const [prefs, setPrefs] = useState(() => normalizarPrefs(ler('prefs', null, { demo }), escuro));
  const setPref = useCallback((k, v) => setPrefs((p) => ({ ...p, [k]: v })), []);
  const cel = useMedia('(max-width: 899px)');
  const rota = useRota();
  const banco = useMemo(() => criarBanco({ demo }), [demo]);
  const [fichas, setFichas] = useState([]);

  /* arquivo aberto: { arquivo, h (histórico), tamanho, sujo, salvoEm } — também num ref para os atalhos */
  const [aberto, setAbertoEstado] = useState(null);
  const abertoRef = useRef(null);
  const setAberto = useCallback((x) => {
    const v = typeof x === 'function' ? x(abertoRef.current) : x;
    abertoRef.current = v;
    setAbertoEstado(v);
  }, []);

  const [aba, setAba] = useState('inicio');
  const [faixaTemp, setFaixaTemp] = useState(false);
  const [gaveta, setGaveta] = useState(false);
  const [paleta, setPaleta] = useState(false);
  const [opcoes, setOpcoes] = useState(false);
  const [pergunta, setPergunta] = useState(null);
  const [avisos, setAvisos] = useState([]);
  /* a faixa "só para ver" pisca quando a pessoa tenta mexer (o aviso embaixo some em segundos) */
  const [piscando, setPiscando] = useState(false);
  const chamarFaixa = useCallback(() => { setPiscando(true); clearTimeout(chamarFaixa.t); chamarFaixa.t = setTimeout(() => setPiscando(false), 1400); }, []);
  const [espaco, setEspaco] = useState('');
  const [statusEd, setStatusEd] = useState(null);
  const [contextoEd, setContextoEd] = useState({}); // v0.6.3: o que o editor tem selecionado (ex.: um gráfico) e muda a faixa
  const setContexto = useCallback((c) => setContextoEd((a) => (JSON.stringify(a) === JSON.stringify(c) ? a : c)), []);
  const [alvoPainel, setAlvoPainel] = useState(null);
  const [alvoRodape, setAlvoRodape] = useState(null); /* v0.4.8 (L11): a Verificação mora no rodapé, igual em todos os arquivos */
  const [linhaTempo, setLinhaTempo] = useState(false);
  const [abrirExcel, setAbrirExcel] = useState(false);
  const editorRef = useRef(null);

  /* tema, relevo e cor da barra do celular */
  useEffect(() => {
    const b = document.body;
    b.dataset.theme = prefs.tema;
    b.classList.toggle('relevo', prefs.relevo);
    b.classList.toggle('mesa', !!prefs.mesa);
    const st = getComputedStyle(b);
    const fundo = st.getPropertyValue('--bg').trim();
    if (fundo) document.documentElement.style.background = fundo;
    const meta = document.querySelector('meta[name="theme-color"]');
    const sup = st.getPropertyValue('--surface').trim();
    if (meta && sup) meta.setAttribute('content', sup);
    gravar('prefs', prefs, { demo });
  }, [prefs, demo]);

  const avisar = useCallback((texto, extra = {}) => {
    const id = Date.now() + Math.random();
    setAvisos([{ id, texto, ...extra }]); /* v0.4.8: um aviso de cada vez; o novo toma o lugar do anterior */
    setTimeout(() => setAvisos((l) => l.filter((a) => a.id !== id)), extra.acao ? 8000 : extra.longo ? 6000 : 3400);
  }, []);
  /* o aviso com Desfazer não acompanha a troca de página (só some o que já estava na tela há um tempo) */
  useEffect(() => { setAvisos((l) => (l.some((a) => a.acao && Date.now() - a.id > 1500) ? l.filter((a) => !a.acao || Date.now() - a.id <= 1500) : l)); }, [rota]);
  const tirarAviso = useCallback((id) => setAvisos((l) => l.filter((a) => a.id !== id)), []);
  /* o aviso com Desfazer também sai quando a pessoa segue em frente (clica ou digita em outro lugar), sem depender só do temporizador */
  useEffect(() => {
    const seguir = (ev) => {
      if (ev.target && ev.target.closest && ev.target.closest('.toasts')) return;
      if (ev.type === 'keydown' && (ev.ctrlKey || ev.metaKey || ['Control', 'Shift', 'Alt', 'Meta'].includes(ev.key))) return;
      setAvisos((l) => (l.some((a) => a.acao && Date.now() - a.id > 2500) ? l.filter((a) => !a.acao || Date.now() - a.id <= 2500) : l));
    };
    addEventListener('pointerdown', seguir, true);
    addEventListener('keydown', seguir, true);
    return () => { removeEventListener('pointerdown', seguir, true); removeEventListener('keydown', seguir, true); };
  }, []);

  const recarregar = useCallback(async () => {
    try { setFichas(await banco.fichas()); } catch { avisar('Não foi possível ler os arquivos deste aparelho.', { ic: 'aviso' }); }
  }, [banco, avisar]);
  useEffect(() => { recarregar(); }, [recarregar]);

  /* ---------- o mesmo arquivo em duas abas do navegador (nada pode se perder em silêncio) ----------
     Cada gravação leva uma "marca"; a aba só grava se a marca guardada é a que ela conhece.
     Além disso as abas conversam: a segunda que abre o arquivo fica só para ver, com "Editar aqui". */
  const abaApp = useMemo(() => Date.now().toString(36) + Math.random().toString(36).slice(2, 7), []);
  const canal = useMemo(() => (typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('efcdocs-abas' + (demo ? '-demo' : '')) : null), [demo]);
  const marcas = useRef(new Map());
  const fila = useRef({ pendente: null, rodando: false });
  const [travado, setTravadoEstado] = useState(null);
  const travadoRef = useRef(null);
  const setTravado = useCallback((v) => { travadoRef.current = v; setTravadoEstado(v); }, []);
  const avisarRef = useRef(avisar);
  const vivoEm = useRef(0);

  /** Lê de novo o arquivo aberto do aparelho (o que a outra aba gravou). */
  const recarregarAberto = useCallback(async () => {
    const atual = abertoRef.current;
    if (!atual) return null;
    const r = await banco.abrir(atual.arquivo.ficha.id);
    if (!r) return null;
    marcas.current.set(r.ficha.id, r.marca);
    setAberto((a) => (a && a.arquivo.ficha.id === r.ficha.id
      ? { arquivo: { ficha: r.ficha, conteudo: abrirConteudo(r.ficha, r.conteudo) }, h: novoHistorico(), tamanho: r.tamanho, sujo: false, salvoEm: r.ficha.alteradoEm }
      : a));
    return r;
  }, [banco, setAberto]);

  const postar = useCallback((m) => { try { if (canal) canal.postMessage({ ...m, de: abaApp }); } catch { /* sem canal */ } }, [canal, abaApp]);

  useEffect(() => {
    if (!canal) return undefined;
    const tratar = (ev) => {
      const m = ev.data || {};
      const meu = abertoRef.current && abertoRef.current.arquivo.ficha.id;
      if (!meu || m.arq !== meu || m.de === abaApp) return;
      if (m.t === 'vivo') { if (travadoRef.current && travadoRef.current.motivo === 'outraAba') vivoEm.current = Date.now(); }
      else if (m.t === 'abri' && !travadoRef.current) postar({ t: 'tenho', arq: meu, para: m.de });
      else if (m.t === 'tenho' && m.para === abaApp && !travadoRef.current) {
        vivoEm.current = Date.now();
        setTravado({ motivo: 'outraAba' });
      } else if (m.t === 'salvou' && travadoRef.current && travadoRef.current.motivo === 'outraAba') recarregarAberto();
      else if (m.t === 'assumir' && !travadoRef.current) {
        setTravado({ motivo: 'outraAba' });
        setTimeout(recarregarAberto, 400);
      } else if (m.t === 'fechei' && travadoRef.current && travadoRef.current.motivo === 'outraAba') {
        recarregarAberto().then(() => { setTravado(null); avisarRef.current('A outra aba fechou este arquivo. Agora dá para editar aqui.', { ic: 'check' }); });
      }
    };
    canal.addEventListener('message', tratar);
    const sair = () => { const a = abertoRef.current; if (a && !travadoRef.current) postar({ t: 'fechei', arq: a.arquivo.ficha.id }); };
    addEventListener('pagehide', sair);
    return () => { canal.removeEventListener('message', tratar); removeEventListener('pagehide', sair); };
  }, [canal, abaApp, postar, recarregarAberto, setTravado]);

  /* Batida: quem edita o arquivo avisa a cada poucos segundos que continua aí. Se a aba que "segura" o arquivo
     fechou à força (celular que mata o app, navegador que cai) e deixou de avisar, a marca velha é solta. */
  useEffect(() => {
    if (!canal) return undefined;
    const bat = (typeof globalThis !== 'undefined' && globalThis.EFC_BATIDA) || { a: 15000, b: 90000 };
    const id = setInterval(() => {
      const a = abertoRef.current;
      if (!a) return;
      const t = travadoRef.current;
      if (!t) postar({ t: 'vivo', arq: a.arquivo.ficha.id });
      else if (t.motivo === 'outraAba' && Date.now() - vivoEm.current > bat.b) {
        recarregarAberto().then(() => { setTravado(null); avisarRef.current('A outra aba não responde mais. Agora dá para editar aqui.', { ic: 'check' }); });
      }
    }, bat.a);
    return () => clearInterval(id);
  }, [canal, postar, recarregarAberto, setTravado]);

  const editarAqui = useCallback(async () => {
    const a = abertoRef.current;
    if (!a) return;
    postar({ t: 'assumir', arq: a.arquivo.ficha.id });
    await new Promise((ok) => setTimeout(ok, 500));
    await recarregarAberto();
    setTravado(null);
    avisar('Agora você edita nesta aba. A outra ficou só para ver.', { ic: 'check' });
  }, [postar, recarregarAberto, setTravado, avisar]);

  /* abrir arquivo pela rota #/arq/<id> */
  const idRota = rota.startsWith('arq/') ? rota.slice(4) : null;
  useEffect(() => {
    let vivo = true;
    setGaveta(false);
    const anterior = abertoRef.current;
    if (anterior && anterior.arquivo.ficha.id !== idRota && !travadoRef.current) postar({ t: 'fechei', arq: anterior.arquivo.ficha.id });
    if (!idRota) { setAberto(null); setStatusEd(null); setContextoEd({}); setTravado(null); return undefined; }
    if (abertoRef.current && abertoRef.current.arquivo.ficha.id === idRota) return undefined;
    setTravado(null);
    banco.abrir(idRota).then((r) => {
      if (!vivo) return;
      if (!r || r.ficha.status === 'lixeira') {
        avisar('Esse arquivo não está mais neste aparelho.', { ic: 'aviso' });
        irPara('');
        return;
      }
      marcas.current.set(r.ficha.id, r.marca);
      setAberto({ arquivo: { ficha: r.ficha, conteudo: abrirConteudo(r.ficha, r.conteudo) }, h: novoHistorico(), tamanho: r.tamanho, sujo: false, salvoEm: r.ficha.alteradoEm });
      setAba(r.ficha.tipo === 'postits' ? 'inserir' : 'inicio');
      setFaixaTemp(false);
      postar({ t: 'abri', arq: r.ficha.id });
    });
    return () => { vivo = false; };
  }, [idRota, banco, avisar, setAberto, postar, setTravado]);

  /* gravação: só depois da tela já mostrar a mudança; uma de cada vez, sempre a mais nova */
  const rodarFila = useCallback(async () => {
    const f = fila.current;
    if (f.rodando) return;
    f.rodando = true;
    while (f.pendente) {
      const { arquivo, acao, forcar } = f.pendente;
      f.pendente = null;
      try {
        const id = arquivo.ficha.id;
        const t = await banco.salvar(arquivo, acao, forcar ? undefined : (marcas.current.has(id) ? marcas.current.get(id) : undefined));
        if (t.conflito) {
          f.pendente = null;
          setTravado({ motivo: 'conflito' });
          setAberto((a) => (a && a.arquivo.ficha.id === id ? { ...a, sujo: true } : a));
          break;
        }
        marcas.current.set(id, t.marca);
        setAberto((atual) => (atual && atual.arquivo === arquivo ? { ...atual, tamanho: t, sujo: false, salvoEm: new Date().toISOString() } : atual));
        postar({ t: 'salvou', arq: id });
        recarregar();
      } catch {
        avisar('Não foi possível salvar neste aparelho. Libere espaço e tente de novo.', { ic: 'aviso' });
      }
    }
    f.rodando = false;
  }, [banco, recarregar, avisar, setAberto, postar, setTravado]);

  const salvar = useCallback((novo, acao, forcar = false) => {
    setAberto({ ...novo, sujo: true });
    fila.current.pendente = { arquivo: novo.arquivo, acao, forcar };
    rodarFila();
  }, [setAberto, rodarFila]);

  const MSG_TRAVADO = 'Este arquivo está aberto em outra aba. Toque em "Editar aqui" para editar nesta.';
  const MSG_CONFLITO = 'Antes de continuar, escolha no aviso do topo: ver a versão gravada ou gravar a sua por cima.';
  const msgTravado = () => (travadoRef.current && travadoRef.current.motivo === 'conflito' ? MSG_CONFLITO : MSG_TRAVADO);

  /** Aplica um diff no arquivo aberto (entra no desfazer e grava). */
  const aplicarDiff = useCallback((diff, acao = 'alterou') => {
    const atual = abertoRef.current;
    if (!atual) return false;
    if (travadoRef.current) { avisar(msgTravado(), { ic: 'aviso' }); return false; }
    const r = fazer(atual.h, atual.arquivo, diff);
    if (r.estado === atual.arquivo) return false;
    salvar({ ...atual, h: r.h, arquivo: carimbar(r.estado, AUTOR) }, acao);
    return true;
  }, [salvar]);

  /** Atalho do editor: mudanças { caminho: valor } + rótulo do desfazer. */
  const aplicar = useCallback((mudancas, rotulo, acao, opcoes = {}) => {
    const atual = abertoRef.current;
    if (!atual) return false;
    /* opcoes.juntar: só junta se a ação anterior foi uma criação ("Novo ...") */
    const anterior = atual.h.feitos[atual.h.feitos.length - 1];
    const juntar = !!opcoes.juntar && !!anterior && /^Novo/.test(anterior.rotulo || '');
    const r = criarDiff(atual.arquivo, mudancas, rotulo);
    const ok = aplicarDiff(r, acao);
    /* v0.6.4: travar e destravar a aba limpam o desfazer (como no Excel): o Ctrl+Z não pode soltar a trava nem desfazer o que ela protege */
    if (ok && opcoes.limparHistorico) {
      const depois = abertoRef.current;
      if (depois) setAberto({ ...depois, h: novoHistorico() });
    }
    if (ok && juntar) {
      const depois = abertoRef.current;
      if (depois) setAberto({ ...depois, h: juntarUltimas(depois.h) });
    }
    return ok;
  }, [aplicarDiff, setAberto]);

  const desfazerOuRefazer = useCallback((re) => {
    const atual = abertoRef.current;
    if (!atual) return;
    if (travadoRef.current) { avisar(msgTravado(), { ic: 'aviso' }); return; }
    const r = re ? refazer(atual.h, atual.arquivo) : desfazer(atual.h, atual.arquivo);
    if (!r.diff) return;
    salvar({ ...atual, h: r.h, arquivo: carimbar(r.estado, AUTOR) }, re ? 'refez' : 'desfez');
    avisar((re ? 'Refeito: ' : 'Desfeito: ') + (r.diff.rotulo || 'última ação'), { ic: re ? 'refazer' : 'desfazer' });
  }, [salvar, avisar]);

  /** Linha do tempo (PL17): volta ou avança até o passo escolhido, numa gravação só. */
  const irParaPasso = useCallback((feitosAlvo) => {
    const atual = abertoRef.current;
    if (!atual) return;
    if (travadoRef.current) { avisar(msgTravado(), { ic: 'aviso' }); return; }
    let h = atual.h, estado = atual.arquivo, n = 0;
    while (h.feitos.length > feitosAlvo && h.feitos.length) { const r = desfazer(h, estado); h = r.h; estado = r.estado; n++; }
    while (h.feitos.length < feitosAlvo && h.desfeitos.length) { const r = refazer(h, estado); h = r.h; estado = r.estado; n--; }
    if (!n) return;
    salvar({ ...atual, h, arquivo: carimbar(estado, AUTOR) }, n > 0 ? 'desfez' : 'refez');
    avisar(n > 0 ? `Voltou ${n} ${n === 1 ? 'passo' : 'passos'}.` : `Avançou ${-n} ${n === -1 ? 'passo' : 'passos'}.`, { ic: n > 0 ? 'desfazer' : 'refazer' });
  }, [salvar, avisar]);

  const criarNovo = useCallback(async (tipo) => {
    try {
      const a = criarArquivo({ tipo, autor: AUTOR });
      await banco.criar(a);
      await recarregar();
      irPara('arq/' + a.ficha.id);
    } catch (e) {
      avisar(e.message, { ic: 'aviso' });
    }
  }, [banco, recarregar, avisar]);

  /** Cria um arquivo já com conteúdo (ex.: a conta desenhada vira um quadro) e abre. */
  const criarCom = useCallback(async (tipo, nome, conteudo, aviso, original) => {
    try {
      const a = criarArquivo({ tipo, nome, autor: AUTOR });
      a.conteudo = conteudo;
      await banco.criar(a);
      /* v0.6.0: guarda o arquivo do Excel como veio, para "Baixar original" */
      if (original) await guardarOriginal(a.ficha.id, { nome: original.name, tipo: original.type, blob: original });
      await recarregar();
      irPara('arq/' + a.ficha.id);
      avisar(aviso ? aviso.replace('{nome}', a.ficha.nome) : `"${a.ficha.nome}" foi criado. A planilha continua igual.`, { ic: 'check', longo: !!aviso });
      return true;
    } catch (e) {
      avisar(e.message, { ic: 'aviso' });
      return false;
    }
  }, [banco, recarregar, avisar]);

  const restaurar = useCallback(async (f) => {
    await banco.restaurar(f.id);
    await recarregar();
    avisar(`"${f.nome}" voltou da lixeira.`, { ic: 'restaurar' });
  }, [banco, recarregar, avisar]);

  const mandarLixeira = useCallback(async (f) => {
    await banco.mandarParaLixeira(f.id);
    await recarregar();
    if (abertoRef.current && abertoRef.current.arquivo.ficha.id === f.id) irPara('');
    avisar(`"${f.nome}" foi para a lixeira.`, { ic: 'lixeira', acao: { rotulo: 'Desfazer', fazer: () => restaurar(f) } });
  }, [banco, recarregar, avisar, restaurar]);

  const renomearArquivo = useCallback(async (f, nome) => {
    const atual = abertoRef.current;
    if (atual && atual.arquivo.ficha.id === f.id) {
      aplicarDiff(criarDiff(atual.arquivo, { 'ficha.nome': nome }, 'Renomear'), 'renomeou');
      return;
    }
    await banco.mudarFicha(f.id, { nome, alteradoEm: new Date().toISOString(), alteradoPor: AUTOR }, 'renomeou');
    recarregar();
  }, [banco, aplicarDiff, recarregar]);

  const perguntarNome = useCallback((f) => setPergunta({
    titulo: 'Renomear', campo: 'Nome do arquivo', valor: f.nome, confirmar: 'Salvar nome', validar: validarNome,
    aoConfirmar: (nome) => { if (nome !== f.nome) renomearArquivo(f, nome); },
  }), [renomearArquivo]);

  const excluirDeVez = useCallback((f) => setPergunta({
    titulo: `Apagar ${f.nome} para sempre?`, texto: 'Não dá para desfazer. O arquivo some deste aparelho e fica só anotado no histórico.',
    confirmar: 'Apagar para sempre', perigo: true,
    aoConfirmar: async () => { await banco.excluirDeVez(f.id); apagarOriginal(f.id); await recarregar(); avisar(`"${f.nome}" foi apagado para sempre.`, { ic: 'x' }); },
  }), [banco, recarregar, avisar]);

  const mod = aberto ? aberto.arquivo.ficha.tipo : TIPOS[rota] ? rota : null;

  const semPermissao = useCallback((acao, ficha) => {
    const f = ficha || (abertoRef.current && abertoRef.current.arquivo.ficha);
    const doAberto = !ficha || (abertoRef.current && abertoRef.current.arquivo.ficha.id === ficha.id);
    if (travado && doAberto && acao !== 'ver' && acao !== 'exportar') return travado.motivo === 'conflito' ? MSG_CONFLITO : MSG_TRAVADO;
    return pode(prefs.perfil, acao, { usuario: AUTOR, criadoPor: f ? f.criadoPor : AUTOR }) ? '' : SEM_PERMISSAO;
  }, [prefs.perfil, travado]);

  const bloqueado = useCallback((id, ficha) => {
    const cmd = PorId[id];
    if (!cmd) return semPermissao(id, ficha);
    if (id === 'editar.historico') return aberto && (podeDesfazer(aberto.h) || podeRefazer(aberto.h)) ? '' : 'Nada no histórico ainda';
    if (mod === 'planilha' && cmd.acao === 'quadro.editar') return semPermissao('planilha.editar', ficha);
    if (id === 'editar.desfazer') return aberto && podeDesfazer(aberto.h) ? '' : 'Nada para desfazer';
    if (id === 'editar.refazer') return aberto && podeRefazer(aberto.h) ? '' : 'Nada para refazer';
    if (id === 'arquivo.novo' && !mod) return '';
    return cmd.acao && cmd.acao !== 'exportar' ? semPermissao(cmd.acao, ficha) : '';
  }, [aberto, semPermissao, mod]);

  const ligado = useCallback((id) => {
    const geral = {
      'exibir.faixaTudo': prefs.faixa === 'tudo', 'exibir.faixaAbas': prefs.faixa === 'abas', 'exibir.faixaOculta': prefs.faixa === 'oculta',
      'exibir.topoCompleto': prefs.topo !== 'compacto', 'exibir.topoCompacto': prefs.topo === 'compacto',
      'exibir.menuCompleto': prefs.menu === 'completo', 'exibir.menuIcones': prefs.menu === 'icones', 'exibir.menuOculto': prefs.menu === 'oculto',
      'exibir.layoutA': prefs.layout === 'A', 'exibir.layoutB': prefs.layout === 'B', 'exibir.painel': prefs.painel, 'exibir.relevo': prefs.relevo, 'exibir.mesa': !!prefs.mesa,
    };
    if (id in geral) return geral[id];
    const ed = editorRef.current;
    return !!(ed && ed.ligado && ed.ligado(id));
  }, [prefs, statusEd]); // statusEd: o editor muda o que está ligado

  const executar = useCallback((id) => {
    const cmd = PorId[id];
    if (!cmd) return;
    const chega = chegaNa(cmd, mod);
    if (chega) {
      avisar(`"${cmd.nome}"${mod && DO_MODULO[mod] ? ' ' + DO_MODULO[mod] : ''} ${textoChega(chega)}.`, { ic: 'info' });
      return;
    }
    const bloq = bloqueado(id);
    if (bloq) { avisar(bloq, { ic: 'aviso' }); return; }
    if (faixaTemp && !id.startsWith('exibir.faixa')) setFaixaTemp(false);
    const atual = abertoRef.current;
    switch (id) {
      case 'app.inicio': irPara(''); return;
      case 'app.buscar': setPaleta(true); return;
      case 'app.opcoes': setOpcoes(true); return;
      case 'exibir.tema': setOpcoes('tema'); return;
      case 'arquivo.novo': criarNovo(mod || 'planilha'); return;
      case 'arquivo.novaPlanilha': case 'arquivo.novoDocumento': case 'arquivo.novoQuadro': criarNovo(NOVO_POR_CMD[id]); return;
      case 'arquivo.abrir': setAbrirExcel(true); return;
      case 'arquivo.renomear': if (atual) perguntarNome(atual.arquivo.ficha); return;
      case 'arquivo.lixeira': if (atual) mandarLixeira(atual.arquivo.ficha); return;
      case 'editar.desfazer': desfazerOuRefazer(false); return;
      case 'editar.refazer': desfazerOuRefazer(true); return;
      case 'editar.historico': setLinhaTempo(true); return;
      case 'exibir.faixaTudo': setPref('faixa', 'tudo'); setFaixaTemp(false); return;
      case 'exibir.faixaAbas': setPref('faixa', 'abas'); setFaixaTemp(false); return;
      case 'exibir.faixaOculta':
        setPref('faixa', 'oculta'); setFaixaTemp(false);
        avisar('Faixa escondida. Para trazer de volta: botão de faixa no topo, Opções ou Ctrl+F1.', { ic: 'info' });
        return;
      case 'exibir.topoCompleto': setPref('topo', 'completo'); return;
      case 'exibir.topoCompacto': setPref('topo', 'compacto'); return;
      case 'exibir.menuCompleto': setPref('menu', 'completo'); return;
      case 'exibir.menuIcones': setPref('menu', 'icones'); return;
      case 'exibir.menuOculto': setPref('menu', 'oculto'); return;
      case 'exibir.painel': setPref('painel', !prefs.painel); return;
      case 'exibir.layoutA': setPref('layout', 'A'); return;
      case 'exibir.layoutB': setPref('layout', 'B'); return;
      case 'exibir.mesa': setPref('mesa', !prefs.mesa); avisar(prefs.mesa ? 'Papel sobre a mesa desligado.' : 'Papel sobre a mesa ligado: sombra nas barras e contorno nas laterais.', { ic: 'relevo' }); return;
      case 'exibir.relevo': setPref('relevo', !prefs.relevo); avisar(prefs.relevo ? 'Relevo desligado.' : 'Relevo ligado.', { ic: 'relevo' }); return;
      case 'exibir.telaCheia': {
        const el = document.documentElement;
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else if (el.requestFullscreen) el.requestFullscreen().catch(() => setPref('faixa', 'oculta'));
        else setPref('faixa', 'oculta');
        return;
      }
      default: {
        const ed = editorRef.current;
        if (ed && ed.trata && ed.trata(id)) return;
        avisar(`"${cmd.nome}" ainda não faz nada aqui.`, { ic: 'info' });
      }
    }
  }, [mod, bloqueado, avisar, faixaTemp, criarNovo, perguntarNome, mandarLixeira, desfazerOuRefazer, setPref, prefs]);

  /* atalhos do teclado que valem em qualquer tela */
  useEffect(() => {
    const tecla = (ev) => {
      if (paleta || opcoes || pergunta || linhaTempo || abrirExcel) return;
      const k = ev.key.toLowerCase();
      const ctrl = ev.ctrlKey || ev.metaKey;
      const digitando = /^(input|textarea|select)$/i.test(ev.target.tagName) || ev.target.isContentEditable;
      if ((ctrl && k === 'k') || (ev.altKey && k === 'q')) { ev.preventDefault(); setPaleta(true); return; }
      if (ctrl && !ev.shiftKey && !ev.altKey && k === 'p' && abertoRef.current) { ev.preventDefault(); executar('arquivo.imprimir'); return; }
      if (ctrl && ev.key === 'F1') { ev.preventDefault(); executar(prefs.faixa === 'tudo' ? 'exibir.faixaAbas' : 'exibir.faixaTudo'); return; }
      if (ev.key === 'Escape') { setFaixaTemp(false); setGaveta(false); return; }
      if (digitando || !abertoRef.current) return;
      if (ctrl && k === 'z' && !ev.shiftKey) { ev.preventDefault(); desfazerOuRefazer(false); }
      if (ctrl && (k === 'y' || (k === 'z' && ev.shiftKey))) { ev.preventDefault(); desfazerOuRefazer(true); }
    };
    addEventListener('keydown', tecla);
    return () => removeEventListener('keydown', tecla);
  }, [paleta, opcoes, pergunta, linhaTempo, abrirExcel, executar, desfazerOuRefazer, prefs.faixa]);

  /* faixa mostrada "por um momento": some ao tocar fora do topo */
  useEffect(() => {
    if (!faixaTemp) return undefined;
    const fora = (ev) => { if (!ev.target.closest('.topbar')) setFaixaTemp(false); };
    addEventListener('mousedown', fora);
    return () => removeEventListener('mousedown', fora);
  }, [faixaTemp]);

  useEffect(() => {
    if (!opcoes || !navigator.storage || !navigator.storage.estimate) return;
    navigator.storage.estimate().then((e) => setEspaco(tamanhoLegivel(e.usage || 0))).catch(() => {});
  }, [opcoes]);

  const cx = {
    mod, executar, bloqueado, ligado, demo, setPref,
    abrir: (id) => irPara('arq/' + id),
    perguntarNome, lixeira: mandarLixeira, restaurar, excluirDeVez, criarCom,
    renomear: (nome) => { const a = abertoRef.current; if (a && nome !== a.arquivo.ficha.nome) renomearArquivo(a.arquivo.ficha, nome); },
    dataHora, tamanho: tamanhoLegivel,
    instalar: estadoPwa.instalar ? pedirInstalacao : null,
    /* para o editor */
    aplicar, avisar, chamarFaixa, perguntar: setPergunta, temJanela: !!(paleta || opcoes || pergunta || gaveta || linhaTempo),
    pode: (acao) => !semPermissao(acao), travado, buscarNoEditor: (q) => { const ed = editorRef.current; return ed && ed.buscar ? ed.buscar(q) : []; },
    registrarEditor: (ed) => { editorRef.current = ed; }, setStatus: setStatusEd, setContexto, contexto: contextoEd,
    alvoPainel, alvoRodape, abrirPainel: () => setPref('painel', true), painelAberto: prefs.painel, cel,
  };

  const contagem = useMemo(() => {
    const a = ativos(fichas);
    const c = { lixeira: fichas.length - a.length };
    for (const t of Object.keys(TIPOS)) c[t] = a.filter((f) => f.tipo === t).length;
    return c;
  }, [fichas]);

  let conteudo;
  if (aberto) {
    const t = aberto.arquivo.ficha.tipo;
    conteudo = t === 'postits'
      ? <Quadro key={aberto.arquivo.ficha.id} arquivo={aberto.arquivo} cx={cx} />
      : t === 'planilha'
        ? <Planilha key={aberto.arquivo.ficha.id} arquivo={aberto.arquivo} cx={cx} />
        : <EditorEmBreve tipo={t} />;
  } else if (idRota) conteudo = <div className="pagina" aria-busy="true" />;
  else if (TIPOS[rota]) conteudo = <ListaDoTipo tipo={rota} fichas={fichas} cx={cx} demo={demo} />;
  else if (rota === 'lixeira') conteudo = <Lixeira fichas={fichas} cx={cx} />;
  else if (rota === 'pastas' || rota === 'externos') conteudo = <EmBreve qual={rota} />;
  else conteudo = <Inicio fichas={fichas} cx={cx} demo={demo} />;

  const salvo = aberto ? { sujo: aberto.sujo, texto: aberto.sujo ? 'Salvando…' : 'Salvo ' + hora(aberto.salvoEm) } : null;
  const ultimo = aberto && podeDesfazer(aberto.h) ? rotuloDesfazer(aberto.h) : '';
  const ficha = aberto ? aberto.arquivo.ficha : null;
  const st = statusEd || {};

  return (
    <div className={'app' + (cel ? ' cel' : '')} data-menu={prefs.menu} data-layout={prefs.layout} data-faixa={prefs.faixa}>
      {!cel && prefs.menu !== 'oculto' && <Menu rota={rota} modAtual={mod} cont={contagem} prefs={prefs} cx={cx} />}
      {!cel && prefs.menu === 'oculto' && (
        <AlcaMenu aoAbrir={() => cx.executar('exibir.menuCompleto')} />
      )}
      <div className="col">
        {estadoPwa.aviso && (
          <button type="button" className="faixa-aviso nova" onClick={atualizarAgora}><Icone n="atualizar" />Versão nova pronta. Toque para atualizar.</button>
        )}
        {aberto && travado && travado.motivo === 'outraAba' && (
          <div className={'faixa-aviso trava' + (piscando ? ' piscar' : '')} role="alert">
            <Icone n="aviso" /><span>Aberto em outra aba. Aqui fica só para ver.</span>
            <button type="button" className="btn sm" onClick={editarAqui}>Editar aqui</button>
          </div>
        )}
        {aberto && travado && travado.motivo === 'conflito' && (
          <div className="faixa-aviso trava" role="alert">
            <Icone n="aviso" /><span>Outra aba gravou este arquivo enquanto você editava aqui. Sua última mudança <b>ainda não foi gravada</b>. Escolha:</span>
            <button type="button" className="btn sm" onClick={async () => { await recarregarAberto(); setTravado(null); avisar('Carregada a versão gravada pela outra aba.', { ic: 'check' }); }}>Ver a versão gravada</button>
            <button type="button" className="btn sm" onClick={() => { const a = abertoRef.current; setTravado(null); if (a) salvar(a, 'gravou por cima', true); postar({ t: 'assumir', arq: a && a.arquivo.ficha.id }); avisar('Gravada a sua versão. A outra aba passou a só ver.', { ic: 'check' }); }}>Gravar a minha por cima</button>
          </div>
        )}
        <DicasComandos mod={mod} />
        <Topo titulo={TITULOS[rota] || 'EFCdocs'} ficha={ficha} salvo={salvo} prefs={prefs} cx={cx} cel={cel}
          aba={aba} setAba={setAba} faixaTemp={faixaTemp} setFaixaTemp={setFaixaTemp} abrirGaveta={() => (!cel && prefs.menu === 'oculto' ? cx.executar('exibir.menuCompleto') : setGaveta(true))} />
        <div className="work">
          <main className="wk-main" id="conteudo">{conteudo}</main>
          {aberto && prefs.painel && (
            <Painel aberto={aberto} cx={cx} fechar={() => setPref('painel', false)}
              extra={ficha.tipo === 'postits' || ficha.tipo === 'planilha' ? <div className="painel-extra" ref={setAlvoPainel} /> : null} />
          )}
        </div>
        {cel && !aberto ? (
          <BarraCelular rota={rota} cont={contagem} abrirGaveta={() => setGaveta(true)} />
        ) : (
          <footer className={'foot' + (aberto && ficha.tipo === 'planilha' && !(st.planilha && st.planilha.calc) ? ' sem-conta' : '')} aria-label="Barra de status">
            {aberto ? (
              <>
                <span className="some-cel"><b>{TIPOS[ficha.tipo].nome}</b></span>
                <span className="some-cel">{aberto.sujo ? 'Salvando…' : 'Salvo neste aparelho às ' + hora(aberto.salvoEm)}</span>
                {ultimo && <button type="button" className="some-cel foot-desfazer" title="Ver a linha do tempo do desfazer" onClick={() => setLinhaTempo(true)}>Desfazer: {ultimo}</button>}
                <span className="sts">
                  {ficha.tipo === 'planilha' && <StatusPlanilha st={st.planilha} />}
                  {ficha.tipo === 'planilha' && st.zoom && st.zoom !== 1 ? <span className="some-cel">Zoom <b>{Math.round(st.zoom * 100)}%</b></span> : null}
                  {ficha.tipo === 'docx' && <span>Página <b>1</b> de <b>1</b> · <b>0</b> palavras</span>}
                  {ficha.tipo === 'postits' && (
                    <>
                      {st.sel ? <span className="some-cel"><b>{st.sel}</b> {st.sel === 1 ? 'selecionado' : 'selecionados'}</span> : null}
                      <span data-status="contagem"><b>{st.postits || 0}</b> {st.postits === 1 ? 'post-it' : 'post-its'} · <b>{st.formas || 0}</b> {st.formas === 1 ? 'forma' : 'formas'} · <b>{st.setas || 0}</b> {st.setas === 1 ? 'seta' : 'setas'}{st.paginas > 0 && <> · <b>{st.paginas}</b> {st.paginas === 1 ? 'página' : 'páginas'}</>}</span>
                      {st.zoom ? <span className="some-cel">Zoom <b>{Math.round(st.zoom * 100)}%</b></span> : null}
                    </>
                  )}
                  {aberto.tamanho && <span className="some-cel">Tamanho: <b>{tamanhoLegivel(aberto.tamanho.bytesFinal)}</b></span>}
                  {!cel && (ficha.tipo === 'planilha' || ficha.tipo === 'postits') && <span className="foot-verif" ref={setAlvoRodape} />}
                </span>
              </>
            ) : (
              <>
                <span><b>EFCdocs</b> {VERSAO}</span>
                <span className="sts">
                  <span>{ativos(fichas).length} {ativos(fichas).length === 1 ? 'arquivo' : 'arquivos'} neste aparelho</span>
                </span>
              </>
            )}
          </footer>
        )}
      </div>
      {gaveta && (
        <>
          <div className="gav-fundo" onClick={() => setGaveta(false)} />
          <Menu rota={rota} modAtual={mod} cont={contagem} prefs={prefs} cx={cx} gaveta fechar={() => setGaveta(false)} />
        </>
      )}
      {paleta && <Paleta mod={mod} cx={cx} aoFechar={() => setPaleta(false)} />}
      {opcoes && <Opcoes prefs={prefs} setPref={setPref} cx={cx} aoFechar={() => setOpcoes(false)} demo={demo} versao={VERSAO} espaco={espaco} abrir={opcoes} />}
      {pergunta && <Pergunta p={pergunta} aoFechar={() => setPergunta(null)} />}
      {abrirExcel && <JanelaAbrirExcel aoFechar={() => setAbrirExcel(false)} aoAbrir={(conteudo, nome, original) => { setAbrirExcel(false); criarCom('planilha', nome, conteudo, '"{nome}" veio do Excel. O que veio e o que ficou de fora: Arquivo › O que veio do Excel.', original); }} />}
      {linhaTempo && aberto && <LinhaDoTempo h={aberto.h} aoIr={irParaPasso} aoFechar={() => setLinhaTempo(false)} />}
      <Avisos lista={avisos} tirar={tirarAviso} menu={cel ? 'cel' : prefs.menu} />
    </div>
  );
}
