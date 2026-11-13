/* EFCdocs — preferências da tela (guardadas no aparelho). */

/* v0.6.15 (R17): o visual do Cwork tem dois temas: Claro (marfim e ouro) e Escuro (o Dourado: fundo #0b0d16, ouro #d9b46a).
   Os ids ficam "papel" e "dark" (o que a pessoa já guardou e as regras de cada tema continuam valendo); os outros 16 temas saem
   e quem usava um deles passa para o Claro ou o Escuro, pelo fundo. */
export const TEMAS = [['papel', 'Claro'], ['dark', 'Escuro']];
const FUNDOS_ANTIGOS = {
  papel: '#eef1f4', dark: '#0a0a0f', light: '#f5f5f7', ocean: '#0f141a', forest: '#111412', sunset: '#151110', campo: '#eef3e4', sol: '#fff',
  aurora: '#0b0b12', topo: '#0e1411', pomar: '#f4f1e8', ponto: '#f3f3f7', ouro: '#0f0d08', estrela: '#0a0f1c', brisa: '#eef6f4', nevoa: '#f1f3f6',
  esmeralda: '#f2efe6', petroleo: '#0c2a33',
};
const IDS_TEMA = TEMAS.map(([id]) => id);

/* Amostra de cada tema na tela de Opções: [fundo, cor principal] */
export const AMOSTRAS = { papel: ['#f7f5ef', '#9a7128'], dark: ['#0b0d16', '#d9b46a'] };

/* v0.4.9 (L09): temas claros e escuros (pelo fundo da amostra) e os que aparecem logo de cara */
const luz = (hex) => { const n = parseInt(hex.slice(1).length === 3 ? hex.slice(1).replace(/./g, '$&$&') : hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
export const ehTemaClaro = (id) => !!AMOSTRAS[id] && luz(AMOSTRAS[id][0]) > 0.5;
const temaNovo = (id) => (IDS_TEMA.includes(id) ? id : FUNDOS_ANTIGOS[id] ? (luz(FUNDOS_ANTIGOS[id]) > 0.5 ? 'papel' : 'dark') : null);
export const TEMAS_DESTAQUE = ['papel', 'dark'];

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

/* v0.6.3 (R04): até 2 temas favoritos, que aparecem como bolinhas no menu da faixa */
export const FAV_PADRAO = ['papel', 'dark'];
export const MAX_FAV = 2;

export function prefsPadrao(escuro = false) {
  return {
    tema: TEMA_PADRAO,
    relevo: true, mesa: true, layout: 'A', faixa: 'tudo', menu: 'completo', topo: 'completo', estilo: 'auto', painel: false, perfil: 'admin', favTemas: [...FAV_PADRAO],
  };
}

export function normalizarPrefs(salvas, escuro = false) {
  const p = { ...prefsPadrao(escuro) };
  if (!salvas || typeof salvas !== 'object') return p;
  if (temaNovo(salvas.tema)) p.tema = temaNovo(salvas.tema);
  if (typeof salvas.relevo === 'boolean') p.relevo = salvas.relevo;
  if (typeof salvas.mesa === 'boolean') p.mesa = salvas.mesa;
  if (typeof salvas.painel === 'boolean') p.painel = salvas.painel;
  for (const k of Object.keys(OPCOES)) if (OPCOES[k].includes(salvas[k])) p[k] = salvas[k];
  if (Array.isArray(salvas.favTemas)) p.favTemas = [...new Set(salvas.favTemas.map(temaNovo).filter(Boolean))].slice(0, MAX_FAV);
  return p;
}
