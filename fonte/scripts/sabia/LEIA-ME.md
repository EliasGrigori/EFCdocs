# Kit do Método Sabiá 2.0

Programas e modelos que servem para qualquer sistema. Copie a pasta para dentro do projeto (por exemplo `scripts/sabia/`).

## O que tem

| Arquivo | Lente | Para quê |
|---|---|---|
| `auditoria-visual.mjs` | 6.1 Visual | Mede cada tela (tamanhos de letra, cantos, altura dos botões, maiúsculas espaçadas, emoji, sombra com borda, contraste, rolagem de lado, erros no console), no PC e no celular, e diz "dentro" ou "FORA" |
| `auditoria-rapidez.mjs` | 6.2 Rapidez | Mede o tempo de cada ação, no aparelho normal e com o processador 4 vezes mais lento |
| `varredura-sensivel.py` | 6.4 Segurança | Procura senhas, chaves, e-mails, CPF, CNPJ, telefones e as palavras do dono; lista imagens e arquivos de escritório para olhar à mão |
| `medir-codigo.py` | 6.5 Código | Linhas por pasta e arquivos acima do limite |
| `montar-aprovacao.py` + `aprovacao.modelo.html` | Entrega | Monta a página de aprovação (Aprovado, Reprovado, comentário, Copiar respostas) a partir de um `itens.json` |
| `passos.mjs` | — | Os passos de tela usados pelas duas auditorias |
| `servir.py` | — | Servidor simples para testar na máquina |
| `modelos/` | — | Ficha do sistema, memória do projeto, `features.csv`, roteiro do agente de testes, exemplos de configuração e o texto para começar uma conversa |

A lente 6.3 (fidelidade e dados) não tem programa genérico: o conferente de fora depende do sistema (seção 10 do método). Exemplo pronto para planilhas (.xlsx) no EFCdocs: `scripts/fidelidade/` (ida e volta + openpyxl + LibreOffice, com a lista de diferenças conhecidas).

## Como usar

```
# 1. servir o sistema montado
python3 servir.py 8731 dist

# 2. auditorias de tela (precisam do Node e do Playwright; CHROME aponta o navegador, se preciso)
node auditoria-visual.mjs  minha.config.json  saida/
node auditoria-rapidez.mjs minha.config.json  saida/

# 2b. "não pode piorar": compara com a linha de base (a pasta ou o .json de uma rodada anterior)
node auditoria-visual.mjs  minha.config.json  saida/ --base linha-de-base/
node auditoria-rapidez.mjs minha.config.json  saida/ --base linha-de-base/

# 3. segurança e código (só Python)
python3 varredura-sensivel.py . --palavras /caminho/fora/do/projeto/palavras.txt
python3 medir-codigo.py src --testes testes --json saida/codigo.json
python3 medir-codigo.py src --base linha-de-base/codigo.json

# 4. página de aprovação
python3 montar-aprovacao.py itens.json aprovacao.html
```

Todos saem com **código 1 quando uma meta não é batida**. Por isso servem de trava: a versão só é entregue com tudo "dentro", ou com a exceção escrita para o dono decidir.

Com `--base` (enquanto o sistema está abaixo da meta) a trava muda: sai com 1 só quando alguma medida **piorou** em relação à linha de base, quando uma tela ou ação nova não bate a meta, ou quando algo não abriu. A coluna "Contra a base" diz igual, melhorou ou PIOROU, com os números.

Cuidados que a v0.6.10 do EFCdocs ensinou:
- **Rapidez varia de uma rodada para outra** (até 30% com o processador freado). Cada ação é medida 5 vezes (`repeticoes`) e vale a mediana; "piorou" é mais de 25% (40% com o processador freado) e mais de 20 ms. A linha de base tem de ser medida **com o mesmo método**.
- **Tela de abertura**: medir antes de ela sumir dá contraste 1,0 e letras a mais. Use o passo `{"sumir": "#abertura"}`.
- Quem troca a linha de base é o dono, ao aprovar uma versão que melhorou.

## A configuração das auditorias de tela (`*.config.json`)

- `base`: endereço do sistema.
- `aparelhos`: `"pc"` (1366×700) e `"celular"` (384×790, toque). Dá para pôr outro tamanho.
- `temas`: lista de `"atributo=valor"` aplicados no `<html>` (ex.: `"data-tema=escuro"`); `null` = como abrir.
- `antes`: passos feitos uma vez (ex.: entrar).
- `telas`: cada uma com `nome` e `url` ou `passos`; `so: ["pc"]` se só existe num aparelho; `isento: ["contraste"]` para uma exceção aprovada pelo dono.
- `metas`: muda as metas padrão (`letras` 7, `cantos` 3, `botaoMinPc` 28, `botaoToque` 44, `contraste` 4.5).
- `preparar`, `acoes`, `metasRapidez`: para a rapidez. Ação `pesada: true` usa a meta de 1 s.

Passos: `{"ir": "#/tela"}`, `{"clicar": "seletor"}`, `{"preencher": ["seletor", "texto"]}`, `{"digitar": "texto"}`, `{"tecla": "Enter"}`, `{"arquivo": ["seletor", "caminho"]}`, `{"esperar": "seletor" ou milissegundos}`, `{"sumir": "seletor"}` (espera sair da tela), `{"tema": "data-tema=escuro"}`.
- `repeticoes`: quantas vezes medir cada ação de rapidez (padrão 5; vale a mediana).

## Limites

- A auditoria visual mede o que está na tela na hora; o que só aparece ao rolar precisa de outra tela na lista.
- O contraste é calculado sobre cor lisa; texto sobre degradê ou imagem não é medido.
- "Sombra com borda" e "cor só para problema" pedem olho humano na conferência final.
- A varredura de dado sensível não lê o que está **dentro** de imagens: ela lista as imagens para você olhar.
