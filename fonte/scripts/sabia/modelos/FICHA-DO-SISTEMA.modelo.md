# Ficha do sistema · <nome do sistema>

Preenchida em <data> (Método Sabiá 2.1). É esta ficha que adapta o método a este sistema. Kit em uso: ver `scripts/sabia/KIT-VERSAO`.

| Campo | Resposta |
|---|---|
| Nome e para quem é | <o que faz, em duas frases, e quem usa> |
| Caminho | <sistema existente ou sistema novo> |
| Ligação | EFC-Claude-Base versão <…>; obrigatório: `metodo-sabia`; recomendados em uso: <…> |
| Dono e palavra de ordem | <quem aprova> · <frase exata que libera publicar> |
| Agente de testes | <quem testa por fora (defeitos que passaram e revisão total) e como recebe o roteiro e os arquivos> |
| Peças | <linguagem, bibliotecas, banco de dados, onde roda> |
| Comandos | instalar: `<…>` · montar: `<…>` · testar: `<…>` · servir: `<…>` · publicar: `<…>` |
| Lista de publicação | 1. <…> 2. <…> (tudo que vai junto no mesmo envio, em ordem) |
| Plano de volta | <como voltar para a versão anterior e quem decide> |
| Dados sensíveis | <o que é dado real, onde fica, quem pode ver, como anonimizar> |
| Palavras do dono | Lista para a varredura guardada **fora** do projeto: <caminho> |
| Aparelhos | <ex.: PC com toque 1366×700; celular 384×790> |
| Padrão visual | <arquivo único com cores, fontes, tamanhos, cantos> |
| Conferentes de fora | <que outro programa lê o que o sistema produz> |
| Rapidez pesa mais? | <sim ou não (seção 11): decide carga grande e processador freado> |
| O que não pode quebrar | <funções e dados que valem mais> |

## Metas das auditorias

| Lente | Medida | Como mede | Meta | Linha de base (versão, data) |
|---|---|---|---|---|
| Visual | Tamanhos de letra por tela | Programa | até 7 | <…> |
| Visual | Tipos de canto | Programa | até 3 | <…> |
| Visual | Botão e campo abaixo do mínimo | Programa | 0 abaixo de 28 px (PC) e 44 px (toque) | <…> |
| Visual | Maiúsculas espaçadas, emoji, rolagem de lado, erros no console | Programa | 0 | <…> |
| Visual | Contraste de texto | Programa | 4,5 | <…> |
| Rapidez | Ação comum | Programa | menos de 0,1 s | <…> |
| Rapidez | Ação pesada | Programa | menos de 1 s ou com aviso | <…> |
| Fidelidade | Ida e volta, conferentes de fora | Programa do projeto | 0 diferenças fora das conhecidas | <…> |
| Segurança | Achados da varredura de dado sensível | Programa | 0 | <…> |
| Código | Arquivos acima de 800 linhas; avisos ao montar | Programa | nenhum novo; 0 avisos | <…> |

As medidas de olho (seção 7 do método) vão para a lista de conferência da página de aprovação. Medida de olho que ganhar programa neste projeto: escrever aqui.
