import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    // Find all expired plans that haven't been reverted yet
    const { data: expiredProfiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, plan, plan_source")
      .neq("plan", "essencial")
      .not("plan_expires_at", "is", null)
      .lt("plan_expires_at", new Date().toISOString());

    if (error) throw error;

    let reverted = 0;
    let expiredInvites = 0;

    for (const profile of (expiredProfiles || [])) {
      // Revert to essencial
      await supabaseAdmin
        .from("profiles")
        .update({
          plan: "essencial",
          plan_source: "direct",
          partner_id: null,
        })
        .eq("id", profile.id);
      reverted++;
    }

    // Also expire pending invites that are past their expires_at
    const { data: expiredInviteData } = await supabaseAdmin
      .from("partner_invites")
      .update({ status: "expired" })
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString())
      .select("id");

    expiredInvites = expiredInviteData?.length || 0;

    return new Response(
      JSON.stringify({
        success: true,
        reverted,
        expired_invites: expiredInvites,
        checked_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
