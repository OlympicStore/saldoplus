import {
  Home, ArrowLeftRight, Target, Sparkles, Users, Briefcase,
  Receipt, User as UserIcon, Settings, ChevronRight, Tag, Shield, LogOut, Wallet, Building2,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { SubAccountSwitcher } from "@/components/SubAccountSwitcher";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

type Tab =
  | "dashboard" | "assistente" | "movements" | "goals"
  | "balance" | "annual" | "budgets" | "minha_casa" | "account";

interface AppSideMenuProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  activeTab: string;
  allowedTabs: string[];
  onNavigate: (tab: Tab) => void;
  onOpenCategories: () => void;
  onOpenPeopleEditor: () => void;
  onOpenCoupleMode: () => void;
}

type MenuItem = {
  key: string;
  label: string;
  icon: typeof Home;
  tab?: Tab;
  action?: () => void;
  requires?: Tab;
  disabled?: boolean;
  badge?: string;
  hint?: string;
};

export default function AppSideMenu({
  open, onOpenChange, activeTab, allowedTabs,
  onNavigate, onOpenCategories, onOpenPeopleEditor, onOpenCoupleMode,
}: AppSideMenuProps) {
  const { profile, isAdmin, signOut, partnerBranding } = useAuth();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const userPlan = profile?.plan || "essencial";
  const isPro = userPlan === "pro" || userPlan === "imobiliaria" || isAdmin;

  const getDisplayName = (fullName: string | null | undefined) => {
    if (!fullName) return "";
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 2) return fullName;
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };

  const isAllowed = (t?: Tab) => !t || allowedTabs.includes(t);

  const primary: MenuItem[] = [
    { key: "dashboard", label: "Início", icon: Home, tab: "dashboard", requires: "dashboard", hint: "Vista geral" },
    { key: "movements", label: "Movimentos", icon: ArrowLeftRight, tab: "movements", requires: "movements", hint: "Receitas e despesas" },
    { key: "goals", label: "Objetivos", icon: Target, tab: "goals", requires: "goals", hint: "Metas e score" },
    { key: "assistente", label: "Assistente IA", icon: Sparkles, tab: "assistente", requires: "assistente", hint: "Fala com a IA" },
  ];

  const contextual: MenuItem[] = [
    { key: "couple", label: "Modo Casal", icon: Users, action: onOpenCoupleMode, requires: "goals", hint: "Divisão entre pessoas" },
    { key: "business", label: "Empresa", icon: Briefcase, disabled: true, badge: "Em breve", hint: "Contabilidade separada" },
    { key: "annual", label: "Central de Contas", icon: Receipt, tab: "annual", requires: "annual", hint: "Contas recorrentes" },
    { key: "balance", label: "Saldo & Contas", icon: Wallet, tab: "balance", requires: "balance", hint: "Contas bancárias" },
    { key: "minha_casa", label: "Minha Casa", icon: Building2, tab: "minha_casa", requires: "minha_casa", hint: "Crédito habitação" },
  ];

  const account: MenuItem[] = [
    { key: "account", label: "Conta & Plano", icon: UserIcon, tab: "account", requires: "account", hint: "Perfil e faturação" },
  ];

  const renderItem = (item: MenuItem) => {
    if (item.requires && !isAllowed(item.requires)) return null;
    const Icon = item.icon;
    const active = item.tab && activeTab === item.tab;
    return (
      <button
        key={item.key}
        disabled={item.disabled}
        onClick={() => {
          if (item.disabled) return;
          if (item.tab) onNavigate(item.tab);
          if (item.action) item.action();
          onOpenChange(false);
        }}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium transition-colors ${
          active
            ? "bg-primary/10 text-primary"
            : item.disabled
              ? "text-text-muted opacity-50 cursor-not-allowed"
              : "text-text-secondary hover:bg-surface-hover hover:text-foreground"
        }`}
      >
        <span className={`h-9 w-9 rounded-xl flex items-center justify-center ${active ? "bg-primary/15" : "bg-background"}`}>
          <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-text-muted"}`} />
        </span>
        <span className="flex-1 text-left">
          <span className="block">{item.label}</span>
          {item.hint && <span className="block text-[11px] font-normal text-text-muted">{item.hint}</span>}
        </span>
        {item.badge ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-text-muted">{item.badge}</span>
        ) : (
          <ChevronRight className="h-4 w-4 text-text-muted" />
        )}
      </button>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[86vw] max-w-[360px] p-0 bg-surface border-l border-border-subtle/60 flex flex-col">
        <SheetHeader className="px-5 pt-6 pb-4 border-b border-border-subtle/60">
          <SheetTitle className="flex items-center gap-2 text-left">
            {partnerBranding?.brand_logo_url ? (
              <img src={partnerBranding.brand_logo_url} alt={partnerBranding.name} className="h-9 w-9 rounded-lg object-contain" />
            ) : null}
            <span className="text-2xl font-bold tracking-tight leading-none">
              <span className="text-foreground">Saldo</span>
              <span className="text-primary text-3xl font-black">+</span>
            </span>
          </SheetTitle>
          {profile && (
            <p className="text-[11px] text-text-muted text-left mt-1">
              {getDisplayName(profile.full_name) || profile.email} · <span className="capitalize font-medium text-primary">{profile.plan}</span>
            </p>
          )}
          {isPro && (
            <div className="mt-3">
              <SubAccountSwitcher />
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Principal</p>
          </div>
          <nav className="px-3 pb-2 space-y-1">{primary.map(renderItem)}</nav>

          <div className="px-5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Gestão</p>
          </div>
          <nav className="px-3 pb-2 space-y-1">{contextual.map(renderItem)}</nav>

          <div className="px-5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Conta</p>
          </div>
          <nav className="px-3 pb-2 space-y-1">{account.map(renderItem)}</nav>

          <div className="px-3 pt-2 pb-4">
            <button
              onClick={() => setSettingsOpen(v => !v)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium text-text-secondary hover:bg-surface-hover hover:text-foreground transition-colors"
            >
              <span className="h-9 w-9 rounded-xl bg-background flex items-center justify-center">
                <Settings className="h-4 w-4 text-text-muted" />
              </span>
              <span className="flex-1 text-left">Configurações</span>
              <ChevronRight className={`h-4 w-4 text-text-muted transition-transform ${settingsOpen ? "rotate-90" : ""}`} />
            </button>

            {settingsOpen && (
              <div className="mt-1 ml-3 pl-3 border-l border-border-subtle/60 space-y-1">
                <button
                  onClick={() => { onOpenCategories(); onOpenChange(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:bg-surface-hover hover:text-foreground transition-colors"
                >
                  <Tag className="h-4 w-4 text-text-muted" /> Categorias
                </button>
                <button
                  onClick={() => { onOpenPeopleEditor(); onOpenChange(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:bg-surface-hover hover:text-foreground transition-colors"
                >
                  <UserIcon className="h-4 w-4 text-text-muted" /> Nomes
                </button>
                {isAdmin && (
                  <button
                    onClick={() => { navigate("/admin"); onOpenChange(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
                  >
                    <Shield className="h-4 w-4 text-text-muted" /> Admin
                  </button>
                )}
                <button
                  onClick={() => { signOut(); onOpenChange(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:bg-surface-hover hover:text-status-negative transition-colors"
                >
                  <LogOut className="h-4 w-4 text-text-muted" /> Terminar sessão
                </button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
