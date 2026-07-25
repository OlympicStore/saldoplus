# Saldo+ v2.0 — Simplificação da Arquitetura

Reduzir a app de ~10 abas para **5 secções principais**, mantendo todas as funcionalidades mas escondendo-as atrás de contexto e filtros em vez de menus.

## Nova navegação (única fonte)

Tanto no desktop (topbar) como no mobile (BottomNav) — apenas 5 destinos:

1. **Home** 🏠 — feed cronológico + resumo
2. **Assistente** 🤖 — chat IA (existente, com melhorias de copy)
3. **Movimentos** 💸 — lista unificada com filtros
4. **Objetivos** 🎯 — metas + orçamentos + score + previsões
5. **Mais** ☰ — drawer com tudo o resto

Elimino as abas atuais: `entries`, `expenses`, `annual`, `investments`, `balance`, `people`, `categories`, `mortgage`, `casa` — passam para dentro das 5 secções ou para "Mais".

## 1. Home (reescrita)

Substituir o `Dashboard.tsx` atual por um layout tipo feed:

- **Hero** — Saldo total (grande, tipografia Sora) + delta do mês
- **Faixa de cartões horizontais** — Score Financeiro · Próxima despesa · Próxima receita · Objetivo em destaque · Insight IA
- **Feed cronológico "Atividade recente"** — últimos 15-20 movimentos (despesa + receita + transferência + contribuição objetivo) agrupados por "Hoje / Ontem / Esta semana", com ícone de categoria, valor com sinal, cor semântica
- **Mini-gráfico "Evolução mensal"** — Area chart compacto (reaproveitar o existente)
- CTAs: "Ver todos os movimentos" → Movimentos · "Falar com assistente" → Assistente

Componentes reaproveitados: `FinancialScore`, `AISuggestions`, gráficos do `Dashboard`. Cartões antigos de saldo por conta e resumo detalhado ficam **só na Home**, colapsados/secundários.

## 2. Assistente

Manter `AIAssistant.tsx`. Alterações:
- Saudação dinâmica por hora do dia + primeiro nome ("Bom dia, Pedro.")
- Chip de pesquisa dentro do histórico (filtra mensagens)
- Histórico contínuo já existe (persistido em `ai_messages`) — expor scroll infinito

## 3. Movimentos (novo componente `Movements.tsx`)

Uma única lista unificada agregando: `variable_expenses` + `fixed_expenses` (instâncias do mês) + `incomes` + `transfers` + `investments` + contribuições de `goals`.

- Barra de filtros topo: chips **Todos · Receitas · Despesas · Transferências · Subscrições · Investimentos**
- Filtros avançados (popover): categoria, conta, pessoa, data (Hoje / 7d / 30d / Este mês / Este ano / Personalizado), gama de valor
- Pesquisa por texto (descrição)
- Ordenação por data desc
- Ações inline: editar / eliminar (reaproveitar handlers existentes)
- Formulário "Novo movimento" com tipo selecionável no topo (substitui os formulários separados de Entradas/Despesas)

Elimina a necessidade das abas `entries`, `expenses`, `annual` (o filtro "Este ano" cobre a vista anual).

## 4. Objetivos (expansão do atual)

`FinancialGoals.tsx` passa a ser um hub com sub-secções (tabs internos leves):
- **Metas** (atual)
- **Orçamentos** (reaproveitar `CategoryBudgets`)
- **Score Financeiro** (reaproveitar `FinancialScore` com ajuste de pesos)
- **Previsões / Planeamento** — projeção simples de saldo com base na média

## 5. Mais (Sheet lateral)

Reaproveitar o `Sheet` já existente no mobile e criar equivalente no desktop (menu no header). Itens:
- Conta / Perfil (`AccountPanel`)
- Modo Casal (`CoupleMode`)
- Contas & Saldo Inicial (`InitialBalance`)
- Categorias (`CategoriesManager`)
- Pessoas (`PersonSelector` config)
- Minha Casa / Simulador (`MinhaCasa`, `MortgageSimulator`)
- Exportações (novo botão simples CSV)
- Plano / Faturação
- Ajuda · Termos · Privacidade · Sair

## Design

- Tokens já existentes (`Sora`/`Manrope`, primary emerald) — sem alterações de paleta
- Aumentar espaçamento vertical entre secções (py-8 → py-12), `rounded-3xl`, sombras muito suaves (`shadow-[0_1px_2px_rgba(0,0,0,0.04)]`)
- Menos densidade: máx. 1 cartão por linha em mobile, 2-3 em desktop
- Micro-animações com Framer Motion (fade + translate curtos)

## Ficheiros técnicos

**Novos:**
- `src/components/Movements.tsx` — lista unificada + filtros
- `src/components/HomeFeed.tsx` — Home reescrita (feed + hero)
- `src/components/MoreMenu.tsx` — conteúdo do Sheet "Mais" partilhado mobile/desktop

**Alterados:**
- `src/pages/Index.tsx` — reduzir `activeTab` a 5 valores, remover tabs antigas, integrar novos componentes
- `src/components/BottomNav.tsx` — já tem 5 slots (Home / Movimentos / +IA / Objetivos / Mais) ✓
- Header desktop — substituir a linha de tabs por 5 links + botão "Mais"
- `src/components/AIAssistant.tsx` — saudação dinâmica + pesquisa

**Preservados (movidos para dentro):** `FixedExpenses`, `VariableExpenses`, `Entries`, `Income`, `AnnualOverview`, `Investments`, `InitialBalance`, `CategoriesManager`, `MinhaCasa`, `MortgageSimulator`, `CoupleMode`, `AccountPanel`. Continuam a existir como componentes e são compostos dentro das 5 secções ou abertos a partir de "Mais".

## Ordem de execução

1. Criar `Movements.tsx` (agrega dados de vários hooks)
2. Criar `HomeFeed.tsx` (feed cronológico + cartões destaque)
3. Criar `MoreMenu.tsx`
4. Refactor `Index.tsx` — nova navegação de 5 abas, remover as antigas
5. Melhorias no Assistente (copy + pesquisa)
6. Ajustar Objetivos com sub-tabs internos
7. Verificar build + smoke test das rotas principais

## Fora do âmbito

- Sem alterações à base de dados
- Sem novas funcionalidades de negócio — apenas reorganização visual/estrutural
- Modo Empresa **não** é implementado (pedido para omitir)
