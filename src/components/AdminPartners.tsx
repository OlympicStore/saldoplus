import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Building2, Plus, Mail, Users, Send, Loader2, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp, BarChart3, Trash2, Pencil, Check, Upload, Palette, User, Phone, X, Home, UserCog,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Partner {
  id: string;
  name: string;
  email: string;
  plan_limit: number;
  plan_type: string;
  active: boolean;
  created_at: string;
  brand_color: string | null;
  brand_logo_url: string | null;
  consultant_name: string | null;
  consultant_phone: string | null;
  consultant_email: string | null;
  consultant_photo_url: string | null;
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
  consultant_photo_position: string | null;
}

const PLAN_TYPE_LABELS: Record<string, string> = {
  starter: "Starter",
  growth: "Growth",
  premium: "Premium",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500",
  accepted: "bg-status-paid/10 text-status-paid",
  expired: "bg-status-negative/10 text-status-negative",
};

interface ClientHouseData {
  user_id: string;
  house_value: number;
  monthly_payment: number;
  monthly_payment_status: Record<string, string>;
  down_payment: number;
}

interface ClientProfile {
  id: string;
  email: string;
  full_name: string | null;
  partner_id: string | null;
}

interface Consultant {
  id: string;
  user_id: string;
  partner_id: string;
  name: string;
  phone: string | null;
  email: string;
  photo_url: string | null;
  active: boolean;
  created_at: string;
}

const AdminPartners = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [clientProfiles, setClientProfiles] = useState<ClientProfile[]>([]);
  const [clientHouseData, setClientHouseData] = useState<ClientHouseData[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePartner, setShowCreatePartner] = useState(false);
  const [showInviteUser, setShowInviteUser] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null);
  const [deleteInviteTarget, setDeleteInviteTarget] = useState<Invite | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingLimit, setEditingLimit] = useState<string | null>(null);
  const [editLimitValue, setEditLimitValue] = useState(0);
  const [creating, setCreating] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState<string | null>(null);
  const [uploadingInvitePhoto, setUploadingInvitePhoto] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [expandedInvite, setExpandedInvite] = useState<string | null>(null);

  // Consultant management
  const [showCreateConsultant, setShowCreateConsultant] = useState(false);
  const [consultantPartnerId, setConsultantPartnerId] = useState<string | null>(null);
  const [creatingConsultant, setCreatingConsultant] = useState(false);
  const [newConsultant, setNewConsultant] = useState({ name: "", email: "", password: "", phone: "" });
  const [editingConsultant, setEditingConsultant] = useState<string | null>(null);
  const [editConsultantData, setEditConsultantData] = useState({ name: "", phone: "" });
  const [deleteConsultantTarget, setDeleteConsultantTarget] = useState<Consultant | null>(null);
  const [uploadingConsultantPhoto, setUploadingConsultantPhoto] = useState<string | null>(null);

  const [newPartner, setNewPartner] = useState({ name: "", email: "", password: "", plan_limit: 25, plan_type: "starter" });
  const [inviteForm, setInviteForm] = useState({
    email: "",
    consultant_name: "",
    consultant_phone: "",
    consultant_email: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [partnersRes, invitesRes, profilesRes, houseRes, consultantsRes] = await Promise.all([
      supabase.from("partners").select("*").order("created_at", { ascending: false }),
      supabase.from("partner_invites").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, email, full_name, partner_id").not("partner_id", "is", null),
      supabase.from("house_data").select("user_id, house_value, monthly_payment, monthly_payment_status, down_payment"),
      supabase.from("partner_consultants").select("*").order("created_at", { ascending: false }),
    ]);
    if (partnersRes.data) setPartners(partnersRes.data as Partner[]);
    if (invitesRes.data) setInvites(invitesRes.data as Invite[]);
    if (profilesRes.data) setClientProfiles(profilesRes.data as ClientProfile[]);
    if (houseRes.data) setClientHouseData(houseRes.data as ClientHouseData[]);
    if (consultantsRes.data) setConsultants(consultantsRes.data as Consultant[]);
    setLoading(false);
  };

  // ============ CONSULTANT MANAGEMENT ============
  const handleCreateConsultant = async () => {
    if (!consultantPartnerId) return;
    if (!newConsultant.name.trim() || !newConsultant.email.trim() || !newConsultant.password.trim()) {
      toast.error("Nome, email e password são obrigatórios");
      return;
    }
    if (newConsultant.password.length < 6) {
      toast.error("Password deve ter pelo menos 6 caracteres");
      return;
    }
    setCreatingConsultant(true);
    try {
      const { data, error } = await supabase.functions.invoke("partner-create-consultant", {
        body: {
          partner_id: consultantPartnerId,
          name: newConsultant.name.trim(),
          email: newConsultant.email.trim().toLowerCase(),
          password: newConsultant.password,
          phone: newConsultant.phone.trim() || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Consultor ${newConsultant.name} criado`);
      setShowCreateConsultant(false);
      setNewConsultant({ name: "", email: "", password: "", phone: "" });
      setConsultantPartnerId(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar consultor");
    } finally {
      setCreatingConsultant(false);
    }
  };

  const toggleConsultantActive = async (c: Consultant) => {
    const { error } = await supabase
      .from("partner_consultants")
      .update({ active: !c.active })
      .eq("id", c.id);
    if (error) {
      toast.error("Erro ao atualizar consultor");
    } else {
      setConsultants(prev => prev.map(x => x.id === c.id ? { ...x, active: !x.active } : x));
      toast.success(`Consultor ${!c.active ? "ativado" : "desativado"}`);
    }
  };

  const handleSaveConsultantEdit = async (id: string) => {
    const { error } = await supabase
      .from("partner_consultants")
      .update({ name: editConsultantData.name.trim(), phone: editConsultantData.phone.trim() || null })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao guardar");
    } else {
      setConsultants(prev => prev.map(x => x.id === id ? { ...x, name: editConsultantData.name.trim(), phone: editConsultantData.phone.trim() || null } : x));
      setEditingConsultant(null);
      toast.success("Consultor atualizado");
    }
  };

  const handleConsultantPhotoUpload = async (consultantId: string, file: File) => {
    setUploadingConsultantPhoto(consultantId);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `consultants/${consultantId}.${ext}`;
      const { error: upErr } = await supabase.storage.from("partner-logos").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("partner-logos").getPublicUrl(path);
      const photoUrl = publicUrl + "?t=" + Date.now();
      const { error } = await supabase.from("partner_consultants").update({ photo_url: photoUrl }).eq("id", consultantId);
      if (error) throw error;
      setConsultants(prev => prev.map(x => x.id === consultantId ? { ...x, photo_url: photoUrl } : x));
      toast.success("Foto atualizada");
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar foto");
    } finally {
      setUploadingConsultantPhoto(null);
    }
  };

  const handleDeleteConsultant = async () => {
    if (!deleteConsultantTarget) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-consultant", {
        body: { consultant_id: deleteConsultantTarget.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Consultor ${deleteConsultantTarget.name} removido`);
      setDeleteConsultantTarget(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover consultor");
    } finally {
      setDeleting(false);
    }
  };

  const getPartnerConsultants = (partnerId: string) => consultants.filter(c => c.partner_id === partnerId);


  const handleCreatePartner = async () => {
    if (!newPartner.name || !newPartner.email) {
      toast.error("Nome e email são obrigatórios");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-partner", {
        body: newPartner,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Parceiro ${newPartner.name} criado com sucesso`);
      setShowCreatePartner(false);
      setNewPartner({ name: "", email: "", password: "", plan_limit: 25, plan_type: "starter" });
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar parceiro");
    } finally {
      setCreating(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteForm.email || !selectedPartnerId) {
      toast.error("Email é obrigatório");
      return;
    }
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-invite-partner-user", {
        body: {
          email: inviteForm.email,
          partner_id: selectedPartnerId,
          consultant_name: inviteForm.consultant_name || null,
          consultant_phone: inviteForm.consultant_phone || null,
          consultant_email: inviteForm.consultant_email || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(
        data?.user_existed
          ? `Plano ativado para ${inviteForm.email}`
          : `Convite enviado para ${inviteForm.email}`
      );
      setShowInviteUser(false);
      setInviteForm({ email: "", consultant_name: "", consultant_phone: "", consultant_email: "" });
      setSelectedPartnerId(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar convite");
    } finally {
      setInviting(false);
    }
  };

  const togglePartnerActive = async (partner: Partner) => {
    const { error } = await supabase
      .from("partners")
      .update({ active: !partner.active })
      .eq("id", partner.id);
    if (error) {
      toast.error("Erro ao atualizar parceiro");
    } else {
      toast.success(`Parceiro ${!partner.active ? "ativado" : "desativado"}`);
      setPartners((prev) =>
        prev.map((p) => (p.id === partner.id ? { ...p, active: !p.active } : p))
      );
    }
  };

  const handleDeletePartner = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await supabase.from("partner_invites").delete().eq("partner_id", deleteTarget.id);
      await supabase
        .from("profiles")
        .update({ plan: "essencial", plan_source: "direct", partner_id: null })
        .eq("partner_id", deleteTarget.id);
      const { error } = await supabase.from("partners").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success(`Parceiro ${deleteTarget.name} removido`);
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover parceiro");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteInvite = async () => {
    if (!deleteInviteTarget) return;
    setDeleting(true);
    try {
      // If invite was accepted, revert user to essencial
      if (deleteInviteTarget.status === "accepted") {
        const { data: prof } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", deleteInviteTarget.email)
          .maybeSingle();
        if (prof) {
          await supabase
            .from("profiles")
            .update({ plan: "essencial", plan_source: "direct", partner_id: null, plan_started_at: null, plan_expires_at: null })
            .eq("id", prof.id);
        }
      }
      const { error } = await supabase.from("partner_invites").delete().eq("id", deleteInviteTarget.id);
      if (error) throw error;
      toast.success(`Convite para ${deleteInviteTarget.email} removido`);
      setDeleteInviteTarget(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover convite");
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateLimit = async (partnerId: string) => {
    if (editLimitValue < 1) {
      toast.error("O limite deve ser pelo menos 1");
      return;
    }
    const { error } = await supabase
      .from("partners")
      .update({ plan_limit: editLimitValue })
      .eq("id", partnerId);
    if (error) {
      toast.error("Erro ao atualizar limite");
    } else {
      toast.success("Limite atualizado");
      setPartners((prev) =>
        prev.map((p) => (p.id === partnerId ? { ...p, plan_limit: editLimitValue } : p))
      );
      setEditingLimit(null);
    }
  };

  const handleLogoUpload = async (partnerId: string, file: File) => {
    setUploadingLogo(partnerId);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${partnerId}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("partner-logos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("partner-logos")
        .getPublicUrl(path);

      const { error } = await supabase
        .from("partners")
        .update({ brand_logo_url: publicUrl })
        .eq("id", partnerId);
      if (error) throw error;

      setPartners((prev) =>
        prev.map((p) => (p.id === partnerId ? { ...p, brand_logo_url: publicUrl } : p))
      );
      toast.success("Logo carregado com sucesso");
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar logo");
    } finally {
      setUploadingLogo(null);
    }
  };

  const handleBrandColorChange = async (partnerId: string, color: string) => {
    const { error } = await supabase
      .from("partners")
      .update({ brand_color: color })
      .eq("id", partnerId);
    if (error) {
      toast.error("Erro ao guardar cor");
    } else {
      setPartners((prev) =>
        prev.map((p) => (p.id === partnerId ? { ...p, brand_color: color } : p))
      );
      toast.success("Cor atualizada");
    }
  };

  const handleInviteConsultantPhotoUpload = async (inviteId: string, file: File) => {
    setUploadingInvitePhoto(inviteId);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `consultant-invite-${inviteId}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("partner-logos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("partner-logos")
        .getPublicUrl(path);

      const { error } = await supabase
        .from("partner_invites")
        .update({ consultant_photo_url: publicUrl } as any)
        .eq("id", inviteId);
      if (error) throw error;

      setInvites((prev) =>
        prev.map((i) => (i.id === inviteId ? { ...i, consultant_photo_url: publicUrl } : i))
      );
      toast.success("Foto do consultor carregada");
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar foto");
    } finally {
      setUploadingInvitePhoto(null);
    }
  };

  const handleInviteConsultantFieldChange = async (inviteId: string, field: string, value: string) => {
    const { error } = await supabase
      .from("partner_invites")
      .update({ [field]: value || null } as any)
      .eq("id", inviteId);
    if (error) {
      toast.error("Erro ao guardar");
    } else {
      setInvites((prev) =>
        prev.map((i) => (i.id === inviteId ? { ...i, [field]: value || null } : i))
      );
    }
  };

  const getPartnerInvites = (partnerId: string) =>
    invites.filter((i) => i.partner_id === partnerId);

  const getPartnerStats = (partnerId: string) => {
    const pInvites = getPartnerInvites(partnerId);
    const total = pInvites.length;
    const accepted = pInvites.filter((i) => i.status === "accepted").length;
    const pending = pInvites.filter((i) => i.status === "pending").length;
    const rate = total > 0 ? Math.round((accepted / total) * 100) : 0;
    return { total, accepted, pending, rate };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const totalInvites = invites.length;
  const totalAccepted = invites.filter((i) => i.status === "accepted").length;
  const globalRate = totalInvites > 0 ? Math.round((totalAccepted / totalInvites) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4">
          <span className="label-caps mb-1 block">Parceiros</span>
          <p className="text-2xl font-semibold text-foreground">{partners.length}</p>
        </div>
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4">
          <span className="label-caps mb-1 block">Convites enviados</span>
          <p className="text-2xl font-semibold text-foreground">{totalInvites}</p>
        </div>
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4">
          <span className="label-caps mb-1 block">Utilizadores ativos</span>
          <p className="text-2xl font-semibold text-status-paid">{totalAccepted}</p>
        </div>
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4">
          <span className="label-caps mb-1 block">Taxa de ativação</span>
          <p className="text-2xl font-semibold text-primary">{globalRate}%</p>
        </div>
      </div>

      {/* New Clients Report per Partner */}
      <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border-subtle/60 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="label-caps">Novos Clientes por Imobiliária (Últimos 30 dias)</span>
        </div>
        <div className="divide-y divide-border-subtle/40">
          {partners.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-text-muted">Nenhum parceiro.</div>
          ) : (
            partners.map((partner) => {
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              const recentClients = clientProfiles.filter(
                (c) => c.partner_id === partner.id
              );
              const recentInvites = invites.filter(
                (i) => i.partner_id === partner.id && i.status === "accepted" && new Date(i.created_at) >= thirtyDaysAgo
              );
              const currentMonth = new Date().getMonth();
              const currentYear = new Date().getFullYear();
              const monthStart = new Date(currentYear, currentMonth, 1);
              const thisMonthInvites = invites.filter(
                (i) => i.partner_id === partner.id && new Date(i.created_at) >= monthStart
              );

              return (
                <div key={partner.id} className="p-4 hover:bg-surface-hover transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm shrink-0">🏠</div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{partner.name}</p>
                        <p className="text-xs text-text-muted">{recentClients.length} clientes total</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-center">
                        <p className="text-lg font-semibold text-status-paid">{recentInvites.length}</p>
                        <p className="text-text-muted">Novos (30d)</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-primary">{thisMonthInvites.length}/{partner.plan_limit}</p>
                        <p className="text-text-muted">Este mês</p>
                      </div>
                    </div>
                  </div>
                  {recentInvites.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {recentInvites.slice(0, 5).map((inv) => (
                        <span key={inv.id} className="px-2 py-0.5 rounded-full text-[10px] bg-status-paid/10 text-status-paid font-medium">
                          {inv.email.split("@")[0]} · {new Date(inv.created_at).toLocaleDateString("pt-PT")}
                        </span>
                      ))}
                      {recentInvites.length > 5 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-secondary text-text-muted">
                          +{recentInvites.length - 5} mais
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Partners list */}
      <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border-subtle/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="label-caps">Parceiros Imobiliários ({partners.length})</span>
          </div>
          <button
            onClick={() => setShowCreatePartner(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" /> Novo Parceiro
          </button>
        </div>

        {partners.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-text-muted">
            Nenhum parceiro criado.
          </div>
        ) : (
          <div className="divide-y divide-border-subtle/40">
            {partners.map((partner) => {
              const stats = getPartnerStats(partner.id);
              const isExpanded = expandedPartner === partner.id;
              const pInvites = getPartnerInvites(partner.id);

              return (
                <div key={partner.id}>
                  <div
                    className="p-4 hover:bg-surface-hover transition-colors cursor-pointer"
                    onClick={() => setExpandedPartner(isExpanded ? null : partner.id)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${partner.active ? "bg-primary/10" : "bg-secondary"}`}>
                          🏠
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground truncate">{partner.name}</p>
                            {!partner.active && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-status-negative/10 text-status-negative">Inativo</span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted truncate">{partner.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="hidden sm:flex items-center gap-4 text-xs text-text-muted">
                          <span>{stats.accepted}/{partner.plan_limit} utilizadores</span>
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                            {PLAN_TYPE_LABELS[partner.plan_type]}
                          </span>
                          <span>{stats.rate}% ativação</span>
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="border-t border-border-subtle/40 bg-background/50"
                    >
                      <div className="p-4 space-y-4">
                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPartnerId(partner.id);
                              setShowInviteUser(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                          >
                            <Send className="h-3.5 w-3.5" /> Convidar Utilizador
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePartnerActive(partner);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle text-foreground text-xs font-medium hover:bg-surface-hover transition-colors"
                          >
                            {partner.active ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                            {partner.active ? "Desativar" : "Ativar"}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(partner);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-status-negative/30 text-status-negative text-xs font-medium hover:bg-status-negative/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Remover
                          </button>
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="rounded-lg bg-surface border border-border-subtle/60 p-3 text-center">
                            <p className="text-lg font-semibold text-foreground">{stats.total}</p>
                            <p className="text-[10px] text-text-muted uppercase">Convites</p>
                          </div>
                          <div className="rounded-lg bg-surface border border-border-subtle/60 p-3 text-center">
                            <p className="text-lg font-semibold text-status-paid">{stats.accepted}</p>
                            <p className="text-[10px] text-text-muted uppercase">Ativos</p>
                          </div>
                          <div className="rounded-lg bg-surface border border-border-subtle/60 p-3 text-center">
                            <p className="text-lg font-semibold text-primary">{stats.rate}%</p>
                            <p className="text-[10px] text-text-muted uppercase">Ativação</p>
                          </div>
                        </div>

                        {/* Limit editor */}
                        <div className="rounded-lg bg-surface border border-border-subtle/60 p-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm text-text-muted">
                            <Users className="h-4 w-4" />
                            <span>Limite de utilizadores:</span>
                          </div>
                          {editingLimit === partner.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                value={editLimitValue}
                                onChange={(e) => setEditLimitValue(Number(e.target.value) || 1)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-20 px-2 py-1 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-mono text-center"
                              />
                              <button
                                onClick={(e) => { e.stopPropagation(); handleUpdateLimit(partner.id); }}
                                className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingLimit(partner.id);
                                setEditLimitValue(partner.plan_limit);
                              }}
                              className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary transition-colors"
                            >
                              {partner.plan_limit} <Pencil className="h-3 w-3 text-text-muted" />
                            </button>
                          )}
                        </div>

                        {/* Branding */}
                        <div className="rounded-lg bg-surface border border-border-subtle/60 p-3 space-y-3">
                          <div className="flex items-center gap-2 text-sm text-text-muted">
                            <Palette className="h-4 w-4" />
                            <span className="font-semibold uppercase text-[10px]">Branding</span>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-3">
                            {/* Logo */}
                            <div className="flex items-center gap-3">
                              {partner.brand_logo_url ? (
                                <img src={partner.brand_logo_url} alt="Logo" className="h-10 w-10 rounded-lg object-contain border border-border-subtle" />
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-text-muted">
                                  <Building2 className="h-5 w-5" />
                                </div>
                              )}
                              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle text-foreground text-xs font-medium hover:bg-surface-hover transition-colors cursor-pointer">
                                {uploadingLogo === partner.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                                {partner.brand_logo_url ? "Alterar logo" : "Carregar logo"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleLogoUpload(partner.id, file);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            </div>
                            {/* Color */}
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={partner.brand_color || "#10B981"}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleBrandColorChange(partner.id, e.target.value)}
                                className="h-9 w-9 rounded-lg border border-border-subtle cursor-pointer"
                              />
                              <span className="text-xs text-text-muted font-mono">{partner.brand_color || "Sem cor"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Consultants management */}
                        {(() => {
                          const pConsultants = getPartnerConsultants(partner.id);
                          return (
                            <div className="rounded-lg border border-border-subtle/60 overflow-hidden">
                              <div className="px-3 py-2 bg-surface border-b border-border-subtle/40 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <UserCog className="h-3.5 w-3.5 text-primary" />
                                  <span className="text-xs font-semibold text-text-muted uppercase">Consultores ({pConsultants.length})</span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConsultantPartnerId(partner.id);
                                    setShowCreateConsultant(true);
                                  }}
                                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:opacity-90 transition-opacity"
                                >
                                  <Plus className="h-3 w-3" /> Novo
                                </button>
                              </div>
                              {pConsultants.length === 0 ? (
                                <div className="px-3 py-4 text-center text-xs text-text-muted">Sem consultores.</div>
                              ) : (
                                <div className="divide-y divide-border-subtle/20">
                                  {pConsultants.map((c) => {
                                    const isEditing = editingConsultant === c.id;
                                    return (
                                      <div key={c.id} className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center gap-3">
                                          <div className="relative shrink-0">
                                            {c.photo_url ? (
                                              <img src={c.photo_url} alt={c.name} className="h-10 w-10 rounded-full object-cover border border-border-subtle" />
                                            ) : (
                                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                                                {c.name.charAt(0).toUpperCase()}
                                              </div>
                                            )}
                                            <label className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:opacity-90">
                                              {uploadingConsultantPhoto === c.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Upload className="h-2.5 w-2.5" />}
                                              <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                  const file = e.target.files?.[0];
                                                  if (file) handleConsultantPhotoUpload(c.id, file);
                                                  e.target.value = "";
                                                }}
                                              />
                                            </label>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            {isEditing ? (
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <input
                                                  value={editConsultantData.name}
                                                  onChange={(e) => setEditConsultantData(d => ({ ...d, name: e.target.value }))}
                                                  placeholder="Nome"
                                                  className="px-2 py-1 text-xs bg-background border border-border-subtle rounded-md"
                                                />
                                                <input
                                                  value={editConsultantData.phone}
                                                  onChange={(e) => setEditConsultantData(d => ({ ...d, phone: e.target.value }))}
                                                  placeholder="Telefone"
                                                  className="px-2 py-1 text-xs bg-background border border-border-subtle rounded-md"
                                                />
                                              </div>
                                            ) : (
                                              <>
                                                <div className="flex items-center gap-2">
                                                  <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                                                  {!c.active && (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-status-negative/10 text-status-negative">Inativo</span>
                                                  )}
                                                </div>
                                                <p className="text-[11px] text-text-muted truncate">{c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
                                              </>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0">
                                            {isEditing ? (
                                              <>
                                                <button
                                                  onClick={() => handleSaveConsultantEdit(c.id)}
                                                  className="p-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90"
                                                  title="Guardar"
                                                >
                                                  <Check className="h-3 w-3" />
                                                </button>
                                                <button
                                                  onClick={() => setEditingConsultant(null)}
                                                  className="p-1.5 rounded-md border border-border-subtle text-text-muted hover:bg-surface-hover"
                                                  title="Cancelar"
                                                >
                                                  <X className="h-3 w-3" />
                                                </button>
                                              </>
                                            ) : (
                                              <>
                                                <button
                                                  onClick={() => {
                                                    setEditingConsultant(c.id);
                                                    setEditConsultantData({ name: c.name, phone: c.phone || "" });
                                                  }}
                                                  className="p-1.5 rounded-md border border-border-subtle text-text-muted hover:text-foreground hover:bg-surface-hover"
                                                  title="Editar"
                                                >
                                                  <Pencil className="h-3 w-3" />
                                                </button>
                                                <button
                                                  onClick={() => toggleConsultantActive(c)}
                                                  className="p-1.5 rounded-md border border-border-subtle text-text-muted hover:text-foreground hover:bg-surface-hover"
                                                  title={c.active ? "Desativar" : "Ativar"}
                                                >
                                                  {c.active ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}
                                                </button>
                                                <button
                                                  onClick={() => setDeleteConsultantTarget(c)}
                                                  className="p-1.5 rounded-md border border-status-negative/30 text-status-negative hover:bg-status-negative/10"
                                                  title="Eliminar"
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Invites list with per-invite consultant */}
                        {pInvites.length > 0 && (
                          <div className="rounded-lg border border-border-subtle/60 overflow-hidden">
                            <div className="px-3 py-2 bg-surface border-b border-border-subtle/40">
                              <span className="text-xs font-semibold text-text-muted uppercase">Convites / Clientes</span>
                            </div>
                            <div className="divide-y divide-border-subtle/20">
                              {pInvites.map((inv) => {
                                const isInvExpanded = expandedInvite === inv.id;
                                return (
                                  <div key={inv.id}>
                                    <div
                                      className="px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-surface-hover transition-colors"
                                      onClick={(e) => { e.stopPropagation(); setExpandedInvite(isInvExpanded ? null : inv.id); }}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Mail className="h-3.5 w-3.5 text-text-muted shrink-0" />
                                        <span className="text-sm text-foreground truncate">{inv.email}</span>
                                        {inv.consultant_name && (
                                          <span className="text-[10px] text-text-muted">· {inv.consultant_name}</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_COLORS[inv.status] || ""}`}>
                                          {inv.status}
                                        </span>
                                        <span className="text-[10px] text-text-muted">
                                          {new Date(inv.created_at).toLocaleDateString("pt-PT")}
                                        </span>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setDeleteInviteTarget(inv); }}
                                          className="p-1 rounded hover:bg-status-negative/10 text-text-muted hover:text-status-negative transition-colors"
                                          title="Remover convidado"
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Expanded: per-invite consultant config */}
                                    {isInvExpanded && (
                                      <div className="px-3 pb-3 pt-1 bg-background/30 space-y-2" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center gap-2 text-[10px] font-semibold text-text-muted uppercase">
                                          <User className="h-3 w-3" /> Consultor deste cliente
                                        </div>
                                        <div className="flex items-center gap-3">
                                          {inv.consultant_photo_url ? (
                                            <img src={inv.consultant_photo_url} alt="Consultor" className="h-10 w-10 rounded-full object-cover border border-border-subtle" style={{ objectPosition: inv.consultant_photo_position || "center" }} />
                                          ) : (
                                            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-text-muted">
                                              <User className="h-5 w-5" />
                                            </div>
                                          )}
                                          <label className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border-subtle text-foreground text-xs font-medium hover:bg-surface-hover transition-colors cursor-pointer">
                                            {uploadingInvitePhoto === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                                            Foto
                                            <input
                                              type="file"
                                              accept="image/*"
                                              className="hidden"
                                              onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleInviteConsultantPhotoUpload(inv.id, file);
                                                e.target.value = "";
                                              }}
                                            />
                                          </label>
                                          {inv.consultant_photo_url && (
                                            <div className="flex items-center gap-1">
                                              <span className="text-[10px] text-text-muted mr-1">Posição:</span>
                                              {["top", "center", "bottom"].map((pos) => (
                                                <button
                                                  key={pos}
                                                  onClick={() => handleInviteConsultantFieldChange(inv.id, "consultant_photo_position", pos)}
                                                  className={`px-2 py-0.5 text-[10px] rounded-md border transition-colors ${
                                                    (inv.consultant_photo_position || "center") === pos
                                                      ? "bg-primary text-primary-foreground border-primary"
                                                      : "border-border-subtle text-text-muted hover:bg-surface-hover"
                                                  }`}
                                                >
                                                  {pos === "top" ? "Topo" : pos === "center" ? "Centro" : "Base"}
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                          <input
                                            placeholder="Nome do consultor"
                                            value={inv.consultant_name || ""}
                                            onBlur={(e) => handleInviteConsultantFieldChange(inv.id, "consultant_name", e.target.value)}
                                            onChange={(e) => setInvites((prev) => prev.map((i) => i.id === inv.id ? { ...i, consultant_name: e.target.value } : i))}
                                            className="px-3 py-1.5 text-xs bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                                          />
                                          <input
                                            placeholder="Telefone"
                                            value={inv.consultant_phone || ""}
                                            onBlur={(e) => handleInviteConsultantFieldChange(inv.id, "consultant_phone", e.target.value)}
                                            onChange={(e) => setInvites((prev) => prev.map((i) => i.id === inv.id ? { ...i, consultant_phone: e.target.value } : i))}
                                            className="px-3 py-1.5 text-xs bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                                          />
                                          <input
                                            placeholder="Email do consultor"
                                            value={inv.consultant_email || ""}
                                            onBlur={(e) => handleInviteConsultantFieldChange(inv.id, "consultant_email", e.target.value)}
                                            onChange={(e) => setInvites((prev) => prev.map((i) => i.id === inv.id ? { ...i, consultant_email: e.target.value } : i))}
                                            className="px-3 py-1.5 text-xs bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Client House Dashboard */}
                        {(() => {
                          const partnerClients = clientProfiles.filter(p => p.partner_id === partner.id);
                          if (partnerClients.length === 0) return null;
                          const currentYear = new Date().getFullYear();
                          const currentMonth = new Date().getMonth();
                          const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
                          const fmtVal = (v: number) => v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

                          return (
                            <div className="rounded-lg border border-border-subtle/60 overflow-hidden">
                              <div className="px-3 py-2 bg-surface border-b border-border-subtle/40 flex items-center gap-2">
                                <Home className="h-3.5 w-3.5 text-primary" />
                                <span className="text-xs font-semibold text-text-muted uppercase">Dashboard Clientes — Habitação</span>
                              </div>
                              <div className="divide-y divide-border-subtle/20">
                                {partnerClients.map(client => {
                                  const hd = clientHouseData.find(h => h.user_id === client.id);
                                  const paymentStatus = (hd?.monthly_payment_status || {}) as Record<string, string>;
                                  const paidCount = Object.values(paymentStatus).filter(s => s === "pago").length;
                                  const currentKey = `${currentYear}-${currentMonth}`;
                                  const currentSt = paymentStatus[currentKey] || "pendente";
                                  const ratio = hd && hd.monthly_payment > 0 && (hd as any).monthly_payment
                                    ? 0 : 0;

                                  return (
                                    <div key={client.id} className="px-3 py-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <div>
                                          <p className="text-sm font-semibold text-foreground">{client.full_name || client.email}</p>
                                          {client.full_name && <p className="text-xs text-text-muted">{client.email}</p>}
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                          currentSt === "pago" ? "bg-status-paid/10 text-status-paid" : "bg-yellow-500/10 text-yellow-500"
                                        }`}>
                                          {MONTHS[currentMonth]}: {currentSt === "pago" ? "Paga" : "Pendente"}
                                        </span>
                                      </div>
                                      {hd ? (
                                        <div className="space-y-2">
                                          <div className="grid grid-cols-3 gap-2 text-xs">
                                            <div className="bg-secondary rounded-lg p-2">
                                              <span className="text-text-muted block">Valor casa</span>
                                              <span className="font-semibold text-foreground font-mono">{fmtVal(hd.house_value)}</span>
                                            </div>
                                            <div className="bg-secondary rounded-lg p-2">
                                              <span className="text-text-muted block">Prestação</span>
                                              <span className="font-semibold text-foreground font-mono">{fmtVal(hd.monthly_payment)}</span>
                                            </div>
                                            <div className="bg-secondary rounded-lg p-2">
                                              <span className="text-text-muted block">Meses pagos</span>
                                              <span className="font-semibold text-status-paid">{paidCount}</span>
                                            </div>
                                          </div>
                                          {/* Mini month grid */}
                                          <div className="flex gap-1">
                                            {MONTHS.map((name, i) => {
                                              const key = `${currentYear}-${i}`;
                                              const st = paymentStatus[key];
                                              return (
                                                <div
                                                  key={i}
                                                  className={`flex-1 py-1 rounded text-[9px] text-center font-medium ${
                                                    st === "pago"
                                                      ? "bg-status-paid/15 text-status-paid"
                                                      : i <= currentMonth
                                                      ? "bg-yellow-500/10 text-yellow-500"
                                                      : "bg-secondary text-text-muted/50"
                                                  }`}
                                                  title={`${name}: ${st === "pago" ? "Paga" : "Pendente"}`}
                                                >
                                                  {name}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-xs text-text-muted italic">Sem dados de habitação preenchidos</p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Partner Dialog */}
      <Dialog open={showCreatePartner} onOpenChange={setShowCreatePartner}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Parceiro Imobiliário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Nome da imobiliária *</label>
              <input
                value={newPartner.name}
                onChange={(e) => setNewPartner((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Imobiliária XYZ"
                className="w-full px-3 py-2 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Email de contacto *</label>
              <input
                type="email"
                value={newPartner.email}
                onChange={(e) => setNewPartner((p) => ({ ...p, email: e.target.value }))}
                placeholder="contacto@imobiliaria.pt"
                className="w-full px-3 py-2 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Password de acesso</label>
              <input
                type="password"
                value={newPartner.password}
                onChange={(e) => setNewPartner((p) => ({ ...p, password: e.target.value }))}
                placeholder="Mínimo 6 caracteres (padrão: Partner2026!)"
                className="w-full px-3 py-2 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Limite de clientes</label>
                <input
                  type="number"
                  min={1}
                  value={newPartner.plan_limit}
                  onChange={(e) => setNewPartner((p) => ({ ...p, plan_limit: Number(e.target.value) || 25 }))}
                  className="w-full px-3 py-2 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Tipo de parceiro</label>
                <select
                  value={newPartner.plan_type}
                  onChange={(e) => setNewPartner((p) => ({ ...p, plan_type: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleCreatePartner}
              disabled={creating}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {creating ? "A criar..." : "Criar Parceiro"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog — with consultant fields */}
      <Dialog open={showInviteUser} onOpenChange={setShowInviteUser}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar Utilizador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-text-muted">
              O utilizador receberá acesso ao plano Imobiliária. Se já tiver conta, o plano é ativado imediatamente.
            </p>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Email do utilizador *</label>
              <input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="utilizador@email.com"
                className="w-full px-3 py-2 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="border-t border-border-subtle/40 pt-3">
              <p className="text-xs font-semibold text-text-muted uppercase mb-2 flex items-center gap-1.5">
                <User className="h-3 w-3" /> Consultor atribuído (opcional)
              </p>
              <div className="space-y-2">
                <input
                  value={inviteForm.consultant_name}
                  onChange={(e) => setInviteForm((f) => ({ ...f, consultant_name: e.target.value }))}
                  placeholder="Nome do consultor"
                  className="w-full px-3 py-2 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={inviteForm.consultant_phone}
                    onChange={(e) => setInviteForm((f) => ({ ...f, consultant_phone: e.target.value }))}
                    placeholder="Telefone"
                    className="w-full px-3 py-2 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <input
                    type="email"
                    value={inviteForm.consultant_email}
                    onChange={(e) => setInviteForm((f) => ({ ...f, consultant_email: e.target.value }))}
                    placeholder="Email do consultor"
                    className="w-full px-3 py-2 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={handleInviteUser}
              disabled={inviting}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {inviting ? "A enviar..." : "Enviar Convite"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Partner Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover parceiro?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao remover <strong>{deleteTarget?.name}</strong>, todos os convites serão eliminados e os utilizadores associados perderão o plano Imobiliária (revertidos para Essencial).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePartner}
              disabled={deleting}
              className="bg-status-negative text-white hover:bg-status-negative/90"
            >
              {deleting ? "A remover..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Invite Confirmation */}
      <AlertDialog open={!!deleteInviteTarget} onOpenChange={(open) => !open && setDeleteInviteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover convidado?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteInviteTarget?.status === "accepted"
                ? <>O utilizador <strong>{deleteInviteTarget?.email}</strong> perderá o plano Imobiliária e será revertido para Essencial.</>
                : <>O convite para <strong>{deleteInviteTarget?.email}</strong> será eliminado.</>
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInvite}
              disabled={deleting}
              className="bg-status-negative text-white hover:bg-status-negative/90"
            >
              {deleting ? "A remover..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPartners;
