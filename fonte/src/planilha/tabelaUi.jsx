/* Vértice Docs v0.6.19 "Tabelas vivas" — tela das tabelas: galeria de estilos do Excel, janelas da aba "Design da Tabela",
   alça do canto (D-14) e o gancho usarTabelaViva, que liga as regras de tabelaViva.js à planilha (Tab, comandos, contexto). */
import { useMemo, useRef, useState } from 'react';
import { Janela } from '../ui/comum.jsx';
import { lerEnderecoCaixa, normalFaixa, textoFaixa } from './ref.js';
import { GALERIA, coresDoTema, miniatura, rotuloDoEstilo, temEstiloVivo } from './tabelaEstilo.js';
import * as TV from './tabelaViva.js';
import { formatarComoTabela } from './inserir.js';

/* ---------- galeria ---------- */
function Mini({ nome, tema, op }) {
  const m = useMemo(() => (nome ? miniatura(nome, tema, op) : null), [nome, tema, op]);
  return (
    <span className="tv-mini" aria-hidden="true">
      {(m || Array.from({ length: 5 }, () => Array.from({ length: 4 }, () => ({})))).map((lin, l) => (
        <span key={l} className="tv-mini-l">
          {lin.map((e, c) => <i key={c} style={{ background: e.fundo || 'transparent', borderTopColor: e.bd && e.bd.t ? e.bdcs.t : 'transparent', borderBottomColor: e.bd && e.bd.b ? e.bdcs.b : 'transparent', borderLeftColor: e.bd && e.bd.l ? e.bdcs.l : 'transparent', borderRightColor: e.bd && e.bd.r ? e.bdcs.r : 'transparent' }} className={l === 0 ? 'cab' : ''}><b style={{ background: e.cor || (l === 0 ? '#1f2d36' : '#8a96a0') }} /></i>)}
        </span>
      ))}
    </span>
  );
}
/** Galeria com os 60 estilos do Excel e "Nenhum". atual: nome (null = nenhum). */
export function GaleriaTabela({ c, atual, op, aoEscolher }) {
  const tema = coresDoTema(c);
  const opMini = useMemo(() => ({ ll: op && op.ll != null ? op.ll : 1, lc: op && op.lc ? 1 : 0, pc: op && op.pc ? 1 : 0, uc: op && op.uc ? 1 : 0 }), [op]);
  return (
    <div className="tv-galeria" role="group" aria-label="Estilos de tabela">
      {GALERIA.map((g) => (
        <section key={g.fam} className="tv-fam">
          <span className="tv-fam-n">{g.rotulo}</span>
          <div className="tv-grade">
            {g.fam === 'Light' && (
              <button type="button" className="tv-est" aria-pressed={!atual} data-tab-estilo="nenhum" title="Nenhum" onClick={() => aoEscolher(null)}><Mini nome={null} tema={tema} op={opMini} /></button>
            )}
            {g.itens.map((nome) => (
              <button key={nome} type="button" className="tv-est" aria-pressed={atual === nome} data-tab-estilo={nome} title={rotuloDoEstilo(nome)} onClick={() => aoEscolher(nome)} onDoubleClick={() => aoEscolher(nome, true)}>
                <Mini nome={nome} tema={tema} op={opMini} />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ---------- janelas da aba Design da Tabela ---------- */
function JanelaCampo({ titulo, icone, subtitulo, rotulo, inicial, dica, botao, aoAplicar, aoFechar, dado }) {
  const [v, setV] = useState(inicial);
  const [erro, setErro] = useState('');
  const ok = () => { const e = aoAplicar(v.trim()); if (e) setErro(e); };
  return (
    <Janela titulo={titulo} icone={icone} subtitulo={subtitulo} aoFechar={aoFechar} classe="pl-jdados tv-jcampo" rodape={(
      <><button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button><button type="button" className="btn sm primary" data-tv-ok onClick={ok}>{botao}</button></>
    )}>
      <div className="janela-c rg-corpo">
        <label className="rg-campo"><span>{rotulo}</span><input value={v} data-foco data-tv-campo={dado} spellCheck={false} maxLength={60}
          onChange={(ev) => { setV(ev.target.value); setErro(''); }} onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); ok(); } }} /></label>
        {dica && <p className="dd-dica">{dica}</p>}
        {erro && <p className="rg-erro" role="alert">{erro}</p>}
      </div>
    </Janela>
  );
}

function JanelaTotal({ subtitulo, atual, aoEscolher, aoFechar }) {
  return (
    <Janela titulo="Total da coluna" icone="soma" subtitulo={subtitulo} aoFechar={aoFechar} classe="pl-jdados tv-jtotal">
      <div className="janela-c rg-corpo">
        <div className="tv-totais" role="group" aria-label="Conta do total">
          {TV.FUNCOES_TOTAL.map(([id, nome]) => (
            <button key={id} type="button" className="btn sm" aria-pressed={atual === id} data-tv-total={id} onClick={() => aoEscolher(id)}>{nome}</button>
          ))}
        </div>
        <p className="dd-dica">A conta usa só as linhas que aparecem (as escondidas pelo filtro ficam fora), como no Excel.</p>
      </div>
    </Janela>
  );
}

function JanelaEstilos({ c, t, aoEscolher, aoFechar }) {
  return (
    <Janela titulo="Estilos de tabela" icone="tabela" subtitulo={`${t.nome} · ${rotuloDoEstilo(t.est && !t.est.sem ? t.est.nome : null)}`} aoFechar={aoFechar} classe="pl-jdados tv-jestilos">
      <div className="janela-c rg-corpo">
        <GaleriaTabela c={c} atual={t.est && !t.est.sem ? t.est.nome : null} op={t.est} aoEscolher={aoEscolher} />
        <p className="dd-dica">O estilo vai junto para o Excel. A cor que você pôs numa célula fica por cima da tabela.</p>
      </div>
    </Janela>
  );
}

/* ---------- alça do canto (D-14) ---------- */
/**
 * Alça no canto de baixo à direita da tabela: arraste para esticar ou encolher (linhas e colunas). G = geometria da grade.
 * aoSoltar(faixa nova). Não aparece onde está a alça de preencher (a seleção terminando no mesmo canto).
 */
export function AlcaTabela({ t, G, tam, ponto, rolarNaBorda, aoSoltar, toque }) {
  const [arr, setArr] = useState(null);
  const x = G.xFim(t.c2), y = G.yFim(t.l2);
  if (!arr && (x < G.hw - 4 || y < G.hh - 4 || x > tam.W + 4 || y > tam.H + 4)) return null;
  const alvo = (ev) => {
    const p = ponto(ev);
    if (rolarNaBorda) rolarNaBorda(p);
    const l = Math.max(t.l1 + (t.cab ? 1 : 0), G.linEm(Math.max(G.hh + 1, Math.min(tam.H - 2, p.y))));
    const c = Math.max(t.c1, G.colEm(Math.max(G.hw + 1, Math.min(tam.W - 2, p.x))));
    return { l2: l, c2: c };
  };
  const ar = arr;
  return (
    <>
      {ar && <div className="tv-alca-previa" aria-hidden="true" style={{ left: G.xDe(t.c1), top: G.yDe(t.l1), width: Math.max(4, G.xFim(ar.c2) - G.xDe(t.c1)), height: Math.max(4, G.yFim(ar.l2) - G.yDe(t.l1)) }} />}
      <span className={'tv-alca' + (toque ? ' toque' : '')} data-tabela-alca={t.nome} role="button" tabIndex={-1} aria-label={`Mudar o tamanho da tabela ${t.nome}`} title="Arraste para mudar o tamanho da tabela"
        style={{ left: x, top: y }}
        onPointerDown={(ev) => { ev.preventDefault(); ev.stopPropagation(); try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch { /* sem captura */ } setArr({ l2: t.l2, c2: t.c2 }); }}
        onPointerMove={(ev) => { if (arr) setArr(alvo(ev)); }}
        onPointerUp={(ev) => { if (!arr) return; const a = alvo(ev); setArr(null); if (a.l2 !== t.l2 || a.c2 !== t.c2) aoSoltar(a); }}
        onPointerCancel={() => setArr(null)} />
    </>
  );
}

/* ---------- o gancho ---------- */
const ROTULO = {
  'tabela.totais': 'Linha de totais', 'tabela.listras': 'Linhas em tiras', 'tabela.listrasCol': 'Colunas em tiras',
  'tabela.primeira': 'Primeira coluna', 'tabela.ultima': 'Última coluna', 'tabela.filtro': 'Botão de filtro',
};
const OPCAO = { 'tabela.listras': 'll', 'tabela.listrasCol': 'lc', 'tabela.primeira': 'pc', 'tabela.ultima': 'uc' };

/**
 * Liga as tabelas vivas à planilha. p = { c, abaId, ativa: {l, c}, mudar, selecionar, avisar, somenteLeitura }.
 * Devolve { ativa, executar, ligado, bloqueado, janela, aoTab, depoisDoTab, aoConfirmar, alca(props) }.
 */
export function usarTabelaViva(p) {
  const { c, abaId, ativa, mudar, selecionar, avisar } = p;
  const [jan, setJan] = useState(null);
  const ultimo = useRef(p);
  ultimo.current = p;
  const naCelula = c.tabelas ? TV.tabelaEm(c, abaId, ativa.l, ativa.c) : null;

  /* tabela antiga do app (pintada nas células, sem estilo guardado): vira viva antes da primeira mudança de Design */
  const comViva = (k, fazer) => {
    const base = TV.vivificar(c, abaId, k);
    if (!base) return fazer(c);
    const r = fazer(TV.aplicarMud(c, base));
    return r && r.mud ? { ...r, mud: { ...base, ...r.mud } } : r;
  };
  const aplicar = (r, rotulo, ok) => {
    if (!r) return false;
    if (r.erro) { avisar(r.erro, { ic: 'aviso' }); return false; }
    if (!r.mud || !Object.keys(r.mud).length) return false;
    const feito = mudar(r.mud, rotulo);
    if (feito && ok) ok(r);
    return feito;
  };

  const executar = (id) => {
    if (!id.startsWith('tabela.')) return false;
    if (!naCelula) { avisar('Clique numa célula da tabela.', { ic: 'info' }); return true; }
    const { k, t } = naCelula;
    switch (id) {
      case 'tabela.nome': setJan({ tipo: 'nome', k }); break;
      case 'tabela.redimensionar': setJan({ tipo: 'redim', k }); break;
      case 'tabela.estilos': setJan({ tipo: 'estilos', k }); break;
      case 'tabela.totalColuna': if (!t.tot) avisar('Ligue a Linha de totais primeiro (Design da Tabela).', { ic: 'info' }); else setJan({ tipo: 'total', k, col: ativa.c }); break;
      case 'tabela.converter':
        aplicar(TV.converterEmIntervalo(c, abaId, k), `Converter ${t.nome} em intervalo`, () => avisar(`A tabela ${t.nome} virou células comuns. A aparência ficou.`, { ic: 'check', acao: { rotulo: 'Desfazer', fazer: p.desfazer } }));
        break;
      case 'tabela.totais': aplicar(comViva(k, (cc) => TV.alternarTotais(cc, abaId, k)), t.tot ? 'Tirar a linha de totais' : 'Linha de totais'); break;
      case 'tabela.filtro': aplicar(TV.alternarFiltro(c, abaId, k), 'Botão de filtro', (r) => { if (r.trocou) avisar('O filtro que estava na aba passou para esta tabela (a aba tem um filtro por vez).', { ic: 'info' }); }); break;
      default:
        if (OPCAO[id]) aplicar(comViva(k, (cc) => TV.mudarOpcao(cc, k, OPCAO[id])), ROTULO[id]);
    }
    return true;
  };
  const ligado = (id) => {
    if (!naCelula || !id.startsWith('tabela.')) return undefined;
    const { t } = naCelula;
    if (id === 'tabela.totais') return !!t.tot;
    if (id === 'tabela.filtro') return TV.filtroLigado(c, abaId, t);
    if (OPCAO[id]) return t.est ? TV.opcaoLigada(t, OPCAO[id]) : OPCAO[id] === 'll';
    return undefined;
  };
  const bloqueado = (id) => {
    if (!id.startsWith('tabela.')) return null;
    if (p.somenteLeitura) return 'Somente leitura.';
    if (!naCelula) return 'Clique numa célula da tabela.';
    if (id === 'tabela.totalColuna' && !naCelula.t.tot) return 'Ligue a Linha de totais primeiro.';
    if (id === 'tabela.filtro' && !naCelula.t.cab) return 'A tabela não tem linha de títulos.';
    return null;
  };

  /* Tab fora da edição (a edição chama depoisDoTab depois de gravar) */
  const aoTab = (l, col, volta) => {
    const q = ultimo.current;
    const r = TV.tabNaTabela(q.c, q.abaId, l, col, volta);
    if (!r) return false;
    if (r.novaLinha) {
      if (q.somenteLeitura) return false;
      const n = TV.linhaNova(q.c, q.abaId, r.novaLinha);
      if (n.erro) { q.avisar(n.erro, { ic: 'aviso' }); return true; }
      if (q.mudar(n.mud, 'Linha nova na tabela')) q.selecionar(n.alvo.l, n.alvo.c);
      return true;
    }
    q.selecionar(r.l, r.c);
    return true;
  };

  /* D-12: chamado dentro do confirmar, com a célula digitada já no lote. Devolve o aviso (ou ''). */
  const aoConfirmar = (lote, abaE, l, col) => {
    const cresceu = TV.crescerAoDigitar(c, lote, abaE, l, col);
    const calc = TV.colunaCalculadaAoDigitar(c, lote, abaE, l, col);
    if (cresceu) return `A tabela ${cresceu.nome} ganhou ${cresceu.onde === 'linha' ? 'esta linha' : 'esta coluna'}. Ctrl+Z desfaz só isso; o que você digitou fica.`;
    if (calc) return `A fórmula foi para a coluna inteira da tabela (${calc + 1} células). Ctrl+Z desfaz só isso; a fórmula fica nesta célula.`;
    return '';
  };

  const fechar = () => setJan(null);
  let janela = null;
  const tj = jan && c.tabelas && c.tabelas[jan.k];
  if (jan && !tj) janela = null;
  else if (jan && jan.tipo === 'nome') {
    janela = <JanelaCampo titulo="Nome da tabela" icone="renomear" subtitulo={`Vale em ${textoFaixa(tj)}`} rotulo="Nome" inicial={tj.nome} botao="Renomear" dado="nome"
      dica="Letras, números e _ (sem espaço); não pode começar com número." aoFechar={fechar}
      aoAplicar={(v) => { const r = TV.renomear(c, jan.k, v); if (r.erro) return r.erro; if (r.mud && Object.keys(r.mud).length) mudar(r.mud, `Renomear tabela para ${v}`); fechar(); return ''; }} />;
  } else if (jan && jan.tipo === 'redim') {
    janela = <JanelaCampo titulo="Redimensionar tabela" icone="tabela" subtitulo={tj.nome} rotulo="Nova área" inicial={textoFaixa(tj)} botao="Redimensionar" dado="redim"
      dica="A linha dos títulos fica no mesmo lugar e a área precisa encostar na tabela de agora. Também dá para arrastar a alça no canto de baixo da tabela." aoFechar={fechar}
      aoAplicar={(v) => {
        const f0 = lerEnderecoCaixa(v.toUpperCase());
        if (!f0) return 'Diga a área, por exemplo A1:E20.';
        const f = normalFaixa(f0);
        if (f.l1 !== tj.l1 || f.c1 !== tj.c1) return `O canto de cima à esquerda continua em ${textoFaixa({ l1: tj.l1, c1: tj.c1, l2: tj.l1, c2: tj.c1 })}.`;
        const r = comViva(jan.k, (cc) => TV.redimensionar(cc, abaId, jan.k, f));
        if (r.erro) return r.erro;
        if (r.mud && Object.keys(r.mud).length) mudar(r.mud, `Redimensionar ${tj.nome}`);
        fechar(); return '';
      }} />;
  } else if (jan && jan.tipo === 'total') {
    janela = <JanelaTotal subtitulo={`${tj.nome} · coluna ${(tj.cols && tj.cols[jan.col - tj.c1]) || ''}`} atual={TV.funcaoDoTotal(c, abaId, tj, jan.col)} aoFechar={fechar}
      aoEscolher={(id) => { if (aplicar(TV.totalDaColuna(c, abaId, jan.k, jan.col, id), 'Total da coluna')) fechar(); }} />;
  } else if (jan && jan.tipo === 'estilos') {
    janela = <JanelaEstilos c={c} t={tj} aoFechar={fechar}
      aoEscolher={(nome) => { aplicar(comViva(jan.k, (cc) => TV.mudarEstilo(cc, jan.k, nome)), `Estilo da tabela: ${rotuloDoEstilo(nome)}`); fechar(); }} />;
  }

  /* alça: só fora da edição, fora do celular sem toque grande, e não em cima da alça de preencher */
  const alca = ({ G, tam, ponto, rolarNaBorda, faixa, toque, editando }) => {
    if (!naCelula || editando || p.somenteLeitura) return null;
    const { k, t } = naCelula;
    const f = normalFaixa(faixa);
    if (f.l2 === t.l2 && f.c2 === t.c2) return null;
    return <AlcaTabela key={k} t={t} G={G} tam={tam} ponto={ponto} rolarNaBorda={rolarNaBorda} toque={toque}
      aoSoltar={(nf) => aplicar(comViva(k, (cc) => TV.redimensionar(cc, abaId, k, nf)), `Redimensionar ${t.nome}`)} />;
  };

  /* Formatar como tabela (janela da Página Inicial): devolve o erro ou null */
  const criar = (f, op, valorDe) => {
    const r = formatarComoTabela(c, abaId, f, op, valorDe);
    if (r.erro) return r.erro;
    mudar(r.mud, 'Formatar como tabela');
    avisar(`Tabela ${op.nome} criada: ${r.colunas} colunas e ${r.linhas} linhas. Ela cresce quando você digita logo embaixo.`, { ic: 'tabela' });
    return null;
  };

  return { ativa: naCelula, criar, executar, ligado, bloqueado, janela, aoTab, aoConfirmar, alca, viva: naCelula ? temEstiloVivo(naCelula.t) : false };
}

