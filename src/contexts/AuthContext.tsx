import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Plan = "essencial" | "casa" | "pro" | "imobiliaria";

interface PartnerBranding {
  name: string;
  brand_color: string | null;
  brand_logo_url: string | null;
  consultant_name: string | null;
  consultant_phone: string | null;
  consultant_email: string | null;
  consultant_photo_url: string | null;
  consultant_photo_position: string | null;
}

type AccountStatus = "trial_active" | "active" | "trial_expired" | "data_deleted";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  plan: Plan;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  partner_id: string | null;
  plan_source: "direct" | "partner";
  account_status: AccountStatus;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  grace_period_ends_at: string | null;
  data_deleted_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isPartner: boolean;
  isConsultant: boolean;
  partnerBranding: PartnerBranding | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, profile: null, isAdmin: false, isPartner: false, isConsultant: false, partnerBranding: null, loading: true,
  signOut: async () => {}, refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPartner, setIsPartner] = useState(false);
  const [isConsultant, setIsConsultant] = useState(false);
  const [partnerBranding, setPartnerBranding] = useState<PartnerBranding | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    return (data as Profile | null) ?? null;
  }, []);

  const checkAdmin = useCallback(async (userId: string) => {
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    return data === true;
  }, []);

  const checkPartner = useCallback(async (userId: string) => {
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "partner" as any });
    return data === true;
  }, []);

  const checkConsultant = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "consultant" as any });
      return data === true;
    } catch {
      return false;
    }
  }, []);

  const fetchPartnerBranding = useCallback(async (prof: Profile | null): Promise<PartnerBranding | null> => {
    if (!prof?.partner_id) return null;

    // Get partner branding (logo, color, name)
    const { data: partner } = await supabase
      .from("partners")
      .select("name, brand_color, brand_logo_url")
      .eq("id", prof.partner_id)
      .maybeSingle();

    if (!partner) return null;

    // Get consultant from the user's invite (prefer linked consultant record, fallback to legacy fields)
    const { data: invite } = await supabase
      .from("partner_invites")
      .select("consultant_id, consultant_name, consultant_phone, consultant_email, consultant_photo_url, consultant_photo_position")
      .eq("email", prof.email)
      .eq("partner_id", prof.partner_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let cName = (invite as any)?.consultant_name ?? null;
    let cPhone = (invite as any)?.consultant_phone ?? null;
    let cEmail = (invite as any)?.consultant_email ?? null;
    let cPhoto = (invite as any)?.consultant_photo_url ?? null;
    let cPos = (invite as any)?.consultant_photo_position ?? "center";

    if ((invite as any)?.consultant_id) {
      const { data: c } = await supabase
        .from("partner_consultants")
        .select("name, phone, email, photo_url, photo_position")
        .eq("id", (invite as any).consultant_id)
        .maybeSingle();
      if (c) {
        cName = c.name;
        cPhone = c.phone;
        cEmail = c.email;
        cPhoto = c.photo_url;
        cPos = c.photo_position || "center";
      }
    }

    return {
      name: partner.name,
      brand_color: partner.brand_color,
      brand_logo_url: partner.brand_logo_url,
      consultant_name: cName,
      consultant_phone: cPhone,
      consultant_email: cEmail,
      consultant_photo_url: cPhoto,
      consultant_photo_position: cPos,
    };
  }, []);

  const syncAuthState = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);

    const nextUser = nextSession?.user ?? null;
    setUser(nextUser);

    if (!nextUser) {
      setProfile(null);
      setIsAdmin(false);
      setIsPartner(false);
      setIsConsultant(false);
      setLoading(false);
      return;
    }

    try {
      const [nextProfile, nextIsAdmin, nextIsPartner, nextIsConsultant] = await Promise.all([
        fetchProfile(nextUser.id),
        checkAdmin(nextUser.id),
        checkPartner(nextUser.id),
        checkConsultant(nextUser.id),
      ]);

      const branding = await fetchPartnerBranding(nextProfile);
      setProfile(nextProfile);
      setIsAdmin(nextIsAdmin);
      setIsPartner(nextIsPartner);
      setIsConsultant(nextIsConsultant);
      setPartnerBranding(branding);
    } catch (err) {
      console.error("syncAuthState error:", err);
    }
    setLoading(false);
  }, [checkAdmin, checkPartner, checkConsultant, fetchProfile, fetchPartnerBranding]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    const [nextProfile, nextIsAdmin, nextIsPartner, nextIsConsultant] = await Promise.all([
      fetchProfile(user.id),
      checkAdmin(user.id),
      checkPartner(user.id),
      checkConsultant(user.id),
    ]);

    const branding = await fetchPartnerBranding(nextProfile);
    setProfile(nextProfile);
    setIsAdmin(nextIsAdmin);
    setIsPartner(nextIsPartner);
    setIsConsultant(nextIsConsultant);
    setPartnerBranding(branding);
    setLoading(false);
  }, [checkAdmin, checkPartner, checkConsultant, fetchProfile, fetchPartnerBranding, user]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        void syncAuthState(session);
      }
    );

    void supabase.auth.getSession().then(({ data: { session } }) => syncAuthState(session));

    return () => subscription.unsubscribe();
  }, [syncAuthState]);

  // Auto-refresh profile when user returns to the tab (e.g. after Stripe checkout)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && user) {
        void refreshProfile();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user, refreshProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
    setIsPartner(false);
    setIsConsultant(false);
    setPartnerBranding(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, isAdmin, isPartner, isConsultant, partnerBranding, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
