/* Vértice Docs v0.6.36 — Planilha: janela do Texto para colunas (Dados › Ferramentas de dados).
   As regras estão em textoColunas.js; aqui só a tela: modo (separado por / largura fixa), prévia com o formato de
   cada coluna (Geral, Texto, Pular), onde começar e o aviso de células que serão substituídas. */
import { useMemo, useState } from 'react';
import { Janela } from '../ui/comum.jsx';
import { letraCol, lerEnderecoCaixa, normalFaixa } from './ref.js';
import { SEPARADORES, previa, sugerirCortes, textoParaColunas, textoDaColuna, MAX_LINHAS } from './textoColunas.js';

const FORMATOS = [['geral', 'Geral'], ['texto', 'Texto'], ['pular', 'Pular']];

/** Separador mais provável nas primeiras linhas (ponto e vírgula, tabulação, vírgula; senão espaço). */
function adivinhar(textos) {
  const conta = (ch) => textos.reduce((n, t) => n + (t.split(ch).length - 1), 0);
  const [id] = [['pv', ';'], ['tab', '\t'], ['virgula', ',']].map(([i, ch]) => [i, conta(ch)]).sort((a, b) => b[1] - a[1])[0];
  return conta({ pv: ';', tab: '\t', virgula: ',' }[id]) ? { [id]: true } : { espaco: true };
}

/** Abre a janela. Com uma célula só, pega para baixo as células com texto da mesma coluna (como o Excel faz com a região). */
export function abrirTextoColunas({ c, abaId, faixa, textoDe, aplicarLote, cx }) {
  let f = normalFaixa(faixa);
  if (f.c1 !== f.c2) { cx.avisar('Escolha uma coluna só para separar o texto.', { ic: 'aviso' }); return; }
  if (f.l1 === f.l2) { let l = f.l1; while (l + 1 - f.l1 < MAX_LINHAS && textoDe(l + 1, f.c1)) l++; f = { ...f, l2: l }; }
  const textos = [];
  for (let l = f.l1; l <= Math.min(f.l2, f.l1 + 199); l++) textos.push(String(textoDe(l, f.c1) ?? ''));
  if (!textos.some((t) => t !== '')) { cx.avisar('Não há texto para separar nesta coluna.', { ic: 'aviso' }); return; }
  cx.perguntar({ Componente: JanelaTextoColunas, props: { c, abaId, faixa: f, textos, textoDe, aplicarLote, avisar: cx.avisar } });
}

export function JanelaTextoColunas({ c, abaId, faixa, textos, textoDe, aplicarLote, avisar, aoFechar }) {
  const [modo, setModo] = useState('separador');
  const [seps, setSeps] = useState(() => adivinhar(textos.slice(0, 20)));
  const [outro, setOutro] = useState('');
  const [juntar, setJuntar] = useState(false);
  const [aspas, setAspas] = useState(true);
  const [cortesTxt, setCortesTxt] = useState(() => sugerirCortes(textos).join(', '));
  const [formatos, setFormatos] = useState([]);
  const [destinoTxt, setDestinoTxt] = useState(letraCol(faixa.c1) + (faixa.l1 + 1));
  const [erro, setErro] = useState('');
  const cortes = cortesTxt.split(/[^\d]+/).filter(Boolean).map(Number);
  const op = { modo, seps, outro, juntar, aspas: aspas ? '"' : '', cortes, formatos };
  const pv = useMemo(() => previa(textos, op), [modo, JSON.stringify(seps), outro, juntar, aspas, cortesTxt]); // eslint-disable-line react-hooks/exhaustive-deps
  const destino = useMemo(() => { const e = lerEnderecoCaixa(destinoTxt); return e && !e.aba && e.l1 === e.l2 && e.c1 === e.c2 ? { l: e.l1, c: e.c1 } : null; }, [destinoTxt]);
  const conf = useMemo(() => (destino ? textoParaColunas(c, abaId, faixa, op, { textoDe, destino, conferir: true }) : null), [destino, modo, JSON.stringify(seps), outro, juntar, aspas, cortesTxt, formatos.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const vao = pv.colunas - formatos.slice(0, pv.colunas).filter((x) => x === 'pular').length;
  const fm = (i) => formatos[i] || 'geral';
  const mudarFormato = (i, v) => setFormatos((a) => { const n = [...a]; while (n.length <= i) n.push('geral'); n[i] = v; return n; });
  const aplicar = () => {
    if (!destino) { setErro('Escreva uma célula para começar, como B1.'); return; }
    const r = textoParaColunas(c, abaId, faixa, op, { textoDe, destino });
    if (r.erro) { setErro(r.erro); return; }
    aplicarLote(r.lote, 'Texto para colunas');
    avisar(`${r.linhas} linha${r.linhas > 1 ? 's' : ''} separada${r.linhas > 1 ? 's' : ''} em ${r.colunas} coluna${r.colunas > 1 ? 's' : ''}${r.comFormula ? `; ${r.comFormula} com fórmula ficaram como estavam` : ''}. Dá para desfazer.`, { ic: 'n:textoColunas' });
    aoFechar();
  };
  return (
    <Janela titulo="Texto para colunas" icone="n:textoColunas" subtitulo={textoDaColuna(faixa)} aoFechar={aoFechar} classe="pl-jdados pl-jtc" rodape={(
      <>
        <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn sm primary" data-foco data-tc-aplicar disabled={vao < 1} onClick={aplicar}>{`Separar em ${vao} coluna${vao > 1 ? 's' : ''}`}</button>
      </>
    )}>
      <div className="janela-c rg-corpo">
        <div className="seg" role="radiogroup" aria-label="Como separar">
          <button type="button" role="radio" aria-checked={modo === 'separador'} className={'chipb' + (modo === 'separador' ? ' on' : '')} data-tc-modo="separador" onClick={() => setModo('separador')}>Separado por</button>
          <button type="button" role="radio" aria-checked={modo === 'fixo'} className={'chipb' + (modo === 'fixo' ? ' on' : '')} data-tc-modo="fixo" onClick={() => setModo('fixo')}>Largura fixa</button>
        </div>
        {modo === 'separador' ? (
          <section className="rg-cartao">
            <div className="tc-seps">
              {SEPARADORES.map(([id, nome]) => (
                <label key={id} className="dd-col"><input type="checkbox" data-tc-sep={id} checked={!!seps[id]} onChange={(ev) => setSeps((s) => ({ ...s, [id]: ev.target.checked }))} /><span>{nome}</span></label>
              ))}
              <label className="dd-col"><span>Outro</span><input className="tc-outro" data-tc-outro maxLength={1} value={outro} aria-label="Outro separador" onChange={(ev) => setOutro(ev.target.value)} /></label>
            </div>
            <label className="dd-col"><input type="checkbox" checked={juntar} data-tc-juntar onChange={(ev) => setJuntar(ev.target.checked)} /><span>Separadores seguidos contam como um só</span></label>
            <label className="dd-col"><input type="checkbox" checked={aspas} onChange={(ev) => setAspas(ev.target.checked)} /><span>Texto entre aspas fica junto</span></label>
          </section>
        ) : (
          <section className="rg-cartao">
            <label className="campo-t">Cortar nas posições (letras contadas do começo)
              <span className="tc-linha"><input data-tc-cortes value={cortesTxt} inputMode="numeric" placeholder="ex.: 3, 7" onChange={(ev) => setCortesTxt(ev.target.value)} />
                <button type="button" className="btn sm" onClick={() => setCortesTxt(sugerirCortes(textos).join(', '))}>Sugerir</button></span>
            </label>
          </section>
        )}
        <div className="tc-previa" role="region" aria-label="Prévia">
          <table data-tc-previa>
            <thead><tr>{Array.from({ length: pv.colunas }, (_, i) => (
              <th key={i} className={fm(i) === 'pular' ? 'pulada' : ''}>
                <select value={fm(i)} aria-label={`Formato da coluna ${i + 1}`} data-tc-formato={i} onChange={(ev) => mudarFormato(i, ev.target.value)}>
                  {FORMATOS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
                </select>
              </th>))}</tr></thead>
            <tbody>{pv.linhas.map((l, r) => <tr key={r}>{Array.from({ length: pv.colunas }, (_, i) => <td key={i} className={fm(i) === 'pular' ? 'pulada' : ''}>{l[i] ?? ''}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <label className="campo-t tc-destino">Começar em
          <input data-tc-destino value={destinoTxt} onChange={(ev) => { setDestinoTxt(ev.target.value.toUpperCase()); setErro(''); }} />
        </label>
        {conf && conf.substitui > 0 && <p className="dd-previa" role="status" data-tc-aviso>{`${conf.substitui} célula${conf.substitui > 1 ? 's' : ''} com dado à direita ${conf.substitui > 1 ? 'serão substituídas' : 'será substituída'}. Dá para desfazer.`}</p>}
        {erro && <p className="rg-erro" role="alert">{erro}</p>}
      </div>
    </Janela>
  );
}
