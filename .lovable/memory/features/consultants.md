---
name: Consultant profiles & dashboard
description: Imobiliárias criam consultores com email+password. Consultores têm acesso Pro + dashboard /consultor com lista de clientes e detalhes (plano, habitação, pagamentos).
type: feature
---
- Role `consultant` no enum app_role
- Tabela `partner_consultants` (user_id, partner_id, name, phone, email, photo_url, active)
- Edge function `partner-create-consultant`: cria user, define plan Pro, atribui role consultant, cria registo partner_consultants
- Consultores fazem login normal → auto-redirect para /consultor
- Dashboard consultor: nº clientes, nº com habitação, lista clientes expandível (plano, dados habitação, taxa esforço, pagamentos)
- Consultores NÃO podem convidar clientes — apenas a imobiliária
- Convites agora têm `consultant_id` para associar cliente a consultor
- Imobiliária pode ativar/desativar consultores
- Ao convidar cliente, imobiliária seleciona consultor da lista
- RLS: consultores só veem os seus clientes (via partner_invites.consultant_id)
