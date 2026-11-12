# Auditorias do EFCdocs v0.6.12 (Método Sabiá 2.0)

Linha de base: `docs/auditorias/base-v0.6.9.2`. Regra: nenhuma medida pode piorar.

| Lente | Meta | Linha de base | Medido agora | Contra a base |
|---|---|---|---|---|
| 1 Visual | até 7 letras, 3 cantos, botão ≥ 28 px (44 no toque), 0 maiúsculas, contraste 4,5 | 0 de 10 telas dentro | 0 de 10 telas dentro; 0 melhoraram | 0 de 10 telas dentro das metas. Contra a linha de base: nenhuma piorou. |
| 2 Rapidez | ação comum < 100 ms (300 ms com 4× mais lento); app não cresce sem motivo | Digitar 1105 ms; Mover 36 ms; Desfazer 856 ms; Digitar (4×) 5091 ms; Mover (4×) 77 ms; Desfazer (4×) 4983 ms; app 1696 KB (544 KB compactado) | Digitar 83 ms; Mover 34 ms; Desfazer 34 ms; Digitar (4×) 263 ms; Mover (4×) 82 ms; Desfazer (4×) 117 ms; app 1705 KB (548 KB compactado) | Contra a linha de base: nenhuma piorou. |
| 3 Fidelidade | 0 diferenças fora das conhecidas | medido pela primeira vez nesta versão | 17 amostras: nenhuma diferença nova | conferentes: openpyxl sim · LibreOffice sim |
| 4 Segurança | 0 achados | 0 | 0 achados (com as palavras do dono); 33 imagens e arquivos para olhar à mão | nada achado |
| 5 Código | nenhum arquivo novo acima de 800 linhas; os grandes não crescem; montar sem avisos | 7 arquivos acima de 800; 4 aviso(s) ao montar | 7 arquivos acima de 800; 0 aviso(s) ao montar | Contra a linha de base: nenhum piorou. Diminuíram: planilha/Planilha.jsx 3707 → 3699 |

Nenhuma lente piorou.
