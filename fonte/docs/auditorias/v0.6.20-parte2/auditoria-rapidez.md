# Auditoria de rapidez (Método Sabiá 2.0)

Mediana de 5 medidas por ação. Metas: ação comum até 100 ms, ação pesada até 1000 ms; com o processador mais lento, até 3 vezes isso.

| Ação | Processador | Tempo | Meta | Resultado | Contra a base |
|---|---|---|---|---|---|
| Digitar um número e Enter | normal | 50 ms | 100 ms | dentro | melhorou: 83 → 50 ms |
| Mover a seleção | normal | 34 ms | 100 ms | dentro | igual (34 ms antes) |
| Desfazer | normal | 34 ms | 100 ms | dentro | igual (34 ms antes) |
| Digitar um número e Enter | 4× mais lento | 116 ms | 300 ms | dentro | melhorou: 263 → 116 ms |
| Mover a seleção | 4× mais lento | 44 ms | 300 ms | dentro | melhorou: 82 → 44 ms |
| Desfazer | 4× mais lento | 54 ms | 300 ms | dentro | melhorou: 117 → 54 ms |
