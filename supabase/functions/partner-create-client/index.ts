import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  console.log(`[partner-create-client] ${req.method} request received`);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[partner-create-client] env ready", {
    hasUrl: !!Deno.env.get("SUPABASE_URL"),
    hasServiceRole: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  });

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

    // Check caller is partner, consultant or admin
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);

    const roleSet = new Set((roles || []).map((r: any) => r.role));
    const isAdmin = roleSet.has("admin");
    const isPartner = roleSet.has("partner");
    const isConsultant = roleSet.has("consultant");
    if (!isAdmin && !isPartner && !isConsultant) throw new Error("Not authorized");

    const { email, password, full_name, phone, consultant_id } = await req.json();
    if (!email || !password || !full_name) {
      throw new Error("Email, password e nome são obrigatórios");
    }
    if (password.length < 6) throw new Error("Password deve ter pelo menos 6 caracteres");

    // Resolve partner_id
    let resolvedPartnerId: string | null = null;
    if (isPartner) {
      const { data: prof } = await supabaseAdmin
        .from("profiles").select("partner_id").eq("id", callerId).single();
      resolvedPartnerId = prof?.partner_id || null;
    } else if (isConsultant) {
      const { data: pc } = await supabaseAdmin
        .from("partner_consultants").select("partner_id, id")
        .eq("user_id", callerId).eq("active", true).maybeSingle();
      resolvedPartnerId = pc?.partner_id || null;
    }
    if (!resolvedPartnerId && !isAdmin) throw new Error("Partner not found");

    // Resolve consultant_id - if caller is consultant, use their record
    let resolvedConsultantId: string | null = consultant_id || null;
    let consultantInfo: any = null;
    if (isConsultant && !consultant_id) {
      const { data: pc } = await supabaseAdmin
        .from("partner_consultants").select("*")
        .eq("user_id", callerId).eq("active", true).maybeSingle();
      if (pc) {
        resolvedConsultantId = pc.id;
        consultantInfo = pc;
      }
    } else if (resolvedConsultantId) {
      const { data: pc } = await supabaseAdmin
        .from("partner_consultants").select("*")
        .eq("id", resolvedConsultantId).maybeSingle();
      consultantInfo = pc;
    }

    // Create user with email confirmed
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, phone: phone || "" },
    });
    if (createError) throw new Error(`Failed to create user: ${createError.message}`);
    if (!newUser.user) throw new Error("User creation returned no user");

    const userId = newUser.user.id;
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Update profile with imobiliaria plan
    await supabaseAdmin
      .from("profiles")
      .update({
        plan: "imobiliaria",
        plan_source: "partner",
        partner_id: resolvedPartnerId,
        plan_started_at: now.toISOString(),
        plan_expires_at: expiresAt.toISOString(),
        full_name,
      })
      .eq("id", userId);

    // Create accepted invite record (for tracking + consultant assignment)
    await supabaseAdmin.from("partner_invites").insert({
      email,
      partner_id: resolvedPartnerId,
      status: "accepted",
      consultant_id: resolvedConsultantId,
      consultant_name: consultantInfo?.name || null,
      consultant_phone: consultantInfo?.phone || null,
      consultant_email: consultantInfo?.email || null,
      consultant_photo_url: consultantInfo?.photo_url || null,
    });

    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
