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

    // Check caller is admin or partner
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    const { data: partnerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "partner")
      .maybeSingle();

    const isAdmin = !!adminRole;
    const isPartner = !!partnerRole;

    if (!isAdmin && !isPartner) throw new Error("Not authorized");

    const { email, password, name, phone, consultant_email, photo_url, partner_id } = await req.json();
    if (!email || !password || !name) throw new Error("Email, password and name are required");
    if (password.length < 6) throw new Error("Password must be at least 6 characters");

    // Determine partner_id
    let resolvedPartnerId = partner_id;
    if (isPartner && !isAdmin) {
      const { data: callerProfile } = await supabaseAdmin
        .from("profiles")
        .select("partner_id")
        .eq("id", callerId)
        .single();
      if (!callerProfile?.partner_id) throw new Error("Partner profile not found");
      resolvedPartnerId = callerProfile.partner_id;
    }

    if (!resolvedPartnerId) throw new Error("partner_id is required");

    // Try to find existing user with this email
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    let userId: string;
    if (existingProfile) {
      // Reuse existing user — just promote to consultant
      userId = existingProfile.id;
      // Update password
      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        user_metadata: { full_name: name },
      });
      if (updErr) throw new Error(`Falha ao atualizar utilizador existente: ${updErr.message}`);
    } else {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name },
      });
      if (createError) throw new Error(`Falha ao criar utilizador: ${createError.message}`);
      if (!newUser.user) throw new Error("User creation returned no user");
      userId = newUser.user.id;
    }

    // Set plan to pro with 100 year expiry (consultant has full access)
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
        full_name: name,
      })
      .eq("id", userId);

    // Assign consultant role (idempotent)
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "consultant")
      .maybeSingle();
    if (!existingRole) {
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: "consultant" });
    }

    // Upsert partner_consultants record
    const { data: existingPc } = await supabaseAdmin
      .from("partner_consultants")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    const pcPayload = {
      user_id: userId,
      partner_id: resolvedPartnerId,
      name,
      phone: phone || null,
      email,
      photo_url: photo_url || null,
      active: true,
    };
    const pcRes = existingPc
      ? await supabaseAdmin.from("partner_consultants").update(pcPayload).eq("id", existingPc.id)
      : await supabaseAdmin.from("partner_consultants").insert(pcPayload);

    if (pcRes.error) throw new Error(`Falha ao criar consultor: ${pcRes.error.message}`);

    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
