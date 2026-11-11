# Auditoria de rapidez (Método Sabiá 2.0)

Metas: ação comum até 100 ms, ação pesada até 1000 ms; com o processador mais lento, até 3 vezes isso.

| Ação | Processador | Tempo | Meta | Resultado |
|---|---|---|---|---|
| Digitar um número e Enter | normal | 1036 ms | 100 ms | FORA |
| Mover a seleção | normal | 123 ms | 100 ms | FORA |
| Desfazer | normal | 860 ms | 100 ms | FORA |
| Digitar um número e Enter | 4× mais lento | 5139 ms | 300 ms | FORA |
| Mover a seleção | 4× mais lento | 94 ms | 300 ms | dentro |
| Desfazer | 4× mais lento | 4319 ms | 300 ms | FORA |
