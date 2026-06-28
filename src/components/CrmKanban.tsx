import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Kanban, Sparkles, Building, Phone, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Stage {
  id: number;
  nome: string;
  cor: string;
  ordem: number;
}

interface CrmLead {
  id: number;
  nome: string;
  empresa: string;
  telefone: string;
  cidade: string;
  segmento: string;
  pipeline_stage_id: number;
  created_at: string;
}

export function CrmKanban() {
  const [draggedLead, setDraggedLead] = useState<number | null>(null);

  const { data, refetch } = useQuery({
    queryKey: ['crm-data'],
    queryFn: async () => {
      const [pipeRes, leadsRes] = await Promise.all([
        fetch('/api/pipelines').then(r => r.json()),
        fetch('/api/crm_leads').then(r => r.json())
      ]);
      return {
        stages: (pipeRes.stages || []) as Stage[],
        leads: (leadsRes.leads || []) as CrmLead[]
      };
    }
  });

  const handleDragStart = (e: React.DragEvent, leadId: number) => {
    setDraggedLead(leadId);
    e.dataTransfer.setData('leadId', String(leadId));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, stageId: number) => {
    e.preventDefault();
    const leadId = Number(e.dataTransfer.getData('leadId'));
    if (!leadId) return;

    try {
      const res = await fetch(`/api/crm_leads/${leadId}/stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId })
      });
      if (res.ok) {
        toast.success('Lead movido no funil');
        refetch();
      }
    } catch (err) {
      toast.error('Erro ao mover lead');
    }
    setDraggedLead(null);
  };

  if (!data) return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando Funil...</div>;

  const { stages, leads } = data;

  if (stages.length === 0) {
    return (
      <div className="p-12 text-center text-muted-foreground border border-border bg-card rounded-2xl mx-8 my-8 shadow-soft">
        <Kanban className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-display mb-2">Funil não configurado</h2>
        <p className="text-sm">As etapas do CRM ainda não foram criadas no banco de dados.</p>
      </div>
    );
  }

  const getStageColor = (color: string) => {
    const map: any = {
      blue: 'border-blue-500/30 bg-blue-500/10 text-blue-500',
      yellow: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-500',
      orange: 'border-orange-500/30 bg-orange-500/10 text-orange-500',
      purple: 'border-purple-500/30 bg-purple-500/10 text-purple-500',
      pink: 'border-pink-500/30 bg-pink-500/10 text-pink-500',
      green: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500',
      red: 'border-red-500/30 bg-red-500/10 text-red-500',
    };
    return map[color] || 'border-border bg-muted text-foreground';
  };

  const getHeaderColor = (color: string) => {
    const map: any = {
      blue: 'bg-blue-500', yellow: 'bg-yellow-500', orange: 'bg-orange-500',
      purple: 'bg-purple-500', pink: 'bg-pink-500', green: 'bg-emerald-500', red: 'bg-red-500',
    };
    return map[color] || 'bg-border';
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 overflow-x-auto p-2 pb-6 items-start">
      {stages.map(stage => {
        const stageLeads = leads.filter(l => l.pipeline_stage_id === stage.id);
        
        return (
          <div 
            key={stage.id}
            className="flex-shrink-0 w-80 flex flex-col bg-muted/40 rounded-2xl overflow-hidden border border-border h-full max-h-full"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            <div className="p-4 border-b border-border bg-card flex items-center justify-between shadow-sm z-10 relative">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getHeaderColor(stage.cor)}`} />
                <h3 className="font-semibold text-sm tracking-wide">{stage.nome}</h3>
              </div>
              <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                {stageLeads.length}
              </span>
            </div>
            
            <div className="flex-1 p-3 overflow-y-auto space-y-3 kanban-scrollbar">
              {stageLeads.map(lead => (
                <div 
                  key={lead.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  className={`bg-card border rounded-xl p-4 shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/50 hover:shadow-md transition-all ${
                    draggedLead === lead.id ? 'opacity-50 scale-95' : 'opacity-100'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-sm text-foreground line-clamp-1">{lead.nome}</h4>
                  </div>
                  
                  <div className="space-y-1.5 mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building className="w-3.5 h-3.5" />
                      <span className="truncate">{lead.segmento} • {lead.cidade}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{lead.telefone}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                    </div>
                    
                    <a 
                      href={`https://wa.me/${lead.telefone.replace(/\D/g, '')}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="p-1.5 bg-success/15 text-success hover:bg-success/25 rounded-md transition-colors"
                      title="Abrir WhatsApp"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
              
              {stageLeads.length === 0 && (
                <div className="h-24 flex items-center justify-center border-2 border-dashed border-border/60 rounded-xl text-xs text-muted-foreground/60 italic">
                  Arraste cards para cá
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
