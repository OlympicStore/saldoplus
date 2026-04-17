import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Building2, Users, Send, Loader2, Mail, ArrowLeft, Upload, Palette,
  User, Phone, X, Home, ChevronDown, ChevronUp, Trash2, Check, Camera, Plus, Eye, EyeOff,
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
  consultant_id: string | null;
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

interface ConsultantRecord {
  id: string;
  user_id: string;
  partner_id: string;
  name: string;
  phone: string | null;
  email: string;
  photo_url: string | null;
  active: boolean;
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
  const [consultants, setConsultants] = useState<ConsultantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteUser, setShowInviteUser] = useState(false);
  const [showCreateConsultant, setShowCreateConsultant] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [creatingConsultant, setCreatingConsultant] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [inviteMode, setInviteMode] = useState<"invite" | "create">("invite");
  const [creatingClient, setCreatingClient] = useState(false);
  const [showClientPassword, setShowClientPassword] = useState(false);

  const [inviteForm, setInviteForm] = useState({
    email: "",
    consultant_id: "",
  });

  const [clientForm, setClientForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    consultant_id: "",
  });

  const handleCreateClient = async () => {
    if (!clientForm.full_name || !clientForm.email || !clientForm.password) {
      toast.error("Nome, email e password são obrigatórios");
      return;
    }
    if (clientForm.password.length < 6) {
      toast.error("Password deve ter pelo menos 6 caracteres");
      return;
    }
    setCreatingClient(true);
    try {
      const { data, error } = await supabase.functions.invoke("partner-create-client", {
        body: {
          email: clientForm.email,
          password: clientForm.password,
          full_name: clientForm.full_name,
          phone: clientForm.phone || null,
          consultant_id: clientForm.consultant_id || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Cliente ${clientForm.full_name} criado com sucesso`);
      setShowInviteUser(false);
      setClientForm({ full_name: "", email: "", phone: "", password: "", consultant_id: "" });
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar cliente");
    } finally {
      setCreatingClient(false);
    }
  };

  const [consultantForm, setConsultantForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    photo_url: "",
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
    const [partnerRes, invitesRes, profilesRes, houseRes, consultantsRes] = await Promise.all([
      supabase.from("partners").select("*").eq("id", partnerId).single(),
      supabase.from("partner_invites").select("*").eq("partner_id", partnerId).order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, email, full_name").eq("partner_id", partnerId),
      supabase.from("house_data").select("user_id, house_value, monthly_payment, monthly_payment_status, down_payment"),
      supabase.from("partner_consultants").select("*").eq("partner_id", partnerId).order("name"),
    ]);
    if (partnerRes.data) setPartner(partnerRes.data as Partner);
    if (invitesRes.data) setInvites(invitesRes.data as Invite[]);
    if (profilesRes.data) setClientProfiles(profilesRes.data as ClientProfile[]);
    if (houseRes.data) setClientHouseData(houseRes.data as ClientHouseData[]);
    if (consultantsRes.data) setConsultants(consultantsRes.data as ConsultantRecord[]);
    setLoading(false);
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
      setConsultantForm((prev) => ({ ...prev, photo_url: publicUrl }));
      toast.success("Foto carregada");
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCreateConsultant = async () => {
    if (!consultantForm.name || !consultantForm.email || !consultantForm.password) {
      toast.error("Nome, email e password são obrigatórios");
      return;
    }
    if (consultantForm.password.length < 6) {
      toast.error("Password deve ter pelo menos 6 caracteres");
      return;
    }
    setCreatingConsultant(true);
    try {
      const { data, error } = await supabase.functions.invoke("partner-create-consultant", {
        body: {
          email: consultantForm.email,
          password: consultantForm.password,
          name: consultantForm.name,
          phone: consultantForm.phone || null,
          consultant_email: consultantForm.email,
          photo_url: consultantForm.photo_url || null,
          partner_id: partnerId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Consultor ${consultantForm.name} criado com sucesso`);
      setShowCreateConsultant(false);
      setConsultantForm({ name: "", email: "", password: "", phone: "", photo_url: "" });
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar consultor");
    } finally {
      setCreatingConsultant(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteForm.email || !partnerId) {
      toast.error("Email é obrigatório");
      return;
    }
    setInviting(true);
    try {
      // Find consultant data for backward compat
      const selectedConsultant = consultants.find(c => c.id === inviteForm.consultant_id);
      
      const { data, error } = await supabase.functions.invoke("partner-invite-user", {
        body: {
          email: inviteForm.email,
          partner_id: partnerId,
          consultant_id: inviteForm.consultant_id || null,
          consultant_name: selectedConsultant?.name || null,
          consultant_phone: selectedConsultant?.phone || null,
          consultant_email: selectedConsultant?.email || null,
          consultant_photo_url: selectedConsultant?.photo_url || null,
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
      setInviteForm({ email: "", consultant_id: "" });
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar convite");
    } finally {
      setInviting(false);
    }
  };

  const handleToggleConsultantActive = async (consultant: ConsultantRecord) => {
    const newActive = !consultant.active;
    const { error } = await supabase
      .from("partner_consultants")
      .update({ active: newActive } as any)
      .eq("id", consultant.id);
    if (error) {
      toast.error("Erro ao atualizar consultor");
    } else {
      toast.success(newActive ? "Consultor ativado" : "Consultor desativado");
      loadData();
    }
  };

  const handleRemoveClient = async (client: ClientProfile) => {
    const ok = confirm(
      `Remover o cliente ${client.full_name || client.email}?\n\nEsta ação apaga definitivamente a conta e todos os dados financeiros do cliente. Não pode ser revertida.`
    );
    if (!ok) return;
    try {
      const { data, error } = await supabase.functions.invoke("partner-delete-client", {
        body: { client_id: client.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Cliente removido");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover cliente");
    }
  };

  const handleAssignConsultantToClient = async (client: ClientProfile, consultantId: string) => {
    if (!partnerId) return;
    const newConsultantId = consultantId || null;
    const existing = invites.find((i) => i.email === client.email && i.partner_id === partnerId);
    try {
      if (existing) {
        const { error } = await supabase
          .from("partner_invites")
          .update({ consultant_id: newConsultantId } as any)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // No invite exists (client created directly) — create an accepted invite to track consultant
        const { error } = await supabase
          .from("partner_invites")
          .insert({
            email: client.email,
            partner_id: partnerId,
            status: "accepted",
            consultant_id: newConsultantId,
          } as any);
        if (error) throw error;
      }
      toast.success(newConsultantId ? "Consultor atribuído" : "Consultor removido");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atribuir consultor");
    }
  };

  const handleDeleteInvite = async (inv: Invite) => {
    const msg = inv.status === "accepted"
      ? `Eliminar o convite de ${inv.email}? O cliente já criou conta — o convite será removido mas a conta dele mantém-se.`
      : `Eliminar o convite pendente de ${inv.email}?`;
    if (!confirm(msg)) return;
    const { error } = await supabase.from("partner_invites").delete().eq("id", inv.id);
    if (error) {
      toast.error("Erro ao eliminar convite");
    } else {
      toast.success("Convite eliminado");
      loadData();
    }
  };

  const partnerInvites = invites.filter((i) => i.partner_id === partnerId);
  const acceptedCount = partnerInvites.filter((i) => i.status === "accepted").length;

  const currentMonthInvites = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return partnerInvites.filter((i) => new Date(i.created_at) >= monthStart).length;
  }, [partnerInvites]);

  const getConsultantName = (invite: Invite) => {
    if (invite.consultant_id) {
      const c = consultants.find(x => x.id === invite.consultant_id);
      if (c) return c.name;
    }
    return invite.consultant_name || null;
  };

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
            <p className="text-2xl font-bold text-foreground">{consultants.filter(c => c.active).length}</p>
            <p className="label-caps mt-1">Consultores</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setShowInviteUser(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Send className="h-4 w-4" /> Convidar Cliente
          </button>
          <button
            onClick={() => setShowCreateConsultant(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border-subtle text-foreground text-sm font-medium hover:bg-surface-hover transition-colors"
          >
            <Plus className="h-4 w-4" /> Criar Consultor
          </button>
        </div>

        {/* Consultants */}
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 overflow-hidden mb-6">
          <div className="p-4 border-b border-border-subtle/60 flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <span className="label-caps">Consultores ({consultants.length})</span>
          </div>
          <div className="divide-y divide-border-subtle/40">
            {consultants.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-text-muted">
                Nenhum consultor criado. Crie o primeiro consultor.
              </div>
            ) : (
              consultants.map((c) => {
                const clientCount = partnerInvites.filter(i => i.consultant_id === c.id && i.status === "accepted").length;
                return (
                  <div key={c.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {c.photo_url ? (
                        <img src={c.photo_url} alt={c.name} className="h-10 w-10 rounded-full object-cover border border-border-subtle" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-text-muted">
                          <User className="h-5 w-5" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-foreground">{c.name}</p>
                        <p className="text-xs text-text-muted">{c.email} · {clientCount} clientes</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.active ? "bg-status-paid/10 text-status-paid" : "bg-status-negative/10 text-status-negative"}`}>
                        {c.active ? "Ativo" : "Inativo"}
                      </span>
                      <button
                        onClick={() => handleToggleConsultantActive(c)}
                        className="text-xs px-2 py-1 rounded border border-border-subtle text-text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                      >
                        {c.active ? "Desativar" : "Ativar"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
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
                const currentConsultantId = invite?.consultant_id || "";
                return (
                  <div key={client.id} className="p-4 hover:bg-surface-hover transition-colors">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{client.full_name || "—"}</p>
                        <p className="text-xs text-text-muted truncate">{client.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={currentConsultantId}
                          onChange={(e) => handleAssignConsultantToClient(client, e.target.value)}
                          className="text-xs px-2 py-1 bg-background border border-border-subtle rounded-md focus:outline-none focus:ring-1 focus:ring-primary max-w-[160px]"
                          title="Atribuir consultor"
                        >
                          <option value="">— Sem consultor —</option>
                          {consultants.filter(c => c.active || c.id === currentConsultantId).map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleRemoveClient(client)}
                          className="p-1.5 rounded-md text-text-muted hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Remover cliente"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
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
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{inv.email}</p>
                    {getConsultantName(inv) && (
                      <p className="text-xs text-text-muted">· {getConsultantName(inv)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[inv.status] || ""}`}>
                      {inv.status === "accepted" ? "Aceite" : inv.status === "pending" ? "Pendente" : inv.status}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {new Date(inv.created_at).toLocaleDateString("pt-PT")}
                    </span>
                    <button
                      onClick={() => handleDeleteInvite(inv)}
                      className="p-1.5 rounded-md text-text-muted hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Eliminar convite"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Invite/Create Client Dialog */}
      <Dialog open={showInviteUser} onOpenChange={setShowInviteUser}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Cliente</DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg mt-2">
            <button
              onClick={() => setInviteMode("invite")}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                inviteMode === "invite" ? "bg-surface text-foreground shadow-sm" : "text-text-muted hover:text-foreground"
              }`}
            >
              Convidar por Email
            </button>
            <button
              onClick={() => setInviteMode("create")}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                inviteMode === "create" ? "bg-surface text-foreground shadow-sm" : "text-text-muted hover:text-foreground"
              }`}
            >
              Criar Diretamente
            </button>
          </div>

          {inviteMode === "invite" ? (
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Email do cliente *</label>
                <input type="email" value={inviteForm.email}
                  onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="cliente@email.com"
                  className="w-full px-3 py-2 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>

              {consultants.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Consultor atribuído</label>
                  <select
                    value={inviteForm.consultant_id}
                    onChange={(e) => setInviteForm((p) => ({ ...p, consultant_id: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">— Sem consultor —</option>
                    {consultants.filter(c => c.active).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <p className="text-xs text-text-muted">
                O cliente receberá um email para criar a conta. Se o email não chegar, use a opção "Criar Diretamente".
              </p>

              <button onClick={handleInviteUser} disabled={inviting}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {inviting ? "A enviar..." : "Enviar Convite"}
              </button>
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Nome completo *</label>
                <input value={clientForm.full_name}
                  onChange={(e) => setClientForm((p) => ({ ...p, full_name: e.target.value }))}
                  placeholder="Nome do cliente"
                  className="w-full px-3 py-2 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Email *</label>
                <input type="email" value={clientForm.email}
                  onChange={(e) => setClientForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="cliente@email.com"
                  className="w-full px-3 py-2 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Contacto</label>
                <input value={clientForm.phone}
                  onChange={(e) => setClientForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+351 912 345 678"
                  className="w-full px-3 py-2 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Password *</label>
                <div className="relative">
                  <input type={showClientPassword ? "text" : "password"} value={clientForm.password}
                    onChange={(e) => setClientForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2 pr-10 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" />
                  <button type="button" onClick={() => setShowClientPassword(!showClientPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-foreground">
                    {showClientPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {consultants.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Consultor atribuído</label>
                  <select
                    value={clientForm.consultant_id}
                    onChange={(e) => setClientForm((p) => ({ ...p, consultant_id: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">— Sem consultor —</option>
                    {consultants.filter(c => c.active).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <p className="text-xs text-text-muted">
                A conta é criada imediatamente, sem verificação de email. O cliente pode alterar os dados depois ao iniciar sessão.
              </p>

              <button onClick={handleCreateClient} disabled={creatingClient}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                {creatingClient ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {creatingClient ? "A criar..." : "Criar Cliente"}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Consultant Dialog */}
      <Dialog open={showCreateConsultant} onOpenChange={setShowCreateConsultant}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Consultor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Photo */}
            <div className="flex items-center gap-3">
              {consultantForm.photo_url ? (
                <img src={consultantForm.photo_url} alt="Consultor" className="h-14 w-14 rounded-full object-cover border border-border-subtle" />
              ) : (
                <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center text-text-muted">
                  <User className="h-6 w-6" />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle text-foreground text-xs font-medium hover:bg-surface-hover transition-colors cursor-pointer">
                  {uploadingPhoto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  {consultantForm.photo_url ? "Alterar foto" : "Adicionar foto"}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleConsultantPhotoUpload(file);
                      e.target.value = "";
                    }} />
                </label>
                {consultantForm.photo_url && (
                  <button onClick={() => setConsultantForm((p) => ({ ...p, photo_url: "" }))}
                    className="text-[10px] text-status-negative hover:underline text-left">Remover foto</button>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Nome *</label>
              <input value={consultantForm.name}
                onChange={(e) => setConsultantForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Nome do consultor"
                className="w-full px-3 py-2 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Email *</label>
              <input type="email" value={consultantForm.email}
                onChange={(e) => setConsultantForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="consultor@email.com"
                className="w-full px-3 py-2 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Password *</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={consultantForm.password}
                  onChange={(e) => setConsultantForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2 pr-10 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Telefone</label>
              <input value={consultantForm.phone}
                onChange={(e) => setConsultantForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+351 912 345 678"
                className="w-full px-3 py-2 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>

            <button onClick={handleCreateConsultant} disabled={creatingConsultant}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
              {creatingConsultant ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {creatingConsultant ? "A criar..." : "Criar Consultor"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartnerDashboard;
