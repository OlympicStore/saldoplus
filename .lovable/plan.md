## Redesign completo de Planos, Permissões, Landing e Checkout

Este é um trabalho grande. Divido em 5 fases claras, sem remover nenhuma funcionalidade existente — apenas reorganizar, limitar por plano e melhorar a interface.

---

### 1. Nova estrutura de planos (fonte única de verdade)

Crio `src/lib/plans.ts` com toda a definição:

- **Essencial** — 15,99€/mês
- **Casa+** — 28,99€/mês — badge "Mais vendido" (visualmente destacado)
- **Elite** — 159,99€/ano (399,99€ riscado, "Poupa 240€", "60% OFF") — badge "Melhor oferta anual"

Cada plano expõe: `id, name, price, oldPrice?, interval, badge?, subtitle, tagline, features[], missing[], featureFlags{}`.

O ID interno `pro` continua na base de dados mas passa a mapear para "Casa+" e crio o novo ID `elite`. Alternativa: renomeio `pro → casa` e `casa → essencial` — proponho manter os IDs atuais para não migrar dados e apenas mapear apresentação (essencial/casa/elite). Confirmo consigo antes se preferir renomear no DB.

### 2. Sistema de permissões (feature gating)

- Crio `src/lib/featureAccess.ts` com mapa `feature → planoMínimo` (objetivos, investimentos, orçamentos, modo casal, IA ilimitada, OCR, multi-workspace, etc.).
- Hook `useFeatureAccess(feature)` devolve `{ allowed, requiredPlan }` lendo o `profile.plan` do `AuthContext`.
- Componente `<FeatureGate feature="couple_mode">…</FeatureGate>`:
  - Se permitido → renderiza os filhos.
  - Se bloqueado → mostra página elegante com cadeado, benefícios do plano, e botão verde "Fazer Upgrade" (ou "Obter Elite").
- Aplico o gate em: Objetivos, Investimentos, Orçamentos, Modo Casal, contadores de IA, OCR (novo placeholder), Multi Workspace (novo placeholder).
- Menus **não** são escondidos — sempre visíveis para incentivar upgrade.

### 3. Limite de 50 mensagens IA/mês (Essencial)

- Nova coluna `ai_monthly_usage` (ou contagem via `ai_messages` por mês) — uso a tabela existente `ai_messages` agregando por mês.
- No `ai-chat` edge function: verifica plano; se `essencial` e >=50 no mês, devolve 402 com mensagem clara.
- No `AIAssistant.tsx`: mostra contador restante e CTA de upgrade quando esgota.

### 4. Landing page (`Pricing.tsx`)

- Substituo a secção `#precos` pelos 3 novos cards com o design premium:
  - Casa+ com borda verde, sombra grande, botão preenchido, badge "⭐ Mais vendido".
  - Elite com preço riscado, poupança, "60% OFF", badge diamante, tom exclusivo.
- Adiciono **tabela comparativa completa** por baixo dos cards (tal como especificado).
- Selos: "⭐ Escolha de 80% dos utilizadores", "💎 Melhor relação qualidade/preço", "🔥 Poupe 240€ pagando anualmente".
- Atualizo hero, FAQ e microcopy para refletir os novos planos e o trial de 3 dias já existente.

### 5. Checkout

- Página/painel `Checkout.tsx` (ou reforço do fluxo atual em `AccountPanel.tsx`) mostrando:
  - Plano escolhido + preço final.
  - Lista completa de funcionalidades desbloqueadas.
  - Comparação "Vai desbloquear vs. o plano inferior".
  - Selos: "Pagamento Seguro", "Cancelar quando quiser" (só mensal).
  - Elite: banner "🔥 Está a poupar 240€".
- Stripe:
  - Uso `stripe--create_stripe_product_and_price` para criar os 3 novos preços (15,99€/mês, 28,99€/mês, 159,99€/ano) e guardo os IDs em `src/lib/paymentLinks.ts`.
  - Atualizo `create-checkout` e `create-upgrade` edge functions para os novos price IDs, mantendo `trial_period_days: 3` e cálculo de diferença no upgrade.

---

### Detalhes técnicos

- Sem migrações destrutivas. Adiciono apenas: `plans` seed (opcional) e helper SQL se necessário para contagem de IA mensal.
- Fontes: mantenho IBM Plex / tokens semânticos existentes; nenhum hex hardcoded.
- Animações via `framer-motion` já instalado.
- Icons via `lucide-react` (Zap, Home, Crown/Gem, Sparkles, Lock).

### Fora de âmbito

- Não implemento OCR real nem Multi Workspace nesta fase — apenas gates + página "Disponível apenas no Elite" com preview do que virá, conforme pedido ("apenas reorganizar funcionalidades e permissões").

---

**Confirma dois pontos antes de avançar?**
1. Mantenho os IDs internos (`essencial`, `casa`, `pro`) e apresento como "Essencial / Casa+ / Elite", ou prefere renomear também no DB (implica migração)?
2. Autoriza-me a criar 3 novos produtos/preços no Stripe e substituir os payment links antigos?