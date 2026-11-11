# Armadilhas do Excel (.xlsx) · EFCdocs

O que o arquivo do Excel faz de diferente do que parece, aprendido em defeito de verdade. Ler antes de mexer em `src/planilha/xlsx/` (ler.js, gravar.js, estilos.js) e no anonimizador. Cada item diz o defeito ou limite da `MEMORIA-DO-PROJETO.md` onde apareceu. Atualizado na v0.6.10 (11/11/2026).

## Tabelas

1. **O nome de cada coluna da tabela tem de ser idêntico ao texto da célula do título.** Se não for, o Excel pede para reparar e apaga a tabela (D-03). Sem aparar espaço do fim, sem trocar a quebra de linha.
2. **Quebra de linha no nome da coluna** vai como `_x000a_` no atributo `name`. Na célula, o Excel às vezes guarda `\r\n` (`_x000D_` + quebra); no nome da coluna vai só `\n`. Quem troca texto (anonimizador) tem de tratar os dois como o mesmo texto (D-21).
3. **Título numérico**: o Excel guarda o título da tabela sempre como texto ("2024"). Se a célula do título estiver com o número 2024, o EFCdocs hoje solta a tabela ao gravar (D-20, aberto): o título tem de ir como texto.
4. As fórmulas `Tabela1[Coluna]` e `[@Coluna]` viram endereços no EFCdocs; a conta é a mesma, o texto da fórmula não (L-02).
5. Filtro que coincide com a tabela vai **dentro** da tabela (`<autoFilter>` do `tableN.xml`); um filtro da aba que cruza a tabela não pode existir junto. A faixa do filtro também vai no nome escondido `_xlnm._FilterDatabase` (v0.6.8).

## Abas

6. O nome da aba pode ter **espaço no começo ou no fim** (ex.: "Resumo "). Fórmulas e links de outros arquivos usam o nome exato (D-22, aberto). Até 31 letras; proibidos `[ ] : * ? / \`.
7. Fórmula que cita outra aba usa aspas simples quando o nome tem espaço ou acento: `'Resumo '!A1`, e aspas dentro do nome dobram (`''`).

## Linhas e colunas

8. `<col min="51" max="16384" hidden="1">` esconde **até o fim da aba**. Cortar em "último dado + 50" faz as outras reaparecerem no Excel (D-23, aberto).
9. Largura em caracteres → pixels: `px = trunc(((256·w + trunc(128/7)) / 256) · 7)`. Coluna oculta guarda a largura também, para voltar igual ao reexibir (D-09).
10. Altura igual à padrão da aba é o mesmo que não ter altura; comparar sem ela.
11. Planilha real tem fórmulas copiadas até muito além do último dado. O EFCdocs deixa 1.000 linhas de folga e corta o resto, com aviso (L-04); acima de 300 mil células por aba (800 mil na pasta) a leitura para e avisa (L-07).

## Filtro e SUBTOTAL

12. **SUBTOTAL(9; …) ignora linhas escondidas PELO FILTRO, mas soma as escondidas à mão.** Quem diz que a linha está oculta "pelo filtro" é o filtro com critério. Se o critério se perde, o programa pode passar a somar a linha (D-24, aberto). O LibreOffice não é conferente seguro aqui: numa planilha respeitou o filtro do original e noutra não. No Excel falta provar.
13. Critério de data do filtro vem como `<dateGroupItem year month dateTimeGrouping>`; critério de cor, "maiores que" e os 10 primeiros são outros elementos. Hoje o EFCdocs só entende a lista de valores.
14. `<sortState>` (ordenação guardada, inclusive por cor) vem junto do filtro.

## Números, datas e textos

15. Formatos embutidos 14 e 20 a 22 (data curta, hora) **dependem do idioma**: o openpyxl diz `mm-dd-yy` e `h:mm`, o Excel em português mostra `dd/mm/yyyy` e `hh:mm`. O EFCdocs grava por extenso (`estilos.js`, `FORMATOS_EMBUTIDOS`).
16. Texto com `_xHHHH_` é escape (`_x000D_` = retorno, `_x000a_` = quebra). Um `_x` de verdade no texto vai como `_x005F_x`.
17. `t="inlineStr"` sem `<is>` é célula vazia, não texto vazio. Texto vazio (`""`) conta no CONT.VALORES; vazio não.
18. Cor do tema: o índice 0 é `lt1` e o 1 é `dk1` (trocados em relação à ordem do `theme1.xml`); o 2 é `lt2` e o 3 é `dk2`. O `tint` clareia ou escurece em HLS.

## Fórmulas e valores guardados

19. O valor guardado (`<v>`) da fórmula pode faltar ou estar velho. `fullCalcOnLoad="1"` em `<calcPr>` manda o Excel (e o LibreOffice) recalcular ao abrir. O anonimizador liga isso, porque troca os números e não recalcula.
20. Funções novas vêm com prefixo: `_xlfn.UNIQUE`, `_xlws.FILTER`, `_xlfn.ANCHORARRAY` (o `#` do derramamento). LibreOffice 24.2 ainda não conhece todas: o `#NOME?` dele não é erro do EFCdocs.
21. `TEXTO(data; "mmmm")` depende do idioma: no LibreOffice em inglês dá "January". O conferente roda o LibreOffice em pt-BR.
22. Fórmula compartilhada (`t="shared"`) e de matriz (`t="array"`) guardam o texto só na primeira célula.

## Validação, mescladas e outros

23. Validação de lista que aponta para **outra aba** vai em `<extLst>` como `x14:dataValidation` (o openpyxl não lê; o conferente lê direto do XML).
24. Mesclada: o Excel grava as bordas em **cada** célula da faixa; quem desenha tem de mostrar só o contorno de fora (D-11, D-17, abertos).
25. Posição da rolagem ao abrir é o `topLeftCell` do `<pane>`; o congelamento é `xSplit`/`ySplit`. Mudar o primeiro não muda o congelamento (L-06).
26. Partes que o EFCdocs não entende (macros, tabela dinâmica, segmentação) são guardadas e devolvidas como vieram.

## Como provar

- `npm run test:fidelidade`: ida e volta em todas as amostras, openpyxl e LibreOffice. Diferença nova faz o teste falhar.
- `node scripts/fidelidade/conferir.mjs <arquivo.xlsx>`: o mesmo para um arquivo só (mostra endereços e contagens, nunca o texto das células).
- Item novo aqui: junto com o teste que prova o defeito.
