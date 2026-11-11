# Linha de base das auditorias: v0.6.9.2

É contra estes números que cada versão é comparada (regra "não pode piorar" do Método Sabiá 2.0), até o sistema bater as metas.

- `auditoria-visual.json` e `auditoria-rapidez.json`: medidos em 11/11/2026 no código da v0.6.9.2 (montado à parte, com o número da versão v0.6.9.2), com o método da v0.6.10: a tela só é medida depois que a abertura (`#abertura`) some, e cada ação de rapidez é medida 5 vezes e vale a mediana.
- `codigo.json`: arquivos acima de 800 linhas em `src/` e os 4 avisos do montador que já existiam (chave repetida em `graficoPlano.js`, `iconesFaixa.js` e `icones.js`).
- `fase-0-uma-medida/`: a primeira medida, da Fase 0, com uma medida só por ação e sem esperar a abertura. Ficou só como histórico: a variação normal da máquina (até 30% com o processador freado) e a abertura ainda na tela davam "piorou" sem nada ter mudado.

Quem troca a linha de base: só o dono, quando aprovar uma versão que melhorou (a nova linha passa a ser a dessa versão).
