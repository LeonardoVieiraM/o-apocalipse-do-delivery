// src/utils/CircuitBreaker.js
class CircuitBreaker {
  constructor(config) {
    this.failureThreshold = config.failureThreshold || 0.5;
    this.resetTimeout = config.resetTimeout || 30000;
    this.minCalls = config.minCalls || 10;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF-OPEN
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      throw new Error('Circuit is open');
    }

    try {
      const result = await fn();
      return result;
    } catch (error) {
      // Aqui nas próximas fases você implementará a lógica de contagem de falhas
      throw error;
    }
  }
}

module.exports = { CircuitBreaker };