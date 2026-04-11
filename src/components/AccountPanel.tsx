import { useState } from "react";
import { BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, KeyRound, LogOut, Mail, Pencil, Shield, UserRound, Check, X, ArrowUpRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const PLAN_LABELS: Record<string, string> = {
  essencial: "Essencial",
  casa: "Casa",
  pro: "Pro",
};

interface AccountPanelProps {
  onShowTour?: () => void;
}

const PLAN_PRICES: Record<string, number> = {
  essencial: 15.99,
  casa: 28.99,
  pro: 47.99,
};

const UPGRADE_DIFF: Record<string, Record<string, number>> = {
  essencial: { casa: 13.00, pro: 32.00 },
  casa: { pro: 19.00 },
};

const PLAN_ORDER = ["essencial", "casa", "pro"];

const AccountPanel = ({ onShowTour }: AccountPanelProps) => {
  const { user, profile, isAdmin, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [upgradingTo, setUpgradingTo] = useState<string | null>(null);

  if (!user || !profile) return null;

  const startedAt = profile.plan_started_at
    ? new Date(profile.plan_started_at).toLocaleDateString("pt-PT")
    : "—";
  const expiresAt = profile.plan_expires_at
    ? new Date(profile.plan_expires_at).toLocaleDateString("pt-PT")
    : "—";
  const expiryDate = profile.plan_expires_at ? new Date(profile.plan_expires_at) : null;
  const isActive = Boolean(expiryDate && expiryDate.getTime() > Date.now());
  const daysRemaining = expiryDate
    ? Math.max(Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 0)
    : null;

  const handleEditName = () => {
    setNameValue(profile.full_name || "");
    setEditingName(true);
  };

  const handleSaveName = async () => {
    const trimmed = nameValue.trim();
    if (!trimmed) {
      toast.error("O nome não pode estar vazio.");
      return;
    }
    if (trimmed.length > 100) {
      toast.error("O nome deve ter no máximo 100 caracteres.");
      return;
    }
    setSavingName(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: trimmed })
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      setEditingName(false);
      toast.success("Nome atualizado com sucesso.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar nome.");
    } finally {
      setSavingName(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("A password deve ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As passwords não coincidem.");
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setPassword("");
      setConfirmPassword("");
      toast.success("Password atualizada com sucesso.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar password.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleUpgrade = async (targetPlan: string) => {
    setUpgradingTo(targetPlan);
    try {
      const { data, error } = await supabase.functions.invoke("create-upgrade", {
        body: { target_plan: targetPlan },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Não foi possível criar a sessão de pagamento.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar upgrade.");
    } finally {
      setUpgradingTo(null);
    }
  };

  const currentPlanIdx = PLAN_ORDER.indexOf(profile.plan);
  const availableUpgrades = PLAN_ORDER.filter((_, i) => i > currentPlanIdx);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
          <span className="label-caps mb-2 block">Plano atual</span>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{PLAN_LABELS[profile.plan] || profile.plan}</p>
              <p className="text-sm text-text-muted">
                {isActive && daysRemaining !== null ? `${daysRemaining} dias restantes` : "Plano sem acesso ativo"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
          <span className="label-caps mb-2 block">Datas do plano</span>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-foreground"><span className="text-text-muted">Início:</span> {startedAt}</p>
              <p className="text-foreground"><span className="text-text-muted">Válido até:</span> {expiresAt}</p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
          <span className="label-caps mb-2 block">Estado da conta</span>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{profile.full_name || "Utilizador"}</p>
              <p className="text-sm text-text-muted">{isAdmin ? "Administrador" : "Conta standard"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade section */}
      {isActive && availableUpgrades.length > 0 && (
        <div className="bg-surface rounded-xl shadow-card border border-primary/20 p-5">
          <h2 className="text-lg font-semibold text-foreground mb-1">Fazer upgrade</h2>
          <p className="text-sm text-text-muted mb-4">
            Pague apenas a diferença para desbloquear mais funcionalidades.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableUpgrades.map((plan) => {
              const diff = UPGRADE_DIFF[profile.plan]?.[plan];
              if (!diff) return null;
              return (
                <div key={plan} className="rounded-xl border border-border-subtle/60 bg-background p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{PLAN_LABELS[plan]}</p>
                    <p className="text-xs text-text-muted">
                      +{diff.toFixed(2).replace(".", ",")}€ (diferença)
                    </p>
                  </div>
                  <button
                    onClick={() => handleUpgrade(plan)}
                    disabled={upgradingTo !== null}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {upgradingTo === plan ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                    Upgrade
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">Dados da conta</h2>

          <div className="space-y-4">
            <div className="rounded-xl bg-background border border-border-subtle/60 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <UserRound className="h-4 w-4 text-primary" />
                  Nome
                </div>
                {!editingName && (
                  <button onClick={handleEditName} className="text-text-muted hover:text-primary transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                    maxLength={100}
                    className="flex-1 text-sm bg-background border border-border-subtle rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button onClick={handleSaveName} disabled={savingName} className="text-primary hover:opacity-80 transition-opacity disabled:opacity-50">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditingName(false)} className="text-text-muted hover:text-foreground transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-text-muted">{profile.full_name || "Sem nome definido"}</p>
              )}
            </div>

            <div className="rounded-xl bg-background border border-border-subtle/60 p-4">
              <div className="flex items-center gap-2 mb-2 text-sm font-medium text-foreground">
                <Mail className="h-4 w-4 text-primary" />
                Email de acesso
              </div>
              <p className="text-sm text-text-muted break-all">{user.email}</p>
            </div>

            <div className="rounded-xl bg-background border border-border-subtle/60 p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-medium text-foreground">Estado do plano</p>
                  <p className="text-sm text-text-muted">{isActive ? "Acesso ativo" : "Acesso expirado"}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  isActive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                }`}>
                  {PLAN_LABELS[profile.plan] || profile.plan}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">Segurança</h2>

          <form onSubmit={handleUpdatePassword} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Nova password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                className="w-full px-3 py-2.5 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Confirmar password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
                className="w-full px-3 py-2.5 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={updatingPassword}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <KeyRound className="h-4 w-4" />
              {updatingPassword ? "A atualizar..." : "Atualizar password"}
            </button>
          </form>

          <p className="text-xs text-text-muted mt-3">
            Esta alteração é imediata e fica disponível no próximo login.
          </p>
        </section>
      </div>

      <div className="flex flex-wrap gap-3">
        {onShowTour && (
          <button
            onClick={onShowTour}
            className="px-4 py-2.5 rounded-lg border border-border-subtle text-foreground text-sm font-medium hover:bg-surface-hover transition-colors inline-flex items-center gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Rever guia do app
          </button>
        )}

        {!isActive && (
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Renovar plano
          </button>
        )}

        <button
          onClick={handleSignOut}
          className="px-4 py-2.5 rounded-lg border border-border-subtle text-foreground text-sm font-medium hover:bg-surface-hover transition-colors inline-flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Terminar sessão
        </button>
      </div>
    </div>
  );
};

export default AccountPanel;