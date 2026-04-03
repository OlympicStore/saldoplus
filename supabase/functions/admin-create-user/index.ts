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
    // Validate caller is admin
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

    // Parse and validate input
    const { email, password, full_name, plan } = await req.json();
    if (!email || !password) throw new Error("Email and password are required");
    if (password.length < 6) throw new Error("Password must be at least 6 characters");
    
    const validPlans = ["essencial", "casa", "pro"];
    const selectedPlan = validPlans.includes(plan) ? plan : "essencial";

    // Create user with email confirmed
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || "" },
    });

    if (createError) throw new Error(`Failed to create user: ${createError.message}`);

    // Always set plan dates
    if (newUser.user) {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      await supabaseAdmin
        .from("profiles")
        .update({
          plan: selectedPlan,
          plan_started_at: now.toISOString(),
          plan_expires_at: expiresAt.toISOString(),
        })
        .eq("id", newUser.user.id);
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
