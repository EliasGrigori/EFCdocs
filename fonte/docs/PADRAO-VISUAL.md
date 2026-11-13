# Padrão visual do Vértice Docs (o do Cwork)

Vale desde a v0.6.15 (R17, R21, R22, C02). Substitui o estilo Camadas quando o Elias aprovar a versão. Os valores ficam em `src/cwork.css`, carregado por último em `src/main.jsx`.

## Temas
Só dois. Os ids continuam os antigos para não perder o que cada pessoa guardou:

| Tema | id | Fundo | Superfície | Borda | Texto | Texto fraco | Destaque |
|---|---|---|---|---|---|---|---|
| Claro (marfim e ouro) | `papel` | #f7f5ef | #fffefb | #e6dfcf | #1e1b14 | #6f6754 | #9a7128 (texto em #865f1f) |
| Escuro (o Dourado) | `dark` | #0b0d16 | #121524 | #2a2b3b | #f3eee3 | #9a917f | #d9b46a |

Quem tinha um dos 16 temas antigos vai para o Claro ou o Escuro pelo fundo do tema (`temaNovo` em `src/nucleo/prefs.js`).

O botão principal e o comando principal da aba usam o ouro em degradê (#f7df9e → #d9b46a → #b4862f) com texto #1c1406. Fora isso, cor forte só em aviso (ok, atenção, problema).

## Letras
- Títulos (marca, nome do arquivo, título de janela): **Fraunces 600**.
- Todo o resto: **Source Sans 3** (400, 600, 700).
- Embutidas no app (`src/fontes/`, licença OFL), funcionam sem internet e entram no guardado do app.
- Escala: 11 · 12 · 13 · 14 · 16 · 20 · 26 px. No máximo 7 por tela (meta da auditoria).

## Cantos e alvos
- Cantos: 4 px (miúdos: seta do filtro, número da caixa), 7 px (botões, campos, chips), 10 px (cartões e janelas) e o círculo. No máximo 3 tipos mais o círculo.
- Alvo de toque: 28 px ou mais no computador, 44 px no celular.
- Nada de maiúsculas espaçadas, emoji ou bolinha de iniciais. Ícones desenhados (traço 1,8 px).

## Faixa de comandos (R21)
No jeito do Excel: abas em cima (a ativa com traço dourado embaixo), grupos em cartões com o nome do grupo embaixo em 12 px. Coluna com 4 comandos ou mais vira duas colunas de 28 px.

## Planilha
- Linha do congelamento: 1 pixel da tela (C02).
- Seta do filtro: funil com setinha; coluna filtrada = funil cheio em ouro.

## Como conferir
`node scripts/sabia/auditoria-visual.mjs scripts/sabia/efcdocs.config.json <pasta>` (telas do kit) e `node scripts/auditoria/visual.mjs <endereço> <pasta>` (inclui o Escuro, as janelas, o Quadro e Opções).
