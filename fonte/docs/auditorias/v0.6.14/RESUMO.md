# Auditorias · v0.6.14 (13/11/2026)

Linha de base: `docs/auditorias/base-v0.6.12` (rapidez e visual da v0.6.12; tamanho do app trocado para o da v0.6.13 publicada, commit d0c1d91).
Rodadas: completa (13/11) e de novo a rapidez e o código depois de dois acertos (funcoes.js voltou a 1058 linhas; tamanho do app contra a v0.6.13).

| Lente | Meta | Linha de base | Medido agora | Contra a base |
|---|---|---|---|---|
| 1 Visual | até 7 letras, 3 cantos, botão ≥ 28 px (44 no toque), 0 maiúsculas, contraste 4,5 | 0 de 10 telas dentro | 0 de 10 telas dentro; 0 melhoraram | 0 de 10 telas dentro das metas. Contra a linha de base: nenhuma piorou. |
| 2 Rapidez | ação comum < 100 ms (300 ms com 4× mais lento); app não cresce sem motivo | Digitar 83 ms; Mover 34 ms; Desfazer 34 ms; Digitar (4×) 263 ms; Mover (4×) 82 ms; Desfazer (4×) 117 ms; app 1728 KB (556 KB compactado) | Digitar 67 ms; Mover 34 ms; Desfazer 34 ms; Digitar (4×) 216 ms; Mover (4×) 83 ms; Desfazer (4×) 102 ms; app 1736 KB (560 KB compactado) | Contra a linha de base: nenhuma piorou. |
| 3 Fidelidade | 0 diferenças fora das conhecidas | medido pela primeira vez nesta versão | 18 amostras: nenhuma diferença nova; planilha(s) de fora: nenhuma nova | conferentes: openpyxl sim · LibreOffice sim |
| 4 Segurança | 0 achados | 0 | 0 achados (com as palavras do dono); 34 imagens e arquivos para olhar à mão | nada achado |
| 5 Código | nenhum arquivo novo acima de 800 linhas; os grandes não crescem; montar sem avisos | 7 arquivos acima de 800; 4 aviso(s) ao montar | 7 arquivos acima de 800; 0 aviso(s) ao montar | Contra a linha de base: nenhum piorou. Diminuíram: planilha/Planilha.jsx 3707 → 3703 |

O visual (0 de 10 telas dentro das metas) é o mesmo da linha de base: as metas visuais são o assunto da v0.6.15 ("Cara do Cwork").
