# MEMÓRIA DO PROJETO — EFCdocs

Atualizado em 04/11/2026 · GitHub e site na **v0.6.9** (commit 114552f) · em preparo: **v0.6.9.1** (correções dos prints de 04/11) · depois **v0.7.0**

> **Este arquivo é a memória do projeto.** O Claude lê ele PRIMEIRO em toda conversa nova e grava de volta ao fechar cada versão.
> Ele viaja em toda entrega (pasta da versão, ZIP da fonte e repositório), para nada se perder.
> **Para o Elias:** diga "regra nova: ..." (ou "grava isso") e o Claude coloca na seção 2, com a data, na mesma hora. Nada que você disser como regra fica só na conversa.
> Detalhe de cada versão (itens aprovados, achados do Grok, números dos testes): `ESTADO.md` e `PROGRESSO.md`.

---

## 1. Quem usa e como

- Elias (José Elias Florêncio Beserra), Controle e Gestão da Qualidade na Fazenda Matriz (Russas-CE), desenvolvedor júnior com apoio de IA. Escreve em português informal.
- **Testa em computador com tela de toque** (Windows, Chrome/PWA). Todo defeito de rolagem, arrastar e clique precisa ser pensado para toque e mouse.
- O agente de testes **Grok** recebe um roteiro por versão e devolve um relatório; quem decide o que entra é o Elias.
- App: PWA em React 19 + esbuild. Repositório `EliasGrigori/EFCdocs`; site `eliasgrigori.github.io/EFCdocs/`. Três módulos: **Planilha**, **Documento (Docx)** e **Post-its/Quadro**.

## 2. Regras permanentes do Elias (valem em toda versão)

| Nº | Regra | Desde |
|---|---|---|
| R01 | Antes de cada etapa, o Claude sugere **Modelo e Esforço em negrito**; o Elias aprova, troca o modelo sozinho e diz "pode iniciar". Toda entrega termina com **próximos passos** e **Modelo/Esforço em negrito**. | 25/10 |
| R02 | Antes de publicar: **página de aprovação visual com antes e depois** (um item por mudança, com Aprovado/Reprovado e comentário). **Nada vai ao GitHub sem a ordem do Elias** ("Poste do Github"). | 25/10 |
| R03 | Toda entrega leva um **roteiro de verificação do Grok**: o que foi feito, como conferir e uma lista de outros erros para procurar. | 25/10 |
| R04 | **Nada de dados reais ou senhas** no projeto. Planilhas da empresa não entram em testes nem em pacotes: usar só amostras inventadas (`testes/amostras/`). A planilha real do Elias fica só no scratchpad, para reproduzir defeitos. | 25/10, 04/11 |
| R05 | O Claude trabalha **em primeiro plano**: nada em segundo plano e nada agendado para voltar depois; o Elias quer ver o Claude operando. | 25/10 |
| R06 | **Sem emojis**; só ícones desenhados. Estilo **Camadas** (skill `efcdocs-estilo-camadas`): cantos 12/10/8/6 px, sombra em camadas, foco com anel, Esc fecha só a camada de cima. Layout limpo, moderno e compacto, sem "encheção de linguiça". | 27/10 |
| R07 | Ao fechar uma versão, dizer **o que verificar e o que configurar no Firebase** (até a v0.9.0: nada a configurar). | 25/10 |
| R08 | **Depois de lançado, nada se apaga** (Cancelar com motivo). Única exceção: fotos com prazo (15 dias concluído, 45 dias não concluído). | 25/10 |
| R09 | Filtros das telas: **um único filtro recolhível** (botão com resumo que abre painel), nunca cartões ou chips de contagem. Excluir = **ícone de lixeira no canto superior direito**, não botão de texto no rodapé. | 25/10 |
| R10 | Entregas: **pasta de atualizações sempre crescente** — `ESTADO.md`, `PROGRESSO.md`, `MEMORIA-DO-PROJETO.md` e uma pasta por versão (aprovação em HTML, roteiro do Grok, ZIPs `publicar`, `testes` e `fonte`). Enviar os arquivos sempre, não só mencionar. Mesmo padrão de nomes entre as entregas. | 25/10 |
| R11 | **Publicar = copiar `fonte/dist/*` para a RAIZ do repositório** (apagando os `assets/` antigos) **no mesmo commit** do código. Sem isso o site fica numa versão velha (aconteceu: ficou na v0.6.4 por três versões). Commit termina com `Co-Authored-By: Claude <modelo>` e `Claude-Session: <endereço da sessão>`. | 04/11 |
| R12 | Texto do app em **português simples**, rótulos curtos, sem jargão. | 25/10 |
| R13 | Compatibilidade com o Excel de **99 a 100% nos dois sentidos** (abrir e salvar), com varredura de riscos; tudo que sai para fora sai como Excel. | 25/10 |
| R14 | **Esta memória é obrigatória:** toda regra, decisão ou pedido novo do Elias entra neste arquivo (seção 2 ou 9), com data, e vai junto em todas as versões. O Claude relê este arquivo no início de cada conversa e antes de cada etapa. | 04/11 |
| R15 | Os relatórios do Grok pendentes são passados pelo Elias depois; o Claude não espera por eles para seguir a próxima etapa. | 04/11 |

## 3. Como entregar uma versão (passo a passo)

1. Ler esta memória, `ESTADO.md`, `PROGRESSO.md` e só a próxima versão.
2. Sugerir Modelo/Esforço (R01) e esperar o "pode iniciar".
3. Código em `fonte/` (git em `/home/claude/EFCdocs-repo`). `npm run build` → `fonte/dist`. `npm test` (regras) e `node scripts/testar-navegador.mjs <endereço> <pasta-de-prints>` (navegador; `FILTRO='a|b'` filtra por pedaços do nome).
4. Servidor local de teste: `cd /tmp && python3 /tmp/srv/servir.py <porta> <pasta>` (a pasta atual no raiz, versões antigas em `/vXXX/`). Matar antigo: `fuser -k <porta>/tcp`.
5. Prints de antes e depois só com amostras inventadas; montar a página de aprovação (`scripts/montar-aprovacao.py`), o roteiro do Grok e os 3 ZIPs.
6. Atualizar `ESTADO.md`, `PROGRESSO.md` e **este arquivo**; enviar tudo.
7. Só com a ordem do Elias: commit na `main` com o `dist` copiado para a raiz (R11), conferir o Pages.

## 4. Estado atual

- **No ar:** v0.6.9 (114552f). Planilha completa em funções: abrir e salvar Excel, fórmulas, gráficos nativos, formas, Painel, impressão e PDF, congelamento, largura e altura.
- **Em preparo (v0.6.9.1, ainda NÃO publicada):** correções dos prints de 04/11 — ver seção 5.
- **Próxima grande:** v0.7.0 = Documento (editor, POP, formulários, revisões, Word, PDF) + gráfico no Quadro. Já feitos: `src/docx/modelo.js` (blocos, trechos, cabeçalho do POP, sumário) e `src/docx/medidas.js` (larguras Helvetica/Times/Courier, quebra de linha), 11 testes. Arquitetura decidida: edição em fluxo contínuo na largura da folha; páginas de verdade na prévia, no PDF e na impressão; cabeçalho do POP repete em toda página.
- Depois: v0.8.0 pastas e lançamentos · v0.9.0 nuvem e login · v0.10.0 ligação com o EFClaudian · v1.0.0 revisão final.

## 5. Defeitos relatados pelo Elias e situação

| Id | Relato (data) | Causa | Situação |
|---|---|---|---|
| D-01 | Linhas passam por cima das congeladas; riscos somem ao rolar (tela de toque) (04/11) | v0.6.9: congelado desenhado em canvas à parte. v0.6.9.1: (a) a caixa de seleção de célula rolada para baixo do painel congelado era desenhada por cima das colunas congeladas; (b) a linha da ponta do painel usava a posição da coluna seguinte, já rolada, e ficava solta | **Corrigido na v0.6.9.1, reproduzido com a planilha dele e coberto por teste.** Elias confirma no aparelho |
| D-02 | Coluna lateral dos números muito grossa (04/11) | 46 px | **Corrigido na v0.6.9.1:** 30 px (cresce só com 4+ dígitos) |
| D-03 | Ao exportar para Excel a planilha não volta com as tabelas (04/11) | O nome de cada coluna da tabela era gravado "aparado" e com a quebra de linha em outro formato; o Excel exige nome **idêntico** ao texto da célula do título, vê diferença, "repara" e apaga a tabela | **Corrigido na v0.6.9.1** (3 tabelas da planilha dele conferidas: nomes iguais aos do Excel original). **Elias confirma abrindo no Excel** |
| D-04 | Imagens não redimensionam (04/11) | A alça ficava metade para fora da imagem e a imagem corta o que passa da caixa: só o pedaço de dentro aparecia e recebia o clique | **Corrigido na v0.6.9.1** (alça dentro do canto; vale para imagem, botão e gráfico) |
| D-05 | Célula sem linha lateral, sem estar mesclada (RESUMO, zoom 70%, linhas ~1009–1012) (04/11) | Não reproduzido: a planilha de teste não tem esse trecho (a dele tem "100 vezes mais preenchimentos"). Hipótese: texto que passa para a célula vizinha apaga a grade por baixo (como o Excel faz) | **ABERTO.** Precisa do endereço da célula ou de uma amostra (dados inventados) |
| D-06 | Linha horizontal mais grossa depois do cabeçalho nas colunas vazias à direita (ANÁLISES, zoom 70%, print de 04/11) | A investigar (pode ser a linha do congelamento) | **ABERTO** |
| D-07 | Dashboard original com gráficos sobrepostos | Falta o print do original | Aguardando o Elias |
| L-01 | "14.200 fórmulas mostram o último valor do Excel: o EFCdocs ainda não calcula (ex.: `=SINGLE(IF(SINGLE(ANÁLISES!#REF!:ANÁLISES!#REF!)=0,"",ANÁLISES!#REF!))`)". Vêm de células ocultas até onde não havia fórmula; a planilha real tem 100x mais preenchimentos (04/11) | As fórmulas **já estão com #REF! no próprio arquivo do Excel** (referência apagada; valor guardado #REF!). O Excel mostra o mesmo | **v0.6.9.1: o aviso de abertura as separa** ("já vêm com #REF! do próprio Excel"). Quem quiser, limpa essas fórmulas na planilha |
| L-02 | "As 3 tabelas do Excel vêm e voltam ao salvar como Excel; aqui, nas fórmulas, o nome da coluna virou o endereço (ex.: `Tabela1[[#This Row],[Massa (g)]]` virou `$X8`). A conta é a mesma." (04/11) | Escolha de projeto: o motor trabalha com endereços | Limitação conhecida; ao salvar como Excel, as tabelas voltam (ver D-03) |

## 6. Pendências

**Do Elias:**
1. Atualizar o app e **conferir se mostra v0.6.9** (rodapé do menu "EFCdocs v0.6.9"); a v0.6.9.1 só depois que ele aprovar e mandar postar.
2. Testar na tela de toque se os riscos ficam no lugar ao rolar (D-01) e abrir no Excel de verdade um arquivo salvo pelo EFCdocs (D-03: tabelas, velocímetros, logotipo, sem pedido de reparo).
3. Mandar o endereço/amostra do D-05 e o print do Dashboard (D-07).
4. Passar ao Grok os roteiros das v0.6.8 e v0.6.9 (e depois o da v0.6.9.1).
5. Listar exceções conhecidas; conferir limites do plano grátis do Firebase e a política de TTL das fotos.

**Do Claude:**
1. Fechar a v0.6.9.1 (testes, página de aprovação, roteiro do Grok, ZIPs) e esperar a ordem de publicar.
2. Investigar D-05 e D-06 quando houver dado.
3. v0.7.0 (Opus 5 · alto): editor do Documento, POP com cabeçalho repetido, sumário, revisões, Word, PDF, impressão; gráfico no Quadro.
4. Lembrete antigo: gráficos usam motor próprio; trocar por ECharts só se o Elias pedir.

**Sem solução ainda:** pasta viva no OneDrive (o computador ligado não tem OneDrive).

## 7. Limitações conhecidas do Excel

- Macros: guardadas e devolvidas intactas, não rodam. Tabela dinâmica e segmentação: guardadas; edição fica para depois.
- Funções que o EFCdocs ainda não calcula mostram o último valor do Excel (a fórmula fica guardada e volta igual).
- Fórmulas com tabela estruturada viram endereços (L-02).
- Fórmulas que o Excel não aceitaria (mais de 8.192 letras, parênteses demais) vão só com o valor ao salvar.

## 8. Notas técnicas essenciais

- `src/planilha/grade.js`: `desenhar` (quadrantes congelados; `parte:'congelado'` desenha só o que fica parado num canvas `.pl-cv-cong` fora do rolador), `corDaGrade`, `CAB_W` (30). `src/planilha/Planilha.jsx`: tela, objetos (`.pl-objs`), guia de arrasto. `src/planilha/xlsx/`: `ler.js`, `gravar.js` (tabelas: `tabelasDaAba`, `nomeDeColunaXlsx`), `zip.js`. `src/docx/`: modelo e medidas do Documento.
- Tabelas do Excel: o nome da coluna no `table1.xml` tem de ser **idêntico** ao texto da célula do título (espaço no fim conta; quebra de linha vira `_x000a_`).
- `escapar()` de `xml.js` já protege `_xHHHH_`; não proteger duas vezes.
- Toque: o navegador rola fora do JavaScript; por isso o parado é desenhado por cima.
- Seleção, cópia e referências de fórmula são desenhadas **por quadrante**, só com a parte que é dele (v0.6.9.1).

## 9. Versões (plano e situação)

| Versão | O que entra | Modelo · esforço | Situação |
|---|---|---|---|
| v0.1.0 | Casca, instalação, demo, tema | Sonnet 5.5 · alto | No ar (commit c7ebc4d), Pages ativo e instalação testada pelo Elias. Layout refeito na v0.2.0 |
| v0.2.0 | Layout aprovado (faixa, painel, menu, retrátil em 3 níveis, 16 temas, relevo, cantos), ícone "EFC" e tela de abertura; núcleo comum, compactação, perfis simulados | Opus 5.5 · alto | APROVADA (B01 a B12) e no GitHub (commit 128424c) |
| v0.3.0 | Post-its e Quadro: setas presas, Q-001, Kanban, fluxograma, raias, PDF paisagem; achados do Grok; código-fonte reconstruído | Opus 5.5 · alto | APROVADA (C01 a C16) e no GitHub (commit 397012c). 37/37 testes de regras, 30/30 no navegador, 347 KB (109 KB compactado) |
| v0.3.1 | Post-its: páginas, legenda automática, post-it de tarefa com GUT, barra vertical, cores no celular, Assistente, 8 modelos da qualidade | Sonnet 5.5 · alto | APROVADA (D01 a D11) e no GitHub (commit ef17e62). 53/53 regras, 37/37 navegador |
| v0.3.2 | Post-its: achados do Grok (colar muitas linhas, palavra gigante, reticências, data de prazo, páginas, desfazer, meia-noite) | Sonnet 5.5 · alto | APROVADA (E01 a E10) e no GitHub (commit 69dd937). 55/55 regras, 43/43 navegador |
| v0.4.0 | Planilha (1ª entrega): grade, abas, motor, 123 funções, formatos do Excel, ajuda da fórmula, barra de status, nomes, quem usa, linha do tempo, celular (PL01 a PL10, PL14, PL16, PL17, PL19, PL23, PL26, PL27) | Opus 5.5 · alto | APROVADA (F01 a F19) e no GitHub (commit da64aab). 79/79 regras, 63/63 navegador |
| v0.4.1 | Correções da aprovação da v0.4.0 (congelado, datas e 25:00, dica no fim, mensagens, celular, cores, Leitor, número na barra) e o mesmo arquivo em duas abas sem perder nada | Opus 5.5 · alto | APROVADA (G01 a G10) e no GitHub (commit 5ca553f). 86/86 regras, 70/70 navegador; Grok Y01 a Y11 OK |
| v0.4.2 | Ajustes do Grok (função do Excel que falta não é trocada, sem prévia #VALOR! incompleta, #DIV/0! com SEERRO, Reexibir colunas), faixa compacta com dicas (nome, o que faz, atalho) e botão Mais | Sonnet 5.5 · alto | APROVADA (H01 a H08) e no GitHub (commit eb49e35). 90/90 regras, 77/77 navegador |
| v0.4.3 | Planilha (2ª entrega): Explicar esta conta, Por que deu erro, Problemas, a conta desenhada, Montar a conta (PL11, PL12, PL13, PL15, PL18), botão direito nos cabeçalhos (N04) e os achados do Grok na v0.4.2 | Opus 5.5 · alto | APROVADA e publicada (c0024a4). 98/98 regras, 87/87 navegador |
| v0.4.3.1 | Correções da v0.4.3 (frases do Explicar, circular, Montar a conta, C:C), zeros à esquerda (pergunta e lembra por coluna), bug do celular (célula editada à vista) | Sonnet 5.5 · alto | REVISADA após o Grok (J02 corrigido: conta circular), aguardando aprovação (K01 a K08). 106/106 regras, 95/95 navegador |
| v0.4.4 | Revisão de layout: cantos retos, abas planas, Início e listas sem texto repetido, filtro único recolhível, Opções retráteis, celular com mais espaço (J07 aprovado) | Opus 5.5 · alto | APROVADA (M01 a M08) e PUBLICADA em 25/10/2026 (commit 93a9e67, junto com a v0.4.3.1). 106/106 regras, 100/100 navegador |
| v0.4.4.1 | Cartões 2–3 por linha (M02 A), fundo das janelas como o EFClaudian (M04), Lixeira "Apagar para sempre", avisos repetidos, batida da outra aba, quadro e celular, Explicar do SE | Sonnet 5.5 · alto | PUBLICADA em 25/10/2026 (commit 165951a) a pedido do Elias. 106/106 regras, 108/108 navegador |
| v0.4.4.2 | Achados do Grok na v0.4.4.1: número em célula de data, aviso na aba só para ver, aviso com Desfazer que não some, contagem e alinhamento dos cartões, botão Apagar para sempre, nome do botão da barra do quadro, texto da forma, frase da Lixeira | Sonnet 5.5 · alto | APROVADA (Q01 a Q08) e PUBLICADA em 26/10/2026 (commit aca6c2e). 106/106 regras, 112/112 navegador |
| v0.4.5 (era v0.4.4) | Assinatura (linha com o nome completo embaixo; rubrica desenhada ou foto): quadro de post-its primeiro, depois Docx e Planilha | Sonnet 5.5 · alto | APROVADA e PUBLICADA junto com a v0.4.6, como v0.4.6.1 (commit ec8827b, 26/10/2026). Quadro e Planilha; Docx liga na v0.7.0 |
| v0.4.6 (era v0.4.5, proposta) | Funções novas, primeiro bloco: TETO, ARREDMULTB, MODO, PERCENTIL, QUARTIL, ORDEM, CORREL, FREQUÊNCIA (decisão I12) | Sonnet 5.5 · alto APROVADA e PUBLICADA como v0.4.6.1 (commit ec8827b, 26/10/2026), com a correção do R06. 135/135 regras, 129/129 navegador |
| v0.4.7 | Tela como no Excel: faixa de cima com dois níveis recolhíveis, menu lateral recolhível, barra fx que estica (arrastar, guarda a altura, botão ^) (pedido S07) | Sonnet 5.5 · alto | APROVADA (V02, 26/10/2026) e no GitHub (commit 9284e43). 135/135 regras, 129/129 navegador |
| v0.4.8 | Visual Papel sobre a mesa (tema Papel claro, sombras e contorno, 3 acabamentos), menu e avisos limpos, nome único Quadros, Verificação no rodapé, Dica, textos sem jargão, correções B01 a B03 do Grok | Sonnet 5.5 · alto | APROVADA (26/10/2026) e no GitHub (commit cd0d68a). 135/135 regras, 137/137 navegador |
| v0.4.9 | L02 (cartões do Início como prévia em branco), L04, L05, L06, L07, L09 | Sonnet 5.5 · alto | a fazer (inclui W03 alça menor com hover e W09 aviso à direita, mais largo e curto, cantos levemente arredondados) |
| v0.5.0 | Planilha: abrir e salvar Excel, relatório de compatibilidade, teste de ida e volta, modelos de teste | Opus 5.5 · alto | APROVADA (V01) e PUBLICADA em 26/10/2026 (commit 584396d). 151/151 regras, 152/152 navegador |
| v0.5.1 | Listas suspensas, validação de dados, formatação condicional e comentários (lidos e salvos no Excel), relatório antes de abrir refeito, achados do Grok na v0.5.0 | Sonnet 5.5 · alto | APROVADA (todos os itens) e PUBLICADA em 27/10/2026 (commit f67cf8b). 167/167 regras, 168/168 navegador |
| v0.6.0 | Planilha: gráficos (ECharts sob medida; nativos no Excel), PDF/Imprimir completo, Baixar original; parecer em v0.5.1/PARECER-GRAFICOS-EFCdocs.md | Opus 5.5 · alto | APROVADA (todos os itens) e PUBLICADA em 28/10/2026 (commit a2d5133) |
| v0.6.9 | Congelamento na tela de toque (o parado desenhado por cima), largura/altura de várias colunas e linhas juntas, guia que acompanha o cursor, grade com contraste | Opus 5 · alto | APROVADA e PUBLICADA em 04/11/2026 (commit 114552f). 296/296 regras, 245/245 navegador |
| v0.7.0 | Docx: editor, POP, formulários, revisões no editor, Word, PDF; gráfico no Quadro | Opus 5 · alto | começada (modelo e medidas do Documento) |
| v0.8.0 | Pastas, lançamentos, arquivados, documentos externos, fotos com prazo | Opus 5.5 · alto | |
| v0.9.0 | Nuvem, login próprio, regras do Firestore, aprovação, avisos, medidor de espaço | Opus 5.5 · alto | |
| v0.10.0 | Ligação com o EFClaudian (PEDIDO para a outra conta) | Sonnet 5.5 · alto | fica para o fim (N11) |
| v1.0.0 | Revisão final, roteiro do Grok, uso real | Sonnet 5.5 · alto | |
| Depois | Tabela dinâmica, segmentação, gráficos raros, Google Drive, edição ao vivo | a definir | |

Cada linha completa (itens aprovados, achados do Grok, números dos testes, commits) está em `ESTADO.md` e `PROGRESSO.md`.

| Versão | O que entra | Modelo · esforço | Situação |
|---|---|---|---|
| v0.6.9.1 | Correções dos prints de 04/11: seleção sob o congelado e risco solto, coluna dos números mais fina (30 px), alça das imagens, tabelas do Excel voltam sem "reparo" (nome das colunas idêntico ao título), aviso de abertura separa as fórmulas com #REF! do Excel; memória do projeto | Sonnet 5.5 · alto | pronta para aprovação (NÃO publicada) |

## 10. Decisões aprovadas (guardadas na íntegra)


**Proposta 01:**
- N01 EFCdocs em repositório próprio.
- N02 prefixo efcdocs: no aparelho; apagar normal em rascunho, lançado só Cancelar com motivo.
- N03 primeiro acesso pelo EFClaudian, depois entra sozinho; sem cadastro = demo.
- N04 vale o perfil do cadastro.
- N05 coleções efd_.
- N06 Principal=Admin, Estrela=Editor, Secundário=Operador, Visitante=Leitor.
- N07 Cancelar com ícone no canto superior direito.
- N08 3 módulos, Formulário dentro do Docx, planilha exporta Excel.
- N09 temas do EFClaudian.
- N10 mesmo Firebase (docseliasflorencio).
- N11 ligação com o EFClaudian só no fim; até lá sem login.
- N12 pasta de atualizações crescente.
- D1, D3 a D6, D8 a D10, D12, D13, D17 a D19, D21 a D26 como sugeridas. D15 ordem Post-its, Planilha, Docx.

**Proposta 02 (layout), L01 a L09 aprovados:**
- faixa tipo Excel (A) e barra curta com painel (B), ambas retráteis em 3 níveis; menu lateral retrátil;
- 16 temas com relevo nas barras (ligado por padrão, em todos os temas); cantos arredondados do EFClaudian (6/8/12 px);
- barra de status Soma/Média/Contagem; busca "O que você quer fazer?"; explicação de fórmula como editor de código;
- máximo de recursos do Excel; compatibilidade 99 a 100% nos dois sentidos com varredura de riscos.

**v0.2.0:** B01 a B12 aprovados (B07, busca e catálogo de comandos, aprovado em 25/10).

**v0.4.0:** F01 a F19 aprovados em 25/10 (F05 lista e nomes; F16 lista suspensa na v0.6.0; F18 Operador edita até a v0.6.0; correções em F01, F04, F07, F08, F14, F15, F18 e o item novo das duas abas foram para a v0.4.1).

**v0.3.2:** E01 a E10 aprovados em 25/10 (E03: botão da seta fica como está; E04: PDF como imagem até a v1.0.0; E05: datas de 2000 a 2100; E10: um Ctrl+Z apaga o post-it novo inteiro).

**v0.3.1:** D01 a D11 aprovados em 25/10 (páginas, legenda, tarefa/GUT, Kanban com GUT, barra vertical, cores no celular, Assistente, modelos, PDF por página, nomes Atividade e Entrada/Saída, correções).

**v0.3.0:** C01 a C16 aprovados em 25/10: quadro, Q-001 por item, próximo passo, alinhamento automático, barra da seleção, Kanban, raias/temporizador/minimapa/zoom/localizar, PDF/PNG/imprimir, Operador edita o quadro, "em breve", Petróleo como padrão, barra de módulos no celular, fundo do app instalado, aviso com o módulo, sem recarga na primeira visita, fonte no GitHub.

**Ícone:** arte do Elias; no ícone fica só "EFC"; versão maskable para Android; tela de abertura com "EFCdocs". Melhorias na arte: avisar antes.

**Rodada de 25/10 (madrugada):**
- Macros: guardadas e devolvidas intactas, não rodam. Botões com ações próprias do EFCdocs. Tabela dinâmica e segmentação: guardadas; edição depois do básico.
- Demo: 3 ferramentas, 3 arquivos no aparelho, exporta com "DEMO" e "EFC", sem pastas e sem modelos da empresa.
- GridCraft: motor em JavaScript na web, separado das telas; converter depois só se valer a pena.
- Fotos: Firestore comprimido; apagam 15 dias depois de concluído o registro, 45 dias se não concluído; aviso antes e "Baixar fotos"; fica "Foto removida em".
- Depois de lançado: não se apaga (Cancelar com motivo); a regra de prazo vale só para fotos.
- Compactação do conteúdo (5 a 10 vezes menor); ficha sem compactar; revisões só com o que mudou.
- Pastas: criáveis e excluíveis por Principais e Estrela; iniciais Treinamentos, Avaliação de Eficácia, Documentos Internos, Formulários, Fluxogramas; cada uma com Arquivados; vazia exclui com motivo, com lançamentos só arquiva.
- Revisões no editor: selo, rascunho automático, "Concluir revisão" com motivo, aprovação por Principal em Formulários e Documentos Internos, comparar, linha do tempo, cabeçalho automático, marca OBSOLETO, aviso.
- Documentos externos (exceção): só importados, controle por validade, avisos 60/30/7 dias, "Renovar", anterior vira Substituído, nunca se apagam sozinhos.
- Modelos de planilha (cloro, coleta, RNC, Treinamentos): só de teste, sem influenciar o app.
- Canva: pode olhar à vontade, sem copiar o visual.

**Regra nova (25/10):** toda entrega leva um roteiro de verificação do Grok, com o que foi feito, como conferir e uma lista de outros erros para procurar.

## 11. Registro de regras e pedidos novos (acrescentar sempre no fim, com data)

- 04/11/2026 · R14: criar e manter esta memória; toda regra dada vira linha aqui e viaja com cada versão.
- 04/11/2026 · Pedido: documentar tudo o que foi feito, tudo o que falta e as versões, para não perder dado; o Claude lê isto sempre que precisar.
- 04/11/2026 · Defeitos D-01 a D-07 e L-01, L-02 anotados na seção 5.
