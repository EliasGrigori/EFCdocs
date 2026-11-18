# Roteiro de testes · <sistema> v<versão>

Para: <agente de testes> · Data: <data> · Endereço ou arquivo para testar: <…>

Use só os dados inventados do pacote. Não use dado real.

## 1. O que foi feito nesta versão

| Código | Mudança |
|---|---|
| <V01> | <o que mudou, em uma frase> |

## 2. Como conferir cada mudança

| Código | Passos | Resultado esperado |
|---|---|---|
| <V01> | 1. <…> 2. <…> | <o que tem de aparecer> |

## 3. Revisão total e outros erros para procurar

Além do que mudou, revise o sistema inteiro: o objetivo é achar defeitos que passaram pela rede.


- <áreas perto da mudança que podem ter quebrado>
- Console do navegador com erro.
- Celular (384×790) e PC (1366×700); tema claro e escuro.

## 4. O que já é esperado (não é defeito)

- <limites conhecidos e diferenças da lista de conhecidas>

## 5. Como devolver

Um relatório com uma linha por código: **OK**, **FALHOU** ou **PARCIAL**, com o que aconteceu e, se der, o print. Defeito novo fora do roteiro: código N01, N02…
