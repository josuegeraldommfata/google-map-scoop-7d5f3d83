import { useEffect, useRef, useState } from "react";
import { Terminal, Trash2, Circle } from "lucide-react";
import { LogEntry, clearLogs, subscribeLogs } from "@/lib/consoleLog";

function fmtTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString("pt-BR", { hour12: false });
}

const levelColor: Record<LogEntry["level"], string> = {
  info: "text-console-info",
  success: "text-console-success",
  warn: "text-console-warn",
  error: "text-console-error",
};

const levelPrefix: Record<LogEntry["level"], string> = {
  info: "INFO",
  success: " OK ",
  warn: "WARN",
  error: "ERR ",
};

export function SearchConsole() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeLogs(setLogs), []);

  useEffect(() => {
    // newest first → keep view at top
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [logs.length]);

  return (
    <div className="rounded-2xl overflow-hidden border border-console-border bg-console shadow-soft">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-console-border bg-console-header">
        <div className="flex items-center gap-2 text-console-foreground">
          <div className="flex items-center gap-1.5">
            <Circle className="w-2.5 h-2.5 fill-red-500 text-red-500" />
            <Circle className="w-2.5 h-2.5 fill-yellow-500 text-yellow-500" />
            <Circle className="w-2.5 h-2.5 fill-green-500 text-green-500" />
          </div>
          <Terminal className="w-3.5 h-3.5 ml-2 opacity-70" />
          <span className="text-xs font-mono tracking-wide opacity-80">leads-hunter ~ console</span>
        </div>
        <button
          onClick={clearLogs}
          className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-1 rounded-md text-console-foreground/70 hover:text-console-foreground hover:bg-console-header-hover transition-colors"
          title="Limpar console"
        >
          <Trash2 className="w-3 h-3" /> clear
        </button>
      </div>

      <div
        ref={scrollRef}
        className="font-mono text-[12px] leading-relaxed p-4 max-h-72 overflow-auto bg-console"
      >
        {logs.length === 0 ? (
          <p className="text-console-foreground/40">
            <span className="text-console-success">$</span> aguardando comandos de busca...
          </p>
        ) : (
          <ul className="space-y-1">
            {logs.map(l => (
              <li key={l.id} className="flex gap-3 text-console-foreground/90">
                <span className="text-console-foreground/40 shrink-0">{fmtTime(l.ts)}</span>
                <span className={`${levelColor[l.level]} shrink-0`}>[{levelPrefix[l.level]}]</span>
                <span className="break-words">{l.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
