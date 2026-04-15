import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Users, Loader2, User, ChevronDown, ChevronUp, Home, Phone, Mail,
} from "lucide-react";

interface ConsultantRecord {
  id: string;
  partner_id: string;
  name: string;
  phone: string | null;
  email: string;
  photo_url: string | null;
}

interface ClientProfile {
  id: string;
  email: string;
  full_name: string | null;
  plan: string;
  plan_expires_at: string | null;
}

interface ClientHouseData {
  user_id: string;
  house_value: number;
  monthly_payment: number;
  monthly_income: number;
  monthly_payment_status: Record<string, string>;
  down_payment: number;
}

interface PartnerInfo {
  name: string;
  brand_logo_url: string | null;
  brand_color: string | null;
}

const ConsultantDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [consultant, setConsultant] = useState<ConsultantRecord | null>(null);
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [houseData, setHouseData] = useState<ClientHouseData[]>([]);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get consultant record
      const { data: consultantData } = await supabase
        .from("partner_consultants")
        .select("*")
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle();

      if (!consultantData) {
        setLoading(false);
        return;
      }
      setConsultant(consultantData as ConsultantRecord);

      // Get partner info
      const { data: partnerData } = await supabase
        .from("partners")
        .select("name, brand_logo_url, brand_color")
        .eq("id", consultantData.partner_id)
        .single();
      if (partnerData) setPartner(partnerData as PartnerInfo);

      // Get invites assigned to this consultant
      const { data: invites } = await supabase
        .from("partner_invites")
        .select("email")
        .eq("consultant_id", consultantData.id)
        .eq("status", "accepted");

      const clientEmails = (invites || []).map((i: any) => i.email);

      if (clientEmails.length > 0) {
        // Get client profiles
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, email, full_name, plan, plan_expires_at")
          .in("email", clientEmails);
        if (profilesData) setClients(profilesData as ClientProfile[]);

        // Get house data for clients
        const clientIds = (profilesData || []).map((p: any) => p.id);
        if (clientIds.length > 0) {
          const { data: hData } = await supabase
            .from("house_data")
            .select("user_id, house_value, monthly_payment, monthly_income, monthly_payment_status, down_payment")
            .in("user_id", clientIds);
          if (hData) setHouseData(hData as ClientHouseData[]);
        }
      }
    } catch (err: any) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStats = (status: Record<string, string>) => {
    const entries = Object.entries(status || {});
    const paid = entries.filter(([, v]) => v === "pago").length;
    const pending = entries.filter(([, v]) => v === "pendente").length;
    return { paid, pending, total: entries.length };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!consultant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-text-muted">Perfil de consultor não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border-subtle/60 bg-surface">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {partner?.brand_logo_url && (
              <img src={partner.brand_logo_url} alt={partner.name} className="h-8 w-auto object-contain" />
            )}
            <div>
              <h1 className="text-lg font-semibold text-foreground tracking-tight">{consultant.name}</h1>
              <p className="text-xs text-text-muted">Painel do Consultor · {partner?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/app")}
              className="text-sm px-3 py-2 rounded-lg text-text-muted hover:text-foreground transition-colors">
              Ir para App
            </button>
            <button onClick={signOut}
              className="text-sm px-3 py-2 rounded-lg text-text-muted hover:text-foreground transition-colors">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5 text-center">
            <p className="text-2xl font-bold text-foreground">{clients.length}</p>
            <p className="label-caps mt-1">Clientes Ativos</p>
          </div>
          <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5 text-center">
            <p className="text-2xl font-bold text-foreground">
              {clients.filter(c => {
                const h = houseData.find(hd => hd.user_id === c.id);
                return h && h.monthly_payment > 0;
              }).length}
            </p>
            <p className="label-caps mt-1">Com Habitação</p>
          </div>
        </div>

        {/* Clients List */}
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 overflow-hidden">
          <div className="p-4 border-b border-border-subtle/60 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="label-caps">Meus Clientes ({clients.length})</span>
          </div>
          <div className="divide-y divide-border-subtle/40">
            {clients.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-text-muted">
                Ainda não tem clientes atribuídos.
              </div>
            ) : (
              clients.map((client) => {
                const isExpanded = expandedClient === client.id;
                const house = houseData.find((h) => h.user_id === client.id);
                const paymentStats = house ? getPaymentStats(house.monthly_payment_status) : null;
                const ratio = house && house.monthly_income > 0
                  ? ((house.monthly_payment / house.monthly_income) * 100)
                  : null;

                return (
                  <div key={client.id}>
                    <button
                      onClick={() => setExpandedClient(isExpanded ? null : client.id)}
                      className="w-full p-4 hover:bg-surface-hover transition-colors flex items-center justify-between gap-3 text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{client.full_name || "—"}</p>
                        <p className="text-xs text-text-muted truncate">{client.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-text-muted capitalize">{client.plan}</span>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3">
                        {/* Plan info */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-background rounded-lg p-3">
                            <p className="text-[10px] text-text-muted uppercase">Plano</p>
                            <p className="text-sm font-semibold text-foreground capitalize">{client.plan}</p>
                          </div>
                          <div className="bg-background rounded-lg p-3">
                            <p className="text-[10px] text-text-muted uppercase">Expira</p>
                            <p className="text-sm font-mono text-foreground">
                              {client.plan_expires_at
                                ? new Date(client.plan_expires_at).toLocaleDateString("pt-PT")
                                : "—"}
                            </p>
                          </div>
                        </div>

                        {/* House data */}
                        {house ? (
                          <>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div className="bg-background rounded-lg p-3">
                                <p className="text-[10px] text-text-muted uppercase">Valor Casa</p>
                                <p className="text-sm font-mono text-foreground">€ {house.house_value.toLocaleString("pt-PT")}</p>
                              </div>
                              <div className="bg-background rounded-lg p-3">
                                <p className="text-[10px] text-text-muted uppercase">Prestação</p>
                                <p className="text-sm font-mono text-foreground">€ {house.monthly_payment.toLocaleString("pt-PT")}</p>
                              </div>
                              <div className="bg-background rounded-lg p-3">
                                <p className="text-[10px] text-text-muted uppercase">Entrada</p>
                                <p className="text-sm font-mono text-foreground">€ {house.down_payment.toLocaleString("pt-PT")}</p>
                              </div>
                              <div className="bg-background rounded-lg p-3">
                                <p className="text-[10px] text-text-muted uppercase">Taxa Esforço</p>
                                <p className={`text-sm font-mono font-semibold ${
                                  ratio !== null
                                    ? ratio >= 30 ? "text-status-negative" : ratio >= 20 ? "text-yellow-500" : "text-status-paid"
                                    : "text-text-muted"
                                }`}>
                                  {ratio !== null ? `${ratio.toFixed(1)}%` : "—"}
                                </p>
                              </div>
                            </div>

                            {/* Payment status */}
                            {paymentStats && paymentStats.total > 0 && (
                              <div className="bg-background rounded-lg p-3">
                                <p className="text-[10px] text-text-muted uppercase mb-2">Pagamentos Habitação</p>
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-status-paid" />
                                    <span className="text-xs text-foreground">{paymentStats.paid} pagos</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                    <span className="text-xs text-foreground">{paymentStats.pending} pendentes</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="bg-background rounded-lg p-3 text-center">
                            <p className="text-xs text-text-muted">Sem dados de habitação</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ConsultantDashboard;
