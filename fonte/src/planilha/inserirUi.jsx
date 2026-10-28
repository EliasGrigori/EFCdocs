/* EFCdocs — Planilha (v0.6.3): janelas de Tabela, Coluna de status, Link, Botão de aba e Imagem (estilo Camadas). */
import { useMemo, useState } from 'react';
import { Icone, Janela } from '../ui/comum.jsx';
import { ESTILOS_TABELA, MODELOS_STATUS, TONS, MAX_STATUS, descreverLink } from './inserir.js';

/* ---------- Tabela ---------- */
export function JanelaTabela({ subtitulo, nomeInicial, cabecalho0, aoAplicar, aoFechar }) {
  const [nome, setNome] = useState(nomeInicial);
  const [estilo, setEstilo] = useState('azul');
  const [cab, setCab] = useState(cabecalho0);
  const [listras, setListras] = useState(true);
  const [filtro, setFiltro] = useState(true);
  const [erro, setErro] = useState('');
  const est = ESTILOS_TABELA.find((e) => e.id === estilo);
  const aplicar = () => { const e = aoAplicar({ nome: nome.trim(), estilo, cabecalho: cab, listras, filtro: filtro && cab }); if (e) setErro(e); };
  return (
    <Janela titulo="Formatar como tabela" icone="tabela" subtitulo={subtitulo} aoFechar={aoFechar} classe="pl-jdados pl-jtab" rodape={(
      <>
        <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn sm primary" data-tab-ok onClick={aplicar}>Criar tabela</button>
      </>
    )}>
      <div className="janela-c rg-corpo">
        <section className="rg-cartao">
          <span className="rg-cab">Estilo</span>
          <div className="tb-estilos" role="group" aria-label="Estilo da tabela">
            {ESTILOS_TABELA.map((e) => (
              <button key={e.id} type="button" className="tb-estilo" aria-pressed={estilo === e.id} data-tab-estilo={e.id} title={e.nome} onClick={() => setEstilo(e.id)}>
                <i style={{ background: e.cab }} /><i style={{ background: e.faixa }} /><b>{e.nome}</b>
              </button>
            ))}
          </div>
          <div className="tb-previa" aria-hidden="true">
            {[0, 1, 2, 3].map((l) => (
              <div key={l} className="tb-lin" style={{ background: l === 0 && cab ? est.cab : listras && l % 2 === (cab ? 0 : 1) ? est.faixa : 'transparent', color: l === 0 && cab ? est.letra : undefined, fontWeight: l === 0 && cab ? 700 : 400 }}>
                <span>{l === 0 && cab ? 'Nome' : 'Item ' + l}</span><span>{l === 0 && cab ? 'Valor' : l * 10}</span><span>{l === 0 && cab ? 'Status' : 'OK'}</span>
              </div>
            ))}
          </div>
        </section>
        <label className="rg-campo"><span>Nome</span><input value={nome} maxLength={60} data-tab-nome spellCheck={false} onChange={(ev) => { setNome(ev.target.value); setErro(''); }} /></label>
        <label className="dd-cab"><input type="checkbox" checked={cab} onChange={(ev) => setCab(ev.target.checked)} /><span>A primeira linha tem os títulos das colunas</span></label>
        <label className="dd-cab"><input type="checkbox" checked={listras} onChange={(ev) => setListras(ev.target.checked)} /><span>Linhas alternadas com cor</span></label>
        <label className="dd-cab"><input type="checkbox" checked={filtro && cab} disabled={!cab} onChange={(ev) => setFiltro(ev.target.checked)} /><span>Setas de filtro nos títulos</span></label>
        <p className="dd-dica">O formato fica nas células (linhas novas embaixo não ganham a cor sozinhas). Dá para usar o nome em listas suspensas, como Tabela1[Coluna]. Dá para desfazer.</p>
        {erro && <p className="rg-erro" role="alert">{erro}</p>}
      </div>
    </Janela>
  );
}

/* ---------- Coluna de status ---------- */
export function JanelaStatus({ subtitulo, fx0, aoAplicar, aoFechar }) {
  const [fx, setFx] = useState(fx0);
  const [modelo, setModelo] = useState(MODELOS_STATUS[0].id);
  const [itens, setItens] = useState(() => MODELOS_STATUS[0].itens.map((x) => [...x]));
  const [erro, setErro] = useState('');
  const escolherModelo = (id) => { setModelo(id); const m = MODELOS_STATUS.find((x) => x.id === id); if (m) setItens(m.itens.map((x) => [...x])); };
  const muda = (i, k, v) => { setModelo('meu'); setItens((l) => l.map((x, j) => (j === i ? (k === 0 ? [v, x[1]] : [x[0], v]) : x))); };
  const aplicar = () => { const e = aoAplicar({ fx: fx.trim(), itens }); if (e) setErro(e); };
  return (
    <Janela titulo="Coluna de status" icone="status" subtitulo={subtitulo} aoFechar={aoFechar} classe="pl-jdados pl-jstatus" rodape={(
      <>
        <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn sm primary" data-st-ok onClick={aplicar}>Criar coluna de status</button>
      </>
    )}>
      <div className="janela-c rg-corpo">
        <label className="rg-campo"><span>Vale em</span><input value={fx} data-st-fx spellCheck={false} placeholder="D2:D41" onChange={(ev) => { setFx(ev.target.value); setErro(''); }} /></label>
        <section className="rg-cartao">
          <span className="rg-cab">Opções</span>
          <div className="st-modelos" role="group" aria-label="Modelos">
            {MODELOS_STATUS.map((m) => <button key={m.id} type="button" className={'chipb' + (modelo === m.id ? ' on' : '')} data-st-modelo={m.id} onClick={() => escolherModelo(m.id)}>{m.nome}</button>)}
            {modelo === 'meu' && <span className="chipb on">Minhas opções</span>}
          </div>
          {itens.map((it, i) => (
            <div key={i} className="st-linha" data-st-item={i}>
              <input value={it[0]} maxLength={30} aria-label={'Opção ' + (i + 1)} spellCheck={false} onChange={(ev) => muda(i, 0, ev.target.value)} />
              <span className="st-tons" role="group" aria-label="Cor">
                {Object.entries(TONS).map(([k, t]) => <button key={k} type="button" className="st-tom" aria-pressed={it[1] === k} title={t.nome} aria-label={t.nome} data-st-tom={k} style={{ background: t.fundo, borderColor: t.cor }} onClick={() => muda(i, 1, k)} />)}
              </span>
              <button type="button" className="iconbtn" aria-label="Tirar esta opção" title="Tirar esta opção" disabled={itens.length <= 2} onClick={() => { setModelo('meu'); setItens((l) => l.filter((_, j) => j !== i)); }}><Icone n="x" /></button>
            </div>
          ))}
          {itens.length < MAX_STATUS && <button type="button" className="btn sm dd-mais" data-st-mais onClick={() => { setModelo('meu'); setItens((l) => [...l, ['', 'cinza']]); }}><Icone n="plus" />Outra opção</button>}
          <div className="st-previa" aria-hidden="true">
            {itens.filter((x) => x[0].trim()).map((x, i) => <span key={i} style={{ background: TONS[x[1]].fundo, color: TONS[x[1]].cor }}>{x[0]}</span>)}
          </div>
        </section>
        <p className="dd-dica">Cada célula ganha uma lista para escolher e muda de cor conforme a opção. Dá para mudar tudo depois em Dados &gt; Validação e em Formatação condicional.</p>
        {erro && <p className="rg-erro" role="alert">{erro}</p>}
      </div>
    </Janela>
  );
}

/* ---------- Link ---------- */
export function JanelaLink({ c, celula, atual, texto0, abaAtualId, aoSalvar, aoRemover, aoFechar }) {
  const tipo0 = atual ? (atual.t === 'a' ? 'a' : /^mailto:/i.test(atual.u || '') ? 'e' : 'u') : 'u';
  const [tipo, setTipo] = useState(tipo0);
  const [u, setU] = useState(atual && atual.t === 'u' ? String(atual.u).replace(/^mailto:/i, '') : '');
  const [aba, setAba] = useState(atual && atual.t === 'a' ? atual.a : abaAtualId);
  const [ref, setRef] = useState(atual && atual.t === 'a' ? atual.r : 'A1');
  const [texto, setTexto] = useState(texto0 || '');
  const [erro, setErro] = useState('');
  const abas = c.ordem.filter((id) => !c.abas[id].oculta || id === aba);
  const salvar = () => { const e = aoSalvar({ tipo, campos: { u, a: aba, r: ref }, texto }); if (e) setErro(e); };
  return (
    <Janela titulo="Link" icone="link" subtitulo={`Na célula ${celula}`} aoFechar={aoFechar} classe="pl-jdados" rodape={(
      <>
        {atual && <button type="button" className="btn sm perigo iconbtn" data-lk-tirar aria-label="Tirar o link" title="Tirar o link (o texto fica)" onClick={aoRemover}><Icone n="lixeira" /></button>}
        <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn sm primary" data-lk-ok onClick={salvar}>OK</button>
      </>
    )}>
      <div className="janela-c rg-corpo">
        <section className="rg-cartao">
          <span className="rg-cab">Para onde leva</span>
          <span className="rg-seg" role="group" aria-label="Tipo de link">
            <button type="button" aria-pressed={tipo === 'u'} data-lk-tipo="u" onClick={() => { setTipo('u'); setErro(''); }}>Internet</button>
            <button type="button" aria-pressed={tipo === 'e'} data-lk-tipo="e" onClick={() => { setTipo('e'); setErro(''); }}>E-mail</button>
            <button type="button" aria-pressed={tipo === 'a'} data-lk-tipo="a" onClick={() => { setTipo('a'); setErro(''); }}>Esta planilha</button>
          </span>
          {tipo !== 'a' && <label className="rg-campo"><span>{tipo === 'e' ? 'E-mail' : 'Endereço'}</span><input value={u} data-lk-u spellCheck={false} data-foco placeholder={tipo === 'e' ? 'nome@empresa.com.br' : 'www.exemplo.com.br'} onChange={(ev) => { setU(ev.target.value); setErro(''); }} /></label>}
          {tipo === 'a' && (
            <>
              <label className="rg-campo"><span>Aba</span><select value={aba} data-lk-aba onChange={(ev) => setAba(ev.target.value)}>{abas.map((id) => <option key={id} value={id}>{c.abas[id].nome}</option>)}</select></label>
              <label className="rg-campo"><span>Célula</span><input value={ref} data-lk-ref spellCheck={false} maxLength={12} onChange={(ev) => { setRef(ev.target.value); setErro(''); }} /></label>
            </>
          )}
        </section>
        <label className="rg-campo"><span>Texto na célula</span><input value={texto} data-lk-texto placeholder={atual ? '' : 'se ficar vazio, mostra o endereço'} onChange={(ev) => setTexto(ev.target.value)} /></label>
        {atual && <p className="dd-dica">Hoje leva para: {descreverLink(atual, c)}.</p>}
        {erro && <p className="rg-erro" role="alert">{erro}</p>}
      </div>
    </Janela>
  );
}

/* ---------- Botão que leva a outra aba ---------- */
export const CORES_BOTAO = ['#1f6f8b', '#2e6b4f', '#b45f06', '#8e4ec6', '#c0392b', '#404040'];
export function JanelaBotao({ c, atual, abaAtualId, aoSalvar, aoExcluir, aoFechar }) {
  const abas = c.ordem.filter((id) => id !== abaAtualId || (atual && atual.alvo === id) || c.ordem.length === 1);
  const alvoInicial = atual && c.abas[atual.alvo] ? atual.alvo : (abas.find((id) => id !== abaAtualId) || abaAtualId);
  const [nome, setNome] = useState(atual ? atual.nome : '');
  const [alvo, setAlvo] = useState(alvoInicial);
  const [ref, setRef] = useState(atual && atual.ref ? atual.ref : '');
  const [cor, setCor] = useState(atual && atual.cor ? atual.cor : CORES_BOTAO[0]);
  const [erro, setErro] = useState('');
  const padrao = c.abas[alvo] ? 'Ir para ' + c.abas[alvo].nome : 'Ir para a aba';
  const salvar = () => { const e = aoSalvar({ nome: nome.trim() || padrao, alvo, ref: ref.trim(), cor }); if (e) setErro(e); };
  return (
    <Janela titulo="Botão que leva a outra aba" icone="botao" subtitulo={atual ? 'Mudar o botão' : 'Um clique e a pessoa vai para lá'} aoFechar={aoFechar} classe="pl-jdados" rodape={(
      <>
        {atual && <button type="button" className="btn sm perigo iconbtn" data-bt-excluir aria-label="Excluir o botão" title="Excluir o botão" onClick={aoExcluir}><Icone n="lixeira" /></button>}
        <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn sm primary" data-bt-ok onClick={salvar}>OK</button>
      </>
    )}>
      <div className="janela-c rg-corpo">
        <label className="rg-campo"><span>Texto do botão</span><input value={nome} data-bt-nome data-foco maxLength={60} placeholder={padrao} onChange={(ev) => setNome(ev.target.value)} /></label>
        <label className="rg-campo"><span>Leva para a aba</span><select value={alvo} data-bt-alvo onChange={(ev) => { setAlvo(ev.target.value); setErro(''); }}>{abas.map((id) => <option key={id} value={id}>{c.abas[id].nome}</option>)}</select></label>
        <label className="rg-campo"><span>Na célula (opcional)</span><input value={ref} data-bt-ref maxLength={12} spellCheck={false} placeholder="A1" onChange={(ev) => { setRef(ev.target.value); setErro(''); }} /></label>
        <div className="rg-campo"><span>Cor</span>
          <span className="st-tons" role="group" aria-label="Cor do botão">
            {CORES_BOTAO.map((h) => <button key={h} type="button" className="st-tom" aria-pressed={cor === h} aria-label={'Cor ' + h} data-bt-cor={h} style={{ background: h, borderColor: h }} onClick={() => setCor(h)} />)}
          </span>
        </div>
        <p className="dd-dica">Clique no botão para ir. Para mover ou mudar: arraste, ou segure o dedo (no celular) ou use Ctrl + clique, e depois Enter. Ao salvar como Excel, o botão vai como forma com link: lá também um clique leva à aba.</p>
        {erro && <p className="rg-erro" role="alert">{erro}</p>}
      </div>
    </Janela>
  );
}

/* ---------- Imagem ---------- */
export function JanelaImagem({ atual, aoSalvar, aoTrocar, aoExcluir, aoFechar }) {
  const [nome, setNome] = useState(atual.nome || '');
  const [w, setW] = useState(Math.round(atual.w));
  const razao = useMemo(() => atual.h / atual.w, [atual]);
  return (
    <Janela titulo="Imagem" icone="imagem" subtitulo="Tamanho e texto alternativo" aoFechar={aoFechar} classe="pl-jdados" rodape={(
      <>
        <button type="button" className="btn sm perigo iconbtn" data-im-excluir aria-label="Excluir a imagem" title="Excluir a imagem" onClick={aoExcluir}><Icone n="lixeira" /></button>
        <button type="button" className="btn sm" data-im-trocar onClick={aoTrocar}>Trocar imagem</button>
        <button type="button" className="btn sm primary" data-im-ok onClick={() => aoSalvar({ nome: nome.trim(), w: Math.max(24, Math.min(4000, +w || atual.w)), h: Math.max(24, Math.round((Math.max(24, Math.min(4000, +w || atual.w))) * razao)) })}>OK</button>
      </>
    )}>
      <div className="janela-c rg-corpo">
        <div className="im-previa"><img src={atual.src} alt={nome} /></div>
        <label className="rg-campo"><span>Largura (px)</span><input type="number" min={24} max={4000} value={w} data-im-w onChange={(ev) => setW(ev.target.value)} /></label>
        <p className="dd-dica">A altura acompanha a largura ({Math.round((+w || atual.w) * razao)} px), para a imagem não ficar esticada.</p>
        <label className="rg-campo"><span>Texto alternativo</span><input value={nome} data-im-nome maxLength={200} placeholder="o que a imagem mostra" onChange={(ev) => setNome(ev.target.value)} /></label>
      </div>
    </Janela>
  );
}
