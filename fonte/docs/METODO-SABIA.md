versão 2.1.0 · 15/11/2026

# Método Sabiá 2.1

O método de Elias (José Elias Florêncio Beserra) para construir, consertar ou refazer **qualquer sistema** com apoio de IA: app com banco, editor de arquivos, site, jogo, automação. Escrito com o Claude a partir do Sabiá Quiz, do EFCwork (Cwork) e do EFCdocs (Vértice Docs). O que mudou de uma versão para outra fica em `HISTORICO.md`.

## 1. A ideia em seis linhas

1. **Medir antes de mexer.** Todo sistema começa por uma varredura com números, não por opinião.
2. **Uma versão pequena por vez**, com um assunto só.
3. **Provar o defeito antes de consertar** e provar o conserto depois. Defeito não reproduzido fica **aberto**. Nunca escrever "corrigido" para o que não reproduziu, nem "testado" para o que só leu.
4. **Quem faz não aprova sozinho**: testes, auditoria, conferente de fora, revisor novo quando o risco é alto, agente de testes e, por último, o dono.
5. **Dado real, senha e chave nunca entram no projeto**, nem em prints, documentos, exemplos ou no repositório de materiais. Entra a cópia anonimizada, que o dono revisa antes.
6. **Tudo anotado na hora** na `MEMORIA-DO-PROJETO.md`, e toda entrega diz o que **não** deu para provar.

## 2. Onde ficam o método e o kit

Todo o material de trabalho fica num repositório só, próprio do Claude: **`EliasGrigori/EFC-Claude-Base`** (privado).

| Pasta | O que tem |
|---|---|
| `metodo/` | Este método e o `HISTORICO.md` |
| `kit/` | Os programas das auditorias e a pasta `modelos/` |
| `habilidades/` | As habilidades do Elias, uma pasta por habilidade |
| `instrucoes/` | Como trabalhar com o Elias (regras que valem em todo projeto) |
| `RECOMENDADOS.md` | O que é obrigatório e o que é recomendado em todo projeto |
| `VERSOES.md` | A versão atual de cada material e o que mudou |

Regras do repositório:

0. **Todo projeto se liga ao `EFC-Claude-Base`.** A ficha de cada sistema diz de qual versão do repositório ele parte. É **obrigatório** ter a habilidade `metodo-sabia` (e com ela o método, o kit e as instruções). O resto do que está em `RECOMENDADOS.md` é recomendado. Só entra nessa lista o que o dono pediu ou aprovou depois de uma recomendação da IA.
1. **O repositório manda.** Cada material tem a versão em `VERSOES.md`. O método, as instruções e o kit trazem a versão também na primeira linha. A habilidade se confere pelo texto: o `SKILL.md` do repositório tem de ser igual ao da conta (comparar os dois arquivos, por exemplo com `diff`).
2. **Conferir a versão antes de começar.** Ao começar, retomar ou lançar um projeto, o Claude compara o repositório com a cópia que ele tem (no projeto ou na conta). Se houver diferença, atualiza a própria cópia a partir do repositório e diz ao dono o que mudou. Isso vale porque o mesmo material pode estar em uso em outras contas do Claude.
3. **Habilidade da conta desatualizada:** o Claude propõe a atualização ao dono, pelo cartão de habilidade. Não se edita a cópia sincronizada à mão.
4. **Atualizar com aprovação.** Quando uma versão de um projeto muda um material (método, kit, habilidade ou instrução), a mudança passa por revisor novo (seção 6) antes da página de aprovação e entra nela como item próprio. Aprovada, o repositório é atualizado no mesmo envio da publicação. A versão sobe em `VERSOES.md`, com uma linha do que mudou. Nada vai para o repositório sem aprovação do dono.
5. **O projeto guarda uma cópia do kit** (por exemplo `scripts/sabia/`) com o arquivo `KIT-VERSAO` dizendo de qual versão ela veio. A cópia nunca é mudada dentro do projeto: muda-se no repositório e a cópia é renovada.

## 3. Ficha do sistema (preencher antes de começar)

Uma página por sistema. Sem ela o método não começa, porque é ela que adapta o método a cada sistema. Modelo em `kit/modelos/FICHA-DO-SISTEMA.modelo.md`.

| Campo | O que escrever |
|---|---|
| Nome e para quem é | O que o sistema faz, em duas frases, e quem usa |
| Caminho | Sistema existente ou sistema novo (seção 4) |
| Ligação | Versão do `EFC-Claude-Base` de que o sistema parte e quais recomendados ele usa |
| Dono e palavra de ordem | Quem aprova e a frase exata que libera publicar (ex.: "Poste do Github", "pode publicar") |
| Agente de testes | Quem testa por fora (ex.: Grok: defeitos que passaram e revisão total) e como recebe o material |
| Peças | Linguagem, bibliotecas, banco de dados, onde roda (navegador, celular, servidor) |
| Comandos | Instalar, montar, testar, servir na máquina, publicar |
| Lista de publicação | Onde publica e tudo que precisa ir junto no mesmo envio, em ordem |
| Plano de volta | Como voltar para a versão anterior se a publicada quebrar, e quem decide |
| Dados sensíveis | O que é dado real, onde fica, quem pode ver, como anonimizar |
| Palavras do dono | Onde fica a lista para a varredura de dado sensível (sempre fora do projeto) |
| Aparelhos | Telas e aparelhos do uso real (ex.: PC com toque 1366×700, celular 384×790) |
| Padrão visual | Cores, fontes, tamanhos, cantos; um arquivo só |
| Metas das auditorias | Os números da seção 7 ajustados para este sistema, com a linha de base |
| Conferentes de fora | Que outro programa lê o que o sistema produz |
| Rapidez pesa mais? | Sim ou não. Vem da tabela da seção 11 pelo tipo de sistema; a ficha só muda com o motivo escrito |
| O que não pode quebrar | As funções e os dados que valem mais |

## 4. As fases

Há dois caminhos. **Sistema existente** (rework, retomada, sistema com defeitos acumulados) usa as fases completas. **Sistema novo** (ainda não existe código) usa as versões curtas marcadas abaixo.

### Fase 0 · Varredura (nada do sistema muda)

**Sistema existente** (uma vez por sistema, e de novo ao retomar). Sai uma página de aprovação com:

1. **Inventário**: `features.csv` com todas as funções e a situação de cada uma (seção 10).
2. **Uso real**: o dono marca cada tela e função como "todo dia / às vezes / nunca". Isso decide o que fica à vista e o que vai para o fundo.
3. **As cinco auditorias medidas** (seção 7). Esses números viram a **primeira linha de base**.
4. **Nota de 0 a 10 por módulo**, calculada: medidas de programa dentro da meta ÷ medidas de programa feitas no módulo × 10, arredondada. Cada tela e cada ação medida pertence a um módulo (a ficha diz qual); medida de olho não entra na conta. A nota não é opinião; o motivo é a lista das medidas fora da meta.
5. **Defeitos conhecidos reproduzidos** com dado inventado, com print.
6. **Conferência de desvio**: um agente compara a memória, a ficha e o `features.csv` com o código e lista só as diferenças (o que o documento diz e o código não faz, e o contrário).
7. **Estudo de fora**: como os melhores sistemas e o código aberto resolvem o mesmo problema; licença de cada um; teste prático do candidato mais forte antes de recomendar.
8. **Proposta**: o que manter, o que refazer, modelos de tela, plano de versões pequenas com modelo e esforço de cada uma.
9. **Revisão por revisor novo** da proposta, antes da página de aprovação (seção 6).

**Sistema novo**: ficha, `features.csv` com as funções planejadas (situação "ainda não feito"), estudo de fora e proposta com o plano de versões, revisada por revisor novo. Não há linha de base: as metas valem direto, como em tela nova.

### Fase 1 · Rede de segurança (a primeira versão de todo plano)

**Sistema existente**, antes de qualquer função nova:

- Suíte de testes **por módulo**, cada uma rodando sozinha.
- **Dado realista anonimizado** como teste fixo.
- **Conferentes de fora** ligados aos testes.
- Programas das auditorias com as metas, rodando em toda versão.
- `MEMORIA-DO-PROJETO.md`, `features.csv` e `docs/` no repositório do projeto.

**Sistema novo**: a rede cresce com o app. No começo, um teste de fumaça (o app abre e a tela principal aparece sem erro no console) e a varredura de dado sensível. Cada módulo novo chega com a sua suíte. O conferente de fora entra quando o sistema passar a gravar arquivo ou banco.

### Fase 2 · Ciclos de versão (repetir até acabar o plano)

O ciclo da seção 5, uma versão por vez. Ordem recomendada dentro de um plano: rede de segurança → o básico que não funciona → rapidez → visual → funções novas.

### Fase 3 · Estabilizar e virar

Quando o plano acaba ou um gatilho da seção 9 dispara:

1. Só correção, auditorias completas e conferência de desvio.
2. Aqui vale a **meta absoluta**: toda meta de programa batida, ou a exceção escrita e aprovada pelo dono.
3. **Uso real pelo dono por 7 dias** sem defeito novo. Um defeito novo zera a contagem.
4. **Virada**: o dono dá a palavra de ordem, o sistema novo assume e o antigo sai do ar (fica guardado para o plano de volta). Num sistema novo, a virada é a versão 1.0.0.

## 5. O ciclo de uma versão

### Dois trilhos

| Trilho | Quando | O que roda |
|---|---|---|
| **Leve** | Mudança pequena: texto, cor, ajuste numa tela, correção dentro de um módulo, sem tocar dados, acesso, dinheiro nem a base | Passos 1 a 4; no passo 5 só os programas do kit; pula o passo 6; passos 7 a 9 completos (página de aprovação, roteiro do agente de testes e memória continuam) |
| **Completo** | Todo o resto, toda versão de **alto risco** e toda versão da Fase 3 | Os nove passos |

**Alto risco** é qualquer um destes: a mudança toca dados, dinheiro, acesso ou a base; junta três ou mais módulos; duas tentativas já falharam; o defeito não reproduz. São os mesmos sinais de subir de degrau de modelo (seção 8). Na dúvida, trilho completo. Defeito que não reproduziu na primeira tentativa já deixa a versão em alto risco; na segunda tentativa sem reproduzir, dispara o gatilho de estabilização (seção 9).

### Os nove passos

| Passo | O que acontece | Pronto quando |
|---|---|---|
| 1. Combinar | Um assunto só e o trilho. A IA sugere **modelo e esforço em negrito** e espera a ordem de começar | O dono disse "pode iniciar" |
| 2. Provar o antes | Reproduzir cada defeito com dado inventado; medir o que vai melhorar; guardar print e número | Existe o "antes" de cada item. O que não reproduziu fica **aberto** e é dito |
| 3. Fazer | Mudança pequena, dentro do módulo, seguindo `docs/` | O código monta sem avisos |
| 4. Testar | Teste novo que **falha no antes e passa no depois**; a suíte inteira passa | Zero falhas; zero erros no console |
| 5. Auditar | As medidas da seção 7. **Regra de barrar: nenhuma medida de programa pode piorar contra a linha de base; tela ou função nova tem de bater a meta.** As medidas de olho vão para a lista de conferência da página de aprovação | Regra de barrar cumprida, ou a exceção escrita para o dono decidir |
| 6. Conferir de fora (trilho completo) | O conferente de fora lê o que o sistema produziu. Em alto risco, um revisor novo lê a mudança (seção 6) | Conferentes sem diferença; achados do revisor respondidos |
| 7. Entregar | Enviar os arquivos, não só avisar: página de aprovação (antes e depois, um item por mudança, Aprovado/Reprovado, comentário, "Copiar respostas", lista de conferência de olho); roteiro do agente de testes (o que foi feito, como conferir, outros erros para procurar, o que já é esperado); memória; `features.csv`; pacote da versão (os arquivos montados e os documentos da versão, num zip com o mesmo padrão de nome); números das auditorias (meta, base e medido); **o que não deu para provar** e quem pode provar | O dono recebeu os arquivos |
| 8. Aprovar e publicar | O dono responde item por item. Publicar só com a palavra de ordem, seguindo a lista de publicação da ficha. Se a versão mudou algum material, atualizar o `EFC-Claude-Base` no mesmo envio | No ar e conferido no endereço |
| 9. Fechar | Anotar na memória decisões, aprovações, descartes, lições e os **dois números da versão**: tempo gasto (horas do começo do passo 1 ao fim do passo 8, pelo horário das mensagens, aproximado) e defeitos achados depois da entrega (pelo dono ou pelo agente de testes, até a versão seguinte sair). São indicadores, sem meta: servem para responder com números se o método se paga. Próximos passos; o que conferir ou configurar | Memória atualizada e enviada |

Regras do ciclo:

- **Nada em segundo plano escondido**: o dono vê o trabalho andar e recebe avisos curtos.
- Item reprovado volta para o passo 2, não para o 3.
- Ideia nova no meio da versão vira linha no plano, não entra na versão em andamento.
- A linha de base só muda quando o dono aprova uma versão que melhorou.

## 6. Revisão por revisor novo

Quem fez o trabalho lê o que pensou, não o que escreveu. O revisor novo é um agente aberto do zero, que **não vê a conversa**: recebe só o documento e o código citado nele. Pode ser outro modelo ou o agente de testes, o que é ainda melhor.

**Quando:** no fim da Fase 0, sobre a proposta; em toda versão de alto risco, sobre o plano ou a mudança; quando o método ou uma habilidade muda.

**Os dois papéis:**

- **Leitor novato.** Primeiro escreve, com as próprias palavras, o que o documento propõe e como o sistema funciona segundo ele. Depois lista termos do projeto sem definição, passos que supõem conhecimento não escrito e explicações vagas. Uma paráfrase errada já é um achado: o dono compara com o que queria.
- **Arquiteto cético.** Caça excesso, coisa feita antes da hora, regra que contradiz outra, meta sem como medir e o que já existe e está sendo refeito. Procura no código antes de acusar.

Cada achado vem com gravidade (Bloqueante, Importante ou Detalhe), onde está e por quê. O revisor não elogia: começa pelo que falta.

**Regras da revisão:**

- Se não der para abrir um agente novo, não é revisão nova. Dizer isso ao dono; revisar na mesma conversa não vale.
- Revisor que falhou ou não respondeu fica como **"não rodou"**, nunca como "zero achados". Tentar de novo uma vez.
- No máximo **uma nova revisão** por etapa. O que sobrar depois dela vira troca aceita, escrita para o dono.

**Resposta aos achados.** Quem fez o trabalho dá a cada achado uma saída só:

| Saída | Quando |
|---|---|
| Corrigir | O achado está certo. Dizer a mudança exata |
| Contestar | O achado está errado e a prova está num arquivo que o revisor podia ler (arquivo e trecho, ou decisão escrita no documento). "Foi de propósito" não é prova |
| Perguntar ao dono | O achado parece errado, mas a prova está fora dos arquivos (regra do dono, conversa, costume). Não corrigir: levar ao dono |
| Dispensar | Detalhe que não vale a mudança. Anotar |

Não se muda a gravidade de um achado; se ela parece errada, contestar com o motivo. Não se contesta falta de clareza: se um leitor novo não entendeu, falta contexto no documento.

## 7. A Auditoria Sabiá (as cinco lentes)

Cada medida tem uma meta padrão e um jeito de medir:

- **Programa**: o kit ou um programa do projeto mede. **Só a medida de programa barra a versão** (passo 5).
- **Olho**: alguém confere na tela ou no arquivo. Vai para a lista de conferência da página de aprovação, onde o dono marca.

A ficha pode mudar a meta, nunca deixar a medida sem meta. Quando um projeto ganha um programa para uma medida de olho, ela passa a ser de programa naquele projeto (escrever na ficha).

**Programa do projeto** (marcado assim nas tabelas) é o programa que só o próprio sistema pode ter, como a ida e volta de um formato de arquivo. Ele barra como os do kit. Sistema que grava arquivo ou banco **é obrigado** a ter o programa de ida e volta antes da primeira versão da Fase 2; até lá, essa falta é escrita em toda entrega.

**Linha de base e "não pode piorar".** Enquanto o sistema está abaixo da meta, cada versão é comparada com a linha de base (os números da última versão aprovada). Cuidados:

- A primeira linha de base sai da Fase 0. Ela é medida **com o mesmo método** da comparação; se o método de medir mudar, mede-se de novo a linha de base no código antigo.
- Tempo varia de uma rodada para outra: cada ação é medida 5 vezes e vale a mediana. "Piorou" é mais de 25% (40% com o processador freado) **e** mais de 20 ms.
- Medir a tela depois que a abertura ou o "carregando" sumiu.

### 7.1 Visual: limpo, profissional, sem cara de IA

| Medida (por tela) | Meta padrão | Como mede |
|---|---|---|
| Tamanhos de letra diferentes | até 7 (o ideal de 5 é conferido de olho) | Programa |
| Tipos de canto | até 3, mais o círculo | Programa |
| Botão e campo abaixo do mínimo | nenhum abaixo de 28 px no PC nem de 44 px no toque | Programa |
| Botão e campo no tamanho ideal | 34 a 36 px no PC | Olho |
| Texto em maiúsculas espaçadas | 0 | Programa |
| Emoji | 0 (ícones desenhados) | Programa |
| Rolagem para o lado | 0 | Programa |
| Contraste de texto | 4,5 ou mais | Programa |
| Erros no console | 0 | Programa |
| Sombra e borda no mesmo cartão | nunca as duas | Olho |
| Cor forte | só na ação principal e em problema (atraso, erro) | Olho |
| Informações por linha de lista | até 2; o resto vai para o detalhe | Olho |
| Filtros | um só, recolhível (botão com resumo que abre um painel) | Olho |
| Excluir | ícone de lixeira no canto de cima, nunca botão de texto no rodapé | Olho |
| Bolinha de iniciais de enfeite, pílula de contagem como filtro | 0 | Olho |
| Texto | português simples, plural certo, sem frase explicando o que um ícone já diz | Olho |

Conferir em: PC e celular, tema claro e escuro, com e sem dados, com a janela ou gaveta aberta. Nada do dono (empresa, logo, unidades) fixo no código.

### 7.2 Rapidez

| Medida | Meta padrão | Como mede |
|---|---|---|
| Ação comum (digitar, clicar, trocar de aba) | menos de 0,1 s | Programa |
| Ação pesada (abrir arquivo, gerar relatório) | menos de 1 s, ou aviso de andamento | Programa |
| As mesmas ações com o processador 4 vezes mais lento | até 3 vezes o tempo da meta | Programa, só onde a rapidez pesa |
| Abrir o sistema | menos de 3 s | Olho, até o projeto ter programa |
| Rolar | 50 quadros por segundo ou mais | Olho, até o projeto ter programa |
| Tamanho do que o usuário baixa | meta na ficha; não crescer mais de 2% sem motivo | Olho, até o projeto ter programa |

Regra de ouro: **nenhuma ação comum pode custar o tamanho dos dados**. O conjunto grande (10 a 100 vezes o uso normal) e o processador freado só são obrigatórios onde a seção 11 diz que a rapidez pesa mais. Nos outros sistemas, basta o uso normal.

### 7.3 Fidelidade e dados

| Medida | Meta | Como mede |
|---|---|---|
| Ida e volta: o que entra sai igual (registro por registro, célula por célula) | 0 diferenças fora da lista de conhecidas | Programa do projeto |
| Conferente de fora lê o resultado e encontra o mesmo | 0 diferenças fora da lista | Programa do projeto |
| Dados antigos continuam abrindo | sempre | Programa do projeto |
| Paridade: nenhuma linha do `features.csv` piora sem decisão do dono | 0 | Olho |
| Formato dos dados não muda sem plano de migração e de volta | sempre | Olho |

**Lista de diferenças conhecidas**: toda diferença que a rede acha e que não se conserta na hora vai para a lista, com o número do defeito ou do limite. Diferença fora da lista faz o teste falhar; quando o defeito é corrigido, a linha sai da lista e o teste passa a cobrar que ele não volte. O conferente roda na **mesma língua** do dono (data, mês por extenso e separadores mudam o resultado).

### 7.4 Segurança e privacidade

| Medida | Meta | Como mede |
|---|---|---|
| Senhas, chaves, e-mails, CPF, CNPJ, telefones e palavras do dono (lista guardada fora do projeto) | 0 achados | Programa (`varredura-sensivel.py`) |
| Imagens, prints e arquivos de escritório | sem dado real | Olho (a varredura lista os arquivos) |
| Regras de acesso do banco | conferidas a cada campo novo | Olho, e revisor novo em alto risco |
| Licença de toda biblioteca e de todo código aberto aproveitado | anotada em `docs/CREDITOS.md` | Olho |
| Dependências com falha conhecida grave | 0 | Programa (ex.: `npm audit`) |

### 7.5 Código e testes

| Medida | Meta | Como mede |
|---|---|---|
| Arquivos acima de 800 linhas | nenhum novo; os atuais diminuem aos poucos | Programa (`medir-codigo.py`) |
| Avisos do montador | 0 | Programa |
| Suíte inteira | 0 falhas | Programa |
| Função marcada "funciona" no `features.csv` tem teste | todas | Olho |
| Módulos com fronteira, sem nome repetido; teste sem depender de outro teste e sem medida fixa de tela | sempre | Olho |

## 8. Qual modelo em cada passo

Os nomes dos modelos mudam; os papéis não. A troca de modelo é sempre do dono: a IA pede em negrito e espera.

| Papel | Para quê | Hoje (nov/2026) |
|---|---|---|
| **Forte** | Varredura, estudo de fora, arquitetura, base de dados, rapidez no coração do sistema, decisão difícil de desfazer | Fable 5.2 ou Opus 5.5 · alto |
| **Construtor** | Versões do plano, telas novas, refatorar módulo | Opus 5.5 · alto ou médio |
| **Ajustador** | Correções pequenas, textos, ajustes de aprovação, documentos e roteiros | Sonnet 5.5 · alto ou médio |
| **Rápido** | Tarefas repetidas e mecânicas: renomear, converter, conferir listas | Haiku 5.5 |
| **Revisor novo** | Ler sem ter visto o trabalho (seção 6) | Outro modelo ou o agente de testes |

Os degraus, do mais baixo ao mais alto: Rápido, Ajustador, Construtor, Forte. Subir quando a tarefa é de alto risco (seção 5). Descer quando é repetir um padrão já aprovado.

Nomes que não se misturam: **conferente de fora** é um programa que lê o que o sistema produziu; **revisor novo** é um agente que lê o documento ou a mudança sem ter visto a conversa; **agente de testes** (hoje o Grok) testa o sistema por fora seguindo o roteiro, procura os defeitos que podem ter passado pela rede e faz a revisão total do sistema, não só do que mudou.

## 9. Gatilhos de estabilização (quando parar de criar)

Parar funções novas e entrar em versão só de conserto quando qualquer um acontecer:

- O dono achou 3 ou mais defeitos novos no mesmo módulo em 2 versões seguidas.
- Uma medida de programa piorou contra a linha de base e não há conserto na mesma versão.
- Um defeito não reproduziu em 2 tentativas: pedir o dado (anonimizado) ou o print; não chutar.
- O conferente de fora encontrou diferença fora da lista de conhecidas.
- O dono perguntou se vale a pena continuar: responder com números (inclusive os dois números de cada versão) e fazer uma varredura.

## 10. Arquivos padrão do projeto

```
MEMORIA-DO-PROJETO.md      regras do dono (numeradas, com data), decisões, defeitos, versões, pendências
FICHA-DO-SISTEMA.md        a ficha da seção 3
docs/features.csv          todas as funções e a situação de cada uma
docs/                      padrão visual, armadilhas, CREDITOS.md
src/<módulo>/              código por módulo
testes/<módulo>/           suíte do módulo + amostras inventadas e seus geradores
scripts/sabia/             cópia do kit, com o arquivo KIT-VERSAO
entregas/<versão>/         página de aprovação, roteiro do agente de testes, pacote, memória
```

**`features.csv`** (separado por ponto e vírgula): `id;modulo;grupo;funcao;situacao;defeito_ou_falta;acao_no_plano;origem`. A `situacao` é uma destas: **funciona**; **com defeito** (existe e erra); **parcial** (existe, mas falta parte); **falta** (devia existir e não existe, porque havia no sistema antigo ou no original); **ainda não feito** (planejada no plano de versões).

**A memória** tem sempre estas partes: como usar · regras do dono · o que é o sistema · estado atual · defeitos (aberto, corrigido, não reproduzido) · limites conhecidos · pendências do dono e da IA · versões, com os dois números de cada uma (tempo gasto e defeitos achados depois da entrega) · como publicar · registro por data. Modelos em `kit/modelos/`.

## 11. Como adaptar a cada tipo de sistema

| Tipo | Conferente de fora | Dado realista | Auditoria que pesa mais | Carga grande e processador freado |
|---|---|---|---|---|
| App com banco (Cwork, SST, CRM) | Leitura direta do banco e das regras de acesso; cópia do backup em modo de demonstração | Backup anonimizado | Dados e segurança | Não |
| Editor de arquivos (EFCdocs) | LibreOffice, openpyxl, outro leitor do mesmo formato | Arquivo anonimizado | Fidelidade e rapidez | Sim |
| Site ou página | Lighthouse, leitor de tela, validador | Conteúdo de exemplo | Visual e rapidez | Não |
| Jogo | Gravação de partida repetível; contador de quadros | Partida gravada | Rapidez | Sim |
| Automação e integração (WhatsApp, pagamentos) | Ambiente de teste do fornecedor; registro de cada chamada | Contas de teste | Segurança e dados | Não |

## 12. O que sempre vai escrito na entrega

1. O que foi feito, item por item, com o antes e o depois.
2. Os números das auditorias (meta, linha de base e medido) e a lista de conferência de olho.
3. **O que não deu para provar** e quem pode provar.
4. O que o dono deve conferir ou configurar (por exemplo, no Firebase).
5. Se algum material do `EFC-Claude-Base` mudou, e para qual versão.
6. Próximos passos e o **modelo e esforço** da próxima tarefa, em negrito.

## 13. O kit

Fica em `kit/` no `EFC-Claude-Base`, com `LEIA-ME.md`: auditoria visual, auditoria de rapidez, varredura de dado sensível, medidas do código, página de aprovação, servidor simples e a pasta `modelos/` (ficha do sistema, memória do projeto, `features.csv`, roteiro do agente de testes, configuração de exemplo e o texto para começar uma conversa). Todos os programas saem com erro quando a regra de barrar não é cumprida, para servirem de trava.
