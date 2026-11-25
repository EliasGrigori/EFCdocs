/* Vértice Docs · Quadro · fundo (v0.6.50), parte sem tela (a janela fica em fundo.jsx).
   Cada quadro guarda o seu fundo em conteudo.fundo = { tipo, cor }:
   - tipo: bolinhas (padrão, como antes), quadriculado, linhas ou liso;
   - cor: 'padrao' (a superfície do tema, como antes) ou uma das cores suaves.
   O desenho anda com o arrasto e cresce com o zoom (tamanho = 22 px × zoom). No tema escuro a cor escolhida vira só um
   toque sobre a superfície escura. No PDF e na imagem o fundo não sai (papel branco), como o plano de fundo do Excel. */
export const TIPOS_FUNDO = [['bolinhas', 'Bolinhas'], ['quadriculado', 'Quadriculado'], ['linhas', 'Linhas'], ['liso', 'Liso']];
export const CORES_FUNDO = [
  ['padrao', null, 'Padrão'], ['branco', '#ffffff', 'Branco'], ['creme', '#fbf8f1', 'Creme'], ['nevoa', '#f3f6fa', 'Névoa'],
  ['salvia', '#f2f6f1', 'Sálvia'], ['rosa', '#faf4f4', 'Rosa-pó'], ['perola', '#f4f4f2', 'Pérola'],
];
const COR_DO_FUNDO = Object.fromEntries(CORES_FUNDO.map(([id, hex]) => [id, hex]));

/** O fundo guardado, já conferido (o que não for conhecido volta ao padrão). */
export function fundoValido(f) {
  const tipo = f && TIPOS_FUNDO.some(([t]) => t === f.tipo) ? f.tipo : 'bolinhas';
  const cor = f && f.cor in COR_DO_FUNDO ? f.cor : 'padrao';
  return { tipo, cor };
}
export const ehFundoPadrao = (f) => { const v = fundoValido(f); return v.tipo === 'bolinhas' && v.cor === 'padrao'; };

const TRACO = 'var(--qd-traco)';
const DESENHO = {
  bolinhas: (t) => [`radial-gradient(${TRACO} 1px, transparent 1.3px)`, `${t}px ${t}px`],
  quadriculado: (t) => [`linear-gradient(${TRACO} 1px, transparent 1px), linear-gradient(90deg, ${TRACO} 1px, transparent 1px)`, `${t}px ${t}px, ${t}px ${t}px`],
  linhas: (t) => [`linear-gradient(${TRACO} 1px, transparent 1px)`, `${t}px ${t}px`],
  liso: () => ['none', 'auto'],
};

/** Estilo da área do quadro para o fundo e a vista (posição e zoom). */
export function estiloDoFundo(f, view) {
  const { tipo, cor } = fundoValido(f);
  const t = 22 * view.z;
  const [backgroundImage, backgroundSize] = DESENHO[tipo](t);
  const pos = `${view.x}px ${view.y}px`;
  const est = { backgroundImage, backgroundSize, backgroundPosition: tipo === 'quadriculado' ? `${pos}, ${pos}` : pos };
  if (COR_DO_FUNDO[cor]) est['--qd-cor'] = COR_DO_FUNDO[cor];
  return est;
}
