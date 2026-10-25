# EFCdocs · código-fonte

Este é o código que gera o app publicado na raiz do repositório.

- `src/nucleo/`: modelo de dados, diffs (desfazer/refazer), compactação, banco no aparelho (v0.4.1: cada gravação leva uma marca; duas abas com o mesmo arquivo não gravam uma por cima da outra), catálogo de comandos, perfis e preferências.
- `src/quadro/`: Post-its e Quadro (regras, geometria, tela, Kanban, desenho para PNG/PDF, PDF paisagem de várias folhas; v0.3.1: `tarefa.js` GUT, `legenda.js`, `assistente.js`, `modelos.js`).
- `src/planilha/` (v0.4.0): Planilha. `ref.js` endereços A1; `valores.js` erros, conversões e datas do Excel; `formula.js` leitor pt-BR/inglês e ajuste de referências; `nomesFuncoes.js` catálogo das funções; `funcoes.js` cálculo; `motor.js` recálculo; `formato.js` formatos do Excel; `entrada.js` digitação, séries e colar; `ajuda.js` dica, autocompletar e erros antes do Enter; `operacoes.js` mudanças (inserir/excluir, colar, abas, nomes); `grade.js` desenho em canvas; `formatoAuto.js` (v0.4.1) formato que a fórmula herda (data, hora, R$); `Planilha.jsx`, `EditorFormula.jsx`, `partes.jsx` tela.
- `src/ui/`: menu, topo com faixa, janelas, páginas e ícones.
- `testes/`: testes das regras (`npm test`).
- `scripts/`: montagem (`npm run build` gera `dist/`), testes no navegador e página de aprovação.

Regras do projeto: nada de senha, chave ou dado real aqui; só chaves `efcdocs:` no aparelho e caches `efcdocs-`; o EFClaudian não é mexido por este repositório.
