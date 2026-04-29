import { Lead, LeadTier, PhoneKind, SearchQuery } from "@/types/lead";

/**
 * Classifica telefone BR: celular precisa ter 11 dígitos (com DDD) e o
 * primeiro dígito após o DDD deve ser '9'. Caso contrário é fixo.
 */
export function classifyPhone(raw: string | null | undefined): PhoneKind {
  if (!raw) return 'unknown';
  let d = raw.replace(/\D/g, '').replace(/^0+/, '');
  if (d.startsWith('55') && d.length > 11) d = d.slice(2);
  if (d.length === 11) return d[2] === '9' ? 'mobile' : 'landline';
  if (d.length === 10) return 'landline';
  return 'unknown';
}

export function getLeadTier(lead: Lead): LeadTier {
  const hasSite = !!lead.website;
  const hasIg = !!lead.instagram;
  if (hasSite && hasIg && lead.rating > 4.0 && lead.reviewCount > 10) return 'premium';
  if (!hasSite) return 'low_presence';
  return 'cold';
}

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
        instagram: Math.random() > 0.5 ? `@${fullName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)}` : null,
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

const PORTFOLIO_URL = 'https://www.robsonalexdev.com.br/';

const NICHE_HOOKS: Record<string, { pain: string; benefit: string }> = {
  dentista: {
    pain: 'agendamentos perdidos por não responder rápido no WhatsApp e site que não converte visita em consulta',
    benefit: 'um site moderno com agendamento online, integração com WhatsApp e otimizado pra aparecer no Google quando alguém busca "dentista em ' ,
  },
  restaurante: {
    pain: 'cardápio difícil de achar, sem pedido online e site lento que espanta cliente com fome',
    benefit: 'um site rápido com cardápio digital, pedido online via WhatsApp e fotos que dão água na boca',
  },
  'clínica médica': {
    pain: 'pacientes ligando fora do horário e secretária sobrecarregada com agendamento manual',
    benefit: 'um site com agendamento 24h, prontuário básico e integração com WhatsApp pra reduzir no-show',
  },
  academia: {
    pain: 'matrícula 100% presencial e site sem captação de leads pra aulas experimentais',
    benefit: 'um site com matrícula online, agendamento de aula experimental e captação automática de leads',
  },
  'salão de beleza': {
    pain: 'agenda bagunçada no caderno e cliente sumindo porque ninguém respondeu o WhatsApp na hora',
    benefit: 'um site com agendamento online, lembrete automático e galeria pra mostrar seus trabalhos',
  },
  imobiliária: {
    pain: 'imóveis sem destaque no Google e leads frios chegando sem qualificação',
    benefit: 'um site com vitrine de imóveis, busca avançada e captação qualificada via WhatsApp',
  },
  contabilidade: {
    pain: 'site institucional parado que não gera lead nenhum e concorrente aparecendo na frente no Google',
    benefit: 'um site profissional com captação de leads, calculadoras (Simples/MEI) e blog otimizado',
  },
  'pet shop': {
    pain: 'cliente comprando ração pelo iFood/Mercado Livre porque vocês não vendem online',
    benefit: 'um site com loja online, agendamento de banho e tosa e fidelização via WhatsApp',
  },
  mecânica: {
    pain: 'cliente não acha vocês no Google e orçamento perdido por demorar a responder',
    benefit: 'um site otimizado pra "mecânica em ' ,
  },
};

function buildAdvocatusPitch(lead: { name: string; city: string; website: string | null }): string {
  return [
    `Olá! Tudo bem? 👋`,
    ``,
    `Aqui é da *equipe Advocatus* — somos um SaaS de advocacia com *agente multiatendimento* que responde *24h por dia* todos os clientes que chegam no WhatsApp do escritório.`,
    ``,
    `Vi a ${lead.name} aqui em ${lead.city} e fiquei pensando o quanto vocês estão perdendo de cliente fora do horário comercial — sexta à noite, fim de semana, feriado... ⏰`,
    ``,
    `O nosso agente:`,
    `✅ Atende *todos os contatos* no WhatsApp em segundos, 24/7`,
    `✅ Faz a *triagem da causa* e qualifica o cliente`,
    `✅ Entrega pra você um *resumo pronto* com o número do processo (quando houver) e o assunto resumido`,
    `✅ Agenda reunião direto na sua agenda`,
    ``,
    `Resultado: o advogado só fala com cliente *já qualificado e pronto pra fechar*. Zero lead perdido. 🚀`,
    ``,
    `Posso te mandar uma demonstração de 2 minutos mostrando o agente atendendo um caso real? Se fizer sentido a gente avança, se não fizer, fica o presente. 😉`,
  ].join('\n');
}

function buildDevPitch(lead: { name: string; niche: string; city: string; website: string | null }): string {
  const key = lead.niche.toLowerCase();
  const hook = NICHE_HOOKS[key];
  const pain = hook ? hook.pain : `site fraco (ou inexistente) fazendo cliente cair direto na mão do concorrente no Google`;
  const benefit = hook
    ? (hook.benefit.endsWith('em ') ? `${hook.benefit}${lead.city}"` : hook.benefit)
    : `um site profissional, rápido, otimizado pra Google e que transforma visita em cliente`;

  if (!lead.website) {
    return [
      `Olá! Tudo bem? 👋`,
      ``,
      `Meu nome é Robson, sou *programador* e estava pesquisando os melhores ${lead.niche}s de ${lead.city} — a ${lead.name} apareceu com ótima reputação, mas notei uma coisa séria: *vocês ainda não têm um site*. 😬`,
      ``,
      `Hoje mais de 80% das pessoas pesquisam no Google antes de fechar com qualquer ${lead.niche}. O problema clássico que vejo é: ${pain}.`,
      ``,
      `Eu crio pra vocês ${benefit} — entregue em poucos dias e com investimento que cabe no bolso.`,
      ``,
      `Dá uma olhada rapidinho no meu portfólio: ${PORTFOLIO_URL}`,
      ``,
      `Posso te passar 2 ou 3 ideias específicas pra ${lead.name}? Leva 30 segundos. 🚀`,
    ].join('\n');
  }

  return [
    `Olá, tudo bem? 👋`,
    ``,
    `Meu nome é Robson, sou *programador*. Vi a ${lead.name} aqui em ${lead.city} e dei uma olhada no site de vocês — tenho observações pontuais que podem *aumentar bastante o número de clientes chegando pelo Google*, sem precisar gastar mais em anúncio.`,
    ``,
    `Trabalho exatamente com isso: criar/refazer sites pra ${lead.niche}s resolvendo ${pain}.`,
    ``,
    `Meu portfólio: ${PORTFOLIO_URL}`,
    ``,
    `Posso te mandar uma análise gratuita de 2 minutos com o que eu ajustaria primeiro? Se fizer sentido a gente conversa, se não fizer, fica o presente. 😉`,
  ].join('\n');
}

export function buildPitchMessage(lead: { name: string; niche: string; city: string; website: string | null }): string {
  const niche = lead.niche.toLowerCase();
  if (niche.includes('advog') || niche.includes('jurídic') || niche.includes('juridic')) {
    return buildAdvocatusPitch(lead);
  }
  return buildDevPitch(lead);
}

export function getWhatsAppLink(phone: string, message?: string): string {
  // Limpa tudo que não é dígito e garante o código do país (55 = Brasil)
  let clean = phone.replace(/\D/g, '');
  // Remove zeros à esquerda (caso venha "0" antes do DDD)
  clean = clean.replace(/^0+/, '');
  const number = clean.startsWith('55') ? clean : `55${clean}`;
  const msg = message || `Olá! Tudo bem? Encontrei sua empresa e gostaria de apresentar uma oportunidade. Podemos conversar?`;
  // web.whatsapp.com evita o redirecionamento do wa.me/api.whatsapp.com,
  // que alguns navegadores/redes bloqueiam com ERR_BLOCKED_BY_RESPONSE.
  return `https://web.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(msg)}`;
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
