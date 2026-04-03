import { Users, Flame, Snowflake, TrendingUp } from "lucide-react";

interface Props {
  total: number;
  hot: number;
  cold: number;
}

export function StatsCards({ total, hot, cold }: Props) {
  const hotPercent = total > 0 ? Math.round((hot / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <span className="text-sm text-muted-foreground">Total de Leads</span>
        </div>
        <p className="text-3xl font-heading font-bold text-foreground">{total}</p>
      </div>

      <div className="rounded-xl border border-hot/20 bg-card p-5 gradient-hot">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-hot/15">
            <Flame className="w-5 h-5 text-hot" />
          </div>
          <span className="text-sm text-muted-foreground">Leads Quentes</span>
        </div>
        <p className="text-3xl font-heading font-bold text-hot">{hot}</p>
        <p className="text-xs text-muted-foreground mt-1">Sem website — potencial alto</p>
      </div>

      <div className="rounded-xl border border-cold/20 bg-card p-5 gradient-cold">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-cold/15">
            <Snowflake className="w-5 h-5 text-cold" />
          </div>
          <span className="text-sm text-muted-foreground">Leads Frios</span>
        </div>
        <p className="text-3xl font-heading font-bold text-cold">{cold}</p>
        <p className="text-xs text-muted-foreground mt-1">Já possuem website</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-success/10">
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <span className="text-sm text-muted-foreground">Taxa Quentes</span>
        </div>
        <p className="text-3xl font-heading font-bold text-foreground">{hotPercent}%</p>
        <p className="text-xs text-muted-foreground mt-1">Oportunidade de prospecção</p>
      </div>
    </div>
  );
}
