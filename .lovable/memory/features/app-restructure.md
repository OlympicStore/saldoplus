---
name: Reestruturação da app v2
description: Despesas com 3 tipos (Fixo/Inevitável/Não-essencial), Entradas, Investimentos, Categorias com tipo, Saldo multi-conta
type: feature
---
- Três tipos de despesa: Fixas (F) — valor constante; Inevitáveis (I) — variam mas necessárias; Não-essenciais (N) — opcionais
- Fixas usam FixedExpense com monthlyValues/paid/responsible; I e N usam VariableExpense
- "Rendimentos" renomeado para "Entradas" e aparece antes de Despesas
- Nova aba "Investimentos" (Ações, Poupança, Cripto)
- "Categorias" separado perto do nome no header — define tipo F/I/N
- "Saldo Acumulado" substituído por "Configuração de Saldo Inicial" com múltiplas contas
- Contas pendentes NÃO afetam o saldo automático
- Categorias incluem "Outros" por defeito
- Nome exibido: apenas primeiro e último nome
- Tabelas DB: accounts, investments, categories (com RLS)
- Security: profiles plan fields protegidos, suggestions user_id NOT NULL
