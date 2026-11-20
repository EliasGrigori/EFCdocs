/* Vértice Docs — Planilha: o que a faixa igual ao Excel pede a mais (v0.6.21 parte 2).
   Fica fora de Planilha.jsx de propósito (arquivo grande não cresce): aqui só entra a decisão; quem faz é a planilha.
   - "comando|valor" das listas: tipo do gráfico, conta da AutoSoma, função da Biblioteca;
   - Formatar › altura da linha, largura da coluna e os dois ajustes (D2), que o menu do cabeçalho também usa;
   - parte 3: Layout da Página (margens, orientação, papel, área, quebras, ajuste, opções de planilha), Classificar de A a Z e
     de Z a A, Limpar filtro, Zoom 100% e Congelar painéis com a lista do Excel. Os comandos de impressão saíram de Planilha.jsx. */
import { POR_EN } from './nomesFuncoes.js';
import { TIPOS_GRAFICO } from './graficos.js';
import { FUNCOES_AUTOSOMA } from './biblioteca.js';
import { letraCol, textoFaixa, normalFaixa } from './ref.js';
import { MARGENS, PAPEIS } from './impressao.js';

const TIPOS = new Set(TIPOS_GRAFICO.map(([t]) => t));
const CONTORNO = new Set(['dados.agrupar', 'dados.desagrupar', 'dados.mostrarDetalhe', 'dados.ocultarDetalhe', 'dados.limparEstrutura']); /* v0.6.37 */
/* parte 3: as opções das listas do Layout da Página e do Congelar painéis (os nomes são os do Excel) */
export const AJUSTES = { nenhum: 'Sem ajuste (tamanho real)', pagina: 'Caber a aba numa página', colunas: 'Caber todas as colunas numa página', linhas: 'Caber todas as linhas numa página' };
export const CONGELAR = { ativa: 'Congelar painéis', linha: 'Congelar linha superior', coluna: 'Congelar primeira coluna', nada: 'Descongelar painéis' };
const PLURAL = { normal: 'normais', estreita: 'estreitas', larga: 'largas' };
const JANELA_IMP = { 'impressao.configurar': 'o-que', 'impressao.margens': 'margens', 'impressao.titulos': 'titulos', 'impressao.ajustar': 'ajustar', 'impressao.cabecalho': 'cabecalho', 'impressao.papel': 'pagina' };

/** Qual margem pronta é esta (normal, estreita, larga) ou '' se é do seu jeito. */
export const margemDe = (marg) => Object.keys(MARGENS).find((k) => ['t', 'b', 'l', 'r'].every((x) => Math.abs(MARGENS[k][x] - marg[x]) < 0.01)) || '';
/** Como está congelado: 'linha' (só a de cima), 'coluna' (só a A), 'ativa' (outro ponto) ou '' (nada). */
export const congeladoDe = (cong) => (!cong || (!cong.l && !cong.c) ? '' : cong.l === 1 && !cong.c ? 'linha' : !cong.l && cong.c === 1 ? 'coluna' : 'ativa');
/** O que congelar para cada opção (ativa = até a célula escolhida). */
export const congelarPara = (como, ativa) => (como === 'linha' ? { l: 1, c: 0 } : como === 'coluna' ? { l: 0, c: 1 } : como === 'ativa' && (ativa.l || ativa.c) ? { l: ativa.l, c: ativa.c } : undefined);

/** O que os botões da parte 3 mostram (valor marcado na lista, botão ligado). Devolve undefined se não é daqui. */
export function estadoFaixaExtra(id, ctx) { /* ctx.imp é lido só quando o botão é da impressão (não desmontar ctx aqui) */
  switch (id) {
    case 'valor.margens': return margemDe(ctx.imp.marg);
    case 'valor.orientacao': return ctx.imp.orient;
    case 'valor.papel': return ctx.imp.papel;
    case 'valor.ajustar': return AJUSTES[ctx.imp.escala.modo] ? ctx.imp.escala.modo : '';
    case 'valor.congelar': return congeladoDe(ctx.cong);
    case 'impressao.grade': return !!ctx.imp.grade;
    case 'impressao.titulosLC': return !!ctx.imp.titulos;
    default: return undefined;
  }
}

/** Texto "coluna B", "3 colunas", "linha 7", "2 linhas". */
export const quaisDe = (ehCol, i, n) => (n === 1 ? (ehCol ? `coluna ${letraCol(i)}` : `linha ${i + 1}`) : (ehCol ? `${n} colunas` : `${n} linhas`));

/** Pergunta a largura (ou a altura) e aplica nas n colunas (ou linhas) a partir de i. */
export function pedirTamanho({ cx, mudar, abaId, ehCol, i, n, atual }) {
  const quais = quaisDe(ehCol, i, n);
  cx.perguntar({
    titulo: ehCol ? `Largura da ${quais}` : `Altura da ${quais}`, campo: ehCol ? 'Largura em pixels (padrão 80)' : 'Altura em pixels (padrão 22)',
    valor: String(atual), confirmar: 'Aplicar', modo: 'numeric',
    validar: (t) => (/^\d{1,3}$/.test(t.trim()) && +t >= (ehCol ? 4 : 6) && +t <= (ehCol ? 600 : 400) ? '' : (ehCol ? 'Use um número de 4 a 600.' : 'Use um número de 6 a 400.')),
    aoConfirmar: (t) => {
      const mud = {};
      for (let k = i; k < i + Math.min(n, 2000); k++) mud[`conteudo.abas.${abaId}.${ehCol ? 'larg' : 'alt'}.${k}`] = +t;
      mudar(mud, `${ehCol ? 'Largura' : 'Altura'} da ${quais}`);
    },
  });
}

/** Coluna: a largura do maior texto. Linha: a altura volta a se ajustar sozinha. */
export function ajustarTamanho({ mudar, abaId, ehCol, i, n, autoAjustar }) {
  if (ehCol) { for (let k = i; k < i + Math.min(n, 60); k++) autoAjustar(k); return; }
  const mud = {};
  for (let k = i; k < i + Math.min(n, 2000); k++) mud[`conteudo.abas.${abaId}.alt.${k}`] = undefined;
  mudar(mud, `Altura padrão da ${quaisDe(false, i, n)}`);
}

/** O que o id pede, sem tocar em nada (para testar sem tela). Devolve null se não é daqui. */
export function lerPedido(id) {
  const corte = id.indexOf('|');
  const base = corte < 0 ? id : id.slice(0, corte), v = corte < 0 ? '' : id.slice(corte + 1);
  if (base === 'inserir.grafico' && v) return TIPOS.has(v) ? { fazer: 'grafico', tipo: v } : { fazer: 'nada' };
  if (base === 'formula.autosoma' && v) return FUNCOES_AUTOSOMA.includes(v) ? { fazer: 'autosoma', fn: v } : { fazer: 'nada' };
  if (base === 'formula.inserir' && v.startsWith('cat:')) return { fazer: 'procurar', cat: v.slice(4) };
  if (base === 'formula.inserir' && v) return POR_EN[v] ? { fazer: 'funcao', f: POR_EN[v] } : { fazer: 'nada' };
  if (id === 'planilha.alturaLinha' || id === 'planilha.larguraColuna') return { fazer: 'tamanho', ehCol: id === 'planilha.larguraColuna' };
  if (id === 'planilha.ajustarLinha' || id === 'planilha.ajustarColuna') return { fazer: 'ajustar', ehCol: id === 'planilha.ajustarColuna' };
  /* parte 3 */
  if (base === 'impressao.margens' && v) return MARGENS[v] ? { fazer: 'margens', m: v } : { fazer: 'nada' };
  if (base === 'impressao.orientacao' && v) return v === 'retrato' || v === 'paisagem' ? { fazer: 'orientacao', o: v } : { fazer: 'nada' };
  if (base === 'impressao.papel' && v) return PAPEIS[v] ? { fazer: 'papel', p: v } : { fazer: 'nada' };
  if (base === 'impressao.ajustar' && v) return AJUSTES[v] ? { fazer: 'escala', modo: v } : { fazer: 'nada' };
  if (base === 'exibir.congelar' && v) return CONGELAR[v] ? { fazer: 'congelar', como: v } : { fazer: 'nada' };
  if (JANELA_IMP[id]) return { fazer: 'janelaImp', secao: JANELA_IMP[id] };
  if (id === 'impressao.orientacao') return { fazer: 'orientacao', o: '' };
  if (id === 'impressao.grade' || id === 'impressao.titulosLC') return { fazer: 'opcaoImp', campo: id === 'impressao.grade' ? 'grade' : 'titulos' };
  if (id === 'impressao.area' || id === 'impressao.limparArea') return { fazer: 'area', limpar: id === 'impressao.limparArea' };
  if (id === 'impressao.quebra' || id === 'impressao.semQuebras') return { fazer: 'quebra', tirar: id === 'impressao.semQuebras' };
  if (id === 'dados.az' || id === 'dados.za') return { fazer: 'ordenar', desc: id === 'dados.za' };
  if (id === 'dados.limparFiltro') return { fazer: 'limparFiltro' };
  if (id === 'dados.textoColunas') return { fazer: 'textoColunas' }; /* v0.6.36 */
  if (CONTORNO.has(id)) return { fazer: 'contorno', id }; /* v0.6.37 */
  if (id === 'dados.subtotal') return { fazer: 'subtotal' }; /* v0.6.38 */
  if (id === 'inserir.segmentacao') return { fazer: 'segmentacao' }; /* v0.6.42 (S2) */
  if (id === 'exibir.zoom100') return { fazer: 'zoom', z: 1 };
  return null;
}

/** Trata o comando se for um dos de cima. Devolve undefined quando não é daqui (a planilha segue o caminho dela).
    p = { ed, novoGrafico(tipo), autoSoma(fn), usarFuncao(f), procurarFuncao(cat), medida(ehCol) → { i, n, atual }, tamanho(args), ajustar(args),
          parte 3: imp, mudarImp(fn, rótulo), janelaImp(seção), avisar, faixa, ativa, ordenar(desc), limparFiltro(), zoom(z), congelar(v, rótulo) } */
export function tratarFaixaExtra(id, p) {
  const q = lerPedido(id);
  if (!q) return undefined;
  switch (q.fazer) {
    case 'grafico': return p.ed(() => p.novoGrafico(q.tipo));
    case 'autosoma': return p.ed(() => p.autoSoma(q.fn));
    case 'funcao': return p.ed(() => p.usarFuncao(q.f));
    case 'procurar': return p.ed(() => p.procurarFuncao(q.cat));
    case 'tamanho': return p.ed(() => p.tamanho({ ehCol: q.ehCol, ...p.medida(q.ehCol) }));
    case 'ajustar': return p.ed(() => p.ajustar({ ehCol: q.ehCol, ...p.medida(q.ehCol) }));
    case 'janelaImp': p.janelaImp(q.secao); return true;
    case 'margens': return p.ed(() => { const m = MARGENS[q.m]; p.mudarImp((x) => ({ ...x, marg: { t: m.t, b: m.b, l: m.l, r: m.r, cab: m.cab, rod: m.rod } }), 'Margens ' + PLURAL[q.m]); p.avisar(`Margens ${PLURAL[q.m]}.`, { ic: 'margens' }); });
    case 'orientacao': return p.ed(() => { const o = q.o || (p.imp.orient === 'paisagem' ? 'retrato' : 'paisagem'); p.mudarImp((x) => ({ ...x, orient: o }), o === 'paisagem' ? 'Página em paisagem' : 'Página em retrato'); p.avisar(`Página em ${o}.`, { ic: 'orientacao' }); });
    case 'papel': return p.ed(() => { p.mudarImp((x) => ({ ...x, papel: q.p }), 'Papel ' + PAPEIS[q.p].nome); p.avisar(`Papel ${PAPEIS[q.p].nome}.`, { ic: 'imprimir' }); });
    case 'escala': return p.ed(() => { p.mudarImp((x) => ({ ...x, escala: { ...x.escala, modo: q.modo } }), AJUSTES[q.modo]); p.avisar(AJUSTES[q.modo] + '.', { ic: 'ajustar' }); });
    case 'opcaoImp': return p.ed(() => { const liga = !p.imp[q.campo]; p.mudarImp((x) => ({ ...x, [q.campo]: liga }), (liga ? 'Imprimir ' : 'Não imprimir ') + (q.campo === 'grade' ? 'as linhas de grade' : 'as letras e números')); });
    case 'area': return p.ed(() => {
      if (q.limpar) { p.mudarImp((x) => ({ ...x, area: '' }), 'Limpar área de impressão'); p.avisar('Área de impressão limpa: imprime tudo que tem dado.', { ic: 'imprimir' }); return; }
      const t = textoFaixa(normalFaixa(p.faixa)); p.mudarImp((x) => ({ ...x, area: t }), 'Definir área de impressão'); p.avisar(`Área de impressão: ${t}.`, { ic: 'imprimir' });
    });
    case 'quebra': return p.ed(() => {
      if (q.tirar) { p.mudarImp((x) => ({ ...x, qL: [], qC: [] }), 'Remover quebras de página'); p.avisar('Quebras de página removidas.', { ic: 'quebrapag' }); return; }
      const { l, c } = p.ativa;
      if (!l && !c) { p.avisar('Escolha a célula onde começa a página nova (não pode ser a A1).', { ic: 'aviso' }); return; }
      p.mudarImp((x) => ({ ...x, qL: l ? [...x.qL, l] : x.qL, qC: c ? [...x.qC, c] : x.qC }), 'Inserir quebra de página');
      p.avisar(`Quebra de página ${l ? 'antes da linha ' + (l + 1) : ''}${l && c ? ' e ' : ''}${c ? 'antes da coluna ' + letraCol(c) : ''}.`, { ic: 'quebrapag' });
    });
    case 'ordenar': return p.ed(() => p.ordenar(q.desc));
    case 'limparFiltro': return p.ed(() => p.limparFiltro());
    case 'textoColunas': return p.ed(() => p.textoColunas());
    case 'contorno': return p.ed(() => p.contorno(q.id));
    case 'subtotal': return p.ed(() => p.subtotal());
    case 'segmentacao': return p.ed(() => p.segmentacao());
    case 'zoom': p.zoom(q.z); return true;
    case 'congelar': return p.ed(() => {
      const v = congelarPara(q.como, p.ativa);
      if (q.como === 'ativa' && !v) { p.avisar('Escolha a célula abaixo e à direita do que deve ficar parado (não pode ser a A1).', { ic: 'aviso' }); return; }
      p.congelar(v, v ? CONGELAR[q.como] : 'Descongelar painéis');
    });
    default: return false;
  }
}
