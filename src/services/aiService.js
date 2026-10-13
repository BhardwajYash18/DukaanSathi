/**
 * DukaanSathi — AI Service (Bill Scanning + Business Assistant)
 *
 * SECURITY ARCHITECTURE
 * ─────────────────────
 * The Gemini API key is NEVER placed in browser code or any VITE_ env variable.
 * All Gemini requests are routed through a minimal server-side proxy endpoint.
 *
 * Required backend endpoint (one Express route is sufficient):
 *
 *   POST /api/ai/scan-bill
 *   Body:  { imageBase64: string, mimeType: string }
 *   Returns: { items: BillItem[], rawText?: string, confidence: 'high'|'low'|'partial' }
 *
 *   POST /api/ai/assistant
 *   Body:  { question: string, shopContext: ShopContext }
 *   Returns: { answer: string }
 *
 * The proxy reads process.env.GEMINI_API_KEY on the server side and calls:
 *   https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent
 *
 * For local development without a backend:
 *   Leave VITE_AI_PROXY_URL unset (empty) to activate MOCK_MODE which returns
 *   realistic demo data. This lets the UI be developed without any server setup.
 *
 * For production / hackathon demo with real AI:
 *   Deploy the minimal Express proxy in /server/aiProxy.js (see AI_DOCUMENTATION.md)
 *   Set VITE_AI_PROXY_URL=https://your-backend-url in your deployment environment.
 *
 * @module aiService
 */

// === Configuration ============================================================

/** Base URL of the server-side AI proxy. Empty string = MOCK_MODE. */
const AI_PROXY_URL = (import.meta.env.VITE_AI_PROXY_URL || '').replace(/\/$/, '');

/** When true, all AI calls return realistic demo responses (no server required). */
const MOCK_MODE = !AI_PROXY_URL;

// === Type Definitions (JSDoc) =================================================

/**
 * @typedef {Object} BillItem
 * @property {string} name          - Product name extracted from bill
 * @property {number|null} qty      - Quantity (null = not found)
 * @property {number|null} unitPrice - Unit price in INR (null = not found)
 * @property {number|null} total    - Line total in INR (null = not found)
 * @property {boolean} uncertain    - true when AI confidence is low for this item
 */

/**
 * @typedef {Object} BillScanResult
 * @property {BillItem[]} items       - Extracted line items
 * @property {number|null} grandTotal - Grand total from bill (null if not found)
 * @property {'high'|'low'|'partial'} confidence - Overall extraction confidence
 * @property {string} [rawText]       - Raw OCR text for debugging (optional)
 * @property {string} [warning]       - Human-readable warning if data is partial
 */

/**
 * @typedef {Object} ShopContext
 * @property {number} todaySales
 * @property {number} todayCashCollected
 * @property {number} totalOutstandingCredit
 * @property {number} customerCount
 * @property {number} salesCount
 * @property {Array} lowStockProducts
 * @property {Array} recentTransactions
 */

// === Utility ==================================================================

/**
 * Converts a File object to base64 string (strips data-URL prefix).
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function fileToBase64(file) {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  }
  if (file && typeof file.arrayBuffer === 'function') {
    const buffer = await file.arrayBuffer();
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(buffer).toString('base64');
    }
  }
  throw new Error('FileReader is not available');
}

/**
 * Validates that the file is an acceptable image for bill scanning.
 * @param {File} file
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateBillImage(file) {
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  const MAX_SIZE_MB = 10;

  if (!file) return { valid: false, error: 'No file provided' };
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported format. Please use JPEG, PNG, or WebP.`,
    };
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return {
      valid: false,
      error: `Image too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_SIZE_MB} MB.`,
    };
  }
  return { valid: true };
}

// === Mock Responses ===========================================================

/** Realistic mock BillScanResult for UI development without a backend. */
function getMockBillScanResult() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        items: [
          { name: 'Aashirvaad Chakki Atta 5kg', qty: 2, unitPrice: 245, total: 490, uncertain: false },
          { name: 'Tata Salt 1kg', qty: 3, unitPrice: 28, total: 84, uncertain: false },
          { name: 'Fortune Sunflower Oil 1L', qty: 1, unitPrice: 145, total: 145, uncertain: false },
          { name: 'Parle-G Biscuits 800g', qty: 2, unitPrice: 75, total: 150, uncertain: true },
        ],
        grandTotal: 869,
        confidence: 'partial',
        warning: 'Demo mode — connect backend proxy for live bill scanning with Gemini.',
      });
    }, 1800);
  });
}

/** Realistic mock assistant response for UI development. */
function getMockAssistantResponse(question) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const q = (question || '').toLowerCase();
      let answer =
        'This is demo mode. Connect the backend proxy to enable live AI responses using your real shop data.';
      if (q.includes('sales') || q.includes('bikri') || q.includes('sale')) {
        answer =
          'Today\'s sales are ₹704. You have recorded 3 bills. Cash collected is ₹531 including a ₹500 repayment from Ramesh Sharma. (Demo mode)';
      } else if (q.includes('stock') || q.includes('low') || q.includes('khatam')) {
        answer =
          '3 items are running low: Fortune Sunflower Oil (4 left, min 8), Tata Tea Gold (3 left, min 6). Consider restocking these first. (Demo mode)';
      } else if (q.includes('udhar') || q.includes('credit') || q.includes('khata')) {
        answer =
          'Total outstanding credit is ₹1,190 across 2 customers. Ramesh Sharma owes ₹850, Sunita Verma ₹340. Manoj Gupta is fully settled. (Demo mode)';
      } else if (q.includes('customer') || q.includes('grahak')) {
        answer =
          'You have 3 registered customers. Ramesh Sharma (₹850 due), Sunita Verma (₹340 due), Manoj Gupta (settled). (Demo mode)';
      }
      resolve({ answer });
    }, 1200);
  });
}

// === Core API Functions =======================================================

/**
 * Scans a bill image using Gemini Vision and extracts structured item data.
 * Routes through the server-side proxy. Falls back to MOCK_MODE when proxy is unset.
 *
 * @param {File} imageFile
 * @returns {Promise<BillScanResult>}
 * @throws {Error}
 */
export async function scanBillImage(imageFile) {
  const { valid, error } = validateBillImage(imageFile);
  if (!valid) throw new Error(error);

  if (MOCK_MODE) {
    console.info('[aiService] MOCK_MODE — demo bill scan');
    return getMockBillScanResult();
  }

  let imageBase64;
  try {
    imageBase64 = await fileToBase64(imageFile);
  } catch (err) {
    throw new Error('Failed to read image file: ' + err.message, { cause: err });
  }

  let response;
  try {
    response = await fetch(`${AI_PROXY_URL}/api/ai/scan-bill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mimeType: imageFile.type }),
    });
  } catch (networkErr) {
    throw new Error(
      'Could not reach the AI service. Check your internet connection or backend setup. ' +
        networkErr.message,
      { cause: networkErr }
    );
  }

  if (!response.ok) {
    let detail = '';
    try {
      const errBody = await response.json();
      detail = errBody.error || errBody.message || '';
    } catch { /* ignore */ }
    if (response.status === 429)
      throw new Error('AI service is busy (rate limit). Please wait and try again.');
    if (response.status >= 500)
      throw new Error('AI service error. Please try again later.' + (detail ? ` (${detail})` : ''));
    throw new Error(`AI request failed (${response.status})` + (detail ? `: ${detail}` : ''));
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('AI service returned an unreadable response.');
  }

  return normalizeBillScanResult(result);
}

/**
 * Normalises the raw proxy response into a consistent BillScanResult shape.
 * Handles missing or malformed fields gracefully.
 * @param {any} raw
 * @returns {BillScanResult}
 */
function normalizeBillScanResult(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      items: [],
      grandTotal: null,
      confidence: 'low',
      warning: 'No data could be extracted. Please check the image quality.',
    };
  }
  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  const items = rawItems.map((item) => ({
    name: String(item.name || 'Unknown Item').trim(),
    qty: item.qty != null && !isNaN(Number(item.qty)) ? Number(item.qty) : null,
    unitPrice:
      item.unitPrice != null && !isNaN(Number(item.unitPrice)) ? Number(item.unitPrice) : null,
    total: item.total != null && !isNaN(Number(item.total)) ? Number(item.total) : null,
    uncertain: Boolean(item.uncertain),
  }));
  const grandTotal =
    raw.grandTotal != null && !isNaN(Number(raw.grandTotal)) ? Number(raw.grandTotal) : null;
  const confidence = ['high', 'low', 'partial'].includes(raw.confidence) ? raw.confidence : 'low';
  return {
    items,
    grandTotal,
    confidence,
    rawText: raw.rawText || undefined,
    warning:
      items.length === 0
        ? 'No items could be extracted. The image may be blurry or not a bill.'
        : raw.warning || undefined,
  };
}

/**
 * Asks the Business Assistant a natural-language question using live shop data as context.
 * Routes through the server-side proxy. Falls back to MOCK_MODE when proxy is unset.
 *
 * @param {string} question
 * @param {ShopContext} shopContext
 * @returns {Promise<{ answer: string }>}
 * @throws {Error}
 */
export async function askBusinessAssistant(question, shopContext) {
  if (!question || !question.trim()) throw new Error('Please enter a question');

  if (MOCK_MODE) {
    console.info('[aiService] MOCK_MODE — demo assistant response');
    return getMockAssistantResponse(question);
  }

  let response;
  try {
    response = await fetch(`${AI_PROXY_URL}/api/ai/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: question.trim(), shopContext }),
    });
  } catch (networkErr) {
    throw new Error('Could not reach the AI service. ' + networkErr.message, { cause: networkErr });
  }

  if (!response.ok) {
    let detail = '';
    try {
      const errBody = await response.json();
      detail = errBody.error || errBody.message || '';
    } catch { /* ignore */ }
    if (response.status === 429)
      throw new Error('AI service is busy. Please wait and try again.');
    throw new Error(`AI assistant request failed (${response.status})` + (detail ? `: ${detail}` : ''));
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('AI service returned an unreadable response.');
  }
  return { answer: String(result.answer || 'No answer received.') };
}

/**
 * Returns current AI availability status.
 * @returns {{ available: boolean, mode: 'live'|'mock', proxyUrl?: string }}
 */
export function getAIStatus() {
  if (MOCK_MODE) return { available: true, mode: 'mock' };
  return { available: true, mode: 'live', proxyUrl: AI_PROXY_URL };
}
