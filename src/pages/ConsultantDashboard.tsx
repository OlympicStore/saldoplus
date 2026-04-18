import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Users, ChevronDown, ChevronUp, Home, UserPlus, UserMinus, Pencil, X, Check, Camera,
  TrendingUp, TrendingDown, Minus as MinusIcon, Search, Eye, EyeOff, Loader2, Plus,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ConsultantRecord {
  id: string;
  partner_id: string;
  name: string;
  phone: string | null;
  email: string;
  photo_url: string | null;
  photo_position: string | null;
}

interface ClientProfile {
  id: string;
  email: string;
  full_name: string | null;
  plan: string;
  plan_expires_at: string | null;
  created_at: string;
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

  // Add client
  const [showAddClient, setShowAddClient] = useState(false);
  const [addClientMode, setAddClientMode] = useState<"invite" | "create">("invite");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [addingClient, setAddingClient] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [createClientForm, setCreateClientForm] = useState({
    full_name: "", email: "", phone: "", password: "",
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);

  const handleCreateClientDirect = async () => {
    if (!createClientForm.full_name || !createClientForm.email || !createClientForm.password) {
      toast.error("Nome, email e password são obrigatórios");
      return;
    }
    if (createClientForm.password.length < 6) {
      toast.error("Password deve ter pelo menos 6 caracteres");
      return;
    }
    setCreatingClient(true);
    try {
      const { data, error } = await supabase.functions.invoke("partner-create-client", {
        body: {
          email: createClientForm.email,
          password: createClientForm.password,
          full_name: createClientForm.full_name,
          phone: createClientForm.phone || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Cliente ${createClientForm.full_name} criado com sucesso`);
      setShowAddClient(false);
      setCreateClientForm({ full_name: "", email: "", phone: "", password: "" });
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar cliente");
    } finally {
      setCreatingClient(false);
    }
  };

  // Profile editing
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Month comparison
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: consultantData } = await supabase
        .from("partner_consultants")
        .select("*")
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle();

      if (!consultantData) { setLoading(false); return; }
      const c = consultantData as ConsultantRecord;
      setConsultant(c);
      setEditName(c.name);
      setEditPhone(c.phone || "");

      const { data: partnerData } = await supabase
        .from("partners")
        .select("name, brand_logo_url, brand_color")
        .eq("id", c.partner_id)
        .single();
      if (partnerData) setPartner(partnerData as PartnerInfo);

      const { data: invites } = await supabase
        .from("partner_invites")
        .select("email")
        .eq("consultant_id", c.id)
        .eq("status", "accepted");

      const emails = (invites || []).map((i: any) => i.email);
      if (emails.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, email, full_name, plan, plan_expires_at, created_at")
          .in("email", emails);
        if (profilesData) setClients(profilesData as ClientProfile[]);

        const ids = (profilesData || []).map((p: any) => p.id);
        if (ids.length > 0) {
          const { data: hData } = await supabase
            .from("house_data")
            .select("user_id, house_value, monthly_payment, monthly_income, monthly_payment_status, down_payment")
            .in("user_id", ids);
          if (hData) setHouseData(hData as ClientHouseData[]);
        }
      } else {
        setClients([]);
        setHouseData([]);
      }
    } catch {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  // --- Add client (create invite) ---
  const handleAddClient = async () => {
    if (!consultant || !newClientEmail.trim()) return;
    setAddingClient(true);
    try {
      // Check if invite already exists
      const { data: existing } = await supabase
        .from("partner_invites")
        .select("id")
        .eq("email", newClientEmail.trim().toLowerCase())
        .eq("partner_id", consultant.partner_id)
        .maybeSingle();

      if (existing) {
        // Just update consultant_id
        await supabase
          .from("partner_invites")
          .update({ consultant_id: consultant.id })
          .eq("id", existing.id);
        toast.success("Cliente atribuído com sucesso");
      } else {
        // Create new invite
        const { error } = await supabase.from("partner_invites").insert({
          email: newClientEmail.trim().toLowerCase(),
          partner_id: consultant.partner_id,
          consultant_id: consultant.id,
          status: "pending",
        });
        if (error) throw error;
        toast.success("Convite enviado com sucesso");
      }
      setNewClientEmail("");
      setShowAddClient(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao adicionar cliente");
    } finally {
      setAddingClient(false);
    }
  };

  // --- Remove client (unassign consultant from invite) ---
  const handleRemoveClient = async (clientEmail: string) => {
    if (!consultant) return;
    if (!confirm(`Remover ${clientEmail} da sua lista de clientes?`)) return;
    try {
      await supabase
        .from("partner_invites")
        .update({ consultant_id: null })
        .eq("email", clientEmail)
        .eq("consultant_id", consultant.id);
      toast.success("Cliente removido");
      await loadData();
    } catch {
      toast.error("Erro ao remover cliente");
    }
  };

  // --- Save profile ---
  const handleSaveProfile = async () => {
    if (!consultant) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("partner_consultants")
        .update({ name: editName.trim(), phone: editPhone.trim() || null })
        .eq("id", consultant.id);
      if (error) throw error;
      setConsultant({ ...consultant, name: editName.trim(), phone: editPhone.trim() || null });
      setEditingProfile(false);
      toast.success("Perfil atualizado");
    } catch {
      toast.error("Erro ao atualizar perfil");
    } finally {
      setSavingProfile(false);
    }
  };

  // --- Photo upload ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!consultant || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const ext = file.name.split(".").pop();
    const path = `consultants/${consultant.id}.${ext}`;
    try {
      const { error: uploadError } = await supabase.storage.from("partner-logos").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("partner-logos").getPublicUrl(path);
      const photo_url = urlData.publicUrl + "?t=" + Date.now();
      await supabase.from("partner_consultants").update({ photo_url }).eq("id", consultant.id);
      setConsultant({ ...consultant, photo_url });
      toast.success("Foto atualizada");
    } catch {
      toast.error("Erro ao enviar foto");
    }
  };

  // --- Month comparison chart data ---
  const getMonthLabel = (m: number) => {
    const labels = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    return labels[m - 1] || "";
  };
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  const clientsThisMonth = clients.filter(c => {
    const d = new Date(c.created_at);
    return d.getMonth() + 1 <= currentMonth && d.getFullYear() <= currentYear;
  }).length;

  const clientsPrevMonth = clients.filter(c => {
    const d = new Date(c.created_at);
    return d.getMonth() + 1 <= prevMonth && d.getFullYear() <= prevYear;
  }).length;

  const chartData = [
    { name: getMonthLabel(prevMonth), clientes: clientsPrevMonth },
    { name: getMonthLabel(currentMonth), clientes: clientsThisMonth },
  ];

  const diff = clientsThisMonth - clientsPrevMonth;
  const TrendIcon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : MinusIcon;
  const trendColor = diff > 0 ? "text-status-paid" : diff < 0 ? "text-status-negative" : "text-text-muted";

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

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Card */}
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="label-caps">O Meu Perfil</span>
            {!editingProfile ? (
              <button onClick={() => setEditingProfile(true)} className="text-xs text-primary flex items-center gap-1 hover:underline">
                <Pencil className="h-3 w-3" /> Editar
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditingProfile(false)} className="text-xs text-text-muted hover:text-foreground"><X className="h-4 w-4" /></button>
                <button onClick={handleSaveProfile} disabled={savingProfile} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Check className="h-3 w-3" /> Guardar
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center">
                {consultant.photo_url ? (
                  <img src={consultant.photo_url} alt="" className="w-full h-full object-cover" style={{ objectPosition: consultant.photo_position || "center" }} />
                ) : (
                  <span className="text-xl font-bold text-primary">{consultant.name.charAt(0)}</span>
                )}
              </div>
              {editingProfile && (
                <button onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Camera className="h-3 w-3" />
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
            <div className="flex-1 min-w-0">
              {editingProfile ? (
                <div className="space-y-2">
                  <input value={editName} onChange={e => setEditName(e.target.value)}
                    className="w-full bg-background border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-foreground"
                    placeholder="Nome" />
                  <input value={consultant.email} disabled
                    className="w-full bg-background border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-muted cursor-not-allowed"
                    placeholder="Email" />
                  <input value={editPhone} onChange={e => setEditPhone(e.target.value)}
                    className="w-full bg-background border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-foreground"
                    placeholder="Telefone" />
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold text-foreground">{consultant.name}</p>
                  <p className="text-xs text-text-muted">{consultant.email}</p>
                  {consultant.phone && <p className="text-xs text-text-muted">{consultant.phone}</p>}
                </>
              )}
            </div>
          </div>

          {editingProfile && consultant.photo_url && (
            <div className="mt-5 pt-5 border-t border-border-subtle/60">
              <p className="label-caps mb-3">Enquadramento da foto</p>
              <div className="flex items-start gap-4">
                <div className="grid grid-cols-3 gap-1.5 w-fit">
                  {[
                    { pos: "left top", label: "↖" },
                    { pos: "center top", label: "↑" },
                    { pos: "right top", label: "↗" },
                    { pos: "left center", label: "←" },
                    { pos: "center center", label: "•" },
                    { pos: "right center", label: "→" },
                    { pos: "left bottom", label: "↙" },
                    { pos: "center bottom", label: "↓" },
                    { pos: "right bottom", label: "↘" },
                  ].map(({ pos, label }) => {
                    const current = consultant.photo_position || "center center";
                    const isActive = current === pos || (pos === "center center" && current === "center");
                    return (
                      <button
                        key={pos}
                        type="button"
                        onClick={async () => {
                          await supabase.from("partner_consultants").update({ photo_position: pos }).eq("id", consultant.id);
                          setConsultant({ ...consultant, photo_position: pos });
                          toast.success("Enquadramento atualizado");
                        }}
                        className={`w-8 h-8 rounded-md text-xs font-medium border transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-text-muted border-border-subtle hover:bg-surface-hover hover:text-foreground"
                        }`}
                        aria-label={`Posição ${pos}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-text-muted mb-2">Pré-visualização</p>
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-border-subtle">
                    <img
                      src={consultant.photo_url}
                      alt=""
                      className="w-full h-full object-cover"
                      style={{ objectPosition: consultant.photo_position || "center" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats + Chart */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="label-caps">Clientes Ativos</p>
              <TrendIcon className={`h-4 w-4 ${trendColor}`} />
            </div>
            <p className="text-3xl font-bold text-foreground">{clientsThisMonth}</p>
            <p className="text-xs text-text-muted mt-1">
              {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : "Igual"} vs {getMonthLabel(prevMonth)}
            </p>
          </div>
          <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
            <p className="label-caps mb-3">Comparação Mensal</p>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={32}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [`${v} clientes`, ""]} />
                  <Bar dataKey="clientes" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={i === 1 ? "hsl(var(--primary))" : "hsl(var(--muted))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Clients List */}
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 overflow-hidden">
          <div className="p-4 border-b border-border-subtle/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="label-caps">Meus Clientes ({clients.length})</span>
            </div>
            <button onClick={() => setShowAddClient(!showAddClient)}
              className="text-xs text-primary flex items-center gap-1 hover:underline">
              <UserPlus className="h-3.5 w-3.5" /> Adicionar
            </button>
          </div>

          {/* Search */}
          {clients.length > 0 && (
            <div className="px-4 py-3 border-b border-border-subtle/40">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar por nome ou email..."
                  className="w-full bg-background border border-border-subtle rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-text-muted"
                />
              </div>
            </div>
          )}

          {/* Add client form */}
          {showAddClient && (
            <div className="px-4 py-3 border-b border-border-subtle/40 bg-background space-y-3">
              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg">
                <button
                  onClick={() => setAddClientMode("invite")}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    addClientMode === "invite" ? "bg-surface text-foreground shadow-sm" : "text-text-muted hover:text-foreground"
                  }`}
                >
                  Convidar por Email
                </button>
                <button
                  onClick={() => setAddClientMode("create")}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    addClientMode === "create" ? "bg-surface text-foreground shadow-sm" : "text-text-muted hover:text-foreground"
                  }`}
                >
                  Criar Diretamente
                </button>
              </div>

              {addClientMode === "invite" ? (
                <div className="flex gap-2">
                  <input
                    value={newClientEmail}
                    onChange={e => setNewClientEmail(e.target.value)}
                    placeholder="Email do cliente"
                    className="flex-1 bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-text-muted"
                    onKeyDown={e => e.key === "Enter" && handleAddClient()}
                  />
                  <button onClick={handleAddClient} disabled={addingClient || !newClientEmail.trim()}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                    {addingClient ? "..." : "Adicionar"}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input value={createClientForm.full_name}
                    onChange={e => setCreateClientForm(p => ({ ...p, full_name: e.target.value }))}
                    placeholder="Nome completo *"
                    className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-text-muted" />
                  <input type="email" value={createClientForm.email}
                    onChange={e => setCreateClientForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="Email *"
                    className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-text-muted" />
                  <input value={createClientForm.phone}
                    onChange={e => setCreateClientForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="Contacto"
                    className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-text-muted" />
                  <div className="relative">
                    <input type={showCreatePassword ? "text" : "password"} value={createClientForm.password}
                      onChange={e => setCreateClientForm(p => ({ ...p, password: e.target.value }))}
                      placeholder="Password (mín. 6 caracteres) *"
                      className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 pr-10 text-sm text-foreground placeholder:text-text-muted" />
                    <button type="button" onClick={() => setShowCreatePassword(!showCreatePassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-foreground">
                      {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-text-muted">
                    A conta é criada sem verificação de email. O cliente pode alterar dados ao iniciar sessão.
                  </p>
                  <button onClick={handleCreateClientDirect} disabled={creatingClient}
                    className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                    {creatingClient ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {creatingClient ? "A criar..." : "Criar Cliente"}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="divide-y divide-border-subtle/40">
            {clients.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-text-muted">
                Ainda não tem clientes atribuídos.
              </div>
            ) : (() => {
              const q = searchQuery.toLowerCase().trim();
              const filtered = q
                ? clients.filter(c =>
                    (c.full_name || "").toLowerCase().includes(q) ||
                    c.email.toLowerCase().includes(q)
                  )
                : clients;
              
              if (filtered.length === 0) {
                return (
                  <div className="px-5 py-8 text-center text-sm text-text-muted">
                    Nenhum cliente encontrado para "{searchQuery}"
                  </div>
                );
              }

              return filtered.map((client) => {
                const isExpanded = expandedClient === client.id;
                const house = houseData.find(h => h.user_id === client.id);
                const paymentStats = house ? getPaymentStats(house.monthly_payment_status) : null;
                const ratio = house && house.monthly_income > 0
                  ? ((house.monthly_payment / house.monthly_income) * 100) : null;

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
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-background rounded-lg p-3">
                            <p className="text-[10px] text-text-muted uppercase">Plano</p>
                            <p className="text-sm font-semibold text-foreground capitalize">{client.plan}</p>
                          </div>
                          <div className="bg-background rounded-lg p-3">
                            <p className="text-[10px] text-text-muted uppercase">Expira</p>
                            <p className="text-sm font-mono text-foreground">
                              {client.plan_expires_at ? new Date(client.plan_expires_at).toLocaleDateString("pt-PT") : "—"}
                            </p>
                          </div>
                        </div>

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

                        <div className="flex justify-end">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRemoveClient(client.email); }}
                            className="text-xs text-status-negative flex items-center gap-1 hover:underline"
                          >
                            <UserMinus className="h-3.5 w-3.5" /> Remover cliente
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ConsultantDashboard;
