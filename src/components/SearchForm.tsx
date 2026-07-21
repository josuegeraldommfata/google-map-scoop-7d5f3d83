import { useEffect, useState } from "react";
import { Search, MapPin, Tag, Zap, Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchQuery } from "@/types/lead";
import { getPlan, getPlanLimits, getTodayUsage, setPlan, type PlanKey } from "@/lib/plan";
import { toast } from "sonner";

const STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

const NICHES = ["Dentista", "Advogado", "Restaurante", "Clínica Médica", "Academia", "Salão de Beleza", "Imobiliária", "Contabilidade", "Pet Shop", "Mecânica"];

interface Props {
  onSearch: (query: SearchQuery) => void;
  isSearching: boolean;
}

export function SearchForm({ onSearch, isSearching }: Props) {
  const [niche, setNiche] = useState("");
  const [keywords, setKeywords] = useState("");
  const [cities, setCities] = useState("");
  const [state, setState] = useState("");
  const [quantity, setQuantity] = useState("50");
  const [plan, setPlanState] = useState<PlanKey>(getPlan());
  const [usedToday, setUsedToday] = useState<number>(getTodayUsage());
  const limits = getPlanLimits(plan);
  const isBusiness = plan === "business";

  useEffect(() => {
    const sync = () => { setPlanState(getPlan()); setUsedToday(getTodayUsage()); };
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("focus", sync); };
  }, []);

  const requested = parseInt(quantity) || 0;
  const exceedsPerSearch = requested > limits.maxLeadsPerSearch;
  const exceedsDaily = limits.dailySearches !== null && usedToday >= limits.dailySearches;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche || !cities || !state) return;
    if (exceedsDaily) {
      toast.error(`Limite diário do plano ${limits.label} atingido (${limits.dailySearches} pesquisas/dia). Faça upgrade para o Business.`);
      return;
    }
    if (exceedsPerSearch) {
      toast.error(`Seu plano ${limits.label} permite no máximo ${limits.maxLeadsPerSearch} leads por pesquisa. Faça upgrade para o Business.`);
      return;
    }
    onSearch({
      niche,
      keywords: keywords.split(",").map(k => k.trim()).filter(Boolean),
      cities: cities.split(",").map(c => c.trim()).filter(Boolean),
      state,
      quantity: Math.max(1, Math.min(limits.maxLeadsPerSearch, requested || 50)),
    });
  };

  const switchPlan = (p: PlanKey) => { setPlan(p); setPlanState(p); toast.success(`Plano ${PLAN_LABEL[p]} selecionado (modo demonstração).`); };
  const PLAN_LABEL: Record<PlanKey, string> = { standard: "Standard", business: "Business" };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-soft">
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <div className="p-2 rounded-lg bg-primary/10">
          <Search className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Configuração</p>
          <h2 className="font-display text-2xl text-foreground leading-none">Nova busca</h2>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ${isBusiness ? "bg-primary/10 text-primary border-primary/30" : "bg-muted text-muted-foreground border-border"}`}>
            <Crown className="w-3.5 h-3.5" /> Plano {limits.label}
          </span>
          {limits.dailySearches !== null && (
            <span className="text-muted-foreground">{usedToday}/{limits.dailySearches} buscas hoje</span>
          )}
          <button type="button" onClick={() => switchPlan(isBusiness ? "standard" : "business")} className="underline text-muted-foreground hover:text-foreground">
            trocar
          </button>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-secondary-foreground text-sm">Nicho</Label>
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={niche}
              onChange={e => setNiche(e.target.value)}
              placeholder="Ex: Dentista, Advogado..."
              className="pl-10 bg-muted border-border"
              list="niches"
            />
            <datalist id="niches">
              {NICHES.map(n => <option key={n} value={n} />)}
            </datalist>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-secondary-foreground text-sm">Palavras-chave (separadas por vírgula)</Label>
          <Input
            value={keywords}
            onChange={e => setKeywords(e.target.value)}
            placeholder="Ex: implante, ortodontia..."
            className="bg-muted border-border"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-secondary-foreground text-sm">Cidades (separadas por vírgula)</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={cities}
              onChange={e => setCities(e.target.value)}
              placeholder="Ex: São Paulo, Campinas..."
              className="pl-10 bg-muted border-border"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-secondary-foreground text-sm">Estado</Label>
          <select
            value={state}
            onChange={e => setState(e.target.value)}
            className="w-full h-10 rounded-md border border-border bg-muted px-3 text-sm text-foreground"
          >
            <option value="">Selecione...</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <Label className="text-secondary-foreground text-sm">Quantidade de Leads</Label>
          <Input
            type="number"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            placeholder="Ex: 50"
            min={1}
            max={500}
            className="bg-muted border-border"
          />
        <div className="space-y-2">
          <Label className="text-secondary-foreground text-sm">Quantidade de Leads</Label>
          <Input
            type="number"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            placeholder="Ex: 50"
            min={1}
            max={limits.maxLeadsPerSearch}
            className={`bg-muted border-border ${exceedsPerSearch ? "border-destructive" : ""}`}
          />
          <p className="text-[11px] text-muted-foreground">
            Plano {limits.label}: até <strong>{limits.maxLeadsPerSearch}</strong> leads por pesquisa
            {limits.dailySearches !== null ? ` · ${limits.dailySearches} pesquisas/dia` : " · pesquisas ilimitadas"}
          </p>
          {exceedsPerSearch && (
            <p className="text-[11px] text-destructive flex items-center gap-1">
              <Lock className="w-3 h-3" /> Faça upgrade para o Business para buscar até 500 leads.
            </p>
          )}
        </div>
      </div>

      {exceedsDaily && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Limite diário atingido ({limits.dailySearches} pesquisas/dia no Standard). Faça upgrade para o Business.
        </div>
      )}

      <Button
        type="submit"
        disabled={isSearching || !niche || !cities || !state || exceedsPerSearch || exceedsDaily}
        className="w-full h-12 text-base font-semibold glow-primary"
      >
        {isSearching ? (
          <span className="flex items-center gap-2">
            <Zap className="w-5 h-5 animate-pulse-hot" />
            Buscando leads...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Iniciar Busca no Google Maps
          </span>
        )}
      </Button>
    </form>
  );
}

