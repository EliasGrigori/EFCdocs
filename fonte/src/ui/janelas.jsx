/* EFCdocs — busca "O que você quer fazer?", Opções e painel lateral do arquivo. */
import { useEffect, useMemo, useState } from 'react';
import { buscarComandos, chegaNa, PorId } from '../nucleo/comandos.js';
import { TEMAS, AMOSTRAS, ROTULOS } from '../nucleo/prefs.js';
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
                  <Icone n={c.ic} /><span>{c.nome}</span><span className="dir">{c.editor ? c.dir : chega ? 'chega na ' + chega : c.atalho || ''}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : <div className="nada">Nada encontrado para "{q}". Tente outra palavra (ex.: apagar, seta, tema).</div>}
    </Janela>
  );
}

export function Opcoes({ prefs, setPref, cx, aoFechar, demo, versao, espaco }) {
  const nomesFaixa = prefs.layout === 'B' ? ROTULOS.faixaB : ROTULOS.faixa;
  const chips = (chave, valores, nomes) => (
    <div className="chips">
      {valores.map((v) => (
        <button key={v} type="button" className={'chipb' + (prefs[chave] === v ? ' on' : '')} aria-pressed={prefs[chave] === v} onClick={() => setPref(chave, v)}>{nomes[v]}</button>
      ))}
    </div>
  );
  return (
    <Janela titulo="Opções" aoFechar={aoFechar} classe="opcoes">
      <div className="janela-c">
        <div className="op-g">
          <h3>Tema</h3>
          <div className="temas">
            {TEMAS.map(([id, nome]) => (
              <button key={id} type="button" className={'tema-b' + (prefs.tema === id ? ' on' : '')} aria-pressed={prefs.tema === id} data-tema={id} onClick={() => setPref('tema', id)}>
                <i style={{ background: `linear-gradient(135deg, ${AMOSTRAS[id][0]} 50%, ${AMOSTRAS[id][1]} 50%)` }} />{nome}
              </button>
            ))}
          </div>
          <label className="chave"><input type="checkbox" checked={prefs.relevo} onChange={(ev) => setPref('relevo', ev.target.checked)} />Relevo nas barras (menu, topo, faixa e rodapé)</label>
        </div>
        <div className="op-g"><h3>Layout</h3>{chips('layout', ['A', 'B'], ROTULOS.layout)}</div>
        <div className="op-g">
          <h3>{prefs.layout === 'B' ? 'Barra curta' : 'Faixa'}</h3>
          {chips('faixa', ['tudo', 'abas', 'oculta'], nomesFaixa)}
          <p>Atalho: Ctrl+F1 alterna entre mostrar tudo e só as abas.</p>
        </div>
        <div className="op-g">
          <h3>Menu lateral</h3>
          {chips('menu', ['completo', 'icones', 'oculto'], ROTULOS.menu)}
          <p>No celular, os módulos ficam na barra de baixo e o resto no botão de três linhas.</p>
        </div>
        <div className="op-g">
          <h3>Painel lateral</h3>
          <label className="chave"><input type="checkbox" checked={prefs.painel} onChange={(ev) => setPref('painel', ev.target.checked)} />Mostrar o painel de detalhes ao abrir um arquivo</label>
        </div>
        <div className="op-g">
          <h3>Perfil de teste</h3>
          <div className="chips">
            {Object.entries(PERFIS).map(([id, p]) => (
              <button key={id} type="button" className={'chipb' + (prefs.perfil === id ? ' on' : '')} aria-pressed={prefs.perfil === id} onClick={() => setPref('perfil', id)}>{p.nome} ({p.cadastro})</button>
            ))}
          </div>
          <p>Só para testar o que cada perfil pode fazer. O perfil de verdade vem do cadastro do EFClaudian quando o login chegar (v0.9.0).</p>
        </div>
        <div className="op-g">
          <h3>Sobre</h3>
          <p>EFCdocs {versao} · {demo ? 'modo demonstração (até 3 arquivos, banco separado)' : 'neste aparelho'}{espaco ? ` · espaço usado pelo app: ${espaco}` : ''}</p>
          {cx.instalar && <button type="button" className="btn sm" onClick={cx.instalar}><Icone n="instalar" />Instalar o EFCdocs</button>}
        </div>
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
          <dt>Revisão</dt><dd>Rev. {String(f.rev).padStart(2, '0')}</dd>
          <dt>Criado</dt><dd>{cx.dataHora(f.criadoEm)}</dd>
          <dt>Alterado</dt><dd>{cx.dataHora(f.alteradoEm)}</dd>
          {tam && <><dt>No aparelho</dt><dd>{cx.tamanho(tam.bytesFinal)} {tam.fmt === 'gzip' ? `(compactado de ${cx.tamanho(tam.bytesOriginal)})` : ''}</dd></>}
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
              <button key={id} type="button" className="chipb" disabled={!!bloq} title={bloq || (chega ? `Chega na ${chega}` : c.nome)} onClick={() => cx.executar(id)}>
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
