import { useState, useCallback, useEffect } from "react";
import { SearchForm } from "@/components/SearchForm";
import { StatsCards } from "@/components/StatsCards";
import { LeadsTable } from "@/components/LeadsTable";
import { SearchHistoryPanel } from "@/components/SearchHistoryPanel";
import { MetricsView } from "@/components/MetricsView";
import { AppSidebar } from "@/components/AppSidebar";
import { SearchConsole } from "@/components/SearchConsole";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Lead, SearchQuery, SearchHistory } from "@/types/lead";
import { Zap, Sparkles, Eraser } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { saveSearch, loadAll, clearAll } from "@/lib/leadsRepo";
import { log } from "@/lib/consoleLog";
import { useEvolution } from '@/hooks/useEvolution';
import { activateRobot } from '@/services/evolution';


type View = 'search' | 'metrics' | 'history';

export default function Index() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [view, setView] = useState<View>('search');

  // Plano 2 (Robô) Evolution state
  const {
    loading: evolutionLoading,
    qrCode,
    status: evolutionStatus,
    reconnect,
    disconnect,
  } = useEvolution();

  const [robotRunning, setRobotRunning] = useState(false);
  const [robotProgressPct, setRobotProgressPct] = useState(0);
  const [robotCounts, setRobotCounts] = useState({ queued: 0, sent: 0, failed: 0 });
  const [robotAbortController, setRobotAbortController] = useState<AbortController | null>(null);



  useEffect(() => {
    loadAll().then(({ leads, history }) => {
      setLeads(leads);
      setHistory(history);
    }).catch(e => console.error('load', e));
  }, []);

  const hotLeads = leads.filter(l => l.type === 'hot').length;
  const coldLeads = leads.filter(l => l.type === 'cold').length;

  const handleSearch = useCallback(async (query: SearchQuery) => {
    setIsSearching(true);
    log.info(`Iniciando varredura · nicho="${query.niche}" · ${query.cities.join(", ")}/${query.state} · meta=${query.quantity}`);
    if (query.keywords.length) log.info(`Palavras-chave: ${query.keywords.join(", ")}`);
    const startedAt = performance.now();
    try {
      log.info("Conectando ao motor de busca (Google Maps + enriquecimento)...");
      const { data, error } = await supabase.functions.invoke('scrape-leads', { body: query });
      if (error) throw error;
      const newLeads: Lead[] = (data?.leads || []) as Lead[];
      const elapsed = ((performance.now() - startedAt) / 1000).toFixed(1);

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

      // persiste em background
      saveSearch(query, newLeads).catch(e => console.error('save', e));
    } catch (e) {
      console.error('Erro na busca:', e);
      log.error(`Falha na busca: ${(e as Error)?.message || e}`);
      toast.error('Erro ao buscar leads. Tente novamente.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleClearScreen = () => {
    if (leads.length === 0) {
      log.warn("Tela já está vazia — nada para arquivar.");
      return;
    }
    const hot = leads.filter(l => l.type === 'hot').length;
    const cold = leads.filter(l => l.type === 'cold').length;
    const entry: SearchHistory = {
      id: 'arch_' + Math.random().toString(36).slice(2),
      query: { niche: '(lote arquivado)', keywords: [], cities: ['—'], state: '—', quantity: leads.length },
      leadsFound: leads.length, hotLeads: hot, coldLeads: cold,
      executedAt: new Date().toISOString(),
    };
    setHistory(prev => [entry, ...prev]);
    log.success(`${leads.length} leads movidos para o histórico (mock) · tela limpa.`);
    setLeads([]);
    toast.success("Tela limpa. Leads enviados ao histórico.");
  };

  const handleClear = async () => {
    if (!confirm('Apagar todos os leads e histórico salvos desta sessão?')) return;
    await clearAll();
    setLeads([]);
    setHistory([]);
    log.warn("Sessão totalmente limpa (leads + histórico apagados).");
    toast.success('Dados limpos.');
  };

  const handleConnectRobot = async () => {
    await reconnect();
  };


  const handleActivateRobot = async () => {
    if (robotRunning) return;

    // If not connected yet, backend may still reject.
    const controller = new AbortController();
    setRobotAbortController(controller);

    setRobotRunning(true);
    setRobotProgressPct(0);
    setRobotCounts({ queued: leads.length, sent: 0, failed: 0 });

    try {
      // Keep current UI behavior (progress/limits) but call real backend.
      const ok = await activateRobot({
        sessionId: undefined,
        leads: leads.map(l => ({
          id: l.id,
          whatsapp: l.whatsapp,
          type: l.type,
          name: l.name,
          niche: l.niche,
          city: l.city,
          website: l.website,
        })),
        promptMode: 'dynamic_by_lead',
        maxChars: 1500,
      });

      if (!ok?.ok) throw new Error('Falha ao ativar envio em lote');

      // We do not have a per-lead real progress endpoint in current UI contract.
      // Mark as finished based on ok.
      const sent = leads.filter(l => !!l.whatsapp).length;
      const failed = leads.length - sent;
      setRobotCounts({ queued: 0, sent, failed });
      setRobotProgressPct(100);
      toast.success('Robô finalizado.');
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Erro ao ativar robô');
    } finally {
      setRobotRunning(false);
      setRobotAbortController(null);
    }
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
                          Busque por nicho, cidade e estado. Capturamos nome, telefone, WhatsApp verificado, Instagram e site — direto da fonte.
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

                  {/* Plano 2 (Robô) */}
                  <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Plano 2 · Robô</p>

                    <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="lg:col-span-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-primary/10 border-primary/40 text-primary text-sm font-semibold">
                            <Zap className="w-4 h-4" /> Robô habilitado
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Conecte o WhatsApp e ative o envio em lote.
                          </span>
                        </div>

                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            className="px-4 py-2 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                            onClick={handleConnectRobot}
                          >
                            Conectar WhatsApp (QR)
                          </button>

                          <button
                            type="button"
                            disabled={robotRunning}
                            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                            onClick={handleActivateRobot}
                          >
                            {robotRunning ? 'Enviando...' : 'Ativar Robô de Prospecção'}
                          </button>

                        </div>

                        <div className="mt-3 text-xs text-muted-foreground">
                          QR e envio conectam diretamente à Evolution API.

                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-muted/20 p-3">
                        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">QR Code</p>
                        <div className="mt-2 w-full aspect-square max-h-[220px] bg-background rounded-lg flex items-center justify-center overflow-hidden">
                          {qrCode ? (
                            <img src={qrCode} alt="QR Code" className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                              Clique em “Conectar”
                            </div>
                          )}

                        </div>

                        {robotRunning && (
                          <div className="mt-3">
                            <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-primary to-success transition-[width] duration-300"
                                style={{ width: `${Math.max(0, Math.min(100, robotProgressPct))}%` }}
                              />
                            </div>
                            <div className="mt-2 text-[11px] text-muted-foreground">
                              {robotProgressPct.toFixed(0)}% · fila {robotCounts.queued} · enviados {robotCounts.sent} · falhas {robotCounts.failed}
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                  <LeadsTable leads={leads} />

                </>
              )}

              {leads.length === 0 && !isSearching && (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  Preencha o formulário acima para iniciar sua primeira caça.
                </div>
              )}



              {view === 'metrics' && <MetricsView leads={leads} />}

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
