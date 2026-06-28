import fs from 'fs';

const original = fs.readFileSync('./src/components/LeadsTable.tsx', 'utf8');

let updated = original.replace(
  'import { useState, useMemo } from "react";',
  'import { useState, useMemo, useEffect } from "react";\nimport { toast } from "sonner";'
);

updated = updated.replace(
  'import { Input } from "@/components/ui/input";',
  'import { Input } from "@/components/ui/input";\nimport { Textarea } from "@/components/ui/textarea";'
);

updated = updated.replace(
  'ShieldCheck, ShieldAlert,\n} from "lucide-react";',
  'ShieldCheck, ShieldAlert, Settings, Check, Send\n} from "lucide-react";'
);

const newLogic = `
const TEMPLATES = [
  { id: '1', name: 'Dor (Recomendado)', text: 'Olá {nome_empresa}, notei que vocês não aparecem no Google com site próprio...' },
  { id: '2', name: 'Concorrência', text: 'Olá {nome_empresa}, seu concorrente em {cidade} está pegando seus clientes locais...' },
  { id: '3', name: 'Direto e Curto', text: 'Olá {nome_empresa}, fazemos sites profissionais que geram vendas...' }
];

const MAX_CHARS = 1000;

`;

if (!updated.includes('const MAX_CHARS')) {
  updated = updated.replace('const PAGE_SIZE = 10;', newLogic + 'const PAGE_SIZE = 10;');
}

const statesToAdd = `
  const [showConfig, setShowConfig] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState(TEMPLATES[0].text);
  const [sentMessages, setSentMessages] = useState<Set<string>>(new Set());
  
  const handleSendToCrmAndWhatsApp = async (lead: Lead) => {
    // Substituir variaveis
    const msg = messageTemplate
      .replace(/{nome_empresa}/g, lead.name)
      .replace(/{cidade}/g, lead.city)
      .replace(/{ramo}/g, lead.niche || 'seu nicho')
      .replace(/{telefone}/g, lead.whatsapp || lead.phone);
      
    // Envia pro CRM
    try {
      const res = await fetch('/api/crm_leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead, stageId: 2 }) // Stage 2: Conversando
      });
      if (!res.ok) throw new Error('Erro ao salvar no CRM');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao adicionar lead ao CRM');
    }
    
    // Marca como enviado localmente
    setSentMessages(prev => new Set(prev).add(lead.id));
    
    // Abre WhatsApp
    const url = getWhatsAppLink(lead.whatsapp || lead.phone, msg);
    window.open(url, '_blank');
  };
`;

if (!updated.includes('showConfig')) {
  updated = updated.replace('const [page, setPage] = useState(1);', 'const [page, setPage] = useState(1);\n' + statesToAdd);
}

const configModalHtml = `
      {/* Settings Modal */}
      {showConfig && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl p-6 w-full max-w-md animate-in fade-in zoom-in-95">
            <h3 className="font-display text-lg mb-4">Configurar Mensagem Manual</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Modelos Prontos</label>
                <div className="flex flex-col gap-2">
                  {TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setMessageTemplate(t.text)}
                      className="text-left px-3 py-2 text-sm bg-muted hover:bg-secondary rounded-lg border border-border transition-colors"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 flex justify-between">
                  <span>Mensagem Personalizada</span>
                  <span className={messageTemplate.length > MAX_CHARS ? 'text-red-500 font-bold' : ''}>
                    {messageTemplate.length} / {MAX_CHARS}
                  </span>
                </label>
                <Textarea 
                  value={messageTemplate}
                  onChange={e => setMessageTemplate(e.target.value)}
                  className="h-32 text-sm resize-none"
                  placeholder="Escreva sua mensagem... Use {nome_empresa}, {cidade}..."
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Tags disponíveis: <code className="bg-muted px-1 rounded">{'{nome_empresa}'}</code>, <code className="bg-muted px-1 rounded">{'{cidade}'}</code>, <code className="bg-muted px-1 rounded">{'{ramo}'}</code>
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button onClick={() => setShowConfig(false)} className="w-full">
                Salvar e Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
`;

if (!updated.includes('Settings Modal')) {
  updated = updated.replace('{/* Toolbar */}', configModalHtml + '\n      {/* Toolbar */}');
}

// Adicionar o botão de settings na Toolbar
const settingsBtn = `
          <Button variant="outline" size="sm" onClick={() => setShowConfig(true)} className="gap-1.5 text-xs mr-2 border-primary/50 text-primary hover:bg-primary/10">
            <Settings className="w-3.5 h-3.5" />
            Configurar Mensagem
          </Button>
`;

if (!updated.includes('Configurar Mensagem')) {
  updated = updated.replace('<Button variant="outline" size="sm" onClick={handleExportCSV}', settingsBtn + '\n          <Button variant="outline" size="sm" onClick={handleExportCSV}');
}

fs.writeFileSync('./src/components/LeadsTable.tsx', updated);
console.log('LeadsTable updated!');
