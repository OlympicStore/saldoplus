import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICE_TO_PLAN: Record<string, string> = {
  // V2 (current)
  "price_1TxGZAImKoY4gMb7A6VdD5Bt": "essencial",
  "price_1TxGZTImKoY4gMb7ykSwbaDu": "casa",
  "price_1TxGZjImKoY4gMb7Tkg5Cccp": "pro",
  // V1 (legacy — kept so old subscriptions still resolve)
  "price_1TqyGmImKoY4gMb7OYJNNjS9": "essencial",
  "price_1TqyH9ImKoY4gMb7hiztT0YH": "casa",
  "price_1TqyJPImKoY4gMb7hm1CEpKU": "pro",
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
      const body = await req.json();
      event = body as Stripe.Event;
    }

    console.log(`[STRIPE-WEBHOOK] Event: ${event.type}`);

    // Helper: fetch email + plan for a subscription
    async function resolveSubscription(sub: Stripe.Subscription) {
      const priceId = sub.items.data[0]?.price?.id;
      const plan = priceId ? PRICE_TO_PLAN[priceId] : undefined;
      let email: string | null = null;
      if (typeof sub.customer === "string") {
        const cust = await stripe.customers.retrieve(sub.customer);
        if (cust && !cust.deleted) email = (cust as Stripe.Customer).email;
      } else if (sub.customer && !("deleted" in sub.customer)) {
        email = (sub.customer as Stripe.Customer).email;
      }
      return { plan, email, customerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id };
    }

    async function upsertProfileFromSub(sub: Stripe.Subscription) {
      const { plan, email, customerId } = await resolveSubscription(sub);
      if (!email) {
        console.log("[STRIPE-WEBHOOK] No email on customer, skipping");
        return;
      }
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (!profile) {
        console.log(`[STRIPE-WEBHOOK] No profile for ${email}`);
        return;
      }

      const periodEnd = (sub as any).current_period_end
        ? new Date((sub as any).current_period_end * 1000).toISOString()
        : null;

      // Map Stripe subscription status to app account status
      const isActiveLike =
        sub.status === "trialing" || sub.status === "active";
      const accountStatus = isActiveLike
        ? sub.status === "trialing"
          ? "trial_active"
          : "active"
        : "trial_expired";

      const update: any = {
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        stripe_subscription_status: sub.status,
        account_status: accountStatus,
      };
      if (plan) update.plan = plan;
      if (sub.status === "trialing" && (sub as any).trial_end) {
        update.trial_ends_at = new Date((sub as any).trial_end * 1000).toISOString();
        update.grace_period_ends_at = null;
      }
      if (sub.status === "active") {
        update.plan_started_at = new Date().toISOString();
        update.plan_expires_at = periodEnd;
      }

      const { error } = await supabaseAdmin
        .from("profiles")
        .update(update)
        .eq("id", profile.id);
      if (error) console.error("[STRIPE-WEBHOOK] profile update error:", error);
      else console.log(`[STRIPE-WEBHOOK] profile updated for ${email} → ${sub.status} / ${plan}`);
    }

    // Helper: send the branded welcome email via the transactional queue.
    // Failure never blocks the webhook — Stripe would retry the whole event otherwise.
    async function sendWelcomeEmail(sub: Stripe.Subscription) {
      try {
        const { plan, email } = await resolveSubscription(sub);
        if (!email) return;
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("full_name")
          .eq("email", email)
          .maybeSingle();

        const PLAN_LABEL: Record<string, string> = {
          essencial: "Essencial",
          casa: "Casa+",
          pro: "Elite",
        };
        const PLAN_AMOUNT: Record<string, string> = {
          essencial: "15,99€/mês",
          casa: "28,99€/mês",
          pro: "159,99€/ano",
        };
        const trialEndTs = (sub as any).trial_end as number | null | undefined;
        const trialEndsAt = trialEndTs
          ? new Date(trialEndTs * 1000).toLocaleDateString("pt-PT", {
              day: "2-digit", month: "2-digit", year: "numeric",
            })
          : undefined;

        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const resp = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            templateName: "welcome-subscription",
            recipientEmail: email,
            idempotencyKey: `welcome-${sub.id}`,
            templateData: {
              fullName: profile?.full_name || undefined,
              planLabel: plan ? PLAN_LABEL[plan] ?? "Saldo+" : "Saldo+",
              amountLabel: plan ? PLAN_AMOUNT[plan] : undefined,
              trialEndsAt,
            },
          }),
        });
        if (!resp.ok) {
          console.error(`[STRIPE-WEBHOOK] welcome email failed: ${resp.status} ${await resp.text()}`);
        } else {
          console.log(`[STRIPE-WEBHOOK] welcome email enqueued for ${email}`);
        }
      } catch (e) {
        console.error("[STRIPE-WEBHOOK] welcome email error:", (e as Error).message);
      }
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          await upsertProfileFromSub(sub);
          await sendWelcomeEmail(sub);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.trial_will_end":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        if (event.type === "customer.subscription.deleted") {
          // Mark canceled
          const { customerId } = await resolveSubscription(sub);
          await supabaseAdmin
            .from("profiles")
            .update({
              stripe_subscription_status: "canceled",
              account_status: "trial_expired",
            })
            .eq("stripe_customer_id", customerId);
        } else {
          await upsertProfileFromSub(sub);
        }
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as any).subscription;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(typeof subId === "string" ? subId : subId.id);
          await upsertProfileFromSub(sub);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (customerId) {
          await supabaseAdmin
            .from("profiles")
            .update({ stripe_subscription_status: "past_due" })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error(`[STRIPE-WEBHOOK] Error: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
