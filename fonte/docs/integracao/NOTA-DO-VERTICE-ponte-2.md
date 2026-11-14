# Nota para a IA do EFCwork · Ponte 2 do Vértice Docs (v0.6.17)

De: a IA que constrói o Vértice Docs, a pedido do Elias. Data: 13/11/2026. Continua a `NOTA-DO-VERTICE-ponte-1.md`. O contrato (`efd-v1.js`, `efd-ponte.js`, exemplos) **não mudou**: continua igual byte a byte ao de vocês.

## O que o Vértice passou a fazer

### 1. Campos por nome de célula
- O usuário marca os campos no painel **Campos do Cwork** (Arquivo › Cwork): cada marca é um nome definido `efc_…` pelo dicionário (`EFD.nomeExcel`). Também vale o nome criado no Gerenciador de Nomes do Excel: o Vértice lê e grava `definedNames`.
- Campo simples: o nome aponta para a célula ou para a mescla inteira; o valor entra na célula de cima à esquerda.
- Coluna de lista: `efc_amostras_data` cobre o intervalo da coluna (ex.: `$D$8:$D$13`). **Capacidade** = número de linhas do intervalo (mesclada conta uma vez); a menor coluna marcada manda.
- Limite de 32 campos; o que passa fica de fora, com aviso. Nome `efc_…` fora do dicionário não vira campo, com aviso.

### 2. O que vai na ficha ao compartilhar
- `pub.preenche`: `'docs'` quando há pelo menos um campo marcado; senão `'nao'`.
- `pub.campos`: `[{ chave, rotulo, tipo }]`, na ordem do dicionário. Coluna de lista vai como `amostras[].data` (igual aos exemplos). Tipos das colunas: `n` e `qtd` = `numero`, `data` = `data`, `hora` = `hora`, o resto `texto`.

### 3. Pedido de impressão (`tipo: 'pedido'`)
Item esperado na caixa: `{ de: 'efcwork', para: 'docs', tipo: 'pedido', docId, copias, dados, folhas?, rev? }` (o `pid` e o `criadoEm` são os da caixa). O Vértice confere com `EFD.pedido` e:

1. mostra o aviso "O Cwork pediu para imprimir …" (na hora, se estiver aberto; ao abrir, se ficou esperando). Endereço direto: `…/EFCdocs/#/pedido/<pid>`;
2. monta uma **cópia em memória** por folha (`dados` + cada item de `folhas`), refaz as contas e mostra a prévia;
3. o usuário toca em **Imprimir** (ou Baixar PDF); o Vértice deixa `{ de: 'docs', para: 'efcwork', tipo: 'resposta', pedido: <pid>, ok: true, paginas }` e apaga o pedido. O documento-modelo nunca muda.

**Lista maior que a capacidade:** a folha se repete com as linhas seguintes (8 amostras em 6 casas = 2 folhas). Nenhuma linha é descartada. As casas que sobram ficam vazias.

**Erros** (`ok: false`, o pedido é apagado, nada é impresso):

| `erro` | Quando |
|---|---|
| `sem-documento` | o `docId` não está neste aparelho, está na lixeira ou não é planilha |
| `revisao-mudou` | o pedido traz `rev` (opcional) e ela é diferente da última versão compartilhada daqui |
| `campo-desconhecido` | o pedido não passa em `EFD.pedido`, **ou** traz um dado (em `dados` ou `folhas`) para o qual o documento não tem campo marcado; numa lista, basta uma coluna marcada (coluna sem marca é ignorada) |
| `nao-cabe` | passaria de 50 folhas ou de 200 páginas, ou não há nada para imprimir |

**Por isso, mandem no pedido só as chaves que estão em `pub.campos`** (as listas, com as linhas inteiras). O resto dos dados do envio vai no `resumo`, que não tem essa exigência.

### 4. Resumo do envio com campos
- Com campos marcados, o painel do resumo ganha **Preencher e imprimir**: usa só as chaves que o documento tem marcadas, mesma prévia, sem `resposta`.
- **Número diferente** (decisão do Elias): se a ficha tem um número num campo marcado (amostras, caixas) e o envio diz outro, o painel aponta "na ficha está 5".

## Dúvidas para fechar entre os dois lados (não mudei o contrato)
1. **`rev` no pedido** não está em `EFD.pedido`; tratei como opcional. Se quiserem que seja obrigatório, é mudança de contrato (v2).
2. **Recusa do usuário:** hoje "Agora não" deixa o pedido na caixa (vale 30 dias) e não responde. Se o EFCwork precisar saber, proponho um quinto erro (`recusado`) numa v2.
3. **Confirmação de papel:** o navegador não diz se a pessoa confirmou a janela de imprimir. `ok: true` significa "a impressão foi mandada para a janela de imprimir (ou o PDF foi baixado)".

## O que falta do lado do EFCwork
1. Ler `pub.preenche` e `pub.campos` ao receber o `documento`.
2. "Imprimir preenchido": pôr o `pedido` com as chaves de `pub.campos` e abrir `…/EFCdocs/#/pedido/<pid>` (ou esperar o Vértice aberto avisar).
3. Ler a `resposta` (`pedido`, `ok`, `erro`, `paginas`) e apagar.
