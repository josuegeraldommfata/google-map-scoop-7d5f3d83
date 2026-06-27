import { useState } from "react";
import { SearchHistory, Lead } from "@/types/lead";
import { Clock, Flame, Snowflake, MapPin, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { loadLeadsBySearch } from "@/lib/leadsRepo";
import { LeadsTable } from "@/components/LeadsTable";

interface Props { history: SearchHistory[]; }

export function SearchHistoryPanel({ history }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [leadsById, setLeadsById] = useState<Record<string, Lead[]>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (history.length === 0) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">
        <Clock className="w-8 h-8 mx-auto mb-3 opacity-40" />
        Nenhuma busca registrada ainda.
      </div>
    );
  }

  const toggle = async (h: SearchHistory) => {
    if (openId === h.id) { setOpenId(null); return; }
    setOpenId(h.id);
    if (!leadsById[h.id] && !h.id.startsWith('arch_')) {
      setLoadingId(h.id);
      const leads = await loadLeadsBySearch(h.id);
      setLeadsById(prev => ({ ...prev, [h.id]: leads }));
      setLoadingId(null);
    }
  };

  return (
    <div className="divide-y divide-border">
      {history.map(h => {
        const open = openId === h.id;
        const leads = leadsById[h.id] || [];
        const isArchive = h.id.startsWith('arch_');
        return (
          <div key={h.id}>
            <button
              onClick={() => toggle(h)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors text-left"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
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
            </button>

            {open && (
              <div className="px-4 pb-6 pt-2 bg-muted/20">
                {isArchive ? (
                  <p className="text-xs text-muted-foreground px-2 py-4">
                    Este lote foi arquivado da tela (mock). Os leads em si ficam na lista principal — buscas executadas pela ferramenta exibem os contatos completos aqui.
                  </p>
                ) : loadingId === h.id ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground p-4">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> carregando leads desta busca...
                  </div>
                ) : leads.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-2 py-4">
                    Nenhum lead salvo para esta busca.
                  </p>
                ) : (
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <LeadsTable leads={leads} />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
