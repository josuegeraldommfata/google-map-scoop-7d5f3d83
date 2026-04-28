export type LeadTier = 'premium' | 'hot' | 'cold' | 'low_presence';
export type PhoneKind = 'mobile' | 'landline' | 'unknown';

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
