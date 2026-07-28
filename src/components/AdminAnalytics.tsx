import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, CreditCard, TrendingUp, Percent, Euro, Calendar, BarChart3, Eye, MousePointerClick,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string;
  created_at: string;
  plan: string | null;
  plan_started_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
  partner_id: string | null;
};

type Visit = {
  session_id: string;
  path: string;
  device: string | null;
  utm_source: string | null;
  created_at: string;
};


const PLAN_PRICE_MONTHLY: Record<string, number> = {
  essencial: 2.99,
  casa: 4.99,
  pro: 13.33, // 159.99 / 12
  imobiliaria: 0,
};

const PRESETS: { label: string; days: number }[] = [
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
  { label: "365 dias", days: 365 },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };

export default function AdminAnalytics() {
  const [rows, setRows] = useState<Row[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<{ from: string; to: string }>(() => {
    const to = new Date();
    const from = new Date(); from.setDate(from.getDate() - 29);
    return { from: iso(from), to: iso(to) };
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [profilesRes, visitsRes] = await Promise.all([
        supabase.from("profiles").select("id, created_at, plan, plan_started_at, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, partner_id"),
        supabase.from("site_visits").select("session_id, path, device, utm_source, created_at").order("created_at", { ascending: false }).limit(10000),
      ]);
      setRows((profilesRes.data as Row[]) || []);
      setVisits((visitsRes.data as Visit[]) || []);
      setLoading(false);
    })();
  }, []);


  const setPreset = (days: number) => {
    const to = new Date();
    const from = new Date(); from.setDate(from.getDate() - (days - 1));
    setRange({ from: iso(from), to: iso(to) });
  };

  const filtered = useMemo(() => {
    const from = startOfDay(new Date(range.from)).getTime();
    const to = startOfDay(new Date(range.to)).getTime() + 24 * 3600 * 1000 - 1;
    return rows.filter(r => {
      const t = new Date(r.created_at).getTime();
      return t >= from && t <= to;
    });
  }, [rows, range]);

  const filteredVisits = useMemo(() => {
    const from = startOfDay(new Date(range.from)).getTime();
    const to = startOfDay(new Date(range.to)).getTime() + 24 * 3600 * 1000 - 1;
    return visits.filter(v => {
      const t = new Date(v.created_at).getTime();
      return t >= from && t <= to;
    });
  }, [visits, range]);

  const metrics = useMemo(() => {
    const signups = filtered.length;
    const checkouts = filtered.filter(r => !!r.stripe_customer_id || !!r.stripe_subscription_id).length;
    const trials = filtered.filter(r => r.stripe_subscription_status === "trialing").length;
    const active = filtered.filter(r => r.stripe_subscription_status === "active").length;
    const paying = filtered.filter(r => ["active", "trialing", "past_due"].includes(r.stripe_subscription_status || "")).length;
    const pageviews = filteredVisits.length;
    const uniqueVisitors = new Set(filteredVisits.map(v => v.session_id)).size;
    const convVisits = uniqueVisitors > 0 ? (paying / uniqueVisitors) * 100 : 0;
    const convSignups = signups > 0 ? (paying / signups) * 100 : 0;
    const mrr = filtered.reduce((s, r) => {
      if (["active", "trialing"].includes(r.stripe_subscription_status || "")) {
        return s + (PLAN_PRICE_MONTHLY[r.plan || ""] || 0);
      }
      return s;
    }, 0);
    return { signups, checkouts, trials, active, paying, convVisits, convSignups, mrr, pageviews, uniqueVisitors };
  }, [filtered, filteredVisits]);

  const daily = useMemo(() => {
    const map = new Map<string, { date: string; visitors: number; signups: number; checkouts: number; conversions: number; _sessions: Set<string> }>();
    const from = startOfDay(new Date(range.from));
    const to = startOfDay(new Date(range.to));
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const key = iso(d);
      map.set(key, { date: key, visitors: 0, signups: 0, checkouts: 0, conversions: 0, _sessions: new Set() });
    }
    filteredVisits.forEach(v => {
      const key = iso(new Date(v.created_at));
      const b = map.get(key);
      if (!b) return;
      if (!b._sessions.has(v.session_id)) {
        b._sessions.add(v.session_id);
        b.visitors += 1;
      }
    });
    filtered.forEach(r => {
      const key = iso(new Date(r.created_at));
      const b = map.get(key);
      if (!b) return;
      b.signups += 1;
      if (r.stripe_customer_id || r.stripe_subscription_id) b.checkouts += 1;
      if (["active", "trialing", "past_due"].includes(r.stripe_subscription_status || "")) b.conversions += 1;
    });
    return Array.from(map.values()).map(d => ({
      date: d.date,
      visitors: d.visitors,
      signups: d.signups,
      checkouts: d.checkouts,
      conversions: d.conversions,
      label: new Date(d.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" }),
    }));
  }, [filtered, filteredVisits, range]);

  const byPlan = useMemo(() => {
    const map: Record<string, number> = { essencial: 0, casa: 0, pro: 0, imobiliaria: 0 };
    filtered.forEach(r => {
      if (r.plan && map[r.plan] !== undefined) map[r.plan] += 1;
    });
    return Object.entries(map).map(([plan, count]) => ({ plan, count }));
  }, [filtered]);

  const bySource = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredVisits.forEach(v => {
      const key = v.utm_source || "Direto";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [filteredVisits]);

  const byDevice = useMemo(() => {
    const counts: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0 };
    filteredVisits.forEach(v => {
      const key = v.device || "desktop";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([device, count]) => ({ device, count }));
  }, [filteredVisits]);

  const kpis = [
    { label: "Visitantes únicos", value: metrics.uniqueVisitors, icon: Eye, tint: "text-primary", bg: "bg-primary/10" },
    { label: "Pageviews", value: metrics.pageviews, icon: MousePointerClick, tint: "text-accent", bg: "bg-accent/10" },
    { label: "Registos", value: metrics.signups, icon: Users, tint: "text-primary", bg: "bg-primary/10" },
    { label: "Checkouts iniciados", value: metrics.checkouts, icon: CreditCard, tint: "text-accent", bg: "bg-accent/10" },
    { label: "Em trial", value: metrics.trials, icon: Calendar, tint: "text-yellow-600", bg: "bg-yellow-500/10" },
    { label: "Ativos", value: metrics.active, icon: TrendingUp, tint: "text-status-paid", bg: "bg-status-paid/10" },
    { label: "Conv. visita→cliente", value: `${metrics.convVisits.toFixed(1)}%`, icon: Percent, tint: "text-primary", bg: "bg-primary/10" },
    { label: "MRR estimado", value: `€ ${metrics.mrr.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: Euro, tint: "text-status-paid", bg: "bg-status-paid/10" },
  ];


  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-surface rounded-2xl shadow-card border border-border-subtle/60 p-5 sm:p-6 mb-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground tracking-tight">Analytics</h2>
            <p className="text-xs text-text-muted">Registos, checkouts e conversões</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map(p => (
            <button
              key={p.days}
              onClick={() => setPreset(p.days)}
              className="px-2.5 py-1.5 text-xs rounded-lg bg-secondary text-foreground hover:bg-secondary/70 transition-colors"
            >
              {p.label}
            </button>
          ))}
          <input
            type="date" value={range.from}
            onChange={(e) => setRange(r => ({ ...r, from: e.target.value }))}
            className="px-2 py-1.5 text-xs bg-background border border-border-subtle rounded-lg"
          />
          <span className="text-xs text-text-muted">→</span>
          <input
            type="date" value={range.to}
            onChange={(e) => setRange(r => ({ ...r, to: e.target.value }))}
            className="px-2 py-1.5 text-xs bg-background border border-border-subtle rounded-lg"
          />
        </div>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center text-text-muted text-sm">A carregar…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
            {kpis.map(k => (
              <div key={k.label} className="rounded-xl border border-border-subtle/60 bg-background/50 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-6 h-6 rounded-lg ${k.bg} ${k.tint} flex items-center justify-center`}>
                    <k.icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">{k.label}</span>
                </div>
                <p className="text-xl font-bold text-foreground tabular-nums">{k.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border-subtle/60 bg-background/50 p-4 mb-6">
            <p className="text-sm font-semibold text-foreground mb-3">Evolução diária</p>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={daily}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(160,84%,39%)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(160,84%,39%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(38,92%,50%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(38,92%,50%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(214,85%,55%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(214,85%,55%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g4" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(280,70%,55%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(280,70%,55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="visitors" name="Visitantes" stroke="hsl(280,70%,55%)" fill="url(#g4)" strokeWidth={2} />
                  <Area type="monotone" dataKey="signups" name="Registos" stroke="hsl(160,84%,39%)" fill="url(#g1)" strokeWidth={2} />
                  <Area type="monotone" dataKey="checkouts" name="Checkouts" stroke="hsl(214,85%,55%)" fill="url(#g3)" strokeWidth={2} />
                  <Area type="monotone" dataKey="conversions" name="Conversões" stroke="hsl(38,92%,50%)" fill="url(#g2)" strokeWidth={2} />

                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border-subtle/60 bg-background/50 p-4">
              <p className="text-sm font-semibold text-foreground mb-3">Registos por plano</p>
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={byPlan}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
                    <XAxis dataKey="plan" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(160,84%,39%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-xl border border-border-subtle/60 bg-background/50 p-4">
              <p className="text-sm font-semibold text-foreground mb-3">Origem</p>
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={bySource}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
                    <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(214,85%,55%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-text-muted mt-4">
            Dados calculados a partir dos registos e subscrições Stripe. Para tráfego do site (visitantes, origem, dispositivos), consulte o painel de Analytics do Lovable.
          </p>
        </>
      )}
    </motion.section>
  );
}
