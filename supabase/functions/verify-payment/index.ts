import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { session_id, plan } = await req.json();
    if (!session_id || !plan) throw new Error("Missing session_id or plan");

    // Verify user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseAdmin.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Verify payment with Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    // Verify the metadata matches
    if (session.metadata?.user_id !== user.id) {
      throw new Error("Payment does not belong to this user");
    }

    // Check if lifetime bump was included
    const bumps = session.metadata?.bumps || "";
    const hasLifetime = bumps.split(",").includes("lifetime");

    // Calculate expiration: lifetime = far future, otherwise 1 year minus 1 day
    const now = new Date();
    const expiresAt = new Date(now);
    if (hasLifetime) {
      expiresAt.setFullYear(expiresAt.getFullYear() + 100);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      expiresAt.setDate(expiresAt.getDate() - 1);
    }

    // Update user profile with the plan
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        plan,
        plan_started_at: now.toISOString(),
        plan_expires_at: expiresAt.toISOString(),
      })
      .eq("id", user.id);

    if (updateError) throw new Error("Failed to update plan: " + updateError.message);

    // Send Telegram notification with sales totals
    const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const telegramChatId = Deno.env.get("TELEGRAM_CHAT_ID");
    if (telegramToken && telegramChatId) {
      const amount = session.amount_total ? (session.amount_total / 100).toFixed(2) : "?";

      const PLAN_PRICES: Record<string, number> = { essencial: 15.99, casa: 27.99, pro: 47.99 };
      const { data: paidProfiles } = await supabaseAdmin
        .from("profiles")
        .select("plan")
        .not("plan_started_at", "is", null);

      const counts: Record<string, number> = { essencial: 0, casa: 0, pro: 0 };
      (paidProfiles || []).forEach((p: any) => { if (counts[p.plan] !== undefined) counts[p.plan]++; });
      const totalEssencial = (counts.essencial * PLAN_PRICES.essencial).toFixed(2);
      const totalCasa = (counts.casa * PLAN_PRICES.casa).toFixed(2);
      const totalPro = (counts.pro * PLAN_PRICES.pro).toFixed(2);
      const totalVendas = (counts.essencial * PLAN_PRICES.essencial + counts.casa * PLAN_PRICES.casa + counts.pro * PLAN_PRICES.pro).toFixed(2);

      const esc = (s: string) => s.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
      const message = `💰 *Nova venda no Saldo\\+\\!*\n\n` +
        `📧 Email: ${esc(user.email || "?")}\n` +
        `📋 Plano: *${esc(plan)}*\n` +
        `💶 Valor: ${esc(amount)}€\n` +
        `📅 Data: ${esc(new Date().toLocaleDateString("pt-PT"))}\n\n` +
        `📊 *Resumo de vendas:*\n` +
        `Essencial: ${esc(totalEssencial)}€ \\(${counts.essencial} vendas\\)\n` +
        `Casa: ${esc(totalCasa)}€ \\(${counts.casa} vendas\\)\n` +
        `Pro: ${esc(totalPro)}€ \\(${counts.pro} vendas\\)\n` +
        `*Total: ${esc(totalVendas)}€*`;
      try {
        await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: telegramChatId, text: message, parse_mode: "MarkdownV2" }),
        });
      } catch (_) { /* ignore telegram errors */ }
    }

    return new Response(JSON.stringify({ success: true, plan, expires_at: expiresAt.toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
