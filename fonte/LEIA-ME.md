# EFCdocs · código-fonte

Este é o código que gera o app publicado na raiz do repositório.

- `src/nucleo/`: `dicas.js` (v0.4.2: frase "o que faz" e atalhos de cada botão), modelo de dados, diffs (desfazer/refazer), compactação, banco no aparelho (v0.4.1: cada gravação leva uma marca; duas abas com o mesmo arquivo não gravam uma por cima da outra), catálogo de comandos, perfis e preferências.
- `src/quadro/`: Post-its e Quadro (regras, geometria, tela, Kanban, desenho para PNG/PDF, PDF paisagem de várias folhas; v0.3.1: `tarefa.js` GUT, `legenda.js`, `assistente.js`, `modelos.js`).
- `src/planilha/` (v0.4.0): Planilha. `ref.js` endereços A1; `valores.js` erros, conversões e datas do Excel; `formula.js` leitor pt-BR/inglês e ajuste de referências; `nomesFuncoes.js` catálogo das funções; `funcoes.js` cálculo; `motor.js` recálculo; `formato.js` formatos do Excel; `entrada.js` digitação, séries e colar; `ajuda.js` dica, autocompletar e erros antes do Enter; `operacoes.js` mudanças (inserir/excluir, colar, abas, nomes); `grade.js` desenho em canvas; `formatoAuto.js` (v0.4.1) formato que a fórmula herda (data, hora, R$); `explicar.js` (v0.4.3) explicar a conta, causa do erro, lista de problemas e o desenho da conta; `receitas.js` (v0.4.3) montar a conta por pergunta; `entender.jsx` (v0.4.3) as janelas dessas ajudas; `Planilha.jsx`, `EditorFormula.jsx`, `partes.jsx` tela.
- Funções (v0.4.6, primeiro bloco): `nomesFuncoes.js` catálogo (TETO, ARREDMULTB, MODO, PERCENTIL, QUARTIL, ORDEM, CORREL, FREQUÊNCIA) e `funcoes.js` cálculo; MODO, ORDEM, PERCENTIL e QUARTIL são apelidos exatos dos nomes novos; FREQUÊNCIA derrama uma coluna.
- Assinatura (v0.4.5): `nucleo/assinatura.js` (regras puras: nome completo, rubrica em PNG, caminho suave do traço, foto vira rubrica com fundo transparente), `ui/assinatura.jsx` e `ui/assinatura.css` (a peça e a janela), `planilha/objetos.js` (objeto preso a uma célula; acompanha linhas e colunas inseridas ou excluídas). A rubrica fica só no arquivo, nunca em endereço de internet.
- `src/ui/`: menu, topo com faixa (v0.4.2: faixa compacta, botão "Mais"), janelas, páginas e ícones; `dica.jsx` (v0.4.2) mostra o quadro de dica ao parar o mouse num botão.
- `testes/`: testes das regras (`npm test`).
- `scripts/`: montagem (`npm run build` gera `dist/`), testes no navegador e página de aprovação.

Regras do projeto: nada de senha, chave ou dado real aqui; só chaves `efcdocs:` no aparelho e caches `efcdocs-`; o EFClaudian não é mexido por este repositório.
- Tela como no Excel (v0.4.7): `prefs.topo` (completa/compacta), botão `^` da faixa (`.rb-recolher` em `ui/faixa.jsx`), alça do menu oculto (`.menu-alca` em `App.jsx`), botão Esconder menu (`ui/menu.jsx`) e barra fx esticável (`planilha/Planilha.jsx`: `FX_MIN`/`FX_MAX`, `fxAlt` em `planilha-prefs`, alça `.pl-fx-alca`, Ctrl+Shift+U).
