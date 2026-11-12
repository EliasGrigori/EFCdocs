# Linha de base das auditorias: v0.6.9.2

É contra estes números que cada versão é comparada (regra "não pode piorar" do Método Sabiá 2.0), até o sistema bater as metas.

- `auditoria-visual.json` e `auditoria-rapidez.json`: medidos em 11/11/2026 no código da v0.6.9.2 (montado à parte, com o número da versão v0.6.9.2), com o método da v0.6.10: a tela só é medida depois que a abertura (`#abertura`) some, e cada ação de rapidez é medida 5 vezes e vale a mediana.
- `codigo.json`: arquivos acima de 800 linhas em `src/` e os 4 avisos do montador que já existiam (chave repetida em `graficoPlano.js`, `iconesFaixa.js` e `icones.js`).
- `fase-0-uma-medida/`: a primeira medida, da Fase 0, com uma medida só por ação e sem esperar a abertura. Ficou só como histórico: a variação normal da máquina (até 30% com o processador freado) e a abertura ainda na tela davam "piorou" sem nada ter mudado.

Quem troca a linha de base: só o dono, quando aprovar uma versão que melhorou (a nova linha passa a ser a dessa versão).

## Linha de base v0.6.12 (12/11/2026)

Aprovada pelo Elias no item E01 da v0.6.12: **a rapidez passa a ser comparada com os números da v0.6.12** (digitar 83 ms, mover 34 ms, desfazer 34 ms; com o processador 4× mais lento 263, 82 e 117 ms; e o tamanho do app medido na v0.6.12, em `codigo.json › tamanhoApp`, acertado na v0.6.13: tinha ficado o da v0.6.9.2). As outras lentes (visual e código) continuam com os números da v0.6.9.2. A pasta `base-v0.6.9.2` fica guardada como história.
