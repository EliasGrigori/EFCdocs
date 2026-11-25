/* Vértice Docs · Quadro · aba Layout da Página e tracejado da impressão no quadro (v0.6.55; propostas 2 e 4 aprovadas).
   - Os comandos são os mesmos da Planilha (impressao.margens|normal, impressao.orientacao|paisagem, ...), tratados aqui
     para o quadro (fica fora de Quadro.jsx de propósito: arquivo grande não cresce).
   - Área de impressão: Definir = os itens escolhidos; Limpar = volta a sair o quadro todo.
   - Quebras de página: depois que a impressão foi mudada, o quadro mostra a área (tracejado cinza) e onde cada folha
     começa e acaba (tracejado azul, "Folha 1", "Folha 2"). Exibir › Quebras de página liga e desliga (no aparelho). */
import { normalizarImpQ, ehImpQPadrao, areaDosItens } from './impressaoQuadro.js';

export const AJUSTES_Q = { pagina: 'Ajustar a 1 página', real: 'Tamanho real (100%)' };

/** Trata os comandos de impressão do quadro. Devolve true se tratou, ou undefined se não é daqui. */
export function trataLayoutQuadro(id, { c, selecionados, aplicarQ, abrirJanela, trocarQp, avisar }) {
  const [base, valor] = String(id).split('|');
  const atual = normalizarImpQ(c.impressao);
  const mudar = (p, rotulo) => { const novo = normalizarImpQ({ ...atual, ...p }); if (!p.area && 'area' in p) delete novo.area; aplicarQ({ impressao: ehImpQPadrao(novo) ? null : novo }, rotulo); return true; };
  switch (base) {
    case 'impressao.margens': return valor ? mudar({ marg: valor }, 'Margens') : (abrirJanela(), true);
    case 'impressao.orientacao': return valor ? mudar({ orient: valor }, 'Orientação') : (abrirJanela(), true);
    case 'impressao.papel': return valor ? mudar({ papel: valor }, 'Tamanho do papel') : (abrirJanela(), true);
    case 'impressao.ajustar': return valor ? mudar({ escala: valor }, 'Ajustar à página') : (abrirJanela(), true);
    case 'impressao.configurar': case 'impressao.cabecalho': abrirJanela(); return true;
    case 'impressao.area': {
      if (!selecionados.length) { avisar('Escolha no quadro os itens que vão sair no papel e use Definir área de impressão de novo.', { ic: 'info' }); return true; }
      const area = areaDosItens(c, selecionados);
      return area ? mudar({ area, alvo: atual.alvo === 'escolhidos' ? 'auto' : atual.alvo }, 'Definir área de impressão') : true;
    }
    case 'impressao.limparArea':
      if (!atual.area) { avisar('O quadro não tem área de impressão.', { ic: 'info' }); return true; }
      return mudar({ area: null }, 'Limpar área de impressão');
    case 'exibir.quebras': trocarQp('quebras'); return true;
    default: return undefined;
  }
}

/** O que a faixa marca nas listas do Layout da Página (ou undefined se não é daqui). */
export function valorLayoutQuadro(id, c, qp) {
  const imp = normalizarImpQ(c.impressao);
  switch (id) {
    case 'valor.margens': return imp.marg;
    case 'valor.orientacao': return imp.orient;
    case 'valor.papel': return imp.papel;
    case 'valor.ajusteQ': return AJUSTES_Q[imp.escala] ? imp.escala : '';
    case 'exibir.quebras': return qp.quebras !== false;
    default: return undefined;
  }
}
