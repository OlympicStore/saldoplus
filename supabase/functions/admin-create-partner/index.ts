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

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) throw new Error("Not authorized - admin only");

    const { name, email, password, plan_limit, plan_type } = await req.json();
    if (!name || !email) throw new Error("Name and email are required");

    const validPlanTypes = ["starter", "growth", "premium"];
    const selectedPlanType = validPlanTypes.includes(plan_type) ? plan_type : "starter";

    // Create partner record
    const { data: partner, error: insertError } = await supabaseAdmin
      .from("partners")
      .insert({
        name,
        email,
        plan_limit: plan_limit || 25,
        plan_type: selectedPlanType,
        active: true,
      })
      .select()
      .single();

    if (insertError) throw new Error(`Failed to create partner: ${insertError.message}`);

    // Create auth user for the partner (so they can login)
    const partnerPassword = password || "Partner2026!";
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: partnerPassword,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (createUserError) {
      // If user already exists, try to find them
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u) => u.email === email);

      if (existingUser) {
        // Link existing user to partner
74:         await supabaseAdmin
75:           .from("profiles")
76:           .update({ partner_id: partner.id, plan: "imobiliaria", plan_source: "partner" })
77:           .eq("id", existingUser.id);

        // Assign partner role
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: existingUser.id, role: "partner" }, { onConflict: "user_id,role" });
      } else {
        throw new Error(`Failed to create user: ${createUserError.message}`);
      }
    } else if (newUser.user) {
      // Update profile to link partner_id and set plan
      await supabaseAdmin
        .from("profiles")
        .update({ partner_id: partner.id, plan: "imobiliaria", plan_source: "partner" })
        .eq("id", newUser.user.id);

      // Assign partner role
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newUser.user.id, role: "partner" });
    }

    return new Response(
      JSON.stringify({ success: true, partner }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
