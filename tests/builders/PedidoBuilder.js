class PedidoBuilder {
  constructor() {
    this.pedido = {
      clienteEmail: 'cliente@teste.com',
      valor: 150.00,
      cartao: {
        numero: '4111111111111111',
        validade: '12/26',
        cvv: '123'
      },
      status: 'PENDENTE'
    };
  }

  comEmail(email) {
    this.pedido.clienteEmail = email;
    return this;
  }

  comValor(valor) {
    this.pedido.valor = valor;
    return this;
  }

  comCartao(cartao) {
    this.pedido.cartao = cartao;
    return this;
  }

  comStatus(status) {
    this.pedido.status = status;
    return this;
  }

  semEmail() {
    delete this.pedido.clienteEmail;
    return this;
  }

  semValor() {
    delete this.pedido.valor;
    return this;
  }

  semCartao() {
    delete this.pedido.cartao;
    return this;
  }

  build() {
    return { ...this.pedido };
  }
}

module.exports = { PedidoBuilder };