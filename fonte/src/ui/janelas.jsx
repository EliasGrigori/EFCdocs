/* EFCdocs — busca "O que você quer fazer?", Opções e painel lateral do arquivo. */
import { useEffect, useMemo, useState } from 'react';
import { buscarComandos, chegaNa, PorId, textoChega } from '../nucleo/comandos.js';
import { TEMAS, AMOSTRAS, ROTULOS, ehTemaClaro, TEMAS_DESTAQUE } from '../nucleo/prefs.js';
import { PERFIS } from '../nucleo/perfis.js';
import { TIPOS } from '../nucleo/modelo.js';
import { Icone, Janela } from './comum.jsx';
import { ROTULO_CURTO } from './faixa.jsx';

export function Paleta({ mod, cx, aoFechar }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  /* além dos comandos, o editor aberto acha células, nomes, abas e títulos de coluna (PL14) */
  const montar = (texto) => {
    const doEditor = cx.buscarNoEditor ? cx.buscarNoEditor(texto).map((x) => ({ ...x, editor: true })) : [];
    return [...doEditor, ...buscarComandos(texto, mod, 9)].slice(0, 12);
  };
  const lista = useMemo(() => montar(q), [q, mod]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setSel(0); }, [q]);
  const rodar = (item) => { aoFechar(); setTimeout(() => (item.editor ? item.fazer() : cx.executar(item.id)), 0); };
  return (
    <Janela aoFechar={aoFechar} classe="paleta" rotulo="O que você quer fazer?">
      <div className="entrada">
        <Icone n="busca" />
        <input aria-label="O que você quer fazer?" placeholder={mod === 'planilha' ? 'O que você quer fazer? Ex.: B12, Meta_Cloro, cloro, congelar' : 'O que você quer fazer? Ex.: post-it, seta, kanban, tema escuro'} value={q}
          onChange={(ev) => setQ(ev.target.value)} role="combobox" aria-expanded="true" aria-controls="paleta-lista"
          aria-activedescendant={lista[sel] ? 'pl-' + sel : undefined}
          onKeyDown={(ev) => {
            if (ev.key === 'ArrowDown') { ev.preventDefault(); setSel((s) => Math.min(s + 1, lista.length - 1)); }
            if (ev.key === 'ArrowUp') { ev.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
            if (ev.key === 'Enter') {
              /* usa o texto do campo agora (quem digita rápido e dá Enter não perde o que digitou) */
              const l = ev.currentTarget.value === q ? lista : montar(ev.currentTarget.value);
              const item = l[ev.currentTarget.value === q ? sel : 0];
              if (item) rodar(item);
            }
          }} />
      </div>
      {lista.length ? (
        <ul id="paleta-lista" role="listbox">
          {lista.map((c, i) => {
            const chega = c.editor ? null : chegaNa(c, mod);
            return (
              <li key={c.id} role="option" id={'pl-' + i} aria-selected={i === sel}>
                <button type="button" className={i === sel ? 'sel' : ''} onMouseEnter={() => setSel(i)} onClick={() => rodar(c)} data-cmd={c.editor ? undefined : c.id}>
                  <Icone n={c.ic} /><span>{c.nome}</span><span className="dir">{c.editor ? c.dir : chega ? textoChega(chega) : c.atalho || ''}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : <div className="nada">Nada encontrado para "{q}". Tente outra palavra (ex.: apagar, seta, tema).</div>}
    </Janela>
  );
}

/* Opções em seções que abrem e fecham (sanfona). Cada cabeçalho mostra o que está escolhido;
   só abre o que a pessoa tocar. O que ficou aberto continua aberto na próxima vez. */
let secoesAbertas = {};

function Secao({ id, titulo, resumo, abertas, alternar, children }) {
  const aberta = !!abertas[id];
  return (
    <div className={'op-sec' + (aberta ? ' aberta' : '')} data-sec={id}>
      <button type="button" className="op-cab" aria-expanded={aberta} aria-controls={'op-' + id} onClick={() => alternar(id)}>
        <b>{titulo}</b><span className="res">{resumo}</span><Icone n="chevronBaixo" />
      </button>
      {aberta && <div className="op-corpo" id={'op-' + id}>{children}</div>}
    </div>
  );
}

export function Opcoes({ prefs, setPref, cx, aoFechar, demo, versao, espaco, abrir }) {
  const [abertas, setAbertas] = useState(() => (abrir && abrir !== true ? { ...secoesAbertas, [abrir]: true } : secoesAbertas));
  const [verTodos, setVerTodos] = useState(false);
  const alternar = (id) => setAbertas((a) => { const n = { ...a, [id]: !a[id] }; secoesAbertas = n; return n; });
  const nomesFaixa = prefs.layout === 'B' ? ROTULOS.faixaB : ROTULOS.faixa;
  const chips = (chave, valores, nomes) => (
    <div className="seg" role="group">
      {valores.map((v) => (
        <button key={v} type="button" className={'chipb' + (prefs[chave] === v ? ' on' : '')} aria-pressed={prefs[chave] === v} onClick={() => setPref(chave, v)}>{nomes[v]}</button>
      ))}
    </div>
  );
  const nomeTema = (TEMAS.find(([id]) => id === prefs.tema) || [null, prefs.tema])[1];
  const amostra = (id) => ({ background: `linear-gradient(135deg, ${AMOSTRAS[id][0]} 50%, ${AMOSTRAS[id][1]} 50%)` });
  return (
    <Janela titulo="Opções" icone="gear" aoFechar={aoFechar} classe="opcoes">
      <div className="janela-c">
        <Secao id="tema" titulo="Tema" abertas={abertas} alternar={alternar}
          resumo={<><i className="amostra" style={AMOSTRAS[prefs.tema] ? amostra(prefs.tema) : undefined} />{nomeTema}{prefs.relevo ? ' · relevo' : ''}{prefs.mesa ? ' · mesa' : ''}</>}>
          {[['Claros', true], ['Escuros', false]].map(([rotulo, claro]) => {
            const todos = TEMAS.filter(([id]) => ehTemaClaro(id) === claro);
            const vis = verTodos ? todos : todos.filter(([id]) => TEMAS_DESTAQUE.includes(id) || id === prefs.tema);
            return (
              <div key={rotulo} className="temas-grupo">
                <div className="temas-rot">{rotulo}</div>
                <div className="temas">
                  {vis.map(([id, nome]) => (
                    <button key={id} type="button" className={'tema-b' + (prefs.tema === id ? ' on' : '')} aria-pressed={prefs.tema === id} data-tema={id} title={nome} onClick={() => setPref('tema', id)}>
                      <i className="mini" style={{ '--tb': AMOSTRAS[id][0], '--ta': AMOSTRAS[id][1] }} aria-hidden="true" /><span>{nome}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <button type="button" className="btn sm ver-todos" data-ver-todos aria-expanded={verTodos} onClick={() => setVerTodos(!verTodos)}>{verTodos ? 'Mostrar só os principais' : `Ver todos os ${TEMAS.length} temas`}</button>
          <small className="op-dica">Papel (claro) é o tema de abertura: o dourado só marca onde você está. Os temas escuros continuam aqui.</small>
          <label className="chave"><input type="checkbox" checked={prefs.relevo} onChange={(ev) => setPref('relevo', ev.target.checked)} />Relevo nas barras</label>
          <small className="op-dica">Um brilho leve nas barras e nos botões, para parecerem peças de verdade.</small>
          <label className="chave"><input type="checkbox" checked={!!prefs.mesa} onChange={(ev) => setPref('mesa', ev.target.checked)} />Papel sobre a mesa (sombra nas barras e contorno nas laterais)</label>
          <small className="op-dica">A folha parece apoiada sobre a mesa: sombra embaixo das barras de cima e de baixo e contorno suave nas laterais.</small>
        </Secao>
        <Secao id="tela" titulo="Tela" abertas={abertas} alternar={alternar}
          resumo={`${{ A: 'Excel', B: 'Barra curta' }[prefs.layout]} · ${{ tudo: 'tudo', abas: 'abas', oculta: 'oculta' }[prefs.faixa]} · ${{ completo: 'completo', icones: 'ícones', oculto: 'oculto' }[prefs.menu]}`}>
          <div className="op-linha"><span>Layout</span>{chips('layout', ['A', 'B'], ROTULOS.layout)}</div>
          <small className="op-dica">Faixa tipo Excel: abas com botões grandes em cima. Barra curta: uma linha de ícones e o painel de detalhes ao lado.</small>
          <div className="op-linha"><span title="Ctrl+F1 alterna entre mostrar tudo e só as abas">{prefs.layout === 'B' ? 'Barra curta' : 'Faixa'}</span>{chips('faixa', ['tudo', 'abas', 'oculta'], nomesFaixa)}</div>
          <small className="op-dica">Quanto da faixa fica à mostra. "Só as abas" ganha espaço; um toque numa aba mostra a faixa por um momento.</small>
          <div className="op-linha"><span>Estilo da faixa</span>{chips('estilo', ['auto', 'B', 'C', 'D', 'E'], ROTULOS.estilo)}</div>
          <small className="op-dica">Automático usa B no computador e a Compacta (E) no celular. B: cartões e botão principal. C: linha fina. D: ícones em quadrinhos. E: só ícones.</small>
          <div className="op-linha"><span>Menu lateral</span>{chips('menu', ['completo', 'icones', 'oculto'], ROTULOS.menu)}</div>
          <small className="op-dica">O menu da esquerda com nomes, só com ícones ou escondido (uma setinha na borda traz de volta).</small>
          <div className="op-linha"><span>Barra de cima</span>{chips('topo', ['completo', 'compacto'], ROTULOS.topo)}</div>
          <small className="op-dica">Completa tem o título e a busca; "Só as abas" junta tudo na linha das abas para sobrar mais planilha.</small>
          <label className="chave"><input type="checkbox" checked={prefs.painel} onChange={(ev) => setPref('painel', ev.target.checked)} />Abrir o painel de detalhes junto com o arquivo</label>
          <small className="op-dica">O painel da direita mostra nome, datas, tamanho e ações do arquivo aberto.</small>
        </Secao>
        <Secao id="perfil" titulo="Perfil de teste" abertas={abertas} alternar={alternar} resumo={PERFIS[prefs.perfil].nome}>
          <div className="seg">
            {Object.entries(PERFIS).map(([id, pf]) => (
              <button key={id} type="button" className={'chipb' + (prefs.perfil === id ? ' on' : '')} aria-pressed={prefs.perfil === id} title={pf.cadastro} onClick={() => setPref('perfil', id)}>{pf.nome}</button>
            ))}
          </div>
          <p>Só para testar o que cada tipo de pessoa pode fazer. O perfil de verdade vem do login (v0.9.0).</p>
        </Secao>
        <Secao id="sobre" titulo="Sobre" abertas={abertas} alternar={alternar} resumo={`EFCdocs ${versao}`}>
          <p>{demo ? 'Modo demonstração (até 3 arquivos, banco separado).' : 'Tudo fica neste aparelho.'}{espaco ? ` Espaço usado: ${espaco}.` : ''}</p>
          {cx.instalar && <button type="button" className="btn sm" onClick={cx.instalar}><Icone n="instalar" />Instalar o EFCdocs</button>}
        </Secao>
      </div>
    </Janela>
  );
}

const SITUACAO = { rascunho: ['warn', 'Rascunho'] };

/** Painel lateral: detalhes do arquivo; o editor do quadro põe a seleção no topo (extra). */
export function Painel({ aberto, cx, fechar, extra }) {
  if (!aberto) return null;
  const f = aberto.arquivo.ficha;
  const tam = aberto.tamanho;
  const [cls, txt] = SITUACAO[f.status] || ['warn', 'Rascunho'];
  return (
    <aside className="side" aria-label="Painel lateral">
      <span className="alca" />
      <div className="side-h">
        <span>{extra ? 'Detalhes' : 'Detalhes do arquivo'}</span>
        <button type="button" className="iconbtn" aria-label="Fechar o painel" onClick={fechar}><Icone n="x" /></button>
      </div>
      {extra}
      <div className="side-s">
        <h4>Arquivo</h4>
        <dl>
          <dt>Nome</dt><dd>{f.nome}</dd>
          <dt>Tipo</dt><dd>{TIPOS[f.tipo].nome}</dd>
          <dt>Situação</dt><dd><span className={'selo ' + cls}>{txt}</span></dd>
          <dt>Versão do arquivo</dt><dd>{String(f.rev).padStart(2, '0')}</dd>
          <dt>Criado</dt><dd>{cx.dataHora(f.criadoEm)}</dd>
          <dt>Alterado</dt><dd>{cx.dataHora(f.alteradoEm)}</dd>
          {tam && <><dt>Tamanho</dt><dd>{cx.tamanho(tam.bytesFinal)} {tam.fmt === 'gzip' ? `(compactado de ${cx.tamanho(tam.bytesOriginal)})` : ''}</dd></>}
        </dl>
      </div>
      <div className="side-s">
        <h4>Ações</h4>
        <div className="chips">
          {['arquivo.renomear', 'arquivo.lixeira', 'arquivo.exportarPDF', f.tipo === 'postits' ? 'arquivo.exportarImagem' : null, 'arquivo.lancar'].filter(Boolean).map((id) => {
            const c = PorId[id];
            const chega = chegaNa(c, f.tipo);
            const bloq = cx.bloqueado(id);
            return (
              <button key={id} type="button" className="chipb" disabled={!!bloq} title={bloq || (chega ? textoChega(chega).replace(/^c/, 'C') : c.nome)} onClick={() => cx.executar(id)}>
                <Icone n={c.ic} />{ROTULO_CURTO[id] || c.nome}{chega ? ` · ${chega}` : ''}
              </button>
            );
          })}
        </div>
      </div>
      <div className="side-s">
        <h4>Exibir</h4>
        <div className="chips">
          {['exibir.layoutA', 'exibir.layoutB'].map((id) => (
            <button key={id} type="button" className={'chipb' + (cx.ligado(id) ? ' on' : '')} aria-pressed={cx.ligado(id)} onClick={() => cx.executar(id)}><Icone n={PorId[id].ic} />{ROTULO_CURTO[id]}</button>
          ))}
        </div>
        <div className="chips">
          {['exibir.faixaTudo', 'exibir.faixaAbas', 'exibir.faixaOculta'].map((id) => (
            <button key={id} type="button" className={'chipb' + (cx.ligado(id) ? ' on' : '')} aria-pressed={cx.ligado(id)} onClick={() => cx.executar(id)}><Icone n={PorId[id].ic} />{ROTULO_CURTO[id]}</button>
          ))}
        </div>
      </div>
      {TIPOS[f.tipo].chega && (
        <div className="side-s">
          <h4>O editor de {TIPOS[f.tipo].nome.toLowerCase()}</h4>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Chega na {TIPOS[f.tipo].chega}. Os botões com ponto amarelo mostram em que versão cada recurso entra.</p>
        </div>
      )}
    </aside>
  );
}
