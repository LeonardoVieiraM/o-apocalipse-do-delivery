const { CircuitBreaker } = require('../utils/CircuitBreaker');

class CheckoutService {
  constructor(gatewayPagamento, pedidoRepository, emailService) {
    this.gatewayPagamento = gatewayPagamento;
    this.pedidoRepository = pedidoRepository;
    this.emailService = emailService;
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 0.5,
      resetTimeout: 30000,
      minCalls: 10
    });
    this.maxRetries = 3;
    this.retryDelay = 500; // ms
    this.timeout = 2000; // ms
  }

  async processar(pedido) {
    const validationError = this._validarPedido(pedido);
    if (validationError) {
      throw new Error(validationError);
    }

    let lastError = null;
    let gatewayResponse = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Tentativa ${attempt + 1}/${this.maxRetries + 1}...`);
          await this._delay(this.retryDelay * attempt);
        }

        gatewayResponse = await this.circuitBreaker.execute(() => 
          this._cobrarComTimeout(pedido)
        );
        
        break;
      } catch (error) {
        lastError = error;
        console.error(`Tentativa ${attempt + 1} falhou: ${error.message}`);
        
        if (error.message === 'Circuit is open') {
          break; 
        }
      }
    }

    if (gatewayResponse) {
      if (gatewayResponse.status === 'APROVADO') {
        return await this._processarAprovado(pedido);
      } else {
        return await this._processarRecusado(pedido);
      }
    }

    return await this._fallback(pedido);
  }

  async _cobrarComTimeout(pedido) {
    return Promise.race([
      this.gatewayPagamento.cobrar(pedido.valor, pedido.cartao),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout no gateway de pagamento')), this.timeout)
      )
    ]);
  }

  async _processarAprovado(pedido) {
    pedido.status = 'PROCESSADO';
    const pedidoSalvo = await this.pedidoRepository.salvar(pedido);
    
    this._enviarEmailAssincrono(pedido.clienteEmail, 'Pagamento Aprovado');
    
    return pedidoSalvo;
  }

  async _processarRecusado(pedido) {
    pedido.status = 'FALHOU';
    await this.pedidoRepository.salvar(pedido);
    return null;
  }

  async _fallback(pedido) {
    console.warn('Fallback para pedido', pedido.clienteEmail);
    
    pedido.status = 'ERRO_GATEWAY';
    await this.pedidoRepository.salvar(pedido);
    
    return null;
  }

  _enviarEmailAssincrono(email, message) {
    this.emailService.enviarConfirmacao(email, message)
      .then(() => console.log(`E-mail enviado para ${email}`))
      .catch(err => console.error(`Falha ao enviar e-mail para ${email}:`, err.message));
  }

  _validarPedido(pedido) {
    if (!pedido.clienteEmail || !this._isEmailValido(pedido.clienteEmail)) {
      return 'Email inválido ou ausente';
    }
    if (!pedido.valor || pedido.valor <= 0) {
      return 'Valor deve ser maior que zero';
    }
    if (!pedido.cartao || !pedido.cartao.numero || !pedido.cartao.validade || !pedido.cartao.cvv) {
      return 'Dados do cartão incompletos';
    }
    return null;
  }

  _isEmailValido(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { CheckoutService };