import { useMemo } from "react";
import { Lead } from "@/types/lead";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, ShieldCheck, Globe, MapPin } from "lucide-react";

interface Props { leads: Lead[]; }

const COLORS = ['hsl(217 91% 60%)', 'hsl(24 95% 53%)', 'hsl(142 71% 45%)', 'hsl(280 65% 60%)', 'hsl(199 89% 48%)'];

export function MetricsView({ leads }: Props) {
  const data = useMemo(() => {
    const byCity = new Map<string, number>();
    const byNiche = new Map<string, number>();
    let withSite = 0, withWhats = 0, verified = 0, withInsta = 0;
    for (const l of leads) {
      byCity.set(l.city, (byCity.get(l.city) || 0) + 1);
      byNiche.set(l.niche, (byNiche.get(l.niche) || 0) + 1);
      if (l.website) withSite++;
      if (l.whatsapp) withWhats++;
      if (l.whatsappVerified) verified++;
      if (l.instagram) withInsta++;
    }
    const topCities = [...byCity.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
    const niches = [...byNiche.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));
    return { topCities, niches, withSite, withWhats, verified, withInsta, total: leads.length };
  }, [leads]);

  if (!leads.length) {
    return (
      <div className="rounded-3xl border border-border bg-gradient-to-br from-card via-card to-muted/30 p-16 text-center shadow-elev relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-success/10 blur-3xl" />
        <div className="relative">
          <div className="inline-flex p-4 rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <TrendingUp className="w-10 h-10 text-primary" />
          </div>
          <h3 className="font-display text-3xl mt-5 mb-2 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">Suas métricas vão brilhar aqui</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">Rode uma busca no painel e voltamos com KPIs, top cidades e composição por nicho em tempo real.</p>
        </div>
      </div>
    );
  }

  const pct = (n: number) => data.total ? Math.round((n / data.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Com WhatsApp" value={`${pct(data.withWhats)}%`} sub={`${data.withWhats}/${data.total}`} icon={<TrendingUp className="w-4 h-4" />} accent="primary" />
        <KpiCard label="Verificados" value={`${pct(data.verified)}%`} sub={`${data.verified} ativos`} icon={<ShieldCheck className="w-4 h-4" />} accent="success" />
        <KpiCard label="Sem website" value={`${pct(data.total - data.withSite)}%`} sub="oportunidades 🔥" icon={<Globe className="w-4 h-4" />} accent="hot" />
        <KpiCard label="Com Instagram" value={`${pct(data.withInsta)}%`} sub={`${data.withInsta} perfis`} icon={<MapPin className="w-4 h-4" />} accent="cold" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Distribuição</p>
              <h3 className="font-display text-2xl">Top cidades</h3>
            </div>
            <span className="text-xs text-muted-foreground">{data.topCities.length} cidades</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.topCities} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Por nicho</p>
          <h3 className="font-display text-2xl mb-4">Composição</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data.niches} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                {data.niches.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon, accent }: { label: string; value: string; sub: string; icon: React.ReactNode; accent: 'primary' | 'success' | 'hot' | 'cold' }) {
  const colorMap = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    hot: 'text-hot bg-hot/10',
    cold: 'text-cold bg-cold/10',
  } as const;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className={`p-1.5 rounded-lg ${colorMap[accent]}`}>{icon}</span>
      </div>
      <p className="font-display text-4xl text-foreground leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-2">{sub}</p>
    </div>
  );
}

function BarChartIcon() {
  return (
    <div className="inline-flex p-4 rounded-2xl bg-muted">
      <TrendingUp className="w-10 h-10 text-muted-foreground/60" />
    </div>
  );
}
