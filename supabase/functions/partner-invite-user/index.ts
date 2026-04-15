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

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("partner_id")
      .eq("id", callerId)
      .single();

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

    const { email, partner_id, consultant_name, consultant_phone, consultant_email, consultant_photo_url, consultant_id } = await req.json();
    if (!email || !partner_id) throw new Error("Email and partner_id are required");

    if (isPartner && !isAdmin && callerProfile?.partner_id !== partner_id) {
      throw new Error("Not authorized for this partner");
    }

    // Check partner exists and is active
    const { data: partner, error: partnerError } = await supabaseAdmin
      .from("partners")
      .select("*")
      .eq("id", partner_id)
      .eq("active", true)
      .single();

    if (partnerError || !partner) throw new Error("Partner not found or inactive");

    // Monthly limit check: count invites created in the current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

    const { count } = await supabaseAdmin
      .from("partner_invites")
      .select("*", { count: "exact", head: true })
      .eq("partner_id", partner_id)
      .gte("created_at", monthStart)
      .lt("created_at", monthEnd);

    if (count !== null && count >= partner.plan_limit) {
      throw new Error(`Limite mensal de convites atingido (${partner.plan_limit}). O limite renova no próximo mês.`);
    }

    // Check existing invite
    const { data: existing } = await supabaseAdmin
      .from("partner_invites")
      .select("id")
      .eq("email", email)
      .eq("partner_id", partner_id)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) throw new Error("Já existe um convite para este email");

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 12);

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("partner_invites")
      .insert({
        email,
        partner_id,
        status: "pending",
        expires_at: expiresAt.toISOString(),
        consultant_name: consultant_name || null,
        consultant_phone: consultant_phone || null,
        consultant_email: consultant_email || null,
        consultant_photo_url: consultant_photo_url || null,
        consultant_id: consultant_id || null,
      })
      .select()
      .single();

    if (inviteError) throw new Error(`Failed to create invite: ${inviteError.message}`);

    // If user already exists, activate immediately
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      const planExpires = new Date(now);
      planExpires.setFullYear(planExpires.getFullYear() + 1);

      await supabaseAdmin
        .from("profiles")
        .update({
          plan: "imobiliaria",
          plan_source: "partner",
          partner_id,
          plan_started_at: now.toISOString(),
          plan_expires_at: planExpires.toISOString(),
        })
        .eq("id", existingProfile.id);

      await supabaseAdmin
        .from("partner_invites")
        .update({ status: "accepted" })
        .eq("id", invite.id);
    }

    return new Response(
      JSON.stringify({ success: true, invite, user_existed: !!existingProfile }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
