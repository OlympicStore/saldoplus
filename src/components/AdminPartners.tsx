import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Building2, Plus, Mail, Users, Send, Loader2, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp, BarChart3,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Partner {
  id: string;
  name: string;
  email: string;
  plan_limit: number;
  plan_type: string;
  active: boolean;
  created_at: string;
}

interface Invite {
  id: string;
  email: string;
  partner_id: string;
  status: string;
  expires_at: string | null;
  created_at: string;
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

const AdminPartners = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePartner, setShowCreatePartner] = useState(false);
  const [showInviteUser, setShowInviteUser] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);

  const [newPartner, setNewPartner] = useState({ name: "", email: "", plan_limit: 25, plan_type: "starter" });
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [partnersRes, invitesRes] = await Promise.all([
      supabase.from("partners").select("*").order("created_at", { ascending: false }),
      supabase.from("partner_invites").select("*").order("created_at", { ascending: false }),
    ]);
    if (partnersRes.data) setPartners(partnersRes.data as Partner[]);
    if (invitesRes.data) setInvites(invitesRes.data as Invite[]);
    setLoading(false);
  };

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
      setNewPartner({ name: "", email: "", plan_limit: 25, plan_type: "starter" });
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar parceiro");
    } finally {
      setCreating(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail || !selectedPartnerId) {
      toast.error("Email é obrigatório");
      return;
    }
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-invite-partner-user", {
        body: { email: inviteEmail, partner_id: selectedPartnerId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(
        data?.user_existed
          ? `Plano ativado para ${inviteEmail}`
          : `Convite enviado para ${inviteEmail}`
      );
      setShowInviteUser(false);
      setInviteEmail("");
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

                        {/* Invites list */}
                        {pInvites.length > 0 && (
                          <div className="rounded-lg border border-border-subtle/60 overflow-hidden">
                            <div className="px-3 py-2 bg-surface border-b border-border-subtle/40">
                              <span className="text-xs font-semibold text-text-muted uppercase">Convites</span>
                            </div>
                            <div className="divide-y divide-border-subtle/20">
                              {pInvites.map((inv) => (
                                <div key={inv.id} className="px-3 py-2.5 flex items-center justify-between">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Mail className="h-3.5 w-3.5 text-text-muted shrink-0" />
                                    <span className="text-sm text-foreground truncate">{inv.email}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_COLORS[inv.status] || ""}`}>
                                      {inv.status}
                                    </span>
                                    <span className="text-[10px] text-text-muted">
                                      {new Date(inv.created_at).toLocaleDateString("pt-PT")}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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

      {/* Invite User Dialog */}
      <Dialog open={showInviteUser} onOpenChange={setShowInviteUser}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar Utilizador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-text-muted">
              O utilizador receberá acesso ao plano Casa Segura Plus. Se já tiver conta, o plano é ativado imediatamente.
            </p>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Email do utilizador *</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="utilizador@email.com"
                className="w-full px-3 py-2 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
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
    </div>
  );
};

export default AdminPartners;
