# Linha de base das auditorias: v0.6.21 parte 1 (Método Sabiá 2.1, kit 2.1.0)

Definida em 15/11/2026, a pedido do Elias ("defina a linha de base das cinco auditorias do EFCdocs com os programas do kit"), no código da **v0.6.21 parte 1** (faixa da Página Inicial), aprovada inteira em 15/11/2026 e ainda não publicada. Medida antes de qualquer mudança da parte 2.

Regra de barrar (uma só): **nenhuma medida de programa pode piorar contra esta base; tela ou ação nova tem de bater a meta.** As medidas de olho vão para a lista de conferência da página de aprovação.

| Lente | Programa | Arquivo aqui | Medido |
|---|---|---|---|
| 1 Visual | `scripts/sabia/auditoria-visual.mjs` com `scripts/auditoria/efcdocs.config.json` | `auditoria-visual.json` e `.md` | 14 telas (10 no PC, 4 no celular): **12 dentro das metas**; fora: "Abrir Excel (relatório)" no PC e no celular, com 8 tamanhos de letra (meta 7) |
| 2 Rapidez | `scripts/sabia/auditoria-rapidez.mjs` (mediana de 5, planilha de 360 mil células) | `auditoria-rapidez.json` e `.md` | digitar 50 ms, mover 34 ms, desfazer 34 ms; com o processador 4 vezes mais lento: 203, 66 e 98 ms. **Tudo dentro da meta** (100 ms e 300 ms) |
| 2 Rapidez (olho com número) | tamanho de js, css e html de `dist/` | `codigo.json › tamanhoApp` | 1.898 KB (613 KB compactado) |
| 3 Fidelidade | `scripts/fidelidade/conferir.mjs` (ida e volta do .xlsx, openpyxl, LibreOffice em pt-BR) | `fidelidade.txt` | 22 amostras: **nenhuma diferença nova**; 13 diferenças conhecidas (lista em `testes/fidelidade/conhecidas.mjs`) |
| 3 Fidelidade | `scripts/fidelidade/ida-e-volta.mjs` (banco do aparelho: planilha, documento e quadro; PDF do Quadro; trava do Word) | `ida-e-volta.txt` | 46 conferências, **0 diferenças**, 0 puladas (programa novo: primeira medida) |
| 4 Segurança | `scripts/sabia/varredura-sensivel.py` na raiz do repositório, com as palavras do dono (lista fora do projeto) | `seguranca.txt` | **0 achados** em 439 arquivos de texto; 52 imagens e arquivos de escritório para olhar à mão |
| 5 Código | `scripts/sabia/medir-codigo.py` e o montador | `codigo.json` | 7 arquivos acima de 800 linhas (os mesmos de antes); **0 avisos ao montar**; suíte de regras 396 de 396 |

## O que mudou em relação à base anterior (`base-v0.6.12`)

- A base antiga misturava três datas (visual e código da v0.6.9.2, rapidez da v0.6.12, tamanho da v0.6.20). Esta é uma medida só, de um código só.
- A auditoria visual passou de 6 para 10 telas: entraram as abas **Layout da Página, Fórmulas, Revisão e Exibir** da faixa, medidas antes de serem refeitas, para a comparação das próximas partes da faixa ser justa.
- A configuração das telas saiu da pasta do kit (`scripts/sabia/`, que não se edita no projeto) e foi para `scripts/auditoria/efcdocs.config.json`.
- As pastas `base-v0.6.9.2` e `base-v0.6.12` ficam guardadas como história.

## O que esta base não mede

- A auditoria visual mede o tema em que o app abre (claro). O tema escuro é conferido pelos testes de layout, de fluidez e da faixa, não por esta medida.
- Quadro, Documento e as listas de documentos internos não estão na lista de telas: entram quando forem mexidos (tela nova na lista tem de bater a meta).
- "Abrir abaixo de 3 s" e "rolar a 50 quadros por segundo" continuam medidas de olho.

Quem troca a linha de base: só o dono, ao aprovar uma versão que melhorou.

- 18/11/2026: o tamanho de referência do app passou a 628 KB compactado (aprovação do Elias, v0.6.24 parte 1, item 8). As outras medidas não mudaram.
