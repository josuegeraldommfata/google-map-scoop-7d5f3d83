import express from 'express';

const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: '2mb' }));


// Serve a estrutura mínima pra você plugar Evolution/Baileys depois.
// Contrato esperado pelo front:
//  GET /qr -> { qrBase64: string }
//  POST /activate -> { sessionId, leads, promptMode, maxChars }

app.get('/qr', async (_req, res) => {
  // QR mock por enquanto (substituir por QR real do Evolution/Baileys)
  // Mantém shape { qrBase64 } que o front já consome.
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
  <rect x="0" y="0" width="220" height="220" fill="#0b1220"/>
  <text x="50%" y="108" dominant-baseline="middle" text-anchor="middle" font-family="Inter, Arial" font-size="14" fill="#9ca3af">QR</text>
  <text x="50%" y="130" dominant-baseline="middle" text-anchor="middle" font-family="Inter, Arial" font-size="10" fill="#6b7280">backend</text>
  <g fill="#ffffff" opacity="0.95">
    ${Array.from({ length: 9 }).map((_, r) =>
      Array.from({ length: 9 }).map((__, c) => {
        const x = 28 + c * 16;
        const y = 48 + r * 16;
        const on = (r + c) % 2 === 0 || (r === 0 && c < 3) || (c === 0 && r < 3);
        return on ? `<rect x="${x}" y="${y}" width="12" height="12"/>` : '';
      }).join('')
    ).join('')}
  </g>
  <rect x="18" y="18" width="184" height="184" fill="none" stroke="#374151" stroke-width="2" rx="16"/>
</svg>`;

  const qrBase64 = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  res.json({ qrBase64 });
});

app.post('/activate', async (req, res) => {
  const { sessionId, leads, promptMode, maxChars } = req.body || {};

  if (!sessionId) return res.status(400).json({ ok: false, error: 'Missing sessionId' });
  if (!Array.isArray(leads)) return res.status(400).json({ ok: false, error: 'Missing leads[]' });

  // Mock atual: apenas retorna ok.
  // Futuro: criar campaign/batches e enfileirar em robot_jobs.
  // Também: acionar n8n webhook/queue.
  res.json({ ok: true, received: { sessionId, leadsCount: leads.length, promptMode, maxChars } });
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`[backend] listening on :${port}`);
});

