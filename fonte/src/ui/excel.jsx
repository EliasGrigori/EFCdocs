/* EFCdocs — janelas do Excel: escolher o arquivo, acompanhar a leitura e o relatório do que veio e do que ficou de fora. */
import { useEffect, useRef, useState } from 'react';
import { Janela, Icone } from './comum.jsx';
import { lerArquivoExcel } from '../planilha/xlsx/abrir.js';

const n = (x) => Number(x || 0).toLocaleString('pt-BR');
const kb = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

/** Caixa do relatório: borda, faixa de título e cor própria (verde = veio, vermelho = ficou de fora, amarelo = bom saber, azul = nota). */
function Caixa({ tom, icone, titulo, qtd, children, dados }) {
  return (
    <section className={'rel-caixa ' + tom} {...dados}>
      <header><Icone n={icone} /><h3>{titulo}</h3>{qtd != null ? <span className="rel-qtd">{n(qtd)}</span> : null}</header>
      <div className="rel-corpo">{children}</div>
    </section>
  );
}
const Dest = ({ tom = 'amarelo', children }) => <mark className={'rel-dest ' + tom}>{children}</mark>;
const plural = (q, um, varios) => (q === 1 ? um : varios);

/** O relatório da importação (também abre depois, em Arquivo › O que veio do Excel). */
export function RelatorioExcel({ rel }) {
  if (!rel) return null;
  const abas = rel.abas || [];
  const ex = rel.extras || {};
  const cortes = abas.filter((a) => a.cortes && a.cortes.length);
  const fora = rel.fora || [];
  const avisos = rel.avisos || [];
  const bom = cortes.reduce((t, a) => t + a.cortes.length, 0) + avisos.length + (rel.semCalculo > 0 ? 1 : 0);
  const veio = [
    <><b>Valores e fórmulas</b>: cada fórmula começa com o <Dest tom="verde">último valor que o Excel calculou</Dest>.</>,
    <><b>Formatação</b>: fonte, negrito, cores, preenchimento, bordas, alinhamento e formato de número.</>,
    <><b>Layout</b>: larguras, alturas, linhas e colunas ocultas, células mescladas e congelar painéis.</>,
    <><b>Abas</b>: todas, com a cor e as ocultas, e os nomes definidos.</>,
  ];
  if (ex.validacoes > 0) veio.push(<><b>Listas suspensas e validação de dados</b>: <Dest tom="verde">{n(ex.validacoes)} {plural(ex.validacoes, 'regra', 'regras')}</Dest>{ex.listas > 0 ? <> ({n(ex.listas)} {plural(ex.listas, 'lista suspensa', 'listas suspensas')})</> : null}.</>);
  if (ex.condicionais > 0) veio.push(<><b>Cores por regra (formatação condicional)</b>: <Dest tom="verde">{n(ex.condicionais)} {plural(ex.condicionais, 'regra', 'regras')}</Dest>.</>);
  if (ex.notas > 0) veio.push(<><b>Comentários</b>: <Dest tom="verde">{n(ex.notas)} {plural(ex.notas, 'comentário', 'comentários')}</Dest>{ex.conversas > 0 ? <>, sendo {n(ex.conversas)} {plural(ex.conversas, 'conversa', 'conversas')} do Excel 365 (ao salvar, viram anotações comuns)</> : null}.</>);
  return (
    <div className="rel-excel">
      <div className="rel-nums">
        <div className="rel-num"><span>Abas</span><b>{n(abas.length)}</b></div>
        <div className="rel-num"><span>Células</span><b>{n(rel.celulas)}</b></div>
        <div className="rel-num azul"><span>Fórmulas</span><b>{n(rel.formulas)}</b></div>
        {rel.bytes ? <div className="rel-num"><span>Arquivo</span><b>{kb(rel.bytes)}</b></div> : null}
      </div>
      <Caixa tom="verde" icone="check" titulo="Veio" qtd={veio.length} dados={{ 'data-rel': 'veio' }}>
        <ul className="rel-lista">{veio.map((t, i) => <li key={i}>{t}</li>)}</ul>
      </Caixa>
      {fora.length > 0 && (
        <Caixa tom="vermelho" icone="aviso" titulo="Ficou de fora" qtd={fora.length} dados={{ 'data-rel': 'fora' }}>
          <ul className="rel-lista">
            {fora.map((f) => <li key={f.item}><Dest tom="vermelho">{f.item}{f.qtd > 1 ? ` (${n(f.qtd)})` : ''}</Dest>{f.detalhe ? <> {f.detalhe}</> : null}</li>)}
          </ul>
        </Caixa>
      )}
      {bom > 0 && (
        <Caixa tom="amarelo" icone="info" titulo="Bom saber" qtd={bom} dados={{ 'data-rel': 'bom' }}>
          <ul className="rel-lista">
            {cortes.map((a) => a.cortes.map((t, i) => <li key={a.nome + i}><Dest>{a.nome}</Dest> {t}.</li>))}
            {avisos.map((t) => <li key={t}>{t}</li>)}
            {rel.semCalculo > 0 && (
              <li>
                <Dest>{n(rel.semCalculo)} {rel.semCalculo === 1 ? 'fórmula mostra' : 'fórmulas mostram'} o último valor do Excel</Dest>: o EFCdocs ainda não calcula
                {rel.exemplosSemCalculo && rel.exemplosSemCalculo.length ? <> (por exemplo, <code>={rel.exemplosSemCalculo[0].f.replace(/\s+/g, ' ').slice(0, 70)}</code>: {rel.exemplosSemCalculo[0].motivo})</> : null}.
              </li>
            )}
          </ul>
        </Caixa>
      )}
      <details className="rel-abas">
        <summary>Aba por aba</summary>
        <table>
          <thead><tr><th>Aba</th><th>Células</th><th>Fórmulas</th></tr></thead>
          <tbody>{abas.map((a) => <tr key={a.nome}><td>{a.nome}</td><td>{n(a.celulas)}</td><td>{n(a.formulas)}</td></tr>)}</tbody>
        </table>
      </details>
      <div className="rel-nota"><Icone n="info" /><span>O arquivo original continua igual no seu computador. Para devolver ao Excel, use <b>Arquivo › Salvar como Excel</b>.</span></div>
    </div>
  );
}

/** Escolher o arquivo do Excel → ler → mostrar o relatório → abrir como planilha nova. */
export function JanelaAbrirExcel({ aoFechar, aoAbrir }) {
  const [etapa, setEtapa] = useState({ tipo: 'escolher' });
  const campo = useRef(null);
  const [arrastando, setArrastando] = useState(false);
  const vivo = useRef(true);
  useEffect(() => () => { vivo.current = false; }, []);

  const ler = async (arq) => {
    if (!arq) return;
    setEtapa({ tipo: 'lendo', nome: arq.name, p: null });
    try {
      const r = await lerArquivoExcel(arq, (p) => { if (vivo.current) setEtapa((e) => (e.tipo === 'lendo' ? { ...e, p } : e)); });
      if (!vivo.current) return;
      setEtapa({ tipo: 'pronto', nome: arq.name, ...r });
    } catch (e) {
      if (vivo.current) setEtapa({ tipo: 'erro', nome: arq.name, msg: e.message || String(e) });
    }
  };
  const nomeSemExt = (s) => String(s || 'Planilha').replace(/\.(xlsx|xlsm|xltx|xltm)$/i, '').slice(0, 120);

  const rodape = etapa.tipo === 'pronto'
    ? (<>
        <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn sm primary" data-excel-abrir onClick={() => aoAbrir(etapa.conteudo, nomeSemExt(etapa.nome))}>Abrir planilha</button>
      </>)
    : etapa.tipo === 'erro'
      ? (<>
          <button type="button" className="btn sm" onClick={aoFechar}>Fechar</button>
          <button type="button" className="btn sm primary" onClick={() => { setEtapa({ tipo: 'escolher' }); setTimeout(() => campo.current && campo.current.click(), 0); }}>Escolher outro</button>
        </>)
      : <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>;

  const p = etapa.p;
  const pct = p && p.n ? Math.round(((p.i - 1) / p.n) * 100) : 0;
  return (
    <Janela titulo={etapa.tipo === 'pronto' ? `Abrir "${nomeSemExt(etapa.nome)}"` : 'Abrir arquivo do Excel'} aoFechar={aoFechar} classe="janela-excel" rodape={rodape}>
      <div className="janela-c">
        <input ref={campo} type="file" accept=".xlsx,.xlsm,.xltx,.xltm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12" data-excel-arquivo hidden onChange={(ev) => { const f = ev.target.files && ev.target.files[0]; ev.target.value = ''; ler(f); }} />
        {etapa.tipo === 'escolher' && (
          <div className={'solta-excel' + (arrastando ? ' sobre' : '')}
            onDragOver={(ev) => { ev.preventDefault(); setArrastando(true); }} onDragLeave={() => setArrastando(false)}
            onDrop={(ev) => { ev.preventDefault(); setArrastando(false); ler(ev.dataTransfer.files && ev.dataTransfer.files[0]); }}>
            <Icone n="excel" />
            <p><b>Escolha um arquivo .xlsx ou .xlsm</b> (ou arraste para cá).</p>
            <p className="sub">Vem uma cópia para o EFCdocs; o arquivo original não muda. Macros, gráficos e tabelas dinâmicas não vêm, e o relatório mostra tudo antes de abrir.</p>
            <button type="button" className="btn primary" data-excel-escolher onClick={() => campo.current && campo.current.click()}>Escolher arquivo</button>
          </div>
        )}
        {etapa.tipo === 'lendo' && (
          <div className="lendo-excel" role="status" aria-live="polite">
            <p><b>Lendo {etapa.nome}…</b></p>
            <div className="barra-prog"><i style={{ width: Math.max(4, pct) + '%' }} /></div>
            <p className="sub">{p && p.fase === 'aba' ? `Aba ${p.i} de ${p.n}: ${p.aba}${p.linha ? ` (linha ${n(p.linha)})` : ''}` : 'Abrindo o pacote do Excel…'}</p>
            <p className="sub">Arquivo grande pode levar alguns segundos. A tela continua funcionando.</p>
          </div>
        )}
        {etapa.tipo === 'erro' && (
          <div className="erro-excel" role="alert">
            <p><b>Não deu para abrir {etapa.nome}.</b></p>
            <p>{etapa.msg}</p>
          </div>
        )}
        {etapa.tipo === 'pronto' && <RelatorioExcel rel={etapa.relatorio} />}
      </div>
    </Janela>
  );
}
