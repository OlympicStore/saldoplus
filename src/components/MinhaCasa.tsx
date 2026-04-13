import { useState, useEffect, useMemo } from "react";
import { Home, TrendingUp, AlertTriangle, ShieldCheck, Loader2, MessageCircle, Phone, Mail, CheckCircle2, Clock, Plus, X, PieChart, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ExtraExpense {
  name: string;
  value: number;
}

interface HouseData {
  id?: string;
  house_value: number;
  monthly_payment: number;
  estimated_expenses: number;
  monthly_income: number;
  down_payment: number;
  extra_expenses: ExtraExpense[];
  monthly_payment_status: Record<string, string>;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const MinhaCasa = ({ onSave }: { onSave?: () => Promise<void> }) => {
  const { user, profile, partnerBranding } = useAuth();
  const [data, setData] = useState<HouseData>({
    house_value: 0,
    monthly_payment: 0,
    estimated_expenses: 0,
    monthly_income: 0,
    down_payment: 0,
    extra_expenses: [],
    monthly_payment_status: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stressExtra, setStressExtra] = useState(0);
  const [activeSection, setActiveSection] = useState<"esforco" | "progresso">("esforco");
  const [newExpenseName, setNewExpenseName] = useState("");
  const [newExpenseValue, setNewExpenseValue] = useState("");

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const statusKey = `${currentYear}-${currentMonth}`;

  // Determine plan start month to disable earlier months
  const planStartDate = profile?.plan_started_at ? new Date(profile.plan_started_at) : null;
  const planStartYear = planStartDate ? planStartDate.getFullYear() : currentYear;
  const planStartMonth = planStartDate ? planStartDate.getMonth() : currentMonth;

  const isMonthActive = (year: number, month: number) => {
    if (!planStartDate) return month <= currentMonth;
    if (year < planStartYear) return false;
    if (year === planStartYear && month < planStartMonth) return false;
    return true;
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: row } = await supabase
        .from("house_data")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (row) {
        setData({
          id: row.id,
          house_value: Number(row.house_value) || 0,
          monthly_payment: Number(row.monthly_payment) || 0,
          estimated_expenses: Number(row.estimated_expenses) || 0,
          monthly_income: Number(row.monthly_income) || 0,
          down_payment: Number((row as any).down_payment) || 0,
          extra_expenses: ((row as any).extra_expenses as ExtraExpense[]) || [],
          monthly_payment_status: (row as any).monthly_payment_status || {},
        });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  // Sync fixed expense + extra expenses to fixed_expenses table
  const syncFixedExpenses = async () => {
    if (!user) return;

    // 1. Sync "Prestação Casa"
    const { data: existingPrestacao } = await supabase
      .from("fixed_expenses")
      .select("id, monthly_values, monthly_paid")
      .eq("user_id", user.id)
      .eq("item", "Prestação Casa")
      .maybeSingle();

    const monthlyValues: Record<string, number> = {};
    const monthlyPaid: Record<string, boolean> = {};
    const years = new Set<number>();
    for (const key of Object.keys(data.monthly_payment_status)) {
      years.add(Number(key.split("-")[0]));
    }
    years.add(currentYear);

    for (const year of years) {
      for (let m = 0; m < 12; m++) {
        if (!isMonthActive(year, m)) continue;
        const compositeKey = year * 100 + m;
        const sk = `${year}-${m}`;
        monthlyValues[compositeKey] = data.monthly_payment;
        monthlyPaid[compositeKey] = data.monthly_payment_status[sk] === "pago";
      }
    }

    if (existingPrestacao) {
      const ev = (existingPrestacao.monthly_values as Record<string, number>) || {};
      const ep = (existingPrestacao.monthly_paid as Record<string, boolean>) || {};
      await supabase
        .from("fixed_expenses")
        .update({ monthly_values: { ...ev, ...monthlyValues }, monthly_paid: { ...ep, ...monthlyPaid } })
        .eq("id", existingPrestacao.id);
    } else {
      await supabase
        .from("fixed_expenses")
        .insert({
          user_id: user.id, item: "Prestação Casa", due_day: 1, account: "",
          monthly_values: monthlyValues, monthly_responsible: {}, monthly_paid: monthlyPaid,
        });
    }

    // 2. Sync each extra expense as a fixed expense
    for (const extra of data.extra_expenses) {
      if (!extra.name || extra.value <= 0) continue;
      const { data: existingExtra } = await supabase
        .from("fixed_expenses")
        .select("id, monthly_values")
        .eq("user_id", user.id)
        .eq("item", extra.name)
        .maybeSingle();

      const extraValues: Record<string, number> = {};
      const extraPaid: Record<string, boolean> = {};
      for (const year of years) {
        for (let m = 0; m < 12; m++) {
          if (!isMonthActive(year, m)) continue;
          extraValues[year * 100 + m] = extra.value;
          extraPaid[year * 100 + m] = false;
        }
      }

      if (existingExtra) {
        const ev = (existingExtra.monthly_values as Record<string, number>) || {};
        await supabase
          .from("fixed_expenses")
          .update({ monthly_values: { ...ev, ...extraValues } })
          .eq("id", existingExtra.id);
      } else {
        await supabase
          .from("fixed_expenses")
          .insert({
            user_id: user.id, item: extra.name, due_day: 1, account: "",
            monthly_values: extraValues, monthly_responsible: {}, monthly_paid: extraPaid,
          });
      }
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        house_value: data.house_value,
        monthly_payment: data.monthly_payment,
        estimated_expenses: data.estimated_expenses,
        monthly_income: data.monthly_income,
        down_payment: data.down_payment,
        extra_expenses: data.extra_expenses as any,
        monthly_payment_status: data.monthly_payment_status as any,
      };

      if (data.id) {
        const { error } = await supabase.from("house_data").update(payload as any).eq("id", data.id);
        if (error) throw error;
      } else {
        const { data: row, error } = await supabase.from("house_data").insert({ ...payload, user_id: user.id } as any).select().single();
        if (error) throw error;
        setData((prev) => ({ ...prev, id: row.id }));
      }

      await syncFixedExpenses();
      if (onSave) await onSave();
      toast.success("Dados guardados com sucesso.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  };

  const togglePaymentStatus = (key: string) => {
    const [y, m] = key.split("-").map(Number);
    if (!isMonthActive(y, m)) return;
    setData((prev) => {
      const current = prev.monthly_payment_status[key];
      const next = current === "pago" ? "pendente" : "pago";
      return { ...prev, monthly_payment_status: { ...prev.monthly_payment_status, [key]: next } };
    });
  };

  const addExtraExpense = () => {
    if (!newExpenseName.trim()) return;
    const val = parseFloat(newExpenseValue.replace(",", ".")) || 0;
    setData((prev) => ({
      ...prev,
      extra_expenses: [...prev.extra_expenses, { name: newExpenseName.trim(), value: val }],
    }));
    setNewExpenseName("");
    setNewExpenseValue("");
  };

  const removeExtraExpense = (index: number) => {
    setData((prev) => ({
      ...prev,
      extra_expenses: prev.extra_expenses.filter((_, i) => i !== index),
    }));
  };

  const currentStatus = data.monthly_payment_status[statusKey] || "pendente";

  // Calculations
  const effectivePayment = data.monthly_payment + stressExtra;
  const extraTotal = data.extra_expenses.reduce((s, e) => s + e.value, 0);
  const ratio = data.monthly_income > 0 ? (effectivePayment / data.monthly_income) * 100 : 0;
  const baseRatio = data.monthly_income > 0 ? (data.monthly_payment / data.monthly_income) * 100 : 0;
  const totalHousing = effectivePayment + data.estimated_expenses + extraTotal;
  const margin = data.monthly_income - totalHousing;
  const marginToRisk = data.monthly_income > 0 ? (data.monthly_income * 0.3) - data.monthly_payment : 0;
  const marginDiff = 30 - baseRatio;

  // Progress calculations
  const paidMonths = Object.values(data.monthly_payment_status).filter(v => v === "pago").length;
  const totalPaid = data.down_payment + (paidMonths * data.monthly_payment);
  const remaining = Math.max(0, data.house_value - totalPaid);
  const progressPct = data.house_value > 0 ? Math.min(100, (totalPaid / data.house_value) * 100) : 0;

  const getStatus = (r: number) => {
    if (r < 30) return { label: "Seguro", color: "text-status-paid", bg: "bg-status-paid/10", icon: ShieldCheck };
    if (r <= 40) return { label: "Atenção", color: "text-yellow-500", bg: "bg-yellow-500/10", icon: AlertTriangle };
    return { label: "Risco", color: "text-status-negative", bg: "bg-status-negative/10", icon: AlertTriangle };
  };

  const status = getStatus(ratio);
  const StatusIcon = status.icon;

  const interpretiveMessage = useMemo(() => {
    if (baseRatio === 0) return null;
    if (baseRatio < 20) return "A sua prestação tem um peso muito baixo no orçamento. Excelente posição financeira.";
    if (baseRatio < 30) return "A sua prestação está dentro de uma margem confortável. Existe espaço para lidar com imprevistos.";
    if (baseRatio < 40) return "A prestação começa a pesar no orçamento. Considere renegociar ou reduzir outras despesas.";
    return "A prestação ultrapassa o limite recomendado. O risco financeiro é elevado — procure ajuda profissional.";
  }, [baseRatio]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Home className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Minha Casa</h2>
          <p className="text-sm text-text-muted">Acompanhe o impacto da sua habitação no orçamento</p>
        </div>
      </div>

      {/* Payment status for current month */}
      <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="label-caps mb-1 block">Prestação de {MONTH_NAMES[currentMonth]} {currentYear}</span>
            <p className="text-xl font-semibold text-foreground font-mono tabular-nums">{fmt(data.monthly_payment)}</p>
          </div>
          <button
            onClick={() => togglePaymentStatus(statusKey)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              currentStatus === "pago"
                ? "bg-status-paid/10 text-status-paid border border-status-paid/20"
                : "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20"
            }`}
          >
            {currentStatus === "pago" ? (
              <><CheckCircle2 className="h-4 w-4" /> Paga</>
            ) : (
              <><Clock className="h-4 w-4" /> Pendente</>
            )}
          </button>
        </div>
        {/* Mini annual status */}
        <div className="mt-4 flex gap-1.5">
          {MONTH_NAMES.map((name, i) => {
            const key = `${currentYear}-${i}`;
            const st = data.monthly_payment_status[key];
            const active = isMonthActive(currentYear, i);
            return (
              <button
                key={i}
                onClick={() => active && togglePaymentStatus(key)}
                disabled={!active}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                  !active
                    ? "bg-secondary/50 text-text-muted/40 cursor-not-allowed"
                    : st === "pago"
                    ? "bg-status-paid/15 text-status-paid"
                    : i <= currentMonth
                    ? "bg-yellow-500/10 text-yellow-600"
                    : "bg-secondary text-text-muted"
                }`}
                title={!active ? "Mês anterior ao plano" : `${name} — ${st === "pago" ? "Paga" : "Pendente"}`}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section toggle: Esforço vs Progresso */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSection("esforco")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeSection === "esforco" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-surface-hover"
          }`}
        >
          📊 Capacidade de Esforço
        </button>
        <button
          onClick={() => setActiveSection("progresso")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeSection === "progresso" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-surface-hover"
          }`}
        >
          🏠 Progresso da Casa
        </button>
      </div>

      {activeSection === "esforco" && (
        <>
          {/* Enhanced capacity indicator */}
          <div className={`rounded-xl border border-border-subtle/60 p-5 ${status.bg}`}>
            <div className="flex items-center gap-3">
              <StatusIcon className={`h-8 w-8 ${status.color}`} />
              <div className="flex-1">
                <p className={`text-2xl font-bold ${status.color} font-mono tabular-nums`}>
                  {ratio.toFixed(1)}%
                  {stressExtra > 0 && (
                    <span className="text-sm font-normal ml-2 text-text-muted">(+{fmt(stressExtra)} stress test)</span>
                  )}
                </p>
                <p className="text-sm text-text-muted">
                  do rendimento gasto em prestação · Estado: <span className={`font-semibold ${status.color}`}>{status.label}</span>
                </p>
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-background overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  ratio < 30 ? "bg-status-paid" : ratio <= 40 ? "bg-yellow-500" : "bg-status-negative"
                }`}
                style={{ width: `${Math.min(ratio, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>0%</span>
              <span className="text-status-paid">30%</span>
              <span className="text-yellow-500">40%</span>
              <span className="text-status-negative">100%</span>
            </div>

            {data.monthly_income > 0 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="bg-background/60 rounded-lg p-3">
                  <span className="text-text-muted text-xs block mb-0.5">Recomendado</span>
                  <span className="font-semibold text-foreground">até 30%</span>
                </div>
                <div className="bg-background/60 rounded-lg p-3">
                  <span className="text-text-muted text-xs block mb-0.5">Margem disponível</span>
                  <span className={`font-semibold ${marginDiff >= 0 ? "text-status-paid" : "text-status-negative"}`}>
                    {marginDiff >= 0 ? "+" : ""}{marginDiff.toFixed(1)}%
                  </span>
                </div>
                <div className="bg-background/60 rounded-lg p-3">
                  <span className="text-text-muted text-xs block mb-0.5">Dependência habitação</span>
                  <span className="font-semibold text-foreground">{baseRatio.toFixed(1)}% do rendimento</span>
                </div>
              </div>
            )}
          </div>

          {interpretiveMessage && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
              <p>💡 {interpretiveMessage}</p>
            </div>
          )}

          {/* Stress test */}
          {data.monthly_income > 0 && (
            <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
              <h3 className="text-sm font-semibold text-foreground mb-1">Stress Test</h3>
              <p className="text-xs text-text-muted mb-4">E se a prestação subir?</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {[0, 50, 100, 200].map((val) => (
                  <button
                    key={val}
                    onClick={() => setStressExtra(val)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      stressExtra === val
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground hover:bg-surface-hover"
                    }`}
                  >
                    {val === 0 ? "Atual" : `+${fmt(val)}`}
                  </button>
                ))}
              </div>
              {stressExtra > 0 && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-secondary rounded-lg p-3">
                    <span className="text-text-muted text-xs block mb-0.5">Nova prestação</span>
                    <span className="font-semibold text-foreground font-mono">{fmt(effectivePayment)}</span>
                  </div>
                  <div className="bg-secondary rounded-lg p-3">
                    <span className="text-text-muted text-xs block mb-0.5">Novo esforço</span>
                    <span className={`font-semibold font-mono ${getStatus(ratio).color}`}>{ratio.toFixed(1)}% ({getStatus(ratio).label})</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Room to maneuver */}
          {data.monthly_income > 0 && baseRatio < 30 && (
            <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
              <h3 className="text-sm font-semibold text-foreground mb-1">Espaço de Manobra</h3>
              <p className="text-sm text-text-muted">
                Pode suportar até <span className="font-semibold text-status-paid font-mono">{fmt(Math.max(0, marginToRisk))}</span>/mês a mais de prestação antes de entrar em risco.
              </p>
            </div>
          )}
        </>
      )}

      {activeSection === "progresso" && (
        <>
          {/* House progress */}
          <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
            <div className="flex items-center gap-3 mb-4">
              <PieChart className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Progresso do Pagamento</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 text-sm">
              <div className="bg-secondary rounded-lg p-3">
                <span className="text-text-muted text-xs block mb-0.5">Valor da casa</span>
                <span className="font-semibold text-foreground font-mono">{fmt(data.house_value)}</span>
              </div>
              <div className="bg-secondary rounded-lg p-3">
                <span className="text-text-muted text-xs block mb-0.5">Entrada paga</span>
                <span className="font-semibold text-foreground font-mono">{fmt(data.down_payment)}</span>
              </div>
              <div className="bg-status-paid/10 rounded-lg p-3">
                <span className="text-text-muted text-xs block mb-0.5">Total pago</span>
                <span className="font-semibold text-status-paid font-mono">{fmt(totalPaid)}</span>
              </div>
              <div className="bg-secondary rounded-lg p-3">
                <span className="text-text-muted text-xs block mb-0.5">Falta pagar</span>
                <span className="font-semibold text-foreground font-mono">{fmt(remaining)}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-text-muted">
                <span>{progressPct.toFixed(1)}% pago</span>
                <span>{fmt(remaining)} restantes</span>
              </div>
              <div className="h-4 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all relative"
                  style={{ width: `${progressPct}%` }}
                >
                  {progressPct > 5 && (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                      {progressPct.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {data.monthly_payment > 0 && remaining > 0 && (
              <p className="text-xs text-text-muted mt-3">
                Ao ritmo atual ({fmt(data.monthly_payment)}/mês), faltam aproximadamente{" "}
                <span className="font-semibold text-foreground">
                  {Math.ceil(remaining / data.monthly_payment)} meses
                </span>{" "}
                ({Math.ceil(remaining / data.monthly_payment / 12)} anos) para terminar o pagamento.
              </p>
            )}
          </div>
        </>
      )}

      {/* Consultant bot warning when ratio >= 30% */}
      {ratio >= 30 && partnerBranding?.consultant_name && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex gap-3">
            {partnerBranding.consultant_photo_url ? (
              <img
                src={partnerBranding.consultant_photo_url}
                alt={partnerBranding.consultant_name}
                className="h-12 w-12 rounded-full object-cover border-2 border-primary/30 shrink-0"
                style={{ objectPosition: partnerBranding.consultant_photo_position || "center" }}
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <div className="bg-surface rounded-xl rounded-tl-none p-3 shadow-card border border-border-subtle/60">
                <p className="text-sm text-foreground">
                  💬 Quer renegociar o seu financiamento para ficar mais saudável para si?{" "}
                  <strong>Fale comigo!</strong>
                </p>
                <p className="text-xs text-text-muted mt-1">
                  — {partnerBranding.consultant_name}
                  {partnerBranding.name && `, ${partnerBranding.name}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {partnerBranding.consultant_phone && (
                  <a href={`tel:${partnerBranding.consultant_phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity">
                    <Phone className="h-3.5 w-3.5" /> {partnerBranding.consultant_phone}
                  </a>
                )}
                {partnerBranding.consultant_email && (
                  <a href={`mailto:${partnerBranding.consultant_email}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle text-foreground text-xs font-medium hover:bg-surface-hover transition-colors">
                    <Mail className="h-3.5 w-3.5" /> Email
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
          <span className="label-caps mb-1 block">Total habitação/mês</span>
          <p className="text-xl font-semibold text-foreground font-mono tabular-nums">{fmt(totalHousing)}</p>
        </div>
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
          <span className="label-caps mb-1 block">Margem disponível</span>
          <p className={`text-xl font-semibold font-mono tabular-nums ${margin >= 0 ? "text-status-paid" : "text-status-negative"}`}>
            {fmt(margin)}
          </p>
        </div>
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
          <span className="label-caps mb-1 block">Valor da casa</span>
          <p className="text-xl font-semibold text-foreground font-mono tabular-nums">{fmt(data.house_value)}</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Dados da habitação</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Valor da casa (€)", key: "house_value" as const },
            { label: "Valor pago na entrada (€)", key: "down_payment" as const },
            { label: "Prestação mensal (€)", key: "monthly_payment" as const },
            { label: "Despesas estimadas/mês (€)", key: "estimated_expenses" as const },
            { label: "Rendimento mensal (€)", key: "monthly_income" as const },
          ].map((field) => (
            <div key={field.key}>
              <label className="text-sm font-medium text-foreground block mb-1.5">{field.label}</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={data[field.key] || ""}
                onChange={(e) => setData((prev) => ({ ...prev, [field.key]: Number(e.target.value) || 0 }))}
                className="w-full px-3 py-2.5 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
          ))}
        </div>

        {/* Extra expenses */}
        <div className="mt-5 border-t border-border-subtle/60 pt-5">
          <h4 className="text-sm font-semibold text-foreground mb-3">Despesas adicionais da casa</h4>
          <p className="text-xs text-text-muted mb-3">IMI, impostos, seguros, condomínio, etc.</p>

          {data.extra_expenses.length > 0 && (
            <div className="space-y-2 mb-3">
              {data.extra_expenses.map((extra, i) => (
                <div key={i} className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
                  <span className="text-sm text-foreground flex-1">{extra.name}</span>
                  <span className="text-sm font-mono font-semibold text-foreground">{fmt(extra.value)}/mês</span>
                  <button onClick={() => removeExtraExpense(i)} className="text-text-muted hover:text-status-negative transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nome (ex: IMI)"
              value={newExpenseName}
              onChange={(e) => setNewExpenseName(e.target.value)}
              className="flex-1 px-3 py-2 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="number"
              placeholder="Valor €"
              min={0}
              step={0.01}
              value={newExpenseValue}
              onChange={(e) => setNewExpenseValue(e.target.value)}
              className="w-24 px-3 py-2 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            />
            <button
              onClick={addExtraExpense}
              className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-5 w-full sm:w-auto px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
          {saving ? "A guardar..." : "Guardar dados"}
        </button>
      </div>
    </div>
  );
};

export default MinhaCasa;
