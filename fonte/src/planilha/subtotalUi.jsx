/* Vértice Docs v0.6.38 — Planilha: janela do Subtotal (Dados › Estrutura de tópicos), como a do Excel.
   As regras estão em subtotal.js. */
import { useMemo, useState } from 'react';
import { Janela } from '../ui/comum.jsx';
import { letraCol, normalFaixa } from './ref.js';
import { Motor } from './motor.js';
import { textoCelula } from './grade.js';
import { FUNCOES, fazerSubtotal, removerSubtotais, linhasDeSubtotal, mudancasEntre } from './subtotal.js';

/** Texto que aparece numa célula de um conteúdo qualquer (o motor é refeito só quando o conteúdo muda). */
function textoDoConteudo(abaId) {
  let ultimo = null, motor = null;
  return (c, l, col) => { if (c !== ultimo) { ultimo = c; motor = new Motor(c); } return textoCelula(motor, c, abaId, l, col).t; };
}

/** Abre a janela. area: a tabela (com os títulos na primeira linha). */
export function abrirSubtotal({ c, abaId, area, textoDe, mudar, cx }) {
  const f = normalFaixa(area);
  if (f.l2 - f.l1 < 1) { cx.avisar('Clique numa célula da tabela (com os títulos em cima) para fazer o subtotal.', { ic: 'aviso' }); return; }
  cx.perguntar({ Componente: JanelaSubtotal, props: { c, abaId, area: f, textoDe, mudar, avisar: cx.avisar } });
}

export function JanelaSubtotal({ c, abaId, area, textoDe, mudar, avisar, aoFechar }) {
  const cols = [];
  for (let cc = area.c1; cc <= area.c2; cc++) cols.push(cc);
  const titulo = (cc) => String(textoDe(area.l1, cc) || '').trim() || `Coluna ${letraCol(cc)}`;
  const [col, setCol] = useState(area.c1);
  const [fn, setFn] = useState(9);
  const [marcadas, setMarcadas] = useState(() => new Set([area.c2 !== area.c1 ? area.c2 : area.c1]));
  const [substituir, setSubstituir] = useState(true);
  const [quebra, setQuebra] = useState(false);
  const [abaixo, setAbaixo] = useState(true);
  const [erro, setErro] = useState('');
  const temSubtotal = useMemo(() => linhasDeSubtotal(c.abas[abaId], area).length > 0, [c, abaId, area]);
  /* aviso de coluna fora de ordem: o mesmo valor aparece em pedaços separados (vira um total para cada pedaço, como no Excel) */
  const pedacos = useMemo(() => {
    const vistos = new Set(); let ant = null, repetidos = 0;
    for (let l = area.l1 + 1; l <= area.l2; l++) { const k = String(textoDe(l, col) ?? '').trim().toLowerCase(); if (k !== ant) { if (vistos.has(k)) repetidos++; vistos.add(k); ant = k; } }
    return repetidos;
  }, [col]); // eslint-disable-line react-hooks/exhaustive-deps
  const alternar = (cc) => setMarcadas((s) => { const n = new Set(s); if (n.has(cc)) n.delete(cc); else n.add(cc); return n; });
  const aplicar = () => {
    const r = fazerSubtotal(c, abaId, area, { col, fn, colunas: [...marcadas].sort((a, b) => a - b), substituir, abaixo, quebra }, textoDoConteudo(abaId));
    if (r.erro) { setErro(r.erro); return; }
    mudar(mudancasEntre(c, r.conteudo), 'Subtotal');
    avisar(`${r.grupos} subtotai${r.grupos > 1 ? 's' : ''} e o total geral. Os botões 1, 2 e 3 na margem mostram só os totais ou tudo. Dá para desfazer.`, { ic: 'n:subtotal' });
    aoFechar();
  };
  const removerTodos = () => {
    const r = removerSubtotais(c, abaId, area);
    if (!r.removidas) { setErro('Esta tabela não tem subtotais.'); return; }
    mudar(mudancasEntre(c, r.conteudo), 'Remover subtotais');
    avisar(`${r.removidas} linha${r.removidas > 1 ? 's' : ''} de subtotal removida${r.removidas > 1 ? 's' : ''}. Dá para desfazer.`, { ic: 'n:subtotal' });
    aoFechar();
  };
  return (
    <Janela titulo="Subtotal" icone="n:subtotal" subtitulo={`Tabela ${letraCol(area.c1)}${area.l1 + 1}:${letraCol(area.c2)}${area.l2 + 1}`} aoFechar={aoFechar} classe="pl-jdados pl-jsub" rodape={(
      <>
        <button type="button" className="btn sm" data-sub-remover disabled={!temSubtotal} onClick={removerTodos}>Remover todos</button>
        <span className="sp" />
        <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn sm primary" data-foco data-sub-ok disabled={!marcadas.size} onClick={aplicar}>OK</button>
      </>
    )}>
      <div className="janela-c rg-corpo">
        <label className="campo-t">A cada mudança em
          <select value={col} data-sub-col onChange={(ev) => setCol(+ev.target.value)}>{cols.map((cc) => <option key={cc} value={cc}>{titulo(cc)}</option>)}</select>
        </label>
        {pedacos > 0 && <p className="dd-previa" role="status" data-sub-ordem>{`A coluna não está em ordem: ${pedacos} valor${pedacos > 1 ? 'es aparecem' : ' aparece'} em mais de um pedaço e cada pedaço ganha um total. Para um total por valor, ponha em ordem antes (Dados › Classificar).`}</p>}
        <label className="campo-t">Usar a função
          <select value={fn} data-sub-fn onChange={(ev) => setFn(+ev.target.value)}>{FUNCOES.map(([n, nome]) => <option key={n} value={n}>{nome}</option>)}</select>
        </label>
        <section className="rg-cartao">
          <span className="rg-cab">Adicionar subtotal a</span>
          <div className="dd-cols">
            {cols.map((cc) => <label key={cc} className="dd-col"><input type="checkbox" data-sub-alvo={cc} checked={marcadas.has(cc)} onChange={() => alternar(cc)} /><span>{titulo(cc)}</span></label>)}
          </div>
        </section>
        <label className="dd-col"><input type="checkbox" checked={substituir} data-sub-substituir onChange={(ev) => setSubstituir(ev.target.checked)} /><span>Substituir os subtotais que já existem</span></label>
        <label className="dd-col"><input type="checkbox" checked={quebra} data-sub-quebra onChange={(ev) => setQuebra(ev.target.checked)} /><span>Quebra de página entre os grupos</span></label>
        <label className="dd-col"><input type="checkbox" checked={abaixo} data-sub-abaixo onChange={(ev) => setAbaixo(ev.target.checked)} /><span>Resumo embaixo dos dados</span></label>
        {erro && <p className="rg-erro" role="alert">{erro}</p>}
      </div>
    </Janela>
  );
}
