import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Building2, Users, Send, Loader2, Mail, ArrowLeft, Upload, Palette,
  User, Phone, X, Home, ChevronDown, ChevronUp, Trash2, Check, Camera,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Partner {
  id: string;
  name: string;
  email: string;
  plan_limit: number;
  brand_color: string | null;
  brand_logo_url: string | null;
}

interface Invite {
  id: string;
  email: string;
  partner_id: string;
  status: string;
  expires_at: string | null;
  created_at: string;
  consultant_name: string | null;
  consultant_phone: string | null;
  consultant_email: string | null;
  consultant_photo_url: string | null;
}

interface ClientProfile {
  id: string;
  email: string;
  full_name: string | null;
}

interface ClientHouseData {
  user_id: string;
  house_value: number;
  monthly_payment: number;
  monthly_payment_status: Record<string, string>;
  down_payment: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500",
  accepted: "bg-status-paid/10 text-status-paid",
  expired: "bg-status-negative/10 text-status-negative",
};

const PartnerDashboard = () => {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [clientProfiles, setClientProfiles] = useState<ClientProfile[]>([]);
  const [clientHouseData, setClientHouseData] = useState<ClientHouseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteUser, setShowInviteUser] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    consultant_name: "",
    consultant_phone: "",
    consultant_email: "",
    consultant_photo_url: "",
  });

  const partnerId = profile?.partner_id;

  useEffect(() => {
    if (!partnerId) {
      navigate("/app");
      return;
    }
    loadData();
  }, [partnerId]);

  const loadData = async () => {
    if (!partnerId) return;
    setLoading(true);
    const [partnerRes, invitesRes, profilesRes, houseRes] = await Promise.all([
      supabase.from("partners").select("*").eq("id", partnerId).single(),
      supabase.from("partner_invites").select("*").eq("partner_id", partnerId).order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, email, full_name").eq("partner_id", partnerId),
      supabase.from("house_data").select("user_id, house_value, monthly_payment, monthly_payment_status, down_payment"),
    ]);
    if (partnerRes.data) setPartner(partnerRes.data as Partner);
    if (invitesRes.data) setInvites(invitesRes.data as Invite[]);
    if (profilesRes.data) setClientProfiles(profilesRes.data as ClientProfile[]);
    if (houseRes.data) setClientHouseData(houseRes.data as ClientHouseData[]);
    setLoading(false);
  };

  // Extract unique consultants from invites (with photo)
  const existingConsultants = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; email: string; photo_url: string }>();
    invites.forEach((inv) => {
      if (inv.consultant_name && !map.has(inv.consultant_name)) {
        map.set(inv.consultant_name, {
          name: inv.consultant_name,
          phone: inv.consultant_phone || "",
          email: inv.consultant_email || "",
          photo_url: inv.consultant_photo_url || "",
        });
      }
    });
    return Array.from(map.values());
  }, [invites]);

  const handleSelectConsultant = (name: string) => {
    const c = existingConsultants.find((x) => x.name === name);
    if (c) {
      setInviteForm((prev) => ({
        ...prev,
        consultant_name: c.name,
        consultant_phone: c.phone,
        consultant_email: c.email,
        consultant_photo_url: c.photo_url,
      }));
    }
  };

  const handleConsultantPhotoUpload = async (file: File) => {
    if (!partnerId) return;
    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `consultant-${partnerId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("partner-logos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("partner-logos")
        .getPublicUrl(path);

      setInviteForm((prev) => ({ ...prev, consultant_photo_url: publicUrl }));
      toast.success("Foto carregada");
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteForm.email || !partnerId) {
      toast.error("Email é obrigatório");
      return;
    }
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("partner-invite-user", {
        body: {
          email: inviteForm.email,
          partner_id: partnerId,
          consultant_name: inviteForm.consultant_name || null,
          consultant_phone: inviteForm.consultant_phone || null,
          consultant_email: inviteForm.consultant_email || null,
          consultant_photo_url: inviteForm.consultant_photo_url || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(
        data?.user_existed
          ? `Plano ativado para ${inviteForm.email}`
          : `Convite criado para ${inviteForm.email}. O utilizador deve criar uma conta com esse email.`
      );
      setShowInviteUser(false);
      setInviteForm({ email: "", consultant_name: "", consultant_phone: "", consultant_email: "", consultant_photo_url: "" });
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar convite");
    } finally {
      setInviting(false);
    }
  };

  const partnerInvites = invites.filter((i) => i.partner_id === partnerId);
  const acceptedCount = partnerInvites.filter((i) => i.status === "accepted").length;

  // Monthly usage
  const currentMonthInvites = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return partnerInvites.filter((i) => new Date(i.created_at) >= monthStart).length;
  }, [partnerInvites]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
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
              <h1 className="text-lg font-semibold text-foreground tracking-tight">{partner?.name || "Parceiro"}</h1>
              <p className="text-xs text-text-muted">Painel de Gestão</p>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5 text-center">
            <p className="text-2xl font-bold text-foreground">{partnerInvites.length}</p>
            <p className="label-caps mt-1">Convites Total</p>
          </div>
          <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5 text-center">
            <p className="text-2xl font-bold text-foreground">{acceptedCount}</p>
            <p className="label-caps mt-1">Ativos</p>
          </div>
          <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5 text-center">
            <p className="text-2xl font-bold text-primary">{currentMonthInvites}/{partner?.plan_limit ?? 50}</p>
            <p className="label-caps mt-1">Este Mês</p>
          </div>
          <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5 text-center">
            <p className="text-2xl font-bold text-foreground">{partner?.plan_limit ?? 50}</p>
            <p className="label-caps mt-1">Limite Mensal</p>
          </div>
        </div>

        {/* Invite button */}
        <div className="mb-6">
          <button
            onClick={() => setShowInviteUser(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Send className="h-4 w-4" /> Convidar Utilizador
          </button>
        </div>

        {/* Clients */}
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 overflow-hidden mb-6">
          <div className="p-4 border-b border-border-subtle/60 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="label-caps">Clientes ({clientProfiles.length})</span>
          </div>
          <div className="divide-y divide-border-subtle/40">
            {clientProfiles.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-text-muted">
                Nenhum cliente ainda. Convide utilizadores para começar.
              </div>
            ) : (
              clientProfiles.map((client) => {
                const house = clientHouseData.find((h) => h.user_id === client.id);
                const invite = invites.find((i) => i.email === client.email);
                return (
                  <div key={client.id} className="p-4 hover:bg-surface-hover transition-colors">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{client.full_name || "—"}</p>
                        <p className="text-xs text-text-muted truncate">{client.email}</p>
                      </div>
                      {invite?.consultant_name && (
                        <div className="flex items-center gap-2 shrink-0">
                          {invite.consultant_photo_url && (
                            <img src={invite.consultant_photo_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                          )}
                          <span className="text-xs text-text-muted">· {invite.consultant_name}</span>
                        </div>
                      )}
                    </div>
                    {house && (
                      <div className="grid grid-cols-3 gap-3 mt-2">
                        <div>
                          <p className="text-[10px] text-text-muted uppercase">Valor Casa</p>
                          <p className="text-sm font-mono text-foreground">€ {house.house_value.toLocaleString("pt-PT")}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-text-muted uppercase">Prestação</p>
                          <p className="text-sm font-mono text-foreground">€ {house.monthly_payment.toLocaleString("pt-PT")}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-text-muted uppercase">Entrada</p>
                          <p className="text-sm font-mono text-foreground">€ {house.down_payment.toLocaleString("pt-PT")}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Consultores */}
        {existingConsultants.length > 0 && (
          <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 overflow-hidden mb-6">
            <div className="p-4 border-b border-border-subtle/60 flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <span className="label-caps">Consultores ({existingConsultants.length})</span>
            </div>
            <div className="divide-y divide-border-subtle/40">
              {existingConsultants.map((c) => (
                <div key={c.name} className="p-4 flex items-center gap-3">
                  {c.photo_url ? (
                    <img src={c.photo_url} alt={c.name} className="h-10 w-10 rounded-full object-cover border border-border-subtle" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-text-muted">
                      <User className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{c.name}</p>
                    <p className="text-xs text-text-muted">{[c.phone, c.email].filter(Boolean).join(" · ")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invites list */}
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 overflow-hidden">
          <div className="p-4 border-b border-border-subtle/60 flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <span className="label-caps">Todos os Convites ({partnerInvites.length})</span>
          </div>
          <div className="divide-y divide-border-subtle/40">
            {partnerInvites.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-text-muted">Nenhum convite enviado.</div>
            ) : (
              partnerInvites.map((inv) => (
                <div key={inv.id} className="p-4 hover:bg-surface-hover transition-colors flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {inv.consultant_photo_url && (
                      <img src={inv.consultant_photo_url} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{inv.email}</p>
                      {inv.consultant_name && (
                        <p className="text-xs text-text-muted">· {inv.consultant_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[inv.status] || ""}`}>
                      {inv.status === "accepted" ? "Aceite" : inv.status === "pending" ? "Pendente" : inv.status}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {new Date(inv.created_at).toLocaleDateString("pt-PT")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Invite Dialog */}
      <Dialog open={showInviteUser} onOpenChange={setShowInviteUser}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar Utilizador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Email do cliente *</label>
              <input type="email" value={inviteForm.email}
                onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="cliente@email.com"
                className="w-full px-3 py-2 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>

            <div className="border-t border-border-subtle/60 pt-3">
              <p className="text-xs text-text-muted mb-2 uppercase font-semibold tracking-wider">Consultor Atribuído</p>

              {existingConsultants.length > 0 && (
                <div className="mb-3">
                  <label className="text-xs text-text-muted mb-1 block">Selecionar consultor existente</label>
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) handleSelectConsultant(e.target.value);
                    }}
                    className="w-full px-3 py-2 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">— Novo consultor —</option>
                    {existingConsultants.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-3">
                {/* Consultant Photo */}
                <div className="flex items-center gap-3">
                  {inviteForm.consultant_photo_url ? (
                    <img src={inviteForm.consultant_photo_url} alt="Consultor" className="h-14 w-14 rounded-full object-cover border border-border-subtle" />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center text-text-muted">
                      <User className="h-6 w-6" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle text-foreground text-xs font-medium hover:bg-surface-hover transition-colors cursor-pointer">
                      {uploadingPhoto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                      {inviteForm.consultant_photo_url ? "Alterar foto" : "Adicionar foto"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleConsultantPhotoUpload(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {inviteForm.consultant_photo_url && (
                      <button
                        onClick={() => setInviteForm((p) => ({ ...p, consultant_photo_url: "" }))}
                        className="text-[10px] text-status-negative hover:underline text-left"
                      >
                        Remover foto
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Nome</label>
                  <input value={inviteForm.consultant_name}
                    onChange={(e) => setInviteForm((p) => ({ ...p, consultant_name: e.target.value }))}
                    placeholder="Nome do consultor"
                    className="w-full px-3 py-2 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Telefone</label>
                  <input value={inviteForm.consultant_phone}
                    onChange={(e) => setInviteForm((p) => ({ ...p, consultant_phone: e.target.value }))}
                    placeholder="+351 912 345 678"
                    className="w-full px-3 py-2 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
                  <input type="email" value={inviteForm.consultant_email}
                    onChange={(e) => setInviteForm((p) => ({ ...p, consultant_email: e.target.value }))}
                    placeholder="consultor@email.com"
                    className="w-full px-3 py-2 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
            </div>

            <button onClick={handleInviteUser} disabled={inviting}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {inviting ? "A enviar..." : "Enviar Convite"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartnerDashboard;
