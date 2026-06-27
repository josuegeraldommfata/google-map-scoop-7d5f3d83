# TODO - LeadsHunter (Plano 2 Robô + SaaS/DB/Backend)

## Status atual
- Busca real (Google Maps + enriquecimento via Edge Function) **intacta**.
- Plano 2 (Robô) saiu do mock e já está preparado para buscar QR real via backend `8081` e acionar `POST /activate`.
- Schema SQL Postgres (Postgres puro, sem Supabase) **criado e funcionando**.

## Steps
1. [x] Atualizar `src/pages/Index.tsx` para adicionar:
   - [x] UI Plano 1 vs Plano 2
   - [x] Botões “Conectar WhatsApp (QR)” e “Ativar Robô de Prospecção”
   - [x] Tela de QR + progresso/contadores
2. [x] Atualizar/confirmar suporte no frontend para QR real e contrato do backend:
   - [x] `src/lib/robotMock.ts` faz `GET http://localhost:8081/qr` e `POST http://localhost:8081/activate`
   - [x] Remover dependência de `.env` no front para esse contrato
3. [ ] Implementar Plano Manual completo (mensagem configurável, templates e badge “mensagem enviada”) no UI:
   - [ ] Campo textarea/modal de mensagem custom
   - [ ] Templates prontos (3 categorias)
   - [ ] Substituição de variáveis `{nome_empresa}`, `{telefone}`, `{ramo}` (ou chaves definidas)
   - [ ] Limite de caracteres + contador e clamp
   - [ ] Badge/checkbox “Mensagem enviada” por lead (estado local inicialmente; depois DB)
4. [x] Criar SQL do sistema (tabelas essenciais) — já executado e funcionou:
   - [x] leads/saved_searches/saved_leads compat
   - [x] users/accounts/plans/subscriptions/payment_events
   - [x] user_message_templates/user_whatsapp_settings/lead_message_log
   - [x] robot_connections
5. [x] Adicionar mais tabelas SaaS (entitlements/campaigns/batches/jobs/outbox/api_keys/exports)
6. [x] Criar backend mínimo (porta `4000`) com:
   - [x] `GET /qr` retornando `{ qrBase64 }` (mock por enquanto)
   - [x] `POST /activate` recebendo `{ sessionId, leads, promptMode, maxChars }` (mock por enquanto)
   - [ ] Integração n8n/Evolution (deixar um adaptador pronto)

7. [ ] Criar webhook Cakto (pagamentos) + persistência:
   - [ ] Endpoint para webhook
   - [ ] Idempotência via `payment_events`
   - [ ] Atualizar `subscriptions` e habilitar/limitar entitlements
8. [ ] Atualizar README e rodar validação manual:
   - [ ] Checklist de inicialização (DB -> schema -> backend -> front)



