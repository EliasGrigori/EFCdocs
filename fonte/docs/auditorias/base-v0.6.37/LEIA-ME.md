# Linha de base v0.6.37 (aprovada pelo Elias em 19/11/2026 às 12:19: R1 e R2 da investigação da rapidez)

- **Rapidez:** medida de novo com a v0.6.37, cada ação **15 vezes** (era 5; `repeticoes` em `scripts/auditoria/efcdocs.config.json`), e vale a **pior de 3 rodadas**, como na D16. Motivo: a base de 18/11 tinha sido tirada num momento mais rápido da máquina (a própria v0.6.27 media 177 a 217 ms no Desfazer com o processador 4× mais lento, contra 151 da base) e 5 medidas oscilavam demais. Investigação: `../../../.auditoria/v0.6.37/rapidez-investigacao.txt` (no pacote de testes da v0.6.37). As metas absolutas continuam: ação comum abaixo de 100 ms e abaixo de 300 ms com o processador 4 vezes mais lento.
- **Tamanho:** o mesmo da base v0.6.26 (pela R42, não barra).
- **Visual, fidelidade, segurança e código:** as mesmas medidas da base v0.6.26 (copiadas sem mudar).
