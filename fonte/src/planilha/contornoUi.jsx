/* Vértice Docs v0.6.37 — Planilha: os comandos de Dados › Estrutura de tópicos (Agrupar, Desagrupar, Mostrar e Ocultar detalhe,
   Limpar estrutura) e a pergunta "Linhas ou colunas?" do Excel quando a seleção não é de linhas ou colunas inteiras.
   As regras estão em contorno.js. */
import { useState } from 'react';
import { Janela } from '../ui/comum.jsx';
import { MAX_LIN, MAX_COL, normalFaixa } from './ref.js';
import { agrupar, grupoEm, alternarGrupo, limparEstrutura } from './contorno.js';

function JanelaLinhasOuColunas({ titulo, aoEscolher, aoFechar }) {
  const [eixo, setEixo] = useState('l');
  return (
    <Janela titulo={titulo} icone="n:agrupar" aoFechar={aoFechar} classe="pl-jdados pl-jgrupo" rodape={(
      <>
        <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn sm primary" data-foco data-grupo-ok onClick={() => { aoFechar(); aoEscolher(eixo); }}>OK</button>
      </>
    )}>
      <div className="janela-c rg-corpo">
        <label className="dd-col"><input type="radio" name="grp-eixo" data-grupo-eixo="l" checked={eixo === 'l'} onChange={() => setEixo('l')} /><span>Linhas</span></label>
        <label className="dd-col"><input type="radio" name="grp-eixo" data-grupo-eixo="c" checked={eixo === 'c'} onChange={() => setEixo('c')} /><span>Colunas</span></label>
      </div>
    </Janela>
  );
}

/** Faz o comando. p = { aba, abaId, faixa, mudar(mud, rótulo), cx }. */
export function executarContorno(id, { aba, abaId, faixa, mudar, cx }) {
  const f = normalFaixa(faixa);
  const linhasInteiras = f.c1 === 0 && f.c2 === MAX_COL - 1, colunasInteiras = f.l1 === 0 && f.l2 === MAX_LIN - 1;
  const aplicar = (r, aviso) => { if (!r) return; if (r.erro) { cx.avisar(r.erro, { ic: 'aviso' }); return; } mudar(r.mud, r.rotulo); if (aviso) cx.avisar(aviso, { ic: 'n:agrupar' }); };
  const fazerNo = (eixo) => {
    const passo = id === 'dados.agrupar' ? 1 : -1;
    const r = eixo === 'l' ? agrupar(aba, abaId, 'l', f.l1, f.l2, passo) : agrupar(aba, abaId, 'c', f.c1, f.c2, passo);
    aplicar(r, r && !r.erro && passo > 0 ? `${r.rotulo}. O botão de menos na margem esconde o grupo; Shift+Alt+← desagrupa.` : null);
  };
  if (id === 'dados.agrupar' || id === 'dados.desagrupar') {
    if (linhasInteiras) return fazerNo('l');
    if (colunasInteiras) return fazerNo('c');
    cx.perguntar({ Componente: JanelaLinhasOuColunas, props: { titulo: id === 'dados.agrupar' ? 'Agrupar' : 'Desagrupar', aoEscolher: fazerNo } });
    return;
  }
  if (id === 'dados.mostrarDetalhe' || id === 'dados.ocultarDetalhe') {
    const fechar = id === 'dados.ocultarDetalhe';
    /* a linha do grupo (ou do botão) onde está a seleção; senão a coluna */
    const gl = colunasInteiras ? null : grupoEm(aba, 'l', f.l1), gc = linhasInteiras ? null : grupoEm(aba, 'c', f.c1);
    const [eixo, g] = gl ? ['l', gl] : gc ? ['c', gc] : [null, null];
    if (!g) { cx.avisar('Escolha uma célula de um grupo (ou a linha do botão dele).', { ic: 'aviso' }); return; }
    if (g.fechado === fechar) { cx.avisar(fechar ? 'Este grupo já está escondido.' : 'Este grupo já está aberto.', { ic: 'info' }); return; }
    aplicar(alternarGrupo(aba, abaId, eixo, g, fechar));
    return;
  }
  if (id === 'dados.limparEstrutura') {
    const ml = limparEstrutura(aba, abaId, 'l'), mc = limparEstrutura(aba, abaId, 'c');
    if (!ml && !mc) { cx.avisar('Esta aba não tem grupos.', { ic: 'info' }); return; }
    mudar({ ...(ml || {}), ...(mc || {}) }, 'Limpar estrutura de tópicos');
    cx.avisar('Grupos tirados; o que estava escondido por eles apareceu. Dá para desfazer.', { ic: 'n:agrupar' });
  }
}
