import { useState, useEffect, useMemo } from "react";
import { Home, TrendingUp, AlertTriangle, ShieldCheck, Loader2, MessageCircle, Phone, Mail, CheckCircle2, Clock, Plus, X, PieChart, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Download, History, BellRing, Calculator, Wallet, CreditCard } from "lucide-react";
import MortgageSimulator from "./MortgageSimulator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type ExpenseFrequency = "monthly" | "quarterly" | "semiannual" | "annual";
type ExpenseKind = "expense" | "life_insurance" | "multirisk_insurance";

interface ExtraExpense {
  name: string;
  value: number;
  frequency?: ExpenseFrequency;
  kind?: ExpenseKind;
}

const FREQ_MONTHS: Record<ExpenseFrequency, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};
const FREQ_LABEL: Record<ExpenseFrequency, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
};
const monthlyEquivalent = (e: ExtraExpense) => e.value / FREQ_MONTHS[e.frequency ?? "monthly"];
// Returns true if a periodic expense is due in given month (0-based), assuming Jan as anchor
const isExpenseDueInMonth = (e: ExtraExpense, monthIdx: number) => {
  const period = FREQ_MONTHS[e.frequency ?? "monthly"];
  return monthIdx % period === 0;
};

interface PaymentHistoryEntry {
  id: string;
  old_value: number;
  new_value: number;
  changed_at: string;
}

interface HouseData {
  id?: string;
  house_value: number;
  monthly_payment: number;
  monthly_income: number;
  down_payment: number;
  annual_rate: number;
  term_years: number;
  rate_type: "fixed" | "variable" | "mixed";
  indexante: number;
  spread: number;
  fixed_period_years: number;
  fixed_rate_initial: number;
  extra_expenses: ExtraExpense[];
  monthly_payment_status: Record<string, string>;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MONTH_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const MinhaCasa = ({ onSave }: { onSave?: () => Promise<void> }) => {
  const { user, profile, partnerBranding } = useAuth();
  const [data, setData] = useState<HouseData>({
    house_value: 0,
    monthly_payment: 0,
    monthly_income: 0,
    down_payment: 0,
    annual_rate: 0,
    term_years: 30,
    rate_type: "fixed",
    indexante: 0,
    spread: 0,
    fixed_period_years: 0,
    fixed_rate_initial: 0,
    extra_expenses: [],
    monthly_payment_status: {},
  });
  const [loading, setLoading] = useState(true);
  const [stressExtra, setStressExtra] = useState(0);
  const [activeSection, setActiveSection] = useState<"esforco" | "progresso" | "simulador">("esforco");
  const [selectedCalendarYear, setSelectedCalendarYear] = useState(new Date().getFullYear());
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [previousPayment, setPreviousPayment] = useState<number | null>(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  const statusKey = `${currentYear}-${currentMonth}`;

  // Determine plan start month to disable earlier months
  const planStartDate = profile?.plan_started_at ? new Date(profile.plan_started_at) : null;
  const planStartYear = planStartDate ? planStartDate.getFullYear() : currentYear;
  const planStartMonth = planStartDate ? planStartDate.getMonth() : currentMonth;

  const isMonthActive = (year: number, month: number) => {
    if (!planStartDate) return true;
    if (year < planStartYear) return false;
    if (year === planStartYear && month < planStartMonth) return false;
    return true;
  };

  const reloadHouseData = async (): Promise<HouseData | null> => {
    if (!user) return null;
    const [houseRes, historyRes] = await Promise.all([
      supabase.from("house_data").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("payment_history").select("*").eq("user_id", user.id).order("changed_at", { ascending: false }).limit(20),
    ]);
    let fresh: HouseData | null = null;
    if (houseRes.data) {
      const row = houseRes.data;
      const payment = Number(row.monthly_payment) || 0;
      fresh = {
        id: row.id,
        house_value: Number(row.house_value) || 0,
        monthly_payment: payment,
        monthly_income: Number(row.monthly_income) || 0,
        down_payment: Number((row as any).down_payment) || 0,
        annual_rate: Number((row as any).annual_rate) || 0,
        term_years: Number((row as any).term_years) || 30,
        rate_type: ((row as any).rate_type as "fixed" | "variable" | "mixed") || "fixed",
        indexante: Number((row as any).indexante) || 0,
        spread: Number((row as any).spread) || 0,
        fixed_period_years: Number((row as any).fixed_period_years) || 0,
        fixed_rate_initial: Number((row as any).fixed_rate_initial) || 0,
        extra_expenses: ((row as any).extra_expenses as ExtraExpense[]) || [],
        monthly_payment_status: (row as any).monthly_payment_status || {},
      };
      setData(fresh);
      setPreviousPayment(payment);
    }
    if (historyRes.data) {
      setPaymentHistory(historyRes.data as PaymentHistoryEntry[]);
    }
    setLoading(false);
    return fresh;
  };

  useEffect(() => {
    if (!user) return;
    reloadHouseData();
  }, [user]);

  // Sync fixed expense + extra expenses to fixed_expenses table
  const syncFixedExpenses = async (override?: HouseData | null) => {
    if (!user) return;
    const src = override ?? data;

    const { data: existingPrestacao } = await supabase
      .from("fixed_expenses")
      .select("id, monthly_values, monthly_paid")
      .eq("user_id", user.id)
      .eq("item", "Prestação Casa")
      .maybeSingle();

    const monthlyValues: Record<string, number> = {};
    const monthlyPaid: Record<string, boolean> = {};
    const years = new Set<number>();
    for (const key of Object.keys(src.monthly_payment_status)) {
      years.add(Number(key.split("-")[0]));
    }
    years.add(currentYear);

    for (const year of years) {
      for (let m = 0; m < 12; m++) {
        if (!isMonthActive(year, m)) continue;
        const compositeKey = year * 100 + m;
        const sk = `${year}-${m}`;
        monthlyValues[compositeKey] = src.monthly_payment;
        monthlyPaid[compositeKey] = src.monthly_payment_status[sk] === "pago";
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

    // Sync each extra expense as a fixed expense
    for (const extra of src.extra_expenses) {
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

  const togglePaymentStatus = (key: string) => {
    const [y, m] = key.split("-").map(Number);
    if (!isMonthActive(y, m)) return;
    setData((prev) => {
      const current = prev.monthly_payment_status[key];
      const next = current === "pago" ? "pendente" : "pago";
      return { ...prev, monthly_payment_status: { ...prev.monthly_payment_status, [key]: next } };
    });
  };

  const exportReport = () => {
    const lines: string[] = [];
    lines.push("RELATÓRIO MINHA CASA");
    lines.push(`Data: ${now.toLocaleDateString("pt-PT")}`);
    lines.push("");
    lines.push(`Valor da casa: ${fmt(data.house_value)}`);
    lines.push(`Entrada paga: ${fmt(data.down_payment)}`);
    lines.push(`Prestação mensal: ${fmt(data.monthly_payment)}`);
    lines.push(`Rendimento mensal: ${fmt(data.monthly_income)}`);
    lines.push("");
    lines.push("--- Despesas adicionais ---");
    if (data.extra_expenses.length === 0) lines.push("Nenhuma");
    data.extra_expenses.forEach(e => lines.push(`  ${e.name}: ${fmt(e.value)}/mês`));
    lines.push("");
    lines.push(`Total habitação/mês: ${fmt(totalHousing)}`);
    lines.push(`Taxa de esforço: ${baseRatio.toFixed(1)}%`);
    lines.push(`Margem disponível: ${fmt(margin)}`);
    lines.push("");
    lines.push("--- Progresso ---");
    lines.push(`Total pago: ${fmt(totalPaid)} (${progressPct.toFixed(1)}%)`);
    lines.push(`Falta pagar: ${fmt(remaining)}`);
    if (data.monthly_payment > 0 && remaining > 0) {
      lines.push(`Estimativa: ${Math.ceil(remaining / data.monthly_payment)} meses`);
    }
    lines.push("");
    lines.push("--- Estado pagamentos ---");
    const allYears = new Set<number>();
    Object.keys(data.monthly_payment_status).forEach(k => allYears.add(Number(k.split("-")[0])));
    allYears.add(currentYear);
    for (const year of [...allYears].sort()) {
      lines.push(`  ${year}:`);
      for (let m = 0; m < 12; m++) {
        const st = data.monthly_payment_status[`${year}-${m}`] || "pendente";
        if (isMonthActive(year, m)) {
          lines.push(`    ${MONTH_FULL[m]}: ${st === "pago" ? "✅ Paga" : "⏳ Pendente"}`);
        }
      }
    }

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-casa-${now.toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado.");
  };

  const currentStatus = data.monthly_payment_status[statusKey] || "pendente";

  // Payment due reminder
  const showPaymentReminder = currentDay >= 20 && currentStatus !== "pago" && data.monthly_payment > 0;

  // Calculations
  const effectivePayment = data.monthly_payment + stressExtra;
  // Monthly equivalent: distributes annual/quarterly insurances correctly
  const extraTotal = data.extra_expenses.reduce((s, e) => s + monthlyEquivalent(e), 0);
  // What's actually due this month (real cash-out)
  const extrasDueThisMonth = data.extra_expenses.filter((e) => isExpenseDueInMonth(e, currentMonth));
  const extrasDueThisMonthTotal = extrasDueThisMonth.reduce((s, e) => s + e.value, 0);
  const ratio = data.monthly_income > 0 ? (effectivePayment / data.monthly_income) * 100 : 0;
  const baseRatio = data.monthly_income > 0 ? (data.monthly_payment / data.monthly_income) * 100 : 0;
  const totalHousing = effectivePayment + extraTotal;
  const margin = data.monthly_income - totalHousing;
  const marginToRisk = data.monthly_income > 0 ? (data.monthly_income * 0.3) - data.monthly_payment : 0;
  const marginDiff = 30 - baseRatio;

  // Loan / financing calculations
  const loanAmount = Math.max(0, data.house_value - data.down_payment);
  const totalMonths = (data.term_years || 0) * 12;
  const totalCredit = data.monthly_payment > 0 && totalMonths > 0
    ? data.monthly_payment * totalMonths
    : 0;
  const totalInterest = Math.max(0, totalCredit - loanAmount);
  const totalCostOfHouse = data.down_payment + totalCredit; // entrada + tudo o que paga ao banco

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Home className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Minha Casa</h2>
            <p className="text-sm text-text-muted">Acompanhe o impacto da sua habitação no orçamento</p>
          </div>
        </div>
        <button
          onClick={exportReport}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border-subtle text-text-muted hover:text-foreground hover:bg-surface-hover text-xs font-medium transition-colors"
        >
          <Download className="h-3.5 w-3.5" /> Exportar
        </button>
      </div>

      {/* Payment reminder banner */}
      {showPaymentReminder && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 flex items-center gap-3">
          <BellRing className="h-5 w-5 text-yellow-600 shrink-0" />
          <p className="text-sm text-foreground">
            ⚠️ A prestação de <strong>{MONTH_FULL[currentMonth]}</strong> ainda está pendente. Não se esqueça de efetuar o pagamento.
          </p>
          <button
            onClick={() => togglePaymentStatus(statusKey)}
            className="ml-auto shrink-0 px-3 py-1.5 rounded-lg bg-status-paid/15 text-status-paid text-xs font-medium hover:bg-status-paid/25 transition-colors"
          >
            Marcar como paga
          </button>
        </div>
      )}

      {/* Section toggle */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveSection("progresso")}
          className={`flex-1 min-w-[140px] py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeSection === "progresso" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-surface-hover"
          }`}
        >
          🏠 Progresso da Casa
        </button>
        <button
          onClick={() => setActiveSection("simulador")}
          className={`flex-1 min-w-[140px] py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
            activeSection === "simulador" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-surface-hover"
          }`}
        >
          <Calculator className="h-4 w-4" /> O Meu Crédito
        </button>
        <button
          onClick={() => setActiveSection("esforco")}
          className={`flex-1 min-w-[140px] py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeSection === "esforco" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-surface-hover"
          }`}
        >
          📊 Capacidade de Esforço
        </button>
      </div>

      {activeSection === "simulador" && (
        <MortgageSimulator onSavedCurrent={async () => {
          const fresh = await reloadHouseData();
          await syncFixedExpenses(fresh);
          if (onSave) await onSave();
        }} />
      )}

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
          {/* Prestação atual em destaque */}
          <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-text-muted uppercase tracking-wide">Prestação mensal</p>
                <p className="text-2xl font-bold text-foreground font-mono tabular-nums">{fmt(data.monthly_payment)}</p>
              </div>
              <button
                onClick={() => togglePaymentStatus(statusKey)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  currentStatus === "pago"
                    ? "bg-status-paid/15 text-status-paid hover:bg-status-paid/25"
                    : "bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/25"
                }`}
              >
                {currentStatus === "pago" ? "✅ Paga" : "⏳ Pendente"} · {MONTH_NAMES[currentMonth]}
              </button>
            </div>
            {data.rate_type && (
              <p className="text-xs text-text-muted">
                Taxa: <span className="font-semibold text-foreground capitalize">
                  {data.rate_type === "fixed" ? "Fixa" : data.rate_type === "variable" ? "Variável" : "Mista"}
                </span>
                {data.rate_type === "fixed" && data.annual_rate > 0 && (
                  <> · <span className="font-mono">{data.annual_rate.toFixed(3)}%</span></>
                )}
                {data.rate_type === "variable" && (data.indexante > 0 || data.spread > 0) && (
                  <> · <span className="font-mono">{(data.indexante + data.spread).toFixed(3)}%</span> (Indexante {data.indexante.toFixed(3)}% + Spread {data.spread.toFixed(3)}%)</>
                )}
                {data.rate_type === "mixed" && (
                  <> · <span className="font-mono">{data.fixed_rate_initial.toFixed(3)}%</span> fixa por {data.fixed_period_years} anos, depois <span className="font-mono">{(data.indexante + data.spread).toFixed(3)}%</span></>
                )}
              </p>
            )}
          </div>

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total habitação/mês */}
        <div className="rounded-xl border border-border-subtle/60 bg-gradient-to-br from-surface to-primary/5 p-5 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <Wallet className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="label-caps">Total habitação/mês</span>
          </div>
          <p className="text-xl font-semibold text-foreground font-mono tabular-nums">{fmt(totalHousing)}</p>
        </div>

        {/* Margem disponível */}
        <div className={`rounded-xl border p-5 shadow-card ${margin >= 0 ? "border-status-paid/30 bg-gradient-to-br from-surface to-status-paid/5" : "border-status-negative/30 bg-gradient-to-br from-surface to-status-negative/5"}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`rounded-lg p-1.5 ${margin >= 0 ? "bg-status-paid/10" : "bg-status-negative/10"}`}>
              <TrendingUp className={`h-3.5 w-3.5 ${margin >= 0 ? "text-status-paid" : "text-status-negative"}`} />
            </div>
            <span className="label-caps">Margem disponível</span>
          </div>
          <p className={`text-xl font-semibold font-mono tabular-nums ${margin >= 0 ? "text-status-paid" : "text-status-negative"}`}>
            {fmt(margin)}
          </p>
        </div>

        {/* Valor da casa */}
        <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-surface to-blue-500/5 p-5 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-blue-500/10 p-1.5">
              <Home className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <span className="label-caps">Valor da casa</span>
          </div>
          <p className="text-xl font-semibold text-foreground font-mono tabular-nums">{fmt(data.house_value)}</p>
          {loanAmount > 0 && (
            <p className="text-[11px] text-text-muted mt-1.5">A financiar: <span className="font-mono font-semibold text-foreground">{fmt(loanAmount)}</span></p>
          )}
        </div>

        {/* Total a pagar ao banco */}
        <div className="rounded-xl border border-status-negative/30 bg-gradient-to-br from-surface to-status-negative/5 p-5 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-status-negative/10 p-1.5">
              <CreditCard className="h-3.5 w-3.5 text-status-negative" />
            </div>
            <span className="label-caps">Total ao banco</span>
          </div>
          <p className="text-xl font-semibold text-foreground font-mono tabular-nums">
            {totalCredit > 0 ? fmt(totalCredit) : "—"}
          </p>
          {totalInterest > 0 ? (
            <p className="text-[11px] text-text-muted mt-1.5">
              + <span className="text-status-negative font-mono font-semibold">{fmt(totalInterest)}</span> juros
            </p>
          ) : (
            <p className="text-[11px] text-text-muted mt-1.5">prestação × meses</p>
          )}
        </div>
      </div>

      {/* Real cost summary banner */}
      {totalCredit > 0 && loanAmount > 0 && (
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 shadow-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="rounded-xl bg-primary/15 p-2.5 shadow-sm">
              <Calculator className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Quanto vai pagar realmente pela casa</h3>
              <p className="text-xs text-text-muted">Decomposição completa ao longo de {data.term_years} anos</p>
            </div>
          </div>

          {/* Visual breakdown bar */}
          <div className="mb-5">
            <div className="flex h-3 rounded-full overflow-hidden border border-border-subtle/60 bg-surface">
              <div
                className="bg-blue-500 transition-all"
                style={{ width: `${(data.down_payment / totalCostOfHouse) * 100}%` }}
                title={`Entrada: ${fmt(data.down_payment)}`}
              />
              <div
                className="bg-primary transition-all"
                style={{ width: `${(loanAmount / totalCostOfHouse) * 100}%` }}
                title={`Capital: ${fmt(loanAmount)}`}
              />
              <div
                className="bg-status-negative transition-all"
                style={{ width: `${(totalInterest / totalCostOfHouse) * 100}%` }}
                title={`Juros: ${fmt(totalInterest)}`}
              />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-text-muted">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" /> Entrada {((data.down_payment / totalCostOfHouse) * 100).toFixed(0)}%</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Capital {((loanAmount / totalCostOfHouse) * 100).toFixed(0)}%</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-status-negative" /> Juros {((totalInterest / totalCostOfHouse) * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl bg-surface border-l-4 border-l-blue-500 border-y border-r border-border-subtle/60 p-3.5">
              <span className="text-text-muted text-[11px] uppercase tracking-wide block mb-1">Entrada</span>
              <span className="font-semibold text-foreground font-mono text-base block">{fmt(data.down_payment)}</span>
              <span className="text-[10px] text-text-muted">{data.house_value > 0 ? `${((data.down_payment / data.house_value) * 100).toFixed(0)}% da casa` : ""}</span>
            </div>
            <div className="rounded-xl bg-surface border-l-4 border-l-primary border-y border-r border-border-subtle/60 p-3.5">
              <span className="text-text-muted text-[11px] uppercase tracking-wide block mb-1">Capital financiado</span>
              <span className="font-semibold text-foreground font-mono text-base block">{fmt(loanAmount)}</span>
              <span className="text-[10px] text-text-muted">o que pediu ao banco</span>
            </div>
            <div className="rounded-xl bg-status-negative/5 border-l-4 border-l-status-negative border-y border-r border-status-negative/20 p-3.5">
              <span className="text-status-negative/80 text-[11px] uppercase tracking-wide block mb-1">Juros pagos</span>
              <span className="font-semibold text-status-negative font-mono text-base block">{fmt(totalInterest)}</span>
              <span className="text-[10px] text-status-negative/70">{loanAmount > 0 ? `+${((totalInterest / loanAmount) * 100).toFixed(0)}% do financiado` : ""}</span>
            </div>
            <div className="rounded-xl bg-primary/10 border-l-4 border-l-primary border-y border-r border-primary/20 p-3.5">
              <span className="text-primary/80 text-[11px] uppercase tracking-wide block mb-1">Custo total real</span>
              <span className="font-bold text-primary font-mono text-base block">{fmt(totalCostOfHouse)}</span>
              <span className="text-[10px] text-primary/70">entrada + total ao banco</span>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-surface/80 border border-border-subtle/60 p-4">
            <p className="text-sm text-foreground leading-relaxed">
              💡 Pela casa de <span className="font-mono font-semibold">{fmt(data.house_value)}</span> vai pagar no total{" "}
              <span className="font-mono font-semibold text-primary">{fmt(totalCostOfHouse)}</span> ao longo de {data.term_years} anos
              {totalInterest > 0 && (
                <> — <span className="text-status-negative font-semibold font-mono">{fmt(totalInterest)}</span> só de juros 💸</>
              )}.
            </p>
          </div>
        </div>
      )}

      {/* Payment history */}
      {paymentHistory.length > 0 && (
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm font-semibold text-foreground w-full"
          >
            <History className="h-4 w-4 text-primary" />
            Histórico de alterações da prestação
            <span className="ml-auto text-xs text-text-muted">{paymentHistory.length} alterações</span>
          </button>
          {showHistory && (
            <div className="mt-3 space-y-2">
              {paymentHistory.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2 text-sm">
                  <span className="text-text-muted">
                    {new Date(entry.changed_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-text-muted line-through">{fmt(entry.old_value)}</span>
                    <span className="text-text-muted">→</span>
                    <span className="font-mono font-semibold text-foreground">{fmt(entry.new_value)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Form moved to MortgageSimulator (secção "Dados da casa" dentro do Simulador de Crédito) */}
    </div>
  );
};

export default MinhaCasa;
