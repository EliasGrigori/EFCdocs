# Regras de layout da família EFClaudian · v0.6.15

Aprovadas pelo Elias no EFCwork em 14/11/2026 ("até hoje esse foi o melhor, continua assim").
Valem agora para o Vértice Docs. Cada regra diz **o que é**, **por quê** e **como conferir** (o teste que prova que está feito).
Os nomes entre crases são as peças de `codigo/efc-layout.css` e `codigo/efc-layout.js`.

---

## R1 · Tela parada: só a tabela rola (PC)
- **O que é:** do cabeçalho da tabela para cima (título, pílulas, abas, ícones) nada se mexe. A rodinha do mouse e o arrastar só rolam a tabela. O cabeçalho da tabela (os nomes das colunas) fica parado no alto dela.
- **Por quê:** pedido do Elias (ITEM 5, 17 e 22): "do cabeçalho para cima congelado e sem se mexer".
- **Como fazer:** a tabela fica dentro de `.efl-tabela-rola`; depois de cada desenho da tela e no `resize`, chame `EFCLayout.fixarTela()`. Antes de redesenhar, `const volta = EFCLayout.guardaRolagem()` e depois `volta()` (o redesenho não pode voltar a tabela ao topo).
- **Como conferir:** em 1280×800, `document.documentElement.scrollHeight - innerHeight` = 0; a classe `efl-tela-parada` está no `<html>`; a rodinha em cima do título deixa `scrollY` em 0; o fundo da tabela fica a 16 px do fim da janela.
- **Celular (< 900 px):** a página rola normalmente. Nada de trava.

## R2 · Sem "Mostrando X de Y" e sem rodapé do app debaixo da tabela
- **O que é:** some a linha "Mostrando 12 de 12" e o rodapé "Nome do app · Empresa". A tabela desce até o fundo.
- **Mais linhas:** mostre 100; quando o fim aparece, carregam mais 100 sozinhas (`EFCLayout.carregaMais`), sem botão "Mostrar mais". No fim aparece só "Carregando mais…" enquanto chega.
- **Como conferir:** `document.body.innerText` não tem "Mostrando"; com 230 registros, rolar a tabela até o fim passa de 100 para 200 linhas e a tabela **não** volta ao topo.

## R3 · O total vira o selo do cabeçalho
- **O que é:** a caixa/linha de "Total" da tabela sai. O número do total fica na linha de pílulas debaixo do título, com o mesmo tamanho de letra das outras pílulas. Sem filtro: "R$ 303,80 em estoque" (o texto que a tela já usa). Filtrando: "R$ 231,38 · total filtrado", em dourado suave.
- **Como fazer:** `EFCLayout.seloTotal(meta, { geral, valor, filtrado, sufixo })`. Se já existe a pílula com o valor geral, ela mesma vira o total (não duplica). Enquanto a lista ainda carrega, não mostre total.
- **Como conferir:** sem filtro o selo tem o total geral; com um filtro o selo muda para "· total filtrado" e o valor segue o filtro; não existe mais o elemento antigo de total na tabela.

## R4 · Ícones da tabela na linha das abas (PC)
- **O que é:** imprimir, planilha e colunas sobem para a mesma linha das abas, à direita. O espaço que eles ocupavam vai para a tabela.
- **Como fazer:** `EFCLayout.ferramentasNasAbas(abas, grupoDosIcones)` antes de `fixarTela()`.
- **Como conferir:** o topo e o fundo dos ícones ficam dentro da faixa das abas (±2 px).

## R5 · Cabeçalhos com a mesma medida em todas as telas
- **O que é:** título + linha de pílulas com altura reservada (66 px no PC; a linha de pílulas tem 24 px mesmo vazia). As abas começam na mesma altura em todas as telas.
- **Como conferir:** medir `getBoundingClientRect().top` das abas em 4 telas: diferença máxima de 1 px.

## R6 · Situação: bolinha + texto; cor forte só no vermelho
- **O que é:** "Em dia", "Vence em 30 dias", "Inativo" = bolinha colorida (8 px) + texto normal, sem caixa. Só o que é problema de verdade (vencido, sem saldo, urgente) fica em caixa vermelha.
- **Onde:** em todas as abas, tabelas e gavetas (pedido do ITEM 9).
- **Como fazer:** `<span class="efl-pilula ok|wa|cr">`.
- **Como conferir:** pílulas sem `cr` têm fundo transparente e `::before`; as `cr` têm fundo.
- **Ícones:** Sabiá e Vértice nos atalhos não perdem contraste (pedido do ITEM 9 da parte 1).

## R7 · Cartões sem faixa colorida na lateral
- **O que é:** nada de borda esquerda colorida em cartão ("padrão de app de IA", Elias no ITEM 13). A gravidade vai na pílula.
- **Lista que muda com o filtro:** os cartões se rearrumam deslizando para o lugar novo (`EFCLayout.fotografa` + `EFCLayout.rearruma`); nada de entrar um por um em sequência.

## R8 · Gaveta (detalhe ao lado)
- **Cabeçalho:** linha de cima = texto pequeno (tipo · código) à esquerda, setas ↑ ↓ e X à direita. Embaixo, o título com a largura toda, sem quebrar à toa (pedido do ITEM 9).
- **Anterior/próximo:** as setas e Alt + seta para cima/baixo trocam o registro sem fechar (`EFCLayout.navGaveta`). O X é sempre o último botão. Esc fecha uma camada por vez.
- **Como conferir:** o X fica acima do título (`x.bottom <= h2.top`); o título de uma linha mede menos de 34 px de altura.

## R9 · Linha do tempo com a gota
- **O que é:** etapas e históricos (ex.: revisões de um documento, últimas movimentações) usam a linha do tempo dourada: um tubo, o fluido que desce, a gota que cai na bolinha, a bolinha enche e acende. Um brilho só, de 0,5 s (ITEM 17). A gota só corre até o que a pessoa ainda não viu (guardado por registro).
- **Como fazer:** `EFCLayout.linhaDoTempo(id, etapas)` gera o HTML; depois de pôr na tela, `EFCLayout.gota(container, true)`. Histórico vai da mais antiga para a mais nova (a mais nova embaixo, onde a gota chega).

## R10 · Esqueleto enquanto carrega
- **O que é:** enquanto a lista ainda não chegou, 6 linhas cinzas pulsando no lugar de "Nada encontrado." (ITEM 16). Contador diz "Carregando…".

## R11 · Botão dourado com sombra nítida
- **O que é:** o botão principal dourado tem sombra curta e nítida (sem brilho borrado em volta). Virou padrão (ITEM 11). `.efl-bt-ouro`.

## R12 · Busca / paleta (Ctrl K)
- **O que é:** a busca do topo abre a paleta com resultados e ações. Ao digitar, a caixa muda de altura suave e os resultados novos entram leve, sem pular (ITEM 4). `EFCLayout.alturaSuave`.
- **Texto do campo:** começa igual ao do botão do topo ("Buscar documento, …").

## R13 · Menu da coluna
- **O que é:** o menu de filtro da coluna (estilo Sankhya) sai com efeito; tocando no filtro de outra coluna com o menu aberto, ele **desliza** até a coluna nova (ITEM 12). `EFCLayout.fotoMenu` + `EFCLayout.menuDepois`.

## R14 · Movimento
- Toda duração vem da escala da família (`efc-movimento.css`): 40, 80, 150, 250, 350, 400, 500 ms, pelo uso.
- Nada de animação infinita que não informe nada (exceções: reflexo do botão dourado e o esqueleto enquanto carrega, marcados `mov:ok`).
- Todo arquivo com animação respeita `prefers-reduced-motion`.

## Continua valendo (padrões do Elias)
Um único filtro recolhível; menus de coluna estilo Sankhya; botões lado a lado alinhados (mesma linha, altura e largura); Esc volta uma camada por vez; tela sem permissão some; sem emoji; ícones desenhados (SVG); imprimir = só o ícone; excluir = lixeira no canto de cima; sem "cara de IA" (sem gradiente roxo, sem brilho colorido, sem faixa lateral colorida, sem texto de propaganda).
