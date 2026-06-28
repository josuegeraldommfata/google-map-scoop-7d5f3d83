import express from 'express';
import cors from 'cors';
import db from './db.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Rotas de QR / Ativação (mock atual)
app.get('/qr', async (_req, res) => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
  <rect x="0" y="0" width="220" height="220" fill="#0b1220"/>
  <text x="50%" y="108" dominant-baseline="middle" text-anchor="middle" font-family="Inter, Arial" font-size="14" fill="#9ca3af">QR</text>
  <text x="50%" y="130" dominant-baseline="middle" text-anchor="middle" font-family="Inter, Arial" font-size="10" fill="#6b7280">backend</text>
</svg>`;
  const qrBase64 = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  res.json({ qrBase64 });
});

app.post('/activate', async (req, res) => {
  const { sessionId, leads, promptMode, maxChars } = req.body || {};
  if (!sessionId) return res.status(400).json({ ok: false, error: 'Missing sessionId' });
  if (!Array.isArray(leads)) return res.status(400).json({ ok: false, error: 'Missing leads[]' });
  res.json({ ok: true, received: { sessionId, leadsCount: leads.length, promptMode, maxChars } });
});


// CRM Routes
app.post('/api/crm/seed', async (req, res) => {
  try {
    const pipelineRes = await db.query("INSERT INTO pipelines (nome, account_id) VALUES ('Meu Funil', 1) RETURNING id");
    const pipelineId = pipelineRes.rows[0].id;
    const stages = [
      { nome: 'Novo', cor: 'blue', ordem: 1 },
      { nome: 'Conversando', cor: 'yellow', ordem: 2 },
      { nome: 'Qualificado', cor: 'orange', ordem: 3 },
      { nome: 'Proposta', cor: 'purple', ordem: 4 },
      { nome: 'Negociação', cor: 'pink', ordem: 5 },
      { nome: 'Fechado', cor: 'green', ordem: 6 },
      { nome: 'Perdido', cor: 'red', ordem: 7 },
    ];
    for (const stage of stages) {
      await db.query(
        "INSERT INTO pipeline_stages (pipeline_id, nome, cor, ordem) VALUES ($1, $2, $3, $4)",
        [pipelineId, stage.nome, stage.cor, stage.ordem]
      );
    }
    res.json({ ok: true, message: 'Seeded' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pipelines', async (req, res) => {
  try {
    const pipeRes = await db.query("SELECT * FROM pipelines LIMIT 1");
    if (pipeRes.rowCount === 0) return res.json({ pipeline: null, stages: [] });
    const pipeline = pipeRes.rows[0];
    const stagesRes = await db.query("SELECT * FROM pipeline_stages WHERE pipeline_id = $1 ORDER BY ordem ASC", [pipeline.id]);
    res.json({ pipeline, stages: stagesRes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/crm_leads', async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM crm_leads ORDER BY created_at DESC");
    res.json({ leads: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/crm_leads', async (req, res) => {
  try {
    const { lead, stageId } = req.body;
    if (!lead || !lead.name) return res.status(400).json({ error: 'lead.name required' });

    const phone = (lead.whatsapp || lead.phone || '').trim();
    if (!phone) return res.status(400).json({ error: 'lead phone required' });

    // Tentar usar ID numérico; se for UUID/string, salvar NULL
    let savedLeadId = null;
    if (lead.id) {
      const numericId = String(lead.id).replace(/\D/g, '');
      if (numericId.length > 0 && numericId.length <= 18) {
        savedLeadId = BigInt(numericId).toString();
      }
    }

    // Verificar duplicado por telefone (mais confiável que saved_lead_id)
    const existing = await db.query(
      "SELECT id FROM crm_leads WHERE telefone = $1 LIMIT 1",
      [phone]
    );
    if (existing.rowCount > 0) {
      return res.json({ ok: true, duplicate: true, crm_lead: existing.rows[0] });
    }

    const result = await db.query(`
      INSERT INTO crm_leads (
        account_id, saved_lead_id, nome, empresa, telefone, email, cidade, estado, segmento, temperatura, score, pipeline_stage_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
      ) RETURNING *
    `, [
      1,
      savedLeadId,
      lead.name,
      lead.name,
      phone,
      lead.email || '',
      lead.city || '',
      lead.state || '',
      lead.niche || '',
      lead.type || 'cold',
      lead.whatsappScore || 0,
      stageId || 2
    ]);
    res.json({ ok: true, crm_lead: result.rows[0] });
  } catch (err) {
    console.error('[crm_leads POST]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/crm_leads/:id/stage', async (req, res) => {
  try {
    const { id } = req.params;
    const { stageId } = req.body;
    const result = await db.query("UPDATE crm_leads SET pipeline_stage_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *", [stageId, id]);
    res.json({ ok: true, crm_lead: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`[backend] listening on :${port}`);
});

