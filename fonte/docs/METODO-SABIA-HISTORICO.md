versão 2.1.0 · 15/11/2026

# Histórico do Método Sabiá

## 2.1.0 · 15/11/2026

Origem: dois revisores novos (agentes sem a conversa) leram o Sabiá 2.0 e acharam 20 problemas, 3 bloqueantes. Os dois, cada um sem ver o outro, acharam a mesma contradição nas regras de barrar. O dono aprovou as 14 mudanças em 15/11/2026.

| # | Mudança | Onde está no 2.1 |
|---|---|---|
| 1 | Uma regra só para barrar: nenhuma medida de programa piora contra a linha de base; meta absoluta só em tela nova e na Fase 3; a primeira linha de base sai da Fase 0 | Seções 4, 5 (passo 5) e 7 |
| 2 | Cada medida marcada "programa" ou "olho"; só a de programa barra; a de olho vira lista de conferência na página de aprovação | Seção 7 |
| 3 | Kit, habilidades e instruções num repositório só (`EFC-Claude-Base`), com versão e conferência antes de começar; cópia do kit no projeto com `KIT-VERSAO`; pasta `modelos/` criada | Seções 2 e 13 |
| 4 | Caminho para sistema novo: Fase 0 curta e rede de segurança que cresce com o app | Seção 4 |
| 5 | Nota do módulo calculada pelas metas batidas | Seção 4, Fase 0 |
| 6 | Nomes fixos: conferente de fora, revisor novo, agente de testes; "alto risco" definido | Seções 5 e 8 |
| 7 | Plano de volta na ficha; dois números por versão na memória | Seções 3, 5 e 10 |
| 8 | Carga grande e processador freado só onde a rapidez pesa; folga escrita como no kit | Seções 7.2 e 11 |
| 9 | Histórico fora do método; colunas do `features.csv`; lista de publicação na ficha; "mesma área" = mesmo módulo | Este arquivo e seções 3, 9 e 10 |
| 10 | Trilho leve para mudança pequena, com página de aprovação, roteiro do agente de testes e memória | Seção 5 |
| 11 | Fase 3: 7 dias de uso do dono sem defeito novo antes da virada | Seção 4 |
| 12 | Revisão por revisor novo no fim da Fase 0 e em toda versão de alto risco | Seção 6 |
| 13 | Resposta aos achados com quatro saídas; revisor que falhou é "não rodou"; no máximo uma nova revisão por etapa | Seção 6 |
| 14 | Conferência de desvio entre memória, ficha, `features.csv` e código, ao retomar e na Fase 3 | Seção 4 |

Revisão do próprio 2.1 por um revisor novo de outro modelo (Sonnet 5.5), em 15/11/2026: 8 achados, nenhum bloqueante. Corrigidos 6: a ida e volta (programa do projeto) passa a barrar e é obrigatória em sistema que grava arquivo ou banco; a nota do módulo conta só medidas de programa; a ficha ganhou "caminho", "palavras do dono" e "rapidez pesa mais?"; os dois números da versão foram definidos; defeito não reproduzido: alto risco na primeira vez, gatilho na segunda; mudança de material passa por revisor novo e entra como item na aprovação. Do último achado, corrigida a parte do kit (exemplo de configuração renomeado, `passos.mjs` e `aprovacao.modelo.html` listados na habilidade, ideal de 5 letras marcado como olho). Contestado 1 ("caminho mínimo pesado demais para app minúsculo"): a seção 4 já tem o caminho de sistema novo e a seção 5 o trilho leve. Dispensada a outra parte do último achado ("0,1 s no método e 100 ms no kit"): é o mesmo valor. Foi a única nova revisão desta etapa.

Ficaram de fora por regra do dono: reduzir os papéis de modelo a dois (o dono quer usar todos os modelos) e tirar a cópia da memória da entrega (a memória sobe junto com cada versão).

## 2.0.0 · 11/11/2026

O Método Sabiá 1 e a Auditoria do Cwork juntos num método só.

| Antes | No 2.0 | De onde veio a lição |
|---|---|---|
| Auditoria só do visual ("sem cara de IA") | Cinco auditorias: visual, rapidez, fidelidade dos dados, segurança, código e testes | EFCdocs: o app passava no visual e levava 1,2 s para aceitar uma tecla |
| Auditoria feita olhando a tela | Auditoria medida por programa, com metas escritas | Cwork: "tamanhos de letra 9 a 11, meta 7" só apareceu quando foi medido |
| Testes com dados inventados pequenos | Dado parecido com o real (cópia anonimizada) como teste fixo | EFCdocs: cada versão quebrava na planilha de verdade |
| O próprio sistema conferia o que ele gravava | Conferente de fora | EFCdocs: só o EFCdocs lia o Excel que o EFCdocs gravava |
| Consertar pelo relato | Reproduzir primeiro; defeito não reproduzido fica aberto | EFCdocs: o defeito do congelado foi entregue como corrigido e continuava |
| Varredura só no começo do rework | Varredura sempre que retomar | EFCdocs: a pausa de 04/11 |
| Um modelo para tudo | Modelo certo para cada passo | Custo e qualidade nos dois projetos |
| Regras espalhadas em conversas | Ficha do sistema + memória única + `features.csv` | Troca de conta e de conversa sem perder nada |
| Sem regra de parada | Gatilhos de estabilização | "Está tendo muitos bugs, é viável continuar?" |
| Cuidado com dado real só no código | Varredura de dado sensível também em prints, documentos e exemplos | Um print pode carregar nome, código e valor de verdade |

Primeira rodada do kit, em 11/11/2026:

| Sistema | Resultado | O que apareceu |
|---|---|---|
| EFCdocs v0.6.9.2 | 0 de 10 telas dentro das metas | 9 a 11 tamanhos de letra, 34 botões abaixo de 28 px na Página Inicial, maiúsculas espaçadas, texto de apoio com pouco contraste; digitar numa planilha grande levava 1,0 s |
| Cwork v0.5.1 (demonstração, PC, tema Claro) | 0 de 5 telas dentro de tudo; sem o contraste, 1 de 5 | Contraste 3,4 a 3,7; 4 a 5 tipos de canto; 8 tamanhos de letra no Início e no Painel; no celular, botões de 22 px |

## 1.0 · antes de 11/11/2026

Método Sabiá 1, criado no rework do EFCquiz (Sabiá Quiz): versões pequenas, `features.csv`, módulos, suíte por módulo, regras em `docs/`, página de aprovação com antes e depois, roteiro do agente de testes, publicar só com a ordem do dono, visual limpo e sem enfeite.
