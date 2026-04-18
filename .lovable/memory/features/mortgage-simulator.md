---
name: Simulador de Crédito Habitação
description: Simulador completo dentro da tab Minha Casa (apenas plano imobiliaria) com tabela de amortização, gráficos, simulação de pagamentos extra e simulações guardadas em DB.
type: feature
---
- Localização: 3ª secção dentro de MinhaCasa.tsx (toggle: Esforço / Progresso / Simulador)
- Acesso: apenas plano `imobiliaria` (segue gating da tab Minha Casa)
- Tabela `mortgage_simulations`: guarda múltiplas simulações por user, parceiros/consultores podem ver as dos clientes via RLS
- Inputs: valor empréstimo, taxa juro anual %, prazo anos, rendimento mensal (opc), custos extra (opc), pagamento extra mensal (opc), nome
- Cálculos: PMT standard, schedule mês a mês, custo total, juros totais, taxa esforço (<30 verde / 30-40 amarelo / >40 vermelho), custo real, margem
- Pagamento extra: recalcula schedule reduzido, mostra juros poupados + tempo poupado
- Gráficos: Area dívida ao longo dos anos + Line juros vs capital (recharts)
- Tabela amortização: agrupada por ano, expansível para detalhe mensal
- Export CSV mês a mês
- Insights automáticos com formato markdown bold
- Componente: src/components/MortgageSimulator.tsx
