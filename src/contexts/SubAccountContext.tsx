import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SubAccount {
  id: string;
  owner_id: string;
  name: string;
  avatar_color: string;
  is_active: boolean;
  created_at: string;
}

interface SubAccountContextType {
  subAccounts: SubAccount[];
  activeSubAccount: SubAccount | null;
  loading: boolean;
  switchSubAccount: (id: string | null) => void;
  addSubAccount: (name: string, color: string) => Promise<void>;
  updateSubAccount: (id: string, name: string, color: string) => Promise<void>;
  deleteSubAccount: (id: string) => Promise<void>;
  currentSubAccountId: string | null;
}

const SubAccountContext = createContext<SubAccountContextType>({
  subAccounts: [],
  activeSubAccount: null,
  loading: true,
  switchSubAccount: () => {},
  addSubAccount: async () => {},
  updateSubAccount: async () => {},
  deleteSubAccount: async () => {},
  currentSubAccountId: null,
});

export const useSubAccount = () => useContext(SubAccountContext);

export const SubAccountProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile } = useAuth();
  const isPro = profile?.plan === "pro";
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [currentSubAccountId, setCurrentSubAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubAccounts = useCallback(async () => {
    if (!user || !isPro) {
      setSubAccounts([]);
      setCurrentSubAccountId(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("sub_accounts")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at");

    const accounts = (data as SubAccount[]) || [];
    setSubAccounts(accounts);

    // Restore last selected or default to null (main account)
    const saved = localStorage.getItem(`sub_account_${user.id}`);
    if (saved && accounts.find(a => a.id === saved)) {
      setCurrentSubAccountId(saved);
    } else {
      setCurrentSubAccountId(null);
    }
    setLoading(false);
  }, [user, isPro]);

  useEffect(() => {
    fetchSubAccounts();
  }, [fetchSubAccounts]);

  const switchSubAccount = (id: string | null) => {
    setCurrentSubAccountId(id);
    if (user) {
      if (id) {
        localStorage.setItem(`sub_account_${user.id}`, id);
      } else {
        localStorage.removeItem(`sub_account_${user.id}`);
      }
    }
  };

  const addSubAccount = async (name: string, color: string) => {
    if (!user) return;
    await supabase.from("sub_accounts").insert({
      owner_id: user.id,
      name,
      avatar_color: color,
    } as any);
    await fetchSubAccounts();
  };

  const updateSubAccount = async (id: string, name: string, color: string) => {
    await supabase.from("sub_accounts").update({ name, avatar_color: color } as any).eq("id", id);
    await fetchSubAccounts();
  };

  const deleteSubAccount = async (id: string) => {
    await supabase.from("sub_accounts").delete().eq("id", id);
    if (currentSubAccountId === id) {
      setCurrentSubAccountId(null);
      if (user) localStorage.removeItem(`sub_account_${user.id}`);
    }
    await fetchSubAccounts();
  };

  const activeSubAccount = subAccounts.find(a => a.id === currentSubAccountId) || null;

  return (
    <SubAccountContext.Provider value={{
      subAccounts, activeSubAccount, loading,
      switchSubAccount, addSubAccount, updateSubAccount, deleteSubAccount,
      currentSubAccountId,
    }}>
      {children}
    </SubAccountContext.Provider>
  );
};
