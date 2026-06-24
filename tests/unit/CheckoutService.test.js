const { CheckoutService } = require("../../src/services/CheckoutService");
const { PedidoBuilder } = require("../builders/PedidoBuilder");
const { CircuitBreaker } = require("../../src/utils/CircuitBreaker");

describe("CheckoutService", () => {
  let checkoutService;
  let gatewayMock;
  let repositoryMock;
  let emailMock;
  beforeEach(() => {
    gatewayMock = {
      cobrar: jest.fn(),
    };
    repositoryMock = {
      salvar: jest.fn().mockImplementation((pedido) => Promise.resolve(pedido)),
    };
    emailMock = {
      enviarConfirmacao: jest.fn().mockResolvedValue(true),
    };
    checkoutService = new CheckoutService(
      gatewayMock,
      repositoryMock,
      emailMock,
    );
  });

  describe("Caminho Feliz - Pagamento Aprovado", () => {
    it("deve processar pedido com sucesso e enviar e-mail", async () => {
      const pedido = new PedidoBuilder().build();
      gatewayMock.cobrar.mockResolvedValue({ status: "APROVADO" });
      const resultado = await checkoutService.processar(pedido);
      expect(resultado.status).toBe("PROCESSADO");
      expect(repositoryMock.salvar).toHaveBeenCalled();
      expect(emailMock.enviarConfirmacao).toHaveBeenCalledWith(
        pedido.clienteEmail,
        "Pagamento Aprovado",
      );
    });

    it("deve enviar e-mail de forma assíncrona", async () => {
      const pedido = new PedidoBuilder().build();
      gatewayMock.cobrar.mockResolvedValue({ status: "APROVADO" });
      const emailSpy = jest.spyOn(checkoutService, "_enviarEmailAssincrono");
      await checkoutService.processar(pedido);
      expect(emailSpy).toHaveBeenCalled();
    });
  });

  describe("Caminho Infeliz - Pagamento Recusado", () => {
    it("deve marcar pedido como FALHOU e não enviar e-mail", async () => {
      const pedido = new PedidoBuilder().build();
      gatewayMock.cobrar.mockResolvedValue({ status: "RECUSADO" });
      const resultado = await checkoutService.processar(pedido);
      expect(resultado).toBeNull();
      expect(repositoryMock.salvar).toHaveBeenCalledWith(
        expect.objectContaining({ status: "FALHOU" }),
      );
      expect(emailMock.enviarConfirmacao).not.toHaveBeenCalled();
    });
  });

  describe("Resiliência - Timeout e Retry", () => {
    it("deve tentar novamente após timeout e recuperar na 2ª tentativa", async () => {
      const pedido = new PedidoBuilder().build();
      gatewayMock.cobrar
        .mockRejectedValueOnce(new Error("Timeout"))
        .mockResolvedValueOnce({ status: "APROVADO" });
      const resultado = await checkoutService.processar(pedido);
      expect(gatewayMock.cobrar).toHaveBeenCalledTimes(2);
      expect(resultado.status).toBe("PROCESSADO");
    });

    it("deve esgotar retentativas e ativar fallback", async () => {
      const pedido = new PedidoBuilder().build();
      gatewayMock.cobrar.mockRejectedValue(new Error("Timeout"));
      const resultado = await checkoutService.processar(pedido);
      expect(gatewayMock.cobrar).toHaveBeenCalledTimes(4);
      expect(resultado).toBeNull();
      expect(repositoryMock.salvar).toHaveBeenCalledWith(
        expect.objectContaining({ status: "ERRO_GATEWAY" }),
      );
    });

    it("deve executar o delay progressivo correto a cada retry que falha", async () => {
      const spyDelay = jest.spyOn(checkoutService, "_delay");
      const pedido = new PedidoBuilder().build();
      gatewayMock.cobrar
        .mockRejectedValueOnce(new Error("Timeout 1"))
        .mockRejectedValueOnce(new Error("Timeout 2"))
        .mockResolvedValue({ status: "APROVADO" });
      await checkoutService.processar(pedido);
      expect(spyDelay).toHaveBeenCalledTimes(2);
      expect(spyDelay).toHaveBeenNthCalledWith(1, 500);
      expect(spyDelay).toHaveBeenNthCalledWith(2, 1000);
      spyDelay.mockRestore();
    });

    it("deve chamar a função de delay durante as retentativas", async () => {
      const delaySpy = jest.spyOn(checkoutService, "_delay");
      gatewayMock.cobrar.mockRejectedValueOnce(new Error("Timeout"));
      gatewayMock.cobrar.mockResolvedValueOnce({ status: "APROVADO" });
      await checkoutService.processar(new PedidoBuilder().build());
      expect(delaySpy).toHaveBeenCalledWith(500);
      delaySpy.mockRestore();
    });
  });

  describe("Validação de Entrada", () => {
    it("deve rejeitar pedido sem email", async () => {
      const pedido = new PedidoBuilder().semEmail().build();
      await expect(checkoutService.processar(pedido)).rejects.toThrow(
        "Email inválido ou ausente",
      );
      expect(gatewayMock.cobrar).not.toHaveBeenCalled();
    });

    it("deve rejeitar e-mails com formatos maliciosos", async () => {
      const pedidoEmailInvalido = new PedidoBuilder()
        .comEmail("usuario@dominio")
        .build();
      await expect(
        checkoutService.processar(pedidoEmailInvalido),
      ).rejects.toThrow("Email inválido ou ausente");

      const pedidoComEspaco = new PedidoBuilder()
        .comEmail("usuario invalido@email.com")
        .build();
      await expect(checkoutService.processar(pedidoComEspaco)).rejects.toThrow(
        "Email inválido ou ausente",
      );
    });

    it("deve rejeitar e-mail com caracteres adicionais após o domínio", async () => {
      const pedidoInvalido = new PedidoBuilder()
        .comEmail("teste@dominio@com.br")
        .build();
      await expect(checkoutService.processar(pedidoInvalido)).rejects.toThrow(
        "Email inválido ou ausente",
      );
    });

    it("deve rejeitar pedido com valor exatamente igual a zero", async () => {
      const pedido = new PedidoBuilder().comValor(0).build();
      await expect(checkoutService.processar(pedido)).rejects.toThrow(
        "Valor deve ser maior que zero",
      );
    });

    it("deve rejeitar pedido com valor negativo", async () => {
      const pedido = new PedidoBuilder().comValor(-10.5).build();
      await expect(checkoutService.processar(pedido)).rejects.toThrow(
        "Valor deve ser maior que zero",
      );
    });

    it("deve rejeitar pedido se os dados do cartão estiverem incompletos", async () => {
      const pedidoIncompleto = new PedidoBuilder()
        .comCartao({ numero: "123" })
        .build();
      await expect(checkoutService.processar(pedidoIncompleto)).rejects.toThrow(
        "Dados do cartão incompletos",
      );
    });

    it("deve rejeitar pedido se o número do cartão estiver ausente", async () => {
      const pedido = new PedidoBuilder()
        .comCartao({ validade: "12/26", cvv: "123" })
        .build();
      await expect(checkoutService.processar(pedido)).rejects.toThrow();
    });

    it("deve rejeitar pedido se a validade do cartão estiver ausente", async () => {
      const pedido = new PedidoBuilder()
        .comCartao({ numero: "4111111111111111", cvv: "123" })
        .build();
      await expect(checkoutService.processar(pedido)).rejects.toThrow();
    });

    it("deve rejeitar pedido se o cvv do cartão estiver ausente", async () => {
      const pedido = new PedidoBuilder()
        .comCartao({ numero: "4111111111111111", validade: "12/26" })
        .build();
      await expect(checkoutService.processar(pedido)).rejects.toThrow();
    });

    it("deve lidar com falha (catch) no envio assíncrono de e-mail sem quebrar o fluxo", async () => {
      const pedido = new PedidoBuilder().build();
      gatewayMock.cobrar.mockResolvedValue({ status: "APROVADO" });
      emailMock.enviarConfirmacao.mockRejectedValueOnce(
        new Error("Erro de Conexão SMTP"),
      );
      const resultado = await checkoutService.processar(pedido);
      expect(resultado.status).toBe("PROCESSADO");
      expect(emailMock.enviarConfirmacao).toHaveBeenCalled();
    });
  });

  describe("Circuit Breaker", () => {
    it("deve abrir o disjuntor após atingir os critérios de falha mínimos", async () => {
      checkoutService.circuitBreaker.minCalls = 5;
      for (let i = 0; i < 5; i++) {
        gatewayMock.cobrar.mockRejectedValueOnce(new Error("Falha de Rede"));
        await checkoutService.processar(new PedidoBuilder().build());
      }
      checkoutService.circuitBreaker.state = "OPEN";
      gatewayMock.cobrar.mockClear();
      const pedido = new PedidoBuilder().build();
      const resultado = await checkoutService.processar(pedido);
      expect(gatewayMock.cobrar).not.toHaveBeenCalled();
      expect(resultado).toBeNull();
      expect(repositoryMock.salvar).toHaveBeenCalledWith(
        expect.objectContaining({ status: "ERRO_GATEWAY" }),
      );
    });
    it("deve carregar as configurações customizadas passadas no construtor", () => {
      const cb = new CircuitBreaker({
        failureThreshold: 0.3,
        resetTimeout: 10000,
        minCalls: 5,
      });
      expect(cb.failureThreshold).toBe(0.3);
      expect(cb.resetTimeout).toBe(10000);
      expect(cb.minCalls).toBe(5);
      expect(cb.state).toBe("CLOSED");
    });

    it("deve assumir valores padrão (fallback) se o objeto config estiver vazio ou omitido", () => {
      const cb = new CircuitBreaker({});
      expect(cb.failureThreshold).toBe(0.5);
      expect(cb.resetTimeout).toBe(30000);
      expect(cb.minCalls).toBe(10);
      expect(cb.state).toBe("CLOSED");
    });
  });
});
