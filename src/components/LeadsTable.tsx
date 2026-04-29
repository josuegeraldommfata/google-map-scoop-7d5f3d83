import { useState, useMemo } from "react";
import { Lead } from "@/types/lead";
import {
  getWhatsAppLink, leadsToCSV, downloadFile, buildPitchMessage,
  classifyPhone, getLeadTier,
} from "@/lib/leadGenerator";
import {
  Flame, Snowflake, MessageCircle, ExternalLink, Star, Search,
  Download, ChevronLeft, ChevronRight, Filter, Globe, Phone, Instagram,
  Crown, Smartphone, PhoneOff, Megaphone, Sparkles, ShieldCheck, ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Props {
  leads: Lead[];
}

const PAGE_SIZE = 10;

export function LeadsTable({ leads }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<'all' | 'hot' | 'cold' | 'premium' | 'tubarao'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'rating' | 'reviews' | 'whatsapp'>('whatsapp');
  const [onlyMobile, setOnlyMobile] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = leads;

    if (filter === 'premium') {
      result = result.filter(l => getLeadTier(l) === 'premium');
    } else if (filter === 'tubarao') {
      result = result.filter(l => l.adsStatus === 'tubarao');
    } else if (filter !== 'all') {
      result = result.filter(l => l.type === filter);
    }

    if (onlyMobile) {
      result = result.filter(l => classifyPhone(l.whatsapp || l.phone) === 'mobile');
    }
    if (onlyVerified) {
      result = result.filter(l => l.whatsappVerified === true);
    }

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(l =>
        l.name.toLowerCase().includes(s) ||
        l.city.toLowerCase().includes(s) ||
        l.phone.includes(s)
      );
    }
    result = [...result].sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'reviews') return b.reviewCount - a.reviewCount;
      if (sortBy === 'whatsapp') return (b.whatsappScore ?? 0) - (a.whatsappScore ?? 0);
      return a.name.localeCompare(b.name);
    });
    return result;
  }, [leads, filter, onlyMobile, onlyVerified, search, sortBy]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExportCSV = () => {
    downloadFile(leadsToCSV(filtered), `leads-hunter-${Date.now()}.csv`, 'text/csv');
  };

  return (
    <div className="rounded-xl border border-border bg-card animate-slide-up">
      {/* Toolbar */}
      <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar lead..."
              className="pl-9 w-56 bg-muted border-border h-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            {([
              ['all', 'Todos', Filter],
              ['premium', 'Premium', Crown],
              ['tubarao', 'TUBARÃO', Megaphone],
              ['hot', 'Quentes', Flame],
              ['cold', 'Frios', Snowflake],
            ] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => { setFilter(key); setPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filter === key
                    ? key === 'hot' ? 'bg-hot/20 text-hot'
                    : key === 'cold' ? 'bg-cold/20 text-cold'
                    : key === 'premium' ? 'bg-yellow-500/20 text-yellow-500'
                    : key === 'tubarao' ? 'bg-amber-500/25 text-amber-400'
                    : 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setOnlyMobile(v => !v); setPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              onlyMobile
                ? 'bg-success/15 text-success border-success/40'
                : 'bg-muted text-muted-foreground border-border hover:text-foreground'
            }`}
            title="Esconde leads sem celular (sem dígito 9 após DDD)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            Apenas Celulares
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="h-9 rounded-md border border-border bg-muted px-2 text-xs text-foreground"
          >
            <option value="rating">Ordenar: Avaliação</option>
            <option value="reviews">Ordenar: Avaliações</option>
            <option value="name">Ordenar: Nome</option>
          </select>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" />
            CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left p-3 font-medium">Empresa</th>
              <th className="text-left p-3 font-medium hidden lg:table-cell">Endereço</th>
              <th className="text-left p-3 font-medium">Contato</th>
              <th className="text-center p-3 font-medium">Avaliação</th>
              <th className="text-center p-3 font-medium">Tipo</th>
              <th className="text-center p-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(lead => {
              const tier = getLeadTier(lead);
              const phoneKind = classifyPhone(lead.whatsapp || lead.phone);
              const isMobile = phoneKind === 'mobile';

              return (
              <tr key={lead.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground">{lead.name}</p>
                    {tier === 'premium' && (
                      <Badge className="bg-gradient-to-r from-yellow-500/30 to-amber-400/30 text-yellow-400 border border-yellow-500/50 gap-1 text-[10px]">
                        <Crown className="w-3 h-3" />
                        Premium
                      </Badge>
                    )}
                    {lead.adsStatus === 'tubarao' && (
                      <Badge className="bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-300 border border-amber-500/60 gap-1 text-[10px] font-bold">
                        🦈 TUBARÃO
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{lead.niche} • {lead.city}</p>
                </td>
                <td className="p-3 hidden lg:table-cell">
                  <p className="text-xs text-muted-foreground max-w-xs truncate">{lead.address}</p>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1.5 text-xs text-foreground flex-wrap">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    {lead.whatsapp || lead.phone || '—'}
                    {phoneKind === 'mobile' && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-success/15 text-success">
                        ⭐ WhatsApp
                      </span>
                    )}
                    {phoneKind === 'landline' && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                        📞 Fixo
                      </span>
                    )}
                    {lead.phoneFromInstagram && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-pink-500/15 text-pink-400" title="Telefone descoberto via bio do Instagram/Linktree">
                        <Sparkles className="w-2.5 h-2.5" /> via IG
                      </span>
                    )}
                  </div>
                  {lead.website && (
                    <div className="flex items-center gap-1.5 text-xs text-cold mt-1">
                      <Globe className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[140px]">{lead.website.replace('https://', '')}</span>
                    </div>
                  )}
                  {lead.instagram && (
                    <div className="flex items-center gap-1.5 text-xs text-pink-400 mt-1">
                      <Instagram className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[140px]">{lead.instagram}</span>
                    </div>
                  )}
                </td>
                <td className="p-3 text-center">
                  {lead.rating > 0 ? (
                    <div className="flex items-center justify-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium text-foreground">{lead.rating}</span>
                      <span className="text-xs text-muted-foreground">({lead.reviewCount})</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-3 text-center">
                  {tier === 'premium' ? (
                    <Badge className="bg-gradient-to-r from-yellow-500/20 to-amber-400/20 text-yellow-400 border border-yellow-500/40 gap-1 text-xs">
                      <Crown className="w-3 h-3" />
                      Premium
                    </Badge>
                  ) : tier === 'low_presence' ? (
                    <Badge className="bg-hot/15 text-hot border-hot/30 gap-1 text-xs">
                      <Flame className="w-3 h-3" />
                      Baixa Presença
                    </Badge>
                  ) : (
                    <Badge className="bg-cold/15 text-cold border-cold/30 gap-1 text-xs">
                      <Snowflake className="w-3 h-3" />
                      Frio
                    </Badge>
                  )}
                </td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {lead.whatsapp && isMobile ? (
                      <a
                        href={getWhatsAppLink(lead.whatsapp, buildPitchMessage(lead))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md bg-success/10 text-success hover:bg-success/20 transition-colors"
                        title="Abrir WhatsApp com mensagem persuasiva pronta"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    ) : lead.whatsapp ? (
                      <button
                        disabled
                        className="p-1.5 rounded-md bg-muted text-muted-foreground/50 cursor-not-allowed"
                        title="Telefone fixo — não disponível no WhatsApp"
                      >
                        <PhoneOff className="w-4 h-4" />
                      </button>
                    ) : null}
                    {lead.instagram && (
                      <a
                        href={`https://instagram.com/${lead.instagram.replace(/^@/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 transition-colors"
                        title="Abrir Instagram"
                      >
                        <Instagram className="w-4 h-4" />
                      </a>
                    )}
                    {lead.website && (
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md bg-cold/10 text-cold hover:bg-cold/20 transition-colors"
                        title="Abrir Website"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {!lead.website && (
                      <span className="text-[10px] text-hot font-medium bg-hot/10 px-2 py-0.5 rounded-full">
                        🎯 Oportunidade
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {filtered.length} leads encontrados
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
