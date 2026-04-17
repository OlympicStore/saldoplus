import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace("Bearer ", "");

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Invalid token");
    const callerId = userData.user.id;

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    const roleSet = new Set((roles || []).map((r: any) => r.role));
    const isAdmin = roleSet.has("admin");
    const isPartner = roleSet.has("partner");
    if (!isAdmin && !isPartner) throw new Error("Not authorized");

    const { client_id } = await req.json();
    if (!client_id) throw new Error("client_id is required");
    if (client_id === callerId) throw new Error("Cannot delete your own account");

    // Fetch the client profile to verify it belongs to this partner
    const { data: clientProfile, error: clientErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, partner_id")
      .eq("id", client_id)
      .single();
    if (clientErr || !clientProfile) throw new Error("Cliente não encontrado");

    if (!isAdmin) {
      // Resolve caller partner_id and ensure it matches the client's partner_id
      const { data: callerProf } = await supabaseAdmin
        .from("profiles")
        .select("partner_id")
        .eq("id", callerId)
        .single();
      if (!callerProf?.partner_id || callerProf.partner_id !== clientProfile.partner_id) {
        throw new Error("Este cliente não pertence à sua imobiliária");
      }
    }

    // Remove related invites for that email + partner
    if (clientProfile.email && clientProfile.partner_id) {
      await supabaseAdmin
        .from("partner_invites")
        .delete()
        .eq("email", clientProfile.email)
        .eq("partner_id", clientProfile.partner_id);
    }

    // Delete the auth user (cascades to profile + user data)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(client_id);
    if (deleteError) throw new Error(`Falha ao remover utilizador: ${deleteError.message}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
