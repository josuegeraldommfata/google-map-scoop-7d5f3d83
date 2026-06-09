import { Users, Flame, Snowflake, TrendingUp } from "lucide-react";

interface Props { total: number; hot: number; cold: number; }

export function StatsCards({ total, hot, cold }: Props) {
  const hotPercent = total > 0 ? Math.round((hot / total) * 100) : 0;

  const items = [
    { label: 'Total de Leads', value: total, sub: 'capturados', Icon: Users, tone: 'primary' as const },
    { label: 'Leads Quentes', value: hot, sub: 'sem website', Icon: Flame, tone: 'hot' as const },
    { label: 'Leads Frios', value: cold, sub: 'já têm presença', Icon: Snowflake, tone: 'cold' as const },
    { label: 'Taxa Quentes', value: `${hotPercent}%`, sub: 'oportunidade', Icon: TrendingUp, tone: 'success' as const },
  ];

  const toneMap = {
    primary: 'text-primary bg-primary/10',
    hot: 'text-hot bg-hot/10',
    cold: 'text-cold bg-cold/10',
    success: 'text-success bg-success/10',
  } as const;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((it) => (
        <div key={it.label} className="rounded-2xl border border-border bg-card p-5 shadow-soft hover:shadow-elev transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{it.label}</span>
            <span className={`p-1.5 rounded-lg ${toneMap[it.tone]}`}>
              <it.Icon className="w-4 h-4" />
            </span>
          </div>
          <p className="font-display text-4xl text-foreground leading-none">{it.value}</p>
          <p className="text-xs text-muted-foreground mt-2">{it.sub}</p>
        </div>
      ))}
    </div>
  );
}
