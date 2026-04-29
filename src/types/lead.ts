export type LeadTier = 'premium' | 'hot' | 'cold' | 'low_presence';
export type PhoneKind = 'mobile' | 'landline' | 'unknown';
export type AdsStatus = 'tubarao' | 'none' | 'unknown';

export interface Lead {
  id: string;
  name: string;
  address: string;
  phone: string;
  whatsapp: string | null;
  website: string | null;
  instagram: string | null;
  rating: number;
  reviewCount: number;
  type: 'hot' | 'cold';
  niche: string;
  city: string;
  state: string;
  foundAt: string;
  /** true se telefone foi enriquecido via bio do Instagram/Linktree */
  phoneFromInstagram?: boolean;
  /** status na biblioteca de anúncios (Meta) */
  adsStatus?: AdsStatus;
  /** WhatsApp foi validado ativamente via wa.me (perfil existe) */
  whatsappVerified?: boolean;
  /** Score 0-100 de confiança que o número tem WhatsApp ativo */
  whatsappScore?: number;
  /** Origem do telefone vencedor: osm | website | instagram | linktree */
  phoneSource?: 'osm' | 'website' | 'instagram' | 'linktree' | 'unknown';
}

export interface SearchQuery {
  niche: string;
  keywords: string[];
  cities: string[];
  state: string;
  quantity: number;
}

export interface SearchHistory {
  id: string;
  query: SearchQuery;
  leadsFound: number;
  hotLeads: number;
  coldLeads: number;
  executedAt: string;
}
