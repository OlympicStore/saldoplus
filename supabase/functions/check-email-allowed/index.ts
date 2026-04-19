import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// New behavior: signup is OPEN to everyone.
// - Brand new emails get a 3-day free trial (handled by handle_new_user trigger).
// - Repeat emails (already used trial) are created in trial_expired state and must subscribe.
// - Partner-invited emails get the imobiliaria plan immediately.
// This endpoint is kept for backwards compatibility — always returns allowed=true.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email) throw new Error("Email is required");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if this email already had a trial (informational only)
    const { data: trialUsed } = await supabaseAdmin
      .from("trial_history")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    return new Response(
      JSON.stringify({ allowed: true, trial_already_used: !!trialUsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
