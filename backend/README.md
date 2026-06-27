# LeadsHunter Backend (8081/4000 integração)

- Frontend roda em **8081** (Vite).
- Este backend roda em **4000** (por conta do seu n8n/Evolution).

## Contrato usado pelo Front
- `GET /qr` -> `{ qrBase64: string }`
- `POST /activate` -> body `{ sessionId, leads, promptMode, maxChars }`

## Próximos passos (agora)
- Substituir o QR mock por QR real do Evolution/Baileys (via n8n).
- No `POST /activate`, criar campaign/message_batches e enfileirar em `robot_jobs`.
- Depois ligar webhooks de pagamento Cakto.

