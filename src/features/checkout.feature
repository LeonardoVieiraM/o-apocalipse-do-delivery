Funcionalidade: Processamento de Checkout de Pedidos
  Como um cliente da EntregasJá
  Quero finalizar minhas compras com cartão de crédito
  Para que minha refeição chegue rapidamente

  Contexto:
    Dado que o sistema de checkout está operacional
    E que o cliente possui dados válidos para compra

  Cenário: Pagamento aprovado com sucesso
    Dado um pedido válido com cliente "joao@email.com", valor 150.00 e cartão válido
    E o gateway de pagamento responde com status "APROVADO"
    Quando o pedido é processado
    Então o status do pedido deve ser "PROCESSADO"
    E o pedido deve ser salvo no repositório
    E um e-mail de confirmação deve ser enviado para "joao@email.com"
    E a resposta HTTP deve ser 200 OK

  Cenário: Pagamento recusado por saldo insuficiente
    Dado um pedido válido com cliente "maria@email.com", valor 150.00 e cartão válido
    E o gateway de pagamento responde com status "RECUSADO"
    Quando o pedido é processado
    Então o status do pedido deve ser "FALHOU"
    E o pedido deve ser salvo no repositório
    E nenhum e-mail de confirmação deve ser enviado
    E a resposta HTTP deve ser 500 Internal Server Error

  Cenário: Timeout do gateway com recuperação no retry
    Dado um pedido válido com cliente "ana@email.com", valor 150.00 e cartão válido
    E o gateway de pagamento falha com timeout na 1ª tentativa
    E o gateway de pagamento responde com "APROVADO" na 2ª tentativa
    Quando o pedido é processado
    Então o sistema deve executar 1 retry
    E o status do pedido deve ser "PROCESSADO"
    E um e-mail de confirmação deve ser enviado
    E a resposta HTTP deve ser 200 OK

  Cenário: Esgotamento de retentativas com fallback
    Dado um pedido válido com cliente "pedro@email.com", valor 150.00 e cartão válido
    E o gateway de pagamento falha persistentemente (timeout) nas 3 tentativas
    Quando o pedido é processado
    Então o sistema deve executar 3 retentativas
    E o status do pedido deve ser "ERRO_GATEWAY"
    E o pedido deve ser salvo com status de erro
    E nenhum e-mail de confirmação deve ser enviado
    E a resposta HTTP deve ser 500 Internal Server Error

  Cenário: Dados inválidos na requisição
    Dado um pedido com dados incompletos (clienteEmail ausente)
    Quando o pedido é processado
    Então o sistema deve retornar 400 Bad Request
    E nenhuma interação com gateway ou banco deve ocorrer