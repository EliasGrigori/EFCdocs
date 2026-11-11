/* Fase 0 (11/11/2026): gerou a PRIMEIRA versão de docs/features.csv a partir do catálogo de comandos.
   Desde a v0.6.10 o features.csv é mantido à mão (linhas F312 em diante e situações atualizadas): NÃO rodar de novo por cima;
   se precisar, gere para outro arquivo e compare. */
import { COMANDOS, chegaNa, valeNoModulo } from '../../src/nucleo/comandos.js';
import { IMPL } from '../../src/planilha/funcoes.js';
import { writeFileSync } from 'node:fs';
const MODS = { planilha: 'Planilha', docx: 'Documento', postits: 'Quadro' };
const linhas = [['id', 'modulo', 'grupo', 'funcao', 'situacao', 'defeito_ou_falta', 'acao_no_plano', 'origem']];
const esc = (s) => { s = String(s == null ? '' : s); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
let n = 0; const cont = {};
const add = (mod, grupo, fn, sit, def = '', acao = '', origem = 'catálogo de comandos') => { n++; linhas.push([`F${String(n).padStart(3, '0')}`, mod, grupo, fn, sit, def, acao, origem]); const k = mod + '|' + sit; cont[k] = (cont[k] || 0) + 1; };
/* defeitos conhecidos ligados a comandos */
const DEF = {
  'formatar.mesclar': ['com defeito', 'D-11: borda no meio da mesclada e caixinha no canto; falta Mesclar através e aviso de perda de valores', 'B1'],
  'inserir.tabela': ['com defeito', 'D-12/D-13/D-14 e P-01: tabela é só pintura; não cresce, Tab não abre linha, sem alça, sem Design; estilo de tabela do Excel não é desenhado', 'B3'],
  'inserir.imagem': ['parcial', 'P-01: janela só com largura e texto alternativo; sem cortar, girar, moldura', 'B4'],
  'dados.validacao': ['parcial', 'P-01: sem prévia em frase, sem marcar inválidos, caixa nativa do navegador', 'B5'],
  'exibir.congelar': ['com defeito', 'D-15: linha cortada abaixo do congelado na tela de toque; decisão aberta do celular', 'B1'],
};
for (const c of COMANDOS) for (const mod of Object.keys(MODS)) {
  if (!valeNoModulo(c, mod)) continue;
  const falta = chegaNa(c, mod);
  const d = DEF[c.id] && mod === 'planilha' ? DEF[c.id] : null;
  add(MODS[mod], c.id.split('.')[0], c.nome + (c.atalho ? ` (${c.atalho})` : ''), falta ? 'ainda não feito' : d ? d[0] : 'funciona', falta ? 'previsto: ' + falta : d ? d[1] : '', falta ? '' : d ? d[2] : 'manter');
}
const extra = (mod, grupo, itens) => { for (const [fn, sit, def, acao] of itens) add(mod, grupo, fn, sit, def || '', acao || 'manter', 'varredura da Fase 0'); };
extra('Planilha', 'motor', [
  [`${Object.keys(IMPL).length} funções de cálculo (nomes em inglês no motor, português na tela)`, 'funciona'],
  ['Recalcular só o que depende da célula mudada', 'com defeito', 'a cada digitação a planilha inteira é varrida (1,2 s em 360 mil células)', 'B2'],
  ['Fórmulas com tabela estruturada (Tabela1[Coluna])', 'parcial', 'L-02: viram endereços; a conta é a mesma', 'depois'],
  ['Funções que o motor ainda não calcula mostram o último valor do Excel', 'funciona'],
]);
extra('Planilha', 'grade', [
  ['Rolar com painel congelado (mouse e toque)', 'funciona', 'fluido: 60 quadros por segundo em 360 mil células'],
  ['Bordas de células mescladas', 'com defeito', 'D-11 (reproduzido com amostra inventada)', 'B1'],
  ['Rolagem que encaixa em linha inteira no toque', 'com defeito', 'D-15 (hipótese: a rolagem por toque para no meio da linha)', 'B1'],
  ['Texto que invade a célula vizinha vazia', 'funciona', 'D-05 em aberto (não reproduzido)', 'B1'],
  ['Estilo de tabela do Excel (listras, cabeçalho)', 'falta', 'o nome do estilo é lido e devolvido, mas não é desenhado', 'B3'],
  ['Seleção, cópia, preenchimento, alças no toque', 'funciona'],
]);
extra('Planilha', 'excel', [
  ['Abrir .xlsx/.xlsm com relatório de compatibilidade', 'funciona'],
  ['Salvar como Excel (tabelas, gráficos nativos, formas, imagens, validação, condicional, comentários)', 'funciona', 'falta confirmar no Excel de verdade (pendência do Elias)'],
  ['Macros, tabela dinâmica e segmentação guardadas e devolvidas', 'funciona', 'sem tela de edição', 'depois'],
  ['Conferência automática do arquivo salvo por leitor independente', 'falta', 'hoje só o próprio leitor do EFCdocs confere', 'B0'],
  ['Abrir .xls, .ods e .csv', 'falta', 'pedido de 05/11 (EFCdocs reduzido): planilhas comuns com máxima compatibilidade', 'B6'],
]);
extra('Planilha', 'desempenho', [
  ['Digitar numa planilha grande', 'com defeito', '1,2 s por digitação (5,4 s em PC fraco) com 360 mil células', 'B2'],
  ['Inserir linha e formatar muitas células', 'com defeito', '1,8 s e 1,2 s (8,9 s e 9,4 s em PC fraco)', 'B2'],
  ['Tamanho do app', 'parcial', '1,49 MB de código (512 KB compactado) num arquivo só; Planilha.jsx com 3.707 linhas', 'B2'],
]);
extra('App', 'visual', [
  ['Visual do Cwork (Claro e Escuro dourado, Fraunces e Source Sans 3)', 'falta', 'hoje: 16 temas, estilo Camadas, 9 a 11 tamanhos de letra por tela', 'B7'],
  ['Botões de 34 px no PC e 44 px no celular', 'com defeito', '34 alvos abaixo de 28 px na Página Inicial; no celular 39 de 40 abaixo de 44 px', 'B7'],
  ['Sem maiúsculas espaçadas', 'com defeito', '2 por tela no PC (títulos do menu), 8 no relatório de abertura', 'B7'],
  ['Sem emoji, sem rolagem de lado, console sem erros', 'funciona'],
  ['Nada da empresa fixo no código', 'funciona', 'conferido: nenhum nome da empresa no código-fonte'],
]);
extra('Documento', 'editor', [['Editor de documento, POP, formulários, Word e PDF', 'ainda não feito', 'só o modelo e as medidas existem (11 testes)', 'depois da Planilha']]);
writeFileSync(process.argv[2], '﻿' + linhas.map((l) => l.map(esc).join(';')).join('\r\n') + '\r\n');
console.log(n, 'funções'); console.log(JSON.stringify(cont, null, 0));
