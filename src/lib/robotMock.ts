import type { Lead } from "@/types/lead";
import { DEFAULT_WHATSAPP_MAX_CHARS, getWhatsAppPromptForLead, WhatsAppPromptMode } from "@/lib/whatsappPromptConfig";
import { buildPitchMessage } from "@/lib/leadGenerator";
import { getSessionId } from "@/lib/leadsRepo";

export type RobotConnectState = 'disconnected' | 'connecting' | 'connected';

export type RobotStatusCounts = {
  queued: number;
  sent: number;
  failed: number;
};

const ROBOT_BACKEND_ORIGIN = 'http://localhost:4000';



type RobotBackendQrResponse = {
  qrBase64: string;
};

function makeQrFallback(): string {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
  <rect x="0" y="0" width="220" height="220" fill="#0b1220"/>
  <text x="50%" y="108" dominant-baseline="middle" text-anchor="middle" font-family="Inter, Arial" font-size="14" fill="#9ca3af">QR</text>
  <text x="50%" y="130" dominant-baseline="middle" text-anchor="middle" font-family="Inter, Arial" font-size="10" fill="#6b7280">evolution</text>
  <g fill="#ffffff" opacity="0.95">
    ${Array.from({ length: 9 }).map((_, r) =>
      Array.from({ length: 9 }).map((__, c) => {
        const x = 28 + c * 16;
        const y = 48 + r * 16;
        const on = (r + c) % 2 === 0 || (r === 0 && c < 3) || (c === 0 && r < 3);
        return on ? `<rect x="${x}" y="${y}" width="12" height="12"/>` : '';
      }).join('')
    ).join('')}
  </g>
  <rect x="18" y="18" width="184" height="184" fill="none" stroke="#374151" stroke-width="2" rx="16"/>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export async function fetchRobotQrBase64(): Promise<string> {
  try {
    const res = await fetch(`${ROBOT_BACKEND_ORIGIN}/qr`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) return makeQrFallback();
    const json = (await res.json()) as RobotBackendQrResponse;
    if (!json?.qrBase64) return makeQrFallback();
    return json.qrBase64;
  } catch {
    return makeQrFallback();
  }
}

async function activateRobotInBackend(params: {
  sessionId: string;
  leads: Array<Pick<Lead, "id" | "whatsapp" | "type" | "name" | "niche" | "city" | "website">>;
  promptMode: WhatsAppPromptMode;
  maxChars: number;
}): Promise<boolean> {
  const res = await fetch(`${ROBOT_BACKEND_ORIGIN}/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: params.sessionId,
      leads: params.leads,
      promptMode: params.promptMode,
      maxChars: params.maxChars,
    }),
  });

  return res.ok;
}

export async function simulateRobotActivation(params: {
  leads: Array<Pick<Lead, "id" | "name" | "niche" | "city" | "website" | "whatsapp" | "type">>;
  onProgress?: (p: { progressPct: number; counts: RobotStatusCounts }) => void;
  signal?: AbortSignal;
  promptMode?: WhatsAppPromptMode;
  maxChars?: number;
}): Promise<void> {
  const {
    leads,
    onProgress,
    signal,
    promptMode = 'dynamic_by_lead',
    maxChars = DEFAULT_WHATSAPP_MAX_CHARS,
  } = params;

  const sessionId = getSessionId();

  // UX: progresso/contadores são estimados; o envio real fica no backend (n8n/Evolution).
  const counts: RobotStatusCounts = {
    queued: leads.length,
    sent: 0,
    failed: 0,
  };

  // (opcional) pré-clamp do prompt para manter consistência de limite.
  // Não abre WhatsApp aqui. Apenas usa a config para validar limite e manter comportamento do contrato.
  for (const lead of leads) {
    if (signal?.aborted) throw new Error('aborted');
    if (!lead.whatsapp) continue;

    // Gera message usando o mesmo clamp do config (backend pode repetir isso).
    getWhatsAppPromptForLead({
      mode: promptMode,
      lead: { name: lead.name, niche: lead.niche, city: lead.city, website: lead.website ?? null },
      messageBuilder: (l) => buildPitchMessage(l),
      maxChars,
    });
  }

  // Chamada real (bulk) para o backend.
  const ok = await activateRobotInBackend({
    sessionId,
    promptMode,
    maxChars,
    leads: leads.map((l) => ({
      id: l.id,
      whatsapp: l.whatsapp,
      type: l.type,
      name: l.name,
      niche: l.niche,
      city: l.city,
      website: l.website,
    })),
  });

  // Atualiza UX final.
  counts.sent = ok ? leads.filter(l => !!l.whatsapp).length : 0;
  counts.failed = ok ? leads.filter(l => !l.whatsapp).length : leads.length;
  counts.queued = 0;

  onProgress?.({
    progressPct: 100,
    counts: { ...counts },
  });
}


