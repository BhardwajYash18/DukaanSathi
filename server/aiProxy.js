/**
 * DukaanSathi — Minimal AI Proxy Server
 * See AI_DOCUMENTATION.md for setup instructions.
 */
import process from 'node:process';
import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*', methods: ['GET', 'POST'] }));
app.use(express.json({ limit: '20mb' }));

app.get('/health', (_req, res) =>
  res.json({ ok: true, service: 'DukaanSathi AI Proxy', keyConfigured: !!GEMINI_API_KEY })
);

async function callGemini(payload) {
  if (!GEMINI_API_KEY) {
    throw Object.assign(new Error('GEMINI_API_KEY is not configured on the server.'), { status: 503 });
  }
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw Object.assign(new Error('Gemini API error'), { status: res.status, detail: text.slice(0, 300) });
  }
  return res.json();
}

// POST /api/ai/scan-bill
// Body: { imageBase64: string, mimeType: string }
// Returns: { items, grandTotal, confidence, rawText }
app.post('/api/ai/scan-bill', async (req, res) => {
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64 || !mimeType)
    return res.status(400).json({ error: 'imageBase64 and mimeType are required.' });

  const prompt = `You are an OCR assistant for a kirana (Indian grocery) shop.
Analyze this bill/invoice image and extract ALL line items.
Return ONLY a JSON object (no markdown, no explanation):
{
  "items": [{ "name": "...", "qty": <number|null>, "unitPrice": <number|null>, "total": <number|null>, "uncertain": <bool> }],
  "grandTotal": <number|null>,
  "confidence": "high" | "partial" | "low",
  "rawText": "verbatim text from image"
}
Rules: Use null for missing values. Do NOT invent data. uncertain=true if blurry or guessing.
confidence="high" only if all items and prices are clearly read. Monetary values = plain numbers.`;

  try {
    const data = await callGemini({
      contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: imageBase64 } }] }],
      generationConfig: { temperature: 0.05, maxOutputTokens: 2048, responseMimeType: 'application/json' },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    });
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let parsed;
    try { parsed = JSON.parse(rawText); } catch {
      const m = rawText.match(/\{[\s\S]*\}/);
      if (m) try { parsed = JSON.parse(m[0]); } catch { /* ignore */ }
    }
    return res.json(parsed || { items: [], grandTotal: null, confidence: 'low', rawText: rawText.slice(0, 800) });
  } catch (err) {
    console.error('[scan-bill]', err.message);
    return res.status(err.status === 429 ? 429 : 502).json({ error: err.message });
  }
});

// POST /api/ai/assistant
// Body: { question: string, shopContext: object }
// Returns: { answer: string }
app.post('/api/ai/assistant', async (req, res) => {
  const { question, shopContext: ctx = {} } = req.body;
  if (!question?.trim()) return res.status(400).json({ error: 'question is required.' });

  const lowStock = (ctx.lowStockProducts || [])
    .map(p => `${p.name} (${p.stockQuantity}/${p.minStockThreshold})`)
    .join('; ') || 'None';

  const systemPrompt = `You are a helpful business assistant for a kirana (Indian grocery) shop owner.
Answer questions clearly and concisely (2-4 sentences). Use the LIVE DATA below. Use Rs for amounts.
Do NOT invent numbers not present in the data.

LIVE SHOP DATA:
- Today sales: Rs${ctx.todaySales || 0} (${ctx.salesCount || 0} bills)
- Cash collected: Rs${ctx.todayCashCollected || 0}
- Total udhar outstanding: Rs${ctx.totalOutstandingCredit || 0}
- Customers: ${ctx.customerCount || 0}
- Low stock: ${lowStock}

Question: ${question.trim()}`;

  try {
    const data = await callGemini({
      contents: [{ parts: [{ text: systemPrompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
    });
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No answer received.';
    return res.json({ answer: answer.trim() });
  } catch (err) {
    console.error('[assistant]', err.message);
    return res.status(err.status === 429 ? 429 : 500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[DukaanSathi AI Proxy] http://localhost:${PORT}`);
  if (!GEMINI_API_KEY) console.warn('WARNING: GEMINI_API_KEY not set — AI requests will fail.');
});

export default app;
