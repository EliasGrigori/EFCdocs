/* EFCdocs — Planilha (v0.6.25): janelas da Estatística descritiva (I01) e da Amostragem (I04), no padrão Camadas.
   As contas ficam em analise.js. */
import { useMemo, useState } from 'react';
import { Janela } from '../ui/comum.jsx';
import { rotuloColuna } from './dadosUi.jsx';
import { MEDIDAS, resumo } from './analise.js';
import { letraCol } from './ref.js';
import './analise.css';

/* igual à aba que vai ser criada: três casas, porcentagem com uma, contagem inteira */
const num = (x, nf) => (x == null || !Number.isFinite(x) ? '—' : nf === '0.0%' ? (x * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%' : nf ? x.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : x.toLocaleString('pt-BR'));

/* ---------- I01 · Estatística descritiva ---------- */
export function JanelaEstatistica({ faixa, subtitulo, cabecalho0, titulos, numeros, aoAplicar, aoFechar }) {
  const cols = [];
  for (let cc = faixa.c1; cc <= faixa.c2; cc++) cols.push(cc);
  const [cab, setCab] = useState(cabecalho0);
  const [marcadas, setMarcadas] = useState(() => new Set(cols.filter((cc) => numeros(cc, cabecalho0).length)));
  const [erro, setErro] = useState('');
  const escolhidas = cols.filter((cc) => marcadas.has(cc));
  const previa = useMemo(() => escolhidas.slice(0, 3).map((cc) => ({ cc, r: resumo(numeros(cc, cab)) })), [escolhidas.join(','), cab]); // eslint-disable-line react-hooks/exhaustive-deps
  const alternar = (cc) => setMarcadas((s) => { const n = new Set(s); if (n.has(cc)) n.delete(cc); else n.add(cc); return n; });
  const aplicar = () => { const e = aoAplicar({ cols: escolhidas, cabecalho: cab }); if (e) setErro(e); };
  return (
    <Janela titulo="Estatística descritiva" icone="grafico" subtitulo={subtitulo} aoFechar={aoFechar} classe="pl-jdados an-jan" rodape={(
      <>
        <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn sm primary" disabled={!escolhidas.length} data-foco data-estat-ok onClick={aplicar}>Criar o resumo</button>
      </>
    )}>
      <div className="janela-c rg-corpo" data-estat-janela>
        <section className="rg-cartao">
          <span className="rg-cab">Colunas</span>
          <div className="dd-cols">
            {cols.map((cc) => (
              <label key={cc} className="dd-col"><input type="checkbox" data-estat-col={cc} checked={marcadas.has(cc)} onChange={() => alternar(cc)} /><span>{rotuloColuna(cc, cab, titulos(cc))}</span></label>
            ))}
          </div>
        </section>
        <label className="dd-cab"><input type="checkbox" checked={cab} onChange={(ev) => setCab(ev.target.checked)} /><span>A primeira linha é o cabeçalho</span></label>
        {previa.length > 0 && (
          <section className="rg-cartao">
            <span className="rg-cab">Prévia{escolhidas.length > 3 ? ` (3 de ${escolhidas.length} colunas)` : ''}</span>
            <div className="an-previa">
              <table data-estat-previa>
                <thead><tr><th>Medida</th>{previa.map(({ cc }) => <th key={cc}>{cab && titulos(cc) ? String(titulos(cc)).slice(0, 18) : `Coluna ${letraCol(cc)}`}</th>)}</tr></thead>
                <tbody>{MEDIDAS.map(([rot, , nf], k) => <tr key={rot}><td>{rot}</td>{previa.map(({ cc, r }) => <td key={cc}>{num(r[k], nf)}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </section>
        )}
        <p className="dd-dica">O resumo vai para uma aba nova, com fórmulas ligadas a estes dados: mudou um número, o resumo acompanha. Texto e células vazias ficam de fora.</p>
        {erro && <p className="rg-erro" role="alert">{erro}</p>}
      </div>
    </Janela>
  );
}

/* ---------- I04 · Amostragem ---------- */
export function JanelaAmostra({ subtitulo, cabecalho0, total, aoAplicar, aoFechar }) {
  const [cab, setCab] = useState(cabecalho0);
  const [modo, setModo] = useState('aleatorio');
  const tem = total(cab);
  const [n, setN] = useState(() => String(Math.min(10, Math.max(1, total(cabecalho0)))));
  const [k, setK] = useState('5');
  const [origem, setOrigem] = useState(true);
  const [erro, setErro] = useState('');
  const q = Math.floor(Number(String(modo === 'periodico' ? k : n).replace(',', '.')));
  const valido = Number.isFinite(q) && q >= 1;
  const vai = !valido ? 0 : modo === 'periodico' ? Math.max(1, Math.round(tem / q)) : Math.min(q, tem);
  const aplicar = () => { if (!valido) return; const e = aoAplicar({ cabecalho: cab, modo, n: q, k: q, origem }); if (e) setErro(e); };
  return (
    <Janela titulo="Amostragem" icone="lista" subtitulo={subtitulo} aoFechar={aoFechar} classe="pl-jdados an-jan" rodape={(
      <>
        <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn sm primary" disabled={!valido || !tem} data-foco data-amostra-ok onClick={aplicar}>Sortear</button>
      </>
    )}>
      <div className="janela-c rg-corpo" data-amostra-janela onKeyDown={(ev) => { if (ev.key === 'Enter' && ev.target.tagName === 'INPUT' && ev.target.type === 'text') { ev.preventDefault(); aplicar(); } }}>
        <section className="rg-cartao">
          <span className="rg-cab">Como sortear</span>
          <span className="rg-seg" role="group" aria-label="Como sortear">
            <button type="button" aria-pressed={modo === 'aleatorio'} data-amostra-modo="aleatorio" onClick={() => setModo('aleatorio')}>Aleatória</button>
            <button type="button" aria-pressed={modo === 'periodico'} data-amostra-modo="periodico" onClick={() => setModo('periodico')}>Uma a cada…</button>
          </span>
          <label className="an-campo">
            <span>{modo === 'periodico' ? 'Uma linha a cada' : 'Quantas linhas'}</span>
            <input type="text" inputMode="numeric" data-amostra-n value={modo === 'periodico' ? k : n} onChange={(ev) => (modo === 'periodico' ? setK : setN)(ev.target.value)} aria-invalid={!valido} />
            {modo === 'periodico' && <em>linhas (o começo é sorteado)</em>}
          </label>
        </section>
        <label className="dd-cab"><input type="checkbox" checked={cab} onChange={(ev) => setCab(ev.target.checked)} /><span>A primeira linha é o cabeçalho (vai junto, sem entrar no sorteio)</span></label>
        <label className="dd-cab"><input type="checkbox" data-amostra-origem checked={origem} onChange={(ev) => setOrigem(ev.target.checked)} /><span>Anotar a linha de origem (coluna "Linha")</span></label>
        <p className="dd-previa" role="status" data-amostra-previa>
          {!tem ? 'Não há linhas de dados para sortear.' : !valido ? 'Escreva um número inteiro, de 1 para cima.' : `Vai sortear ${modo === 'periodico' ? 'cerca de ' : ''}${vai} de ${tem} linha${tem > 1 ? 's' : ''}${modo === 'aleatorio' ? ', sem repetir' : ''}.`}
        </p>
        <p className="dd-dica">A amostra vai para uma aba nova, com a data e a hora do sorteio. Linhas escondidas pelo filtro não entram.</p>
        {erro && <p className="rg-erro" role="alert">{erro}</p>}
      </div>
    </Janela>
  );
}
