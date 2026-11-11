# Ficha do sistema · EFCdocs

Preenchida em 11/11/2026 (Método Sabiá 2.0, `docs/METODO-SABIA-2.md`). É esta ficha que adapta o método a este sistema.

| Campo | Resposta |
|---|---|
| Nome e para quem é | EFCdocs: app instalável (PWA) de Planilha (compatível com Excel), Documento e Quadro (Post-its), para o trabalho de Controle e Gestão da Qualidade do dono e da equipe |
| O que faz, em duas frases | Abre, edita e salva planilhas do Excel com fórmulas, gráficos, formas, tabelas e validação; monta quadros de atividades. O Documento ainda está no começo |
| Dono (quem aprova) | Elias |
| Palavra de ordem para publicar | "Poste do Github" |
| Agente de testes | Grok: recebe o roteiro e o ZIP de testes (com as amostras inventadas) e devolve o relatório com OK / FALHOU / PARCIAL por código |
| Peças | React 19 + esbuild; motor de cálculo e leitor/gravador de Excel próprios em JavaScript; grade em canvas; roda no navegador, sem servidor |
| Comando para instalar | `cd fonte && npm install` |
| Comando para montar | `npm run build` (gera `fonte/dist`) |
| Comandos para testar | `npm test` (todas as regras, 322 testes, ~8 s) e um módulo só: `npm run test:nucleo`, `test:planilha`, `test:excel`, `test:quadro`, `test:documento`, `test:ferramentas` · `npm run test:fidelidade` (ida e volta, openpyxl e LibreOffice em 16 amostras, com a planilha real anonimizada; `EFC_AMOSTRAS_FORA=<pasta>` junta outras de fora) · `npm run test:navegador -- <endereço> <pasta>` (249 casos encadeados, ~15 min) · `npm run auditoria` (cinco lentes contra a linha de base `docs/auditorias/base-v0.6.9.2`; `EFC_PALAVRAS=<arquivo fora do projeto>`; `CHROME=<navegador>`) |
| Comando para servir na máquina | `python3 scripts/sabia/servir.py 8741 dist` |
| Onde publica | GitHub Pages do repositório público `EliasGrigori/EFCdocs`; **copiar `fonte/dist/*` para a raiz do repositório no mesmo envio** (apagar os `assets/` antigos) |
| Dados sensíveis | As planilhas de trabalho do dono (dados da empresa). Nunca no repositório, nem em prints. Para testar: cópia feita com `ferramentas/anonimizar/anonimizar-planilha.html`, revisada pelo dono, guardada **fora** do repositório (o anonimizador mantém nomes de abas e tabelas) |
| Palavras do dono | Lista para a varredura de dado sensível guardada fora do projeto (nome da empresa, unidades, pessoas) |
| Aparelhos do uso real | PC com tela de toque 1366×700 (o dono testa nele); celular 384×790 |
| Padrão visual | Até a v0.6.13: estilo Camadas (`src/camadas.css`). Depois: visual do Cwork (Claro marfim e ouro, Escuro dourado; Fraunces e Source Sans 3), faixa familiar ao Excel (R21) |
| Conferentes de fora | openpyxl (estrutura e estilo do .xlsx salvo, `scripts/fidelidade/conferir-openpyxl.py`) e LibreOffice em pt-BR (recalcula as fórmulas, `conferir-libreoffice.py`); ida e volta célula a célula (`testes/fidelidade/comparar.mjs`). Diferenças já conhecidas: `testes/fidelidade/conhecidas.mjs` |
| O que não pode quebrar | Abrir e salvar Excel sem pedido de reparo; fórmulas e seus valores; tabelas do Excel; códigos com zero à esquerda (001) como texto; todas as funções do `docs/features.csv` marcadas "funciona" |

## Metas das auditorias

| Lente | Medida | Meta | Linha de base (v0.6.9.2, remedida em 11/11 com o método da v0.6.10) |
|---|---|---|---|
| Visual | Tamanhos de letra por tela | até 7 | 9 a 11 (PC) |
| Visual | Tipos de canto | até 3 | 4 a 5 |
| Visual | Botão e campo | 34 a 36 px no PC (nenhum abaixo de 28), 44 px no toque | 34 abaixo de 28 px na Página Inicial |
| Visual | Maiúsculas espaçadas, emoji, rolagem de lado, erros no console | 0 | 2 a 8 maiúsculas por tela; o resto 0 |
| Visual | Contraste de texto | 4,5 | 5 a 8 textos abaixo por tela |
| Rapidez | Ação comum (digitar, mover, desfazer) numa planilha de 360 mil células (mediana de 5) | menos de 0,1 s | 1,1 s digitar; 0,04 s mover; 0,86 s desfazer (4× mais lento: 5,1 s; 0,08 s; 5,0 s) |
| Rapidez | Abrir o arquivo grande | menos de 1 s ou com aviso | 1,1 s |
| Rapidez | Tamanho do app (js, css e html) | não crescer sem motivo (mais de 2%) | 1.696 KB (544 KB compactado) |
| Fidelidade | Ida e volta, conferentes de fora | 0 diferenças fora das conhecidas | v0.6.10: 15 amostras e a planilha anonimizada sem diferença nova; conhecidas D-20, D-22, D-23, D-24, L-02, L-04 a L-07 |
| Segurança | Achados da varredura de dado sensível | 0 | 0 (depois do D-19) |
| Código | Arquivos acima de 800 linhas; avisos ao montar | nenhum novo e os 7 atuais diminuem aos poucos; 0 avisos | 7 arquivos; 4 avisos (D-18) |

Enquanto o sistema estiver abaixo da meta, vale a regra **"não pode piorar"**: cada versão é comparada com a linha de base e só passa se nenhuma medida piorar. Os números de cada versão ficam em `docs/auditorias/<versão>/` (sem prints); a linha de base só muda quando o dono aprova uma versão que melhorou.
