import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Plan = "essencial" | "casa" | "pro" | "casa_segura_plus";

interface PartnerBranding {
  name: string;
  brand_color: string | null;
  brand_logo_url: string | null;
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  plan: Plan;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  partner_id: string | null;
  plan_source: "direct" | "partner";
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  partnerBranding: PartnerBranding | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, profile: null, isAdmin: false, partnerBranding: null, loading: true,
  signOut: async () => {}, refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
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

  const syncAuthState = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);

    const nextUser = nextSession?.user ?? null;
    setUser(nextUser);

    if (!nextUser) {
      setProfile(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const [nextProfile, nextIsAdmin] = await Promise.all([
      fetchProfile(nextUser.id),
      checkAdmin(nextUser.id),
    ]);

    setProfile(nextProfile);
    setIsAdmin(nextIsAdmin);
    setLoading(false);
  }, [checkAdmin, fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    const [nextProfile, nextIsAdmin] = await Promise.all([
      fetchProfile(user.id),
      checkAdmin(user.id),
    ]);

    setProfile(nextProfile);
    setIsAdmin(nextIsAdmin);
    setLoading(false);
  }, [checkAdmin, fetchProfile, user]);

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
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, isAdmin, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
