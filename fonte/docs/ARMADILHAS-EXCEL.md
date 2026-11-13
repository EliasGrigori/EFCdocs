# Armadilhas do Excel (.xlsx) · EFCdocs

O que o arquivo do Excel faz de diferente do que parece, aprendido em defeito de verdade. Ler antes de mexer em `src/planilha/xlsx/` (ler.js, gravar.js, estilos.js) e no anonimizador. Cada item diz o defeito ou limite da `MEMORIA-DO-PROJETO.md` onde apareceu. Atualizado na v0.6.13 (12/11/2026).

## Tabelas

1. **O nome de cada coluna da tabela tem de ser idêntico ao texto da célula do título.** Se não for, o Excel pede para reparar e apaga a tabela (D-03). Sem aparar espaço do fim, sem trocar a quebra de linha.
2. **Quebra de linha no nome da coluna** vai como `_x000a_` no atributo `name`. Na célula, o Excel às vezes guarda `\r\n` (`_x000D_` + quebra); no nome da coluna vai só `\n`. Quem troca texto (anonimizador) tem de tratar os dois como o mesmo texto (D-21).
3. **Título numérico**: o Excel guarda o título da tabela sempre como texto ("2024"). Se a célula do título estiver com o número 2024, o título tem de ir como texto na célula e no nome da coluna (D-20, corrigido na v0.6.11).
4. As fórmulas `Tabela1[Coluna]` e `[@Coluna]` viram endereços no EFCdocs; a conta é a mesma, o texto da fórmula não (L-02).
5. Filtro que coincide com a tabela vai **dentro** da tabela (`<autoFilter>` do `tableN.xml`); um filtro da aba que cruza a tabela não pode existir junto. A faixa do filtro também vai no nome escondido `_xlnm._FilterDatabase` (v0.6.8).

## Abas

6. O nome da aba pode ter **espaço no começo ou no fim** (ex.: "Resumo "). Fórmulas e links de outros arquivos usam o nome exato: nunca aparar (D-22, corrigido na v0.6.11). Até 31 letras; proibidos `[ ] : * ? / \`.
7. Fórmula que cita outra aba usa aspas simples quando o nome tem espaço ou acento: `'Resumo '!A1`, e aspas dentro do nome dobram (`''`).

## Linhas e colunas

8. `<col min="51" max="16384" hidden="1">` esconde **até o fim da aba**. Cortar em "último dado + 50" faz as outras reaparecerem no Excel (D-23): guardar a marca "até o fim" e gravar a faixa até 16384 (v0.6.11).
9. Largura em caracteres → pixels: `px = trunc(((256·w + trunc(128/7)) / 256) · 7)`. Coluna oculta guarda a largura também, para voltar igual ao reexibir (D-09).
10. Altura igual à padrão da aba é o mesmo que não ter altura; comparar sem ela.
11. Planilha real tem fórmulas copiadas até muito além do último dado. O EFCdocs deixa 1.000 linhas de folga e corta o resto, com aviso (L-04); acima de 300 mil células por aba (800 mil na pasta) a leitura para e avisa (L-07).

## Filtro e SUBTOTAL

12. **SUBTOTAL(9; …) ignora linhas escondidas PELO FILTRO, mas soma as escondidas à mão.** Quem diz que a linha está oculta "pelo filtro" é o filtro com critério. Se o critério se perde, o programa pode passar a somar a linha (D-24, corrigido na v0.6.11: critério que o app não entende é guardado como veio e devolvido). O LibreOffice não é conferente seguro aqui: numa planilha respeitou o filtro do original e noutra não. No Excel falta provar.
13. Critério de data do filtro vem como `<dateGroupItem year month dateTimeGrouping>`; critério de cor, "maiores que" e os 10 primeiros são outros elementos. O app só entende a lista de valores; os outros vão e voltam como vieram (v0.6.11).
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
24. Mesclada: o Excel grava as bordas em **cada** célula da faixa; quem desenha tem de mostrar só o contorno de fora (D-11 e D-17, corrigidos na v0.6.11).
25. Posição da rolagem ao abrir é o `topLeftCell` do `<pane>`; o congelamento é `xSplit`/`ySplit`. Mudar o primeiro não muda o congelamento (L-06).
26. **Partes que o app não edita voltam do original (v0.6.13, D-29, `src/planilha/xlsx/devolver.js`)**: macros, tabela dinâmica, segmentação, linha do tempo, botões e caixas de controle, suplementos. Cada aba lida guarda `aba.org` (a parte do original de onde veio); ao salvar, o app tira essas partes do original guardado no aparelho e refaz as ligações. O que tem de casar, senão o Excel pede reparo:
   - **tabela dinâmica**: aba → `pivotTableN.xml` → `pivotCacheDefinitionN.xml` → registros; e `<pivotCaches>` no livro com o mesmo `cacheId`. A fonte aponta pelo **nome** da aba (`worksheetSource sheet=`) ou da tabela (`name=`): aba renomeada muda junto; aba ou tabela apagada deixa a dinâmica sem fonte (aí não pedir `refreshOnLoad`);
   - **segmentação e linha do tempo**: a memória (`slicerCacheN.xml`) aponta para a tabela dinâmica por `tabId` (= posição da aba, que muda) e `name`, ou para a tabela por `tableId` e número da coluna (que mudam); cada memória precisa de um **nome definido** com o mesmo nome (`#N/A`); a aba lista as segmentações no `extLst` e o desenho tem a moldura (`sle:slicer`, dentro de `mc:AlternateContent`). Memória sem moldura não volta;
   - **controles**: o bloco `<controls>` da aba (dentro de `mc:AlternateContent`), o `ctrlPropN.xml`, a forma no desenho antigo (VML, `_x0000_sNNNN` = `shapeId`) e a forma-gêmea no desenho novo (`a14:compatExt spid=`). Anotações feitas no app dividem o mesmo VML: os números das formas não podem repetir e o `o:idmap` declara todos os blocos de 1.024;
   - **macros**: `vbaProject.bin` igual byte a byte, livro com o tipo `macroEnabled` (o arquivo sai .xlsm) e o `codeName` do livro e de cada aba (é por ele que o módulo da aba se liga).
   - **segmentação dentro de grupo**: o grupo vira forma do app; a segmentação volta solta (`absoluteAnchor`), no mesmo lugar, pela conta do grupo.
   - Ordem dos elementos da aba: `drawing`, `legacyDrawing`, `controls`, `tableParts`, `extLst`.
27. **Título de tabela que é só um espaço (" ") é válido** para o Excel; título vazio não é. Não aparar antes de decidir (D-28, v0.6.11.1).
28. **Os valores marcados num filtro são textos das células**: `<filter val="...">` e `<customFilter val>` têm de continuar iguais ao texto da célula, senão o filtro deixa de casar. `<dateGroupItem>` guarda a data de verdade. Quem troca os textos (anonimizador) troca os dois juntos (D-27, v0.6.11.1).
29. **Segmentação de dados**: o `sourceName` do `slicerCacheN.xml` é o nome da coluna da tabela (ou do campo da dinâmica) e tem de casar com ele; `caption` é a legenda que aparece. O `name` e o `cache` são identificadores e ficam (D-27).
30. Outros lugares onde sobra texto de quem fez a planilha: tinta (`xl/ink/`), suplementos (`xl/webextensions/`, propriedades), pessoas dos comentários (`xl/persons/`), `docProps/custom.xml`, aviso da validação (`prompt`, `error`), texto das conversas (`<text xml:space="preserve">`), gráfico novo (`xl/charts/chartEx`, prefixo `cx:`, com título e rótulos guardados) (D-32).
31. **Seta do filtro com painel congelado**: a coluna que rola para trás das congeladas não pode desenhar a seta (ela cai por cima do título congelado). Vale igual para linha (D-15, v0.6.11.1).
32. Texto feito só de espaços (alguém segurou a barra) é texto: passa por cima da vizinha vazia e esconde a linha da grade, igual no Excel (D-05, explicado).

## Como provar

- `npm run test:fidelidade`: ida e volta em todas as amostras, openpyxl e LibreOffice. Diferença nova faz o teste falhar.
- **O juiz do cálculo é o valor que o próprio Excel guardou no arquivo** (`<v>`), não o LibreOffice, quando a planilha usa FILTRO, ÚNICO e funções novas em cadeia (L-11). Cópia anonimizada não serve para isso: os valores guardados são dos dados antigos (L-12).
- `node scripts/fidelidade/conferir.mjs <arquivo.xlsx>`: o mesmo para um arquivo só (mostra endereços e contagens, nunca o texto das células).
- Item novo aqui: junto com o teste que prova o defeito.
33. **Tema com figura de fundo** (`<a:blipFill r:embed>` no `theme1.xml`) precisa da relação da figura (`xl/theme/_rels/theme1.xml.rels`). Parte que usa `r:id` sem relação é motivo de reparo (D-33, v0.6.13).
34. **Pedido de reparo se confere antes de mandar**: `python3 scripts/fidelidade/conferir-estrutura.py arquivo.xlsx` (relações, tipos de conteúdo, XML bem formado, `r:id` sem relação, nomes das segmentações, ordem dos elementos da aba). Roda sozinho na rede de fidelidade (v0.6.13).
35. **Prefixo em `Requires` e `mc:Ignorable` também precisa de declaração.** `<mc:Choice Requires="x14">` sem `xmlns:x14` em algum ancestral: o Excel pede reparo e **apaga a aba**. O minidom, o lxml e o esquema oficial só avisam ou nem veem. Pedaço copiado de um arquivo para outro leva as declarações que usa, inclusive as de `Requires` (D-50, v0.6.14, arquivo real do Elias). Conferir com `python3 scripts/fidelidade/conferir-regras.py arquivo.xlsx`.
36. **Célula sem `s=""` usa o estilo 0 do arquivo** (o "Normal"): pode ter letra 10, outra fonte ou "centralizado no meio". A letra do Normal é a fonte 0 e o Excel mede as larguras das colunas com ela (D-46, D-48, v0.6.14).
37. **Coluna e linha formatadas inteiras**: `<col style="N">` e `<row s="N" customFormat="1">`. A célula que não existe no XML mostra esse estilo (a linha vale mais que a coluna) e a célula nova nasce com ele; célula que existe sem `s` usa o 0, não o da coluna (D-47, v0.6.14).
38. **Nome definido com `localSheetId`** vale só naquela aba; o mesmo nome pode existir em várias abas e no livro todo. Ao juntar, o do livro todo é o que as outras abas usam (D-49, v0.6.14).
39. **Colunas ocultas "até o fim" podem parar na penúltima** (`max="16383"`, com a XFD visível) e vir em pedaços seguidos (`13–32`, `33–16382`, `16383`, `16384`). Juntar os pedaços antes de decidir onde a faixa começa e termina (D-39, D-52, v0.6.14).
40. **Borda tem tipo** (`dotted`, `dashed`, `double`, `hair`...) além da espessura, e o preenchimento pode ser degradê (`gradientFill`) ou hachurado (D-53, D-54, v0.6.14).
41. **Números dos objetos do desenho (`cNvPr id`) não se repetem** na mesma aba; o do controle de formulário tem de casar com o `spid` do desenho antigo (VML) e não muda (D-55, v0.6.14).
42. **A rede de fidelidade faz o caminho do app**: ler → limpar como quando a planilha fica guardada no aparelho → gravar. Sem a limpeza, a rede não via o D-51 (grupos refeitos depois de guardar).
