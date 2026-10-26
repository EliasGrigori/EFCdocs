/* EFCdocs — janelas do Excel: escolher o arquivo, acompanhar a leitura e o relatório do que veio e do que ficou de fora. */
import { useEffect, useRef, useState } from 'react';
import { Janela, Icone } from './comum.jsx';
import { lerArquivoExcel } from '../planilha/xlsx/abrir.js';

const n = (x) => Number(x || 0).toLocaleString('pt-BR');
const kb = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

const VEIO = [
  'Valores e fórmulas (cada fórmula começa com o último valor que o Excel calculou)',
  'Formatação: fonte, negrito, cores, preenchimento, bordas, alinhamento e formato de número',
  'Larguras, alturas, linhas e colunas ocultas, células mescladas e congelar painéis',
  'Todas as abas (com a cor e as ocultas) e os nomes definidos',
];

/** O relatório da importação (também abre depois, em Arquivo › O que veio do Excel). */
export function RelatorioExcel({ rel }) {
  if (!rel) return null;
  const cortes = (rel.abas || []).filter((a) => a.cortes && a.cortes.length);
  return (
    <div className="rel-excel">
      <div className="rel-nums">
        <span><b>{n((rel.abas || []).length)}</b> {rel.abas && rel.abas.length === 1 ? 'aba' : 'abas'}</span>
        <span><b>{n(rel.celulas)}</b> células</span>
        <span><b>{n(rel.formulas)}</b> fórmulas</span>
        {rel.bytes ? <span>arquivo de <b>{kb(rel.bytes)}</b></span> : null}
      </div>
      <h3><Icone n="check" /> Veio</h3>
      <ul className="rel-lista">{VEIO.map((t) => <li key={t}>{t}</li>)}</ul>
      {rel.fora && rel.fora.length > 0 && (
        <>
          <h3><Icone n="aviso" /> Ficou de fora</h3>
          <ul className="rel-lista rel-fora">
            {rel.fora.map((f) => <li key={f.item}><b>{f.item}</b>{f.qtd > 1 ? ` (${n(f.qtd)})` : ''}{f.detalhe ? `: ${f.detalhe}` : ''}</li>)}
          </ul>
        </>
      )}
      {(cortes.length > 0 || (rel.avisos && rel.avisos.length > 0) || rel.semCalculo > 0) && (
        <>
          <h3><Icone n="info" /> Bom saber</h3>
          <ul className="rel-lista">
            {cortes.map((a) => a.cortes.map((t, i) => <li key={a.nome + i}><b>{a.nome}</b>: {t}.</li>))}
            {(rel.avisos || []).map((t) => <li key={t}>{t}</li>)}
            {rel.semCalculo > 0 && (
              <li>
                <b>{n(rel.semCalculo)} {rel.semCalculo === 1 ? 'fórmula mostra' : 'fórmulas mostram'} o último valor do Excel</b>: o EFCdocs ainda não calcula
                {rel.exemplosSemCalculo && rel.exemplosSemCalculo.length ? <> (por exemplo, <code>={rel.exemplosSemCalculo[0].f.replace(/\s+/g, ' ').slice(0, 70)}</code>: {rel.exemplosSemCalculo[0].motivo})</> : null}.
              </li>
            )}
          </ul>
        </>
      )}
      <details className="rel-abas">
        <summary>Aba por aba</summary>
        <table>
          <thead><tr><th>Aba</th><th>Células</th><th>Fórmulas</th></tr></thead>
          <tbody>{(rel.abas || []).map((a) => <tr key={a.nome}><td>{a.nome}</td><td>{n(a.celulas)}</td><td>{n(a.formulas)}</td></tr>)}</tbody>
        </table>
      </details>
      <p className="rel-nota">O arquivo original continua igual no seu computador. Para devolver ao Excel, use Arquivo › Salvar como Excel.</p>
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
