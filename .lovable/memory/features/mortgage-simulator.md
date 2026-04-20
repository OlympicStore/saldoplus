---
name: Simulador de Crédito Habitação
description: Simulador completo dentro da tab Minha Casa (apenas plano imobiliaria) com taxa fixa/variável/mista, prazo da Euribor, banner de transição da fase mista, seguros e despesas separadas do crédito.
type: feature
---
- Localização: 3ª secção dentro de MinhaCasa.tsx (toggle: Progresso / Simulador / Esforço)
- Acesso: apenas plano `imobiliaria` (segue gating da tab Minha Casa)
- Tabela `mortgage_simulations`: simulações livres por user. Tabela `house_data`: crédito atual sincronizado.
- **Tipos de taxa**:
  - **fixed**: taxa anual fixa. Tem campos opcionais `fixed_indexante` + `fixed_spread` SÓ informativos (não afetam cálculo)
  - **variable**: indexante + spread + **prazo da Euribor** (3m / 6m / 12m, coluna `euribor_term`)
  - **mixed**: anos fixos com taxa fixa inicial → depois indexante + spread + prazo Euribor. Detecta fim da fase fixa via `plan_started_at`. Mostra banner amarelo persistente exigindo confirmação manual via `mixed_phase2_acknowledged` (boolean)
- **Despesas da casa (fora do crédito)**: secção separada visualmente. NÃO afetam prestação. Cada item tem `frequency` (monthly/quarterly/semiannual/annual) e `kind` (expense/life_insurance/multirisk_insurance). Mostra equivalente mensal. Botões dedicados para adicionar Seguro de vida e Seguro multirriscos. Guardado no jsonb `extra_expenses` (retrocompatível).
- **Upload escritura (IA)**: edge function `extract-mortgage-doc` com Gemini 2.5 Pro multimodal. Sem armazenamento.
- Cálculos: PMT recomputada quando taxa muda. Schedule mês a mês com `rateApplied`. Margem mensal usa equivalente mensal das despesas (incluindo seguros distribuídos).
- Plano de amortização agrupado por ano, expansível para detalhe mensal.
- Componente: src/components/MortgageSimulator.tsx
- Migração: `house_data` tem colunas `euribor_term`, `mixed_phase2_acknowledged`, `fixed_indexante`, `fixed_spread`
