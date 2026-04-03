import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { User, LogOut, ChevronDown } from "lucide-react";

const PLAN_LABELS: Record<string, string> = {
  essencial: "Essencial",
  casa: "Casa",
  pro: "Pro",
};

const AccountDropdown = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const planLabel = profile ? PLAN_LABELS[profile.plan] || profile.plan : "—";
  const expiresAt = profile?.plan_expires_at
    ? new Date(profile.plan_expires_at).toLocaleDateString("pt-PT")
    : "—";
  const isActive = profile?.plan_expires_at && new Date(profile.plan_expires_at) > new Date();

  const handleOpenAccount = () => {
    navigate("/app?tab=account");
    setOpen(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-text-muted hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-surface-hover"
      >
        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs">
          {(profile?.full_name || user.email || "U").charAt(0).toUpperCase()}
        </div>
        <span className="hidden sm:inline max-w-[120px] truncate">
          {profile?.full_name || user.email}
        </span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 bg-surface rounded-xl border border-border-subtle/60 shadow-card z-50 overflow-hidden">
            {/* User info */}
            <div className="p-4 border-b border-border-subtle/60">
              <p className="text-sm font-medium text-foreground truncate">
                {profile?.full_name || "Utilizador"}
              </p>
              <p className="text-xs text-text-muted truncate">{user.email}</p>
            </div>

            {/* Plan info */}
            <div className="p-4 border-b border-border-subtle/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-text-muted">Plano</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isActive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                }`}>
                  {planLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Válido até</span>
                <span className="text-xs text-foreground">{expiresAt}</span>
              </div>
              {!isActive && (
                <button
                  onClick={() => { navigate("/"); setOpen(false); }}
                  className="mt-3 w-full text-xs py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                >
                  Renovar plano
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="p-2">
              <button
                onClick={handleOpenAccount}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-surface-hover rounded-lg transition-colors text-left"
              >
                <User className="h-4 w-4 text-text-muted" />
                Conta e segurança
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-destructive hover:bg-destructive/5 rounded-lg transition-colors text-left"
              >
                <LogOut className="h-4 w-4" />
                Terminar sessão
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AccountDropdown;
