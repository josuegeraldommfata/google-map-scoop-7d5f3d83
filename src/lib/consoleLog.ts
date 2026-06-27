// Simple in-memory log bus for the SearchConsole panel.
export type LogLevel = "info" | "success" | "warn" | "error";
export interface LogEntry {
  id: string;
  ts: number;
  level: LogLevel;
  message: string;
}

type Listener = (logs: LogEntry[]) => void;

const STORAGE_KEY = "leads_hunter_console_logs";
const MAX_LOGS = 300;

function load(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LogEntry[];
  } catch { return []; }
}

let logs: LogEntry[] = load();
const listeners = new Set<Listener>();

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, MAX_LOGS))); } catch {}
}

function emit() {
  listeners.forEach(l => l(logs));
  persist();
}

export function pushLog(level: LogLevel, message: string) {
  const entry: LogEntry = {
    id: Math.random().toString(36).slice(2),
    ts: Date.now(),
    level,
    message,
  };
  logs = [entry, ...logs].slice(0, MAX_LOGS);
  emit();
}

export function clearLogs() {
  logs = [];
  emit();
}

export function subscribeLogs(fn: Listener): () => void {
  listeners.add(fn);
  fn(logs);
  return () => { listeners.delete(fn); };
}

export const log = {
  info: (m: string) => pushLog("info", m),
  success: (m: string) => pushLog("success", m),
  warn: (m: string) => pushLog("warn", m),
  error: (m: string) => pushLog("error", m),
};
