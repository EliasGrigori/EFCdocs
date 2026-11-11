# Método Sabiá 2.0

O Método Sabiá e a Auditoria do Cwork juntos num método só, para construir, consertar ou refazer **qualquer sistema** com apoio de IA.

Versão 2.0 · 11/11/2026 · de Elias (José Elias Florêncio Beserra), escrito com o Claude a partir do Sabiá Quiz, do EFCwork (Cwork) e do EFCdocs.

## 1. A ideia em seis linhas

1. **Medir antes de mexer.** Todo sistema começa por uma varredura com números, não por opinião.
2. **Uma versão pequena por vez**, com um assunto só.
3. **Provar o defeito antes de consertar** e provar o conserto depois.
4. **Quem faz não aprova sozinho**: testes, auditoria, conferente de fora, agente de testes e, por último, o dono.
5. **Dado real nunca entra no projeto.** Entra a cópia anonimizada.
6. **Tudo anotado na hora**, e sempre dito o que **não** deu para provar.

## 2. O que mudou em relação ao Sabiá 1 e à Auditoria do Cwork

| Antes | Agora | De onde veio a lição |
|---|---|---|
| Auditoria só do visual ("sem cara de IA") | **Cinco auditorias**: visual, rapidez, fidelidade dos dados, segurança, código e testes | EFCdocs: o app passava no visual e levava 1,2 s para aceitar uma tecla |
| Auditoria feita olhando a tela | **Auditoria medida por programa**, com metas escritas que barram a versão | Cwork: "tamanhos de letra 9 a 11, meta 7" só apareceu quando foi medido |
| Testes com dados inventados pequenos | **Dado parecido com o real** (cópia anonimizada) como teste fixo | EFCdocs: cada versão quebrava na planilha de verdade |
| O próprio sistema conferia o que ele gravava | **Conferente de fora** (outro programa lê o resultado) | EFCdocs: só o EFCdocs lia o Excel que o EFCdocs gravava |
| Consertar pelo relato | **Reproduzir primeiro**; defeito não reproduzido fica aberto, não "corrigido" | EFCdocs: o defeito do congelado foi entregue como corrigido e o dono viu que continuava |
| Varredura só no começo do rework | **Varredura sempre que retomar** um sistema parado ou quando os defeitos se acumulam | EFCdocs: a pausa de 04/11 |
| Um modelo para tudo | **Modelo certo para cada passo** (forte decide, construtor faz, rápido ajusta, outro confere) | Custo e qualidade nos dois projetos |
| Regras espalhadas em conversas | **Ficha do sistema + memória única + features.csv** | Troca de conta e de conversa sem perder nada |
| Sem regra de parada | **Gatilhos de estabilização**: quando parar de criar e só consertar | "Está tendo muitos bugs, é viável continuar?" |
| Cuidado com dado real só no código | **Varredura de dado sensível** também em prints, documentos e exemplos | Um print de referência pode carregar nome, código e valor de verdade |

O que **não** mudou: versões pequenas, `features.csv`, módulos, suíte por módulo, regras em `docs/`, página de aprovação com antes e depois, roteiro do agente de testes, publicar só com a ordem do dono, visual limpo e sem enfeite.

## 3. Ficha do sistema (preencher antes de começar)

Uma página. Sem ela o método não começa, porque é ela que adapta o método a cada sistema.

| Campo | O que escrever |
|---|---|
| Nome e para quem é | O que o sistema faz, em duas frases, e quem usa |
| Dono e palavra de ordem | Quem aprova e a frase exata que libera publicar (ex.: "Poste do Github", "pode publicar") |
| Agente de testes | Quem confere por fora (ex.: Grok) e como recebe o material |
| Peças | Linguagem, bibliotecas, banco de dados, onde roda (navegador, celular, servidor) |
| Comandos | Instalar, montar, testar, servir na máquina, publicar |
| Onde publica | Endereço, repositório, o que precisa ir junto no mesmo envio |
| Dados sensíveis | O que é dado real, onde fica, quem pode ver, como anonimizar |
| Aparelhos | Telas e aparelhos do uso real (ex.: PC com toque 1366×700, celular 384×790) |
| Padrão visual | Cores, fontes, tamanhos, cantos; um arquivo só |
| Metas das auditorias | Os números da seção 6 ajustados para este sistema |
| Conferentes de fora | Que outro programa lê o que o sistema produz |
| O que não pode quebrar | As funções e os dados que valem mais |

## 4. As fases

### Fase 0 · Varredura (uma vez por sistema, e de novo ao retomar)

Nada do sistema muda nesta fase. Sai uma página de aprovação com:

1. **Inventário**: `features.csv` com todas as funções e a situação de cada uma (funciona, com defeito, parcial, falta, ainda não feito).
2. **Uso real**: o dono marca cada tela e função como "todo dia / às vezes / nunca". Isso decide o que fica à vista e o que vai para o fundo.
3. **As cinco auditorias medidas** (seção 6) e uma **nota de 0 a 10 por módulo**, com o motivo.
4. **Defeitos conhecidos reproduzidos** com dado inventado, com print.
5. **Estudo de fora**: como os melhores sistemas e o código aberto resolvem o mesmo problema; licença de cada um; teste prático do candidato mais forte antes de recomendar.
6. **Proposta**: o que manter, o que refazer, modelos de tela, plano de versões pequenas com modelo e esforço de cada uma.

### Fase 1 · Rede de segurança (a primeira versão de todo plano)

Antes de qualquer função nova:

- Suíte de testes **por módulo**, cada uma rodando sozinha.
- **Dado realista anonimizado** como teste fixo.
- **Conferentes de fora** ligados aos testes.
- Programas das auditorias com as metas, rodando em toda versão.
- `MEMORIA-DO-PROJETO.md`, `features.csv` e `docs/` no repositório.

### Fase 2 · Ciclos de versão (repetir até acabar o plano)

O ciclo da seção 5, uma versão por vez. Ordem recomendada dentro de um plano: rede de segurança → o básico que não funciona → rapidez → visual → funções novas.

### Fase 3 · Estabilizar e virar

Quando o plano acaba ou um gatilho da seção 8 dispara: só correção, auditorias completas, uso real pelo dono por um tempo combinado, e a virada (o sistema novo assume, o antigo sai).

## 5. O ciclo de uma versão (nove passos)

| Passo | O que acontece | Pronto quando |
|---|---|---|
| 1. Combinar | Um assunto só. A IA sugere **modelo e esforço em negrito** e espera a ordem de começar | O dono disse "pode iniciar" |
| 2. Provar o antes | Reproduzir cada defeito com dado inventado; medir o que vai melhorar; guardar print e número | Existe o "antes" de cada item. O que não reproduziu fica **aberto** e é dito |
| 3. Fazer | Mudança pequena, dentro do módulo, seguindo `docs/` | O código monta sem avisos |
| 4. Testar | Teste novo que **falha no antes e passa no depois**; a suíte inteira passa | Zero falhas; zero erros no console |
| 5. Auditar | As cinco auditorias medidas; nenhuma meta pode piorar | Todas as metas batidas, ou a exceção escrita para o dono decidir |
| 6. Conferir de fora | O conferente lê o que o sistema produziu; em mudança de alto risco, outro modelo revisa sem ter visto o trabalho | Conferentes sem diferença |
| 7. Entregar | Página de aprovação (antes e depois, um item por mudança), roteiro do agente de testes, memória, `features.csv`, pacote da versão, **o que não deu para provar** | O dono recebeu os arquivos, não só a notícia |
| 8. Aprovar e publicar | O dono responde item por item. Publicar só com a palavra de ordem, seguindo a lista de publicação da ficha | No ar e conferido no endereço |
| 9. Fechar | Anotar decisões, aprovações, descartes e lições na memória; próximos passos; o que conferir ou configurar | Memória atualizada e enviada |

Regras do ciclo:

- **Nada é feito em segundo plano escondido**: o dono vê o trabalho andar e recebe avisos curtos.
- Item reprovado volta para o passo 2, não para o 3.
- Ideia nova no meio da versão vira linha no plano, não entra na versão em andamento.
- A IA nunca escreve "corrigido" para algo que não reproduziu, nem "testado" para algo que só leu.

## 6. A Auditoria Sabiá (as cinco lentes)

Cada lente tem medidas e uma meta padrão. A ficha do sistema pode mudar a meta; o que não pode é ficar sem meta. Medir por programa sempre que der (o kit traz os programas).

**Linha de base e "não pode piorar"** (acrescentado em 11/11/2026, com a rede de segurança do EFCdocs): enquanto o sistema está abaixo da meta, cada versão é comparada com a linha de base (os números da última versão aprovada) e só passa se nenhuma medida piorou. Os programas do kit fazem isso com `--base`. Cuidados:
- A linha de base é medida **com o mesmo método** da comparação. Se o método de medir mudar, mede-se de novo a linha de base no código antigo, e a primeira medida fica guardada como histórico.
- Tempo varia de uma rodada para outra (até 30% com o processador freado): medir cada ação várias vezes, ficar com a mediana e dar uma folga antes de acusar "piorou" (25%; 40% com o processador freado).
- Medir a tela depois que a abertura ou o "carregando" sumiu.
- Quem troca a linha de base é o dono, ao aprovar uma versão que melhorou.

### 6.1 Visual: limpo, profissional, sem cara de IA

| Medida (por tela) | Meta padrão |
|---|---|
| Tamanhos de letra diferentes | até 7 (ideal 5) |
| Tipos de canto | até 3, mais o círculo |
| Altura de botão e de campo | 34 a 36 px no PC, 44 px no toque; nenhum abaixo de 28 px |
| Texto em maiúsculas espaçadas | 0 |
| Sombra e borda no mesmo cartão | nunca as duas |
| Cor forte | só na ação principal e em problema (atraso, erro) |
| Informações por linha de lista | até 2; o resto vai para o detalhe |
| Filtros | um só, recolhível |
| Excluir | ícone de lixeira no canto de cima, nunca botão de texto no rodapé |
| Emoji, bolinha de iniciais de enfeite, pílula de contagem como filtro | 0 |
| Rolagem para o lado | 0 |
| Contraste de texto | 4,5 ou mais |
| Erros no console | 0 |

Conferir em: PC e celular, tema claro e escuro, com e sem dados, com a janela ou gaveta aberta. Texto em português simples, plural certo, sem frase explicando o que um ícone já diz.

### 6.2 Rapidez

| Medida | Meta padrão |
|---|---|
| Ação comum (digitar, clicar, trocar de aba) | menos de 0,1 s |
| Ação pesada (abrir arquivo, gerar relatório) | menos de 1 s, ou aviso de andamento |
| As mesmas ações com o processador 4 vezes mais lento | até 3 vezes o tempo da meta |
| Abrir o sistema | menos de 3 s |
| Rolar | 50 quadros por segundo ou mais |
| Tamanho do que o usuário baixa | meta escrita na ficha, e não crescer sem motivo |

Regra de ouro: **nenhuma ação comum pode custar o tamanho dos dados**. Medir sempre com um conjunto grande (10 a 100 vezes o uso normal).

### 6.3 Fidelidade e dados

- **Ida e volta**: o que entra, sai igual (registro por registro, célula por célula).
- **Conferente de fora**: outro programa lê o resultado e encontra o mesmo.
- **Lista de diferenças conhecidas**: toda diferença que a rede acha e que não se conserta na hora vai para uma lista com o número do defeito ou do limite. Diferença fora da lista faz o teste falhar; quando o defeito é corrigido, a linha sai da lista e o teste passa a cobrar que ele não volte.
- O conferente roda na **mesma língua** do dono (data, mês por extenso e separadores mudam o resultado).
- **Paridade**: nenhuma linha do `features.csv` piora sem decisão do dono.
- **Formato dos dados** não muda sem plano de migração e de volta.
- Dados antigos continuam abrindo.

### 6.4 Segurança e privacidade

- Nenhum dado real, senha ou chave no repositório, **inclusive em prints, documentos e exemplos**.
- Nada do dono (nome da empresa, logo, unidades) fixo no código: vem da configuração.
- Regras de acesso do banco conferidas a cada campo novo.
- Licença de toda biblioteca e de todo código aberto aproveitado, anotada em `docs/CREDITOS.md`.
- Dependências sem falha conhecida grave.

### 6.5 Código e testes

- Arquivo com mais de 800 linhas é dívida: dividir aos poucos.
- Módulos com fronteira clara; nome repetido entre módulos é proibido.
- Suíte por módulo, cada uma roda sozinha; teste não depende de outro teste.
- Teste não usa medida fixa de tela; usa a medida do padrão visual.
- Avisos do montador: 0.
- Toda função do `features.csv` marcada "funciona" tem pelo menos um teste.

## 7. Qual modelo em cada passo

Os nomes dos modelos mudam; os papéis não. A troca de modelo é sempre do dono: a IA pede em negrito e espera.

| Papel | Para quê | Hoje (nov/2026) |
|---|---|---|
| **Forte** | Varredura, estudo de fora, arquitetura, base de dados, rapidez no coração do sistema, decisão difícil de desfazer | Fable 5.2 (ou Opus 5.5) · alto |
| **Construtor** | Fazer as versões do plano, telas novas, refatorar módulo | Opus 5.5 · alto ou médio |
| **Ajustador** | Correções pequenas, textos, ajustes de aprovação, documentos, roteiros | Sonnet 5.5 · alto ou médio |
| **Rápido** | Tarefas repetidas e mecânicas: renomear, converter, conferir listas | Haiku 5.5 |
| **Conferente** | Revisar sem ter visto o trabalho; testar por fora | Outro modelo ou o agente de testes (Grok) |

Subir de degrau quando: duas tentativas falharam; o defeito não reproduz; a mudança toca dados, dinheiro, acesso ou a base; a tarefa junta três ou mais módulos. Descer quando a tarefa é repetir um padrão já aprovado.

## 8. Gatilhos de estabilização (quando parar de criar)

Parar funções novas e entrar em versão só de conserto quando qualquer um acontecer:

- O dono achou 3 ou mais defeitos novos na mesma área em 2 versões seguidas.
- Uma meta de auditoria piorou e não há conserto na mesma versão.
- Um defeito não reproduziu em 2 tentativas: pedir o dado (anonimizado) ou o print; não chutar.
- O conferente de fora encontrou diferença.
- O dono perguntou se vale a pena continuar: responder com números e fazer uma varredura.

## 9. Arquivos padrão do projeto

```
MEMORIA-DO-PROJETO.md      regras do dono (numeradas, com data), decisões, defeitos, versões, pendências
FICHA-DO-SISTEMA.md        a ficha da seção 3
docs/features.csv          todas as funções e a situação de cada uma
docs/                      padrão visual, armadilhas, método, CREDITOS.md
src/<módulo>/              código por módulo
testes/<módulo>/           suíte do módulo + amostras inventadas e seus geradores
scripts/auditoria/         programas das cinco auditorias, com as metas
entregas/<versão>/         página de aprovação, roteiro do agente de testes, pacote, memória
```

A memória tem sempre estas partes: como usar · regras do dono · o que é o sistema · estado atual · defeitos (aberto, corrigido, não reproduzido) · limites conhecidos · pendências do dono e da IA · versões · como publicar · registro por data.

## 10. Como adaptar a cada tipo de sistema

| Tipo | Conferente de fora | Dado realista | Auditoria que pesa mais |
|---|---|---|---|
| App com banco (Cwork, SST, CRM) | Leitura direta do banco e das regras de acesso; cópia do backup em modo de demonstração | Backup anonimizado | Dados e segurança |
| Editor de arquivos (EFCdocs) | LibreOffice, openpyxl, outro leitor do mesmo formato | Arquivo anonimizado | Fidelidade e rapidez |
| Site ou página | Lighthouse, leitor de tela, validador | Conteúdo de exemplo | Visual e rapidez |
| Jogo | Gravação de partida repetível; contador de quadros | Partida gravada | Rapidez |
| Automação e integração (WhatsApp, pagamentos) | Ambiente de teste do fornecedor; registro de cada chamada | Contas de teste | Segurança e dados |

## 11. O que sempre vai escrito na entrega

1. O que foi feito, item por item, com o antes e o depois.
2. Os números das auditorias (meta e medido).
3. **O que não deu para provar** e quem pode provar.
4. O que o dono deve conferir ou configurar.
5. Próximos passos e o **modelo e esforço** da próxima tarefa, em negrito.

## 12. O kit

O método vem com programas que servem para qualquer sistema (pasta `kit/`, com `LEIA-ME.md`): auditoria visual, auditoria de rapidez, varredura de dado sensível, medidas do código, página de aprovação e os modelos (ficha do sistema, memória, `features.csv`, roteiro do agente de testes, texto para começar uma conversa). Todos saem com erro quando uma meta não é batida, para servirem de trava.

Primeira rodada do kit, em 11/11/2026:

| Sistema | Resultado | O que apareceu |
|---|---|---|
| EFCdocs v0.6.9.2 | 0 de 10 telas dentro das metas | 9 a 11 tamanhos de letra, 34 botões abaixo de 28 px na Página Inicial, maiúsculas espaçadas, texto de apoio com pouco contraste; digitar numa planilha grande leva 1,0 s (meta 0,1 s) |
| Cwork v0.5.1 (modo de demonstração, PC, tema Claro) | 0 de 5 telas dentro de tudo; sem contar o contraste, 1 de 5 | Texto de apoio com contraste 3,4 a 3,7 (meta 4,5; uma cor resolve); 4 a 5 tipos de canto em 4 telas (sobram 5 px e 8 px); 8 tamanhos de letra no Início e no Painel. No celular, os botões das colunas da tabela têm 22 px |

O contraste é uma medida nova: a Auditoria do Cwork não media. Por isso o próprio Cwork aparece fora nesse ponto.
