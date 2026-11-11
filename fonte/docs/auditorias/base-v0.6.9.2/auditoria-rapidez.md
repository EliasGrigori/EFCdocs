# Auditoria de rapidez (Método Sabiá 2.0)

Mediana de 5 medidas por ação. Metas: ação comum até 100 ms, ação pesada até 1000 ms; com o processador mais lento, até 3 vezes isso.

| Ação | Processador | Tempo | Meta | Resultado |
|---|---|---|---|---|
| Digitar um número e Enter | normal | 1105 ms | 100 ms | FORA |
| Mover a seleção | normal | 36 ms | 100 ms | dentro |
| Desfazer | normal | 856 ms | 100 ms | FORA |
| Digitar um número e Enter | 4× mais lento | 5091 ms | 300 ms | FORA |
| Mover a seleção | 4× mais lento | 77 ms | 300 ms | dentro |
| Desfazer | 4× mais lento | 4983 ms | 300 ms | FORA |
