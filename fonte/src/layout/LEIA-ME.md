# Peças do layout da família (v0.6.15)

Vieram do pacote `vertice-layout-v0.6.15.zip` (EFCwork v0.6.15, aprovado pelo Elias em 14/11/2026).

- `efc-layout.js`: igual ao pacote, byte a byte. Não editar aqui: mudança vem do pacote da família.
- `efc-layout.css`: igual ao pacote, menos o bloco `:root` do topo: cada `--efl-*` lê o token de cor do Vértice e o seletor virou `:root,body` (no Vértice o tema fica no `<body>`).
- As regras R1 a R14 estão em `docs/REGRAS-DE-LAYOUT.md`.

## Parte 2 (15/11/2026)

R6 a R9 usam as peças `efl-pilula`, `efl-gv-cab`, `navGaveta`, `linhaDoTempo` e `gota`. O HTML do Vértice em volta delas está em `src/ui/gaveta.jsx` e as medidas em `src/ui/gaveta.css`. Os dois arquivos desta pasta continuam iguais aos do pacote (o `.css` só com o bloco de variáveis ligado aos tokens do Vértice).
