---
name: Casa Segura Plus (B2B partner plan)
description: Plano invisível para parceiros imobiliários — acesso Pro + tab Minha Casa. Ativação automática via convite. Branding + consultor imobiliário por convite.
type: feature
---
- Plano `casa_segura_plus` tipo `partner` — não aparece na landing page nem nas opções de upgrade
- Acesso equivalente a Pro + tab "Minha Casa" (indicador 🟢🟡🔴 baseado em prestação/rendimento)
- Tabela `plans` substitui o enum app_plan (essencial, casa, pro, casa_segura_plus)
- Tabela `partners` com plan_limit, plan_type, brand_color, brand_logo_url
- Tabela `partner_invites` com status (pending/accepted/expired) + consultant_name/phone/email/photo_url POR CONVITE
- Cada cliente pode ter um consultor diferente atribuído no momento do convite
- Profiles têm `partner_id`, `plan_source` (direct/partner)
- Trigger handle_new_user verifica convites pendentes e ativa plano automaticamente
- Edge functions: admin-create-partner, admin-invite-partner-user (aceita consultant fields)
- AccountPanel mostra badge "Oferecido por parceiro imobiliário" para utilizadores partner
- Upgrade section escondida para utilizadores partner
- Branding: logo + cor primária do parceiro aplicados dinamicamente via CSS variables
- Consultor: dados vêm do convite aceite (partner_invites), não do parceiro
- MinhaCasa: quando ratio ≥ 30%, aparece bolha de chat do consultor com CTA "Quer renegociar?"
- Header: mostra logo do parceiro + foto/nome do consultor
- Admin pode remover convites individuais (reverte plano para essencial se aceite)
