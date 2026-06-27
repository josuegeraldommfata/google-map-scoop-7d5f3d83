export function clampText(text: string, maxChars: number): { text: string; wasClamped: boolean } {
  const safeMax = Math.max(1, Math.floor(maxChars || 1));
  if (!text) return { text: '', wasClamped: false };
  if (text.length <= safeMax) return { text, wasClamped: false };
  return { text: text.slice(0, safeMax), wasClamped: true };
}

export type WhatsAppPromptMode = 'dynamic_by_lead';

export const DEFAULT_WHATSAPP_MAX_CHARS = 1500;

export function getWhatsAppPromptForLead(params: {
  mode: WhatsAppPromptMode;
  lead: { name: string; niche: string; city: string; website: string | null };
  messageBuilder: (lead: { name: string; niche: string; city: string; website: string | null }) => string;
  maxChars: number;
}): { message: string; wasClamped: boolean } {
  const { lead, mode, messageBuilder, maxChars } = params;

  // Por enquanto só existe o modo dinâmico por lead (como você pediu).
  if (mode !== 'dynamic_by_lead') {
    throw new Error(`Unsupported mode: ${mode}`);
  }

  const messageRaw = messageBuilder(lead);
  const { text, wasClamped } = clampText(messageRaw, maxChars);
  return { message: text, wasClamped };
}

