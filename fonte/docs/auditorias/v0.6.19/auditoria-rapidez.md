# Auditoria de rapidez (Método Sabiá 2.0)

Mediana de 5 medidas por ação. Metas: ação comum até 100 ms, ação pesada até 1000 ms; com o processador mais lento, até 3 vezes isso.

| Ação | Processador | Tempo | Meta | Resultado | Contra a base |
|---|---|---|---|---|---|
| Digitar um número e Enter | normal | 65 ms | 100 ms | dentro | igual (83 ms antes) |
| Mover a seleção | normal | 37 ms | 100 ms | dentro | igual (34 ms antes) |
| Desfazer | normal | 33 ms | 100 ms | dentro | igual (34 ms antes) |
| Digitar um número e Enter | 4× mais lento | 182 ms | 300 ms | dentro | melhorou: 263 → 182 ms |
| Mover a seleção | 4× mais lento | 59 ms | 300 ms | dentro | melhorou: 82 → 59 ms |
| Desfazer | 4× mais lento | 101 ms | 300 ms | dentro | igual (117 ms antes) |
