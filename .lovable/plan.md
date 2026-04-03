

# Plano: Criar Utilizadores no Admin + Corrigir Checkout Stripe

## Resumo

Duas funcionalidades: (1) permitir ao admin criar utilizadores diretamente com email e password, e (2) corrigir o fluxo de checkout que não redireciona para o Stripe.

---

## 1. Criar utilizadores via Admin

### Edge Function: `admin-create-user`
- Recebe `{ email, password, full_name, plan }` do admin
- Valida que o chamador é admin (verifica `user_roles` com service role key)
- Usa `supabase.auth.admin.createUser({ email, password, email_confirm: true })` para criar o utilizador com email já confirmado
- Opcionalmente define o plano e validade no perfil

### UI no AdminDashboard
- Botão "Adicionar Utilizador" no topo da tabela
- Modal/formulário com campos: Nome, Email, Password, Plano (dropdown)
- Após criação, recarrega a lista de utilizadores
- O utilizador criado pode depois alterar a password na aba "Conta"

---

## 2. Corrigir Checkout Stripe

O problema é que `window.open("", "_blank")` abre uma janela em branco **antes** de ter o URL, e muitos browsers bloqueiam popups. Quando o URL chega, a janela pode já estar bloqueada.

### Correção
- Remover o `window.open` prévio
- Usar `window.location.href = data.url` diretamente para redirecionar na mesma janela (mais fiável)
- Alternativa: usar `window.open(data.url, "_blank")` num único passo após ter o URL

### Verificação adicional
- Confirmar que `supabase.functions.invoke("create-checkout")` envia o Authorization header automaticamente (sim, envia — o SDK faz isso)
- O edge function já funciona correctamente (testado acima)

---

## Ficheiros a criar/editar

| Ficheiro | Ação |
|---|---|
| `supabase/functions/admin-create-user/index.ts` | Novo — edge function para criar utilizadores |
| `src/pages/AdminDashboard.tsx` | Adicionar formulário de criação de utilizador |
| `src/pages/Pricing.tsx` | Corrigir lógica de redirecionamento do checkout |

---

## Segurança

- A edge function `admin-create-user` valida o role admin server-side usando `user_roles` + service role key
- Passwords dos novos utilizadores são definidas pelo admin; o utilizador pode alterá-las depois
- Não expõe o service role key ao frontend

