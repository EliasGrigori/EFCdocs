# Comandos de fluidez — família EFClaudian (aprovado no EFCwork em 13 e 14/11/2026)

Cole o bloco abaixo na outra conversa e anexe este ZIP inteiro (efc-movimento.css/.js, fluidez.js, fluidez.css são a referência que já funciona no EFCwork v0.6.15).

---

REGRA FIXA DE FLUIDEZ (não é opcional, vale para TODAS as telas, PC e celular):

1. Nenhuma troca pode ser "seca". Toda troca visível tem movimento:
   a) Trocar de ÁREA e também trocar de ABA DE DENTRO (todas as abas de todas as áreas, ex.: Cloro, Apontamento, Auditoria): o conteúdo entra deslizando 12 px na direção da aba (para a esquerda se a aba nova está à direita, e o contrário) com opacidade, em 250 ms; o traço sublinhado da aba desliza da aba anterior até a nova; o título da tela entra letra por letra saindo do desfoque quando o texto do título muda. Redesenho só porque um dado mudou NÃO anima.
   b) Gaveta lateral (detalhe): abre em 400 ms e fecha em 350 ms, com desfoque leve; no celular a folha sobe em 400 ms.
   c) Lista retrátil e menu da coluna da tabela: abrem crescendo a partir do botão (250 ms) e fecham ENCOLHENDO (150 ms), nunca somem de uma vez.
   d) Janela de confirmação: o fundo escurece e a janela sobe do centro (abre 250, fecha 150).
   e) Avisos: um por vez, sobem de baixo; o anterior sai por baixo; no sucesso aparece um visto que se desenha.
   f) Filtrar, buscar e a paleta (Ctrl K): ao digitar, o resultado troca suave (opacidade 150 ms), as linhas não pulam.
   g) Lista que aparece (sino, gaveta): itens entram em sequência, 40 ms entre um e outro (até o 6º).
   h) Erro de formulário: tremida curta só na mensagem de erro.
   i) Gaveta e menu do celular com mais conteúdo abaixo: desfoque suave no fim indicando que rola.
   j) Botão de tema: o ícone novo entra no lugar do antigo.
   k) Faíscas (Click Spark) só no botão dourado principal e só quando a ação deu certo.

2. Escala de movimento (use os tokens de efc-movimento.css, nunca números soltos):
   40 · 80 · 150 · 250 · 350 · 400 · 500 ms, escolhidos pelo USO (abrir 250/400, fechar 150/350, aviso 350, destaque 500).
   Curva padrão cubic-bezier(.22,1,.36,1). Animar só transform, opacity e filter. Proibido "transition: all".
   Nada de animação infinita (única exceção: o reflexo do botão dourado, marcado com o comentário mov:ok).
   Todo arquivo com animação tem @media (prefers-reduced-motion: reduce) que desliga o movimento.

3. Efeitos que eu NÃO quero: Spotlight Card, Glare Hover, Count Up (número contando) e Magnet.

4. Como provar que fez (antes de me entregar):
   - Liste TODAS as áreas e TODAS as abas de dentro do app e, para cada uma, diga qual movimento acontece ao entrar nela. Se alguma não tiver, conserte antes.
   - Faça um teste automático (Playwright) que entra em cada aba de cada área e confere que o conteúdo recebeu a animação de entrada (ex.: classe de entrada aplicada ou element.getAnimations().length > 0), e que nada usa "transition: all" nem duração fora da escala.
   - Na página de aprovação, mostre o movimento com o app de verdade funcionando (não imagem parada).

5. Use como modelo os arquivos anexos: efc-movimento.css/.js (escala e funções Mov.abre / Mov.fecha / Mov.treme / Mov.visto / Mov.ms / Mov.reduzido) e fluidez.js + fluidez.css (como o EFCwork aplica cada item acima: troca de tela em fzDepois, traço da aba, título letra por letra, lista retrátil que encolhe, avisos, confirmação). Adapte os nomes ao app daí, mas mantenha o mesmo comportamento.

---
