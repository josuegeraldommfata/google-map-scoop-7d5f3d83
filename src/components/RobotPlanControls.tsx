import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Bot,
  CheckCircle2,
  LayoutDashboard,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

export type ActivePlan = 'manual' | 'robot';

interface Props {
  activePlan: ActivePlan;
  setActivePlan: (p: ActivePlan) => void;
  robotConnected: boolean;
  onToggleConnect: () => void;
  onActivateRobot: () => void;
  robotRunning: boolean;
  robotProgressPct: number;
  robotCounts: { queued: number; sent: number; failed: number };
}

export function RobotPlanControls({
  activePlan,
  setActivePlan,
  robotConnected,
  onToggleConnect,
  onActivateRobot,
  robotRunning,
  robotProgressPct,
  robotCounts,
}: Props) {
  const statusBadge = useMemo(() => {
    if (!robotConnected) {
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground border-border gap-1 text-[11px]">
          <QrCode className="w-3.5 h-3.5" /> Desconectado
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 gap-1 text-[11px]">
        <CheckCircle2 className="w-3.5 h-3.5" /> Conectado
      </Badge>
    );
  }, [robotConnected]);

  return (
    <div className="space-y-3">
      {/* Plano selector */}
      <Card className="p-4 border-border bg-card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Escolha seu modo de prospecção</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <button
                onClick={() => setActivePlan('manual')}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  activePlan === 'manual'
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'bg-muted/30 border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="font-semibold">Plano 1 · Manual</span>
              </button>

              <button
                onClick={() => setActivePlan('robot')}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  activePlan === 'robot'
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'bg-muted/30 border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Bot className="w-4 h-4" />
                <span className="font-semibold">Plano 2 · Robô</span>
              </button>

              {statusBadge}
            </div>

            <p className="text-sm text-muted-foreground mt-2">
              {activePlan === 'manual'
                ? 'Você abre o WhatsApp lead a lead.'
                : 'Você ativa o envio em lote (mock) e o sistema simula progresso em segundo plano.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={robotConnected ? 'secondary' : 'outline'}
              className="gap-2"
              onClick={onToggleConnect}
              disabled={activePlan !== 'robot'}
              title={activePlan !== 'robot' ? 'Ative o Plano 2 para conectar' : 'Mock: alternar conexão do WhatsApp'}
            >
              <QrCode className="w-4 h-4" />
              {robotConnected ? 'Desconectar' : 'Conectar WhatsApp (QR mock)'}
            </Button>

            <Button
              type="button"
              className="gap-2"
              onClick={onActivateRobot}
              disabled={activePlan !== 'robot' || !robotConnected || robotRunning}
              title={activePlan !== 'robot' ? 'Ative o Plano 2' : !robotConnected ? 'Conecte o WhatsApp (mock)' : 'Ativando...'}
            >
              {robotRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {robotRunning ? 'Enviando...' : 'Ativar Robô de Prospecção'}
            </Button>
          </div>
        </div>

        {activePlan === 'robot' && (
          <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-success" />
                <p className="text-sm font-medium">Simulação (mock)</p>
              </div>
              <div className="text-xs text-muted-foreground">
                {robotRunning ? 'Processando fila...' : 'Pronto para ativar'}
              </div>
            </div>

            <div className="mt-3">
              <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-success transition-[width] duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, robotProgressPct))}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{robotProgressPct.toFixed(0)}%</span>
                <span>
                  Fila: <span className="text-foreground font-medium">{robotCounts.queued}</span> · Enviados:{' '}
                  <span className="text-foreground font-medium">{robotCounts.sent}</span> · Falhas:{' '}
                  <span className="text-foreground font-medium">{robotCounts.failed}</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

