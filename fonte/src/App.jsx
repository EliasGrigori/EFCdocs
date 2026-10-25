/* EFCdocs — tela principal: menu, topo com faixa, área de trabalho, painel, rodapé e janelas.
   Os comandos passam todos por executar(id): o catálogo diz se já chegou, o perfil diz se pode,
   e o editor aberto (hoje, o quadro de post-its) trata os comandos dele. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ehDemo, ler, gravar } from './nucleo/armazem.js';
import { pwa, atualizarAgora, pedirInstalacao } from './nucleo/pwa.js';
import { TIPOS, VERSAO, criarArquivo, validarNome, carimbar, ativos } from './nucleo/modelo.js';
import { criarDiff, novoHistorico, fazer, desfazer, refazer, podeDesfazer, podeRefazer, rotuloDesfazer, juntarUltimas } from './nucleo/diff.js';
import { tamanhoLegivel } from './nucleo/compacta.js';
import { criarBanco } from './nucleo/banco.js';
import { PorId, chegaNa } from './nucleo/comandos.js';
import { pode, SEM_PERMISSAO } from './nucleo/perfis.js';
import { normalizarPrefs } from './nucleo/prefs.js';
import { normalizarQuadro } from './quadro/modelo.js';
import { Icone, Avisos, Pergunta, useMedia, useRota, irPara, dataHora, hora } from './ui/comum.jsx';
import { Topo } from './ui/faixa.jsx';
import { Menu, BarraCelular } from './ui/menu.jsx';
import { Paleta, Opcoes, Painel } from './ui/janelas.jsx';
import { Inicio, ListaDoTipo, Lixeira, EmBreve, EditorEmBreve } from './ui/paginas.jsx';
import { Quadro } from './quadro/Quadro.jsx';

const AUTOR = 'neste aparelho';
const TITULOS = { '': 'Início', planilha: 'Planilhas', docx: 'Documentos', postits: 'Quadros de post-its', lixeira: 'Lixeira', pastas: 'Pastas', externos: 'Documentos externos' };
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

const abrirConteudo = (ficha, conteudo) => (ficha.tipo === 'postits' ? normalizarQuadro(conteudo) : conteudo);

export function App() {
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
  const [espaco, setEspaco] = useState('');
  const [statusEd, setStatusEd] = useState(null);
  const [alvoPainel, setAlvoPainel] = useState(null);
  const editorRef = useRef(null);

  /* tema, relevo e cor da barra do celular */
  useEffect(() => {
    const b = document.body;
    b.dataset.theme = prefs.tema;
    b.classList.toggle('relevo', prefs.relevo);
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
    setAvisos((l) => [...l.slice(-2), { id, texto, ...extra }]);
    setTimeout(() => setAvisos((l) => l.filter((a) => a.id !== id)), extra.acao ? 6500 : 3400);
  }, []);
  const tirarAviso = useCallback((id) => setAvisos((l) => l.filter((a) => a.id !== id)), []);

  const recarregar = useCallback(async () => {
    try { setFichas(await banco.fichas()); } catch { avisar('Não foi possível ler os arquivos deste aparelho.', { ic: 'aviso' }); }
  }, [banco, avisar]);
  useEffect(() => { recarregar(); }, [recarregar]);

  /* abrir arquivo pela rota #/arq/<id> */
  const idRota = rota.startsWith('arq/') ? rota.slice(4) : null;
  useEffect(() => {
    let vivo = true;
    setGaveta(false);
    if (!idRota) { setAberto(null); setStatusEd(null); return undefined; }
    if (abertoRef.current && abertoRef.current.arquivo.ficha.id === idRota) return undefined;
    banco.abrir(idRota).then((r) => {
      if (!vivo) return;
      if (!r || r.ficha.status === 'lixeira') {
        avisar('Esse arquivo não está mais neste aparelho.', { ic: 'aviso' });
        irPara('');
        return;
      }
      setAberto({ arquivo: { ficha: r.ficha, conteudo: abrirConteudo(r.ficha, r.conteudo) }, h: novoHistorico(), tamanho: r.tamanho, sujo: false, salvoEm: r.ficha.alteradoEm });
      setAba(r.ficha.tipo === 'postits' ? 'inserir' : 'inicio');
      setFaixaTemp(false);
    });
    return () => { vivo = false; };
  }, [idRota, banco, avisar, setAberto]);

  /* gravação: só depois da tela já mostrar a mudança */
  const salvar = useCallback(async (novo, acao) => {
    setAberto({ ...novo, sujo: true });
    try {
      const t = await banco.salvar(novo.arquivo, acao);
      setAberto((atual) => (atual && atual.arquivo === novo.arquivo ? { ...atual, tamanho: t, sujo: false, salvoEm: new Date().toISOString() } : atual));
      recarregar();
    } catch {
      avisar('Não foi possível salvar neste aparelho. Libere espaço e tente de novo.', { ic: 'aviso' });
    }
  }, [banco, recarregar, avisar, setAberto]);

  /** Aplica um diff no arquivo aberto (entra no desfazer e grava). */
  const aplicarDiff = useCallback((diff, acao = 'alterou') => {
    const atual = abertoRef.current;
    if (!atual) return false;
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
    if (ok && juntar) {
      const depois = abertoRef.current;
      if (depois) setAberto({ ...depois, h: juntarUltimas(depois.h) });
    }
    return ok;
  }, [aplicarDiff, setAberto]);

  const desfazerOuRefazer = useCallback((re) => {
    const atual = abertoRef.current;
    if (!atual) return;
    const r = re ? refazer(atual.h, atual.arquivo) : desfazer(atual.h, atual.arquivo);
    if (!r.diff) return;
    salvar({ ...atual, h: r.h, arquivo: carimbar(r.estado, AUTOR) }, re ? 'refez' : 'desfez');
    avisar((re ? 'Refeito: ' : 'Desfeito: ') + (r.diff.rotulo || 'última ação'), { ic: re ? 'refazer' : 'desfazer' });
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
    titulo: 'Excluir de vez?', texto: `"${f.nome}" será apagado deste aparelho e não dá para voltar. Fica anotado no histórico.`,
    confirmar: 'Excluir de vez', perigo: true,
    aoConfirmar: async () => { await banco.excluirDeVez(f.id); await recarregar(); avisar(`"${f.nome}" foi excluído de vez.`, { ic: 'x' }); },
  }), [banco, recarregar, avisar]);

  const mod = aberto ? aberto.arquivo.ficha.tipo : TIPOS[rota] ? rota : null;

  const semPermissao = useCallback((acao, ficha) => {
    const f = ficha || (abertoRef.current && abertoRef.current.arquivo.ficha);
    return pode(prefs.perfil, acao, { usuario: AUTOR, criadoPor: f ? f.criadoPor : AUTOR }) ? '' : SEM_PERMISSAO;
  }, [prefs.perfil]);

  const bloqueado = useCallback((id, ficha) => {
    const cmd = PorId[id];
    if (!cmd) return semPermissao(id, ficha);
    if (id === 'editar.desfazer') return aberto && podeDesfazer(aberto.h) ? '' : 'Nada para desfazer';
    if (id === 'editar.refazer') return aberto && podeRefazer(aberto.h) ? '' : 'Nada para refazer';
    if (id === 'arquivo.novo' && !mod) return '';
    return cmd.acao && cmd.acao !== 'exportar' ? semPermissao(cmd.acao, ficha) : '';
  }, [aberto, semPermissao, mod]);

  const ligado = useCallback((id) => {
    const geral = {
      'exibir.faixaTudo': prefs.faixa === 'tudo', 'exibir.faixaAbas': prefs.faixa === 'abas', 'exibir.faixaOculta': prefs.faixa === 'oculta',
      'exibir.menuCompleto': prefs.menu === 'completo', 'exibir.menuIcones': prefs.menu === 'icones', 'exibir.menuOculto': prefs.menu === 'oculto',
      'exibir.layoutA': prefs.layout === 'A', 'exibir.layoutB': prefs.layout === 'B', 'exibir.painel': prefs.painel, 'exibir.relevo': prefs.relevo,
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
      avisar(`"${cmd.nome}"${mod && DO_MODULO[mod] ? ' ' + DO_MODULO[mod] : ''} chega na ${chega}.`, { ic: 'info' });
      return;
    }
    const bloq = bloqueado(id);
    if (bloq) { avisar(bloq, { ic: 'aviso' }); return; }
    if (faixaTemp && !id.startsWith('exibir.faixa')) setFaixaTemp(false);
    const atual = abertoRef.current;
    switch (id) {
      case 'app.inicio': irPara(''); return;
      case 'app.buscar': setPaleta(true); return;
      case 'app.opcoes': case 'exibir.tema': setOpcoes(true); return;
      case 'arquivo.novo': criarNovo(mod || 'planilha'); return;
      case 'arquivo.novaPlanilha': case 'arquivo.novoDocumento': case 'arquivo.novoQuadro': criarNovo(NOVO_POR_CMD[id]); return;
      case 'arquivo.renomear': if (atual) perguntarNome(atual.arquivo.ficha); return;
      case 'arquivo.lixeira': if (atual) mandarLixeira(atual.arquivo.ficha); return;
      case 'editar.desfazer': desfazerOuRefazer(false); return;
      case 'editar.refazer': desfazerOuRefazer(true); return;
      case 'exibir.faixaTudo': setPref('faixa', 'tudo'); setFaixaTemp(false); return;
      case 'exibir.faixaAbas': setPref('faixa', 'abas'); setFaixaTemp(false); return;
      case 'exibir.faixaOculta':
        setPref('faixa', 'oculta'); setFaixaTemp(false);
        avisar('Faixa escondida. Para trazer de volta: botão de faixa no topo, Opções ou Ctrl+F1.', { ic: 'info' });
        return;
      case 'exibir.menuCompleto': setPref('menu', 'completo'); return;
      case 'exibir.menuIcones': setPref('menu', 'icones'); return;
      case 'exibir.menuOculto': setPref('menu', 'oculto'); return;
      case 'exibir.painel': setPref('painel', !prefs.painel); return;
      case 'exibir.layoutA': setPref('layout', 'A'); return;
      case 'exibir.layoutB': setPref('layout', 'B'); return;
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
      if (paleta || opcoes || pergunta) return;
      const k = ev.key.toLowerCase();
      const ctrl = ev.ctrlKey || ev.metaKey;
      const digitando = /^(input|textarea|select)$/i.test(ev.target.tagName) || ev.target.isContentEditable;
      if ((ctrl && k === 'k') || (ev.altKey && k === 'q')) { ev.preventDefault(); setPaleta(true); return; }
      if (ctrl && ev.key === 'F1') { ev.preventDefault(); executar(prefs.faixa === 'tudo' ? 'exibir.faixaAbas' : 'exibir.faixaTudo'); return; }
      if (ev.key === 'Escape') { setFaixaTemp(false); setGaveta(false); return; }
      if (digitando || !abertoRef.current) return;
      if (ctrl && k === 'z' && !ev.shiftKey) { ev.preventDefault(); desfazerOuRefazer(false); }
      if (ctrl && (k === 'y' || (k === 'z' && ev.shiftKey))) { ev.preventDefault(); desfazerOuRefazer(true); }
    };
    addEventListener('keydown', tecla);
    return () => removeEventListener('keydown', tecla);
  }, [paleta, opcoes, pergunta, executar, desfazerOuRefazer, prefs.faixa]);

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
    mod, executar, bloqueado, ligado, demo,
    abrir: (id) => irPara('arq/' + id),
    perguntarNome, lixeira: mandarLixeira, restaurar, excluirDeVez,
    renomear: (nome) => { const a = abertoRef.current; if (a && nome !== a.arquivo.ficha.nome) renomearArquivo(a.arquivo.ficha, nome); },
    dataHora, tamanho: tamanhoLegivel,
    instalar: estadoPwa.instalar ? pedirInstalacao : null,
    /* para o editor */
    aplicar, avisar, perguntar: setPergunta, temJanela: !!(paleta || opcoes || pergunta || gaveta),
    registrarEditor: (ed) => { editorRef.current = ed; }, setStatus: setStatusEd,
    alvoPainel, abrirPainel: () => setPref('painel', true), painelAberto: prefs.painel, cel,
  };

  const contagem = useMemo(() => {
    const a = ativos(fichas);
    const c = { lixeira: fichas.length - a.length };
    for (const t of Object.keys(TIPOS)) c[t] = a.filter((f) => f.tipo === t).length;
    return c;
  }, [fichas]);

  let conteudo;
  if (aberto) {
    conteudo = aberto.arquivo.ficha.tipo === 'postits'
      ? <Quadro key={aberto.arquivo.ficha.id} arquivo={aberto.arquivo} cx={cx} />
      : <EditorEmBreve tipo={aberto.arquivo.ficha.tipo} />;
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
      <div className="col">
        {estadoPwa.aviso && (
          <button type="button" className="faixa-aviso nova" onClick={atualizarAgora}><Icone n="atualizar" />Versão nova pronta. Toque para atualizar.</button>
        )}
        {demo && (
          <div className="faixa-aviso demo" role="status"><Icone n="info" />Demonstração: até 3 arquivos, guardados só neste aparelho. Exportações saem com a marca DEMO · EFC.</div>
        )}
        <Topo titulo={TITULOS[rota] || 'EFCdocs'} ficha={ficha} salvo={salvo} prefs={prefs} cx={cx} cel={cel}
          aba={aba} setAba={setAba} faixaTemp={faixaTemp} setFaixaTemp={setFaixaTemp} abrirGaveta={() => setGaveta(true)} />
        <div className="work">
          <main className="wk-main" id="conteudo">{conteudo}</main>
          {aberto && prefs.painel && (
            <Painel aberto={aberto} cx={cx} fechar={() => setPref('painel', false)}
              extra={ficha.tipo === 'postits' ? <div className="painel-extra" ref={setAlvoPainel} /> : null} />
          )}
        </div>
        {cel && !aberto ? (
          <BarraCelular rota={rota} cont={contagem} abrirGaveta={() => setGaveta(true)} />
        ) : (
          <footer className="foot" aria-label="Barra de status">
            {aberto ? (
              <>
                <span><b>{TIPOS[ficha.tipo].nome}</b></span>
                <span className="some-cel">Rascunho · Rev. {String(ficha.rev).padStart(2, '0')}</span>
                {ultimo && <span className="some-cel">Desfazer: {ultimo}</span>}
                <span className="sts">
                  {ficha.tipo === 'planilha' && <span>Selecione células para ver <b>Soma</b>, <b>Média</b> e <b>Contagem</b></span>}
                  {ficha.tipo === 'docx' && <span>Página <b>1</b> de <b>1</b> · <b>0</b> palavras</span>}
                  {ficha.tipo === 'postits' && (
                    <>
                      {st.sel ? <span className="some-cel"><b>{st.sel}</b> {st.sel === 1 ? 'selecionado' : 'selecionados'}</span> : null}
                      <span data-status="contagem"><b>{st.postits || 0}</b> {st.postits === 1 ? 'post-it' : 'post-its'} · <b>{st.formas || 0}</b> {st.formas === 1 ? 'forma' : 'formas'} · <b>{st.setas || 0}</b> {st.setas === 1 ? 'seta' : 'setas'}{st.paginas > 0 && <> · <b>{st.paginas}</b> {st.paginas === 1 ? 'página' : 'páginas'}</>}</span>
                      {st.zoom ? <span className="some-cel">Zoom <b>{Math.round(st.zoom * 100)}%</b></span> : null}
                    </>
                  )}
                  {aberto.tamanho && <span className="some-cel">No aparelho: <b>{tamanhoLegivel(aberto.tamanho.bytesFinal)}</b></span>}
                </span>
              </>
            ) : (
              <>
                <span><b>EFCdocs</b> {VERSAO}</span>
                <span className="sts">
                  {demo && <span className="demo">Demonstração</span>}
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
      {opcoes && <Opcoes prefs={prefs} setPref={setPref} cx={cx} aoFechar={() => setOpcoes(false)} demo={demo} versao={VERSAO} espaco={espaco} />}
      {pergunta && <Pergunta p={pergunta} aoFechar={() => setPergunta(null)} />}
      <Avisos lista={avisos} tirar={tirarAviso} />
    </div>
  );
}
