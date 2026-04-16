import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace("Bearer ", "");

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Invalid token");

    // Only admin can delete a consultant account fully
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRole) throw new Error("Not authorized");

    const { consultant_id } = await req.json();
    if (!consultant_id) throw new Error("consultant_id is required");

    const { data: consultant } = await supabaseAdmin
      .from("partner_consultants")
      .select("user_id")
      .eq("id", consultant_id)
      .maybeSingle();

    if (!consultant) throw new Error("Consultant not found");

    // Unassign consultant from all invites
    await supabaseAdmin
      .from("partner_invites")
      .update({ consultant_id: null })
      .eq("consultant_id", consultant_id);

    // Delete consultant record
    await supabaseAdmin.from("partner_consultants").delete().eq("id", consultant_id);

    // Remove role
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", consultant.user_id)
      .eq("role", "consultant");

    // Delete auth user (cascades profile)
    await supabaseAdmin.auth.admin.deleteUser(consultant.user_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
