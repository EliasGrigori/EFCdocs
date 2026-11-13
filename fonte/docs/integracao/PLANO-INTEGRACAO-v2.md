# Plano de integração v2 · EFCwork × Vértice Docs × Sabiá

Refeito em 12/11/2026 (Fable 5.2 · alto), depois das respostas do Elias à página de integração. Substitui o `MAPA-INTEGRACAO-DOCS-E-QUIZ.md`.
Pedido: plano realista para quem não quer plano pago, com as condições dele e sugestões. Nada do app mudou: segue a v0.6.8.

## 1. O que mudou em relação ao primeiro plano

| Antes | Agora | Por quê |
|---|---|---|
| O Vértice ganhava login e gravava na nuvem | **O Vértice não precisa de nuvem nem de login** para a integração | Os apps moram no mesmo endereço. Um deixa o arquivo numa "caixa de troca" do aparelho e o outro pega. Quem grava na nuvem é só o EFCwork, que já tem login. Provei num navegador de verdade: 13 conferências, 0 falhas |
| Até 8 MB por documento | **Só o essencial**: cópia em PDF até 3,3 MB e arquivo de reserva até 1,3 MB | Seu ITEM 10 e o plano grátis |
| Preencher sozinho como caminho principal | **Primeiro a janela de resumo no Vértice** (você preenche vendo os dados do envio ao lado); preencher sozinho vem depois | Seu ITEM 4. É mais simples, não quebra e já resolve o esquecimento |
| Ponto de impressão solto | **Kit do laboratório**: os papéis ficam ligados ao laboratório e aparecem no envio | Seus ITENS 2 e 4 |
| Sabiá gravava na nuvem | **Sabiá entrega pela mesma caixa de troca**; teste e ensaio ficam de fora | Seu ITEM 7 e o plano grátis |

## 2. Realidade do plano grátis

Conferido em 12/11/2026 nas páginas do Google.

| Serviço | Grátis? | O que isso significa aqui |
|---|---|---|
| Banco (Firestore) | Sim: 1 GB guardado, 50 mil leituras, 20 mil gravações e 20 mil exclusões por dia, 10 GB de saída por mês | É onde tudo fica. O limite diário zera por volta das 4h ou 5h da manhã daqui (meia-noite do Pacífico) |
| Arquivos (Storage) | **Não.** Desde 03/02/2026 exige o plano pago | Não usamos. PDF vai em pedaços dentro do banco |
| Funções na nuvem | Não (plano pago) | Não usamos |
| Login por senha | Sim | Já usamos |
| Proteção do app (App Check) | Tem cota grátis mensal de verificações | Cada app que usa a nuvem gasta dessa cota. Mais um motivo para o Vértice não usar a nuvem. Vale conferir o consumo no console |
| Hospedagem (GitHub Pages) | Sim | Já usamos |

**Quanto a integração gasta:**
- Espaço: um kit completo (8 laboratórios × 3 papéis) mais uns 40 documentos internos dá perto de 30 MB, uns 3% do 1 GB.
- Leituras: cada aparelho baixa cada papel uma vez (1 a 5 leituras) e guarda. Imprimir depois não gasta nada e funciona sem internet.
- Gravações: enviar um documento custa de 2 a 8.

**O que eu não consigo ver daqui:** quanto do 1 GB já está ocupado hoje (as fotos são o que mais pesa). Isso aparece no console do Firebase, em Firestore › Uso. Por isso o plano inclui um **medidor de espaço** dentro do EFCwork e um teto de 150 MB para os documentos, com aviso aos 80%.

**Se o limite do dia estourar:** a nuvem recusa até zerar. O EFCwork continua abrindo com o que está guardado no aparelho, e os papéis já baixados continuam imprimindo.

## 3. Como funciona

### 3.1 A caixa de troca (o coração do plano)

EFCwork, Vértice e Sabiá estão no mesmo endereço (eliasgrigori.github.io). O navegador deixa apps do mesmo endereço dividirem uma área do aparelho. Os três usam um arquivo pequeno e igual (`efd-ponte.js`):

- **Vértice → EFCwork:** "Compartilhar com o Cwork" deixa na caixa a cópia em PDF, o arquivo original (se couber) e a ficha (nome, código, pasta, versão, data). O EFCwork pega, confere, grava na nuvem com o **seu** login e apaga da caixa. Se o EFCwork estiver fechado, o item espera até 30 dias.
- **EFCwork → Vértice:** "Abrir no Vértice" deixa na caixa o arquivo para editar e o **resumo do envio**.
- **Sabiá → EFCwork:** ao encerrar a sessão (que não seja teste nem ensaio), deixa o resumo do treinamento.

**Condição honesta:** funciona quando os apps são usados **no mesmo aparelho e no mesmo navegador**. É o caso normal (o PC onde você edita). Nos outros aparelhos, o papel chega pela nuvem através do EFCwork. Se um dia você editar num aparelho onde não usa o EFCwork, o caminho é baixar o PDF e importar.

### 3.2 Documentos › Impressos (no EFCwork)

- Tabela separada por pasta (Etiquetas, Fichas e custódias, Formulários, Fluxogramas...), com **quem editou, data e versão**.
- **PDF abre dentro do EFCwork.** Word e Excel mostram a cópia em PDF para ver e imprimir; para mudar ou preencher, "Abrir no Vértice".
- **Importar:** PDF, foto, Excel ou Word.
- **Nunca depender só do app:** todo papel tem "Baixar" (o PDF e, quando existe, o Excel ou Word original). O botão **Reserva** baixa todos de uma vez num arquivo ZIP, para guardar no computador ou no OneDrive.

### 3.3 Kit do laboratório e envio

- Em Coletas › Envio, a vista **Laboratórios**: tabela com cada laboratório. Tocar abre a gaveta com o endereço (destinatário do rótulo) e o **kit de impressão**: rótulo, ficha/cotação, cadeia de custódia. Em cada papel você escolhe: sempre, perguntar, ou só se eu pedir.
- O **rótulo destinatário e remetente** é do próprio sistema, como no EFClaudian, com os endereços vindos do cadastro (lá estão fixos no código). Nunca depende do Vértice.
- Ao enviar amostras, abre **Papéis deste envio**: os papéis do kit daquele laboratório já marcados e a pergunta **"Quer acrescentar algo na ficha?"**, com amostras, caixas, análise e pontos já sugeridos pelo que foi lançado, mais observação.
- Fica registrado em cada remessa o que foi impresso, qual versão e por quem.

### 3.4 Janela de resumo no Vértice

Ao abrir uma ficha de Excel ou Word a partir de um envio, o Vértice mostra ao lado o **Resumo do envio**: amostras, caixas, análise, pontos, coleta, coletor. Cada linha tem um botão de copiar; o que já está na ficha aparece marcado.

### 3.5 Preencher sozinho (depois)

De **1 a 32 campos** por documento. Na Planilha, dando nome à célula (`efc_coleta_os`), inclusive em **célula mesclada** (o nome fica na célula de cima à esquerda da mescla). O resumo passa a entrar sozinho; a janela continua mostrando o que foi preenchido.

### 3.6 Treinamentos e Sabiá

- Botões **Vértice Docs** e **Sabiá** no menu lateral esquerdo, com o ícone de cada app.
- Qualidade › Treinamentos: o que veio do Sabiá e o que foi registrado sem quiz. **Teste e ensaio não entram.**
- Treinamento programado no EFCwork aparece no Sabiá do mesmo aparelho.

## 4. Sugestões a mais

1. **Aviso de versão nova:** quando a ficha de um laboratório muda, o sino avisa e o kit passa a usar a nova.
2. **Papel obsoleto não imprime:** o EFCwork bloqueia e mostra qual é o vigente.
3. **Reimprimir o último kit:** um toque na remessa repete os papéis, com os mesmos dados.
4. **Lista de presença pronta:** em Treinamentos, imprimir a lista já com os nomes.
5. **Papel por análise, além de por laboratório:** por exemplo, um formulário próprio para a coleta de água.
6. **Modelos prontos no Vértice:** rótulo de caixa, cadeia de custódia genérica e lista de presença, já com os campos marcados.
7. **Conferência antes de imprimir:** se o resumo tem 6 amostras e a ficha diz 5, o Vértice avisa.
8. **Link no lugar do arquivo:** para arquivo grande (manual, vídeo), guardar só o endereço da sua pasta, sem gastar espaço.

## 5. O que continua difícil

1. **Mesmo aparelho e navegador** para a caixa de troca (3.1).
2. **Duas IAs construindo as pontas.** Remédio: contrato com número de versão, conferente e exemplos iguais nos dois lados (91 conferências) e a prova da caixa (13).
3. **POPs em Word** dependem do módulo Documento do Vértice (v0.7.0 dele). Até lá entram como PDF.
4. **Imprimir PDF no celular Android:** abre no leitor do aparelho, um toque a mais.
5. **Fichas de Excel** podem sair um pouco diferentes do Excel no Vértice. Cada uma é conferida uma vez; se não ficar igual, importa-se o PDF salvo pelo Excel.
6. **Espaço já ocupado** na nuvem: só você vê no console.

## 6. Ordem, modelo e esforço

No EFCwork:

| Versão | O que entra | Depende de | Modelo · esforço |
|---|---|---|---|
| v0.6.9 Impressos | Documentos › Impressos (pastas, quem editou, data, versão), importar, abrir PDF, baixar, Reserva, imprimir, sem internet, medidor de espaço, botões Vértice e Sabiá no menu | nada | **Opus 5.5 · alto** |
| v0.6.10 Kit e envio | Vista Laboratórios, endereços no cadastro, rótulo do sistema, Papéis deste envio com "Quer acrescentar algo?", registro do que foi impresso | v0.6.9 | **Opus 5.5 · alto** |
| v0.6.11 Ponte | Receber do Vértice pela caixa de troca, Abrir no Vértice com o resumo | Vértice Ponte 1 | **Opus 5.5 · alto** |
| v0.6.12 Treinamentos | Qualidade › Treinamentos, receber do Sabiá, programar | Sabiá (só para o histórico vindo dele) | **Sonnet 5.5 · alto** |
| v0.6.13 Preencher sozinho | Entregar os dados para o Vértice preencher | Vértice Ponte 2 | **Opus 5.5 · alto** |

No Vértice Docs (a outra conta):

| Versão | O que entra | Modelo · esforço |
|---|---|---|
| Ponte 1 | Aba Documentos internos com sub-abas; Compartilhar com o Cwork; abrir o que o Cwork mandou; janela de resumo | **Opus 5.5 · alto** |
| Ponte 2 | Campos por nome de célula (1 a 32, com mescladas); preencher e imprimir com os dados | **Fable 5.2 · alto** |

Como o Vértice deixou de precisar de login e nuvem, a Ponte 1 ficou comum: não precisa mais do Fable. A Ponte 2 é onde o detalhe pesa.

No Sabiá: entregar o resumo ao encerrar e ler os programados. **Sonnet 5.5 · alto.**

## 7. Arquivos desta entrega

- `NOTA-PARA-A-IA-DO-VERTICE-DOCS.md` (2ª edição, substitui a de manhã).
- `tools/contrato/efd-v1.js` (conferente), `exemplos-efd-v1.json`, `confere.js` (91 ok).
- `tools/contrato/efd-ponte.js` (caixa de troca) e `confere-ponte.js` (13 ok, em navegador de verdade).
- `aprovacao-efcwork-plano-v2.html` (página de aprovação com os esboços).

## 8. Firebase: o que conferir

- Agora: em Firestore › Uso, quanto do 1 GB está ocupado. Em App Check, o consumo do mês.
- Quando a v0.6.9 ficar pronta: publicar as regras de `efd_docs` e `sv2_impressos`. Na v0.6.12: `sv2_treinos`. A proposta está na nota.
