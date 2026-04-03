import { useState } from "react";
import { Search, MapPin, Tag, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchQuery } from "@/types/lead";

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche || !cities || !state) return;
    onSearch({
      niche,
      keywords: keywords.split(",").map(k => k.trim()).filter(Boolean),
      cities: cities.split(",").map(c => c.trim()).filter(Boolean),
      state,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-5 animate-slide-up">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <Search className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-lg font-heading font-semibold text-foreground">Nova Busca</h2>
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
      </div>

      <Button
        type="submit"
        disabled={isSearching || !niche || !cities || !state}
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
