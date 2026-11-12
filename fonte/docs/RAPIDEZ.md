# Rapidez · Vértice Docs (EFCdocs)

Como o app fica rápido em planilha grande, e o que não pode ser desfeito sem querer. Ler antes de mexer em `src/nucleo/diff.js`, `src/nucleo/diario.js`, `src/planilha/motor.js`, `src/planilha/indice.js`, na gravação (`src/App.jsx`) e no desenho da grade (`src/planilha/Planilha.jsx`). Criado na v0.6.12 (12/11/2026), defeito D-16 da `MEMORIA-DO-PROJETO.md`.

## Regra de ouro

**Nenhuma ação comum (digitar, apagar, desfazer, formatar uma célula, mover a seleção) pode custar o tamanho da planilha.** Só pode custar o que mudou e o que aparece na tela. Meta: menos de 0,1 s por ação numa planilha de 360 mil células (0,3 s com o processador 4 vezes mais lento). Quem mede: `npm run auditoria` (lente 2) e `node scripts/auditoria/perfil-da-digitacao.mjs`.

## O que custava (medido na Fase 0) e como ficou

| Custo a cada tecla (360 mil células) | Antes | Agora |
|---|---|---|
| Copiar o objeto com todas as células (`por`, para o desfazer) | 173 ms | no lugar, com diário |
| Comparar a planilha inteira para achar o que mudou (`motor.atualizar`) | 133 ms | lê o diário |
| Refazer o índice das células cheias (`indiceCheias`) | 194 ms | índice vivo |
| Varrer tudo para achar a última linha e coluna (`usado`) | 118 ms | vem do índice |
| Gravar o arquivo inteiro no aparelho (`compactar`) | 200 ms | espera a pessoa parar |
| Conferir a planilha inteira (`problemasDaPlanilha`) | 81 ms | espera a pessoa parar |
| Redesenhar a grade: 2 vezes a cada letra, 3 a cada Enter, 5 a cada seta | 5 ms cada | só quando muda, uma vez por quadro |
| Refazer o desenho de todos os ícones da tela (mais de 60) a cada tecla | 2 a 4 ms, e 13 mil nós soltos | ícone guardado |

Medido em 12/11/2026 (mediana de 5, mesma máquina e mesma hora, v0.6.11.1 contra v0.6.12):

| Ação | 360 mil células | Com processador 4× mais lento | Pasta de 31 abas e 50 mil fórmulas | 4× mais lento |
|---|---|---|---|---|
| Digitar um número e Enter | 1.344 → 67 ms | 6.642 → 200 ms | 384 → 67 ms | 3.911 → 301 ms |
| Apagar (Delete) | 739 → 34 ms | 5.784 → 131 ms | 185 → 50 ms | 284 → 164 ms |
| Desfazer | 1.248 → 34 ms | 5.210 → 117 ms | 191 → 36 ms | 625 → 101 ms |
| Mover a seleção | 37 → 35 ms | 95 → 58 ms | 38 → 36 ms | 95 → 72 ms |

Abrir e rolar não mudaram (rolagem a 60 quadros por segundo, sem tarefa longa).

## As peças

1. **Diário (`nucleo/diario.js`).** As células de uma aba ficam num objeto só (`aba.cel`, chave "B12"). Esse objeto é **vigiado**: trocar UMA chave (`por` de `nucleo/diff.js`) mexe no próprio objeto e anota `{ chave, antes, depois }`. Os objetos de cima (aba, abas, conteúdo, arquivo) continuam sendo copiados: é por eles que a tela sabe da mudança. Quem vigia é o motor (`carregar` e `atualizar`) e o índice.
2. **Motor (`planilha/motor.js › atualizar`).** Se o objeto das células é o mesmo, lê do diário o que mudou desde a revisão que já viu (`this.visto`). Se o objeto foi trocado por outro (ação grande), compara os dois **e** junta o que o diário do antigo diz.
3. **Índice vivo (`planilha/indice.js`).** Células com conteúdo por linha e por coluna, montado uma vez por objeto e atualizado pelo diário. Dele saem o Ctrl+setas, a área usada (`motor.usado`) e a linha do cabeçalho.
4. **Lote (`planilha/operacoes.js › Lote`).** Até 4.000 células por ação vão uma a uma (no lugar); acima disso troca o objeto inteiro (`LOTE_INTEIRO`, o mesmo limite em que o motor recarrega tudo).
5. **Gravação (`App.jsx › salvar`, `nucleo/ritmo.js`).** Mede quanto a gravação prende a tela. Arquivo pequeno (até 16 ms) grava na hora, como sempre. Arquivo grande espera a pessoa parar de digitar (4 vezes o custo, entre 0,4 e 2,5 s; nunca mais de 20 s sem gravar). Sair da página, esconder a aba do navegador ou fechar o arquivo grava na hora.
6. **Diário de segurança (`nucleo/pendencias.js`).** Toda mudança que vai esperar a gravação é anotada na hora no `localStorage` (`efcdocs:pend:<id>`). Se a página fechar antes de gravar, ao abrir o arquivo as mudanças são refeitas e o app avisa "Recuperei N mudanças". Mudança grande demais para anotar grava na hora.
7. **Desenho (`Planilha.jsx`, `grade.js › pintarGrade`).** A grade só é redesenhada quando muda algo que ela mostra (lista `marca`) e uma vez por quadro da tela (`requestAnimationFrame`): várias mudanças seguidas viram um desenho só, ainda antes de a tela ser pintada. Tela que mudou de tamanho desenha na hora. Entrada nova no desenho tem de entrar no objeto `comum` **e** na `marca`, senão a tela não atualiza.
8. **Ícones (`ui/comum.jsx › Icone`).** O desenho de cada ícone é guardado (o mesmo objeto sempre) e o componente é `memo`. No React 19, `dangerouslySetInnerHTML` com objeto novo a cada vez refaz o conteúdo do elemento em toda renderização.

## Armadilhas

1. **O estado antigo não guarda mais as células antigas.** `velho.abas[id].cel` e `novo.abas[id].cel` são o mesmo objeto depois de uma digitação. Quem precisa do valor de antes usa o diário (`desde`) ou a operação do desfazer (`op.a`). Nunca comparar `aba.cel` de dois estados para achar o que mudou.
2. **`useMemo(..., [aba.cel])` não dispara mais numa digitação.** Usar `[aba]` (a aba é copiada a cada mudança) ou a revisão do diário.
3. **Não mexer em `aba.cel` por fora do `por`.** Mudança sem anotação deixa motor e índice errados. (Antes de o arquivo ser entregue ao app, como na leitura do Excel e nos testes, pode.)
4. **A ordem das chaves de `aba.cel` não é garantida** (apagar e pôr de volta manda a chave para o fim; já era assim). Nada pode depender dela.
5. **Vários passos de uma vez** (linha do tempo): o motor só vê o começo e o fim. O diário junta as mudanças da mesma chave (o antes da primeira, o depois da última).
6. **O diário guarda as últimas 4.096 mudanças.** Quem ficou mais para trás recebe `null` e refaz do zero (`carregar`, `montar`).
7. **Objeto novo a cada renderização vira trabalho**: `setCores` devolve o objeto antigo quando as cores são iguais (`mesmasCores`); lista vazia de referências é sempre a mesma (`SEM_REFS`).
8. **Gravação atrasada e outra aba do navegador.** Quem lê o arquivo do aparelho logo depois de uma mudança pode achar a versão anterior; para garantir, chamar `gravarJa()`.

## O que ainda custa o tamanho da planilha (conhecido)

- Gravar no aparelho: monta o texto do arquivo inteiro (0,2 s em 360 mil células), agora só quando a pessoa para. Caminho para melhorar: gravar por partes.
- Ações grandes (mais de 4.000 células, inserir ou excluir linha, ordenar): trocam o objeto inteiro e o motor recarrega. São ações pesadas (meta de 1 s).
- Abrir o arquivo e salvar como Excel.
