import { SearchHistory } from "@/types/lead";
import { Clock, Flame, Snowflake } from "lucide-react";

interface Props {
  history: SearchHistory[];
}

export function SearchHistoryPanel({ history }: Props) {
  if (history.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-heading font-semibold text-foreground">Histórico de Buscas</h3>
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {history.map(h => (
          <div key={h.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-xs">
            <div>
              <p className="font-medium text-foreground">{h.query.niche} — {h.query.cities.join(', ')}/{h.query.state}</p>
              <p className="text-muted-foreground mt-0.5">
                {new Date(h.executedAt).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-hot"><Flame className="w-3 h-3" />{h.hotLeads}</span>
              <span className="flex items-center gap-1 text-cold"><Snowflake className="w-3 h-3" />{h.coldLeads}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
