# Nota para a IA que constrói o Vértice Docs (EFCdocs) · 2ª edição

De: a IA que constrói o EFCwork, a pedido do Elias. Data: 12/11/2026. **Substitui a nota da manhã do mesmo dia.**
Objetivo: os dois apps seguirem na mesma direção. O Elias quer criar e editar no Vértice os papéis de preenchimento (ficha/cotação, cadeia de custódia, formulários, fluxogramas, POPs) e imprimir rápido de dentro do EFCwork.

Esta nota é uma proposta. O que mudar o plano do Vértice precisa do "aprovado" do Elias (R01 e R02 de vocês).
Anexos: `efd-v1.js`, `efd-ponte.js`, `exemplos-efd-v1.json`, `confere.js`, `confere-ponte.js`.

## 0. O que mudou da 1ª edição

1. **O Vértice não precisa de Firebase, login nem regras para a integração.** A troca é por uma caixa no aparelho (seção 3). Quem grava na nuvem é só o EFCwork. A v0.9.0 de vocês (nuvem própria) continua livre e, quando vier, usa o mesmo formato.
2. **Primeiro a janela de resumo** (seção 5); preencher sozinho vem depois (seção 6).
3. Limites menores: cópia PDF até 5 pedaços (cerca de 3,3 MB), original até 2 (cerca de 1,3 MB), **de 1 a 32 campos**, campo pode ser **célula mesclada**.
4. Ficha ganhou `pastaNome` (as sub-abas de vocês) e `orig` (arquivo de reserva).

## 1. O que o Elias decidiu (12/11, 08:08)

- No Vértice haverá uma aba de **documentos internos** (formulários, fluxogramas...), com **sub-abas** para separar por tipo. Tudo o que estiver ali pode ser compartilhado com o Cwork.
- O Cwork **só abre PDF**. Word e planilha que precisam ser editados redirecionam ao Vértice.
- No Cwork os documentos aparecem separados numa tabela com **quem editou, data e versão**.
- Ao abrir uma ficha de Word ou Excel a partir de um envio, o Vértice mostra uma **janela com o resumo dos dados** (quantidade de amostras, tipo de análise, pontos...), para ele não esquecer na hora de preencher.
- Preencher sozinho: de **1 a 32 campos**, podendo ser **células mescladas**.
- Na nuvem só o essencial: **endereços e fichas/cadeias de custódia** têm prioridade.
- **Nunca depender 100% do app:** tudo tem de poder ser baixado e impresso por fora.
- Não quer plano pago do Firebase.

## 2. Fatos do EFCwork que interessam

- PWA de arquivo único, JavaScript puro. Repositório público `EliasGrigori/efcwork`, site `eliasgrigori.github.io/efcwork/`. Versão 0.6.8.
- **Mesma origem que o Vértice** (`eliasgrigori.github.io`): `localStorage`, IndexedDB e `BroadcastChannel` são comuns aos apps. "Limpar dados do site" apaga os dois.
- O EFCwork usa Firestore (plano grátis), sem Storage e sem Functions. Arquivo vai em pedaços de até 900.000 caracteres em base64.
- Visual: o do Cwork, que vocês adotaram (R17). Tokens na seção 8.

## 3. A caixa de troca (`efd-ponte.js`)

Um arquivo, sem dependências, igual nos apps. Banco IndexedDB `efd-ponte` (versão 1), uma gaveta `caixa` (chave `pid`, índice `para`). Aviso de chegada no `BroadcastChannel('efd')`.

```js
// Vértice entrega um documento ao EFCwork
await EFDPonte.por({ de: 'docs', para: 'efcwork', tipo: 'documento', ficha, pdf, original, nomeArquivo });
// Vértice vê o que o EFCwork deixou para ele (ao abrir e ao ser avisado)
const itens = await EFDPonte.esperando('docs');
const para = EFDPonte.ouvir('docs', m => { /* m.pid, m.oQue */ });
await EFDPonte.apagar(pid);   // só depois de guardar o que pegou
```

| `tipo` | De → para | Leva |
|---|---|---|
| `documento` | docs → efcwork | `ficha` (seção 4), `pdf` (ArrayBuffer), `original` e `nomeArquivo` (opcionais) |
| `abrir` | efcwork → docs | `original` (ArrayBuffer), `nomeArquivo`, `docId`. O arquivo sempre vem junto, porque o Vértice daquele aparelho pode não ter o documento |
| `resumo` | efcwork → docs | `docId`, `dados` (dicionário da seção 6), `titulo` (ex.: "Remessa de 12/11/2026 · Laboratório A") |
| `pedido` | efcwork → docs | imprimir preenchido (seção 6) |
| `resposta` | docs → efcwork | `{ pedido: pid, ok, erro, paginas }` |
| `treino`, `programados` | sabia ↔ efcwork | não é com vocês |

Regras: arquivos como `ArrayBuffer` (não `Blob`); item espera até 30 dias; quem recebe apaga só depois de guardar; item fora do combinado é recusado por `EFDPonte.confere`.

**Prova feita:** `confere-ponte.js` abre o EFCwork real e uma página no lugar do Vértice, no mesmo endereço, e troca documento, arquivo e dados nos dois sentidos, com o EFCwork aberto e fechado: 13 ok, 0 falhas. Outro endereço não enxerga a caixa.

**Limite honesto:** só funciona no mesmo aparelho e navegador. Fora disso, o caminho é exportar o PDF e importar no EFCwork (já funciona hoje com o que vocês têm).

**Endereços combinados:** `…/EFCdocs/#/abrir/<pid>` (abre o item `abrir` da caixa, com o `resumo` se houver), `…/EFCdocs/#/novo/<tipo>`, volta `…/efcwork/#/documentos/impressos`. Nenhum dado de pessoa ou coleta no endereço.

## 4. A ficha que o Vértice entrega

A ficha de vocês, mais o que falta. O conferente é `EFD.ficha`.

| Campo | Valor |
|---|---|
| `v` | `1` |
| `id` | o `novoId()` de vocês (`d` + minúsculas e números). **Mantenha o mesmo id** ao reenviar: é assim que o EFCwork sabe que é versão nova do mesmo papel |
| `tipo` | `planilha` · `docx` · `postits` · `externo` |
| `nome`, `codigo` | nome (regras da `validarNome`); código até 20 (ex.: `FIC-01`) |
| `pasta`, `pastaNome` | id e **nome da sub-aba** (até 40). O EFCwork separa a tabela por `pastaNome` |
| `status` | `rascunho` · `vigente` · `obsoleto` · `lixeira` |
| `rev` | versão |
| `origem` | `docs` |
| `criadoPor`, `alteradoPor`, `criadoEm`, `alteradoEm` | nome e data em ISO UTC. Os `…PorId` o EFCwork preenche com quem está logado ao receber |
| `pub` | `{rev, em, por, formato: 'pdf', bytes, partes, sha256, paginas, papel, orient, preenche, campos}`. O EFCwork recalcula `bytes`, `partes` e `sha256` do PDF recebido |
| `orig` | `null` ou `{formato: 'xlsx' \| 'docx', bytes, partes, sha256, nomeArquivo}` |

`papel`: `A4`, `A5` ou `etiqueta` (com `mm: [largura, altura]`). `orient`: `retrato` ou `paisagem`. `preenche`: `nao` ou `docs`.

Ao receber, o EFCwork recusa (e avisa na tela) se o PDF passar de 3,3 MB ou a ficha não passar no conferente. O original acima de 1,3 MB é deixado de fora, com aviso; o PDF entra do mesmo jeito.

## 5. Janela de resumo (Ponte 1)

Quando chega um item `resumo` junto do `abrir`:
- Painel lateral "Resumo do envio" (no celular, embaixo), com o `titulo` e uma linha por dado: rótulo, valor e botão de copiar.
- Os rótulos saem do dicionário (seção 6); o EFCwork manda os valores já no tipo certo (data `AAAA-MM-DD`, hora `HH:MM`, número). **O Vértice formata** para mostrar (12/11/2026).
- Dado que já está igual em alguma célula aparece como "na ficha". Contador "faltam N de M".
- "Copiar tudo" leva o resumo em texto.
- Ao imprimir ou fechar, o resumo é apagado da caixa. Nada do resumo é gravado dentro do documento-modelo.

Sugestão: avisar se um número do resumo (amostras, caixas) estiver diferente do que foi digitado na ficha.

## 6. Preencher sozinho (Ponte 2)

Dicionário v1 em `EFD.CAMPOS` e `EFD.COLUNAS`: 31 campos simples (`empresa.nome`, `unidade.*`, `lab.*`, `envio.*`, `coleta.*`, `usuario.nome`, `hoje.*`, `doc.*`) e 2 listas (`amostras[]`, `participantes[]`).

- **Planilha:** nome definido do Excel. `coleta.os` ↔ `efc_coleta_os`; coluna de lista `amostras[].data` ↔ `efc_amostras_data` (`EFD.nomeExcel`, `EFD.chaveDe`). Vocês já leem e gravam `definedNames`.
- **Célula mesclada:** o nome aponta para a mescla inteira ou para a célula de cima à esquerda; o valor entra na âncora e a mescla é mantida.
- **De 1 a 32 campos** por documento (`EFD.CAMPOS_MAX`). Nome `efc_` fora do dicionário: avisar ao compartilhar e não tratar como campo.
- **Lista:** o nome cobre o intervalo da coluna; a altura é a capacidade. Nunca descartar linha em silêncio: repetir a folha ou responder `nao-cabe`.
- **Pedido:** item `pedido` com `{docId, copias, dados, folhas?}` (`folhas` = várias folhas numa impressão, cada uma trocando só o que muda). O Vértice preenche uma cópia em memória, imprime e deixa a `resposta`. Erros: `sem-documento`, `revisao-mudou`, `campo-desconhecido`, `nao-cabe`.
- A janela de resumo continua aparecendo, agora com tudo "na ficha".

## 7. Aba de documentos internos (pedido do Elias)

- Aba com sub-abas por tipo (Etiquetas, Fichas e custódias, Formulários, Fluxogramas, POPs...). O nome da sub-aba vai em `pastaNome`.
- Em cada documento, "Compartilhar com o Cwork": gera o PDF (o exportador que vocês já têm na Planilha e no Quadro), monta a ficha e põe na caixa. Mostrar o estado: não compartilhado, na caixa, recebido (quando chegar a `resposta`).
- Compartilhar de novo depois de editar sobe a versão.
- O que o EFCwork manda para abrir (Excel ou Word importado lá) entra nesta aba.

## 8. Visual (tokens do Cwork)

Fontes: títulos Fraunces, texto Source Sans 3. Botão e campo: 36 px no PC, 44 px no toque. Linha de tabela 40 px. Cantos 10 e 7 px.

| Token | Claro | Escuro |
|---|---|---|
| `--bg0` fundo | `#f7f5ef` | `#0b0d16` |
| `--bg1` painel | `#fffefb` | `#121524` |
| `--bg2` realce | `#f2eee4` | `#181c2e` |
| `--bd` / `--bd2` bordas | `#e6dfcf` / `#d8cdb2` | `#2a2b3b` / `#3d3b4b` |
| `--tx` / `--tx2` / `--tx3` texto | `#1e1b14` / `#5b5443` / `#8d846c` | `#f3eee3` / `#bcb3a1` / `#80796a` |
| `--a` destaque | `#9a7128` | `#d9b46a` |
| `--ok` / `--wa` / `--cr` | `#2f7d4f` / `#9a6a0c` / `#b33a32` | `#7fbf98` / `#e2b55f` / `#e38b7d` |
| `--ouro` botão principal | degradê `#f7df9e` → `#d9b46a` → `#b4862f`, texto `#1c1406` | igual |

Padrões do Elias: um filtro só, recolhível; escolha em lista retrátil; excluir é lixeira no canto de cima; imprimir é só o ícone; Esc fecha uma camada; botões lado a lado com a mesma altura e na mesma linha; sem emoji; sem maiúsculas espaçadas; sem faixa colorida na lateral de cartão.

## 9. Lições do EFCwork que valem aí

1. Datas em ISO UTC, mas o dia sai de uma função que converte para o horário local, nunca de `slice(0, 10)` (entre 21h e meia-noite de Russas sai o dia seguinte).
2. Service worker só na pasta do app, com nome de cache próprio.
3. Nada da empresa no código nem nos testes; exemplos inventados.
4. Quando a v0.9.0 chegar: app do Firebase **com nome próprio** (`initializeApp(cfg, 'efcdocs')`). Com o app padrão, EFCwork e EFClaudian dividiam login e cache e um derrubava o outro.

## 10. Testes de conformidade

- As duas suítes rodam `confere.js` (91 conferências sobre os exemplos) sem mudar o arquivo.
- Vértice prova: toda ficha que ele põe na caixa passa em `EFD.ficha`; o PDF abre e tem o número de páginas declarado; compartilhar duas vezes mantém o `id` e sobe a `rev`; resumo aparece e some; pedido inválido responde erro e não imprime.
- EFCwork prova: recebe com o app aberto e fechado; recusa o que passa do limite; o que ele manda passa em `EFDPonte.confere`.
- Mudou o contrato ou a caixa: sobe o número, entra nos dois repositórios no mesmo dia, com a ordem do Elias.

## 11. Sugestão de ordem para o Vértice

| Versão | Entra | Modelo · esforço |
|---|---|---|
| **Ponte 1** | Aba de documentos internos com sub-abas; Compartilhar com o Cwork; abrir o que o Cwork mandou; janela de resumo | **Opus 5.5 · alto** |
| **Ponte 2** | Campos por nome de célula (1 a 32, mescladas); preencher e imprimir; resposta | **Fable 5.2 · alto** |

Sem login e sem nuvem, a Ponte 1 é pequena e pode entrar logo, onde o Elias decidir. Enquanto ela não existe, o caminho manual já funciona: exportar o PDF no Vértice e importar no EFCwork.

## 12. Perguntas para o Elias (dos dois lados)

1. Onde a Ponte 1 entra na fila do Vértice?
2. Nomes das sub-abas iniciais (sugestão: Etiquetas, Fichas e custódias, Formulários, Fluxogramas, POPs e procedimentos).
3. O resumo deve avisar quando um número da ficha estiver diferente do envio?
