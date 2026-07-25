import { Home, ArrowLeftRight, Target, Menu, Plus } from "lucide-react";
import { motion } from "framer-motion";

type NavKey = "dashboard" | "expenses" | "assistente" | "goals" | "more";

interface BottomNavProps {
  activeTab: string;
  onNavigate: (tab: "dashboard" | "expenses" | "goals" | "assistente") => void;
  onOpenMore: () => void;
  allowedTabs: string[];
}

const items: { key: Exclude<NavKey, "assistente" | "more">; label: string; icon: typeof Home }[] = [
  { key: "dashboard", label: "Início", icon: Home },
  { key: "expenses", label: "Transações", icon: ArrowLeftRight },
  { key: "goals", label: "Objetivos", icon: Target },
];

export default function BottomNav({ activeTab, onNavigate, onOpenMore, allowedTabs }: BottomNavProps) {
  const canAssist = allowedTabs.includes("assistente");
  const isActive = (k: string) => activeTab === k;

  return (
    <>
      {/* spacer so page content isn't hidden behind fixed bar */}
      <div className="lg:hidden h-24" aria-hidden />

      <nav
        aria-label="Navegação principal"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 pointer-events-none"
      >
        <div className="pointer-events-auto mx-auto max-w-md px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
          <div className="relative bg-surface/95 backdrop-blur-xl border border-border-subtle/70 shadow-[0_8px_32px_-8px_rgba(15,23,42,0.15)] rounded-[28px] px-2 py-2">
            <div className="grid grid-cols-5 items-end">
              {/* Slot 1: Início */}
              <NavButton
                icon={Home}
                label="Início"
                active={isActive("dashboard")}
                onClick={() => onNavigate("dashboard")}
              />
              {/* Slot 2: Transações */}
              <NavButton
                icon={ArrowLeftRight}
                label="Transações"
                active={isActive("expenses") || isActive("entries")}
                onClick={() => onNavigate("expenses")}
              />
              {/* Slot 3: + (central, elevated) */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => canAssist && onNavigate("assistente")}
                  disabled={!canAssist}
                  className="relative -mt-8 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label={canAssist ? "Perguntar ao assistente" : "Assistente indisponível"}
                >
                  <Plus className="h-6 w-6" strokeWidth={2.5} />
                  {isActive("assistente") && (
                    <motion.span
                      layoutId="bottom-plus-ring"
                      className="absolute inset-0 rounded-full ring-2 ring-primary/40"
                    />
                  )}
                </button>
              </div>
              {/* Slot 4: Objetivos */}
              <NavButton
                icon={Target}
                label="Objetivos"
                active={isActive("goals")}
                onClick={() => onNavigate("goals")}
                disabled={!allowedTabs.includes("goals")}
              />
              {/* Slot 5: Mais */}
              <NavButton
                icon={Menu}
                label="Mais"
                active={false}
                onClick={onOpenMore}
              />
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

function NavButton({
  icon: Icon,
  label,
  active,
  onClick,
  disabled,
}: {
  icon: typeof Home;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col items-center gap-1 py-1.5 rounded-2xl transition-colors ${
        active ? "text-primary" : "text-text-muted hover:text-foreground"
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
      <span className={`text-[10px] leading-none ${active ? "font-semibold" : "font-medium"}`}>
        {label}
      </span>
      {active && (
        <motion.span
          layoutId="bottom-nav-dot"
          className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
    </button>
  );
}
