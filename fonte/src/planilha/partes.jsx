/* EFCdocs — Planilha: peças da tela (abas, barra de status, menus e janelas). */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icone, Janela } from '../ui/comum.jsx';
import { FORMATOS, codigoPt, codigoDePt, formatar } from './formato.js';
import { FUNCOES, CATEGORIAS } from './nomesFuncoes.js';
import { textoFaixa, letraCol } from './ref.js';
import { paraMostrar } from './formula.js';
import { numeroGeral } from './valores.js';

export const CORES_PALETA = [
  ['#000000', 'Preto'], ['#595959', 'Cinza escuro'], ['#7f7f7f', 'Cinza'], ['#c00000', 'Vermelho escuro'], ['#ff0000', 'Vermelho'],
  ['#ffc000', 'Laranja'], ['#ffff00', 'Amarelo'], ['#92d050', 'Verde claro'], ['#00b050', 'Verde'], ['#00b0f0', 'Azul claro'],
  ['#0070c0', 'Azul'], ['#002060', 'Azul escuro'], ['#7030a0', 'Roxo'],
  ['#f2f2f2', 'Cinza bem claro'], ['#d9d9d9', 'Cinza claro'], ['#fce4d6', 'Pêssego'], ['#fff2cc', 'Amarelo claro'],
  ['#e2efda', 'Verde bem claro'], ['#ddebf7', 'Azul bem claro'], ['#ede7f6', 'Lilás'], ['#ffc7ce', 'Rosa (não conforme)'], ['#c6efce', 'Verde (conforme)'], ['#ffeb9c', 'Amarelo (atenção)'],
];

/* ---------- abas da planilha (embaixo) ---------- */
export function AbasPlanilha({ c, abaId, aoTrocar, aoNova, aoMenu, somenteLeitura }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current && ref.current.querySelector('[aria-selected="true"]');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [abaId]);
  const visiveis = c.ordem.filter((id) => !c.abas[id].oculta);
  const ocultas = c.ordem.length - visiveis.length;
  return (
    <div className="pl-abas" role="tablist" aria-label="Abas da planilha" ref={ref}>
      {!somenteLeitura && <button type="button" className="pl-aba-nova" title="Nova aba" aria-label="Nova aba" onClick={aoNova}><Icone n="plus" /></button>}
      <div className="pl-abas-l">
        {visiveis.map((id) => {
          const a = c.abas[id];
          return (
            <button key={id} type="button" role="tab" aria-selected={id === abaId} className={'pl-aba' + (id === abaId ? ' on' : '')}
              style={a.cor ? { '--aba-cor': a.cor } : undefined} data-aba={a.nome}
              onClick={() => aoTrocar(id)} onDoubleClick={() => !somenteLeitura && aoMenu(id, null, 'renomear')}
              onContextMenu={(ev) => { ev.preventDefault(); aoMenu(id, { x: ev.clientX, y: ev.clientY }); }}>
              {a.nome}
              {id === abaId && <span className="pl-aba-mais" role="button" tabIndex={-1} aria-label="Opções da aba" onClick={(ev) => { ev.stopPropagation(); const r = ev.currentTarget.getBoundingClientRect(); aoMenu(id, { x: r.left, y: r.top }); }}><Icone n="chevronBaixo" /></span>}
            </button>
          );
        })}
      </div>
      {ocultas > 0 && <span className="pl-abas-ocultas" title="Abas ocultas: use o menu de uma aba para reexibir">+{ocultas} oculta{ocultas > 1 ? 's' : ''}</span>}
    </div>
  );
}

/* ---------- menu flutuante (botão direito, abas, status) ---------- */
export function MenuFlutuante({ x, y, itens, aoFechar }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x, y });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ x: Math.max(6, Math.min(x, innerWidth - r.width - 6)), y: Math.max(6, Math.min(y, innerHeight - r.height - 6)) });
    const fora = (ev) => { if (!el.contains(ev.target)) aoFechar(); };
    const esc = (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); aoFechar(); } };
    setTimeout(() => addEventListener('pointerdown', fora), 0);
    addEventListener('keydown', esc, true);
    const b = el.querySelector('button:not([disabled])');
    if (b) b.focus();
    return () => { removeEventListener('pointerdown', fora); removeEventListener('keydown', esc, true); };
  }, [x, y]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="pl-menu card" ref={ref} role="menu" style={{ left: pos.x, top: pos.y }}
      onKeyDown={(ev) => {
        const bs = [...ref.current.querySelectorAll('button:not([disabled])')];
        const i = bs.indexOf(document.activeElement);
        if (ev.key === 'ArrowDown') { ev.preventDefault(); (bs[i + 1] || bs[0]).focus(); }
        if (ev.key === 'ArrowUp') { ev.preventDefault(); (bs[i - 1] || bs[bs.length - 1]).focus(); }
      }}>
      {itens.filter(Boolean).map((it, i) => (it === '-'
        ? <hr key={i} />
        : (
          <button key={i} type="button" role="menuitem" disabled={!!it.desligado} title={it.desligado || it.dica || undefined} className={it.perigo ? 'perigo' : ''}
            onClick={() => { aoFechar(); it.fazer(); }}>
            {it.ic ? <Icone n={it.ic} /> : <i />}<span>{it.nome}</span>{it.atalho && <kbd>{it.atalho}</kbd>}
          </button>
        )))}
    </div>
  );
}

/* ---------- barra de status (PL06) ---------- */
export const ESTATS = [['soma', 'Soma'], ['media', 'Média'], ['cont', 'Contagem'], ['contNum', 'Cont. núm.'], ['min', 'Mín'], ['max', 'Máx']];
const FUNCAO_EST = { soma: 'SOMA', media: 'MÉDIA', cont: 'CONT.VALORES', contNum: 'CONT.NÚM', min: 'MÍNIMO', max: 'MÁXIMO' };

export function StatusPlanilha({ st }) {
  const [menu, setMenu] = useState(null);
  if (!st || !st.calc) return st && st.dica ? <span className="some-cel">{st.dica}</span> : null;
  const { calc, mostrar, faixa } = st;
  const lista = ESTATS.filter(([k]) => mostrar.includes(k) && calc[k] != null);
  const fmt = (k) => (k === 'cont' || k === 'contNum' ? String(calc[k]) : st.formatar ? st.formatar(calc[k]) : numeroGeral(calc[k]));
  return (
    <>
      {lista.map(([k, nome]) => (
        <button key={k} type="button" className="pl-st" data-est={k} title="Copiar o valor ou pôr a conta na planilha"
          onClick={(ev) => { const r = ev.currentTarget.getBoundingClientRect(); setMenu({ k, x: r.left, y: r.top - 8 }); }}>
          {nome}: <b>{fmt(k)}</b>
        </button>
      ))}
      <button type="button" className="pl-st pl-st-g some-cel" title="Escolher o que aparece aqui" aria-label="Escolher o que aparece na barra de status"
        onClick={(ev) => { const r = ev.currentTarget.getBoundingClientRect(); setMenu({ k: null, x: r.left, y: r.top - 8 }); }}><Icone n="gear" /></button>
      {menu && (
        <MenuFlutuante x={menu.x} y={menu.y - (menu.k ? 120 : 220)} aoFechar={() => setMenu(null)} itens={menu.k ? [
          { nome: `Copiar ${fmt(menu.k)}`, ic: 'copiar', fazer: () => st.acoes.copiar(fmt(menu.k)) },
          !st.somenteLeitura && { nome: `Pôr a conta embaixo: =${FUNCAO_EST[menu.k]}(${textoFaixa(faixa)})`, ic: 'setaBaixo', fazer: () => st.acoes.porConta(FUNCAO_EST[menu.k], 'baixo'), desligado: st.semLugar ? 'Selecione uma coluna ou linha de números' : '' },
          !st.somenteLeitura && { nome: 'Pôr a conta ao lado', ic: 'setaDir', fazer: () => st.acoes.porConta(FUNCAO_EST[menu.k], 'lado'), desligado: st.semLugar ? 'Selecione uma coluna ou linha de números' : '' },
        ] : ESTATS.map(([k, nome]) => ({ nome, ic: mostrar.includes(k) ? 'check' : null, fazer: () => st.acoes.alternar(k) }))} />
      )}
    </>
  );
}

/* ---------- cores ---------- */
export function JanelaCor({ titulo, aoEscolher, aoFechar, semCor }) {
  return (
    <Janela titulo={titulo} aoFechar={aoFechar} classe="pl-jcor">
      <div className="janela-c">
        <div className="pl-paleta">
          <button type="button" className="pl-cor auto" onClick={() => { aoEscolher(null); aoFechar(); }}>{semCor}</button>
          {CORES_PALETA.map(([hex, nome]) => (
            <button key={hex} type="button" className="pl-cor" title={nome} aria-label={nome} style={{ background: hex }} onClick={() => { aoEscolher(hex); aoFechar(); }} />
          ))}
        </div>
        <label className="pl-cor-livre">Outra cor <input type="color" onChange={(ev) => aoEscolher(ev.target.value)} /></label>
      </div>
    </Janela>
  );
}

/* ---------- formatar células (Ctrl+1) ---------- */
export function JanelaFormato({ atual, exemplo, aoAplicar, aoFechar }) {
  const [cod, setCod] = useState(codigoPt(atual || 'General'));
  let previa = '', erro = '';
  try { previa = formatar(exemplo == null ? 1234.5 : exemplo, codigoDePt(cod)).t; } catch { erro = 'Código de formato inválido.'; }
  return (
    <Janela titulo="Formato de número" aoFechar={aoFechar} rodape={(
      <>
        <button type="button" className="btn" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn primary" disabled={!!erro} onClick={() => { aoAplicar(codigoDePt(cod)); aoFechar(); }}>Aplicar</button>
      </>
    )}>
      <div className="janela-c pl-jform">
        <div className="pl-jform-l" role="listbox" aria-label="Formatos">
          {FORMATOS.map((f) => (
            <button key={f.id} type="button" role="option" aria-selected={codigoDePt(cod) === f.cod} className={codigoDePt(cod) === f.cod ? 'on' : ''} onClick={() => setCod(codigoPt(f.cod))}>{f.nome}</button>
          ))}
        </div>
        <div className="pl-jform-d">
          <label className="campo">Código (o mesmo do Excel)<input value={cod} onChange={(ev) => setCod(ev.target.value)} spellCheck={false} /></label>
          <div className="pl-jform-p">Exemplo: <b>{erro || previa || '(vazio)'}</b></div>
          <p className="qd-dica">0 = dígito obrigatório · # = dígito se houver · . separa os milhares · , separa as casas · dd/mm/aaaa = data · "texto" entre aspas aparece igual.</p>
        </div>
      </div>
    </Janela>
  );
}

/* ---------- fonte ---------- */
const FONTES = ['', 'Calibri', 'Arial', 'Times New Roman', 'Verdana', 'Courier New'];
export function JanelaFonte({ estilo, aoAplicar, aoFechar }) {
  const [fonte, setFonte] = useState(estilo.fonte || '');
  const [tam, setTam] = useState(estilo.tam || 11);
  return (
    <Janela titulo="Fonte" aoFechar={aoFechar} rodape={(
      <>
        <button type="button" className="btn" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn primary" onClick={() => { aoAplicar({ fonte: fonte || undefined, tam: Number(tam) === 11 ? undefined : Number(tam) }); aoFechar(); }}>Aplicar</button>
      </>
    )}>
      <div className="janela-c">
        <label className="campo">Fonte
          <select value={fonte} onChange={(ev) => setFonte(ev.target.value)}>
            {FONTES.map((f) => <option key={f} value={f}>{f || 'Padrão do app'}</option>)}
          </select>
        </label>
        <label className="campo">Tamanho
          <select value={tam} onChange={(ev) => setTam(ev.target.value)}>
            {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      </div>
    </Janela>
  );
}

/* ---------- congelar painéis ---------- */
export function JanelaCongelar({ ativa, cong, aoEscolher, aoFechar }) {
  const op = (nome, desc, v) => (
    <button type="button" className="pl-opcao" onClick={() => { aoEscolher(v); aoFechar(); }}><b>{nome}</b><span>{desc}</span></button>
  );
  return (
    <Janela titulo="Congelar painéis" aoFechar={aoFechar}>
      <div className="janela-c pl-opcoes">
        {op('Congelar até a célula ativa', `Linhas acima de ${ativa.l + 1} e colunas antes de ${letraCol(ativa.c)} ficam paradas.`, { l: ativa.l, c: ativa.c })}
        {op('Congelar a linha de cima', 'O cabeçalho fica parado ao rolar (o mais usado em checklist).', { l: 1, c: 0 })}
        {op('Congelar a primeira coluna', 'A coluna A fica parada ao rolar para o lado.', { l: 0, c: 1 })}
        {cong && (cong.l || cong.c) ? op('Descongelar', 'Tudo volta a rolar.', null) : null}
      </div>
    </Janela>
  );
}

/* ---------- inserir função (lista por categoria, com busca) ---------- */
export function JanelaFuncoes({ aoEscolher, aoFechar }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const sem = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  /* busca pelo começo das palavras (contar acha CONT.SE e "conta"; procurar acha PROCV e "procura") */
  const bate = (f) => {
    if (!q) return true;
    const alvo = sem(f.pt + ' ' + f.en + ' ' + f.desc + ' ' + f.args.map((a) => a.n).join(' ')).split(/[^a-z0-9]+/);
    return sem(q).split(/\s+/).filter(Boolean).every((w) => { const raiz = w.length > 5 ? w.slice(0, w.length - 2) : w.slice(0, 4); return alvo.some((x) => x.startsWith(raiz)); });
  };
  const lista = useMemo(() => FUNCOES.filter((f) => (!cat || f.cat === cat) && bate(f)), [q, cat]); // eslint-disable-line react-hooks/exhaustive-deps
  const [sel, setSel] = useState(null);
  const f = sel || lista[0];
  return (
    <Janela titulo="Inserir função" aoFechar={aoFechar} classe="pl-jfun" rodape={(
      <>
        <button type="button" className="btn" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn primary" disabled={!f} onClick={() => { aoEscolher(f); aoFechar(); }}>Usar {f ? f.pt : ''}</button>
      </>
    )}>
      <div className="janela-c">
        <input className="pl-jfun-q" placeholder="O que você quer fazer? Ex.: somar, contar, procurar, data" value={q} onChange={(ev) => { setQ(ev.target.value); setSel(null); }} aria-label="Procurar função" />
        <div className="chips">
          <button type="button" className={'chipb' + (!cat ? ' on' : '')} onClick={() => setCat('')}>Todas</button>
          {Object.entries(CATEGORIAS).map(([k, n]) => <button key={k} type="button" className={'chipb' + (cat === k ? ' on' : '')} onClick={() => { setCat(k); setSel(null); }}>{n}</button>)}
        </div>
        <div className="pl-jfun-g">
          <ul className="pl-jfun-l" role="listbox" aria-label="Funções">
            {lista.map((x) => (
              <li key={x.en}><button type="button" className={f === x ? 'on' : ''} onClick={() => setSel(x)} onDoubleClick={() => { aoEscolher(x); aoFechar(); }}>{x.pt}</button></li>
            ))}
            {!lista.length && <li className="nada">Nenhuma função com "{q}".</li>}
          </ul>
          {f && (
            <div className="pl-jfun-d">
              <h4>{f.pt}<small>{f.en !== f.pt ? ` · no Excel em inglês: ${f.en}` : ''}</small></h4>
              <p>{f.desc}</p>
              <code>{f.pt}({f.args.map((a) => (a.opc ? `[${a.n}]` : a.n)).join('; ')}{f.args.some((a) => a.rep) ? '; ...' : ''})</code>
              <dl>{f.args.map((a) => <div key={a.n}><dt>{a.n}{a.opc ? ' (opcional)' : ''}</dt><dd>{a.d}</dd></div>)}</dl>
              <p>Exemplo: <code>{f.ex}</code></p>
              {f.v === '21' && <p className="qd-dica">Esta função só existe no Excel 365 e 2021 (o da empresa).</p>}
            </div>
          )}
        </div>
      </div>
    </Janela>
  );
}

/* ---------- nomes (PL16) ---------- */
export function JanelaNomes({ c, aoIr, aoRenomear, aoExcluir, aoNovo, aoFechar, aoMudar, somenteLeitura }) {
  const lista = Object.values(c.nomes || {}).sort((a, b) => a.n.localeCompare(b.n));
  return (
    <Janela titulo="Nomes da planilha" aoFechar={aoFechar} rodape={!somenteLeitura && <button type="button" className="btn primary" onClick={() => { aoFechar(); aoNovo(); }}><Icone n="plus" />Dar nome à seleção</button>}>
      <div className="janela-c">
        {lista.length ? (
          <table className="pl-tab-nomes">
            <thead><tr><th>Nome</th><th>Aponta para</th><th /></tr></thead>
            <tbody>
              {lista.map((n) => (
                <tr key={n.n}>
                  <td><b>{n.n}</b></td>
                  <td><button type="button" className="lnk" onClick={() => { aoIr(n); aoFechar(); }}>{paraMostrar(n.ref)}</button></td>
                  <td className="acoes">
                    {!somenteLeitura && aoMudar && <button type="button" className="iconbtn" title="Mudar o valor ou para onde aponta (todas as fórmulas acompanham)" aria-label={'Mudar ' + n.n} onClick={() => aoMudar(n)}><Icone n="formatar" /></button>}
                    {!somenteLeitura && <button type="button" className="iconbtn" title="Renomear (troca em todas as fórmulas)" aria-label={'Renomear ' + n.n} onClick={() => aoRenomear(n)}><Icone n="renomear" /></button>}
                    {!somenteLeitura && <button type="button" className="iconbtn" title="Excluir o nome" aria-label={'Excluir ' + n.n} onClick={() => aoExcluir(n)}><Icone n="lixeira" /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p>Nenhum nome ainda. Selecione uma célula (ex.: a meta do cloro), toque em "Dar nome" e escreva, por exemplo, Meta_Cloro. Depois use =SE(B2&gt;=Meta_Cloro;...).</p>}
      </div>
    </Janela>
  );
}

/* ---------- de onde vem / quem usa (PL14) ---------- */
export function JanelaOrigem({ titulo, de, para, aoIr, aoFechar, aoFluxo, nomeCel }) {
  const linha = (x, i) => (
    <li key={i}><button type="button" className="lnk" onClick={() => { aoIr(x); aoFechar(); }}>{x.rotulo}</button>{x.detalhe && <span>{x.detalhe}</span>}</li>
  );
  return (
    <Janela titulo={titulo} aoFechar={aoFechar}>
      <div className="janela-c pl-origem">
        <h4>De onde vem <small>(o que a conta de {nomeCel} usa)</small></h4>
        {de.length ? <ul>{de.map(linha)}</ul> : <p>Esta célula não tem fórmula.</p>}
        <h4>Quem usa esta célula <small>(fórmulas de qualquer aba que dependem de {nomeCel})</small></h4>
        {para.length ? <ul>{para.map(linha)}</ul> : <p>Nenhuma fórmula usa esta célula. Dá para apagar sem quebrar conta.</p>}
        <p className="qd-dica">Alt+← volta para onde você estava.</p>
        {aoFluxo && (de.length > 0 || para.length > 0) && <button type="button" className="btn sm" onClick={aoFluxo}><Icone n="fluxoConta" />Desenhar a conta</button>}
      </div>
    </Janela>
  );
}

/* ---------- localizar e substituir ---------- */
export function JanelaLocalizar({ aoAchar, aoSubstituir, aoFechar, somenteLeitura }) {
  const [q, setQ] = useState('');
  const [novo, setNovo] = useState('');
  const [msg, setMsg] = useState('');
  return (
    <Janela titulo="Localizar e substituir" aoFechar={aoFechar}>
      <div className="janela-c">
        <label className="campo">Procurar<input value={q} onChange={(ev) => setQ(ev.target.value)} onKeyDown={(ev) => { if (ev.key === 'Enter' && q) setMsg(aoAchar(q)); }} /></label>
        {!somenteLeitura && <label className="campo">Trocar por<input value={novo} onChange={(ev) => setNovo(ev.target.value)} /></label>}
        <div className="chips">
          <button type="button" className="btn sm primary" disabled={!q} onClick={() => setMsg(aoAchar(q))}>Achar o próximo</button>
          {!somenteLeitura && <button type="button" className="btn sm" disabled={!q} onClick={() => setMsg(aoSubstituir(q, novo))}>Trocar todos</button>}
        </div>
        {msg && <p role="status">{msg}</p>}
      </div>
    </Janela>
  );
}

/* ---------- barra de símbolos do celular (PL19) ---------- */
export const SIMBOLOS = ['=', ';', '(', ')', ':', '$', '"', '<', '>', '&'];
export function BarraSimbolos({ aoInserir, funcoes }) {
  return (
    <div className="pl-simbolos" role="toolbar" aria-label="Símbolos da fórmula" onPointerDown={(ev) => ev.preventDefault()}>
      {SIMBOLOS.map((s) => <button key={s} type="button" onClick={() => aoInserir(s)}>{s}</button>)}
      {funcoes.map((f) => <button key={f} type="button" className="fn" onClick={() => aoInserir(f + '(')}>{f}</button>)}
    </div>
  );
}

/** Código com zero na frente (001): o número perde o zero. Pergunta se é para guardar como texto (estoque, lotes, amostras). */
/** Conta que deu número pequeno numa célula formatada como data (aparece como 31/12/1899). */
export function JanelaNumeroData({ valor, mostra, aoEscolher, aoFechar }) {
  return (
    <Janela titulo="A célula está como data" aoFechar={aoFechar} classe="pl-jzeros" rodape={(
      <>
        <button type="button" className="btn" onClick={aoFechar}>Cancelar</button>
        <span className="sp" />
        <button type="button" className="btn" onClick={() => aoEscolher('d')}>Deixar como data</button>
        <button type="button" className="btn primary" onClick={() => aoEscolher('n')}><Icone n="check" />Mostrar como número</button>
      </>
    )}>
      <div className="janela-c">
        <p>Esta conta deu <b>{valor}</b>, mas a célula está formatada como data e mostraria <b>{mostra}</b>.</p>
        <p className="qd-dica">Para contas de contagem, soma ou divisão, o número é o mais claro.</p>
      </div>
    </Janela>
  );
}

export function JanelaZeros({ codigos, colunas, colar, aoEscolher, aoFechar }) {
  const [lembrar, setLembrar] = useState(true);
  const unicos = [...new Set(codigos)];
  const ex = unicos.slice(0, 3).join(', ') + (unicos.length > 3 ? '…' : '');
  const virando = unicos[0].replace(/^0+/, '') || '0';
  const letras = colunas.map(letraCol);
  const ondeLembrar = letras.length === 1 ? `a coluna ${letras[0]}` : `as colunas ${letras.join(', ')}`;
  return (
    <Janela titulo="Código com zero na frente" aoFechar={aoFechar} classe="pl-jzeros" rodape={(
      <>
        <button type="button" className="btn" onClick={aoFechar}>Cancelar</button>
        <span className="sp" />
        <button type="button" className="btn" onClick={() => aoEscolher('n', lembrar)}>Virar número</button>
        <button type="button" className="btn primary" onClick={() => aoEscolher('t', lembrar)}><Icone n="check" />Manter como texto</button>
      </>
    )}>
      <div className="janela-c">
        <p>{colar
          ? <>Na colagem há {codigos.length} {codigos.length === 1 ? 'código que começa' : 'códigos que começam'} com zero ({ex}). Como número, o zero some.</>
          : <>O código <b>{unicos[0]}</b> começa com zero. Como número, vira <b>{virando}</b> e o zero some.</>}</p>
        <p className="qd-dica">Para estoque e para códigos de lote ou de amostra, o texto é o mais seguro: o código fica do jeito que você escreveu.</p>
        <label className="chave"><input type="checkbox" checked={lembrar} onChange={(ev) => setLembrar(ev.target.checked)} />Lembrar a escolha para {ondeLembrar}</label>
      </div>
    </Janela>
  );
}
