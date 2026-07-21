import { useState, useCallback, useEffect } from "react";
import { SearchForm } from "@/components/SearchForm";
import { LeadsTable } from "@/components/LeadsTable";
import { SearchHistoryPanel } from "@/components/SearchHistoryPanel";
import { MetricsView } from "@/components/MetricsView";
import { CrmKanban } from "@/components/CrmKanban";
import { AppSidebar } from "@/components/AppSidebar";
import { SearchConsole } from "@/components/SearchConsole";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Lead, SearchQuery, SearchHistory } from "@/types/lead";
import { Zap, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { saveSearch, loadAll, clearAll } from "@/lib/leadsRepo";
import { log } from "@/lib/consoleLog";
import { canSearch, incrementUsage } from "@/lib/plan";

type View = 'search' | 'metrics' | 'history' | 'crm';

export default function Index() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [view, setView] = useState<View>('search');

  useEffect(() => {
    loadAll().then(({ leads, history }) => {
      setLeads(leads);
      setHistory(history);
    }).catch(e => console.error('load', e));
  }, []);

  const hotLeads = leads.filter(l => l.type === 'hot').length;

  const handleSearch = useCallback(async (query: SearchQuery) => {
    const guard = canSearch(query.quantity);
    if (!guard.allowed) {
      log.error(guard.reason || "Busca bloqueada pelo plano.");
      toast.error(guard.reason || "Busca bloqueada pelo plano.");
      return;
    }
    const effectiveQuery: SearchQuery = { ...query, quantity: guard.cappedQuantity };
    setIsSearching(true);
    log.info(`Iniciando varredura · nicho="${effectiveQuery.niche}" · ${effectiveQuery.cities.join(", ")}/${effectiveQuery.state} · meta=${effectiveQuery.quantity} · plano=${guard.limits.label}`);
    if (effectiveQuery.keywords.length) log.info(`Palavras-chave: ${effectiveQuery.keywords.join(", ")}`);
    const startedAt = performance.now();
    try {
      log.info("Conectando ao motor de busca (Google Maps + enriquecimento)...");
      const { data, error } = await supabase.functions.invoke('scrape-leads', { body: effectiveQuery });
      if (error) throw error;
      const newLeads: Lead[] = (data?.leads || []) as Lead[];
      const elapsed = ((performance.now() - startedAt) / 1000).toFixed(1);
      incrementUsage();

      if (newLeads.length === 0) {
        log.warn(`Nenhum lead retornado em ${elapsed}s. Tente outro nicho ou cidade.`);
        toast.warning('Nenhum lead encontrado. Tente outro nicho ou cidade.');
      } else {
        const hot = newLeads.filter(l => l.type === 'hot').length;
        const cold = newLeads.filter(l => l.type === 'cold').length;
        log.success(`${newLeads.length} leads capturados em ${elapsed}s · 🔥 ${hot} quentes · ❄ ${cold} frios`);
        toast.success(`${newLeads.length} leads capturados!`);
      }

      setLeads(prev => {
        const existing = new Set(prev.map(l => (l.name + l.city).toLowerCase()));
        const unique = newLeads.filter(l => !existing.has((l.name + l.city).toLowerCase()));
        if (unique.length !== newLeads.length) {
          log.info(`${newLeads.length - unique.length} duplicados ignorados (já estavam na sessão)`);
        }
        return [...unique, ...prev];
      });

      const hot = newLeads.filter(l => l.type === 'hot').length;
      const cold = newLeads.filter(l => l.type === 'cold').length;

      const localEntry: SearchHistory = {
        id: Math.random().toString(36).slice(2),
        query, leadsFound: newLeads.length, hotLeads: hot, coldLeads: cold,
        executedAt: new Date().toISOString(),
      };
      setHistory(prev => [localEntry, ...prev]);

      saveSearch(query, newLeads).catch(e => console.error('save', e));
    } catch (e) {
      console.error('Erro na busca:', e);
      log.error(`Falha na busca: ${(e as Error)?.message || e}`);
      toast.error('Erro ao buscar leads. Tente novamente.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleClear = async () => {
    if (!confirm('Apagar todos os leads e histórico salvos desta sessão?')) return;
    await clearAll();
    setLeads([]);
    setHistory([]);
    log.warn("Sessão totalmente limpa (leads + histórico apagados).");
    toast.success('Dados limpos.');
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar active={view} onChange={setView} onClear={handleClear} totalLeads={leads.length} />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40 flex items-center px-6 gap-4">
            <SidebarTrigger />
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Painel</p>
              <h1 className="font-display text-2xl leading-none text-foreground">
                {view === 'search' && 'Caçar Leads'}
                {view === 'metrics' && 'Métricas'}
                {view === 'history' && 'Histórico de Buscas'}
                {view === 'crm' && 'Meu Funil'}
              </h1>
            </div>
            {leads.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                <Zap className="w-3.5 h-3.5" />
                <span>{leads.length} leads na sessão</span>
              </div>
            )}
            <ThemeToggle />
          </header>

          <main className="flex-1 overflow-auto">
            <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
              {view === 'search' && (
                <>
                  {/* Hero editorial */}
                  <div className="relative rounded-3xl border border-border bg-card overflow-hidden shadow-soft">
                    <div className="absolute inset-0 dot-grid opacity-40" />
                    <div className="relative px-8 py-10 flex items-center justify-between gap-8 flex-wrap">
                      <div className="max-w-xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft text-primary text-[11px] font-medium mb-3">
                          <Sparkles className="w-3 h-3" /> Google Maps · WhatsApp · Instagram
                        </div>
                        <h2 className="font-display text-5xl text-foreground leading-[1.05]">
                          Prospecção <em className="text-primary not-italic">cirúrgica</em>,
                          <br /> em segundos.
                        </h2>
                        <p className="text-sm text-muted-foreground mt-3 max-w-md">
                          Busque por nicho, cidade e estado. Capturamos nome, telefone, WhatsApp, Instagram e site — exporte a lista ou dispare individualmente pelo WhatsApp.
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-6 text-center">
                        <Stat n={leads.length} label="leads" />
                        <Stat n={hotLeads} label="quentes" tone="hot" />
                        <Stat n={history.length} label="buscas" />
                      </div>
                    </div>
                  </div>

                  <SearchForm onSearch={handleSearch} isSearching={isSearching} />

                  <SearchConsole />

                  <LeadsTable leads={leads} />
                </>
              )}

              {leads.length === 0 && !isSearching && view === 'search' && (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  Preencha o formulário acima para iniciar sua primeira caça.
                </div>
              )}

              {view === 'metrics' && <MetricsView leads={leads} />}

              {view === 'crm' && <CrmKanban />}

              {view === 'history' && (
                <div className="rounded-2xl border border-border bg-card p-2 shadow-soft">
                  <SearchHistoryPanel history={history} />
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Stat({ n, label, tone }: { n: number; label: string; tone?: 'hot' }) {
  return (
    <div>
      <p className={`font-display text-4xl leading-none ${tone === 'hot' ? 'text-hot' : 'text-foreground'}`}>{n}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
