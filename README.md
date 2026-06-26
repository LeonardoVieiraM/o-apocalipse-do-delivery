# O Apocalipse do Delivery

Intrgrantes
* André Xavier Lazarini
* João Pedro Guimarães Ribeiro
* Leonardo Vieira Machado
* Lucas Flor Vilela
* Marina Ferreira Sansão Cabalzar
* Nicolas Almeida Prado da Silva

Link vídeo: https://youtu.be/S2FSNkyALJk

Como as Fases se Conectam a este Código

**Fase 1 (Análise & Métricas)**
Vocês calcularão a Complexidade Ciclomática do método processar(pedido). Notem que ele tem caminhos lógicos bem claros baseados no status do pagamento e no bloco catch.

**Fase 2 (Refatoração & Patterns)**
O e-mail síncrono acoplado dentro do fluxo de aprovação é um erro clássico de design. Vocês devem usar a refatoração para extrair essa lógica e garantir via Mocks (no Jest) se o e-mail foi chamado adequadamente, ou usar Stubs para injetar respostas malformadas do gateway.

**Fase 4 (Caos & SRE)**
No arquivo server.js, a função gatewayPagamentoMock.cobrar simula uma promessa de 300ms. Quando vocês configurarem o Toxiproxy, vocês interceptarão essa chamada externa e forçarão uma latência de 5000ms. O k6 vai disparar requisições para /api/v1/checkout e o grupo deverá avaliar se o Express vai sofrer um colapso ou se o código de vocês (redesenhado com circuit breaker ou timeouts curtos) vai proteger o servidor.

# Codigos para execução:
- npm install: instala as dependências do projeto
- choco install k6: instalação do k6
- choco install toxiproxy: instalação do toxiproxy
- npm run start: inicia o servidor da aplicação
- npm test: executa a suite de testes
- npm run stryker: executa o stryker para identificação de mutantes
  
  ## Para execução do k6:
  - Inicie em um terminal o servidor da aplicação

  - Em um segundo terminal, para iniciar o servidor toxiproxy, execute: 
  ```
  toxiproxy-server 
  ```

  - Em um terceiro terminal, para conectar com a aplicação, execute: 
  ```
  toxiproxy-cli create -l localhost:5000 -u localhost:3000 checkout_proxy 
  ```

  - Em um quarto terminal, ara iniciar o k6, execute: 
  ```
  k6 run k6-scripts\teste-black-friday.js
  ```

  - Durante a execução do k6, no terceiro terminal execute os comandos para injeção de caos: 
  ```
  toxiproxy-cli toxic add -t latency -a attributes.latency=5000 checkout_proxy //Gateway Lento
  toxiproxy-cli toggle checkout_proxy // Thundering Herd
  ```
