import { useState, useCallback, useEffect } from "react";
import { SearchForm } from "@/components/SearchForm";
import { StatsCards } from "@/components/StatsCards";
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

type View = 'search' | 'metrics' | 'history' | 'crm';

export default function Index() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [view, setView] = useState<View>('search');

  // Robô client-side state
  const [robotRunning, setRobotRunning] = useState(false);
  const [robotProgressPct, setRobotProgressPct] = useState(0);
  const [robotCounts, setRobotCounts] = useState({ queued: 0, sent: 0, failed: 0 });
  const [robotAbortController, setRobotAbortController] = useState<AbortController | null>(null);
  const [robotLimit, setRobotLimit] = useState<number>(50);
  const [robotDelay, setRobotDelay] = useState<number>(15);

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

  const handleActivateRobot = async () => {
    // Abortar se já rodando
    if (robotRunning) {
      if (robotAbortController) robotAbortController.abort();
      setRobotRunning(false);
      toast.info('Robô interrompido.');
      return;
    }

    if (leads.length === 0) {
      toast.warning('Nenhum lead na tela para disparar.');
      return;
    }

    const controller = new AbortController();
    setRobotAbortController(controller);
    setRobotRunning(true);
    setRobotProgressPct(0);

    let sent = 0;
    let failed = 0;
    let queued = leads.length;
    setRobotCounts({ queued, sent, failed });

    const template = localStorage.getItem('leadshunter_template') ||
      'Olá {nome_empresa}, vi que vocês ainda não têm um site e gostaríamos de te apresentar nossa solução.';

    // Filtrar apenas leads com celular (WhatsApp potencial)
    // Telefones fixos (começam com 2,3,4 no DDD+número) são pulados
    const isMobilePhone = (p: string) => {
      const digits = p.replace(/\D/g, '');
      // Formato BR: com 55 = 55DD9XXXXXXXX (13 dígitos), sem 55 = DD9XXXXXXXX (11 dígitos)
      const local = digits.startsWith('55') ? digits.slice(2) : digits;
      // Celular: 9º dígito é 9 após DDD (2 dígitos)
      return local.length >= 10 && local[2] === '9';
    };

    const eligibleLeads = leads.filter(l => {
      const p = l.whatsapp || l.phone;
      return p && isMobilePhone(p);
    });

    const skipped = leads.length - eligibleLeads.length;
    if (skipped > 0) {
      toast.info(`${skipped} leads sem celular serão ignorados (fixos ou sem número).`);
    }

    if (eligibleLeads.length === 0) {
      toast.warning('Nenhum lead com número de celular encontrado.');
      setRobotRunning(false);
      setRobotAbortController(null);
      return;
    }

    // Aplicar limite escolhido (50/100/300/450/500)
    const capped = eligibleLeads.slice(0, robotLimit);
    queued = capped.length;
    setRobotCounts({ queued, sent, failed });
    toast.info(`Robô disparando para ${capped.length} leads em uma única aba (recarregando a cada ${robotDelay}s).`);

    // Abrir UMA única aba reutilizada
    const TAB_NAME = 'leadshunter_wa';
    let win: Window | null = window.open('about:blank', TAB_NAME);
    if (!win) {
      toast.error('Bloqueador de pop-up impediu abrir a aba. Permita pop-ups deste site e tente novamente.');
      setRobotRunning(false);
      setRobotAbortController(null);
      return;
    }

    for (let i = 0; i < capped.length; i++) {
      if (controller.signal.aborted) break;

      const lead = capped[i];
      const phone = lead.whatsapp || lead.phone;

      const msg = template
        .replace(/{nome_empresa}/g, lead.name)
        .replace(/{cidade}/g, lead.city)
        .replace(/{ramo}/g, lead.niche || 'seu ramo')
        .replace(/{telefone}/g, phone!);

      const cleanPhone = phone!.replace(/\D/g, '');
      const number = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      const url = `https://web.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(msg)}&app_absent=0`;

      // Se o usuário fechou a aba, reabrir na mesma "named window"
      if (!win || win.closed) {
        win = window.open(url, TAB_NAME);
        if (!win) {
          toast.error('Aba do WhatsApp foi bloqueada. Robô interrompido.');
          break;
        }
      } else {
        try { win.location.href = url; } catch { win = window.open(url, TAB_NAME); }
        try { win.focus(); } catch {}
      }

      fetch('/api/crm_leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead, stageId: 2 }),
      }).catch(() => {});

      sent++;
      queued--;
      setRobotCounts({ queued, sent, failed });
      setRobotProgressPct(((i + 1) / capped.length) * 100);
      log.info(`[${i + 1}/${capped.length}] ${lead.name} — aba recarregada com mensagem pronta.`);

      // Aguardar tempo configurado para o usuário (ou extensão) apertar Enter
      await new Promise<void>(resolve => {
        const t = setTimeout(resolve, robotDelay * 1000);
        controller.signal.addEventListener('abort', () => { clearTimeout(t); resolve(); });
      });
    }

    setRobotRunning(false);
    setRobotAbortController(null);
    if (!controller.signal.aborted) {
      toast.success(`Disparo concluído! ${sent} conversas abertas (limite ${robotLimit}).`);
      log.success(`Robô finalizado: ${sent} conversas abertas em uma única aba.`);
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

                  {/* Plano 2 · Robô Client-Side */}
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                        Plano 2 · Robô em Massa
                      </p>
                      <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2.5 py-1 rounded-full">
                        ⭐ Exclusivo Business
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Esquerda */}
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-primary/15 border border-primary/30">
                            <Zap className="w-4 h-4 text-primary" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-foreground">Automação de Navegador (1 aba só)</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                              Abre <strong>uma única aba</strong> do WhatsApp Web e vai recarregando ela com cada lead da fila, sem parar, até atingir o limite escolhido.
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <label className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Limite de conversas</span>
                            <select
                              value={robotLimit}
                              onChange={(e) => setRobotLimit(Number(e.target.value))}
                              disabled={robotRunning}
                              className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-medium"
                            >
                              {[50, 100, 300, 450, 500].map(n => (
                                <option key={n} value={n}>{n} conversas</option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Intervalo entre leads</span>
                            <select
                              value={robotDelay}
                              onChange={(e) => setRobotDelay(Number(e.target.value))}
                              disabled={robotRunning}
                              className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-medium"
                            >
                              {[8, 12, 15, 20, 30, 45, 60].map(n => (
                                <option key={n} value={n}>{n}s</option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <button
                          type="button"
                          disabled={leads.length === 0}
                          className={`w-full px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                            robotRunning
                              ? 'bg-red-500/15 text-red-400 border border-red-500/40 hover:bg-red-500/25'
                              : 'bg-primary text-primary-foreground hover:opacity-90 shadow-sm'
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                          onClick={handleActivateRobot}
                        >
                          <Zap className="w-4 h-4" />
                          {robotRunning ? '⛔ Parar Robô' : `Ativar Robô · ${robotLimit} conversas`}
                        </button>

                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          💡 <strong>Não feche a aba do WhatsApp Web</strong> enquanto roda — o robô recarrega ela sozinho. Para enviar sem apertar Enter, instale uma extensão (ex.: "WA Auto Send"). Sem ela, o robô só deixa cada mensagem pronta no campo.
                        </p>
                      </div>

                      {/* Direita: status */}
                      <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col justify-center min-h-[140px]">
                        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">Status do Robô</p>

                        {!robotRunning && robotProgressPct === 0 && (
                          <div className="text-center text-sm text-muted-foreground/50 italic py-4">
                            Aguardando ativação...
                          </div>
                        )}

                        {(robotRunning || robotProgressPct > 0) && (
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-xs font-medium mb-1.5">
                                <span className="text-muted-foreground">Progresso</span>
                                <span className="text-foreground font-bold">{robotProgressPct.toFixed(0)}%</span>
                              </div>
                              <div className="h-2.5 w-full bg-border rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all duration-500 ease-out"
                                  style={{ width: `${Math.max(0, Math.min(100, robotProgressPct))}%` }}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="bg-success/10 border border-success/20 rounded-lg px-2 py-1.5">
                                <p className="text-base font-bold text-success">{robotCounts.sent}</p>
                                <p className="text-[10px] text-muted-foreground">Abertos</p>
                              </div>
                              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1.5">
                                <p className="text-base font-bold text-red-400">{robotCounts.failed}</p>
                                <p className="text-[10px] text-muted-foreground">Sem WA</p>
                              </div>
                              <div className="bg-muted border border-border rounded-lg px-2 py-1.5">
                                <p className="text-base font-bold text-foreground">{robotCounts.queued}</p>
                                <p className="text-[10px] text-muted-foreground">Na Fila</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

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
