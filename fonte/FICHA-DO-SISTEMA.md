# Ficha do sistema · Vértice Docs (EFCdocs)

Preenchida em 11/11/2026 e refeita em 15/11/2026 pelo modelo do Método Sabiá 2.1 (`docs/METODO-SABIA.md`). É esta ficha que adapta o método a este sistema. Kit em uso: ver `scripts/sabia/KIT-VERSAO` (2.1.0).

| Campo | Resposta |
|---|---|
| Nome e para quem é | Vértice Docs (até a v0.6.10, EFCdocs; endereço e repositório continuam EFCdocs): app instalável (PWA) de Planilha (compatível com Excel), Documento e Quadro (Post-its), para o trabalho de Controle e Gestão da Qualidade do dono e da equipe. Abre, edita e salva planilhas do Excel com fórmulas, gráficos, formas, tabelas e validação; monta quadros de atividades. O Documento ainda está no começo |
| Caminho | Sistema existente (rework da Planilha desde 10/11/2026). Fase 2, ciclos de versão: a varredura (Fase 0) foi aprovada em 11/11 e a rede de segurança (Fase 1, v0.6.10) em 11/11; o programa de ida e volta completo chegou na v0.6.21 parte 2 |
| Ligação | `EliasGrigori/EFC-Claude-Base` conferido em 15/11/2026 (commit `d65dd35`): Método Sabiá 2.1.0, kit 2.1.0, Como trabalhar com o Elias 1.1.0, lista de recomendados 1.0.0. Obrigatório: habilidade `metodo-sabia` 2.1.0. Recomendados em uso: `transitions-dev` (todo movimento, R24), `react-bits-guia` (só como inspiração de código próprio, R24). Recomendado para quando entrar o Firebase (v0.9.0): Floorplan. Só deste projeto: `efcdocs-memoria-do-projeto`, `efcdocs-estilo-camadas`. Não se usa nas telas do app: `taste-skill` (é para site) |
| Dono e palavra de ordem | Elias · **"pode publicar"** (15/11/2026: "não publica nada"; vale no lugar da R29 e do antigo "Poste do Github") |
| Agente de testes | Grok: recebe o roteiro e o ZIP de testes (com `fonte/` e as amostras inventadas), procura os defeitos que podem ter passado e faz a **revisão total do sistema**, não só do que mudou; devolve o relatório com OK / FALHOU / PARCIAL por código |
| Peças | React 19 + esbuild; motor de cálculo e leitor/gravador de Excel próprios em JavaScript; grade em canvas; roda no navegador, sem servidor; os arquivos ficam no aparelho (IndexedDB `efcdocs`, conteúdo compactado) |
| Comandos | instalar: `cd fonte && npm install` · montar: `npm run build` (gera `fonte/dist`) · testar: `npm test` (regras, cerca de 15 s), `npm run test:fidelidade` (ida e volta do .xlsx, openpyxl e LibreOffice, e a ida e volta do banco e do PDF), `npm run test:idaevolta` (só a ida e volta do banco e do PDF, com a lista na tela), `npm run test:navegador -- <endereço> <pasta>` (cerca de 50 min), `npm run test:layout`, `npm run test:fluidez`, `npm run test:faixa`, `npm run test:icones` (traço e cor por família, v0.6.31), `npm run test:quadrocel` (Quadro no celular e PL05 a PL12, v0.6.32), `npm run test:quadrodeitado` (Quadro com o celular deitado, v0.6.33), `npm run test:deitado` (celular deitado nos três módulos, v0.6.34), `npm run test:textocolunas` (Texto para colunas, v0.6.36), `npm run test:agrupar` (Agrupar, v0.6.37), `npm run test:subtotal` (Subtotal, v0.6.38), `npm run test:tabelasexcel` (T0: tabelas do Excel, v0.6.39), `npm run test:filtrostabela` (T2: um filtro por tabela, v0.6.40), `npm run test:segmentacao` (S1: segmentação de tabela, v0.6.41) · auditorias: `npm run auditoria` (cinco lentes contra `docs/auditorias/base-v0.6.37`; `EFC_PALAVRAS=<arquivo fora do projeto>`; `CHROME=<navegador>`) · servir: `python3 scripts/sabia/servir.py 8741 dist` · publicar: ver a lista abaixo |
| Lista de publicação | Só com a palavra de ordem. Tudo no **mesmo envio** (um commit na `main` de `EliasGrigori/EFCdocs`), nesta ordem: 1. `npm test`, `npm run build` e as auditorias sem piora, no código que foi aprovado. 2. Copiar o código para `fonte/` (com `MEMORIA-DO-PROJETO.md`, `FICHA-DO-SISTEMA.md` e `docs/` atualizados). 3. Apagar a pasta `assets/` da raiz e copiar `fonte/dist/*` para a **raiz** do repositório (`index.html`, `sw.js`, `manifest.webmanifest`, `assets/`, ícones). 4. Commit com a versão no título, terminando com `Co-Authored-By` e `Claude-Session`. 5. Enviar e conferir com `git ls-remote` que o remoto está no commit novo. 6. Se algum material do `EFC-Claude-Base` mudou e foi aprovado, atualizar o repositório de materiais no mesmo envio, com a versão nova em `VERSOES.md`. 7. Avisar o Elias: commit, o que foi ao ar e como conferir (rodapé do menu "Vértice Docs vX"). 8. O Elias confere no endereço `eliasgrigori.github.io/EFCdocs/` (o ambiente da IA não alcança o github.io) |
| Plano de volta | Cada versão publicada é um commit; a anterior continua no histórico. Para voltar: `git revert <commit da versão>` na `main` (desfaz o código em `fonte/` e o site da raiz no mesmo commit) e enviar; o Pages volta em 1 a 2 minutos e quem tem o app instalado vê "Versão nova pronta" com a versão anterior. Os arquivos das pessoas ficam no aparelho e não são tocados pela volta; por isso **formato de dado guardado não muda sem plano de migração e de volta** escrito na versão (as versões v0.6.20 e v0.6.21 não criaram campo novo no banco). Quem decide voltar: o Elias. Último commit publicado: `da3a61c` (v0.6.18); a memória da publicação está no `2e54c9e` |
| Dados sensíveis | As planilhas de trabalho do dono (dados da empresa). Nunca no repositório, nem em prints, documentos ou no que vai para o Grok. Para testar: cópia feita com `ferramentas/anonimizar/anonimizar-planilha.html`, revisada pelo dono, guardada **fora** do repositório (o anonimizador mantém nomes de abas e tabelas) |
| Palavras do dono | Lista para a varredura guardada **fora** do projeto (no pacote do dono: `07-fora-do-projeto/palavras-do-dono.txt`); uso: `EFC_PALAVRAS=<caminho> npm run auditoria` |
| Aparelhos | PC com tela de toque 1366×700 (o dono testa nele); celular 384×790 |
| Padrão visual | Visual do Cwork (Claro marfim e ouro, Escuro dourado; Fraunces e Source Sans 3), `docs/PADRAO-VISUAL.md`. Layout das telas: regras R1 a R14 da família em `docs/REGRAS-DE-LAYOUT.md`, peças em `src/layout/`. Movimento: `docs/REGRA-DE-FLUIDEZ.md` (R32). Faixa de comandos nos lugares do Excel (R25), `src/ui/faixa.jsx` e `src/ui/faixa-excel.css` |
| Conferentes de fora | **Planilha em .xlsx:** regras do Excel que os leitores comuns deixam passar (`scripts/fidelidade/conferir-regras.py`), estrutura (`conferir-estrutura.py`), esquema oficial como ferramenta (`conferir-xsd.py`, esquemas fora do projeto em `EFC_XSD`), openpyxl (`conferir-openpyxl.py`) e LibreOffice em pt-BR (`conferir-libreoffice.py`); ida e volta célula a célula (`testes/fidelidade/comparar.mjs`); diferenças conhecidas em `testes/fidelidade/conhecidas.mjs`. **Banco do aparelho (planilha, documento e quadro):** `scripts/fidelidade/conferir-banco.py` (Python lê os registros crus, descompacta por conta própria e compara; na planilha, com o openpyxl lendo o arquivo original). **PDF do Quadro:** `scripts/fidelidade/conferir-pdf.py` (pypdf). **Documento em Word e PDF:** ainda não existe (v0.7.0); o programa de ida e volta tem uma trava que falha no dia em que o Exportar Word ligar sem conferente (`conferir-docx.py`, com python-docx e LibreOffice) |
| Rapidez pesa mais? | Sim (editor de arquivos): carga grande (planilha de 360 mil células) e processador 4 vezes mais lento entram na auditoria de rapidez |
| O que não pode quebrar | Abrir e salvar Excel sem pedido de reparo; fórmulas e seus valores; tabelas do Excel; códigos com zero à esquerda (001) como texto; o que está guardado no aparelho continua abrindo; todas as funções do `docs/features.csv` marcadas "funciona" |

## Módulos (para a nota calculada e para "mesma área")

| Módulo | Pastas | Telas e ações medidas hoje |
|---|---|---|
| Núcleo e casca | `src/nucleo`, `src/ui`, `src/layout`, `src/App.jsx` | Início, Lista de planilhas |
| Planilha | `src/planilha` (menos `xlsx`) | Página Inicial, Inserir, Layout da Página, Fórmulas, Dados, Revisão, Exibir; digitar, mover, desfazer |
| Excel (ler e gravar) | `src/planilha/xlsx` | Abrir Excel (relatório); rede de fidelidade |
| Quadro | `src/quadro` | ainda sem tela na auditoria visual; ida e volta do banco e do PDF |
| Documento | `src/docx` | ainda sem tela (editor na v0.7.0); ida e volta do banco |
| Ponte com o Cwork | `src/ponte`, `contrato/` | contrato conferido no `npm test` |

## Metas das auditorias

Linha de base: `docs/auditorias/base-v0.6.37/` (19/11/2026, R1 e R2: rapidez de novo com 15 medidas por ação, pior de 3 rodadas; as outras lentes iguais à base v0.6.26). Antes: `docs/auditorias/base-v0.6.26/` (D16, aprovada em 18/11/2026: rapidez pela pior de 3 rodadas da v0.6.26; tamanho de referência 656.802 bytes compactados, que não barra pela R42; a meta absoluta barra sempre). A anterior, `base-v0.6.21-parte1/`, fica guardada.

| Lente | Medida | Como mede | Meta | Linha de base (v0.6.21 parte 1, 15/11/2026) |
|---|---|---|---|---|
| Visual | Tamanhos de letra por tela | Programa | até 7 | 4 a 6 em 12 telas; **8 em "Abrir Excel (relatório)"**, PC e celular (fora) |
| Visual | Tipos de canto | Programa | até 3 | 1 a 3 |
| Visual | Botão e campo abaixo do mínimo | Programa | 0 abaixo de 28 px (PC) e 44 px (toque) | 0 (menor: 28 px no PC, 44 px no celular) |
| Visual | Maiúsculas espaçadas, emoji, rolagem de lado, erros no console | Programa | 0 | 0 |
| Visual | Contraste de texto | Programa | 4,5 | 0 textos abaixo |
| Rapidez | Ação comum (digitar, mover, desfazer) em 360 mil células, mediana de 5 | Programa | menos de 0,1 s (0,3 s com o processador 4 vezes mais lento) | 50, 34 e 34 ms (freado: 203, 66 e 98 ms) |
| Rapidez | Tamanho do app (js, css e html) | Programa do projeto | não crescer mais de 2% sem motivo aprovado | 1.898 KB (613 KB compactado) |
| Rapidez | Abrir abaixo de 3 s; rolar a 50 quadros por segundo | Olho | — | — |
| Fidelidade | Ida e volta do .xlsx e conferentes de fora (22 amostras) | Programa do projeto | 0 diferenças fora das conhecidas | 0 novas; 13 conhecidas |
| Fidelidade | Ida e volta do banco (planilha, documento, quadro), dados antigos, PDF do Quadro | Programa do projeto | 0 diferenças | 46 conferências, 0 diferenças |
| Segurança | Achados da varredura de dado sensível | Programa | 0 | 0 |
| Código | Arquivos acima de 800 linhas; avisos ao montar; suíte | Programa | nenhum novo e os grandes não crescem; 0 avisos; 0 falhas | 7 arquivos; 0 avisos; 396 de 396 |

Regra de barrar (Sabiá 2.1, uma só): **nenhuma medida de programa pode piorar contra a linha de base; tela ou função nova tem de bater a meta.** Os números de cada versão ficam em `docs/auditorias/<versão>/` (sem prints). A linha de base só muda quando o dono aprova uma versão que melhorou.

As medidas de olho (seção 7 do método) vão para a lista de conferência da página de aprovação. Medidas de olho que ganharam programa neste projeto: regras de layout da família (`npm run test:layout`), regra de fluidez (`npm run test:fluidez`), lugares da faixa (`npm run test:faixa`), tamanho do app (`npm run auditoria`).

## Para mais tarde (já decidido)

- **Firebase (v0.9.0):** rodar o Floorplan (varredura de saúde: chaves no código, regras abertas, endereços sem login) antes de publicar. O primeiro teste no EFCdocs, informado pelo Elias em 15/11/2026, não achou problema de segurança.
- **Fase 3:** só correção, meta absoluta e **7 dias de uso do dono sem defeito novo** (um defeito novo zera a contagem); depois a virada (v1.0.0) com a palavra de ordem.
