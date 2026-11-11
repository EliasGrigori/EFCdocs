# EFCdocs · Fase 0: varredura, estudo de fora e base nova (10 e 11/11/2026)

Pedido do Elias (10/11): varredura do sistema inteiro, estudo de fora do que os melhores modelos e o código aberto permitem, uma base bem estruturada e a Planilha melhorada, no padrão do Cwork e do Método Sabiá. Decisões dele: manter todas as funções atuais, consertar o básico que não funciona, deixar bonito e moderno; visual do Cwork aprovado; pode usar código aberto de clone do Excel como base; ferramenta de anonimização aprovada. Modelo: **Fable 5.2 · alto**.

Nesta fase **nada do app mudou**. O que foi feito: medições, estudo, a ferramenta de anonimização (com testes) e os modelos de tela. O código do app continua o da v0.6.9.2 (pronta, não publicada).

Tudo aqui foi medido com amostras **inventadas**. A planilha real só foi usada dentro da área de rascunho para conferir a ferramenta de anonimização; nenhum dado dela está neste documento, nos prints ou no projeto.

## 1. Varredura: nota por módulo

Nota de 0 a 10, pelo que foi medido. "Funciona" quer dizer: está ligado no app e passa nos testes automáticos (317 de regras e 249 de navegador). Não conferi os 311 comandos um a um à mão.

| Módulo | Nota | Por quê |
|---|---|---|
| Planilha · motor de cálculo | 7 | 136 funções, fórmulas do Excel 365, explica a conta. Falha: a cada digitação a planilha inteira é reprocessada |
| Planilha · desenho da grade | 5 | Rolagem fluida (60 quadros por segundo em 360 mil células). Defeitos reproduzidos: borda no meio das mescladas e "caixinha" no canto (D-11), estilo de tabela do Excel não é desenhado; linha cortada no congelado (D-15) ainda por analisar |
| Planilha · Excel (abrir e salvar) | 7 | Guarda e devolve o que não entende; tabelas, gráficos, formas, validação. Falta um conferente de fora (hoje só o próprio EFCdocs confere o que gravou) e a confirmação no Excel de verdade |
| Planilha · tabela, imagem, validação | 4 | Existem, mas são janelas simples e objetos "mortos" (estudo de 04/11) |
| Planilha · rapidez ao editar | 3 | Digitar e Enter: 1,2 s em 360 mil células (5,4 s em PC fraco). Causa achada (seção 2) |
| Quadro (Post-its) | 8 | 77 comandos, testes passando, sem relatos de defeito. Só o visual sai do padrão do Cwork |
| Documento | 1 | Só o modelo e as medidas (11 testes); o editor não existe |
| Visual (padrão do Cwork) | 4 | 9 a 11 tamanhos de letra por tela (meta 5 a 7), 5 a 6 tipos de canto (meta 3), 34 botões com menos de 28 px na Página Inicial, no celular 39 de 40 abaixo de 44 px |
| Código e estrutura | 5 | Motor separado das telas (bom). `Planilha.jsx` com 3.707 linhas e `estilo-base.css` com 3.111; 3 chaves repetidas (2 ícones e 1 tipo de gráfico) |
| Testes | 6 | 317 + 249, console limpo. Fraquezas: suíte de navegador encadeada (15 min, um caso depende do outro), nenhuma planilha com a complexidade da real, nenhum conferente de fora |
| Método de entrega | 8 | Página de aprovação, roteiro do Grok, memória do projeto. Falta o `features.csv` e a suíte por módulo do Sabiá |

### Auditoria visual (padrão do Cwork), por tela

Medido no app atual, 1366×700 (PC) e 384×790 (celular). Nas telas de janela, a contagem inclui o que aparece atrás dela.

| Tela | Tamanhos de letra | Tipos de canto | Sombras diferentes | Alvos de toque | Abaixo de 28 px | Abaixo de 34 px | Maiúsculas espaçadas |
|---|---|---|---|---|---|---|---|
| Início | 9 | 5 | 9 | 17 | 0 | 0 | 2 |
| Abrir Excel (relatório) | 11 | 6 | 15 | 20 | 0 | 1 | 8 |
| Planilha · Página Inicial | 10 | 5 | 9 | 76 | 34 | 38 | 2 |
| Planilha · Inserir | 10 | 5 | 9 | 55 | 4 | 8 | 2 |
| Planilha · Exibir | 10 | 5 | 10 | 65 | 25 | 29 | 2 |
| Janela Formatar como tabela | 11 | 6 | 12 | 71 | 11 | 16 | 3 |
| Janela Validação de dados | 11 | 6 | 13 | 62 | 12 | 20 | 2 |
| Janela Formatar células | 11 | 6 | 12 | 63 | 4 | 21 | 2 |
| Quadro | 10 | 5 | 13 | 54 | 10 | 19 | 2 |
| Opções | 10 | 6 | 11 | 29 | 0 | 2 | 2 |
| Celular · Planilha · Página Inicial | 6 | 3 | 5 | 40 | 1 | 9 (39 abaixo de 44 px) | 0 |
| Celular · Janela Validação | 7 | 5 | 12 | 52 | 8 | 21 (51 abaixo de 44 px) | 0 |

Passou: nenhum emoji, nenhuma rolagem de lado, console sem erros nas 42 telas medidas, nenhum nome de empresa fixo no código.

O modelo novo (seção 5), medido do mesmo jeito: 5 tamanhos de letra de interface, 3 tipos de canto, nenhuma maiúscula espaçada, menor alvo 28 px no PC (só o botão de nova aba) e 44 px no celular.

## 2. Por que está lento (provado)

Planilha inventada de 12.000 linhas × 30 colunas (360 mil células, bordas, cores, 12 mil fórmulas, congelada).

| Ação | PC normal | PC 4× mais lento |
|---|---|---|
| Abrir o arquivo | 1,1 s | 5,5 s |
| Rolar (150 quadros) | 16,7 ms por quadro (60 por segundo) | 27 ms (36 por segundo) |
| **Digitar um número e Enter** | **1,2 s** | **5,4 s** |
| Mover a seleção com a seta | 0,16 s | 0,6 s |
| Inserir uma linha no topo | 1,8 s | 8,9 s |
| Negrito em 20 mil células | 1,2 s | 9,4 s |

Para onde vai o tempo de uma digitação (perfil do processador): compactar a planilha inteira para salvar (187 ms), montar de novo o índice das células cheias (176 ms), o motor recalcular (53 ms + 176 ms de apoio), procurar a área usada, rodar a Verificação na planilha toda e converter endereços "A1" em números milhares de vezes. Ou seja: **cada tecla custa o tamanho da planilha**. O desenho da grade não é o problema.

Correção (v0.6.12 do plano): guardar as células por linha e coluna (sem varrer tudo), atualizar os índices só onde mudou, recalcular só o que depende da célula, e salvar em segundo plano depois que a pessoa para de digitar. Meta: menos de 0,1 s por digitação no PC normal e menos de 0,3 s no PC fraco, na mesma planilha.

Outros números: o app tem 1,49 MB de código (512 KB compactado) num arquivo só; dá para carregar Planilha, Quadro e PDF só quando abrem.

## 3. Estudo de fora: os clones do Excel de código aberto

Pesquisa feita em 10/11/2026 (fontes no fim) e um teste prático com o Univer 1.4.0.

| Projeto | Licença | Estado | O que tem | O que falta para nós |
|---|---|---|---|---|
| **Univer** (sucessor do Luckysheet) | Apache-2.0 no núcleo; parte "Pro" é paga | Muito ativo, v1.4.0 | Grade em canvas, fórmulas, formatação condicional, validação, filtros, tabelas, mescladas bem desenhadas | **Abrir e salvar .xlsx, imprimir, gráficos, tabela dinâmica e formas são do Pro**, e o Pro pede um servidor de conversão e licença. O EFCdocs funciona sem servidor |
| FortuneSheet | MIT | Antes da 1.0, ritmo lento | Grade em React, fórmulas, mescla, congelar, condicional, validação | Sem gráficos, sem tabelas; .xlsx só por complemento de terceiros |
| Luckysheet | MIT | Arquivado (virou o Univer) | — | Não usar |
| x-spreadsheet | MIT | Parado | Grade simples | Muito menos do que já temos |
| Jspreadsheet CE | MIT | Ativo | Grade de dados | Não é fiel ao Excel; recursos avançados são pagos |
| IronCalc | MIT / Apache-2.0 | Começo de vida | Motor em Rust com .xlsx | Sem gráficos, sem mescladas completas; cedo demais |
| HyperFormula | GPL-3.0 ou paga | Ativo | Só motor de fórmulas | A GPL obrigaria a abrir todo o código de quem usa |
| SheetJS CE | Apache-2.0 | Ativo (fora do npm) | Lê .xlsx, .xls, .ods, .csv | A edição grátis não grava estilos |
| ExcelJS | MIT | Manutenção lenta | Lê e grava .xlsx com estilos, tabelas, validação | Sem gráficos |
| OnlyOffice, Collabora | AGPL / MPL | Ativos | Suíte completa | Precisam de servidor; AGPL |

### Teste prático: EFCdocs × Univer na mesma planilha de 360 mil células

| Medida | EFCdocs v0.6.9.2 | Univer 1.4.0 (núcleo aberto) |
|---|---|---|
| Tamanho do código | 1,49 MB (0,5 MB compactado), **com** Excel, gráficos, PDF e Quadro | 12,0 MB (2,9 MB compactado), **sem** Excel, gráficos e impressão |
| Memória com a planilha aberta | 70 MB | 229 MB |
| Digitar e Enter | 1,2 s | 0,65 s |
| Inserir uma linha no topo | 1,8 s | 9,4 s |
| Negrito em 20 mil células | 1,2 s | 8,2 s |
| Mescladas com borda | com defeito (D-11) | desenha certo |

No Univer, inserir linha e negrito foram feitos pela interface de programação dele, não pelo teclado; pela tela os números podem ser diferentes.

### Conclusão do estudo

Trocar a Planilha inteira por um clone **não** resolve e custa caro:

1. O que o clone aberto mais completo (Univer) não tem é justamente o que o EFCdocs já faz e você mandou manter: abrir e salvar Excel, gráficos, formas, imprimir, guardar e devolver o que não entende.
2. Ele não é mais rápido no geral, pesa 8 vezes mais e usa 3 vezes mais memória.
3. Seria uma troca de uma vez só, contra o Método Sabiá (versões pequenas) e com risco alto de perder função.

**Recomendação:** manter o motor do EFCdocs, reestruturar a base e usar o código aberto de três jeitos:

- **Como referência**, com crédito no projeto (Apache-2.0 e MIT permitem): desenho de mescladas e bordas, tabela viva (crescer, Tab, alça) e preenchimento automático, vendo como o Univer e o FortuneSheet resolveram.
- **Como conferentes de fora nos testes**: LibreOffice (abre, recalcula e desenha o arquivo que o EFCdocs gravou; está instalado no ambiente e funcionou), openpyxl e ExcelJS (leem a estrutura). Isso cobre boa parte do que hoje só o Excel do Elias confirma.
- **Como leitor de formatos antigos**: SheetJS CE para abrir .xls, .ods e .csv (pedido de 05/11).

O que os modelos mais fortes mudam: dá para fazer a reestruturação com rede de segurança (testes de fidelidade célula a célula, perfil de desempenho, auditoria visual automática por tela), em vez de consertar um defeito por vez no escuro.

## 4. Base nova (padrão Sabiá)

1. **`features.csv`** no repositório: 311 funções hoje (244 funcionam, 49 ainda não feitas, 10 com defeito, 4 parciais, 4 faltam). Toda versão atualiza a situação. Gerado por `scripts/auditoria/features.mjs`.
2. **Módulos com fronteira**: `planilha/modelo`, `planilha/motor`, `planilha/grade`, `planilha/excel`, `planilha/objetos`, `planilha/tabelas`, `planilha/telas`; `Planilha.jsx` (3.707 linhas) é dividido aos poucos, uma parte por versão, sem mudar comportamento.
3. **Uma suíte por módulo**, cada uma roda sozinha (hoje a de navegador é encadeada e leva 15 min).
4. **Planilha anonimizada como teste fixo** + **três conferentes de fora** (LibreOffice, openpyxl, comparação célula a célula de ida e volta).
5. **Auditoria automática** em toda versão: visual por tela (`scripts/auditoria/visual.mjs`), desempenho (`desempenho-editar.mjs`, `desempenho-abrir-rolar.mjs`), com metas escritas.
6. **Visual do Cwork num lugar só**: um arquivo de medidas e cores (Claro e Escuro), fontes Fraunces e Source Sans 3 embutidas no app (para funcionar sem internet), componentes base (botão, campo, janela, gaveta, faixa). Os 16 temas saem.
7. **`docs/`** com as regras: padrão visual, regras do Excel (armadilhas), método, créditos do código aberto usado.

O formato do arquivo salvo e do .xlsx não muda: a troca é por dentro.

## 5. Modelo de tela (visual do Cwork)

Quatro desenhos parados com dados inventados: PC claro, PC escuro, celular claro, celular escuro (na página de aprovação). O que muda:

- Menu lateral, barra de busca, título serifado com traço dourado e abas iguais aos do Cwork.
- Faixa de comandos em **uma linha**, botões de 36 px (44 px no toque), com um botão "Todos os comandos" no fim e a busca "O que você quer fazer?" (que já existe). As 150 funções continuam todas; mudam de lugar, não somem.
- Grade com cabeçalhos em marfim, seleção em ouro, abas de baixo com ponto de cor.
- Celular: barra de cima curta, faixa que rola de lado, menu de baixo.

## 6. Plano de versões (pequenas, uma por vez)

A numeração continua na v0.6.x para o plano antigo (v0.7.0 Documento em diante) não mudar de número.

| Versão | Nome | O que entra | Modelo · esforço |
|---|---|---|---|
| v0.6.10 | Rede de segurança | Planilha anonimizada como teste; 3 conferentes de fora; suíte dividida por módulo; `features.csv` e `docs/`; as 4 correções da v0.6.9.2 | Opus 5 · alto |
| v0.6.11 | Básico que não funciona | Mescladas (D-11 e caixinha), linha cortada no congelado (D-15), título sob o botão de filtro, D-05 e D-06 com a planilha anonimizada, chaves repetidas | Opus 5 · alto |
| v0.6.12 | Rápida | Digitar em menos de 0,1 s numa planilha de 360 mil células; salvar em segundo plano; app carregado por partes | Fable 5.2 · alto |
| v0.6.13 | Cara do Cwork | Casca, faixa de uma linha, janelas e celular no visual do Cwork; fontes embutidas; 2 temas | Opus 5 · alto |
| v0.6.14 | Tabelas vivas | Crescer ao digitar, Tab abre linha, alça no canto, aba Design, estilos de tabela do Excel desenhados | Opus 5 · alto |
| v0.6.15 | Imagens e objetos | Formato da Imagem: cortar, girar, moldura, frente e trás, mover com as células | Opus 5 · médio |
| v0.6.16 | Validação e mescladas | Prévia em frase, marcar inválidos, Mesclar através, passada de refinamento | Sonnet 5.5 · alto |
| v0.6.17 | Planilhas comuns | Abrir .xls, .ods e .csv | Sonnet 5.5 · alto |
| depois | v0.7.0 em diante | Documento, pastas, nuvem, ligação com o Cwork, v1.0 | — |

A ordem entre "Rápida" e "Cara do Cwork" pode trocar: é decisão do Elias.

## 7. Ferramenta de anonimização (pronta)

`anonimizar-planilha.html`: um arquivo só, abre com dois cliques, funciona sem internet. Escolhe a planilha, troca os dados e baixa a cópia.

- **Troca**: textos (mesmo tamanho, mesmas maiúsculas e pontuação, zeros à esquerda mantidos), números (até 30% para cima ou para baixo, mesmas casas; código de 5 ou mais dígitos troca os dígitos), datas (todas andam o mesmo número de dias), horas, textos entre aspas nas fórmulas, comentários, textos de formas e gráficos, listas de validação, cabeçalho e rodapé, imagens (viram um quadro cinza do mesmo tamanho), autor e empresa do arquivo, endereços de links.
- **Apaga**: dados da impressora, dados de fora (`customXml`), macros, o caminho da pasta do computador que o Excel grava dentro do arquivo.
- **Mantém**: cores, bordas, larguras, alturas, mesclas, congelamento, colunas ocultas, tabelas, validações, formatação condicional, a conta e os endereços das fórmulas, os números 0 e 1, os **nomes das abas, das tabelas e os nomes definidos** (a página lista todos para você conferir).
- **Confere sozinha**: procura na cópia os textos mais compridos do original e avisa se algum sobrou.

Como foi testada: 10 testes automáticos com amostra inventada "com cara de dado sensível"; a página rodada no navegador (PC e celular, sem nenhum pedido à internet); a cópia abre no EFCdocs, no LibreOffice e no openpyxl; na planilha real (só no rascunho), a estrutura da cópia ficou idêntica (0 diferenças em células, estilos, mesclas, larguras, tabelas) e nada do original sobrou. A própria conferência achou e me fez corrigir dois vazamentos durante o desenvolvimento (o caminho da pasta do computador e um tipo de célula de texto).

**O que não deu para provar aqui:** que o Excel de verdade abre a cópia sem pedir reparo. É o primeiro item para o Elias conferir.

## 8. Pendências e limites desta fase

- D-15 (linha cortada abaixo do congelado): ainda sem causa provada. Hipótese: a rolagem por toque para no meio da linha e o Excel sempre encaixa em linha inteira.
- A planilha real que tenho no rascunho é antiga (sem a tabela verde dos prints novos). A cópia anonimizada da versão atual do Elias resolve isso.
- O Quadro e o Documento não foram reavaliados além dos testes e da auditoria visual.
- O teste do Univer usou a configuração padrão do núcleo aberto; não testei a versão paga.

## Fontes do estudo

- [Univer no GitHub](https://github.com/dream-num/univer)
- [Univer: importar e exportar](https://docs.univer.ai/guides/sheets/features/import-export)
- [Univer Pro: licença](https://docs.univer.ai/guides/pro/license)
- [Comparação de bibliotecas de planilha na web (ago/2026)](https://www.pistack.xyz/posts/2026-08-14-web-spreadsheet-libraries-univer-handsontable-luckysheet-guide/)
- [IronCalc no GitHub](https://github.com/ironcalc/IronCalc)
- [FortuneSheet no GitHub](https://www.github.com/ruilisi/fortune-sheet)
- [SheetJS × ExcelJS em 2026](https://www.pkgpulse.com/guides/sheetjs-vs-exceljs-vs-node-xlsx-excel-files-node-2026)
- [Jspreadsheet: planilhas de código aberto](https://bossanova.uk/jspreadsheet/blog/open-source-javascript-spreadsheet)
- [Univer 1.0 e outras suítes abertas](https://www.besthub.dev/articles/univer-1-0-euro-office-divergent-open-source-strategies-for-online-office-2fa734c79bf8)
