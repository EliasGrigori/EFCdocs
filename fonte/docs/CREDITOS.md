# Créditos e licenças · EFCdocs

Lente 6.4 do Método Sabiá 2.0: toda biblioteca e todo código aberto usado ou consultado fica aqui, com a licença. Atualizado na v0.6.10 (11/11/2026).

## O que vai dentro do app publicado

| Biblioteca | Versão | Licença | Para quê |
|---|---|---|---|
| React | 19.2.8 | MIT | telas |
| React DOM | 19.2.8 | MIT | telas |

O resto do app (grade, motor de fórmulas, leitura e gravação de .xlsx, ZIP, PDF da planilha, gráficos, Quadro, Documento) é código próprio do EFCdocs. Nenhum trecho de código de outro projeto foi copiado para `src/` até a v0.6.10.

## Só para montar e testar (não vão para o app)

| Ferramenta | Versão | Licença | Para quê |
|---|---|---|---|
| esbuild | 0.28.2 | MIT | montar o app (`npm run build`) |
| pdf-lib | 1.17.1 | MIT | testes que abrem o PDF gerado |
| Playwright | 1.63.0 | Apache-2.0 | teste no navegador e auditorias de tela |
| openpyxl (Python) | 3.1.5 | MIT | conferente de fora 1: estrutura e estilo do .xlsx salvo (`scripts/fidelidade/conferir-openpyxl.py`) |
| LibreOffice | 24.2 | MPL-2.0 | conferente de fora 2: recalcula o .xlsx salvo (`scripts/fidelidade/conferir-libreoffice.py`), rodando como programa à parte |

## Consultados como referência (decisão B01 da Fase 0)

| Projeto | Licença | Como foi usado |
|---|---|---|
| Univer 1.4.0 | Apache-2.0 (núcleo); parte "Pro" paga, não usada | teste prático na Fase 0 (planilha de 360 mil células); referência de comportamento para mescladas, bordas e tabela viva. Nenhum código copiado |
| FortuneSheet | MIT | referência de comportamento (Fase 0). Nenhum código copiado |
| SheetJS Community Edition | Apache-2.0 | previsto como leitor de .xls, .ods e .csv (pedido de 05/11). Ainda não entrou |

## Regra

Antes de copiar qualquer trecho de código aberto para `src/`: conferir a licença, anotar aqui (projeto, arquivo de origem, licença, onde entrou) e manter o aviso de licença exigido (Apache-2.0 pede o aviso e o arquivo NOTICE quando houver). Código sem licença clara não entra.
