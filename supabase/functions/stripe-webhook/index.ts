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

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    let event: Stripe.Event;

    if (signature && webhookSecret) {
      const body = await req.text();
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } else {
      // Fallback: accept raw JSON (for testing)
      const body = await req.json();
      event = body as Stripe.Event;
    }

    console.log(`[STRIPE-WEBHOOK] Event type: ${event.type}`);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (session.payment_status !== "paid") {
        console.log("[STRIPE-WEBHOOK] Payment not completed, skipping");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const customerEmail = session.customer_details?.email || session.customer_email;
      console.log(`[STRIPE-WEBHOOK] Payment completed for: ${customerEmail}`);

      if (!customerEmail) {
        throw new Error("No customer email found in session");
      }

      // Find user by email in profiles
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, plan")
        .eq("email", customerEmail)
        .maybeSingle();

      if (profileError || !profile) {
        console.log(`[STRIPE-WEBHOOK] No profile found for email: ${customerEmail}`);
        return new Response(JSON.stringify({ received: true, warning: "No user found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Determine plan from metadata or line items
      let plan = session.metadata?.plan;
      
      if (!plan) {
        // Try to determine plan from payment link settings
        const { data: settings } = await supabaseAdmin
          .from("site_settings")
          .select("key, value")
          .like("key", "payment_link_%");

        if (settings && session.payment_link) {
          const paymentLinkId = typeof session.payment_link === "string" 
            ? session.payment_link 
            : session.payment_link.id;
          
          for (const setting of settings) {
            // Match by payment link URL containing the payment link ID
            if (setting.value && setting.value.includes(paymentLinkId)) {
              plan = setting.key.replace("payment_link_", "");
              break;
            }
          }
        }
      }

      if (!plan) {
        // Default to checking the amount
        const amount = session.amount_total || 0;
        if (amount <= 1500) plan = "essencial";
        else if (amount <= 2500) plan = "casa";
        else plan = "pro";
        console.log(`[STRIPE-WEBHOOK] Plan determined by amount (${amount}): ${plan}`);
      }

      // Calculate expiration
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      expiresAt.setDate(expiresAt.getDate() - 1);

      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          plan,
          plan_started_at: now.toISOString(),
          plan_expires_at: expiresAt.toISOString(),
        })
        .eq("id", profile.id);

      if (updateError) {
        console.error(`[STRIPE-WEBHOOK] Failed to update profile: ${updateError.message}`);
        throw updateError;
      }

      console.log(`[STRIPE-WEBHOOK] Plan ${plan} activated for user ${profile.id} until ${expiresAt.toISOString()}`);

      // Send Telegram notification with sales totals
      const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
      const telegramChatId = Deno.env.get("TELEGRAM_CHAT_ID");
      if (telegramToken && telegramChatId) {
        const amount = session.amount_total ? (session.amount_total / 100).toFixed(2) : "?";

        // Query plan totals
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
          `📧 Email: ${esc(customerEmail || "?")}\n` +
          `📋 Plano: *${esc(plan || "?")}*\n` +
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
          console.log("[STRIPE-WEBHOOK] Telegram notification sent");
        } catch (tgErr) {
          console.error("[STRIPE-WEBHOOK] Telegram notification failed:", tgErr);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[STRIPE-WEBHOOK] Error: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
