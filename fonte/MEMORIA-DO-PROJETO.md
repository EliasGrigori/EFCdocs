# MEMÓRIA DO PROJETO — EFCdocs

Atualizado em 11/11/2026 · App agora chamado **Vértice Docs** (R23) · GitHub e site na **v0.6.10** (commit fa847e1) · v0.6.10.1 (nome e capa) aprovada e publicada · · v0.6.9.2 pronta e não publicada (entra como ponto de partida da base nova)

> **Este arquivo é a memória do projeto.** O Claude lê ele PRIMEIRO em toda conversa nova e grava de volta ao fechar cada versão.
> Ele viaja em toda entrega (pasta da versão, ZIP da fonte e repositório), para nada se perder.
> **Para o Elias:** diga "regra nova: ..." (ou "grava isso") e o Claude coloca na seção 2, com a data, na mesma hora. Nada que você disser como regra fica só na conversa.
> Detalhe de cada versão (itens aprovados, achados do Grok, números dos testes): `ESTADO.md` e `PROGRESSO.md`.

---

## 1. Quem usa e como

- Elias, dono do projeto: trabalha com Controle e Gestão da Qualidade; desenvolvedor júnior com apoio de IA. Escreve em português informal.
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
| R16 | **Padrão do Cwork + Método Sabiá vale para o EFCdocs**: versões pequenas, cada uma testada; `features.csv` com as funções; código em módulos com uma suíte por módulo; regras em `docs/`; página de aprovação por item (Aprovado/Reprovado, comentário, "Copiar respostas"); **auditoria visual do Cwork** por tela (sem maiúsculas espaçadas, poucos tamanhos de letra, 3 tipos de canto, botões 34 px no PC e 44 px no celular, um filtro recolhível, ícones desenhados, sem emoji, nada da empresa fixo no código; PC e celular, claro e escuro). | 10/11 |
| R17 | **Visual do EFCdocs = visual do Cwork** (aprovado 10/11): dois temas, Claro (marfim + ouro, botão principal em degradê dourado) e Escuro (o Dourado original: fundo #0b0d16, ouro #d9b46a); títulos Fraunces, texto Source Sans 3. Substitui os 16 temas e o estilo Camadas onde baterem. | 10/11 |
| R18 | **Manter todas as funções atuais** da Planilha; primeiro consertar o básico que não funciona, depois deixar bonito, moderno e bem otimizado ("era muito feio e mal otimizado"). | 10/11 |
| R19 | Pode-se usar como base o **código aberto de um clone do Excel** (o Elias autorizou estudar e aproveitar as fontes), respeitando a licença de cada projeto. | 10/11 |
| R20 | **Método Sabiá 2.0** (Sabiá + Auditoria do Cwork, de 11/11) vale para o EFCdocs e para qualquer sistema: ficha do sistema, fases (varredura, rede de segurança, ciclos, estabilizar), ciclo de 9 passos, **cinco auditorias com metas que barram a versão** (visual, rapidez, fidelidade, segurança, código), modelo por papel (forte, construtor, ajustador, rápido, conferente), gatilhos de estabilização e "o que não deu para provar" em toda entrega. Documento em `docs/METODO-SABIA-2.md`; programas em `scripts/sabia/`. | 11/11 |
| R21 | **Faixa de comandos familiar ao Excel** (C03 reprovado em 11/11: "quero que seja familiar ao exemplo"): a faixa continua no jeito do Excel (abas com grupos de comandos), só redesenhada no visual do Cwork; nada de faixa de uma linha com "Todos os comandos". | 11/11 |
| R22 | **Revamp no visual do Cwork** (A03 e C02, 11/11): refazer os ícones do menu de navegação de cima e os das abas laterais, o tema Claro (precisa passar na auditoria do Cwork) e o ícone do filtro de coluna no padrão do Cwork. Entra na v0.6.13. | 11/11 |
| R23 | **Nome do app: Vértice Docs** (11/11/2026, com ícones e logo enviados em `vertice-docs_icones.zip`, guardados em `fonte/docs/marca/`). Tudo que a pessoa vê diz "Vértice Docs" (constante `NOME_APP` em `nucleo/modelo.js`); o logo horizontal diz "EFC Vértice Docs". **Não mudam**: endereço e repositório `EFCdocs`, chaves de dados no aparelho (`efcdocs...`), nome do cache do app e nomes internos do código e dos documentos do projeto | 11/11/2026 |

## 3. Como entregar uma versão (passo a passo)

1. Ler esta memória, `ESTADO.md`, `PROGRESSO.md` e só a próxima versão.
2. Sugerir Modelo/Esforço (R01) e esperar o "pode iniciar".
3. Código em `fonte/` (git em `/home/claude/EFCdocs-repo`). `npm run build` → `fonte/dist`. `npm test` (regras) e `node scripts/testar-navegador.mjs <endereço> <pasta-de-prints>` (navegador; `FILTRO='a|b'` filtra por pedaços do nome).
4. Servidor local de teste: `cd /tmp && python3 /tmp/srv/servir.py <porta> <pasta>` (a pasta atual no raiz, versões antigas em `/vXXX/`). Matar antigo: `fuser -k <porta>/tcp`.
5. Prints de antes e depois só com amostras inventadas; montar a página de aprovação (`scripts/montar-aprovacao.py`), o roteiro do Grok e os 3 ZIPs.
6. Atualizar `ESTADO.md`, `PROGRESSO.md` e **este arquivo**; enviar tudo.
7. Só com a ordem do Elias: commit na `main` com o `dist` copiado para a raiz (R11), conferir o Pages.

## 4. Estado atual

- **No ar:** v0.6.9.1 (9bb3986). **v0.6.9.2 pronta, aguardando aprovação do Elias ("Poste do Github").** Planilha completa em funções: abrir e salvar Excel, fórmulas, gráficos nativos, formas, Painel, impressão e PDF, congelamento, largura e altura.
- **v0.6.10 "Rede de segurança" aprovada inteira e publicada (11/11/2026).** Não muda o app (só o número da versão): suíte de regras por módulo (322 testes), rede de fidelidade (ida e volta + openpyxl + LibreOffice em pt-BR, `npm run test:fidelidade`), as cinco auditorias contra a linha de base (`npm run auditoria`), anonimizador corrigido (D-21), `docs/CREDITOS.md`, `docs/ARMADILHAS-EXCEL.md`, `features.csv` atualizado. A rede achou 4 defeitos novos de ida e volta (D-20, D-22, D-23, D-24), que vão para a v0.6.11. Leva junto as 4 correções da v0.6.9.2 (D03).
- **v0.6.9.1 publicada em 04/11/2026** (ordem do Elias): correções dos prints de 04/11 — ver seção 5.
- **Próxima grande:** v0.7.0 = Documento (editor, POP, formulários, revisões, Word, PDF) + gráfico no Quadro. Já feitos: `src/docx/modelo.js` (blocos, trechos, cabeçalho do POP, sumário) e `src/docx/medidas.js` (larguras Helvetica/Times/Courier, quebra de linha), 11 testes. Arquitetura decidida: edição em fluxo contínuo na largura da folha; páginas de verdade na prévia, no PDF e na impressão; cabeçalho do POP repete em toda página.
- Depois: v0.8.0 pastas e lançamentos · v0.9.0 nuvem e login · v0.10.0 ligação com o EFClaudian · v1.0.0 revisão final.

## 5. Defeitos relatados pelo Elias e situação

| Id | Relato (data) | Causa | Situação |
|---|---|---|---|
| D-01 | Linhas passam por cima das congeladas; riscos somem ao rolar (tela de toque) (04/11) | v0.6.9: congelado desenhado em canvas à parte. v0.6.9.1: (a) a caixa de seleção de célula rolada para baixo do painel congelado era desenhada por cima das colunas congeladas; (b) a linha da ponta do painel usava a posição da coluna seguinte, já rolada, e ficava solta | **Corrigido e PUBLICADO na v0.6.9.1, reproduzido com a planilha dele e coberto por teste.** Elias confirma no aparelho |
| D-02 | Coluna lateral dos números muito grossa (04/11) | 46 px | **Corrigido na v0.6.9.1:** 30 px (cresce só com 4+ dígitos) |
| D-03 | Ao exportar para Excel a planilha não volta com as tabelas (04/11) | O nome de cada coluna da tabela era gravado "aparado" e com a quebra de linha em outro formato; o Excel exige nome **idêntico** ao texto da célula do título, vê diferença, "repara" e apaga a tabela | **Corrigido na v0.6.9.1** (3 tabelas conferidas; Grok OK nos nomes com espaço no fim e `_x000a_`). **Falta abrir no Excel de verdade (pedido de reparo?)** |
| D-04 | Imagens não redimensionam (04/11) | A alça ficava metade para fora da imagem e a imagem corta o que passa da caixa: só o pedaço de dentro aparecia e recebia o clique | **Corrigido na v0.6.9.1** (alça dentro do canto; vale para imagem, botão e gráfico) |
| D-05 | Célula sem linha lateral, sem estar mesclada (RESUMO, zoom 70%, linhas ~1009–1012) (04/11) | Não reproduzido: a planilha de teste não tem esse trecho (a dele tem "100 vezes mais preenchimentos"). Hipótese: texto que passa para a célula vizinha apaga a grade por baixo (como o Excel faz) | **ABERTO.** Precisa do endereço da célula ou de uma amostra (dados inventados) |
| D-06 | Linha horizontal mais grossa depois do cabeçalho nas colunas vazias à direita (ANÁLISES, zoom 70%, print de 04/11) | A investigar (pode ser a linha do congelamento) | **ABERTO** |
| D-07 | Dashboard original com gráficos sobrepostos | Falta o print do original | Aguardando o Elias |
| L-01 | "14.200 fórmulas mostram o último valor do Excel: o EFCdocs ainda não calcula (ex.: `=SINGLE(IF(SINGLE(ANÁLISES!#REF!:ANÁLISES!#REF!)=0,"",ANÁLISES!#REF!))`)". Vêm de células ocultas até onde não havia fórmula; a planilha real tem 100x mais preenchimentos (04/11) | As fórmulas **já estão com #REF! no próprio arquivo do Excel** (referência apagada; valor guardado #REF!). O Excel mostra o mesmo | **v0.6.9.1: o aviso de abertura as separa** ("já vêm com #REF! do próprio Excel"). Quem quiser, limpa essas fórmulas na planilha |
| L-02 | "As 3 tabelas do Excel vêm e voltam ao salvar como Excel; aqui, nas fórmulas, o nome da coluna virou o endereço (ex.: `Tabela1[[#This Row],[Massa (g)]]` virou `$X8`). A conta é a mesma." (04/11) | Escolha de projeto: o motor trabalha com endereços | Limitação conhecida; ao salvar como Excel, as tabelas voltam (ver D-03) |
| D-08 | Grok (v0.6.9.1): bordas de células vazias longe dos dados (ex.: CV a DH) somem no Excel exportado (04/11) | Confirmado: ao ABRIR, células só com formatação mais de 2 colunas à direita do último dado são descartadas (`ler.js`, "células só com formatação muito à direita"), mesmo com borda ou preenchimento | **Corrigido na v0.6.9.2 (aguarda aprovação):** ficam as células vazias com borda ou cor de fundo (teto de 20.000 por aba); formatação invisível continua sendo descartada |
| D-09 | Grok (v0.6.9.1): coluna oculta perde a largura ao exportar (16 vira 9,1), mas continua oculta (04/11) | Confirmado: coluna oculta não guarda a largura (`ler.js` só grava `larg` das visíveis) | **Corrigido na v0.6.9.2 (aguarda aprovação):** a largura é guardada também da coluna oculta; ao salvar sai `width` certo com `hidden`; Reexibir volta ao tamanho original |
| D-10 | Grok (v0.6.9.1): no celular, numa aba em que o congelado ocupa a tela toda, a imagem inserida não aparece (só a barrinha dela) (04/11) | A imagem é presa na célula ativa, que fica fora da tela; a barrinha é que é puxada para dentro | **Corrigido na v0.6.9.2 (aguarda aprovação):** `ancoraNova` (Planilha.jsx): vale a célula ativa à vista, inclusive no congelado; senão a primeira à vista; se o que rola não aparece, a primeira célula do congelado. Também vale para a assinatura. O congelamento em si não muda; **decisão aberta do Elias:** desligar o congelado maior que a tela só no celular? |
| L-03 | Grok (v0.6.9.1): `=SOMA(#REF!)` e `=#REF!+1` não entram na contagem "já vêm com #REF!" (04/11) | Só contava as que o EFCdocs não consegue ler | **Corrigido na v0.6.9.2 (aguarda aprovação):** conta toda fórmula com #REF!, sem contar de novo em "ainda não calcula" |
| D-11 | Elias (04/11, 11:59, com prints): células mescladas aparecem com borda no meio, como se não fossem mescladas | Causa achada: `grade.js` desenha as 4 bordas de cada célula sem consultar as mesclas | **ABERTO** — proposta v0.6.9.3: pular o lado que fica dentro da mesclada |
| D-12 | Elias (04/11): preencher a primeira célula depois da tabela não a faz crescer sozinha | A tabela do EFCdocs é só formato nas células; não existe autoexpansão | **ABERTO** — ver `ESTUDO-REFINAMENTO-PLANILHA.md` (v0.6.10, tabelas vivas) |
| D-13 | Elias (04/11): Tab na última célula da última linha da tabela não abre linha nova | Tab só anda para a direita | **ABERTO** — v0.6.10 |
| D-14 | Elias (04/11): falta a alça no canto inferior direito da tabela para esticar e converter novos espaços em tabela | Não existe | **ABERTO** — v0.6.10 |
| P-01 | Elias (04/11): "Formatar tabela", "Formatar imagens" e "Validações" não existem ainda; o painel é estranho, grosseiro, sem refinamento; pede estudo de refinamento e de mais funções | Existem como janelas simples (tabela: 5 estilos e nada depois; imagem: só largura e texto alternativo; validação: 8 tipos e 3 abas, mas sem prévia nem marcar inválidos); faltam faixa contextual, alças e comportamento "vivo" | **ESTUDO FEITO** (`ESTUDO-REFINAMENTO-PLANILHA.md`); aguarda as respostas do Elias (seção 5 do estudo) |
| D-15 | Elias (04/11, 13:27, print com quadro amarelo): com o painel congelado (linhas 1 a 7), a linha 8 aparece cortada logo abaixo do cabeçalho verde, e os títulos das colunas (Hora da Coleta, Rastreabilidade) ficam por baixo dos botões de filtro | Não analisado ainda; a planilha real é bem mais cheia que as amostras | **ABERTO** — investigar com a amostra anonimizada (ver pergunta de viabilidade) |
| D-16 | Varredura (11/11): **cada digitação custa o tamanho da planilha** (1,2 s em 360 mil células; 5,4 s em PC fraco). A cada tecla: `compactar` a planilha inteira, `indiceCheias`, `usado`, `problemasDaPlanilha`, `lerChave` milhares de vezes | Provado com perfil do processador (`scripts/auditoria/perfil-da-digitacao.mjs`) | **ABERTO** — v0.6.12 "Rápida": células por linha e coluna, atualizar só o que mudou, salvar em segundo plano; meta < 0,1 s |
| D-17 | Varredura (11/11): na mesclada, além da borda no meio (D-11), a célula do canto desenha as próprias 4 bordas ("caixinha" em C1); **estilo de tabela do Excel** (listras) é lido (`est`) mas não é desenhado | Reproduzido com `amostra-auditoria.xlsx` | **ABERTO** — v0.6.11 e v0.6.14 |
| D-18 | Varredura (11/11): 3 chaves repetidas em objetos (`forma` em `ui/icones.js`, `ajustar` em `ui/iconesFaixa.js`, `linha` em `planilha/graficoPlano.js`) — o empacotador avisa | — | **ABERTO** — v0.6.11 |
| D-19 | Varredura de dado sensível (11/11, programa novo do método): a `MEMORIA-DO-PROJETO.md` que está no repositório público (envio 5da442d) traz o nome completo do dono e o lugar onde trabalha | Entrou em 04/11 na seção 3 | **Corrigido na cópia de trabalho** (linha trocada por texto sem o nome da empresa); **o histórico do Git ainda guarda a versão antiga**: decisão do Elias se deixa ou se limpa |
| D-20 | Rede de fidelidade (v0.6.10), amostras inventadas `amostra-anonimizar.xlsx` e `amostra-v0610.xlsx`: **tabela do Excel cujo título é um número (2024, gravado como número) some ao salvar** (vira faixa normal; o aviso diz "vai como faixa normal"). Com o título gravado como texto ("2024"), como o Excel faz, a tabela volta certa (conferido). No uso, deve acontecer se alguém digitar um ano no título dentro do EFCdocs (não provado na tela) | `gravar.js tabelasDaAba` exige título de texto | **ABERTO** — v0.6.11: gravar o título como texto |
| D-21 | Rede de fidelidade (v0.6.10), planilha anonimizada: o **anonimizador** trocava o título da célula (com quebra de linha do Windows, `\r\n`) e o nome da coluna da tabela (só `\n`) por textos **diferentes**; o Excel pediria reparo. 10 de 73 colunas | O texto inventado sai do texto original; `\r\n` e `\n` davam sementes diferentes | **Corrigido na v0.6.10** (ferramenta, não o app): os dois viram o mesmo texto; teste novo falha antes e passa depois; 0 de 73 diferentes |
| D-22 | Rede de fidelidade (v0.6.10), planilha anonimizada: **nome de aba com espaço no fim** (ex.: "Resumo ") perde o espaço ao abrir | `ler.js` apara o nome (`trim`) | **ABERTO** — v0.6.11 |
| D-23 | Rede de fidelidade (v0.6.10), planilha anonimizada: **colunas ocultas até o fim da aba** (AY até XFD) — só as 50 depois do último dado continuam ocultas; no Excel as outras reaparecem (16.285 colunas) | `ler.js`: `ultCol = último dado + 50` corta a faixa `<col max="16384" hidden>` | **ABERTO** — v0.6.11: guardar "ocultas até o fim" |
| D-24 | Rede de fidelidade (v0.6.10), planilha anonimizada e `amostra-v0610.xlsx`: **filtro com critério de data** (mês) de uma tabela — o critério não é lido nem gravado (provado pelo openpyxl); as linhas continuam ocultas, mas deixam de contar como "ocultas pelo filtro". Efeito no SUBTOTAL: na anonimizada, o LibreOffice dá "S/E" no original e erro no arquivo salvo; na amostra inventada, o LibreOffice não respeitou o filtro nem no original. **No Excel falta provar** (pendência do Elias) | `ler.js` só entende filtro por lista de valores | **ABERTO** — v0.6.11: ler e gravar o critério de data |
| A-01 | Rede de fidelidade (v0.6.10): na `amostra-v068.xlsx`, AUX VEL!C8 `SUM(Dados!C2:C4*{1,2,3})` tem valor guardado 2, mas o EFCdocs calcula 9 | O gerador da amostra gravou o 2 de propósito (valor guardado falso) | **Não é defeito**: o LibreOffice recalcula e confirma 9 |

## 6. Pendências

**Do Elias:**
1. Atualizar o app e **conferir se mostra v0.6.9.1** (rodapé do menu "EFCdocs v0.6.9.1").
2. Testar na tela de toque se os riscos ficam no lugar ao rolar (D-01) e abrir no Excel de verdade um arquivo salvo pelo EFCdocs (D-03: tabelas, velocímetros, logotipo, sem pedido de reparo).
3. Mandar o endereço/amostra do D-05 e o print do Dashboard (D-07).
4. Grok: v0.6.9.1 verificada em 04/11 (A01, A02, B01, D01, E01 OK; C01 parcial; falhas D-08 e D-09). Ainda faltam roteiros v0.6.8 e v0.6.9. **Mandar ao Grok também o ZIP de testes** (ele não recebeu as amostras). Não mandar a planilha real ao Grok (R04): só cópia com dados inventados.
5. Listar exceções conhecidas; conferir limites do plano grátis do Firebase e a política de TTL das fotos.
6. **v0.6.10:** mandar a cópia anonimizada da planilha ATUAL; decidir o D-19 (limpar ou não o histórico do Git); responder o roteiro do Grok da v0.6.10; se puder, abrir no Excel de verdade a `amostra-v0610.xlsx` (inventada) e o mesmo arquivo salvo pelo EFCdocs, e comparar "Resumo "!B2 (SUBTOTAL só do que o filtro mostra): é o que prova o D-24 no Excel.

**Do Claude:**
0. Responder ao estudo de refinamento (`ESTUDO-REFINAMENTO-PLANILHA.md`): ordem das versões, faixa contextual ou painel lateral, o que é o "painel estranho".
1. (feito) v0.6.9.1 publicada. **v0.6.9.2 pronta (D-08, D-09, D-10, L-03): esperar a aprovação e a ordem "Poste do Github"; ao publicar, copiar `fonte/dist/*` para a raiz do repositório no mesmo commit.**
2. Investigar D-05 e D-06 quando houver dado.
3. v0.7.0 (Opus 5 · alto): editor do Documento, POP com cabeçalho repetido, sumário, revisões, Word, PDF, impressão; gráfico no Quadro.
4. Lembrete antigo: gráficos usam motor próprio; trocar por ECharts só se o Elias pedir.

**Sem solução ainda:** pasta viva no OneDrive (o computador ligado não tem OneDrive).

## 7. Limitações conhecidas do Excel

- Macros: guardadas e devolvidas intactas, não rodam. Tabela dinâmica e segmentação: guardadas; edição fica para depois.
- Funções que o EFCdocs ainda não calcula mostram o último valor do Excel (a fórmula fica guardada e volta igual).
- Fórmulas com tabela estruturada viram endereços (L-02).
- Fórmulas que o Excel não aceitaria (mais de 8.192 letras, parênteses demais) vão só com o valor ao salvar.
- L-04: fórmulas que dão vazio depois do último dado: ficam 1.000 linhas de folga; o resto não volta ao salvar (aviso ao abrir). Elias decidiu manter as 1.000 por enquanto (B02 da v0.6.10).
- L-05: quebra de linha do Windows (`\r\n`) dentro do texto vira `\n` ao salvar; na tela é igual.
- L-06: a planilha abre no começo, não na posição em que estava rolada (o congelamento volta igual).
- L-07: acima de 300 mil células por aba (800 mil na pasta) a leitura para e avisa.
- Todas as diferenças conhecidas da ida e volta estão em `testes/fidelidade/conhecidas.mjs`; o que sair dessa lista faz o teste falhar. Armadilhas do formato: `docs/ARMADILHAS-EXCEL.md`.

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
| v0.6.9.2 | Relatório do Grok da v0.6.9.1: bordas e cores de células vazias longe dos dados, largura da coluna oculta, imagem no celular com o congelado ocupando a tela, contagem de toda fórmula com #REF! | Sonnet 5.5 · alto | PRONTA, aguardando aprovação. 307 regras + 249 navegador |
| Fase 0 | Varredura, estudo de fora, base nova, features.csv, anonimizador, modelos no visual do Cwork | Fable 5.2 · alto | ENTREGUE 11/11, aguardando aprovação (11 itens) |
| v0.6.10 | Rede de segurança: suíte por módulo, rede de fidelidade (ida e volta, openpyxl, LibreOffice), anonimizada como teste fixo, cinco auditorias contra a linha de base, CREDITOS, ARMADILHAS-EXCEL, features.csv; as 4 correções da v0.6.9.2 | Opus 5.5 · alto | APROVADA inteira e PUBLICADA 11/11. 322 regras + 22 de fidelidade + 249/249 navegador; nenhuma lente piorou |
| v0.6.10.1 | Nome e capa: Vértice Docs (nome em todas as telas, abertura com o logo, ícones novos; endereço, repositório e dados iguais) | Opus 5.5 · alto | APROVADA inteira e PUBLICADA 11/11 |
| v0.6.11 | Básico que não funciona: D-11, D-15, D-17, D-18, D-05, D-06 e os achados da rede D-20, D-22, D-23, D-24 | Opus 5.5 · alto | A FAZER |
| v0.6.10 a v0.6.17 | Rework da Planilha em versões pequenas: Rede de segurança · Básico que não funciona · Rápida · Cara do Cwork · Tabelas vivas · Imagens e objetos · Validação e mescladas · Planilhas comuns | ver `fase-0/FASE-0-VARREDURA-ESTUDO-E-BASE.md` | A FAZER, depois da aprovação |
| v0.7.0 | Docx: editor, POP, formulários, revisões no editor, Word, PDF; gráfico no Quadro | Opus 5 · alto | começada (modelo e medidas do Documento) |
| v0.8.0 | Pastas, lançamentos, arquivados, documentos externos, fotos com prazo | Opus 5.5 · alto | |
| v0.9.0 | Nuvem, login próprio, regras do Firestore, aprovação, avisos, medidor de espaço | Opus 5.5 · alto | |
| v0.10.0 | Ligação com o EFClaudian (PEDIDO para a outra conta) | Sonnet 5.5 · alto | fica para o fim (N11) |
| v1.0.0 | Revisão final, roteiro do Grok, uso real | Sonnet 5.5 · alto | |
| Depois | Tabela dinâmica, segmentação, gráficos raros, Google Drive, edição ao vivo | a definir | |

Cada linha completa (itens aprovados, achados do Grok, números dos testes, commits) está em `ESTADO.md` e `PROGRESSO.md`.

| Versão | O que entra | Modelo · esforço | Situação |
|---|---|---|---|
| v0.6.9.1 | Correções dos prints de 04/11: seleção sob o congelado e risco solto, coluna dos números mais fina (30 px), alça das imagens, tabelas do Excel voltam sem "reparo" (nome das colunas idêntico ao título), aviso de abertura separa as fórmulas com #REF! do Excel; memória do projeto | Sonnet 5.5 · alto | PUBLICADA em 04/11/2026 (commit 9bb3986). 301 regras + 248 navegador |

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
- 04/11/2026 · Ordem: "posta para mim no GitHub e espere o próximo comando": v0.6.9.1 publicada (commit 9bb3986); o Claude para e espera o próximo comando antes de iniciar a v0.7.0.
- 04/11/2026 · Defeitos D-01 a D-07 e L-01, L-02 anotados na seção 5.
- 04/11/2026 · Relatório do Grok da v0.6.9.1 recebido: OK em A01, A02, B01, D01, E01; C01 parcial (celular); falhas novas D-08 (bordas de células vazias) e D-09 (largura da coluna oculta); ressalva L-03. Conversão de 6 planilhas inventadas: valores, fórmulas, datas, mesclas, congelamento, imagem, tabelas e ocultas iguais ao original. Grok não reproduziu as linhas duplas (D-05/D-06). Aguardando o próximo comando do Elias.
- 04/11/2026 · "pode iniciar": v0.6.9.2 feita (D-08, D-09, D-10, L-03), com teste de regras (`testes/v0692.test.mjs`, 6 casos), 1 caso novo no navegador, amostra inventada `amostra-v0692.xlsx`, página de aprovação, roteiro do Grok e 3 ZIPs. Sem commit até a ordem "Poste do Github".
- 04/11/2026 · Elias pediu (com prints): corrigir mescladas com borda no meio, tabelas vivas (autoexpansão, Tab abre linha, alça no canto) e **um estudo melhor sobre refinamento e mais funções** (Formatar tabela, Formatar imagem, Validação). Feito o estudo `ESTUDO-REFINAMENTO-PLANILHA.md` com plano v0.6.9.3 a v0.6.13; v0.7.0 (Documento) fica depois, salvo decisão dele. Aguardando a resposta.
- 04/11/2026 13:27 · Elias perguntou se é viável continuar com o EFCdocs, por causa da quantidade de bugs. Resposta dada: viável, mas com uma fase de estabilização; proposta de anonimizar a planilha real (mantém a estrutura, troca os dados) para testar. Aguardando a decisão dele.
- 04/11/2026 13:33 · Elias decidiu **pausar** o projeto: quer a planilha anonimizada, mas "não vai ser viável agora". Pediu um **arquivo de continuação** com tudo (etapas, raciocínio, ideias, código, versões, conversa), zipado, para retomar depois na conta principal, com um resumo simples que a IA nova leia e responda com um **parecer de tudo que entendeu**. Feito: `CONTINUACAO-EFCdocs-2026-11-04.zip` (ver `01-LEIA-PRIMEIRO/`).
- 10/11/2026 19:55 · Elias retomou o projeto: "varredura de todo o sistema, estudar de fora o que podemos fazer com os melhores modelos, criar a base bem estruturada, melhorar a planilha", usando o padrão de auditoria do Cwork e do Sabiá. Anexou o EFCwork v0.5.1, o dossiê, a memória e o log da suíte (916 ok, 23 suítes).
- 10/11/2026 20:03 · Decisões: (1) manter todas as funções atuais e melhorar o básico que não funciona; deixar mais bonito e moderno; pode usar código aberto de clone do Excel como base (R18, R19); (2) visual do Cwork aprovado (R17); (3) ferramenta de anonimização: sim. "Pode iniciar" a Fase 0 com **Fable 5.2 · alto**.
- 11/11/2026 · **Fase 0 entregue** (Fable 5.2 · alto), sem mudar o app: (1) varredura com nota por módulo e auditoria visual do Cwork em 42 telas; (2) lentidão provada (D-16); (3) estudo dos clones do Excel de código aberto com teste do Univer 1.4.0 — recomendação: **manter o motor, reestruturar e usar o código aberto como referência, conferente e leitor de formatos antigos**; (4) `features.csv` com 311 funções (`docs/features.csv`, gerado por `scripts/auditoria/features.mjs`); (5) **ferramenta de anonimização** (`ferramentas/anonimizar/`, página única `anonimizar-planilha.html`, 10 testes; suíte de regras agora com 317); (6) modelos da Planilha no visual do Cwork (PC e celular, Claro e Escuro); (7) plano v0.6.10 a v0.6.17. Pasta `fase-0/`. Aguardando as respostas da página de aprovação (11 itens) e a cópia anonimizada da planilha real.
- 11/11/2026 · Achados de método: o LibreOffice está instalado no ambiente e serve de **conferente de fora** (abre, recalcula e desenha o .xlsx); o npm só funciona pelo proxy (`npm --https-proxy="$HTTPS_PROXY" --proxy="$HTTPS_PROXY"` com `NO_PROXY=localhost`). A planilha real do rascunho é antiga (sem a tabela verde dos prints de 04/11).
- 11/11/2026 · A skill `efcdocs-estilo-camadas` fica valendo só até a v0.6.13 ("Cara do Cwork") ser aprovada; depois o padrão visual é o do Cwork (R17).
- 11/11/2026 01:17 · Elias pediu: melhorar o Método Sabiá e a Auditoria do Cwork, juntar os dois e criar um método de programação que sirva para qualquer sistema ("podemos trabalhar com todos os modelos"). Feito o **Método Sabiá 2.0** (R20): documento, kit de programas (auditoria visual e de rapidez, varredura de dado sensível, medidas do código, página de aprovação, modelos) e habilidade `metodo-sabia` proposta para ele salvar. O kit foi rodado no EFCdocs (0 de 10 telas dentro das metas, como esperado) e no Cwork v0.5.1 em modo de demonstração (achados: texto de apoio com contraste 3,4 a 3,7 no tema Claro; 4 a 5 tipos de canto em 4 de 5 telas; 8 tamanhos de letra no Início e no Painel; botões de 22 px nas colunas da tabela no celular).
- 11/11/2026 06:47 · Respostas da Fase 0: A01, A02, A03, B01, C01, C02, D01, D02, D03, E01 **aprovados**; **C03 reprovado** (faixa: "quero que seja familiar ao exemplo" → R21). Comentários: A03 "os ícones do menu de navegação superior, os ícones das abas laterais e a cor claro precisam passar por um revamp para atender a auditoria Cwork"; C02 "ícone do filtro da coluna pode ser padrão Cwork" (→ R22). Decisões que valem: manter o motor (B01); visual do Cwork no PC e no celular (C01, C02); base Sabiá (D01); plano v0.6.10 a v0.6.17 (D02); v0.6.9.2 entra na v0.6.10 (D03). "Pode iniciar" a **v0.6.10 · Opus 5.5 · alto**.
- 11/11/2026 · A cópia anonimizada da planilha atual do Elias ainda não chegou; a v0.6.10 usa como teste fixo a cópia anonimizada da versão antiga (gerada no rascunho), guardada **fora** do repositório (nomes de abas e tabelas não são trocados pelo anonimizador e o repositório é público) até o Elias revisar.

- 11/11/2026 · "Ok pode iniciar" (Opus 5.5): **v0.6.10 "Rede de segurança"** feita, sem mudar o app. (1) Testes divididos por módulo (`testes/nucleo`, `planilha`, `excel`, `quadro`, `documento`, `ferramentas`, `fidelidade`), cada um roda sozinho (`npm run test:<módulo>`); 322 regras. (2) Rede de fidelidade: `testes/fidelidade/comparar.mjs` (célula a célula), `scripts/fidelidade/conferir-openpyxl.py`, `conferir-libreoffice.py` (recalcula em pt-BR), `conferir.mjs` e `conhecidas.mjs`; 15 amostras (a `amostra-v0610.xlsx`, inventada, reproduz D-20, D-22, D-23 e D-24) e a planilha anonimizada (fora do repositório, `EFC_AMOSTRAS_FORA`) sem diferença nova. (3) Achou D-20, D-22, D-23, D-24 (app, para a v0.6.11) e D-21 (anonimizador, corrigido). O LibreOffice recalculou as 26.880 fórmulas da planilha real salva pelo EFCdocs e só uma (a do SUBTOTAL, D-24) deu diferente. (4) `npm run auditoria`: as cinco lentes contra a linha de base `docs/auditorias/base-v0.6.9.2` (remedida com o método novo: mediana de 5 e espera a abertura sumir; a primeira medida acusava "piorou" por variação da máquina). Nenhuma lente piorou. (5) Kit e Método Sabiá 2.0 atualizados (`--base`, passo `sumir`, repetições, lista de diferenças conhecidas). Sem commit até "Poste do Github".
- 11/11/2026 · Elias aprovou a v0.6.10 inteira (A01 a E01). A03: "pode ir no repositório" — a cópia anonimizada da planilha antiga entrou como `testes/amostras/amostra-real-anonimizada.xlsx` (imagem trocada, autor "Anonimo", varredura com as palavras dele sem achado); a original nunca entra. B02: manter 1.000 linhas de folga (L-04). Pediu "poste no github": v0.6.10 publicada junto com a v0.6.9.2. Pediu também trocar o nome e a capa do app para **Vértice Docs** (ícones enviados em `vertice-docs_icones.zip`): vira a v0.6.10.1, antes da v0.6.11.
- 11/11/2026 · v0.6.10 publicada (commit fa847e1). **v0.6.10.1 "Nome e capa"** feita: Vértice Docs em todos os textos visíveis (menu, rodapé, Sobre, título, Instalar, avisos, PDF, autor do Excel e dos comentários), abertura com o logo horizontal no fundo #10222E, ícones 192/maskable/iPhone do pacote do Elias, cor do app instalado #10222E; originais em `docs/marca/`. Endereço, repositório e chaves de dados continuam `efcdocs` (R23).
- 11/11/2026 · v0.6.10.1 aprovada inteira (A01 a A04, E01; endereço e repositório ficam EFCdocs) e publicada. Elias: "Poste do Github e seguir a prx etapa em sequencia, so passa o resumo dela" → v0.6.11 iniciada em seguida.
