import type { Lead } from "@/types/lead";

export type EvolutionInstanceCreatePayload = {
  // Use a stable client session id if you want server-side scoping.
  sessionId?: string;
};

export type EvolutionQrResponse = {
  qrBase64: string;
  // some servers may return status too; keep optional
  status?: string;
  // some servers may return instanceId
  instanceId?: string;
};

export type EvolutionConnectionState =
  | 'OPEN'
  | 'CLOSED'
  | 'DISCONNECTED'
  | 'CONNECTING'
  | string;

export type EvolutionActivatePayload = {
  sessionId?: string;
  leads: Array<Pick<Lead, 'id' | 'whatsapp' | 'type' | 'name' | 'niche' | 'city' | 'website'>>;
  // keep compatible with your existing prompt config contract
  promptMode?: string;
  maxChars?: number;
};

function envEvolutionUrl(): string {
  const url = import.meta.env.VITE_EVOLUTION_URL as string | undefined;
  if (!url) {
    // Throw so caller can toast with a useful message.
    throw new Error('Missing VITE_EVOLUTION_URL env var');
  }
  return url.replace(/\/$/, '');
}

async function http<T>(path: string, init: RequestInit): Promise<T> {
  const base = envEvolutionUrl();
  const res = await fetch(`${base}${path}`, init);

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const txt = await res.text();
      if (txt) message = txt;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

export async function createInstance(payload: EvolutionInstanceCreatePayload = {}): Promise<{ instanceId?: string }>{
  // Expected: POST to create instance.
  // If your backend uses different route, adjust ONLY here.
  return await http<{ instanceId?: string }>(
    '/instance',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
}

export async function fetchQrCode(): Promise<string> {
  const json = await http<EvolutionQrResponse>('/qr', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!json?.qrBase64) throw new Error('QR inválido/ausente na resposta');
  return json.qrBase64;
}

export async function getConnectionState(): Promise<EvolutionConnectionState> {
  const json = await http<{ status?: EvolutionConnectionState }>('/status', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  return (json?.status ?? 'DISCONNECTED') as EvolutionConnectionState;
}

export async function logoutInstance(): Promise<void> {
  await http<unknown>('/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
}

export async function deleteInstance(): Promise<void> {
  await http<unknown>('/instance', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
}

export async function activateRobot(payload: EvolutionActivatePayload): Promise<{ ok: boolean }>{
  return await http<{ ok: boolean }>(
    '/activate',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
}

export async function sendMessage(_payload: { lead: Lead }): Promise<void> {
  // Not used in current UI, but keep contract.
  // Implement later ONLY if backend provides endpoint.
  return;
}

