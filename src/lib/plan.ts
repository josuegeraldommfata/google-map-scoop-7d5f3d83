// Gestão local do plano do usuário (mock — sem gateway ainda).
// Standard: 3 pesquisas/dia · até 300 leads por pesquisa
// Business: pesquisas ilimitadas · até 500 leads por pesquisa

export type PlanKey = "standard" | "business";

export interface PlanLimits {
  maxLeadsPerSearch: number;
  dailySearches: number | null; // null = ilimitado
  label: string;
}

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  standard: { maxLeadsPerSearch: 300, dailySearches: 3, label: "Standard" },
  business: { maxLeadsPerSearch: 500, dailySearches: null, label: "Business" },
};

const PLAN_KEY = "lh:plan";
const USAGE_KEY = "lh:usage";

export function getPlan(): PlanKey {
  try {
    const v = localStorage.getItem(PLAN_KEY);
    if (v === "business" || v === "standard") return v;
  } catch {}
  return "standard";
}

export function setPlan(p: PlanKey) {
  try { localStorage.setItem(PLAN_KEY, p); } catch {}
}

export function getPlanLimits(p: PlanKey = getPlan()): PlanLimits {
  return PLAN_LIMITS[p];
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

interface UsageState { day: string; count: number }

export function getTodayUsage(): number {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return 0;
    const s = JSON.parse(raw) as UsageState;
    if (s.day !== todayKey()) return 0;
    return s.count || 0;
  } catch { return 0; }
}

export function incrementUsage(): number {
  const day = todayKey();
  const next = getTodayUsage() + 1;
  try { localStorage.setItem(USAGE_KEY, JSON.stringify({ day, count: next })); } catch {}
  return next;
}

export interface SearchGuardResult {
  allowed: boolean;
  reason?: string;
  cappedQuantity: number;
  plan: PlanKey;
  limits: PlanLimits;
  usedToday: number;
}

export function canSearch(requestedQuantity: number): SearchGuardResult {
  const plan = getPlan();
  const limits = PLAN_LIMITS[plan];
  const usedToday = getTodayUsage();
  const cappedQuantity = Math.max(1, Math.min(limits.maxLeadsPerSearch, Math.floor(requestedQuantity) || 1));

  if (limits.dailySearches !== null && usedToday >= limits.dailySearches) {
    return {
      allowed: false,
      reason: `Você atingiu o limite de ${limits.dailySearches} pesquisas diárias do plano ${limits.label}. Faça upgrade para o Business para buscas ilimitadas.`,
      cappedQuantity, plan, limits, usedToday,
    };
  }

  if (requestedQuantity > limits.maxLeadsPerSearch) {
    return {
      allowed: false,
      reason: `Seu plano ${limits.label} permite até ${limits.maxLeadsPerSearch} leads por pesquisa. Faça upgrade para o Business para buscar até 500 leads.`,
      cappedQuantity, plan, limits, usedToday,
    };
  }

  return { allowed: true, cappedQuantity, plan, limits, usedToday };
}
