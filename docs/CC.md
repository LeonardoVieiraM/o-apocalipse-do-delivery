Nós:
- 1 - Inicio / processas(pedido)
- 2 - cobrar()
- 3 - APROVADO
- 4 - error
- 5 - PROCESSADO
- 6 - FALHOU
- 7 - ERRO_GATEWAY
- 8 - salvar(pedido)
- 9 - salvar(pedido)
- 10 - salvar(pedido)
- 11 - confirmacao
- 12 - return null
- 13 - return null
- 14 - return pedidoSalvo
- 15 - FIM

Arestas:
- 1 - 1 → 2
- 2 - 2 → 3
- 3 - 2 → 4
- 4 - 3 → 5
- 5 - 3 → 6
- 6 - 4 → 7
- 7 - 5 → 8
- 8 - 6 → 9
- 9 - 7 → 10
- 10 - 8 → 11
- 11 - 9 → 12
- 12 - 10 → 13
- 13 - 11 → 14
- 14 - 12 → 15
- 15 - 13 → 15
- 16 - 14 → 15

| Arestas - Nós + 2: 16 - 15 + 2 = 3 | Nós Predicados + 1: 2 + 1 = 3 |
