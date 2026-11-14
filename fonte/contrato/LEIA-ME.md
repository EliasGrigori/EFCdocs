# Contrato EFD v1 (EFCwork × Vértice Docs × Sabiá)

Arquivos **iguais byte a byte** aos do EFCwork (`EliasGrigori/efcwork`, pasta `projeto/tools/contrato/`), trazidos em 13/11/2026 na v0.6.16 (Ponte 1):

| Arquivo | Para quê |
|---|---|
| `efd-v1.js` | conferente do contrato (ficha, pub, pedido...) |
| `efd-ponte.js` | caixa de troca no aparelho (IndexedDB `efd-ponte`, canal `efd`) |
| `exemplos-efd-v1.json` | exemplos inventados, os mesmos dos dois lados |
| `confere.js` | teste de conformidade: `node contrato/confere.js` (roda também no `npm test`) |

`package.json` desta pasta só diz ao Node que estes arquivos são CommonJS (o resto do projeto é módulo ES). **Não edite estes arquivos aqui:** mudou o contrato, sobe o número (v2) nos dois repositórios no mesmo dia, com a ordem do Elias.
