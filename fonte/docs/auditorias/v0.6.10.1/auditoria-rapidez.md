# Auditoria de rapidez (Método Sabiá 2.0)

Mediana de 5 medidas por ação. Metas: ação comum até 100 ms, ação pesada até 1000 ms; com o processador mais lento, até 3 vezes isso.

| Ação | Processador | Tempo | Meta | Resultado | Contra a base |
|---|---|---|---|---|---|
| Digitar um número e Enter | normal | 1270 ms | 100 ms | FORA | igual (1105 ms antes) |
| Mover a seleção | normal | 37 ms | 100 ms | dentro | igual (36 ms antes) |
| Desfazer | normal | 1058 ms | 100 ms | FORA | igual (856 ms antes) |
| Digitar um número e Enter | 4× mais lento | 6290 ms | 300 ms | FORA | igual (5091 ms antes) |
| Mover a seleção | 4× mais lento | 97 ms | 300 ms | dentro | igual (77 ms antes) |
| Desfazer | 4× mais lento | 5751 ms | 300 ms | FORA | igual (4983 ms antes) |
