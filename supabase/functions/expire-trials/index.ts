import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (s: string, d?: unknown) => console.log(`[EXPIRE-TRIALS] ${s}${d ? ` - ${JSON.stringify(d)}` : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const now = new Date().toISOString();

    // 1. Trial expired: trial_active → trial_expired (after trial_ends_at)
    const { data: expired, error: e1 } = await supabaseAdmin
      .from("profiles")
      .update({ account_status: "trial_expired" })
      .eq("account_status", "trial_active")
      .lt("trial_ends_at", now)
      .select("id, email");
    if (e1) throw e1;
    log("Marked trial_expired", { count: expired?.length ?? 0 });

    // 2. Grace period over: trial_expired → data_deleted (soft delete) after grace_period_ends_at
    const { data: toDelete, error: e2 } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("account_status", "trial_expired")
      .lt("grace_period_ends_at", now);
    if (e2) throw e2;

    let softDeleted = 0;
    for (const p of toDelete ?? []) {
      const { error: rpcErr } = await supabaseAdmin.rpc("soft_delete_user_data", { _user_id: p.id });
      if (rpcErr) {
        log("soft_delete_user_data failed", { id: p.id, err: rpcErr.message });
      } else {
        softDeleted++;
      }
    }
    log("Soft deleted", { count: softDeleted });

    return new Response(
      JSON.stringify({
        success: true,
        expired_count: expired?.length ?? 0,
        soft_deleted_count: softDeleted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
