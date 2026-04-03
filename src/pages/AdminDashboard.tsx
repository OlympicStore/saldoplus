import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users, Crown, TrendingUp, ArrowLeft, Search,
  ChevronUp, ChevronDown, Shield, Calendar, Mail, Plus, X,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Plan = "essencial" | "casa" | "pro";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  plan: Plan;
  created_at: string;
  plan_started_at: string | null;
  plan_expires_at: string | null;
}

interface Stats {
  total_users: number;
  by_plan: Record<string, number>;
  recent_users: UserProfile[] | null;
}

const PLAN_COLORS: Record<Plan, string> = {
  essencial: "bg-secondary text-foreground",
  casa: "bg-[hsl(var(--accent)/0.15)] text-accent",
  pro: "bg-[hsl(var(--status-paid)/0.15)] text-status-paid",
};

const PLAN_ORDER: Plan[] = ["essencial", "casa", "pro"];

const fmt = (v: number) => `€ ${v.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;
const PLAN_PRICES: Record<Plan, number> = { essencial: 0, casa: 4.99, pro: 9.99 };

const AdminDashboard = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: "", email: "", password: "", plan: "essencial" as Plan });

  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
      return;
    }
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    const [statsRes, usersRes] = await Promise.all([
      supabase.rpc("get_admin_stats"),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    ]);
    if (statsRes.data) setStats(statsRes.data as unknown as Stats);
    if (usersRes.data) setUsers(usersRes.data as UserProfile[]);
    setLoading(false);
  };

  const changePlan = async (userId: string, newPlan: Plan) => {
    setUpdatingUser(userId);
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    expiresAt.setDate(expiresAt.getDate() - 1);

    const updateData: Record<string, unknown> = { plan: newPlan };
    if (newPlan !== "essencial") {
      updateData.plan_started_at = now.toISOString();
      updateData.plan_expires_at = expiresAt.toISOString();
    } else {
      updateData.plan_started_at = null;
      updateData.plan_expires_at = null;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId);
    if (error) {
      toast.error("Erro ao atualizar plano");
    } else {
      toast.success(`Plano atualizado para ${newPlan} (válido até ${newPlan !== "essencial" ? expiresAt.toLocaleDateString("pt-PT") : "—"})`);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, plan: newPlan, plan_started_at: newPlan !== "essencial" ? now.toISOString() : null, plan_expires_at: newPlan !== "essencial" ? expiresAt.toISOString() : null } : u)));
      const { data } = await supabase.rpc("get_admin_stats");
      if (data) setStats(data as unknown as Stats);
    }
    setUpdatingUser(null);
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast.error("Email e password são obrigatórios");
      return;
    }
    if (newUser.password.length < 6) {
      toast.error("Password deve ter pelo menos 6 caracteres");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: newUser,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Utilizador ${newUser.email} criado com sucesso`);
      setShowCreateModal(false);
      setNewUser({ full_name: "", email: "", password: "", plan: "essencial" });
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar utilizador");
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.full_name && u.full_name.toLowerCase().includes(q)) ||
        u.plan.includes(q)
    );
  }, [users, search]);

  const estimatedRevenue = useMemo(() => {
    return users.reduce((sum, u) => sum + PLAN_PRICES[u.plan], 0);
  }, [users]);

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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-text-muted hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h1 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">Painel Administrativo</h1>
            </div>
          </div>
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Adicionar
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="label-caps">Total Utilizadores</span>
            </div>
            <p className="text-3xl font-semibold text-foreground">{stats?.total_users ?? 0}</p>
          </motion.div>

          {PLAN_ORDER.map((plan, i) => (
            <motion.div key={plan} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (i + 1) * 0.05 }}
              className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-4 w-4 text-primary" />
                <span className="label-caps capitalize">{plan}</span>
              </div>
              <p className="text-3xl font-semibold text-foreground">{stats?.by_plan?.[plan] ?? 0}</p>
            </motion.div>
          ))}
        </div>

        {/* Revenue Card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-status-paid" />
                <span className="label-caps">Receita Mensal Estimada</span>
              </div>
              <p className="text-3xl font-semibold text-status-paid font-mono tabular-nums">{fmt(estimatedRevenue)}</p>
            </div>
            <div className="text-right text-xs text-text-muted space-y-1">
              {PLAN_ORDER.filter((p) => PLAN_PRICES[p] > 0).map((plan) => (
                <p key={plan}>{stats?.by_plan?.[plan] ?? 0}× {plan} = {fmt((stats?.by_plan?.[plan] ?? 0) * PLAN_PRICES[plan])}</p>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Users Table */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-surface rounded-xl shadow-card border border-border-subtle/60 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border-subtle/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="label-caps">Todos os Utilizadores ({filteredUsers.length})</span>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por nome, email ou plano..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle/40">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Utilizador</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Plano</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Validade</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Registado em</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isExpired = u.plan_expires_at && new Date(u.plan_expires_at) < new Date();
                  return (
                  <tr key={u.id} className="border-b border-border-subtle/20 hover:bg-surface-hover transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-foreground">{u.full_name || "—"}</p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-text-muted" />
                        <span className="text-sm text-text-muted">{u.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${PLAN_COLORS[u.plan]}`}>
                        {u.plan}
                      </span>
                      {isExpired && <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[hsl(var(--status-negative)/0.15)] text-status-negative">Expirado</span>}
                    </td>
                    <td className="px-5 py-3">
                      {u.plan_expires_at ? (
                        <span className={`text-sm ${isExpired ? "text-status-negative font-semibold" : "text-text-muted"}`}>
                          {new Date(u.plan_expires_at).toLocaleDateString("pt-PT")}
                        </span>
                      ) : (
                        <span className="text-sm text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-text-muted" />
                        <span className="text-sm text-text-muted">{new Date(u.created_at).toLocaleDateString("pt-PT")}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          disabled={updatingUser === u.id || PLAN_ORDER.indexOf(u.plan) === PLAN_ORDER.length - 1}
                          onClick={() => changePlan(u.id, PLAN_ORDER[PLAN_ORDER.indexOf(u.plan) + 1])}
                          className="p-1.5 rounded-lg text-text-muted hover:text-status-paid hover:bg-[hsl(var(--status-paid)/0.1)] transition-colors disabled:opacity-30"
                          title="Upgrade"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          disabled={updatingUser === u.id || PLAN_ORDER.indexOf(u.plan) === 0}
                          onClick={() => changePlan(u.id, PLAN_ORDER[PLAN_ORDER.indexOf(u.plan) - 1])}
                          className="p-1.5 rounded-lg text-text-muted hover:text-status-negative hover:bg-[hsl(var(--status-negative)/0.1)] transition-colors disabled:opacity-30"
                          title="Downgrade"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden divide-y divide-border-subtle/40">
            {filteredUsers.map((u) => (
              <div key={u.id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{u.full_name || "—"}</p>
                    <p className="text-xs text-text-muted truncate">{u.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${PLAN_COLORS[u.plan]}`}>
                      {u.plan}
                    </span>
                    {u.plan_expires_at && new Date(u.plan_expires_at) < new Date() && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[hsl(var(--status-negative)/0.15)] text-status-negative">Expirado</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs text-text-muted">{new Date(u.created_at).toLocaleDateString("pt-PT")}</span>
                    {u.plan_expires_at && (
                      <span className="text-[10px] text-text-muted">Válido até: {new Date(u.plan_expires_at).toLocaleDateString("pt-PT")}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={updatingUser === u.id || PLAN_ORDER.indexOf(u.plan) === PLAN_ORDER.length - 1}
                      onClick={() => changePlan(u.id, PLAN_ORDER[PLAN_ORDER.indexOf(u.plan) + 1])}
                      className="p-1.5 rounded-lg text-text-muted hover:text-status-paid transition-colors disabled:opacity-30"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      disabled={updatingUser === u.id || PLAN_ORDER.indexOf(u.plan) === 0}
                      onClick={() => changePlan(u.id, PLAN_ORDER[PLAN_ORDER.indexOf(u.plan) - 1])}
                      className="p-1.5 rounded-lg text-text-muted hover:text-status-negative transition-colors disabled:opacity-30"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-text-muted">
              Nenhum utilizador encontrado.
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default AdminDashboard;
