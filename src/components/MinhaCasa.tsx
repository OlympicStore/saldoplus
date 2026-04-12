import { useState, useEffect } from "react";
import { Home, TrendingUp, AlertTriangle, ShieldCheck, Loader2, Info, MessageCircle, Phone, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface HouseData {
  id?: string;
  house_value: number;
  monthly_payment: number;
  estimated_expenses: number;
  monthly_income: number;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

const MinhaCasa = () => {
  const { user, partnerBranding } = useAuth();
  const [data, setData] = useState<HouseData>({
    house_value: 0,
    monthly_payment: 0,
    estimated_expenses: 0,
    monthly_income: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (data.id) {
        const { error } = await supabase
          .from("house_data")
          .update({
            house_value: data.house_value,
            monthly_payment: data.monthly_payment,
            estimated_expenses: data.estimated_expenses,
            monthly_income: data.monthly_income,
          })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { data: row, error } = await supabase
          .from("house_data")
          .insert({
            user_id: user.id,
            house_value: data.house_value,
            monthly_payment: data.monthly_payment,
            estimated_expenses: data.estimated_expenses,
            monthly_income: data.monthly_income,
          })
          .select()
          .single();
        if (error) throw error;
        setData((prev) => ({ ...prev, id: row.id }));
      }
      toast.success("Dados guardados com sucesso.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  };

  const ratio =
    data.monthly_income > 0
      ? (data.monthly_payment / data.monthly_income) * 100
      : 0;

  const totalHousing = data.monthly_payment + data.estimated_expenses;
  const margin = data.monthly_income - totalHousing;

  const getStatus = () => {
    if (ratio < 30) return { label: "Seguro", color: "text-status-paid", bg: "bg-status-paid/10", icon: ShieldCheck };
    if (ratio <= 40) return { label: "Atenção", color: "text-yellow-500", bg: "bg-yellow-500/10", icon: AlertTriangle };
    return { label: "Risco", color: "text-status-negative", bg: "bg-status-negative/10", icon: AlertTriangle };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

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

      {/* Info banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex gap-3">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm text-text-muted">
          <p className="font-medium text-foreground mb-1">Nota importante</p>
          <p>
            Esta secção serve apenas para <strong>acompanhar o impacto da habitação no seu orçamento</strong>.
            As despesas da casa (prestação, condomínio, seguros, etc.) devem também ser registadas na aba <strong>"Despesas"</strong> para
            serem incluídas no saldo, balanço mensal e resumo anual.
          </p>
        </div>
      </div>

      {/* Indicator */}
      <div className={`rounded-xl border border-border-subtle/60 p-5 ${status.bg}`}>
        <div className="flex items-center gap-3">
          <StatusIcon className={`h-8 w-8 ${status.color}`} />
          <div>
            <p className={`text-2xl font-bold ${status.color} font-mono tabular-nums`}>
              {ratio.toFixed(1)}%
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
      </div>

      {/* Summary cards */}
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
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 w-full sm:w-auto px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
          {saving ? "A guardar..." : "Guardar dados"}
        </button>
      </div>
    </div>
  );
};

export default MinhaCasa;
