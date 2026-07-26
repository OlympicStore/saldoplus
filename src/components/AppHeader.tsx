import { useState } from "react";
import { ChevronDown, Menu, User as UserIcon, Phone, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

interface AppHeaderProps {
  selectedMonth: number;
  selectedYear: number;
  years: number[];
  onMonthChange: (m: number) => void;
  onYearChange: (y: number) => void;
  onOpenMenu: () => void;
  onOpenProfile: () => void;
  onGoHome: () => void;
}

export default function AppHeader({
  selectedMonth, selectedYear, years,
  onMonthChange, onYearChange,
  onOpenMenu, onOpenProfile, onGoHome,
}: AppHeaderProps) {
  const { partnerBranding } = useAuth();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-surface/85 border-b border-border-subtle/60">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        {/* Left: brand */}
        <div className="flex items-center gap-2 min-w-0">
          {partnerBranding?.brand_logo_url && (
            <button onClick={onGoHome} aria-label="Ir para a Home" className="focus:outline-none focus:ring-2 focus:ring-primary rounded-lg">
              <img src={partnerBranding.brand_logo_url} alt={partnerBranding.name} className="h-8 w-8 rounded-lg object-contain" />
            </button>
          )}
          {partnerBranding?.consultant_photo_url && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="focus:outline-none focus:ring-2 focus:ring-primary rounded-full">
                  <img
                    src={partnerBranding.consultant_photo_url}
                    alt={partnerBranding.consultant_name || ""}
                    className="h-8 w-8 rounded-full object-cover border border-border-subtle"
                    style={{ objectPosition: partnerBranding.consultant_photo_position || "center" }}
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-4" align="start">
                <p className="font-semibold text-sm text-foreground mb-2">{partnerBranding.consultant_name}</p>
                {partnerBranding.consultant_phone && (
                  <a href={`tel:${partnerBranding.consultant_phone}`} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-sm text-foreground">
                    <Phone className="h-4 w-4 text-primary" />{partnerBranding.consultant_phone}
                  </a>
                )}
                {partnerBranding.consultant_email && (
                  <a href={`mailto:${partnerBranding.consultant_email}`} className="flex items-center gap-2 px-3 py-2 mt-1 rounded-lg bg-secondary text-sm text-foreground">
                    <Mail className="h-4 w-4 text-primary" /><span className="truncate">{partnerBranding.consultant_email}</span>
                  </a>
                )}
              </PopoverContent>
            </Popover>
          )}
          <button onClick={onGoHome} aria-label="Ir para a Home" className="focus:outline-none focus:ring-2 focus:ring-primary rounded">
            <span className="text-xl font-bold tracking-tight leading-none">
              <span className="text-foreground">Saldo</span>
              <span className="text-primary text-2xl font-black">+</span>
            </span>
          </button>
        </div>

        {/* Center: month/year picker */}
        <div className="relative" data-tour="month-selector">
          <button
            onClick={() => setPickerOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold text-foreground bg-background hover:bg-surface-hover border border-border-subtle/60 transition-colors capitalize"
          >
            <span className="hidden xs:inline">{MONTH_NAMES[selectedMonth]}</span>
            <span className="xs:hidden">{MONTH_NAMES[selectedMonth].slice(0,3)}</span>
            <span>{selectedYear}</span>
            <ChevronDown className={`h-3.5 w-3.5 text-text-muted transition-transform ${pickerOpen ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence>
            {pickerOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 bg-surface rounded-2xl shadow-card border border-border-subtle/60 p-4 w-[280px]"
                >
                  <div className="flex items-center justify-center gap-2 mb-3">
                    {years.map(y => (
                      <button key={y} onClick={() => onYearChange(y)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          selectedYear === y ? "bg-primary text-primary-foreground" : "text-text-muted hover:bg-surface-hover"
                        }`}>
                        {y}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {MONTH_NAMES.map((name, i) => (
                      <button key={i}
                        onClick={() => { onMonthChange(i); setPickerOpen(false); }}
                        className={`px-2 py-2 rounded-xl text-xs font-medium transition-colors ${
                          selectedMonth === i
                            ? "bg-primary text-primary-foreground"
                            : "text-text-secondary hover:bg-surface-hover"
                        }`}>
                        {name.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Right: profile + menu */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenProfile}
            aria-label="Perfil"
            className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-background border border-border-subtle/60 hover:bg-surface-hover text-foreground transition-colors"
          >
            <UserIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onOpenMenu}
            aria-label="Abrir menu"
            className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-background border border-border-subtle/60 hover:bg-surface-hover text-foreground transition-colors"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
