import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp-up: sobe gradativamente para 50 usuários
    { duration: '2m', target: 100 },  // Pico / Estresse: Mantém 100 usuários simulando a Black Friday
    { duration: '30s', target: 0 },   // Ramp-down: reduz o tráfego a zero
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.05'],
  },
};

function gerarPayloadPedido() {
  const idAleatorio = Math.floor(Math.random() * 1000000);
  return JSON.stringify({
    clienteEmail: `usuario_${idAleatorio}@entregasja.com.br`,
    valor: parseFloat((Math.random() * 300 + 10).toFixed(2)),
    cartao: {
      numero: '4111111111111111',
      validade: '12/28',
      cvv: '123'
    }
  });
}

export default function () {
  const url = 'http://localhost:5000/api/v1/checkout'; 
  const payload = gerarPayloadPedido();
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  const res = http.post(url, payload, params);
  check(res, {
    'status esperado recebido (200, 400 ou 500)': (r) => [200, 400, 500].includes(r.status),
  });
  sleep(Math.random() * 1 + 0.5);
}