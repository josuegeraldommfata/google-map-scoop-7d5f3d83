import { useState, useCallback } from "react";
import { SearchForm } from "@/components/SearchForm";
import { StatsCards } from "@/components/StatsCards";
import { LeadsTable } from "@/components/LeadsTable";
import { SearchHistoryPanel } from "@/components/SearchHistoryPanel";
import { Lead, SearchQuery, SearchHistory } from "@/types/lead";
import { Crosshair, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Index() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const hotLeads = leads.filter(l => l.type === 'hot').length;
  const coldLeads = leads.filter(l => l.type === 'cold').length;

  const handleSearch = useCallback(async (query: SearchQuery) => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-leads', {
        body: query,
      });
      if (error) throw error;
      const newLeads: Lead[] = (data?.leads || []) as Lead[];

      if (newLeads.length === 0) {
        toast.warning('Nenhum lead encontrado. Tente outro nicho ou cidade.');
      } else {
        toast.success(`${newLeads.length} leads capturados!`);
      }

      setLeads(prev => {
        const existingIds = new Set(prev.map(l => l.name + l.city));
        const unique = newLeads.filter(l => !existingIds.has(l.name + l.city));
        return [...prev, ...unique];
      });

      const hot = newLeads.filter(l => l.type === 'hot').length;
      const cold = newLeads.filter(l => l.type === 'cold').length;

      setHistory(prev => [{
        id: Math.random().toString(36).substring(2),
        query,
        leadsFound: newLeads.length,
        hotLeads: hot,
        coldLeads: cold,
        executedAt: new Date().toISOString(),
      }, ...prev]);
    } catch (e) {
      console.error('Erro na busca:', e);
      toast.error('Erro ao buscar leads. Tente novamente.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 glow-primary">
              <Crosshair className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-heading font-bold text-foreground tracking-tight">Leads Hunter</h1>
              <p className="text-[11px] text-muted-foreground -mt-0.5">Prospecção inteligente via Google Maps</p>
            </div>
          </div>
          {leads.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="w-4 h-4 text-primary" />
              <span className="font-medium text-foreground">{leads.length}</span> leads capturados
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SearchForm onSearch={handleSearch} isSearching={isSearching} />
          </div>
          <div>
            <SearchHistoryPanel history={history} />
          </div>
        </div>

        {leads.length > 0 && (
          <>
            <StatsCards total={leads.length} hot={hotLeads} cold={coldLeads} />
            <LeadsTable leads={leads} />
          </>
        )}

        {leads.length === 0 && !isSearching && (
          <div className="text-center py-20 animate-slide-up">
            <div className="inline-flex p-4 rounded-2xl bg-primary/5 mb-4">
              <Crosshair className="w-12 h-12 text-primary/40" />
            </div>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
              Pronto para caçar leads?
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Preencha o formulário acima com o nicho e as cidades desejadas para iniciar a busca automatizada no Google Maps.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
