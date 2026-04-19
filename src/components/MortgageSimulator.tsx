import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Calculator,
  TrendingDown,
  Wallet,
  AlertCircle,
  Save,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  PiggyBank,
  Loader2,
  FileText,
  Home,
  FlaskConical,
  RefreshCw,
  Upload,
  ScanLine,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from "recharts";

const fmt = (v: number) =>
  v.toLocaleString("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmt2 = (v: number) =>
  v.toLocaleString("pt-PT", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

type RateType = "fixed" | "variable" | "mixed";

interface Simulation {
  id: string;
  name: string;
  loan_amount: number;
  annual_rate: number;
  term_years: number;
  monthly_income: number;
  extra_monthly_costs: number;
  extra_payment: number;
  notes: string | null;
  created_at: string;
  rate_type?: RateType;
  indexante?: number;
  spread?: number;
  fixed_period_years?: number;
  fixed_rate_initial?: number;
}

interface AmortRow {
  month: number;       // 1..12
  globalMonth: number; // 1..N
  year: number;        // 1..termYears
  payment: number;
  interest: number;
  principal: number;
  balance: number;
  extraPayment: number;
  rateApplied: number; // %
}

const calcPMT = (principal: number, annualRate: number, years: number) => {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0 || n === 0) return n === 0 ? 0 : principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};

// Effective annual rate by month index (0-based) for the chosen profile
const rateAtMonth = (
  monthIndex0: number,
  rateType: RateType,
  fixedRate: number,
  fixedPeriodYears: number,
  variableRate: number,
): number => {
  if (rateType === "fixed") return fixedRate;
  if (rateType === "variable") return variableRate;
  // mixed
  return monthIndex0 < fixedPeriodYears * 12 ? fixedRate : variableRate;
};

interface ScheduleParams {
  principal: number;
  termYears: number;
  rateType: RateType;
  fixedRate: number;        // for fixed or initial fixed phase of mixed
  fixedPeriodYears: number; // mixed only
  variableRate: number;     // indexante + spread (variable / 2nd phase mixed)
  extraPayment: number;
}

const buildSchedule = (p: ScheduleParams): AmortRow[] => {
  const { principal, termYears, rateType, fixedRate, fixedPeriodYears, variableRate, extraPayment } = p;
  if (principal <= 0 || termYears <= 0) return [];
  const maxMonths = termYears * 12;
  const rows: AmortRow[] = [];
  let balance = principal;
  let currentRate = rateAtMonth(0, rateType, fixedRate, fixedPeriodYears, variableRate);
  let remainingMonths = maxMonths;
  let payment = calcPMT(balance, currentRate, remainingMonths / 12);

  for (let m = 1; m <= maxMonths && balance > 0.01; m++) {
    const idx0 = m - 1;
    const newRate = rateAtMonth(idx0, rateType, fixedRate, fixedPeriodYears, variableRate);
    if (Math.abs(newRate - currentRate) > 1e-9) {
      // recompute payment for remaining term
      currentRate = newRate;
      remainingMonths = maxMonths - idx0;
      payment = calcPMT(balance, currentRate, remainingMonths / 12);
    }
    const r = currentRate / 100 / 12;
    const interest = balance * r;
    let principalPaid = payment - interest;
    let extra = extraPayment;
    if (principalPaid + extra > balance) {
      extra = Math.max(0, balance - principalPaid);
      if (principalPaid > balance) principalPaid = balance;
    }
    balance -= principalPaid + extra;
    if (balance < 0) balance = 0;
    rows.push({
      month: ((m - 1) % 12) + 1,
      globalMonth: m,
      year: Math.ceil(m / 12),
      payment: payment + extra,
      interest,
      principal: principalPaid,
      balance,
      extraPayment: extra,
      rateApplied: currentRate,
    });
  }
  return rows;
};

interface CurrentCredit {
  id?: string;
  loan_amount: number;
  annual_rate: number;
  term_years: number;
  monthly_payment: number;
  monthly_payment_status: Record<string, string>;
  rate_type: RateType;
  indexante: number;
  spread: number;
  fixed_period_years: number;
  fixed_rate_initial: number;
}

const MONTH_NAMES_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MONTH_NAMES_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

interface ExtractedDoc {
  loan_amount?: number | null;
  rate_type?: RateType | null;
  annual_rate?: number | null;
  indexante?: number | null;
  indexante_label?: string | null;
  spread?: number | null;
  fixed_period_years?: number | null;
  fixed_rate_initial?: number | null;
  term_years?: number | null;
  monthly_payment?: number | null;
  insurance_notes?: string | null;
  confidence?: number;
  notes?: string | null;
}

const MortgageSimulator = ({ onSavedCurrent }: { onSavedCurrent?: () => Promise<void> | void }) => {
  const { user } = useAuth();

  // === CRÉDITO ATUAL (sincroniza com house_data) ===
  const [current, setCurrent] = useState<CurrentCredit>({
    loan_amount: 0,
    annual_rate: 0,
    term_years: 30,
    monthly_payment: 0,
    monthly_payment_status: {},
    rate_type: "fixed",
    indexante: 0,
    spread: 0,
    fixed_period_years: 0,
    fixed_rate_initial: 0,
  });
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [savingCurrent, setSavingCurrent] = useState(false);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // === SIMULAÇÃO LIVRE ===
  const [loanAmount, setLoanAmount] = useState(150000);
  const [termYears, setTermYears] = useState(30);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [extraMonthlyCosts, setExtraMonthlyCosts] = useState(0);
  const [extraPayment, setExtraPayment] = useState(0);
  const [simName, setSimName] = useState("Simulação 1");

  // Tipo de taxa
  const [rateType, setRateType] = useState<RateType>("fixed");
  const [annualRate, setAnnualRate] = useState(3.5);          // taxa fixa (fixed)
  const [indexante, setIndexante] = useState(2.5);            // Euribor (variable/mixed phase 2)
  const [spread, setSpread] = useState(1.0);                  // spread banco
  const [fixedPeriodYears, setFixedPeriodYears] = useState(5);// mixed: anos fixos
  const [fixedRateInitial, setFixedRateInitial] = useState(3.0); // mixed: taxa fixa fase 1

  const variableRate = useMemo(() => indexante + spread, [indexante, spread]);
  // Effective rate used during fixed-rate-only flow ("fixed") — and what we save in annual_rate column for back-compat
  const effectiveBaseRate = useMemo(() => {
    if (rateType === "fixed") return annualRate;
    if (rateType === "variable") return variableRate;
    return fixedRateInitial; // mixed → começa fixo
  }, [rateType, annualRate, variableRate, fixedRateInitial]);

  const [savedSims, setSavedSims] = useState<Simulation[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const [simCollapsed, setSimCollapsed] = useState(false);
  const [tableCollapsed, setTableCollapsed] = useState(true);

  // === UPLOAD ESCRITURA ===
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedDoc | null>(null);
  const [extractedFileName, setExtractedFileName] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    loadCurrent();
    loadSimulations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadCurrent = async () => {
    if (!user) return;
    setLoadingCurrent(true);
    const { data } = await supabase
      .from("house_data")
      .select("id, house_value, down_payment, annual_rate, term_years, monthly_payment, monthly_payment_status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      const loan = Math.max(0, Number(data.house_value || 0) - Number(data.down_payment || 0));
      setCurrent({
        id: data.id,
        loan_amount: loan,
        annual_rate: Number(data.annual_rate || 0),
        term_years: Number(data.term_years || 30),
        monthly_payment: Number(data.monthly_payment || 0),
        monthly_payment_status: ((data as any).monthly_payment_status as Record<string, string>) || {},
      });
    }
    setLoadingCurrent(false);
  };

  const togglePaymentStatus = async (year: number, month: number) => {
    if (!user || !current.id) {
      toast.error("Guarde primeiro o crédito atual");
      return;
    }
    const key = `${year}-${month}`;
    const next = current.monthly_payment_status[key] === "pago" ? "pendente" : "pago";
    const newStatus = { ...current.monthly_payment_status, [key]: next };
    setCurrent((p) => ({ ...p, monthly_payment_status: newStatus }));
    const { error } = await supabase
      .from("house_data")
      .update({ monthly_payment_status: newStatus as any })
      .eq("id", current.id);
    if (error) {
      toast.error("Erro ao atualizar");
    } else {
      if (onSavedCurrent) await onSavedCurrent();
    }
  };

  const loadSimulations = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("mortgage_simulations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setSavedSims(data as unknown as Simulation[]);
  };

  const handleSaveCurrent = async () => {
    if (!user) return;
    setSavingCurrent(true);
    try {
      const computedPayment = calcPMT(current.loan_amount, current.annual_rate, current.term_years);
      const payload = {
        annual_rate: current.annual_rate,
        term_years: current.term_years,
        monthly_payment: computedPayment,
      };
      if (current.id) {
        const { error } = await supabase.from("house_data").update(payload).eq("id", current.id);
        if (error) throw error;
      } else {
        const { data: row, error } = await supabase
          .from("house_data")
          .insert({ ...payload, user_id: user.id, house_value: current.loan_amount, down_payment: 0 })
          .select()
          .single();
        if (error) throw error;
        setCurrent((p) => ({ ...p, id: row.id }));
      }
      setCurrent((p) => ({ ...p, monthly_payment: computedPayment }));
      toast.success("Crédito atualizado em Minha Casa");
      if (onSavedCurrent) await onSavedCurrent();
    } catch (e: any) {
      toast.error(e.message || "Erro ao guardar");
    } finally {
      setSavingCurrent(false);
    }
  };

  // === CÁLCULOS CRÉDITO ATUAL (sempre taxa fixa — é o que está em house_data) ===
  const currentSchedule = useMemo(
    () =>
      buildSchedule({
        principal: current.loan_amount,
        termYears: current.term_years,
        rateType: "fixed",
        fixedRate: current.annual_rate,
        fixedPeriodYears: 0,
        variableRate: 0,
        extraPayment: 0,
      }),
    [current.loan_amount, current.annual_rate, current.term_years]
  );
  const currentPayment = useMemo(
    () => calcPMT(current.loan_amount, current.annual_rate, current.term_years),
    [current.loan_amount, current.annual_rate, current.term_years]
  );
  const currentTotalCost = currentSchedule.reduce((s, r) => s + r.payment, 0);
  const currentTotalInterest = Math.max(0, currentTotalCost - current.loan_amount);

  // === CÁLCULOS SIMULAÇÃO ===
  const baseSchedule = useMemo(
    () =>
      buildSchedule({
        principal: loanAmount,
        termYears,
        rateType,
        fixedRate: rateType === "mixed" ? fixedRateInitial : annualRate,
        fixedPeriodYears,
        variableRate,
        extraPayment: 0,
      }),
    [loanAmount, termYears, rateType, annualRate, fixedRateInitial, fixedPeriodYears, variableRate]
  );
  const extraSchedule = useMemo(
    () =>
      buildSchedule({
        principal: loanAmount,
        termYears,
        rateType,
        fixedRate: rateType === "mixed" ? fixedRateInitial : annualRate,
        fixedPeriodYears,
        variableRate,
        extraPayment,
      }),
    [loanAmount, termYears, rateType, annualRate, fixedRateInitial, fixedPeriodYears, variableRate, extraPayment]
  );

  // "first" payment shown — for mixed shows fase fixa
  const basePayment = baseSchedule[0]?.payment ?? 0;
  // payment after rate change (mixed phase 2) for display
  const variablePhasePayment = useMemo(() => {
    if (rateType !== "mixed") return null;
    const switchMonth = fixedPeriodYears * 12;
    return baseSchedule.find((r) => r.globalMonth > switchMonth)?.payment ?? null;
  }, [rateType, fixedPeriodYears, baseSchedule]);

  const totalCost = baseSchedule.reduce((s, r) => s + r.payment, 0);
  const totalInterest = Math.max(0, totalCost - loanAmount);
  const realMonthlyCost = basePayment + extraMonthlyCosts;
  const margin = monthlyIncome - realMonthlyCost;
  const effortRatio = monthlyIncome > 0 ? (basePayment / monthlyIncome) * 100 : 0;

  const extraTotalCost = extraSchedule.reduce((s, r) => s + r.payment, 0);
  const extraTotalInterest = Math.max(0, extraTotalCost - loanAmount);
  const interestSaved = totalInterest - extraTotalInterest;
  const monthsSaved = baseSchedule.length - extraSchedule.length;
  const yearsSaved = Math.floor(monthsSaved / 12);
  const remainderMonths = monthsSaved % 12;

  const paymentDelta = basePayment - currentPayment;
  const interestDelta = totalInterest - currentTotalInterest;

  const effortStatus = useMemo(() => {
    if (monthlyIncome === 0)
      return { label: "—", color: "text-muted-foreground", bg: "bg-muted/30", emoji: "💡" };
    if (effortRatio < 30)
      return { label: "Saudável", color: "text-success", bg: "bg-success/10", emoji: "🟢" };
    if (effortRatio < 40)
      return { label: "Atenção", color: "text-warning", bg: "bg-warning/10", emoji: "🟡" };
    return { label: "Risco", color: "text-destructive", bg: "bg-destructive/10", emoji: "🔴" };
  }, [effortRatio, monthlyIncome]);

  const chartData = useMemo(() => {
    const yearly: Record<number, { year: number; balance: number; interest: number; principal: number; payment: number }> = {};
    baseSchedule.forEach((r) => {
      const yr = r.year;
      if (!yearly[yr]) yearly[yr] = { year: yr, balance: 0, interest: 0, principal: 0, payment: 0 };
      yearly[yr].balance = r.balance;
      yearly[yr].interest += r.interest;
      yearly[yr].principal += r.principal;
      yearly[yr].payment = r.payment; // last of the year
    });
    return Object.values(yearly);
  }, [baseSchedule]);

  const yearlyTable = useMemo(() => {
    const grouped: Record<number, AmortRow[]> = {};
    baseSchedule.forEach((r) => {
      if (!grouped[r.year]) grouped[r.year] = [];
      grouped[r.year].push(r);
    });
    return Object.entries(grouped).map(([year, rows]) => {
      const totalPayment = rows.reduce((s, r) => s + r.payment, 0);
      const totalInterest = rows.reduce((s, r) => s + r.interest, 0);
      const totalPrincipal = rows.reduce((s, r) => s + r.principal, 0);
      const endBalance = rows[rows.length - 1].balance;
      const rateAvg = rows.reduce((s, r) => s + r.rateApplied, 0) / rows.length;
      return { year: Number(year), rows, totalPayment, totalInterest, totalPrincipal, endBalance, rateAvg };
    });
  }, [baseSchedule]);

  const insights = useMemo(() => {
    const items: string[] = [];
    if (totalInterest > 0)
      items.push(`💸 Esta simulação paga **${fmt(totalInterest)}** em juros ao longo de ${termYears} anos.`);
    if (rateType === "mixed" && variablePhasePayment != null) {
      const delta = variablePhasePayment - basePayment;
      const sign = delta > 0 ? "aumenta" : "diminui";
      items.push(
        `🔁 Após **${fixedPeriodYears} anos**, a taxa muda para variável (${variableRate.toFixed(2)}%) e a prestação ${sign} para **${fmt2(variablePhasePayment)}**.`
      );
    }
    if (rateType === "variable") {
      items.push(`📌 Taxa variável assumida constante = indexante (${indexante.toFixed(2)}%) + spread (${spread.toFixed(2)}%) = **${variableRate.toFixed(2)}%**.`);
    }
    if (monthlyIncome > 0) items.push(`📊 Consome **${effortRatio.toFixed(1)}%** do seu rendimento mensal.`);
    if (currentPayment > 0 && basePayment > 0) {
      if (paymentDelta < -1) items.push(`✅ Poupa **${fmt(Math.abs(paymentDelta))}/mês** vs o seu crédito atual.`);
      else if (paymentDelta > 1) items.push(`⚠️ Custa mais **${fmt(paymentDelta)}/mês** vs o seu crédito atual.`);
      if (interestDelta < -1) items.push(`🎯 Poupa **${fmt(Math.abs(interestDelta))}** em juros vs o atual.`);
    }
    if (extraPayment > 0 && interestSaved > 0) {
      items.push(`🚀 Com **+${fmt(extraPayment)}/mês**, poupa **${yearsSaved}a ${remainderMonths}m** e **${fmt(interestSaved)}** em juros.`);
    }
    if (margin < 0 && monthlyIncome > 0) {
      items.push(`⚠️ O custo real ultrapassa o seu rendimento em **${fmt(Math.abs(margin))}**.`);
    }
    return items;
  }, [totalInterest, termYears, monthlyIncome, effortRatio, extraPayment, interestSaved, yearsSaved, remainderMonths, margin, basePayment, currentPayment, paymentDelta, interestDelta, rateType, variablePhasePayment, fixedPeriodYears, variableRate, indexante, spread]);

  const handleSaveSim = async () => {
    if (!user) return;
    if (!simName.trim()) {
      toast.error("Dá um nome à simulação");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("mortgage_simulations").insert({
      user_id: user.id,
      name: simName.trim(),
      loan_amount: loanAmount,
      annual_rate: effectiveBaseRate,
      term_years: termYears,
      monthly_income: monthlyIncome,
      extra_monthly_costs: extraMonthlyCosts,
      extra_payment: extraPayment,
      rate_type: rateType,
      indexante,
      spread,
      fixed_period_years: rateType === "mixed" ? fixedPeriodYears : 0,
      fixed_rate_initial: rateType === "mixed" ? fixedRateInitial : 0,
    } as any);
    setSaving(false);
    if (error) {
      toast.error("Erro ao guardar");
      return;
    }
    toast.success("Simulação guardada");
    loadSimulations();
  };

  const handleLoad = (s: Simulation) => {
    setSimName(s.name);
    setLoanAmount(Number(s.loan_amount));
    setTermYears(s.term_years);
    setMonthlyIncome(Number(s.monthly_income));
    setExtraMonthlyCosts(Number(s.extra_monthly_costs));
    setExtraPayment(Number(s.extra_payment));
    const rt: RateType = (s.rate_type as RateType) || "fixed";
    setRateType(rt);
    setIndexante(Number(s.indexante ?? 0));
    setSpread(Number(s.spread ?? 0));
    setFixedPeriodYears(Number(s.fixed_period_years ?? 0));
    setFixedRateInitial(Number(s.fixed_rate_initial ?? 0));
    if (rt === "fixed") setAnnualRate(Number(s.annual_rate));
    toast.success(`"${s.name}" carregada`);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("mortgage_simulations").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao apagar");
      return;
    }
    toast.success("Removida");
    loadSimulations();
  };

  const copyCurrentToSim = () => {
    if (current.loan_amount <= 0) {
      toast.error("Preencha primeiro o seu crédito atual");
      return;
    }
    setLoanAmount(current.loan_amount);
    setRateType("fixed");
    setAnnualRate(current.annual_rate);
    setTermYears(current.term_years);
    setSimName("Cenário baseado no atual");
    toast.success("Dados do crédito atual copiados");
  };

  const exportCSV = () => {
    const header = "Mês,Ano,Taxa %,Prestação,Juros,Capital,Pagamento Extra,Dívida Restante\n";
    const rows = baseSchedule
      .map((r, i) => `${i + 1},${r.year},${r.rateApplied.toFixed(3)},${r.payment.toFixed(2)},${r.interest.toFixed(2)},${r.principal.toFixed(2)},${r.extraPayment.toFixed(2)},${r.balance.toFixed(2)}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${simName || "simulacao"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // === UPLOAD ESCRITURA ===
  const handleFilePick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-uploading the same file
    if (!file) return;

    const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED.includes(file.type)) {
      toast.error("Formato não suportado. Use PDF, JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ficheiro demasiado grande (máx 10 MB).");
      return;
    }

    setUploading(true);
    setExtracted(null);
    setExtractedFileName(file.name);

    try {
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const idx = result.indexOf(",");
          resolve(idx >= 0 ? result.slice(idx + 1) : result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("extract-mortgage-doc", {
        body: { fileBase64, mimeType: file.type },
      });

      if (error) {
        const msg = (error as any)?.message || "Erro ao processar documento";
        toast.error(msg);
        setExtracted(null);
        return;
      }
      const ex = (data as any)?.data as ExtractedDoc | undefined;
      if (!ex) {
        toast.error("Não foi possível extrair dados.");
        return;
      }
      setExtracted(ex);
      toast.success("Dados extraídos. Reveja e confirme abaixo.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  const applyExtracted = () => {
    if (!extracted) return;
    if (extracted.loan_amount && extracted.loan_amount > 0) setLoanAmount(extracted.loan_amount);
    if (extracted.term_years && extracted.term_years > 0) setTermYears(extracted.term_years);
    const rt = (extracted.rate_type as RateType) || "fixed";
    setRateType(rt);
    if (rt === "fixed" && extracted.annual_rate != null) setAnnualRate(extracted.annual_rate);
    if (rt === "variable") {
      if (extracted.indexante != null) setIndexante(extracted.indexante);
      if (extracted.spread != null) setSpread(extracted.spread);
    }
    if (rt === "mixed") {
      if (extracted.fixed_rate_initial != null) setFixedRateInitial(extracted.fixed_rate_initial);
      if (extracted.fixed_period_years != null) setFixedPeriodYears(extracted.fixed_period_years);
      if (extracted.indexante != null) setIndexante(extracted.indexante);
      if (extracted.spread != null) setSpread(extracted.spread);
    }
    setSimName(`Escritura ${extractedFileName.replace(/\.[^.]+$/, "")}`.slice(0, 100));
    toast.success("Dados aplicados ao simulador");
    setExtracted(null);
    setExtractedFileName("");
  };

  const updateExtractedField = <K extends keyof ExtractedDoc>(key: K, value: ExtractedDoc[K]) => {
    setExtracted((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const inputCls = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono";
  const labelCls = "text-xs font-medium text-muted-foreground";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl border border-border-subtle/60 bg-gradient-to-br from-primary/5 to-primary/0 p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Calculator className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Simulador de Crédito Habitação</h2>
            <p className="text-sm text-muted-foreground">Compare o seu crédito atual com cenários alternativos</p>
          </div>
        </div>
      </div>

      {/* PRESTAÇÃO ATUAL — estado de pagamento */}
      {!loadingCurrent && current.loan_amount > 0 && (
        <div className="rounded-xl border border-border-subtle/60 bg-card p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                Prestação atual de {MONTH_NAMES_FULL[new Date().getMonth()]} {new Date().getFullYear()}
              </p>
              <p className="text-xl font-semibold font-mono tabular-nums">{fmt2(current.monthly_payment)}</p>
            </div>
            {(() => {
              const todayKey = `${new Date().getFullYear()}-${new Date().getMonth()}`;
              const isPaid = current.monthly_payment_status[todayKey] === "pago";
              return (
                <button
                  onClick={() => togglePaymentStatus(new Date().getFullYear(), new Date().getMonth())}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                    isPaid
                      ? "bg-success/10 text-success border-success/20"
                      : "bg-warning/10 text-warning-foreground border-warning/20 text-yellow-600"
                  }`}
                >
                  {isPaid ? "✅ Paga" : "⏳ Pendente"}
                </button>
              );
            })()}
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <button
                onClick={() => setCalendarYear((y) => y - 1)}
                className="p-1 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold min-w-[3rem] text-center">{calendarYear}</span>
              <button
                onClick={() => setCalendarYear((y) => y + 1)}
                className="p-1 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-1.5">
              {MONTH_NAMES_SHORT.map((name, i) => {
                const key = `${calendarYear}-${i}`;
                const st = current.monthly_payment_status[key];
                const isPast = calendarYear < new Date().getFullYear() ||
                  (calendarYear === new Date().getFullYear() && i <= new Date().getMonth());
                return (
                  <button
                    key={i}
                    onClick={() => togglePaymentStatus(calendarYear, i)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                      st === "pago"
                        ? "bg-success/15 text-success"
                        : isPast
                        ? "bg-warning/10 text-yellow-600"
                        : "bg-secondary text-muted-foreground"
                    }`}
                    title={`${name} — ${st === "pago" ? "Paga" : "Pendente"}`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* === UPLOAD ESCRITURA (NOVO) === */}
      <div className="rounded-xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 via-primary/0 to-primary/5 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/15 p-2.5 shrink-0">
            <ScanLine className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold flex items-center gap-2">
              Upload de escritura
              <span className="text-[10px] uppercase tracking-wider bg-primary text-primary-foreground px-1.5 py-0.5 rounded">IA</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Carregue a escritura ou contrato em PDF/imagem. A IA extrai automaticamente o valor, taxa, indexante, spread e prazo.
              <span className="block mt-1 text-[11px] opacity-80">🔒 Processado em memória — o ficheiro não é guardado.</span>
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {!extracted && (
          <button
            type="button"
            onClick={handleFilePick}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                A analisar documento…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Carregar escritura (PDF / imagem)
              </>
            )}
          </button>
        )}

        {extracted && (
          <div className="rounded-xl border border-primary/30 bg-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <p className="text-sm font-semibold truncate">Dados extraídos · {extractedFileName}</p>
              </div>
              <button
                onClick={() => { setExtracted(null); setExtractedFileName(""); }}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                title="Descartar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {extracted.confidence != null && (
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-muted-foreground">Confiança IA:</span>
                <span className={`font-semibold ${extracted.confidence >= 0.7 ? "text-success" : extracted.confidence >= 0.4 ? "text-warning" : "text-destructive"}`}>
                  {(extracted.confidence * 100).toFixed(0)}%
                </span>
                {extracted.confidence < 0.7 && (
                  <span className="text-muted-foreground">— reveja com atenção</span>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Tipo de taxa</label>
                <select
                  value={extracted.rate_type ?? "fixed"}
                  onChange={(e) => updateExtractedField("rate_type", e.target.value as RateType)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="fixed">Fixa</option>
                  <option value="variable">Variável</option>
                  <option value="mixed">Mista</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Valor empréstimo (€)</label>
                <input
                  type="number"
                  value={extracted.loan_amount ?? ""}
                  onChange={(e) => updateExtractedField("loan_amount", e.target.value === "" ? null : Number(e.target.value))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Prazo (anos)</label>
                <input
                  type="number"
                  value={extracted.term_years ?? ""}
                  onChange={(e) => updateExtractedField("term_years", e.target.value === "" ? null : Number(e.target.value))}
                  className={inputCls}
                />
              </div>
              {extracted.rate_type === "fixed" && (
                <div>
                  <label className={labelCls}>Taxa fixa (%)</label>
                  <input
                    type="number" step="0.01"
                    value={extracted.annual_rate ?? ""}
                    onChange={(e) => updateExtractedField("annual_rate", e.target.value === "" ? null : Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
              )}
              {(extracted.rate_type === "variable" || extracted.rate_type === "mixed") && (
                <>
                  <div>
                    <label className={labelCls}>
                      Indexante (%) {extracted.indexante_label && <span className="opacity-70">· {extracted.indexante_label}</span>}
                    </label>
                    <input
                      type="number" step="0.01"
                      value={extracted.indexante ?? ""}
                      onChange={(e) => updateExtractedField("indexante", e.target.value === "" ? null : Number(e.target.value))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Spread (%)</label>
                    <input
                      type="number" step="0.01"
                      value={extracted.spread ?? ""}
                      onChange={(e) => updateExtractedField("spread", e.target.value === "" ? null : Number(e.target.value))}
                      className={inputCls}
                    />
                  </div>
                </>
              )}
              {extracted.rate_type === "mixed" && (
                <>
                  <div>
                    <label className={labelCls}>Fase fixa (anos)</label>
                    <input
                      type="number"
                      value={extracted.fixed_period_years ?? ""}
                      onChange={(e) => updateExtractedField("fixed_period_years", e.target.value === "" ? null : Number(e.target.value))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Taxa fixa inicial (%)</label>
                    <input
                      type="number" step="0.01"
                      value={extracted.fixed_rate_initial ?? ""}
                      onChange={(e) => updateExtractedField("fixed_rate_initial", e.target.value === "" ? null : Number(e.target.value))}
                      className={inputCls}
                    />
                  </div>
                </>
              )}
            </div>

            {extracted.insurance_notes && (
              <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-md p-2">
                <strong>Seguros:</strong> {extracted.insurance_notes}
              </p>
            )}
            {extracted.notes && (
              <p className="text-[11px] text-muted-foreground italic">{extracted.notes}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={applyExtracted}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirmar dados e aplicar
              </button>
              <button
                onClick={() => { setExtracted(null); setExtractedFileName(""); }}
                className="rounded-lg border border-border-subtle bg-secondary px-3 py-2.5 text-sm font-medium hover:bg-surface-hover"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DUAS COLUNAS: ATUAL vs SIMULAÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* === CRÉDITO ATUAL === */}
        <div className="rounded-xl border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-transparent p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Home className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold">O Seu Crédito Atual</h3>
                <p className="text-xs text-muted-foreground">Sincronizado com Minha Casa</p>
              </div>
            </div>
            <button
              onClick={loadCurrent}
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-hover"
              title="Recarregar"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {loadingCurrent ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className={labelCls}>Valor financiado (€)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={current.loan_amount === 0 ? "" : current.loan_amount}
                    onChange={(e) => setCurrent((p) => ({ ...p, loan_amount: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) }))}
                    className={inputCls}
                    placeholder="Ex: 120000"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Taxa anual (%)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={current.annual_rate === 0 ? "" : current.annual_rate}
                      onChange={(e) => setCurrent((p) => ({ ...p, annual_rate: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) }))}
                      className={inputCls}
                      placeholder="Ex: 3.5"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Prazo (anos)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={current.term_years === 0 ? "" : current.term_years}
                      onChange={(e) => setCurrent((p) => ({ ...p, term_years: e.target.value === "" ? 0 : Math.max(1, Math.min(50, Number(e.target.value))) }))}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="rounded-lg bg-card border border-border-subtle/60 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Prestação</p>
                  <p className="text-sm font-bold font-mono tabular-nums mt-0.5">{fmt2(currentPayment)}</p>
                </div>
                <div className="rounded-lg bg-card border border-border-subtle/60 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
                  <p className="text-sm font-bold font-mono tabular-nums mt-0.5">{fmt(currentTotalCost)}</p>
                </div>
                <div className="rounded-lg bg-card border border-border-subtle/60 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Juros</p>
                  <p className="text-sm font-bold font-mono tabular-nums text-destructive mt-0.5">{fmt(currentTotalInterest)}</p>
                </div>
              </div>

              <button
                onClick={handleSaveCurrent}
                disabled={savingCurrent}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {savingCurrent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Atualizar em Minha Casa
              </button>
              <p className="text-[11px] text-muted-foreground text-center">
                Estes dados aparecem automaticamente nos painéis de Esforço e Progresso
              </p>
            </>
          )}
        </div>

        {/* === SIMULE UM NOVO CRÉDITO === */}
        <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setSimCollapsed((v) => !v)}
              className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
              aria-expanded={!simCollapsed}
            >
              <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                <FlaskConical className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold flex items-center gap-1.5">
                  Simule um Novo Crédito
                  {simCollapsed ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  )}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {simCollapsed ? "Clique para expandir" : "Teste cenários sem afetar Minha Casa"}
                </p>
              </div>
            </button>
            {!simCollapsed && (
              <button
                onClick={copyCurrentToSim}
                className="text-[11px] rounded-md px-2 py-1 bg-primary/10 text-primary hover:bg-primary/20 font-medium shrink-0"
                title="Copiar dados do crédito atual"
              >
                ← Copiar atual
              </button>
            )}
          </div>

          {!simCollapsed && (
            <>
              {/* Tipo de taxa — segmented control */}
              <div>
                <label className={labelCls}>Tipo de taxa de juro</label>
                <div className="mt-1 grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
                  {([
                    { v: "fixed" as RateType, label: "Fixa" },
                    { v: "variable" as RateType, label: "Variável" },
                    { v: "mixed" as RateType, label: "Mista" },
                  ]).map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setRateType(opt.v)}
                      className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                        rateType === opt.v
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className={labelCls}>Nome da simulação</label>
                  <input
                    type="text"
                    value={simName}
                    onChange={(e) => setSimName(e.target.value)}
                    maxLength={100}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className={labelCls}>Valor do empréstimo (€)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={loanAmount === 0 ? "" : loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
                    className={inputCls}
                  />
                </div>

                {/* Inputs específicos por tipo de taxa */}
                {rateType === "fixed" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Taxa fixa anual (%)</label>
                      <input
                        type="number" inputMode="decimal" step="0.01"
                        value={annualRate === 0 ? "" : annualRate}
                        onChange={(e) => setAnnualRate(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Prazo (anos)</label>
                      <input
                        type="number" inputMode="numeric"
                        value={termYears === 0 ? "" : termYears}
                        onChange={(e) => setTermYears(e.target.value === "" ? 0 : Math.max(1, Math.min(50, Number(e.target.value))))}
                        className={inputCls}
                      />
                    </div>
                  </div>
                )}

                {rateType === "variable" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Indexante / Euribor (%)</label>
                        <input
                          type="number" step="0.01"
                          value={indexante === 0 ? "" : indexante}
                          onChange={(e) => setIndexante(e.target.value === "" ? 0 : Number(e.target.value))}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Spread (%)</label>
                        <input
                          type="number" step="0.01"
                          value={spread === 0 ? "" : spread}
                          onChange={(e) => setSpread(e.target.value === "" ? 0 : Number(e.target.value))}
                          className={inputCls}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Prazo (anos)</label>
                        <input
                          type="number"
                          value={termYears === 0 ? "" : termYears}
                          onChange={(e) => setTermYears(e.target.value === "" ? 0 : Math.max(1, Math.min(50, Number(e.target.value))))}
                          className={inputCls}
                        />
                      </div>
                      <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Taxa efetiva</p>
                        <p className="text-sm font-bold font-mono tabular-nums text-primary">{variableRate.toFixed(2)}%</p>
                      </div>
                    </div>
                  </>
                )}

                {rateType === "mixed" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Fase fixa (anos)</label>
                        <input
                          type="number"
                          value={fixedPeriodYears === 0 ? "" : fixedPeriodYears}
                          onChange={(e) => setFixedPeriodYears(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Taxa fixa inicial (%)</label>
                        <input
                          type="number" step="0.01"
                          value={fixedRateInitial === 0 ? "" : fixedRateInitial}
                          onChange={(e) => setFixedRateInitial(e.target.value === "" ? 0 : Number(e.target.value))}
                          className={inputCls}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Indexante (%)</label>
                        <input
                          type="number" step="0.01"
                          value={indexante === 0 ? "" : indexante}
                          onChange={(e) => setIndexante(e.target.value === "" ? 0 : Number(e.target.value))}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Spread (%)</label>
                        <input
                          type="number" step="0.01"
                          value={spread === 0 ? "" : spread}
                          onChange={(e) => setSpread(e.target.value === "" ? 0 : Number(e.target.value))}
                          className={inputCls}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Prazo total (anos)</label>
                        <input
                          type="number"
                          value={termYears === 0 ? "" : termYears}
                          onChange={(e) => setTermYears(e.target.value === "" ? 0 : Math.max(1, Math.min(50, Number(e.target.value))))}
                          className={inputCls}
                        />
                      </div>
                      <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Após {fixedPeriodYears}a</p>
                        <p className="text-sm font-bold font-mono tabular-nums text-primary">{variableRate.toFixed(2)}%</p>
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Rendimento (€) <span className="opacity-60">opc.</span></label>
                    <input
                      type="number"
                      value={monthlyIncome === 0 ? "" : monthlyIncome}
                      onChange={(e) => setMonthlyIncome(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Custos extra (€) <span className="opacity-60">opc.</span></label>
                    <input
                      type="number"
                      value={extraMonthlyCosts === 0 ? "" : extraMonthlyCosts}
                      onChange={(e) => setExtraMonthlyCosts(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>💥 Pagamento extra mensal (€)</label>
                  <input
                    type="number"
                    value={extraPayment === 0 ? "" : extraPayment}
                    onChange={(e) => setExtraPayment(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSaveSim}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar
                </button>
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-2 rounded-lg border border-border-subtle bg-secondary px-3 py-2 text-sm font-medium hover:bg-surface-hover"
                  title="Exportar CSV"
                >
                  <FileText className="h-4 w-4" />
                </button>
              </div>

              {/* RESULTADOS DA SIMULAÇÃO */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="rounded-xl border border-border-subtle/60 bg-card p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Wallet className="h-3 w-3" />
                    {rateType === "mixed" ? "Prestação fase 1" : "Prestação"}
                  </div>
                  <p className="mt-0.5 text-lg font-bold font-mono tabular-nums">{fmt2(basePayment)}</p>
                  {rateType === "mixed" && variablePhasePayment != null && (
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      depois: {fmt2(variablePhasePayment)}
                    </p>
                  )}
                  {rateType !== "mixed" && currentPayment > 0 && (
                    <p className={`text-[10px] font-mono mt-0.5 ${paymentDelta < 0 ? "text-success" : paymentDelta > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {paymentDelta > 0 ? "+" : ""}{fmt2(paymentDelta)} vs atual
                    </p>
                  )}
                </div>
                <div className="rounded-xl border border-border-subtle/60 bg-card p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><TrendingDown className="h-3 w-3" />Custo total</div>
                  <p className="mt-0.5 text-lg font-bold font-mono tabular-nums">{fmt(totalCost)}</p>
                  {currentTotalCost > 0 && (
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      atual: {fmt(currentTotalCost)}
                    </p>
                  )}
                </div>
                <div className="rounded-xl border border-border-subtle/60 bg-card p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><AlertCircle className="h-3 w-3" />Juros totais</div>
                  <p className="mt-0.5 text-lg font-bold font-mono tabular-nums text-destructive">{fmt(totalInterest)}</p>
                  {currentTotalInterest > 0 && (
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      atual: {fmt(currentTotalInterest)}
                    </p>
                  )}
                </div>
                <div className={`rounded-xl border border-border-subtle/60 p-3 ${effortStatus.bg}`}>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">{effortStatus.emoji} Taxa esforço</div>
                  <p className={`mt-0.5 text-lg font-bold font-mono tabular-nums ${effortStatus.color}`}>
                    {monthlyIncome > 0 ? `${effortRatio.toFixed(1)}%` : "—"}
                  </p>
                  <p className={`text-[10px] ${effortStatus.color}`}>{effortStatus.label}</p>
                </div>
              </div>

              {monthlyIncome > 0 && (
                <div className="rounded-lg border border-border-subtle/60 bg-card p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Custo real mensal</p>
                      <p className="text-base font-bold font-mono tabular-nums">{fmt2(realMonthlyCost)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">Margem mensal</p>
                      <p className={`text-base font-bold font-mono tabular-nums ${margin >= 0 ? "text-success" : "text-destructive"}`}>
                        {fmt2(margin)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {insights.length > 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <PiggyBank className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold">Insights da simulação</h4>
                  </div>
                  <ul className="space-y-1.5">
                    {insights.map((ins, i) => (
                      <li key={i} className="text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: ins.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Pagamento extra benefícios */}
      {extraPayment > 0 && interestSaved > 0 && (
        <div className="rounded-xl border border-success/30 bg-success/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-success" />
            <h3 className="font-semibold text-success">Impacto do pagamento extra</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Juros poupados</p>
              <p className="text-lg font-bold font-mono tabular-nums text-success">{fmt(interestSaved)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tempo poupado</p>
              <p className="text-lg font-bold">{yearsSaved}a {remainderMonths}m</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Novo prazo</p>
              <p className="text-lg font-bold">{Math.floor(extraSchedule.length / 12)}a {extraSchedule.length % 12}m</p>
            </div>
          </div>
        </div>
      )}

      {/* GRÁFICO dívida */}
      <div className="rounded-xl border border-border-subtle/60 bg-card p-5">
        <h3 className="font-semibold mb-3">Evolução da dívida (simulação)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} label={{ value: "Ano", position: "insideBottom", offset: -2, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: number) => fmt(v)}
                labelFormatter={(l) => `Ano ${l}`}
                contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", fontSize: "12px" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Area type="monotone" dataKey="balance" name="Dívida restante" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRÁFICO prestação ao longo do tempo (útil para mista) */}
      {(rateType === "mixed" || rateType === "variable") && (
        <div className="rounded-xl border border-border-subtle/60 bg-card p-5">
          <h3 className="font-semibold mb-3">Evolução da prestação</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(0)}€`} />
                <Tooltip
                  formatter={(v: number) => fmt2(v)}
                  labelFormatter={(l) => `Ano ${l}`}
                  contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", fontSize: "12px" }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line type="stepAfter" dataKey="payment" name="Prestação mensal" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border-subtle/60 bg-card p-5">
        <h3 className="font-semibold mb-3">Juros vs Capital (anual)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: number) => fmt(v)}
                labelFormatter={(l) => `Ano ${l}`}
                contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", fontSize: "12px" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Line type="monotone" dataKey="interest" name="Juros pagos" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="principal" name="Capital amortizado" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TABELA AMORTIZAÇÃO ANUAL */}
      {yearlyTable.length > 0 && (
        <div className="rounded-xl border border-border-subtle/60 bg-card p-4 sm:p-5">
          <button
            onClick={() => setTableCollapsed((v) => !v)}
            className="w-full flex items-center justify-between gap-2 hover:opacity-80 transition-opacity"
            aria-expanded={!tableCollapsed}
          >
            <h3 className="font-semibold flex items-center gap-2">
              Tabela de Amortização
              <span className="text-xs font-normal text-muted-foreground">({yearlyTable.length} anos)</span>
            </h3>
            {tableCollapsed ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            )}
          </button>

          {!tableCollapsed && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
              {yearlyTable.map((y) => {
                const isOpen = expandedYear === y.year;
                const principalPct = y.totalPayment > 0 ? (y.totalPrincipal / y.totalPayment) * 100 : 0;
                return (
                  <div
                    key={y.year}
                    className="rounded-xl border border-border-subtle/60 bg-background overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedYear(isOpen ? null : y.year)}
                      className="w-full p-3 flex items-center gap-3 hover:bg-surface-hover/40 transition-colors"
                    >
                      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                        {y.year}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            Ano {y.year} · taxa {y.rateAvg.toFixed(2)}%
                          </span>
                          <span className="text-xs font-mono tabular-nums text-muted-foreground">
                            dívida: <span className="text-foreground font-semibold">{fmt(y.endBalance)}</span>
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full rounded-full bg-destructive/20 overflow-hidden">
                          <div
                            className="h-full bg-success rounded-full transition-all"
                            style={{ width: `${principalPct}%` }}
                          />
                        </div>
                      </div>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </button>

                    <div className="px-3 pb-3 grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-muted/40 p-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pago</p>
                        <p className="text-xs font-bold font-mono tabular-nums">{fmt(y.totalPayment)}</p>
                      </div>
                      <div className="rounded-lg bg-destructive/5 p-2">
                        <p className="text-[10px] uppercase tracking-wide text-destructive/80">Juros</p>
                        <p className="text-xs font-bold font-mono tabular-nums text-destructive">{fmt(y.totalInterest)}</p>
                      </div>
                      <div className="rounded-lg bg-success/5 p-2">
                        <p className="text-[10px] uppercase tracking-wide text-success/80">Capital</p>
                        <p className="text-xs font-bold font-mono tabular-nums text-success">{fmt(y.totalPrincipal)}</p>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="border-t border-border-subtle/60 bg-muted/20 p-2 space-y-1">
                        <div className="grid grid-cols-5 gap-1 px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                          <span>Mês</span>
                          <span className="text-right">Taxa</span>
                          <span className="text-right">Pago</span>
                          <span className="text-right">Juros</span>
                          <span className="text-right">Capital</span>
                        </div>
                        {y.rows.map((r, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-5 gap-1 px-2 py-1.5 rounded-md bg-background text-[11px] font-mono tabular-nums"
                          >
                            <span className="font-semibold text-muted-foreground">{MONTH_NAMES_SHORT[r.month - 1]}</span>
                            <span className="text-right text-muted-foreground">{r.rateApplied.toFixed(2)}%</span>
                            <span className="text-right">{fmt2(r.payment)}</span>
                            <span className="text-right text-destructive">{fmt2(r.interest)}</span>
                            <span className="text-right text-success">{fmt2(r.principal)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="md:col-span-2 flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" /> Capital</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive/40" /> Juros</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SIMULAÇÕES GUARDADAS */}
      {savedSims.length > 0 && (
        <div className="rounded-xl border border-border-subtle/60 bg-card p-5">
          <h3 className="font-semibold mb-3">Simulações guardadas</h3>
          <div className="space-y-2">
            {savedSims.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-border-subtle/40 bg-background p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmt(Number(s.loan_amount))} • {s.annual_rate}% • {s.term_years}a
                    {s.rate_type && s.rate_type !== "fixed" && (
                      <span className="ml-1 inline-block px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] uppercase">
                        {s.rate_type === "variable" ? "Variável" : "Mista"}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleLoad(s)}
                    className="rounded-md px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20"
                  >
                    Carregar
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MortgageSimulator;
