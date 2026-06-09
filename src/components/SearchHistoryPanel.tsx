import { SearchHistory } from "@/types/lead";
import { Clock, Flame, Snowflake, MapPin } from "lucide-react";

interface Props { history: SearchHistory[]; }

export function SearchHistoryPanel({ history }: Props) {
  if (history.length === 0) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">
        <Clock className="w-8 h-8 mx-auto mb-3 opacity-40" />
        Nenhuma busca registrada ainda.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {history.map(h => (
        <div key={h.id} className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">{h.query.niche}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {h.query.cities.join(', ')} · {h.query.state}
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-1">
                {new Date(h.executedAt).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1 text-hot font-medium"><Flame className="w-3 h-3" />{h.hotLeads}</span>
            <span className="flex items-center gap-1 text-cold font-medium"><Snowflake className="w-3 h-3" />{h.coldLeads}</span>
            <span className="font-display text-xl text-foreground tabular-nums">{h.leadsFound}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
