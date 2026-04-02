---
name: Reestruturação da app v2
description: Despesas unificadas (fixo+variável), Entradas (antes Rendimentos), Investimentos, Categorias com tipo, Saldo multi-conta
type: feature
---
- Fixos e Variáveis unificados na aba "Despesas" com filtro fixo/variável
- "Rendimentos" renomeado para "Entradas" e aparece antes de Despesas
- Nova aba "Investimentos" (Ações, Poupança, Cripto)
- "Categorias" separado perto do nome no header — define tipo Fixo/Variável
- "Saldo Acumulado" substituído por "Configuração de Saldo Inicial" com múltiplas contas
- Contas pendentes NÃO afetam o saldo automático
- Categorias incluem "Outros" por defeito
- Nome exibido: apenas primeiro e último nome
- Tabelas DB: accounts, investments, categories (com RLS)
- Security: profiles plan fields protegidos, suggestions user_id NOT NULL
