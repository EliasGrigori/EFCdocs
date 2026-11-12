# Auditoria de rapidez (Método Sabiá 2.0)

Mediana de 5 medidas por ação. Metas: ação comum até 100 ms, ação pesada até 1000 ms; com o processador mais lento, até 3 vezes isso.

| Ação | Processador | Tempo | Meta | Resultado | Contra a base |
|---|---|---|---|---|---|
| Digitar um número e Enter | normal | 83 ms | 100 ms | dentro | melhorou: 1105 → 83 ms |
| Mover a seleção | normal | 34 ms | 100 ms | dentro | igual (36 ms antes) |
| Desfazer | normal | 34 ms | 100 ms | dentro | melhorou: 856 → 34 ms |
| Digitar um número e Enter | 4× mais lento | 263 ms | 300 ms | dentro | melhorou: 5091 → 263 ms |
| Mover a seleção | 4× mais lento | 82 ms | 300 ms | dentro | igual (77 ms antes) |
| Desfazer | 4× mais lento | 117 ms | 300 ms | dentro | melhorou: 4983 → 117 ms |
