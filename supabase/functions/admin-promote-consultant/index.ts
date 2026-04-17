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
    const callerId = userData.user.id;

    const { data: roles } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", callerId);
    const roleSet = new Set((roles || []).map((r: any) => r.role));
    const isAdmin = roleSet.has("admin");
    const isPartner = roleSet.has("partner");
    if (!isAdmin && !isPartner) throw new Error("Not authorized");

    const { user_id: bodyUserId, email, partner_id, name, phone, photo_url } = await req.json();
    let user_id = bodyUserId;
    if (!user_id && email) {
      const { data: byEmail } = await supabaseAdmin
        .from("profiles").select("id").eq("email", email).maybeSingle();
      if (!byEmail) throw new Error("Não existe nenhum utilizador com esse email");
      user_id = byEmail.id;
    }
    if (!user_id) throw new Error("user_id ou email é obrigatório");

    // Resolve target partner_id
    let resolvedPartnerId = partner_id;
    if (!isAdmin) {
      const { data: callerProf } = await supabaseAdmin
        .from("profiles").select("partner_id").eq("id", callerId).single();
      if (!callerProf?.partner_id) throw new Error("Partner profile not found");
      resolvedPartnerId = callerProf.partner_id;
    }
    if (!resolvedPartnerId) throw new Error("partner_id is required");

    // Fetch target user profile
    const { data: targetProfile, error: profErr } = await supabaseAdmin
      .from("profiles").select("id, email, full_name").eq("id", user_id).single();
    if (profErr || !targetProfile) throw new Error("Utilizador não encontrado");

    const consultantName = name || targetProfile.full_name || targetProfile.email;

    // Update profile to Pro plan with long expiry
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + 100);
    await supabaseAdmin
      .from("profiles")
      .update({
        plan: "pro",
        plan_source: "partner",
        partner_id: resolvedPartnerId,
        plan_started_at: now.toISOString(),
        plan_expires_at: expiresAt.toISOString(),
        full_name: consultantName,
      })
      .eq("id", user_id);

    // Assign consultant role (idempotent)
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles").select("id").eq("user_id", user_id).eq("role", "consultant").maybeSingle();
    if (!existingRole) {
      await supabaseAdmin.from("user_roles").insert({ user_id, role: "consultant" });
    }

    // Upsert partner_consultants
    const { data: existingPc } = await supabaseAdmin
      .from("partner_consultants").select("id").eq("user_id", user_id).maybeSingle();
    const payload = {
      user_id,
      partner_id: resolvedPartnerId,
      name: consultantName,
      email: targetProfile.email,
      phone: phone || null,
      photo_url: photo_url || null,
      active: true,
    };
    const pcRes = existingPc
      ? await supabaseAdmin.from("partner_consultants").update(payload).eq("id", existingPc.id)
      : await supabaseAdmin.from("partner_consultants").insert(payload);
    if (pcRes.error) throw new Error(`Falha a criar consultor: ${pcRes.error.message}`);

    return new Response(JSON.stringify({ success: true, user_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
    });
  }
});
