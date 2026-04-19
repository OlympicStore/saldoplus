---
name: Simulador de Crédito Habitação
description: Simulador completo dentro da tab Minha Casa (apenas plano imobiliaria) com taxa fixa/variável/mista, upload de escritura com extração IA, tabela de amortização e simulações guardadas em DB.
type: feature
---
- Localização: 3ª secção dentro de MinhaCasa.tsx (toggle: Esforço / Progresso / Simulador)
- Acesso: apenas plano `imobiliaria` (segue gating da tab Minha Casa)
- Tabela `mortgage_simulations`: guarda múltiplas simulações por user (campos: rate_type, indexante, spread, fixed_period_years, fixed_rate_initial). Parceiros/consultores veem as dos clientes via RLS
- **Tipos de taxa**: fixed (taxa fixa anual), variable (indexante + spread, assumido constante), mixed (anos fixos com taxa fixa inicial → depois indexante + spread)
- **Upload escritura (IA)**: edge function `extract-mortgage-doc` recebe PDF/imagem em base64, chama Lovable AI Gateway com Gemini 2.5 Pro multimodal + tool calling. Devolve loan_amount, rate_type, annual_rate, indexante, spread, fixed_period_years, fixed_rate_initial, term_years, monthly_payment, insurance_notes, confidence
- **Privacidade**: ficheiro é lido em base64 no browser, enviado para edge function, processado em memória pela IA e descartado. Nada é guardado em storage. Limite 10 MB
- Pós-extração: card de revisão com todos os campos editáveis + nível de confiança IA. Botão "Confirmar dados e aplicar" preenche o simulador
- Cálculos: PMT recomputada quando a taxa muda (mista). Schedule mês a mês inclui `rateApplied`. Custo total, juros totais, taxa esforço (<30 verde / 30-40 amarelo / >40 vermelho)
- Pagamento extra: recalcula schedule reduzido, mostra juros poupados + tempo poupado
- Gráficos: Area dívida ao longo dos anos + Line juros vs capital + Line evolução da prestação (apenas variável/mista)
- Tabela amortização: agrupada por ano com taxa média, expansível para detalhe mensal (com taxa por mês)
- Export CSV mês a mês inclui taxa aplicada
- Insights automáticos: avisa mudança de fase em mista, calcula taxa efetiva variável
- Componente: src/components/MortgageSimulator.tsx
- Edge function: supabase/functions/extract-mortgage-doc/index.ts (LOVABLE_API_KEY, sem armazenamento)
