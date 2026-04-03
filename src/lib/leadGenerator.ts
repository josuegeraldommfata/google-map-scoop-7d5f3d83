import { Lead, SearchQuery } from "@/types/lead";

const BUSINESS_NAMES: Record<string, string[]> = {
  dentista: ["Odonto Smile", "Clínica Dental Care", "Sorriso Perfeito", "Dr. Dentes", "OdontoVida", "Clínica Oral Plus", "DentBem", "Sorriso & Cia", "OdontoTop", "Clínica DentalPro", "Espaço Dental", "Prime Odonto", "Dental Center", "Clínica do Sorriso", "OdontoClass"],
  advogado: ["Advocacia Silva & Associados", "Escritório Jurídico Central", "JusCerto Advocacia", "Direito & Justiça", "Advocacia Forte", "Legal Prime", "Escritório Pereira", "JusLaw Advocacia", "Advocacia Confiança", "Direito Total", "Advocacia Elite", "JurisConsult", "Advocacia Integra"],
  restaurante: ["Sabor da Casa", "Restaurante Bom Prato", "Cantina Italiana", "Bistrô Gourmet", "Churrascaria Premium", "Restaurante Família", "Tempero Caseiro", "Sabores do Brasil", "Cozinha Mineira", "Gastronomia & Arte", "Empório Culinário", "Sabor & Saúde", "Delícias da Vovó"],
  default: ["Empresa Alpha", "Negócio Beta", "Serviços Premium", "Pro Solutions", "Top Business", "Quality First", "Master Services", "Elite Pro", "Express Solutions", "Mega Business", "Smart Services", "Prime Corp", "Ultra Solutions"],
};

const STREETS = ["Rua das Flores", "Av. Brasil", "Rua São Paulo", "Av. Paulista", "Rua XV de Novembro", "Rua da Liberdade", "Av. Independência", "Rua Dom Pedro", "Av. Santos Dumont", "Rua Tiradentes", "Av. Getúlio Vargas", "Rua Marechal Deodoro"];

const PHONE_DDDS: Record<string, string> = {
  "SP": "11", "RJ": "21", "MG": "31", "BA": "71", "PR": "41", "RS": "51",
  "PE": "81", "CE": "85", "PA": "91", "MA": "98", "GO": "62", "SC": "48",
  "ES": "27", "PB": "83", "AM": "92", "RN": "84", "MT": "65", "MS": "67",
  "DF": "61", "SE": "79", "AL": "82", "PI": "86", "RO": "69", "TO": "63",
  "AC": "68", "AP": "96", "RR": "95",
};

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPhone(state: string): string {
  const ddd = PHONE_DDDS[state] || "11";
  const n = Math.floor(Math.random() * 90000000 + 10000000);
  return `(${ddd}) 9${n.toString().slice(0, 4)}-${n.toString().slice(4)}`;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function generateLeads(query: SearchQuery): Lead[] {
  const names = BUSINESS_NAMES[query.niche.toLowerCase()] || BUSINESS_NAMES.default;
  const leads: Lead[] = [];
  const usedNames = new Set<string>();

  const totalDesired = query.quantity || 50;
  const leadsPerCity = Math.ceil(totalDesired / query.cities.length);

  for (const city of query.cities) {
    for (let i = 0; i < leadsPerCity; i++) {
      let name = randomItem(names);
      const suffix = ` ${city}`;
      const fullName = usedNames.has(name) ? name + suffix : name;
      if (usedNames.has(fullName)) continue;
      usedNames.add(fullName);

      const hasWebsite = Math.random() > 0.45;
      const hasWhatsapp = Math.random() > 0.3;
      const phone = randomPhone(query.state);
      const rating = Math.round((Math.random() * 2 + 3) * 10) / 10;
      const reviewCount = Math.floor(Math.random() * 500) + 5;

      leads.push({
        id: generateId(),
        name: fullName,
        address: `${randomItem(STREETS)}, ${Math.floor(Math.random() * 2000 + 100)} - ${city}, ${query.state}`,
        phone,
        whatsapp: hasWhatsapp ? phone.replace(/[()-\s]/g, '') : null,
        website: hasWebsite ? `https://www.${fullName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com.br` : null,
        rating,
        reviewCount,
        type: hasWebsite ? 'cold' : 'hot',
        niche: query.niche,
        city,
        state: query.state,
        foundAt: new Date().toISOString(),
      });
    }
  }

  return leads;
}

export function getWhatsAppLink(phone: string, message?: string): string {
  const clean = phone.replace(/\D/g, '');
  const number = clean.startsWith('55') ? clean : `55${clean}`;
  const msg = message || `Olá! Encontrei sua empresa e gostaria de apresentar uma oportunidade. Podemos conversar?`;
  return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
}

export function leadsToCSV(leads: Lead[]): string {
  const headers = ['Nome', 'Endereço', 'Telefone', 'WhatsApp', 'Website', 'Avaliação', 'Qtd Avaliações', 'Tipo', 'Nicho', 'Cidade', 'Estado'];
  const rows = leads.map(l => [
    l.name, l.address, l.phone, l.whatsapp || '', l.website || '',
    l.rating.toString(), l.reviewCount.toString(), l.type === 'hot' ? 'Quente' : 'Frio',
    l.niche, l.city, l.state
  ].map(v => `"${v}"`).join(','));
  return [headers.join(','), ...rows].join('\n');
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob(['\ufeff' + content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
