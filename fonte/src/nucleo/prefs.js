/* EFCdocs — preferências da tela (guardadas no aparelho). */

/* Os 16 temas do EFClaudian, com os mesmos nomes, e o Petróleo (proposta da v0.3.0, cores do ícone). */
export const TEMAS = [
  ['papel', 'Papel'], ['light', 'Claro'], ['dark', 'Escuro'], ['ocean', 'Ardósia'], ['forest', 'Sálvia'],
  ['sunset', 'Gelo'], ['campo', 'Campo'], ['sol', 'Alto contraste'], ['aurora', 'Aurora'],
  ['topo', 'Curvas de nível'], ['pomar', 'Pomar'], ['ponto', 'Pontilhado'], ['ouro', 'Ouro'],
  ['estrela', 'Estrela'], ['brisa', 'Brisa'], ['nevoa', 'Névoa'], ['esmeralda', 'Esmeralda'],
  ['petroleo', 'Petróleo'],
];
const IDS_TEMA = TEMAS.map(([id]) => id);

/* Amostra de cada tema na tela de Opções: [fundo, cor principal] */
export const AMOSTRAS = {
  papel: ['#eef1f4', '#0f4c5c'], dark: ['#0a0a0f', '#8b5cf6'], light: ['#f5f5f7', '#7c3aed'], ocean: ['#0f141a', '#6b9bd1'],
  forest: ['#111412', '#7fb59a'], sunset: ['#151110', '#d08c6a'], campo: ['#eef3e4', '#5d8a2e'],
  sol: ['#fff', '#0b3d91'], aurora: ['#0b0b12', '#9d86f5'], topo: ['#0e1411', '#8cc39f'],
  pomar: ['#f4f1e8', '#4f7f35'], ponto: ['#f3f3f7', '#5454c8'], ouro: ['#0f0d08', '#d4a94a'],
  estrela: ['#0a0f1c', '#f0b94a'], brisa: ['#eef6f4', '#1f8a74'], nevoa: ['#f1f3f6', '#56708f'],
  esmeralda: ['#f2efe6', '#0f5c46'], petroleo: ['#0c2a33', '#f1a93b'],
};

/* v0.4.9 (L09): temas claros e escuros (pelo fundo da amostra) e os que aparecem logo de cara */
const luz = (hex) => { const n = parseInt(hex.slice(1).length === 3 ? hex.slice(1).replace(/./g, '$&$&') : hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
export const ehTemaClaro = (id) => !!AMOSTRAS[id] && luz(AMOSTRAS[id][0]) > 0.5;
export const TEMAS_DESTAQUE = ['papel', 'light', 'nevoa', 'dark', 'ocean', 'petroleo'];

export const OPCOES = {
  layout: ['A', 'B'],
  faixa: ['tudo', 'abas', 'oculta'],
  menu: ['completo', 'icones', 'oculto'],
  topo: ['completo', 'compacto'],
  estilo: ['auto', 'B', 'C', 'D', 'E'],
  perfil: ['admin', 'editor', 'operador', 'leitor'],
};

export const ROTULOS = {
  layout: { A: 'Faixa tipo Excel', B: 'Barra curta e painel' },
  faixa: { tudo: 'Mostrar tudo', abas: 'Só as abas', oculta: 'Esconder' },
  faixaB: { tudo: 'Mostrar a barra', abas: 'Barra só com ícones', oculta: 'Esconder' },
  menu: { completo: 'Completo', icones: 'Só ícones', oculto: 'Escondido' },
  topo: { completo: 'Completa', compacto: 'Só as abas' },
  estilo: { auto: 'Automático', B: 'B · Camadas', C: 'C · Linha fina', D: 'D · Quadrinho', E: 'E · Compacta' },
};

/* v0.6.2: estilo da faixa. "Automático" = B no computador e E (compacta) no celular e em tela pequena. */
export const DICA_ESTILO = {
  B: 'Cada grupo num cartão, com o botão principal da aba cheio de cor.',
  C: 'Linha fina: sem cartões, só traços separando os grupos.',
  D: 'Cada ícone grande dentro de um quadrinho de cor suave.',
  E: 'Compacta: só ícones numa linha, para sobrar mais planilha.',
};
export const estiloDaFaixa = (prefs, cel) => (prefs.estilo && prefs.estilo !== 'auto' ? prefs.estilo : (cel ? 'E' : 'B'));

/* Tema padrão (até a v0.2.0 era Claro, ou Escuro se o aparelho estivesse no escuro).
   v0.3.0: o Petróleo virou o padrão (C11 aprovado). Quem já escolheu um tema continua com o seu. */
export const TEMA_PADRAO_PETROLEO = false;
/* v0.4.8 (L01): abre no tema claro "Papel" (tinta petróleo; o dourado só marca o que está ativo). Quem já escolheu um tema continua com o seu. */
export const TEMA_PADRAO = 'papel';

export function prefsPadrao(escuro = false) {
  return {
    tema: TEMA_PADRAO,
    relevo: true, mesa: true, layout: 'A', faixa: 'tudo', menu: 'completo', topo: 'completo', estilo: 'auto', painel: false, perfil: 'admin',
  };
}

export function normalizarPrefs(salvas, escuro = false) {
  const p = { ...prefsPadrao(escuro) };
  if (!salvas || typeof salvas !== 'object') return p;
  if (IDS_TEMA.includes(salvas.tema)) p.tema = salvas.tema;
  if (typeof salvas.relevo === 'boolean') p.relevo = salvas.relevo;
  if (typeof salvas.mesa === 'boolean') p.mesa = salvas.mesa;
  if (typeof salvas.painel === 'boolean') p.painel = salvas.painel;
  for (const k of Object.keys(OPCOES)) if (OPCOES[k].includes(salvas[k])) p[k] = salvas[k];
  return p;
}
