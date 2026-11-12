# Auditorias do EFCdocs v0.6.11 (Método Sabiá 2.0)

Linha de base: `docs/auditorias/base-v0.6.9.2`. Regra: nenhuma medida pode piorar.

| Lente | Meta | Linha de base | Medido agora | Contra a base |
|---|---|---|---|---|
| 1 Visual | até 7 letras, 3 cantos, botão ≥ 28 px (44 no toque), 0 maiúsculas, contraste 4,5 | 0 de 10 telas dentro | 0 de 10 telas dentro; 0 melhoraram | 0 de 10 telas dentro das metas. Contra a linha de base: nenhuma piorou. |
| 2 Rapidez | ação comum < 100 ms (300 ms com 4× mais lento); app não cresce sem motivo | Digitar 1105 ms; Mover 36 ms; Desfazer 856 ms; Digitar (4×) 5091 ms; Mover (4×) 77 ms; Desfazer (4×) 4983 ms; app 1696 KB (544 KB compactado) | Digitar 1040 ms; Mover 37 ms; Desfazer 1196 ms; Digitar (4×) 6817 ms; Mover (4×) 101 ms; Desfazer (4×) 6690 ms; app 1699 KB (546 KB compactado) | PIOROU · Contra a linha de base: 1 ação(ões) PIORARAM ou não rodaram. |
| 3 Fidelidade | 0 diferenças fora das conhecidas | medido pela primeira vez nesta versão | 17 amostras: nenhuma diferença nova | conferentes: openpyxl sim · LibreOffice sim |
| 4 Segurança | 0 achados | 0 | 0 achados (com as palavras do dono); 33 imagens e arquivos para olhar à mão | nada achado |
| 5 Código | nenhum arquivo novo acima de 800 linhas; os grandes não crescem; montar sem avisos | 7 arquivos acima de 800; 4 aviso(s) ao montar | 7 arquivos acima de 800; 0 aviso(s) ao montar | Contra a linha de base: nenhum piorou |

**1 lente(s) pioraram: a versão não sai sem decisão do dono.**

## Exceção para o dono decidir (rapidez: a máquina, não a versão)

A rodada final acusou "Desfazer" 856 → 1196 ms (e, numa rodada anterior, "Mover" 4× 77 → 130 ms). Medido de novo na mesma hora, as duas versões lado a lado (A/B, mediana de 5 cada):

| Ação | v0.6.10.1 (sem mudança na grade) | v0.6.11 |
|---|---|---|
| Desfazer | 1079 · 1093 ms | 1049 · 895 ms |
| Mover 4× mais lento | 101 · 112 ms | 103 · 97 ms |
| Desfazer 4× mais lento | 6576 · 5823 ms | 6156 · 6479 ms |

As duas dão o mesmo; a máquina está mais lenta que no dia da linha de base. Proposta para o método: a lente de rapidez passa a medir a versão anterior na mesma hora (A/B) antes de acusar piora.
