const fs = require('fs');

// 1. UPDATE LeadsTable.tsx to use LocalStorage
let leadsTable = fs.readFileSync('src/components/LeadsTable.tsx', 'utf8');

// replace useState(TEMPLATES[0].text) with lazy initialization
const localStoreLogic = `  const [messageTemplate, setMessageTemplate] = useState(() => {
    return localStorage.getItem('leadshunter_template') || TEMPLATES[0].text;
  });

  // Salvar no localstorage quando alterar
  useEffect(() => {
    localStorage.setItem('leadshunter_template', messageTemplate);
  }, [messageTemplate]);
`;

leadsTable = leadsTable.replace('const [messageTemplate, setMessageTemplate] = useState(TEMPLATES[0].text);', localStoreLogic);

fs.writeFileSync('src/components/LeadsTable.tsx', leadsTable);
console.log('LeadsTable updated with localStorage');

// 2. UPDATE Index.tsx
let indexCode = fs.readFileSync('src/pages/Index.tsx', 'utf8');

const newRobotUI = `
                  {/* Plano 2 (Robô Client-Side) */}
                  <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <span>Plano 2 · Robô Em Massa</span>
                        <span className="bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full font-bold">Membros Business</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-primary/10 border-primary/40 text-primary text-sm font-semibold">
                            <Zap className="w-4 h-4" /> Automação de Navegador
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Dispara para a lista de leads um por um, abrindo e fechando abas do WhatsApp Web automaticamente.
                          </span>
                        </div>

                        <div className="mt-4">
                          <button
                            type="button"
                            disabled={robotRunning || leads.length === 0}
                            className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                            onClick={handleActivateRobot}
                          >
                            {robotRunning ? (
                              <>Abortar Envios</>
                            ) : (
                              <>
                                <Zap className="w-4 h-4" />
                                Ativar Robô de Prospecção
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed max-w-sm">
                          O robô usará o texto configurado no botão "Configurar Mensagem". Ele abre o WhatsApp Web, aguarda 10 segundos, e fecha a aba. Ideal usar com extensão de auto-envio.
                        </p>
                      </div>

                      <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col justify-center">
                        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">Status do Robô</p>
                        
                        {!robotRunning && robotProgressPct === 0 && (
                          <div className="text-center text-sm text-muted-foreground/60 py-4">
                            Aguardando ativação...
                          </div>
                        )}

                        {(robotRunning || robotProgressPct > 0) && (
                          <div className="w-full">
                            <div className="flex justify-between text-xs font-semibold mb-2">
                              <span>Progresso</span>
                              <span>{robotProgressPct.toFixed(0)}%</span>
                            </div>
                            <div className="h-3 w-full bg-border rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-primary to-success transition-all duration-500 ease-out"
                                style={{ width: \`\${Math.max(0, Math.min(100, robotProgressPct))}%\` }}
                              />
                            </div>
                            <div className="mt-3 flex justify-between text-[11px] text-muted-foreground">
                              <span><strong className="text-foreground">{robotCounts.sent}</strong> Enviados</span>
                              <span><strong className="text-foreground">{robotCounts.failed}</strong> Sem WhatsApp</span>
                              <span><strong className="text-foreground">{robotCounts.queued}</strong> Na Fila</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
`;

// Replace the old Plano 2 section
indexCode = indexCode.replace(/\{\/\* Plano 2 \(Robô\) \*\/\}.*?(?=\{\/\* LeadsTable \*\/\})/s, newRobotUI + "\n\n                  ");
// In case the marker wasn't found because it's `<LeadsTable leads={leads} />`
indexCode = indexCode.replace(/\{\/\* Plano 2 \(Robô\) \*\/\}.*?(?=<LeadsTable)/s, newRobotUI + "\n\n                  ");


// Replace handleActivateRobot implementation
const newRobotLogic = `
  const handleActivateRobot = async () => {
    if (robotRunning) {
      if (robotAbortController) {
        robotAbortController.abort();
      }
      setRobotRunning(false);
      toast.info('Robô interrompido pelo usuário.');
      return;
    }

    if (leads.length === 0) return;

    const controller = new AbortController();
    setRobotAbortController(controller);
    setRobotRunning(true);
    
    let sent = 0;
    let failed = 0;
    let queued = leads.length;

    setRobotCounts({ queued, sent, failed });
    setRobotProgressPct(0);

    const template = localStorage.getItem('leadshunter_template') || 'Olá {nome_empresa}...';

    for (let i = 0; i < leads.length; i++) {
      if (controller.signal.aborted) break;

      const lead = leads[i];
      queued--;

      // Pula leads sem telefone
      if (!lead.whatsapp && !lead.phone) {
        failed++;
        setRobotCounts({ queued, sent, failed });
        setRobotProgressPct(((i + 1) / leads.length) * 100);
        continue;
      }

      // Substituir variaveis
      const msg = template
        .replace(/{nome_empresa}/g, lead.name)
        .replace(/{cidade}/g, lead.city)
        .replace(/{ramo}/g, lead.niche || 'seu nicho')
        .replace(/{telefone}/g, lead.whatsapp || lead.phone);

      const cleanPhone = (lead.whatsapp || lead.phone).replace(/\\D/g, '');
      const number = cleanPhone.startsWith('55') ? cleanPhone : \`55\${cleanPhone}\`;
      const url = \`https://web.whatsapp.com/send?phone=\${number}&text=\${encodeURIComponent(msg)}\`;

      // Salva no CRM
      try {
        await fetch('/api/crm_leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead, stageId: 2 })
        });
      } catch (e) {
        console.error('Falha ao salvar no CRM', e);
      }

      // Abre a aba
      const win = window.open(url, '_blank');
      sent++;
      setRobotCounts({ queued, sent, failed });
      setRobotProgressPct(((i + 1) / leads.length) * 100);

      // Aguarda 10 segundos
      await new Promise(resolve => {
        const timeout = setTimeout(resolve, 10000);
        controller.signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          resolve(null);
        });
      });

      if (win && !win.closed) {
        win.close();
      }
    }

    setRobotRunning(false);
    setRobotAbortController(null);
    if (!controller.signal.aborted) {
      toast.success('Disparo em massa concluído!');
    }
  };
`;

// Replace the old handleActivateRobot block
indexCode = indexCode.replace(/const handleActivateRobot = async \(\) => \{[\s\S]*?(?=return \()/m, newRobotLogic + "\n\n  ");

fs.writeFileSync('src/pages/Index.tsx', indexCode);
console.log('Index.tsx updated with client-side robot');
