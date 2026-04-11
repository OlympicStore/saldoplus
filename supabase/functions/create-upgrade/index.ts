import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Upgrade price IDs (difference only)
const UPGRADE_PRICES: Record<string, Record<string, string>> = {
  essencial: {
    casa: "price_1TL3GeImKoY4gMb7cmn0FP4Q",   // 13.00€
    pro: "price_1TL3hnImKoY4gMb7SqQemiVk",     // 32.00€
  },
  casa: {
    pro: "price_1TL3i5ImKoY4gMb7pIixfSqJ",     // 19.00€
  },
};

const PLAN_ORDER = ["essencial", "casa", "pro"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const { target_plan } = await req.json();
    if (!target_plan || !PLAN_ORDER.includes(target_plan)) {
      throw new Error("Invalid target plan: " + target_plan);
    }

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    // Get current plan from profile
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("plan, plan_expires_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) throw new Error("Profile not found");

    const currentPlan = profile.plan;
    const currentIdx = PLAN_ORDER.indexOf(currentPlan);
    const targetIdx = PLAN_ORDER.indexOf(target_plan);

    if (targetIdx <= currentIdx) {
      throw new Error("Só é possível fazer upgrade para um plano superior.");
    }

    // Check plan is still active
    if (!profile.plan_expires_at || new Date(profile.plan_expires_at).getTime() < Date.now()) {
      throw new Error("O seu plano expirou. Por favor adquira um novo plano.");
    }

    const priceId = UPGRADE_PRICES[currentPlan]?.[target_plan];
    if (!priceId) throw new Error("Upgrade path not available");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}&plan=${target_plan}`,
      cancel_url: `${req.headers.get("origin")}/app`,
      metadata: {
        user_id: user.id,
        plan: target_plan,
        upgrade_from: currentPlan,
        bumps: "",
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
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
