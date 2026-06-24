# Estimativa de Esforço de Teste
## Técnica: Pontos de Caso de Teste (Test Case Points - TCP)

| Componente | Complexidade | Peso | Qtd | Total |
| ---------- | ------------ | ---- | --- | ----- |
|Funcionalidades                                 |	
| Validação de entrada | Média | 3 | 2 | 6 |
| Processamento APROVADO | Alta	| 5 | 1 | 5 |
| Processamento RECUSADO | Média | 3 | 1 | 3 |
| Timeout e Retry | Alta | 5 | 1 | 5 |
| Circuit Breaker/Fallback | Alta | 5 | 1 | 5 |
| Cache/Thundering Herd	Média	| 3 | 1 | 3 |
| Testes Não-Funcionais				             |
| Teste de Mutação | - | 5 | 1 | 5 |
| Teste de Carga (k6)	| - | 5 |	1 | 5 |
| Injeção de Falhas | - | 5 |	1 | 5 |
|Total de Pontos				42               |

## Estimativa de Horas:
1 ponto = 1.5 horas (considerando setup, execução e documentação)
Total estimado: 42 × 1.5 = 63 horas-homem

### Distribuição da Equipe:
3 desenvolvedores × 21 horas (~3 dias) = 63 horas

Recursos Necessários:
- Ambiente de desenvolvimento Node.js
- Stryker.js para mutação
- k6 para testes de carga
- Toxiproxy para injeção de falhas
- Docker para isolamento do ambiente
