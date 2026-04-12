---
name: Casa Segura Plus (B2B partner plan)
description: Plano invisível para parceiros imobiliários — acesso Pro + tab Minha Casa. Ativação automática via convite. Tabelas plans, partners, partner_invites, house_data.
type: feature
---
- Plano `casa_segura_plus` tipo `partner` — não aparece na landing page nem nas opções de upgrade
- Acesso equivalente a Pro + tab "Minha Casa" (indicador 🟢🟡🔴 baseado em prestação/rendimento)
- Tabela `plans` substitui o enum app_plan (essencial, casa, pro, casa_segura_plus)
- Tabela `partners` com plan_limit e plan_type (starter/growth/premium)
- Tabela `partner_invites` com status (pending/accepted/expired)
- Profiles têm `partner_id`, `plan_source` (direct/partner)
- Trigger handle_new_user verifica convites pendentes e ativa plano automaticamente
- Edge functions: admin-create-partner, admin-invite-partner-user
- AccountPanel mostra badge "Oferecido por parceiro imobiliário" para utilizadores partner
- Upgrade section escondida para utilizadores partner
